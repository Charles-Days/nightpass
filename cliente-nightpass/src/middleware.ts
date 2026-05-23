import { NextResponse, type NextRequest } from 'next/server';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '@/core/config/cookies';

// Rutas del panel admin (solo ADMIN/VENUE_OWNER/VENUE_STAFF).
const ADMIN_PREFIXES = ['/dashboard', '/admin', '/mi-local', '/cambiar-password', '/scanner'];

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

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

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

    // En rutas de auth con sesion ya activa, mandamos al home segun rol.
    if (isAuthRoute) {
      const target = role === 'CUSTOMER' ? '/app' : '/dashboard';
      return NextResponse.redirect(new URL(target, req.url));
    }

    // CUSTOMER no entra al panel admin.
    if (isAdminRoute && role === 'CUSTOMER') {
      return NextResponse.redirect(new URL('/app', req.url));
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

  // Intentar refresh silencioso si hay refresh token.
  if (hasRefresh) {
    const refreshRes = await fetch(new URL('/api/auth/refresh', req.url), {
      method: 'POST',
      headers: { Cookie: req.headers.get('cookie') ?? '' },
    });

    if (refreshRes.ok) {
      const res = NextResponse.next();
      refreshRes.headers.forEach((value, key) => {
        if (key.toLowerCase() === 'set-cookie') res.headers.append('set-cookie', value);
      });
      return res;
    }
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
