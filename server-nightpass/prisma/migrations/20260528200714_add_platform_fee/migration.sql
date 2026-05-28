-- AlterTable
ALTER TABLE "promoters" ADD COLUMN     "platformFeePct" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "venues" ADD COLUMN     "platformFeePct" DOUBLE PRECISION NOT NULL DEFAULT 0;
