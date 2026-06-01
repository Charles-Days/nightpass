import { NextResponse, type NextRequest } from 'next/server';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  accessCookieOptions,
  refreshCookieOptions,
} from '@/core/config/cookies';

interface RefreshTokens {
  accessToken: string;
  refreshToken: string;
}

// Rutas del panel admin (solo ADMIN/VENUE_OWNER/VENUE_STAFF/PROMOTER/PROMOTER_STAFF).
const ADMIN_PREFIXES = [
  '/dashboard',
  '/admin',
  '/mi-local',
  '/app/mi-organizador',
  '/cambiar-password',
  '/mi-cuenta',
  '/scanner',
  '/rp-dashboard',
];

// Rutas reservadas a roles de local.
const VENUE_PREFIXES = ['/mi-local'];
// Rutas reservadas a roles de organizador.
const PROMOTER_PREFIXES = ['/app/mi-organizador'];

// Rutas customer que requieren login (cualquier rol autenticado, incluyendo CUSTOMER).
const CUSTOMER_PROTECTED_PREFIXES = [
  '/app/pases',
  '/app/perfil',
  '/app/checkout',
  '/app/recompensas',
  '/app/checkin',
];

// Rutas de auth — si ya hay sesion, redirigimos fuera de ellas.
const AUTH_ROUTES_ADMIN = ['/login'];
const AUTH_ROUTES_CUSTOMER = ['/app/iniciar-sesion', '/app/registro'];

interface JwtPayload {
  exp?: number;
  role?: string;
  mustChangePassword?: boolean;
}

function decodeJwt(token: string): JwtPayload | null {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    return JSON.parse(
      Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8'),
    ) as JwtPayload;
  } catch {
    return null;
  }
}

function isJwtExpired(token: string): boolean {
  const decoded = decodeJwt(token);
  if (!decoded?.exp) return true;
  return Date.now() >= decoded.exp * 1000;
}

const matches = (pathname: string, prefixes: string[]) =>
  prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));

// ── Modo mantenimiento ──────────────────────────────────────────────────────
// Se consulta en cada request, así que cacheamos el resultado por instancia con
// un TTL corto para no pegarle al backend en cada navegación.
const MAINTENANCE_PATH = '/mantenimiento';
const MAINT_TTL_MS = 120_000;
let maintCache: { on: boolean; at: number } | null = null;

async function isMaintenanceOn(): Promise<boolean> {
  if (maintCache && Date.now() - maintCache.at < MAINT_TTL_MS) {
    return maintCache.on;
  }
  const apiUrl = process.env.API_URL ?? 'http://localhost:7101';
  let on: boolean;
  try {
    const res = await fetch(`${apiUrl}/api/v1/maintenance`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(2500),
    });
    if (res.ok) {
      const data = (await res.json()) as { maintenance?: boolean };
      on = Boolean(data.maintenance);
    } else if (res.status >= 500) {
      // Backend roto (5xx) → mantenimiento automático.
      on = true;
    } else {
      // 4xx puntual (403 por ban transitorio, 429, etc.): el backend está vivo,
      // solo respondió un error a ESTE request. No tumbar el sitio entero —
      // conservar el último estado conocido o asumir operativo.
      on = maintCache?.on ?? false;
    }
  } catch {
    // Backend caído / timeout (sin respuesta) → mantenimiento automático.
    on = true;
  }
  maintCache = { on, at: Date.now() };
  return on;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Gate de mantenimiento (antes de cualquier auth) ──────────────────────
  const maintenanceOn = await isMaintenanceOn();
  const onMaintenancePage = pathname === MAINTENANCE_PATH;
  if (maintenanceOn) {
    // El ADMIN puede seguir navegando para apagar el flag desde el panel.
    // Leemos el rol del JWT aunque esté expirado (el payload sigue siendo
    // legible): así el admin nunca queda atrapado fuera por el TTL de 15 min.
    // La acción real (POST /maintenance) la valida el backend con firma, así
    // que esto solo decide la UI, no da acceso a nada.
    const adminToken = req.cookies.get(ACCESS_COOKIE)?.value;
    const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;
    const isAdmin =
      Boolean(adminToken) &&
      Boolean(refreshToken) &&
      decodeJwt(adminToken!)?.role === 'ADMIN';
    if (!isAdmin && !onMaintenancePage) {
      return NextResponse.rewrite(new URL(MAINTENANCE_PATH, req.url));
    }
  } else if (onMaintenancePage) {
    // Mantenimiento terminó pero el usuario sigue en la página → a casa.
    return NextResponse.redirect(new URL('/', req.url));
  }

  const accessToken = req.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;

  const hasValidAccess = Boolean(accessToken) && !isJwtExpired(accessToken!);
  const hasRefresh = Boolean(refreshToken);

  const isAdminRoute = matches(pathname, ADMIN_PREFIXES);
  const isCustomerProtected = matches(pathname, CUSTOMER_PROTECTED_PREFIXES);
  const isAuthRoute =
    matches(pathname, AUTH_ROUTES_ADMIN) || matches(pathname, AUTH_ROUTES_CUSTOMER);

  // Sesion valida: gating por rol + redirecciones.
  if (hasValidAccess) {
    const payload = decodeJwt(accessToken!);
    const role = payload?.role;

    const isVenueRoute = matches(pathname, VENUE_PREFIXES);
    const isPromoterRoute = matches(pathname, PROMOTER_PREFIXES);

    // En rutas de auth con sesion ya activa, mandamos al home segun rol.
    if (isAuthRoute) {
      let target = '/dashboard';
      if (role === 'CUSTOMER') target = '/app';
      else if (role === 'PROMOTER' || role === 'PROMOTER_STAFF') target = '/app/mi-organizador';
      else if (role === 'VENUE_OWNER' || role === 'VENUE_STAFF') target = '/mi-local';
      else if (role === 'RP') target = '/rp-dashboard';
      return NextResponse.redirect(new URL(target, req.url));
    }

    // CUSTOMER no entra al panel admin.
    if (isAdminRoute && role === 'CUSTOMER') {
      return NextResponse.redirect(new URL('/app', req.url));
    }

    // Roles de organizador no entran a /mi-local ni a /admin (excepto ADMIN).
    if ((role === 'PROMOTER' || role === 'PROMOTER_STAFF') && (isVenueRoute || pathname.startsWith('/admin'))) {
      return NextResponse.redirect(new URL('/app/mi-organizador', req.url));
    }

    // Roles de local no entran al panel organizador.
    if ((role === 'VENUE_OWNER' || role === 'VENUE_STAFF') && isPromoterRoute) {
      return NextResponse.redirect(new URL('/mi-local', req.url));
    }

    // RP no entra a /admin, /mi-local ni a panel organizador.
    if (role === 'RP' && (isVenueRoute || isPromoterRoute || pathname.startsWith('/admin') || pathname === '/dashboard')) {
      return NextResponse.redirect(new URL('/rp-dashboard', req.url));
    }

    // Forzar cambio de password (solo aplica a roles admin).
    if (payload?.mustChangePassword && !pathname.startsWith('/cambiar-password') && isAdminRoute) {
      return NextResponse.redirect(new URL('/cambiar-password', req.url));
    }

    return NextResponse.next();
  }

  // Sin sesion valida: dejar pasar rutas publicas y de auth.
  if (!isAdminRoute && !isCustomerProtected) {
    return NextResponse.next();
  }

  // Intentar refresh silencioso llamando directo al backend. NO usar
  // `fetch(new URL('/api/auth/refresh', req.url))` porque req.url en prod es
  // https://<dominio> → fetch sale al proxy publico y vuelve al container
  // interno HTTP (puerto 3000) generando ERR_SSL_PACKET_LENGTH_TOO_LONG.
  // Inline la logica del route handler /api/auth/refresh.
  if (hasRefresh) {
    const apiUrl = process.env.API_URL ?? 'http://localhost:7101';
    try {
      const upstream = await fetch(`${apiUrl}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
        signal: AbortSignal.timeout(2000),
      });
      if (upstream.ok) {
        const tokens = (await upstream.json()) as RefreshTokens;
        const res = NextResponse.next();
        res.cookies.set(ACCESS_COOKIE, tokens.accessToken, accessCookieOptions);
        res.cookies.set(REFRESH_COOKIE, tokens.refreshToken, refreshCookieOptions);
        return res;
      }
    } catch {
      // Backend caido o red — caemos al redirect de login mas abajo.
    }
  }

  // RSC prefetch desde <Link>: si redirigimos a /login el cliente cachea esa
  // respuesta y al hacer click muestra un flash de la pantalla de login antes
  // de la navegacion real. Devolvemos 204 sin contenido — Next.js descarta
  // el prefetch y la navegacion real volvera a pasar por el middleware.
  const isPrefetch =
    req.headers.get('next-router-prefetch') === '1' ||
    req.headers.get('purpose') === 'prefetch' ||
    req.headers.get('x-purpose') === 'prefetch';
  if (isPrefetch) {
    return new NextResponse(null, { status: 204 });
  }

  // Sin auth para una ruta protegida: redirigir al login que corresponde.
  const loginPath = isAdminRoute ? '/login' : '/app/iniciar-sesion';
  const loginUrl = new URL(loginPath, req.url);
  loginUrl.searchParams.set('from', `${pathname}${req.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
