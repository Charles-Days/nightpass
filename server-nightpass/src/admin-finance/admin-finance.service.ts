import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  OrderStatus,
  PaymentMethod,
  PromoterStatus,
  RpCommissionType,
  VenueStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FinanceQueryDto } from './dto/finance-query.dto';

const DEFAULT_RANGE_DAYS = 30;

// Estimated Stripe processing fee for MXN (no env var — hardcoded estimate).
const STRIPE_PCT = 3.6; // 3.6% of gross
const STRIPE_FIXED_CENTS = 300; // $3 MXN fixed per order

interface ResolvedRange {
  from: Date;
  to: Date;
}

@Injectable()
export class AdminFinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private resolveRange(query: FinanceQueryDto): ResolvedRange {
    const to = query.to ? new Date(query.to) : new Date();
    const from = query.from
      ? new Date(query.from)
      : new Date(to.getTime() - DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000);
    return { from, to };
  }

  async getStats(query: FinanceQueryDto) {
    const { from, to } = this.resolveRange(query);

    const completedWhere = {
      status: OrderStatus.COMPLETED,
      paymentMethod: PaymentMethod.STRIPE,
      createdAt: { gte: from, lte: to },
    } as const;
    const passWhere = {
      order: { paymentMethod: PaymentMethod.STRIPE },
      createdAt: { gte: from, lte: to },
    } as const;

    const [
      completedAgg,
      refundedAgg,
      failedCount,
      rawPassesSold,
      passesRedeemed,
      byEventRaw,
      dailySeries,
      topVenuesRaw,
      topPromotersRaw,
    ] = await this.prisma.$transaction([
      this.prisma.order.aggregate({
        where: completedWhere,
        _sum: { totalCents: true, applicationFeeCents: true },
        _count: true,
      }),
      this.prisma.order.aggregate({
        where: {
          status: OrderStatus.REFUNDED,
          paymentMethod: PaymentMethod.STRIPE,
          createdAt: { gte: from, lte: to },
        },
        _sum: { totalCents: true },
        _count: true,
      }),
      this.prisma.order.count({
        where: {
          status: OrderStatus.FAILED,
          paymentMethod: PaymentMethod.STRIPE,
          createdAt: { gte: from, lte: to },
        },
      }),
      this.prisma.pass.count({ where: passWhere }),
      this.prisma.pass.count({
        where: { ...passWhere, usedAt: { not: null } },
      }),
      this.prisma.order.groupBy({
        by: ['eventId'],
        where: completedWhere,
        _sum: { totalCents: true, applicationFeeCents: true },
        _count: true,
        orderBy: { eventId: 'asc' },
      }),
      this.prisma.$queryRaw<
        Array<{ day: Date; sales: number; gross: number; platformFee: number }>
      >`
        SELECT DATE(o."createdAt" AT TIME ZONE 'America/Mexico_City') as day,
               COUNT(*)::int as sales,
               COALESCE(SUM(o."totalCents"), 0)::int as gross,
               COALESCE(SUM(o."applicationFeeCents"), 0)::int as "platformFee"
        FROM orders o
        WHERE o.status = 'COMPLETED'
          AND o."paymentMethod" = 'STRIPE'
          AND o."createdAt" >= ${from}
          AND o."createdAt" <= ${to}
        GROUP BY DATE(o."createdAt" AT TIME ZONE 'America/Mexico_City')
        ORDER BY day ASC
      `,
      this.prisma.$queryRaw<
        Array<{
          venueId: string;
          name: string;
          gross: number;
          platformFee: number;
          ordersCount: number;
        }>
      >`
        SELECT v.id as "venueId",
               v.name as name,
               COALESCE(SUM(o."totalCents"), 0)::int as gross,
               COALESCE(SUM(o."applicationFeeCents"), 0)::int as "platformFee",
               COUNT(*)::int as "ordersCount"
        FROM orders o
        JOIN events e ON e.id = o."eventId"
        JOIN venues v ON v.id = e."venueId"
        WHERE o.status = 'COMPLETED'
          AND o."paymentMethod" = 'STRIPE'
          AND o."createdAt" >= ${from}
          AND o."createdAt" <= ${to}
        GROUP BY v.id, v.name
        ORDER BY gross DESC
        LIMIT 10
      `,
      this.prisma.$queryRaw<
        Array<{
          promoterId: string;
          name: string;
          gross: number;
          platformFee: number;
          ordersCount: number;
        }>
      >`
        SELECT p.id as "promoterId",
               p.name as name,
               COALESCE(SUM(o."totalCents"), 0)::int as gross,
               COALESCE(SUM(o."applicationFeeCents"), 0)::int as "platformFee",
               COUNT(*)::int as "ordersCount"
        FROM orders o
        JOIN events e ON e.id = o."eventId"
        JOIN promoters p ON p.id = e."promoterId"
        WHERE o.status = 'COMPLETED'
          AND o."paymentMethod" = 'STRIPE'
          AND o."createdAt" >= ${from}
          AND o."createdAt" <= ${to}
        GROUP BY p.id, p.name
        ORDER BY gross DESC
        LIMIT 10
      `,
    ]);

    // Efectivo: solo los CLAIMED son venta/ingreso real. Los PENDING (vale
    // emitido y no reclamado) NO cuentan como vendidos — son "pendiente de cobro".
    const [claimedAgg, pendingAgg] = await Promise.all([
      this.prisma.passClaim.aggregate({
        where: { status: 'CLAIMED', createdAt: { gte: from, lte: to } },
        _sum: { amountCents: true },
        _count: true,
      }),
      this.prisma.passClaim.aggregate({
        where: { status: 'PENDING', createdAt: { gte: from, lte: to } },
        _sum: { amountCents: true },
        _count: true,
      }),
    ]);
    const passesSoldAdmin = claimedAgg._count;
    const revenueAdmin = claimedAgg._sum.amountCents ?? 0;
    const passesPendingAdmin = pendingAgg._count;
    const revenuePendingAdmin = pendingAgg._sum.amountCents ?? 0;
    const passesSold = rawPassesSold;

    // Pases en efectivo canjeados (reclamados y luego escaneados en puerta).
    const passesRedeemedAdmin = await this.prisma.pass.count({
      where: {
        order: { paymentMethod: { in: [PaymentMethod.CASH, PaymentMethod.COMP] } },
        usedAt: { not: null },
        createdAt: { gte: from, lte: to },
      },
    });

    // ─── Totals ──────────────────────────────────────────────────────────────
    const grossCents = completedAgg._sum.totalCents ?? 0;
    const platformFeeCents = completedAgg._sum.applicationFeeCents ?? 0;
    const ordersCount = completedAgg._count;
    const stripeFeeEstCents =
      Math.round(grossCents * (STRIPE_PCT / 100)) +
      ordersCount * STRIPE_FIXED_CENTS;
    const netToVenuesCents = Math.max(
      grossCents - platformFeeCents - stripeFeeEstCents,
      0,
    );
    const refundedCount = refundedAgg._count;
    const refundedAmountCents = refundedAgg._sum.totalCents ?? 0;
    // Tasa de canje combinada (App + Efectivo).
    const totalSoldAll = passesSold + passesSoldAdmin;
    const redeemRate =
      totalSoldAll > 0 ? (passesRedeemed + passesRedeemedAdmin) / totalSoldAll : 0;
    const avgTicketCents =
      ordersCount > 0 ? Math.round(grossCents / ordersCount) : 0;

    // ─── byEvent ─────────────────────────────────────────────────────────────
    // Vales en efectivo por evento — sin filtrar por eventIds, para capturar
    // eventos vendidos SOLO en efectivo (antes desaparecían de la tabla porque
    // la lista se armaba únicamente de las órdenes Stripe).
    // Agrupa por evento Y estado: solo CLAIMED es venta real; PENDING es
    // "pendiente de cobro". Mantiene ambos para que el evento aparezca aunque
    // solo tenga vales pendientes.
    const cashByEvent = await this.prisma.passClaim.groupBy({
      by: ['eventId', 'status'],
      where: {
        status: { in: ['PENDING', 'CLAIMED'] },
        createdAt: { gte: from, lte: to },
      },
      _sum: { amountCents: true },
      _count: true,
    });
    const eventIds = Array.from(
      new Set([
        ...byEventRaw.map((row) => row.eventId),
        ...cashByEvent.map((row) => row.eventId),
      ]),
    );
    const eventsMeta = eventIds.length
      ? await this.prisma.event.findMany({
          where: { id: { in: eventIds } },
          select: {
            id: true,
            title: true,
            startsAt: true,
            capacity: true,
            venue: { select: { name: true } },
            promoter: { select: { name: true } },
          },
        })
      : [];
    const eventsById = new Map(eventsMeta.map((e) => [e.id, e]));

    const passesSoldByEvent = eventIds.length
      ? await this.prisma.pass.groupBy({
          by: ['eventId'],
          where: { eventId: { in: eventIds }, order: { paymentMethod: PaymentMethod.STRIPE } },
          _count: true,
        })
      : [];
    const soldById = new Map(passesSoldByEvent.map((r) => [r.eventId, r._count]));
    // CLAIMED = vendido en efectivo; PENDING = pendiente de cobro. Por evento.
    const soldAdminById = new Map<string, number>();
    const revenueAdminById = new Map<string, number>();
    const pendingAdminById = new Map<string, number>();
    const revenuePendingAdminById = new Map<string, number>();
    for (const r of cashByEvent) {
      if (r.status === 'CLAIMED') {
        soldAdminById.set(r.eventId, r._count);
        revenueAdminById.set(r.eventId, r._sum.amountCents ?? 0);
      } else {
        pendingAdminById.set(r.eventId, r._count);
        revenuePendingAdminById.set(r.eventId, r._sum.amountCents ?? 0);
      }
    }
    const stripeById = new Map(byEventRaw.map((r) => [r.eventId, r]));

    const redeemedByEvent = eventIds.length
      ? await this.prisma.pass.groupBy({
          by: ['eventId'],
          where: { eventId: { in: eventIds }, usedAt: { not: null } },
          _count: true,
        })
      : [];
    const redeemedById = new Map(
      redeemedByEvent.map((r) => [r.eventId, r._count]),
    );

    const byEvent = eventIds
      .map((eventId) => {
        const meta = eventsById.get(eventId);
        const stripe = stripeById.get(eventId);
        const venueName =
          meta?.venue?.name ?? meta?.promoter?.name ?? null;
        return {
          eventId,
          title: meta?.title ?? '',
          startsAt: meta?.startsAt ? meta.startsAt.toISOString() : null,
          venueName,
          capacity: meta?.capacity ?? null,
          vendidos: soldById.get(eventId) ?? 0,
          vendidosAdmin: soldAdminById.get(eventId) ?? 0,
          ingresosAdmin: revenueAdminById.get(eventId) ?? 0,
          pendientesAdmin: pendingAdminById.get(eventId) ?? 0,
          ingresosPendientes: revenuePendingAdminById.get(eventId) ?? 0,
          canjeados: redeemedById.get(eventId) ?? 0,
          grossCents: stripe?._sum?.totalCents ?? 0,
          platformFeeCents: stripe?._sum?.applicationFeeCents ?? 0,
          ordersCount: stripe?._count ?? 0,
        };
      })
      .sort((a, b) => b.grossCents + b.ingresosAdmin - (a.grossCents + a.ingresosAdmin));

    // ─── topVenues / topPromoters ──────────────────────────────────────────────
    const topVenues = topVenuesRaw.map((row) => ({
      venueId: row.venueId,
      name: row.name,
      grossCents: Number(row.gross) || 0,
      platformFeeCents: Number(row.platformFee) || 0,
      ordersCount: Number(row.ordersCount) || 0,
    }));
    const topPromoters = topPromotersRaw.map((row) => ({
      promoterId: row.promoterId,
      name: row.name,
      grossCents: Number(row.gross) || 0,
      platformFeeCents: Number(row.platformFee) || 0,
      ordersCount: Number(row.ordersCount) || 0,
    }));

    // ─── RP commissions (platform-wide) ────────────────────────────────────────
    const { rpCommissionsCents, topRps } = await this.computeRpCommissions(
      from,
      to,
    );

    // ─── Stripe health ─────────────────────────────────────────────────────────
    const [
      venuesTotal,
      venuesConnected,
      promotersTotal,
      promotersConnected,
    ] = await this.prisma.$transaction([
      this.prisma.venue.count({ where: { status: VenueStatus.ACTIVE } }),
      this.prisma.venue.count({
        where: {
          status: VenueStatus.ACTIVE,
          stripeAccount: { chargesEnabled: true },
        },
      }),
      this.prisma.promoter.count({ where: { status: PromoterStatus.ACTIVE } }),
      this.prisma.promoter.count({
        where: {
          status: PromoterStatus.ACTIVE,
          stripeAccount: { chargesEnabled: true },
        },
      }),
    ]);

    const platformFeePctDefault =
      this.config.get<number>('STRIPE_PLATFORM_FEE_PCT') ?? 8;

    return {
      range: { from: from.toISOString(), to: to.toISOString() },
      totals: {
        grossCents,
        platformFeeCents,
        stripeFeeEstCents,
        netToVenuesCents,
        rpCommissionsCents,
        ordersCount,
        passesSold,
        passesRedeemed,
        passesRedeemedAdmin,
        redeemRate,
        refundedCount,
        refundedAmountCents,
        failedCount,
        avgTicketCents,
        passesSoldAdmin,
        revenueAdmin,
        passesPendingAdmin,
        revenuePendingAdmin,
      },
      byEvent,
      topVenues,
      topPromoters,
      topRps,
      dailySeries: dailySeries.map((row) => ({
        day:
          row.day instanceof Date
            ? row.day.toISOString().slice(0, 10)
            : String(row.day).slice(0, 10),
        sales: Number(row.sales) || 0,
        grossCents: Number(row.gross) || 0,
        platformFeeCents: Number(row.platformFee) || 0,
      })),
      stripeHealth: {
        venuesConnected,
        venuesTotal,
        promotersConnected,
        promotersTotal,
      },
      feeAssumptions: {
        stripePct: STRIPE_PCT,
        stripeFixedCents: STRIPE_FIXED_CENTS,
        platformFeePctDefault,
      },
    };
  }

  // ─── Detalle de un evento (drilldown del dashboard) ────────────────────────

  /**
   * Toda la info posible de un evento para el modal del admin: organizador,
   * desglose tarjeta/efectivo, por tier, por RP, serie diaria y órdenes
   * recientes. Sin rango — siempre histórico completo del evento.
   */
  async getEventDetail(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        tiers: { orderBy: { priceCents: 'asc' } },
        venue: { select: { name: true, city: true } },
        promoter: { select: { name: true } },
      },
    });
    if (!event) throw new NotFoundException('Evento no encontrado');

    const [completedOrders, claims] = await Promise.all([
      this.prisma.order.findMany({
        where: { eventId, status: OrderStatus.COMPLETED },
        select: {
          id: true,
          createdAt: true,
          totalCents: true,
          applicationFeeCents: true,
          paymentMethod: true,
          tier: { select: { id: true, name: true } },
          user: { select: { name: true, email: true } },
          passes: { select: { usedAt: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.passClaim.findMany({
        where: { eventId, status: { in: ['PENDING', 'CLAIMED'] } },
        select: {
          tierId: true,
          amountCents: true,
          status: true,
          createdAt: true,
          issuedByRp: {
            select: { id: true, rpCode: true, displayName: true },
          },
        },
      }),
    ]);

    const isCard = (m: PaymentMethod) => m === PaymentMethod.STRIPE;
    const cardOrders = completedOrders.filter((o) => isCard(o.paymentMethod));
    const cashOrders = completedOrders.filter((o) => !isCard(o.paymentMethod));

    // ── Resumen ──────────────────────────────────────────────────────────────
    // Efectivo: solo CLAIMED es venta/ingreso real; PENDING = pendiente de cobro.
    const claimedClaims = claims.filter((c) => c.status === 'CLAIMED');
    const pendingClaims = claims.filter((c) => c.status === 'PENDING');
    const soldCard = cardOrders.reduce((acc, o) => acc + o.passes.length, 0);
    const soldCash = claimedClaims.length;
    const revenueCardCents = cardOrders.reduce((acc, o) => acc + o.totalCents, 0);
    const revenueCashCents = claimedClaims.reduce((acc, c) => acc + c.amountCents, 0);
    const pendingCash = pendingClaims.length;
    const pendingCashCents = pendingClaims.reduce((acc, c) => acc + c.amountCents, 0);
    const feesCents = cardOrders.reduce((acc, o) => acc + o.applicationFeeCents, 0);
    const countUsed = (orders: typeof cardOrders) =>
      orders.reduce((acc, o) => acc + o.passes.filter((p) => p.usedAt != null).length, 0);
    const redeemedCard = countUsed(cardOrders);
    const redeemedCash = countUsed(cashOrders);
    const cashClaimed = claimedClaims.length;
    const cashPending = pendingClaims.length;

    const soldTotal = soldCard + soldCash;
    const redeemedTotal = redeemedCard + redeemedCash;

    // ── Por tier ─────────────────────────────────────────────────────────────
    const cardByTier = new Map<string, number>();
    for (const o of cardOrders) {
      if (o.tier) cardByTier.set(o.tier.id, (cardByTier.get(o.tier.id) ?? 0) + o.passes.length);
    }
    // Por tier solo cuenta efectivo CLAIMED (vendido real).
    const cashByTier = new Map<string, number>();
    const cashRevByTier = new Map<string, number>();
    for (const c of claimedClaims) {
      cashByTier.set(c.tierId, (cashByTier.get(c.tierId) ?? 0) + 1);
      cashRevByTier.set(c.tierId, (cashRevByTier.get(c.tierId) ?? 0) + c.amountCents);
    }
    const cardRevByTier = new Map<string, number>();
    for (const o of cardOrders) {
      if (o.tier) cardRevByTier.set(o.tier.id, (cardRevByTier.get(o.tier.id) ?? 0) + o.totalCents);
    }
    const byTier = event.tiers.map((t) => {
      const card = cardByTier.get(t.id) ?? 0;
      const cash = cashByTier.get(t.id) ?? 0;
      return {
        tierId: t.id,
        name: t.name,
        priceCents: t.priceCents,
        capacity: t.capacity,
        soldCard: card,
        soldCash: cash,
        soldTotal: card + cash,
        revenueCents: (cardRevByTier.get(t.id) ?? 0) + (cashRevByTier.get(t.id) ?? 0),
      };
    });

    // ── Por método de pago (donut) ───────────────────────────────────────────
    const byMethod = [
      { method: 'Tarjeta', count: soldCard, revenueCents: revenueCardCents },
      { method: 'Efectivo', count: soldCash, revenueCents: revenueCashCents },
    ];

    // ── Por RP (vales en efectivo) ───────────────────────────────────────────
    // `count`/`revenueCents` = EMITIDOS (PENDING + CLAIMED). `claimedCount`/
    // `claimedRevenueCents` = los que un cliente ya RECLAMÓ (venta real).
    const rpAgg = new Map<
      string,
      {
        rpId: string;
        name: string;
        rpCode: string;
        count: number;
        revenueCents: number;
        claimedCount: number;
        claimedRevenueCents: number;
      }
    >();
    for (const c of claims) {
      if (!c.issuedByRp) continue;
      const key = c.issuedByRp.id;
      const prev =
        rpAgg.get(key) ?? {
          rpId: key,
          name: c.issuedByRp.displayName ?? 'RP',
          rpCode: c.issuedByRp.rpCode,
          count: 0,
          revenueCents: 0,
          claimedCount: 0,
          claimedRevenueCents: 0,
        };
      prev.count += 1;
      prev.revenueCents += c.amountCents;
      if (c.status === 'CLAIMED') {
        prev.claimedCount += 1;
        prev.claimedRevenueCents += c.amountCents;
      }
      rpAgg.set(key, prev);
    }
    const byRp = Array.from(rpAgg.values()).sort((a, b) => b.count - a.count);

    // ── Serie diaria (tarjeta vs efectivo) ───────────────────────────────────
    const dayMap = new Map<string, { card: number; cash: number; revenueCents: number }>();
    const bump = (date: Date, kind: 'card' | 'cash', cents: number) => {
      const day = date.toISOString().slice(0, 10);
      const prev = dayMap.get(day) ?? { card: 0, cash: 0, revenueCents: 0 };
      prev[kind] += 1;
      prev.revenueCents += cents;
      dayMap.set(day, prev);
    };
    for (const o of cardOrders) bump(o.createdAt, 'card', o.totalCents);
    for (const c of claims) bump(c.createdAt, 'cash', c.amountCents);
    const daily = Array.from(dayMap.entries())
      .map(([day, v]) => ({ day, ...v }))
      .sort((a, b) => a.day.localeCompare(b.day));

    // ── Órdenes recientes (tarjeta + efectivo) ───────────────────────────────
    const recentOrders = completedOrders.slice(0, 40).map((o) => ({
      id: o.id,
      createdAt: o.createdAt.toISOString(),
      method: isCard(o.paymentMethod) ? 'Tarjeta' : 'Efectivo',
      totalCents: o.totalCents,
      tierName: o.tier?.name ?? '—',
      userName: o.user?.name ?? null,
      userEmail: o.user?.email ?? '—',
      redeemed: o.passes.some((p) => p.usedAt != null),
    }));

    return {
      event: {
        id: event.id,
        title: event.title,
        startsAt: event.startsAt.toISOString(),
        endsAt: event.endsAt ? event.endsAt.toISOString() : null,
        status: event.status,
        capacity: event.capacity,
        coverImageUrl: event.coverImageUrl ?? null,
        organizerName: event.venue?.name ?? event.promoter?.name ?? '—',
        organizerType: event.venue ? 'venue' : event.promoter ? 'promoter' : null,
        city: event.venue?.city ?? null,
      },
      summary: {
        soldTotal,
        soldCard,
        soldCash,
        revenueTotalCents: revenueCardCents + revenueCashCents,
        revenueCardCents,
        revenueCashCents,
        feesCents,
        redeemedTotal,
        redeemedCard,
        redeemedCash,
        redeemRate: soldTotal > 0 ? redeemedTotal / soldTotal : 0,
        cashClaimed,
        cashPending,
        pendingCash,
        pendingCashCents,
        ordersCount: completedOrders.length,
        fillRate: event.capacity ? soldTotal / event.capacity : null,
      },
      byTier,
      byMethod,
      byRp,
      daily,
      recentOrders,
    };
  }

  /**
   * Reusa la matemática de comisiones de rp.service.ts (getStats) pero a nivel
   * plataforma: para cada RP con órdenes COMPLETED en el rango, aplica la regla
   * por evento (o la regla global del RP como fallback) y suma.
   * - PERCENTAGE:     volumen * percentage / 100
   * - PER_N_TICKETS:  floor(count / nTickets) * rewardCents
   */
  private async computeRpCommissions(from: Date, to: Date) {
    const orders = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.COMPLETED,
        createdAt: { gte: from, lte: to },
        referredByRpId: { not: null },
      },
      select: {
        eventId: true,
        totalCents: true,
        referredByRpId: true,
      },
    });

    if (orders.length === 0) {
      return { rpCommissionsCents: 0, topRps: [] as Array<{
        rpId: string;
        displayName: string;
        rpCode: string;
        salesCount: number;
        earningsCents: number;
      }> };
    }

    const rpIds = Array.from(
      new Set(orders.map((o) => o.referredByRpId).filter((id): id is string => !!id)),
    );

    const [rules, profiles] = await this.prisma.$transaction([
      this.prisma.rpCommissionRule.findMany({
        where: { rpProfileId: { in: rpIds }, isActive: true },
        select: {
          rpProfileId: true,
          eventId: true,
          type: true,
          nTickets: true,
          rewardCents: true,
          percentage: true,
        },
      }),
      this.prisma.rpProfile.findMany({
        where: { id: { in: rpIds } },
        select: { id: true, displayName: true, rpCode: true },
      }),
    ]);

    const profileById = new Map(profiles.map((p) => [p.id, p]));

    // rules[rpId] -> { byEvent: Map<eventId, rule>, global: rule|null }
    type Rule = (typeof rules)[number];
    const rulesByRp = new Map<
      string,
      { byEvent: Map<string, Rule>; global: Rule | null }
    >();
    for (const rule of rules) {
      let entry = rulesByRp.get(rule.rpProfileId);
      if (!entry) {
        entry = { byEvent: new Map(), global: null };
        rulesByRp.set(rule.rpProfileId, entry);
      }
      if (rule.eventId === null) {
        entry.global = rule;
      } else {
        entry.byEvent.set(rule.eventId, rule);
      }
    }

    // Agrupa órdenes por rp + evento para aplicar las reglas como en rp.service.
    // grouped[rpId][eventId] = { count, volume }
    const grouped = new Map<
      string,
      Map<string, { count: number; volume: number }>
    >();
    for (const order of orders) {
      const rpId = order.referredByRpId as string;
      let byEvent = grouped.get(rpId);
      if (!byEvent) {
        byEvent = new Map();
        grouped.set(rpId, byEvent);
      }
      const cell = byEvent.get(order.eventId) ?? { count: 0, volume: 0 };
      cell.count += 1;
      cell.volume += order.totalCents;
      byEvent.set(order.eventId, cell);
    }

    const perRp: Array<{
      rpId: string;
      displayName: string;
      rpCode: string;
      salesCount: number;
      earningsCents: number;
    }> = [];
    let rpCommissionsCents = 0;

    for (const [rpId, byEvent] of grouped) {
      const rpRules = rulesByRp.get(rpId);
      const globalRule = rpRules?.global ?? null;
      let earningsCents = 0;
      let salesCount = 0;

      for (const [eventId, cell] of byEvent) {
        salesCount += cell.count;
        const rule = rpRules?.byEvent.get(eventId) ?? globalRule;
        if (!rule) continue;

        if (rule.type === RpCommissionType.PERCENTAGE && rule.percentage) {
          earningsCents += Math.round(cell.volume * (rule.percentage / 100));
        } else if (
          rule.type === RpCommissionType.PER_N_TICKETS &&
          rule.nTickets &&
          rule.rewardCents
        ) {
          const cycles = Math.floor(cell.count / rule.nTickets);
          earningsCents += cycles * rule.rewardCents;
        }
      }

      rpCommissionsCents += earningsCents;
      const profile = profileById.get(rpId);
      perRp.push({
        rpId,
        displayName: profile?.displayName ?? '',
        rpCode: profile?.rpCode ?? '',
        salesCount,
        earningsCents,
      });
    }

    const topRps = perRp
      .sort((a, b) => b.earningsCents - a.earningsCents)
      .slice(0, 10);

    return { rpCommissionsCents, topRps };
  }
}
