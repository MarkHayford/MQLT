ALTER TABLE "StudyProject" ADD COLUMN IF NOT EXISTS "liveStage" TEXT NOT NULL DEFAULT 'not_started';
ALTER TABLE "StudyProject" ADD COLUMN IF NOT EXISTS "liveStartedAt" TIMESTAMP(3);
ALTER TABLE "StudyProject" ADD COLUMN IF NOT EXISTS "departureStartedAt" TIMESTAMP(3);
ALTER TABLE "StudyProject" ADD COLUMN IF NOT EXISTS "studyStartedAt" TIMESTAMP(3);
ALTER TABLE "StudyProject" ADD COLUMN IF NOT EXISTS "liveEndedAt" TIMESTAMP(3);
ALTER TABLE "StudyProject" ADD COLUMN IF NOT EXISTS "departureMode" TEXT NOT NULL DEFAULT 'walk';
ALTER TABLE "StudyProject" ADD COLUMN IF NOT EXISTS "departureTitle" TEXT;
ALTER TABLE "StudyProject" ADD COLUMN IF NOT EXISTS "departureLatitude" DECIMAL(10,6);
ALTER TABLE "StudyProject" ADD COLUMN IF NOT EXISTS "departureLongitude" DECIMAL(10,6);
ALTER TABLE "StudyProject" ADD COLUMN IF NOT EXISTS "dropoffTitle" TEXT;
ALTER TABLE "StudyProject" ADD COLUMN IF NOT EXISTS "dropoffLatitude" DECIMAL(10,6);
ALTER TABLE "StudyProject" ADD COLUMN IF NOT EXISTS "dropoffLongitude" DECIMAL(10,6);
ALTER TABLE "StudyProject" ADD COLUMN IF NOT EXISTS "vehiclePlateNo" TEXT;
ALTER TABLE "StudyProject" ADD COLUMN IF NOT EXISTS "driverName" TEXT;
ALTER TABLE "StudyProject" ADD COLUMN IF NOT EXISTS "driverPhone" TEXT;

UPDATE "StudyProject"
SET "liveStage" = CASE
  WHEN "status" = '已结束' THEN 'ended'
  WHEN "status" = '正在进行中' THEN 'study_active'
  ELSE COALESCE(NULLIF("liveStage", ''), 'not_started')
END
WHERE "liveStage" IS NULL OR "liveStage" = 'not_started';
