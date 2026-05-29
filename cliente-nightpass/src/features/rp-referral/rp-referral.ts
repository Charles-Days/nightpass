const COOKIE_KEY = 'np_rp_ref';
const COOKIE_DAYS = 7;

/**
 * Saves the RP code to a cookie with a 7-day TTL if in a browser context.
 */
export function saveRpRef(code: string): void {
  if (typeof document === 'undefined') return;
  const exp = new Date(Date.now() + COOKIE_DAYS * 86_400_000).toUTCString();
  document.cookie = `${COOKIE_KEY}=${encodeURIComponent(code)}; expires=${exp}; path=/; SameSite=Lax; Secure`;
}

/**
 * Reads the RP code from the referral cookie if it exists.
 */
export function readRpRefCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_KEY}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Clears the referral cookie after a successful purchase.
 */
export function clearRpRef(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${COOKIE_KEY}=; max-age=0; path=/`;
}
