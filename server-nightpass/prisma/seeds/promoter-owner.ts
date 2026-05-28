import {
  type PrismaClient,
  PromoterMemberRole,
  Role,
} from '@prisma/client';
import { hashPassword, logSummary } from './helpers';

interface PromoterOwnerSeedConfig {
  email: string;
  password: string;
  name: string;
  promoter: {
    slug: string;
    name: string;
    city: string;
    phone: string;
    instagram: string;
    website: string;
    bio: string;
  };
}

function readConfig(): PromoterOwnerSeedConfig {
  return {
    email: (process.env.SEED_PROMOTER_EMAIL ?? 'promotor@nightpass.local')
      .toLowerCase()
      .trim(),
    password: process.env.SEED_PROMOTER_PASSWORD ?? 'PromotorTest123',
    name: process.env.SEED_PROMOTER_NAME ?? 'Lucía Promotora',
    promoter: {
      slug: 'velvet-nights-seed',
      name: 'Velvet Nights',
      city: 'CDMX',
      phone: '+52 55 5555 0199',
      instagram: '@velvet.nights',
      website: 'https://velvetnights.example',
      bio: 'Promotora boutique enfocada en house y tech-house. Rotamos por venues premium de Roma, Condesa y Polanco.',
    },
  };
}

/**
 * Crea (o asegura) un usuario PROMOTER listo para login en el panel, junto a
 * un Promoter demo + la membership OWNER. Saltea el flujo de solicitud /
 * aprobación (que es lo que prueba `seedPromoterApplication`).
 *
 * Idempotente:
 *  - Promoter: upsert por slug fijo.
 *  - User: si era ADMIN no degrada (skip). Si era CUSTOMER lo promueve a
 *    PROMOTER. Si ya era PROMOTER/PROMOTER_STAFF, no toca rol ni password.
 *  - PromoterMember: upsert por PK compuesta (userId, promoterId), role OWNER.
 */
export async function seedPromoterOwner(prisma: PrismaClient): Promise<void> {
  const cfg = readConfig();
  const existing = await prisma.user.findUnique({
    where: { email: cfg.email },
  });

  if (existing && existing.role === Role.ADMIN) {
    logSummary({
      label: 'Promotor (panel web)',
      email: existing.email,
      password: '(no se modificó — usuario es ADMIN)',
      role: existing.role,
      status: 'skipped',
    });
    return;
  }

  const passwordHash = existing ? null : await hashPassword(cfg.password);

  await prisma.$transaction(async (tx) => {
    const promoter = await tx.promoter.upsert({
      where: { slug: cfg.promoter.slug },
      update: {},
      create: {
        slug: cfg.promoter.slug,
        name: cfg.promoter.name,
        city: cfg.promoter.city,
        phone: cfg.promoter.phone,
        instagram: cfg.promoter.instagram,
        website: cfg.promoter.website,
        bio: cfg.promoter.bio,
      },
    });

    let user;
    if (existing) {
      const shouldPromote =
        existing.role === Role.CUSTOMER || existing.role === Role.VENUE_STAFF;
      user = shouldPromote
        ? await tx.user.update({
            where: { id: existing.id },
            data: { role: Role.PROMOTER, mustChangePassword: false },
          })
        : existing;
    } else {
      user = await tx.user.create({
        data: {
          email: cfg.email,
          name: cfg.name,
          passwordHash: passwordHash!,
          role: Role.PROMOTER,
          mustChangePassword: false,
        },
      });
    }

    await tx.promoterMember.upsert({
      where: {
        userId_promoterId: { userId: user.id, promoterId: promoter.id },
      },
      update: { role: PromoterMemberRole.OWNER },
      create: {
        userId: user.id,
        promoterId: promoter.id,
        role: PromoterMemberRole.OWNER,
      },
    });
  });

  logSummary({
    label: `Promotor (panel web) → ${cfg.promoter.name}`,
    email: cfg.email,
    password: existing
      ? '(ya existía — sin cambios al password)'
      : cfg.password,
    role: Role.PROMOTER,
    status: existing ? 'updated' : 'created',
  });
}
