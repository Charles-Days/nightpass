-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'CLAIMED', 'CANCELLED', 'EXPIRED');

-- CreateTable
CREATE TABLE "pass_transfers" (
    "id" UUID NOT NULL,
    "passId" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "fromUserId" UUID NOT NULL,
    "toUserId" UUID,
    "status" "TransferStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pass_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pass_transfers_token_key" ON "pass_transfers"("token");

-- CreateIndex
CREATE INDEX "pass_transfers_passId_status_idx" ON "pass_transfers"("passId", "status");

-- CreateIndex
CREATE INDEX "pass_transfers_fromUserId_status_idx" ON "pass_transfers"("fromUserId", "status");

-- AddForeignKey
ALTER TABLE "pass_transfers" ADD CONSTRAINT "pass_transfers_passId_fkey" FOREIGN KEY ("passId") REFERENCES "passes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pass_transfers" ADD CONSTRAINT "pass_transfers_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pass_transfers" ADD CONSTRAINT "pass_transfers_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
