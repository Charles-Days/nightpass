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

    this.validateDiscount(dto.kind, dto.discountType, dto.discountValue);

    return this.prisma.reward.create({
      data: {
        venueId: dto.venueId ?? null,
        promoterId: dto.promoterId ?? null,
        kind: dto.kind,
        funder,
        title: dto.title,
        description: dto.description ?? null,
        costNpp: dto.costNpp,
        discountType: dto.discountType ?? RewardDiscountType.NONE,
        discountValue: dto.discountValue ?? 0,
        maxDiscountCents: dto.maxDiscountCents ?? null,
        active: dto.active ?? true,
        perUserLimit: dto.perUserLimit ?? null,
        expiresInH: dto.expiresInH ?? 72,
      },
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
    });
  }

  async update(id: string, dto: UpdateRewardDto, user: AuthUser) {
    const reward = await this.getOwnedReward(id, user);
    this.validateDiscount(
      reward.kind,
      dto.discountType ?? reward.discountType,
      dto.discountValue ?? reward.discountValue,
    );
    return this.prisma.reward.update({
      where: { id },
      data: {
        title: dto.title ?? undefined,
        description: dto.description ?? undefined,
        costNpp: dto.costNpp ?? undefined,
        discountType: dto.discountType ?? undefined,
        discountValue: dto.discountValue ?? undefined,
        maxDiscountCents: dto.maxDiscountCents ?? undefined,
        perUserLimit: dto.perUserLimit ?? undefined,
        expiresInH: dto.expiresInH ?? undefined,
        active: dto.active ?? undefined,
      },
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
    const where: Prisma.RewardWhereInput = { active: true };
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

  private async uniqueCode(): Promise<string> {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const code = this.generateCode();
      const exists = await this.prisma.rewardRedemption.findUnique({
        where: { code },
        select: { id: true },
      });
      if (!exists) return code;
    }
    throw new Error('No se pudo generar un código de cupón único');
  }
}
