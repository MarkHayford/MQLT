CREATE TABLE IF NOT EXISTS "StudyFloatingNotice" (
  "id" TEXT NOT NULL,
  "projectId" TEXT,
  "title" TEXT NOT NULL,
  "subtitle" TEXT NOT NULL,
  "tag" TEXT NOT NULL DEFAULT '研学进行中',
  "content" TEXT,
  "imageUrl" TEXT,
  "actionText" TEXT NOT NULL DEFAULT '进入研学详情',
  "actionType" TEXT NOT NULL DEFAULT 'project',
  "actionTarget" TEXT,
  "gradientStart" TEXT,
  "gradientEnd" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "StudyFloatingNotice_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "StudyFloatingNotice"
  ADD CONSTRAINT "StudyFloatingNotice_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "StudyProject"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "StudyFloatingNotice_enabled_sortOrder_idx"
  ON "StudyFloatingNotice"("enabled", "sortOrder");
