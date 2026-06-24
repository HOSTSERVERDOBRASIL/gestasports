CREATE TABLE "TenantDashboardSnapshot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'ASSOCIATION',
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "associatesActive" INTEGER NOT NULL DEFAULT 0,
    "athletesReady" INTEGER NOT NULL DEFAULT 0,
    "monthRevenueCents" INTEGER NOT NULL DEFAULT 0,
    "monthExpenseCents" INTEGER NOT NULL DEFAULT 0,
    "balanceCents" INTEGER NOT NULL DEFAULT 0,
    "delinquencyAmountCents" INTEGER NOT NULL DEFAULT 0,
    "delinquencyCount" INTEGER NOT NULL DEFAULT 0,
    "attendancePercent" INTEGER NOT NULL DEFAULT 0,
    "healthScore" INTEGER NOT NULL DEFAULT 0,
    "payload" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantDashboardSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TenantDashboardSnapshot_tenantId_scope_month_year_key" ON "TenantDashboardSnapshot"("tenantId", "scope", "month", "year");
CREATE INDEX "TenantDashboardSnapshot_tenantId_year_month_idx" ON "TenantDashboardSnapshot"("tenantId", "year", "month");
CREATE INDEX "TenantDashboardSnapshot_tenantId_healthScore_idx" ON "TenantDashboardSnapshot"("tenantId", "healthScore");

ALTER TABLE "TenantDashboardSnapshot"
ADD CONSTRAINT "TenantDashboardSnapshot_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "OrganizationTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
