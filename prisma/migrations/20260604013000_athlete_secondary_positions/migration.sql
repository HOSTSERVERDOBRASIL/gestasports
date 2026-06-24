ALTER TABLE "Athlete"
ADD COLUMN "secondaryPositions" "AthletePosition"[] NOT NULL DEFAULT ARRAY[]::"AthletePosition"[];
