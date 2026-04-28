# NightPass Admin — Claude context

Panel web de administración de **NightPass**. Construido con Next.js 15 (App Router) + Tailwind 4 + shadcn/ui. Consume el backend NestJS en `../server-nightpass/`.

## Estado actual

**Fases A1 + A1.5 + A2 + Fase 2 completas.**

- Solicitudes de local: listar, aprobar (genera temp password, envía email), rechazar.
- Usuarios: listado + detalle read-only con filtro por rol y búsqueda.
- Locales: tabla → drawer lateral con edición, dueños, staff, eventos, suspend/reactivate.
- Staff: invitar por email + rol (MANAGER/SCANNER), revocar (soft delete).
- Eventos: CRUD completo por local con tiers (Early Bird, General, VIP). Modal centrado para crear/editar.
- `mustChangePassword`: al entrar con contraseña temporal el **middleware** detecta el flag en el JWT y redirige a `/cambiar-password` antes de cualquier render de React.
- Al aprobar una solicitud, las credenciales se envían **solo por email** — el modal solo muestra confirmación, sin mostrar la password en pantalla.
- El registro público `/register` fue eliminado — la única forma de crear cuenta de panel es solicitando un local o siendo invitado como staff.

### Quién entra al panel

| Rol | Acceso |
| --- | --- |
| `ADMIN` | Todo: dashboard, solicitudes, usuarios, locales (gestión completa) |
| `VENUE_OWNER` | Dashboard + sección "Mi local" → eventos |
| `VENUE_STAFF` | Subset: Mi local → eventos. **También usa la app móvil para escanear QRs** |
| `CUSTOMER` | Bloqueado: `/auth/signin-web` devuelve 403 → banner "Esta cuenta es solo para la app móvil" |

> `VENUE_STAFF` es el único rol con acceso **dual**: panel web (sidebar restringido) + app móvil (scanner QR en puerta). `CUSTOMER` nunca entra al panel.

Posición en el monorepo:

```
app-nightpass-APP/
├── app-nightpass/             # app móvil Flutter
├── server-nightpass/     # API NestJS (puerto 7101)
└── cliente-nightpass/       # ← este proyecto (puerto 7100)
```

## Stack

| Capa            | Tecnología                                           |
| --------------- | ---------------------------------------------------- |
| Framework       | Next.js 15 (App Router, Turbopack, typedRoutes)      |
| UI              | React 19 + Tailwind CSS 4 (CSS-first) + shadcn/ui    |
| Estado servidor | TanStack Query                                       |
| Estado UI       | Zustand (reservado)                                  |
| Forms           | react-hook-form + zod                                |
| Tema            | next-themes (`dark` por default)                     |
| Toasts          | sonner                                               |
| Iconos          | lucide-react                                         |

## Comandos

```bash
pnpm install
pnpm dev          # localhost:7100 (backend en :7101)
pnpm build
pnpm lint
pnpm format
pnpm type-check
```

## Estructura

```
src/
├── middleware.ts                    # auth guard + refresh transparente + mustChangePassword desde JWT
├── app/
│   ├── layout.tsx                   # AppProviders, fonts (Inter + Space Grotesk)
│   ├── globals.css                  # Tailwind 4 + tema NightPass (OKLCH) + animaciones lava/bokeh
│   ├── (public)/                    # landing + solicitar-local (sin auth)
│   ├── (auth)/                      # login + cambiar-password (split-screen con LavaBackground)
│   ├── (app)/                       # rutas protegidas
│   │   ├── layout.tsx               # serverFetch /auth/me + redirect CUSTOMER
│   │   ├── _components/app-shell.tsx # sidebar glassmorphism + bokeh + banner temp password
│   │   ├── dashboard/
│   │   ├── admin/solicitudes/       # ADMIN: tabla + modal centrado
│   │   ├── admin/usuarios/          # ADMIN: tabla + modal centrado
│   │   ├── admin/locales/           # ADMIN: tabla + drawer lateral (Sheet)
│   │   ├── cambiar-password/        # forzado por middleware si mustChangePassword=true
│   │   └── mi-local/eventos/        # OWNER/STAFF: gestión de eventos
│   └── api/                         # route handlers (proxies JWT↔cookies)
│       ├── auth/{login,refresh,logout,me,change-password}/
│       ├── venue-applications/[id]/{approve,reject}/
│       ├── users/[id]/
│       ├── venues/[id]/{suspend,reactivate,staff/[userId]}/
│       ├── events/[id]/{tiers/[tierId]}/
│       ├── uploads/sign/
│       └── catalog/{venues,events}/
├── core/
│   ├── components/ui/               # shadcn/ui components
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

## Convenciones

### Server vs Client

- **Server por default.** `'use client'` solo en: forms, hooks con estado, mutaciones, tablas con modales.
- Layouts protegidos hacen el auth check con `serverFetch` y redirigen con `redirect()`.

### API clients (3 contextos)

| Cliente          | Dónde usar               | Cómo lleva auth                              |
| ---------------- | ------------------------ | -------------------------------------------- |
| `serverFetch`    | Server Components, layouts | Lee cookie `np_access` → `Authorization: Bearer` |
| `clientFetch`    | Client Components        | Va a rutas relativas (`/api/...`) con `credentials: 'include'` |
| `proxyToApi`     | Route handlers           | Reenvía request con Bearer al backend        |

**Importante**: el backend app-nightpass **no** envuelve respuestas en `{ data, meta }`. Los clients devuelven el JSON crudo.

### Auth flow

1. Form llama a `/api/auth/login` (route handler local).
2. Route handler hace POST al backend `/auth/signin` → recibe `{ accessToken, refreshToken, user }` en JSON.
3. Route handler setea cookies HttpOnly `np_access` (15 min) y `np_refresh` (30 días) en la respuesta.
4. Middleware en cada request:
   - Si `np_access` vigente → decodifica el payload JWT (sin verificar firma, ya fue verificado).
   - Si `mustChangePassword=true` y ruta ≠ `/cambiar-password` → redirect 302 a `/cambiar-password`.
   - Si expirado y hay `np_refresh` → refresh silencioso, rota cookies, continúa.
   - Si nada → redirige a `/login?from=<ruta>`.
5. Layout `(app)/layout.tsx` hace `serverFetch<User>('/auth/me')` como segundo guard. 401 → redirect login. CUSTOMER → redirect logout+banner.

> **Por qué el redirect de `mustChangePassword` está en el middleware y no en el layout:** el middleware hace HTTP 302 antes de cualquier render de React, evitando la pantalla negra que ocurre cuando `redirect()` se llama desde un Server Component durante navegación client-side.

**Nunca guardar tokens en `localStorage`** — el patrón es JWT del backend → cookies HttpOnly del Next.js.

### Patrón UI: tablas → modales/drawers

- **Tablas de listas** (solicitudes, usuarios, locales, eventos): siempre client components con `useState<string | null>(null)` para el ID activo.
- **Solicitudes y Usuarios** → `Dialog` (modal centrado, `sm:max-w-2xl`).
- **Locales** → `Sheet` (drawer lateral, `sm:max-w-2xl`). El drawer contiene tabs o secciones para edición, staff, eventos.
- **Crear/editar eventos dentro del drawer** → abre un `Dialog` centrado encima del Sheet.
- Las acciones inline (suspend/reactivate en venues) usan iconos en la columna de acciones y llaman a la mutación sin abrir modal.

### Sheet scroll — patrón obligatorio

Cuando el contenido de un `SheetContent` puede desbordar:

```tsx
<SheetContent className="flex w-full flex-col overflow-hidden p-0 sm:max-w-2xl">
  <SheetHeader className="shrink-0 border-b px-6 pb-4 pt-5">...</SheetHeader>
  <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
    {/* contenido scrollable */}
  </div>
</SheetContent>
```

`min-h-0` en el div interior es crítico — sin él, flex ignora el overflow y el scroll no funciona.

### Actualización de datos tras mutaciones — patrón obligatorio

Las tablas de las páginas de lista son **Server Components** (datos frescos del servidor en cada render). Cuando una mutación client-side cambia datos, hay que llamar `router.refresh()` para que Next.js refetch el Server Component **inmediatamente** — no solo al cerrar el modal.

El lugar correcto es el **hook de mutación** (no el componente), en `onSuccess`:

```ts
// Ejemplo: use-approve.ts
onSuccess: (data) => {
  toast.success(`"${data.venueName}" fue aprobado`);
  qc.invalidateQueries({ queryKey: ['venue-applications'] });
  router.refresh(); // ← actualiza la tabla en segundo plano al instante
  opts?.onSuccess?.(data);
},
```

Todos los hooks de mutación deben seguir este patrón: `invalidateQueries` + `router.refresh()` en `onSuccess`.

### Features

- Cada feature es autocontenido bajo `src/features/<X>/` con `components/`, `hooks/`, `schemas/`, `index.ts`.
- **Un feature no importa de otro feature.** Lo compartido vive en `core/`.
- API pública del feature solo lo que se exporta en `index.ts`.

### shadcn/ui

- Único sistema UI permitido. Componentes en `src/core/components/ui/`.
- Añadir nuevos con `pnpm dlx shadcn@latest add <componente>`.
- **Prohibido**: MUI, Chakra, Mantine, Ant Design, NextUI, HeroUI, daisyUI, Headless UI, React Bootstrap.

### Forms

```tsx
const { register, handleSubmit, formState: { errors } } = useForm<Input>({
  resolver: zodResolver(schema),
});
const { mutate, isPending } = useMyMutation();
const onSubmit = handleSubmit((values) => mutate(values));
```

Wrap inputs en `<Field label="..." htmlFor="..." error={errors.x?.message}>`.

### Naming

- Archivos: `kebab-case.ts(x)`
- Componentes: `PascalCase`
- Hooks: `useXxx`
- Schemas: `xxx.schema.ts`, type `XxxInput`
- Constantes: `SCREAMING_SNAKE_CASE`

### No hacer

- No llamar a `fetch` directo desde widgets — usar `serverFetch` / `clientFetch`.
- No guardar tokens en `localStorage` ni `sessionStorage`.
- No hardcodear URLs — usar `paths` de `core/config/paths.ts`.
- No crear tipos paralelos a `core/types/api.ts` — extender ahí cuando el backend agregue módulos.
- No usar `dangerouslySetInnerHTML` con input de usuario.
- No quitar `Authorization: Bearer` que añade `serverFetch`.
- No mostrar passwords en pantalla — las credenciales temporales se envían solo por email.
- No mover `router.refresh()` al componente si ya está en el hook de mutación — evitar doble refresh.

## Tema y diseño NightPass

El panel interno (rutas protegidas) sigue el mismo lenguaje visual que el landing y el login:

### Paleta OKLCH
- Fondo dark: `oklch(0.078 0.005 280)` ≈ `#0A0A0F`
- Primary: `oklch(0.62 0.245 296.5)` ≈ `#A855F7`
- Primary hover: `oklch(0.495 0.255 296.5)` ≈ `#9333EA`

### Tipografías
- Inter (body) → `font-sans`
- Space Grotesk (display/headings) → `font-display`

### App shell (`app-shell.tsx`)
- Fondo: 3 orbes bokeh con gradiente radial purple/rosa a ~5-7% opacidad (mismo lenguaje que landing pero más sutil).
- Sidebar: `bg-white/[0.03] backdrop-blur-xl border-r border-white/8`
- Logo: texto con gradiente `from-white to-purple-300 bg-clip-text text-transparent font-display`
- Labels de sección nav: `text-primary/50`
- Nav activo: `bg-primary/15 text-primary`
- Nav hover: `hover:bg-white/[0.06]`
- Main: `bg-transparent` (el bokeh del wrapper se ve a través)

### Cards (glassmorphism)
Todas las cards y contenedores de datos usan el estilo del landing:
```
rounded-[22px] border border-white/10 bg-white/[0.025]
hover:bg-white/[0.04]   ← en elementos interactivos
```

### Tablas
```
contenedor:  overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.025]
thead:       border-b border-white/8 bg-white/[0.02]
filas:       border-b border-white/5 hover:bg-white/[0.05]
```

### Eyebrow labels
Sobre los h1 de cada sección:
```tsx
<p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
  Nombre sección
</p>
```

### Botones CTA primarios
Gradiente `from-[#9333ea] to-[#a855f7]` con `box-shadow: 0 4px 24px rgba(168,85,247,0.35)`.

## Rutas

| Ruta | Auth | Notas |
| --- | --- | --- |
| `/` | público | Landing |
| `/login` | público | Acepta `?reason=customer-blocked` |
| `/solicitar-local` | público | Form sin password — genera temp password al aprobar |
| `/dashboard` | autenticado | Split según rol |
| `/cambiar-password` | autenticado | Forzado por middleware si `mustChangePassword=true` |
| `/admin/solicitudes` | ADMIN | Tabla + modal centrado. Al aprobar → solo confirma, envía email |
| `/admin/usuarios` | ADMIN | Tabla + modal centrado (read-only) |
| `/admin/locales` | ADMIN | Tabla + drawer lateral (Sheet) con edición, staff, eventos |
| `/mi-local/eventos` | OWNER/STAFF | Gestión de eventos del local propio |
| `/api/auth/{login,refresh,logout,me,change-password}` | mixed | Puente JWT↔cookies |
| `/api/venue-applications/[id]/{approve,reject}` | ADMIN | Proxy con Bearer |
| `/api/users/[id]` | ADMIN | Proxy con Bearer |
| `/api/venues/[id]/{suspend,reactivate}` | ADMIN | Proxy con Bearer |
| `/api/venues/[id]/staff/[userId]` | ADMIN/OWNER | Proxy con Bearer |
| `/api/events/[id]/tiers/[tierId]` | ADMIN/OWNER | Proxy con Bearer |
| `/api/uploads/sign` | ADMIN/OWNER/STAFF | Proxy con Bearer |

## Backend asociado

`../server-nightpass/` — ver su `CLAUDE.md` y `README.md` para endpoints completos.
- Puerto: 7101
- Auth: JWT en body (no cookies). El admin los convierte a cookies HttpOnly.
- Email: Gmail SMTP vía nodemailer (`SMTP_USER`, `SMTP_PASS` en `.env` del backend).

## Limitaciones / pendientes

- `/admin/usuarios` es read-only (sin baneo, cambio de rol, eliminación).
- Slug de venue/evento inmutable tras creación.
- Módulos sidebar "pronto": Pases, Stories (Fases 3 y 4).
- Sin tests aún (Fase 5).
- i18n: todo en español hardcoded.
