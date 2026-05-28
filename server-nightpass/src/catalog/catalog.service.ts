import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, EventStatus, Role, VenueStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LocationsService } from '../locations/locations.service';
import { ListCatalogVenuesQuery } from './dto/list-catalog-venues.query';
import { ListCatalogEventsQuery } from './dto/list-catalog-events.query';

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly locations: LocationsService,
  ) {}

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

    return { items, total, page: query.page, limit: query.limit };
  }

  async getVenueBySlug(slug: string) {
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
          select: { id: true, url: true, position: true },
        },
      },
    });
    if (!venue) throw new NotFoundException('Local no encontrado');
    return venue;
  }

  async getPromoterBySlug(slug: string) {
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
            },
          },
        },
      }),
      this.prisma.event.count({ where }),
    ]);

    return { items, total, page: query.page, limit: query.limit };
  }

  async getEventById(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id, status: EventStatus.PUBLISHED },
      include: {
        tiers: { orderBy: { position: 'asc' } },
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
    return event;
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
        event: {
          select: {
            id: true,
            slug: true,
            title: true,
            startsAt: true,
            endsAt: true,
            coverImageUrl: true,
            status: true,
            externalVenueName: true,
            externalVenueCity: true,
            venue: {
              select: {
                id: true,
                slug: true,
                name: true,
                city: true,
                status: true,
                stripeAccount: { select: { chargesEnabled: true } },
              },
            },
            promoter: {
              select: {
                id: true,
                slug: true,
                name: true,
                status: true,
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
      venue?.stripeAccount?.chargesEnabled === true ||
      promoter?.stripeAccount?.chargesEnabled === true;

    return {
      id: tier.id,
      name: tier.name,
      priceCents: tier.priceCents,
      currency: tier.currency,
      capacity: tier.capacity,
      minLoyaltyTier: tier.minLoyaltyTier,
      event: {
        id: tier.event.id,
        slug: tier.event.slug,
        title: tier.event.title,
        startsAt: tier.event.startsAt,
        endsAt: tier.event.endsAt,
        coverImageUrl: tier.event.coverImageUrl,
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
  }

  async getPublicStats() {
    const [customers, venues, events] = await this.prisma.$transaction([
      this.prisma.user.count({ where: { role: Role.CUSTOMER } }),
      this.prisma.venue.count({ where: { status: VenueStatus.ACTIVE } }),
      this.prisma.event.count({
        where: { status: EventStatus.PUBLISHED, endsAt: { gte: new Date() } },
      }),
    ]);
    return { customers, venues, events };
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
}
