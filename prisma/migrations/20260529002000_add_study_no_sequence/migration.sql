CREATE SEQUENCE IF NOT EXISTS study_no_seq
  AS BIGINT
  MINVALUE 1
  MAXVALUE 9999999999
  START WITH 1
  INCREMENT BY 1
  NO CYCLE;

DO $$
DECLARE
  max_existing BIGINT;
BEGIN
  SELECT COALESCE(MAX(SUBSTRING("studyNo" FROM 3)::BIGINT), 0)
  INTO max_existing
  FROM "User"
  WHERE "studyNo" ~ '^YX[0-9]{10}$';

  PERFORM setval('study_no_seq', GREATEST(max_existing + 1, 1), false);
END $$;

UPDATE "User"
SET "studyNo" = 'YX' || LPAD(nextval('study_no_seq')::text, 10, '0')
WHERE "studyNo" !~ '^YX[0-9]{10}$';

ALTER TABLE "User"
  ADD CONSTRAINT "User_studyNo_format_check"
  CHECK ("studyNo" ~ '^YX[0-9]{10}$');
