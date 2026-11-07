-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "passwordHash" TEXT,
ADD COLUMN     "temporaryPasswordExpiresAt" TIMESTAMP(3);
