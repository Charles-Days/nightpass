import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Role, RpCommissionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from '../mailer/mailer.service';
import { CreateRpDto } from './dto/create-rp.dto';
import { ListRpQuery } from './dto/list-rp.query';
import { SetCommissionRuleDto } from './dto/set-commission-rule.dto';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';

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

    let userId: string;
    let temporaryPassword: string | undefined;
    let isExistingUser = false;

    if (existingUser) {
      isExistingUser = true;
      if (existingUser.role !== Role.CUSTOMER && existingUser.role !== Role.RP) {
        throw new ConflictException('Este email ya está registrado con un rol administrativo');
      }
      if (existingUser.rpProfile) {
        throw new ConflictException('Este usuario ya tiene un perfil de RP activo');
      }

      // Promote to Role.RP
      await this.prisma.user.update({
        where: { id: existingUser.id },
        data: { role: Role.RP },
      });
      userId = existingUser.id;
    } else {
      // Create new user
      temporaryPassword = dto.password || randomBytes(6).toString('hex'); // 12-char hex
      const passwordHash = await argon2.hash(temporaryPassword, ARGON2_OPTS);

      const newUser = await this.prisma.user.create({
        data: {
          email,
          name: displayName,
          role: Role.RP,
          passwordHash,
          mustChangePassword: true,
        },
      });
      userId = newUser.id;
    }

    // Generate unique rpCode
    const baseCode = displayName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10).toUpperCase();
    let rpCode = '';
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      const suffix = randomBytes(2).toString('hex').toUpperCase();
      rpCode = `${baseCode}-${suffix}`;
      const codeExists = await this.prisma.rpProfile.findUnique({
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

    const rpProfile = await this.prisma.rpProfile.create({
      data: {
        userId,
        displayName,
        rpCode,
        promoterId: dto.promoterId || null,
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
      await this.prisma.rpCommissionRule.create({
        data: {
          rpProfileId: rpProfile.id,
          eventId: dto.eventId,
          type,
          nTickets: type === RpCommissionType.PER_N_TICKETS ? (dto.nTickets || 10) : null,
          rewardCents: type === RpCommissionType.PER_N_TICKETS ? (dto.rewardCents || 15000) : null,
          percentage: type === RpCommissionType.PERCENTAGE ? (dto.percentage || 5) : null,
          isActive: true,
        },
      });
    }

    // Send invitation email in background
    this.mailer.sendRpInvited(email, displayName, temporaryPassword).catch((err) => {
      this.logger.error(`Error al enviar invitación de RP a ${email}: ${err.message}`);
    });

    return rpProfile;
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

  async toggleActive(id: string) {
    const rp = await this.getById(id);
    return this.prisma.rpProfile.update({
      where: { id },
      data: { isActive: !rp.isActive },
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

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
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
}
