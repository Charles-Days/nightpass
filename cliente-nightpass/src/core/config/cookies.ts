import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';

export const ACCESS_COOKIE = 'np_access';
export const REFRESH_COOKIE = 'np_refresh';
// Marca "este dispositivo ya tuvo cuenta" — solo decide si el header invita a
// "Crear cuenta" (visitante nuevo) o "Iniciar sesión" (regresa). No es auth ni
// revela qué email: persiste tras logout, no se borra al cerrar sesión.
export const RETURNING_COOKIE = 'np_returning';

const isProd = process.env.NODE_ENV === 'production';

const baseCookieOptions = {
  httpOnly: true,
  secure: isProd,
  // 'lax' instead of 'strict' so QR scans / external deep links into authed
  // routes (e.g. /app/checkin/[venueId] opened from native camera app) carry
  // cookies on the initial GET. Lax still blocks cross-site POSTs.
  sameSite: 'lax',
  path: '/',
} satisfies Partial<ResponseCookie>;

export const accessCookieOptions = {
  ...baseCookieOptions,
  maxAge: 60 * 15,
} satisfies Partial<ResponseCookie>;

export const refreshCookieOptions = {
  ...baseCookieOptions,
  maxAge: 60 * 60 * 24 * 30,
} satisfies Partial<ResponseCookie>;

export const clearedCookieOptions = {
  ...baseCookieOptions,
  maxAge: 0,
} satisfies Partial<ResponseCookie>;

export const returningCookieOptions = {
  ...baseCookieOptions,
  maxAge: 60 * 60 * 24 * 365,
} satisfies Partial<ResponseCookie>;
