-- AlterEnum
ALTER TYPE "FinancialCategory" ADD VALUE 'GUEST_ATHLETE';

-- AlterTable
ALTER TABLE "FinancialEntry" ADD COLUMN     "athleteId" TEXT;

-- AddForeignKey
ALTER TABLE "FinancialEntry" ADD CONSTRAINT "FinancialEntry_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE SET NULL ON UPDATE CASCADE;
