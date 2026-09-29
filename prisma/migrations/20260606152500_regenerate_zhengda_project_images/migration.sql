UPDATE "StudyProject"
SET
  "mediaColors" = ARRAY[
    '/study/project-images/study-project-6-factory-campus.png',
    '/study/project-images/study-project-6-processing-line.png',
    '/study/project-images/study-project-6-study-workshop.png'
  ],
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = '6';
