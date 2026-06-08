/**
 * Extrae coordenadas (lat/lng) de un link de Google Maps o de un texto "lat,lng".
 * Sin API de pago: solo regex sobre la URL + (opcional) resolver short links
 * siguiendo el redirect. Ver docs/RP_PUNTOS_COBRO.md.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

const LAT_MIN = -90;
const LAT_MAX = 90;
const LNG_MIN = -180;
const LNG_MAX = 180;

function valid(lat: number, lng: number): LatLng | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < LAT_MIN || lat > LAT_MAX || lng < LNG_MIN || lng > LNG_MAX) {
    return null;
  }
  // Redondeo a 6 decimales (~0.11 m) — suficiente y evita ruido del link.
  return { lat: round6(lat), lng: round6(lng) };
}

function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

/**
 * Parseo síncrono: intenta sacar coords de la URL (o de un "lat,lng" pegado a
 * mano). Devuelve null si la URL no contiene coords (ej. short link).
 */
export function parseMapsCoordsFromUrl(input: string): LatLng | null {
  const raw = (input ?? '').trim();
  if (!raw) return null;

  // Caso "lat,lng" directo (el RP pega coordenadas).
  const plain = raw.match(/^(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$/);
  if (plain) {
    const r = valid(parseFloat(plain[1]), parseFloat(plain[2]));
    if (r) return r;
  }

  // Patrones de URL de Google Maps, en orden de PRECISIÓN. El marcador del lugar
  // (!3d!4d) y el `?q=`/`destination` apuntan al punto exacto; el `@lat,lng` es
  // solo el centro de la vista (puede estar varias decenas de metros desfasado),
  // por eso va como fallback, no primero.
  const patterns: RegExp[] = [
    // ...!3d19.4326!4d-99.1332  (marcador del place — el más preciso)
    /!3d(-?\d{1,3}\.\d+)!4d(-?\d{1,3}\.\d+)/,
    // ...?q=19.4326,-99.1332  / &query=lat,lng / &ll=lat,lng / &destination=lat,lng
    /[?&](?:q|query|ll|sll|daddr|destination)=(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/,
    // .../@19.4326,-99.1332,17z  (centro de la vista — fallback)
    /@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/,
    // .../place/19.4326,-99.1332
    /\/(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/,
  ];

  for (const re of patterns) {
    const m = raw.match(re);
    if (m) {
      const r = valid(parseFloat(m[1]), parseFloat(m[2]));
      if (r) return r;
    }
  }
  return null;
}

const SHORT_HOSTS = ['maps.app.goo.gl', 'goo.gl', 'g.co'];

function isShortLink(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return SHORT_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

/**
 * Resuelve coords incluyendo short links (`maps.app.goo.gl/…`): si el parseo
 * directo falla y la URL es un short link, sigue el redirect hasta ~5 saltos y
 * reintenta el parseo sobre la URL final. Devuelve null si no se logra.
 */
export async function resolveMapsCoords(
  input: string,
  maxHops = 5,
): Promise<LatLng | null> {
  const direct = parseMapsCoordsFromUrl(input);
  if (direct) return direct;

  let url = (input ?? '').trim();
  if (!/^https?:\/\//i.test(url) || !isShortLink(url)) return null;

  for (let hop = 0; hop < maxHops; hop += 1) {
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'GET',
        redirect: 'manual',
        // UA real: algunos shorteners responden distinto a clientes "bot".
        headers: { 'User-Agent': 'Mozilla/5.0 (NightPass)' },
        signal: AbortSignal.timeout(4000),
      });
    } catch {
      return null;
    }

    // La URL final (tras redirects) puede ya traer coords.
    const fromResUrl = parseMapsCoordsFromUrl(res.url || '');
    if (fromResUrl) return fromResUrl;

    const location = res.headers.get('location');
    if (!location) {
      // No más redirects: último intento sobre el cuerpo (Google a veces mete
      // las coords en el HTML aunque la URL no las tenga).
      try {
        const body = await res.text();
        return parseMapsCoordsFromUrl(body);
      } catch {
        return null;
      }
    }

    const next = parseMapsCoordsFromUrl(location);
    if (next) return next;

    try {
      url = new URL(location, url).toString();
    } catch {
      return null;
    }
  }
  return null;
}
