/**
 * Crea N eventos PUBLISHED a futuro para poblar pickers/listados de prueba
 * (ej. "Por evento ×2" en Recompensas, catálogo público).
 *
 * Los reparte round-robin entre los venues ACTIVE existentes. Cada evento lleva
 * 1-2 tiers (General + a veces VIP). Idempotente: upsert por (venueId, slug),
 * correrlo otra vez no duplica.
 *
 * Uso:
 *   COUNT=24 pnpm seed:events      # 24 eventos (default 20)
 *   pnpm seed:events
 */
import 'dotenv/config';
import { PrismaClient, EventStatus, VenueStatus } from '@prisma/client';

const prisma = new PrismaClient();

const COUNT = Math.max(1, Math.min(100, Number(process.env.COUNT ?? 20)));

const TITLES = [
  'Noche Techno', 'Reggaetón Old School', 'After Hours', 'Sunset Rooftop',
  'House Sessions', 'Cumbia Sound System', 'Latin Vibes', 'Deep & Melodic',
  'Karaoke Battle', 'Ladies Night', 'Tributo 80s', 'Open Decks',
  'Hip Hop Jam', 'Salsa en Vivo', 'Electro Pop', 'Indie Night',
  'Trap Capital', 'Disco Fever', 'Afrobeat Party', 'Glow Rave',
  'Boiler Room', 'Vinyl Only', 'Bass Drop', 'Neon Carnival',
  'Full Moon', 'Underground', 'Rooftop Brunch', 'Closing Party',
];

const TIME_TAGS = ['F1', 'F2', 'Vol. 2', 'Edición Especial', 'Reload', 'XL'];

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function main() {
  const venues = await prisma.venue.findMany({
    where: { status: VenueStatus.ACTIVE },
    select: { id: true, name: true },
  });

  if (venues.length === 0) {
    throw new Error('No hay venues ACTIVE. Corre `pnpm db:seed` primero.');
  }

  // eslint-disable-next-line no-console
  console.log(`🎟️  Creando ${COUNT} eventos en ${venues.length} venue(s) ACTIVE...\n`);

  const now = Date.now();
  let created = 0;

  for (let i = 0; i < COUNT; i++) {
    const venue = venues[i % venues.length];
    const base = TITLES[i % TITLES.length];
    const tag = i >= TITLES.length ? ` ${TIME_TAGS[i % TIME_TAGS.length]}` : '';
    const title = `${base}${tag}`;
    const slug = `${slugify(title)}-demo-${i}`;

    // Reparte a futuro: 1 evento por noche aprox, 22:00 → 03:00.
    const startsAt = new Date(now + (i + 1) * 86_400_000);
    startsAt.setHours(22, 0, 0, 0);
    const endsAt = new Date(startsAt.getTime() + 5 * 60 * 60 * 1000);

    const withVip = i % 3 === 0;
    const generalCents = 15000 + (i % 6) * 5000; // 150 - 400 MXN

    await prisma.event.upsert({
      where: { venueId_slug: { venueId: venue.id, slug } },
      update: { status: EventStatus.PUBLISHED, startsAt, endsAt },
      create: {
        venueId: venue.id,
        slug,
        title,
        description: `${base} en ${venue.name}. Evento de prueba generado para QA.`,
        startsAt,
        endsAt,
        status: EventStatus.PUBLISHED,
        capacity: 200 + (i % 5) * 100,
        allowCashPayment: true,
        tiers: {
          create: [
            { name: 'General', priceCents: generalCents, currency: 'MXN', position: 0 },
            ...(withVip
              ? [{ name: 'VIP', priceCents: generalCents + 30000, currency: 'MXN', position: 1 }]
              : []),
          ],
        },
      },
    });

    created++;
    // eslint-disable-next-line no-console
    console.log(`  ✓ ${title}  ·  ${venue.name}  ·  ${startsAt.toLocaleDateString('es-MX')}`);
  }

  // eslint-disable-next-line no-console
  console.log(`\n✅ Listo. ${created} eventos PUBLISHED a futuro.`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
