-- CreateEnum
CREATE TYPE "LoyaltyTier" AS ENUM ('ROOKIE', 'REGULAR', 'INSIDER', 'VIP');

-- CreateEnum
CREATE TYPE "LoyaltyEventType" AS ENUM ('EVENT_CHECKIN', 'VENUE_CHECKIN', 'FIRST_VENUE_BONUS', 'STREAK_DAILY_BONUS', 'STREAK_MILESTONE', 'BRING_FRIEND_BONUS', 'ADMIN_ADJUST');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LocationPingSource" ADD VALUE 'SCAN_REDEEM';
ALTER TYPE "LocationPingSource" ADD VALUE 'VENUE_CHECKIN';

-- AlterTable
ALTER TABLE "event_tiers" ADD COLUMN     "minLoyaltyTier" "LoyaltyTier";

-- AlterTable
ALTER TABLE "venues" ADD COLUMN     "checkinQrIssuedAt" TIMESTAMP(3),
ADD COLUMN     "checkinQrSecret" TEXT;

-- CreateTable
CREATE TABLE "loyalty_events" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "LoyaltyEventType" NOT NULL,
    "points" INTEGER NOT NULL,
    "multiplier" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "venueId" UUID,
    "eventId" UUID,
    "passId" UUID,
    "idempotencyKey" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "loyalty_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_streaks" (
    "userId" UUID NOT NULL,
    "currentDays" INTEGER NOT NULL DEFAULT 0,
    "longestDays" INTEGER NOT NULL DEFAULT 0,
    "lastCheckinDate" TIMESTAMP(3),
    "freezesRemaining" INTEGER NOT NULL DEFAULT 2,
    "freezesRefreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_streaks_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "user_loyalty_totals" (
    "userId" UUID NOT NULL,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "yearPoints" INTEGER NOT NULL DEFAULT 0,
    "tier" "LoyaltyTier" NOT NULL DEFAULT 'ROOKIE',
    "tierUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_loyalty_totals_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_events_idempotencyKey_key" ON "loyalty_events"("idempotencyKey");

-- CreateIndex
CREATE INDEX "loyalty_events_userId_occurredAt_idx" ON "loyalty_events"("userId", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "loyalty_events_venueId_occurredAt_idx" ON "loyalty_events"("venueId", "occurredAt" DESC);

-- AddForeignKey
ALTER TABLE "loyalty_events" ADD CONSTRAINT "loyalty_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_events" ADD CONSTRAINT "loyalty_events_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_events" ADD CONSTRAINT "loyalty_events_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_events" ADD CONSTRAINT "loyalty_events_passId_fkey" FOREIGN KEY ("passId") REFERENCES "passes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_streaks" ADD CONSTRAINT "user_streaks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_loyalty_totals" ADD CONSTRAINT "user_loyalty_totals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
