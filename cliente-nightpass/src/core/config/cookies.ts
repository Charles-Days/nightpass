import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';

export const ACCESS_COOKIE = 'np_access';
export const REFRESH_COOKIE = 'np_refresh';

const isProd = process.env.NODE_ENV === 'production';

const baseCookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'strict',
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
