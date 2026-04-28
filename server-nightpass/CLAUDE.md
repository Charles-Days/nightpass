# NightPass API — Claude context

Backend NestJS para la app **NightPass** (vida nocturna: catálogo de bares, compra de pases, stories en vivo, social/amigos).

## Estado actual

**Fase 1 + A1 + A1.5 completas:** Auth con email/password + sistema de **roles** + flujo de **solicitud/aprobación de locales** (la password se **genera al aprobar**, no la elige el dueño en el form) + email transaccional vía **Resend** con la temp password embebida + endpoints `/users` y `/venues` (read + edit + suspend/reactivate) para que el ADMIN gestione usuarios y locales desde el panel. Próximas fases: catálogo público (Venue/Event listing), compras (Stripe Connect + QR), social (WebSocket), push (FCM).

### Roles

| Rol | Quién |
| --- | --- |
| `ADMIN` | Equipo NightPass — acceso total al panel web |
| `VENUE_OWNER` | Dueño de un local aprobado |
| `VENUE_STAFF` | Staff invitado por un dueño (Fase A2) |
| `CUSTOMER` (default) | Cliente final — solo app móvil |

`/auth/signin` (mobile) acepta cualquier rol. `/auth/signin-web` rechaza `CUSTOMER` con 403.

### Flujo de solicitud de local

1. Cualquier visitante hace `POST /venue-applications` (público, throttled 3/h por IP) con `{applicant: {email, name}, venue: {name, city, address?, phone?, message?}}` — **sin password**. Si el email ya pertenece a un `ADMIN/OWNER/STAFF` la API responde 409 ("Este email ya tiene panel asignado").
2. ADMIN ve la cola con `GET /venue-applications?status=PENDING`.
3. ADMIN aprueba con `POST /venue-applications/:id/approve` — transacción que crea `Venue`, `VenueOwner`, **genera una password temporal** (`generateTemporaryPassword`, 12 chars [A-Za-z0-9] sin 0/O/1/l/I), la hashea con argon2id (fuera de la tx), la persiste en el `User` y promueve `CUSTOMER` → `VENUE_OWNER`. La response incluye `temporaryPassword` (cleartext, una sola vez) para que el panel la muestre. El email también la lleva.
4. ADMIN rechaza con `POST /venue-applications/:id/reject` con `{reason?}`. Cooldown de 30 días para reaplicar al mismo local.

> TODO Fase A2: reemplazar el cleartext password en email por un magic link de un solo uso firmado.

### Endpoints de gestión (`/users`, `/venues`) — A1.5

| Método | Ruta                          | Rol  | Notas                                                     |
| ------ | ----------------------------- | ---- | --------------------------------------------------------- |
| GET    | /users                        | ADMIN | Filtra `?role=`, `?search=` (email o name), paginado.     |
| GET    | /users/:id                    | ADMIN | Detalle + `applications` (últimas 20) + `ownedVenues`. **`passwordHash` nunca se serializa** (`select` explícito). |
| GET    | /venues                       | ADMIN | Filtra `?status=`, `?city=`, `?search=`. Devuelve `_count.owners`. |
| GET    | /venues/:id                   | ADMIN | Incluye `owners[].user`.                                  |
| PATCH  | /venues/:id                   | ADMIN | Edita `name/city/address/phone`. **`slug` y `status` no son editables** (`forbidNonWhitelisted` rechaza extras con 400). |
| POST   | /venues/:id/suspend           | ADMIN | Marca `status=SUSPENDED` (idempotente).                  |
| POST   | /venues/:id/reactivate        | ADMIN | Marca `status=ACTIVE` (idempotente).                     |

App Flutter en `../app-nightpass/` consume este backend.

## Stack

| Capa | Tecnología | Versión |
| ---- | ---------- | ------- |
| Runtime | Node | >=20 |
| Framework | NestJS + Fastify adapter | 10 |
| ORM | Prisma | 5.22 |
| DB | PostgreSQL | 16 (Homebrew local) |
| Cache / pub-sub | Redis | (Homebrew local) |
| Hash passwords | argon2id | 0.41 |
| JWT | @nestjs/jwt + passport-jwt | — |
| Validación env | zod | 4 |
| Validación request | class-validator + DTOs | — |
| Rate limiting | @nestjs/throttler | 6 |
| Security headers | @fastify/helmet | 11 (Fastify 4 compat) |
| Healthchecks | @nestjs/terminus | 11 |
| Package manager | pnpm | 10 |

> Postgres y Redis corren nativos via Homebrew (`brew services list`). **No** uses Docker.

## Comandos

```bash
pnpm install              # instalar deps
pnpm prisma migrate dev   # crear migración nueva en dev
pnpm prisma migrate reset # nuke + replay (dev only)
pnpm prisma studio        # GUI de la DB
pnpm start:dev            # server con hot reload (recomendado para dev)
pnpm start:prod           # build + node dist (sin watch)
pnpm build                # type-check + emit dist/
pnpm lint                 # eslint --fix
pnpm test                 # jest unit
pnpm test:e2e             # supertest end-to-end
```

DB: `nightpass_dev` en local. Usuario Postgres: `charlesdays` (sin password). Ver `.env`.

## Estructura

```
src/
├── main.ts                   # bootstrap: Fastify, helmet, CORS, ValidationPipe global, prefix /api/v1
├── app.module.ts             # ConfigModule (validate=zod), ThrottlerModule global, módulos
├── config/
│   └── env.schema.ts         # Zod schema — valida env al boot (falla rápido)
├── prisma/
│   ├── prisma.service.ts     # PrismaClient con onModuleInit/Destroy
│   └── prisma.module.ts      # @Global()
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts    # /signup /signin /refresh /me — @Throttle estricto
│   ├── auth.service.ts       # argon2id + JWT rotation
│   ├── dto/                  # SignupDto, SigninDto, RefreshDto
│   ├── strategies/           # JwtStrategy (passport-jwt)
│   ├── guards/               # JwtAuthGuard
│   └── decorators/           # @CurrentUser()
└── health/
    ├── health.module.ts
    └── health.controller.ts  # /health con check de Postgres
```

## Convenciones del proyecto

### IDs — siempre UUID v7

Toda tabla usa:
```prisma
id String @id @default(uuid(7)) @db.Uuid
```
Y los foreign keys que apuntan también van con `@db.Uuid`.

**Por qué v7 y no v4:** v7 es time-ordered (RFC 9562) — evita la fragmentación de índice que causa v4 random. **Por qué no cuid:** UUID es estándar universal y nativo en Postgres.

### Estructura modular por feature

Cada feature es un módulo: `auth/`, `health/`, en el futuro `venues/`, `events/`, `orders/`, `passes/`, `stories/`. Cada uno tiene `*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/`, opcionalmente `guards/`, `strategies/`, `decorators/`.

### Validación

- **Env**: Zod schema en `config/env.schema.ts`. Falla al boot si falta o es inválida.
- **Request**: DTOs con `class-validator`. ValidationPipe global con `whitelist: true, forbidNonWhitelisted: true, transform: true` — bloquea campos extra automáticamente.

### Errores

Lanzar excepciones de Nest (`UnauthorizedException`, `ConflictException`, `BadRequestException`, etc.). El framework las convierte a HTTP correcto.

### Naming

- Archivos: `kebab-case.tipo.ts` (ej. `auth.controller.ts`, `signup.dto.ts`).
- Clases: `PascalCase` (ej. `AuthController`, `SignupDto`).
- Tests: `*.spec.ts` (unit), `*.e2e-spec.ts` (e2e).

## Seguridad — lo que ya está

- **argon2id** con config OWASP 2025: `memoryCost: 19456 (19 MiB), timeCost: 2, parallelism: 1`.
- **JWT access 15min + refresh 30d** con secrets separados.
- **Refresh tokens persistidos en DB con hash SHA-256** y rotación (one-time-use).
- **Rate limit global** 100 req/min + estricto 5 req/min en `/auth/*`.
- **Helmet** activado.
- **CORS** configurable por env `CORS_ORIGINS` (comma-separated).
- **`trustProxy: true`** en Fastify — necesario detrás de Cloudflare/Railway.
- **Validación env** al boot (Zod) — secrets mínimo 32 chars.

## Hardening pendiente (Fase 5, pre-TestFlight)

1. Reuse detection por **familia** de refresh tokens (revocar TODA la familia si detectas reuse — práctica OWASP).
2. **Transaction wrap** en rotación de refresh (race condition con requests simultáneas).
3. **Filter global de excepciones** para normalizar shape y no leak detalles internos.
4. **E2E tests con supertest** cubriendo el flow auth.
5. **Reglas de complejidad de password** más allá de MinLength(8).

## Best practices NestJS 2026

### Arquitectura

- **Módulos como unidad mínima**. Cada feature es un módulo con sus controllers + services + DTOs. No mezclar dominios en el mismo módulo.
- **Controllers thin, services fat**. Los controllers solo extraen request, validan vía DTO y delegan al service. La lógica de negocio vive en services.
- **Repository/data-access layer separado** del service en features grandes (Phase 2+ — usar PrismaService directo si el service es chico).
- **Singular para folders de dominio** (`venue/`, `order/`); plural para reusables (`pipes/`, `decorators/`).

### Prisma

- **`migrate dev`** SOLO en desarrollo local. **NUNCA** en producción.
- **`migrate deploy`** en CI/CD para producción — solo aplica migraciones existentes, no las genera.
- **Backup antes de migración productiva.** Las migraciones destructivas (drop column, change type) deben usar el patrón **expand-and-contract**: agregar nuevo, migrar data, deprecar viejo en releases sucesivos.
- **PrismaService como singleton.** Ya está configurado como `@Global()`.
- **Connection pool**: default `num_cpus * 2 + 1`. En serverless empezar con `connection_limit=1`.

### Seguridad

- argon2id (no bcrypt) con mínimos OWASP.
- Refresh tokens **siempre hasheados** en DB.
- Rate limiting **no es opcional** en producción.
- Validar env al boot — fail fast.
- Helmet + CORS explícito.
- `trustProxy` cuando estás detrás de un reverse proxy.

### Testing

- **Unit tests**: services aislados con providers mockeados.
- **E2E tests**: supertest contra `INestApplication` en memoria.
- **Test DB separada** para e2e — no contaminar dev.

## Cosas a NO hacer

- No usar `bcrypt` para passwords nuevos (argon2id es el estándar).
- No usar `cuid` ni autoincrement como ID de tabla — siempre UUID v7.
- No meter lógica de negocio en controllers.
- No exponer entidades de Prisma directo en responses — usar DTOs/mappers (defendible aplazarlo en Fase 1, obligatorio en Fase 2+).
- No usar `console.log` para logging — el logger de Fastify ya emite JSON estructurado.
- No commitear `.env` (ya está en `.gitignore`).
- No saltarse el ValidationPipe global con DTOs sin decoradores.

## Referencia rápida — endpoints actuales

| Método | Ruta                                    | Auth         | Throttle  |
| ------ | --------------------------------------- | ------------ | --------- |
| GET    | /api/v1/health                          | —            | 100/min   |
| POST   | /api/v1/auth/signup                     | —            | 5/min     |
| POST   | /api/v1/auth/signin                     | —            | 5/min     |
| POST   | /api/v1/auth/signin-web                 | —            | 5/min     |
| POST   | /api/v1/auth/refresh                    | —            | 5/min     |
| GET    | /api/v1/auth/me                         | JWT          | 100/min   |
| POST   | /api/v1/venue-applications              | —            | 3/hora    |
| GET    | /api/v1/venue-applications              | JWT + ADMIN  | 100/min   |
| GET    | /api/v1/venue-applications/:id          | JWT + ADMIN  | 100/min   |
| POST   | /api/v1/venue-applications/:id/approve  | JWT + ADMIN  | 100/min   |
| POST   | /api/v1/venue-applications/:id/reject   | JWT + ADMIN  | 100/min   |
| GET    | /api/v1/users                           | JWT + ADMIN  | 100/min   |
| GET    | /api/v1/users/:id                       | JWT + ADMIN  | 100/min   |
| GET    | /api/v1/venues                          | JWT + ADMIN  | 100/min   |
| GET    | /api/v1/venues/:id                      | JWT + ADMIN  | 100/min   |
| PATCH  | /api/v1/venues/:id                      | JWT + ADMIN  | 100/min   |
| POST   | /api/v1/venues/:id/suspend              | JWT + ADMIN  | 100/min   |
| POST   | /api/v1/venues/:id/reactivate           | JWT + ADMIN  | 100/min   |

### Seed inicial

`pnpm db:seed` crea (idempotente) un usuario por cada rol del sistema:

| Rol | Email | Password | Notas |
| --- | --- | --- | --- |
| `ADMIN` | `admin@nightpass.local` | `AdminTest123` | Panel web — acceso completo |
| `VENUE_OWNER` | `dueno@nightpass.local` | `DuenoTest123` | Viene con un `Venue` demo (`Bar Demo`, slug `bar-demo-seed`) y la relación `VenueOwner` |
| `VENUE_STAFF` | `staff@nightpass.local` | `StaffTest123` | Sin venue asignado (la tabla `VenueStaff` es Fase A2) |
| `CUSTOMER` | `cliente@nightpass.local` | `ClienteTest123` | App móvil |

```bash
pnpm db:seed
```

**Comportamiento idempotente por seeder:**
- **Admin**: si el email ya existe, fuerza `role=ADMIN`.
- **Venue owner**: upsert del Venue por slug fijo + upsert del User + upsert de `VenueOwner` (PK compuesta). Promueve `CUSTOMER → VENUE_OWNER`. **Si el user era `ADMIN`, no degrada** (skip).
- **Venue staff** y **customer**: si el email ya existe, **no tocan el rol** (protección contra degradar usuarios promovidos).

Override por env vars (opcional, por rol — ver `README.md` para la lista completa):
```bash
SEED_OWNER_PASSWORD=PassOwner1 SEED_STAFF_PASSWORD=PassStaff1 pnpm db:seed
```

Estructura: `prisma/seed.ts` orquesta · `prisma/seeds/{admin,venue-owner,venue-staff,customer,helpers}.ts`. Para añadir más seeders en fases siguientes (eventos demo, pases demo, etc.) crea otro archivo en `prisma/seeds/` y agrégalo al orquestador.
