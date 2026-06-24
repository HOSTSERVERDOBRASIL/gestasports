CREATE TABLE "MemorialCategory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "archiveType" "ArchiveItemType" NOT NULL DEFAULT 'DOCUMENT',
    "icon" TEXT NOT NULL DEFAULT 'Archive',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "showInDashboard" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemorialCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MemorialCategory_tenantId_slug_key" ON "MemorialCategory"("tenantId", "slug");
CREATE INDEX "MemorialCategory_tenantId_enabled_sortOrder_idx" ON "MemorialCategory"("tenantId", "enabled", "sortOrder");

ALTER TABLE "MemorialCategory" ADD CONSTRAINT "MemorialCategory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "OrganizationTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
