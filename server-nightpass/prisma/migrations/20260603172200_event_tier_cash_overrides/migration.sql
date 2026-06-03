-- CreateEnum
CREATE TYPE "CashFeeMode" AS ENUM ('ADD', 'SUBTRACT');

-- AlterTable
ALTER TABLE "event_tiers" ADD COLUMN     "cashExemptOverride" BOOLEAN,
ADD COLUMN     "cashFeeMode" "CashFeeMode",
ADD COLUMN     "cashFeePctOverride" DOUBLE PRECISION;
