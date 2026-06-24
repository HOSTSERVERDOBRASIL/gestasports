ALTER TABLE "Athlete" ADD COLUMN "birthDate" TIMESTAMP(3);

UPDATE "Athlete"
SET "birthDate" = "Associate"."birthDate"
FROM "Associate"
WHERE "Athlete"."associateId" = "Associate"."id"
  AND "Associate"."birthDate" IS NOT NULL;
