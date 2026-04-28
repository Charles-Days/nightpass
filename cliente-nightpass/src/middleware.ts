import { NextResponse, type NextRequest } from 'next/server';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '@/core/config/cookies';

const PROTECTED_PREFIXES = ['/dashboard', '/admin', '/mi-local', '/cambiar-password'];
const AUTH_PREFIXES = ['/login'];

interface JwtPayload {
  exp?: number;
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

const isProtected = (pathname: string) =>
  PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

const isAuthRoute = (pathname: string) =>
  AUTH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const accessToken = req.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;

  const hasValidAccess = Boolean(accessToken) && !isJwtExpired(accessToken!);
  const hasRefresh = Boolean(refreshToken);

  if (isAuthRoute(pathname) && hasValidAccess) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  if (!isProtected(pathname)) {
    return NextResponse.next();
  }

  if (hasValidAccess) {
    const payload = decodeJwt(accessToken!);
    if (payload?.mustChangePassword && !pathname.startsWith('/cambiar-password')) {
      return NextResponse.redirect(new URL('/cambiar-password', req.url));
    }
    return NextResponse.next();
  }

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

  const loginUrl = new URL('/login', req.url);
  loginUrl.searchParams.set('from', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
