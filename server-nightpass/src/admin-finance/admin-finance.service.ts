import { Injectable } from '@nestjs/common';
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

    const adminClaims = await this.prisma.passClaim.aggregate({
      where: {
        status: { in: ['PENDING', 'CLAIMED'] },
        createdAt: { gte: from, lte: to },
      },
      _sum: { amountCents: true },
      _count: true,
    });
    const passesSoldAdmin = adminClaims._count;
    const revenueAdmin = adminClaims._sum.amountCents ?? 0;
    const passesSold = rawPassesSold;

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
    const redeemRate = passesSold > 0 ? passesRedeemed / passesSold : 0;
    const avgTicketCents =
      ordersCount > 0 ? Math.round(grossCents / ordersCount) : 0;

    // ─── byEvent ─────────────────────────────────────────────────────────────
    const eventIds = byEventRaw.map((row) => row.eventId);
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
    const pendingClaimsByEvent = eventIds.length
      ? await this.prisma.passClaim.groupBy({
          by: ['eventId'],
          where: { eventId: { in: eventIds }, status: { in: ['PENDING', 'CLAIMED'] } },
          _sum: { amountCents: true },
          _count: true,
        })
      : [];
    const soldById = new Map(passesSoldByEvent.map((r) => [r.eventId, r._count]));
    const soldAdminById = new Map(pendingClaimsByEvent.map((r) => [r.eventId, r._count]));
    const revenueAdminById = new Map(pendingClaimsByEvent.map((r) => [r.eventId, r._sum.amountCents ?? 0]));

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

    const byEvent = byEventRaw
      .map((row) => {
        const meta = eventsById.get(row.eventId);
        const venueName =
          meta?.venue?.name ?? meta?.promoter?.name ?? null;
        return {
          eventId: row.eventId,
          title: meta?.title ?? '',
          startsAt: meta?.startsAt ? meta.startsAt.toISOString() : null,
          venueName,
          capacity: meta?.capacity ?? null,
          vendidos: soldById.get(row.eventId) ?? 0,
          vendidosAdmin: soldAdminById.get(row.eventId) ?? 0,
          ingresosAdmin: revenueAdminById.get(row.eventId) ?? 0,
          canjeados: redeemedById.get(row.eventId) ?? 0,
          grossCents: row._sum?.totalCents ?? 0,
          platformFeeCents: row._sum?.applicationFeeCents ?? 0,
          ordersCount: row._count,
        };
      })
      .sort((a, b) => b.grossCents - a.grossCents);

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
        redeemRate,
        refundedCount,
        refundedAmountCents,
        failedCount,
        avgTicketCents,
        passesSoldAdmin,
        revenueAdmin,
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
