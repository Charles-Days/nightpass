import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Role, VenueStaffStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from '../mailer/mailer.service';
import { generateTemporaryPassword } from '../auth/utils/temporary-password';
import { InviteStaffDto } from './dto/invite-staff.dto';

const ARGON2_OPTS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

@Injectable()
export class VenueStaffService {
  private readonly logger = new Logger(VenueStaffService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
  ) {}

  async invite(
    venueId: string,
    dto: InviteStaffDto,
    invitedById: string,
  ): Promise<{ userId: string; temporaryPassword?: string }> {
    const venue = await this.prisma.venue.findUnique({ where: { id: venueId } });
    if (!venue) throw new NotFoundException('Local no encontrado');

    const email = dto.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });

    if (existing) {
      const isPanelRole =
        existing.role === Role.ADMIN ||
        existing.role === Role.VENUE_OWNER ||
        existing.role === Role.VENUE_STAFF;

      if (isPanelRole) {
        // Upsert VenueStaff with ACTIVE status, no temp password
        await this.prisma.venueStaff.upsert({
          where: { venueId_userId: { venueId, userId: existing.id } },
          update: { status: VenueStaffStatus.ACTIVE, joinedAt: new Date(), staffRole: dto.staffRole ?? undefined },
          create: {
            venueId,
            userId: existing.id,
            invitedById,
            staffRole: dto.staffRole,
            status: VenueStaffStatus.ACTIVE,
            joinedAt: new Date(),
          },
        });
        void this.mailer
          .sendStaffInvited(email, existing.name ?? dto.name, venue.name, undefined, dto.staffRole)
          .catch((err) =>
            this.logger.error(
              `Email invitación staff (panel user) falló: ${err instanceof Error ? err.message : err}`,
            ),
          );
        return { userId: existing.id };
      }

      // CUSTOMER: generate temp password, update user, upsert VenueStaff
      const tempPassword = generateTemporaryPassword(12);
      const passwordHash = await argon2.hash(tempPassword, ARGON2_OPTS);
      await this.prisma.user.update({
        where: { id: existing.id },
        data: { passwordHash, mustChangePassword: true },
      });
      await this.prisma.venueStaff.upsert({
        where: { venueId_userId: { venueId, userId: existing.id } },
        update: { status: VenueStaffStatus.ACTIVE, joinedAt: new Date(), staffRole: dto.staffRole ?? undefined },
        create: {
          venueId,
          userId: existing.id,
          invitedById,
          staffRole: dto.staffRole,
          status: VenueStaffStatus.ACTIVE,
          joinedAt: new Date(),
        },
      });
      void this.mailer
        .sendStaffInvited(email, existing.name ?? dto.name, venue.name, tempPassword, dto.staffRole)
        .catch((err) =>
          this.logger.error(
            `Email invitación staff (customer) falló: ${err instanceof Error ? err.message : err}`,
          ),
        );
      return { userId: existing.id, temporaryPassword: tempPassword };
    }

    // New user
    const tempPassword = generateTemporaryPassword(12);
    const passwordHash = await argon2.hash(tempPassword, ARGON2_OPTS);
    const newUser = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        name: dto.name,
        role: Role.VENUE_STAFF,
        mustChangePassword: true,
      },
    });
    await this.prisma.venueStaff.create({
      data: {
        venueId,
        userId: newUser.id,
        invitedById,
        staffRole: dto.staffRole,
        status: VenueStaffStatus.ACTIVE,
        joinedAt: new Date(),
      },
    });
    void this.mailer
      .sendStaffInvited(email, dto.name, venue.name, tempPassword, dto.staffRole)
      .catch((err) =>
        this.logger.error(
          `Email invitación staff (nuevo usuario) falló: ${err instanceof Error ? err.message : err}`,
        ),
      );
    return { userId: newUser.id, temporaryPassword: tempPassword };
  }

  async list(venueId: string) {
    return this.prisma.venueStaff.findMany({
      where: { venueId, status: { not: VenueStaffStatus.REVOKED } },
      include: {
        user: { select: { id: true, email: true, name: true, role: true } },
      },
    });
  }

  async revoke(venueId: string, userId: string) {
    const staff = await this.prisma.venueStaff.findUnique({
      where: { venueId_userId: { venueId, userId } },
      include: {
        user: { select: { email: true, name: true } },
        venue: { select: { name: true } },
      },
    });

    const result = await this.prisma.venueStaff.updateMany({
      where: { venueId, userId },
      data: { status: VenueStaffStatus.REVOKED },
    });

    if (staff && staff.status !== VenueStaffStatus.REVOKED) {
      void this.mailer
        .sendStaffRevoked(
          staff.user.email,
          staff.user.name ?? 'amig@',
          staff.venue.name,
        )
        .catch((err) =>
          this.logger.error(
            `Email revocación staff falló (${staff.user.email}): ${err instanceof Error ? err.message : err}`,
          ),
        );
    }

    return result;
  }
}
