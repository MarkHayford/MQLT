CREATE TABLE "StudyLiveLocation" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "bookingId" TEXT,
  "latitude" DECIMAL(10,6) NOT NULL,
  "longitude" DECIMAL(10,6) NOT NULL,
  "accuracy" DECIMAL(10,2),
  "speed" DECIMAL(10,2),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "StudyLiveLocation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudyLiveLocation_projectId_userId_key" ON "StudyLiveLocation"("projectId", "userId");
CREATE INDEX "StudyLiveLocation_projectId_updatedAt_idx" ON "StudyLiveLocation"("projectId", "updatedAt");
CREATE INDEX "StudyLiveLocation_bookingId_idx" ON "StudyLiveLocation"("bookingId");

ALTER TABLE "StudyLiveLocation"
  ADD CONSTRAINT "StudyLiveLocation_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "StudyProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudyLiveLocation"
  ADD CONSTRAINT "StudyLiveLocation_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudyLiveLocation"
  ADD CONSTRAINT "StudyLiveLocation_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "StudyBooking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
