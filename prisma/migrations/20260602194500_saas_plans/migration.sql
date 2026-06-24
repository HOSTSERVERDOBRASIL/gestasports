CREATE TABLE "SaaSPlan" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "monthlyFeeCents" INTEGER NOT NULL DEFAULT 0,
  "implementationFeeCents" INTEGER NOT NULL DEFAULT 0,
  "monthlyDueDay" INTEGER NOT NULL DEFAULT 10,
  "maxUsers" INTEGER,
  "maxAthletes" INTEGER,
  "maxTeams" INTEGER,
  "customDomainAllowed" BOOLEAN NOT NULL DEFAULT false,
  "moduleCodes" "TenantModuleCode"[] NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SaaSPlan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SaaSPlan_slug_key" ON "SaaSPlan"("slug");
CREATE INDEX "SaaSPlan_active_monthlyFeeCents_idx" ON "SaaSPlan"("active", "monthlyFeeCents");

ALTER TABLE "OrganizationTenant" ADD COLUMN "planId" TEXT;
CREATE INDEX "OrganizationTenant_planId_idx" ON "OrganizationTenant"("planId");
ALTER TABLE "OrganizationTenant" ADD CONSTRAINT "OrganizationTenant_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SaaSPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "SaaSPlan" (
  "id", "name", "slug", "description", "monthlyFeeCents", "implementationFeeCents", "monthlyDueDay",
  "maxUsers", "maxAthletes", "maxTeams", "customDomainAllowed", "moduleCodes", "updatedAt"
) VALUES
(
  'plan_essencial',
  'Essencial',
  'essencial',
  'Operação básica para clubes pequenos com financeiro e jogos.',
  9900,
  29900,
  10,
  3,
  80,
  2,
  false,
  ARRAY['ASSOCIATES','ATHLETES','GAMES','LINEUPS','ATTENDANCE','FINANCE','SETTINGS']::"TenantModuleCode"[],
  CURRENT_TIMESTAMP
),
(
  'plan_profissional',
  'Profissional',
  'profissional',
  'Gestão completa do clube com relatórios, rankings e galeria.',
  19900,
  49900,
  10,
  8,
  200,
  5,
  true,
  ARRAY['ASSOCIATES','ATHLETES','GAMES','LINEUPS','ATTENDANCE','RANKINGS','FINANCE','REPORTS','GALLERY','SETTINGS']::"TenantModuleCode"[],
  CURRENT_TIMESTAMP
),
(
  'plan_enterprise',
  'Enterprise',
  'enterprise',
  'Pacote completo para operação multi-equipes com automações e comunicação.',
  39900,
  99000,
  10,
  NULL,
  NULL,
  NULL,
  true,
  ARRAY['ATHLETES','ASSOCIATES','GAMES','LINEUPS','ATTENDANCE','RANKINGS','FINANCE','REPORTS','DOCUMENTS','COMMUNICATION','GALLERY','SETTINGS']::"TenantModuleCode"[],
  CURRENT_TIMESTAMP
);
