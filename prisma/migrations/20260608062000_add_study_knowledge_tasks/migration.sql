ALTER TABLE "StudyRoutePoint"
  ADD COLUMN IF NOT EXISTS "knowledgeEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "knowledgeVideoTitle" TEXT,
  ADD COLUMN IF NOT EXISTS "knowledgeVideoUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "knowledgeQuestion" TEXT,
  ADD COLUMN IF NOT EXISTS "knowledgeOptions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "knowledgeAnswerIndex" INTEGER,
  ADD COLUMN IF NOT EXISTS "knowledgeGrantPrize" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "knowledgePrizeProductId" TEXT,
  ADD COLUMN IF NOT EXISTS "knowledgePrizeQuantity" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "knowledgeGrantPoints" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "knowledgePointsAmount" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "StudyKnowledgeTaskCompletion" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "routePointId" TEXT NOT NULL,
  "answerIndex" INTEGER NOT NULL,
  "prizeGrantId" TEXT,
  "pointRecordId" TEXT,
  "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudyKnowledgeTaskCompletion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StudyKnowledgeTaskCompletion_bookingId_routePointId_key"
  ON "StudyKnowledgeTaskCompletion"("bookingId", "routePointId");
CREATE UNIQUE INDEX IF NOT EXISTS "StudyKnowledgeTaskCompletion_prizeGrantId_key"
  ON "StudyKnowledgeTaskCompletion"("prizeGrantId");
CREATE UNIQUE INDEX IF NOT EXISTS "StudyKnowledgeTaskCompletion_pointRecordId_key"
  ON "StudyKnowledgeTaskCompletion"("pointRecordId");
CREATE INDEX IF NOT EXISTS "StudyKnowledgeTaskCompletion_projectId_userId_idx"
  ON "StudyKnowledgeTaskCompletion"("projectId", "userId");
CREATE INDEX IF NOT EXISTS "StudyKnowledgeTaskCompletion_routePointId_idx"
  ON "StudyKnowledgeTaskCompletion"("routePointId");
CREATE INDEX IF NOT EXISTS "StudyKnowledgeTaskCompletion_prizeGrantId_idx"
  ON "StudyKnowledgeTaskCompletion"("prizeGrantId");
CREATE INDEX IF NOT EXISTS "StudyKnowledgeTaskCompletion_pointRecordId_idx"
  ON "StudyKnowledgeTaskCompletion"("pointRecordId");
CREATE INDEX IF NOT EXISTS "StudyRoutePoint_knowledgePrizeProductId_idx"
  ON "StudyRoutePoint"("knowledgePrizeProductId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'StudyRoutePoint_knowledgePrizeProductId_fkey'
  ) THEN
    ALTER TABLE "StudyRoutePoint"
      ADD CONSTRAINT "StudyRoutePoint_knowledgePrizeProductId_fkey"
      FOREIGN KEY ("knowledgePrizeProductId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'StudyKnowledgeTaskCompletion_userId_fkey'
  ) THEN
    ALTER TABLE "StudyKnowledgeTaskCompletion"
      ADD CONSTRAINT "StudyKnowledgeTaskCompletion_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'StudyKnowledgeTaskCompletion_projectId_fkey'
  ) THEN
    ALTER TABLE "StudyKnowledgeTaskCompletion"
      ADD CONSTRAINT "StudyKnowledgeTaskCompletion_projectId_fkey"
      FOREIGN KEY ("projectId") REFERENCES "StudyProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'StudyKnowledgeTaskCompletion_bookingId_fkey'
  ) THEN
    ALTER TABLE "StudyKnowledgeTaskCompletion"
      ADD CONSTRAINT "StudyKnowledgeTaskCompletion_bookingId_fkey"
      FOREIGN KEY ("bookingId") REFERENCES "StudyBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'StudyKnowledgeTaskCompletion_routePointId_fkey'
  ) THEN
    ALTER TABLE "StudyKnowledgeTaskCompletion"
      ADD CONSTRAINT "StudyKnowledgeTaskCompletion_routePointId_fkey"
      FOREIGN KEY ("routePointId") REFERENCES "StudyRoutePoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'StudyKnowledgeTaskCompletion_prizeGrantId_fkey'
  ) THEN
    ALTER TABLE "StudyKnowledgeTaskCompletion"
      ADD CONSTRAINT "StudyKnowledgeTaskCompletion_prizeGrantId_fkey"
      FOREIGN KEY ("prizeGrantId") REFERENCES "StudyPrizeGrant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'StudyKnowledgeTaskCompletion_pointRecordId_fkey'
  ) THEN
    ALTER TABLE "StudyKnowledgeTaskCompletion"
      ADD CONSTRAINT "StudyKnowledgeTaskCompletion_pointRecordId_fkey"
      FOREIGN KEY ("pointRecordId") REFERENCES "PointRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
