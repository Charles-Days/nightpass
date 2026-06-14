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

  // Confianza en proxies para derivar la IP real del cliente (X-Forwarded-For).
  // El rate-limit y la blocklist son por IP, así que esto debe ser correcto o
  // un atacante falsea XFF y evade los límites.
  //   'true'  → confía en cualquier proxy (solo dev/local).
  //   'false' → no confía (usa la IP del socket directo).
  //   número  → cuántos saltos de proxy confiar (p.ej. '2' = Cloudflare→Railway).
  //   lista   → IPs/CIDR confiables separadas por coma.
  // En producción usar número o lista, nunca 'true'.
  TRUST_PROXY: z.string().optional(),

  // Mailer SMTP. Sin SMTP_USER/SMTP_PASS el mailer corre en modo no-op.
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_SECURE: z.string().optional(),
  SMTP_USER: z.string().email().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
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

  // Bypass de compra directa SOLO para desarrollo: emite pases sin cobrar.
  // El refine de abajo hace fallar el boot si queda truthy en producción.
  STRIPE_DEV_BYPASS: z.string().optional(),

  // Pass HMAC signing (Fase 3)
  PASS_HMAC_SECRET: z
    .string()
    .min(32, 'PASS_HMAC_SECRET must be at least 32 chars')
    .optional(),

  // Firma HMAC de la imagen de historia de Instagram (story card). El front
  // arma el PNG; el back solo firma el payload del link. Opcional al boot:
  // si falta, buildStoryCardUrl cae a JWT_ACCESS_SECRET.
  STORY_CARD_SECRET: z.string().optional(),

  // Google OAuth (Sign in with Google). Sin GOOGLE_CLIENT_ID el endpoint /auth/google devuelve 503.
  GOOGLE_CLIENT_ID: z.string().optional(),

  // Web Push (VAPID). Sin las dos keys el PushService corre en modo no-op.
  // Generar con: npx web-push generate-vapid-keys
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().default('mailto:noreply@nightpass.mx'),
}).refine(
  // El secreto de firma de QR es necesario para CUALQUIER emisión de pase
  // (compra Stripe, vale en efectivo del RP, transferencia). El modelo central
  // es efectivo/RP, que no usa Stripe — por eso ya no se ata a STRIPE_SECRET_KEY:
  // en producción es obligatorio siempre. Sin él, firmar caería a un secreto
  // público y los QR serían falsificables.
  (env) => env.NODE_ENV !== 'production' || !!env.PASS_HMAC_SECRET,
  {
    message: 'PASS_HMAC_SECRET is required in production',
    path: ['PASS_HMAC_SECRET'],
  },
).refine(
  (env) => !env.STRIPE_SECRET_KEY || !!env.STRIPE_WEBHOOK_SECRET,
  {
    message: 'STRIPE_WEBHOOK_SECRET is required when STRIPE_SECRET_KEY is set',
    path: ['STRIPE_WEBHOOK_SECRET'],
  },
).refine(
  // Defensa en profundidad: el bypass de compra jamás debe quedar activo en
  // producción. Si la variable se filtra a un .env de prod, el boot falla.
  (env) =>
    env.NODE_ENV !== 'production' || env.STRIPE_DEV_BYPASS !== 'true',
  {
    message: 'STRIPE_DEV_BYPASS must not be enabled in production',
    path: ['STRIPE_DEV_BYPASS'],
  },
).refine(
  // En producción TRUST_PROXY debe ser explícito y NUNCA 'true': confiar en
  // cualquier proxy deja que el cliente falsee X-Forwarded-For y evada el
  // rate-limit/ban por IP. Usar el número exacto de saltos (p.ej. '2' para
  // Cloudflare→Coolify) o una lista de IPs/CIDR del proxy.
  (env) =>
    env.NODE_ENV !== 'production' ||
    (!!env.TRUST_PROXY &&
      env.TRUST_PROXY.trim() !== '' &&
      env.TRUST_PROXY.trim() !== 'true'),
  {
    message:
      'TRUST_PROXY must be set in production to the proxy hop count or trusted IP list (never "true")',
    path: ['TRUST_PROXY'],
  },
);

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
