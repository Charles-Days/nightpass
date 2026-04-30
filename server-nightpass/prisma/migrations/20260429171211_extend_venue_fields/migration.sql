-- AlterTable
ALTER TABLE "venues" ADD COLUMN     "dressCode" TEXT,
ADD COLUMN     "menuUrl" TEXT,
ADD COLUMN     "minAge" INTEGER,
ADD COLUMN     "musicTypes" TEXT[],
ADD COLUMN     "socialLinks" JSONB;
