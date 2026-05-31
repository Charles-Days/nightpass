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
  PassClaimStatus,
  PaymentMethod,
  Role,
  TransferStatus,
  VenueStaffStatus,
} from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { LocationsService } from '../locations/locations.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { parseQr, recomputeHmac, signPass, verifyHmac } from '../common/qr-hmac';
import { haversineMeters } from '../common/geo';

const PASS_SECRET_FALLBACK = 'dev-hmac-secret-min32chars-replace-in-prod';

// Una transferencia abierta vive como máximo 7 días — y nunca más allá del
// inicio del evento (lo que ocurra primero).
const TRANSFER_TTL_DAYS = 7;

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
        transfers: {
          where: { status: TransferStatus.PENDING },
          select: { id: true, token: true, expiresAt: true },
        },
      },
    });
  }

  // ── Reclamar un vale emitido por un RP (venta en efectivo) ────────────────

  /**
   * El cliente escanea el QR del RP (`npc_<token>`). Si el vale está vigente se
   * crea la Order (CASH, COMPLETED) + el Pass real a su nombre, atribuyendo la
   * venta al RP que lo emitió. Idempotente si el mismo usuario lo reescanea.
   */
  async claim(code: string, user: AuthUser) {
    const token = code.trim();
    const claim = await this.prisma.passClaim.findUnique({
      where: { token },
    });
    if (!claim) throw new NotFoundException('Vale no válido');

    // Ya reclamado: idempotente para el mismo dueño, bloqueado para otros.
    if (claim.status === PassClaimStatus.CLAIMED) {
      if (claim.claimedByUserId === user.id && claim.orderId) {
        const existing = await this.prisma.pass.findFirst({
          where: { orderId: claim.orderId },
          select: { id: true },
        });
        if (existing) return { passId: existing.id, alreadyClaimed: true };
      }
      throw new ConflictException('Este pase ya fue reclamado');
    }
    if (claim.status !== PassClaimStatus.PENDING) {
      throw new ConflictException('Este vale ya no está disponible');
    }
    if (claim.expiresAt.getTime() <= Date.now()) {
      await this.prisma.passClaim.update({
        where: { id: claim.id },
        data: { status: PassClaimStatus.EXPIRED },
      });
      throw new ConflictException('Este vale expiró');
    }

    const event = await this.prisma.event.findUnique({
      where: { id: claim.eventId },
      select: { id: true, capacity: true, endsAt: true },
    });
    if (!event) throw new NotFoundException('Evento no encontrado');
    if (event.endsAt.getTime() <= Date.now()) {
      throw new ConflictException('El evento ya terminó');
    }

    // Un pase por evento por usuario (igual que en la compra normal).
    const dup = await this.prisma.pass.findFirst({
      where: { eventId: claim.eventId, userId: user.id },
      select: { id: true },
    });
    if (dup) {
      throw new ConflictException('Ya tienes un pase para este evento');
    }

    // Aforo: por tier y por evento.
    const tier = await this.prisma.eventTier.findUnique({
      where: { id: claim.tierId },
      select: { capacity: true },
    });
    if (tier?.capacity != null) {
      const soldTier = await this.prisma.pass.count({
        where: { eventId: claim.eventId, order: { tierId: claim.tierId } },
      });
      const pendingClaimsTier = await this.prisma.passClaim.count({
        where: { tierId: claim.tierId, status: PassClaimStatus.PENDING },
      });
      if (soldTier + pendingClaimsTier >= tier.capacity) {
        throw new ConflictException('Tier agotado');
      }
    }
    if (event.capacity != null) {
      const soldEvent = await this.prisma.pass.count({
        where: { eventId: claim.eventId },
      });
      const pendingClaimsEvent = await this.prisma.passClaim.count({
        where: { eventId: claim.eventId, status: PassClaimStatus.PENDING },
      });
      if (soldEvent + pendingClaimsEvent >= event.capacity) {
        throw new ConflictException('Evento agotado');
      }
    }

    const secret =
      this.config.get<string>('PASS_HMAC_SECRET') || PASS_SECRET_FALLBACK;

    const passId = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          userId: user.id,
          eventId: claim.eventId,
          tierId: claim.tierId,
          status: OrderStatus.COMPLETED,
          paymentMethod: PaymentMethod.CASH,
          totalCents: claim.amountCents,
          applicationFeeCents: 0,
          currency: claim.currency,
          referredByRpId: claim.issuedByRpId,
        },
      });

      const pass = await tx.pass.create({
        data: {
          orderId: order.id,
          userId: user.id,
          eventId: claim.eventId,
          qrCode: `pending_${order.id}`,
        },
      });

      const qr = signPass(pass.id, claim.eventId, user.id, secret);
      await tx.pass.update({ where: { id: pass.id }, data: { qrCode: qr } });

      // Marca el vale consumido. La condición de status evita doble reclamo en
      // carreras: si otro request ya lo movió, updateMany afecta 0 filas.
      const consumed = await tx.passClaim.updateMany({
        where: { id: claim.id, status: PassClaimStatus.PENDING },
        data: {
          status: PassClaimStatus.CLAIMED,
          claimedByUserId: user.id,
          claimedAt: new Date(),
          orderId: order.id,
        },
      });
      if (consumed.count === 0) {
        throw new ConflictException('Este pase ya fue reclamado');
      }

      return pass.id;
    });

    this.logger.log(`Vale ${claim.id} reclamado por ${user.id} → pass ${passId}`);
    return { passId, alreadyClaimed: false };
  }

  // ── Transferencia de un pase ya pagado ───────────────────────────────────

  /**
   * El dueño genera un link de transferencia (`npt_<token>`) para regalar/ceder
   * su pase. No emite un pase nuevo ni recuenta aforo: al aceptarse, se reasigna
   * `Pass.userId` y se RE-FIRMA el QR. Mientras está PENDING el pase queda
   * bloqueado para escaneo (ver `scan`). Idempotente: si ya hay una transferencia
   * vigente devuelve la misma.
   */
  async createTransfer(passId: string, user: AuthUser) {
    const pass = await this.prisma.pass.findUnique({
      where: { id: passId },
      include: {
        event: { select: { startsAt: true, endsAt: true } },
        order: { select: { status: true } },
        transfers: {
          where: { status: TransferStatus.PENDING },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!pass) throw new NotFoundException('Pase no encontrado');
    if (pass.userId !== user.id) {
      throw new ForbiddenException('No es tu pase');
    }
    if (pass.order.status !== OrderStatus.COMPLETED) {
      throw new ConflictException('Pase no pagado o reembolsado');
    }
    if (pass.usedAt) {
      throw new ConflictException('El pase ya fue usado');
    }
    if (pass.event.endsAt.getTime() <= Date.now()) {
      throw new ConflictException('El evento ya terminó');
    }

    // Idempotente: una transferencia vigente se reutiliza. Las pendientes ya
    // expiradas se marcan EXPIRED para que no bloqueen el escaneo eternamente.
    const now = Date.now();
    const live = pass.transfers.find((t) => t.expiresAt.getTime() > now);
    if (live) {
      return {
        token: live.token,
        expiresAt: live.expiresAt,
        transferId: live.id,
        alreadyExists: true,
      };
    }
    const staleIds = pass.transfers
      .filter((t) => t.expiresAt.getTime() <= now)
      .map((t) => t.id);
    if (staleIds.length > 0) {
      await this.prisma.passTransfer.updateMany({
        where: { id: { in: staleIds }, status: TransferStatus.PENDING },
        data: { status: TransferStatus.EXPIRED },
      });
    }

    // Vive como máximo TRANSFER_TTL_DAYS, y nunca más allá del inicio del evento.
    const ttlCap = now + TRANSFER_TTL_DAYS * 24 * 60 * 60 * 1000;
    const expiresAt = new Date(
      Math.min(ttlCap, pass.event.startsAt.getTime()),
    );
    if (expiresAt.getTime() <= now) {
      throw new ConflictException(
        'El evento está por comenzar — ya no se puede transferir',
      );
    }

    const token = `npt_${randomBytes(24).toString('hex')}`;
    const transfer = await this.prisma.passTransfer.create({
      data: {
        passId: pass.id,
        token,
        fromUserId: user.id,
        expiresAt,
      },
    });

    this.logger.log(`Transferencia ${transfer.id} creada para pass ${pass.id}`);
    return {
      token: transfer.token,
      expiresAt: transfer.expiresAt,
      transferId: transfer.id,
      alreadyExists: false,
    };
  }

  /** El dueño cancela su transferencia pendiente — el QR vuelve a ser válido. */
  async cancelTransfer(passId: string, user: AuthUser) {
    const pass = await this.prisma.pass.findUnique({
      where: { id: passId },
      select: { id: true, userId: true },
    });
    if (!pass) throw new NotFoundException('Pase no encontrado');
    if (pass.userId !== user.id) {
      throw new ForbiddenException('No es tu pase');
    }

    const cancelled = await this.prisma.passTransfer.updateMany({
      where: { passId: pass.id, status: TransferStatus.PENDING },
      data: { status: TransferStatus.CANCELLED },
    });
    if (cancelled.count === 0) {
      throw new NotFoundException('No hay transferencia activa');
    }
    return { ok: true };
  }

  /**
   * Vista previa de una transferencia por token (lo abre el destinatario antes
   * de aceptar). No muta nada — solo dice si está vigente y qué evento es.
   */
  async getTransferByToken(token: string, user: AuthUser) {
    const transfer = await this.prisma.passTransfer.findUnique({
      where: { token: token.trim() },
      include: {
        fromUser: { select: { name: true } },
        pass: {
          include: {
            event: {
              select: {
                id: true,
                title: true,
                startsAt: true,
                coverImageUrl: true,
                venue: { select: { name: true, city: true, address: true } },
              },
            },
            order: { include: { tier: { select: { id: true, name: true } } } },
          },
        },
      },
    });
    if (!transfer) throw new NotFoundException('Transferencia no válida');

    const expired =
      transfer.status === TransferStatus.PENDING &&
      transfer.expiresAt.getTime() <= Date.now();

    return {
      status: transfer.status,
      expired,
      isOwnPass: transfer.fromUserId === user.id,
      alreadyUsed: Boolean(transfer.pass.usedAt),
      fromName: transfer.fromUser.name,
      expiresAt: transfer.expiresAt,
      event: transfer.pass.event,
      tier: transfer.pass.order.tier,
    };
  }

  /**
   * El destinatario acepta la transferencia: el pase pasa a su nombre y el QR se
   * re-firma con su `userId` (el HMAC mezcla el userId, así que el QR del
   * remitente queda inválido). La Order NO cambia de dueño — el registro de
   * compra sigue siendo de quien pagó. Idempotente para el mismo destinatario.
   */
  async acceptTransfer(token: string, user: AuthUser) {
    const transfer = await this.prisma.passTransfer.findUnique({
      where: { token: token.trim() },
      include: { pass: { select: { id: true, eventId: true, usedAt: true } } },
    });
    if (!transfer) throw new NotFoundException('Transferencia no válida');

    if (transfer.status !== TransferStatus.PENDING) {
      if (
        transfer.status === TransferStatus.CLAIMED &&
        transfer.toUserId === user.id
      ) {
        return { passId: transfer.passId, alreadyYours: true };
      }
      throw new ConflictException('Esta transferencia ya no está disponible');
    }
    if (transfer.expiresAt.getTime() <= Date.now()) {
      await this.prisma.passTransfer.update({
        where: { id: transfer.id },
        data: { status: TransferStatus.EXPIRED },
      });
      throw new ConflictException('Esta transferencia expiró');
    }
    if (transfer.fromUserId === user.id) {
      throw new ConflictException('No puedes aceptar tu propia transferencia');
    }
    if (transfer.pass.usedAt) {
      throw new ConflictException('El pase ya fue usado');
    }

    // Un pase por evento por usuario (igual que en compra y claim).
    const dup = await this.prisma.pass.findFirst({
      where: {
        eventId: transfer.pass.eventId,
        userId: user.id,
        id: { not: transfer.passId },
      },
      select: { id: true },
    });
    if (dup) {
      throw new ConflictException('Ya tienes un pase para este evento');
    }

    const secret =
      this.config.get<string>('PASS_HMAC_SECRET') || PASS_SECRET_FALLBACK;

    await this.prisma.$transaction(async (tx) => {
      const qr = signPass(
        transfer.passId,
        transfer.pass.eventId,
        user.id,
        secret,
      );
      await tx.pass.update({
        where: { id: transfer.passId },
        data: { userId: user.id, qrCode: qr },
      });

      // El status guard evita doble aceptación en carreras.
      const consumed = await tx.passTransfer.updateMany({
        where: { id: transfer.id, status: TransferStatus.PENDING },
        data: {
          status: TransferStatus.CLAIMED,
          toUserId: user.id,
          claimedAt: new Date(),
        },
      });
      if (consumed.count === 0) {
        throw new ConflictException('Esta transferencia ya no está disponible');
      }
    });

    this.logger.log(
      `Transferencia ${transfer.id} aceptada por ${user.id} → pass ${transfer.passId}`,
    );
    return { passId: transfer.passId, alreadyYours: false };
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
        transfers: {
          where: { status: TransferStatus.PENDING },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, token: true, expiresAt: true, createdAt: true },
        },
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
        transfers: {
          where: { status: TransferStatus.PENDING },
          select: { id: true },
        },
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

    // 2b. Pase en transferencia: el remitente sigue siendo el dueño hasta que
    //     el destinatario acepte. Bloqueamos el escaneo para que nadie entre
    //     con un QR que está en pleno traspaso (evita doble entrada).
    if (pass.transfers.length > 0) {
      throw new ConflictException(
        'Pase en transferencia — el destinatario aún no lo acepta',
      );
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
