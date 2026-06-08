/**
 * Siembra N usuarios "rankeables" en Cuernavaca para ver el leaderboard poblado.
 *
 * Cada usuario: rankingOptIn=true + city/state + un VENUE_CHECKIN reciente en un
 * venue ACTIVE de Cuernavaca + userLoyaltyTotal.yearPoints>0. Esas son las 3
 * condiciones que exige getCityLeaderboard.
 *
 * Idempotente: upsert por email / idempotencyKey / userId.
 *
 * Uso:
 *   COUNT=5 pnpm seed:ranking
 *   pnpm seed:ranking            # default 5
 */
import 'dotenv/config';
import { PrismaClient, Role, LoyaltyEventType } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

const COUNT = Math.max(1, Math.min(20, Number(process.env.COUNT ?? 5)));
const CITY = 'Cuernavaca';
const STATE = 'Morelos';

const NAMES = [
  'Diego Martínez', 'Sofía Ramírez', 'Mateo Hernández', 'Valentina Cruz',
  'Andrés López', 'Camila Torres', 'Emiliano Reyes', 'Renata Flores',
  'Sebastián Díaz', 'Ximena Castro', 'Maximiliano Ortiz', 'Regina Vega',
];

async function main() {
  const venues = await prisma.venue.findMany({
    where: { city: { equals: CITY, mode: 'insensitive' }, status: 'ACTIVE' },
    select: { id: true, name: true },
  });
  if (venues.length === 0) {
    throw new Error(`No hay venues ACTIVE en ${CITY}. Corre \`pnpm db:seed\`.`);
  }

  const passwordHash = await argon2.hash('RankDemo123', {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  // eslint-disable-next-line no-console
  console.log(`🏆 Sembrando ${COUNT} usuarios rankeados en ${CITY}...\n`);

  for (let i = 0; i < COUNT; i++) {
    const name = NAMES[i % NAMES.length];
    const email = `rank.demo.${i}@nightpass.local`;
    const venue = venues[i % venues.length];
    const yearPoints = 500 - i * 60; // descendente: 500, 440, 380, ...

    const user = await prisma.user.upsert({
      where: { email },
      update: { rankingOptIn: true, city: CITY, state: STATE, name },
      create: {
        email,
        name,
        passwordHash,
        role: Role.CUSTOMER,
        rankingOptIn: true,
        city: CITY,
        state: STATE,
      },
      select: { id: true },
    });

    // Check-in reciente atribuido a un venue de Cuernavaca (lo que el leaderboard
    // exige para incluir al usuario en esta ciudad).
    await prisma.loyaltyEvent.upsert({
      where: { idempotencyKey: `seed-rank:${email}` },
      update: { occurredAt: new Date(), points: yearPoints, venueId: venue.id },
      create: {
        userId: user.id,
        type: LoyaltyEventType.VENUE_CHECKIN,
        points: yearPoints,
        venueId: venue.id,
        idempotencyKey: `seed-rank:${email}`,
        occurredAt: new Date(),
      },
    });

    await prisma.userLoyaltyTotal.upsert({
      where: { userId: user.id },
      update: { yearPoints, totalPoints: yearPoints },
      create: { userId: user.id, yearPoints, totalPoints: yearPoints },
    });

    // eslint-disable-next-line no-console
    console.log(`  ✓ ${name}  ·  ${yearPoints} NPP  ·  ${venue.name}`);
  }

  // eslint-disable-next-line no-console
  console.log(`\n✅ Listo. ${COUNT} rankeados en ${CITY} (opt-in + yearPoints).`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
