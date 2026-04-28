import { type PrismaClient, Role } from '@prisma/client';
import { hashPassword, logSummary } from './helpers';

interface AdminSeedConfig {
  email: string;
  password: string;
  name: string;
}

function readConfig(): AdminSeedConfig {
  return {
    email: (process.env.SEED_ADMIN_EMAIL ?? 'admin@nightpass.local').toLowerCase().trim(),
    password: process.env.SEED_ADMIN_PASSWORD ?? 'AdminTest123',
    name: process.env.SEED_ADMIN_NAME ?? 'NightPass Admin',
  };
}

/**
 * Crea (o asegura) un usuario con rol ADMIN para entrar al panel web.
 * Idempotente: si el email ya existe, fuerza role=ADMIN. La idea del seed
 * es garantizar que ese email TENGA acceso de admin.
 */
export async function seedAdmin(prisma: PrismaClient): Promise<void> {
  const cfg = readConfig();
  const passwordHash = await hashPassword(cfg.password);

  const existing = await prisma.user.findUnique({ where: { email: cfg.email } });
  const user = await prisma.user.upsert({
    where: { email: cfg.email },
    update: { role: Role.ADMIN },
    create: {
      email: cfg.email,
      name: cfg.name,
      passwordHash,
      role: Role.ADMIN,
    },
  });

  logSummary({
    label: 'Admin (panel web)',
    email: user.email,
    password: cfg.password,
    role: user.role,
    status: existing ? 'updated' : 'created',
  });
}
