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
import { StripeService } from '../stripe/stripe.service';
import {
  CashWalletService,
  OwnerRef,
} from '../cash-wallet/cash-wallet.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { resolveTierPrice } from '../events/tier-pricing';
import { computeCashUnitPrice } from '../common/cash-pricing';
import { issuePasses } from '../passes/issue-passes';
import { CreatePhysicalPaymentDto } from './dto/create-physical-payment.dto';

@Injectable()
export class PhysicalPaymentsService {
  private readonly logger = new Logger(PhysicalPaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
    private readonly config: ConfigService,
    private readonly stripe: StripeService,
    private readonly cashWallet: CashWalletService,
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
      include: {
        prices: true,
        event: {
          include: {
            venue: {
              select: { platformFeePct: true, cashCommissionExempt: true },
            },
            promoter: {
              select: { platformFeePct: true, cashCommissionExempt: true },
            },
          },
        },
      },
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

    // Bruto unitario vigente (lo que se cobraría online).
    const singleGrossCents = resolveTierPrice(
      tier.priceCents,
      tier.prices,
      event.startsAt,
    ).currentCents;

    // Precio en EFECTIVO: bruto − Stripe (− NP si el organizador está exento).
    // El bruto se congela aquí para la base de la comisión NP al confirmar.
    const owner = event.venue ?? event.promoter ?? null;
    const feePct =
      owner?.platformFeePct != null
        ? owner.platformFeePct
        : this.stripe.getPlatformFeePct();
    const exempt = owner?.cashCommissionExempt ?? true;
    const cashUnitCents = computeCashUnitPrice(singleGrossCents, feePct, exempt);

    const amountCents = cashUnitCents * quantity;
    const grossCents = singleGrossCents * quantity;

    // Teléfono + ubicación del cliente. Se piden solo la primera vez (si no los
    // tenemos guardados) y se persisten para reutilizarlos. La ubicación
    // (estado/ciudad) sirve para enrutar la solicitud al RP de su zona.
    const userRow = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, state: true, city: true },
    });
    const savedPhone = userRow?.phone?.trim() || null;
    const incomingPhone = dto.contactPhone?.trim() || null;
    const effectivePhone = savedPhone || incomingPhone;
    if (!effectivePhone) {
      throw new BadRequestException(
        'Necesitamos tu WhatsApp para que el vendedor te contacte',
      );
    }

    const savedState = userRow?.state?.trim() || null;
    const savedCity = userRow?.city?.trim() || null;
    const incomingState = dto.state?.trim() || null;
    const incomingCity = dto.city?.trim() || null;
    const effectiveState = savedState || incomingState;
    const effectiveCity = savedCity || incomingCity;
    if (!effectiveState || !effectiveCity) {
      throw new BadRequestException(
        'Necesitamos tu estado y ciudad para asignarte un vendedor de tu zona',
      );
    }

    // Aforo: rechaza de entrada si ya no hay cupo (chequeo blando; el firme va al
    // confirmar). Cuenta pases emitidos + vales pendientes, igual que el resto.
    await this.assertCapacity(event.id, tier.id, tier.capacity, event.capacity, quantity);

    // Solo UNA solicitud PENDIENTE (sin confirmar) a la vez por evento. Una vez
    // que el RP confirma el cobro (queda pagada), el cliente ya puede pedir otra
    // — no se exige que entre/canjee primero (eso solo pasaría el día del evento
    // y lo dejaría bloqueado hasta entonces).
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

    // Tope de 6 pases por cuenta por evento (igual que online). Cuenta los pases
    // ya emitidos (efectivo confirmado + online) más lo que tiene en solicitudes
    // PENDING de este evento.
    const [issuedCount, pendingMine] = await Promise.all([
      this.prisma.pass.count({ where: { eventId: event.id, userId } }),
      this.prisma.physicalPaymentRequest.aggregate({
        _sum: { quantity: true },
        where: {
          userId,
          eventId: event.id,
          status: PhysicalPaymentRequestStatus.PENDING,
        },
      }),
    ]);
    const demand = issuedCount + (pendingMine._sum.quantity ?? 0);
    if (demand + quantity > 6) {
      throw new ConflictException(
        `Límite de 6 pases por cuenta por evento. Ya tienes ${demand}.`,
      );
    }

    // Enrutamiento: entre los RPs asignados al evento, prioriza los que cubren la
    // ciudad/estado del cliente; si ninguno coincide, usa todos los asignados.
    // De ese grupo se elige UN solo RP — el que menos solicitudes PENDING tenga
    // (reparto equitativo). Solo ese RP recibe el correo y puede confirmar.
    const assignedRp = await this.pickAssignedRp(
      assignedRps,
      effectiveState,
      effectiveCity,
    );

    const request = await this.prisma.physicalPaymentRequest.create({
      data: {
        userId,
        eventId: event.id,
        tierId: tier.id,
        quantity,
        amountCents,
        grossCents,
        currency: tier.currency,
        contactPhone: effectivePhone,
        note: dto.note?.trim() || null,
        assignedRpId: assignedRp?.rpProfile.id ?? null,
        expiresAt: event.startsAt,
      },
      include: { user: { select: { name: true, email: true } } },
    });

    // Primera vez: guarda teléfono + ubicación en el perfil para no volver a pedirlos.
    const userPatch: { phone?: string; state?: string; city?: string } = {};
    if (!savedPhone && incomingPhone) userPatch.phone = incomingPhone;
    if (!savedState && incomingState) userPatch.state = incomingState;
    if (!savedCity && incomingCity) userPatch.city = incomingCity;
    if (Object.keys(userPatch).length > 0) {
      this.prisma.user
        .update({ where: { id: userId }, data: userPatch })
        .catch((err) =>
          this.logger.warn(
            `No se pudo guardar contacto/ubicación del user ${userId}: ${err instanceof Error ? err.message : err}`,
          ),
        );
    }

    // Notifica SOLO al RP asignado (best-effort, no bloquea la respuesta).
    const customerName = request.user.name || request.user.email;
    const amountFormatted = this.formatMoney(amountCents, tier.currency);
    const rpUser = assignedRp?.rpProfile.user;
    if (rpUser?.email) {
      this.mailer
        .sendPhysicalPaymentRequestToRp(rpUser.email, {
          rpName: assignedRp!.rpProfile.displayName,
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
      `Solicitud de pago en efectivo ${request.id} creada por ${userId} → RP asignado ${assignedRp?.rpProfile.id ?? 'ninguno'} (${effectiveCity}, ${effectiveState})`,
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

    const items = await this.prisma.physicalPaymentRequest.findMany({
      where: {
        // Asignadas a este RP, más las antiguas (sin enrutar) de sus eventos.
        OR: [
          { assignedRpId: rp.id },
          { assignedRpId: null, eventId: { in: eventIds } },
        ],
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
      include: {
        event: {
          include: {
            venue: {
              select: {
                id: true,
                platformFeePct: true,
                cashCommissionExempt: true,
              },
            },
            promoter: {
              select: {
                id: true,
                platformFeePct: true,
                cashCommissionExempt: true,
              },
            },
          },
        },
        tier: true,
      },
    });
    if (!request) throw new NotFoundException('Solicitud no encontrada');

    // Autorización: si la solicitud se enrutó a un RP concreto, solo ese RP puede
    // confirmarla. Las solicitudes antiguas (sin assignedRpId) caen al chequeo de
    // asignación al evento.
    if (request.assignedRpId) {
      if (request.assignedRpId !== rp.id) {
        throw new ForbiddenException(
          'Esta solicitud está asignada a otro vendedor',
        );
      }
    } else {
      const assignment = await this.prisma.eventRp.findUnique({
        where: {
          eventId_rpProfileId: { eventId: request.eventId, rpProfileId: rp.id },
        },
        select: { eventId: true },
      });
      if (!assignment) {
        throw new ForbiddenException('No tienes este evento asignado');
      }
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

    // Comisión de NightPass sobre la venta en efectivo. El dinero del efectivo no
    // pasa por Stripe, así que la comisión se cobra del saldo PREPAGADO del
    // organizador (CashWallet). Si el organizador está exento (cashCommissionExempt)
    // o su fee es 0, no se cobra nada y no se requiere saldo.
    const venue = request.event.venue;
    const promoter = request.event.promoter;
    const owner = venue ?? promoter;
    let ownerRef: OwnerRef | null = null;
    let feeCents = 0;
    if (owner && !owner.cashCommissionExempt) {
      const feePct =
        owner.platformFeePct != null
          ? owner.platformFeePct
          : this.stripe.getPlatformFeePct();
      // La comisión NP se calcula sobre el BRUTO original (congelado al pedir),
      // no sobre el precio en efectivo ya descontado. Legacy sin grossCents cae
      // al amount.
      const npBase = request.grossCents ?? request.amountCents;
      feeCents = Math.floor((npBase * feePct) / 100);
      ownerRef = venue ? { venueId: venue.id } : { promoterId: promoter!.id };
    }

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
          applicationFeeCents: feeCents,
          currency: request.currency,
          referredByRpId: rp.id,
        },
      });

      // Debita la comisión del wallet (lanza si no hay saldo → rollback completo:
      // ni orden ni pases se emiten hasta que el organizador recargue).
      if (ownerRef && feeCents > 0) {
        await this.cashWallet.debitCashFee(tx, ownerRef, feeCents, {
          currency: request.currency,
          physicalRequestId: request.id,
          orderId: order.id,
        });
      }

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

  /**
   * Elige UN RP del grupo asignado al evento para atender la solicitud:
   *   1. Filtra los que coinciden con estado+ciudad del cliente.
   *   2. Si ninguno coincide, usa todo el grupo asignado.
   *   3. Del subconjunto, elige el de menor carga (solicitudes PENDING) → reparto
   *      equitativo. Desempata por el orden del grupo (estable).
   */
  private async pickAssignedRp(
    assignedRps: Array<{
      rpProfile: {
        id: string;
        state: string | null;
        city: string | null;
        displayName: string;
        user: { email: string; name: string | null } | null;
      };
    }>,
    state: string,
    city: string,
  ) {
    if (assignedRps.length === 0) return null;
    const norm = (s?: string | null) => (s ?? '').trim().toLowerCase();
    const ns = norm(state);
    const nc = norm(city);

    const geo = assignedRps.filter(
      (a) => norm(a.rpProfile.state) === ns && norm(a.rpProfile.city) === nc,
    );
    const pool = geo.length > 0 ? geo : assignedRps;

    const ids = pool.map((a) => a.rpProfile.id);
    const loads = await this.prisma.physicalPaymentRequest.groupBy({
      by: ['assignedRpId'],
      where: {
        assignedRpId: { in: ids },
        status: PhysicalPaymentRequestStatus.PENDING,
      },
      _count: { _all: true },
    });
    const loadMap = new Map<string, number>();
    for (const l of loads) {
      if (l.assignedRpId) loadMap.set(l.assignedRpId, l._count._all);
    }

    let best = pool[0];
    let bestLoad = loadMap.get(best.rpProfile.id) ?? 0;
    for (const a of pool) {
      const load = loadMap.get(a.rpProfile.id) ?? 0;
      if (load < bestLoad) {
        best = a;
        bestLoad = load;
      }
    }
    return best;
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
