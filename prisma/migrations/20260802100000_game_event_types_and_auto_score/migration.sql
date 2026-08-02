-- Add new EventType values: OWN_GOAL, PENALTY_SCORED, PENALTY_MISSED
ALTER TYPE "EventType" ADD VALUE IF NOT EXISTS 'OWN_GOAL';
ALTER TYPE "EventType" ADD VALUE IF NOT EXISTS 'PENALTY_SCORED';
ALTER TYPE "EventType" ADD VALUE IF NOT EXISTS 'PENALTY_MISSED';

-- Add homeScore/awayScore to Game for external games (already exists in schema, this migration is safe no-op if columns exist)
-- Nothing to do — these columns were added in the init migration.

-- Add competitionId tracking to CompetitionTeam for upsert key
-- Already exists as @@unique([competitionId, teamId]) — no changes needed.
