CREATE TABLE IF NOT EXISTS "StudyProjectAdmin" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudyProjectAdmin_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StudyProjectAdmin_projectId_userId_key" ON "StudyProjectAdmin"("projectId", "userId");
CREATE INDEX IF NOT EXISTS "StudyProjectAdmin_userId_idx" ON "StudyProjectAdmin"("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'StudyProjectAdmin_projectId_fkey'
  ) THEN
    ALTER TABLE "StudyProjectAdmin"
    ADD CONSTRAINT "StudyProjectAdmin_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "StudyProject"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'StudyProjectAdmin_userId_fkey'
  ) THEN
    ALTER TABLE "StudyProjectAdmin"
    ADD CONSTRAINT "StudyProjectAdmin_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
