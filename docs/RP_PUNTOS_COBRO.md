# RP — Puntos de cobro en efectivo (con mapa OpenStreetMap)

Rediseño de la **entrega/cobro de boletos en efectivo** por parte de los RP (relaciones
públicas). Canal 100% físico: el RP cobra efectivo en persona. Este doc es el blueprint.

## Problema

Hoy el RP, para vender en efectivo a N personas, termina coordinando por WhatsApp **1 a 1**
("¿dónde nos vemos para que me pagues?"). Con 50 compradores son 50 chats + perseguir pagos.
Además necesita el **dinero antes** del evento (para ir comprando), así que "pagar en la
puerta" no le sirve como única opción. Y si fija un solo punto, el que le queda lejos se raja
→ se pierde la venta.

## Solución

El RP define **varios puntos de cobro** (lugar + coordenadas + horarios). El cliente, al
elegir pagar en efectivo, ve un modal **"¿dónde te queda mejor recoger?"** con los puntos
**ordenados por cercanía** a su ubicación. Elige punto + día/hora → queda **reservado**
(sin pagar todavía) en la **cola de ese punto**. El RP trabaja de **un solo tablero**
agrupado por punto: cobra el efectivo en persona y marca **"pagado"** → el pase se emite
solo a la cuenta del cliente.

Reemplaza: 50 chats de WhatsApp → **1 link + 1 tablero con estados** (pendiente/pagado).

Claves de diseño:

- **Reserva ≠ pago.** Reservar aparta el lugar; el pago en efectivo se hace al verse. La
  ubicación nunca bloquea la venta.
- **Cercanía sin API de pago.** Distancia con **Haversine** (`common/geo` ya existe). No se
  necesita Google Maps API para "el más cercano".
- **Mapa con OpenStreetMap + Leaflet** (gratis, sin API key) para que el RP suelte un pin y el
  cliente vea el punto / "cómo llegar".
- **Multi-RP por zona.** Reusa el geo-routing actual (ciudad/estado): el cliente cae con el RP
  (y los puntos) de su zona.

## Modelo de datos

### Nuevo: `RpPickupPoint`

```prisma
model RpPickupPoint {
  id          String   @id @default(uuid(7)) @db.Uuid
  rpProfileId String   @db.Uuid
  label       String                 // "Plaza Cuernavaca"
  latitude    Float
  longitude   Float
  mapsUrl     String?                // link Google Maps para "cómo llegar"
  // Ventanas horarias: array JSON de { dow, start, end }.
  //   dow: 0-6 (Dom-Sáb) o null = cualquier día (ej. la puerta el día del evento).
  //   start/end: "HH:mm" 24h.
  windows     Json     @default("[]")
  // La "puerta del evento": punto especial, siempre se muestra al final como red de
  // seguridad (dinero del día del evento, pero no se pierde la venta).
  isVenueDoor Boolean  @default(false)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  rpProfile RpProfile                @relation(fields: [rpProfileId], references: [id], onDelete: Cascade)
  requests  PhysicalPaymentRequest[]

  @@index([rpProfileId, isActive])
  @@map("rp_pickup_points")
}
```

Relación inversa en `RpProfile`: `pickupPoints RpPickupPoint[]`.

### Extender `PhysicalPaymentRequest` (la "reserva" ya existe)

```prisma
  // Punto de cobro elegido por el cliente + slot (día/hora) elegido.
  pickupPointId String?        @db.Uuid
  pickupAt      DateTime?
  pickupPoint   RpPickupPoint? @relation(fields: [pickupPointId], references: [id], onDelete: SetNull)
```

El `assignedRpId` se setea al **RP dueño del punto elegido** (en vez del geo-routing ciego).
El resto del flujo (confirm-cobro → Order CASH + `issuePasses` → pase) se reusa **tal cual**.

## Parseo del link de Google Maps → coordenadas

Util `parseMapsCoords(url)` en `common/`:

1. Regex sobre la URL: `@<lat>,<lng>` (vista), `?q=<lat>,<lng>`, `!3d<lat>!4d<lng>`,
   `/place/.../@lat,lng`. Devuelve `{ lat, lng }` o `null`.
2. **Short links** (`maps.app.goo.gl/…`, `goo.gl/maps/…`): no traen coords, redirigen. Se
   resuelve server-side siguiendo el redirect (HEAD/GET sin seguir auto, leer `location`)
   hasta obtener la URL larga, luego regex.
3. Fallback: si el RP pega `lat,lng` directo, se acepta.

Geocodificar un texto de dirección → coords queda **fuera de MVP** (necesitaría Nominatim
OSM). El RP pega link o suelta pin; eso da coords sin geocoding.

## Cercanía (Haversine)

`haversineMeters(lat1,lng1,lat2,lng2)` ya existe en `server-nightpass/src/common/geo`.
El endpoint de listado recibe `lat/lng` del cliente (geolocalización del browser) y ordena
los puntos por distancia ascendente. La puerta (`isVenueDoor`) siempre al final.

Línea recta, no ruta de manejo — suficiente para "¿cuál me queda cerca?". Rutas reales
necesitarían API de pago; no aplica.

## Endpoints

### RP (panel)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/rp/pickup-points` | Listar mis puntos |
| POST | `/rp/pickup-points` | Crear `{label, mapsUrl?|lat,lng, windows[], isVenueDoor?}` — parsea link |
| PATCH | `/rp/pickup-points/:id` | Editar |
| DELETE | `/rp/pickup-points/:id` | Desactivar (soft) |
| GET | `/rp/pickup-points/:id/queue` | Cola de reservas de ese punto (pendiente/pagado) |

### Cliente (app)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/physical-payments/pickup-points?eventId=&lat=&lng=` | Puntos del RP de su zona, ordenados por cercanía |
| POST | `/physical-payments` | Extendido: acepta `pickupPointId` + `pickupAt`; setea `assignedRpId` = RP del punto |

`POST /physical-payments/:id/confirm` se reusa sin cambios (marca pagado → emite pase).

## Frontend

### Panel RP — manager de puntos

`cliente-nightpass/src/features/rp/components/pickup-points-manager.tsx`:
- Lista de puntos (label, horarios, mapa mini).
- Crear/editar: campo "pega link de Google Maps" **o** mapa Leaflet+OSM para soltar pin
  (extrae coords). Editor de ventanas: día + hora inicio/fin (chips, varias por punto).
- Plantillas de horario rápido (fin de semana 8–9pm / 12–1pm).

### Cliente — modal "¿dónde recoger?"

Al elegir efectivo en checkout:
1. Pedir geolocalización del browser (con motivo claro).
2. `GET /physical-payments/pickup-points` con lat/lng → lista ordenada por cercanía,
   cada uno con distancia ("a 2.3 km"), preview Leaflet, botón "Cómo llegar" (abre `mapsUrl`).
3. Elegir punto + día/hora disponible → `POST /physical-payments` con `pickupPointId`+`pickupAt`.
4. Estado: "Reservado. Paga en efectivo en [punto] el [día/hora]. Tu pase aparece aquí al pagar."
- **Sin permiso GPS:** fallback → ordenar por ciudad/zona (ya se guarda `city`/`state`) y elegir manual.

### RP — tablero por punto

`physical-requests-section` agrupado por punto/horario, con estados pendiente/pagado y botón
"cobrado" (confirm). El que no llegó: su reserva expira (`expiresAt`) y libera capacidad.

## OpenStreetMap / Leaflet

- Librería: `react-leaflet` + `leaflet` (MIT, gratis).
- Tiles: OSM estándar `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` con **atribución
  obligatoria** "© OpenStreetMap contributors". Para producción a volumen, considerar un tile
  provider (MapTiler free tier / self-host); en MVP el tile OSM público basta.
- Uso: (a) RP suelta pin → coords; (b) cliente ve preview del punto. Sin API key.
- Importar Leaflet solo en cliente (`'use client'` + dynamic import, sin SSR) porque toca
  `window`.

## Fases

1. **Backend datos** — modelo `RpPickupPoint` + extensión `PhysicalPaymentRequest` + migración.
2. **Backend lógica** — parser de Maps link + endpoints CRUD + listado por cercanía + reservar.
3. **Frontend RP** — manager de puntos con Leaflet (pin/link) + horarios.
4. **Frontend cliente** — modal de cercanía con geolocalización + Leaflet preview.
5. **Tablero RP** — agrupar cola por punto + confirmar.
6. **Verificación** — type-check + lint ambos proyectos.

## Edge cases

- **Sin GPS:** ordenar por ciudad/zona, no romper.
- **Short link sin coords:** resolver redirect; si falla, pedir al RP pin o `lat,lng`.
- **Door fallback:** siempre ofrecer la puerta para no perder ventas; va al final.
- **No-show:** reserva expira en `expiresAt` (≤ event.startsAt) y libera capacidad.
- **Capacidad:** se respeta el chequeo existente (tier+evento+pendientes) al confirmar.
- **Atribución:** `referredByRpId` = RP del punto que confirmó (ya lo hace confirm-cobro).
