-- CreateEnum
CREATE TYPE "PassClaimChannel" AS ENUM ('QR', 'LINK');

-- AlterTable
ALTER TABLE "pass_claims" ADD COLUMN     "channel" "PassClaimChannel" NOT NULL DEFAULT 'QR';
