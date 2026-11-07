-- AlterTable
ALTER TABLE "UsageRecord" ADD COLUMN     "invoiceId" TEXT;

-- CreateIndex
CREATE INDEX "UsageRecord_invoiceId_idx" ON "UsageRecord"("invoiceId");

-- AddForeignKey
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
