import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminGeneratePassDto } from './dto/admin-generate-pass.dto';
import { EventStatus, PassClaimStatus } from '@prisma/client';
import { resolveTierPrice } from '../events/tier-pricing';
import { randomBytes } from 'crypto';

const CLAIM_TTL_HOURS = 24;

@Injectable()
export class AdminPassesService {
  private readonly logger = new Logger(AdminPassesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async generatePass(adminUserId: string, dto: AdminGeneratePassDto) {
    const event = await this.prisma.event.findUnique({
      where: { id: dto.eventId },
      select: { id: true, title: true, startsAt: true, endsAt: true, capacity: true, status: true },
    });

    if (!event) {
      throw new NotFoundException('Evento no encontrado');
    }

    if (event.status !== EventStatus.PUBLISHED) {
      throw new BadRequestException('El evento no está publicado');
    }

    if (event.endsAt.getTime() <= Date.now()) {
      throw new BadRequestException('El evento ya terminó');
    }

    const tier = await this.prisma.eventTier.findUnique({
      where: { id: dto.tierId },
      include: { prices: true },
    });

    if (!tier || tier.eventId !== dto.eventId) {
      throw new NotFoundException('Tier no encontrado para este evento');
    }

    // 1. Validar aforo por Tier
    if (tier.capacity != null) {
      const soldTier = await this.prisma.pass.count({
        where: { eventId: dto.eventId, order: { tierId: dto.tierId } },
      });
      const pendingClaimsTier = await this.prisma.passClaim.count({
        where: { tierId: dto.tierId, status: PassClaimStatus.PENDING },
      });
      if (soldTier + pendingClaimsTier >= tier.capacity) {
        throw new ConflictException('Tier agotado');
      }
    }

    // 2. Validar aforo por Evento
    if (event.capacity != null) {
      const soldEvent = await this.prisma.pass.count({
        where: { eventId: dto.eventId },
      });
      const pendingClaimsEvent = await this.prisma.passClaim.count({
        where: { eventId: dto.eventId, status: PassClaimStatus.PENDING },
      });
      if (soldEvent + pendingClaimsEvent >= event.capacity) {
        throw new ConflictException('Evento agotado');
      }
    }

    // 3. Resolver código de RP si se proporciona
    let rpProfileId: string | null = null;
    if (dto.rpCode) {
      const rp = await this.prisma.rpProfile.findUnique({
        where: { rpCode: dto.rpCode, isActive: true },
        select: { id: true },
      });
      if (!rp) {
        throw new NotFoundException('Código de RP no válido o inactivo');
      }
      rpProfileId = rp.id;
    }

    // 4. Calcular precio según el tier
    const amountCents = resolveTierPrice(tier.priceCents, tier.prices, event.startsAt)
      .currentCents;

    // 5. Crear el PassClaim
    // El vale vive hasta que termine el evento.
    const token = `npc_${randomBytes(24).toString('hex')}`;
    const expiresAt = event.endsAt;

    const claim = await this.prisma.passClaim.create({
      data: {
        token,
        eventId: dto.eventId,
        tierId: dto.tierId,
        issuedByRpId: rpProfileId,
        generatedByAdminId: adminUserId,
        amountCents,
        currency: tier.currency,
        expiresAt,
      },
    });

    this.logger.log(`Vale ${claim.id} generado por Admin ${adminUserId} (Atribuido a RP: ${dto.rpCode || 'ninguno'})`);

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

  async listIssuedPasses(eventId?: string) {
    const where: any = {
      generatedByAdminId: { not: null },
    };

    if (eventId) {
      where.eventId = eventId;
    }

    const claims = await this.prisma.passClaim.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        event: { select: { id: true, title: true, startsAt: true } },
        tier: { select: { id: true, name: true } },
        claimedBy: { select: { id: true, name: true, email: true } },
        issuedByRp: { select: { id: true, displayName: true, rpCode: true } },
        generatedByAdmin: { select: { id: true, name: true, email: true } },
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
      issuedByRp: c.issuedByRp
        ? { displayName: c.issuedByRp.displayName, rpCode: c.issuedByRp.rpCode }
        : null,
      generatedByAdmin: c.generatedByAdmin
        ? { name: c.generatedByAdmin.name, email: c.generatedByAdmin.email }
        : null,
    }));
  }
}
