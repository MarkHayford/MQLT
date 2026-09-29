ALTER TABLE "StudyBooking"
  ADD COLUMN IF NOT EXISTS "bookingGroupId" TEXT,
  ADD COLUMN IF NOT EXISTS "bookerId" TEXT,
  ADD COLUMN IF NOT EXISTS "participantName" TEXT,
  ADD COLUMN IF NOT EXISTS "participantPhone" TEXT,
  ADD COLUMN IF NOT EXISTS "participantIdCard" TEXT,
  ADD COLUMN IF NOT EXISTS "participantRole" TEXT NOT NULL DEFAULT 'BOOKER',
  ADD COLUMN IF NOT EXISTS "participantIndex" INTEGER NOT NULL DEFAULT 0;

UPDATE "StudyBooking"
SET
  "bookingGroupId" = COALESCE("bookingGroupId", "id"),
  "bookerId" = COALESCE("bookerId", "userId")
WHERE "bookingGroupId" IS NULL OR "bookerId" IS NULL;

CREATE INDEX IF NOT EXISTS "StudyBooking_bookingGroupId_idx" ON "StudyBooking"("bookingGroupId");
CREATE INDEX IF NOT EXISTS "StudyBooking_bookerId_idx" ON "StudyBooking"("bookerId");
