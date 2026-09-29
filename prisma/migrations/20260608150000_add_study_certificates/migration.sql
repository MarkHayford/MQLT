CREATE TABLE "StudyCertificate" (
    "id" TEXT NOT NULL,
    "certificateNo" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "holderName" TEXT NOT NULL,
    "projectTitle" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudyCertificate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudyCertificate_certificateNo_key" ON "StudyCertificate"("certificateNo");
CREATE UNIQUE INDEX "StudyCertificate_bookingId_key" ON "StudyCertificate"("bookingId");
CREATE INDEX "StudyCertificate_projectId_userId_idx" ON "StudyCertificate"("projectId", "userId");
CREATE INDEX "StudyCertificate_userId_issuedAt_idx" ON "StudyCertificate"("userId", "issuedAt");

ALTER TABLE "StudyCertificate" ADD CONSTRAINT "StudyCertificate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "StudyProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudyCertificate" ADD CONSTRAINT "StudyCertificate_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "StudyBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudyCertificate" ADD CONSTRAINT "StudyCertificate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
