-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RewardKind" ADD VALUE 'BULK_PROMO';
ALTER TYPE "RewardKind" ADD VALUE 'PHYSICAL_BONUS_NPP';

-- AlterTable
ALTER TABLE "reward_redemptions" ADD COLUMN     "selectedOptionId" UUID;

-- AlterTable
ALTER TABLE "rewards" ADD COLUMN     "bonusNpp" INTEGER,
ADD COLUMN     "eventId" UUID,
ADD COLUMN     "minQuantity" INTEGER,
ADD COLUMN     "tierId" UUID;

-- CreateTable
CREATE TABLE "reward_options" (
    "id" UUID NOT NULL,
    "rewardId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reward_options_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reward_options_rewardId_idx" ON "reward_options"("rewardId");

-- CreateIndex
CREATE INDEX "rewards_eventId_idx" ON "rewards"("eventId");

-- AddForeignKey
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "event_tiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_options" ADD CONSTRAINT "reward_options_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "rewards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_selectedOptionId_fkey" FOREIGN KEY ("selectedOptionId") REFERENCES "reward_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;
