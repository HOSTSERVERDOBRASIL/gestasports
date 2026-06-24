ALTER TABLE "Athlete" ADD COLUMN "medicalStatus" TEXT NOT NULL DEFAULT 'CLEARED';
ALTER TABLE "Athlete" ADD COLUMN "medicalNote" TEXT;
ALTER TABLE "Athlete" ADD COLUMN "medicalReturnDate" TIMESTAMP(3);
ALTER TABLE "Athlete" ADD COLUMN "medicalReportedBy" TEXT;
