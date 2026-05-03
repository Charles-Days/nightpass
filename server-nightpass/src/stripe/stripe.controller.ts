import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Post,
  Query,
  RawBodyRequest,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CurrentUser,
  type AuthUser,
} from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from './stripe.service';
import { StripeWebhookService } from './stripe-webhook.service';
import {
  OnboardStripeDto,
  StripeStatusQueryDto,
} from './dto/onboard-stripe.dto';

@Controller('stripe')
export class StripeController {
  private readonly logger = new Logger(StripeController.name);

  constructor(
    private readonly stripe: StripeService,
    private readonly webhooks: StripeWebhookService,
    private readonly prisma: PrismaService,
  ) {}

  // ── Connect onboarding ────────────────────────────────────────────────────

  @Post('connect/onboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.VENUE_OWNER)
  async onboard(
    @Body() dto: OnboardStripeDto,
    @CurrentUser() user: AuthUser,
  ): Promise<{ url: string }> {
    await this.ensureCanManageVenue(dto.venueId, user);

    const venue = await this.prisma.venue.findUnique({
      where: { id: dto.venueId },
      include: { owners: { include: { user: true } }, stripeAccount: true },
    });
    if (!venue) throw new NotFoundException('Venue no encontrado');

    let stripeAccountId = venue.stripeAccount?.stripeAccountId;

    if (!stripeAccountId) {
      const ownerEmail = venue.owners[0]?.user?.email ?? user.email;
      const account = await this.stripe.createConnectAccount(ownerEmail);
      stripeAccountId = account.id;
      await this.prisma.stripeAccount.create({
        data: {
          venueId: venue.id,
          stripeAccountId,
          chargesEnabled: account.charges_enabled ?? false,
          detailsSubmitted: account.details_submitted ?? false,
        },
      });
    }

    const link = await this.stripe.createOnboardingLink(
      stripeAccountId,
      venue.id,
    );
    return { url: link.url };
  }

  @Get('connect/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.VENUE_OWNER)
  async status(
    @Query() query: StripeStatusQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<{
    accountId: string | null;
    chargesEnabled: boolean;
    detailsSubmitted: boolean;
  }> {
    await this.ensureCanManageVenue(query.venueId, user);

    const stripeAccount = await this.prisma.stripeAccount.findUnique({
      where: { venueId: query.venueId },
    });
    if (!stripeAccount) {
      return {
        accountId: null,
        chargesEnabled: false,
        detailsSubmitted: false,
      };
    }

    // Sincronizar con Stripe en cada llamada (status puede cambiar fuera del webhook)
    if (this.stripe.isEnabled()) {
      try {
        const account = await this.stripe.retrieveAccount(
          stripeAccount.stripeAccountId,
        );
        const chargesEnabled = account.charges_enabled ?? false;
        const detailsSubmitted = account.details_submitted ?? false;
        if (
          chargesEnabled !== stripeAccount.chargesEnabled ||
          detailsSubmitted !== stripeAccount.detailsSubmitted
        ) {
          await this.prisma.stripeAccount.update({
            where: { id: stripeAccount.id },
            data: { chargesEnabled, detailsSubmitted },
          });
        }
        return {
          accountId: stripeAccount.stripeAccountId,
          chargesEnabled,
          detailsSubmitted,
        };
      } catch (err) {
        this.logger.warn(
          `No se pudo sincronizar account ${stripeAccount.stripeAccountId}: ${(err as Error).message}`,
        );
      }
    }

    return {
      accountId: stripeAccount.stripeAccountId,
      chargesEnabled: stripeAccount.chargesEnabled,
      detailsSubmitted: stripeAccount.detailsSubmitted,
    };
  }

  // ── Webhook ───────────────────────────────────────────────────────────────

  @Post('webhooks')
  @HttpCode(HttpStatus.OK)
  async webhook(
    @Req() req: RawBodyRequest<{ rawBody?: Buffer }>,
    @Headers('stripe-signature') signature: string | undefined,
  ): Promise<{ received: true }> {
    if (!signature) {
      throw new BadRequestException('stripe-signature header missing');
    }
    const rawBody = req.rawBody;
    if (!rawBody || rawBody.length === 0) {
      throw new BadRequestException('Empty request body');
    }

    try {
      await this.webhooks.handleEvent(rawBody, signature);
    } catch (err) {
      const message = (err as Error).message;
      this.logger.error(`Webhook handling failed: ${message}`);
      // Si la firma es inválida → 400 para que Stripe no reintente.
      if (message.includes('signature')) {
        throw new BadRequestException(message);
      }
      throw new InternalServerErrorException(message);
    }

    return { received: true };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async ensureCanManageVenue(
    venueId: string,
    user: AuthUser,
  ): Promise<void> {
    if (user.role === Role.ADMIN) return;
    if (user.role !== Role.VENUE_OWNER) {
      throw new ForbiddenException('Solo dueños o admin pueden gestionar pagos');
    }
    const owner = await this.prisma.venueOwner.findUnique({
      where: { userId_venueId: { userId: user.id, venueId } },
      select: { userId: true },
    });
    if (!owner) {
      throw new NotFoundException('Local no encontrado o sin permisos');
    }
  }
}
