import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus, Role, VenueStaffStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { parseQr, recomputeHmac, verifyHmac } from '../common/qr-hmac';

@Injectable()
export class PassesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
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
    if (scanner.role !== Role.ADMIN) {
      if (scanner.role !== Role.VENUE_STAFF && scanner.role !== Role.VENUE_OWNER) {
        throw new ForbiddenException('Solo staff/owner pueden escanear');
      }

      const venueId = pass.event.venueId;

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

    // 6. Marcar usado
    const updated = await this.prisma.pass.update({
      where: { id: pass.id },
      data: { usedAt: new Date(), usedByStaffId: scanner.id },
    });

    return {
      valid: true,
      usedAt: updated.usedAt,
      holder: pass.user,
      tier: pass.order.tier,
      event: {
        id: pass.event.id,
        title: pass.event.title,
        venue: pass.event.venue.name,
      },
    };
  }
}
