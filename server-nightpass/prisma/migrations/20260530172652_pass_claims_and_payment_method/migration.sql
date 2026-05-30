-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('STRIPE', 'CASH');

-- CreateEnum
CREATE TYPE "PassClaimStatus" AS ENUM ('PENDING', 'CLAIMED', 'EXPIRED', 'CANCELLED');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'STRIPE';

-- CreateTable
CREATE TABLE "pass_claims" (
    "id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "eventId" UUID NOT NULL,
    "tierId" UUID NOT NULL,
    "issuedByRpId" UUID,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MXN',
    "status" "PassClaimStatus" NOT NULL DEFAULT 'PENDING',
    "claimedByUserId" UUID,
    "claimedAt" TIMESTAMP(3),
    "orderId" UUID,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pass_claims_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pass_claims_token_key" ON "pass_claims"("token");

-- CreateIndex
CREATE UNIQUE INDEX "pass_claims_orderId_key" ON "pass_claims"("orderId");

-- CreateIndex
CREATE INDEX "pass_claims_issuedByRpId_status_idx" ON "pass_claims"("issuedByRpId", "status");

-- CreateIndex
CREATE INDEX "pass_claims_eventId_status_idx" ON "pass_claims"("eventId", "status");

-- AddForeignKey
ALTER TABLE "pass_claims" ADD CONSTRAINT "pass_claims_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pass_claims" ADD CONSTRAINT "pass_claims_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "event_tiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pass_claims" ADD CONSTRAINT "pass_claims_issuedByRpId_fkey" FOREIGN KEY ("issuedByRpId") REFERENCES "rp_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pass_claims" ADD CONSTRAINT "pass_claims_claimedByUserId_fkey" FOREIGN KEY ("claimedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pass_claims" ADD CONSTRAINT "pass_claims_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
