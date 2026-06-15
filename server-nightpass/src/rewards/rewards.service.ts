import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomInt } from 'crypto';
import {
  Prisma,
  RedemptionStatus,
  RewardDiscountType,
  RewardFunder,
  RewardKind,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { CreateRewardDto } from './dto/create-reward.dto';
import { UpdateRewardDto } from './dto/update-reward.dto';

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LEN = 8;

@Injectable()
export class RewardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly loyalty: LoyaltyService,
  ) {}

  // ── Panel (dueño) ──────────────────────────────────────────────────────────

  async create(dto: CreateRewardDto, user: AuthUser) {
    if (!dto.venueId && !dto.promoterId) {
      throw new BadRequestException('Indica venueId o promoterId');
    }
    if (dto.venueId && dto.promoterId) {
      throw new BadRequestException('Solo un dueño: venue o promoter, no ambos');
    }

    await this.ensureOwner(
      { venueId: dto.venueId, promoterId: dto.promoterId },
      user,
    );

    // Un venue solo da perks (no procesa Stripe). Los descuentos de boleto son
    // del organizador (los fondea él en esta fase).
    if (dto.venueId && dto.kind !== RewardKind.VENUE_PERK) {
      throw new BadRequestException('Un local solo puede ofrecer perks de bar');
    }

    const funder: RewardFunder = dto.venueId
      ? RewardFunder.VENUE
      : RewardFunder.PROMOTER;

    // Valida reglas por tipo y, para tipos por evento, verifica pertenencia del
    // evento/tier al dueño. Devuelve el costNpp efectivo (BULK/PHYSICAL = 0).
    const costNpp = await this.validateKind(dto, {
      venueId: dto.venueId,
      promoterId: dto.promoterId,
    });

    const isEventScoped =
      dto.kind === RewardKind.BULK_PROMO ||
      dto.kind === RewardKind.PHYSICAL_BONUS_NPP;

    return this.prisma.reward.create({
      data: {
        venueId: dto.venueId ?? null,
        promoterId: dto.promoterId ?? null,
        kind: dto.kind,
        funder,
        title: dto.title,
        description: dto.description ?? null,
        costNpp,
        discountType: dto.discountType ?? RewardDiscountType.NONE,
        discountValue: dto.discountValue ?? 0,
        maxDiscountCents: dto.maxDiscountCents ?? null,
        active: dto.active ?? true,
        perUserLimit: dto.perUserLimit ?? null,
        expiresInH: dto.expiresInH ?? 72,
        eventId: isEventScoped ? (dto.eventId ?? null) : null,
        tierId: dto.kind === RewardKind.BULK_PROMO ? (dto.tierId ?? null) : null,
        minQuantity:
          dto.kind === RewardKind.BULK_PROMO ? (dto.minQuantity ?? null) : null,
        bonusNpp:
          dto.kind === RewardKind.PHYSICAL_BONUS_NPP
            ? (dto.bonusNpp ?? null)
            : null,
        options:
          dto.kind === RewardKind.BULK_PROMO && dto.options
            ? {
                create: dto.options.map((opt, i) => ({
                  label: opt.label,
                  description: opt.description ?? null,
                  position: i,
                })),
              }
            : undefined,
      },
      include: { options: { orderBy: { position: 'asc' } } },
    });
  }

  async listForOwner(
    user: AuthUser,
    query: { venueId?: string; promoterId?: string },
  ) {
    if (!query.venueId && !query.promoterId) {
      throw new BadRequestException('Indica venueId o promoterId');
    }
    await this.ensureOwner(
      { venueId: query.venueId, promoterId: query.promoterId },
      user,
    );
    return this.prisma.reward.findMany({
      where: { venueId: query.venueId ?? undefined, promoterId: query.promoterId ?? undefined },
      orderBy: { createdAt: 'desc' },
      include: { options: { orderBy: { position: 'asc' } } },
    });
  }

  async update(id: string, dto: UpdateRewardDto, user: AuthUser) {
    const reward = await this.getOwnedReward(id, user);
    this.validateDiscount(
      reward.kind,
      dto.discountType ?? reward.discountType,
      dto.discountValue ?? reward.discountValue,
    );

    // costNpp se fuerza a 0 en BULK/PHYSICAL: no se permite editarlo a otra cosa.
    const isFree =
      reward.kind === RewardKind.BULK_PROMO ||
      reward.kind === RewardKind.PHYSICAL_BONUS_NPP;
    const nextCostNpp = isFree ? undefined : (dto.costNpp ?? undefined);

    // Solo aplican a su tipo.
    const nextMinQuantity =
      reward.kind === RewardKind.BULK_PROMO
        ? (dto.minQuantity ?? undefined)
        : undefined;
    const nextBonusNpp =
      reward.kind === RewardKind.PHYSICAL_BONUS_NPP
        ? (dto.bonusNpp ?? undefined)
        : undefined;

    // Reemplazo total de opciones (solo BULK_PROMO): borra y recrea por índice.
    let optionsOp: Prisma.RewardUpdateInput['options'];
    if (dto.options !== undefined) {
      if (reward.kind !== RewardKind.BULK_PROMO) {
        throw new BadRequestException(
          'Solo una promo por compra (BULK_PROMO) tiene opciones',
        );
      }
      optionsOp = {
        deleteMany: {},
        create: dto.options.map((opt, i) => ({
          label: opt.label,
          description: opt.description ?? null,
          position: i,
        })),
      };
    }

    return this.prisma.reward.update({
      where: { id },
      data: {
        title: dto.title ?? undefined,
        description: dto.description ?? undefined,
        costNpp: nextCostNpp,
        discountType: dto.discountType ?? undefined,
        discountValue: dto.discountValue ?? undefined,
        maxDiscountCents: dto.maxDiscountCents ?? undefined,
        perUserLimit: dto.perUserLimit ?? undefined,
        expiresInH: dto.expiresInH ?? undefined,
        active: dto.active ?? undefined,
        minQuantity: nextMinQuantity,
        bonusNpp: nextBonusNpp,
        options: optionsOp,
      },
      include: { options: { orderBy: { position: 'asc' } } },
    });
  }

  async remove(id: string, user: AuthUser) {
    await this.getOwnedReward(id, user);
    await this.prisma.reward.delete({ where: { id } });
    return { ok: true };
  }

  // ── Cliente ────────────────────────────────────────────────────────────────

  async listAvailable(
    userId: string,
    query: { venueId?: string; city?: string },
  ) {
    // Solo tipos canjeables con NPP por el cliente. BULK_PROMO y
    // PHYSICAL_BONUS_NPP se otorgan automáticamente por compra, no se canjean.
    const where: Prisma.RewardWhereInput = {
      active: true,
      kind: { in: [RewardKind.VENUE_PERK, RewardKind.TICKET_DISCOUNT] },
    };
    if (query.venueId) where.venueId = query.venueId;
    if (query.city) {
      where.OR = [
        { venue: { city: { equals: query.city, mode: 'insensitive' } } },
        { promoter: { city: { equals: query.city, mode: 'insensitive' } } },
      ];
    }

    const [rewards, balance] = await Promise.all([
      this.prisma.reward.findMany({
        where,
        orderBy: { costNpp: 'asc' },
        include: {
          venue: { select: { name: true, city: true } },
          promoter: { select: { name: true, city: true } },
        },
      }),
      this.loyalty.getBalance(userId),
    ]);

    // Cuántas veces ya canjeó cada recompensa (para el límite por usuario).
    const counts = await this.prisma.rewardRedemption.groupBy({
      by: ['rewardId'],
      where: {
        userId,
        status: { in: [RedemptionStatus.PENDING, RedemptionStatus.USED] },
        rewardId: { in: rewards.map((r) => r.id) },
      },
      _count: { _all: true },
    });
    const usedByReward = new Map(counts.map((c) => [c.rewardId, c._count._all]));

    return {
      balance,
      rewards: rewards.map((r) => {
        const used = usedByReward.get(r.id) ?? 0;
        const limitReached = r.perUserLimit != null && used >= r.perUserLimit;
        return {
          id: r.id,
          kind: r.kind,
          eventId: r.eventId,
          title: r.title,
          description: r.description,
          costNpp: r.costNpp,
          discountType: r.discountType,
          discountValue: r.discountValue,
          ownerName: r.venue?.name ?? r.promoter?.name ?? 'NightPass',
          city: r.venue?.city ?? r.promoter?.city ?? null,
          redeemable: balance >= r.costNpp && !limitReached,
          limitReached,
        };
      }),
    };
  }

  async redeem(userId: string, rewardId: string) {
    const reward = await this.prisma.reward.findUnique({
      where: { id: rewardId },
    });
    if (!reward || !reward.active) {
      throw new NotFoundException('Recompensa no disponible');
    }

    if (reward.perUserLimit != null) {
      const used = await this.prisma.rewardRedemption.count({
        where: {
          userId,
          rewardId,
          status: { in: [RedemptionStatus.PENDING, RedemptionStatus.USED] },
        },
      });
      if (used >= reward.perUserLimit) {
        throw new BadRequestException('Ya alcanzaste el límite de esta recompensa');
      }
    }

    const balance = await this.loyalty.getBalance(userId);
    if (balance < reward.costNpp) {
      throw new BadRequestException('No tienes NPP suficientes');
    }

    const expiresAt = new Date(Date.now() + reward.expiresInH * 3_600_000);
    const code = await this.uniqueCode();

    // Crea el cupón, luego debita. Si el débito falla (saldo insuficiente por
    // carrera), se compensa borrando el cupón.
    const redemption = await this.prisma.rewardRedemption.create({
      data: {
        rewardId,
        userId,
        costNpp: reward.costNpp,
        code,
        expiresAt,
      },
    });

    try {
      await this.loyalty.debit({
        userId,
        points: reward.costNpp,
        idempotencyKey: `redeem:${redemption.id}`,
      });
    } catch (err) {
      await this.prisma.rewardRedemption
        .delete({ where: { id: redemption.id } })
        .catch(() => undefined);
      throw err;
    }

    return {
      id: redemption.id,
      code: redemption.code,
      title: reward.title,
      kind: reward.kind,
      expiresAt: redemption.expiresAt,
      costNpp: redemption.costNpp,
    };
  }

  async myRedemptions(userId: string) {
    await this.expireStale(userId);
    return this.prisma.rewardRedemption.findMany({
      where: { userId },
      orderBy: { redeemedAt: 'desc' },
      take: 50,
      include: {
        reward: {
          select: {
            title: true,
            kind: true,
            venue: { select: { name: true } },
            promoter: { select: { name: true } },
          },
        },
      },
    });
  }

  // ── Promo por volumen (BULK_PROMO) ──────────────────────────────────────────

  /**
   * Al completarse una orden (online o en efectivo) intenta desbloquear una
   * promo por volumen: busca un BULK_PROMO activo del evento (y tier si aplica)
   * cuyo minQuantity cubra la cantidad comprada. Si lo encuentra y aún no hay un
   * canje para (reward, orden), crea un RewardRedemption PENDING con
   * selectedOptionId null (el cliente elige la opción después). Corre DENTRO de
   * la tx de completado — el caller la envuelve en try/catch para que un error
   * aquí NUNCA tumbe el cierre de una orden ya pagada.
   */
  async maybeUnlockBulkPromo(
    tx: Prisma.TransactionClient,
    order: {
      id: string;
      userId: string;
      eventId: string;
      tierId: string;
      quantity: number;
    },
  ): Promise<void> {
    // Candidatos activos del evento cuyo minQuantity cubre la compra y cuyo tier
    // coincide (o es null = cualquier tier). Tomamos el de mayor minQuantity.
    const candidates = await tx.reward.findMany({
      where: {
        active: true,
        kind: RewardKind.BULK_PROMO,
        eventId: order.eventId,
        minQuantity: { lte: order.quantity },
        OR: [{ tierId: null }, { tierId: order.tierId }],
      },
      orderBy: { minQuantity: 'desc' },
    });
    const reward = candidates[0];
    if (!reward) return;

    // Idempotencia: un solo canje por (reward, orden).
    const existing = await tx.rewardRedemption.findFirst({
      where: { rewardId: reward.id, orderId: order.id },
      select: { id: true },
    });
    if (existing) return;

    const expiresAt = new Date(Date.now() + reward.expiresInH * 3_600_000);
    const code = await this.uniqueCode(tx);

    await tx.rewardRedemption.create({
      data: {
        rewardId: reward.id,
        userId: order.userId,
        orderId: order.id,
        costNpp: 0,
        status: RedemptionStatus.PENDING,
        selectedOptionId: null,
        code,
        expiresAt,
      },
    });
  }

  /**
   * Canjes BULK del usuario pendientes de elegir opción (selectedOptionId null)
   * y no expirados. Alimenta el modal "elige tu promo" del cliente.
   */
  async listBulkPending(userId: string) {
    const now = new Date();
    const items = await this.prisma.rewardRedemption.findMany({
      where: {
        userId,
        selectedOptionId: null,
        status: RedemptionStatus.PENDING,
        expiresAt: { gt: now },
        reward: { kind: RewardKind.BULK_PROMO },
      },
      orderBy: { redeemedAt: 'desc' },
      include: {
        reward: {
          select: {
            title: true,
            options: {
              orderBy: { position: 'asc' },
              select: { id: true, label: true, description: true },
            },
          },
        },
      },
    });

    return {
      items: items.map((r) => ({
        redemptionId: r.id,
        orderId: r.orderId,
        code: r.code,
        expiresAt: r.expiresAt,
        reward: {
          title: r.reward.title,
          options: r.reward.options,
        },
      })),
    };
  }

  /**
   * El cliente elige la opción de su promo por volumen. Marca selectedOptionId.
   * El cupón resultante se valida luego en puerta por `useByCode`.
   */
  async chooseBulkOption(userId: string, redemptionId: string, optionId: string) {
    const redemption = await this.prisma.rewardRedemption.findUnique({
      where: { id: redemptionId },
      include: { reward: { select: { kind: true, title: true } } },
    });
    if (!redemption) throw new NotFoundException('Canje no encontrado');
    if (redemption.userId !== userId) {
      throw new ForbiddenException('Este canje no te pertenece');
    }
    if (redemption.reward.kind !== RewardKind.BULK_PROMO) {
      throw new BadRequestException('Este canje no es una promo por volumen');
    }
    if (redemption.selectedOptionId !== null) {
      throw new BadRequestException('Ya elegiste una opción para esta promo');
    }
    if (redemption.status !== RedemptionStatus.PENDING) {
      throw new BadRequestException('Esta promo ya no está disponible');
    }
    if (redemption.expiresAt.getTime() < Date.now()) {
      await this.prisma.rewardRedemption.update({
        where: { id: redemption.id },
        data: { status: RedemptionStatus.EXPIRED },
      });
      throw new BadRequestException('Esta promo expiró');
    }

    const option = await this.prisma.rewardOption.findUnique({
      where: { id: optionId },
      select: { id: true, rewardId: true, label: true },
    });
    if (!option || option.rewardId !== redemption.rewardId) {
      throw new BadRequestException('La opción no pertenece a esta promo');
    }

    const updated = await this.prisma.rewardRedemption.update({
      where: { id: redemption.id },
      data: { selectedOptionId: option.id },
    });

    return {
      code: updated.code,
      title: redemption.reward.title,
      optionLabel: option.label,
      expiresAt: updated.expiresAt,
    };
  }

  // ── Validación en puerta/barra (staff) ──────────────────────────────────────

  async useByCode(code: string, user: AuthUser) {
    const redemption = await this.prisma.rewardRedemption.findUnique({
      where: { code },
      include: { reward: true, user: { select: { name: true, email: true } } },
    });
    if (!redemption) throw new NotFoundException('Cupón no encontrado');

    // El staff debe pertenecer al venue/organizador dueño de la recompensa.
    await this.ensureOwner(
      {
        venueId: redemption.reward.venueId ?? undefined,
        promoterId: redemption.reward.promoterId ?? undefined,
      },
      user,
    );

    // Promo por volumen: el cliente debe haber elegido su opción primero.
    if (
      redemption.reward.kind === RewardKind.BULK_PROMO &&
      redemption.selectedOptionId === null
    ) {
      throw new BadRequestException('Elige tu promo primero');
    }

    if (redemption.status === RedemptionStatus.USED) {
      throw new BadRequestException('Este cupón ya fue usado');
    }
    if (redemption.status !== RedemptionStatus.PENDING) {
      throw new BadRequestException('Cupón no válido');
    }
    if (redemption.expiresAt.getTime() < Date.now()) {
      await this.prisma.rewardRedemption.update({
        where: { id: redemption.id },
        data: { status: RedemptionStatus.EXPIRED },
      });
      throw new BadRequestException('Cupón expirado');
    }

    const updated = await this.prisma.rewardRedemption.update({
      where: { id: redemption.id },
      data: { status: RedemptionStatus.USED, usedAt: new Date() },
    });

    return {
      ok: true,
      title: redemption.reward.title,
      customer: redemption.user.name ?? redemption.user.email,
      usedAt: updated.usedAt,
    };
  }

  /**
   * Genera un código de cupón único (mismo formato que el resto de canjes).
   * Público para que otros módulos (orders) creen RewardRedemption con un code
   * consistente. Acepta un cliente de tx opcional.
   */
  async generateUniqueCode(
    db: Prisma.TransactionClient = this.prisma,
  ): Promise<string> {
    return this.uniqueCode(db);
  }

  // ── Internos ────────────────────────────────────────────────────────────────

  /** Marca como EXPIRED los cupones PENDING vencidos del usuario (lazy). */
  private async expireStale(userId: string): Promise<void> {
    await this.prisma.rewardRedemption.updateMany({
      where: {
        userId,
        status: RedemptionStatus.PENDING,
        expiresAt: { lt: new Date() },
      },
      data: { status: RedemptionStatus.EXPIRED },
    });
  }

  private async getOwnedReward(id: string, user: AuthUser) {
    const reward = await this.prisma.reward.findUnique({ where: { id } });
    if (!reward) throw new NotFoundException('Recompensa no encontrada');
    await this.ensureOwner(
      {
        venueId: reward.venueId ?? undefined,
        promoterId: reward.promoterId ?? undefined,
      },
      user,
    );
    return reward;
  }

  /** Reusa el patrón de eventos: ADMIN pasa; si no, debe ser dueño del venue/promoter. */
  private async ensureOwner(
    params: { venueId?: string; promoterId?: string },
    user: AuthUser,
  ): Promise<void> {
    if (user.role === 'ADMIN') return;

    if (
      params.venueId &&
      ['VENUE_OWNER', 'VENUE_STAFF'].includes(user.role)
    ) {
      const link = await this.prisma.venueOwner.findUnique({
        where: { userId_venueId: { userId: user.id, venueId: params.venueId } },
        select: { userId: true },
      });
      if (link) return;
    }

    if (
      params.promoterId &&
      ['PROMOTER', 'PROMOTER_STAFF'].includes(user.role)
    ) {
      const link = await this.prisma.promoterMember.findUnique({
        where: {
          userId_promoterId: { userId: user.id, promoterId: params.promoterId },
        },
        select: { userId: true },
      });
      if (link) return;
    }

    throw new ForbiddenException('No tienes permisos sobre esta recompensa');
  }

  /**
   * Valida las reglas por tipo de recompensa y, para los tipos atados a evento,
   * verifica que el evento (y el tier si se pasa) pertenezcan al dueño.
   * Devuelve el costNpp efectivo (BULK_PROMO / PHYSICAL_BONUS_NPP fuerzan 0).
   */
  private async validateKind(
    dto: CreateRewardDto,
    owner: { venueId?: string; promoterId?: string },
  ): Promise<number> {
    switch (dto.kind) {
      case RewardKind.VENUE_PERK: {
        if (!dto.costNpp || dto.costNpp < 1) {
          throw new BadRequestException('Un perk requiere costNpp >= 1');
        }
        return dto.costNpp;
      }

      case RewardKind.TICKET_DISCOUNT: {
        if (!dto.costNpp || dto.costNpp < 1) {
          throw new BadRequestException(
            'Un descuento de boleto requiere costNpp >= 1',
          );
        }
        this.validateDiscount(dto.kind, dto.discountType, dto.discountValue);
        return dto.costNpp;
      }

      case RewardKind.BULK_PROMO: {
        if (!dto.eventId) {
          throw new BadRequestException(
            'Una promo por compra requiere eventId',
          );
        }
        if (!dto.minQuantity || dto.minQuantity < 2) {
          throw new BadRequestException(
            'Una promo por compra requiere minQuantity >= 2',
          );
        }
        if (!dto.options || dto.options.length < 1) {
          throw new BadRequestException(
            'Una promo por compra requiere al menos una opción',
          );
        }
        await this.ensureEventScope(dto.eventId, dto.tierId, owner);
        return 0; // gratis: no cuesta NPP
      }

      case RewardKind.PHYSICAL_BONUS_NPP: {
        if (!dto.eventId) {
          throw new BadRequestException(
            'El bono por pago físico requiere eventId',
          );
        }
        if (!dto.bonusNpp || dto.bonusNpp < 1) {
          throw new BadRequestException(
            'El bono por pago físico requiere bonusNpp >= 1',
          );
        }
        await this.ensureEventScope(dto.eventId, undefined, owner);
        return 0; // no se canjea con NPP; otorga NPP en otra fase
      }

      default:
        throw new BadRequestException('Tipo de recompensa no soportado');
    }
  }

  /**
   * Verifica que el evento pertenezca al dueño (venue/promoter) que crea la
   * recompensa y, si se pasa tierId, que el tier pertenezca a ese evento.
   */
  private async ensureEventScope(
    eventId: string,
    tierId: string | undefined,
    owner: { venueId?: string; promoterId?: string },
  ): Promise<void> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, venueId: true, promoterId: true },
    });
    if (!event) throw new NotFoundException('Evento no encontrado');

    const matchesOwner = owner.venueId
      ? event.venueId === owner.venueId
      : event.promoterId === owner.promoterId;
    if (!matchesOwner) {
      throw new ForbiddenException('El evento no pertenece a este dueño');
    }

    if (tierId) {
      const tier = await this.prisma.eventTier.findUnique({
        where: { id: tierId },
        select: { eventId: true },
      });
      if (!tier || tier.eventId !== eventId) {
        throw new BadRequestException('El tier no pertenece al evento indicado');
      }
    }
  }

  private validateDiscount(
    kind: RewardKind,
    type: RewardDiscountType | undefined,
    value: number | undefined,
  ): void {
    if (kind === RewardKind.TICKET_DISCOUNT) {
      if (!type || type === RewardDiscountType.NONE) {
        throw new BadRequestException(
          'Un descuento de boleto requiere discountType PERCENT o FIXED',
        );
      }
      if (type === RewardDiscountType.PERCENT && (!value || value < 1 || value > 100)) {
        throw new BadRequestException('El porcentaje debe estar entre 1 y 100');
      }
      if (type === RewardDiscountType.FIXED && (!value || value < 1)) {
        throw new BadRequestException('El monto fijo debe ser mayor a 0');
      }
    }
  }

  private generateCode(): string {
    let out = '';
    for (let i = 0; i < CODE_LEN; i += 1) {
      out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
    }
    return out;
  }

  private async uniqueCode(
    db: Prisma.TransactionClient = this.prisma,
  ): Promise<string> {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const code = this.generateCode();
      const exists = await db.rewardRedemption.findUnique({
        where: { code },
        select: { id: true },
      });
      if (!exists) return code;
    }
    throw new Error('No se pudo generar un código de cupón único');
  }
}
