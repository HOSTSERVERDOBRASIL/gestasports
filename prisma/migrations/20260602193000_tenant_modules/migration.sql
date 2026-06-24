CREATE TYPE "TenantModuleCode" AS ENUM (
  'ATHLETES',
  'ASSOCIATES',
  'GAMES',
  'LINEUPS',
  'ATTENDANCE',
  'RANKINGS',
  'FINANCE',
  'REPORTS',
  'DOCUMENTS',
  'COMMUNICATION',
  'GALLERY',
  'SETTINGS'
);

CREATE TABLE "TenantModule" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "code" "TenantModuleCode" NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TenantModule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TenantModule_tenantId_code_key" ON "TenantModule"("tenantId", "code");
CREATE INDEX "TenantModule_tenantId_enabled_idx" ON "TenantModule"("tenantId", "enabled");

ALTER TABLE "TenantModule"
ADD CONSTRAINT "TenantModule_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "OrganizationTenant"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "TenantModule" ("id", "tenantId", "code", "enabled", "createdAt", "updatedAt")
SELECT
  concat('tm_', substr(md5(random()::text || clock_timestamp()::text || "id" || module_code), 1, 24)),
  "id",
  module_code::"TenantModuleCode",
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "OrganizationTenant"
CROSS JOIN (
  VALUES
    ('ATHLETES'),
    ('ASSOCIATES'),
    ('GAMES'),
    ('LINEUPS'),
    ('ATTENDANCE'),
    ('RANKINGS'),
    ('FINANCE'),
    ('REPORTS'),
    ('DOCUMENTS'),
    ('COMMUNICATION'),
    ('GALLERY'),
    ('SETTINGS')
) AS modules(module_code)
ON CONFLICT ("tenantId", "code") DO NOTHING;
