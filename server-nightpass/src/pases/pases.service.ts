import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OrderStatus,
  PassClaimStatus,
  PaymentMethod,
  PromoterMemberRole,
  Role,
  VenueStaffStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { OrdersService } from '../orders/orders.service';
import { PasesQueryDto } from './dto/pases-query.dto';
import { ExportCsvQueryDto } from './dto/export-csv-query.dto';
import { toCsv } from './helpers/csv';

const DEFAULT_RANGE_DAYS = 30;

interface ResolvedRange {
  from: Date;
  to: Date;
}

@Injectable()
export class PasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
  ) {}

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private resolveRange(query: PasesQueryDto): ResolvedRange {
    const to = query.to ? new Date(query.to) : new Date();
    const from = query.from
      ? new Date(query.from)
      : new Date(to.getTime() - DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000);
    return { from, to };
  }

  private async assertVenueAccess(
    venueId: string,
    user: AuthUser,
  ): Promise<void> {
    if (user.role === Role.ADMIN) return;

    if (user.role === Role.VENUE_OWNER) {
      const link = await this.prisma.venueOwner.findUnique({
        where: { userId_venueId: { userId: user.id, venueId } },
        select: { userId: true },
      });
      if (!link) {
        throw new ForbiddenException('No tienes acceso a este local');
      }
      return;
    }

    if (user.role === Role.VENUE_STAFF) {
      const staff = await this.prisma.venueStaff.findUnique({
        where: { venueId_userId: { venueId, userId: user.id } },
        select: { status: true },
      });
      if (!staff || staff.status === VenueStaffStatus.REVOKED) {
        throw new ForbiddenException('No tienes acceso a este local');
      }
      return;
    }

    throw new ForbiddenException('No tienes acceso a este local');
  }

  private async assertPromoterAccess(
    promoterId: string,
    user: AuthUser,
  ): Promise<void> {
    if (user.role === Role.ADMIN) return;

    if (user.role === Role.PROMOTER || user.role === Role.PROMOTER_STAFF) {
      const link = await this.prisma.promoterMember.findUnique({
        where: { userId_promoterId: { userId: user.id, promoterId } },
        select: { role: true },
      });
      if (!link) {
        throw new ForbiddenException('No tienes acceso a este organizador');
      }
      // PROMOTER role en JWT requiere ser OWNER del membership;
      // PROMOTER_STAFF requiere ser STAFF (cualquiera basta).
      if (
        user.role === Role.PROMOTER &&
        link.role !== PromoterMemberRole.OWNER
      ) {
        throw new ForbiddenException('No tienes acceso a este organizador');
      }
      return;
    }

    throw new ForbiddenException('No tienes acceso a este organizador');
  }

  // ─── Venue stats ───────────────────────────────────────────────────────────

  async getVenueStats(venueId: string, query: PasesQueryDto, user: AuthUser) {
    await this.assertVenueAccess(venueId, user);

    const { from, to } = this.resolveRange(query);
    const venueOrderWhere = {
      event: { venueId },
      status: OrderStatus.COMPLETED,
      paymentMethod: PaymentMethod.STRIPE,
      createdAt: { gte: from, lte: to },
    } as const;
    const venuePassWhere = {
      event: { venueId },
      order: { paymentMethod: PaymentMethod.STRIPE },
      createdAt: { gte: from, lte: to },
    } as const;

    const [revenue, ordersCount, rawPassesSold, passesRedeemed, byEventRaw, dailySeries] =
      await this.prisma.$transaction([
        this.prisma.order.aggregate({
          where: venueOrderWhere,
          _sum: { totalCents: true, applicationFeeCents: true },
          _count: true,
        }),
        this.prisma.order.count({ where: venueOrderWhere }),
        this.prisma.pass.count({ where: venuePassWhere }),
        this.prisma.pass.count({
          where: { ...venuePassWhere, usedAt: { not: null } },
        }),
        this.prisma.order.groupBy({
          by: ['eventId'],
          where: venueOrderWhere,
          _sum: { totalCents: true, applicationFeeCents: true },
          _count: true,
          orderBy: { eventId: 'asc' },
        }),
        this.prisma.$queryRaw<
          Array<{ day: Date; sales: number; revenue: number }>
        >`
          SELECT DATE(o."createdAt") as day,
                 COUNT(*)::int as sales,
                 COALESCE(SUM(o."totalCents"), 0)::int as revenue
          FROM orders o
          JOIN events e ON e.id = o."eventId"
          WHERE e."venueId" = ${venueId}::uuid
            AND o.status = 'COMPLETED'
            AND o."createdAt" >= ${from}
            AND o."createdAt" <= ${to}
          GROUP BY DATE(o."createdAt")
          ORDER BY day ASC
        `,
      ]);

    const adminClaims = await this.prisma.passClaim.aggregate({
      where: {
        event: { venueId },
        status: { in: ['PENDING', 'CLAIMED'] },
        createdAt: { gte: from, lte: to },
      },
      _sum: { amountCents: true },
      _count: true,
    });
    const passesSoldAdmin = adminClaims._count;
    const revenueAdmin = adminClaims._sum.amountCents ?? 0;
    const passesSold = rawPassesSold;

    const eventIds = byEventRaw.map((row) => row.eventId);
    const eventsMeta = eventIds.length
      ? await this.prisma.event.findMany({
          where: { id: { in: eventIds } },
          select: { id: true, title: true, startsAt: true, capacity: true },
        })
      : [];
    const eventsById = new Map(eventsMeta.map((e) => [e.id, e]));

    const redeemedByEvent = eventIds.length
      ? await this.prisma.pass.groupBy({
          by: ['eventId'],
          where: {
            eventId: { in: eventIds },
            usedAt: { not: null },
          },
          _count: true,
        })
      : [];
    const redeemedById = new Map(
      redeemedByEvent.map((r) => [r.eventId, r._count]),
    );

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

    const byEvent = byEventRaw.map((row) => {
      const meta = eventsById.get(row.eventId);
      return {
        eventId: row.eventId,
        title: meta?.title ?? '',
        startsAt: meta?.startsAt ?? null,
        capacity: meta?.capacity ?? null,
        vendidos: soldById.get(row.eventId) ?? 0,
        vendidosAdmin: soldAdminById.get(row.eventId) ?? 0,
        ingresosAdmin: revenueAdminById.get(row.eventId) ?? 0,
        canjeados: redeemedById.get(row.eventId) ?? 0,
        ingresos: row._sum?.totalCents ?? 0,
        fees: row._sum?.applicationFeeCents ?? 0,
        ordersCount: row._count,
      };
    });

    const now = new Date();
    const upcoming = await this.prisma.event.findFirst({
      where: {
        venueId,
        status: 'PUBLISHED',
        startsAt: { gte: now },
      },
      orderBy: { startsAt: 'asc' },
      select: { id: true, title: true, startsAt: true },
    });

    let upcomingEvent: {
      id: string;
      title: string;
      startsAt: Date;
      vendidos: number;
    } | null = null;
    if (upcoming) {
      const vendidosPasses = await this.prisma.pass.count({
        where: { eventId: upcoming.id },
      });
      const vendidosPending = await this.prisma.passClaim.count({
        where: { eventId: upcoming.id, status: 'PENDING' },
      });
      const vendidos = vendidosPasses + vendidosPending;
      upcomingEvent = {
        id: upcoming.id,
        title: upcoming.title,
        startsAt: upcoming.startsAt,
        vendidos,
      };
    }

    const totalRevenue = revenue._sum.totalCents ?? 0;
    const totalFees = revenue._sum.applicationFeeCents ?? 0;
    const passesPending = Math.max(passesSold - passesRedeemed, 0);
    const redeemRate = passesSold > 0 ? passesRedeemed / passesSold : 0;

    return {
      totalRevenue,
      totalFees,
      ordersCount,
      passesSold,
      passesRedeemed,
      passesPending,
      redeemRate,
      upcomingEvent,
      dailySeries: dailySeries.map((row) => ({
        day:
          row.day instanceof Date
            ? row.day.toISOString().slice(0, 10)
            : String(row.day).slice(0, 10),
        sales: Number(row.sales) || 0,
        revenue: Number(row.revenue) || 0,
      })),
      byEvent,
      range: { from: from.toISOString(), to: to.toISOString() },
      passesSoldAdmin,
      revenueAdmin,
    };
  }

  // ─── Promoter stats ────────────────────────────────────────────────────────

  async getPromoterStats(
    promoterId: string,
    query: PasesQueryDto,
    user: AuthUser,
  ) {
    await this.assertPromoterAccess(promoterId, user);

    const { from, to } = this.resolveRange(query);
    const promoterOrderWhere = {
      event: { promoterId },
      status: OrderStatus.COMPLETED,
      paymentMethod: PaymentMethod.STRIPE,
      createdAt: { gte: from, lte: to },
    } as const;
    const promoterPassWhere = {
      event: { promoterId },
      order: { paymentMethod: PaymentMethod.STRIPE },
      createdAt: { gte: from, lte: to },
    } as const;

    const [revenue, ordersCount, rawPassesSold, passesRedeemed, byEventRaw, dailySeries] =
      await this.prisma.$transaction([
        this.prisma.order.aggregate({
          where: promoterOrderWhere,
          _sum: { totalCents: true, applicationFeeCents: true },
          _count: true,
        }),
        this.prisma.order.count({ where: promoterOrderWhere }),
        this.prisma.pass.count({ where: promoterPassWhere }),
        this.prisma.pass.count({
          where: { ...promoterPassWhere, usedAt: { not: null } },
        }),
        this.prisma.order.groupBy({
          by: ['eventId'],
          where: promoterOrderWhere,
          _sum: { totalCents: true, applicationFeeCents: true },
          _count: true,
          orderBy: { eventId: 'asc' },
        }),
        this.prisma.$queryRaw<
          Array<{ day: Date; sales: number; revenue: number }>
        >`
          SELECT DATE(o."createdAt") as day,
                 COUNT(*)::int as sales,
                 COALESCE(SUM(o."totalCents"), 0)::int as revenue
          FROM orders o
          JOIN events e ON e.id = o."eventId"
          WHERE e."promoterId" = ${promoterId}::uuid
            AND o.status = 'COMPLETED'
            AND o."paymentMethod" = 'STRIPE'
            AND o."createdAt" >= ${from}
            AND o."createdAt" <= ${to}
          GROUP BY DATE(o."createdAt")
          ORDER BY day ASC
        `,
      ]);

    const adminClaims = await this.prisma.passClaim.aggregate({
      where: {
        event: { promoterId },
        status: { in: ['PENDING', 'CLAIMED'] },
        createdAt: { gte: from, lte: to },
      },
      _sum: { amountCents: true },
      _count: true,
    });
    const passesSoldAdmin = adminClaims._count;
    const revenueAdmin = adminClaims._sum.amountCents ?? 0;
    const passesSold = rawPassesSold;

    const eventIds = byEventRaw.map((row) => row.eventId);
    const eventsMeta = eventIds.length
      ? await this.prisma.event.findMany({
          where: { id: { in: eventIds } },
          select: { id: true, title: true, startsAt: true, capacity: true },
        })
      : [];
    const eventsById = new Map(eventsMeta.map((e) => [e.id, e]));

    const redeemedByEvent = eventIds.length
      ? await this.prisma.pass.groupBy({
          by: ['eventId'],
          where: {
            eventId: { in: eventIds },
            usedAt: { not: null },
          },
          _count: true,
        })
      : [];
    const redeemedById = new Map(
      redeemedByEvent.map((r) => [r.eventId, r._count]),
    );

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

    const byEvent = byEventRaw.map((row) => {
      const meta = eventsById.get(row.eventId);
      return {
        eventId: row.eventId,
        title: meta?.title ?? '',
        startsAt: meta?.startsAt ?? null,
        capacity: meta?.capacity ?? null,
        vendidos: soldById.get(row.eventId) ?? 0,
        vendidosAdmin: soldAdminById.get(row.eventId) ?? 0,
        ingresosAdmin: revenueAdminById.get(row.eventId) ?? 0,
        canjeados: redeemedById.get(row.eventId) ?? 0,
        ingresos: row._sum?.totalCents ?? 0,
        fees: row._sum?.applicationFeeCents ?? 0,
        ordersCount: row._count,
      };
    });

    const now = new Date();
    const upcoming = await this.prisma.event.findFirst({
      where: {
        promoterId,
        status: 'PUBLISHED',
        startsAt: { gte: now },
      },
      orderBy: { startsAt: 'asc' },
      select: { id: true, title: true, startsAt: true },
    });

    let upcomingEvent: {
      id: string;
      title: string;
      startsAt: Date;
      vendidos: number;
    } | null = null;
    if (upcoming) {
      const vendidosPasses = await this.prisma.pass.count({
        where: { eventId: upcoming.id, order: { paymentMethod: PaymentMethod.STRIPE } },
      });
      const vendidosPending = await this.prisma.passClaim.count({
        where: { eventId: upcoming.id, status: { in: ['PENDING', 'CLAIMED'] } },
      });
      const vendidos = vendidosPasses + vendidosPending;
      upcomingEvent = {
        id: upcoming.id,
        title: upcoming.title,
        startsAt: upcoming.startsAt,
        vendidos,
      };
    }

    const totalRevenue = revenue._sum.totalCents ?? 0;
    const totalFees = revenue._sum.applicationFeeCents ?? 0;
    const passesPending = Math.max(passesSold - passesRedeemed, 0);
    const redeemRate = passesSold > 0 ? passesRedeemed / passesSold : 0;

    return {
      totalRevenue,
      totalFees,
      ordersCount,
      passesSold,
      passesRedeemed,
      passesPending,
      redeemRate,
      upcomingEvent,
      dailySeries: dailySeries.map((row) => ({
        day:
          row.day instanceof Date
            ? row.day.toISOString().slice(0, 10)
            : String(row.day).slice(0, 10),
        sales: Number(row.sales) || 0,
        revenue: Number(row.revenue) || 0,
      })),
      byEvent,
      range: { from: from.toISOString(), to: to.toISOString() },
      passesSoldAdmin,
      revenueAdmin,
    };
  }

  // ─── Event drilldown ───────────────────────────────────────────────────────

  async getEventDrilldown(
    venueId: string,
    eventId: string,
    query: PasesQueryDto,
    user: AuthUser,
  ) {
    await this.assertVenueAccess(venueId, user);

    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, venueId: true },
    });
    if (!event || event.venueId !== venueId) {
      throw new NotFoundException('Evento no encontrado');
    }

    const sales = await this.orders.eventSales(eventId, user);
    const { from, to } = this.resolveRange(query);

    return {
      ...sales,
      range: { from: from.toISOString(), to: to.toISOString() },
    };
  }

  // ─── CSV export ────────────────────────────────────────────────────────────

  async exportCsv(
    venueId: string,
    query: ExportCsvQueryDto,
    user: AuthUser,
  ): Promise<{ filename: string; body: string }> {
    await this.assertVenueAccess(venueId, user);

    const { from, to } = this.resolveRange(query);

    const venue = await this.prisma.venue.findUnique({
      where: { id: venueId },
      select: { slug: true },
    });
    if (!venue) throw new NotFoundException('Local no encontrado');

    const passes = await this.prisma.pass.findMany({
      where: {
        event: { venueId },
        ...(query.eventId ? { eventId: query.eventId } : {}),
        order: { createdAt: { gte: from, lte: to } },
      },
      include: {
        event: { select: { title: true } },
        order: {
          include: { tier: { select: { name: true } } },
        },
        user: { select: { email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const rows = passes.map((p) => ({
      pass_id: p.id,
      order_id: p.orderId,
      evento: p.event.title,
      tier: p.order.tier.name,
      precio_mxn: (p.order.totalCents / 100).toFixed(2),
      comprado_en: p.order.createdAt.toISOString(),
      canjeado_en: p.usedAt ? p.usedAt.toISOString() : '',
      customer_email: p.user.email,
    }));

    const columns = [
      'pass_id',
      'order_id',
      'evento',
      'tier',
      'precio_mxn',
      'comprado_en',
      'canjeado_en',
      'customer_email',
    ];
    const body = toCsv(rows, columns);

    const fromStr = from.toISOString().slice(0, 10);
    const toStr = to.toISOString().slice(0, 10);
    const filename = `ventas-${venue.slug}-${fromStr}-to-${toStr}.csv`;

    return { filename, body };
  }
}
