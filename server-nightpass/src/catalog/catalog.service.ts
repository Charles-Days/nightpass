import { BadRequestException, ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, EventStatus, Role, VenueStatus, PassClaimStatus } from '@prisma/client';
import type Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS_CLIENT } from '../redis/redis.module';
import { LocationsService } from '../locations/locations.service';
import { ListCatalogVenuesQuery } from './dto/list-catalog-venues.query';
import { ListCatalogEventsQuery } from './dto/list-catalog-events.query';
import { resolveTierPrice } from '../events/tier-pricing';
import { computeCashUnitPrice } from '../common/cash-pricing';

export type OccupancyBucket = 'low' | 'medium' | 'high';

export interface OccupancyResult {
  venueId: string;
  windowMinutes: number;
  bucket: OccupancyBucket;
  updatedAt: string;
}

const VENUE_PUBLIC_SELECT = {
  id: true,
  slug: true,
  name: true,
  city: true,
  address: true,
  description: true,
  capacity: true,
  priceFromCents: true,
  currency: true,
  latitude: true,
  longitude: true,
  googleMapsUrl: true,
  coverImageUrl: true,
  categories: true,
  musicTypes: true,
  minAge: true,
  dressCode: true,
  openHours: true,
  status: true,
  phone: true,
  _count: { select: { owners: true } },
} satisfies Prisma.VenueSelect;

@Injectable()
export class CatalogService {
  private readonly uploadsUrl: string;
  private readonly logger = new Logger('Catalog');

  constructor(
    private readonly prisma: PrismaService,
    private readonly locations: LocationsService,
    private readonly config: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {
    this.uploadsUrl = this.config.get<string>('LOCAL_UPLOADS_URL') || '';
  }

  /**
   * Cache-aside sobre Redis para lecturas públicas calientes: descarga Postgres
   * del tráfico repetitivo. Si Redis falla, degrada transparente a la DB. Las
   * excepciones de `fn` (p.ej. NotFound) se propagan y NO se cachean.
   */
  private async cached<T>(key: string, ttlSec: number, fn: () => Promise<T>): Promise<T> {
    try {
      const hit = await this.redis.get(key);
      if (hit) return JSON.parse(hit) as T;
    } catch (err) {
      this.logger.warn(`Redis GET ${key} falló, voy a DB: ${err instanceof Error ? err.message : err}`);
    }
    const fresh = await fn();
    try {
      await this.redis.set(key, JSON.stringify(fresh), 'EX', ttlSec);
    } catch (err) {
      this.logger.warn(`Redis SET ${key} falló: ${err instanceof Error ? err.message : err}`);
    }
    return fresh;
  }

  private _mapUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    // Relative path → prefix with our local uploads URL
    if (!url.startsWith('http')) {
      return `${this.uploadsUrl}/${url}`.replace(/([^:]\/)\/+/g, '$1');
    }
    // Absolute URL already pointing to R2 or another CDN → keep as-is
    if (!url.includes('/uploads/')) {
      return url;
    }
    // Absolute URL pointing to an uploads path (possibly from a different local IP).
    // Extract the path after /uploads/ and rebuild against our own local uploads URL.
    const uploadsIndex = url.indexOf('/uploads/');
    const relativePath = url.slice(uploadsIndex + '/uploads/'.length);
    return `${this.uploadsUrl}/${relativePath}`.replace(/([^:]\/)\/+/g, '$1');
  }

  private _mapVenue<T extends { coverImageUrl?: string | null; photos?: any[]; events?: any[] }>(venue: T): T {
    if (!venue) return venue;
    if (venue.coverImageUrl) {
      venue.coverImageUrl = this._mapUrl(venue.coverImageUrl);
    }
    if (venue.photos) {
      venue.photos = venue.photos.map((p) => ({
        ...p,
        url: p.url ? this._mapUrl(p.url) : null,
      }));
    }
    if (venue.events) {
      venue.events = venue.events.map((e) => this._mapEvent(e));
    }
    return venue;
  }

  private _mapEvent<T extends { coverImageUrl?: string | null; venue?: any; promoter?: any }>(event: T): T {
    if (!event) return event;
    if (event.coverImageUrl) {
      event.coverImageUrl = this._mapUrl(event.coverImageUrl);
    }
    if (event.venue) {
      event.venue = this._mapVenue(event.venue);
    }
    if (event.promoter) {
      if (event.promoter.logoUrl) {
        event.promoter.logoUrl = this._mapUrl(event.promoter.logoUrl);
      }
    }
    return event;
  }

  async listVenues(query: ListCatalogVenuesQuery) {
    const where: Prisma.VenueWhereInput = { status: 'ACTIVE' };

    if (query.search) {
      const s = query.search.trim();
      const sLower = s.toLowerCase();
      const sUpper = s.toUpperCase();
      const sTitle = sLower.charAt(0).toUpperCase() + sLower.slice(1);
      const variants = Array.from(new Set([s, sLower, sUpper, sTitle]));
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { city: { contains: s, mode: 'insensitive' } },
        { address: { contains: s, mode: 'insensitive' } },
        { categories: { hasSome: variants } },
        { musicTypes: { hasSome: variants } },
      ];
    }
    if (query.category) {
      where.categories = { has: query.category.trim() };
    }
    // Bounding box filter (lat/lng simple, no PostGIS)
    if (query.lat !== undefined && query.lng !== undefined && query.radiusKm) {
      const R = 6371;
      const dLat = (query.radiusKm / R) * (180 / Math.PI);
      const dLng = dLat / Math.cos((query.lat * Math.PI) / 180);
      where.latitude = { gte: query.lat - dLat, lte: query.lat + dLat };
      where.longitude = { gte: query.lng - dLng, lte: query.lng + dLng };
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.venue.findMany({
        where,
        orderBy: [
          { isFeatured: 'desc' },
          { featuredAt: { sort: 'desc', nulls: 'last' } },
          { createdAt: 'desc' },
        ],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        select: VENUE_PUBLIC_SELECT,
      }),
      this.prisma.venue.count({ where }),
    ]);

    return { items: items.map((v) => this._mapVenue(v)), total, page: query.page, limit: query.limit };
  }

  async getVenueBySlug(slug: string) {
    return this.cached(`catalog:venue:${slug}`, 60, async () => {
    const venue = await this.prisma.venue.findUnique({
      where: { slug, status: 'ACTIVE' },
      select: {
        ...VENUE_PUBLIC_SELECT,
        events: {
          where: { status: EventStatus.PUBLISHED, endsAt: { gte: new Date() } },
          orderBy: { startsAt: 'asc' },
          select: {
            id: true,
            slug: true,
            title: true,
            description: true,
            startsAt: true,
            endsAt: true,
            coverImageUrl: true,
            capacity: true,
            allowCashPayment: true,
            tiers: {
              orderBy: { position: 'asc' },
              select: {
                id: true,
                name: true,
                priceCents: true,
                currency: true,
                capacity: true,
                minLoyaltyTier: true,
              },
            },
          },
        },
        photos: {
          orderBy: { position: 'asc' },
          take: 30,
          select: { id: true, url: true, position: true },
        },
      },
    });
    if (!venue) throw new NotFoundException('Local no encontrado');
    return this._mapVenue(venue);
    });
  }

  async getPromoterBySlug(slug: string) {
    return this.cached(`catalog:promoter:${slug}`, 60, async () => {
    const promoter = await this.prisma.promoter.findUnique({
      where: { slug, status: 'ACTIVE' },
      select: {
        id: true,
        slug: true,
        name: true,
        city: true,
        bio: true,
        instagram: true,
        website: true,
        logoUrl: true,
        events: {
          where: {
            status: EventStatus.PUBLISHED,
            endsAt: { gte: new Date() },
          },
          orderBy: { startsAt: 'asc' },
          select: {
            id: true,
            slug: true,
            title: true,
            description: true,
            startsAt: true,
            endsAt: true,
            coverImageUrl: true,
            capacity: true,
            allowCashPayment: true,
            externalVenueName: true,
            externalVenueCity: true,
            venue: {
              select: {
                id: true,
                slug: true,
                name: true,
                city: true,
              },
            },
            tiers: {
              orderBy: { position: 'asc' },
              select: {
                id: true,
                name: true,
                priceCents: true,
                currency: true,
                capacity: true,
                minLoyaltyTier: true,
              },
            },
          },
        },
      },
    });
    if (!promoter) throw new NotFoundException('Organizador no encontrado');
    return promoter;
    });
  }

  async listCatalogEvents(query: ListCatalogEventsQuery) {
    const now = new Date();
    const where: Prisma.EventWhereInput = {
      status: EventStatus.PUBLISHED,
      startsAt: { gte: now },
    };

    if (query.date) {
      const ms =
        query.date === 'today'
          ? 24 * 60 * 60 * 1000
          : query.date === 'week'
            ? 7 * 24 * 60 * 60 * 1000
            : 30 * 24 * 60 * 60 * 1000;
      where.startsAt = { gte: now, lt: new Date(now.getTime() + ms) };
    }

    if (query.city) {
      const city = query.city.trim();
      where.OR = [
        { venue: { city: { contains: city, mode: 'insensitive' } } },
        { externalVenueCity: { contains: city, mode: 'insensitive' } },
      ];
    }

    if (query.search) {
      const search = query.search.trim();
      const searchOr: Prisma.EventWhereInput[] = [
        { title: { contains: search, mode: 'insensitive' } },
        { venue: { name: { contains: search, mode: 'insensitive' } } },
        { externalVenueName: { contains: search, mode: 'insensitive' } },
      ];
      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchOr }];
        delete where.OR;
      } else {
        where.OR = searchOr;
      }
    }

    // Solo eventos cuyo venue está ACTIVE (si tiene venue) u organizador ACTIVE (si tiene organizador).
    const ownerActive: Prisma.EventWhereInput = {
      OR: [
        { venueId: { not: null }, venue: { status: VenueStatus.ACTIVE } },
        { promoterId: { not: null }, promoter: { status: 'ACTIVE' } },
      ],
    };
    where.AND = where.AND
      ? [...(Array.isArray(where.AND) ? where.AND : [where.AND]), ownerActive]
      : [ownerActive];

    const [items, total] = await this.prisma.$transaction([
      this.prisma.event.findMany({
        where,
        orderBy: [
          { isFeatured: 'desc' },
          { featuredAt: { sort: 'desc', nulls: 'last' } },
          { startsAt: 'asc' },
        ],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          venue: {
            select: {
              id: true,
              slug: true,
              name: true,
              city: true,
              address: true,
              coverImageUrl: true,
              stripeAccount: { select: { chargesEnabled: true } },
            },
          },
          promoter: {
            select: {
              id: true,
              slug: true,
              name: true,
              logoUrl: true,
              stripeAccount: { select: { chargesEnabled: true } },
            },
          },
          tiers: {
            orderBy: { position: 'asc' },
            select: {
              id: true,
              name: true,
              priceCents: true,
              currency: true,
              position: true,
              prices: {
                orderBy: { daysBeforeEvent: 'desc' },
                select: { priceCents: true, daysBeforeEvent: true },
              },
            },
          },
        },
      }),
      this.prisma.event.count({ where }),
    ]);

    // Sustituye priceCents por el precio vigente; no expone el calendario en la lista.
    const mapped = items.map((event) => ({
      ...event,
      tiers: event.tiers.map((t) => {
        const { prices, ...rest } = t;
        return {
          ...rest,
          priceCents: resolveTierPrice(t.priceCents, prices, event.startsAt)
            .currentCents,
        };
      }),
    }));

    // Pases emitidos por evento (aforo vendido) en una sola consulta agrupada.
    const soldByEvent = await this._soldCountByEvent(items.map((e) => e.id));

    return {
      items: mapped.map((e) => ({
        ...this._mapEvent(e),
        sold: soldByEvent.get(e.id) ?? 0,
        capacity: e.capacity ?? null,
      })),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  /** Mapa eventId → nº de pases emitidos (Stripe + efectivo). */
  private async _soldCountByEvent(eventIds: string[]): Promise<Map<string, number>> {
    if (eventIds.length === 0) return new Map();
    const [counts, pendingCounts] = await Promise.all([
      this.prisma.pass.groupBy({
        by: ['eventId'],
        where: { eventId: { in: eventIds } },
        _count: { _all: true },
      }),
      this.prisma.passClaim.groupBy({
        by: ['eventId'],
        where: { eventId: { in: eventIds }, status: PassClaimStatus.PENDING },
        _count: { _all: true },
      }),
    ]);

    const resultMap = new Map<string, number>();
    for (const c of counts) {
      resultMap.set(c.eventId, c._count._all);
    }
    for (const pc of pendingCounts) {
      const existing = resultMap.get(pc.eventId) ?? 0;
      resultMap.set(pc.eventId, existing + pc._count._all);
    }
    return resultMap;
  }

  async getEventById(id: string) {
    return this.cached(`catalog:event:${id}`, 30, async () => {
    const event = await this.prisma.event.findUnique({
      where: { id, status: EventStatus.PUBLISHED },
      include: {
        tiers: {
          orderBy: { position: 'asc' },
          include: { prices: { orderBy: { daysBeforeEvent: 'desc' } } },
        },
        venue: {
          select: {
            id: true,
            slug: true,
            name: true,
            city: true,
            stripeAccount: { select: { chargesEnabled: true } },
          },
        },
        promoter: {
          select: {
            id: true,
            slug: true,
            name: true,
            logoUrl: true,
            stripeAccount: { select: { chargesEnabled: true } },
          },
        },
      },
    });
    if (!event) throw new NotFoundException('Evento no encontrado');

    // Aforo vendido (pases emitidos: Stripe + efectivo + vales pendientes).
    // Los dos counts en paralelo — no encadenados — para no doblar latencia.
    const [soldPasses, pendingClaims] = await Promise.all([
      this.prisma.pass.count({ where: { eventId: event.id } }),
      this.prisma.passClaim.count({
        where: { eventId: event.id, status: PassClaimStatus.PENDING },
      }),
    ]);
    const sold = soldPasses + pendingClaims;

    // Expone el precio vigente y la próxima subida; oculta el calendario interno.
    return {
      ...this._mapEvent({
        ...event,
        tiers: event.tiers.map((t) => {
          const { prices, ...rest } = t;
          const r = resolveTierPrice(t.priceCents, prices, event.startsAt);
          return {
            ...rest,
            priceCents: r.currentCents,
            nextPrice: r.next
              ? { priceCents: r.next.priceCents, startsAt: r.next.startsAt }
              : null,
            // Próximas subidas (las 2 más cercanas a hoy) para mostrar el plan.
            upcomingPrices: r.upcoming.slice(0, 2),
          };
        }),
      }),
      sold,
      capacity: event.capacity ?? null,
    };
    });
  }

  async getTierById(tierId: string) {
    const tier = await this.prisma.eventTier.findUnique({
      where: { id: tierId },
      select: {
        id: true,
        name: true,
        priceCents: true,
        currency: true,
        capacity: true,
        minLoyaltyTier: true,
        // Overrides por-tier para el precio en efectivo (null = heredar del owner).
        cashFeeMode: true,
        cashFeePctOverride: true,
        cashExemptOverride: true,
        prices: {
          orderBy: { daysBeforeEvent: 'desc' },
          select: { priceCents: true, daysBeforeEvent: true },
        },
        event: {
          select: {
            id: true,
            slug: true,
            title: true,
            startsAt: true,
            endsAt: true,
            coverImageUrl: true,
            status: true,
            allowCashPayment: true,
            externalVenueName: true,
            externalVenueCity: true,
            venue: {
              select: {
                id: true,
                slug: true,
                name: true,
                city: true,
                status: true,
                platformFeePct: true,
                cashCommissionExempt: true,
                stripeAccount: { select: { chargesEnabled: true } },
              },
            },
            promoter: {
              select: {
                id: true,
                slug: true,
                name: true,
                status: true,
                platformFeePct: true,
                cashCommissionExempt: true,
                stripeAccount: { select: { chargesEnabled: true } },
              },
            },
          },
        },
      },
    });
    if (!tier) throw new NotFoundException('Tier no encontrado');
    if (tier.event.status !== EventStatus.PUBLISHED) {
      throw new NotFoundException('Evento no disponible');
    }

    const venue = tier.event.venue;
    const promoter = tier.event.promoter;

    if (!venue && !promoter) {
      throw new NotFoundException('Evento sin local ni organizador');
    }
    if (venue && venue.status !== 'ACTIVE') {
      throw new NotFoundException('Local no disponible');
    }
    if (promoter && !venue && promoter.status !== 'ACTIVE') {
      throw new NotFoundException('Organizador no disponible');
    }

    const paymentsEnabled =
      process.env.STRIPE_DEV_BYPASS === 'true' ||
      venue?.stripeAccount?.chargesEnabled === true ||
      promoter?.stripeAccount?.chargesEnabled === true;

    const resolved = resolveTierPrice(
      tier.priceCents,
      tier.prices,
      tier.event.startsAt,
    );

    // Precio en efectivo (bruto − Stripe [− NP según modo/exención]). Solo si el
    // evento acepta efectivo; si no, null. Mismo cálculo que el cobro real:
    // resolución POR-TIER (overrides del tier) con fallback al owner.
    const owner = venue ?? promoter;
    const ownerFeePct =
      owner?.platformFeePct != null
        ? owner.platformFeePct
        : Number(this.config.get<string>('STRIPE_PLATFORM_FEE_PCT')) || 8;
    const cashFeePct = tier.cashFeePctOverride ?? ownerFeePct;
    const cashExempt =
      tier.cashExemptOverride ?? owner?.cashCommissionExempt ?? true;
    const cashMode = tier.cashFeeMode ?? 'SUBTRACT';
    const cashPriceCents = tier.event.allowCashPayment
      ? computeCashUnitPrice(resolved.currentCents, cashFeePct, cashExempt, cashMode)
      : null;

    const result = {
      id: tier.id,
      name: tier.name,
      priceCents: resolved.currentCents,
      cashPriceCents,
      currency: tier.currency,
      capacity: tier.capacity,
      minLoyaltyTier: tier.minLoyaltyTier,
      nextPrice: resolved.next
        ? { priceCents: resolved.next.priceCents, startsAt: resolved.next.startsAt }
        : null,
      event: {
        id: tier.event.id,
        slug: tier.event.slug,
        title: tier.event.title,
        startsAt: tier.event.startsAt,
        endsAt: tier.event.endsAt,
        coverImageUrl: tier.event.coverImageUrl,
        allowCashPayment: tier.event.allowCashPayment,
        venue: venue
          ? {
              id: venue.id,
              slug: venue.slug,
              name: venue.name,
              city: venue.city,
            }
          : null,
        promoter: promoter
          ? {
              id: promoter.id,
              slug: promoter.slug,
              name: promoter.name,
              externalVenueName: tier.event.externalVenueName,
              externalVenueCity: tier.event.externalVenueCity,
            }
          : null,
      },
      paymentsEnabled,
    };
    if (result.event) {
      result.event = this._mapEvent(result.event);
    }
    return result;
  }

  /**
   * Feed mínimo para el sitemap del cliente web. Solo entidades públicas/visibles:
   *  - venues ACTIVE
   *  - events PUBLISHED, no pasados (startsAt futuro), con owner (venue o promoter) ACTIVE
   *  - promoters ACTIVE
   * `select` mínimo (slug/id + updatedAt) para mantenerlo barato y cacheable.
   */
  async getSitemapFeed() {
    return this.cached('catalog:sitemap', 3600, async () => {
    const now = new Date();

    const eventWhere: Prisma.EventWhereInput = {
      status: EventStatus.PUBLISHED,
      startsAt: { gte: now },
      OR: [
        { venueId: { not: null }, venue: { status: VenueStatus.ACTIVE } },
        { promoterId: { not: null }, promoter: { status: 'ACTIVE' } },
      ],
    };

    // Cap defensivo: evita respuestas de MB y OOM si el catálogo crece o un bot
    // SEO crawlea el feed. 10k por tipo cubre de sobra el corto/medio plazo.
    const SITEMAP_CAP = 10_000;
    const [venues, events, promoters] = await this.prisma.$transaction([
      this.prisma.venue.findMany({
        where: { status: VenueStatus.ACTIVE },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: SITEMAP_CAP,
      }),
      this.prisma.event.findMany({
        where: eventWhere,
        select: { id: true, updatedAt: true },
        orderBy: { startsAt: 'asc' },
        take: SITEMAP_CAP,
      }),
      this.prisma.promoter.findMany({
        where: { status: 'ACTIVE' },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: SITEMAP_CAP,
      }),
    ]);

    return { venues, events, promoters };
    });
  }

  async getPublicStats() {
    return this.cached('catalog:stats', 60, async () => {
    const [customers, venues, events] = await this.prisma.$transaction([
      this.prisma.user.count({ where: { role: Role.CUSTOMER } }),
      this.prisma.venue.count({ where: { status: VenueStatus.ACTIVE } }),
      this.prisma.event.count({
        where: { status: EventStatus.PUBLISHED, endsAt: { gte: new Date() } },
      }),
    ]);
    return { customers, venues, events };
    });
  }

  /**
   * Rough live occupancy of a venue, derived from how many distinct users
   * pinged inside its geofence during the last `windowMinutes` minutes.
   *
   * Privacy guarantees:
   *  - We never expose the raw count to the public — only a bucket.
   *  - If fewer than 3 unique users pinged, we always return "low" so the
   *    response cannot be used to infer individual presence.
   */
  async getVenueOccupancy(
    venueId: string,
    windowMinutes = 15,
  ): Promise<OccupancyResult> {
    const venue = await this.prisma.venue.findUnique({
      where: { id: venueId },
      select: {
        id: true,
        latitude: true,
        longitude: true,
        geofenceRadiusM: true,
      },
    });
    if (!venue) throw new NotFoundException('Local no encontrado');

    const updatedAt = new Date().toISOString();

    if (venue.latitude == null || venue.longitude == null) {
      return { venueId: venue.id, windowMinutes, bucket: 'low', updatedAt };
    }

    const radius = venue.geofenceRadiusM ?? 100;
    const count = await this.locations.countNearbyUsers(
      venue.latitude,
      venue.longitude,
      radius,
      windowMinutes,
    );

    // k-anonymity: below 3 unique users, never reveal anything but "low".
    let bucket: OccupancyBucket;
    if (count < 3) bucket = 'low';
    else if (count <= 4) bucket = 'low';
    else if (count <= 14) bucket = 'medium';
    else bucket = 'high';

    return { venueId: venue.id, windowMinutes, bucket, updatedAt };
  }

  // ─── Event forum ─────────────────────────────────────────────────────────────

  private async assertForumOpen(eventId: string): Promise<void> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, startsAt: true, endsAt: true, status: true },
    });
    if (!event) throw new NotFoundException('Evento no encontrado');
    if (event.status !== EventStatus.PUBLISHED) {
      throw new ForbiddenException('Evento no disponible');
    }
    const now = Date.now();
    const start = event.startsAt.getTime() - 2 * 60 * 60 * 1000;
    const end = event.endsAt.getTime() + 2 * 60 * 60 * 1000;
    if (now < start || now > end) {
      throw new ForbiddenException('FORUM_CLOSED');
    }
  }

  async listForumPosts(eventId: string) {
    await this.assertForumOpen(eventId);
    const posts = await this.prisma.eventForumPost.findMany({
      where: { eventId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        body: true,
        createdAt: true,
        user: { select: { id: true, name: true } },
      },
    });
    return { items: posts };
  }

  async createForumPost(eventId: string, userId: string, body: string) {
    await this.assertForumOpen(eventId);
    const trimmed = body.trim();
    if (trimmed.length < 1 || trimmed.length > 280) {
      throw new BadRequestException('Mensaje inválido');
    }
    return this.prisma.eventForumPost.create({
      data: { eventId, userId, body: trimmed },
      select: {
        id: true,
        body: true,
        createdAt: true,
        user: { select: { id: true, name: true } },
      },
    });
  }
}
