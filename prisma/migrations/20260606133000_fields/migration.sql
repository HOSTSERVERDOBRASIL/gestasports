-- CreateEnum
CREATE TYPE "FieldStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE');

-- AlterTable
ALTER TABLE "Game" ADD COLUMN "fieldId" TEXT;

-- CreateTable
CREATE TABLE "Field" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "surface" TEXT,
    "capacity" INTEGER,
    "defaultCostCents" INTEGER NOT NULL DEFAULT 0,
    "status" "FieldStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Field_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Field_tenantId_name_key" ON "Field"("tenantId", "name");

-- CreateIndex
CREATE INDEX "Field_tenantId_status_idx" ON "Field"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Field_tenantId_city_idx" ON "Field"("tenantId", "city");

-- CreateIndex
CREATE INDEX "Game_tenantId_fieldId_idx" ON "Game"("tenantId", "fieldId");

-- AddForeignKey
ALTER TABLE "Field" ADD CONSTRAINT "Field_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "OrganizationTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "Field"("id") ON DELETE SET NULL ON UPDATE CASCADE;
