/**
 * Otorga N pases a un usuario para probar (p. ej. transferencia de pases).
 *
 * Crea UNA orden COMPLETED (CASH) con quantity=N y emite N pases con QR firmado
 * (mismo HMAC que el server, así sirven para escanear/transferir).
 *
 * Uso:
 *   pnpm grant:passes                                  # 3 pases, email por defecto
 *   EMAIL=otro@correo.com QTY=2 pnpm grant:passes      # override email/cantidad
 *   EVENT_ID=<uuid> pnpm grant:passes                  # evento específico
 *
 * Requiere PASS_HMAC_SECRET en .env (igual que el server) para que el QR valide.
 */
import 'dotenv/config';
import { PrismaClient, OrderStatus, PaymentMethod } from '@prisma/client';
import { issuePasses } from '../../src/passes/issue-passes';

const prisma = new PrismaClient();

const EMAIL = process.env.EMAIL ?? 'cbenjamindp2004@gmail.com';
const QTY = Math.max(1, Math.min(6, Number(process.env.QTY ?? 3)));

async function main() {
  const secret = process.env.PASS_HMAC_SECRET;
  if (!secret) {
    throw new Error(
      'PASS_HMAC_SECRET no está definido — necesario para firmar QR válidos. Sin él los pases no escanearían.',
    );
  }

  const user = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (!user) throw new Error(`No existe usuario con email ${EMAIL}`);

  // Evento: el indicado por EVENT_ID, o el primer PUBLISHED futuro con tier.
  const event = process.env.EVENT_ID
    ? await prisma.event.findUnique({
        where: { id: process.env.EVENT_ID },
        include: { tiers: { orderBy: { position: 'asc' } } },
      })
    : await prisma.event.findFirst({
        where: {
          status: 'PUBLISHED',
          endsAt: { gte: new Date() },
          tiers: { some: {} },
        },
        orderBy: { startsAt: 'asc' },
        include: { tiers: { orderBy: { position: 'asc' } } },
      });

  if (!event) throw new Error('No se encontró un evento publicado con tiers.');
  const tier = event.tiers[0];
  if (!tier) throw new Error(`El evento ${event.title} no tiene tiers.`);

  const order = await prisma.order.create({
    data: {
      userId: user.id,
      eventId: event.id,
      tierId: tier.id,
      status: OrderStatus.COMPLETED,
      paymentMethod: PaymentMethod.CASH,
      quantity: QTY,
      totalCents: tier.priceCents * QTY,
      applicationFeeCents: 0,
      currency: tier.currency,
    },
  });

  const passes = await issuePasses(
    prisma,
    {
      id: order.id,
      userId: user.id,
      eventId: event.id,
      quantity: QTY,
    },
    secret,
  );

  console.log('\n✅ Pases otorgados');
  console.log(`Usuario : ${user.name ?? '(sin nombre)'} <${user.email}>`);
  console.log(`Evento  : ${event.title} (${event.id})`);
  console.log(`Tier    : ${tier.name}`);
  console.log(`Orden   : ${order.id} (quantity=${QTY})`);
  console.log('Pases   :');
  for (const p of passes) {
    console.log(`  - ${p.id}  →  /app/pases/${p.id}`);
  }
  console.log(
    '\nEntra como ese usuario en /app/pases para verlos y probar la transferencia.\n',
  );
}

main()
  .catch((err) => {
    console.error('❌', err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
