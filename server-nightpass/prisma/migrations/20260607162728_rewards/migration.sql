-- CreateEnum
CREATE TYPE "RewardKind" AS ENUM ('VENUE_PERK', 'TICKET_DISCOUNT');

-- CreateEnum
CREATE TYPE "RewardFunder" AS ENUM ('VENUE', 'PROMOTER', 'NIGHTPASS');

-- CreateEnum
CREATE TYPE "RewardDiscountType" AS ENUM ('NONE', 'PERCENT', 'FIXED');

-- CreateEnum
CREATE TYPE "RedemptionStatus" AS ENUM ('PENDING', 'USED', 'EXPIRED', 'REVERSED');

-- AlterEnum
ALTER TYPE "LoyaltyEventType" ADD VALUE 'REDEEM';

-- CreateTable
CREATE TABLE "rewards" (
    "id" UUID NOT NULL,
    "venueId" UUID,
    "promoterId" UUID,
    "kind" "RewardKind" NOT NULL,
    "funder" "RewardFunder" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "costNpp" INTEGER NOT NULL,
    "discountType" "RewardDiscountType" NOT NULL DEFAULT 'NONE',
    "discountValue" INTEGER NOT NULL DEFAULT 0,
    "maxDiscountCents" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "perUserLimit" INTEGER,
    "expiresInH" INTEGER NOT NULL DEFAULT 72,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reward_redemptions" (
    "id" UUID NOT NULL,
    "rewardId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "costNpp" INTEGER NOT NULL,
    "status" "RedemptionStatus" NOT NULL DEFAULT 'PENDING',
    "code" TEXT NOT NULL,
    "orderId" UUID,
    "appliedCents" INTEGER,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reward_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rewards_venueId_active_idx" ON "rewards"("venueId", "active");

-- CreateIndex
CREATE INDEX "rewards_promoterId_active_idx" ON "rewards"("promoterId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "reward_redemptions_code_key" ON "reward_redemptions"("code");

-- CreateIndex
CREATE INDEX "reward_redemptions_userId_status_idx" ON "reward_redemptions"("userId", "status");

-- CreateIndex
CREATE INDEX "reward_redemptions_rewardId_idx" ON "reward_redemptions"("rewardId");

-- AddForeignKey
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_promoterId_fkey" FOREIGN KEY ("promoterId") REFERENCES "promoters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "rewards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

