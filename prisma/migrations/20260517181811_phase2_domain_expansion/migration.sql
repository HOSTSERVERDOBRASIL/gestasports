/*
  Warnings:

  - A unique constraint covering the columns `[associateId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `invitedByAssociateId` to the `JoinRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `invitedByUserId` to the `JoinRequest` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AthletePosition" AS ENUM ('GOALKEEPER', 'LINE', 'BOTH');

-- CreateEnum
CREATE TYPE "AthleteLinkType" AS ENUM ('ASSOCIATE', 'CONTRACTED', 'GUEST');

-- CreateEnum
CREATE TYPE "AthleteStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DELINQUENT', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "FinancialEntryType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "FinancialEntryStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'CANCELED');

-- CreateEnum
CREATE TYPE "FinancialCategory" AS ENUM ('MONTHLY_FEE', 'EVENTS', 'SPONSORSHIP', 'FUNDRAISING', 'FIELD', 'REFEREE', 'GOALKEEPER_CONTRACT', 'UNIFORMS', 'ADMINISTRATIVE', 'OTHER');

-- CreateEnum
CREATE TYPE "GoalkeeperCostModel" AS ENUM ('PER_GAME', 'MONTHLY', 'ONE_OFF');

-- CreateEnum
CREATE TYPE "GameType" AS ENUM ('INTERNAL', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "TeamSide" AS ENUM ('RED', 'WHITE', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "LineupRole" AS ENUM ('STARTER', 'RESERVE', 'GOALKEEPER', 'ABSENT');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('GOAL', 'ASSIST', 'YELLOW_CARD', 'RED_CARD');

-- CreateEnum
CREATE TYPE "CardType" AS ENUM ('YELLOW', 'RED');

-- CreateEnum
CREATE TYPE "SuspensionOrigin" AS ENUM ('YELLOW_ACCUMULATION', 'DIRECT_RED', 'MANUAL');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('ATHLETE_PROFILE', 'GAME', 'CONFRONTATION', 'EVENT', 'FINANCIAL_RECEIPT', 'GENERAL');

-- AlterTable
ALTER TABLE "Associate" ADD COLUMN     "address" TEXT,
ADD COLUMN     "birthDate" TIMESTAMP(3),
ADD COLUMN     "note" TEXT;

-- AlterTable
ALTER TABLE "GoalkeeperContract" ADD COLUMN     "athleteId" TEXT,
ADD COLUMN     "costCenter" TEXT,
ADD COLUMN     "costModel" "GoalkeeperCostModel" NOT NULL DEFAULT 'MONTHLY',
ADD COLUMN     "note" TEXT,
ADD COLUMN     "paymentMethod" TEXT;

-- AlterTable
ALTER TABLE "JoinRequest" ADD COLUMN     "invitedByAssociateId" TEXT NOT NULL,
ADD COLUMN     "invitedByUserId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "associateId" TEXT;

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Athlete" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" "AthletePosition" NOT NULL,
    "linkType" "AthleteLinkType" NOT NULL,
    "status" "AthleteStatus" NOT NULL DEFAULT 'ACTIVE',
    "photoUrl" TEXT,
    "sportsNote" TEXT,
    "associateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Athlete_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "type" "GameType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "championship" TEXT,
    "note" TEXT,
    "gameValueCents" INTEGER NOT NULL DEFAULT 0,
    "seasonId" TEXT,
    "redTeamName" TEXT,
    "whiteTeamName" TEXT,
    "redUniformColor" TEXT,
    "whiteUniformColor" TEXT,
    "redScore" INTEGER,
    "whiteScore" INTEGER,
    "winnerSide" "TeamSide",
    "isDraw" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameLineup" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "side" "TeamSide" NOT NULL,
    "role" "LineupRole" NOT NULL,
    "presence" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameLineup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameEvent" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "type" "EventType" NOT NULL,
    "minute" INTEGER,
    "note" TEXT,
    "side" "TeamSide",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardRecord" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "seasonId" TEXT,
    "type" "CardType" NOT NULL,
    "reason" TEXT,
    "minute" INTEGER,
    "referee" TEXT,
    "teamName" TEXT,
    "note" TEXT,
    "cardDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Suspension" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "origin" "SuspensionOrigin" NOT NULL,
    "matchesToServe" INTEGER NOT NULL DEFAULT 1,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Suspension_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfrontationMatch" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "seasonId" TEXT,
    "redScore" INTEGER NOT NULL,
    "whiteScore" INTEGER NOT NULL,
    "winnerSide" "TeamSide",
    "isDraw" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConfrontationMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialEntry" (
    "id" TEXT NOT NULL,
    "type" "FinancialEntryType" NOT NULL,
    "category" "FinancialCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "competenceMonth" INTEGER NOT NULL,
    "competenceYear" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "status" "FinancialEntryStatus" NOT NULL DEFAULT 'PENDING',
    "associateId" TEXT,
    "goalkeeperContractId" TEXT,
    "receiptUrl" TEXT,
    "costCenter" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "type" "MediaType" NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "year" INTEGER,
    "athleteId" TEXT,
    "gameId" TEXT,
    "confrontationId" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Season_year_name_key" ON "Season"("year", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Athlete_associateId_key" ON "Athlete"("associateId");

-- CreateIndex
CREATE INDEX "Athlete_status_position_idx" ON "Athlete"("status", "position");

-- CreateIndex
CREATE INDEX "Game_type_date_idx" ON "Game"("type", "date");

-- CreateIndex
CREATE INDEX "Game_seasonId_idx" ON "Game"("seasonId");

-- CreateIndex
CREATE INDEX "GameLineup_gameId_side_idx" ON "GameLineup"("gameId", "side");

-- CreateIndex
CREATE UNIQUE INDEX "GameLineup_gameId_athleteId_key" ON "GameLineup"("gameId", "athleteId");

-- CreateIndex
CREATE INDEX "GameEvent_gameId_type_idx" ON "GameEvent"("gameId", "type");

-- CreateIndex
CREATE INDEX "GameEvent_athleteId_type_idx" ON "GameEvent"("athleteId", "type");

-- CreateIndex
CREATE INDEX "CardRecord_athleteId_type_idx" ON "CardRecord"("athleteId", "type");

-- CreateIndex
CREATE INDEX "CardRecord_seasonId_type_idx" ON "CardRecord"("seasonId", "type");

-- CreateIndex
CREATE INDEX "Suspension_athleteId_active_idx" ON "Suspension"("athleteId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "ConfrontationMatch_gameId_key" ON "ConfrontationMatch"("gameId");

-- CreateIndex
CREATE INDEX "ConfrontationMatch_seasonId_idx" ON "ConfrontationMatch"("seasonId");

-- CreateIndex
CREATE INDEX "FinancialEntry_type_category_idx" ON "FinancialEntry"("type", "category");

-- CreateIndex
CREATE INDEX "FinancialEntry_competenceYear_competenceMonth_idx" ON "FinancialEntry"("competenceYear", "competenceMonth");

-- CreateIndex
CREATE INDEX "FinancialEntry_status_dueDate_idx" ON "FinancialEntry"("status", "dueDate");

-- CreateIndex
CREATE INDEX "MediaAsset_type_year_idx" ON "MediaAsset"("type", "year");

-- CreateIndex
CREATE INDEX "MediaAsset_athleteId_idx" ON "MediaAsset"("athleteId");

-- CreateIndex
CREATE INDEX "MediaAsset_gameId_idx" ON "MediaAsset"("gameId");

-- CreateIndex
CREATE INDEX "GoalkeeperContract_active_startedAt_idx" ON "GoalkeeperContract"("active", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_associateId_key" ON "User"("associateId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_associateId_fkey" FOREIGN KEY ("associateId") REFERENCES "Associate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JoinRequest" ADD CONSTRAINT "JoinRequest_invitedByAssociateId_fkey" FOREIGN KEY ("invitedByAssociateId") REFERENCES "Associate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JoinRequest" ADD CONSTRAINT "JoinRequest_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalkeeperContract" ADD CONSTRAINT "GoalkeeperContract_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Athlete" ADD CONSTRAINT "Athlete_associateId_fkey" FOREIGN KEY ("associateId") REFERENCES "Associate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameLineup" ADD CONSTRAINT "GameLineup_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameLineup" ADD CONSTRAINT "GameLineup_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameEvent" ADD CONSTRAINT "GameEvent_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameEvent" ADD CONSTRAINT "GameEvent_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardRecord" ADD CONSTRAINT "CardRecord_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardRecord" ADD CONSTRAINT "CardRecord_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardRecord" ADD CONSTRAINT "CardRecord_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Suspension" ADD CONSTRAINT "Suspension_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfrontationMatch" ADD CONSTRAINT "ConfrontationMatch_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfrontationMatch" ADD CONSTRAINT "ConfrontationMatch_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialEntry" ADD CONSTRAINT "FinancialEntry_associateId_fkey" FOREIGN KEY ("associateId") REFERENCES "Associate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialEntry" ADD CONSTRAINT "FinancialEntry_goalkeeperContractId_fkey" FOREIGN KEY ("goalkeeperContractId") REFERENCES "GoalkeeperContract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_confrontationId_fkey" FOREIGN KEY ("confrontationId") REFERENCES "ConfrontationMatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
