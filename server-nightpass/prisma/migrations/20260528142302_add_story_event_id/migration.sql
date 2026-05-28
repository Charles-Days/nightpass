-- AlterTable
ALTER TABLE "stories" ADD COLUMN     "eventId" UUID,
ALTER COLUMN "venueId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "stories_eventId_expiresAt_idx" ON "stories"("eventId", "expiresAt");

-- AddForeignKey
ALTER TABLE "stories" ADD CONSTRAINT "stories_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
