import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { StripeService } from '../stripe/stripe.service';

const ORDER_LIMBO_MINUTES = 30;

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
    private readonly config: ConfigService,
  ) {}

  // ── Crear orden + PaymentIntent ──────────────────────────────────────────

  async create(
    userId: string,
    tierId: string,
  ): Promise<{
    orderId: string;
    clientSecret: string;
    publishableKey: string | undefined;
  }> {
    if (!this.stripe.isEnabled()) {
      throw new ConflictException('Pagos no configurados en este servidor');
    }

    const tier = await this.prisma.eventTier.findUnique({
      where: { id: tierId },
      include: {
        event: {
          include: { venue: { include: { stripeAccount: true } } },
        },
      },
    });
    if (!tier) throw new NotFoundException('Tier no encontrado');
    if (tier.priceCents <= 0) {
      throw new ConflictException('Tier gratuito — sin pago requerido');
    }

    const event = tier.event;
    if (event.status !== 'PUBLISHED') {
      throw new ConflictException('Evento no publicado');
    }
    if (event.startsAt.getTime() <= Date.now()) {
      throw new ConflictException('Evento ya empezó');
    }

    const stripeAccount = event.venue.stripeAccount;
    if (!stripeAccount?.chargesEnabled) {
      throw new ConflictException(
        'Local sin pagos configurados — el dueño debe completar Stripe onboarding',
      );
    }

    // Capacity (solo si tier tiene límite)
    if (tier.capacity != null) {
      const sold = await this.prisma.pass.count({
        where: { eventId: event.id, order: { tierId: tier.id } },
      });
      if (sold >= tier.capacity) {
        throw new ConflictException('Tier agotado');
      }
    }

    // Un pase por evento por usuario
    const existingPass = await this.prisma.pass.findFirst({
      where: { eventId: event.id, userId },
    });
    if (existingPass) {
      throw new ConflictException('Ya tienes un pase para este evento');
    }

    const feePct = this.stripe.getPlatformFeePct();
    const applicationFeeCents = Math.floor((tier.priceCents * feePct) / 100);

    // 1. Crear order PENDING
    const order = await this.prisma.order.create({
      data: {
        userId,
        eventId: event.id,
        tierId: tier.id,
        status: OrderStatus.PENDING,
        totalCents: tier.priceCents,
        applicationFeeCents,
        currency: tier.currency,
      },
    });

    // 2. Crear PaymentIntent en Stripe (idempotency = orderId)
    const pi = await this.stripe.createPaymentIntent({
      amountCents: tier.priceCents,
      currency: tier.currency,
      applicationFeeCents,
      connectedAccountId: stripeAccount.stripeAccountId,
      metadata: {
        orderId: order.id,
        eventId: event.id,
        userId,
        tierId: tier.id,
      },
      idempotencyKey: `order-${order.id}`,
    });

    // 3. Persistir PI id
    await this.prisma.order.update({
      where: { id: order.id },
      data: { stripePaymentIntentId: pi.id },
    });

    if (!pi.client_secret) {
      throw new ConflictException(
        'Stripe no devolvió client_secret — revisar configuración de cuenta',
      );
    }

    return {
      orderId: order.id,
      clientSecret: pi.client_secret,
      publishableKey: this.stripe.getPublishableKey(),
    };
  }

  // ── Listar mis órdenes ───────────────────────────────────────────────────

  async listMine(userId: string, page = 1, limit = 20) {
    await this.cleanupLimbo(userId);

    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          tier: { select: { id: true, name: true, priceCents: true, currency: true } },
          event: {
            select: {
              id: true,
              title: true,
              startsAt: true,
              coverImageUrl: true,
              venue: { select: { id: true, name: true, slug: true } },
            },
          },
          pass: { select: { id: true, usedAt: true } },
        },
      }),
      this.prisma.order.count({ where: { userId } }),
    ]);

    return { items, total, page, limit };
  }

  // ── Detalle de una orden ─────────────────────────────────────────────────

  async getById(id: string, user: AuthUser) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        tier: true,
        event: { include: { venue: true } },
        pass: true,
        user: { select: { id: true, email: true, name: true } },
      },
    });
    if (!order) throw new NotFoundException('Orden no encontrada');

    if (user.role !== Role.ADMIN && order.userId !== user.id) {
      throw new ForbiddenException('No tienes acceso a esta orden');
    }
    return order;
  }

  // ── Ventas por evento ────────────────────────────────────────────────────

  async eventSales(eventId: string, user: AuthUser) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        tiers: true,
        venue: { include: { owners: { select: { userId: true } } } },
      },
    });
    if (!event) throw new NotFoundException('Evento no encontrado');

    if (user.role !== Role.ADMIN) {
      const isOwner = event.venue.owners.some((o) => o.userId === user.id);
      if (!isOwner) {
        throw new ForbiddenException('No tienes acceso a las ventas de este evento');
      }
    }

    const completedOrders = await this.prisma.order.findMany({
      where: { eventId, status: OrderStatus.COMPLETED },
      include: {
        tier: { select: { id: true, name: true } },
        user: { select: { id: true, email: true, name: true } },
        pass: { select: { id: true, usedAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalCents = completedOrders.reduce(
      (acc, o) => acc + o.totalCents,
      0,
    );
    const totalFeeCents = completedOrders.reduce(
      (acc, o) => acc + o.applicationFeeCents,
      0,
    );

    const byTier = event.tiers.map((tier) => {
      const sold = completedOrders.filter((o) => o.tierId === tier.id).length;
      return {
        tierId: tier.id,
        name: tier.name,
        priceCents: tier.priceCents,
        currency: tier.currency,
        sold,
        capacity: tier.capacity,
      };
    });

    return {
      eventId,
      totalCents,
      totalFeeCents,
      orderCount: completedOrders.length,
      passesIssued: completedOrders.filter((o) => o.pass).length,
      currency: event.tiers[0]?.currency ?? this.stripe.getDefaultCurrency().toUpperCase(),
      byTier,
      orders: completedOrders.map((o) => ({
        id: o.id,
        createdAt: o.createdAt,
        totalCents: o.totalCents,
        currency: o.currency,
        tier: o.tier,
        user: o.user,
        passUsed: o.pass?.usedAt != null,
      })),
    };
  }

  // ── Lazy cleanup ─────────────────────────────────────────────────────────

  /**
   * Marca FAILED y cancela en Stripe las órdenes PENDING del user con
   * createdAt menor a `now - ORDER_LIMBO_MINUTES`. No bloquea el listado:
   * corre en best-effort.
   */
  private async cleanupLimbo(userId: string): Promise<void> {
    const cutoff = new Date(Date.now() - ORDER_LIMBO_MINUTES * 60 * 1000);
    const stale = await this.prisma.order.findMany({
      where: {
        userId,
        status: OrderStatus.PENDING,
        createdAt: { lt: cutoff },
      },
      select: { id: true, stripePaymentIntentId: true },
    });
    if (stale.length === 0) return;

    for (const order of stale) {
      try {
        if (order.stripePaymentIntentId && this.stripe.isEnabled()) {
          await this.stripe.cancelPaymentIntent(order.stripePaymentIntentId);
        }
        await this.prisma.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.FAILED },
        });
      } catch (err) {
        this.logger.warn(
          `Cleanup limbo Order ${order.id} falló: ${(err as Error).message}`,
        );
      }
    }
  }
}
