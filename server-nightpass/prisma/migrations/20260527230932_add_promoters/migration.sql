-- CreateEnum
CREATE TYPE "PromoterStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "PromoterMemberRole" AS ENUM ('OWNER', 'STAFF');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Role" ADD VALUE 'PROMOTER';
ALTER TYPE "Role" ADD VALUE 'PROMOTER_STAFF';

-- DropForeignKey
ALTER TABLE "events" DROP CONSTRAINT "events_venueId_fkey";

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "externalVenueAddress" TEXT,
ADD COLUMN     "externalVenueCity" TEXT,
ADD COLUMN     "externalVenueLat" DOUBLE PRECISION,
ADD COLUMN     "externalVenueLng" DOUBLE PRECISION,
ADD COLUMN     "externalVenueName" TEXT,
ADD COLUMN     "promoterId" UUID,
ALTER COLUMN "venueId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "promoters" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "phone" TEXT,
    "instagram" TEXT,
    "website" TEXT,
    "bio" TEXT,
    "logoUrl" TEXT,
    "status" "PromoterStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promoters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promoter_members" (
    "userId" UUID NOT NULL,
    "promoterId" UUID NOT NULL,
    "role" "PromoterMemberRole" NOT NULL DEFAULT 'OWNER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promoter_members_pkey" PRIMARY KEY ("userId","promoterId")
);

-- CreateTable
CREATE TABLE "promoter_applications" (
    "id" UUID NOT NULL,
    "applicantUserId" UUID NOT NULL,
    "promoterName" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "phone" TEXT,
    "instagram" TEXT,
    "website" TEXT,
    "experience" TEXT NOT NULL,
    "eventTypes" TEXT[],
    "message" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "reviewedById" UUID,
    "reviewedAt" TIMESTAMP(3),
    "approvedPromoterId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promoter_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "promoters_slug_key" ON "promoters"("slug");

-- CreateIndex
CREATE INDEX "promoters_city_idx" ON "promoters"("city");

-- CreateIndex
CREATE INDEX "promoters_status_createdAt_idx" ON "promoters"("status", "createdAt");

-- CreateIndex
CREATE INDEX "promoter_members_promoterId_idx" ON "promoter_members"("promoterId");

-- CreateIndex
CREATE INDEX "promoter_applications_applicantUserId_status_idx" ON "promoter_applications"("applicantUserId", "status");

-- CreateIndex
CREATE INDEX "promoter_applications_status_createdAt_idx" ON "promoter_applications"("status", "createdAt");

-- CreateIndex
CREATE INDEX "events_promoterId_status_idx" ON "events"("promoterId", "status");

-- CreateIndex
CREATE INDEX "events_externalVenueCity_idx" ON "events"("externalVenueCity");

-- CreateIndex
CREATE UNIQUE INDEX "events_promoterId_slug_key" ON "events"("promoterId", "slug");

-- AddForeignKey
ALTER TABLE "promoter_members" ADD CONSTRAINT "promoter_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promoter_members" ADD CONSTRAINT "promoter_members_promoterId_fkey" FOREIGN KEY ("promoterId") REFERENCES "promoters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promoter_applications" ADD CONSTRAINT "promoter_applications_applicantUserId_fkey" FOREIGN KEY ("applicantUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promoter_applications" ADD CONSTRAINT "promoter_applications_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promoter_applications" ADD CONSTRAINT "promoter_applications_approvedPromoterId_fkey" FOREIGN KEY ("approvedPromoterId") REFERENCES "promoters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_promoterId_fkey" FOREIGN KEY ("promoterId") REFERENCES "promoters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

