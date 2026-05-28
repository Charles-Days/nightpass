import {
  ApplicationStatus,
  type PrismaClient,
  Role,
} from '@prisma/client';
import { randomBytes } from 'crypto';
import * as argon2 from 'argon2';

interface PromoterApplicationSeedConfig {
  applicantEmail: string;
  applicantName: string;
  promoterName: string;
  city: string;
  phone: string;
  instagram: string;
  website: string;
  experience: '0' | '1-5' | '6-20' | '20+';
  eventTypes: string[];
  message: string;
}

function readConfig(): PromoterApplicationSeedConfig {
  return {
    applicantEmail: (
      process.env.SEED_PROMOTER_APP_EMAIL ?? 'promotor.demo@nightpass.local'
    )
      .toLowerCase()
      .trim(),
    applicantName: process.env.SEED_PROMOTER_APP_NAME ?? 'Mateo Promotor',
    promoterName:
      process.env.SEED_PROMOTER_APP_BRAND ?? 'Nocturna Collective',
    city: process.env.SEED_PROMOTER_APP_CITY ?? 'CDMX',
    phone: process.env.SEED_PROMOTER_APP_PHONE ?? '+52 55 5555 0123',
    instagram:
      process.env.SEED_PROMOTER_APP_INSTAGRAM ?? '@nocturna.collective',
    website:
      process.env.SEED_PROMOTER_APP_WEBSITE ?? 'https://nocturna.example',
    experience:
      (process.env.SEED_PROMOTER_APP_EXPERIENCE as
        | '0'
        | '1-5'
        | '6-20'
        | '20+') ?? '6-20',
    eventTypes: (
      process.env.SEED_PROMOTER_APP_EVENT_TYPES ?? 'electronica,hiphop'
    )
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    message:
      process.env.SEED_PROMOTER_APP_MESSAGE ??
      'Llevamos 3 años haciendo fiestas mensuales de electrónica en CDMX. Rotamos por venues en Roma y Condesa.',
  };
}

/**
 * Crea (o asegura) una solicitud de promotora en estado PENDING lista para que
 * un ADMIN la apruebe desde el panel `/admin/solicitudes?type=promotora`.
 *
 * Idempotente:
 *  - User aplicante: si no existe se crea como CUSTOMER con passwordHash
 *    aleatorio (no usable para login — el aplicante recibirá credenciales
 *    nuevas si la solicitud se aprueba).
 *  - PromoterApplication: si ya existe una PENDING para este aplicante con el
 *    mismo `promoterName` + `city`, no se crea otra (skip).
 */
export async function seedPromoterApplication(
  prisma: PrismaClient,
): Promise<void> {
  const cfg = readConfig();

  const existingUser = await prisma.user.findUnique({
    where: { email: cfg.applicantEmail },
  });

  if (
    existingUser &&
    existingUser.role !== Role.CUSTOMER &&
    existingUser.role !== Role.PROMOTER
  ) {
    // eslint-disable-next-line no-console
    console.log(
      `⏭️  Solicitud de promotora — ${cfg.applicantEmail} ya tiene rol ${existingUser.role}, skip.\n`,
    );
    return;
  }

  let applicantId: string;
  if (existingUser) {
    applicantId = existingUser.id;
  } else {
    const placeholderHash = await argon2.hash(
      randomBytes(32).toString('hex'),
      {
        type: argon2.argon2id,
        memoryCost: 19456,
        timeCost: 2,
        parallelism: 1,
      },
    );
    const created = await prisma.user.create({
      data: {
        email: cfg.applicantEmail,
        passwordHash: placeholderHash,
        name: cfg.applicantName,
        role: Role.CUSTOMER,
      },
    });
    applicantId = created.id;
  }

  const existingPending = await prisma.promoterApplication.findFirst({
    where: {
      applicantUserId: applicantId,
      status: ApplicationStatus.PENDING,
      promoterName: { equals: cfg.promoterName, mode: 'insensitive' },
      city: { equals: cfg.city, mode: 'insensitive' },
    },
    select: { id: true },
  });

  if (existingPending) {
    // eslint-disable-next-line no-console
    console.log(
      `⏭️  Solicitud de promotora ya existe (PENDING) — id=${existingPending.id}\n` +
        `   email:    ${cfg.applicantEmail}\n` +
        `   promotora:${cfg.promoterName}\n`,
    );
    return;
  }

  const app = await prisma.promoterApplication.create({
    data: {
      applicantUserId: applicantId,
      promoterName: cfg.promoterName,
      city: cfg.city,
      phone: cfg.phone,
      instagram: cfg.instagram,
      website: cfg.website,
      experience: cfg.experience,
      eventTypes: cfg.eventTypes,
      message: cfg.message,
      status: ApplicationStatus.PENDING,
    },
  });

  // eslint-disable-next-line no-console
  console.log(
    `🆕 Solicitud de promotora PENDING creada — id=${app.id}\n` +
      `   aplicante: ${cfg.applicantName} <${cfg.applicantEmail}>\n` +
      `   promotora: ${cfg.promoterName} (${cfg.city})\n` +
      `   experiencia: ${cfg.experience} eventos | tipos: ${cfg.eventTypes.join(', ')}\n` +
      `   listo para aprobar en /admin/solicitudes?type=promotora\n`,
  );
}
