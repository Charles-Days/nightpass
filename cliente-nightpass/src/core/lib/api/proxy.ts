import { NextResponse, type NextRequest } from 'next/server';
import { serverEnv } from '@/core/config/env';
import { ACCESS_COOKIE } from '@/core/config/cookies';

export interface ProxyOptions {
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
}

/**
 * Proxy generico desde route handlers de Next.js hacia el backend NIHP
 * para recursos protegidos (NO para auth, que tiene flujos especificos).
 *
 * Lee la cookie de acceso, la convierte en Bearer token y reenvia la respuesta.
 */
export async function proxyToApi(
  req: NextRequest,
  path: string,
  options: ProxyOptions,
): Promise<NextResponse> {
  const accessToken = req.cookies.get(ACCESS_COOKIE)?.value;
  const url = `${serverEnv.API_URL}/api/v1${path}`;

  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  let body: string | undefined;
  if (options.body !== undefined) {
    body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
  } else if (options.method !== 'GET' && req.headers.get('content-type')?.includes('json')) {
    body = await req.text();
    if (body) headers['Content-Type'] = 'application/json';
  }

  const upstream = await fetch(url, { method: options.method, headers, body });
  const text = await upstream.text();
  const init: ResponseInit = { status: upstream.status };
  return new NextResponse(text || null, {
    ...init,
    headers: {
      'Content-Type': upstream.headers.get('content-type') ?? 'application/json',
    },
  });
}
