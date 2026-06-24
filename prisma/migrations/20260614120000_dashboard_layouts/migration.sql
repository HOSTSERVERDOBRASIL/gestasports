CREATE TABLE "DashboardLayout" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'ASSOCIATION',
    "layout" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DashboardLayout_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DashboardLayout_tenantId_scope_key" ON "DashboardLayout"("tenantId", "scope");
CREATE INDEX "DashboardLayout_tenantId_idx" ON "DashboardLayout"("tenantId");

ALTER TABLE "DashboardLayout" ADD CONSTRAINT "DashboardLayout_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "OrganizationTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
