-- AlterTable
ALTER TABLE "stripe_accounts" ADD COLUMN     "promoterId" UUID,
ALTER COLUMN "venueId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "stripe_accounts_promoterId_key" ON "stripe_accounts"("promoterId");

-- AddForeignKey
ALTER TABLE "stripe_accounts" ADD CONSTRAINT "stripe_accounts_promoterId_fkey" FOREIGN KEY ("promoterId") REFERENCES "promoters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

