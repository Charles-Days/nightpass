-- AlterTable
ALTER TABLE "rewards" ADD COLUMN     "endsAt" TIMESTAMP(3),
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "startsAt" TIMESTAMP(3);
