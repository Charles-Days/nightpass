import { NextResponse, type NextRequest } from 'next/server';
import { ACCESS_COOKIE, REFRESH_COOKIE, clearedCookieOptions } from '@/core/config/cookies';

// El backend NIHP no tiene endpoint de logout: tokens son stateless en jwt
// y los refresh hashed se eliminaran al expirar. Aqui solo limpiamos cookies.

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ACCESS_COOKIE, '', clearedCookieOptions);
  res.cookies.set(REFRESH_COOKIE, '', clearedCookieOptions);
  return res;
}

// GET es para redirects desde server components (ej. cuando el layout
// detecta que el rol no esta permitido en el panel).
export async function GET(req: NextRequest) {
  const next = req.nextUrl.searchParams.get('next');
  const safeNext = next && next.startsWith('/') ? next : '/login';
  const res = NextResponse.redirect(new URL(safeNext, req.url));
  res.cookies.set(ACCESS_COOKIE, '', clearedCookieOptions);
  res.cookies.set(REFRESH_COOKIE, '', clearedCookieOptions);
  return res;
}
