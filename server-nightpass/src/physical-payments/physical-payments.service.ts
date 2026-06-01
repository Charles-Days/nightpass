import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EventStatus,
  OrderStatus,
  PassClaimStatus,
  PaymentMethod,
  PhysicalPaymentRequestStatus,
  Role,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from '../mailer/mailer.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { resolveTierPrice } from '../events/tier-pricing';
import { issuePasses } from '../passes/issue-passes';
import { CreatePhysicalPaymentDto } from './dto/create-physical-payment.dto';

@Injectable()
export class PhysicalPaymentsService {
  private readonly logger = new Logger(PhysicalPaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
    private readonly config: ConfigService,
  ) {}

  private formatMoney(cents: number, currency: string): string {
    return `$${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }

  // ── Cliente: crear solicitud de pago en efectivo ──────────────────────────

  async createRequest(userId: string, dto: CreatePhysicalPaymentDto) {
    const quantity = dto.quantity ?? 1;
    if (quantity < 1 || quantity > 6) {
      throw new BadRequestException('Cantidad de pases inválida (máximo 6)');
    }

    const tier = await this.prisma.eventTier.findUnique({
      where: { id: dto.tierId },
      include: { prices: true, event: true },
    });
    if (!tier) throw new NotFoundException('Tier no encontrado');

    const event = tier.event;
    if (event.status !== EventStatus.PUBLISHED) {
      throw new ConflictException('El evento no está publicado');
    }
    if (!event.allowCashPayment) {
      throw new ConflictException('Este evento no acepta pago en efectivo');
    }
    if (event.startsAt.getTime() <= Date.now()) {
      throw new ConflictException('El evento ya comenzó');
    }

    // RPs asignados al evento para cobro en efectivo. Sin ninguno no hay a quién
    // notificar → la solicitud no tiene sentido.
    const assignedRps = await this.prisma.eventRp.findMany({
      where: { eventId: event.id, rpProfile: { isActive: true } },
      include: {
        rpProfile: {
          include: { user: { select: { email: true, name: true } } },
        },
      },
    });
    if (assignedRps.length === 0) {
      throw new ConflictException(
        'No hay vendedores disponibles para pago en efectivo en este evento',
      );
    }

    const singlePriceCents = resolveTierPrice(
      tier.priceCents,
      tier.prices,
      event.startsAt,
    ).currentCents;
    const amountCents = singlePriceCents * quantity;

    // Teléfono/WhatsApp de contacto. Se pide solo la primera vez (si el usuario
    // no tiene uno guardado) y se persiste para reutilizarlo después.
    const userRow = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true },
    });
    const savedPhone = userRow?.phone?.trim() || null;
    const incomingPhone = dto.contactPhone?.trim() || null;
    const effectivePhone = savedPhone || incomingPhone;
    if (!effectivePhone) {
      throw new BadRequestException(
        'Necesitamos tu WhatsApp para que el vendedor te contacte',
      );
    }

    // Aforo: rechaza de entrada si ya no hay cupo (chequeo blando; el firme va al
    // confirmar). Cuenta pases emitidos + vales pendientes, igual que el resto.
    await this.assertCapacity(event.id, tier.id, tier.capacity, event.capacity, quantity);

    // Una solicitud en curso por evento. No se permite pedir de nuevo mientras
    // exista una sin resolver:
    //   - PENDING: el RP aún no cobra/emite.
    //   - CONFIRMED cuyos pases nadie ha canjeado (ningún Pass usado).
    // En cuanto canjea (usa) al menos un pase del lote confirmado, puede volver
    // a pedir más (p.ej. pidió 4, usa 1 → ya puede solicitar otra vez).
    const pendingCount = await this.prisma.physicalPaymentRequest.count({
      where: {
        userId,
        eventId: event.id,
        status: PhysicalPaymentRequestStatus.PENDING,
      },
    });
    if (pendingCount > 0) {
      throw new ConflictException(
        'Ya tienes una solicitud de pago en efectivo pendiente para este evento. Espera a que el vendedor la confirme.',
      );
    }

    const confirmed = await this.prisma.physicalPaymentRequest.findMany({
      where: {
        userId,
        eventId: event.id,
        status: PhysicalPaymentRequestStatus.CONFIRMED,
        orderId: { not: null },
      },
      select: { orderId: true },
    });
    if (confirmed.length > 0) {
      const orderIds = confirmed.map((c) => c.orderId as string);
      const redeemed = await this.prisma.pass.findMany({
        where: { orderId: { in: orderIds }, usedAt: { not: null } },
        select: { orderId: true },
        distinct: ['orderId'],
      });
      const redeemedSet = new Set(redeemed.map((p) => p.orderId));
      const hasUnredeemed = orderIds.some((id) => !redeemedSet.has(id));
      if (hasUnredeemed) {
        throw new ConflictException(
          'Tienes pases de efectivo pendientes de usar. Canjea al menos uno (entra al evento) antes de pedir más.',
        );
      }
    }

    const request = await this.prisma.physicalPaymentRequest.create({
      data: {
        userId,
        eventId: event.id,
        tierId: tier.id,
        quantity,
        amountCents,
        currency: tier.currency,
        contactPhone: effectivePhone,
        note: dto.note?.trim() || null,
        expiresAt: event.startsAt,
      },
      include: { user: { select: { name: true, email: true } } },
    });

    // Primera vez: guarda el teléfono en el perfil para no volver a pedirlo.
    if (!savedPhone && incomingPhone) {
      this.prisma.user
        .update({ where: { id: userId }, data: { phone: incomingPhone } })
        .catch((err) =>
          this.logger.warn(
            `No se pudo guardar el teléfono del user ${userId}: ${err instanceof Error ? err.message : err}`,
          ),
        );
    }

    // Notifica a cada RP asignado (best-effort, no bloquea la respuesta).
    const customerName = request.user.name || request.user.email;
    const amountFormatted = this.formatMoney(amountCents, tier.currency);
    for (const assignment of assignedRps) {
      const rpUser = assignment.rpProfile.user;
      if (!rpUser?.email) continue;
      this.mailer
        .sendPhysicalPaymentRequestToRp(rpUser.email, {
          rpName: assignment.rpProfile.displayName,
          eventTitle: event.title,
          tierName: tier.name,
          quantity,
          amountFormatted,
          customerName,
          customerEmail: request.user.email,
          customerContact: request.contactPhone ?? undefined,
          note: request.note ?? undefined,
        })
        .catch((err) =>
          this.logger.error(
            `Error notificando RP ${rpUser.email}: ${err instanceof Error ? err.message : err}`,
          ),
        );
    }

    this.logger.log(
      `Solicitud de pago en efectivo ${request.id} creada por ${userId} (${assignedRps.length} RP notificados)`,
    );

    return this.toSummary(request, { event, tier });
  }

  // ── RP: cola de solicitudes de sus eventos asignados ──────────────────────

  async listForRp(rpUserId: string, status?: PhysicalPaymentRequestStatus) {
    const rp = await this.prisma.rpProfile.findUnique({
      where: { userId: rpUserId },
      select: { id: true },
    });
    if (!rp) throw new NotFoundException('Perfil de RP no encontrado');

    const assignments = await this.prisma.eventRp.findMany({
      where: { rpProfileId: rp.id },
      select: { eventId: true },
    });
    const eventIds = assignments.map((a) => a.eventId);
    if (eventIds.length === 0) return { items: [] };

    const items = await this.prisma.physicalPaymentRequest.findMany({
      where: {
        eventId: { in: eventIds },
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        user: { select: { name: true, email: true } },
        event: { select: { id: true, title: true, startsAt: true } },
        tier: { select: { id: true, name: true } },
        confirmedByRp: { select: { displayName: true, rpCode: true } },
      },
    });

    return { items: items.map((r) => this.toDetail(r)) };
  }

  // ── RP: confirmar cobro → emitir pases al cliente ─────────────────────────

  async confirm(rpUserId: string, requestId: string) {
    const rp = await this.prisma.rpProfile.findUnique({
      where: { userId: rpUserId },
      select: { id: true, isActive: true },
    });
    if (!rp) throw new NotFoundException('Perfil de RP no encontrado');
    if (!rp.isActive) throw new ForbiddenException('Tu perfil de RP está inactivo');

    const request = await this.prisma.physicalPaymentRequest.findUnique({
      where: { id: requestId },
      include: { event: true, tier: true },
    });
    if (!request) throw new NotFoundException('Solicitud no encontrada');

    // Autorización: el RP debe estar asignado al evento.
    const assignment = await this.prisma.eventRp.findUnique({
      where: { eventId_rpProfileId: { eventId: request.eventId, rpProfileId: rp.id } },
      select: { eventId: true },
    });
    if (!assignment) {
      throw new ForbiddenException('No tienes este evento asignado');
    }

    if (request.status !== PhysicalPaymentRequestStatus.PENDING) {
      throw new ConflictException('La solicitud ya no está pendiente');
    }

    if (request.event.startsAt.getTime() <= Date.now()) {
      await this.prisma.physicalPaymentRequest.update({
        where: { id: request.id },
        data: { status: PhysicalPaymentRequestStatus.EXPIRED },
      });
      throw new ConflictException('El evento ya comenzó — solicitud vencida');
    }

    // Aforo firme antes de emitir.
    await this.assertCapacity(
      request.eventId,
      request.tierId,
      request.tier.capacity,
      request.event.capacity,
      request.quantity,
    );

    const passSecret =
      this.config.get<string>('PASS_HMAC_SECRET') ||
      'dev-hmac-secret-min32chars-replace-in-prod';

    const result = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          userId: request.userId,
          eventId: request.eventId,
          tierId: request.tierId,
          status: OrderStatus.COMPLETED,
          paymentMethod: PaymentMethod.CASH,
          quantity: request.quantity,
          totalCents: request.amountCents,
          applicationFeeCents: 0,
          currency: request.currency,
          referredByRpId: rp.id,
        },
      });

      await issuePasses(tx, order, passSecret);

      const updated = await tx.physicalPaymentRequest.update({
        where: { id: request.id },
        data: {
          status: PhysicalPaymentRequestStatus.CONFIRMED,
          confirmedByRpId: rp.id,
          confirmedAt: new Date(),
          orderId: order.id,
        },
        include: {
          user: { select: { name: true, email: true } },
          event: { select: { id: true, title: true, startsAt: true } },
          tier: { select: { id: true, name: true } },
          confirmedByRp: { select: { displayName: true, rpCode: true } },
        },
      });
      return updated;
    });

    this.logger.log(
      `Solicitud ${request.id} confirmada por RP ${rp.id} → ${request.quantity} pase(s) emitido(s)`,
    );

    return this.toDetail(result);
  }

  // ── Cancelar (cliente dueño o RP asignado) ────────────────────────────────

  async cancel(user: AuthUser, requestId: string) {
    const request = await this.prisma.physicalPaymentRequest.findUnique({
      where: { id: requestId },
      select: { id: true, userId: true, eventId: true, status: true },
    });
    if (!request) throw new NotFoundException('Solicitud no encontrada');

    let authorized = user.role === Role.ADMIN || request.userId === user.id;
    if (!authorized && user.role === Role.RP) {
      const rp = await this.prisma.rpProfile.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });
      if (rp) {
        const assignment = await this.prisma.eventRp.findUnique({
          where: {
            eventId_rpProfileId: { eventId: request.eventId, rpProfileId: rp.id },
          },
          select: { eventId: true },
        });
        authorized = assignment != null;
      }
    }
    if (!authorized) {
      throw new ForbiddenException('No puedes cancelar esta solicitud');
    }

    if (request.status !== PhysicalPaymentRequestStatus.PENDING) {
      throw new ConflictException('Solo se pueden cancelar solicitudes pendientes');
    }

    await this.prisma.physicalPaymentRequest.update({
      where: { id: request.id },
      data: { status: PhysicalPaymentRequestStatus.CANCELLED },
    });
    return { ok: true };
  }

  // ── Cliente: mis solicitudes ──────────────────────────────────────────────

  async listMine(userId: string) {
    const items = await this.prisma.physicalPaymentRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        event: { select: { id: true, title: true, startsAt: true } },
        tier: { select: { id: true, name: true } },
        confirmedByRp: { select: { displayName: true, rpCode: true } },
      },
    });
    return { items: items.map((r) => this.toDetail(r)) };
  }

  // ── Admin: todas las solicitudes (opcional por evento) ────────────────────

  async listForAdmin(eventId?: string) {
    const items = await this.prisma.physicalPaymentRequest.findMany({
      where: eventId ? { eventId } : {},
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        user: { select: { name: true, email: true } },
        event: { select: { id: true, title: true, startsAt: true } },
        tier: { select: { id: true, name: true } },
        confirmedByRp: { select: { displayName: true, rpCode: true } },
      },
    });
    return { items: items.map((r) => this.toDetail(r)) };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Lanza ConflictException si emitir `quantity` pases excedería el cupo del
   * tier o del evento. Cuenta pases emitidos + vales (PassClaim) pendientes +
   * solicitudes de efectivo PENDING ya existentes — misma base que el resto.
   */
  private async assertCapacity(
    eventId: string,
    tierId: string,
    tierCapacity: number | null,
    eventCapacity: number | null,
    quantity: number,
  ): Promise<void> {
    if (tierCapacity != null) {
      const [soldTier, pendingClaimsTier, pendingReqTier] = await Promise.all([
        this.prisma.pass.count({
          where: { eventId, order: { tierId } },
        }),
        this.prisma.passClaim.count({
          where: { tierId, status: PassClaimStatus.PENDING },
        }),
        this.prisma.physicalPaymentRequest.aggregate({
          _sum: { quantity: true },
          where: { tierId, status: PhysicalPaymentRequestStatus.PENDING },
        }),
      ]);
      const reserved =
        soldTier + pendingClaimsTier + (pendingReqTier._sum.quantity ?? 0);
      if (reserved + quantity > tierCapacity) {
        throw new ConflictException('Cupo del tier insuficiente');
      }
    }

    if (eventCapacity != null) {
      const [soldEvent, pendingClaimsEvent, pendingReqEvent] = await Promise.all([
        this.prisma.pass.count({ where: { eventId } }),
        this.prisma.passClaim.count({
          where: { eventId, status: PassClaimStatus.PENDING },
        }),
        this.prisma.physicalPaymentRequest.aggregate({
          _sum: { quantity: true },
          where: { eventId, status: PhysicalPaymentRequestStatus.PENDING },
        }),
      ]);
      const reserved =
        soldEvent + pendingClaimsEvent + (pendingReqEvent._sum.quantity ?? 0);
      if (reserved + quantity > eventCapacity) {
        throw new ConflictException('Cupo del evento insuficiente');
      }
    }
  }

  private toSummary(
    request: { id: string; status: string; quantity: number; amountCents: number; currency: string; expiresAt: Date; createdAt: Date },
    ctx: { event: { id: string; title: string; startsAt: Date }; tier: { id: string; name: string } },
  ) {
    return {
      id: request.id,
      status: request.status,
      quantity: request.quantity,
      amountCents: request.amountCents,
      currency: request.currency,
      expiresAt: request.expiresAt,
      createdAt: request.createdAt,
      event: { id: ctx.event.id, title: ctx.event.title, startsAt: ctx.event.startsAt },
      tier: { id: ctx.tier.id, name: ctx.tier.name },
    };
  }

  private toDetail(r: {
    id: string;
    status: PhysicalPaymentRequestStatus;
    quantity: number;
    amountCents: number;
    currency: string;
    contactPhone: string | null;
    note: string | null;
    expiresAt: Date;
    confirmedAt: Date | null;
    createdAt: Date;
    orderId: string | null;
    event: { id: string; title: string; startsAt: Date };
    tier: { id: string; name: string };
    user?: { name: string | null; email: string } | null;
    confirmedByRp?: { displayName: string; rpCode: string } | null;
  }) {
    return {
      id: r.id,
      status: r.status,
      quantity: r.quantity,
      amountCents: r.amountCents,
      currency: r.currency,
      contactPhone: r.contactPhone,
      note: r.note,
      expiresAt: r.expiresAt,
      confirmedAt: r.confirmedAt,
      createdAt: r.createdAt,
      orderId: r.orderId,
      event: r.event,
      tier: r.tier,
      customer: r.user ? { name: r.user.name, email: r.user.email } : null,
      confirmedByRp: r.confirmedByRp
        ? { displayName: r.confirmedByRp.displayName, rpCode: r.confirmedByRp.rpCode }
        : null,
    };
  }
}
