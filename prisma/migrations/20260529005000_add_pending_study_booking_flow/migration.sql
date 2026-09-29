ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'PENDING' BEFORE 'UNPAID';

CREATE TABLE IF NOT EXISTS "StudyProjectOrganizer" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "StudyProjectOrganizer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StudyProjectOrganizer_projectId_userId_key"
  ON "StudyProjectOrganizer"("projectId", "userId");

CREATE INDEX IF NOT EXISTS "StudyProjectOrganizer_userId_idx"
  ON "StudyProjectOrganizer"("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'StudyProjectOrganizer_projectId_fkey'
  ) THEN
    ALTER TABLE "StudyProjectOrganizer"
      ADD CONSTRAINT "StudyProjectOrganizer_projectId_fkey"
      FOREIGN KEY ("projectId") REFERENCES "StudyProject"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'StudyProjectOrganizer_userId_fkey'
  ) THEN
    ALTER TABLE "StudyProjectOrganizer"
      ADD CONSTRAINT "StudyProjectOrganizer_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "StudyBooking"
  ADD COLUMN IF NOT EXISTS "participantVerifiedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "participantVerifyMessage" TEXT;
