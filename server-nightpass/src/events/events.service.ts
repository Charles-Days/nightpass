import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { ListEventsQuery } from './dto/list-events.query';
import { CreateTierDto } from './dto/create-tier.dto';
import { UpdateTierDto } from './dto/update-tier.dto';

interface OwnerParams {
  venueId?: string | null;
  promoterId?: string | null;
}

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private toSlug(title: string): string {
    return (
      title
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .slice(0, 60) || 'evento'
    );
  }

  private randomSuffix(len = 4): string {
    return randomBytes(Math.ceil(len / 2))
      .toString('hex')
      .slice(0, len);
  }

  /**
   * Verifica que el usuario tiene permisos sobre el evento (vía venue u organizador).
   * - ADMIN: siempre pasa.
   * - VENUE_OWNER/VENUE_STAFF: debe tener entrada en VenueOwner para ese venue.
   * - PROMOTER/PROMOTER_STAFF: debe tener entrada en PromoterMember para ese organizador.
   */
  private async ensureEventOwner(
    params: OwnerParams,
    userId: string,
    userRole: string,
  ): Promise<void> {
    if (userRole === 'ADMIN') return;

    if (!params.venueId && !params.promoterId) {
      throw new BadRequestException('EVENT_MUST_HAVE_VENUE_OR_PROMOTER');
    }

    // Pass if user owns the venue OR the promoter (event can have both refs).
    if (
      params.venueId &&
      ['VENUE_OWNER', 'VENUE_STAFF'].includes(userRole)
    ) {
      const link = await this.prisma.venueOwner.findUnique({
        where: { userId_venueId: { userId, venueId: params.venueId } },
        select: { userId: true },
      });
      if (link) return;
    }

    if (
      params.promoterId &&
      ['PROMOTER', 'PROMOTER_STAFF'].includes(userRole)
    ) {
      const link = await this.prisma.promoterMember.findUnique({
        where: { userId_promoterId: { userId, promoterId: params.promoterId } },
        select: { userId: true },
      });
      if (link) return;
    }

    throw new ForbiddenException('No tienes permisos para gestionar este evento');
  }

  // ─── Events CRUD ─────────────────────────────────────────────────────────────

  async create(dto: CreateEventDto, user: AuthUser) {
    const hasVenue = !!dto.venueId;
    const hasPromoter = !!dto.promoterId;

    if (!hasVenue && !hasPromoter) {
      throw new BadRequestException('EVENT_MUST_HAVE_VENUE_OR_PROMOTER');
    }

    // Promoter event with external location (no catalog venue) requires location fields.
    if (hasPromoter && !hasVenue) {
      if (!dto.externalVenueName || !dto.externalVenueCity) {
        throw new BadRequestException(
          'Los eventos del organizador requieren externalVenueName y externalVenueCity',
        );
      }
    }

    await this.ensureEventOwner(
      { venueId: dto.venueId, promoterId: dto.promoterId },
      user.id,
      user.role,
    );

    const baseSlug = this.toSlug(dto.title);

    const slugExists = async (slug: string): Promise<boolean> => {
      if (hasVenue) {
        const existing = await this.prisma.event.findUnique({
          where: { venueId_slug: { venueId: dto.venueId!, slug } },
          select: { id: true },
        });
        return !!existing;
      }
      const existing = await this.prisma.event.findUnique({
        where: { promoterId_slug: { promoterId: dto.promoterId!, slug } },
        select: { id: true },
      });
      return !!existing;
    };

    const externalAllowed = hasPromoter && !hasVenue;
    const buildData = (slug: string): Prisma.EventUncheckedCreateInput => ({
      venueId: hasVenue ? dto.venueId! : null,
      promoterId: hasPromoter ? dto.promoterId! : null,
      slug,
      title: dto.title,
      description: dto.description ?? null,
      startsAt: dto.startsAt,
      endsAt: dto.endsAt,
      coverImageUrl: dto.coverImageUrl ?? null,
      status: dto.status ?? 'DRAFT',
      capacity: dto.capacity ?? null,
      externalVenueName: externalAllowed ? dto.externalVenueName ?? null : null,
      externalVenueAddress: externalAllowed ? dto.externalVenueAddress ?? null : null,
      externalVenueCity: externalAllowed ? dto.externalVenueCity ?? null : null,
      externalVenueLat: externalAllowed ? dto.externalVenueLat ?? null : null,
      externalVenueLng: externalAllowed ? dto.externalVenueLng ?? null : null,
    });

    for (let attempt = 0; attempt < 5; attempt++) {
      const slug =
        attempt === 0 ? baseSlug : `${baseSlug}-${this.randomSuffix()}`;

      if (await slugExists(slug)) continue;

      return this.prisma.event.create({
        data: buildData(slug),
        include: { tiers: true },
      });
    }

    const slug = `${baseSlug}-${Date.now().toString(36)}`;
    return this.prisma.event.create({
      data: buildData(slug),
      include: { tiers: true },
    });
  }

  async list(query: ListEventsQuery, user: AuthUser) {
    const where: Prisma.EventWhereInput = {};

    if (query.venueId) where.venueId = query.venueId;
    if (query.promoterId) where.promoterId = query.promoterId;
    if (query.status) where.status = query.status;

    if (user.role === 'VENUE_OWNER' || user.role === 'VENUE_STAFF') {
      const ownedVenues = await this.prisma.venueOwner.findMany({
        where: { userId: user.id },
        select: { venueId: true },
      });
      const ownedVenueIds = ownedVenues.map((v) => v.venueId);

      if (query.venueId) {
        if (!ownedVenueIds.includes(query.venueId)) {
          return { items: [], total: 0, page: query.page, limit: query.limit };
        }
      } else {
        where.venueId = { in: ownedVenueIds };
      }
    } else if (user.role === 'PROMOTER' || user.role === 'PROMOTER_STAFF') {
      const memberships = await this.prisma.promoterMember.findMany({
        where: { userId: user.id },
        select: { promoterId: true },
      });
      const promoterIds = memberships.map((m) => m.promoterId);

      if (query.promoterId) {
        if (!promoterIds.includes(query.promoterId)) {
          return { items: [], total: 0, page: query.page, limit: query.limit };
        }
      } else {
        where.promoterId = { in: promoterIds };
      }
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.event.findMany({
        where,
        orderBy: { startsAt: 'asc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: { tiers: { orderBy: { position: 'asc' } } },
      }),
      this.prisma.event.count({ where }),
    ]);

    return { items, total, page: query.page, limit: query.limit };
  }

  async getById(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        tiers: { orderBy: { position: 'asc' } },
        venue: { select: { id: true, slug: true, name: true, city: true } },
        promoter: { select: { id: true, slug: true, name: true, logoUrl: true } },
      },
    });
    if (!event) throw new NotFoundException('Evento no encontrado');
    return event;
  }

  async update(id: string, dto: UpdateEventDto, user: AuthUser) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      select: {
        venueId: true,
        promoterId: true,
        coverImageUrl: true,
      },
    });
    if (!event) throw new NotFoundException('Evento no encontrado');

    await this.ensureEventOwner(
      { venueId: event.venueId, promoterId: event.promoterId },
      user.id,
      user.role,
    );

    const isPromoterEvent = !!event.promoterId;
    const hasExternalUpdate =
      dto.externalVenueName !== undefined ||
      dto.externalVenueAddress !== undefined ||
      dto.externalVenueCity !== undefined ||
      dto.externalVenueLat !== undefined ||
      dto.externalVenueLng !== undefined;

    if (hasExternalUpdate && !isPromoterEvent) {
      throw new BadRequestException(
        'Solo eventos del organizador pueden modificar la ubicación externa',
      );
    }

    if (dto.capacity !== undefined && dto.capacity !== null) {
      const tiers = await this.prisma.eventTier.findMany({
        where: { eventId: id },
        select: { capacity: true },
      });
      const sumTiers = tiers.reduce((acc, t) => acc + (t.capacity ?? 0), 0);
      if (sumTiers > dto.capacity) {
        throw new BadRequestException(
          `La nueva capacidad (${dto.capacity}) es menor que la suma de cupos de tiers (${sumTiers}). Ajusta los tiers primero.`,
        );
      }
    }

    const data: Prisma.EventUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.startsAt !== undefined) data.startsAt = dto.startsAt;
    if (dto.endsAt !== undefined) data.endsAt = dto.endsAt;
    if (dto.coverImageUrl !== undefined) data.coverImageUrl = dto.coverImageUrl;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.capacity !== undefined) data.capacity = dto.capacity;

    if (isPromoterEvent) {
      if (dto.externalVenueName !== undefined) data.externalVenueName = dto.externalVenueName;
      if (dto.externalVenueAddress !== undefined) data.externalVenueAddress = dto.externalVenueAddress;
      if (dto.externalVenueCity !== undefined) data.externalVenueCity = dto.externalVenueCity;
      if (dto.externalVenueLat !== undefined) data.externalVenueLat = dto.externalVenueLat;
      if (dto.externalVenueLng !== undefined) data.externalVenueLng = dto.externalVenueLng;
    }

    const oldCover =
      dto.coverImageUrl !== undefined &&
      event.coverImageUrl &&
      event.coverImageUrl !== dto.coverImageUrl
        ? event.coverImageUrl
        : null;

    const updated = await this.prisma.event.update({
      where: { id },
      data,
      include: { tiers: { orderBy: { position: 'asc' } } },
    });

    if (oldCover) {
      this.storage.deleteByPublicUrl(oldCover).catch(() => undefined);
    }

    return updated;
  }

  async remove(id: string, user: AuthUser) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      select: { venueId: true, promoterId: true, coverImageUrl: true },
    });
    if (!event) throw new NotFoundException('Evento no encontrado');

    await this.ensureEventOwner(
      { venueId: event.venueId, promoterId: event.promoterId },
      user.id,
      user.role,
    );

    await this.prisma.event.delete({ where: { id } });

    if (event.coverImageUrl) {
      this.storage.deleteByPublicUrl(event.coverImageUrl).catch(() => undefined);
    }

    return { ok: true };
  }

  async setFeatured(id: string, featured: boolean, reason?: string | null) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!event) throw new NotFoundException('Evento no encontrado');
    return this.prisma.event.update({
      where: { id },
      data: {
        isFeatured: featured,
        featuredAt: featured ? new Date() : null,
        featuredReason: featured ? reason ?? null : null,
      },
    });
  }

  // ─── Tiers ───────────────────────────────────────────────────────────────────

  private async assertTierCapacityFits(params: {
    eventId: string;
    newCapacity: number | null | undefined;
    excludeTierId?: string;
  }) {
    if (params.newCapacity == null) return;

    const event = await this.prisma.event.findUnique({
      where: { id: params.eventId },
      select: { capacity: true },
    });
    if (!event) throw new NotFoundException('Evento no encontrado');

    if (event.capacity != null && params.newCapacity > event.capacity) {
      throw new BadRequestException(
        `El cupo del tier (${params.newCapacity}) no puede exceder la capacidad del evento (${event.capacity}).`,
      );
    }

    const others = await this.prisma.eventTier.findMany({
      where: {
        eventId: params.eventId,
        ...(params.excludeTierId ? { NOT: { id: params.excludeTierId } } : {}),
      },
      select: { capacity: true },
    });
    const sumOthers = others.reduce((acc, t) => acc + (t.capacity ?? 0), 0);
    const total = sumOthers + params.newCapacity;
    if (event.capacity != null && total > event.capacity) {
      const remaining = Math.max(event.capacity - sumOthers, 0);
      throw new BadRequestException(
        `La suma de cupos de tiers (${total}) excede la capacidad del evento (${event.capacity}). Disponible: ${remaining}.`,
      );
    }
  }

  async createTier(eventId: string, dto: CreateTierDto, user: AuthUser) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { venueId: true, promoterId: true },
    });
    if (!event) throw new NotFoundException('Evento no encontrado');

    await this.ensureEventOwner(
      { venueId: event.venueId, promoterId: event.promoterId },
      user.id,
      user.role,
    );

    await this.assertTierCapacityFits({
      eventId,
      newCapacity: dto.capacity ?? null,
    });

    return this.prisma.eventTier.create({
      data: {
        eventId,
        name: dto.name,
        priceCents: dto.priceCents,
        currency: dto.currency ?? 'EUR',
        capacity: dto.capacity ?? null,
        position: dto.position ?? 0,
        minLoyaltyTier: dto.minLoyaltyTier ?? null,
      },
    });
  }

  async updateTier(
    eventId: string,
    tierId: string,
    dto: UpdateTierDto,
    user: AuthUser,
  ) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { venueId: true, promoterId: true },
    });
    if (!event) throw new NotFoundException('Evento no encontrado');

    await this.ensureEventOwner(
      { venueId: event.venueId, promoterId: event.promoterId },
      user.id,
      user.role,
    );

    const tier = await this.prisma.eventTier.findFirst({
      where: { id: tierId, eventId },
      select: { id: true },
    });
    if (!tier) throw new NotFoundException('Tier no encontrado');

    if (dto.capacity !== undefined) {
      await this.assertTierCapacityFits({
        eventId,
        newCapacity: dto.capacity,
        excludeTierId: tierId,
      });
    }

    const data: Prisma.EventTierUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.priceCents !== undefined) data.priceCents = dto.priceCents;
    if (dto.currency !== undefined) data.currency = dto.currency;
    if (dto.capacity !== undefined) data.capacity = dto.capacity;
    if (dto.position !== undefined) data.position = dto.position;
    if (dto.minLoyaltyTier !== undefined) data.minLoyaltyTier = dto.minLoyaltyTier;

    return this.prisma.eventTier.update({ where: { id: tierId }, data });
  }

  async removeTier(eventId: string, tierId: string, user: AuthUser) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { venueId: true, promoterId: true },
    });
    if (!event) throw new NotFoundException('Evento no encontrado');

    await this.ensureEventOwner(
      { venueId: event.venueId, promoterId: event.promoterId },
      user.id,
      user.role,
    );

    const tier = await this.prisma.eventTier.findFirst({
      where: { id: tierId, eventId },
      select: { id: true },
    });
    if (!tier) throw new NotFoundException('Tier no encontrado');

    await this.prisma.eventTier.delete({ where: { id: tierId } });
    return { ok: true };
  }
}
