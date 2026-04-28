import { NextResponse, type NextRequest } from 'next/server';
import { serverEnv } from '@/core/config/env';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  accessCookieOptions,
  clearedCookieOptions,
  refreshCookieOptions,
} from '@/core/config/cookies';
import type { AuthTokens } from '@/core/types/api';

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) {
    return NextResponse.json({ message: 'Sin refresh token' }, { status: 401 });
  }

  const upstream = await fetch(`${serverEnv.API_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!upstream.ok) {
    const payload = await upstream.json().catch(() => null);
    const res = NextResponse.json(payload ?? { message: 'Refresh fallo' }, {
      status: upstream.status,
    });
    res.cookies.set(ACCESS_COOKIE, '', clearedCookieOptions);
    res.cookies.set(REFRESH_COOKIE, '', clearedCookieOptions);
    return res;
  }

  const data = (await upstream.json()) as AuthTokens;
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ACCESS_COOKIE, data.accessToken, accessCookieOptions);
  res.cookies.set(REFRESH_COOKIE, data.refreshToken, refreshCookieOptions);
  return res;
}
