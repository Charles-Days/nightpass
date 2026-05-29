-- CreateTable
CREATE TABLE "event_tier_prices" (
    "id" UUID NOT NULL,
    "tierId" UUID NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "daysBeforeEvent" INTEGER NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_tier_prices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_tier_prices_tierId_idx" ON "event_tier_prices"("tierId");

-- AddForeignKey
ALTER TABLE "event_tier_prices" ADD CONSTRAINT "event_tier_prices_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "event_tiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
