import { NextResponse, type NextRequest } from 'next/server';
import { serverEnv } from '@/core/config/env';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  accessCookieOptions,
  refreshCookieOptions,
} from '@/core/config/cookies';
import type { AuthResponse } from '@/core/types/api';

export async function POST(req: NextRequest) {
  const body = await req.text();

  const upstream = await fetch(`${serverEnv.API_URL}/api/v1/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  const data = (await upstream.json().catch(() => null)) as AuthResponse | null;

  if (!upstream.ok || !data) {
    return NextResponse.json(data ?? { message: 'Error desconocido' }, { status: upstream.status });
  }

  const res = NextResponse.json({ user: data.user });
  res.cookies.set(ACCESS_COOKIE, data.accessToken, accessCookieOptions);
  res.cookies.set(REFRESH_COOKIE, data.refreshToken, refreshCookieOptions);
  return res;
}
