import { PrismaClient, EventStatus } from '@prisma/client';

const VENUE_SLUG = 'bar-demo-seed';

interface TierSeed {
  name: string;
  priceCents: number;
  capacity?: number;
  position: number;
}

interface EventSeed {
  slug: string;
  title: string;
  description: string;
  startsAt: Date;
  endsAt: Date;
  capacity: number;
  coverImageUrl: string | null;
  tiers: TierSeed[];
}

function atHour(daysAhead: number, hour: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + daysAhead);
  d.setUTCHours(hour, 0, 0, 0);
  return d;
}

const EVENTS: EventSeed[] = [
  {
    slug: 'reggaeton-night',
    title: 'Reggaeton Night',
    description:
      'La noche más perreo de la temporada. DJ residente + invitados. Open bar primera hora con tier VIP.',
    startsAt: atHour(1, 22),
    endsAt: atHour(2, 4),
    capacity: 300,
    coverImageUrl:
      'https://images.unsplash.com/photo-1571266028243-d220c6a1d5fa?w=1200&q=80',
    tiers: [
      { name: 'General', priceCents: 20000, capacity: 200, position: 0 },
      { name: 'VIP', priceCents: 50000, capacity: 50, position: 1 },
    ],
  },
  {
    slug: 'electronic-vibes',
    title: 'Electronic Vibes',
    description: 'Set de techno y house desde medianoche. Mesa VIP con bottle service.',
    startsAt: atHour(2, 23),
    endsAt: atHour(3, 5),
    capacity: 400,
    coverImageUrl:
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&q=80',
    tiers: [
      { name: 'Early Bird', priceCents: 15000, capacity: 80, position: 0 },
      { name: 'General', priceCents: 25000, capacity: 220, position: 1 },
      { name: 'VIP Mesa', priceCents: 60000, capacity: 30, position: 2 },
    ],
  },
  {
    slug: 'latin-festival',
    title: 'Latin Festival',
    description:
      'Salsa, bachata, merengue. Bandas en vivo + DJ. Show especial a la 1am.',
    startsAt: atHour(8, 21),
    endsAt: atHour(9, 3),
    capacity: 500,
    coverImageUrl:
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&q=80',
    tiers: [
      { name: 'General', priceCents: 18000, capacity: 350, position: 0 },
      { name: 'VIP', priceCents: 45000, capacity: 60, position: 1 },
    ],
  },
];

async function main() {
  const prisma = new PrismaClient();

  const venue = await prisma.venue.findUnique({ where: { slug: VENUE_SLUG } });
  if (!venue) {
    throw new Error(`Venue '${VENUE_SLUG}' no existe. Corre pnpm db:seed primero.`);
  }

  console.log(`\nVenue: ${venue.name} (${venue.id})`);
  console.log(`Creando ${EVENTS.length} eventos...\n`);

  let createdEvents = 0;
  let updatedEvents = 0;
  let createdTiers = 0;

  for (const seed of EVENTS) {
    const existing = await prisma.event.findUnique({
      where: { venueId_slug: { venueId: venue.id, slug: seed.slug } },
    });

    let event;
    if (existing) {
      event = await prisma.event.update({
        where: { id: existing.id },
        data: {
          title: seed.title,
          description: seed.description,
          startsAt: seed.startsAt,
          endsAt: seed.endsAt,
          capacity: seed.capacity,
          coverImageUrl: seed.coverImageUrl,
          status: EventStatus.PUBLISHED,
        },
      });
      updatedEvents++;
    } else {
      event = await prisma.event.create({
        data: {
          venueId: venue.id,
          slug: seed.slug,
          title: seed.title,
          description: seed.description,
          startsAt: seed.startsAt,
          endsAt: seed.endsAt,
          capacity: seed.capacity,
          coverImageUrl: seed.coverImageUrl,
          status: EventStatus.PUBLISHED,
        },
      });
      createdEvents++;
    }

    for (const t of seed.tiers) {
      const existingTier = await prisma.eventTier.findFirst({
        where: { eventId: event.id, name: t.name },
      });
      if (existingTier) {
        await prisma.eventTier.update({
          where: { id: existingTier.id },
          data: {
            priceCents: t.priceCents,
            capacity: t.capacity ?? null,
            position: t.position,
          },
        });
      } else {
        await prisma.eventTier.create({
          data: {
            eventId: event.id,
            name: t.name,
            priceCents: t.priceCents,
            capacity: t.capacity ?? null,
            position: t.position,
            currency: 'MXN',
          },
        });
        createdTiers++;
      }
    }

    console.log(
      `${existing ? '🔄' : '✅'} ${seed.title}  ·  ${seed.startsAt.toISOString().slice(0, 16)}  ·  ${seed.tiers.length} tiers`,
    );
  }

  console.log(
    `\n${createdEvents} eventos nuevos · ${updatedEvents} actualizados · ${createdTiers} tiers nuevos\n`,
  );

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
