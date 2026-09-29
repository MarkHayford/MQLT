ALTER TABLE "StudyRoutePoint" ADD COLUMN "checkInMode" TEXT NOT NULL DEFAULT 'location';

UPDATE "StudyRoutePoint"
SET "checkInMode" = 'location'
WHERE "checkInMode" IS NULL OR "checkInMode" NOT IN ('location', 'scan');
