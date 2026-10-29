// Prueba de carga de las rutas públicas calientes de NightPass con k6.
//
// Simula gente navegando el catálogo y abriendo eventos (el 95% del tráfico es
// LECTURA, que además está cacheada en Redis). Sube hasta 200 usuarios
// virtuales (VUs) concurrentes, los sostiene, y mide latencia + errores.
//
// CÓMO CORRER (local, seguro):
//   1. brew install k6
//   2. Levanta el backend:  cd server-nightpass && pnpm start:dev
//      (y `pnpm db:seed` si la BD está vacía, para tener eventos)
//   3. k6 run server-nightpass/load-test/catalog.js
//
//   Apuntar a otra URL:  BASE_URL=http://localhost:7101/api/v1 k6 run ...
//
// NO correr contra producción desde una sola IP: el rate-limit (100/min por IP)
// y el ban guard se dispararían y medirías el límite, no el sistema. Loopback
// (localhost) está exento, por eso el test local es el correcto.

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE = __ENV.BASE_URL || 'http://localhost:7101/api/v1';

const errorRate = new Rate('errores_logicos');
const detailLatency = new Trend('latencia_detalle_evento', true);

export const options = {
  scenarios: {
    navegando: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 },   // calentamiento
        { duration: '30s', target: 200 },  // sube a 200 concurrentes
        { duration: '2m', target: 200 },   // sostiene 200 (el escenario real)
        { duration: '30s', target: 0 },    // baja
      ],
    },
  },
  // Umbrales: si se rompen, k6 sale con código != 0 (sirve para CI).
  thresholds: {
    http_req_failed: ['rate<0.01'],            // <1% de requests fallidos (5xx/timeout)
    http_req_duration: ['p(95)<500', 'p(99)<1500'], // p95 < 500ms, p99 < 1.5s
    errores_logicos: ['rate<0.01'],
  },
};

// Cachea la lista de IDs de eventos una vez por VU para no pegarle al endpoint
// de lista en cada iteración (un usuario real navega, no recarga la lista 100x).
function fetchEventIds() {
  const res = http.get(`${BASE}/catalog/events`, { tags: { name: 'events_list' } });
  if (res.status !== 200) return [];
  try {
    const body = res.json();
    const items = Array.isArray(body) ? body : body.items ?? body.events ?? [];
    return items.map((e) => e.id).filter(Boolean);
  } catch {
    return [];
  }
}

let eventIds = [];

export default function () {
  group('navegar catálogo', () => {
    // 1. Lista de eventos (cacheada en Redis).
    const list = http.get(`${BASE}/catalog/events`, { tags: { name: 'events_list' } });
    check(list, { 'lista 200': (r) => r.status === 200 }) || errorRate.add(1);

    if (eventIds.length === 0) eventIds = fetchEventIds();

    sleep(Math.random() * 2 + 1); // el usuario lee la lista 1-3s

    // 2. Abre un evento al azar (detalle — la ruta más pesada, cacheada 30s).
    if (eventIds.length > 0) {
      const id = eventIds[Math.floor(Math.random() * eventIds.length)];
      const detail = http.get(`${BASE}/catalog/events/${id}`, {
        tags: { name: 'event_detail' },
      });
      detailLatency.add(detail.timings.duration);
      check(detail, { 'detalle 200': (r) => r.status === 200 }) || errorRate.add(1);
    }

    sleep(Math.random() * 3 + 2); // el usuario ve el evento 2-5s
  });

  group('venues', () => {
    const venues = http.get(`${BASE}/catalog/venues`, { tags: { name: 'venues_list' } });
    check(venues, { 'venues 200': (r) => r.status === 200 }) || errorRate.add(1);
  });

  sleep(Math.random() * 2 + 1);
}
