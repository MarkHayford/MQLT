ALTER TABLE "StudyBooking" ADD COLUMN "checkedInAt" TIMESTAMP(3);
ALTER TABLE "StudyBooking" ADD COLUMN "checkedInById" TEXT;

CREATE INDEX "StudyBooking_projectId_checkedInAt_idx" ON "StudyBooking"("projectId", "checkedInAt");
