-- CreateEnum
CREATE TYPE "LocationPingSource" AS ENUM ('APP_OPEN', 'PASS_VIEW', 'REDEEM');

-- CreateTable
CREATE TABLE "location_pings" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "accuracyM" DOUBLE PRECISION,
    "source" "LocationPingSource" NOT NULL DEFAULT 'APP_OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "location_pings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "location_pings_userId_createdAt_idx" ON "location_pings"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "location_pings_createdAt_idx" ON "location_pings"("createdAt");

-- AddForeignKey
ALTER TABLE "location_pings" ADD CONSTRAINT "location_pings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
