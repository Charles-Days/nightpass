import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  EventStatus,
  PassClaimChannel,
  PassClaimStatus,
  Prisma,
  Role,
  RpCommissionType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from '../mailer/mailer.service';
import { StripeService } from '../stripe/stripe.service';
import { computeCashUnitPrice } from '../common/cash-pricing';
import { resolveTierPrice } from '../events/tier-pricing';
import { resolveMapsCoords } from '../common/maps';
import { CreateRpDto } from './dto/create-rp.dto';
import { IssuePassDto } from './dto/issue-pass.dto';
import { ListRpQuery } from './dto/list-rp.query';
import { SetCommissionRuleDto } from './dto/set-commission-rule.dto';
import { CreatePickupPointDto } from './dto/create-pickup-point.dto';
import { UpdatePickupPointDto } from './dto/update-pickup-point.dto';
import { PickupWindowDto } from './dto/pickup-window.dto';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';

// Vigencia del vale emitido por el RP. Pasado esto, el QR ya no se puede
// reclamar (status pasa a EXPIRED de forma perezosa al intentar reclamar).
// Ventana corta para reclamar un vale: si nadie lo reclama, expira solo (un cron
// lo marca EXPIRED y libera el aforo). Evita vales emitidos varados en PENDING.
const CLAIM_TTL_MINUTES = 10;

// Gracia de un vale tipo LINK: sigue reclamable hasta esta cantidad de días
// después del FIN del evento. Pasado eso, expira (ya no tiene sentido canjearlo).
const LINK_GRACE_DAYS = 7;

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
    private readonly stripe: StripeService,
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

      const phone = dto.phone?.trim() || undefined;
      if (existingUser) {
        // Promote to Role.RP
        await tx.user.update({
          where: { id: existingUser.id },
          data: { role: Role.RP, ...(phone ? { phone } : {}) },
        });
        userId = existingUser.id;
      } else {
        // Create new user
        const newUser = await tx.user.create({
          data: {
            email,
            name: displayName,
            role: Role.RP,
            phone: phone ?? null,
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
        // Asignarlo también como vendedor de efectivo del evento (EventRp), para
        // que su panel de cobranza funcione sin tener que marcarlo a mano aparte.
        await tx.eventRp.upsert({
          where: {
            eventId_rpProfileId: {
              eventId: dto.eventId,
              rpProfileId: profile.id,
            },
          },
          update: {},
          create: { eventId: dto.eventId, rpProfileId: profile.id },
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

  /**
   * Solicitudes de pago en efectivo que han LLEGADO (se rutearon) a cada RP del
   * organizador. Agrupadas por RP con conteos por estado + el detalle de cada
   * solicitud. Alimenta el tab "Solicitudes" del panel del organizador.
   */
  async listRequestsForPromoter(userId: string) {
    const promoterId = await this.resolvePromoterId(userId);

    const rps = await this.prisma.rpProfile.findMany({
      where: { promoterId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        displayName: true,
        rpCode: true,
        isActive: true,
        user: { select: { email: true } },
      },
    });
    if (rps.length === 0) return { items: [] };

    const rpIds = rps.map((r) => r.id);
    const requests = await this.prisma.physicalPaymentRequest.findMany({
      where: { assignedRpId: { in: rpIds } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        assignedRpId: true,
        status: true,
        quantity: true,
        amountCents: true,
        currency: true,
        contactPhone: true,
        note: true,
        createdAt: true,
        pickupAt: true,
        event: { select: { title: true } },
        tier: { select: { name: true } },
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
            city: true,
            state: true,
          },
        },
      },
    });

    const byRp = new Map<string, typeof requests>();
    for (const req of requests) {
      if (!req.assignedRpId) continue;
      const list = byRp.get(req.assignedRpId) ?? [];
      list.push(req);
      byRp.set(req.assignedRpId, list);
    }

    const items = rps.map((rp) => {
      const reqs = byRp.get(rp.id) ?? [];
      return {
        rpProfileId: rp.id,
        displayName: rp.displayName,
        rpCode: rp.rpCode,
        isActive: rp.isActive,
        email: rp.user.email,
        counts: {
          total: reqs.length,
          pending: reqs.filter((r) => r.status === 'PENDING').length,
          confirmed: reqs.filter((r) => r.status === 'CONFIRMED').length,
          cancelled: reqs.filter((r) => r.status === 'CANCELLED').length,
          expired: reqs.filter((r) => r.status === 'EXPIRED').length,
        },
        requests: reqs.map((r) => ({
          id: r.id,
          status: r.status,
          quantity: r.quantity,
          amountCents: r.amountCents,
          currency: r.currency,
          contactPhone: r.contactPhone,
          note: r.note,
          eventTitle: r.event.title,
          tierName: r.tier.name,
          customerName: r.user?.name ?? null,
          customerEmail: r.user?.email ?? null,
          // Teléfono guardado del perfil (puede diferir del contacto de la
          // solicitud) + ubicación declarada del cliente.
          customerPhone: r.user?.phone ?? null,
          customerCity: r.user?.city ?? null,
          customerState: r.user?.state ?? null,
          createdAt: r.createdAt,
          pickupAt: r.pickupAt,
        })),
      };
    });

    return { items };
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

  /**
   * Desglose por evento de los RPs que venden ese evento: para cada RP, su regla
   * de comisión vigente (del evento o global), sus ventas (orders COMPLETED
   * atribuidas) y sus ganancias. Para gestión del organizador y del admin.
   */
  async getEventRpBreakdown(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, title: true },
    });
    if (!event) throw new NotFoundException('Evento no encontrado');

    const [assignments, rules, orders, cashReqs, vouchers] = await Promise.all([
      this.prisma.eventRp.findMany({
        where: { eventId },
        select: { rpProfileId: true },
      }),
      this.prisma.rpCommissionRule.findMany({
        where: { isActive: true, OR: [{ eventId }, { eventId: null }] },
      }),
      this.prisma.order.findMany({
        where: {
          eventId,
          status: 'COMPLETED',
          referredByRpId: { not: null },
        },
        select: { referredByRpId: true, totalCents: true },
      }),
      // Solicitudes de pago en efectivo (físico) asignadas a un RP en el evento.
      // Trae el detalle del cliente para mostrarlo en el desglose (quién pidió).
      this.prisma.physicalPaymentRequest.findMany({
        where: { eventId, assignedRpId: { not: null } },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          assignedRpId: true,
          status: true,
          quantity: true,
          amountCents: true,
          currency: true,
          contactPhone: true,
          note: true,
          createdAt: true,
          tier: { select: { name: true } },
          user: {
            select: {
              name: true,
              email: true,
              phone: true,
              city: true,
              state: true,
            },
          },
        },
      }),
      // Vales que el RP emitió (QR/link). Permite ver, por RP, cuántos generó por
      // cada forma y cuántos ya reclamó un cliente (venta real). Excluimos los
      // EXPIRED de QR para no inflar (vale presencial que nadie reclamó); los de
      // link no expiran a los 10 min, así que sus PENDING siguen vivos.
      this.prisma.passClaim.findMany({
        where: {
          eventId,
          issuedByRpId: { not: null },
          status: { in: [PassClaimStatus.PENDING, PassClaimStatus.CLAIMED] },
        },
        select: { issuedByRpId: true, channel: true, status: true },
      }),
    ]);

    // RPs relevantes: asignados, con regla específica, con ventas, o con
    // solicitudes de efectivo asignadas.
    const rpIds = new Set<string>();
    assignments.forEach((a) => rpIds.add(a.rpProfileId));
    rules
      .filter((r) => r.eventId === eventId)
      .forEach((r) => rpIds.add(r.rpProfileId));
    orders.forEach((o) => o.referredByRpId && rpIds.add(o.referredByRpId));
    cashReqs.forEach((r) => r.assignedRpId && rpIds.add(r.assignedRpId));
    vouchers.forEach((v) => v.issuedByRpId && rpIds.add(v.issuedByRpId));

    if (rpIds.size === 0) {
      return {
        event,
        rps: [],
        totals: {
          sales: 0,
          earningsCents: 0,
          cashConfirmedCents: 0,
          cashPending: 0,
        },
      };
    }

    const profiles = await this.prisma.rpProfile.findMany({
      where: { id: { in: [...rpIds] } },
      select: {
        id: true,
        displayName: true,
        rpCode: true,
        isActive: true,
        user: { select: { email: true } },
      },
    });
    const profMap = new Map(profiles.map((p) => [p.id, p]));
    const assignedSet = new Set(assignments.map((a) => a.rpProfileId));

    let totalSales = 0;
    let totalEarningsCents = 0;
    let totalCashConfirmedCents = 0;
    let totalCashPending = 0;

    const rps = [...rpIds]
      .map((id) => {
        const p = profMap.get(id);
        // Regla del evento; si no hay, la global de ese mismo RP.
        const rule =
          rules.find((r) => r.rpProfileId === id && r.eventId === eventId) ??
          rules.find((r) => r.rpProfileId === id && r.eventId === null) ??
          null;
        const myOrders = orders.filter((o) => o.referredByRpId === id);
        const sales = myOrders.length;

        let earningsCents = 0;
        if (rule) {
          if (rule.type === RpCommissionType.PERCENTAGE && rule.percentage) {
            const volume = myOrders.reduce((s, o) => s + o.totalCents, 0);
            earningsCents = Math.round(volume * (rule.percentage / 100));
          } else if (
            rule.type === RpCommissionType.PER_N_TICKETS &&
            rule.nTickets &&
            rule.rewardCents
          ) {
            earningsCents = Math.floor(sales / rule.nTickets) * rule.rewardCents;
          }
        }

        // Pagos en efectivo (físico) asignados a este RP, por estado.
        const myCash = cashReqs.filter((r) => r.assignedRpId === id);
        const cashConfirmedAmountCents = myCash
          .filter((r) => r.status === 'CONFIRMED')
          .reduce((s, r) => s + r.amountCents, 0);
        const cash = {
          pending: myCash.filter((r) => r.status === 'PENDING').length,
          confirmed: myCash.filter((r) => r.status === 'CONFIRMED').length,
          cancelled: myCash.filter((r) => r.status === 'CANCELLED').length,
          confirmedAmountCents: cashConfirmedAmountCents,
        };

        // Detalle de cada solicitud con la info del cliente que la hizo. Orden:
        // pendientes primero (lo accionable), luego confirmadas, resto al final.
        const STATUS_ORDER: Record<string, number> = {
          PENDING: 0,
          CONFIRMED: 1,
          EXPIRED: 2,
          CANCELLED: 3,
        };
        const cashRequests = [...myCash]
          .sort(
            (a, b) =>
              (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9) ||
              b.createdAt.getTime() - a.createdAt.getTime(),
          )
          .map((r) => ({
            id: r.id,
            status: r.status,
            quantity: r.quantity,
            amountCents: r.amountCents,
            currency: r.currency,
            contactPhone: r.contactPhone,
            note: r.note,
            tierName: r.tier?.name ?? null,
            createdAt: r.createdAt,
            customerName: r.user?.name ?? null,
            customerEmail: r.user?.email ?? null,
            customerPhone: r.user?.phone ?? null,
            customerCity: r.user?.city ?? null,
            customerState: r.user?.state ?? null,
          }));

        // Vales que este RP emitió, separados por forma (link/QR). `emitted` =
        // generados (vivos); `claimed` = ya reclamados por un cliente.
        const myVouchers = vouchers.filter((v) => v.issuedByRpId === id);
        const tally = (ch: PassClaimChannel) => {
          const ofCh = myVouchers.filter((v) => v.channel === ch);
          return {
            emitted: ofCh.length,
            claimed: ofCh.filter((v) => v.status === 'CLAIMED').length,
          };
        };
        const passes = {
          link: tally(PassClaimChannel.LINK),
          qr: tally(PassClaimChannel.QR),
        };

        totalSales += sales;
        totalEarningsCents += earningsCents;
        totalCashConfirmedCents += cashConfirmedAmountCents;
        totalCashPending += cash.pending;

        return {
          rpProfileId: id,
          displayName: p?.displayName ?? 'RP',
          rpCode: p?.rpCode ?? '',
          email: p?.user?.email ?? '',
          isActive: p?.isActive ?? false,
          assigned: assignedSet.has(id),
          commission: rule
            ? {
                type: rule.type,
                nTickets: rule.nTickets,
                rewardCents: rule.rewardCents,
                percentage: rule.percentage,
                currency: rule.currency,
                scope: rule.eventId === eventId ? 'event' : 'global',
              }
            : null,
          sales,
          earningsCents,
          cash,
          cashRequests,
          passes,
        };
      })
      .sort(
        (a, b) =>
          b.sales - a.sales || a.displayName.localeCompare(b.displayName),
      );

    return {
      event,
      rps,
      totals: {
        sales: totalSales,
        earningsCents: totalEarningsCents,
        cashConfirmedCents: totalCashConfirmedCents,
        cashPending: totalCashPending,
      },
    };
  }

  async getEventRpBreakdownForPromoter(userId: string, eventId: string) {
    const promoterId = await this.resolvePromoterId(userId);
    await this.assertEventBelongsToPromoter(eventId, promoterId);
    return this.getEventRpBreakdown(eventId);
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
            phone: true,
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
            phone: true,
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

  async updateZone(
    id: string,
    dto: { state?: string; city?: string; phone?: string },
  ) {
    const rp = await this.prisma.rpProfile.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });
    if (!rp) throw new NotFoundException('Perfil de RP no encontrado');
    // El teléfono vive en el User; zona en el RpProfile.
    if (dto.phone !== undefined) {
      await this.prisma.user.update({
        where: { id: rp.userId },
        data: { phone: dto.phone.trim() || null },
      });
    }
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

    // ¿Tiene al menos un evento asignado con pago en efectivo activo? Si no,
    // no tiene sentido mostrarle la maquinaria de cobranza/puntos de cobro.
    const cashEventCount = await this.prisma.eventRp.count({
      where: { rpProfileId: rpId, event: { allowCashPayment: true } },
    });

    return {
      rpId,
      displayName: rp.displayName,
      rpCode: rp.rpCode,
      totalSales: orders.length,
      totalEarningsCents,
      hasCashEvents: cashEventCount > 0,
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
      include: {
        prices: true,
        event: {
          include: {
            venue: { select: { platformFeePct: true, cashCommissionExempt: true } },
            promoter: { select: { platformFeePct: true, cashCommissionExempt: true } },
          },
        },
      },
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

    // El vale del RP siempre es venta en EFECTIVO, así que el monto NO es el
    // bruto online: hay que convertirlo con la misma fórmula que el catálogo y
    // las solicitudes físicas (bruto − Stripe [− NP si exento]), respetando los
    // overrides por-tier. Antes guardaba el bruto (110) y los paneles contaban
    // de más; ahora guarda el precio real en efectivo (≈100).
    const singleGrossCents = resolveTierPrice(
      tier.priceCents,
      tier.prices,
      event.startsAt,
    ).currentCents;
    const owner = event.venue ?? event.promoter ?? null;
    const ownerFeePct =
      owner?.platformFeePct != null
        ? owner.platformFeePct
        : this.stripe.getPlatformFeePct();
    const feePctEff = tier.cashFeePctOverride ?? ownerFeePct;
    const exemptEff = tier.cashExemptOverride ?? owner?.cashCommissionExempt ?? true;
    const modeEff = tier.cashFeeMode ?? 'SUBTRACT';
    const amountCents = computeCashUnitPrice(
      singleGrossCents,
      feePctEff,
      exemptEff,
      modeEff,
      tier.cashPriceCents,
    );

    const channel = dto.channel ?? PassClaimChannel.QR;

    const token = `npc_${randomBytes(24).toString('hex')}`;
    // Vigencia según la forma de compartir:
    // - QR (presencial): TTL corto (10 min), nunca más allá del inicio del
    //   evento. Si nadie lo reclama, expira y libera el aforo.
    // - LINK (a distancia): el cliente lo abre cuando puede, así que NO expira a
    //   los 10 min. Vive hasta una semana después del fin del evento; pasado eso
    //   ya no tiene sentido reclamarlo.
    let expiresAt: Date;
    if (channel === PassClaimChannel.LINK) {
      expiresAt = new Date(event.endsAt.getTime() + LINK_GRACE_DAYS * 24 * 60 * 60 * 1000);
    } else {
      const ttl = new Date(Date.now() + CLAIM_TTL_MINUTES * 60 * 1000);
      expiresAt = ttl < event.startsAt ? ttl : event.startsAt;
    }

    const claim = await this.prisma.passClaim.create({
      data: {
        token,
        eventId: event.id,
        tierId: tier.id,
        issuedByRpId: rp.id,
        amountCents,
        currency: tier.currency,
        channel,
        expiresAt,
      },
    });

    return {
      id: claim.id,
      token: claim.token,
      status: claim.status,
      channel: claim.channel,
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
      channel: c.channel,
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

  // ── Puntos de cobro del RP ─────────────────────────────────────────────────
  // Lugares fijos donde el RP entrega los boletos en efectivo. El cliente elige
  // el más cercano al pedir. Soft delete (isActive=false) para no romper
  // solicitudes históricas que ya apuntan al punto.

  /** Mapea una fila de RpPickupPoint a la forma del contrato público. */
  private toPickupPoint(row: {
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
      windows: (row.windows ?? []) as unknown as PickupWindowDto[],
      isVenueDoor: row.isVenueDoor,
      isActive: row.isActive,
    };
  }

  /**
   * Resuelve las coordenadas de un punto: usa lat/lng explícitas si vienen,
   * si no las deriva del link de Google Maps. Lanza 400 si no logra ubicarlo.
   */
  private async resolveCoords(
    latitude?: number,
    longitude?: number,
    mapsUrl?: string,
  ): Promise<{ lat: number; lng: number }> {
    if (latitude != null && longitude != null) {
      return { lat: latitude, lng: longitude };
    }
    if (mapsUrl) {
      const coords = await resolveMapsCoords(mapsUrl);
      if (coords) return coords;
    }
    throw new BadRequestException(
      'No pudimos ubicar el punto. Pega un link de Google Maps válido o las coordenadas.',
    );
  }

  /** Resuelve un link de Google Maps a coordenadas (para previsualizar en el
   *  mapa al pegar el link, antes de guardar). Lanza 400 si no se logra. */
  async resolvePickupLink(url: string): Promise<{ lat: number; lng: number }> {
    const coords = await resolveMapsCoords(url);
    if (!coords) {
      throw new BadRequestException(
        'No pudimos leer ese link. Usa "Compartir → copiar vínculo" de Google Maps o pega las coordenadas.',
      );
    }
    return coords;
  }

  // ── Puntos de cobro: core por rpId (reusado por RP self, admin y promoter) ──

  private async listPickupPointsById(rpId: string) {
    const points = await this.prisma.rpPickupPoint.findMany({
      where: { rpProfileId: rpId, isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    return points.map((p) => this.toPickupPoint(p));
  }

  private async createPickupPointById(rpId: string, dto: CreatePickupPointDto) {
    const { lat, lng } = await this.resolveCoords(
      dto.latitude,
      dto.longitude,
      dto.mapsUrl,
    );
    const point = await this.prisma.rpPickupPoint.create({
      data: {
        rpProfileId: rpId,
        label: dto.label.trim(),
        reference: dto.reference?.trim() || null,
        latitude: lat,
        longitude: lng,
        mapsUrl: dto.mapsUrl?.trim() || null,
        windows: (dto.windows ?? []) as unknown as Prisma.InputJsonValue,
        isVenueDoor: dto.isVenueDoor ?? false,
      },
    });
    return this.toPickupPoint(point);
  }

  private async updatePickupPointById(
    rpId: string,
    id: string,
    dto: UpdatePickupPointDto,
  ) {
    const point = await this.prisma.rpPickupPoint.findUnique({
      where: { id },
      select: { id: true, rpProfileId: true, mapsUrl: true },
    });
    if (!point) throw new NotFoundException('Punto de cobro no encontrado');
    if (point.rpProfileId !== rpId) {
      throw new ForbiddenException('Este punto no pertenece a este RP');
    }

    const data: Prisma.RpPickupPointUpdateInput = {};
    if (dto.label !== undefined) data.label = dto.label.trim();
    if (dto.reference !== undefined) data.reference = dto.reference.trim() || null;
    if (dto.mapsUrl !== undefined) data.mapsUrl = dto.mapsUrl.trim() || null;
    if (dto.windows !== undefined) {
      data.windows = dto.windows as unknown as Prisma.InputJsonValue;
    }
    if (dto.isVenueDoor !== undefined) data.isVenueDoor = dto.isVenueDoor;

    const explicitCoords = dto.latitude != null && dto.longitude != null;
    const mapsChanged =
      dto.mapsUrl !== undefined && dto.mapsUrl?.trim() !== (point.mapsUrl ?? '');
    if (explicitCoords) {
      data.latitude = dto.latitude;
      data.longitude = dto.longitude;
    } else if (mapsChanged && dto.mapsUrl) {
      const { lat, lng } = await this.resolveCoords(undefined, undefined, dto.mapsUrl);
      data.latitude = lat;
      data.longitude = lng;
    }

    const updated = await this.prisma.rpPickupPoint.update({ where: { id }, data });
    return this.toPickupPoint(updated);
  }

  private async deletePickupPointById(rpId: string, id: string) {
    const point = await this.prisma.rpPickupPoint.findUnique({
      where: { id },
      select: { id: true, rpProfileId: true },
    });
    if (!point) throw new NotFoundException('Punto de cobro no encontrado');
    if (point.rpProfileId !== rpId) {
      throw new ForbiddenException('Este punto no pertenece a este RP');
    }
    await this.prisma.rpPickupPoint.update({
      where: { id },
      data: { isActive: false },
    });
    return { ok: true };
  }

  // ── RP autenticado (self) ──────────────────────────────────────────────────

  async listPickupPoints(userId: string) {
    const rp = await this.getByUserId(userId);
    return this.listPickupPointsById(rp.id);
  }
  async createPickupPoint(userId: string, dto: CreatePickupPointDto) {
    const rp = await this.getByUserId(userId);
    return this.createPickupPointById(rp.id, dto);
  }
  async updatePickupPoint(userId: string, id: string, dto: UpdatePickupPointDto) {
    const rp = await this.getByUserId(userId);
    return this.updatePickupPointById(rp.id, id, dto);
  }
  async deletePickupPoint(userId: string, id: string) {
    const rp = await this.getByUserId(userId);
    return this.deletePickupPointById(rp.id, id);
  }

  // ── Admin (cualquier rpId) ─────────────────────────────────────────────────

  listPickupPointsForAdmin(rpId: string) {
    return this.listPickupPointsById(rpId);
  }
  createPickupPointForAdmin(rpId: string, dto: CreatePickupPointDto) {
    return this.createPickupPointById(rpId, dto);
  }
  updatePickupPointForAdmin(rpId: string, id: string, dto: UpdatePickupPointDto) {
    return this.updatePickupPointById(rpId, id, dto);
  }
  deletePickupPointForAdmin(rpId: string, id: string) {
    return this.deletePickupPointById(rpId, id);
  }

  // ── Promoter (solo RPs de su organización) ─────────────────────────────────

  async listPickupPointsForPromoter(userId: string, rpId: string) {
    const promoterId = await this.resolvePromoterId(userId);
    await this.assertRpBelongsToPromoter(rpId, promoterId);
    return this.listPickupPointsById(rpId);
  }
  async createPickupPointForPromoter(
    userId: string,
    rpId: string,
    dto: CreatePickupPointDto,
  ) {
    const promoterId = await this.resolvePromoterId(userId);
    await this.assertRpBelongsToPromoter(rpId, promoterId);
    return this.createPickupPointById(rpId, dto);
  }
  async updatePickupPointForPromoter(
    userId: string,
    rpId: string,
    id: string,
    dto: UpdatePickupPointDto,
  ) {
    const promoterId = await this.resolvePromoterId(userId);
    await this.assertRpBelongsToPromoter(rpId, promoterId);
    return this.updatePickupPointById(rpId, id, dto);
  }
  async deletePickupPointForPromoter(userId: string, rpId: string, id: string) {
    const promoterId = await this.resolvePromoterId(userId);
    await this.assertRpBelongsToPromoter(rpId, promoterId);
    return this.deletePickupPointById(rpId, id);
  }
}
