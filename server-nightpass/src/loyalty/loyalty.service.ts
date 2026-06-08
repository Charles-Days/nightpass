import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import {
  LocationPingSource,
  LoyaltyEventType,
  LoyaltyTier,
  Prisma,
} from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { LocationsService } from '../locations/locations.service';
import { haversineMeters } from '../common/geo';
import {
  signVenueCheckin,
  verifyVenueCheckin,
} from '../common/qr-hmac';
import {
  MULTIPLIERS,
  POINTS,
  STREAK,
  STREAK_MILESTONES,
  TIER_RANK,
  nextTier,
  tierFromYearPoints,
} from './loyalty.constants';
import {
  LeaderboardEntryDto,
  LoyaltyEventDto,
  LoyaltyStatusDto,
} from './dto/loyalty-response.dto';

interface ApplyRewardOpts {
  userId: string;
  type: LoyaltyEventType;
  basePoints: number;
  idempotencyKey: string;
  venueId?: string;
  eventId?: string;
  passId?: string;
  occurredAt: Date;
  /** When true, do NOT advance the streak (e.g. EVENT_CHECKIN — staff scans don't bump streak). */
  skipStreak?: boolean;
}

interface ApplyRewardResult {
  awarded: number;
  newStreakDays: number;
  tier: LoyaltyTier;
  alreadyAwarded?: boolean;
}

@Injectable()
export class LoyaltyService {
  private readonly logger = new Logger(LoyaltyService.name);
  private readonly webUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly locations: LocationsService,
    config: ConfigService,
  ) {
    this.webUrl = (config.get<string>('ADMIN_WEB_URL') ?? 'http://localhost:7100').replace(/\/$/, '');
  }

  // ── Awards ───────────────────────────────────────────────────────────────

  async awardPassScan(opts: {
    userId: string;
    passId: string;
    eventId: string;
    venueId: string;
    scannedAt: Date;
  }): Promise<void> {
    const { userId, passId, eventId, venueId, scannedAt } = opts;

    await this.applyReward({
      userId,
      type: LoyaltyEventType.EVENT_CHECKIN,
      basePoints: POINTS.EVENT_CHECKIN,
      idempotencyKey: `scan:${passId}`,
      venueId,
      eventId,
      passId,
      occurredAt: scannedAt,
      skipStreak: true,
    });

    await this.maybeAwardFirstVenueBonus(userId, venueId, scannedAt);
  }

  async checkinVenue(opts: {
    userId: string;
    venueId: string;
    qrPayload: string;
    latitude: number;
    longitude: number;
  }): Promise<{
    awarded: number;
    newStreakDays: number;
    tier: LoyaltyTier;
    alreadyCheckedInToday?: boolean;
  }> {
    const { userId, venueId, qrPayload, latitude, longitude } = opts;

    const venue = await this.prisma.venue.findUnique({
      where: { id: venueId },
      select: {
        id: true,
        checkinQrSecret: true,
        latitude: true,
        longitude: true,
        geofenceRadiusM: true,
      },
    });
    if (!venue) throw new NotFoundException('Local no encontrado');
    if (!venue.checkinQrSecret) {
      throw new BadRequestException('Este local no tiene check-in habilitado');
    }

    const verified = verifyVenueCheckin(qrPayload, venue.checkinQrSecret);
    if (!verified || verified.venueId !== venue.id) {
      throw new BadRequestException('QR de check-in inválido');
    }

    if (venue.latitude == null || venue.longitude == null) {
      throw new BadRequestException(
        'Este local no tiene coordenadas configuradas',
      );
    }

    const meters = haversineMeters(
      latitude,
      longitude,
      venue.latitude,
      venue.longitude,
    );
    const tolerance =
      venue.geofenceRadiusM + STREAK.VENUE_CHECKIN_GPS_TOLERANCE_M;
    if (meters > tolerance) {
      throw new BadRequestException('Estás muy lejos del local');
    }

    const now = new Date();
    const idempotencyKey = `checkin:${venue.id}:${userId}:${this.utcDayString(now)}`;

    const result = await this.applyReward({
      userId,
      type: LoyaltyEventType.VENUE_CHECKIN,
      basePoints: POINTS.VENUE_CHECKIN,
      idempotencyKey,
      venueId: venue.id,
      occurredAt: now,
    });

    await this.maybeAwardFirstVenueBonus(userId, venue.id, now);

    this.locations
      .record(userId, {
        latitude: venue.latitude,
        longitude: venue.longitude,
        source: LocationPingSource.VENUE_CHECKIN,
      })
      .catch((err) =>
        this.logger.warn(
          `LocationPing VENUE_CHECKIN falló user=${userId} venue=${venue.id}: ${err instanceof Error ? err.message : err}`,
        ),
      );

    return {
      awarded: result.awarded,
      newStreakDays: result.newStreakDays,
      tier: result.tier,
      alreadyCheckedInToday: result.alreadyAwarded === true ? true : undefined,
    };
  }

  async rotateVenueCheckinSecret(
    venueId: string,
  ): Promise<{ payload: string; scanUrl: string; issuedAt: Date }> {
    const venue = await this.prisma.venue.findUnique({
      where: { id: venueId },
      select: { id: true },
    });
    if (!venue) throw new NotFoundException('Local no encontrado');

    const secret = randomBytes(32).toString('hex');
    const issuedAt = new Date();

    await this.prisma.venue.update({
      where: { id: venueId },
      data: {
        checkinQrSecret: secret,
        checkinQrIssuedAt: issuedAt,
      },
    });

    const payload = signVenueCheckin(venueId, secret);
    const hmac = payload.split('_').pop()!;
    const scanUrl = `${this.webUrl}/app/checkin/${venueId}?t=${hmac}`;
    return { payload, scanUrl, issuedAt };
  }

  /**
   * Read current checkin QR without rotating. Returns null if the venue never
   * generated one. Same payload/scanUrl shape as `rotateVenueCheckinSecret`
   * so the panel can render without distinguishing GET vs POST results.
   */
  async getVenueCheckinQr(
    venueId: string,
  ): Promise<{ payload: string; scanUrl: string; issuedAt: Date } | null> {
    const venue = await this.prisma.venue.findUnique({
      where: { id: venueId },
      select: { id: true, checkinQrSecret: true, checkinQrIssuedAt: true },
    });
    if (!venue) throw new NotFoundException('Local no encontrado');
    if (!venue.checkinQrSecret || !venue.checkinQrIssuedAt) return null;

    const payload = signVenueCheckin(venueId, venue.checkinQrSecret);
    const hmac = payload.split('_').pop()!;
    const scanUrl = `${this.webUrl}/app/checkin/${venueId}?t=${hmac}`;
    return { payload, scanUrl, issuedAt: venue.checkinQrIssuedAt };
  }

  async assertTierRequirement(
    userId: string,
    requiredTier: LoyaltyTier | null,
  ): Promise<void> {
    if (!requiredTier) return;

    const total = await this.prisma.userLoyaltyTotal.findUnique({
      where: { userId },
      select: { tier: true },
    });
    const userTier: LoyaltyTier = total?.tier ?? LoyaltyTier.ROOKIE;

    if (TIER_RANK[userTier] < TIER_RANK[requiredTier]) {
      throw new ForbiddenException(
        `Este tier requiere status ${requiredTier}. Tu nivel: ${userTier}`,
      );
    }
  }

  // ── Reads ────────────────────────────────────────────────────────────────

  async getMyStatus(userId: string): Promise<LoyaltyStatusDto> {
    const [total, streak] = await Promise.all([
      this.prisma.userLoyaltyTotal.findUnique({ where: { userId } }),
      this.prisma.userStreak.findUnique({ where: { userId } }),
    ]);

    const tier: LoyaltyTier = total?.tier ?? LoyaltyTier.ROOKIE;
    const next = nextTier(tier);
    const yearPoints = total?.yearPoints ?? 0;
    const pointsToNext =
      next === null
        ? null
        : Math.max(0, this.thresholdFor(next) - yearPoints);

    return {
      totalPoints: total?.totalPoints ?? 0,
      yearPoints,
      tier,
      nextTier: next,
      pointsToNext,
      streak: {
        current: streak?.currentDays ?? 0,
        longest: streak?.longestDays ?? 0,
        freezesRemaining:
          streak?.freezesRemaining ?? STREAK.FREEZES_PER_MONTH,
        lastCheckinDate:
          streak?.lastCheckinDate?.toISOString() ?? null,
      },
    };
  }

  async getMyHistory(
    userId: string,
    limit = 50,
  ): Promise<LoyaltyEventDto[]> {
    const take = Math.min(Math.max(limit, 1), 200);
    const events = await this.prisma.loyaltyEvent.findMany({
      where: { userId },
      orderBy: { occurredAt: 'desc' },
      take,
      include: {
        venue: { select: { name: true } },
        event: { select: { title: true } },
      },
    });

    return events.map((e) => ({
      id: e.id,
      type: e.type,
      points: e.points,
      multiplier: e.multiplier,
      venueName: e.venue?.name ?? null,
      eventTitle: e.event?.title ?? null,
      occurredAt: e.occurredAt.toISOString(),
    }));
  }

  async getCityLeaderboard(
    city: string,
    opts: { windowDays?: number; limit?: number } = {},
  ): Promise<LeaderboardEntryDto[]> {
    const limit = Math.min(Math.max(opts.limit ?? 20, 1), 100);
    const windowDays = Math.min(Math.max(opts.windowDays ?? 30, 1), 365);
    const cutoff = new Date(Date.now() - windowDays * 86_400_000);
    const normalizedCity = city.trim();

    const userIds = await this.prisma.loyaltyEvent.findMany({
      where: {
        occurredAt: { gte: cutoff },
        venue: { city: { equals: normalizedCity, mode: 'insensitive' } },
      },
      select: { userId: true },
      distinct: ['userId'],
    });

    if (userIds.length === 0) {
      throw new NotFoundException(
        'Aún no hay suficientes usuarios en esta ciudad',
      );
    }

    const ids = userIds.map((u) => u.userId);

    const totals = await this.prisma.userLoyaltyTotal.findMany({
      // Solo usuarios que dieron consentimiento explícito (rankingOptIn=true).
      where: {
        userId: { in: ids },
        yearPoints: { gt: 0 },
        user: { rankingOptIn: true },
      },
      orderBy: { yearPoints: 'desc' },
      take: limit,
      include: { user: { select: { id: true, name: true } } },
    });

    if (totals.length < 1) {
      throw new NotFoundException(
        'Aún no hay suficientes usuarios en esta ciudad',
      );
    }

    return totals.map((t, idx) => ({
      rank: idx + 1,
      userId: t.userId,
      name: this.anonymizeName(t.user.name),
      tier: t.tier,
      yearPoints: t.yearPoints,
    }));
  }

  // ── Admin ────────────────────────────────────────────────────────────────

  async adminAdjust(
    targetUserId: string,
    points: number,
    reason: string,
    adminUserId: string,
  ): Promise<void> {
    if (!Number.isInteger(points) || points === 0) {
      throw new BadRequestException('points debe ser entero distinto de 0');
    }

    const exists = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Usuario no encontrado');

    const idempotencyKey = `admin:${randomBytes(8).toString('hex')}:${targetUserId}`;

    await this.applyReward({
      userId: targetUserId,
      type: LoyaltyEventType.ADMIN_ADJUST,
      basePoints: points,
      idempotencyKey,
      occurredAt: new Date(),
      skipStreak: true,
    });

    this.logger.log(
      `admin=${adminUserId} adjusted user=${targetUserId} by ${points} pts — ${reason}`,
    );
  }

  // ── Referidos cliente→cliente ────────────────────────────────────────────

  /** Alguien abrió el link de invitación. `points` lo decide el caller (general
   *  vs por evento). Muy pocos puntos, 1 vez por visitante. */
  async awardReferralVisit(opts: {
    referrerId: string;
    visitorId: string;
    points: number;
    /** Scope del link: undefined = general; un eventId = link por evento. La
     *  idempotencia es por scope, así general y cada evento cuentan por separado. */
    eventId?: string;
  }): Promise<void> {
    if (!opts.visitorId) return;
    const scope = opts.eventId ?? 'gen';
    await this.applyReward({
      userId: opts.referrerId,
      type: LoyaltyEventType.REFERRAL_VISIT,
      basePoints: opts.points,
      idempotencyKey: `ref_visit:${opts.referrerId}:${opts.visitorId}:${scope}`,
      occurredAt: new Date(),
      skipStreak: true,
    });
  }

  /** Un invitado creó su cuenta vía el link. `points` lo decide el caller.
   *  1 vez por invitado (idempotente). */
  async awardReferralSignup(opts: {
    referrerId: string;
    referredUserId: string;
    points: number;
  }): Promise<void> {
    await this.applyReward({
      userId: opts.referrerId,
      type: LoyaltyEventType.REFERRAL_SIGNUP,
      basePoints: opts.points,
      idempotencyKey: `ref_signup:${opts.referredUserId}`,
      occurredAt: new Date(),
      skipStreak: true,
    });
  }

  // ── Canje (débito) ───────────────────────────────────────────────────────

  /** Balance NPP gastable del usuario. */
  async getBalance(userId: string): Promise<number> {
    const total = await this.prisma.userLoyaltyTotal.findUnique({
      where: { userId },
      select: { totalPoints: true },
    });
    return total?.totalPoints ?? 0;
  }

  /**
   * Resta NPP por un canje. `points` positivo (se registra negativo). Idempotente
   * por `idempotencyKey` (usar `redeem:<redemptionId>`). Si el balance no alcanza,
   * la transacción interna hace rollback y lanza BadRequest.
   */
  async debit(opts: {
    userId: string;
    points: number;
    idempotencyKey: string;
  }): Promise<void> {
    if (opts.points <= 0) {
      throw new BadRequestException('points debe ser mayor a 0');
    }
    await this.applyReward({
      userId: opts.userId,
      type: LoyaltyEventType.REDEEM,
      basePoints: -opts.points,
      idempotencyKey: opts.idempotencyKey,
      occurredAt: new Date(),
      skipStreak: true,
    });
  }

  // ── Internal ─────────────────────────────────────────────────────────────

  private async applyReward(
    opts: ApplyRewardOpts,
  ): Promise<ApplyRewardResult> {
    const multiplier = this.computeMultiplier(opts.occurredAt);
    // ADMIN_ADJUST y REDEEM son montos exactos (no aplican multiplicador).
    const exactType =
      opts.type === LoyaltyEventType.ADMIN_ADJUST ||
      opts.type === LoyaltyEventType.REDEEM;
    const effective = exactType
      ? opts.basePoints
      : Math.round(opts.basePoints * multiplier);

    try {
      return await this.prisma.$transaction(async (tx) => {
        // A unique-violation here aborts the whole Postgres transaction
        // (SQLSTATE 25P02): any further query on `tx` would fail. So we do
        // NOT catch it inside the tx — we let it roll back and absorb the
        // duplicate below, reading current state on a clean connection.
        await tx.loyaltyEvent.create({
          data: {
            userId: opts.userId,
            type: opts.type,
            points: effective,
            multiplier,
            venueId: opts.venueId,
            eventId: opts.eventId,
            passId: opts.passId,
            idempotencyKey: opts.idempotencyKey,
            occurredAt: opts.occurredAt,
          },
        });

        let streakDays = 0;
        let milestoneBonus = 0;

        if (!opts.skipStreak) {
          const streakState = await this.advanceStreak(
            tx,
            opts.userId,
            opts.occurredAt,
          );
          streakDays = streakState.currentDays;

          milestoneBonus = await this.maybeEmitMilestone(
            tx,
            opts.userId,
            streakDays,
            opts.occurredAt,
          );
        } else {
          const existing = await tx.userStreak.findUnique({
            where: { userId: opts.userId },
            select: { currentDays: true },
          });
          streakDays = existing?.currentDays ?? 0;
        }

        const totalAwarded = effective + milestoneBonus;

        const newTier = await this.recomputeTotals(tx, opts.userId);

        // Débito (REDEEM): si dejó el balance negativo, no alcanzaba → rollback.
        if (opts.type === LoyaltyEventType.REDEEM) {
          const after = await tx.userLoyaltyTotal.findUnique({
            where: { userId: opts.userId },
            select: { totalPoints: true },
          });
          if ((after?.totalPoints ?? 0) < 0) {
            throw new BadRequestException('NPP insuficientes');
          }
        }

        return {
          awarded: totalAwarded,
          newStreakDays: streakDays,
          tier: newTier,
        };
      });
    } catch (err) {
      // Duplicate idempotencyKey → reward already applied. The transaction
      // rolled back, so read current state on a fresh connection (`this.prisma`,
      // NOT the poisoned `tx`) and report it as already-awarded.
      if (this.isUniqueViolation(err)) {
        const [total, streak] = await Promise.all([
          this.prisma.userLoyaltyTotal.findUnique({
            where: { userId: opts.userId },
            select: { tier: true },
          }),
          this.prisma.userStreak.findUnique({
            where: { userId: opts.userId },
            select: { currentDays: true },
          }),
        ]);
        return {
          awarded: 0,
          newStreakDays: streak?.currentDays ?? 0,
          tier: total?.tier ?? LoyaltyTier.ROOKIE,
          alreadyAwarded: true,
        };
      }

      this.logger.error(
        `applyReward failed user=${opts.userId} key=${opts.idempotencyKey}: ${err instanceof Error ? err.message : err}`,
      );
      throw err;
    }
  }

  private async advanceStreak(
    tx: Prisma.TransactionClient,
    userId: string,
    occurredAt: Date,
  ): Promise<{ currentDays: number }> {
    const today = this.truncToUtcDay(occurredAt);

    let streak = await tx.userStreak.findUnique({ where: { userId } });

    if (!streak) {
      const created = await tx.userStreak.create({
        data: {
          userId,
          currentDays: 1,
          longestDays: 1,
          lastCheckinDate: today,
          freezesRemaining: STREAK.FREEZES_PER_MONTH,
          freezesRefreshedAt: occurredAt,
        },
      });
      return { currentDays: created.currentDays };
    }

    let freezesRemaining = streak.freezesRemaining;
    let freezesRefreshedAt = streak.freezesRefreshedAt;
    if (this.isPreviousCalendarMonth(streak.freezesRefreshedAt, occurredAt)) {
      freezesRemaining = STREAK.FREEZES_PER_MONTH;
      freezesRefreshedAt = occurredAt;
    }

    let currentDays = streak.currentDays;

    if (streak.lastCheckinDate === null) {
      currentDays = 1;
    } else {
      const last = this.truncToUtcDay(streak.lastCheckinDate);
      const gapDays = Math.round(
        (today.getTime() - last.getTime()) / 86_400_000,
      );

      if (gapDays <= 0) {
        await tx.userStreak.update({
          where: { userId },
          data: {
            freezesRemaining,
            freezesRefreshedAt,
          },
        });
        return { currentDays };
      }

      if (gapDays === 1) {
        currentDays = currentDays + 1;
      } else if (freezesRemaining > 0) {
        freezesRemaining = freezesRemaining - 1;
      } else {
        currentDays = 1;
      }
    }

    const longestDays = Math.max(streak.longestDays, currentDays);

    const updated = await tx.userStreak.update({
      where: { userId },
      data: {
        currentDays,
        longestDays,
        lastCheckinDate: today,
        freezesRemaining,
        freezesRefreshedAt,
      },
    });

    return { currentDays: updated.currentDays };
  }

  private async maybeEmitMilestone(
    tx: Prisma.TransactionClient,
    userId: string,
    currentDays: number,
    occurredAt: Date,
  ): Promise<number> {
    const milestone = STREAK_MILESTONES.find((m) => m.days === currentDays);
    if (!milestone) return 0;

    const idempotencyKey = `milestone:${userId}:${milestone.days}`;

    // Pre-check instead of catch-on-create: a failed create would abort the
    // surrounding Postgres transaction (25P02), breaking the subsequent
    // recomputeTotals(tx). This runs inside an interactive tx, so it's
    // serialized — no real race window.
    const existing = await tx.loyaltyEvent.findUnique({
      where: { idempotencyKey },
      select: { id: true },
    });
    if (existing) return 0;

    await tx.loyaltyEvent.create({
      data: {
        userId,
        type: LoyaltyEventType.STREAK_MILESTONE,
        points: milestone.bonus,
        multiplier: 1,
        idempotencyKey,
        occurredAt,
        metadata: { days: milestone.days } as Prisma.InputJsonValue,
      },
    });
    return milestone.bonus;
  }

  private async recomputeTotals(
    tx: Prisma.TransactionClient,
    userId: string,
  ): Promise<LoyaltyTier> {
    const yearCutoff = new Date(Date.now() - 365 * 86_400_000);

    const [totalAgg, yearAgg] = await Promise.all([
      // totalPoints = balance gastable (incluye los REDEEM negativos).
      tx.loyaltyEvent.aggregate({
        where: { userId },
        _sum: { points: true },
      }),
      // yearPoints = base del tier: solo puntos GANADOS. Gastar (REDEEM) no
      // debe degradar el tier del usuario.
      tx.loyaltyEvent.aggregate({
        where: {
          userId,
          occurredAt: { gte: yearCutoff },
          type: { not: LoyaltyEventType.REDEEM },
        },
        _sum: { points: true },
      }),
    ]);

    const totalPoints = totalAgg._sum.points ?? 0;
    const yearPoints = yearAgg._sum.points ?? 0;
    const tier = tierFromYearPoints(yearPoints);

    const existing = await tx.userLoyaltyTotal.findUnique({
      where: { userId },
      select: { tier: true },
    });
    const tierChanged = !existing || existing.tier !== tier;

    await tx.userLoyaltyTotal.upsert({
      where: { userId },
      create: {
        userId,
        totalPoints,
        yearPoints,
        tier,
        tierUpdatedAt: new Date(),
      },
      update: {
        totalPoints,
        yearPoints,
        tier,
        ...(tierChanged ? { tierUpdatedAt: new Date() } : {}),
      },
    });

    return tier;
  }

  private async maybeAwardFirstVenueBonus(
    userId: string,
    venueId: string,
    occurredAt: Date,
  ): Promise<void> {
    // Idempotency key `first-venue:<userId>:<venueId>` guarantees this only
    // lands once per user/venue pair. applyReward absorbs the unique-violation
    // on subsequent calls.
    await this.applyReward({
      userId,
      type: LoyaltyEventType.FIRST_VENUE_BONUS,
      basePoints: POINTS.FIRST_VENUE_BONUS,
      idempotencyKey: `first-venue:${userId}:${venueId}`,
      venueId,
      occurredAt,
      skipStreak: true,
    });
  }

  private computeMultiplier(occurredAt: Date): number {
    const utcDay = occurredAt.getUTCDay();
    const utcHour = occurredAt.getUTCHours();

    // Weekend: Fri 20:00 UTC → Sun 06:00 UTC.
    const isFridayNight = utcDay === 5 && utcHour >= 20;
    const isSaturday = utcDay === 6;
    const isSundayMorning = utcDay === 0 && utcHour < 6;
    if (isFridayNight || isSaturday || isSundayMorning) {
      return MULTIPLIERS.WEEKEND;
    }
    return 1;
  }

  private truncToUtcDay(d: Date): Date {
    return new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
    );
  }

  private utcDayString(d: Date): string {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private isPreviousCalendarMonth(prev: Date, now: Date): boolean {
    if (prev.getUTCFullYear() !== now.getUTCFullYear()) {
      return prev.getUTCFullYear() < now.getUTCFullYear();
    }
    return prev.getUTCMonth() < now.getUTCMonth();
  }

  private isUniqueViolation(err: unknown): boolean {
    return (
      err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002'
    );
  }

  private thresholdFor(tier: LoyaltyTier): number {
    // Keep in sync with TIER_THRESHOLDS in loyalty.constants.ts.
    switch (tier) {
      case LoyaltyTier.VIP:
        return 5000;
      case LoyaltyTier.INSIDER:
        return 2000;
      case LoyaltyTier.REGULAR:
        return 500;
      case LoyaltyTier.ROOKIE:
      default:
        return 0;
    }
  }

  private anonymizeName(name: string | null): string {
    if (!name) return 'Anónimo';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'Anónimo';
    const first = parts[0];
    if (parts.length === 1) return first;
    const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
    return `${first} ${lastInitial}.`;
  }
}
