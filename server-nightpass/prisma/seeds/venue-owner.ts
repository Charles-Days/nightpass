import { type PrismaClient, Role } from '@prisma/client';
import { hashPassword, logSummary } from './helpers';

interface VenueOwnerSeedConfig {
  email: string;
  password: string;
  name: string;
  venue: {
    slug: string;
    name: string;
    city: string;
    address: string;
    phone: string;
  };
}

function readConfig(): VenueOwnerSeedConfig {
  return {
    email: (process.env.SEED_OWNER_EMAIL ?? 'dueno@nightpass.local').toLowerCase().trim(),
    password: process.env.SEED_OWNER_PASSWORD ?? 'DuenoTest123',
    name: process.env.SEED_OWNER_NAME ?? 'Dueño Demo',
    venue: {
      // slug determinístico para idempotencia (no usamos sufijo random como en
      // approvals reales). Esto sirve solo para que el seed tenga un local demo.
      slug: 'bar-demo-seed',
      name: 'Bar Demo',
      city: 'Lima',
      address: 'Av. Larco 123, Miraflores',
      phone: '+51 1 555 0100',
    },
  };
}

/**
 * Crea (o asegura) un usuario con rol VENUE_OWNER + un Venue demo + la relación
 * VenueOwner que los conecta. Idempotente:
 * - Venue: upsert por slug fijo `bar-demo-seed`.
 * - User: si existía como CUSTOMER, lo promueve a VENUE_OWNER. Si ya era OWNER
 *   o más alto, no cambia rol. **Si era ADMIN, NO degrada** (skip).
 * - VenueOwner: upsert por la PK compuesta (userId, venueId).
 */
export async function seedVenueOwner(prisma: PrismaClient): Promise<void> {
  const cfg = readConfig();
  const existing = await prisma.user.findUnique({ where: { email: cfg.email } });

  if (existing && existing.role === Role.ADMIN) {
    logSummary({
      label: 'Dueño de local (panel web)',
      email: existing.email,
      password: '(no se modificó — usuario es ADMIN)',
      role: existing.role,
      status: 'skipped',
    });
    return;
  }

  const passwordHash = existing ? null : await hashPassword(cfg.password);

  await prisma.$transaction(async (tx) => {
    const venue = await tx.venue.upsert({
      where: { slug: cfg.venue.slug },
      update: {},
      create: {
        slug: cfg.venue.slug,
        name: cfg.venue.name,
        city: cfg.venue.city,
        address: cfg.venue.address,
        phone: cfg.venue.phone,
      },
    });

    const user = existing
      ? await tx.user.update({
          where: { id: existing.id },
          data: { role: Role.VENUE_OWNER },
        })
      : await tx.user.create({
          data: {
            email: cfg.email,
            name: cfg.name,
            passwordHash: passwordHash!,
            role: Role.VENUE_OWNER,
          },
        });

    await tx.venueOwner.upsert({
      where: { userId_venueId: { userId: user.id, venueId: venue.id } },
      update: {},
      create: { userId: user.id, venueId: venue.id },
    });
  });

  logSummary({
    label: `Dueño de local (panel web) → ${cfg.venue.name}`,
    email: cfg.email,
    password: existing ? '(ya existía — sin cambios al password)' : cfg.password,
    role: Role.VENUE_OWNER,
    status: existing ? 'updated' : 'created',
  });
}
