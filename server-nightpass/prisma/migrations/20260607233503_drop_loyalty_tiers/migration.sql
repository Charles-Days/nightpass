-- AlterTable
ALTER TABLE "event_tiers" DROP COLUMN "minLoyaltyTier";

-- AlterTable
ALTER TABLE "user_loyalty_totals" DROP COLUMN "tier",
DROP COLUMN "tierUpdatedAt";

-- DropEnum
DROP TYPE "LoyaltyTier";

