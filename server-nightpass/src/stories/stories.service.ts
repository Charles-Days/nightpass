import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  EventStatus,
  Prisma,
  PromoterStatus,
  Role,
  StoryMediaType,
  VenueStaffStatus,
  VenueStatus,
} from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { CreateStoryDto } from './dto/create-story.dto';
import {
  STORY_ALLOWED_MIMES,
  STORY_MAX_BYTES,
  UploadInitDto,
} from './dto/upload-init.dto';

const STORY_TTL_MS = 24 * 60 * 60 * 1000;
const STORY_VIDEO_MAX_DURATION_MS = 15_000;

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
};

const STORY_PUBLIC_SELECT = {
  id: true,
  venueId: true,
  eventId: true,
  mediaUrl: true,
  mediaType: true,
  durationMs: true,
  caption: true,
  createdAt: true,
  expiresAt: true,
} satisfies Prisma.StorySelect;

@Injectable()
export class StoriesService {
  private readonly logger = new Logger(StoriesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  // ─── Helpers ─────────────────────────────────────────────────────────────

  /**
   * Verifica que el user tiene acceso al venue como OWNER, STAFF activo, o ADMIN.
   * Mismo patrón que PasesService.assertVenueAccess.
   */
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

  /**
   * Acceso a un evento como PROMOTER/PROMOTER_STAFF dueño del promoter,
   * VENUE_OWNER/STAFF del venue al que pertenece el evento, o ADMIN.
   */
  private async assertEventAccess(
    eventId: string,
    user: AuthUser,
  ): Promise<{ eventId: string; venueId: string | null }> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, venueId: true, promoterId: true },
    });
    if (!event) throw new NotFoundException('Evento no encontrado');

    if (user.role === Role.ADMIN) {
      return { eventId: event.id, venueId: event.venueId };
    }

    if (event.venueId && (user.role === Role.VENUE_OWNER || user.role === Role.VENUE_STAFF)) {
      await this.assertVenueAccess(event.venueId, user);
      return { eventId: event.id, venueId: event.venueId };
    }

    if (event.promoterId && (user.role === Role.PROMOTER || user.role === Role.PROMOTER_STAFF)) {
      const member = await this.prisma.promoterMember.findUnique({
        where: { userId_promoterId: { userId: user.id, promoterId: event.promoterId } },
        select: { promoter: { select: { status: true } } },
      });
      if (!member || member.promoter.status !== PromoterStatus.ACTIVE) {
        throw new ForbiddenException('No tienes acceso a este evento');
      }
      return { eventId: event.id, venueId: event.venueId };
    }

    throw new ForbiddenException('No tienes acceso a este evento');
  }

  private requireExactlyOneTarget(
    venueId: string | undefined,
    eventId: string | undefined,
  ): void {
    const hasVenue = !!venueId;
    const hasEvent = !!eventId;
    if (hasVenue === hasEvent) {
      throw new BadRequestException(
        'Debes especificar exactamente uno: venueId o eventId',
      );
    }
  }

  // ─── Upload init ─────────────────────────────────────────────────────────

  async uploadInit(dto: UploadInitDto, user: AuthUser) {
    this.requireExactlyOneTarget(dto.venueId, dto.eventId);
    let scopeKey: string;
    if (dto.venueId) {
      await this.assertVenueAccess(dto.venueId, user);
      scopeKey = `venues/${dto.venueId}`;
    } else {
      await this.assertEventAccess(dto.eventId!, user);
      scopeKey = `events/${dto.eventId}`;
    }

    const allowed = STORY_ALLOWED_MIMES[dto.mediaType];
    if (!allowed.includes(dto.contentType)) {
      throw new BadRequestException(
        `Content-Type no permitido para ${dto.mediaType}`,
      );
    }

    const maxBytes = STORY_MAX_BYTES[dto.mediaType];
    if (dto.sizeBytes > maxBytes) {
      throw new BadRequestException(
        `Archivo excede el límite (${maxBytes} bytes)`,
      );
    }

    const ext = EXT_BY_MIME[dto.contentType] ?? 'bin';
    const key = `stories/${scopeKey}/${randomBytes(8).toString('hex')}-${Date.now()}.${ext}`;

    const { signedUrl, publicUrl } = await this.storage.getSignedUploadUrl(
      key,
      dto.contentType,
    );

    return { signedUrl, publicUrl, key };
  }

  // ─── Create ──────────────────────────────────────────────────────────────

  async create(dto: CreateStoryDto, user: AuthUser) {
    this.requireExactlyOneTarget(dto.venueId, dto.eventId);
    if (dto.venueId) {
      await this.assertVenueAccess(dto.venueId, user);
    } else {
      await this.assertEventAccess(dto.eventId!, user);
    }

    if (dto.mediaType === StoryMediaType.VIDEO) {
      if (dto.durationMs == null) {
        throw new BadRequestException(
          'durationMs es requerido para stories de video',
        );
      }
      if (dto.durationMs > STORY_VIDEO_MAX_DURATION_MS) {
        throw new BadRequestException(
          `Video excede ${STORY_VIDEO_MAX_DURATION_MS}ms`,
        );
      }
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + STORY_TTL_MS);

    return this.prisma.story.create({
      data: {
        venueId: dto.venueId ?? null,
        eventId: dto.eventId ?? null,
        createdById: user.id,
        mediaUrl: dto.mediaUrl,
        mediaType: dto.mediaType,
        durationMs:
          dto.mediaType === StoryMediaType.VIDEO ? dto.durationMs ?? null : null,
        caption: dto.caption ?? null,
        expiresAt,
      },
      select: STORY_PUBLIC_SELECT,
    });
  }

  // ─── List mine (panel) ───────────────────────────────────────────────────

  async listMine(venueId: string, user: AuthUser) {
    await this.assertVenueAccess(venueId, user);

    const now = new Date();
    return this.prisma.story.findMany({
      where: {
        venueId,
        deletedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
      select: STORY_PUBLIC_SELECT,
    });
  }

  async listMineByEvent(eventId: string, user: AuthUser) {
    await this.assertEventAccess(eventId, user);

    const now = new Date();
    return this.prisma.story.findMany({
      where: {
        eventId,
        deletedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
      select: STORY_PUBLIC_SELECT,
    });
  }

  // ─── Soft delete ─────────────────────────────────────────────────────────

  async softDelete(id: string, user: AuthUser) {
    const story = await this.prisma.story.findUnique({
      where: { id },
      select: { id: true, venueId: true, eventId: true, mediaUrl: true, deletedAt: true },
    });
    if (!story) throw new NotFoundException('Story no encontrada');

    if (story.venueId) {
      await this.assertVenueAccess(story.venueId, user);
    } else if (story.eventId) {
      await this.assertEventAccess(story.eventId, user);
    } else {
      throw new ForbiddenException('Story sin owner');
    }

    if (story.deletedAt) {
      return { id: story.id, deletedAt: story.deletedAt };
    }

    const updated = await this.prisma.story.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true, deletedAt: true },
    });

    // Fire-and-forget cleanup del archivo en R2/local.
    this.storage.deleteByPublicUrl(story.mediaUrl).catch(() => undefined);

    return updated;
  }

  // ─── Public feed (catalog) ───────────────────────────────────────────────

  /**
   * Stories activas a nivel global, agrupadas por venue (solo venues ACTIVE).
   * Pensado para el carrusel horizontal de la landing del cliente.
   */
  async getActiveGroupedByVenue(limit = 50) {
    const now = new Date();

    const stories = await this.prisma.story.findMany({
      where: {
        deletedAt: null,
        expiresAt: { gt: now },
        venue: { status: VenueStatus.ACTIVE },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        ...STORY_PUBLIC_SELECT,
        venue: {
          select: {
            id: true,
            slug: true,
            name: true,
            coverImageUrl: true,
          },
        },
      },
    });

    // Agrupar por venue manteniendo el orden de aparición (primer story más reciente).
    const grouped = new Map<
      string,
      {
        venueId: string;
        venueSlug: string;
        venueName: string;
        venueCoverImageUrl: string | null;
        stories: Array<Prisma.StoryGetPayload<{ select: typeof STORY_PUBLIC_SELECT }>>;
      }
    >();

    for (const row of stories) {
      const { venue, ...story } = row;
      if (!venue) continue;
      const existing = grouped.get(venue.id);
      if (existing) {
        existing.stories.push(story);
      } else {
        grouped.set(venue.id, {
          venueId: venue.id,
          venueSlug: venue.slug,
          venueName: venue.name,
          venueCoverImageUrl: venue.coverImageUrl,
          stories: [story],
        });
      }
    }

    return Array.from(grouped.values());
  }

  /**
   * Stories activas de un venue concreto por slug.
   * Usado por el viewer fullscreen y el anillo en /app/bar/:slug.
   */
  async getActiveByVenueSlug(slug: string) {
    const venue = await this.prisma.venue.findUnique({
      where: { slug },
      select: { id: true, slug: true, name: true, coverImageUrl: true, status: true },
    });
    if (!venue || venue.status !== VenueStatus.ACTIVE) {
      throw new NotFoundException('Local no encontrado');
    }

    const now = new Date();
    const stories = await this.prisma.story.findMany({
      where: {
        venueId: venue.id,
        deletedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'asc' },
      select: STORY_PUBLIC_SELECT,
    });

    return {
      venueId: venue.id,
      venueSlug: venue.slug,
      venueName: venue.name,
      venueCoverImageUrl: venue.coverImageUrl,
      stories,
    };
  }

  /**
   * Stories activas de un evento PUBLISHED concreto.
   * Usado por el viewer fullscreen y la sección de historias en /app/evento/:id.
   */
  async getActiveByEventId(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, title: true, coverImageUrl: true, status: true },
    });
    if (!event || event.status !== EventStatus.PUBLISHED) {
      throw new NotFoundException('Evento no encontrado');
    }

    const now = new Date();
    const stories = await this.prisma.story.findMany({
      where: {
        eventId: event.id,
        deletedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'asc' },
      select: STORY_PUBLIC_SELECT,
    });

    return {
      eventId: event.id,
      eventTitle: event.title,
      eventCoverImageUrl: event.coverImageUrl,
      stories,
    };
  }

  // ─── Cleanup cron ────────────────────────────────────────────────────────

  /**
   * Hourly safety net. La R2 Lifecycle Rule borra el archivo a las 24h,
   * pero igual marcamos las rows como deletedAt para que las queries
   * "active" sigan siendo rápidas e indexadas.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async purgeExpired(): Promise<void> {
    const now = new Date();
    const batch = await this.prisma.story.findMany({
      where: {
        deletedAt: null,
        expiresAt: { lt: now },
      },
      take: 500,
      select: { id: true, mediaUrl: true },
    });

    if (batch.length === 0) return;

    const ids = batch.map((s) => s.id);
    const urls = batch.map((s) => s.mediaUrl);

    await this.prisma.story.updateMany({
      where: { id: { in: ids } },
      data: { deletedAt: now },
    });

    // Fire-and-forget cleanup en storage. R2 Lifecycle también las purga.
    this.storage.deleteByPublicUrls(urls).catch(() => undefined);

    this.logger.log(`Purged ${batch.length} expired stories`);
  }
}
