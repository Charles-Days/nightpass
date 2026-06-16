/**
 * Crea UN evento "todo completo" para revisar cómo se ve el detalle del evento
 * con absolutamente toda la info poblada: portada + flyer, descripción markdown
 * rica, venue con dirección, promotora (organiza), 3 tiers con subidas de precio
 * programadas, grupos de WhatsApp, promo por volumen (BULK_PROMO) con opciones,
 * y "voy a ir" inflado en Redis para que la barra de popularidad salga llena.
 *
 * Idempotente: upsert por (venueId, slug). Reusarlo no duplica — borra y recrea
 * tiers/promo del evento.
 *
 * Uso:
 *   pnpm seed:full
 */
import 'dotenv/config';
import {
  PrismaClient,
  EventStatus,
  VenueStatus,
  PromoterStatus,
  RewardKind,
  RewardFunder,
  RewardDiscountType,
} from '@prisma/client';
import Redis from 'ioredis';

const prisma = new PrismaClient();

const EVENT_SLUG = 'evento-demo-completo';
const VENUE_SLUG = 'candile-cuernavaca-demo';
const PROMOTER_SLUG = 'nightpass-demo';

// Imágenes en dominios ya permitidos por next.config (images.unsplash.com).
const COVER = 'https://images.unsplash.com/photo-1571266028243-d220c6a1d5fa?w=1200&q=80';
const FLYER = 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1080&q=80';
const PROMO = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1080&q=80';
const LOGO = 'https://images.unsplash.com/photo-1493676304819-0d7a8d026dcf?w=200&q=80';

const DESCRIPTION = `Va a haber dos tipos de personas: las que estuvieron... y las que van a preguntar *"¿cómo estuvo?"* 👀

## Perreo Edition

Temática **Bad Bunny**, puro baile hasta que cierren. **Sin sillas. Sin pausas. Sin excusas.**

- 🥃 Shot de bienvenida
- 🎁 Rifas toda la noche
- 🔊 La música que ya sabes que te gusta
- 💡 Luces, vibe, gente que sí sabe

📍 **Candile** · Plan de Ayala

> 🎟️ **$110 en preventa.** *Después sube. Luego $200 en taquilla.* *El cupo es real. Se agota. No digas que no avisamos.*

👉 **NightPass o te quedas afuera.**`;

async function main() {
  const now = Date.now();
  // ~18 días a futuro, 17:00 → 03:00 del día siguiente (como el flyer real).
  const startsAt = new Date(now + 18 * 86_400_000);
  startsAt.setHours(17, 0, 0, 0);
  const endsAt = new Date(startsAt.getTime() + 10 * 60 * 60 * 1000); // +10h → 03:00 (+1)

  // 1. Promotora (organiza).
  const promoter = await prisma.promoter.upsert({
    where: { slug: PROMOTER_SLUG },
    update: { name: 'NightPass', city: 'Cuernavaca', logoUrl: LOGO, status: PromoterStatus.ACTIVE },
    create: {
      slug: PROMOTER_SLUG,
      name: 'NightPass',
      city: 'Cuernavaca',
      instagram: 'nightpass',
      bio: 'Tu acceso a la mejor noche.',
      logoUrl: LOGO,
      status: PromoterStatus.ACTIVE,
    },
  });

  // 2. Venue (lugar + dirección para "Dónde" y el mapa).
  const venue = await prisma.venue.upsert({
    where: { slug: VENUE_SLUG },
    update: { status: VenueStatus.ACTIVE },
    create: {
      slug: VENUE_SLUG,
      name: 'Candile',
      city: 'Cuernavaca',
      address: 'C. Cnel. Ahumada 133, Chapultepec, 62450 Cuernavaca, Mor.',
      phone: '+52 777 123 4567',
      latitude: 18.918,
      longitude: -99.221,
      status: VenueStatus.ACTIVE,
      coverImageUrl: COVER,
      categories: ['Antro', 'Club'],
    },
  });

  // 3. Evento (campos escalares). Upsert por (venueId, slug).
  const event = await prisma.event.upsert({
    where: { venueId_slug: { venueId: venue.id, slug: EVENT_SLUG } },
    update: {
      promoterId: promoter.id,
      title: '4 JULY · 4 DE JULIO',
      description: DESCRIPTION,
      startsAt,
      endsAt,
      coverImageUrl: COVER,
      flyerImageUrl: FLYER,
      status: EventStatus.PUBLISHED,
      capacity: 600,
      aforoBoostPct: 20,
      allowCashPayment: true,
      whatsappGroups: [
        { label: 'Grupo general', url: 'https://chat.whatsapp.com/DemoGeneral0000' },
        { label: 'VIP / Mesas', url: 'https://chat.whatsapp.com/DemoVipMesas0000' },
      ],
    },
    create: {
      venueId: venue.id,
      promoterId: promoter.id,
      slug: EVENT_SLUG,
      title: '4 JULY · 4 DE JULIO',
      description: DESCRIPTION,
      startsAt,
      endsAt,
      coverImageUrl: COVER,
      flyerImageUrl: FLYER,
      status: EventStatus.PUBLISHED,
      capacity: 600,
      aforoBoostPct: 20,
      allowCashPayment: true,
      whatsappGroups: [
        { label: 'Grupo general', url: 'https://chat.whatsapp.com/DemoGeneral0000' },
        { label: 'VIP / Mesas', url: 'https://chat.whatsapp.com/DemoVipMesas0000' },
      ],
    },
  });

  // Limpia hijos para que rerun no duplique (cascade borra prices y options).
  await prisma.eventTier.deleteMany({ where: { eventId: event.id } });
  await prisma.reward.deleteMany({ where: { eventId: event.id } });

  // 4. Tiers. General con subidas de precio programadas (early-bird → sube).
  //    daysBeforeEvent: la fase se activa N días antes de startsAt. Con el evento
  //    a 18 días, las fases a 10 y 0 días aún están "por venir" → se muestran como
  //    "Sube a $X el <fecha>".
  await prisma.eventTier.create({
    data: {
      eventId: event.id,
      name: 'General',
      priceCents: 11000, // $110 preventa
      currency: 'MXN',
      capacity: 500,
      position: 0,
      prices: {
        create: [
          { priceCents: 15000, daysBeforeEvent: 10, position: 0 }, // sube a $150
          { priceCents: 20000, daysBeforeEvent: 0, position: 1 }, // taquilla $200
        ],
      },
    },
  });
  await prisma.eventTier.create({
    data: {
      eventId: event.id,
      name: 'VIP',
      priceCents: 25000, // $250
      currency: 'MXN',
      capacity: 100,
      position: 1,
    },
  });
  await prisma.eventTier.create({
    data: {
      eventId: event.id,
      name: 'Mesa (4 personas)',
      priceCents: 120000, // $1,200
      currency: 'MXN',
      capacity: 20,
      position: 2,
    },
  });

  // 5. Promo por volumen (BULK_PROMO): compra 4 boletos → elige regalo.
  await prisma.reward.create({
    data: {
      promoterId: promoter.id,
      eventId: event.id,
      kind: RewardKind.BULK_PROMO,
      funder: RewardFunder.PROMOTER,
      title: 'En 4 se disfruta más',
      description: 'Compra 4 VIPs y te regalamos un Pomo o una Biggie',
      discountType: RewardDiscountType.NONE,
      costNpp: 0, // BULK_PROMO es gratis: se desbloquea por volumen, no por NPP
      minQuantity: 4,
      imageUrl: PROMO,
      active: true,
      startsAt: new Date(now - 86_400_000), // ya activa
      endsAt,
      options: {
        create: [
          { label: 'Pomo', position: 0 },
          { label: 'Biggie', position: 1 },
        ],
      },
    },
  });

  // 6. "Voy a ir" inflado en Redis para que la barra de popularidad salga llena.
  const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
  const redis = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });
  let going = 0;
  try {
    await redis.connect();
    const key = `event:going:${event.id}`;
    const members = Array.from({ length: 342 }, (_, i) => `seed-device-${i}`);
    await redis.sadd(key, ...members);
    going = await redis.scard(key);
  } catch {
    // Sin Redis no truena el seed — solo no se infla el "voy a ir".
  } finally {
    redis.disconnect();
  }

  // eslint-disable-next-line no-console
  console.log(`\n✅ Evento "todo completo" listo.
  id:        ${event.id}
  slug:      ${EVENT_SLUG}
  venue:     ${venue.name} · ${venue.city}
  promotora: ${promoter.name}
  fecha:     ${startsAt.toLocaleString('es-MX')}
  tiers:     General (subidas 150/200) · VIP · Mesa
  promo:     BULK_PROMO "En 4 se disfruta más" (Pomo / Biggie)
  going:     ${going} en Redis
  whatsapp:  2 grupos

  → http://localhost:7100/app/evento/${event.id}\n`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
