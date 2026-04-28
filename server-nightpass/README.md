# NightPass API

Backend NestJS + Fastify + Prisma + Postgres + Redis para la app NightPass.

## Requisitos locales

- Node 20+
- pnpm
- Postgres 16 corriendo (`brew services start postgresql@16`)
- Redis corriendo (`brew services start redis`)
- Base de datos `nightpass_dev` ya creada

## Setup inicial

```bash
pnpm install
pnpm prisma migrate dev          # aplica migraciones
pnpm db:seed                     # crea usuarios de prueba
pnpm start:dev                   # arranca el API en http://localhost:7101/api/v1
```

## Seeder — usuarios de arranque

`pnpm db:seed` crea (idempotente) un usuario por cada rol del sistema:

| Rol | Email | Password | Para usar en |
| --- | --- | --- | --- |
| `ADMIN` | `admin@nightpass.local` | `AdminTest123` | Panel web — acceso completo |
| `VENUE_OWNER` | `dueno@nightpass.local` | `DuenoTest123` | Panel web — gestiona su local. Viene con `Bar Demo` (slug `bar-demo-seed`) + `VenueOwner` |
| `VENUE_STAFF` | `staff@nightpass.local` | `StaffTest123` | **Panel web** (sidebar restringido a "Mi local") **y app móvil** (escaneo de QR en la puerta). El owner lo invita desde el panel con `POST /venues/:id/staff` |
| `CUSTOMER` | `cliente@nightpass.local` | `ClienteTest123` | **Solo app móvil** — `POST /auth/signin-web` lo rechaza con 403 |

> `VENUE_STAFF` es el único rol que usa **ambas superficies**: app móvil para validar QRs en la puerta y panel web para gestión básica de su local. `CUSTOMER` nunca puede entrar al panel.

Override por env vars (opcional):
```bash
SEED_ADMIN_EMAIL=otro@admin.com  SEED_ADMIN_PASSWORD=OtraPass1 \
SEED_OWNER_EMAIL=otro@dueno.com  SEED_OWNER_PASSWORD=OtraPass2 \
pnpm db:seed
```

## Endpoints

Todos bajo `/api/v1`. Headers para rutas protegidas: `Authorization: Bearer <accessToken>`.

### Auth

| Método | Ruta | Descripción | Auth |
| ------ | ---- | ----------- | ---- |
| POST | /auth/signup | Crear cuenta (app móvil) | — |
| POST | /auth/signin | Login — todos los roles | — |
| POST | /auth/signin-web | Login — rechaza CUSTOMER (panel) | — |
| POST | /auth/refresh | Renovar tokens | — |
| GET | /auth/me | Perfil actual (incluye `mustChangePassword`) | JWT |
| POST | /auth/change-password | Cambiar contraseña (`{oldPassword, newPassword}`) | JWT |

### Venue applications (A1 + A1.5)

| Método | Ruta | Descripción | Auth |
| ------ | ---- | ----------- | ---- |
| POST | /venue-applications | Solicitar registro de local (sin password). 409 si email ya es ADMIN/OWNER/STAFF | — |
| GET | /venue-applications | Listar (`?status=PENDING\|APPROVED\|REJECTED`) | JWT + ADMIN |
| GET | /venue-applications/:id | Detalle | JWT + ADMIN |
| POST | /venue-applications/:id/approve | Aprobar — genera contraseña temporal, la devuelve en `temporaryPassword` y manda email | JWT + ADMIN |
| POST | /venue-applications/:id/reject | Rechazar (`{reason?}`) | JWT + ADMIN |

### Usuarios (A1.5)

| Método | Ruta | Descripción | Auth |
| ------ | ---- | ----------- | ---- |
| GET | /users | Listar (`?role=`, `?search=`, paginado). Nunca serializa `passwordHash` | JWT + ADMIN |
| GET | /users/:id | Detalle + aplicaciones + locales que posee | JWT + ADMIN |

### Locales — gestión admin (A1.5)

| Método | Ruta | Descripción | Auth |
| ------ | ---- | ----------- | ---- |
| GET | /venues | Listar (`?status=`, `?city=`, `?search=`) | JWT + ADMIN |
| GET | /venues/:id | Detalle con owners | JWT + ADMIN |
| PATCH | /venues/:id | Editar `name/city/address/phone`. `slug` y `status` bloqueados | JWT + ADMIN |
| POST | /venues/:id/suspend | `status=SUSPENDED` | JWT + ADMIN |
| POST | /venues/:id/reactivate | `status=ACTIVE` | JWT + ADMIN |

### Equipo del local (A2)

| Método | Ruta | Descripción | Auth |
| ------ | ---- | ----------- | ---- |
| POST | /venues/:id/staff | Invitar por email + nombre + rol (MANAGER\|SCANNER). Genera contraseña temporal si es cuenta nueva o CUSTOMER | JWT + ADMIN/OWNER |
| GET | /venues/:id/staff | Listar staff activo con datos del usuario | JWT + ADMIN/OWNER |
| DELETE | /venues/:id/staff/:userId | Revocar (soft delete, `status=REVOKED`) | JWT + ADMIN/OWNER |

### Catálogo público (Fase 2)

| Método | Ruta | Descripción | Auth |
| ------ | ---- | ----------- | ---- |
| GET | /catalog/venues | Listar locales activos (`?lat&lng&radiusKm&search&category&page`) | — |
| GET | /catalog/venues/:slug | Detalle con eventos PUBLISHED futuros y fotos | — |
| GET | /catalog/events/:id | Detalle de evento con tiers | — |

### Eventos (Fase 2)

| Método | Ruta | Descripción | Auth |
| ------ | ---- | ----------- | ---- |
| GET | /events | Listar (`?venueId=`, `?status=`, paginado) | JWT + ADMIN/OWNER/STAFF |
| POST | /events | Crear evento (`{venueId, title, startsAt, endsAt, …}`) | JWT + ADMIN/OWNER |
| GET | /events/:id | Detalle con tiers | JWT + ADMIN/OWNER |
| PATCH | /events/:id | Actualizar (sin venueId) | JWT + ADMIN/OWNER |
| DELETE | /events/:id | Eliminar | JWT + ADMIN/OWNER |
| POST | /events/:id/tiers | Añadir tier (`{name, priceCents, currency?, capacity?, position?}`) | JWT + ADMIN/OWNER |
| PATCH | /events/:id/tiers/:tierId | Actualizar tier | JWT + ADMIN/OWNER |
| DELETE | /events/:id/tiers/:tierId | Eliminar tier | JWT + ADMIN/OWNER |

### Uploads (Fase 2)

| Método | Ruta | Descripción | Auth |
| ------ | ---- | ----------- | ---- |
| POST | /uploads/sign | Devuelve `{signedUrl, publicUrl}` para upload directo a R2 (`{filename, contentType, kind}`) | JWT + ADMIN/OWNER/STAFF |

## Variables de entorno

Copiar `.env.example` a `.env`:

```bash
# Base de datos
DATABASE_URL=postgresql://charlesdays@localhost:5432/nightpass_dev
REDIS_URL=redis://localhost:6379

# JWT (cambiar en producción — mínimo 32 chars)
JWT_ACCESS_SECRET=dev-secret-access-32-chars-minimum
JWT_REFRESH_SECRET=dev-secret-refresh-32-chars-minimum
JWT_ACCESS_TTL=900        # 15 minutos en segundos
JWT_REFRESH_TTL=2592000   # 30 días en segundos

# Email transaccional (opcional — sin esto el mailer logea en modo no-op)
RESEND_API_KEY=re_xxxxx
MAIL_FROM=NightPass <noreply@nightpass.app>
ADMIN_NOTIFICATION_EMAIL=admin@nightpass.app
ADMIN_WEB_URL=http://localhost:7100

# Cloudflare R2 (opcional — sin esto /uploads/sign devuelve URLs placeholder)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=nightpass-media
R2_PUBLIC_URL=https://pub-XXXXX.r2.dev
```

## Estructura de módulos

```
src/
├── main.ts                  # bootstrap Fastify + ValidationPipe + prefix /api/v1
├── app.module.ts            # registro de todos los módulos
├── config/env.schema.ts     # validación de env con Zod (falla rápido al boot)
├── prisma/                  # PrismaService (@Global)
├── auth/                    # signup, signin, refresh, me, change-password, JWT guards
├── mailer/                  # Resend SDK + templates (no-op sin API key)
├── storage/                 # R2Service con presigned URLs (no-op sin credenciales)
├── catalog/                 # endpoints públicos para la app móvil
├── venues/                  # gestión de locales (admin) + helpers createWithOwner
├── venue-staff/             # invitación y gestión del equipo de cada local
├── venue-applications/      # solicitudes de registro + aprobación con temp password
├── events/                  # CRUD de eventos y tiers por local
├── uploads/                 # endpoint de firma para upload directo a R2
├── users/                   # listado y detalle de usuarios (admin, read-only)
└── health/                  # healthcheck con check de Postgres
```

## Schema Prisma — tablas actuales

| Tabla | Descripción |
| ----- | ----------- |
| `users` | Usuario (ADMIN/VENUE_OWNER/VENUE_STAFF/CUSTOMER). Incluye `mustChangePassword` |
| `refresh_tokens` | Tokens de refresh hasheados con SHA-256, rotación one-time-use |
| `venues` | Local (nombre, slug, ciudad, lat/lng, categorías, openHours, coverImageUrl, …) |
| `venue_owners` | Relación N:N usuario ↔ venue (dueños) |
| `venue_staff` | Equipo del local (rol MANAGER/SCANNER, status PENDING/ACTIVE/REVOKED) |
| `venue_applications` | Solicitudes de registro (PENDING/APPROVED/REJECTED) |
| `events` | Evento de un local (DRAFT/PUBLISHED/CANCELED, con slug único por venue) |
| `event_tiers` | Tiers de precio de un evento (Early Bird, General, VIP, …) |
| `photos` | Fotos de venue o evento |

Todos los IDs son **UUID v7** (`@default(uuid(7)) @db.Uuid`) — time-ordered, sin fragmentación de índice.

## Flujo de onboarding de un bar

1. Dueño llena `POST /venue-applications` (sin password).
2. ADMIN aprueba con `POST /venue-applications/:id/approve`:
   - Crea el `Venue` y la relación `VenueOwner`.
   - Genera contraseña temporal de 12 chars (alfanumérico, sin 0/O/1/l/I).
   - La hashea con argon2id **fuera de la transacción**.
   - La persiste en el `User` + `mustChangePassword=true`.
   - Devuelve `{...application, temporaryPassword}`.
3. Dueño entra con la contraseña temporal → ve banner → va a `/cambiar-password`.

## Limitaciones conocidas

- Panel de usuarios read-only (sin baneo, cambio de rol manual, ni eliminación).
- Slug del evento/venue inmutable tras creación.
- Contraseña temporal en cleartext en el email (TODO: magic link).
- Sin tests E2E aún (Fase 5).
- Rate limit en `/passes/scan` pendiente cuando se implemente el módulo de pases (Fase 3).
