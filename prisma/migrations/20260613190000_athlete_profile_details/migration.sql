ALTER TABLE "Athlete" ADD COLUMN "weightKg" INTEGER;
ALTER TABLE "Athlete" ADD COLUMN "heightCm" INTEGER;
ALTER TABLE "Athlete" ADD COLUMN "dominantFoot" TEXT;
ALTER TABLE "Athlete" ADD COLUMN "biography" TEXT;
ALTER TABLE "Athlete" ADD COLUMN "characteristics" TEXT[] DEFAULT ARRAY[]::TEXT[];
