import { NextResponse, type NextRequest } from 'next/server';
import { serverEnv } from '@/core/config/env';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '@/core/config/cookies';

export interface ProxyOptions {
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
}

interface RefreshResult {
  accessToken: string;
  refreshToken: string;
}

async function refreshTokens(refreshToken: string): Promise<RefreshResult | null> {
  try {
    const res = await fetch(`${serverEnv.API_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    return (await res.json()) as RefreshResult;
  } catch {
    return null;
  }
}

export async function proxyToApi(
  req: NextRequest,
  path: string,
  options: ProxyOptions,
): Promise<NextResponse> {
  let accessToken = req.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;
  const url = `${serverEnv.API_URL}/api/v1${path}`;

  let body: string | undefined;
  if (options.body !== undefined) {
    body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
  } else if (options.method !== 'GET' && req.headers.get('content-type')?.includes('json')) {
    body = await req.text();
  }

  const buildHeaders = (token: string | undefined): Record<string, string> => {
    const h: Record<string, string> = {};
    if (body !== undefined) h['Content-Type'] = 'application/json';
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  };

  let upstream = await fetch(url, { method: options.method, headers: buildHeaders(accessToken), body });

  let rotatedTokens: RefreshResult | null = null;
  if (upstream.status === 401 && refreshToken) {
    rotatedTokens = await refreshTokens(refreshToken);
    if (rotatedTokens) {
      accessToken = rotatedTokens.accessToken;
      upstream = await fetch(url, { method: options.method, headers: buildHeaders(accessToken), body });
    }
  }

  const text = await upstream.text();
  const res = new NextResponse(text || null, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('content-type') ?? 'application/json',
    },
  });

  if (rotatedTokens) {
    const isProd = process.env.NODE_ENV === 'production';
    res.cookies.set(ACCESS_COOKIE, rotatedTokens.accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      path: '/',
      maxAge: 60 * 15,
    });
    res.cookies.set(REFRESH_COOKIE, rotatedTokens.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  return res;
}
