'use client';

export interface FetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

export class ClientApiError extends Error {
  constructor(
    public status: number,
    public payload: unknown,
  ) {
    super(`API respondio ${status}`);
    this.name = 'ClientApiError';
  }
}

/**
 * Llamada desde Client Components. Va siempre contra rutas relativas (/api/...)
 * que actuan de proxy hacia el backend NIHP. Las cookies HttpOnly viajan
 * automaticamente gracias a `credentials: 'include'`.
 */
export async function clientFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(path, {
    ...options,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    credentials: 'include',
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    throw new ClientApiError(res.status, payload);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
