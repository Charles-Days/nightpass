import { z } from 'zod';

const serverSchema = z.object({
  API_URL: z.string().url().default('http://localhost:7101'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

const clientSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().default('NightPass Admin'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('https://nightpass.mx'),
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: z.string().optional(),
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional(),
});

export const serverEnv = Object.freeze(
  serverSchema.parse({
    API_URL: process.env.API_URL,
    NODE_ENV: process.env.NODE_ENV,
  }),
);

export const clientEnv = Object.freeze(
  clientSchema.parse({
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  }),
);

/** Origen público del sitio, sin trailing slash. Base para metadata,
 *  canonicals, sitemap, robots y JSON-LD. */
export function siteUrl(): string {
  return clientEnv.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
}

/** Construye una URL absoluta del sitio a partir de un path relativo. */
export function absoluteUrl(path = '/'): string {
  return `${siteUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}
