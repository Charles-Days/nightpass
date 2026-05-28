import { cookies } from 'next/headers';
import { serverEnv } from '@/core/config/env';
import { ACCESS_COOKIE } from '@/core/config/cookies';

export interface FetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

export class ServerApiError extends Error {
  constructor(
    public status: number,
    public payload: unknown,
  ) {
    super(`Backend respondio ${status}`);
    this.name = 'ServerApiError';
  }

  // status === 0 ⇒ backend inalcanzable (timeout, DNS, ECONNREFUSED, AbortError).
  get isNetwork() {
    return this.status === 0;
  }
}

const DEFAULT_TIMEOUT_MS = 8000;

/**
 * Llamada al backend NIHP desde Server Components / layouts / route handlers.
 * Lee la cookie HttpOnly `np_access` y la convierte en `Authorization: Bearer`.
 *
 * Cualquier fallo de red (timeout, DNS, ECONNREFUSED) se normaliza a
 * `ServerApiError(0, …)` para que los callers puedan distinguir sin tener que
 * inspeccionar mensajes opacos de `TypeError: fetch failed`.
 */
export async function serverFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE)?.value;

  const url = `${serverEnv.API_URL}/api/v1${path}`;
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      cache: 'no-store',
      signal: controller.signal,
    });
  } catch (err) {
    const reason = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    throw new ServerApiError(0, { reason, url });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    throw new ServerApiError(res.status, payload);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
