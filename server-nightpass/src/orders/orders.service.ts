import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { StripeService } from '../stripe/stripe.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { resolveTierPrice } from '../events/tier-pricing';
import { signPass } from '../common/qr-hmac';

const ORDER_LIMBO_MINUTES = 30;

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
    private readonly config: ConfigService,
    private readonly loyalty: LoyaltyService,
  ) {}

  // ── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Devuelve la cuenta Stripe asociada al evento — del venue si lo tiene,
   * o del promoter si el evento es de un organizador.
   */
  private resolveStripeAccount(event: {
    venue?: { stripeAccount?: { stripeAccountId: string; chargesEnabled: boolean } | null } | null;
    promoter?: { stripeAccount?: { stripeAccountId: string; chargesEnabled: boolean } | null } | null;
  }): { stripeAccountId: string; chargesEnabled: boolean } | null {
    const active = event.venue?.stripeAccount ?? event.promoter?.stripeAccount ?? null;
    if (!active && process.env.STRIPE_DEV_BYPASS === 'true') {
      return { stripeAccountId: 'acct_dummy_development_default', chargesEnabled: true };
    }
    return active;
  }

  // ── Crear orden + PaymentIntent ──────────────────────────────────────────

  async create(
    userId: string,
    tierId: string,
    referralCode?: string,
  ): Promise<{
    orderId: string;
    clientSecret: string;
    publishableKey: string | undefined;
    totalCents: number;
    currency: string;
  }> {
    if (!this.stripe.isEnabled()) {
      throw new HttpException(
        {
          message: 'Pagos no configurados en este servidor',
          errorCode: 'STRIPE_DISABLED',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const tier = await this.prisma.eventTier.findUnique({
      where: { id: tierId },
      include: {
        prices: true,
        event: {
          include: {
            venue: { include: { stripeAccount: true } },
            promoter: { include: { stripeAccount: true } },
          },
        },
      },
    });
    if (!tier) throw new NotFoundException('Tier no encontrado');

    const event = tier.event;

    // Precio vigente AHORA según el calendario de subidas. Se bloquea aquí: la
    // orden conserva este precio aunque el tier suba después.
    const priceCents = resolveTierPrice(
      tier.priceCents,
      tier.prices,
      event.startsAt,
    ).currentCents;

    if (priceCents <= 0) {
      throw new HttpException(
        { message: 'Tier gratuito — sin pago requerido', errorCode: 'FREE_TIER' },
        HttpStatus.CONFLICT,
      );
    }

    if (event.status !== 'PUBLISHED') {
      throw new HttpException(
        { message: 'Evento no publicado', errorCode: 'EVENT_NOT_PUBLISHED' },
        HttpStatus.CONFLICT,
      );
    }
    if (event.startsAt.getTime() <= Date.now() && process.env.STRIPE_DEV_BYPASS !== 'true') {
      throw new HttpException(
        { message: 'Evento ya empezó', errorCode: 'EVENT_STARTED' },
        HttpStatus.CONFLICT,
      );
    }

    if (!event.venue && !event.promoter) {
      throw new HttpException(
        {
          message: 'Evento sin local ni organizador — compras no disponibles',
          errorCode: 'EVENT_HAS_NO_OWNER',
        },
        HttpStatus.CONFLICT,
      );
    }
    const stripeAccount = this.resolveStripeAccount(event);
    const isDevBypass = process.env.STRIPE_DEV_BYPASS === 'true';
    if (!stripeAccount?.chargesEnabled && !isDevBypass) {
      throw new HttpException(
        {
          message:
            'Cuenta sin pagos configurados — el dueño debe completar Stripe onboarding',
          errorCode: 'NO_STRIPE',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    // Capacity (solo si tier tiene límite)
    if (tier.capacity != null) {
      const sold = await this.prisma.pass.count({
        where: { eventId: event.id, order: { tierId: tier.id } },
      });
      if (sold >= tier.capacity) {
        throw new HttpException(
          { message: 'Tier agotado', errorCode: 'TIER_SOLD_OUT' },
          HttpStatus.CONFLICT,
        );
      }
    }

    // Un pase por evento por usuario (solo restrictivo en producción)
    const existingPass = await this.prisma.pass.findFirst({
      where: { eventId: event.id, userId },
    });
    if (existingPass && process.env.STRIPE_DEV_BYPASS !== 'true') {
      throw new HttpException(
        {
          message: 'Ya tienes un pase para este evento',
          errorCode: 'DUPLICATE_PASS',
          passId: existingPass.id,
        },
        HttpStatus.CONFLICT,
      );
    }

    // Loyalty gating: throws ForbiddenException (→ HTTP 403) si el user
    // no alcanza el tier mínimo requerido por el EventTier.
    await this.loyalty.assertTierRequirement(userId, tier.minLoyaltyTier);

    const feePct = this.stripe.getPlatformFeePct();
    const applicationFeeCents = Math.floor((priceCents * feePct) / 100);

    let referredByRpId: string | undefined = undefined;
    if (referralCode) {
      const rp = await this.prisma.rpProfile.findUnique({
        where: { rpCode: referralCode, isActive: true },
        select: { id: true },
      });
      if (rp) {
        referredByRpId = rp.id;
      }
    }

    // --- BYPASS DE COMPRA DIRECTA EN DESARROLLO (requiere STRIPE_DEV_BYPASS=true en .env) ---
    if (process.env.STRIPE_DEV_BYPASS === 'true') {
      const passSecret = this.config.get<string>('PASS_HMAC_SECRET') || 'dev-hmac-secret-min32chars-replace-in-prod';
      
      const order = await this.prisma.order.create({
        data: {
          userId,
          eventId: event.id,
          tierId: tier.id,
          status: OrderStatus.COMPLETED,
          totalCents: priceCents,
          applicationFeeCents,
          currency: tier.currency,
          stripePaymentIntentId: `pi_dev_bypass_${Date.now()}`,
          referredByRpId,
        },
      });

      const createdPass = await this.prisma.pass.create({
        data: {
          orderId: order.id,
          userId,
          eventId: event.id,
          qrCode: 'pending',
        },
      });

      const qr = signPass(
        createdPass.id,
        event.id,
        userId,
        passSecret,
      );

      await this.prisma.pass.update({
        where: { id: createdPass.id },
        data: { qrCode: qr },
      });

      this.logger.log(`[DEV BYPASS] Simulación de pago exitosa. Pase ${createdPass.id} generado.`);

      return {
        orderId: order.id,
        clientSecret: `pi_${Date.now()}_secret_devbypasssecret_${Date.now()}`, // formato válido de Stripe client secret
        publishableKey: this.stripe.getPublishableKey(),
        totalCents: priceCents,
        currency: tier.currency,
      };
    }

    // 1. Crear order PENDING
    const order = await this.prisma.order.create({
      data: {
        userId,
        eventId: event.id,
        tierId: tier.id,
        status: OrderStatus.PENDING,
        totalCents: priceCents,
        applicationFeeCents,
        currency: tier.currency,
        referredByRpId,
      },
    });

    // 2. Crear PaymentIntent en Stripe (idempotency = orderId)
    const pi = await this.stripe.createPaymentIntent({
      amountCents: priceCents,
      currency: tier.currency,
      applicationFeeCents,
      connectedAccountId: stripeAccount!.stripeAccountId,
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
      throw new HttpException(
        {
          message: 'Stripe no devolvió client_secret — revisar configuración de cuenta',
          errorCode: 'STRIPE_MISSING_CLIENT_SECRET',
        },
        HttpStatus.BAD_GATEWAY,
      );
    }

    return {
      orderId: order.id,
      clientSecret: pi.client_secret,
      publishableKey: this.stripe.getPublishableKey(),
      totalCents: priceCents,
      currency: tier.currency,
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
        promoter: { include: { members: { select: { userId: true } } } },
      },
    });
    if (!event) throw new NotFoundException('Evento no encontrado');

    if (user.role !== Role.ADMIN) {
      const isVenueOwner =
        event.venue?.owners.some((o) => o.userId === user.id) ?? false;
      const isPromoterMember =
        event.promoter?.members.some((m) => m.userId === user.id) ?? false;
      if (!isVenueOwner && !isPromoterMember) {
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
