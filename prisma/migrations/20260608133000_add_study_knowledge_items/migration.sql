ALTER TABLE "StudyRoutePoint" ADD COLUMN IF NOT EXISTS "knowledgeItems" JSONB NOT NULL DEFAULT '[]';

UPDATE "StudyRoutePoint"
SET "knowledgeItems" = jsonb_build_array(jsonb_build_object(
  'title', COALESCE("knowledgeVideoTitle", ''),
  'videoTitle', COALESCE("knowledgeVideoTitle", ''),
  'videoUrl', COALESCE("knowledgeVideoUrl", ''),
  'questions', COALESCE("knowledgeQuestions"::jsonb, '[]'::jsonb)
))
WHERE "knowledgeEnabled" = true
  AND "knowledgeItems" = '[]'::jsonb
  AND (COALESCE("knowledgeVideoUrl", '') <> '' OR jsonb_array_length(COALESCE("knowledgeQuestions"::jsonb, '[]'::jsonb)) > 0);
