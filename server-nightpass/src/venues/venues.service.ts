import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Role, Prisma, VenueStatus, VenueStaffStatus } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ListVenuesQuery } from './dto/list-venues.query';
import { CreateVenueDto } from './dto/create-venue.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';
import { AuthUser } from '../auth/decorators/current-user.decorator';

interface CreateWithOwnerInput {
  name: string;
  city: string;
  address?: string | null;
  phone?: string | null;
  ownerUserId: string;
}

@Injectable()
export class VenuesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListVenuesQuery) {
    const where: Prisma.VenueWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.city) {
      where.city = { equals: query.city.trim(), mode: 'insensitive' };
    }
    if (query.search) {
      const term = query.search.trim();
      if (term) {
        where.name = { contains: term, mode: 'insensitive' };
      }
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.venue.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          _count: { select: { owners: true } },
        },
      }),
      this.prisma.venue.count({ where }),
    ]);

    return { items, total, page: query.page, limit: query.limit };
  }

  async getById(id: string) {
    const venue = await this.prisma.venue.findUnique({
      where: { id },
      include: {
        photos: {
          orderBy: { position: 'asc' },
        },
        owners: {
          include: {
            user: {
              select: { id: true, email: true, name: true, role: true },
            },
          },
        },
      },
    });
    if (!venue) throw new NotFoundException('Local no encontrado');
    return venue;
  }

  async getMyVenues(userId: string) {
    const countSelect = {
      events: true,
      staff: { where: { status: { not: VenueStaffStatus.REVOKED } } },
    } as const;

    const ownerships = await this.prisma.venueOwner.findMany({
      where: { userId },
      include: { venue: { include: { _count: { select: countSelect } } } },
    });

    if (ownerships.length > 0) {
      return ownerships.map((o) => o.venue);
    }

    // Fallback para VENUE_STAFF: devuelve los locales donde tiene membresía activa
    const memberships = await this.prisma.venueStaff.findMany({
      where: { userId, status: { not: VenueStaffStatus.REVOKED } },
      include: { venue: { include: { _count: { select: countSelect } } } },
    });
    return memberships.map((m) => m.venue);
  }

  async create(dto: CreateVenueDto) {
    const baseSlug = this.toSlug(dto.name);
    let lastError: unknown;

    for (let attempt = 0; attempt < 3; attempt++) {
      const slug = attempt === 0 ? baseSlug : `${baseSlug}-${this.randomSuffix()}`;
      try {
        const { ownerUserId, images, ...venueData } = dto;
        const venue = await this.prisma.venue.create({
          data: {
            ...venueData,
            slug,
            name: dto.name.trim(),
            city: dto.city.trim(),
            address: dto.address?.trim() || null,
            phone: dto.phone?.trim() || null,
            owners: ownerUserId
              ? { create: { userId: ownerUserId } }
              : undefined,
            photos: images?.length
              ? {
                  create: images.map((url, i) => ({ url, position: i })),
                }
              : undefined,
          },
        });
        return venue;
      } catch (err) {
        lastError = err;
        if (
          typeof err === 'object' &&
          err !== null &&
          'code' in err &&
          (err as { code: string }).code === 'P2002'
        ) {
          continue;
        }
        throw err;
      }
    }
    throw new InternalServerErrorException(
      `No se pudo generar un slug único para el local "${dto.name}"`,
      { cause: lastError instanceof Error ? lastError : undefined },
    );
  }

  async update(id: string, dto: UpdateVenueDto, user?: AuthUser) {
    const venue = await this.prisma.venue.findUnique({
      where: { id },
      include: { owners: { select: { userId: true } } },
    });
    if (!venue) throw new NotFoundException('Local no encontrado');

    // Permisos: ADMIN o dueño del local
    if (user && user.role !== Role.ADMIN) {
      const isOwner = venue.owners.some((o) => o.userId === user.id);
      if (!isOwner) throw new NotFoundException('Local no encontrado'); // Usamos 404 para no revelar existencia
    }

    const { images, ...rest } = dto;

    const data: Prisma.VenueUpdateInput = {
      ...rest,
      name: rest.name?.trim(),
      city: rest.city?.trim(),
      address: rest.address?.trim() || (rest.address === '' ? null : undefined),
      phone: rest.phone?.trim() || (rest.phone === '' ? null : undefined),
    };

    if (images !== undefined) {
      data.photos = {
        deleteMany: {},
        create: images.map((url, i) => ({ url, position: i })),
      };
    }

    // Clean undefined values from dto spread
    Object.keys(data).forEach(
      (key) => (data as any)[key] === undefined && delete (data as any)[key],
    );

    return this.prisma.venue.update({ where: { id }, data });
  }

  async suspend(id: string) {
    await this.ensureExists(id);
    return this.prisma.venue.update({
      where: { id },
      data: { status: VenueStatus.SUSPENDED },
    });
  }

  async reactivate(id: string) {
    await this.ensureExists(id);
    return this.prisma.venue.update({
      where: { id },
      data: { status: VenueStatus.ACTIVE },
    });
  }

  private async ensureExists(id: string): Promise<void> {
    const exists = await this.prisma.venue.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Local no encontrado');
  }
  /**
   * Crea un Venue + VenueOwner dentro de la transacción que se le pase.
   * Reintenta hasta 3 veces si choca el slug (poco probable).
   */
  async createWithOwner(
    tx: Prisma.TransactionClient,
    input: CreateWithOwnerInput,
  ) {
    const baseSlug = this.toSlug(input.name);
    let lastError: unknown;

    for (let attempt = 0; attempt < 3; attempt++) {
      const slug = `${baseSlug}-${this.randomSuffix()}`;
      try {
        const venue = await tx.venue.create({
          data: {
            slug,
            name: input.name,
            city: input.city,
            address: input.address ?? null,
            phone: input.phone ?? null,
          },
        });
        await tx.venueOwner.create({
          data: { userId: input.ownerUserId, venueId: venue.id },
        });
        return venue;
      } catch (err) {
        lastError = err;
        if (
          typeof err === 'object' &&
          err !== null &&
          'code' in err &&
          (err as { code: string }).code === 'P2002'
        ) {
          continue;
        }
        throw err;
      }
    }

    throw new InternalServerErrorException(
      `No se pudo generar un slug único para el local "${input.name}"`,
      { cause: lastError instanceof Error ? lastError : undefined },
    );
  }

  private toSlug(name: string): string {
    return name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 60) || 'local';
  }

  private randomSuffix(): string {
    return randomBytes(3).toString('hex');
  }
}
