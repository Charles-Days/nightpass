import { type PrismaClient, Role } from '@prisma/client';
import { hashPassword, logSummary } from './helpers';

interface CustomerSeedConfig {
  email: string;
  password: string;
  name: string;
}

function readConfig(): CustomerSeedConfig {
  return {
    email: (process.env.SEED_CUSTOMER_EMAIL ?? 'cliente@nightpass.local').toLowerCase().trim(),
    password: process.env.SEED_CUSTOMER_PASSWORD ?? 'ClienteTest123',
    name: process.env.SEED_CUSTOMER_NAME ?? 'Cliente Demo',
  };
}

/**
 * Crea un usuario de prueba con rol CUSTOMER para usar en la app móvil.
 * Si el email ya existe, NO toca el rol: alguien podría haber promovido
 * ese email a VENUE_OWNER y degradarlo sería destructivo. En ese caso
 * solo logueamos y seguimos.
 */
export async function seedCustomer(prisma: PrismaClient): Promise<void> {
  const cfg = readConfig();
  const existing = await prisma.user.findUnique({ where: { email: cfg.email } });

  if (existing) {
    logSummary({
      label: 'Cliente (app móvil)',
      email: existing.email,
      password: '(ya existía — no se cambió)',
      role: existing.role,
      status: 'skipped',
    });
    return;
  }

  const passwordHash = await hashPassword(cfg.password);
  const user = await prisma.user.create({
    data: {
      email: cfg.email,
      name: cfg.name,
      passwordHash,
      role: Role.CUSTOMER,
    },
  });

  logSummary({
    label: 'Cliente (app móvil)',
    email: user.email,
    password: cfg.password,
    role: user.role,
    status: 'created',
  });
}
