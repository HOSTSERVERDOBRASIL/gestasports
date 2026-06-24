ALTER TYPE "TenantModuleCode" ADD VALUE IF NOT EXISTS 'CLUBS';
ALTER TYPE "TenantModuleCode" ADD VALUE IF NOT EXISTS 'TEAMS';
ALTER TYPE "TenantModuleCode" ADD VALUE IF NOT EXISTS 'CALLUPS';
ALTER TYPE "TenantModuleCode" ADD VALUE IF NOT EXISTS 'COMPETITIONS';
ALTER TYPE "TenantModuleCode" ADD VALUE IF NOT EXISTS 'OFFICIAL_STATS';
ALTER TYPE "GameStatus" ADD VALUE IF NOT EXISTS 'CANCELED';

CREATE TYPE "OrganizationType" AS ENUM ('GRUPO_INTERNO', 'CLUBE', 'CLUBE_COM_RACHA_INTERNO', 'LIGA', 'ESCOLINHA');
CREATE TYPE "GameMode" AS ENUM ('INTERNAL_SPLIT', 'FRIENDLY', 'CHAMPIONSHIP', 'TOURNAMENT', 'TRAINING', 'EXTERNAL_FRIENDLY');
CREATE TYPE "ClubType" AS ENUM ('INTERNAL', 'EXTERNAL', 'PARTNER', 'GUEST');
CREATE TYPE "ClubStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "TeamCategory" AS ENUM ('PRINCIPAL', 'VETERANO', 'SUB_20', 'SUB_17', 'SUB_15', 'FEMININO', 'MISTO');
CREATE TYPE "TeamGender" AS ENUM ('MALE', 'FEMALE', 'MIXED');
CREATE TYPE "TeamStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "CallUpStatus" AS ENUM ('CALLED', 'CONFIRMED', 'DECLINED', 'MAYBE', 'ABSENT', 'CUT');
CREATE TYPE "CompetitionType" AS ENUM ('LEAGUE', 'CUP', 'TOURNAMENT', 'FRIENDLY_SERIES');
CREATE TYPE "CompetitionFormat" AS ENUM ('PONTOS_CORRIDOS', 'MATA_MATA', 'GRUPOS', 'GRUPOS_E_MATA_MATA', 'JOGO_UNICO', 'IDA_E_VOLTA');
CREATE TYPE "CompetitionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'FINISHED', 'CANCELED');
CREATE TYPE "CompetitionTeamStatus" AS ENUM ('ACTIVE', 'WITHDRAWN');
CREATE TYPE "ConfrontationType" AS ENUM ('FRIENDLY', 'CHAMPIONSHIP', 'TOURNAMENT', 'FINAL', 'SEMIFINAL', 'OTHER');
CREATE TYPE "ConfrontationStatus" AS ENUM ('SCHEDULED', 'RUNNING', 'FINISHED', 'CANCELED');

ALTER TABLE "OrganizationTenant"
  ADD COLUMN "organizationType" "OrganizationType" NOT NULL DEFAULT 'CLUBE_COM_RACHA_INTERNO',
  ADD COLUMN "mainClubName" TEXT,
  ADD COLUMN "mainClubLogoUrl" TEXT,
  ADD COLUMN "mainClubPrimaryColor" TEXT,
  ADD COLUMN "mainClubSecondaryColor" TEXT,
  ADD COLUMN "activeCategories" "TeamCategory"[] NOT NULL DEFAULT ARRAY[]::"TeamCategory"[],
  ADD COLUMN "usesFinance" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "usesAssociates" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "usesExternalGames" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "usesCompetitions" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "usesInternalRanking" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "Club" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT,
  "name" TEXT NOT NULL,
  "shortName" TEXT,
  "slug" TEXT NOT NULL,
  "logoUrl" TEXT,
  "city" TEXT,
  "state" TEXT,
  "country" TEXT DEFAULT 'Brasil',
  "responsibleName" TEXT,
  "responsiblePhone" TEXT,
  "responsibleEmail" TEXT,
  "type" "ClubType" NOT NULL DEFAULT 'EXTERNAL',
  "status" "ClubStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Club_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Team" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT,
  "clubId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" "TeamCategory" NOT NULL DEFAULT 'PRINCIPAL',
  "gender" "TeamGender" NOT NULL DEFAULT 'MIXED',
  "status" "TeamStatus" NOT NULL DEFAULT 'ACTIVE',
  "coachName" TEXT,
  "assistantName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Competition" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT,
  "name" TEXT NOT NULL,
  "seasonId" TEXT,
  "type" "CompetitionType" NOT NULL DEFAULT 'LEAGUE',
  "format" "CompetitionFormat" NOT NULL DEFAULT 'PONTOS_CORRIDOS',
  "startDate" TIMESTAMP(3),
  "endDate" TIMESTAMP(3),
  "status" "CompetitionStatus" NOT NULL DEFAULT 'DRAFT',
  "rules" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Competition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CompetitionTeam" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT,
  "competitionId" TEXT NOT NULL,
  "teamId" TEXT,
  "clubId" TEXT,
  "groupName" TEXT,
  "points" INTEGER NOT NULL DEFAULT 0,
  "wins" INTEGER NOT NULL DEFAULT 0,
  "draws" INTEGER NOT NULL DEFAULT 0,
  "losses" INTEGER NOT NULL DEFAULT 0,
  "goalsFor" INTEGER NOT NULL DEFAULT 0,
  "goalsAgainst" INTEGER NOT NULL DEFAULT 0,
  "goalDifference" INTEGER NOT NULL DEFAULT 0,
  "status" "CompetitionTeamStatus" NOT NULL DEFAULT 'ACTIVE',
  CONSTRAINT "CompetitionTeam_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Confrontation" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT,
  "homeClubId" TEXT NOT NULL,
  "awayClubId" TEXT NOT NULL,
  "homeTeamId" TEXT,
  "awayTeamId" TEXT,
  "competitionId" TEXT,
  "seasonId" TEXT,
  "type" "ConfrontationType" NOT NULL DEFAULT 'FRIENDLY',
  "status" "ConfrontationStatus" NOT NULL DEFAULT 'SCHEDULED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Confrontation_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Game"
  ADD COLUMN "gameMode" "GameMode" NOT NULL DEFAULT 'INTERNAL_SPLIT',
  ADD COLUMN "homeClubId" TEXT,
  ADD COLUMN "awayClubId" TEXT,
  ADD COLUMN "homeTeamId" TEXT,
  ADD COLUMN "awayTeamId" TEXT,
  ADD COLUMN "competitionId" TEXT,
  ADD COLUMN "round" TEXT,
  ADD COLUMN "matchNumber" INTEGER,
  ADD COLUMN "isOfficial" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "homeScore" INTEGER,
  ADD COLUMN "awayScore" INTEGER,
  ADD COLUMN "refereeName" TEXT,
  ADD COLUMN "assistantNames" TEXT,
  ADD COLUMN "delegateName" TEXT;

CREATE TABLE "GameCallUp" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT,
  "gameId" TEXT NOT NULL,
  "athleteId" TEXT NOT NULL,
  "status" "CallUpStatus" NOT NULL DEFAULT 'CALLED',
  "confirmedAt" TIMESTAMP(3),
  "responseNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GameCallUp_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Club_tenantId_slug_key" ON "Club"("tenantId", "slug");
CREATE INDEX "Club_tenantId_type_status_idx" ON "Club"("tenantId", "type", "status");
CREATE INDEX "Club_tenantId_name_idx" ON "Club"("tenantId", "name");
CREATE INDEX "Team_tenantId_clubId_idx" ON "Team"("tenantId", "clubId");
CREATE INDEX "Team_tenantId_category_status_idx" ON "Team"("tenantId", "category", "status");
CREATE INDEX "Competition_tenantId_status_idx" ON "Competition"("tenantId", "status");
CREATE INDEX "Competition_tenantId_seasonId_idx" ON "Competition"("tenantId", "seasonId");
CREATE UNIQUE INDEX "CompetitionTeam_competitionId_teamId_key" ON "CompetitionTeam"("competitionId", "teamId");
CREATE INDEX "CompetitionTeam_tenantId_competitionId_idx" ON "CompetitionTeam"("tenantId", "competitionId");
CREATE INDEX "CompetitionTeam_tenantId_points_idx" ON "CompetitionTeam"("tenantId", "points");
CREATE INDEX "Confrontation_tenantId_homeClubId_awayClubId_idx" ON "Confrontation"("tenantId", "homeClubId", "awayClubId");
CREATE INDEX "Confrontation_tenantId_competitionId_idx" ON "Confrontation"("tenantId", "competitionId");
CREATE INDEX "Game_tenantId_gameMode_date_idx" ON "Game"("tenantId", "gameMode", "date");
CREATE INDEX "Game_tenantId_homeClubId_awayClubId_idx" ON "Game"("tenantId", "homeClubId", "awayClubId");
CREATE INDEX "Game_tenantId_competitionId_idx" ON "Game"("tenantId", "competitionId");
CREATE UNIQUE INDEX "GameCallUp_gameId_athleteId_key" ON "GameCallUp"("gameId", "athleteId");
CREATE INDEX "GameCallUp_tenantId_gameId_status_idx" ON "GameCallUp"("tenantId", "gameId", "status");
CREATE INDEX "GameCallUp_tenantId_athleteId_status_idx" ON "GameCallUp"("tenantId", "athleteId", "status");

ALTER TABLE "Club" ADD CONSTRAINT "Club_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "OrganizationTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Team" ADD CONSTRAINT "Team_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "OrganizationTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Team" ADD CONSTRAINT "Team_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Competition" ADD CONSTRAINT "Competition_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "OrganizationTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Competition" ADD CONSTRAINT "Competition_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CompetitionTeam" ADD CONSTRAINT "CompetitionTeam_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "OrganizationTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompetitionTeam" ADD CONSTRAINT "CompetitionTeam_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompetitionTeam" ADD CONSTRAINT "CompetitionTeam_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CompetitionTeam" ADD CONSTRAINT "CompetitionTeam_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Confrontation" ADD CONSTRAINT "Confrontation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "OrganizationTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Confrontation" ADD CONSTRAINT "Confrontation_homeClubId_fkey" FOREIGN KEY ("homeClubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Confrontation" ADD CONSTRAINT "Confrontation_awayClubId_fkey" FOREIGN KEY ("awayClubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Confrontation" ADD CONSTRAINT "Confrontation_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Confrontation" ADD CONSTRAINT "Confrontation_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Confrontation" ADD CONSTRAINT "Confrontation_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Confrontation" ADD CONSTRAINT "Confrontation_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Game" ADD CONSTRAINT "Game_homeClubId_fkey" FOREIGN KEY ("homeClubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Game" ADD CONSTRAINT "Game_awayClubId_fkey" FOREIGN KEY ("awayClubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Game" ADD CONSTRAINT "Game_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Game" ADD CONSTRAINT "Game_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Game" ADD CONSTRAINT "Game_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GameCallUp" ADD CONSTRAINT "GameCallUp_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "OrganizationTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameCallUp" ADD CONSTRAINT "GameCallUp_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameCallUp" ADD CONSTRAINT "GameCallUp_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
