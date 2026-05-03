import { z } from 'zod';

const ttlPattern = /^\d+[smhd]$/;

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(7101),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),

  JWT_ACCESS_SECRET: z
    .string()
    .min(32, 'JWT_ACCESS_SECRET must be at least 32 chars'),
  JWT_ACCESS_TTL: z
    .string()
    .regex(ttlPattern, 'JWT_ACCESS_TTL must match Ns|Nm|Nh|Nd format'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET must be at least 32 chars'),
  JWT_REFRESH_TTL: z
    .string()
    .regex(ttlPattern, 'JWT_REFRESH_TTL must match Ns|Nm|Nh|Nd format'),

  CORS_ORIGINS: z.string().optional(),

  // Mailer (Gmail SMTP). Sin estos dos vars el mailer corre en modo no-op.
  SMTP_USER: z.string().email().optional(),
  SMTP_PASS: z.string().optional(),
  ADMIN_NOTIFICATION_EMAIL: z.string().email().optional(),
  ADMIN_WEB_URL: z.string().url().default('http://localhost:7100'),

  // Storage
  STORAGE_DRIVER: z.enum(['local', 'r2']).default('local'),
  LOCAL_UPLOADS_PATH: z.string().default('./uploads'),
  LOCAL_UPLOADS_URL: z.string().url().default('http://localhost:7101/uploads'),

  // Cloudflare R2 (opcional — para upload de imágenes)
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  R2_PUBLIC_URL: z.string().optional(),

  // Stripe Connect (Fase 3) — sin estas vars el módulo stripe corre en modo no-op
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PLATFORM_FEE_PCT: z.coerce.number().int().min(0).max(100).default(8),
  STRIPE_CONNECT_COUNTRY: z.string().length(2).default('MX'),
  STRIPE_CONNECT_DEFAULT_CURRENCY: z.string().length(3).default('mxn'),

  // Pass HMAC signing (Fase 3)
  PASS_HMAC_SECRET: z
    .string()
    .min(32, 'PASS_HMAC_SECRET must be at least 32 chars')
    .optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  • ${i.path.join('.') || '<root>'}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  return parsed.data;
}
