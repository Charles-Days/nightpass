import { Prisma } from '@prisma/client';
import { signPass } from '../common/qr-hmac';

interface IssuableOrder {
  id: string;
  userId: string;
  eventId: string;
  quantity: number;
}

/**
 * Emite los pases faltantes de una orden de forma idempotente: cuenta los
 * pases ya creados para la orden y solo genera los que falten hasta
 * `order.quantity`. Cada pase recibe su QR firmado (HMAC) tras crearse.
 *
 * Compartido por el dev-bypass (OrdersService) y el webhook de Stripe.
 * Acepta cualquier cliente Prisma — transacción (`tx`) o el cliente normal.
 */
export async function issuePasses(
  db: Prisma.TransactionClient,
  order: IssuableOrder,
  passSecret: string,
) {
  const existing = await db.pass.count({ where: { orderId: order.id } });
  const created = [];
  for (let i = existing; i < order.quantity; i++) {
    const pass = await db.pass.create({
      data: {
        orderId: order.id,
        userId: order.userId,
        eventId: order.eventId,
        qrCode: `pending_${i}_${Date.now()}`,
      },
    });
    const qr = signPass(pass.id, order.eventId, order.userId, passSecret);
    const updated = await db.pass.update({
      where: { id: pass.id },
      data: { qrCode: qr },
    });
    created.push(updated);
  }
  return created;
}
