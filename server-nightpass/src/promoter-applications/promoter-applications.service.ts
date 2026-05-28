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
  type PromoterApplication,
} from '@prisma/client';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { PromotersService } from '../promoters/promoters.service';
import { MailerService } from '../mailer/mailer.service';
import { generateTemporaryPassword } from '../auth/utils/temporary-password';
import { CreatePromoterApplicationDto } from './dto/create-promoter-application.dto';
import { RejectPromoterApplicationDto } from './dto/reject-promoter-application.dto';
import { ListPromoterApplicationsQuery } from './dto/list-promoter-applications.query';

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
export class PromoterApplicationsService {
  private readonly logger = new Logger(PromoterApplicationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly promoters: PromotersService,
    private readonly mailer: MailerService,
  ) {}

  async submit(
    dto: CreatePromoterApplicationDto,
  ): Promise<{ id: string; status: ApplicationStatus }> {
    const email = dto.applicant.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });

    let applicantId: string;
    let applicantName: string;

    if (existing) {
      if (
        existing.role === Role.ADMIN ||
        existing.role === Role.VENUE_OWNER ||
        existing.role === Role.VENUE_STAFF ||
        existing.role === Role.PROMOTER ||
        existing.role === Role.PROMOTER_STAFF
      ) {
        this.logger.warn(
          `Promoter application blocked — panel-bound email: ${email} (role=${existing.role})`,
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

    const promoterNameLower = dto.promoter.name.trim().toLowerCase();
    const cityLower = dto.promoter.city.trim().toLowerCase();

    const cooldownThreshold = new Date(Date.now() - COOLDOWN_DAYS * 86_400_000);
    const recentRejection = await this.prisma.promoterApplication.findFirst({
      where: {
        applicantUserId: applicantId,
        status: ApplicationStatus.REJECTED,
        createdAt: { gt: cooldownThreshold },
        AND: [
          this.normalizedEqualsCondition('promoterName', promoterNameLower),
          this.normalizedEqualsCondition('city', cityLower),
        ],
      },
      select: { id: true, createdAt: true },
    });
    if (recentRejection) {
      throw new BadRequestException(
        `Debes esperar ${COOLDOWN_DAYS} días para volver a aplicar como organizador`,
      );
    }

    const pendingDuplicate = await this.prisma.promoterApplication.findFirst({
      where: {
        applicantUserId: applicantId,
        status: ApplicationStatus.PENDING,
        AND: [
          this.normalizedEqualsCondition('promoterName', promoterNameLower),
          this.normalizedEqualsCondition('city', cityLower),
        ],
      },
      select: { id: true },
    });
    if (pendingDuplicate) {
      throw new ConflictException(
        'Ya tienes una solicitud pendiente para esta promotora',
      );
    }

    const application = await this.prisma.promoterApplication.create({
      data: {
        applicantUserId: applicantId,
        promoterName: dto.promoter.name.trim(),
        city: dto.promoter.city.trim(),
        phone: dto.promoter.phone?.trim() || null,
        instagram: dto.promoter.instagram?.trim() || null,
        website: dto.promoter.website?.trim() || null,
        experience: dto.promoter.experience,
        eventTypes: dto.promoter.eventTypes,
        message: dto.promoter.message?.trim() || null,
      },
    });

    void this.fireSubmitEmails(application.id, email, applicantName, application.promoterName);

    return { id: application.id, status: application.status };
  }

  async list(query: ListPromoterApplicationsQuery) {
    const where: Prisma.PromoterApplicationWhereInput = {};
    if (query.status) where.status = query.status;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.promoterApplication.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          applicant: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.promoterApplication.count({ where }),
    ]);

    return { items, total, page: query.page, limit: query.limit };
  }

  async getById(id: string) {
    const application = await this.prisma.promoterApplication.findUnique({
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
  ): Promise<PromoterApplication & { temporaryPassword: string }> {
    const tempPassword = generateTemporaryPassword(12);
    const passwordHash = await argon2.hash(tempPassword, ARGON2_OPTS);

    const result = await this.runReviewTransaction(id, async (tx) => {
      const updated = await this.lockAndUpdate(tx, id, {
        status: ApplicationStatus.APPROVED,
        rejectionReason: null,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
      });

      const promoter = await this.promoters.createWithMember(tx, {
        name: updated.promoterName,
        city: updated.city,
        phone: updated.phone,
        instagram: updated.instagram,
        website: updated.website,
        ownerUserId: updated.applicantUserId,
      });

      const linked = await tx.promoterApplication.update({
        where: { id: updated.id },
        data: { approvedPromoterId: promoter.id },
      });

      const applicant = await tx.user.findUniqueOrThrow({
        where: { id: updated.applicantUserId },
      });
      const isExistingUser = applicant.role === Role.CUSTOMER;
      const nextRole =
        applicant.role === Role.CUSTOMER ? Role.PROMOTER : applicant.role;
      await tx.user.update({
        where: { id: applicant.id },
        data: { passwordHash, role: nextRole, mustChangePassword: true },
      });

      return {
        application: linked,
        applicant: this.toApplicantSnapshot(applicant),
        isExistingUser,
      };
    });

    this.fireApprovalEmail(result, tempPassword);
    return { ...result.application, temporaryPassword: tempPassword };
  }

  async reject(
    id: string,
    dto: RejectPromoterApplicationDto,
    reviewerId: string,
  ) {
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
    data: Prisma.PromoterApplicationUncheckedUpdateInput,
  ): Promise<PromoterApplication> {
    return tx.promoterApplication.update({
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
    field: 'promoterName' | 'city',
    valueLower: string,
  ): Prisma.PromoterApplicationWhereInput {
    return { [field]: { equals: valueLower, mode: 'insensitive' } };
  }

  private fireSubmitEmails(
    applicationId: string,
    applicantEmail: string,
    applicantName: string,
    promoterName: string,
  ): void {
    void this.mailer
      .sendPromoterApplicationReceivedToApplicant(applicantEmail, applicantName, promoterName)
      .catch((err) =>
        this.logger.error(
          `Email "received" al aplicante falló: ${err instanceof Error ? err.message : err}`,
        ),
      );
    void this.mailer
      .sendPromoterApplicationReceivedToAdmin(applicationId, applicantName, applicantEmail, promoterName)
      .catch((err) =>
        this.logger.error(
          `Email "received" al admin falló: ${err instanceof Error ? err.message : err}`,
        ),
      );
  }

  private fireApprovalEmail(
    payload: {
      application: PromoterApplication;
      applicant: ApplicantSnapshot;
      isExistingUser: boolean;
    },
    temporaryPassword: string,
  ): void {
    void this.mailer
      .sendPromoterApplicationApproved(
        payload.applicant.email,
        payload.applicant.name ?? 'tu promotora',
        payload.application.promoterName,
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
    application: PromoterApplication;
    applicant: ApplicantSnapshot;
  }): void {
    void this.mailer
      .sendPromoterApplicationRejected(
        payload.applicant.email,
        payload.applicant.name ?? 'tu promotora',
        payload.application.promoterName,
        payload.application.rejectionReason ?? undefined,
      )
      .catch((err) =>
        this.logger.error(
          `Email de rechazo falló: ${err instanceof Error ? err.message : err}`,
        ),
      );
  }
}
