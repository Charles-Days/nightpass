import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus, Prisma } from '@prisma/client';
import type { Stripe } from 'stripe/cjs/stripe.core';
import { PrismaService } from '../prisma/prisma.service';
import { issuePasses } from '../passes/issue-passes';
import { StripeService } from './stripe.service';

@Injectable()
export class StripeWebhookService {
  private readonly logger = new Logger(StripeWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
    private readonly config: ConfigService,
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
    });

    this.logger.log(
      `Pago confirmado — Order ${order.id} COMPLETED, ${order.quantity} pases emitidos`,
    );
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
