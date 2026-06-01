-- CreateIndex
CREATE INDEX "location_pings_createdAt_latitude_longitude_idx" ON "location_pings"("createdAt", "latitude", "longitude");

-- CreateIndex
CREATE INDEX "orders_eventId_paymentMethod_createdAt_idx" ON "orders"("eventId", "paymentMethod", "createdAt");

-- CreateIndex
CREATE INDEX "passes_eventId_createdAt_idx" ON "passes"("eventId", "createdAt");
