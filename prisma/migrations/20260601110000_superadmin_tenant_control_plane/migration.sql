-- Superadmin control plane for one-database-per-client SaaS operation.

CREATE TYPE "TenantStatus" AS ENUM ('TRIAL', 'ACTIVE', 'IMPLEMENTATION', 'SUSPENDED', 'CANCELED');
CREATE TYPE "TenantDomainStatus" AS ENUM ('PENDING', 'VERIFIED', 'FAILED');
CREATE TYPE "TenantProvisioningStatus" AS ENUM ('NOT_STARTED', 'DATABASE_PENDING', 'MIGRATING', 'READY', 'FAILED');
CREATE TYPE "SaaSChargeType" AS ENUM ('MONTHLY', 'IMPLEMENTATION', 'EXTRA');
CREATE TYPE "SaaSChargeStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'CANCELED');

ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUPERADMIN';

CREATE TABLE "OrganizationTenant" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "contactName" TEXT,
  "contactEmail" TEXT,
  "contactPhone" TEXT,
  "status" "TenantStatus" NOT NULL DEFAULT 'IMPLEMENTATION',
  "planName" TEXT NOT NULL DEFAULT 'Padrão',
  "monthlyFeeCents" INTEGER NOT NULL DEFAULT 0,
  "implementationFeeCents" INTEGER NOT NULL DEFAULT 0,
  "monthlyDueDay" INTEGER NOT NULL DEFAULT 10,
  "defaultSubdomain" TEXT NOT NULL,
  "databaseName" TEXT NOT NULL,
  "databaseUrl" TEXT,
  "provisioningStatus" "TenantProvisioningStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "provisioningError" TEXT,
  "provisionedAt" TIMESTAMP(3),
  "brandName" TEXT,
  "primaryColor" TEXT NOT NULL DEFAULT '#dc2626',
  "secondaryColor" TEXT NOT NULL DEFAULT '#111827',
  "accentColor" TEXT NOT NULL DEFAULT '#facc15',
  "logoUrl" TEXT,
  "notes" TEXT,
  "suspendedReason" TEXT,
  "activatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrganizationTenant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TenantDomain" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "hostname" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'CUSTOM',
  "status" "TenantDomainStatus" NOT NULL DEFAULT 'PENDING',
  "expectedCname" TEXT NOT NULL,
  "lastCheckedAt" TIMESTAMP(3),
  "verifiedAt" TIMESTAMP(3),
  "failureReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TenantDomain_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SaaSCharge" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "type" "SaaSChargeType" NOT NULL,
  "description" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "competenceMonth" INTEGER,
  "competenceYear" INTEGER,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "paidAt" TIMESTAMP(3),
  "status" "SaaSChargeStatus" NOT NULL DEFAULT 'PENDING',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SaaSCharge_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrganizationTenant_slug_key" ON "OrganizationTenant"("slug");
CREATE UNIQUE INDEX "OrganizationTenant_defaultSubdomain_key" ON "OrganizationTenant"("defaultSubdomain");
CREATE UNIQUE INDEX "OrganizationTenant_databaseName_key" ON "OrganizationTenant"("databaseName");
CREATE INDEX "OrganizationTenant_status_createdAt_idx" ON "OrganizationTenant"("status", "createdAt");
CREATE INDEX "OrganizationTenant_contactEmail_idx" ON "OrganizationTenant"("contactEmail");

CREATE UNIQUE INDEX "TenantDomain_hostname_key" ON "TenantDomain"("hostname");
CREATE INDEX "TenantDomain_tenantId_status_idx" ON "TenantDomain"("tenantId", "status");

CREATE UNIQUE INDEX "SaaSCharge_tenantId_type_competenceMonth_competenceYear_key" ON "SaaSCharge"("tenantId", "type", "competenceMonth", "competenceYear");
CREATE INDEX "SaaSCharge_status_dueDate_idx" ON "SaaSCharge"("status", "dueDate");
CREATE INDEX "SaaSCharge_competenceYear_competenceMonth_idx" ON "SaaSCharge"("competenceYear", "competenceMonth");

ALTER TABLE "TenantDomain" ADD CONSTRAINT "TenantDomain_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "OrganizationTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SaaSCharge" ADD CONSTRAINT "SaaSCharge_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "OrganizationTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
