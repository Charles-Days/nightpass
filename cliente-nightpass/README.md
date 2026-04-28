# NightPass Admin

Panel de administración web para **NightPass**. Construido con Next.js 15 (App Router) + Tailwind 4 + shadcn/ui, consume el backend NestJS en `../server-nightpass/`.

Posición en el monorepo:

```
NIHP-APP/
├── app-nightpass/    # app móvil Flutter
├── server-nightpass/     # API NestJS (puerto 7101)
└── cliente-nightpass/       # ← este proyecto (puerto 7100)
```

## Stack

| Capa            | Tecnología                                       |
| --------------- | ------------------------------------------------ |
| Framework       | Next.js 15 (App Router, Turbopack)               |
| UI              | React 19 + Tailwind CSS 4 + shadcn/ui (new-york) |
| Estado servidor | TanStack Query                                   |
| Estado UI       | Zustand (reservado, sin uso aún)                 |
| Forms           | react-hook-form + zod                            |
| Tema            | next-themes (default `dark`)                     |
| Toasts          | sonner                                           |
| Iconos          | lucide-react                                     |

## Setup

```bash
cp .env.example .env.local
pnpm install
pnpm dev      # http://localhost:7100
```

> El backend (`server-nightpass`) debe estar corriendo en `http://localhost:7101`. El admin corre en **7100** para no chocar con él.

### Crear los usuarios iniciales

El panel solo permite entrar con un usuario que tenga rol `ADMIN`, `VENUE_OWNER` o `VENUE_STAFF`. Corre el seeder del backend:

```bash
cd ../server-nightpass
pnpm db:seed
```

Crea (idempotente) un usuario por cada rol del sistema:

| Rol | Email | Password | Para |
| --- | --- | --- | --- |
| `ADMIN` | `admin@nightpass.local` | `AdminTest123` | Panel web — acceso completo (solicitudes, usuarios, locales) |
| `VENUE_OWNER` | `dueno@nightpass.local` | `DuenoTest123` | Panel web — gestiona su local (eventos, staff, estado). Viene con `Bar Demo` asociado |
| `VENUE_STAFF` | `staff@nightpass.local` | `StaffTest123` | **Panel web** (sidebar restringido a "Mi local") **Y app móvil** (escaneo de QR en puerta). El owner lo invita desde el panel. |
| `CUSTOMER` | `cliente@nightpass.local` | `ClienteTest123` | **Solo app móvil** — rechazado en el panel web con 403 |

> **Diferencia clave entre STAFF y CUSTOMER:** ambos pueden usar la app móvil, pero solo `VENUE_STAFF` puede entrar al panel web (con acceso restringido a su local). `CUSTOMER` es siempre rechazado en el panel.

### Rutas públicas

- `http://localhost:7100/` — landing con CTA a `/solicitar-local`.
- `http://localhost:7100/solicitar-local` — formulario para dueños que quieran registrarse. **No pide password**: al aprobar la solicitud el sistema genera una contraseña temporal, la muestra en pantalla con copy-to-clipboard y se la envía al dueño por email.

### Paneles de gestión

| Ruta | Acceso | Qué hace |
| ---- | ------ | -------- |
| `/admin/solicitudes` | ADMIN | Bandeja de solicitudes (Pendientes/Aprobadas/Rechazadas). Click en fila abre modal centrado con detalle + botones Aprobar/Rechazar. Al aprobar muestra la contraseña temporal generada. |
| `/admin/usuarios` | ADMIN | Todos los usuarios del sistema (ADMIN/OWNER/STAFF/CUSTOMER) con filtro por rol y búsqueda. Click en fila abre modal con identidad, solicitudes y locales asociados. |
| `/admin/locales` | ADMIN | Todos los locales. Click en fila abre drawer lateral con edición, dueños, estado (suspend/reactivar), equipo (staff) y eventos. |
| `/cambiar-password` | Autenticado | Forzado cuando el usuario tiene contraseña temporal (`mustChangePassword=true`). Banner en el panel mientras no la cambie. |

### Variables de entorno

| Variable               | Default                 | Descripción                          |
| ---------------------- | ----------------------- | ------------------------------------ |
| `API_URL`              | `http://localhost:7101` | URL del server-nightpass (sin `/api/v1`) |
| `NEXT_PUBLIC_APP_NAME` | `NightPass Admin`       | Nombre que muestra el panel          |
| `NEXT_PUBLIC_APP_URL`  | `http://localhost:7100` | URL pública del admin                |

## Comandos

```bash
pnpm dev          # dev server (puerto 7100, Turbopack)
pnpm build        # build de producción
pnpm start        # servir build
pnpm lint         # ESLint
pnpm format       # Prettier (con plugin de Tailwind)
pnpm type-check   # tsc --noEmit
```

## Arquitectura

```
src/
├── middleware.ts                    # auth guard + refresh transparente + x-pathname header
├── app/
│   ├── layout.tsx                   # AppProviders + fonts
│   ├── globals.css                  # Tailwind 4 (CSS-first) + tema NightPass (morado)
│   ├── (public)/                    # landing + solicitar-local (sin auth)
│   ├── (auth)/                      # login + cambiar-password (split-screen)
│   ├── (app)/                       # rutas protegidas
│   │   ├── layout.tsx               # serverFetch /auth/me + redirect mustChangePassword
│   │   ├── _components/app-shell.tsx # sidebar + banner temporal password
│   │   ├── dashboard/
│   │   ├── admin/solicitudes/       # ADMIN: bandeja + modal de detalle
│   │   ├── admin/usuarios/          # ADMIN: tabla + modal de detalle
│   │   ├── admin/locales/           # ADMIN: tabla + drawer lateral con todo
│   │   ├── cambiar-password/        # cambio de password forzado
│   │   └── mi-local/eventos/        # OWNER/STAFF: placeholder
│   └── api/                         # route handlers (proxies JWT↔cookies)
│       ├── auth/{login,refresh,logout,me,change-password}/
│       ├── venue-applications/[id]/{approve,reject}/
│       ├── users/[id]/
│       ├── venues/[id]/{suspend,reactivate,staff/[userId]}/
│       ├── events/[id]/{tiers/[tierId]}/
│       ├── uploads/sign/
│       └── catalog/{venues,events}/
├── core/
│   ├── components/ui/               # shadcn/ui components (button, card, dialog, sheet, …)
│   ├── lib/api/{server-client,client-client,proxy}.ts
│   ├── config/{env,paths,cookies}.ts
│   └── types/api.ts                 # todos los tipos del dominio
└── features/
    ├── auth/                        # login, change-password, hooks de sesión
    ├── venue-applications/          # tabla con modal, detalle, aprobar/rechazar
    ├── venues/                      # tabla con drawer, editar, suspend/reactivate
    ├── users/                       # tabla con modal, detalle (read-only)
    ├── staff/                       # invitar/revocar staff por venue
    └── events/                      # CRUD eventos con modal centrado, tiers
```

## Auth — cómo funciona

El server-nightpass entrega `accessToken` + `refreshToken` en el body JSON. **No** maneja cookies.

1. El form llama a una **route handler** local (`POST /api/auth/login`).
2. La route handler convierte los JWT en **cookies HttpOnly** (`np_access`, `np_refresh`).
3. El **middleware** en cada request:
   - Si `np_access` vigente → pasa, setea header `x-pathname`.
   - Si expiró y hay `np_refresh` → refresh silencioso, rota cookies, continúa.
   - Si nada → redirige a `/login?from=...`.
4. El **layout protegido** hace `serverFetch('/auth/me')`:
   - Si `mustChangePassword=true` y la ruta no es `/cambiar-password` → redirige.
   - Si 401 → redirige a login.

## Convenciones

- **Server-first**: `'use client'` solo en forms, hooks con estado, mutaciones y tablas con modales.
- **Aislamiento de features**: `features/X` no importa de `features/Y`.
- **shadcn/ui obligatorio**: `pnpm dlx shadcn@latest add <componente>`. Prohibido MUI/Chakra/etc.
- **lucide-react** para iconos.
- **react-hook-form + zod** para todos los formularios.
- **Sin URLs hardcoded**: usar `paths` de `core/config/paths.ts`.
- **Sin tokens en `localStorage`**: solo cookies HttpOnly.

## Flujo de onboarding de un local

1. Dueño rellena `/solicitar-local` (sin password).
2. ADMIN ve la solicitud en `/admin/solicitudes` → click abre modal → aprueba.
3. Sistema genera contraseña temporal, la muestra en el modal (copy-to-clipboard) y se la envía por email.
4. Dueño entra con email + contraseña temporal → ve banner "Cambia tu contraseña".
5. Dueño va a `/cambiar-password`, elige nueva password → banner desaparece.
6. Dueño invita a su staff desde `/admin/locales/[id]` → tab "Equipo del local" → formulario de invitación.
7. Staff recibe email con contraseña temporal, mismo flujo de cambio forzado.

## Flujo de eventos

1. ADMIN o OWNER abren el drawer de un local → sección "Eventos" → "+ Nuevo evento".
2. Se abre un Dialog centrado con el formulario (título, fechas, estado, capacidad, portada con upload a R2).
3. El evento se puede publicar (PUBLISHED), mantener en borrador (DRAFT) o cancelar.
4. Los endpoints públicos `/api/v1/catalog/venues/:slug` y `/api/v1/catalog/events/:id` exponen los eventos PUBLISHED a la app móvil.

## Limitaciones conocidas

- `/admin/usuarios` es read-only — sin cambio manual de rol, baneo ni eliminación (requiere `User.status`/`bannedAt` en schema).
- Slug del venue inmutable (PATCH lo rechaza con 400).
- Password temporal en cleartext en el email (TODO Fase futura: magic link de un solo uso).
- Módulos sidebar "pronto": Pases, Stories.
- Sin tests aún (Fase 5).

## Backend asociado

`../server-nightpass/` — ver su `README.md` para la lista completa de endpoints y variables de entorno.
