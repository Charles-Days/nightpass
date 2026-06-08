-- AlterTable
ALTER TABLE "physical_payment_requests" ADD COLUMN     "pickupAt" TIMESTAMP(3),
ADD COLUMN     "pickupPointId" UUID;

-- CreateTable
CREATE TABLE "rp_pickup_points" (
    "id" UUID NOT NULL,
    "rpProfileId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "mapsUrl" TEXT,
    "windows" JSONB NOT NULL DEFAULT '[]',
    "isVenueDoor" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rp_pickup_points_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rp_pickup_points_rpProfileId_isActive_idx" ON "rp_pickup_points"("rpProfileId", "isActive");

-- CreateIndex
CREATE INDEX "physical_payment_requests_pickupPointId_status_idx" ON "physical_payment_requests"("pickupPointId", "status");

-- AddForeignKey
ALTER TABLE "physical_payment_requests" ADD CONSTRAINT "physical_payment_requests_pickupPointId_fkey" FOREIGN KEY ("pickupPointId") REFERENCES "rp_pickup_points"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rp_pickup_points" ADD CONSTRAINT "rp_pickup_points_rpProfileId_fkey" FOREIGN KEY ("rpProfileId") REFERENCES "rp_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

