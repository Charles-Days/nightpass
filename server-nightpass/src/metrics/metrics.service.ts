import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { Role } from '@prisma/client';
import { REDIS_CLIENT } from '../redis/redis.module';
import { PrismaService } from '../prisma/prisma.service';
import { FUNNEL_STEPS, type FunnelStep } from './dto/track-event.dto';

/** Etiquetas legibles de cada paso del embudo (orden = orden del embudo). */
const FUNNEL_LABELS: Record<FunnelStep, string> = {
  page_view: 'Entró al sitio',
  view_event: 'Vio un evento',
  click_buy: 'Tocó "Comprar"',
  open_checkout: 'Abrió el checkout',
  view_signup: 'Llegó al registro',
  signup_complete: 'Creó cuenta',
};

export interface FunnelStepStat {
  name: FunnelStep;
  label: string;
  visitors: number;
}

export interface PathCount {
  path: string;
  count: number;
}

export interface FunnelStats {
  windowDays: number;
  steps: FunnelStepStat[];
  topEntry: PathCount[];
  topExit: PathCount[];
}

export interface InsightsStats {
  windowDays: number;
  trafficSources: { source: string; visitors: number }[];
  eventConversion: {
    eventId: string;
    title: string;
    views: number;
    clicks: number;
    purchases: number;
  }[];
  redemption: { sold: number; redeemed: number; noShow: number; ratePct: number };
  audience: {
    dau: number;
    wau: number;
    mau: number;
    stickinessPct: number;
    returning: number;
    oneTime: number;
  };
  revenue: {
    totalOrders: number;
    avgTicketCents: number;
    byTier: { tier: string; orders: number; revenueCents: number }[];
    byMethod: { method: string; orders: number; revenueCents: number }[];
  };
}

/** Agrupa un referrer (URL) en una fuente legible. */
function bucketSource(referrer: string | null): string {
  if (!referrer) return 'Directo';
  let host = referrer;
  try {
    host = new URL(referrer).hostname;
  } catch {
    /* no era URL válida → usar el string crudo */
  }
  const h = host.toLowerCase();
  if (h.includes('instagram') || h === 'l.instagram.com') return 'Instagram';
  if (h.includes('facebook') || h === 'fb.com' || h.includes('fb.me')) return 'Facebook';
  if (h.includes('whatsapp') || h.includes('wa.me')) return 'WhatsApp';
  if (h.includes('tiktok')) return 'TikTok';
  if (h.includes('t.co') || h.includes('twitter') || h.includes('x.com')) return 'Twitter/X';
  if (h.includes('google')) return 'Google';
  if (h.includes('nightpass')) return 'Directo';
  return host || 'Otros';
}

const ALL_KEY = 'visits:uniq:all';
const dayKey = (d: string) => `visits:uniq:${d}`;
// Visitantes que además crearon cuenta (conversión del funnel web).
const CONV_ALL_KEY = 'convert:uniq:all';
const convDayKey = (d: string) => `convert:uniq:${d}`;
const DAILY_TTL_SECONDS = 60 * 60 * 24 * 90; // retener 90 días de claves diarias

export interface DailyCount {
  date: string;
  count: number;
}

export interface VisitorStats {
  today: number;
  allTime: number;
  last7: DailyCount[];
  // Conversión: visitantes únicos que crearon cuenta.
  conversions: {
    today: number;
    allTime: number;
    last7: DailyCount[];
  };
  // Cuentas de cliente reales en la BD (histórico, incluye las creadas antes
  // de existir el tracking de conversión).
  totalAccounts: number;
}

/**
 * Contador de visitantes ÚNICOS (no page views). El dedup real lo hace
 * HyperLogLog en Redis: añadir el mismo visitorId varias veces no incrementa
 * el conteo. ~12KB por clave, error ~0.8%. El visitorId lo provee el front
 * (cookie first-party np_vid, o hash IP+UA si no hay cookie).
 */
@Injectable()
export class MetricsService {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly prisma: PrismaService,
  ) {}

  // Bucketing por día en hora de México, NO UTC. En el VPS (UTC) un visitante
  // de domingo 19:00 MX caía en el bucket del lunes (lunes 01:00 UTC). México
  // no usa DST desde 2022 (UTC-6 fijo), así que restar 24h y formatear en esta
  // tz da días locales consecutivos correctos.
  private static readonly DAY_FMT = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  /** YYYY-MM-DD en hora de México. */
  private dayString(date = new Date()): string {
    return MetricsService.DAY_FMT.format(date);
  }

  async recordVisit(visitorId: string): Promise<void> {
    if (!visitorId) return;
    const key = dayKey(this.dayString());
    await this.redis
      .multi()
      .pfadd(key, visitorId)
      .expire(key, DAILY_TTL_SECONDS)
      .pfadd(ALL_KEY, visitorId)
      .exec();
  }

  /**
   * Marca que un visitante creó cuenta (conversión). Se llama al hacer signup
   * web con el mismo visitorId (cookie np_vid). HyperLogLog dedup → un visitante
   * solo cuenta una vez aunque cree varias cuentas/recargue.
   */
  async recordConversion(visitorId: string): Promise<void> {
    if (!visitorId) return;
    const key = convDayKey(this.dayString());
    await this.redis
      .multi()
      .pfadd(key, visitorId)
      .expire(key, DAILY_TTL_SECONDS)
      .pfadd(CONV_ALL_KEY, visitorId)
      .exec();
  }

  async getStats(): Promise<VisitorStats> {
    const now = Date.now();
    const days: string[] = [];
    for (let i = 0; i < 7; i++) {
      days.push(this.dayString(new Date(now - i * 86_400_000)));
    }

    const pipeline = this.redis.multi();
    days.forEach((d) => pipeline.pfcount(dayKey(d)));
    pipeline.pfcount(ALL_KEY);
    days.forEach((d) => pipeline.pfcount(convDayKey(d)));
    pipeline.pfcount(CONV_ALL_KEY);
    const [res, totalAccounts] = await Promise.all([
      pipeline.exec(),
      this.prisma.user.count({ where: { role: Role.CUSTOMER } }),
    ]);

    const counts = (res ?? []).map(([, v]) => Number(v) || 0);
    // Layout: [7 visit days][visit all][7 conv days][conv all]
    const visitDays = counts.slice(0, days.length);
    const allTime = counts[days.length] ?? 0;
    const convDays = counts.slice(days.length + 1, days.length + 1 + days.length);
    const convAll = counts[days.length * 2 + 1] ?? 0;

    const toSeries = (arr: number[]) =>
      days.map((date, i) => ({ date, count: arr[i] ?? 0 })).reverse();

    return {
      today: visitDays[0] ?? 0,
      allTime,
      last7: toSeries(visitDays),
      conversions: {
        today: convDays[0] ?? 0,
        allTime: convAll,
        last7: toSeries(convDays),
      },
      totalAccounts,
    };
  }

  /**
   * Registra un paso del recorrido del visitante (page_view, view_event, …).
   * A diferencia del HLL, esto sí guarda fila por fila para reconstruir el
   * embudo y ver dónde se cae la gente. Fire-and-forget desde el caller.
   */
  async recordEvent(input: {
    visitorId: string;
    name: FunnelStep;
    path: string;
    eventId?: string | null;
    referrer?: string | null;
  }): Promise<void> {
    if (!input.visitorId) return;
    await this.prisma.analyticsEvent.create({
      data: {
        visitorId: input.visitorId,
        name: input.name,
        path: input.path.slice(0, 512),
        eventId: input.eventId ?? null,
        referrer: input.referrer?.slice(0, 512) ?? null,
      },
    });
  }

  /**
   * Embudo de conversión sobre los últimos `windowDays` días: visitantes únicos
   * en cada paso + páginas de entrada y de salida más comunes. Sirve para ver
   * dónde entra la gente, por dónde se mueve y dónde abandona.
   */
  async getFunnel(windowDays = 30): Promise<FunnelStats> {
    const since = new Date(Date.now() - windowDays * 86_400_000);

    const [enteredRows, byStep, entry, exit] = await Promise.all([
      // Total de visitantes distintos = "Entró al sitio". Cuenta cualquier paso,
      // porque quien cae directo a un evento dispara view_event (no page_view);
      // sin esto el primer escalón del embudo saldría en 0.
      this.prisma.$queryRaw<{ visitors: bigint }[]>`
        SELECT COUNT(DISTINCT "visitorId")::bigint AS visitors
        FROM analytics_events
        WHERE "createdAt" >= ${since}
      `,
      // Visitantes únicos por paso.
      this.prisma.$queryRaw<{ name: string; visitors: bigint }[]>`
        SELECT name, COUNT(DISTINCT "visitorId")::bigint AS visitors
        FROM analytics_events
        WHERE "createdAt" >= ${since}
        GROUP BY name
      `,
      // Primera página de cada visitante (entrada).
      this.prisma.$queryRaw<{ path: string; count: bigint }[]>`
        SELECT path, COUNT(*)::bigint AS count FROM (
          SELECT DISTINCT ON ("visitorId") "visitorId", path
          FROM analytics_events
          WHERE "createdAt" >= ${since}
          ORDER BY "visitorId", "createdAt" ASC
        ) t GROUP BY path ORDER BY count DESC LIMIT 8
      `,
      // Última página de cada visitante (salida / abandono).
      this.prisma.$queryRaw<{ path: string; count: bigint }[]>`
        SELECT path, COUNT(*)::bigint AS count FROM (
          SELECT DISTINCT ON ("visitorId") "visitorId", path
          FROM analytics_events
          WHERE "createdAt" >= ${since}
          ORDER BY "visitorId", "createdAt" DESC
        ) t GROUP BY path ORDER BY count DESC LIMIT 8
      `,
    ]);

    const entered = Number(enteredRows[0]?.visitors ?? 0);
    const countByName = new Map(byStep.map((r) => [r.name, Number(r.visitors)]));
    const steps: FunnelStepStat[] = FUNNEL_STEPS.map((name) => ({
      name,
      label: FUNNEL_LABELS[name],
      // El primer escalón es el total de visitantes; el resto, por su paso.
      visitors: name === 'page_view' ? entered : (countByName.get(name) ?? 0),
    }));

    const toPaths = (rows: { path: string; count: bigint }[]): PathCount[] =>
      rows.map((r) => ({ path: r.path, count: Number(r.count) }));

    return {
      windowDays,
      steps,
      topEntry: toPaths(entry),
      topExit: toPaths(exit),
    };
  }

  /**
   * Panel de insights de comportamiento sobre los últimos `windowDays` días:
   * fuentes de tráfico, conversión por evento, canje/no-show, audiencia
   * (DAU/WAU/MAU + recurrentes) e ingresos (mix de tier/método, ticket promedio).
   */
  async getInsights(windowDays = 30): Promise<InsightsStats> {
    const now = Date.now();
    const since = new Date(now - windowDays * 86_400_000);
    const dayAgo = new Date(now - 86_400_000);
    const weekAgo = new Date(now - 7 * 86_400_000);

    const [
      firstRef,
      evRows,
      purchasesByEvent,
      sold,
      redeemed,
      dauRows,
      wauRows,
      mauRows,
      returningRows,
      ordersByTier,
      ordersByMethod,
      ordersAgg,
    ] = await Promise.all([
      // Primer referrer de cada visitante → fuente de entrada.
      this.prisma.$queryRaw<{ referrer: string | null }[]>`
        SELECT referrer FROM (
          SELECT DISTINCT ON ("visitorId") "visitorId", referrer
          FROM analytics_events WHERE "createdAt" >= ${since}
          ORDER BY "visitorId", "createdAt" ASC
        ) t
      `,
      // Vistas y clics de compra por evento.
      this.prisma.$queryRaw<{ eventId: string; name: string; c: bigint }[]>`
        SELECT "eventId", name, COUNT(DISTINCT "visitorId")::bigint AS c
        FROM analytics_events
        WHERE "createdAt" >= ${since}
          AND "eventId" IS NOT NULL
          AND name IN ('view_event', 'click_buy')
        GROUP BY "eventId", name
      `,
      // Compras completadas por evento.
      this.prisma.order.groupBy({
        by: ['eventId'],
        where: { status: 'COMPLETED', createdAt: { gte: since } },
        _count: { _all: true },
      }),
      this.prisma.pass.count({ where: { createdAt: { gte: since } } }),
      this.prisma.pass.count({
        where: { createdAt: { gte: since }, usedAt: { not: null } },
      }),
      // Audiencia activa por ventana.
      this.prisma.$queryRaw<{ c: bigint }[]>`
        SELECT COUNT(DISTINCT "visitorId")::bigint AS c FROM analytics_events WHERE "createdAt" >= ${dayAgo}
      `,
      this.prisma.$queryRaw<{ c: bigint }[]>`
        SELECT COUNT(DISTINCT "visitorId")::bigint AS c FROM analytics_events WHERE "createdAt" >= ${weekAgo}
      `,
      this.prisma.$queryRaw<{ c: bigint }[]>`
        SELECT COUNT(DISTINCT "visitorId")::bigint AS c FROM analytics_events WHERE "createdAt" >= ${since}
      `,
      // Recurrentes = activos en ≥2 días distintos dentro de la ventana.
      this.prisma.$queryRaw<{ c: bigint }[]>`
        SELECT COUNT(*)::bigint AS c FROM (
          SELECT "visitorId" FROM analytics_events
          WHERE "createdAt" >= ${since}
          GROUP BY "visitorId"
          HAVING COUNT(DISTINCT date_trunc('day', "createdAt")) >= 2
        ) t
      `,
      this.prisma.order.groupBy({
        by: ['tierId'],
        where: { status: 'COMPLETED', createdAt: { gte: since } },
        _count: { _all: true },
        _sum: { totalCents: true },
      }),
      this.prisma.order.groupBy({
        by: ['paymentMethod'],
        where: { status: 'COMPLETED', createdAt: { gte: since } },
        _count: { _all: true },
        _sum: { totalCents: true },
      }),
      this.prisma.order.aggregate({
        where: { status: 'COMPLETED', createdAt: { gte: since } },
        _count: { _all: true },
        _sum: { totalCents: true },
      }),
    ]);

    // ── Fuentes de tráfico ──
    const srcMap = new Map<string, number>();
    for (const r of firstRef) {
      const s = bucketSource(r.referrer);
      srcMap.set(s, (srcMap.get(s) ?? 0) + 1);
    }
    const trafficSources = [...srcMap.entries()]
      .map(([source, visitors]) => ({ source, visitors }))
      .sort((a, b) => b.visitors - a.visitors);

    // ── Conversión por evento ──
    const evMap = new Map<string, { views: number; clicks: number }>();
    for (const row of evRows) {
      const e = evMap.get(row.eventId) ?? { views: 0, clicks: 0 };
      if (row.name === 'view_event') e.views = Number(row.c);
      else if (row.name === 'click_buy') e.clicks = Number(row.c);
      evMap.set(row.eventId, e);
    }
    const purchaseMap = new Map(
      purchasesByEvent.map((p) => [p.eventId, p._count._all]),
    );
    const eventIds = [...new Set([...evMap.keys(), ...purchaseMap.keys()])];
    const titles = eventIds.length
      ? await this.prisma.event.findMany({
          where: { id: { in: eventIds } },
          select: { id: true, title: true },
        })
      : [];
    const titleMap = new Map(titles.map((t) => [t.id, t.title]));
    const eventConversion = eventIds
      .map((eventId) => ({
        eventId,
        title: titleMap.get(eventId) ?? 'Evento',
        views: evMap.get(eventId)?.views ?? 0,
        clicks: evMap.get(eventId)?.clicks ?? 0,
        purchases: purchaseMap.get(eventId) ?? 0,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    // ── Canje / no-show ──
    const noShow = Math.max(0, sold - redeemed);
    const ratePct = sold > 0 ? Math.round((redeemed / sold) * 100) : 0;

    // ── Audiencia ──
    const dau = Number(dauRows[0]?.c ?? 0);
    const wau = Number(wauRows[0]?.c ?? 0);
    const mau = Number(mauRows[0]?.c ?? 0);
    const returning = Number(returningRows[0]?.c ?? 0);
    const stickinessPct = mau > 0 ? Math.round((dau / mau) * 100) : 0;
    const oneTime = Math.max(0, mau - returning);

    // ── Ingresos ──
    const tierIds = ordersByTier.map((o) => o.tierId);
    const tierNames = tierIds.length
      ? await this.prisma.eventTier.findMany({
          where: { id: { in: tierIds } },
          select: { id: true, name: true },
        })
      : [];
    const tierNameMap = new Map(tierNames.map((t) => [t.id, t.name]));
    const byTier = ordersByTier
      .map((o) => ({
        tier: tierNameMap.get(o.tierId) ?? 'Tier',
        orders: o._count._all,
        revenueCents: o._sum.totalCents ?? 0,
      }))
      .sort((a, b) => b.revenueCents - a.revenueCents);
    const byMethod = ordersByMethod.map((o) => ({
      method: o.paymentMethod,
      orders: o._count._all,
      revenueCents: o._sum.totalCents ?? 0,
    }));
    const totalOrders = ordersAgg._count._all;
    const totalRevenue = ordersAgg._sum.totalCents ?? 0;
    const avgTicketCents = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    return {
      windowDays,
      trafficSources,
      eventConversion,
      redemption: { sold, redeemed, noShow, ratePct },
      audience: { dau, wau, mau, stickinessPct, returning, oneTime },
      revenue: { totalOrders, avgTicketCents, byTier, byMethod },
    };
  }
}
