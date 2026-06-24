-- Add athlete-facing confirmation details for each game lineup.
ALTER TABLE "GameLineup" ADD COLUMN "confirmedAt" TIMESTAMP(3);
ALTER TABLE "GameLineup" ADD COLUMN "arrivalStatus" TEXT;
ALTER TABLE "GameLineup" ADD COLUMN "confirmationNote" TEXT;
