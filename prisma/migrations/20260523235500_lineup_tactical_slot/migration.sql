ALTER TABLE "GameLineup"
ADD COLUMN "tacticalSlot" INTEGER;

CREATE INDEX "GameLineup_gameId_side_tacticalSlot_idx"
ON "GameLineup"("gameId", "side", "tacticalSlot");
