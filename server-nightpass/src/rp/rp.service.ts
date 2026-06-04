import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventStatus, PassClaimStatus, Role, RpCommissionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from '../mailer/mailer.service';
import { resolveTierPrice } from '../events/tier-pricing';
import { CreateRpDto } from './dto/create-rp.dto';
import { IssuePassDto } from './dto/issue-pass.dto';
import { ListRpQuery } from './dto/list-rp.query';
import { SetCommissionRuleDto } from './dto/set-commission-rule.dto';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';

// Vigencia del vale emitido por el RP. Pasado esto, el QR ya no se puede
// reclamar (status pasa a EXPIRED de forma perezosa al intentar reclamar).
// Ventana corta para reclamar un vale: si nadie lo reclama, expira solo (un cron
// lo marca EXPIRED y libera el aforo). Evita vales emitidos varados en PENDING.
const CLAIM_TTL_MINUTES = 10;

const ARGON2_OPTS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

@Injectable()
export class RpService {
  private readonly logger = new Logger(RpService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
  ) {}

  async create(dto: CreateRpDto) {
    const email = dto.email.toLowerCase().trim();
    const displayName = dto.displayName.trim();

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      include: { rpProfile: true },
    });

    let temporaryPassword: string | undefined;
    // Hash de la password se computa FUERA de la transacción (argon2 es lento).
    let passwordHash: string | undefined;

    if (existingUser) {
      if (existingUser.role !== Role.CUSTOMER && existingUser.role !== Role.RP) {
        throw new ConflictException('Este email ya está registrado con un rol administrativo');
      }
      if (existingUser.rpProfile) {
        throw new ConflictException('Este usuario ya tiene un perfil de RP activo');
      }
    } else {
      temporaryPassword = dto.password || randomBytes(6).toString('hex'); // 12-char hex
      passwordHash = await argon2.hash(temporaryPassword, ARGON2_OPTS);
    }

    // Base para el rpCode; los intentos de unicidad se hacen dentro de la tx.
    const baseCode = displayName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10).toUpperCase();

    // Toda la escritura (rol del user + rpProfile + regla de comisión) es atómica:
    // sin esto un fallo a mitad dejaba al user con rol RP pero sin perfil (huérfano).
    const rpProfile = await this.prisma.$transaction(async (tx) => {
      let userId: string;

      if (existingUser) {
        // Promote to Role.RP
        await tx.user.update({
          where: { id: existingUser.id },
          data: { role: Role.RP },
        });
        userId = existingUser.id;
      } else {
        // Create new user
        const newUser = await tx.user.create({
          data: {
            email,
            name: displayName,
            role: Role.RP,
            passwordHash: passwordHash!,
            mustChangePassword: true,
          },
        });
        userId = newUser.id;
      }

      // Generate unique rpCode
      let rpCode = '';
      let isUnique = false;
      let attempts = 0;

      while (!isUnique && attempts < 10) {
        const suffix = randomBytes(2).toString('hex').toUpperCase();
        rpCode = `${baseCode}-${suffix}`;
        const codeExists = await tx.rpProfile.findUnique({
          where: { rpCode },
        });
        if (!codeExists) {
          isUnique = true;
        }
        attempts++;
      }

      if (!isUnique) {
        rpCode = `${baseCode}-${Date.now().toString().slice(-4)}`;
      }

      const profile = await tx.rpProfile.create({
        data: {
          userId,
          displayName,
          rpCode,
          promoterId: dto.promoterId || null,
          state: dto.state?.trim() || null,
          city: dto.city?.trim() || null,
          isActive: true,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
        },
      });

      // Create initial commission rule if event is assigned
      if (dto.eventId) {
        const type = dto.commissionType || RpCommissionType.PER_N_TICKETS;
        await tx.rpCommissionRule.create({
          data: {
            rpProfileId: profile.id,
            eventId: dto.eventId,
            type,
            nTickets: type === RpCommissionType.PER_N_TICKETS ? (dto.nTickets || 10) : null,
            rewardCents: type === RpCommissionType.PER_N_TICKETS ? (dto.rewardCents || 15000) : null,
            percentage: type === RpCommissionType.PERCENTAGE ? (dto.percentage || 5) : null,
            isActive: true,
          },
        });
      }

      return profile;
    });

    // Send invitation email in background
    this.mailer.sendRpInvited(email, displayName, temporaryPassword).catch((err) => {
      this.logger.error(`Error al enviar invitación de RP a ${email}: ${err.message}`);
    });

    return rpProfile;
  }

  // ── Gestión scopeada al organizador (PROMOTER) ────────────────────────────
  // El organizador solo ve, crea y administra RPs ligados a su propio promoter,
  // y solo puede asignarles reglas de comisión sobre eventos de su organización.

  /** Resuelve el promoterId del usuario PROMOTER (su primera membresía). */
  private async resolvePromoterId(userId: string): Promise<string> {
    const membership = await this.prisma.promoterMember.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: { promoterId: true },
    });
    if (!membership) {
      throw new NotFoundException('No se encontró un organizador para este usuario');
    }
    return membership.promoterId;
  }

  private async assertRpBelongsToPromoter(rpId: string, promoterId: string) {
    const rp = await this.prisma.rpProfile.findUnique({
      where: { id: rpId },
      select: { promoterId: true },
    });
    if (!rp) throw new NotFoundException('Perfil de RP no encontrado');
    if (rp.promoterId !== promoterId) {
      throw new ForbiddenException('Este RP no pertenece a tu organización');
    }
  }

  private async assertEventBelongsToPromoter(eventId: string, promoterId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { promoterId: true },
    });
    if (!event || event.promoterId !== promoterId) {
      throw new ForbiddenException('Este evento no pertenece a tu organización');
    }
  }

  async listForPromoter(userId: string, query: ListRpQuery) {
    const promoterId = await this.resolvePromoterId(userId);
    return this.list({ ...query, promoterId } as ListRpQuery);
  }

  async createForPromoter(userId: string, dto: CreateRpDto) {
    const promoterId = await this.resolvePromoterId(userId);
    if (dto.eventId) {
      await this.assertEventBelongsToPromoter(dto.eventId, promoterId);
    }
    // Forzamos el promoterId al del organizador autenticado — ignora cualquier
    // promoterId que venga en el body.
    return this.create({ ...dto, promoterId });
  }

  async getByIdForPromoter(userId: string, rpId: string) {
    const promoterId = await this.resolvePromoterId(userId);
    await this.assertRpBelongsToPromoter(rpId, promoterId);
    return this.getById(rpId);
  }

  async getStatsForPromoter(userId: string, rpId: string, from?: string, to?: string) {
    const promoterId = await this.resolvePromoterId(userId);
    await this.assertRpBelongsToPromoter(rpId, promoterId);
    return this.getStats(rpId, from, to);
  }

  async toggleActiveForPromoter(userId: string, rpId: string) {
    const promoterId = await this.resolvePromoterId(userId);
    await this.assertRpBelongsToPromoter(rpId, promoterId);
    return this.toggleActive(rpId);
  }

  async setCommissionRuleForPromoter(
    userId: string,
    rpId: string,
    dto: SetCommissionRuleDto,
  ) {
    const promoterId = await this.resolvePromoterId(userId);
    await this.assertRpBelongsToPromoter(rpId, promoterId);
    if (dto.eventId) {
      await this.assertEventBelongsToPromoter(dto.eventId, promoterId);
    }
    return this.setCommissionRule(rpId, dto);
  }

  async getCommissionRulesForPromoter(userId: string, rpId: string) {
    const promoterId = await this.resolvePromoterId(userId);
    await this.assertRpBelongsToPromoter(rpId, promoterId);
    return this.getCommissionRules(rpId);
  }

  async list(query: ListRpQuery) {
    const where: any = {};
    if (query.promoterId) {
      where.promoterId = query.promoterId;
    }
    if (query.search) {
      const term = query.search.trim();
      if (term) {
        where.OR = [
          { displayName: { contains: term, mode: 'insensitive' } },
          { rpCode: { contains: term, mode: 'insensitive' } },
          { user: { email: { contains: term, mode: 'insensitive' } } },
        ];
      }
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.rpProfile.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          user: {
            select: {
              email: true,
              role: true,
            },
          },
          promoter: {
            select: {
              name: true,
            },
          },
        },
      }),
      this.prisma.rpProfile.count({ where }),
    ]);

    return { items, total, page: query.page, limit: query.limit };
  }

  async getById(id: string) {
    const rp = await this.prisma.rpProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            email: true,
            name: true,
            role: true,
          },
        },
        promoter: {
          select: {
            name: true,
          },
        },
        commissionRules: {
          include: {
            event: {
              select: {
                title: true,
              },
            },
          },
        },
      },
    });

    if (!rp) throw new NotFoundException('Perfil de RP no encontrado');
    return rp;
  }

  async getByUserId(userId: string) {
    const rp = await this.prisma.rpProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            email: true,
            name: true,
            role: true,
          },
        },
        promoter: {
          select: {
            name: true,
          },
        },
        commissionRules: {
          include: {
            event: {
              select: {
                title: true,
              },
            },
          },
        },
      },
    });

    if (!rp) throw new NotFoundException('Perfil de RP no encontrado para este usuario');
    return rp;
  }

  async updateZone(id: string, dto: { state?: string; city?: string }) {
    const rp = await this.prisma.rpProfile.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!rp) throw new NotFoundException('Perfil de RP no encontrado');
    return this.prisma.rpProfile.update({
      where: { id },
      data: {
        state: dto.state?.trim() || null,
        city: dto.city?.trim() || null,
      },
    });
  }

  async toggleActive(id: string) {
    const rp = await this.getById(id);
    const nextActive = !rp.isActive;

    // El flip de isActive y la reconciliación del rol del user deben ser atómicos:
    // al desactivar degradamos el user a CUSTOMER (solo si sigue siendo RP, para no
    // tocar otros roles); al reactivar lo volvemos a RP. El RpProfile se conserva.
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.rpProfile.update({
        where: { id },
        data: { isActive: nextActive },
      });

      if (nextActive) {
        await tx.user.updateMany({
          where: { id: rp.userId, role: Role.CUSTOMER },
          data: { role: Role.RP },
        });
      } else {
        await tx.user.updateMany({
          where: { id: rp.userId, role: Role.RP },
          data: { role: Role.CUSTOMER },
        });
      }

      return updated;
    });
  }

  async setCommissionRule(rpProfileId: string, dto: SetCommissionRuleDto) {
    await this.getById(rpProfileId);

    const eventId = dto.eventId || null;

    if (eventId) {
      const existing = await this.prisma.rpCommissionRule.findFirst({
        where: {
          rpProfileId,
          eventId,
        },
      });

      if (existing) {
        return this.prisma.rpCommissionRule.update({
          where: { id: existing.id },
          data: {
            type: dto.type,
            nTickets: dto.nTickets || null,
            rewardCents: dto.rewardCents || null,
            currency: dto.currency,
            percentage: dto.percentage || null,
            isActive: true,
          },
        });
      }
    } else {
      const existing = await this.prisma.rpCommissionRule.findFirst({
        where: {
          rpProfileId,
          eventId: null,
        },
      });

      if (existing) {
        return this.prisma.rpCommissionRule.update({
          where: { id: existing.id },
          data: {
            type: dto.type,
            nTickets: dto.nTickets || null,
            rewardCents: dto.rewardCents || null,
            currency: dto.currency,
            percentage: dto.percentage || null,
            isActive: true,
          },
        });
      }
    }

    return this.prisma.rpCommissionRule.create({
      data: {
        rpProfileId,
        eventId: eventId || null,
        type: dto.type,
        nTickets: dto.nTickets || null,
        rewardCents: dto.rewardCents || null,
        currency: dto.currency,
        percentage: dto.percentage || null,
        isActive: true,
      },
    });
  }

  async getCommissionRules(rpProfileId: string) {
    return this.prisma.rpCommissionRule.findMany({
      where: { rpProfileId },
      include: {
        event: {
          select: {
            title: true,
          },
        },
      },
    });
  }

  async deleteCommissionRule(ruleId: string) {
    throw new ConflictException(
      'No se permite eliminar esquemas de comisión para asegurar la trazabilidad histórica de las ventas. Por favor modifícala si es necesario.',
    );
  }

  async resolveCode(code: string) {
    const rp = await this.prisma.rpProfile.findUnique({
      where: { rpCode: code, isActive: true },
      select: {
        id: true,
        displayName: true,
      },
    });
    if (!rp) throw new NotFoundException('Código de RP no válido o inactivo');
    return rp;
  }

  async getStats(rpId: string, from?: string, to?: string) {
    const rp = await this.getById(rpId);

    const where: any = {
      referredByRpId: rpId,
      status: 'COMPLETED',
    };

    // Validar fechas: un string inválido produce `Invalid Date` y Prisma lanza
    // → 500. Solo aplicamos los límites que parsean a una fecha válida.
    const parseDate = (raw?: string): Date | null => {
      if (!raw) return null;
      const d = new Date(raw);
      return Number.isNaN(d.getTime()) ? null : d;
    };
    const fromDate = parseDate(from);
    const toDate = parseDate(to);
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = fromDate;
      if (toDate) where.createdAt.lte = toDate;
    }

    const orders = await this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            startsAt: true,
            endsAt: true,
            coverImageUrl: true,
          },
        },
        tier: {
          select: {
            name: true,
            priceCents: true,
          },
        },
      },
    });

    const rules = await this.prisma.rpCommissionRule.findMany({
      where: { rpProfileId: rpId, isActive: true },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            startsAt: true,
            endsAt: true,
            coverImageUrl: true,
          },
        },
      },
    });

    const globalRule = rules.find((r) => r.eventId === null);

    // Get all unique events that are either associated with rules or orders
    const eventIds = new Set<string>();
    const eventsMap = new Map<string, any>();

    for (const rule of rules) {
      if (rule.eventId && rule.event) {
        eventIds.add(rule.eventId);
        eventsMap.set(rule.eventId, rule.event);
      }
    }

    for (const order of orders) {
      if (order.eventId && order.event) {
        eventIds.add(order.eventId);
        eventsMap.set(order.eventId, order.event);
      }
    }

    let totalEarningsCents = 0;
    const eventStats: any[] = [];

    for (const eventId of eventIds) {
      const event = eventsMap.get(eventId);
      const eventOrders = orders.filter((o) => o.eventId === eventId);
      const eventRule = rules.find((r) => r.eventId === eventId) || globalRule;
      let earnedCents = 0;
      const count = eventOrders.length;
      const eventName = event ? event.title : 'Evento';

      if (eventRule) {
        if (eventRule.type === RpCommissionType.PERCENTAGE && eventRule.percentage) {
          const totalVolume = eventOrders.reduce((sum, o) => sum + o.totalCents, 0);
          earnedCents = Math.round(totalVolume * (eventRule.percentage / 100));
        } else if (eventRule.type === RpCommissionType.PER_N_TICKETS && eventRule.nTickets && eventRule.rewardCents) {
          const cycles = Math.floor(count / eventRule.nTickets);
          earnedCents = cycles * eventRule.rewardCents;
        }
      }

      totalEarningsCents += earnedCents;

      const now = new Date();
      const isPassed = event ? new Date(event.endsAt) < now : false;

      eventStats.push({
        eventId,
        eventName,
        eventStartsAt: event ? event.startsAt : null,
        eventEndsAt: event ? event.endsAt : null,
        eventCoverImageUrl: event ? event.coverImageUrl : null,
        isPassed,
        salesCount: count,
        earningsCents: earnedCents,
        rule: eventRule
          ? {
              id: eventRule.id,
              type: eventRule.type,
              nTickets: eventRule.nTickets,
              rewardCents: eventRule.rewardCents,
              percentage: eventRule.percentage,
            }
          : null,
      });
    }

    return {
      rpId,
      displayName: rp.displayName,
      rpCode: rp.rpCode,
      totalSales: orders.length,
      totalEarningsCents,
      eventStats,
      sales: orders.map((o) => ({
        id: o.id,
        createdAt: o.createdAt,
        eventName: o.event.title,
        tierName: o.tier.name,
        priceCents: o.tier.priceCents,
        totalCents: o.totalCents,
      })),
    };
  }

  // ── Emisión de pase por venta física (efectivo) ───────────────────────────

  /**
   * El RP emite un vale para un evento+tier. Devuelve un token que el panel
   * pinta como QR; el cliente lo escanea en su app y reclama el pase (ver
   * PassesService.claim). El precio se congela al precio vigente del tier.
   */
  async issuePass(userId: string, dto: IssuePassDto) {
    const rp = await this.getByUserId(userId);
    if (!rp.isActive) {
      throw new ForbiddenException('Tu perfil de RP está inactivo');
    }

    const tier = await this.prisma.eventTier.findUnique({
      where: { id: dto.tierId },
      include: { prices: true, event: true },
    });
    if (!tier || tier.eventId !== dto.eventId) {
      throw new NotFoundException('Tier no encontrado para este evento');
    }
    const event = tier.event;
    if (event.status !== EventStatus.PUBLISHED) {
      throw new BadRequestException('El evento no está publicado');
    }
    if (event.startsAt.getTime() <= Date.now()) {
      throw new BadRequestException('El evento ya empezó');
    }

    // Autorización: el RP solo emite para eventos de su promotor o donde tiene
    // una regla de comisión asignada.
    const sameOwner = event.promoterId != null && event.promoterId === rp.promoterId;
    let allowed = sameOwner;
    if (!allowed) {
      const rule = await this.prisma.rpCommissionRule.findFirst({
        where: { rpProfileId: rp.id, eventId: event.id },
        select: { id: true },
      });
      allowed = rule != null;
    }
    if (!allowed) {
      throw new ForbiddenException('No tienes este evento asignado');
    }

    const amountCents = resolveTierPrice(tier.priceCents, tier.prices, event.startsAt)
      .currentCents;

    const token = `npc_${randomBytes(24).toString('hex')}`;
    // Vale efímero: TTL corto (10 min), nunca más allá del inicio del evento.
    const ttl = new Date(Date.now() + CLAIM_TTL_MINUTES * 60 * 1000);
    const expiresAt = ttl < event.startsAt ? ttl : event.startsAt;

    const claim = await this.prisma.passClaim.create({
      data: {
        token,
        eventId: event.id,
        tierId: tier.id,
        issuedByRpId: rp.id,
        amountCents,
        currency: tier.currency,
        expiresAt,
      },
    });

    return {
      id: claim.id,
      token: claim.token,
      status: claim.status,
      amountCents: claim.amountCents,
      currency: claim.currency,
      expiresAt: claim.expiresAt,
      event: { id: event.id, title: event.title, startsAt: event.startsAt },
      tier: { id: tier.id, name: tier.name },
    };
  }

  /** Vales emitidos por el RP (para mostrar estado en el panel). */
  async listIssuedPasses(userId: string) {
    const rp = await this.getByUserId(userId);
    const claims = await this.prisma.passClaim.findMany({
      where: { issuedByRpId: rp.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        event: { select: { id: true, title: true, startsAt: true } },
        tier: { select: { id: true, name: true } },
        claimedBy: { select: { id: true, name: true, email: true } },
      },
    });
    return claims.map((c) => ({
      id: c.id,
      token: c.token,
      status: c.status,
      amountCents: c.amountCents,
      currency: c.currency,
      expiresAt: c.expiresAt,
      claimedAt: c.claimedAt,
      createdAt: c.createdAt,
      event: c.event,
      tier: c.tier,
      claimedBy: c.claimedBy
        ? { name: c.claimedBy.name, email: c.claimedBy.email }
        : null,
    }));
  }

  /** Cancela un vale PENDING emitido por este RP. Libera el aforo al instante. */
  async cancelIssuedPass(userId: string, claimId: string) {
    const rp = await this.getByUserId(userId);
    const claim = await this.prisma.passClaim.findUnique({
      where: { id: claimId },
      select: { id: true, issuedByRpId: true, status: true },
    });
    if (!claim || claim.issuedByRpId !== rp.id) {
      throw new NotFoundException('Vale no encontrado');
    }
    if (claim.status !== PassClaimStatus.PENDING) {
      throw new ConflictException('Solo se pueden cancelar vales pendientes');
    }
    // updateMany con guard de status evita carreras con un reclamo simultáneo.
    const res = await this.prisma.passClaim.updateMany({
      where: { id: claimId, status: PassClaimStatus.PENDING },
      data: { status: PassClaimStatus.CANCELLED },
    });
    if (res.count === 0) {
      throw new ConflictException('El vale ya fue reclamado o cancelado');
    }
    return { id: claimId, status: PassClaimStatus.CANCELLED };
  }
}
