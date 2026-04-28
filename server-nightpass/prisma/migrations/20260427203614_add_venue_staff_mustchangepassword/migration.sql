-- CreateEnum
CREATE TYPE "VenueStaffRole" AS ENUM ('MANAGER', 'SCANNER');

-- CreateEnum
CREATE TYPE "VenueStaffStatus" AS ENUM ('PENDING', 'ACTIVE', 'REVOKED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "venue_staff" (
    "id" UUID NOT NULL,
    "venueId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "invitedById" UUID NOT NULL,
    "staffRole" "VenueStaffRole" NOT NULL DEFAULT 'SCANNER',
    "status" "VenueStaffStatus" NOT NULL DEFAULT 'PENDING',
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "joinedAt" TIMESTAMP(3),

    CONSTRAINT "venue_staff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "venue_staff_userId_idx" ON "venue_staff"("userId");

-- CreateIndex
CREATE INDEX "venue_staff_venueId_status_idx" ON "venue_staff"("venueId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "venue_staff_venueId_userId_key" ON "venue_staff"("venueId", "userId");

-- AddForeignKey
ALTER TABLE "venue_staff" ADD CONSTRAINT "venue_staff_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venue_staff" ADD CONSTRAINT "venue_staff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venue_staff" ADD CONSTRAINT "venue_staff_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
