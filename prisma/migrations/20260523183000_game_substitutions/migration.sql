CREATE TABLE "GameSubstitution" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "athleteOutId" TEXT NOT NULL,
    "athleteInId" TEXT NOT NULL,
    "side" "TeamSide",
    "minute" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameSubstitution_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GameSubstitution_gameId_minute_idx" ON "GameSubstitution"("gameId", "minute");
CREATE INDEX "GameSubstitution_athleteOutId_idx" ON "GameSubstitution"("athleteOutId");
CREATE INDEX "GameSubstitution_athleteInId_idx" ON "GameSubstitution"("athleteInId");

ALTER TABLE "GameSubstitution" ADD CONSTRAINT "GameSubstitution_distinct_athletes_check" CHECK ("athleteOutId" <> "athleteInId");
ALTER TABLE "GameSubstitution" ADD CONSTRAINT "GameSubstitution_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameSubstitution" ADD CONSTRAINT "GameSubstitution_athleteOutId_fkey" FOREIGN KEY ("athleteOutId") REFERENCES "Athlete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GameSubstitution" ADD CONSTRAINT "GameSubstitution_athleteInId_fkey" FOREIGN KEY ("athleteInId") REFERENCES "Athlete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
