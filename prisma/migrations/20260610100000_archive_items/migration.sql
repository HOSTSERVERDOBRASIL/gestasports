-- CreateEnum
CREATE TYPE "ArchiveItemType" AS ENUM ('DASHBOARD', 'GAME', 'ATHLETE', 'DIRECTOR', 'TITLE', 'MATCH_REPORT', 'TIMELINE', 'SHIRT', 'GALLERY', 'DOCUMENT', 'AWARD', 'ASSET', 'HALL_OF_FAME');

-- CreateEnum
CREATE TYPE "ArchiveItemStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'PRIVATE');

-- CreateEnum
CREATE TYPE "ArchiveAttachmentType" AS ENUM ('IMAGE', 'VIDEO', 'PDF', 'DOCUMENT', 'LINK', 'OTHER');

-- CreateTable
CREATE TABLE "ArchiveItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "type" "ArchiveItemType" NOT NULL,
    "status" "ArchiveItemStatus" NOT NULL DEFAULT 'PUBLISHED',
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "year" INTEGER,
    "occurredAt" TIMESTAMP(3),
    "category" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "coverImageUrl" TEXT,
    "externalUrl" TEXT,
    "location" TEXT,
    "periodLabel" TEXT,
    "personName" TEXT,
    "personRole" TEXT,
    "competition" TEXT,
    "resultLabel" TEXT,
    "scoreLabel" TEXT,
    "assetCode" TEXT,
    "assetCondition" TEXT,
    "documentNumber" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'PUBLIC',
    "linkedEntityType" TEXT,
    "linkedEntityId" TEXT,
    "metadata" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArchiveItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArchiveAttachment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "archiveItemId" TEXT NOT NULL,
    "type" "ArchiveAttachmentType" NOT NULL DEFAULT 'OTHER',
    "title" TEXT,
    "url" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArchiveAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArchiveItem_type_year_idx" ON "ArchiveItem"("type", "year");

-- CreateIndex
CREATE INDEX "ArchiveItem_status_createdAt_idx" ON "ArchiveItem"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ArchiveItem_tenantId_type_year_idx" ON "ArchiveItem"("tenantId", "type", "year");

-- CreateIndex
CREATE INDEX "ArchiveItem_tenantId_linkedEntityType_linkedEntityId_idx" ON "ArchiveItem"("tenantId", "linkedEntityType", "linkedEntityId");

-- CreateIndex
CREATE INDEX "ArchiveAttachment_archiveItemId_idx" ON "ArchiveAttachment"("archiveItemId");

-- CreateIndex
CREATE INDEX "ArchiveAttachment_tenantId_type_idx" ON "ArchiveAttachment"("tenantId", "type");

-- AddForeignKey
ALTER TABLE "ArchiveItem" ADD CONSTRAINT "ArchiveItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "OrganizationTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchiveItem" ADD CONSTRAINT "ArchiveItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchiveAttachment" ADD CONSTRAINT "ArchiveAttachment_archiveItemId_fkey" FOREIGN KEY ("archiveItemId") REFERENCES "ArchiveItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
