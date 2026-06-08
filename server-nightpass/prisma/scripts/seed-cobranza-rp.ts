/**
 * Crea N solicitudes de pago en EFECTIVO (PhysicalPaymentRequest) en estado
 * PENDING, asignadas a un RP, repartidas en varios eventos/lugares/días para
 * poblar la cola "Solicitudes en efectivo" (Cobranza) del panel.
 *
 * Idempotente: borra las solicitudes previas de este seed (note marker) antes de
 * recrearlas, así no se acumulan.
 *
 * Uso:
 *   pnpm seed:cobranza                          # 8 solicitudes a rp@nightpass.local
 *   COUNT=12 RP_EMAIL=otro@rp BUYER_EMAIL=x pnpm seed:cobranza
 */
import 'dotenv/config';
import { PrismaClient, PhysicalPaymentRequestStatus } from '@prisma/client';

const prisma = new PrismaClient();

const COUNT = Math.max(1, Math.min(40, Number(process.env.COUNT ?? 8)));
const RP_EMAIL = process.env.RP_EMAIL ?? 'rp@nightpass.local';
const BUYER_EMAIL = process.env.BUYER_EMAIL ?? 'cliente@nightpass.local';
const SEED_MARKER = '[seed-cobranza]';
// SAME_DAY=YYYY-MM-DD → todas las solicitudes caen ese mismo día (variando hora),
// para ver cómo se agrupan varias en una fecha. Sin esto usa el día del evento.
const SAME_DAY = process.env.SAME_DAY ?? null;

const PHONES = [
  '2206038418', '5512349876', '7771234567', '5599887766',
  '8112223344', '3318765432', '5544332211', '2281112233',
];
const NOTES = [
  'Paga en la entrada',
  'Llega 30 min antes',
  'Lleva cambio para $500',
  'Grupo de 3, mismo pago',
  'Cliente frecuente',
  'Confirmar por WhatsApp',
];

async function main() {
  const rpUser = await prisma.user.findUnique({
    where: { email: RP_EMAIL },
    select: { id: true },
  });
  if (!rpUser) throw new Error(`No existe usuario RP ${RP_EMAIL}`);

  const rp = await prisma.rpProfile.findUnique({
    where: { userId: rpUser.id },
    select: { id: true, displayName: true },
  });
  if (!rp) throw new Error(`El usuario ${RP_EMAIL} no tiene RpProfile`);

  const buyer = await prisma.user.findUnique({
    where: { email: BUYER_EMAIL },
    select: { id: true, name: true },
  });
  if (!buyer) throw new Error(`No existe comprador ${BUYER_EMAIL}`);

  // Puntos de cobro ACTIVOS del RP — se reparten round-robin para que las
  // solicitudes caigan bajo un punto y no en "SIN PUNTO · A COORDINAR".
  const pickupPoints = await prisma.rpPickupPoint.findMany({
    where: { rpProfileId: rp.id, isActive: true },
    select: { id: true, label: true },
  });

  const events = await prisma.event.findMany({
    where: { status: 'PUBLISHED', tiers: { some: {} } },
    select: {
      id: true,
      title: true,
      startsAt: true,
      venue: { select: { name: true, city: true } },
      tiers: { select: { id: true, priceCents: true }, take: 1 },
    },
    orderBy: { startsAt: 'asc' },
    take: COUNT,
  });
  if (events.length === 0) {
    throw new Error('No hay eventos PUBLISHED con tier. Corre `pnpm seed:events`.');
  }

  // Limpieza idempotente de seeds previos.
  const removed = await prisma.physicalPaymentRequest.deleteMany({
    where: { assignedRpId: rp.id, note: { startsWith: SEED_MARKER } },
  });
  if (removed.count > 0) {
    // eslint-disable-next-line no-console
    console.log(`🧹 Borradas ${removed.count} solicitudes previas del seed.\n`);
  }

  // eslint-disable-next-line no-console
  console.log(`💵 Creando ${events.length} solicitudes en efectivo para ${rp.displayName}...\n`);

  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    const tier = ev.tiers[0];
    const quantity = (i % 3) + 1; // 1, 2, 3
    const amountCents = tier.priceCents * quantity;
    const pickupPoint = pickupPoints.length
      ? pickupPoints[i % pickupPoints.length]
      : null;

    // pickupAt: SAME_DAY si se fijó, si no el día del evento. Hora 20:00/21:00/22:00.
    const pickupAt = SAME_DAY ? new Date(`${SAME_DAY}T00:00:00`) : new Date(ev.startsAt);
    pickupAt.setHours(20 + (i % 3), (i % 2) * 30, 0, 0);
    // expira 1 día después del pickup.
    const expiresAt = new Date(pickupAt.getTime() + 86_400_000);

    await prisma.physicalPaymentRequest.create({
      data: {
        userId: buyer.id,
        eventId: ev.id,
        tierId: tier.id,
        quantity,
        amountCents,
        grossCents: amountCents,
        currency: 'MXN',
        status: PhysicalPaymentRequestStatus.PENDING,
        assignedRpId: rp.id,
        contactPhone: PHONES[i % PHONES.length],
        note: `${SEED_MARKER} ${NOTES[i % NOTES.length]}`,
        pickupAt,
        expiresAt,
        ...(pickupPoint ? { pickupPointId: pickupPoint.id } : {}),
      },
    });

    const place = pickupPoint?.label ?? ev.venue?.name ?? 'Sin punto';
    // eslint-disable-next-line no-console
    console.log(
      `  ✓ ${ev.title}  ·  📍${place}  ·  ${pickupAt.toLocaleDateString('es-MX')}  ·  ${quantity}x  $${(amountCents / 100).toFixed(2)}`,
    );
  }

  // eslint-disable-next-line no-console
  console.log(`\n✅ Listo. ${events.length} solicitudes PENDING en la cola de ${rp.displayName}.`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
