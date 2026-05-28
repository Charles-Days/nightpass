import { PrismaClient, OrderStatus } from '@prisma/client';
import { signPass } from '../../src/common/qr-hmac';

const TARGET_EMAIL = process.env.TARGET_EMAIL ?? 'cbenjamindp@gmail.com';

async function main() {
  const secret = process.env.PASS_HMAC_SECRET;
  if (!secret) throw new Error('PASS_HMAC_SECRET missing in env');

  const prisma = new PrismaClient();

  const user = await prisma.user.findUnique({ where: { email: TARGET_EMAIL } });
  if (!user) throw new Error(`User ${TARGET_EMAIL} not found`);

  const tiers = await prisma.eventTier.findMany({
    include: { event: { include: { venue: true } } },
  });
  if (tiers.length === 0) throw new Error('No event tiers found — seed events first');

  console.log(`\nCarlos id: ${user.id}`);
  console.log(`Creating ${tiers.length} passes...\n`);

  let created = 0;
  let skipped = 0;

  for (const tier of tiers) {
    const ev = tier.event;

    const existing = await prisma.order.findFirst({
      where: { userId: user.id, eventId: ev.id, tierId: tier.id },
    });
    if (existing) {
      console.log(`⏭️  ${ev.title} · ${tier.name} → ya existe order ${existing.id}`);
      skipped++;
      continue;
    }

    const order = await prisma.order.create({
      data: {
        userId: user.id,
        eventId: ev.id,
        tierId: tier.id,
        status: OrderStatus.COMPLETED,
        totalCents: tier.priceCents,
        applicationFeeCents: Math.round(tier.priceCents * 0.08),
        currency: tier.currency,
      },
    });

    const passCreated = await prisma.pass.create({
      data: {
        orderId: order.id,
        userId: user.id,
        eventId: ev.id,
        qrCode: 'pending',
      },
    });

    const qr = signPass(passCreated.id, ev.id, user.id, secret);
    await prisma.pass.update({ where: { id: passCreated.id }, data: { qrCode: qr } });

    console.log(`✅ ${ev.venue?.name ?? '—'} · ${ev.title} · ${tier.name}`);
    console.log(`   pass ${passCreated.id}  qr=${qr.slice(0, 40)}…`);
    created++;
  }

  console.log(`\n${created} passes creados · ${skipped} omitidos\n`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
