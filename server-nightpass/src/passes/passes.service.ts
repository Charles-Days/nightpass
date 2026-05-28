import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  LocationPingSource,
  OrderStatus,
  Role,
  VenueStaffStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { LocationsService } from '../locations/locations.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { parseQr, recomputeHmac, verifyHmac } from '../common/qr-hmac';
import { haversineMeters } from '../common/geo';

@Injectable()
export class PassesService {
  private readonly logger = new Logger(PassesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly locations: LocationsService,
    private readonly loyalty: LoyaltyService,
  ) {}

  // ── Listado de mis passes activos ────────────────────────────────────────

  async listMine(userId: string) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    return this.prisma.pass.findMany({
      where: {
        userId,
        usedAt: null,
        order: { status: OrderStatus.COMPLETED },
        event: { startsAt: { gte: startOfToday } },
      },
      orderBy: { event: { startsAt: 'asc' } },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            startsAt: true,
            endsAt: true,
            coverImageUrl: true,
            venue: { select: { id: true, name: true, slug: true, address: true } },
          },
        },
        order: { include: { tier: { select: { id: true, name: true } } } },
      },
    });
  }

  // ── Detalle del pase (incluye qrCode) ────────────────────────────────────

  async getById(id: string, user: AuthUser) {
    const pass = await this.prisma.pass.findUnique({
      where: { id },
      include: {
        event: {
          include: {
            venue: {
              select: { id: true, name: true, slug: true, address: true, city: true },
            },
          },
        },
        order: { include: { tier: true } },
        user: { select: { id: true, email: true, name: true } },
      },
    });
    if (!pass) throw new NotFoundException('Pase no encontrado');
    if (user.role !== Role.ADMIN && pass.userId !== user.id) {
      throw new ForbiddenException('No tienes acceso a este pase');
    }
    return pass;
  }

  // ── Escaneo (STAFF / ADMIN) ──────────────────────────────────────────────

  async scan(qrCode: string, scanner: AuthUser) {
    const passSecret = this.config.get<string>('PASS_HMAC_SECRET');
    if (!passSecret) {
      throw new ServiceUnavailableException(
        'PASS_HMAC_SECRET no configurado',
      );
    }

    const parsed = parseQr(qrCode);
    if (!parsed) throw new BadRequestException('QR mal formado');

    const pass = await this.prisma.pass.findUnique({
      where: { id: parsed.passId },
      include: {
        event: { include: { venue: true } },
        order: { include: { tier: { select: { id: true, name: true } } } },
        user: { select: { id: true, email: true, name: true } },
      },
    });
    if (!pass) throw new NotFoundException('Pase no encontrado');

    // 1. Validar HMAC
    const expected = recomputeHmac(
      pass.id,
      pass.eventId,
      pass.userId,
      passSecret,
    );
    if (!verifyHmac(parsed.hmac, expected)) {
      throw new BadRequestException('QR inválido (firma no coincide)');
    }

    // 2. Order debe estar COMPLETED
    if (pass.order.status !== OrderStatus.COMPLETED) {
      throw new ConflictException('Pase no pagado o reembolsado');
    }

    // 3. Permisos: ADMIN siempre; STAFF solo si pertenece al venue
    if (!pass.event.venueId || !pass.event.venue) {
      throw new ConflictException('Pase sin local asociado — no se puede escanear');
    }
    const venueId = pass.event.venueId;
    const passVenue = pass.event.venue;

    if (scanner.role !== Role.ADMIN) {
      if (scanner.role !== Role.VENUE_STAFF && scanner.role !== Role.VENUE_OWNER) {
        throw new ForbiddenException('Solo staff/owner pueden escanear');
      }

      if (scanner.role === Role.VENUE_OWNER) {
        const owner = await this.prisma.venueOwner.findUnique({
          where: { userId_venueId: { userId: scanner.id, venueId } },
          select: { userId: true },
        });
        if (!owner) {
          throw new ForbiddenException('No perteneces a este local');
        }
      } else {
        const staff = await this.prisma.venueStaff.findUnique({
          where: { venueId_userId: { venueId, userId: scanner.id } },
          select: { status: true },
        });
        if (!staff || staff.status !== VenueStaffStatus.ACTIVE) {
          throw new ForbiddenException('No perteneces a este local');
        }
      }
    }

    // 4. Mismo día (UTC) — futuro: usar timezone del venue
    const now = new Date();
    const sameDay =
      pass.event.startsAt.getUTCFullYear() === now.getUTCFullYear() &&
      pass.event.startsAt.getUTCMonth() === now.getUTCMonth() &&
      pass.event.startsAt.getUTCDate() === now.getUTCDate();
    if (!sameDay) {
      throw new ConflictException(
        `Pase no es de hoy (evento: ${pass.event.startsAt.toISOString()})`,
      );
    }

    // 5. Ya usado
    if (pass.usedAt) {
      return {
        valid: false,
        reason: 'already_used',
        usedAt: pass.usedAt,
        holder: pass.user,
        tier: pass.order.tier,
        event: { id: pass.event.id, title: pass.event.title },
      };
    }

    // 6. Geofence: si el venue lo tiene configurado y tenemos coordenadas,
    //    exigir un ping reciente del CLIENTE (no del staff) dentro del radio.
    //    Esto bloquea reventa remota — el QR no se canjea si el holder no
    //    está físicamente cerca del local.
    const radius = passVenue.geofenceRadiusM;
    let redeemedDistanceM: number | null = null;
    let redeemedAccuracyM: number | null = null;

    if (
      radius > 0 &&
      passVenue.latitude != null &&
      passVenue.longitude != null
    ) {
      const ping = await this.locations.findRecentForUser(pass.userId, 10);
      if (!ping) {
        throw new ConflictException({
          code: 'NO_RECENT_LOCATION',
          message:
            'Pídele al cliente que abra el pase para verificar ubicación.',
        });
      }
      const meters = haversineMeters(
        ping.latitude,
        ping.longitude,
        passVenue.latitude,
        passVenue.longitude,
      );
      if (meters > radius) {
        throw new ConflictException({
          code: 'OUT_OF_RANGE',
          distanceM: Math.round(meters),
          message: `Cliente está a ${Math.round(meters)}m del local.`,
        });
      }
      redeemedDistanceM = Math.round(meters);
      redeemedAccuracyM = Math.round(ping.accuracyM ?? 0);
    }

    // 7. Marcar usado (+ audit de geofence)
    const updated = await this.prisma.pass.update({
      where: { id: pass.id },
      data: {
        usedAt: new Date(),
        usedByStaffId: scanner.id,
        redeemedDistanceM,
        redeemedAccuracyM,
      },
    });

    // 8. Side-effects post-redeem (fire-and-forget — no bloquean la respuesta).
    //    - Loyalty: puntos por escaneo exitoso.
    //    - LocationPing server-side: ancla la presencia del usuario en el venue
    //      (origen SCAN_REDEEM) para analítica/heat-map sin depender del cliente.
    void this.loyalty
      .awardPassScan({
        userId: pass.userId,
        passId: pass.id,
        eventId: pass.eventId,
        venueId,
        scannedAt: updated.usedAt!,
      })
      .catch((err: unknown) =>
        this.logger.warn(
          `Loyalty award failed for pass ${pass.id}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        ),
      );

    if (passVenue.latitude != null && passVenue.longitude != null) {
      void this.locations
        .record(pass.userId, {
          latitude: passVenue.latitude,
          longitude: passVenue.longitude,
          source: LocationPingSource.SCAN_REDEEM,
          accuracyM: undefined,
        })
        .catch((err: unknown) =>
          this.logger.warn(
            `Server-side ping failed for pass ${pass.id}: ${
              err instanceof Error ? err.message : String(err)
            }`,
          ),
        );
    } else {
      this.logger.warn(
        `Skipping server-side ping for pass ${pass.id}: venue ${venueId} has no coordinates`,
      );
    }

    return {
      valid: true,
      usedAt: updated.usedAt,
      holder: pass.user,
      tier: pass.order.tier,
      event: {
        id: pass.event.id,
        title: pass.event.title,
        venue: passVenue.name,
      },
    };
  }
}
