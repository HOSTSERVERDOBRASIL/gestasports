CREATE TABLE "LineupDraftAttempt" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "createdById" TEXT,
    "createdByName" TEXT,
    "redSnapshot" JSONB NOT NULL,
    "whiteSnapshot" JSONB NOT NULL,
    "redBenchSnapshot" JSONB,
    "whiteBenchSnapshot" JSONB,
    "blockedSnapshot" JSONB,
    "notes" JSONB,
    "totals" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LineupDraftAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LineupDraftAttempt_gameId_attemptNumber_key" ON "LineupDraftAttempt"("gameId", "attemptNumber");
CREATE INDEX "LineupDraftAttempt_gameId_createdAt_idx" ON "LineupDraftAttempt"("gameId", "createdAt");
CREATE INDEX "LineupDraftAttempt_createdById_createdAt_idx" ON "LineupDraftAttempt"("createdById", "createdAt");

ALTER TABLE "LineupDraftAttempt" ADD CONSTRAINT "LineupDraftAttempt_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LineupDraftAttempt" ADD CONSTRAINT "LineupDraftAttempt_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
