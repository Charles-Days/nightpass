const KEY = 'np_rp_ref';
const TTL_DAYS = 7;

/**
 * Persiste el código RP en localStorage (principal) y cookie (respaldo).
 *
 * - localStorage sobrevive al full reload del login y NO le afecta el flag
 *   `Secure` ni el protocolo — por eso es la fuente principal.
 * - La cookie es respaldo legible server-side. `Secure` solo en https: en
 *   `http` dev el navegador descarta cookies Secure y se perdía el ref.
 */
export function saveRpRef(code: string): void {
  if (typeof window === 'undefined') return;
  const trimmed = code.trim();
  if (!trimmed) return;

  try {
    window.localStorage.setItem(KEY, trimmed);
  } catch {
    // storage lleno/deshabilitado (modo incógnito estricto) — seguimos con cookie.
  }

  const exp = new Date(Date.now() + TTL_DAYS * 86_400_000).toUTCString();
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${KEY}=${encodeURIComponent(trimmed)}; expires=${exp}; path=/; SameSite=Lax${secure}`;
}

/**
 * Lee el código RP: localStorage primero, cookie como fallback.
 */
export function readRpRef(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const ls = window.localStorage.getItem(KEY);
    if (ls) return ls;
  } catch {
    // ignorar — caemos a la cookie.
  }

  const match = document.cookie.match(new RegExp(`(?:^|; )${KEY}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Extrae el `ref` de un path con query (p.ej. el `from` que el middleware
 * arma al mandar a login: `/app/evento/abc?ref=CODE`). Devuelve null si no hay.
 */
export function extractRefFromPath(path: string | null | undefined): string | null {
  if (!path) return null;
  const q = path.indexOf('?');
  if (q === -1) return null;
  return new URLSearchParams(path.slice(q + 1)).get('ref');
}

/**
 * Limpia el código RP de ambos stores tras una compra exitosa.
 */
export function clearRpRef(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignorar.
  }
  document.cookie = `${KEY}=; max-age=0; path=/`;
}
