-- CreateEnum
CREATE TYPE "CashWalletTxType" AS ENUM ('TOPUP', 'CASH_FEE_DEBIT', 'ADJUSTMENT', 'REVERSAL');

-- AlterTable
ALTER TABLE "promoters" ADD COLUMN     "cashCommissionExempt" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "venues" ADD COLUMN     "cashCommissionExempt" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "cash_wallets" (
    "id" UUID NOT NULL,
    "venueId" UUID,
    "promoterId" UUID,
    "balanceCents" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'MXN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_wallet_transactions" (
    "id" UUID NOT NULL,
    "walletId" UUID NOT NULL,
    "type" "CashWalletTxType" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "balanceAfterCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MXN',
    "note" TEXT,
    "physicalRequestId" UUID,
    "orderId" UUID,
    "stripePaymentIntentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cash_wallets_venueId_key" ON "cash_wallets"("venueId");

-- CreateIndex
CREATE UNIQUE INDEX "cash_wallets_promoterId_key" ON "cash_wallets"("promoterId");

-- CreateIndex
CREATE UNIQUE INDEX "cash_wallet_transactions_stripePaymentIntentId_key" ON "cash_wallet_transactions"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "cash_wallet_transactions_walletId_createdAt_idx" ON "cash_wallet_transactions"("walletId", "createdAt");

-- AddForeignKey
ALTER TABLE "cash_wallets" ADD CONSTRAINT "cash_wallets_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_wallets" ADD CONSTRAINT "cash_wallets_promoterId_fkey" FOREIGN KEY ("promoterId") REFERENCES "promoters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_wallet_transactions" ADD CONSTRAINT "cash_wallet_transactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "cash_wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
