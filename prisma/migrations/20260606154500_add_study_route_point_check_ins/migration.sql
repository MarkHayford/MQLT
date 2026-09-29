CREATE TABLE "StudyRoutePointCheckIn" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "routePointId" TEXT NOT NULL,
  "latitude" DECIMAL(10,6),
  "longitude" DECIMAL(10,6),
  "accuracy" DECIMAL(10,2),
  "checkedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "StudyRoutePointCheckIn_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudyRoutePointCheckIn_bookingId_routePointId_key" ON "StudyRoutePointCheckIn"("bookingId", "routePointId");
CREATE INDEX "StudyRoutePointCheckIn_projectId_userId_idx" ON "StudyRoutePointCheckIn"("projectId", "userId");
CREATE INDEX "StudyRoutePointCheckIn_routePointId_idx" ON "StudyRoutePointCheckIn"("routePointId");

ALTER TABLE "StudyRoutePointCheckIn" ADD CONSTRAINT "StudyRoutePointCheckIn_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "StudyBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudyRoutePointCheckIn" ADD CONSTRAINT "StudyRoutePointCheckIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudyRoutePointCheckIn" ADD CONSTRAINT "StudyRoutePointCheckIn_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "StudyProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudyRoutePointCheckIn" ADD CONSTRAINT "StudyRoutePointCheckIn_routePointId_fkey" FOREIGN KEY ("routePointId") REFERENCES "StudyRoutePoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
