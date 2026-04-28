import { type PrismaClient, Role } from '@prisma/client';
import { hashPassword, logSummary } from './helpers';

interface VenueStaffSeedConfig {
  email: string;
  password: string;
  name: string;
}

function readConfig(): VenueStaffSeedConfig {
  return {
    email: (process.env.SEED_STAFF_EMAIL ?? 'staff@nightpass.local').toLowerCase().trim(),
    password: process.env.SEED_STAFF_PASSWORD ?? 'StaffTest123',
    name: process.env.SEED_STAFF_NAME ?? 'Staff Demo',
  };
}

/**
 * Crea un usuario con rol VENUE_STAFF para el panel web.
 *
 * NOTA Fase A1: por ahora el rol vive solo en el User; la relación staff↔venue
 * se modelará en Fase A2 (tabla `VenueStaff`). Hoy este usuario puede loguearse
 * en el panel pero su sidebar de "Mi local" verá los items como placeholders.
 *
 * Si el email ya existe, NO toca el rol (mismo razonamiento que customer:
 * podrían haberlo promovido manualmente, no queremos degradar).
 */
export async function seedVenueStaff(prisma: PrismaClient): Promise<void> {
  const cfg = readConfig();
  const existing = await prisma.user.findUnique({ where: { email: cfg.email } });

  if (existing) {
    logSummary({
      label: 'Staff de local (panel web)',
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
      role: Role.VENUE_STAFF,
    },
  });

  logSummary({
    label: 'Staff de local (panel web)',
    email: user.email,
    password: cfg.password,
    role: user.role,
    status: 'created',
  });
}
