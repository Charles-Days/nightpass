import { NextResponse, type NextRequest } from 'next/server';
import { serverEnv } from '@/core/config/env';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  accessCookieOptions,
  refreshCookieOptions,
} from '@/core/config/cookies';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

async function refreshTokens(refreshToken: string): Promise<TokenPair | null> {
  try {
    const res = await fetch(`${serverEnv.API_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    return (await res.json()) as TokenPair;
  } catch {
    return null;
  }
}

/**
 * Cambia la contraseña y ROTA las cookies con los tokens nuevos que devuelve
 * el backend (mustChangePassword=false). Sin rotar, el middleware seguiria
 * leyendo el JWT viejo y rebotaria a /cambiar-password en loop.
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  let accessToken = req.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;
  const url = `${serverEnv.API_URL}/api/v1/auth/change-password`;

  const call = (token: string | undefined) =>
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body,
    });

  let upstream = await call(accessToken);

  // Access expirado → refrescar una vez y reintentar.
  if (upstream.status === 401 && refreshToken) {
    const rotated = await refreshTokens(refreshToken);
    if (rotated) {
      accessToken = rotated.accessToken;
      upstream = await call(accessToken);
    }
  }

  const data = (await upstream.json().catch(() => null)) as
    | (TokenPair & Record<string, unknown>)
    | null;

  if (!upstream.ok || !data?.accessToken) {
    return NextResponse.json(data ?? { message: 'Error desconocido' }, {
      status: upstream.status,
    });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ACCESS_COOKIE, data.accessToken, accessCookieOptions);
  res.cookies.set(REFRESH_COOKIE, data.refreshToken, refreshCookieOptions);
  return res;
}
