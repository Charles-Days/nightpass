# NightPass — Monorepo

Plataforma de vida nocturna: catálogo de bares, eventos, pases digitales, stories en vivo y social.

```
NIHP-APP/
├── server-nightpass/   # API NestJS + Fastify + Prisma + Postgres + Redis   → puerto 7101
├── cliente-nightpass/     # Panel web Next.js 15 (App Router)                   → puerto 7100
└── app-nightpass/           # App móvil Flutter (iOS + Android)
```

Cada subcarpeta tiene su propio `CLAUDE.md` con detalle fino. Este archivo es el mapa general del monorepo.

---

## Estado de fases

| Fase | Descripción | Estado |
|------|-------------|--------|
| A1 | Auth (email/password), roles, solicitudes de local, aprobación con temp password | ✅ Completa |
| A1.5 | Panel usuarios (read-only), panel locales (edit + suspend/reactivate) | ✅ Completa |
| A2 | Staff por local, `mustChangePassword`, `/cambiar-password`, eventos + tiers | ✅ Completa |
| Fase 2 | Catálogo público (venues + events), R2 uploads, endpoints para app móvil | ✅ Completa |
| Fase 1.5 | Apple Sign-In + Google Sign-In (obligatorio App Store) | 🔜 Pendiente |
| Fase 3 | Stripe Connect + Order + Pass con QR + scanner web | 🔜 Pendiente |
| Fase 4 | Social: Friendship, Story, Invite, Chat, WebSocket (Socket.IO) | 🔜 Pendiente |
| Fase 5 | FCM push, E2E tests, Railway deploy, GDPR, Sentry | 🔜 Pendiente |

---

## Arrancar el entorno local

```bash
# Servicios (Homebrew, no Docker)
brew services start postgresql@16
brew services start redis

# 1. Backend
cd server-nightpass
pnpm install
pnpm prisma migrate dev   # primera vez
pnpm db:seed              # crea usuarios de prueba
pnpm start:dev            # → http://localhost:7101/api/v1

# 2. Admin panel
cd cliente-nightpass
pnpm install
pnpm dev                  # → http://localhost:7100

# 3. App móvil
cd app-nightpass
flutter pub get
flutter run               # iOS Simulator (usa localhost directamente)
# Android Emulator:
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:7101/api/v1
```

---

## Roles del sistema

| Rol | Panel web | App móvil | Notas |
|-----|-----------|-----------|-------|
| `ADMIN` | Acceso completo | ✗ | Gestiona todo: solicitudes, usuarios, locales |
| `VENUE_OWNER` | Mi local: eventos, staff | ✗ | Creado al aprobar solicitud |
| `VENUE_STAFF` | Mi local: eventos (restringido) | ✓ Scanner QR | Único rol con acceso **dual** |
| `CUSTOMER` | Bloqueado (403) | ✓ Descubrir, comprar | Solo app móvil |

- `/auth/signin` — acepta todos los roles (app móvil).
- `/auth/signin-web` — rechaza `CUSTOMER` con 403 (panel web).

---

## Flujo de onboarding de un local

1. Dueño rellena `/solicitar-local` en el panel web (sin password).
2. Admin ve la solicitud en `/admin/solicitudes` → aprueba.
3. Backend genera contraseña temporal (12 chars, alfanumérico) → la hashea → crea `Venue` + `VenueOwner` → envía email con credenciales.
4. Dueño entra al panel → middleware detecta `mustChangePassword=true` en el JWT → redirige a `/cambiar-password`.
5. Dueño cambia contraseña → flag se limpia → accede normalmente.
6. Dueño invita staff desde el drawer del local → el staff recibe email con sus credenciales.

---

## Auth — flujo completo entre los tres proyectos

```
App móvil / Panel web
       │
       ▼
POST /api/v1/auth/signin          ← server-nightpass
  → { accessToken, refreshToken }
       │
       ├─► App móvil: guarda en flutter_secure_storage (Keychain/EncryptedSharedPreferences)
       │   Dio interceptor añade Authorization: Bearer en cada request
       │
       └─► Panel web: route handler /api/auth/login convierte tokens en cookies HttpOnly
           np_access (15min) + np_refresh (30días)
           Middleware Next.js verifica cookie en cada request (no llama al backend)
           Si np_access expirado → refresh silencioso → rota cookies → continúa
           Si mustChangePassword=true en payload JWT → redirect /cambiar-password
```

**Nunca:** tokens en localStorage. **Nunca:** contraseñas visibles en el panel — van solo por email.

---

## Email transaccional

- **Transport**: Gmail SMTP vía `nodemailer` (`SMTP_USER`, `SMTP_PASS` en `server-nightpass/.env`).
- `SMTP_PASS` debe ser una **contraseña de aplicación** de Google (no la contraseña real).
- Sin `SMTP_USER`/`SMTP_PASS` → modo no-op (loguea en consola, no envía).
- Templates HTML: branded NightPass (gradiente purple, dark, glassmorphism) en `src/mailer/templates/`.
- `ADMIN_WEB_URL` en `.env` define la URL base de los links en los emails.

| Email | Destinatario | Cuándo |
|-------|-------------|--------|
| Nueva solicitud | Admin (`ADMIN_NOTIFICATION_EMAIL`) | Al enviar formulario `/solicitar-local` |
| Solicitud aprobada | Solicitante | Al aprobar — incluye email + contraseña temporal |
| Solicitud rechazada | Solicitante | Al rechazar — incluye motivo si se especificó |
| Invitación a staff | Staff invitado | Al invitar desde el panel — incluye credenciales si es usuario nuevo |

---

## Backend — `server-nightpass/`

**Stack:** Node 20+ · NestJS 10 + Fastify · Prisma 5 · PostgreSQL 16 · Redis · argon2id · JWT · Zod · pnpm

### Convenciones críticas

- **IDs: siempre UUID v7** (`@default(uuid(7)) @db.Uuid`) en todas las tablas — time-ordered, sin fragmentación de índice.
- **argon2id** (no bcrypt) con parámetros OWASP 2025: `memoryCost: 19456, timeCost: 2`.
- **Mailer no-op** cuando faltan `SMTP_USER`/`SMTP_PASS` — nunca lanza excepción, solo loguea.
- **Storage activo en Cloudflare R2** (`STORAGE_DRIVER=r2`, bucket `nightpass-media`). Toda imagen nueva (venues, eventos, portadas, galería) sube a R2 vía presigned URL desde el cliente. URLs públicas servidas por subdominio `pub-xxx.r2.dev`. Si faltan credenciales R2 o `STORAGE_DRIVER=local`, cae a filesystem `./uploads` — modo legacy. CORS Policy del bucket debe permitir `http://localhost:7100` en dev.
- **Cleanup obligatorio**: cada `service` que persista URLs de imagen debe borrarlas del storage cuando dejan de referenciarse (en `update()` cuando se reemplaza/quita, en `delete()` siempre). Usar `StorageService.deleteByPublicUrl(url)` o `.deleteByPublicUrls(urls)` — fire-and-forget, errores solo loggean. Sin esto R2 acumula basura. Ver `server-nightpass/CLAUDE.md` → "Cleanup obligatorio" para el pattern exacto y cobertura actual.
- **Controllers thin, services fat.** Lógica de negocio solo en services.
- **`migrate dev`** solo en local. **`migrate deploy`** en producción.
- No usar `console.log` — el logger de Fastify emite JSON estructurado.

### Módulos actuales

```
src/
├── auth/              # signup, signin, signin-web, refresh, me, change-password
├── venue-applications/ # solicitudes: list, detail, approve, reject
├── venues/            # CRUD admin + suspend/reactivate + helpers createWithOwner
├── venue-staff/       # invitar staff, listar, revocar (soft delete)
├── users/             # listado + detalle (read-only, admin)
├── events/            # CRUD eventos + tiers por local
├── catalog/           # endpoints públicos para app móvil (sin auth)
├── uploads/           # presigned URL para upload directo a R2
├── mailer/            # Gmail SMTP + templates HTML branded
├── storage/           # StorageService — R2 activo (driver `r2`), fallback `local`
├── prisma/            # PrismaService @Global
├── config/            # env.schema.ts (Zod, falla rápido al boot)
└── health/            # /health con check de Postgres
```

### Endpoints — resumen

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | /auth/signup | — | Crear cuenta (app móvil) |
| POST | /auth/signin | — | Login todos los roles |
| POST | /auth/signin-web | — | Login panel (rechaza CUSTOMER) |
| POST | /auth/refresh | — | Renovar tokens |
| GET | /auth/me | JWT | Perfil (incluye `mustChangePassword`) |
| POST | /auth/change-password | JWT | `{oldPassword, newPassword}` |
| POST | /venue-applications | — | Solicitar registro de local |
| GET | /venue-applications | ADMIN | Listar (`?status=`) |
| POST | /venue-applications/:id/approve | ADMIN | Aprueba → genera temp password → email |
| POST | /venue-applications/:id/reject | ADMIN | Rechaza (`{reason?}`) |
| GET | /users | ADMIN | Listar (`?role=`, `?search=`, paginado) |
| GET | /users/:id | ADMIN | Detalle + solicitudes + locales |
| GET | /venues | ADMIN | Listar (`?status=`, `?city=`, `?search=`) |
| PATCH | /venues/:id | ADMIN | Editar (sin slug ni status) |
| POST | /venues/:id/suspend | ADMIN | Suspender |
| POST | /venues/:id/reactivate | ADMIN | Reactivar |
| POST | /venues/:id/staff | ADMIN/OWNER | Invitar staff por email + rol |
| GET | /venues/:id/staff | ADMIN/OWNER | Listar staff activo |
| DELETE | /venues/:id/staff/:userId | ADMIN/OWNER | Revocar staff (soft delete) |
| GET | /events | ADMIN/OWNER/STAFF | Listar eventos (`?venueId=`, `?status=`) |
| POST | /events | ADMIN/OWNER | Crear evento |
| PATCH | /events/:id | ADMIN/OWNER | Actualizar |
| DELETE | /events/:id | ADMIN/OWNER | Eliminar |
| POST | /events/:id/tiers | ADMIN/OWNER | Añadir tier de precio |
| PATCH | /events/:id/tiers/:tierId | ADMIN/OWNER | Actualizar tier |
| DELETE | /events/:id/tiers/:tierId | ADMIN/OWNER | Eliminar tier |
| POST | /uploads/sign | ADMIN/OWNER/STAFF | Presigned URL para R2 |
| GET | /catalog/venues | — | Catálogo público con geo-filtro |
| GET | /catalog/venues/:slug | — | Detalle venue + eventos PUBLISHED |
| GET | /catalog/events/:id | — | Detalle evento + tiers |

### Seed de desarrollo

```bash
cd server-nightpass && pnpm db:seed
```

| Rol | Email | Password |
|-----|-------|----------|
| `ADMIN` | `admin@nightpass.local` | `AdminTest123` |
| `VENUE_OWNER` | `dueno@nightpass.local` | `DuenoTest123` |
| `VENUE_STAFF` | `staff@nightpass.local` | `StaffTest123` |
| `CUSTOMER` | `cliente@nightpass.local` | `ClienteTest123` |

---

## Panel web — `cliente-nightpass/`

**Stack:** Next.js 15 (App Router) · React 19 · Tailwind 4 · shadcn/ui · TanStack Query · react-hook-form + zod · sonner · lucide-react · pnpm

### Auth flow del panel

1. Form → `POST /api/auth/login` (route handler local).
2. Route handler → backend `/auth/signin-web` → recibe tokens → setea cookies HttpOnly (`np_access` 15min, `np_refresh` 30d).
3. Middleware Next.js en cada request:
   - Decodifica JWT (sin verificar firma — ya fue verificado al setear la cookie).
   - Si `mustChangePassword=true` y ruta ≠ `/cambiar-password` → HTTP 302 antes de cualquier render.
   - Si token expirado → refresh silencioso → rota cookies.
   - Si nada → redirect a `/login`.
4. Layout `(app)` hace `serverFetch('/auth/me')` como guard secundario.

> `mustChangePassword` vive en el **middleware**, no en el layout — evita la pantalla negra que ocurre cuando `redirect()` se llama desde un Server Component durante navegación client-side.

### Patrones UI establecidos

**Tablas → acción → modal/drawer:**
- Solicitudes y Usuarios: `Dialog` (modal centrado).
- Locales: `Sheet` (drawer lateral derecho, `sm:max-w-2xl`).
- Crear/editar eventos dentro del drawer: `Dialog` centrado encima del Sheet.

**Sheet scroll — siempre así:**
```tsx
<SheetContent className="flex w-full flex-col overflow-hidden p-0">
  <SheetHeader className="shrink-0 border-b px-6 pb-4 pt-5" />
  <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
    {/* contenido */}
  </div>
</SheetContent>
```
`min-h-0` es crítico — sin él flex ignora el overflow.

**`router.refresh()` tras mutaciones:** siempre en el hook (`onSuccess`), no en el componente. Las tablas son Server Components — refresh actualiza la data en segundo plano inmediatamente.

**Credenciales:** nunca se muestran en pantalla tras aprobación. El modal solo confirma; las credenciales van solo por email.

### Diseño — lenguaje visual

El panel interno sigue el mismo estilo que el landing y el login:
- App shell: 3 bokeh orbes purple/rosa a ~5-7% opacidad + sidebar glassmorphism (`bg-white/[0.03] backdrop-blur-xl border-r border-white/8`).
- Cards: `rounded-[22px] border border-white/10 bg-white/[0.025] hover:bg-white/[0.04]`.
- Tablas: `rounded-[22px] border-white/10 bg-white/[0.025]` · thead `border-white/8 bg-white/[0.02]` · filas `hover:bg-white/[0.05]`.
- Eyebrow: `text-[11px] font-semibold uppercase tracking-[0.22em] text-primary` sobre cada h1.
- Botón CTA: `bg-gradient-to-r from-[#9333ea] to-[#a855f7]`.
- Nunca usar MUI/Chakra/Mantine — solo shadcn/ui.

### Estructura de features

```
src/features/
├── auth/              # login, change-password, logout, hooks de sesión
├── venue-applications/ # tabla solicitudes, modal detalle, aprobar/rechazar
├── venues/            # tabla locales, drawer lateral, editar, suspend/reactivate
├── users/             # tabla usuarios, modal detalle (read-only)
├── staff/             # invitar/revocar staff por venue
└── events/            # CRUD eventos + tiers, modal centrado
```

Cada feature: `components/` · `hooks/` · `schemas/` · `index.ts`. Un feature no importa de otro — lo compartido en `core/`.

---

## App móvil — `app-nightpass/`

**Stack:** Flutter 3.41 · Dart ^3.11 · go_router · flutter_riverpod · Dio · flutter_secure_storage

### Estado actual

- Auth completo (signup, signin, refresh, signout) integrado al backend.
- Pantallas de catálogo, eventos, checkout, pases, stories, friends: **UI construida, pendiente conectar a endpoints reales** (Fase 2+ para catálogo, Fase 3 para compras, Fase 4 para social).

### Estructura

```
lib/
├── api/api_client.dart      # Dio + interceptor auto-refresh en 401
├── api/auth_api.dart        # signup / signin / refresh / me
├── models/user.dart         # User, AuthTokens
├── services/token_storage.dart  # Keychain / EncryptedSharedPreferences
├── state/auth_controller.dart   # Riverpod StateNotifier — fuente de verdad de auth
├── router/app_router.dart   # redirect según AuthStatus
├── screens/                 # splash, auth, signup, home, bar_detail, search, …
├── theme/np_theme.dart      # NPColors, NPTextStyles — paleta purple #A855F7 sobre #0A0A0F
└── widgets/                 # NPGlass, NPPrimary, NPTextField, NPLogo, …
```

### Convenciones Flutter

- **Tokens**: siempre en `flutter_secure_storage` — nunca `SharedPreferences`.
- **Riverpod**: providers en top-level, `ref.watch` en build, `ref.read` en handlers.
- **URL**: `apiBaseUrl` en `api_client.dart` — no hardcodear. Android Emulator usa `10.0.2.2`, dispositivo físico usa la IP de la Mac.
- **Widgets reutilizables**: prefijo `NP` (`NPGlass`, `NPPrimary`, `NPTextField`).
- **Tema**: solo `NPColors` y `NPTextStyles` de `theme/np_theme.dart`.

### Conectar al backend

| Target | Comando |
|--------|---------|
| iOS Simulator | `flutter run` |
| Android Emulator | `flutter run --dart-define=API_BASE_URL=http://10.0.2.2:7101/api/v1` |
| Dispositivo físico | `flutter run --dart-define=API_BASE_URL=http://<IP-Mac>:7101/api/v1` |

---

## Variables de entorno — resumen

### `server-nightpass/.env`

```bash
DATABASE_URL="postgresql://charlesdays@localhost:5432/nightpass_dev"
REDIS_URL="redis://localhost:6379"
JWT_ACCESS_SECRET="min-32-chars"
JWT_ACCESS_TTL="15m"
JWT_REFRESH_SECRET="min-32-chars"
JWT_REFRESH_TTL="30d"
SMTP_USER="nightpass02@gmail.com"      # Gmail SMTP — contraseña de aplicación Google
SMTP_PASS="xxxx xxxx xxxx xxxx"
ADMIN_NOTIFICATION_EMAIL="nightpass02@gmail.com"
ADMIN_WEB_URL="http://localhost:7100"
# Cloudflare R2 — storage activo en dev/prod. Sin estas vars cae a filesystem local.
STORAGE_DRIVER=r2
R2_ACCOUNT_ID=<cloudflare-account-id>
R2_ACCESS_KEY_ID=<r2-access-key>
R2_SECRET_ACCESS_KEY=<r2-secret-key>
R2_BUCKET=nightpass-media
R2_PUBLIC_URL=https://pub-xxxxxxx.r2.dev
# CORS Policy del bucket debe permitir el origen del cliente (localhost:7100 en dev).
LOCAL_UPLOADS_URL=http://localhost:7101/uploads  # solo legacy / fallback
```

### `cliente-nightpass/.env.local`

```bash
API_URL="http://localhost:7101"
NEXT_PUBLIC_APP_NAME="NightPass Admin"
NEXT_PUBLIC_APP_URL="http://localhost:7100"
```

---

## Pendientes globales

- **Fase 1.5**: Apple Sign-In (obligatorio App Store) + Google Sign-In. Solo app móvil.
- **Fase 3**: Stripe Connect Standard (venues como Merchant of Record, NightPass cobra ~8% de application fee), Orders, Passes con QR firmado HMAC, scanner web en el panel.
- **Fase 4**: Friendship, Story (TTL 24h en R2), PlanInvite, SplitPayment, Chat 1:1, WebSocket con Socket.IO + Redis adapter.
- **Fase 5**: FCM push, E2E tests con Supertest, Railway deploy (backend + Postgres + Redis), Vercel deploy (admin), TestFlight + Play Internal Testing, Sentry, GDPR (`DELETE /me`, `GET /me/export`).
- **Hardening auth**: reuse detection por familia de refresh tokens, `$transaction` en rotación.
- **Tests**: ninguno aún en ningún proyecto.
- **i18n**: todo en español hardcoded.
