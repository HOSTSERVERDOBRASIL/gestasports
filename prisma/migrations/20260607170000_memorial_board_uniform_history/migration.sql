CREATE TABLE "BoardMemberTerm" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "associateId" TEXT NOT NULL,
    "boardRoleId" TEXT NOT NULL,
    "startedYear" INTEGER NOT NULL,
    "endedYear" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoardMemberTerm_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UniformHistory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "side" TEXT NOT NULL,
    "seasonLabel" TEXT NOT NULL,
    "seasonYear" INTEGER,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "imageUrl" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UniformHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BoardMemberTerm_tenantId_startedYear_endedYear_idx" ON "BoardMemberTerm"("tenantId", "startedYear", "endedYear");
CREATE INDEX "BoardMemberTerm_associateId_idx" ON "BoardMemberTerm"("associateId");
CREATE INDEX "BoardMemberTerm_boardRoleId_idx" ON "BoardMemberTerm"("boardRoleId");
CREATE UNIQUE INDEX "UniformHistory_tenantId_side_seasonLabel_key" ON "UniformHistory"("tenantId", "side", "seasonLabel");
CREATE INDEX "UniformHistory_tenantId_seasonYear_idx" ON "UniformHistory"("tenantId", "seasonYear");

ALTER TABLE "BoardMemberTerm" ADD CONSTRAINT "BoardMemberTerm_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "OrganizationTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BoardMemberTerm" ADD CONSTRAINT "BoardMemberTerm_associateId_fkey" FOREIGN KEY ("associateId") REFERENCES "Associate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BoardMemberTerm" ADD CONSTRAINT "BoardMemberTerm_boardRoleId_fkey" FOREIGN KEY ("boardRoleId") REFERENCES "BoardRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UniformHistory" ADD CONSTRAINT "UniformHistory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "OrganizationTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
