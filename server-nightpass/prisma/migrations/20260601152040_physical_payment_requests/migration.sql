-- CreateEnum
CREATE TYPE "PhysicalPaymentRequestStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'EXPIRED');

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "allowCashPayment" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "event_rps" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "rpProfileId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_rps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "physical_payment_requests" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "tierId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MXN',
    "status" "PhysicalPaymentRequestStatus" NOT NULL DEFAULT 'PENDING',
    "contactPhone" TEXT,
    "note" TEXT,
    "confirmedByRpId" UUID,
    "confirmedAt" TIMESTAMP(3),
    "orderId" UUID,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "physical_payment_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_rps_rpProfileId_idx" ON "event_rps"("rpProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "event_rps_eventId_rpProfileId_key" ON "event_rps"("eventId", "rpProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "physical_payment_requests_orderId_key" ON "physical_payment_requests"("orderId");

-- CreateIndex
CREATE INDEX "physical_payment_requests_eventId_status_idx" ON "physical_payment_requests"("eventId", "status");

-- CreateIndex
CREATE INDEX "physical_payment_requests_userId_status_idx" ON "physical_payment_requests"("userId", "status");

-- CreateIndex
CREATE INDEX "physical_payment_requests_confirmedByRpId_status_idx" ON "physical_payment_requests"("confirmedByRpId", "status");

-- AddForeignKey
ALTER TABLE "event_rps" ADD CONSTRAINT "event_rps_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_rps" ADD CONSTRAINT "event_rps_rpProfileId_fkey" FOREIGN KEY ("rpProfileId") REFERENCES "rp_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "physical_payment_requests" ADD CONSTRAINT "physical_payment_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "physical_payment_requests" ADD CONSTRAINT "physical_payment_requests_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "physical_payment_requests" ADD CONSTRAINT "physical_payment_requests_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "event_tiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "physical_payment_requests" ADD CONSTRAINT "physical_payment_requests_confirmedByRpId_fkey" FOREIGN KEY ("confirmedByRpId") REFERENCES "rp_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "physical_payment_requests" ADD CONSTRAINT "physical_payment_requests_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
