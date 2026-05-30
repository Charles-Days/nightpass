-- AlterTable
ALTER TABLE "pass_claims" ADD COLUMN     "generatedByAdminId" UUID;

-- AddForeignKey
ALTER TABLE "pass_claims" ADD CONSTRAINT "pass_claims_generatedByAdminId_fkey" FOREIGN KEY ("generatedByAdminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
