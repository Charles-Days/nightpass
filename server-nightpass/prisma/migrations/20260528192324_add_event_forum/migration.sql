-- CreateTable
CREATE TABLE "event_forum_posts" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "body" VARCHAR(280) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "event_forum_posts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_forum_posts_eventId_createdAt_idx" ON "event_forum_posts"("eventId", "createdAt");

-- CreateIndex
CREATE INDEX "event_forum_posts_userId_idx" ON "event_forum_posts"("userId");

-- AddForeignKey
ALTER TABLE "event_forum_posts" ADD CONSTRAINT "event_forum_posts_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_forum_posts" ADD CONSTRAINT "event_forum_posts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
