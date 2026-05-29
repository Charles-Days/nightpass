-- CreateEnum
CREATE TYPE "RpCommissionType" AS ENUM ('PER_N_TICKETS', 'PERCENTAGE');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'RP';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "referredByRpId" UUID;

-- CreateTable
CREATE TABLE "rp_profiles" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "promoterId" UUID,
    "rpCode" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rp_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rp_commission_rules" (
    "id" UUID NOT NULL,
    "rpProfileId" UUID NOT NULL,
    "eventId" UUID,
    "type" "RpCommissionType" NOT NULL DEFAULT 'PER_N_TICKETS',
    "nTickets" INTEGER,
    "rewardCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'MXN',
    "percentage" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rp_commission_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rp_profiles_userId_key" ON "rp_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "rp_profiles_rpCode_key" ON "rp_profiles"("rpCode");

-- CreateIndex
CREATE INDEX "rp_profiles_rpCode_idx" ON "rp_profiles"("rpCode");

-- CreateIndex
CREATE INDEX "rp_profiles_promoterId_idx" ON "rp_profiles"("promoterId");

-- CreateIndex
CREATE INDEX "rp_commission_rules_rpProfileId_idx" ON "rp_commission_rules"("rpProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "rp_commission_rules_rpProfileId_eventId_key" ON "rp_commission_rules"("rpProfileId", "eventId");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_referredByRpId_fkey" FOREIGN KEY ("referredByRpId") REFERENCES "rp_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rp_profiles" ADD CONSTRAINT "rp_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rp_profiles" ADD CONSTRAINT "rp_profiles_promoterId_fkey" FOREIGN KEY ("promoterId") REFERENCES "promoters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rp_commission_rules" ADD CONSTRAINT "rp_commission_rules_rpProfileId_fkey" FOREIGN KEY ("rpProfileId") REFERENCES "rp_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rp_commission_rules" ADD CONSTRAINT "rp_commission_rules_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
