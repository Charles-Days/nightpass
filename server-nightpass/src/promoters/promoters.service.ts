import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  PromoterMemberRole,
  PromoterStatus,
  Role,
} from '@prisma/client';
import { randomBytes } from 'crypto';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from '../mailer/mailer.service';
import { generateTemporaryPassword } from '../auth/utils/temporary-password';
import { UpdatePromoterDto } from './dto/update-promoter.dto';
import { InvitePromoterStaffDto } from './dto/invite-promoter-staff.dto';
import { ListPromotersQuery } from './dto/list-promoters.query';

const ARGON2_OPTS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

export interface CreatePromoterWithMemberInput {
  name: string;
  city: string;
  phone?: string | null;
  instagram?: string | null;
  website?: string | null;
  ownerUserId: string;
}

@Injectable()
export class PromotersService {
  private readonly logger = new Logger(PromotersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
  ) {}

  async createWithMember(
    tx: Prisma.TransactionClient,
    input: CreatePromoterWithMemberInput,
  ) {
    const baseSlug = this.toSlug(input.name);
    let lastError: unknown;

    for (let attempt = 0; attempt < 3; attempt++) {
      const slug = `${baseSlug}-${this.randomSuffix()}`;
      try {
        const promoter = await tx.promoter.create({
          data: {
            slug,
            name: input.name,
            city: input.city,
            phone: input.phone ?? null,
            instagram: input.instagram ?? null,
            website: input.website ?? null,
          },
        });
        await tx.promoterMember.create({
          data: {
            userId: input.ownerUserId,
            promoterId: promoter.id,
            role: PromoterMemberRole.OWNER,
          },
        });
        return promoter;
      } catch (err) {
        lastError = err;
        if (
          typeof err === 'object' &&
          err !== null &&
          'code' in err &&
          (err as { code: string }).code === 'P2002'
        ) {
          continue;
        }
        throw err;
      }
    }

    throw new InternalServerErrorException(
      `No se pudo generar un identificador único para este organizador "${input.name}"`,
      { cause: lastError instanceof Error ? lastError : undefined },
    );
  }

  async findByUser(userId: string) {
    const membership = await this.prisma.promoterMember.findFirst({
      where: { userId },
      include: { promoter: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!membership) throw new NotFoundException('Organizador no encontrado');
    return {
      promoter: membership.promoter,
      membershipRole: membership.role,
    };
  }

  async updateOwn(userId: string, dto: UpdatePromoterDto) {
    const membership = await this.prisma.promoterMember.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    if (!membership) throw new NotFoundException('Organizador no encontrado');
    if (membership.role !== PromoterMemberRole.OWNER) {
      throw new ForbiddenException('No tienes acceso a este organizador');
    }

    const data: Prisma.PromoterUpdateInput = {
      bio: dto.bio?.trim() || (dto.bio === '' ? null : undefined),
      logoUrl: dto.logoUrl ?? undefined,
      phone: dto.phone?.trim() || (dto.phone === '' ? null : undefined),
      instagram:
        dto.instagram?.trim() || (dto.instagram === '' ? null : undefined),
      website: dto.website?.trim() || (dto.website === '' ? null : undefined),
    };

    Object.keys(data).forEach(
      (key) => (data as any)[key] === undefined && delete (data as any)[key],
    );

    return this.prisma.promoter.update({
      where: { id: membership.promoterId },
      data,
    });
  }

  async inviteStaff(
    promoterId: string,
    dto: InvitePromoterStaffDto,
    invitedById: string,
  ): Promise<{ userId: string; temporaryPassword?: string }> {
    const promoter = await this.prisma.promoter.findUnique({
      where: { id: promoterId },
    });
    if (!promoter) throw new NotFoundException('Organizador no encontrado');

    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });

    if (existing) {
      const isPanelRole =
        existing.role === Role.ADMIN ||
        existing.role === Role.VENUE_OWNER ||
        existing.role === Role.VENUE_STAFF ||
        existing.role === Role.PROMOTER ||
        existing.role === Role.PROMOTER_STAFF;

      if (isPanelRole) {
        await this.prisma.promoterMember.upsert({
          where: {
            userId_promoterId: { userId: existing.id, promoterId },
          },
          update: { role: PromoterMemberRole.STAFF },
          create: {
            userId: existing.id,
            promoterId,
            role: PromoterMemberRole.STAFF,
          },
        });
        void this.mailer
          .sendStaffInvited(
            email,
            existing.name ?? dto.name,
            promoter.name,
            undefined,
            'SCANNER',
          )
          .catch((err) =>
            this.logger.error(
              `Email invitación staff organizador (panel user) falló: ${err instanceof Error ? err.message : err}`,
            ),
          );
        return { userId: existing.id };
      }

      const tempPassword = generateTemporaryPassword(12);
      const passwordHash = await argon2.hash(tempPassword, ARGON2_OPTS);
      await this.prisma.user.update({
        where: { id: existing.id },
        data: {
          passwordHash,
          role: Role.PROMOTER_STAFF,
          mustChangePassword: true,
        },
      });
      await this.prisma.promoterMember.upsert({
        where: {
          userId_promoterId: { userId: existing.id, promoterId },
        },
        update: { role: PromoterMemberRole.STAFF },
        create: {
          userId: existing.id,
          promoterId,
          role: PromoterMemberRole.STAFF,
        },
      });
      void this.mailer
        .sendStaffInvited(
          email,
          existing.name ?? dto.name,
          promoter.name,
          tempPassword,
          'SCANNER',
        )
        .catch((err) =>
          this.logger.error(
            `Email invitación staff organizador (customer) falló: ${err instanceof Error ? err.message : err}`,
          ),
        );
      return { userId: existing.id, temporaryPassword: tempPassword };
    }

    const tempPassword = generateTemporaryPassword(12);
    const passwordHash = await argon2.hash(tempPassword, ARGON2_OPTS);
    const newUser = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        name: dto.name,
        role: Role.PROMOTER_STAFF,
        mustChangePassword: true,
      },
    });
    await this.prisma.promoterMember.create({
      data: {
        userId: newUser.id,
        promoterId,
        role: PromoterMemberRole.STAFF,
      },
    });
    void this.mailer
      .sendStaffInvited(
        email,
        dto.name,
        promoter.name,
        tempPassword,
        'SCANNER',
      )
      .catch((err) =>
        this.logger.error(
          `Email invitación staff organizador (nuevo usuario) falló: ${err instanceof Error ? err.message : err}`,
        ),
      );
    return { userId: newUser.id, temporaryPassword: tempPassword };
  }

  async inviteStaffByUser(
    userId: string,
    dto: InvitePromoterStaffDto,
  ): Promise<{ userId: string; temporaryPassword?: string }> {
    const membership = await this.prisma.promoterMember.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    if (!membership) throw new NotFoundException('Organizador no encontrado');
    if (membership.role !== PromoterMemberRole.OWNER) {
      throw new ForbiddenException('No tienes acceso a este organizador');
    }
    return this.inviteStaff(membership.promoterId, dto, userId);
  }

  async listStaff(promoterId: string) {
    return this.prisma.promoterMember.findMany({
      where: { promoterId, role: PromoterMemberRole.STAFF },
      include: {
        user: { select: { id: true, email: true, name: true, role: true } },
      },
    });
  }

  async listStaffByUser(userId: string) {
    const membership = await this.prisma.promoterMember.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    if (!membership) throw new NotFoundException('Organizador no encontrado');
    if (membership.role !== PromoterMemberRole.OWNER) {
      throw new ForbiddenException('No tienes acceso a este organizador');
    }
    return this.listStaff(membership.promoterId);
  }

  async revokeStaff(promoterId: string, userId: string) {
    const member = await this.prisma.promoterMember.findUnique({
      where: { userId_promoterId: { userId, promoterId } },
      include: {
        user: { select: { email: true, name: true } },
        promoter: { select: { name: true } },
      },
    });
    if (!member || member.role !== PromoterMemberRole.STAFF) {
      throw new NotFoundException('Esta relación no existe');
    }

    await this.prisma.promoterMember.delete({
      where: { userId_promoterId: { userId, promoterId } },
    });

    void this.mailer
      .sendStaffRevoked(
        member.user.email,
        member.user.name ?? 'amig@',
        member.promoter.name,
      )
      .catch((err) =>
        this.logger.error(
          `Email revocación staff organizador falló (${member.user.email}): ${err instanceof Error ? err.message : err}`,
        ),
      );

    return { ok: true };
  }

  async revokeStaffByUser(ownerUserId: string, staffUserId: string) {
    const membership = await this.prisma.promoterMember.findFirst({
      where: { userId: ownerUserId },
      orderBy: { createdAt: 'asc' },
    });
    if (!membership) throw new NotFoundException('Organizador no encontrado');
    if (membership.role !== PromoterMemberRole.OWNER) {
      throw new ForbiddenException('No tienes acceso a este organizador');
    }
    return this.revokeStaff(membership.promoterId, staffUserId);
  }

  async listAdmin(query: ListPromotersQuery) {
    const where: Prisma.PromoterWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.city) {
      where.city = { equals: query.city.trim(), mode: 'insensitive' };
    }
    if (query.search) {
      const term = query.search.trim();
      if (term) {
        where.name = { contains: term, mode: 'insensitive' };
      }
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.promoter.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          _count: { select: { members: true } },
        },
      }),
      this.prisma.promoter.count({ where }),
    ]);

    return { items, total, page: query.page, limit: query.limit };
  }

  async getByIdAdmin(id: string) {
    const promoter = await this.prisma.promoter.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, email: true, name: true, role: true },
            },
          },
        },
      },
    });
    if (!promoter) throw new NotFoundException('Organizador no encontrado');
    return promoter;
  }

  async suspend(id: string) {
    const promoter = await this.prisma.promoter.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!promoter) throw new NotFoundException('Organizador no encontrado');

    return this.prisma.promoter.update({
      where: { id },
      data: { status: PromoterStatus.SUSPENDED },
    });
  }

  async reactivate(id: string) {
    const promoter = await this.prisma.promoter.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!promoter) throw new NotFoundException('Organizador no encontrado');

    return this.prisma.promoter.update({
      where: { id },
      data: { status: PromoterStatus.ACTIVE },
    });
  }

  private toSlug(name: string): string {
    return (
      name
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .slice(0, 60) || 'organizador'
    );
  }

  private randomSuffix(): string {
    return randomBytes(3).toString('hex');
  }
}
