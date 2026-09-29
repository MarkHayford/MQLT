ALTER TABLE "StudyProject"
  ADD COLUMN IF NOT EXISTS "documents" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "contactPhone" TEXT,
  ADD COLUMN IF NOT EXISTS "contactServiceTime" TEXT,
  ADD COLUMN IF NOT EXISTS "contactWechat" TEXT;

UPDATE "StudyProject"
SET "documents" = '[{"title":"2026年研学活动手册.pdf","size":"2.4MB","url":""},{"title":"研学营安全保障及应急预案","size":"1.1MB","url":""}]'
WHERE "documents" = '[]'::jsonb;

UPDATE "StudyProject"
SET
  "contactPhone" = COALESCE("contactPhone", '400-888-9999'),
  "contactServiceTime" = COALESCE("contactServiceTime", '服务时间 09:00 - 18:00')
WHERE "contactPhone" IS NULL AND "contactServiceTime" IS NULL AND "contactWechat" IS NULL;
