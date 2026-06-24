CREATE TABLE "AthleteTechnicalEvaluation" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "evaluatedById" TEXT,
    "evaluatedByName" TEXT,
    "evaluatedByEmail" TEXT,
    "technicalScore" INTEGER NOT NULL,
    "tacticalScore" INTEGER NOT NULL,
    "physicalScore" INTEGER NOT NULL,
    "defensiveScore" INTEGER NOT NULL,
    "offensiveScore" INTEGER NOT NULL,
    "commitmentScore" INTEGER NOT NULL,
    "disciplineScore" INTEGER NOT NULL,
    "manualScore" DOUBLE PRECISION NOT NULL,
    "statsScore" DOUBLE PRECISION NOT NULL,
    "finalScore" DOUBLE PRECISION NOT NULL,
    "classification" TEXT NOT NULL,
    "justification" TEXT NOT NULL,
    "notes" TEXT,
    "statsSnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AthleteTechnicalEvaluation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AthleteTechnicalEvaluation_athleteId_year_createdAt_idx" ON "AthleteTechnicalEvaluation"("athleteId", "year", "createdAt");
CREATE INDEX "AthleteTechnicalEvaluation_year_finalScore_idx" ON "AthleteTechnicalEvaluation"("year", "finalScore");

ALTER TABLE "AthleteTechnicalEvaluation" ADD CONSTRAINT "AthleteTechnicalEvaluation_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;
