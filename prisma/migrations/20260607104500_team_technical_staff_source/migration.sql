ALTER TABLE "Team" ADD COLUMN "coachAssociateId" TEXT;
ALTER TABLE "Team" ADD COLUMN "assistantAssociateId" TEXT;

CREATE INDEX "Team_coachAssociateId_idx" ON "Team"("coachAssociateId");
CREATE INDEX "Team_assistantAssociateId_idx" ON "Team"("assistantAssociateId");

ALTER TABLE "Team"
  ADD CONSTRAINT "Team_coachAssociateId_fkey"
  FOREIGN KEY ("coachAssociateId") REFERENCES "Associate"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Team"
  ADD CONSTRAINT "Team_assistantAssociateId_fkey"
  FOREIGN KEY ("assistantAssociateId") REFERENCES "Associate"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
