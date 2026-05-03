import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import StripeSdk from 'stripe';
import type { Stripe } from 'stripe/cjs/stripe.core';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly client: Stripe | null;
  private readonly platformFeePct: number;
  private readonly country: string;
  private readonly defaultCurrency: string;
  private readonly webhookSecret: string | undefined;
  private readonly publishableKey: string | undefined;
  private readonly adminWebUrl: string;

  constructor(private readonly config: ConfigService) {
    const secretKey = this.config.get<string>('STRIPE_SECRET_KEY');
    this.publishableKey = this.config.get<string>('STRIPE_PUBLISHABLE_KEY');
    this.webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    this.platformFeePct =
      this.config.get<number>('STRIPE_PLATFORM_FEE_PCT') ?? 8;
    this.country = this.config.get<string>('STRIPE_CONNECT_COUNTRY') ?? 'MX';
    this.defaultCurrency =
      this.config.get<string>('STRIPE_CONNECT_DEFAULT_CURRENCY') ?? 'mxn';
    this.adminWebUrl =
      this.config.get<string>('ADMIN_WEB_URL') ?? 'http://localhost:7100';

    if (!secretKey) {
      this.client = null;
      this.logger.warn(
        'STRIPE_SECRET_KEY no definido — módulo Stripe en modo no-op',
      );
    } else {
      this.client = new StripeSdk(secretKey, {
        apiVersion: '2026-04-22.dahlia',
        typescript: true,
      });
    }
  }

  isEnabled(): boolean {
    return this.client !== null;
  }

  getPublishableKey(): string | undefined {
    return this.publishableKey;
  }

  getPlatformFeePct(): number {
    return this.platformFeePct;
  }

  getDefaultCurrency(): string {
    return this.defaultCurrency;
  }

  private requireClient(): Stripe {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'Pagos no configurados — STRIPE_SECRET_KEY ausente',
      );
    }
    return this.client;
  }

  // ── Connect (Standard) ─────────────────────────────────────────────────────

  async createConnectAccount(email: string): Promise<Stripe.Account> {
    return this.requireClient().accounts.create({
      type: 'standard',
      country: this.country,
      email,
      default_currency: this.defaultCurrency,
    });
  }

  async createOnboardingLink(
    stripeAccountId: string,
    venueId: string,
  ): Promise<Stripe.AccountLink> {
    const refreshUrl = `${this.adminWebUrl}/mi-local?stripe=refresh&venueId=${venueId}`;
    const returnUrl = `${this.adminWebUrl}/mi-local?stripe=return&venueId=${venueId}`;
    return this.requireClient().accountLinks.create({
      account: stripeAccountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });
  }

  async retrieveAccount(stripeAccountId: string): Promise<Stripe.Account> {
    return this.requireClient().accounts.retrieve(stripeAccountId);
  }

  // ── Payment Intents ────────────────────────────────────────────────────────

  async createPaymentIntent(params: {
    amountCents: number;
    currency: string;
    applicationFeeCents: number;
    connectedAccountId: string;
    metadata: Record<string, string>;
    idempotencyKey: string;
  }): Promise<Stripe.PaymentIntent> {
    return this.requireClient().paymentIntents.create(
      {
        amount: params.amountCents,
        currency: params.currency.toLowerCase(),
        application_fee_amount: params.applicationFeeCents,
        transfer_data: { destination: params.connectedAccountId },
        metadata: params.metadata,
        automatic_payment_methods: { enabled: true },
      },
      { idempotencyKey: params.idempotencyKey },
    );
  }

  async retrievePaymentIntent(
    paymentIntentId: string,
  ): Promise<Stripe.PaymentIntent> {
    return this.requireClient().paymentIntents.retrieve(paymentIntentId);
  }

  async cancelPaymentIntent(
    paymentIntentId: string,
  ): Promise<Stripe.PaymentIntent | null> {
    try {
      return await this.requireClient().paymentIntents.cancel(paymentIntentId);
    } catch (err) {
      this.logger.warn(
        `No se pudo cancelar PI ${paymentIntentId}: ${(err as Error).message}`,
      );
      return null;
    }
  }

  // ── Webhooks ───────────────────────────────────────────────────────────────

  constructWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
    if (!this.webhookSecret) {
      throw new ServiceUnavailableException(
        'STRIPE_WEBHOOK_SECRET no configurado',
      );
    }
    return this.requireClient().webhooks.constructEvent(
      rawBody,
      signature,
      this.webhookSecret,
    );
  }
}
