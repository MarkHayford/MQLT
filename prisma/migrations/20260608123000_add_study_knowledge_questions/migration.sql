ALTER TABLE "StudyRoutePoint"
  ADD COLUMN IF NOT EXISTS "knowledgeQuestions" JSONB NOT NULL DEFAULT '[]';

ALTER TABLE "StudyKnowledgeTaskCompletion"
  ADD COLUMN IF NOT EXISTS "answerIndexes" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];

UPDATE "StudyRoutePoint"
SET "knowledgeQuestions" = jsonb_build_array(
  jsonb_build_object(
    'question', "knowledgeQuestion",
    'options', to_jsonb("knowledgeOptions"),
    'answerIndex', "knowledgeAnswerIndex"
  )
)
WHERE "knowledgeQuestions" = '[]'::jsonb
  AND "knowledgeEnabled" = true
  AND COALESCE(BTRIM("knowledgeQuestion"), '') <> ''
  AND cardinality("knowledgeOptions") >= 2
  AND "knowledgeAnswerIndex" IS NOT NULL
  AND "knowledgeAnswerIndex" >= 0
  AND "knowledgeAnswerIndex" < cardinality("knowledgeOptions");

UPDATE "StudyKnowledgeTaskCompletion"
SET "answerIndexes" = ARRAY["answerIndex"]
WHERE cardinality("answerIndexes") = 0;
