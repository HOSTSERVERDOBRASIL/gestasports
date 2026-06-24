-- CreateEnum
CREATE TYPE "ClubEventRegistrationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELED', 'CHECKED_IN');

-- CreateTable
CREATE TABLE "ClubEventRegistration" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "eventId" TEXT NOT NULL,
    "associateId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "status" "ClubEventRegistrationStatus" NOT NULL DEFAULT 'PENDING',
    "amountCents" INTEGER NOT NULL DEFAULT 0,
    "paidAt" TIMESTAMP(3),
    "checkedInAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubEventRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClubEventRegistration_tenantId_eventId_associateId_key" ON "ClubEventRegistration"("tenantId", "eventId", "associateId");

-- CreateIndex
CREATE INDEX "ClubEventRegistration_tenantId_eventId_status_idx" ON "ClubEventRegistration"("tenantId", "eventId", "status");

-- CreateIndex
CREATE INDEX "ClubEventRegistration_tenantId_associateId_idx" ON "ClubEventRegistration"("tenantId", "associateId");

-- AddForeignKey
ALTER TABLE "ClubEventRegistration" ADD CONSTRAINT "ClubEventRegistration_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "OrganizationTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubEventRegistration" ADD CONSTRAINT "ClubEventRegistration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "ClubEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubEventRegistration" ADD CONSTRAINT "ClubEventRegistration_associateId_fkey" FOREIGN KEY ("associateId") REFERENCES "Associate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
