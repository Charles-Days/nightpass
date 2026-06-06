-- CreateTable
CREATE TABLE "analytics_events" (
    "id" UUID NOT NULL,
    "visitorId" TEXT NOT NULL,
    "userId" UUID,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "eventId" UUID,
    "referrer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "analytics_events_name_createdAt_idx" ON "analytics_events"("name", "createdAt");

-- CreateIndex
CREATE INDEX "analytics_events_visitorId_createdAt_idx" ON "analytics_events"("visitorId", "createdAt");

-- CreateIndex
CREATE INDEX "analytics_events_createdAt_idx" ON "analytics_events"("createdAt");
