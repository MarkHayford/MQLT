ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "canBePrize" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS "StudyPrizeGrant" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "grantedById" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "note" TEXT,
  "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "StudyPrizeGrant_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "StudyPrizeGrant_projectId_userId_idx" ON "StudyPrizeGrant"("projectId", "userId");
CREATE INDEX IF NOT EXISTS "StudyPrizeGrant_bookingId_idx" ON "StudyPrizeGrant"("bookingId");
CREATE INDEX IF NOT EXISTS "StudyPrizeGrant_productId_idx" ON "StudyPrizeGrant"("productId");
CREATE INDEX IF NOT EXISTS "StudyPrizeGrant_grantedById_idx" ON "StudyPrizeGrant"("grantedById");

ALTER TABLE "StudyPrizeGrant"
  ADD CONSTRAINT "StudyPrizeGrant_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "StudyProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudyPrizeGrant"
  ADD CONSTRAINT "StudyPrizeGrant_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "StudyBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudyPrizeGrant"
  ADD CONSTRAINT "StudyPrizeGrant_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudyPrizeGrant"
  ADD CONSTRAINT "StudyPrizeGrant_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StudyPrizeGrant"
  ADD CONSTRAINT "StudyPrizeGrant_grantedById_fkey"
  FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
