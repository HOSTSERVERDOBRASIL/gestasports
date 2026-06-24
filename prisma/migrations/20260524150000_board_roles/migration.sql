CREATE TABLE "BoardRole" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "canAccessAdmin" BOOLEAN NOT NULL DEFAULT false,
    "canAccessFinancial" BOOLEAN NOT NULL DEFAULT false,
    "canAccessAthlete" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoardRole_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BoardRole_name_key" ON "BoardRole"("name");

ALTER TABLE "Associate" ADD COLUMN "boardRoleId" TEXT;

CREATE INDEX "Associate_boardRoleId_idx" ON "Associate"("boardRoleId");

ALTER TABLE "Associate" ADD CONSTRAINT "Associate_boardRoleId_fkey" FOREIGN KEY ("boardRoleId") REFERENCES "BoardRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "BoardRole" ("id", "name", "description", "canAccessAdmin", "canAccessFinancial", "canAccessAthlete", "isDefault", "updatedAt")
VALUES
  ('board_member_default', 'Membro', 'Associado sem cargo na diretoria.', false, false, true, true, CURRENT_TIMESTAMP),
  ('board_president_default', 'Presidente', 'Diretoria com acesso administrativo completo.', true, true, true, false, CURRENT_TIMESTAMP),
  ('board_financial_default', 'Financeiro', 'Diretoria responsável pela gestão financeira.', false, true, false, false, CURRENT_TIMESTAMP);

UPDATE "Associate" SET "boardRoleId" = 'board_member_default' WHERE "boardRoleId" IS NULL;
