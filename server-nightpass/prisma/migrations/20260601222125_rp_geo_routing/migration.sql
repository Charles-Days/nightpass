-- AlterTable
ALTER TABLE "physical_payment_requests" ADD COLUMN     "assignedRpId" UUID;

-- AlterTable
ALTER TABLE "rp_profiles" ADD COLUMN     "city" TEXT,
ADD COLUMN     "state" TEXT;

-- CreateIndex
CREATE INDEX "physical_payment_requests_assignedRpId_status_idx" ON "physical_payment_requests"("assignedRpId", "status");

-- AddForeignKey
ALTER TABLE "physical_payment_requests" ADD CONSTRAINT "physical_payment_requests_assignedRpId_fkey" FOREIGN KEY ("assignedRpId") REFERENCES "rp_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
