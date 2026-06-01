import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CashWalletTxType, Prisma, Role } from '@prisma/client';
import type { Stripe } from 'stripe/cjs/stripe.core';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from '../stripe/stripe.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';

/** Referencia al dueño de un wallet: venue O promoter (exactamente uno). */
export type OwnerRef = { venueId: string } | { promoterId: string };

type Db = PrismaService | Prisma.TransactionClient;

const MIN_TOPUP_CENTS = 5000; // $50 MXN mínimo de recarga
const MAX_TOPUP_CENTS = 5_000_000; // $50,000 MXN tope por recarga

@Injectable()
export class CashWalletService {
  private readonly logger = new Logger(CashWalletService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
  ) {}

  // ── Resolución / autorización ─────────────────────────────────────────────

  private ownerWhere(ref: OwnerRef): Prisma.CashWalletWhereInput {
    return 'venueId' in ref
      ? { venueId: ref.venueId }
      : { promoterId: ref.promoterId };
  }

  /** Lanza ForbiddenException si el usuario no es dueño del venue/promoter. */
  async assertOwnership(user: AuthUser, ref: OwnerRef): Promise<void> {
    if (user.role === Role.ADMIN) return;
    if ('venueId' in ref) {
      const owns = await this.prisma.venueOwner.findFirst({
        where: { venueId: ref.venueId, userId: user.id },
        select: { venueId: true },
      });
      if (!owns) throw new ForbiddenException('No eres dueño de este local');
    } else {
      const member = await this.prisma.promoterMember.findFirst({
        where: { promoterId: ref.promoterId, userId: user.id },
        select: { promoterId: true },
      });
      if (!member)
        throw new ForbiddenException('No perteneces a este organizador');
    }
  }

  /** Crea el wallet si no existe (idempotente). Acepta cliente transaccional. */
  async getOrCreate(db: Db, ref: OwnerRef) {
    const existing = await db.cashWallet.findFirst({
      where: this.ownerWhere(ref),
    });
    if (existing) return existing;
    return db.cashWallet.create({ data: { ...ref } });
  }

  // ── Lectura para el panel ─────────────────────────────────────────────────

  async getView(user: AuthUser, ref: OwnerRef) {
    await this.assertOwnership(user, ref);

    const owner =
      'venueId' in ref
        ? await this.prisma.venue.findUnique({
            where: { id: ref.venueId },
            select: { platformFeePct: true, cashCommissionExempt: true },
          })
        : await this.prisma.promoter.findUnique({
            where: { id: ref.promoterId },
            select: { platformFeePct: true, cashCommissionExempt: true },
          });
    if (!owner) throw new NotFoundException('Organizador no encontrado');

    const wallet = await this.getOrCreate(this.prisma, ref);
    const transactions = await this.prisma.cashWalletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const effectiveFeePct =
      owner.platformFeePct != null
        ? owner.platformFeePct
        : this.stripe.getPlatformFeePct();

    return {
      balanceCents: wallet.balanceCents,
      currency: wallet.currency,
      cashCommissionExempt: owner.cashCommissionExempt,
      effectiveFeePct,
      transactions: transactions.map((t) => ({
        id: t.id,
        type: t.type,
        amountCents: t.amountCents,
        balanceAfterCents: t.balanceAfterCents,
        currency: t.currency,
        note: t.note,
        createdAt: t.createdAt,
      })),
    };
  }

  // ── Recarga vía Stripe (PaymentIntent a la plataforma) ────────────────────

  async createTopup(user: AuthUser, ref: OwnerRef, amountCents: number) {
    await this.assertOwnership(user, ref);

    if (!Number.isInteger(amountCents)) {
      throw new BadRequestException('Monto inválido');
    }
    if (amountCents < MIN_TOPUP_CENTS) {
      throw new BadRequestException(
        `La recarga mínima es de $${(MIN_TOPUP_CENTS / 100).toFixed(0)} MXN`,
      );
    }
    if (amountCents > MAX_TOPUP_CENTS) {
      throw new BadRequestException('Monto de recarga demasiado alto');
    }
    if (!this.stripe.isEnabled()) {
      throw new BadRequestException('Pagos no configurados en este servidor');
    }

    const wallet = await this.getOrCreate(this.prisma, ref);

    const pi = await this.stripe.createPlatformPaymentIntent({
      amountCents,
      currency: wallet.currency,
      metadata: {
        kind: 'cash_wallet_topup',
        walletId: wallet.id,
        amountCents: String(amountCents),
      },
      idempotencyKey: `cash-topup-${wallet.id}-${amountCents}-${Date.now()}`,
    });

    if (!pi.client_secret) {
      throw new BadRequestException('Stripe no devolvió client_secret');
    }

    return {
      clientSecret: pi.client_secret,
      publishableKey: this.stripe.getPublishableKey(),
      amountCents,
      currency: wallet.currency,
    };
  }

  /**
   * Acredita una recarga al confirmarse el pago (llamado desde el webhook).
   * Idempotente vía `stripePaymentIntentId` único en CashWalletTransaction.
   */
  async creditFromTopup(pi: Stripe.PaymentIntent): Promise<void> {
    const walletId = pi.metadata?.walletId;
    if (!walletId) {
      this.logger.warn(`Topup PI ${pi.id} sin walletId en metadata`);
      return;
    }
    const amountCents = pi.amount_received || pi.amount;
    if (!amountCents || amountCents <= 0) return;

    await this.prisma.$transaction(async (tx) => {
      const already = await tx.cashWalletTransaction.findUnique({
        where: { stripePaymentIntentId: pi.id },
        select: { id: true },
      });
      if (already) return;

      const wallet = await tx.cashWallet.findUnique({
        where: { id: walletId },
      });
      if (!wallet) {
        this.logger.warn(`Topup PI ${pi.id}: wallet ${walletId} no existe`);
        return;
      }

      const balanceAfter = wallet.balanceCents + amountCents;
      await tx.cashWallet.update({
        where: { id: wallet.id },
        data: { balanceCents: balanceAfter },
      });
      await tx.cashWalletTransaction.create({
        data: {
          walletId: wallet.id,
          type: CashWalletTxType.TOPUP,
          amountCents,
          balanceAfterCents: balanceAfter,
          currency: wallet.currency,
          stripePaymentIntentId: pi.id,
          note: 'Recarga de saldo',
        },
      });
    });

    this.logger.log(`CashWallet ${walletId} recargado +${amountCents} (PI ${pi.id})`);
  }

  // ── Débito de comisión al confirmar un pase de efectivo ───────────────────

  /**
   * Debita `feeCents` del wallet del organizador DENTRO de una transacción
   * existente (la misma que crea la Order y emite los pases). Lanza
   * ConflictException si no hay saldo — el RP no podrá confirmar hasta recargar.
   */
  async debitCashFee(
    tx: Prisma.TransactionClient,
    ref: OwnerRef,
    feeCents: number,
    meta: { currency: string; physicalRequestId?: string; orderId?: string },
  ): Promise<void> {
    if (feeCents <= 0) return;

    const wallet = await this.getOrCreate(tx, ref);
    if (wallet.balanceCents < feeCents) {
      throw new BadRequestException(
        'El organizador no tiene saldo suficiente para la comisión de este pase en efectivo. Debe recargar su saldo antes de confirmar.',
      );
    }

    const balanceAfter = wallet.balanceCents - feeCents;
    await tx.cashWallet.update({
      where: { id: wallet.id },
      data: { balanceCents: balanceAfter },
    });
    await tx.cashWalletTransaction.create({
      data: {
        walletId: wallet.id,
        type: CashWalletTxType.CASH_FEE_DEBIT,
        amountCents: -feeCents,
        balanceAfterCents: balanceAfter,
        currency: meta.currency,
        physicalRequestId: meta.physicalRequestId,
        orderId: meta.orderId,
        note: 'Comisión venta en efectivo',
      },
    });
  }

  // ── Ajuste manual del admin ───────────────────────────────────────────────

  async adminAdjust(ref: OwnerRef, amountCents: number, note?: string) {
    if (!Number.isInteger(amountCents) || amountCents === 0) {
      throw new BadRequestException('Monto de ajuste inválido');
    }
    return this.prisma.$transaction(async (tx) => {
      const wallet = await this.getOrCreate(tx, ref);
      const balanceAfter = wallet.balanceCents + amountCents;
      if (balanceAfter < 0) {
        throw new BadRequestException('El ajuste dejaría el saldo en negativo');
      }
      await tx.cashWallet.update({
        where: { id: wallet.id },
        data: { balanceCents: balanceAfter },
      });
      await tx.cashWalletTransaction.create({
        data: {
          walletId: wallet.id,
          type: CashWalletTxType.ADJUSTMENT,
          amountCents,
          balanceAfterCents: balanceAfter,
          currency: wallet.currency,
          note: note?.trim() || 'Ajuste manual',
        },
      });
      return { balanceCents: balanceAfter, currency: wallet.currency };
    });
  }
}
