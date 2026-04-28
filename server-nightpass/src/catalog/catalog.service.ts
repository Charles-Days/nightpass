import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, EventStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListCatalogVenuesQuery } from './dto/list-catalog-venues.query';

const VENUE_PUBLIC_SELECT = {
  id: true,
  slug: true,
  name: true,
  city: true,
  description: true,
  capacity: true,
  priceFromCents: true,
  currency: true,
  latitude: true,
  longitude: true,
  coverImageUrl: true,
  categories: true,
  openHours: true,
  status: true,
  _count: { select: { owners: true } },
} satisfies Prisma.VenueSelect;

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async listVenues(query: ListCatalogVenuesQuery) {
    const where: Prisma.VenueWhereInput = { status: 'ACTIVE' };

    if (query.search) {
      where.name = { contains: query.search.trim(), mode: 'insensitive' };
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
        orderBy: { createdAt: 'desc' },
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
          where: { status: EventStatus.PUBLISHED, startsAt: { gte: new Date() } },
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

  async getEventById(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id, status: EventStatus.PUBLISHED },
      include: {
        tiers: { orderBy: { position: 'asc' } },
        venue: { select: { id: true, slug: true, name: true, city: true } },
      },
    });
    if (!event) throw new NotFoundException('Evento no encontrado');
    return event;
  }
}
