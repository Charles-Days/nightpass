import * as crypto from 'crypto';
import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  OrderStatus,
  Role,
  PassClaimStatus,
  RewardKind,
  RewardDiscountType,
  RedemptionStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { StripeService } from '../stripe/stripe.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { RewardsService } from '../rewards/rewards.service';
import { resolveTierPrice } from '../events/tier-pricing';
import { issuePasses } from '../passes/issue-passes';
import { isDevBypassEnabled } from '../common/dev-bypass';
import { requirePassSecret } from '../common/pass-secret';
import { MailerService } from '../mailer/mailer.service';
import {
  buyerThankYouEmail,
  type BuyerThankYouInput,
} from '../mailer/templates/buyer-thank-you-email';

const ORDER_LIMBO_MINUTES = 30;

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
    private readonly config: ConfigService,
    private readonly loyalty: LoyaltyService,
    private readonly mailer: MailerService,
    private readonly rewards: RewardsService,
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
    if (!active && isDevBypassEnabled()) {
      return { stripeAccountId: 'acct_dummy_development_default', chargesEnabled: true };
    }
    return active;
  }

  // ── Crear orden + PaymentIntent ──────────────────────────────────────────

  async create(
    userId: string,
    tierId: string,
    referralCode?: string,
    quantity = 1,
    rewardId?: string,
  ): Promise<{
    orderId: string;
    clientSecret: string;
    publishableKey: string | undefined;
    totalCents: number;
    currency: string;
    discountCents?: number;
  }> {
    if (quantity < 1 || quantity > 6) {
      throw new HttpException(
        { message: 'Cantidad de pases inválida (máximo 6)', errorCode: 'INVALID_QUANTITY' },
        HttpStatus.BAD_REQUEST,
      );
    }

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
    const singlePriceCents = resolveTierPrice(
      tier.priceCents,
      tier.prices,
      event.startsAt,
    ).currentCents;
    let priceCents = singlePriceCents * quantity;

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
    // Evento solo-efectivo: el pago en línea (Stripe) está deshabilitado.
    if (!event.allowOnlinePayment) {
      throw new HttpException(
        {
          message: 'Este evento solo acepta pago en efectivo',
          errorCode: 'ONLINE_PAYMENT_DISABLED',
        },
        HttpStatus.CONFLICT,
      );
    }
    if (event.startsAt.getTime() <= Date.now() && !isDevBypassEnabled()) {
      throw new HttpException(
        { message: 'El evento ya comenzó', errorCode: 'EVENT_STARTED' },
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
    const isDevBypass = isDevBypassEnabled();
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

    // Colapsa las órdenes PENDING previas del user para este evento: una vez
    // que sale de la pantalla de pago son irrecuperables, así que se cancelan
    // (incl. su PaymentIntent) para que no se acumulen ni bloqueen su propio
    // cupo. Tras esto el user tiene a lo sumo 1 PENDING activa por evento.
    await this.failPendingOrdersForEvent(userId, event.id);

    const limboCutoff = new Date(Date.now() - ORDER_LIMBO_MINUTES * 60 * 1000);

    // Capacity (solo si tier tiene límite)
    if (tier.capacity != null) {
      const sold = await this.prisma.pass.count({
        where: { eventId: event.id, order: { tierId: tier.id } },
      });
      const pendingClaims = await this.prisma.passClaim.count({
        where: { tierId: tier.id, status: PassClaimStatus.PENDING },
      });
      // Reservas en órdenes PENDING activas (de cualquier user) que aún no
      // emitieron pases: cuentan contra el aforo para evitar sobreventa cuando
      // varios compran a la vez. Las vencidas las limpia cleanupLimbo.
      const pendingReserved = await this.prisma.order.aggregate({
        _sum: { quantity: true },
        where: {
          tierId: tier.id,
          status: OrderStatus.PENDING,
          createdAt: { gte: limboCutoff },
        },
      });
      const reserved = sold + pendingClaims + (pendingReserved._sum.quantity ?? 0);
      if (reserved + quantity > tier.capacity) {
        throw new HttpException(
          { message: 'Cupo insuficiente para la cantidad solicitada', errorCode: 'TIER_SOLD_OUT' },
          HttpStatus.CONFLICT,
        );
      }
    }

    // Máximo 6 pases por cuenta por evento. Cuenta pases ya emitidos + cantidad
    // reservada en órdenes PENDING activas del user. Sin esto, como los pases
    // se emiten async en el webhook tras pagar, se podían crear varias órdenes
    // sin pagar (todas viendo 0) y pagarlas para superar el límite.
    const issuedCount = await this.prisma.pass.count({
      where: { eventId: event.id, userId },
    });
    const pendingMine = await this.prisma.order.aggregate({
      _sum: { quantity: true },
      where: {
        userId,
        eventId: event.id,
        status: OrderStatus.PENDING,
        createdAt: { gte: limboCutoff },
      },
    });
    const demand = issuedCount + (pendingMine._sum.quantity ?? 0);
    if (demand + quantity > 6 && !isDevBypassEnabled()) {
      throw new HttpException(
        {
          message: `Límite excedido. Ya tienes ${demand} pases y estás intentando adquirir ${quantity} más (máximo 6 por cuenta).`,
          errorCode: 'LIMIT_EXCEEDED',
        },
        HttpStatus.CONFLICT,
      );
    }

    // ── Descuento de boleto (TICKET_DISCOUNT) ──────────────────────────────
    // Si el cliente pasó un rewardId, validamos el descuento y reducimos el
    // precio ANTES de calcular la comisión (que se cobra sobre el monto ya
    // descontado). El cobro real de NPP se hace al confirmar el pago (webhook):
    // aquí solo se reserva el cupón PENDING. priceCents nunca baja de 0.
    let discountCents = 0;
    let discountReward: { id: string; costNpp: number; expiresInH: number } | null =
      null;
    if (rewardId) {
      const reward = await this.prisma.reward.findUnique({
        where: { id: rewardId },
      });
      if (!reward || !reward.active) {
        throw new HttpException(
          { message: 'Recompensa no disponible', errorCode: 'REWARD_UNAVAILABLE' },
          HttpStatus.BAD_REQUEST,
        );
      }
      if (reward.kind !== RewardKind.TICKET_DISCOUNT) {
        throw new HttpException(
          {
            message: 'Esta recompensa no es un descuento de boleto',
            errorCode: 'REWARD_WRONG_KIND',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      if (reward.eventId != null && reward.eventId !== event.id) {
        throw new HttpException(
          {
            message: 'Este descuento no aplica a este evento',
            errorCode: 'REWARD_EVENT_MISMATCH',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const balance = await this.loyalty.getBalance(userId);
      if (balance < reward.costNpp) {
        throw new HttpException(
          { message: 'No tienes NPP suficientes', errorCode: 'INSUFFICIENT_NPP' },
          HttpStatus.BAD_REQUEST,
        );
      }

      if (reward.perUserLimit != null) {
        const used = await this.prisma.rewardRedemption.count({
          where: {
            userId,
            rewardId: reward.id,
            status: RedemptionStatus.USED,
          },
        });
        if (used >= reward.perUserLimit) {
          throw new HttpException(
            {
              message: 'Ya alcanzaste el límite de esta recompensa',
              errorCode: 'REWARD_LIMIT_REACHED',
            },
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      if (reward.discountType === RewardDiscountType.PERCENT) {
        const raw = Math.floor((priceCents * reward.discountValue) / 100);
        discountCents =
          reward.maxDiscountCents != null
            ? Math.min(raw, reward.maxDiscountCents)
            : raw;
      } else if (reward.discountType === RewardDiscountType.FIXED) {
        discountCents = Math.min(reward.discountValue, priceCents);
      }
      discountCents = Math.max(0, Math.min(discountCents, priceCents));

      priceCents = Math.max(0, priceCents - discountCents);
      // Un descuento que deja la orden en 0 no puede cobrarse por Stripe
      // (PaymentIntent mínimo > 0). Se rechaza con mensaje claro en vez de
      // romper el checkout.
      if (priceCents <= 0) {
        throw new HttpException(
          {
            message:
              'El descuento cubre el total — no se puede procesar un pago de $0',
            errorCode: 'DISCOUNT_COVERS_TOTAL',
          },
          HttpStatus.CONFLICT,
        );
      }
      discountReward = {
        id: reward.id,
        costNpp: reward.costNpp,
        expiresInH: reward.expiresInH,
      };
    }

    // Fee del dueño del evento si lo tiene configurado (>0); si no, cae al fee
    // global del servidor. Mismo orden de prioridad que resolveStripeAccount: el
    // payout va al venue si existe, si no al promoter — la comisión sigue al mismo
    // dueño. platformFeePct: null = sin configurar → usa la comisión global;
    // un número (incluido 0) es explícito (0 = NightPass no cobra comisión).
    // La comisión se calcula sobre el precio YA descontado.
    const ownerFeePct = event.venue
      ? event.venue.platformFeePct
      : event.promoter
        ? event.promoter.platformFeePct
        : null;
    const feePct =
      ownerFeePct != null ? ownerFeePct : this.stripe.getPlatformFeePct();
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

    // --- BYPASS DE COMPRA DIRECTA EN DESARROLLO (requiere STRIPE_DEV_BYPASS=true + NODE_ENV!=production) ---
    if (isDevBypassEnabled()) {
      const passSecret = requirePassSecret(this.config);

      const order = await this.prisma.order.create({
        data: {
          userId,
          eventId: event.id,
          tierId: tier.id,
          status: OrderStatus.COMPLETED,
          quantity,
          totalCents: priceCents,
          applicationFeeCents,
          currency: tier.currency,
          stripePaymentIntentId: `pi_dev_bypass_${Date.now()}`,
          referredByRpId,
        },
      });

      await issuePasses(this.prisma, order, passSecret);

      // Descuento de boleto: en el bypass la orden se completa al instante, así
      // que creamos el cupón, debitamos los NPP y lo marcamos USED en el acto
      // (espejo del webhook). Best-effort: un error aquí NO rompe la compra.
      if (discountReward) {
        try {
          const code = await this.rewards.generateUniqueCode();
          const redemption = await this.prisma.rewardRedemption.create({
            data: {
              rewardId: discountReward.id,
              userId,
              orderId: order.id,
              costNpp: discountReward.costNpp,
              status: RedemptionStatus.PENDING,
              code,
              appliedCents: discountCents,
              expiresAt: new Date(
                Date.now() + discountReward.expiresInH * 3_600_000,
              ),
            },
          });
          await this.loyalty.debit({
            userId,
            points: discountReward.costNpp,
            idempotencyKey: `redeem:${redemption.id}`,
          });
          await this.prisma.rewardRedemption.update({
            where: { id: redemption.id },
            data: { status: RedemptionStatus.USED, usedAt: new Date() },
          });
        } catch (err) {
          this.logger.error(
            `[DEV BYPASS] Descuento de boleto falló para Order ${order.id}: ${(err as Error).message}`,
          );
        }
      }

      // Promos automáticas al completar (best-effort): por volumen (BULK) y
      // perks por compra en ventana de fechas (PURCHASE_PERK).
      try {
        await this.rewards.maybeUnlockBulkPromo(this.prisma, order);
        await this.rewards.maybeUnlockPurchasePerk(this.prisma, order);
      } catch (err) {
        this.logger.error(
          `[DEV BYPASS] desbloqueo de promos falló para Order ${order.id}: ${(err as Error).message}`,
        );
      }

      this.logger.log(`[DEV BYPASS] Simulación de pago exitosa. ${quantity} pases generados.`);

      return {
        orderId: order.id,
        clientSecret: `pi_${Date.now()}_secret_devbypasssecret_${Date.now()}`,
        publishableKey: this.stripe.getPublishableKey(),
        totalCents: priceCents,
        currency: tier.currency,
        discountCents: discountReward ? discountCents : undefined,
      };
    }

    // 1. Crear order PENDING
    const order = await this.prisma.order.create({
      data: {
        userId,
        eventId: event.id,
        tierId: tier.id,
        status: OrderStatus.PENDING,
        quantity,
        totalCents: priceCents,
        applicationFeeCents,
        currency: tier.currency,
        referredByRpId,
      },
    });

    // 1b. Descuento de boleto: reserva el cupón PENDING atado a esta orden. El
    // débito de NPP y el paso a USED ocurren al confirmarse el pago (webhook).
    // Best-effort: un fallo aquí no debe romper el checkout — el precio ya se
    // descontó y el pago puede proceder; si el cupón no se creó, no se cobran NPP.
    let redemptionId: string | undefined;
    if (discountReward) {
      try {
        const code = await this.rewards.generateUniqueCode();
        const redemption = await this.prisma.rewardRedemption.create({
          data: {
            rewardId: discountReward.id,
            userId,
            orderId: order.id,
            costNpp: discountReward.costNpp,
            status: RedemptionStatus.PENDING,
            code,
            appliedCents: discountCents,
            expiresAt: new Date(
              Date.now() + discountReward.expiresInH * 3_600_000,
            ),
          },
        });
        redemptionId = redemption.id;
      } catch (err) {
        this.logger.error(
          `No se pudo reservar el cupón de descuento para Order ${order.id}: ${(err as Error).message}`,
        );
      }
    }

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
        quantity: String(quantity),
        ...(discountReward ? { rewardId: discountReward.id } : {}),
        ...(redemptionId ? { redemptionId } : {}),
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
      discountCents: discountReward ? discountCents : undefined,
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
          passes: { select: { id: true, usedAt: true } },
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
        passes: true,
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
        passes: { select: { id: true, usedAt: true } },
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
      const sold = completedOrders.filter((o) => o.tierId === tier.id).reduce((acc, o) => acc + o.quantity, 0);
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
      passesIssued: completedOrders.reduce((acc, o) => acc + o.passes.length, 0),
      currency: event.tiers[0]?.currency ?? this.stripe.getDefaultCurrency().toUpperCase(),
      byTier,
      orders: completedOrders.map((o) => ({
        id: o.id,
        createdAt: o.createdAt,
        totalCents: o.totalCents,
        currency: o.currency,
        tier: o.tier,
        user: o.user,
        passUsed: o.passes.some((p) => p.usedAt != null),
      })),
    };
  }

  /**
   * Carga la orden, corre las comprobaciones de 404/400/propiedad (mismas que
   * `eventSales`) y arma el `BuyerThankYouInput` del correo de agradecimiento.
   * Compartido por `sendThankYouEmail` (envía) y `previewThankYouEmail` (no
   * envía, solo renderiza) para no duplicar la carga ni las validaciones.
   */
  private async buildThankYouInput(
    eventId: string,
    orderId: string,
    user: AuthUser,
  ): Promise<{ input: BuyerThankYouInput; email: string }> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: { select: { name: true, email: true } },
        event: {
          select: {
            id: true,
            title: true,
            startsAt: true,
            venue: { include: { owners: { select: { userId: true } } } },
            promoter: { include: { members: { select: { userId: true } } } },
          },
        },
        tier: { select: { name: true } },
      },
    });
    if (!order) throw new NotFoundException('Orden no encontrada');

    if (order.event.id !== eventId) {
      throw new BadRequestException('La orden no pertenece a este evento');
    }

    // Misma comprobación de propiedad que eventSales.
    if (user.role !== Role.ADMIN) {
      const isVenueOwner =
        order.event.venue?.owners.some((o) => o.userId === user.id) ?? false;
      const isPromoterMember =
        order.event.promoter?.members.some((m) => m.userId === user.id) ?? false;
      if (!isVenueOwner && !isPromoterMember) {
        throw new ForbiddenException('No tienes acceso a este evento');
      }
    }

    if (order.status !== OrderStatus.COMPLETED) {
      throw new BadRequestException(
        'Solo se puede enviar el agradecimiento de órdenes completadas',
      );
    }

    const appUrl =
      this.config.get<string>('ADMIN_WEB_URL') ?? 'http://localhost:7100';
    const totalFormatted = `$${(order.totalCents / 100).toLocaleString('es-MX', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${order.currency}`;

    const firstName = (order.user.name ?? '').trim().split(/\s+/)[0] ?? '';
    const eventDateLabel = new Intl.DateTimeFormat('es-MX', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'America/Mexico_City',
    }).format(order.event.startsAt);

    // Imagen tipo invitación/flex (FOMO), no recibo: nombre + evento + tier.
    const methodLabel =
      order.paymentMethod === 'STRIPE' ? 'Tarjeta' : 'Efectivo';
    const storyCardUrl = this.buildStoryCardUrl({
      n: firstName,
      e: order.event.title,
      d: eventDateLabel,
      t: order.tier.name,
      m: methodLabel,
    });

    const input: BuyerThankYouInput = {
      buyerName: order.user.name ?? 'cliente',
      eventTitle: order.event.title,
      tierName: order.tier.name,
      quantity: order.quantity,
      totalFormatted,
      appUrl,
      storyCardUrl,
      eventDateLabel,
    };

    return { input, email: order.user.email };
  }

  /**
   * Arma el link firmado del email que descarga el PNG de historia de Instagram.
   * El front construye la imagen; aquí solo se codifica y firma el payload.
   *
   *   ${ADMIN_WEB_URL}/api/historia?d=<payloadB64>&s=<sig>
   *
   * - payloadB64 = base64url de JSON.stringify(payload).
   * - sig = HMAC-SHA256 hex del EXACTO payloadB64, con key = STORY_CARD_SECRET
   *   (o JWT_ACCESS_SECRET como fallback si no está configurada).
   */
  private buildStoryCardUrl(payload: {
    n: string;
    e: string;
    d: string;
    t: string;
    m: string;
  }): string {
    const appUrl =
      this.config.get<string>('ADMIN_WEB_URL') ?? 'http://localhost:7100';
    const secret =
      this.config.get<string>('STORY_CARD_SECRET') ??
      this.config.get<string>('JWT_ACCESS_SECRET') ??
      '';

    const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const sig = crypto
      .createHmac('sha256', secret)
      .update(payloadB64)
      .digest('hex');

    // v: cache-bust. Sube este número si cambia el diseño de la imagen para
    // invalidar copias viejas que el navegador haya cacheado.
    return `${appUrl}/api/historia?d=${payloadB64}&s=${sig}&v=5`;
  }

  /**
   * Envía al comprador un correo de agradecimiento por su compra.
   * Misma autorización que `eventSales`: ADMIN o dueño del local / miembro
   * del promoter al que pertenece el evento.
   */
  async sendThankYouEmail(eventId: string, orderId: string, user: AuthUser) {
    const { input, email } = await this.buildThankYouInput(
      eventId,
      orderId,
      user,
    );

    await this.mailer.sendBuyerThankYou(email, input);

    return { status: 'sent' as const, email };
  }

  /**
   * Renderiza el correo de agradecimiento SIN enviarlo, para que el frontend
   * muestre una vista previa antes de confirmar. Misma autorización y
   * validaciones que `sendThankYouEmail`.
   */
  async previewThankYouEmail(eventId: string, orderId: string, user: AuthUser) {
    const { input, email } = await this.buildThankYouInput(
      eventId,
      orderId,
      user,
    );

    const tpl = buyerThankYouEmail(input);

    return {
      subject: tpl.subject,
      html: tpl.html,
      email,
      storyCardUrl: input.storyCardUrl,
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

  /**
   * Marca FAILED y cancela en Stripe todas las órdenes PENDING del user para un
   * evento dado. Se llama al iniciar un nuevo checkout: las PENDING previas son
   * irrecuperables (no hay forma de retomarlas tras salir de la pantalla de
   * pago), así que se colapsan para que no bloqueen el cupo ni permitan pagar
   * dos órdenes a la vez. Best-effort: los errores solo se loguean.
   */
  private async failPendingOrdersForEvent(
    userId: string,
    eventId: string,
  ): Promise<void> {
    const pending = await this.prisma.order.findMany({
      where: { userId, eventId, status: OrderStatus.PENDING },
      select: { id: true, stripePaymentIntentId: true },
    });
    if (pending.length === 0) return;

    for (const order of pending) {
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
          `Fail PENDING Order ${order.id} falló: ${(err as Error).message}`,
        );
      }
    }
  }
}
