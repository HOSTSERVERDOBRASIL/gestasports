CREATE TYPE "ClubEventStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED', 'CANCELED');

CREATE TYPE "ClubEventType" AS ENUM ('SOCIAL', 'SPORT', 'FUNDRAISING', 'MEETING', 'COMMUNITY', 'OTHER');

CREATE TABLE "ClubEvent" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "type" "ClubEventType" NOT NULL DEFAULT 'SOCIAL',
  "status" "ClubEventStatus" NOT NULL DEFAULT 'DRAFT',
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3),
  "location" TEXT,
  "capacity" INTEGER,
  "registrationEnabled" BOOLEAN NOT NULL DEFAULT false,
  "registrationFeeCents" INTEGER NOT NULL DEFAULT 0,
  "expectedRevenueCents" INTEGER NOT NULL DEFAULT 0,
  "expectedExpenseCents" INTEGER NOT NULL DEFAULT 0,
  "coverImageUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ClubEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClubEvent_tenantId_startsAt_idx" ON "ClubEvent"("tenantId", "startsAt");
CREATE INDEX "ClubEvent_tenantId_status_startsAt_idx" ON "ClubEvent"("tenantId", "status", "startsAt");
CREATE INDEX "ClubEvent_tenantId_type_startsAt_idx" ON "ClubEvent"("tenantId", "type", "startsAt");

ALTER TABLE "ClubEvent" ADD CONSTRAINT "ClubEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "OrganizationTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
