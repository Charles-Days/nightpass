# NightPass

Plataforma de vida nocturna: catálogo de bares, eventos, pases digitales y social.

El proyecto es un monorepo con tres aplicaciones independientes que comparten el mismo dominio.

---

## Estructura del monorepo

```
nightpass/
├── server-nightpass/    # API REST — NestJS + Fastify + Prisma + PostgreSQL + Redis
├── cliente-nightpass/   # Panel web de administración — Next.js 15 (App Router)
└── app-nightpass/       # App móvil — Flutter (iOS + Android)
```

### server-nightpass

API backend del sistema. Expone todos los endpoints bajo `/api/v1`.

Gestiona autenticación (JWT + refresh tokens), solicitudes de locales, usuarios, eventos, catálogo público, uploads a R2 y envío de emails transaccionales. Base de datos PostgreSQL con Prisma, cache con Redis.

Puerto por defecto: `7101`

Ver [server-nightpass/README.md](server-nightpass/README.md) para el detalle completo de endpoints, esquema de base de datos y variables de entorno.

### cliente-nightpass

Panel web de administración y gestión. Usado por administradores (`ADMIN`), dueños de locales (`VENUE_OWNER`) y staff (`VENUE_STAFF`). Construido en Next.js 15 con App Router.

Incluye landing pública, formulario de solicitud de local, paneles de gestión de usuarios, locales, solicitudes, eventos y staff.

Puerto por defecto: `7100`

Ver [cliente-nightpass/README.md](cliente-nightpass/README.md) para setup y estructura.

### app-nightpass

App móvil para usuarios finales (`CUSTOMER`) y staff (`VENUE_STAFF`). Construida en Flutter.

Pantallas de descubrimiento de bares, eventos, pases digitales, stories y social. Auth completamente integrado con el backend. El resto de pantallas están construidas a nivel de UI, pendientes de conectar a endpoints reales en fases siguientes.

Ver [app-nightpass/README.md](app-nightpass/README.md) para instrucciones por plataforma (simulador, emulador, dispositivo físico).

---

## Requisitos previos

- Node 20+
- pnpm (`npm install -g pnpm`)
- Flutter SDK
- PostgreSQL 16 (`brew install postgresql@16`)
- Redis (`brew install redis`)

---

## Levantar el entorno completo

### 1. Servicios de base de datos

```bash
brew services start postgresql@16
brew services start redis
```

### 2. Backend (server-nightpass)

```bash
cd server-nightpass
pnpm install
cp .env.example .env        # editar con tus valores
pnpm prisma migrate dev     # aplica migraciones (primera vez)
pnpm db:seed                # crea usuarios de prueba
pnpm start:dev              # http://localhost:7101/api/v1
```

### 3. Panel web (cliente-nightpass)

En otra terminal:

```bash
cd cliente-nightpass
pnpm install
cp .env.example .env.local  # editar si es necesario
pnpm dev                    # http://localhost:7100
```

### 4. App móvil (app-nightpass)

En otra terminal:

```bash
cd app-nightpass
flutter pub get

# iOS Simulator
flutter run

# Android Emulator
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:7101/api/v1

# Dispositivo físico (reemplazar con la IP de tu Mac)
flutter run --dart-define=API_BASE_URL=http://<IP-Mac>:7101/api/v1
```

---

## Seeder de desarrollo

El seeder crea un usuario por cada rol del sistema. Es idempotente: se puede correr varias veces sin duplicar datos.

```bash
cd server-nightpass
pnpm db:seed
```

Usuarios creados:

| Rol           | Email                      | Password        | Acceso                          |
|---------------|----------------------------|-----------------|---------------------------------|
| ADMIN         | admin@nightpass.local      | AdminTest123    | Panel web — acceso completo     |
| VENUE_OWNER   | dueno@nightpass.local      | DuenoTest123    | Panel web — gestiona su local   |
| VENUE_STAFF   | staff@nightpass.local      | StaffTest123    | Panel web (restringido) + app   |
| CUSTOMER      | cliente@nightpass.local    | ClienteTest123  | Solo app movil                  |

> `CUSTOMER` es rechazado en el panel web con 403. Solo puede entrar desde la app movil.

---

## Estado de fases

| Fase   | Descripcion                                                     | Estado      |
|--------|-----------------------------------------------------------------|-------------|
| A1     | Auth, roles, solicitudes de local, aprobacion con temp password | Completa    |
| A1.5   | Panel usuarios (read-only), panel locales (edit + suspend)      | Completa    |
| A2     | Staff por local, mustChangePassword, eventos + tiers            | Completa    |
| Fase 2 | Catalogo publico, R2 uploads, endpoints para app movil          | Completa    |
| Fase 3 | Stripe Connect, Orders, Passes con QR, scanner web              | Pendiente   |
| Fase 4 | Social: Friendship, Story, Chat, WebSocket                      | Pendiente   |
| Fase 5 | FCM push, tests E2E, Railway deploy, Sentry, GDPR               | Pendiente   |
