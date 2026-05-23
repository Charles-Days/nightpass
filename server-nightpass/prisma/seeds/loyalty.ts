import { randomBytes, createHmac } from 'crypto';
import { type PrismaClient, LoyaltyEventType, LoyaltyTier } from '@prisma/client';

/**
 * Idempotent loyalty seed.
 *
 * Populates demo state so the UI looks alive immediately:
 *  - Customer demo user gets an INSIDER tier with a 12-day streak and
 *    realistic LoyaltyEvent history.
 *  - Bar Demo venue gets a check-in QR rotated and printable.
 *
 * Idempotency:
 *  - LoyaltyEvent uses `idempotencyKey` (@unique) — reruns are no-ops.
 *  - UserStreak / UserLoyaltyTotal upserted by userId (@id).
 *  - Venue checkinQrSecret only rotated if missing.
 */

const CUSTOMER_EMAIL = (process.env.SEED_CUSTOMER_EMAIL ?? 'cliente@nightpass.local')
  .toLowerCase()
  .trim();
const VENUE_SLUG = 'bar-demo-seed';

/** Mock LoyaltyEvent history. Each entry adds a unique idempotencyKey.
 *  Total ≈ 2280 NPP → puts demo customer at INSIDER tier (>=2000). */
const HISTORY: Array<{
  type: LoyaltyEventType;
  points: number;
  multiplier: number;
  daysAgo: number;
  key: string;
  label: 'venue' | 'event' | 'milestone' | 'first' | 'admin';
}> = [
  { type: 'ADMIN_ADJUST',      points: 500, multiplier: 1, daysAgo: 40, key: 'seed:admin:beta-launch', label: 'admin' },
  { type: 'FIRST_VENUE_BONUS', points: 15,  multiplier: 1, daysAgo: 38, key: 'seed:first:bar-demo', label: 'first' },
  { type: 'EVENT_CHECKIN',     points: 25,  multiplier: 1, daysAgo: 38, key: 'seed:event:1', label: 'event' },
  { type: 'VENUE_CHECKIN',     points: 10,  multiplier: 1, daysAgo: 36, key: 'seed:venue:1', label: 'venue' },
  { type: 'EVENT_CHECKIN',     points: 38,  multiplier: 1.5, daysAgo: 35, key: 'seed:event:2', label: 'event' },
  { type: 'VENUE_CHECKIN',     points: 15,  multiplier: 1.5, daysAgo: 34, key: 'seed:venue:2', label: 'venue' },
  { type: 'STREAK_MILESTONE',  points: 50,  multiplier: 1, daysAgo: 32, key: 'seed:milestone:7', label: 'milestone' },
  { type: 'EVENT_CHECKIN',     points: 25,  multiplier: 1, daysAgo: 30, key: 'seed:event:3', label: 'event' },
  { type: 'VENUE_CHECKIN',     points: 10,  multiplier: 1, daysAgo: 28, key: 'seed:venue:3', label: 'venue' },
  { type: 'EVENT_CHECKIN',     points: 50,  multiplier: 2, daysAgo: 26, key: 'seed:event:4', label: 'event' },
  { type: 'VENUE_CHECKIN',     points: 10,  multiplier: 1, daysAgo: 24, key: 'seed:venue:4', label: 'venue' },
  { type: 'EVENT_CHECKIN',     points: 38,  multiplier: 1.5, daysAgo: 22, key: 'seed:event:5', label: 'event' },
  { type: 'VENUE_CHECKIN',     points: 15,  multiplier: 1.5, daysAgo: 20, key: 'seed:venue:5', label: 'venue' },
  { type: 'EVENT_CHECKIN',     points: 25,  multiplier: 1, daysAgo: 18, key: 'seed:event:6', label: 'event' },
  { type: 'VENUE_CHECKIN',     points: 10,  multiplier: 1, daysAgo: 16, key: 'seed:venue:6', label: 'venue' },
  { type: 'STREAK_MILESTONE',  points: 200, multiplier: 1, daysAgo: 14, key: 'seed:milestone:30', label: 'milestone' },
  { type: 'EVENT_CHECKIN',     points: 38,  multiplier: 1.5, daysAgo: 13, key: 'seed:event:7', label: 'event' },
  { type: 'VENUE_CHECKIN',     points: 15,  multiplier: 1.5, daysAgo: 12, key: 'seed:venue:7', label: 'venue' },
  { type: 'EVENT_CHECKIN',     points: 25,  multiplier: 1, daysAgo: 10, key: 'seed:event:8', label: 'event' },
  { type: 'ADMIN_ADJUST',      points: 800, multiplier: 1, daysAgo: 9,  key: 'seed:admin:opening-vip', label: 'admin' },
  { type: 'EVENT_CHECKIN',     points: 50,  multiplier: 2, daysAgo: 8,  key: 'seed:event:9', label: 'event' },
  { type: 'VENUE_CHECKIN',     points: 10,  multiplier: 1, daysAgo: 7,  key: 'seed:venue:8', label: 'venue' },
  { type: 'EVENT_CHECKIN',     points: 38,  multiplier: 1.5, daysAgo: 6, key: 'seed:event:10', label: 'event' },
  { type: 'VENUE_CHECKIN',     points: 10,  multiplier: 1, daysAgo: 5,  key: 'seed:venue:9', label: 'venue' },
  { type: 'VENUE_CHECKIN',     points: 15,  multiplier: 1.5, daysAgo: 4, key: 'seed:venue:10', label: 'venue' },
  { type: 'EVENT_CHECKIN',     points: 25,  multiplier: 1, daysAgo: 3,  key: 'seed:event:11', label: 'event' },
  { type: 'VENUE_CHECKIN',     points: 10,  multiplier: 1, daysAgo: 2,  key: 'seed:venue:11', label: 'venue' },
  { type: 'VENUE_CHECKIN',     points: 10,  multiplier: 1, daysAgo: 1,  key: 'seed:venue:12', label: 'venue' },
  { type: 'VENUE_CHECKIN',     points: 10,  multiplier: 1, daysAgo: 0,  key: 'seed:venue:13', label: 'venue' },
];

function utcDayStart(offsetDays: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - offsetDays);
  return d;
}

function signVenueCheckin(venueId: string, secret: string): string {
  const hmac = createHmac('sha256', secret).update(`checkin:${venueId}`).digest('hex');
  return `np_checkin_${venueId}_${hmac}`;
}

export async function seedLoyalty(prisma: PrismaClient): Promise<void> {
  const customer = await prisma.user.findUnique({ where: { email: CUSTOMER_EMAIL } });
  const venue = await prisma.venue.findUnique({ where: { slug: VENUE_SLUG } });

  if (!customer) {
    console.log('⏭️  Loyalty seed: customer demo no encontrado, skip.\n');
    return;
  }
  if (!venue) {
    console.log('⏭️  Loyalty seed: venue demo no encontrado, skip.\n');
    return;
  }

  // ── 1. Rotate venue check-in QR if missing.
  let qrPayload: string;
  if (!venue.checkinQrSecret) {
    const secret = randomBytes(32).toString('hex');
    await prisma.venue.update({
      where: { id: venue.id },
      data: { checkinQrSecret: secret, checkinQrIssuedAt: new Date() },
    });
    qrPayload = signVenueCheckin(venue.id, secret);
    console.log(`🆕 QR check-in rotado para ${venue.name}.\n`);
  } else {
    qrPayload = signVenueCheckin(venue.id, venue.checkinQrSecret);
    console.log(`⏭️  QR check-in ya existía para ${venue.name}.\n`);
  }

  // ── 2. LoyaltyEvent history (idempotent by key).
  let created = 0;
  for (const h of HISTORY) {
    try {
      await prisma.loyaltyEvent.create({
        data: {
          userId: customer.id,
          type: h.type,
          points: h.points,
          multiplier: h.multiplier,
          venueId: h.label === 'milestone' ? null : venue.id,
          idempotencyKey: `${h.key}:${customer.id}`,
          occurredAt: utcDayStart(h.daysAgo),
        },
      });
      created++;
    } catch (err) {
      // P2002 unique violation = already seeded, skip silently.
      if (!(err instanceof Error && err.message.includes('Unique'))) throw err;
    }
  }

  // ── 3. UserStreak — 38 days current (past 30-day milestone), last check-in today.
  const today = utcDayStart(0);
  await prisma.userStreak.upsert({
    where: { userId: customer.id },
    update: {
      currentDays: 38,
      longestDays: 38,
      lastCheckinDate: today,
      freezesRemaining: 2,
      freezesRefreshedAt: today,
    },
    create: {
      userId: customer.id,
      currentDays: 38,
      longestDays: 38,
      lastCheckinDate: today,
      freezesRemaining: 2,
    },
  });

  // ── 4. UserLoyaltyTotal — recompute from ledger.
  const totals = await prisma.loyaltyEvent.aggregate({
    where: { userId: customer.id },
    _sum: { points: true },
  });
  const totalPoints = totals._sum.points ?? 0;
  const yearPoints = totalPoints; // all events are within last year
  const tier: LoyaltyTier =
    yearPoints >= 5000 ? 'VIP' : yearPoints >= 2000 ? 'INSIDER' : yearPoints >= 500 ? 'REGULAR' : 'ROOKIE';

  await prisma.userLoyaltyTotal.upsert({
    where: { userId: customer.id },
    update: { totalPoints, yearPoints, tier, tierUpdatedAt: new Date() },
    create: { userId: customer.id, totalPoints, yearPoints, tier },
  });

  console.log(
    `🎮 Loyalty demo:  customer=${customer.email}\n` +
      `   tier:     ${tier}\n` +
      `   total:    ${totalPoints} NPP (${created} eventos nuevos en este run)\n` +
      `   streak:   38 días\n` +
      `   qr payload (imprime / pega):\n   ${qrPayload}\n`,
  );
}
