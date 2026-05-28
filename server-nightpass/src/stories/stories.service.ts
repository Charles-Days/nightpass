import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  Prisma,
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

  // ─── Upload init ─────────────────────────────────────────────────────────

  async uploadInit(dto: UploadInitDto, user: AuthUser) {
    await this.assertVenueAccess(dto.venueId, user);

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
    const key = `stories/${dto.venueId}/${randomBytes(8).toString('hex')}-${Date.now()}.${ext}`;

    const { signedUrl, publicUrl } = await this.storage.getSignedUploadUrl(
      key,
      dto.contentType,
    );

    return { signedUrl, publicUrl, key };
  }

  // ─── Create ──────────────────────────────────────────────────────────────

  async create(dto: CreateStoryDto, user: AuthUser) {
    await this.assertVenueAccess(dto.venueId, user);

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
        venueId: dto.venueId,
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

  // ─── Soft delete ─────────────────────────────────────────────────────────

  async softDelete(id: string, user: AuthUser) {
    const story = await this.prisma.story.findUnique({
      where: { id },
      select: { id: true, venueId: true, mediaUrl: true, deletedAt: true },
    });
    if (!story) throw new NotFoundException('Story no encontrada');

    await this.assertVenueAccess(story.venueId, user);

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
