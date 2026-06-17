import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus, Prisma, RedemptionStatus, RewardKind } from '@prisma/client';
import type { Stripe } from 'stripe/cjs/stripe.core';
import { PrismaService } from '../prisma/prisma.service';
import { issuePasses } from '../passes/issue-passes';
import { CashWalletService } from '../cash-wallet/cash-wallet.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { RewardsService } from '../rewards/rewards.service';
import { StripeService } from './stripe.service';

@Injectable()
export class StripeWebhookService {
  private readonly logger = new Logger(StripeWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
    private readonly config: ConfigService,
    @Inject(forwardRef(() => CashWalletService))
    private readonly cashWallet: CashWalletService,
    private readonly loyalty: LoyaltyService,
    private readonly rewards: RewardsService,
  ) {}

  /**
   * Verifica firma del webhook y procesa el evento.
   * Idempotente: si ya se procesó el mismo `event.id` para una orden, ignora.
   */
  async handleEvent(rawBody: Buffer, signature: string): Promise<void> {
    const event = this.stripe.constructWebhookEvent(rawBody, signature);
    this.logger.log(`Stripe event received: ${event.type} (${event.id})`);

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.onPaymentIntentSucceeded(
          event.id,
          event.data.object as Stripe.PaymentIntent,
        );
        break;
      case 'payment_intent.payment_failed':
        await this.onPaymentIntentFinal(
          event.id,
          event.data.object as Stripe.PaymentIntent,
          OrderStatus.FAILED,
        );
        break;
      case 'payment_intent.canceled':
        await this.onPaymentIntentFinal(
          event.id,
          event.data.object as Stripe.PaymentIntent,
          OrderStatus.FAILED,
        );
        break;
      case 'charge.refunded':
        await this.onChargeRefunded(event.id, event.data.object as Stripe.Charge);
        break;
      case 'account.updated':
        await this.onAccountUpdated(event.data.object as Stripe.Account);
        break;
      default:
        this.logger.debug(`Evento Stripe no manejado: ${event.type}`);
    }
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  private async onPaymentIntentSucceeded(
    eventId: string,
    pi: Stripe.PaymentIntent,
  ): Promise<void> {
    // Recarga de saldo del CashWallet (prepago de comisión en efectivo). No hay
    // Order asociada: el dinero se queda en la plataforma y acredita el wallet.
    if (pi.metadata?.kind === 'cash_wallet_topup') {
      await this.cashWallet.creditFromTopup(pi);
      return;
    }

    const order = await this.prisma.order.findUnique({
      where: { stripePaymentIntentId: pi.id },
    });

    if (!order) {
      this.logger.warn(`Order no encontrada para PI ${pi.id}`);
      return;
    }

    // Idempotencia: ya procesado este event.id
    if (order.stripeEventLastApplied === eventId) {
      this.logger.debug(`Event ${eventId} ya procesado para Order ${order.id}`);
      return;
    }

    if (order.status === OrderStatus.COMPLETED) {
      // Otra ejecución previa ya creó el Pass. Marcar event y salir.
      await this.prisma.order.update({
        where: { id: order.id },
        data: { stripeEventLastApplied: eventId },
      });
      return;
    }

    const passSecret = this.config.get<string>('PASS_HMAC_SECRET');
    if (!passSecret) {
      throw new ServiceUnavailableException(
        'PASS_HMAC_SECRET no configurado — no se puede generar Pass',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.COMPLETED,
          stripeEventLastApplied: eventId,
        },
      });

      await issuePasses(tx, updated, passSecret);

      // Promo por volumen: usa el MISMO tx que el completado (lectura/escritura
      // de RewardRedemption). Va en try/catch para que un error de recompensa
      // NUNCA tumbe el cierre de una orden ya pagada ni la emisión de pases.
      try {
        await this.rewards.maybeUnlockBulkPromo(tx, updated);
        await this.rewards.maybeUnlockPurchasePerk(tx, updated);
      } catch (err) {
        this.logger.error(
          `desbloqueo de promos falló para Order ${order.id}: ${err instanceof Error ? err.message : err}`,
        );
      }
    });

    // Descuento de boleto: el débito de NPP corre FUERA de la tx de completado
    // (loyalty.debit abre su propia transacción) y SIEMPRE en try/catch — si el
    // débito falla, la orden ya está COMPLETED y los pases emitidos: el error de
    // recompensa no revierte un pago. La idempotencia (`redeem:<id>`) evita doble
    // cobro si el webhook se reintenta.
    await this.applyTicketDiscount(order.id).catch((err) =>
      this.logger.error(
        `applyTicketDiscount falló para Order ${order.id}: ${err instanceof Error ? err.message : err}`,
      ),
    );

    this.logger.log(
      `Pago confirmado — Order ${order.id} COMPLETED, ${order.quantity} pases emitidos`,
    );
  }

  /**
   * Cobra el descuento de boleto de una orden ya completada: busca el cupón
   * TICKET_DISCOUNT PENDING atado a la orden, debita los NPP (idempotente) y lo
   * marca USED. Se llama desde el webhook tras completar la orden, siempre
   * envuelto en catch — un fallo aquí no revierte el pago.
   */
  private async applyTicketDiscount(orderId: string): Promise<void> {
    const redemption = await this.prisma.rewardRedemption.findFirst({
      where: {
        orderId,
        status: RedemptionStatus.PENDING,
        reward: { kind: RewardKind.TICKET_DISCOUNT },
      },
      include: { reward: { select: { kind: true } } },
    });
    if (!redemption) return;

    await this.loyalty.debit({
      userId: redemption.userId,
      points: redemption.costNpp,
      idempotencyKey: `redeem:${redemption.id}`,
    });

    await this.prisma.rewardRedemption.update({
      where: { id: redemption.id },
      data: { status: RedemptionStatus.USED, usedAt: new Date() },
    });
  }

  private async onPaymentIntentFinal(
    eventId: string,
    pi: Stripe.PaymentIntent,
    finalStatus: OrderStatus,
  ): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { stripePaymentIntentId: pi.id },
    });
    if (!order) return;

    if (order.stripeEventLastApplied === eventId) return;
    if (order.status === OrderStatus.COMPLETED) return; // ya pagado

    await this.prisma.order.update({
      where: { id: order.id },
      data: { status: finalStatus, stripeEventLastApplied: eventId },
    });

    this.logger.log(`Order ${order.id} marcada ${finalStatus} (PI ${pi.id})`);
  }

  private async onChargeRefunded(
    eventId: string,
    charge: Stripe.Charge,
  ): Promise<void> {
    const piId =
      typeof charge.payment_intent === 'string'
        ? charge.payment_intent
        : charge.payment_intent?.id;
    if (!piId) return;

    const order = await this.prisma.order.findUnique({
      where: { stripePaymentIntentId: piId },
    });
    if (!order) return;
    if (order.stripeEventLastApplied === eventId) return;

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.REFUNDED,
        stripeEventLastApplied: eventId,
      },
    });
    this.logger.log(`Order ${order.id} REFUNDED (charge ${charge.id})`);
  }

  private async onAccountUpdated(account: Stripe.Account): Promise<void> {
    const stripeAccount = await this.prisma.stripeAccount.findUnique({
      where: { stripeAccountId: account.id },
    });
    if (!stripeAccount) {
      this.logger.debug(`account.updated para cuenta no registrada ${account.id}`);
      return;
    }

    const data: Prisma.StripeAccountUpdateInput = {
      chargesEnabled: account.charges_enabled ?? false,
      detailsSubmitted: account.details_submitted ?? false,
    };
    await this.prisma.stripeAccount.update({
      where: { id: stripeAccount.id },
      data,
    });
    this.logger.log(
      `StripeAccount ${stripeAccount.id} sincronizada (charges=${data.chargesEnabled}, details=${data.detailsSubmitted})`,
    );
  }
}
