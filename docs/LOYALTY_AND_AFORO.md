# NightPass — Aforo en vivo + Sistema NPP

Documento de referencia sobre cómo funciona el aforo en vivo de los bares y el
sistema de recompensas NightPass Points (NPP). Cubre conceptos, schema, flujos
y limitaciones conocidas.

> Última actualización: mayo 2026 · Cubre Fase 3 (Pass + Order + Scanner + Loyalty MVP).

---

## 1 · Visión general

Dos sistemas conectados:

| Sistema | Qué responde | Granularidad | Privacy |
|---|---|---|---|
| **Aforo en vivo** | ¿Qué tan lleno está el bar **ahora mismo**? | Bucket (`low/medium/high`) | k-anonymity, nunca expone conteo crudo |
| **NPP (NightPass Points)** | ¿Cuánto sale este usuario y qué tier merece? | Puntos enteros + streak + tier | Datos personales del propio usuario |

**Conexión clave:** cada interacción NPP (scan de pase o check-in en QR estático)
genera un `LocationPing` server-side con las coordenadas del venue → enriquece
el aforo sin depender del GPS opt-in del cliente.

---

## 2 · Aforo en vivo

### 2.1 · Concepto

Mostramos qué tan lleno está cada bar como **tres niveles cualitativos**, no
como porcentaje. La razón es privacy: si supiéramos que hay exactamente 47
personas y un user nuevo escanea su pase → de pronto hay 48, sabemos que ese
user específico entró. Por eso enmascaramos.

| Bucket | Pings distintos en ventana 15 min | UI |
|---|---|---|
| `low` | 0 – 4 | "Tranquilo" · verde · 1/3 barra |
| `medium` | 5 – 14 | "Moderado" · amber · 2/3 barra |
| `high` | ≥ 15 | "Lleno" · rojo · 3/3 barra |

### 2.2 · Fuentes de datos (tabla `location_pings`)

Cada fila representa "este user estuvo cerca de este punto en este instante".
Se llena por cuatro mecanismos:

| Source | Origen | Confianza |
|---|---|---|
| `APP_OPEN` | Cliente abre `/app` con permiso geolocation → frontend pinga | Media — depende de GPS del browser |
| `PASS_VIEW` | Cliente abre `/app/pases/[id]` (ver el QR) | Media |
| `REDEEM` | Cliente intenta redimir un pase (legacy) | Media |
| `SCAN_REDEEM` | **Staff escaneó un pass del user en la puerta** | **Alta** — coords del venue, no del user |
| `VENUE_CHECKIN` | **User escaneó el QR estático del bar** | **Alta** — server-side ping con coords del venue |

Los dos primeros dependen de que el cliente tenga la app abierta y GPS activo.
Los dos últimos son los que realmente dan aforo confiable porque los crea el
backend tras una acción humana validada.

### 2.3 · Algoritmo `countNearbyUsers`

Archivo: `server-nightpass/src/locations/locations.service.ts`.

```
Inputs: venueLat, venueLng, radiusM (default 100), windowMin (default 15)

1. cutoff = now() - windowMin minutos
2. SQL prefiltro (usa índice createdAt + lat/lng):
     WHERE createdAt >= cutoff
       AND lat BETWEEN venueLat ± dLat
       AND lng BETWEEN venueLng ± dLng
3. JS refina con Haversine para descartar pings fuera del círculo exacto:
     for each ping: meters = haversine(ping.lat, ping.lng, venueLat, venueLng)
                    if meters <= radiusM: insiders.add(ping.userId)
4. return insiders.size
```

`dLat` y `dLng` se calculan con padding 5% para no perder pings de borde
cuando Postgres redondea. La conversión grados↔metros usa 111_320 m/grado de
latitud, ajustado por `cos(lat)` para longitud.

### 2.4 · `getVenueOccupancy` (aplicación del bucket)

Archivo: `server-nightpass/src/catalog/catalog.service.ts`.

```ts
async getVenueOccupancy(venueId, windowMinutes = 15) {
  const venue = await prisma.venue.findUnique(...)
  if (!venue.latitude || !venue.longitude) return { bucket: 'low', ... }

  const radius = venue.geofenceRadiusM ?? 100
  const count = await locations.countNearbyUsers(lat, lng, radius, windowMinutes)

  // k-anonymity floor: < 3 unique users → siempre 'low'
  let bucket
  if (count < 3) bucket = 'low'
  else if (count <= 4) bucket = 'low'
  else if (count <= 14) bucket = 'medium'
  else bucket = 'high'

  return { venueId, windowMinutes, bucket, updatedAt }
}
```

### 2.5 · Endpoint público

`GET /api/v1/catalog/venues/:id/occupancy?windowMinutes=15`

- Sin auth — público.
- Sin rate limit (`@SkipThrottle()` en el controller).
- Response: `{ venueId, windowMinutes, bucket: 'low'|'medium'|'high', updatedAt: ISO }`.

### 2.6 · UI

Dos componentes consumen el endpoint:

- `VenueOccupancyBadge` (`cliente-nightpass/src/app/(customer)/_components/venue-occupancy-badge.tsx`) — chip pequeño en las tarjetas de venue.
- `FeaturedAforo` (`cliente-nightpass/src/app/(customer)/_components/featured-aforo.tsx`) — barra de 3 segmentos en el hero del Bar Featured de `/app`.

Ambos usan TanStack Query con `staleTime: 60s` y `refetchInterval: 90s`.

### 2.7 · Cleanup

`LocationsCleanup` (cron `@nestjs/schedule`) corre cada hora y borra pings con
`createdAt < now - 24h`. El sistema es **efímero por diseño** — el aforo solo
mira los últimos 15 min, no necesitamos histórico.

### 2.8 · Limitaciones reconocidas

- **Sin app abierta → no hay datos**. Hoy el aforo solo funciona si la mayoría
  de gente en el bar tiene NightPass abierto, o si ya escanearon su pase.
  Mientras la adopción es baja, el aforo casi siempre dará `low`.
- **Sin lat/lng en el venue → siempre `low`**. Admin debe llenar coordenadas
  desde el panel.
- **Radio fijo 100 m**. Editable por venue (`Venue.geofenceRadiusM`) pero no
  expuesto en UI admin todavía.
- **No diferencia "entró" de "está cerca"**. Alguien parado en la banqueta a
  80 m también cuenta. Solucionable a futuro con scan QR + flag "dentro" vs
  "afuera".
- **Una vez que Fase 3 esté en producción, el scan de pases pasa a ser la
  fuente dominante de pings de alta confianza**. El aforo se vuelve útil de
  verdad cuando empiezan los eventos.

---

## 3 · NPP — NightPass Points

### 3.1 · Concepto

Sistema tipo Foursquare/Swarm + Duolingo + Resy. El usuario gana puntos
(NPP) por aparecer en bares, construye una racha (streak) por noches
consecutivas, y un tier (`ROOKIE → REGULAR → INSIDER → VIP`) calculado de
los puntos del último año desbloquea acceso a categorías premium de eventos
(`EventTier.minLoyaltyTier`).

Tres mecanismos de ganancia:

| Acción | Trigger | NPP base | Side effects |
|---|---|---|---|
| **Event check-in** | Staff escanea pass del user en `/scanner` | **25** | `LocationPing source=SCAN_REDEEM` |
| **Venue check-in** | User escanea QR estático del bar | **10** | `LocationPing source=VENUE_CHECKIN` |
| **First-venue bonus** | Primera vez en ese venue (cualquier mecanismo) | **+15** | Emitido junto al evento principal |
| **Streak daily bonus** | Día consecutivo con check-in | **+5** | (configurado, no implementado en el award actual) |
| **Streak milestone** | Cruza 7 / 30 / 100 / 365 días | **+50 / +200 / +500 / +1000** | Idempotency `milestone:<userId>:<days>` |
| **Bring friend** (Fase 4) | Amigo del user también escaneó ±10min | +20 cada uno | Pendiente |
| **Admin adjust** | ADMIN compensa / penaliza vía endpoint | signed int | Idempotency `admin:<rand>:<userId>` |

### 3.2 · Multipliers

| Condición | Multiplier |
|---|---|
| Default | 1.0 |
| Weekend (Viernes 20:00 UTC → Domingo 06:00 UTC) | **1.5x** |
| Cumpleaños del user | **3.0x** (pendiente — `User.birthday` no existe aún) |

Puntos efectivos = `round(basePoints × multiplier)`. Esos son los que se
guardan en `LoyaltyEvent.points` (el multiplier original también se guarda
para auditoría).

### 3.3 · Streak math (UTC-day truncation)

Archivo: `server-nightpass/src/loyalty/loyalty.service.ts → applyReward`.

Para cada award:

1. Truncar fechas a UTC midnight (`Date.UTC(y, m, d)`).
2. Si `lastCheckinDate` es `null` → `currentDays = 1`.
3. Si `lastCheckinDate === hoy` → **no-op**, no extiende streak (mismo día no cuenta dos veces).
4. Si `lastCheckinDate === ayer` → `currentDays++`, `lastCheckinDate = hoy`.
5. Si gap > 1 día:
   - Si `freezesRemaining > 0` → consumir 1 freeze, mantener `currentDays`.
   - Si no → reset `currentDays = 1`.
6. `longestDays = max(longestDays, currentDays)`.
7. Si `currentDays ∈ {7, 30, 100, 365}` → emit segundo `LoyaltyEvent` tipo
   `STREAK_MILESTONE` en la misma transacción (idempotente por threshold).

**Freezes:** se recargan automáticamente. Si `freezesRefreshedAt` está en un
mes calendario anterior → `freezesRemaining = 2`. Equivale al modelo de
"streak freezes" de Duolingo.

### 3.4 · Tiers (sliding 365-day window)

| Tier | Year points |
|---|---|
| ROOKIE | 0 – 499 |
| REGULAR | 500 – 1,999 |
| INSIDER | 2,000 – 4,999 |
| VIP | 5,000+ |

`UserLoyaltyTotal.yearPoints` se recalcula dentro de `applyReward` sumando
todos los `LoyaltyEvent.points` del user en los últimos 365 días. Si el tier
cambia, `tierUpdatedAt` se actualiza.

### 3.5 · Tier gating en checkout

`EventTier.minLoyaltyTier` (campo opcional, default `null` = sin gate).

`OrdersService.create()` llama `loyalty.assertTierRequirement(userId, tier.minLoyaltyTier)` **antes** de generar el PaymentIntent. Si el user no llega al tier:

```
ForbiddenException: "Este tier requiere status INSIDER. Tu nivel: REGULAR"
```

→ Frontend muestra 403 con mensaje claro + link a `/app/recompensas`.

UI: en `/app/evento/[id]`, cada `EventTier` card que el user no califica
muestra:
- Chip "Requiere INSIDER"
- Botón comprar deshabilitado
- Link "¿Cómo subo de tier?" → `/app/recompensas`

### 3.6 · Idempotency (clave del diseño)

Cada award tiene una `idempotencyKey` única. El backend hace `prisma.loyaltyEvent.create` dentro de try/catch — si P2002 (unique constraint
violation), devuelve `awarded: 0, alreadyAwarded: true` sin error.

| Tipo | Idempotency key |
|---|---|
| Event check-in (pass scan) | `scan:<passId>` |
| Venue check-in (QR estático) | `checkin:<venueId>:<userId>:<YYYY-MM-DD-UTC>` |
| First-venue bonus | `first-venue:<userId>:<venueId>` |
| Streak milestone | `milestone:<userId>:<days>` |
| Admin adjust | `admin:<8-hex-rand>:<userId>` |

**Implicación:** un user solo puede ganar venue check-in 1 vez por bar por
día. Un pass solo da puntos una vez (la primera vez que se escanea).

---

## 4 · Flujos completos

### 4.1 · Event check-in (pass scan)

```
User compra pass → Pass.qrCode = "np_<passId>_<hmac>"
                ↓
User llega al bar → muestra QR en pantalla
                ↓
Staff abre /scanner → escanea QR del user
                ↓
PassesService.scan() valida:
  ├─ HMAC OK (timing-safe)
  ├─ Pass no usado antes
  ├─ Pass del evento del venue del staff
  ├─ Geofence: el user pinga reciente cerca del venue
  └─ Marca Pass.usedAt = now
                ↓
Side effects fire-and-forget:
  ├─ loyalty.awardPassScan({userId, passId, eventId, venueId, scannedAt})
  │    ├─ applyReward type=EVENT_CHECKIN basePoints=25
  │    └─ first-venue bonus si aplica
  └─ locations.record({lat: venue.lat, lng: venue.lng, source: SCAN_REDEEM})
       → enriquece aforo del bar
```

### 4.2 · Venue check-in (QR estático)

#### Setup (admin)

```
Admin → /admin/locales → drawer del venue → tab "Check-in QR"
       ↓
POST /api/venues/:id/checkin-qr/rotate
       ↓
Backend:
  ├─ secret = randomBytes(32).toString('hex')
  ├─ guarda Venue.checkinQrSecret = secret + Venue.checkinQrIssuedAt = now
  ├─ payload = "np_checkin_<venueId>_<hmacSha256(secret, 'checkin:'+venueId)>"
  └─ scanUrl = ADMIN_WEB_URL + "/app/checkin/<venueId>?t=<hmac>"
       ↓
Owner descarga PDF (botón "Imprimir / PDF") → cartel con branding NightPass + QR
       ↓
Pega cartel impreso en la entrada del bar
```

#### Uso (user)

**Camino A — escanea con cámara nativa del celular:**
```
User apunta cámara → reconoce URL → tap → abre browser
       ↓
http://<ADMIN_WEB_URL>/app/checkin/<venueId>?t=<hmac>
       ↓
Middleware: si no logueado → /app/iniciar-sesion?from=<full-url-with-search>
                            ↓
                       login → use-customer-login redirige a `from`
                            ↓
       Logueado → CheckinFromUrlPage:
         ├─ Pide geolocation
         ├─ Reconstruye payload "np_checkin_<venueId>_<hmac>"
         ├─ POST /api/loyalty/checkin {venueId, qrPayload, lat, lng}
         ├─ Backend valida HMAC + GPS dentro de geofence+50m + idempotency 1/día
         ├─ Si OK: loyalty.applyReward type=VENUE_CHECKIN basePoints=10
         │         + locations.record source=VENUE_CHECKIN
         └─ Success animation +10 NPP → redirect /app/recompensas
```

**Camino B — escanea desde la app NightPass (`/app/recompensas/scan`):**
```
ZXing decodifica URL del QR
parseCheckinQr() acepta ambos formatos (raw + URL)
Extrae venueId + hmac → reconstruye payload → mismo POST checkin
```

### 4.3 · Admin adjust

```
ADMIN → POST /api/admin/loyalty/adjust { userId, points (signed), reason }
              ↓
        applyReward type=ADMIN_ADJUST basePoints=points multiplier=1
              ↓
        UserLoyaltyTotal recalculado → tier puede cambiar
```

Usar para:
- Compensar usuarios por bugs / cancelaciones.
- Boost manual (ej. "premio early adopter").
- Penalizar fraude (con `points` negativo).

No hay UI todavía — invocar vía curl / Postman.

---

## 5 · Schema (Prisma)

Archivo: `server-nightpass/prisma/schema.prisma`.

```prisma
enum LoyaltyTier { ROOKIE REGULAR INSIDER VIP }

enum LoyaltyEventType {
  EVENT_CHECKIN
  VENUE_CHECKIN
  FIRST_VENUE_BONUS
  STREAK_DAILY_BONUS
  STREAK_MILESTONE
  BRING_FRIEND_BONUS
  ADMIN_ADJUST
}

enum LocationPingSource {
  APP_OPEN PASS_VIEW REDEEM
  SCAN_REDEEM       // server-side al escanear pass
  VENUE_CHECKIN     // server-side al check-in QR estático
}

model LoyaltyEvent {
  id              String   @id @default(uuid(7))
  userId          String
  type            LoyaltyEventType
  points          Int
  multiplier      Float    @default(1)
  venueId         String?
  eventId         String?
  passId          String?
  idempotencyKey  String   @unique
  occurredAt      DateTime @default(now())
  metadata        Json?
  // ... relations
}

model UserStreak {
  userId             String   @id
  currentDays        Int      @default(0)
  longestDays        Int      @default(0)
  lastCheckinDate    DateTime?
  freezesRemaining   Int      @default(2)
  freezesRefreshedAt DateTime @default(now())
  // ...
}

model UserLoyaltyTotal {
  userId        String      @id
  totalPoints   Int         @default(0)
  yearPoints    Int         @default(0)
  tier          LoyaltyTier @default(ROOKIE)
  tierUpdatedAt DateTime    @default(now())
  // ...
}

model Venue {
  // ... fields existentes
  checkinQrSecret   String?    // null = check-in deshabilitado
  checkinQrIssuedAt DateTime?
}

model EventTier {
  // ... fields existentes
  minLoyaltyTier LoyaltyTier?   // null = abierto a todos
}
```

---

## 6 · API — referencia

| Método | Ruta | Auth | Throttle | Body / Query |
|---|---|---|---|---|
| GET | `/api/v1/catalog/venues/:id/occupancy?windowMinutes=15` | — | — | — |
| POST | `/api/v1/passes/scan` | JWT (STAFF+) | 30/min | `{ qrCode, latitude?, longitude?, accuracyM? }` |
| GET | `/api/v1/me/loyalty` | JWT | default | — |
| GET | `/api/v1/me/loyalty/history?limit=50` | JWT | default | — |
| POST | `/api/v1/me/loyalty/checkin` | JWT | 6/min | `{ venueId, qrPayload, latitude, longitude }` |
| GET | `/api/v1/leaderboard/city/:city` | JWT | default | (k-anonymity: <5 users con yearPoints>0 → 404) |
| POST | `/api/v1/venues/:id/checkin-qr/rotate` | JWT + ADMIN \| OWNER | default | — |
| POST | `/api/v1/admin/loyalty/adjust` | JWT + ADMIN | default | `{ userId, points, reason }` |

### Response shapes

**`GET /me/loyalty`** → `LoyaltyStatus`
```ts
{
  totalPoints: number;
  yearPoints: number;
  tier: LoyaltyTier;
  nextTier: LoyaltyTier | null;
  pointsToNext: number | null;
  streak: { current, longest, freezesRemaining, lastCheckinDate }
}
```

**`POST /me/loyalty/checkin`** → 
```ts
{
  awarded: number;                  // 0 si ya hizo check-in hoy
  newStreakDays: number;
  tier: LoyaltyTier;
  alreadyCheckedInToday?: boolean;
}
```

**`POST /venues/:id/checkin-qr/rotate`** →
```ts
{
  payload: string;     // "np_checkin_<venueId>_<hmacHex>"
  scanUrl: string;     // URL completa para cámara nativa
  issuedAt: string;    // ISO date
}
```

---

## 7 · Anti-cheat (defense in depth)

| Mecanismo | Propósito |
|---|---|
| HMAC del QR estático | Solo backend puede generar el payload. Robar la imagen del QR no permite forjar nuevos |
| Geofence en venue check-in | GPS del user debe estar dentro de `venue.geofenceRadiusM + 50m`. Backend valida con haversine |
| Idempotency `checkin:<venueId>:<userId>:<YYYY-MM-DD>` | Un user solo puede check-in 1 vez por bar por día UTC |
| Idempotency `scan:<passId>` | Un pass solo da puntos una vez aunque se escanee dos veces |
| Throttle 6/min user en `/me/loyalty/checkin` | Imposible brute-forcear payloads aleatorios |
| Rotate QR | Si owner cree que se filtró el secret, rota — el QR anterior deja de funcionar instantáneamente |
| k-anonymity en leaderboard | Ciudad con <5 users con puntos > 0 → 404 |
| Nombres anonimizados en leaderboard | "Carlos D." en vez de nombre completo |

---

## 8 · Cómo añadir un nuevo venue al sistema

1. Admin crea venue desde `/admin/locales` (panel web).
2. Venue tiene que tener `latitude` + `longitude` + `geofenceRadiusM` (default 100m).
3. Admin abre drawer del venue → tab "Check-in QR" → botón "Generar QR".
4. Backend devuelve `{ payload, scanUrl, issuedAt }`.
5. Admin tap "Imprimir / PDF" → se abre cartel branded → "Guardar como PDF".
6. Owner imprime y pega el cartel físico en la entrada del bar.
7. A partir de ese momento, cualquier user logueado puede check-in escaneando el QR.

Si el owner del bar suspecha que el QR se filtró → mismo drawer → botón "Rotar QR" → el anterior deja de funcionar.

---

## 9 · Cómo testear localmente

### Setup
```bash
brew services start postgresql@16
brew services start redis
cd server-nightpass && pnpm install && pnpm prisma migrate dev && pnpm db:seed
cd ../cliente-nightpass && pnpm install
```

### Seed crea:
- Customer demo `cliente@nightpass.local` con **INSIDER tier · 2082 NPP · 38 días streak** y 29 LoyaltyEvent históricos.
- Bar Demo con QR check-in rotado (payload en el log del seed).

### Smoke test end-to-end
1. `cd server-nightpass && pnpm start:dev` (puerto 7101)
2. `cd cliente-nightpass && pnpm dev` (puerto 7100)
3. Login `cliente@nightpass.local` / `ClienteTest123` → ir a `/app/recompensas`
4. Ver: tier INSIDER · 38 días streak · historial completo
5. Login admin → `/admin/locales` → Bar Demo → drawer → "Check-in QR" → "Rotar QR" → "Imprimir / PDF"
6. Mostrar QR en otra pantalla (o imprimir)
7. **Para test con cámara real de celular**: usar `ngrok http 7100` o IP LAN (`http://192.168.x.x:7100`). `localhost` desde el celular no funciona.
8. Cámara nativa del celular → escanea → abre URL → login si necesario → procesa check-in → +10 NPP

---

## 10 · Diferido (post-MVP)

| Item | Razón | Cuándo |
|---|---|---|
| Birthday multiplier 3x | `User.birthday` no existe | Cuando se agregue |
| Friends leaderboard + "trae amigo" +20 | Depende de `Friendship` model | Fase 4 (Social) |
| Push notif "racha en riesgo" | Depende de FCM + push tokens | Fase 5 |
| Mayor of venue badge (Foursquare-style) | Query agregada extra | Post-MVP |
| Tier perks ≠ event-gate (% descuento, comp drinks) | Requiere acuerdos con venues | Post-MVP |
| Flutter UI | Se decidió web-only por ahora | N/A |
| Unit / E2E tests del módulo loyalty | Proyecto no tiene tests aún | Fase 5 |
| Admin UI `/admin/loyalty/adjust` | Endpoint backend existe, no UI | Trivial — añadir cuando se requiera |
| `user.primaryCity` para leaderboard personalizado | Fallback actual: Cuernavaca hardcoded | Cuando se agregue el campo |

---

## 11 · Archivos críticos (mapa)

**Backend (`server-nightpass/`):**
- `prisma/schema.prisma` — todos los models nuevos
- `prisma/seeds/loyalty.ts` — seed demo data
- `src/loyalty/` — service, controller, constants
- `src/loyalty-checkin/` — controller separado para `/me/loyalty/checkin` + `/venues/:id/checkin-qr/rotate`
- `src/common/qr-hmac.ts` — `signVenueCheckin` / `verifyVenueCheckin`
- `src/locations/locations.service.ts` — `countNearbyUsers`, `record`
- `src/catalog/catalog.service.ts` — `getVenueOccupancy` con k-anonymity
- `src/passes/passes.service.ts` — hook que dispara `loyalty.awardPassScan` + ping
- `src/orders/orders.service.ts` — validación `assertTierRequirement` antes de PaymentIntent

**Cliente web (`cliente-nightpass/`):**
- `src/features/loyalty/` — components, hooks, tier-styles
- `src/app/(customer)/app/recompensas/page.tsx` — landing del sistema
- `src/app/(customer)/app/recompensas/scan/page.tsx` — scanner con cámara web
- `src/app/(customer)/app/checkin/[venueId]/page.tsx` — auto-procesamiento desde URL
- `src/app/(customer)/_components/featured-aforo.tsx` — barra de aforo
- `src/app/(customer)/_components/venue-occupancy-badge.tsx` — chip de aforo
- `src/features/venues/components/checkin-qr-panel.tsx` — admin: rotar + descargar PDF
- `src/middleware.ts` — protege `/app/recompensas` + `/app/checkin` + preserva search string al redirigir a login

---

## 12 · Glosario

- **NPP** — NightPass Points. Moneda interna del sistema de loyalty.
- **Tier** — Rango status del user. `ROOKIE / REGULAR / INSIDER / VIP`. Calculado de los puntos de los últimos 365 días.
- **Streak** — Racha de noches consecutivas con al menos un check-in (en cualquier bar).
- **Freeze token** — Permite saltarse 1 día sin perder la racha. 2 gratis por mes, recargados automáticamente.
- **Milestone** — Hito de racha (7, 30, 100, 365 días). Otorga bonus único.
- **Geofence** — Radio en metros alrededor del venue dentro del cual un ping cuenta como "estar adentro".
- **k-anonymity** — Técnica de privacy: nunca exponer datos cuando el conjunto es tan pequeño que permite identificar individuos.
- **Idempotency key** — String único que evita que la misma acción otorgue puntos dos veces (ej. mismo pass escaneado 2 veces).
- **Bucket** — Categoría cualitativa para representar el aforo (`low / medium / high`).
- **HMAC** — Hash con clave secreta. Usado para firmar el payload del QR estático del venue.
