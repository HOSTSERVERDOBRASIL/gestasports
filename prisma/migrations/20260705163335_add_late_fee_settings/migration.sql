/*
  Warnings:

  - You are about to drop the column `biography` on the `Athlete` table. All the data in the column will be lost.
  - You are about to drop the column `characteristics` on the `Athlete` table. All the data in the column will be lost.
  - You are about to drop the column `dominantFoot` on the `Athlete` table. All the data in the column will be lost.
  - You are about to drop the column `heightCm` on the `Athlete` table. All the data in the column will be lost.
  - You are about to drop the column `weightKg` on the `Athlete` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Athlete" DROP COLUMN "biography",
DROP COLUMN "characteristics",
DROP COLUMN "dominantFoot",
DROP COLUMN "heightCm",
DROP COLUMN "weightKg";

-- AlterTable
ALTER TABLE "GroupSettings" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "groupName" SET DEFAULT 'GestaSports',
ALTER COLUMN "uniform1Name" SET DEFAULT 'Time A',
ALTER COLUMN "uniform1Color" SET DEFAULT '#94a3b8',
ALTER COLUMN "uniform2Name" SET DEFAULT 'Time B',
ALTER COLUMN "uniform2Color" SET DEFAULT '#cbd5e1';

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "lateFeeAppliedCents" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "PaymentSettings" ADD COLUMN     "lateFeeCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lateFeePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
ALTER COLUMN "id" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "AthleteTechnicalEvaluation_tenantId_year_finalScore_idx" ON "AthleteTechnicalEvaluation"("tenantId", "year", "finalScore");

-- CreateIndex
CREATE INDEX "BoardRole_tenantId_idx" ON "BoardRole"("tenantId");

-- CreateIndex
CREATE INDEX "CardRecord_tenantId_athleteId_type_idx" ON "CardRecord"("tenantId", "athleteId", "type");

-- CreateIndex
CREATE INDEX "CollectionActionLog_tenantId_sentAt_idx" ON "CollectionActionLog"("tenantId", "sentAt");

-- CreateIndex
CREATE INDEX "ConfrontationMatch_tenantId_seasonId_idx" ON "ConfrontationMatch"("tenantId", "seasonId");

-- CreateIndex
CREATE INDEX "Expense_tenantId_occurredAt_idx" ON "Expense"("tenantId", "occurredAt");

-- CreateIndex
CREATE INDEX "GameEvent_tenantId_gameId_type_idx" ON "GameEvent"("tenantId", "gameId", "type");

-- CreateIndex
CREATE INDEX "GameLineup_tenantId_gameId_side_idx" ON "GameLineup"("tenantId", "gameId", "side");

-- CreateIndex
CREATE INDEX "GameSubstitution_tenantId_gameId_minute_idx" ON "GameSubstitution"("tenantId", "gameId", "minute");

-- CreateIndex
CREATE INDEX "GoalkeeperContract_tenantId_active_startedAt_idx" ON "GoalkeeperContract"("tenantId", "active", "startedAt");

-- CreateIndex
CREATE INDEX "LineupDraftAttempt_tenantId_createdAt_idx" ON "LineupDraftAttempt"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "MediaAsset_tenantId_type_year_idx" ON "MediaAsset"("tenantId", "type", "year");

-- CreateIndex
CREATE INDEX "PresidentTerm_tenantId_startedYear_endedYear_idx" ON "PresidentTerm"("tenantId", "startedYear", "endedYear");

-- CreateIndex
CREATE INDEX "Season_tenantId_year_idx" ON "Season"("tenantId", "year");

-- CreateIndex
CREATE INDEX "Suspension_tenantId_athleteId_active_idx" ON "Suspension"("tenantId", "athleteId", "active");
