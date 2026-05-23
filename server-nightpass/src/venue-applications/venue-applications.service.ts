import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  ApplicationStatus,
  Prisma,
  Role,
  type VenueApplication,
} from '@prisma/client';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { VenuesService } from '../venues/venues.service';
import { MailerService } from '../mailer/mailer.service';
import { generateTemporaryPassword } from '../auth/utils/temporary-password';
import { CreateApplicationDto } from './dto/create-application.dto';
import { RejectApplicationDto } from './dto/reject-application.dto';
import { ListApplicationsQuery } from './dto/list-applications.query';

const ARGON2_OPTS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

const COOLDOWN_DAYS = 30;

interface ApplicantSnapshot {
  id: string;
  email: string;
  name: string | null;
}

@Injectable()
export class VenueApplicationsService {
  private readonly logger = new Logger(VenueApplicationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly venues: VenuesService,
    private readonly mailer: MailerService,
  ) {}

  async submit(dto: CreateApplicationDto): Promise<{ id: string; status: ApplicationStatus }> {
    const email = dto.applicant.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });

    let applicantId: string;
    let applicantName: string;

    if (existing) {
      if (
        existing.role === Role.ADMIN ||
        existing.role === Role.VENUE_OWNER ||
        existing.role === Role.VENUE_STAFF
      ) {
        this.logger.warn(
          `Venue application blocked — panel-bound email: ${email} (role=${existing.role})`,
        );
        throw new ConflictException(
          'No se pudo procesar la solicitud, contacta a soporte',
        );
      }
      applicantId = existing.id;
      applicantName = existing.name ?? dto.applicant.name;
    } else {
      const placeholderHash = await argon2.hash(
        randomBytes(32).toString('hex'),
        ARGON2_OPTS,
      );
      const created = await this.prisma.user.create({
        data: {
          email,
          passwordHash: placeholderHash,
          name: dto.applicant.name,
          role: Role.CUSTOMER,
        },
      });
      applicantId = created.id;
      applicantName = created.name ?? dto.applicant.name;
    }

    const venueNameLower = dto.venue.name.trim().toLowerCase();
    const cityLower = dto.venue.city.trim().toLowerCase();

    const cooldownThreshold = new Date(Date.now() - COOLDOWN_DAYS * 86_400_000);
    const recentRejection = await this.prisma.venueApplication.findFirst({
      where: {
        applicantUserId: applicantId,
        status: ApplicationStatus.REJECTED,
        createdAt: { gt: cooldownThreshold },
        AND: [
          this.normalizedEqualsCondition('venueName', venueNameLower),
          this.normalizedEqualsCondition('city', cityLower),
        ],
      },
      select: { id: true, createdAt: true },
    });
    if (recentRejection) {
      throw new BadRequestException(
        `Debes esperar ${COOLDOWN_DAYS} días para volver a aplicar a este local`,
      );
    }

    const pendingDuplicate = await this.prisma.venueApplication.findFirst({
      where: {
        applicantUserId: applicantId,
        status: ApplicationStatus.PENDING,
        AND: [
          this.normalizedEqualsCondition('venueName', venueNameLower),
          this.normalizedEqualsCondition('city', cityLower),
        ],
      },
      select: { id: true },
    });
    if (pendingDuplicate) {
      throw new ConflictException(
        'Ya tienes una solicitud pendiente para este local',
      );
    }

    const application = await this.prisma.venueApplication.create({
      data: {
        applicantUserId: applicantId,
        venueName: dto.venue.name.trim(),
        city: dto.venue.city.trim(),
        address: dto.venue.address?.trim() || null,
        phone: dto.venue.phone?.trim() || null,
        message: dto.venue.message?.trim() || null,
      },
    });

    void this.fireSubmitEmails(application.id, email, applicantName, application.venueName);

    return { id: application.id, status: application.status };
  }

  async list(query: ListApplicationsQuery) {
    const where: Prisma.VenueApplicationWhereInput = {};
    if (query.status) where.status = query.status;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.venueApplication.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          applicant: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.venueApplication.count({ where }),
    ]);

    return { items, total, page: query.page, limit: query.limit };
  }

  async getById(id: string) {
    const application = await this.prisma.venueApplication.findUnique({
      where: { id },
      include: {
        applicant: { select: { id: true, name: true, email: true } },
        reviewer: { select: { id: true, name: true, email: true } },
      },
    });
    if (!application) throw new NotFoundException('Solicitud no encontrada');
    return application;
  }

  async approve(
    id: string,
    reviewerId: string,
  ): Promise<VenueApplication & { temporaryPassword: string }> {
    const tempPassword = generateTemporaryPassword(12);
    const passwordHash = await argon2.hash(tempPassword, ARGON2_OPTS);

    const result = await this.runReviewTransaction(id, async (tx) => {
      const updated = await this.lockAndUpdate(tx, id, {
        status: ApplicationStatus.APPROVED,
        rejectionReason: null,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
      });

      await this.venues.createWithOwner(tx, {
        name: updated.venueName,
        city: updated.city,
        address: updated.address,
        phone: updated.phone,
        ownerUserId: updated.applicantUserId,
      });

      const applicant = await tx.user.findUniqueOrThrow({
        where: { id: updated.applicantUserId },
      });
      const isExistingUser = applicant.role === Role.CUSTOMER;
      const nextRole =
        applicant.role === Role.CUSTOMER ? Role.VENUE_OWNER : applicant.role;
      await tx.user.update({
        where: { id: applicant.id },
        data: { passwordHash, role: nextRole, mustChangePassword: true },
      });

      return {
        application: updated,
        applicant: this.toApplicantSnapshot(applicant),
        isExistingUser,
      };
    });

    this.fireApprovalEmail(result, tempPassword);
    return { ...result.application, temporaryPassword: tempPassword };
  }

  async reject(id: string, dto: RejectApplicationDto, reviewerId: string) {
    const application = await this.runReviewTransaction(id, async (tx) => {
      const updated = await this.lockAndUpdate(tx, id, {
        status: ApplicationStatus.REJECTED,
        rejectionReason: dto.reason?.trim() || null,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
      });

      const applicant = await tx.user.findUniqueOrThrow({
        where: { id: updated.applicantUserId },
      });
      return { application: updated, applicant: this.toApplicantSnapshot(applicant) };
    });

    this.fireRejectionEmail(application);
    return application.application;
  }

  // ---------- privados ----------

  private async runReviewTransaction<T>(
    applicationId: string,
    work: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.prisma.$transaction(work);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        throw new ConflictException(
          `La solicitud ${applicationId} ya fue procesada`,
        );
      }
      throw err;
    }
  }

  private async lockAndUpdate(
    tx: Prisma.TransactionClient,
    id: string,
    data: Prisma.VenueApplicationUncheckedUpdateInput,
  ): Promise<VenueApplication> {
    return tx.venueApplication.update({
      where: { id, status: ApplicationStatus.PENDING },
      data,
    });
  }

  private toApplicantSnapshot(user: {
    id: string;
    email: string;
    name: string | null;
  }): ApplicantSnapshot {
    return { id: user.id, email: user.email, name: user.name };
  }

  private normalizedEqualsCondition(
    field: 'venueName' | 'city',
    valueLower: string,
  ): Prisma.VenueApplicationWhereInput {
    // Heurística A1: comparación case-insensitive simple. Bypass posible con
    // variaciones tipográficas — aceptado para esta fase.
    return { [field]: { equals: valueLower, mode: 'insensitive' } };
  }

  private fireSubmitEmails(
    applicationId: string,
    applicantEmail: string,
    applicantName: string,
    venueName: string,
  ): void {
    void this.mailer
      .sendApplicationReceivedToApplicant(applicantEmail, applicantName, venueName)
      .catch((err) =>
        this.logger.error(
          `Email "received" al aplicante falló: ${err instanceof Error ? err.message : err}`,
        ),
      );
    void this.mailer
      .sendApplicationReceivedToAdmin(applicationId, applicantName, applicantEmail, venueName)
      .catch((err) =>
        this.logger.error(
          `Email "received" al admin falló: ${err instanceof Error ? err.message : err}`,
        ),
      );
  }

  private fireApprovalEmail(
    payload: {
      application: VenueApplication;
      applicant: ApplicantSnapshot;
      isExistingUser: boolean;
    },
    temporaryPassword: string,
  ): void {
    void this.mailer
      .sendApplicationApproved(
        payload.applicant.email,
        payload.applicant.name ?? 'tu local',
        payload.application.venueName,
        temporaryPassword,
        payload.isExistingUser,
      )
      .catch((err) =>
        this.logger.error(
          `Email de aprobación falló: ${err instanceof Error ? err.message : err}`,
        ),
      );
  }

  private fireRejectionEmail(payload: {
    application: VenueApplication;
    applicant: ApplicantSnapshot;
  }): void {
    void this.mailer
      .sendApplicationRejected(
        payload.applicant.email,
        payload.applicant.name ?? 'tu local',
        payload.application.venueName,
        payload.application.rejectionReason ?? undefined,
      )
      .catch((err) =>
        this.logger.error(
          `Email de rechazo falló: ${err instanceof Error ? err.message : err}`,
        ),
      );
  }
}
