import { cookies } from 'next/headers';
import { serverEnv } from '@/core/config/env';
import { ACCESS_COOKIE } from '@/core/config/cookies';

export interface FetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /**
   * Si se pasa, usa la Data Cache de Next con `next: { revalidate }` (ISR) en vez
   * de `cache: 'no-store'`. Así varios renders comparten el mismo resultado y se
   * baja la carga al backend. Solo para datos tolerantes a staleness — NO usar en
   * datos que deban ser frescos al instante tras una mutación. El header
   * `Authorization: Bearer` se sigue enviando igual. Por defecto: `no-store`.
   */
  revalidate?: number;
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

  const { revalidate, ...rest } = options;

  const url = `${serverEnv.API_URL}/api/v1${path}`;
  const headers = new Headers(rest.headers);
  if (!headers.has('Content-Type') && rest.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  // Por defecto `no-store` (backward-compat). Si el caller pasa `revalidate`,
  // usamos la Data Cache de Next (ISR) — sin tocar el header Authorization.
  const cacheOpts =
    revalidate !== undefined
      ? { next: { revalidate } }
      : { cache: 'no-store' as const };

  let res: Response;
  try {
    res = await fetch(url, {
      ...rest,
      headers,
      body: rest.body !== undefined ? JSON.stringify(rest.body) : undefined,
      ...cacheOpts,
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

/**
 * Lectura de endpoints PÚBLICOS del backend (`/catalog/*`, stats, sitemap).
 * A diferencia de `serverFetch`, NO lee cookies ni manda `Authorization`, y
 * usa la Data Cache de Next con `revalidate` (ISR) en vez de `no-store`. Así
 * varias requests comparten el mismo resultado y se baja la carga del backend.
 *
 * No usar para datos personalizados por usuario (auth/me, loyalty, pases).
 */
export async function publicFetch<T>(
  path: string,
  options: { revalidate?: number; tags?: string[] } = {},
): Promise<T> {
  const { revalidate = 300, tags } = options;
  const url = `${serverEnv.API_URL}/api/v1${path}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, {
      next: { revalidate, ...(tags ? { tags } : {}) },
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
