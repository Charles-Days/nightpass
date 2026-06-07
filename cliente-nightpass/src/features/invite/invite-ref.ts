// Código de invitación cliente→cliente (param `?inv=`), separado del `?ref=` de
// RPs para no pisarse. Mismo patrón de persistencia que rp-referral: localStorage
// principal + cookie de respaldo, sobrevive al reload del registro.
const KEY = 'np_inv';
const EVENT_KEY = 'np_inv_event';
const TTL_DAYS = 14;

function persist(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // storage deshabilitado (incógnito estricto) — seguimos con cookie.
  }
  const exp = new Date(Date.now() + TTL_DAYS * 86_400_000).toUTCString();
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${key}=${encodeURIComponent(value)}; expires=${exp}; path=/; SameSite=Lax${secure}`;
}

function readKey(key: string): string | null {
  try {
    const ls = window.localStorage.getItem(key);
    if (ls) return ls;
  } catch {
    // ignorar — caemos a la cookie.
  }
  const match = document.cookie.match(new RegExp(`(?:^|; )${key}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/** Guarda el código de invitación y, si vino por un evento, su id (vale doble). */
export function saveInviteRef(code: string, eventId?: string): void {
  if (typeof window === 'undefined') return;
  const trimmed = code.trim();
  if (!trimmed) return;
  persist(KEY, trimmed);
  if (eventId) persist(EVENT_KEY, eventId);
}

export function readInviteEvent(): string | null {
  if (typeof window === 'undefined') return null;
  return readKey(EVENT_KEY);
}

/** Extrae el id del evento de un path tipo `/app/evento/<id>`. */
export function extractEventIdFromPath(path: string | null | undefined): string | null {
  if (!path) return null;
  const m = path.match(/\/app\/evento\/([0-9a-f-]{36})/i);
  return m ? m[1] : null;
}

export function readInviteRef(): string | null {
  if (typeof window === 'undefined') return null;
  return readKey(KEY);
}

/** Extrae el `inv` de un path con query (p.ej. el `from` que arma el login). */
export function extractInviteFromPath(path: string | null | undefined): string | null {
  if (!path) return null;
  const q = path.indexOf('?');
  if (q === -1) return null;
  return new URLSearchParams(path.slice(q + 1)).get('inv');
}

export function clearInviteRef(): void {
  if (typeof window === 'undefined') return;
  for (const key of [KEY, EVENT_KEY]) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignorar.
    }
    document.cookie = `${key}=; max-age=0; path=/`;
  }
}
