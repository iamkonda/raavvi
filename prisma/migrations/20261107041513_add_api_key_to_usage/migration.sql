-- AlterTable
ALTER TABLE "UsageRecord" ADD COLUMN     "apiKeyId" TEXT;

-- CreateIndex
CREATE INDEX "UsageRecord_apiKeyId_idx" ON "UsageRecord"("apiKeyId");

-- AddForeignKey
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
