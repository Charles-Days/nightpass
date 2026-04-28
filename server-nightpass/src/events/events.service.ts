import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { ListEventsQuery } from './dto/list-events.query';
import { CreateTierDto } from './dto/create-tier.dto';
import { UpdateTierDto } from './dto/update-tier.dto';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

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
   * Verifica que el usuario tiene permisos sobre el venue.
   * - ADMIN: siempre pasa.
   * - VENUE_OWNER: debe tener entrada en VenueOwner.
   * - Otros roles: deniegan (VENUE_STAFF solo puede listar vía el controller).
   */
  private async ensureVenueOwner(
    venueId: string,
    userId: string,
    userRole: string,
  ): Promise<void> {
    if (userRole === 'ADMIN') return;

    if (userRole === 'VENUE_OWNER') {
      const link = await this.prisma.venueOwner.findUnique({
        where: { userId_venueId: { userId, venueId } },
        select: { userId: true },
      });
      if (!link) {
        throw new NotFoundException('Local no encontrado o sin permisos');
      }
      return;
    }

    throw new ForbiddenException('No tienes permisos para gestionar eventos');
  }

  // ─── Events CRUD ─────────────────────────────────────────────────────────────

  async create(dto: CreateEventDto, user: AuthUser) {
    await this.ensureVenueOwner(dto.venueId, user.id, user.role);

    const baseSlug = this.toSlug(dto.title);

    // Intentar crear con el slug base, reintentar con sufijo random si colisiona
    for (let attempt = 0; attempt < 5; attempt++) {
      const slug =
        attempt === 0 ? baseSlug : `${baseSlug}-${this.randomSuffix()}`;

      const existing = await this.prisma.event.findUnique({
        where: { venueId_slug: { venueId: dto.venueId, slug } },
        select: { id: true },
      });

      if (existing) continue;

      return this.prisma.event.create({
        data: {
          venueId: dto.venueId,
          slug,
          title: dto.title,
          description: dto.description ?? null,
          startsAt: dto.startsAt,
          endsAt: dto.endsAt,
          coverImageUrl: dto.coverImageUrl ?? null,
          status: dto.status ?? 'DRAFT',
          capacity: dto.capacity ?? null,
        },
        include: { tiers: true },
      });
    }

    // último intento con timestamp para garantizar unicidad
    const slug = `${baseSlug}-${Date.now().toString(36)}`;
    return this.prisma.event.create({
      data: {
        venueId: dto.venueId,
        slug,
        title: dto.title,
        description: dto.description ?? null,
        startsAt: dto.startsAt,
        endsAt: dto.endsAt,
        coverImageUrl: dto.coverImageUrl ?? null,
        status: dto.status ?? 'DRAFT',
        capacity: dto.capacity ?? null,
      },
      include: { tiers: true },
    });
  }

  async list(query: ListEventsQuery, user: AuthUser) {
    const where: Prisma.EventWhereInput = {};

    if (query.venueId) where.venueId = query.venueId;
    if (query.status) where.status = query.status;

    // VENUE_OWNER solo ve eventos de sus venues
    if (user.role === 'VENUE_OWNER') {
      const ownedVenues = await this.prisma.venueOwner.findMany({
        where: { userId: user.id },
        select: { venueId: true },
      });
      const ownedVenueIds = ownedVenues.map((v) => v.venueId);

      if (query.venueId) {
        // Si ya filtró por venueId, verificar que sea suyo
        if (!ownedVenueIds.includes(query.venueId)) {
          return { items: [], total: 0, page: query.page, limit: query.limit };
        }
      } else {
        where.venueId = { in: ownedVenueIds };
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
      },
    });
    if (!event) throw new NotFoundException('Evento no encontrado');
    return event;
  }

  async update(id: string, dto: UpdateEventDto, user: AuthUser) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      select: { venueId: true },
    });
    if (!event) throw new NotFoundException('Evento no encontrado');

    await this.ensureVenueOwner(event.venueId, user.id, user.role);

    const data: Prisma.EventUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.startsAt !== undefined) data.startsAt = dto.startsAt;
    if (dto.endsAt !== undefined) data.endsAt = dto.endsAt;
    if (dto.coverImageUrl !== undefined) data.coverImageUrl = dto.coverImageUrl;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.capacity !== undefined) data.capacity = dto.capacity;

    return this.prisma.event.update({
      where: { id },
      data,
      include: { tiers: { orderBy: { position: 'asc' } } },
    });
  }

  async remove(id: string, user: AuthUser) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      select: { venueId: true },
    });
    if (!event) throw new NotFoundException('Evento no encontrado');

    await this.ensureVenueOwner(event.venueId, user.id, user.role);

    await this.prisma.event.delete({ where: { id } });
    return { ok: true };
  }

  // ─── Tiers ───────────────────────────────────────────────────────────────────

  async createTier(eventId: string, dto: CreateTierDto, user: AuthUser) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { venueId: true },
    });
    if (!event) throw new NotFoundException('Evento no encontrado');

    await this.ensureVenueOwner(event.venueId, user.id, user.role);

    return this.prisma.eventTier.create({
      data: {
        eventId,
        name: dto.name,
        priceCents: dto.priceCents,
        currency: dto.currency ?? 'EUR',
        capacity: dto.capacity ?? null,
        position: dto.position ?? 0,
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
      select: { venueId: true },
    });
    if (!event) throw new NotFoundException('Evento no encontrado');

    await this.ensureVenueOwner(event.venueId, user.id, user.role);

    const tier = await this.prisma.eventTier.findFirst({
      where: { id: tierId, eventId },
      select: { id: true },
    });
    if (!tier) throw new NotFoundException('Tier no encontrado');

    const data: Prisma.EventTierUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.priceCents !== undefined) data.priceCents = dto.priceCents;
    if (dto.currency !== undefined) data.currency = dto.currency;
    if (dto.capacity !== undefined) data.capacity = dto.capacity;
    if (dto.position !== undefined) data.position = dto.position;

    return this.prisma.eventTier.update({ where: { id: tierId }, data });
  }

  async removeTier(eventId: string, tierId: string, user: AuthUser) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { venueId: true },
    });
    if (!event) throw new NotFoundException('Evento no encontrado');

    await this.ensureVenueOwner(event.venueId, user.id, user.role);

    const tier = await this.prisma.eventTier.findFirst({
      where: { id: tierId, eventId },
      select: { id: true },
    });
    if (!tier) throw new NotFoundException('Tier no encontrado');

    await this.prisma.eventTier.delete({ where: { id: tierId } });
    return { ok: true };
  }
}
