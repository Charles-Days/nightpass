import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role, Prisma, VenueStatus, VenueStaffStatus, Photo, EventStatus } from '@prisma/client';
import { randomBytes } from 'crypto';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { MailerService } from '../mailer/mailer.service';
import { ListVenuesQuery } from './dto/list-venues.query';
import { CreateVenueDto } from './dto/create-venue.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';
import { AssignOwnerDto } from './dto/assign-owner.dto';
import { generateTemporaryPassword } from '../auth/utils/temporary-password';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { reconcileUserRole } from '../common/reconcile-user-role';

const ARGON2_OPTS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

interface CreateWithOwnerInput {
  name: string;
  city: string;
  address?: string | null;
  phone?: string | null;
  ownerUserId: string;
}

@Injectable()
export class VenuesService {
  private readonly logger = new Logger(VenuesService.name);
  private readonly uploadsUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly storage: StorageService,
    private readonly mailer: MailerService,
  ) {
    this.uploadsUrl = this.config.get<string>('LOCAL_UPLOADS_URL') || '';
  }

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
          photos: { orderBy: { position: 'asc' } },
        },
      }),
      this.prisma.venue.count({ where }),
    ]);

    return { 
      items: items.map(v => this._mapVenueUrls(v)), 
      total, 
      page: query.page, 
      limit: query.limit 
    };
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
        events: {
          where: {
            status: EventStatus.PUBLISHED,
            endsAt: { gte: new Date() },
          },
          orderBy: { startsAt: 'asc' },
          include: {
            tiers: { orderBy: { position: 'asc' } },
          },
        },
      },
    });
    if (!venue) throw new NotFoundException('Local no encontrado');
    return this._mapVenueUrls(venue);
  }

  async getMyVenues(userId: string) {
    const countSelect = {
      events: true,
      staff: { where: { status: { not: VenueStaffStatus.REVOKED } } },
    } as const;

    const ownerships = await this.prisma.venueOwner.findMany({
      where: { userId },
      include: { 
        venue: { 
          include: { 
            _count: { select: countSelect },
            photos: { orderBy: { position: 'asc' } }
          } 
        } 
      },
    });

    if (ownerships.length > 0) {
      return ownerships.map((o) => this._mapVenueUrls(o.venue));
    }

    const memberships = await this.prisma.venueStaff.findMany({
      where: { userId, status: { not: VenueStaffStatus.REVOKED } },
      include: { 
        venue: { 
          include: { 
            _count: { select: countSelect },
            photos: { orderBy: { position: 'asc' } }
          } 
        } 
      },
    });
    return memberships.map((m) => this._mapVenueUrls(m.venue));
  }

  async create(dto: CreateVenueDto) {
    const baseSlug = this.toSlug(dto.name);
    let lastError: unknown;

    for (let attempt = 0; attempt < 3; attempt++) {
      const slug = attempt === 0 ? baseSlug : `${baseSlug}-${this.randomSuffix()}`;
      try {
        const { ownerUserId, images, ...venueData } = dto;
        
        // Strip base URL for storage
        const coverImageUrl = venueData.coverImageUrl ? this._stripBaseUrl(venueData.coverImageUrl) : undefined;
        const strippedImages = images?.map(img => this._stripBaseUrl(img));

        const venue = await this.prisma.$transaction(async (tx) => {
          const created = await tx.venue.create({
            data: {
              ...venueData,
              coverImageUrl,
              slug,
              name: dto.name.trim(),
              city: dto.city.trim(),
              address: dto.address?.trim() || null,
              phone: dto.phone?.trim() || null,
              owners: ownerUserId
                ? { create: { userId: ownerUserId } }
                : undefined,
              photos: strippedImages?.length
                ? {
                    create: strippedImages.map((url, i) => ({ url, position: i })),
                  }
                : undefined,
            },
          });

          // Promover al dueño asignado: si era CUSTOMER pasa a VENUE_OWNER, o
          // queda con la membresía pero sin rol → no puede entrar al panel.
          // Scoped a CUSTOMER — no degrada ADMIN ni un panel role existente.
          if (ownerUserId) {
            await tx.user.updateMany({
              where: { id: ownerUserId, role: Role.CUSTOMER },
              data: { role: Role.VENUE_OWNER },
            });
          }

          return created;
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
      include: {
        owners: { select: { userId: true } },
        photos: { select: { url: true } },
      },
    });
    if (!venue) throw new NotFoundException('Local no encontrado');

    if (user && user.role !== Role.ADMIN) {
      const isOwner = venue.owners.some((o) => o.userId === user.id);
      if (!isOwner) throw new NotFoundException('Local no encontrado');
      // Non-admin callers cannot mutate moderation fields.
      delete (dto as Record<string, unknown>).status;
      delete (dto as Record<string, unknown>).slug;
    }

    const { images, ...rest } = dto;
    const newCover = rest.coverImageUrl ? this._stripBaseUrl(rest.coverImageUrl) : undefined;
    const newPhotoUrls = images?.map(u => this._stripBaseUrl(u));

    const orphanKeys: string[] = [];
    if (newCover !== undefined && venue.coverImageUrl && venue.coverImageUrl !== newCover) {
      orphanKeys.push(venue.coverImageUrl);
    }
    if (newPhotoUrls !== undefined) {
      const newSet = new Set(newPhotoUrls);
      for (const p of venue.photos) {
        if (!newSet.has(p.url)) orphanKeys.push(p.url);
      }
    }

    const data: Prisma.VenueUpdateInput = {
      ...rest,
      coverImageUrl: newCover,
      name: rest.name?.trim(),
      city: rest.city?.trim(),
      address: rest.address?.trim() || (rest.address === '' ? null : undefined),
      phone: rest.phone?.trim() || (rest.phone === '' ? null : undefined),
    };

    if (newPhotoUrls !== undefined) {
      data.photos = {
        deleteMany: {},
        create: newPhotoUrls.map((url, i) => ({ url, position: i })),
      };
    }

    Object.keys(data).forEach(
      (key) => (data as any)[key] === undefined && delete (data as any)[key],
    );

    const updated = await this.prisma.venue.update({ where: { id }, data });

    if (orphanKeys.length) {
      this.storage.deleteByPublicUrls(orphanKeys).catch(() => undefined);
    }

    return updated;
  }

  async suspend(id: string, reason?: string) {
    const venue = await this.prisma.venue.findUnique({
      where: { id },
      include: {
        owners: {
          include: {
            user: { select: { email: true, name: true } },
          },
        },
      },
    });
    if (!venue) throw new NotFoundException('Local no encontrado');

    const updated = await this.prisma.venue.update({
      where: { id },
      data: { status: VenueStatus.SUSPENDED },
    });

    for (const owner of venue.owners) {
      void this.mailer
        .sendVenueSuspended(
          owner.user.email,
          owner.user.name ?? 'amig@',
          venue.name,
          reason,
        )
        .catch((err) =>
          this.logger.error(
            `Email suspensión venue falló (${owner.user.email}): ${err instanceof Error ? err.message : err}`,
          ),
        );
    }

    return updated;
  }

  async reactivate(id: string) {
    const venue = await this.prisma.venue.findUnique({
      where: { id },
      include: {
        owners: {
          include: {
            user: { select: { email: true, name: true } },
          },
        },
      },
    });
    if (!venue) throw new NotFoundException('Local no encontrado');

    const updated = await this.prisma.venue.update({
      where: { id },
      data: { status: VenueStatus.ACTIVE },
    });

    for (const owner of venue.owners) {
      void this.mailer
        .sendVenueReactivated(
          owner.user.email,
          owner.user.name ?? 'amig@',
          venue.name,
        )
        .catch((err) =>
          this.logger.error(
            `Email reactivación venue falló (${owner.user.email}): ${err instanceof Error ? err.message : err}`,
          ),
        );
    }

    return updated;
  }

  async setPlatformFee(id: string, pct: number | null) {
    // null = sin comisión propia → usa la global del servidor.
    // Un número (incluido 0) es explícito; 0 = NightPass no cobra comisión.
    if (pct !== null && (!Number.isFinite(pct) || pct < 0 || pct > 100)) {
      throw new BadRequestException('platformFeePct debe estar entre 0 y 100');
    }
    const venue = await this.prisma.venue.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!venue) throw new NotFoundException('Local no encontrado');
    return this.prisma.venue.update({
      where: { id },
      data: { platformFeePct: pct },
    });
  }

  async setCashCommissionExempt(id: string, exempt: boolean) {
    const venue = await this.prisma.venue.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!venue) throw new NotFoundException('Local no encontrado');
    return this.prisma.venue.update({
      where: { id },
      data: { cashCommissionExempt: exempt },
    });
  }

  async setFeatured(id: string, featured: boolean, reason?: string | null) {
    const venue = await this.prisma.venue.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!venue) throw new NotFoundException('Local no encontrado');
    return this.prisma.venue.update({
      where: { id },
      data: {
        isFeatured: featured,
        featuredAt: featured ? new Date() : null,
        featuredReason: featured ? reason ?? null : null,
      },
    });
  }

  private _resolveUploadUrl(url: string): string {
    if (!url) return url;
    // Relative → prefix with our uploads base
    if (!url.startsWith('http')) {
      return `${this.uploadsUrl}/${url}`.replace(/([^:]\/)\/+/g, '$1');
    }
    // CDN / R2 / external URL (no /uploads/ path) → keep as-is
    if (!url.includes('/uploads/')) {
      return url;
    }
    // Absolute local URL with /uploads/ path (possibly a different IP).
    // Rebuild against our own LOCAL_UPLOADS_URL so the IP is always correct.
    const uploadsIndex = url.indexOf('/uploads/');
    const relativePath = url.slice(uploadsIndex + '/uploads/'.length);
    return `${this.uploadsUrl}/${relativePath}`.replace(/([^:]\/)\/+/g, '$1');
  }

  private _mapVenueUrls<T extends { coverImageUrl?: string | null; photos?: Photo[] }>(venue: T): T {
    if (venue.coverImageUrl) {
      venue.coverImageUrl = this._resolveUploadUrl(venue.coverImageUrl);
    }
    if (venue.photos) {
      venue.photos = venue.photos.map(p => ({
        ...p,
        url: this._resolveUploadUrl(p.url)
      }));
    }
    return venue;
  }

  private _stripBaseUrl(url: string): string {
    if (!url || !this.uploadsUrl) return url;
    // Strip any absolute upload URL (regardless of which host/IP it uses)
    if (url.includes('/uploads/')) {
      const uploadsIndex = url.indexOf('/uploads/');
      return url.slice(uploadsIndex + '/uploads/'.length);
    }
    return url;
  }

  private async ensureExists(id: string): Promise<void> {
    const exists = await this.prisma.venue.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Local no encontrado');
  }

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

  /**
   * Asigna un usuario como dueño de un local existente. ADMIN-only.
   *
   * Cuatro caminos según el estado del email:
   *  1. Email NO existe → crea User con role VENUE_OWNER + temp password +
   *     mustChangePassword=true. Email con credenciales.
   *  2. Email existe como CUSTOMER → promueve a VENUE_OWNER, genera temp
   *     password nueva (reemplaza la anterior). Email con credenciales
   *     marcado como `isExistingUser=true`.
   *  3. Email existe como VENUE_OWNER / VENUE_STAFF → suma ownership sin
   *     tocar password ni rol. Email ligero "te asignaron X, usa tu cuenta".
   *  4. Email existe como ADMIN → 409.
   *
   * Idempotente parcial: si el usuario YA es dueño del venue → 409.
   */
  async assignOwner(venueId: string, dto: AssignOwnerDto) {
    const venue = await this.prisma.venue.findUnique({
      where: { id: venueId },
      select: { id: true, name: true, status: true },
    });
    if (!venue) throw new NotFoundException('Local no encontrado');
    if (venue.status === VenueStatus.SUSPENDED) {
      throw new BadRequestException(
        'No puedes asignar un dueño a un local suspendido. Reactívalo primero.',
      );
    }

    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, role: true },
    });

    if (existing?.role === Role.ADMIN) {
      throw new ConflictException(
        'Este usuario es ADMIN — no puede ser asignado como dueño de un local.',
      );
    }

    if (existing) {
      const alreadyOwner = await this.prisma.venueOwner.findUnique({
        where: { userId_venueId: { userId: existing.id, venueId } },
        select: { userId: true },
      });
      if (alreadyOwner) {
        throw new ConflictException('Este usuario ya es dueño de este local.');
      }
    }

    // CASE 1 + 2: necesitamos temp password (user nuevo o CUSTOMER promovido).
    const needsTempPassword =
      !existing || existing.role === Role.CUSTOMER;

    if (needsTempPassword) {
      const tempPassword = generateTemporaryPassword(12);
      const passwordHash = await argon2.hash(tempPassword, ARGON2_OPTS);
      const isExistingUser = Boolean(existing);

      const result = await this.prisma.$transaction(async (tx) => {
        const user = existing
          ? await tx.user.update({
              where: { id: existing.id },
              data: {
                passwordHash,
                role: Role.VENUE_OWNER,
                mustChangePassword: true,
              },
              select: { id: true, email: true, name: true, role: true },
            })
          : await tx.user.create({
              data: {
                email,
                passwordHash,
                name: dto.name?.trim() || null,
                role: Role.VENUE_OWNER,
                mustChangePassword: true,
              },
              select: { id: true, email: true, name: true, role: true },
            });

        await tx.venueOwner.create({
          data: { userId: user.id, venueId },
        });

        return user;
      });

      void this.mailer
        .sendApplicationApproved(
          result.email,
          result.name ?? 'Hola',
          venue.name,
          tempPassword,
          isExistingUser,
        )
        .catch((err) => this.logger.warn(`Owner-assign email failed: ${err.message}`));

      return {
        userId: result.id,
        email: result.email,
        name: result.name,
        isNewUser: !existing,
        wasPromoted: isExistingUser,
        // Solo devolvemos la temp pw para que el admin pueda verla una sola vez
        // por si el email falla (no se persiste en plaintext en logs).
        temporaryPassword: tempPassword,
      };
    }

    // CASE 3: usuario existente con rol OWNER/STAFF — solo añadir ownership.
    await this.prisma.venueOwner.create({
      data: { userId: existing!.id, venueId },
    });

    void this.mailer
      .sendVenueOwnerAssigned(existing!.email, existing!.name ?? 'Hola', venue.name)
      .catch((err) => this.logger.warn(`Owner-assign (existing) email failed: ${err.message}`));

    return {
      userId: existing!.id,
      email: existing!.email,
      name: existing!.name,
      isNewUser: false,
      wasPromoted: false,
      temporaryPassword: null,
    };
  }

  /** Quita la relación VenueOwner. Degrada a CUSTOMER al user si se queda sin
   *  ningún respaldo de panel (sin ser dueño ni staff activo de ningún local) —
   *  de lo contrario queda con rol VENUE_OWNER huérfano y el panel se rompe.
   *  Solo degrada VENUE_OWNER — nunca staff/ADMIN. ADMIN-only. */
  async removeOwner(venueId: string, userId: string) {
    const exists = await this.prisma.venueOwner.findUnique({
      where: { userId_venueId: { userId, venueId } },
      select: { userId: true },
    });
    if (!exists) throw new NotFoundException('Esta relación no existe');

    await this.prisma.$transaction(async (tx) => {
      await tx.venueOwner.delete({
        where: { userId_venueId: { userId, venueId } },
      });

      await reconcileUserRole(tx, userId);
    });

    return { ok: true };
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
