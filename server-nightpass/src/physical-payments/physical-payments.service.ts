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
  NotificationType,
  OrderStatus,
  PassClaimStatus,
  PaymentMethod,
  PhysicalPaymentRequestStatus,
  Prisma,
  RewardKind,
  Role,
} from '@prisma/client';
import { runSerializable } from '../common/serializable-tx';
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from '../mailer/mailer.service';
import { StripeService } from '../stripe/stripe.service';
import {
  CashWalletService,
  OwnerRef,
} from '../cash-wallet/cash-wallet.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { RewardsService } from '../rewards/rewards.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { resolveTierPrice } from '../events/tier-pricing';
import { computeCashUnitPrice } from '../common/cash-pricing';
import { haversineMeters } from '../common/geo';
import { issuePasses } from '../passes/issue-passes';
import { requirePassSecret } from '../common/pass-secret';
import { PushService } from '../push/push.service';
import { NotificationsService } from '../notifications/notifications.service';
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
    private readonly push: PushService,
    private readonly notifications: NotificationsService,
    private readonly loyalty: LoyaltyService,
    private readonly rewards: RewardsService,
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
    //
    // Resolución POR-TIER: cada tier puede sobreescribir el % de comisión, la
    // exención y el modo (sumar/restar la comisión al precio). Si el tier no
    // sobreescribe (null) hereda del owner; el modo por defecto es SUBTRACT
    // (comportamiento histórico: el cliente paga menos y la org absorbe la
    // comisión vía wallet).
    const owner = event.venue ?? event.promoter ?? null;
    const ownerFeePct =
      owner?.platformFeePct != null
        ? owner.platformFeePct
        : this.stripe.getPlatformFeePct();
    const feePctEff = tier.cashFeePctOverride ?? ownerFeePct;
    const exemptEff = tier.cashExemptOverride ?? owner?.cashCommissionExempt ?? true;
    const modeEff = tier.cashFeeMode ?? 'SUBTRACT';
    const cashUnitCents = computeCashUnitPrice(
      singleGrossCents,
      feePctEff,
      exemptEff,
      modeEff,
      tier.cashPriceCents,
    );

    const amountCents = cashUnitCents * quantity;
    // Base de la comisión NP al confirmar: el precio en efectivo propio si el
    // tier lo fija, o el bruto online si se deriva.
    const commBaseUnit = tier.cashPriceCents ?? singleGrossCents;
    const grossCents = commBaseUnit * quantity;

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
    await this.assertCapacity(this.prisma, event.id, tier.id, tier.capacity, event.capacity, quantity);

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

    // Punto de cobro elegido por el cliente (opcional). Si viene, el RP dueño del
    // punto pasa a ser el vendedor asignado — override del enrutamiento geográfico.
    // El punto debe estar activo y pertenecer a un RP asignado al evento.
    let routedRpId = assignedRp?.rpProfile.id ?? null;
    let pickupRpUser: { email: string; name: string | null } | null = null;
    let pickupRpDisplayName: string | null = null;
    let pickupRpUserId: string | null = null;
    if (dto.pickupPointId) {
      const point = await this.prisma.rpPickupPoint.findUnique({
        where: { id: dto.pickupPointId },
        select: { id: true, rpProfileId: true, isActive: true },
      });
      if (!point || !point.isActive) {
        throw new BadRequestException('El punto de cobro no está disponible');
      }
      const owner = assignedRps.find(
        (a) => a.rpProfile.id === point.rpProfileId,
      );
      if (!owner) {
        throw new ForbiddenException(
          'El punto de cobro no pertenece a un vendedor de este evento',
        );
      }
      routedRpId = point.rpProfileId;
      pickupRpUser = owner.rpProfile.user;
      pickupRpDisplayName = owner.rpProfile.displayName;
      pickupRpUserId = owner.rpProfile.userId;
    }

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
        assignedRpId: routedRpId,
        pickupPointId: dto.pickupPointId ?? null,
        pickupAt: dto.pickupAt ? new Date(dto.pickupAt) : null,
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

    // Notifica SOLO al RP asignado (best-effort, no bloquea la respuesta). Si el
    // cliente eligió punto de cobro, el destinatario es el RP dueño del punto.
    const customerName = request.user.name || request.user.email;
    const amountFormatted = this.formatMoney(amountCents, tier.currency);
    const rpUser = pickupRpUser ?? assignedRp?.rpProfile.user;
    const rpDisplayName = pickupRpDisplayName ?? assignedRp?.rpProfile.displayName;
    const rpUserId = pickupRpUserId ?? assignedRp?.rpProfile.userId;
    if (rpUser?.email) {
      this.mailer
        .sendPhysicalPaymentRequestToRp(rpUser.email, {
          rpName: rpDisplayName!,
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

    // Push al RP asignado (best-effort) — para que lo vea al instante en su panel.
    if (rpUserId) {
      this.push
        .sendToUser(rpUserId, {
          title: 'Nueva solicitud de boleto físico',
          body: `${customerName} pide ${quantity} ${quantity === 1 ? 'pase' : 'pases'} (${amountFormatted}) para ${event.title}`,
          url: '/rp-dashboard',
          tag: `physical-${request.id}`,
        })
        .catch((err) =>
          this.logger.warn(
            `Push a RP ${rpUserId} falló: ${err instanceof Error ? err.message : err}`,
          ),
        );
    }

    // Notificación persistida en el panel (campana) para RP asignado +
    // organizador + dueño del local + admins. Fire-and-forget.
    this.notifications
      .notifyPhysicalRequestEvent(
        request.id,
        NotificationType.PHYSICAL_REQUEST_CREATED,
      )
      .catch(() => undefined);

    this.logger.log(
      `Solicitud de pago en efectivo ${request.id} creada por ${userId} → RP asignado ${routedRpId ?? 'ninguno'} (${effectiveCity}, ${effectiveState})`,
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
        pickupPoint: { select: { id: true, label: true, reference: true } },
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
      this.notifications
        .notifyPhysicalRequestEvent(
          request.id,
          NotificationType.PHYSICAL_REQUEST_EXPIRED,
        )
        .catch(() => undefined);
      throw new ConflictException('El evento ya comenzó — solicitud vencida');
    }

    const passSecret = requirePassSecret(this.config);

    // Comisión de NightPass sobre la venta en efectivo. El dinero del efectivo no
    // pasa por Stripe, así que la comisión se cobra del saldo PREPAGADO del
    // organizador (CashWallet). Si el organizador está exento o el fee es 0, no
    // se cobra nada y no se requiere saldo.
    //
    // Resolución POR-TIER: el % y la exención se toman del tier si los
    // sobreescribe (cashFeePctOverride / cashExemptOverride); si no, heredan del
    // owner. El modo ADD/SUBTRACT solo cambia el PRECIO que el cliente entrega en
    // efectivo (ya congelado en amountCents), NO cómo cobra NP: la comisión NP se
    // debita igual del wallet sobre el BRUTO original congelado.
    const venue = request.event.venue;
    const promoter = request.event.promoter;
    const owner = venue ?? promoter;
    const tier = request.tier;
    let ownerRef: OwnerRef | null = null;
    let feeCents = 0;
    const ownerFeePct =
      owner?.platformFeePct != null
        ? owner.platformFeePct
        : this.stripe.getPlatformFeePct();
    const feePctEff = tier.cashFeePctOverride ?? ownerFeePct;
    const exemptEff = tier.cashExemptOverride ?? owner?.cashCommissionExempt ?? true;
    if (owner && !exemptEff) {
      // La comisión NP se calcula sobre el BRUTO original (congelado al pedir),
      // no sobre el precio en efectivo ya descontado. Legacy sin grossCents cae
      // al amount.
      const npBase = request.grossCents ?? request.amountCents;
      feeCents = Math.floor((npBase * feePctEff) / 100);
      ownerRef = venue ? { venueId: venue.id } : { promoterId: promoter!.id };
    }

    // Toda la confirmación corre en una transacción Serializable con reintento:
    //  1) Marca la solicitud PENDING→CONFIRMED de forma condicional (updateMany
    //     con guard de status) — si otra confirmación concurrente ya la tomó,
    //     count=0 → abortamos sin emitir (evita doble emisión de la MISMA
    //     solicitud).
    //  2) El aforo se verifica DENTRO de la tx, así dos solicitudes DISTINTAS
    //     sobre el mismo cupo entran en conflicto de serialización y una se
    //     reintenta sobre el estado ya emitido (evita sobreventa).
    const result = await runSerializable(this.prisma, async (tx) => {
      const claimed = await tx.physicalPaymentRequest.updateMany({
        where: { id: request.id, status: PhysicalPaymentRequestStatus.PENDING },
        data: {
          status: PhysicalPaymentRequestStatus.CONFIRMED,
          confirmedByRpId: rp.id,
          confirmedAt: new Date(),
        },
      });
      if (claimed.count === 0) {
        throw new ConflictException('La solicitud ya no está pendiente');
      }

      await this.assertCapacity(
        tx,
        request.eventId,
        request.tierId,
        request.tier.capacity,
        request.event.capacity,
        request.quantity,
      );

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

      // Promo por volumen: la compra en efectivo también la desbloquea. Usa el
      // MISMO tx (Serializable). try/catch: un error de recompensa nunca debe
      // tumbar la confirmación de un pago ya cobrado en efectivo.
      try {
        await this.rewards.maybeUnlockBulkPromo(tx, order);
        await this.rewards.maybeUnlockPurchasePerk(tx, order);
      } catch (err) {
        this.logger.error(
          `desbloqueo de promos falló para Order ${order.id}: ${err instanceof Error ? err.message : err}`,
        );
      }

      const updated = await tx.physicalPaymentRequest.update({
        where: { id: request.id },
        data: { orderId: order.id },
        include: {
          user: { select: { name: true, email: true } },
          event: { select: { id: true, title: true, startsAt: true } },
          tier: { select: { id: true, name: true } },
          confirmedByRp: { select: { displayName: true, rpCode: true } },
          pickupPoint: { select: { id: true, label: true, reference: true } },
        },
      });
      return { request: updated, orderId: order.id };
    });

    // Bono de NPP por pago físico (PHYSICAL_BONUS_NPP). Corre FUERA de la tx
    // Serializable (awardPhysicalBonus abre su propia transacción) y SIEMPRE en
    // try/catch — la confirmación ya cuajó; un fallo del bono no la revierte.
    // Idempotente por orden (`physbonus:<orderId>`) si la confirmación se reintenta.
    try {
      const bonusReward = await this.prisma.reward.findFirst({
        where: {
          active: true,
          kind: RewardKind.PHYSICAL_BONUS_NPP,
          eventId: request.eventId,
        },
        orderBy: { bonusNpp: 'desc' },
        select: { bonusNpp: true },
      });
      if (bonusReward?.bonusNpp && bonusReward.bonusNpp > 0) {
        await this.loyalty.awardPhysicalBonus({
          userId: request.userId,
          points: bonusReward.bonusNpp * request.quantity,
          orderId: result.orderId,
          eventId: request.eventId,
        });
      }
    } catch (err) {
      this.logger.error(
        `awardPhysicalBonus falló para Order ${result.orderId}: ${err instanceof Error ? err.message : err}`,
      );
    }

    // Notifica al organizador + dueño del local + admins (no al RP que confirmó).
    this.notifications
      .notifyPhysicalRequestEvent(
        request.id,
        NotificationType.PHYSICAL_REQUEST_CONFIRMED,
        { excludeUserId: rpUserId },
      )
      .catch(() => undefined);

    this.logger.log(
      `Solicitud ${request.id} confirmada por RP ${rp.id} → ${request.quantity} pase(s) emitido(s)`,
    );

    return this.toDetail(result.request);
  }

  // ── Cancelar (cliente dueño o RP asignado) ────────────────────────────────

  async cancel(user: AuthUser, requestId: string) {
    const request = await this.prisma.physicalPaymentRequest.findUnique({
      where: { id: requestId },
      select: { id: true, userId: true, eventId: true, status: true, assignedRpId: true },
    });
    if (!request) throw new NotFoundException('Solicitud no encontrada');

    let authorized = user.role === Role.ADMIN || request.userId === user.id;
    if (!authorized && user.role === Role.RP) {
      const rp = await this.prisma.rpProfile.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });
      if (rp) {
        if (request.assignedRpId) {
          // Solicitud enrutada a un RP concreto: solo ese RP puede cancelarla
          // (mismo criterio que confirm). Antes cualquier RP del evento podía.
          authorized = request.assignedRpId === rp.id;
        } else {
          // Legacy sin assignedRpId: cae al chequeo de asignación al evento.
          const assignment = await this.prisma.eventRp.findUnique({
            where: {
              eventId_rpProfileId: { eventId: request.eventId, rpProfileId: rp.id },
            },
            select: { eventId: true },
          });
          authorized = assignment != null;
        }
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

    // Notifica a la audiencia (no al actor que canceló).
    this.notifications
      .notifyPhysicalRequestEvent(
        request.id,
        NotificationType.PHYSICAL_REQUEST_CANCELLED,
        { excludeUserId: user.id },
      )
      .catch(() => undefined);

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
        assignedRp: {
          select: { displayName: true, user: { select: { phone: true } } },
        },
        pickupPoint: { select: { id: true, label: true, reference: true } },
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
        pickupPoint: { select: { id: true, label: true, reference: true } },
      },
    });
    return { items: items.map((r) => this.toDetail(r)) };
  }

  // ── Cliente: puntos de cobro cercanos para un tier ────────────────────────

  /**
   * Lista los puntos de cobro de los RPs asignados al evento del tier, ordenados
   * por cercanía a (lat,lng) si se proveen. La puerta del venue va siempre al
   * final. `distanceM` es null si no hay ubicación del cliente.
   */
  async nearbyPickupPoints(
    _userId: string,
    tierId: string,
    lat?: number,
    lng?: number,
  ) {
    const tier = await this.prisma.eventTier.findUnique({
      where: { id: tierId },
      select: { eventId: true },
    });
    if (!tier) throw new NotFoundException('Tier no encontrado');

    // RPs activos asignados al evento + sus puntos de cobro activos.
    const assignedRps = await this.prisma.eventRp.findMany({
      where: { eventId: tier.eventId, rpProfile: { isActive: true } },
      include: {
        rpProfile: {
          select: {
            id: true,
            displayName: true,
            pickupPoints: { where: { isActive: true } },
          },
        },
      },
    });

    const hasGeo = lat != null && lng != null;
    const points = assignedRps.flatMap((a) =>
      a.rpProfile.pickupPoints.map((p) => ({
        ...this.toPickupPointShape(p),
        distanceM: hasGeo
          ? Math.round(haversineMeters(lat!, lng!, p.latitude, p.longitude))
          : null,
        rpId: a.rpProfile.id,
        rpDisplayName: a.rpProfile.displayName,
      })),
    );

    points.sort((x, y) => {
      // La puerta del venue siempre al final.
      if (x.isVenueDoor !== y.isVenueDoor) return x.isVenueDoor ? 1 : -1;
      // Luego por distancia ascendente; sin distancia (null) ordena por label.
      if (x.distanceM != null && y.distanceM != null) {
        return x.distanceM - y.distanceM;
      }
      if (x.distanceM != null) return -1;
      if (y.distanceM != null) return 1;
      return x.label.localeCompare(y.label);
    });

    return { points };
  }

  /** Mapea una fila de RpPickupPoint a la forma pública del contrato. */
  private toPickupPointShape(row: {
    id: string;
    label: string;
    reference: string | null;
    latitude: number;
    longitude: number;
    mapsUrl: string | null;
    windows: Prisma.JsonValue;
    isVenueDoor: boolean;
    isActive: boolean;
  }) {
    return {
      id: row.id,
      label: row.label,
      reference: row.reference,
      latitude: row.latitude,
      longitude: row.longitude,
      mapsUrl: row.mapsUrl,
      windows: (row.windows ?? []) as unknown as unknown[],
      isVenueDoor: row.isVenueDoor,
      isActive: row.isActive,
    };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Lanza ConflictException si emitir `quantity` pases excedería el cupo del
   * tier o del evento. Cuenta pases emitidos + vales (PassClaim) pendientes +
   * solicitudes de efectivo PENDING ya existentes — misma base que el resto.
   */
  /**
   * Verifica aforo de tier y evento. Acepta el cliente Prisma (`db`) para poder
   * correr DENTRO de una transacción Serializable: cuando se ejecuta en la misma
   * tx que la emisión de pases, los conteos leídos entran en el conjunto de
   * lectura que Postgres usa para detectar conflictos de serialización → cierra
   * la carrera de sobreventa entre confirmaciones concurrentes.
   */
  private async assertCapacity(
    db: Prisma.TransactionClient,
    eventId: string,
    tierId: string,
    tierCapacity: number | null,
    eventCapacity: number | null,
    quantity: number,
  ): Promise<void> {
    if (tierCapacity != null) {
      const [soldTier, pendingClaimsTier, pendingReqTier] = await Promise.all([
        db.pass.count({
          where: { eventId, order: { tierId } },
        }),
        db.passClaim.count({
          where: { tierId, status: PassClaimStatus.PENDING },
        }),
        db.physicalPaymentRequest.aggregate({
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
        db.pass.count({ where: { eventId } }),
        db.passClaim.count({
          where: { eventId, status: PassClaimStatus.PENDING },
        }),
        db.physicalPaymentRequest.aggregate({
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
        userId: string;
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
    pickupAt?: Date | null;
    event: { id: string; title: string; startsAt: Date };
    tier: { id: string; name: string };
    user?: { name: string | null; email: string } | null;
    confirmedByRp?: { displayName: string; rpCode: string } | null;
    assignedRp?: {
      displayName: string;
      user: { phone: string | null } | null;
    } | null;
    pickupPoint?: { id: string; label: string; reference: string | null } | null;
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
      pickupAt: r.pickupAt?.toISOString() ?? null,
      event: r.event,
      tier: r.tier,
      customer: r.user ? { name: r.user.name, email: r.user.email } : null,
      confirmedByRp: r.confirmedByRp
        ? { displayName: r.confirmedByRp.displayName, rpCode: r.confirmedByRp.rpCode }
        : null,
      // Vendedor asignado (para que el cliente lo contacte por llamada/WhatsApp).
      rp: r.assignedRp
        ? { displayName: r.assignedRp.displayName, phone: r.assignedRp.user?.phone ?? null }
        : null,
      pickupPoint: r.pickupPoint
        ? {
            id: r.pickupPoint.id,
            label: r.pickupPoint.label,
            reference: r.pickupPoint.reference,
          }
        : null,
    };
  }
}
