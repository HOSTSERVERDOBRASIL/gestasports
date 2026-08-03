import {
  AthletePosition,
  AthleteStatus,
  CardType,
  EventType,
  GameMode,
  GameType,
  LineupRole,
  Prisma,
  SuspensionOrigin,
  TeamSide
} from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import OpenAI from "openai";

type YearRange = {
  gte: Date;
  lt: Date;
};

type PeriodRange = YearRange & {
  month: number | null;
  year: number;
};

type CreateGameInput = {
  tenantId: string;
  type: GameType;
  date: string;
  location: string;
  championship?: string | undefined;
  gameMode?: GameMode | undefined;
  homeClubId?: string | undefined;
  awayClubId?: string | undefined;
  fieldId?: string | undefined;
  homeTeamId?: string | undefined;
  awayTeamId?: string | undefined;
  competitionId?: string | undefined;
  round?: string | undefined;
  matchNumber?: number | undefined;
  isOfficial?: boolean | undefined;
  refereeName?: string | undefined;
  assistantNames?: string | undefined;
  assistantOneName?: string | undefined;
  assistantTwoName?: string | undefined;
  fourthOfficialName?: string | undefined;
  reserveAssistantName?: string | undefined;
  varName?: string | undefined;
  avarName?: string | undefined;
  delegateName?: string | undefined;
  note?: string | undefined;
  gameValueCents?: number | undefined;
  seasonId?: string | undefined;
  redTeamName?: string | undefined;
  whiteTeamName?: string | undefined;
  redUniformColor?: string | undefined;
  whiteUniformColor?: string | undefined;
  redUniformImageUrl?: string | undefined;
  whiteUniformImageUrl?: string | undefined;
  redCrestUrl?: string | undefined;
  whiteCrestUrl?: string | undefined;
  redFormation?: string | null | undefined;
  whiteFormation?: string | null | undefined;
  halfDurationMinutes?: number | undefined;
  breakDurationMinutes?: number | undefined;
};

type SetResultInput = {
  gameId: string;
  redScore: number;
  whiteScore: number;
};

type LineupInput = {
  gameId: string;
  athleteId: string;
  side: TeamSide;
  role: "STARTER" | "RESERVE" | "GOALKEEPER" | "ABSENT";
  presence: boolean;
  jerseyNumber?: number | null | undefined;
  tacticalSlot?: number | null | undefined;
  shirtName?: string | undefined;
};

type GameEventInput = {
  athleteId: string;
  type: EventType;
  minute?: number | undefined;
  side?: TeamSide | undefined;
  note?: string | undefined;
  reason?: string | undefined;
  referee?: string | undefined;
  teamName?: string | undefined;
};

type GameSubstitutionInput = {
  athleteOutId: string;
  athleteInId: string;
  minute?: number | undefined;
  side?: TeamSide | undefined;
  note?: string | undefined;
};

type GameClockAction = "START" | "HALFTIME" | "SECOND_HALF" | "PAUSE" | "RESUME" | "FINISH" | "RESET";
type GameStatusValue = "SCHEDULED" | "RUNNING" | "PAUSED" | "FINISHED" | "CANCELED";

function getYearRange(year: number): YearRange {
  return {
    gte: new Date(Date.UTC(year, 0, 1)),
    lt: new Date(Date.UTC(year + 1, 0, 1))
  };
}

function getPeriodRange(year: number, month?: number): PeriodRange {
  if (month) {
    return {
      gte: new Date(Date.UTC(year, month - 1, 1)),
      lt: new Date(Date.UTC(year, month, 1)),
      month,
      year
    };
  }

  return {
    ...getYearRange(year),
    month: null,
    year
  };
}

function currentElapsedSeconds(game: { status: GameStatusValue; date: Date; startedAt: Date | null; elapsedSeconds: number }) {
  if (game.status !== "RUNNING" || !game.startedAt) {
    if (game.status === "SCHEDULED" && game.date) {
      const scheduledElapsed = Math.floor((Date.now() - game.date.getTime()) / 1000);
      if (scheduledElapsed >= 0 && scheduledElapsed <= 6 * 60 * 60) {
        return scheduledElapsed;
      }
    }
    return game.elapsedSeconds;
  }

  return Math.max(0, game.elapsedSeconds + Math.floor((Date.now() - game.startedAt.getTime()) / 1000));
}

function currentMatchMinute(game: { status: GameStatusValue; date: Date; startedAt: Date | null; elapsedSeconds: number }) {
  return Math.min(130, Math.max(0, Math.floor(currentElapsedSeconds(game) / 60)));
}

async function assertCompleteInternalLineup(tx: any, gameId: string) {
  const game = await tx.game.findUnique({
    where: { id: gameId },
    select: { id: true, type: true }
  });

  if (!game) {
    throw new Error("Jogo não encontrado.");
  }

  if (game.type !== GameType.INTERNAL) {
    return;
  }

  const lineups = await tx.gameLineup.groupBy({
    by: ["side"],
    where: {
      gameId,
      side: { in: [TeamSide.RED, TeamSide.WHITE] },
      role: { in: [LineupRole.STARTER, LineupRole.GOALKEEPER] }
    },
    _count: { _all: true }
  });
  const countFor = (side: TeamSide) => lineups.find((lineup: { side: TeamSide }) => lineup.side === side)?._count._all ?? 0;
  const redCount = countFor(TeamSide.RED);
  const whiteCount = countFor(TeamSide.WHITE);

  if (redCount !== 11 || whiteCount !== 11) {
    throw new Error(`Para registrar o jogo, cada lado precisa ter 11 atletas em campo. Atual: Time A ${redCount}/11, Time B ${whiteCount}/11.`);
  }
}

async function createSuspensionIfMissing(
  tx: any,
  athleteId: string,
  origin: SuspensionOrigin,
  startsAt: Date,
  reason: string,
  tenantId: string | null
) {
  const existing = await tx.suspension.findFirst({
    where: {
      athleteId,
      origin,
      startsAt
    }
  });

  if (existing) {
    return existing;
  }

  return tx.suspension.create({
    data: {
      athleteId,
      origin,
      reason,
      startsAt,
      active: true,
      matchesToServe: 1,
      ...(tenantId ? { tenantId } : {})
    }
  });
}

async function enforceAutomaticSuspension(
  tx: any,
  gameId: string,
  event: GameEventInput
) {
  if (event.type !== EventType.YELLOW_CARD && event.type !== EventType.RED_CARD) {
    return;
  }

  const game = await tx.game.findUnique({
    where: { id: gameId },
    select: { id: true, date: true, seasonId: true, tenantId: true }
  });

  if (!game) {
    throw new Error("Jogo não encontrado para regra disciplinar.");
  }

  const cardType = event.type === EventType.YELLOW_CARD ? CardType.YELLOW : CardType.RED;

  await tx.cardRecord.create({
    data: {
      athleteId: event.athleteId,
      gameId,
      seasonId: game.seasonId || null,
      type: cardType,
      reason: event.reason || null,
      minute: event.minute || null,
      referee: event.referee || null,
      teamName: event.teamName || null,
      note: event.note || null,
      cardDate: game.date
    }
  });

  if (cardType === CardType.RED) {
    await createSuspensionIfMissing(
      tx,
      event.athleteId,
      SuspensionOrigin.DIRECT_RED,
      game.date,
      "Suspensão automática por vermelho direto",
      game.tenantId
    );

    return;
  }

  const yellowCount = game.seasonId
    ? await tx.cardRecord.count({
        where: {
          athleteId: event.athleteId,
          seasonId: game.seasonId,
          type: CardType.YELLOW
        }
      })
    : await tx.cardRecord.count({
        where: {
          athleteId: event.athleteId,
          type: CardType.YELLOW,
          cardDate: {
            gte: new Date(Date.UTC(game.date.getUTCFullYear(), 0, 1)),
            lt: new Date(Date.UTC(game.date.getUTCFullYear() + 1, 0, 1))
          }
        }
      });

  if (yellowCount > 0 && yellowCount % 3 === 0) {
    await createSuspensionIfMissing(
      tx,
      event.athleteId,
      SuspensionOrigin.YELLOW_ACCUMULATION,
      game.date,
      "Suspensão automática por acumulação de 3 amarelos",
      game.tenantId
    );
  }
}

async function checkAthleteSuspension(
  tx: any,
  athleteId: string,
  gameDate: Date
) {
  const activeSuspension = await tx.suspension.findFirst({
    where: {
      athleteId,
      active: true,
      startsAt: { lte: gameDate },
      OR: [{ endsAt: null }, { endsAt: { gte: gameDate } }]
    }
  });

  return activeSuspension;
}

async function serveActiveSuspensions(tx: any, gameId: string) {
  const game = await tx.game.findUnique({
    where: { id: gameId },
    select: { id: true, date: true, tenantId: true }
  });
  if (!game) return;

  const presentAthletes = await tx.gameLineup.findMany({
    where: { gameId, presence: true },
    select: { athleteId: true }
  });

  for (const { athleteId } of presentAthletes) {
    const suspension = await tx.suspension.findFirst({
      where: {
        athleteId,
        active: true,
        startsAt: { lte: game.date },
        OR: [{ endsAt: null }, { endsAt: { gte: game.date } }]
      }
    });
    if (!suspension) continue;
    const remaining = suspension.matchesToServe - 1;
    await tx.suspension.update({
      where: { id: suspension.id },
      data: {
        matchesToServe: remaining,
        active: remaining > 0,
        endsAt: remaining <= 0 ? game.date : suspension.endsAt
      }
    });
  }
}

export async function createGame(input: CreateGameInput) {
  return prisma.game.create({
    data: {
      tenantId: input.tenantId,
      type: input.type,
      date: new Date(input.date),
      location: input.location,
      ...(input.championship ? { championship: input.championship } : {}),
      ...(input.gameMode ? { gameMode: input.gameMode } : {}),
      ...(input.homeClubId ? { homeClubId: input.homeClubId } : {}),
      ...(input.awayClubId ? { awayClubId: input.awayClubId } : {}),
      ...(input.fieldId ? { fieldId: input.fieldId } : {}),
      ...(input.homeTeamId ? { homeTeamId: input.homeTeamId } : {}),
      ...(input.awayTeamId ? { awayTeamId: input.awayTeamId } : {}),
      ...(input.competitionId ? { competitionId: input.competitionId } : {}),
      ...(input.round ? { round: input.round } : {}),
      ...(input.matchNumber !== undefined ? { matchNumber: input.matchNumber } : {}),
      ...(input.isOfficial !== undefined ? { isOfficial: input.isOfficial } : {}),
      ...(input.refereeName ? { refereeName: input.refereeName } : {}),
      ...(input.assistantNames ? { assistantNames: input.assistantNames } : {}),
      ...(input.assistantOneName ? { assistantOneName: input.assistantOneName } : {}),
      ...(input.assistantTwoName ? { assistantTwoName: input.assistantTwoName } : {}),
      ...(input.fourthOfficialName ? { fourthOfficialName: input.fourthOfficialName } : {}),
      ...(input.reserveAssistantName ? { reserveAssistantName: input.reserveAssistantName } : {}),
      ...(input.varName ? { varName: input.varName } : {}),
      ...(input.avarName ? { avarName: input.avarName } : {}),
      ...(input.delegateName ? { delegateName: input.delegateName } : {}),
      ...(input.note ? { note: input.note } : {}),
      ...(input.gameValueCents !== undefined ? { gameValueCents: input.gameValueCents } : {}),
      ...(input.seasonId ? { seasonId: input.seasonId } : {}),
      ...(input.redTeamName ? { redTeamName: input.redTeamName } : {}),
      ...(input.whiteTeamName ? { whiteTeamName: input.whiteTeamName } : {}),
      ...(input.redUniformColor ? { redUniformColor: input.redUniformColor } : {}),
      ...(input.whiteUniformColor ? { whiteUniformColor: input.whiteUniformColor } : {}),
      ...(input.redUniformImageUrl ? { redUniformImageUrl: input.redUniformImageUrl } : {}),
      ...(input.whiteUniformImageUrl ? { whiteUniformImageUrl: input.whiteUniformImageUrl } : {}),
      ...(input.redCrestUrl ? { redCrestUrl: input.redCrestUrl } : {}),
      ...(input.whiteCrestUrl ? { whiteCrestUrl: input.whiteCrestUrl } : {}),
      ...(input.redFormation !== undefined ? { redFormation: input.redFormation } : {}),
      ...(input.whiteFormation !== undefined ? { whiteFormation: input.whiteFormation } : {}),
      ...(input.halfDurationMinutes !== undefined ? { halfDurationMinutes: input.halfDurationMinutes } : {}),
      ...(input.breakDurationMinutes !== undefined ? { breakDurationMinutes: input.breakDurationMinutes } : {})
    }
  });
}

export async function updateGameClock(gameId: string, action: GameClockAction) {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: {
      id: true,
      status: true,
      startedAt: true,
      date: true,
      elapsedSeconds: true,
      halfDurationMinutes: true,
      breakDurationMinutes: true
    }
  });

  if (!game) {
    throw new Error("Jogo não encontrado.");
  }

  const now = new Date();
  if (action === "START") {
    if (game.status === "FINISHED") {
      throw new Error("Súmula encerrada não pode ser reiniciada.");
    }

    return prisma.$transaction(async (tx) => {
      await assertCompleteInternalLineup(tx, gameId);
      return tx.game.update({
        where: { id: gameId },
        data: {
          status: "RUNNING",
          startedAt: now,
          pausedAt: null,
          finishedAt: null,
          elapsedSeconds: 0
        }
      });
    });
  }

  if (action === "PAUSE") {
    return prisma.game.update({
      where: { id: gameId },
      data: {
        status: "PAUSED",
        pausedAt: now,
        elapsedSeconds: currentElapsedSeconds(game)
      }
    });
  }

  if (action === "RESUME") {
    return prisma.game.update({
      where: { id: gameId },
      data: {
        status: "RUNNING",
        startedAt: now,
        pausedAt: null
      }
    });
  }

  if (action === "FINISH") {
    return prisma.$transaction(async (tx) => {
      await assertCompleteInternalLineup(tx, gameId);
      const updated = await tx.game.update({
        where: { id: gameId },
        data: {
          status: "FINISHED",
          finishedAt: now,
          pausedAt: null,
          elapsedSeconds: currentElapsedSeconds(game)
        }
      });
      await updateCompetitionStandings(tx, gameId);
      await serveActiveSuspensions(tx, gameId);
      return updated;
    });
  }

  if (action === "HALFTIME") {
    return prisma.$transaction(async (tx) => {
      await assertCompleteInternalLineup(tx, gameId);
      return tx.game.update({
        where: { id: gameId },
        data: {
          status: "PAUSED",
          startedAt: null,
          pausedAt: now,
          elapsedSeconds: game.halfDurationMinutes * 60
        }
      });
    });
  }

  if (action === "SECOND_HALF") {
    return prisma.$transaction(async (tx) => {
      await assertCompleteInternalLineup(tx, gameId);
      return tx.game.update({
        where: { id: gameId },
        data: {
          status: "RUNNING",
          startedAt: now,
          pausedAt: null,
          elapsedSeconds: (game.halfDurationMinutes + game.breakDurationMinutes) * 60
        }
      });
    });
  }

  return prisma.game.update({
    where: { id: gameId },
    data: {
      status: "SCHEDULED",
      startedAt: null,
      pausedAt: null,
      finishedAt: null,
      elapsedSeconds: 0
    }
  });
}

export async function setGameResult(input: SetResultInput) {
  return prisma.$transaction(async (tx) => {
    const game = await tx.game.findUnique({
      where: { id: input.gameId },
      select: { id: true, type: true, seasonId: true, status: true }
    });

    if (!game) {
      throw new Error("Jogo não encontrado.");
    }

    await assertCompleteInternalLineup(tx, input.gameId);

    const isDraw = input.redScore === input.whiteScore;
    const winnerSide = isDraw ? null : input.redScore > input.whiteScore ? TeamSide.RED : TeamSide.WHITE;

    const updatedGame = await tx.game.update({
      where: { id: input.gameId },
      data: {
        redScore: input.redScore,
        whiteScore: input.whiteScore,
        isDraw,
        winnerSide
      }
    });

    if (game.type === GameType.INTERNAL) {
      await tx.confrontationMatch.upsert({
        where: { gameId: game.id },
        update: { redScore: input.redScore, whiteScore: input.whiteScore, isDraw, winnerSide, seasonId: game.seasonId || null },
        create: { gameId: game.id, seasonId: game.seasonId || null, redScore: input.redScore, whiteScore: input.whiteScore, isDraw, winnerSide }
      });
    }

    await updateCompetitionStandings(tx, input.gameId);

    return updatedGame;
  });
}

export async function upsertLineup(input: LineupInput) {
  return prisma.$transaction(async (tx) => {
    const game = await tx.game.findUnique({
      where: { id: input.gameId },
      select: { id: true, date: true }
    });

    if (!game) {
      throw new Error("Jogo não encontrado.");
    }

    if (input.role !== "ABSENT") {
      const athlete = await tx.athlete.findUnique({
        where: { id: input.athleteId },
        select: { id: true, name: true, position: true, status: true, medicalStatus: true }
      });

      if (!athlete) {
        throw new Error("Atleta não encontrado.");
      }

      if (athlete.status !== AthleteStatus.ACTIVE) {
        throw new Error(`${athlete.name} precisa estar ativo para ser escalado.`);
      }

      if (athlete.medicalStatus === "INJURED" || athlete.medicalStatus === "TREATMENT") {
        throw new Error(`${athlete.name} está em departamento médico e não pode ser escalado.`);
      }

      const isGoalkeeper = athlete.position === AthletePosition.GOALKEEPER || athlete.position === AthletePosition.BOTH;
      if (input.role === LineupRole.STARTER && isGoalkeeper) {
        throw new Error(`${athlete.name} é goleiro e só pode entrar como goleiro ou reserva.`);
      }

      if (input.role === LineupRole.GOALKEEPER && !isGoalkeeper) {
        throw new Error(`${athlete.name} é jogador de linha e não pode entrar como goleiro.`);
      }

      const suspension = await checkAthleteSuspension(tx, input.athleteId, game.date);
      if (suspension) {
        throw new Error(`${athlete.name} está suspenso e não pode ser escalado.`);
      }
    }

    if (input.jerseyNumber !== undefined && input.jerseyNumber !== null && input.role !== "ABSENT") {
      const duplicateJersey = await tx.gameLineup.findFirst({
        where: {
          gameId: input.gameId,
          side: input.side,
          role: { not: "ABSENT" },
          jerseyNumber: input.jerseyNumber,
          athleteId: { not: input.athleteId }
        },
        select: {
          athlete: {
            select: { name: true }
          }
        }
      });

      if (duplicateJersey) {
        throw new Error(`Camisa #${input.jerseyNumber} já está em uso neste time por ${duplicateJersey.athlete.name}.`);
      }
    }

    const updateData: Prisma.GameLineupUpdateInput = {
      side: input.side,
      role: input.role,
      presence: input.presence
    };

    if (input.jerseyNumber !== undefined) {
      updateData.jerseyNumber = input.jerseyNumber;
    }

    if (input.tacticalSlot !== undefined) {
      updateData.tacticalSlot = input.tacticalSlot;
    }

    if (input.shirtName !== undefined) {
      updateData.shirtName = input.shirtName?.trim() ? input.shirtName.trim() : null;
    }

    return tx.gameLineup.upsert({
      where: {
        gameId_athleteId: {
          gameId: input.gameId,
          athleteId: input.athleteId
        }
      },
      update: updateData,
      create: {
        gameId: input.gameId,
        athleteId: input.athleteId,
        side: input.side,
        role: input.role,
        presence: input.presence,
        jerseyNumber: input.jerseyNumber || null,
        tacticalSlot: input.tacticalSlot || null,
        shirtName: input.shirtName?.trim() ? input.shirtName.trim() : null
      }
    });
  });
}

async function recalculateGameScore(tx: any, gameId: string) {
  const game = await tx.game.findUnique({
    where: { id: gameId },
    select: { id: true, type: true, seasonId: true, competitionId: true, homeTeamId: true, awayTeamId: true }
  });
  if (!game) return;

  const goalEvents = await tx.gameEvent.findMany({
    where: {
      gameId,
      type: { in: [EventType.GOAL, EventType.OWN_GOAL, EventType.PENALTY_SCORED] },
      side: { not: null }
    },
    select: { type: true, side: true }
  });

  let redScore = 0;
  let whiteScore = 0;
  for (const e of goalEvents) {
    if (e.type === EventType.OWN_GOAL) {
      // own goal scores for the OPPOSITE side
      if (e.side === TeamSide.RED) whiteScore += 1;
      else if (e.side === TeamSide.WHITE) redScore += 1;
    } else {
      if (e.side === TeamSide.RED) redScore += 1;
      else if (e.side === TeamSide.WHITE) whiteScore += 1;
    }
  }

  const isDraw = redScore === whiteScore;
  const winnerSide = isDraw ? null : redScore > whiteScore ? TeamSide.RED : TeamSide.WHITE;

  await tx.game.update({
    where: { id: gameId },
    data: { redScore, whiteScore, isDraw, winnerSide }
  });

  if (game.type === GameType.INTERNAL) {
    await tx.confrontationMatch.upsert({
      where: { gameId },
      update: { redScore, whiteScore, isDraw, winnerSide, seasonId: game.seasonId || null },
      create: { gameId, redScore, whiteScore, isDraw, winnerSide, seasonId: game.seasonId || null }
    });
  }
}

async function updateCompetitionStandings(tx: any, gameId: string) {
  const game = await tx.game.findUnique({
    where: { id: gameId },
    select: { competitionId: true, status: true }
  });

  if (!game?.competitionId || game.status !== "FINISHED") return;

  // Busca todos os jogos FINISHED desta competição
  const allGames = await tx.game.findMany({
    where: {
      competitionId: game.competitionId,
      status: "FINISHED",
      redScore: { not: null },
      whiteScore: { not: null }
    },
    select: {
      homeTeamId: true,
      awayTeamId: true,
      homeClubId: true,
      awayClubId: true,
      redScore: true,
      whiteScore: true,
      isDraw: true,
      winnerSide: true
    }
  });

  // Monta mapa de stats por teamId
  const stats = new Map<string, { points: number; wins: number; draws: number; losses: number; goalsFor: number; goalsAgainst: number }>();

  for (const g of allGames) {
    const sides: Array<[string | null, boolean]> = [
      [g.homeTeamId as string | null, true],
      [g.awayTeamId as string | null, false]
    ];
    for (const [teamId, isRed] of sides) {
      if (!teamId) continue;
      const s = stats.get(teamId) ?? { points: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 };
      const gf = isRed ? (g.redScore as number) : (g.whiteScore as number);
      const ga = isRed ? (g.whiteScore as number) : (g.redScore as number);
      const won = !g.isDraw && ((isRed && g.winnerSide === TeamSide.RED) || (!isRed && g.winnerSide === TeamSide.WHITE));
      const drew = g.isDraw as boolean;
      s.goalsFor += gf;
      s.goalsAgainst += ga;
      if (won) { s.wins++; s.points += 3; }
      else if (drew) { s.draws++; s.points += 1; }
      else { s.losses++; }
      stats.set(teamId, s);
    }
  }

  // Atualiza cada CompetitionTeam desta competição com os valores recalculados
  for (const [teamId, s] of stats) {
    await tx.competitionTeam.updateMany({
      where: { competitionId: game.competitionId, teamId },
      data: { ...s, goalDifference: s.goalsFor - s.goalsAgainst }
    });
  }
}

export async function registerGameEvents(gameId: string, events: GameEventInput[]) {
  return prisma.$transaction(async (tx) => {
    const game = await tx.game.findUnique({ where: { id: gameId }, select: { id: true } });
    if (!game) {
      throw new Error("Jogo não encontrado.");
    }

    const created = [] as Array<{ id: string; type: EventType; athleteId: string }>;

    for (const event of events) {
      const inserted = await tx.gameEvent.create({
        data: {
          gameId,
          athleteId: event.athleteId,
          type: event.type,
          ...(event.minute !== undefined ? { minute: event.minute } : {}),
          ...(event.side ? { side: event.side } : {}),
          ...(event.note ? { note: event.note } : {})
        },
        select: {
          id: true,
          type: true,
          athleteId: true
        }
      });

      await enforceAutomaticSuspension(tx, gameId, event);
      created.push(inserted);
    }

    // Recalculate score from all events after batch insert
    const hasScoreEvent = events.some((e) =>
      e.type === EventType.GOAL ||
      e.type === EventType.OWN_GOAL ||
      e.type === EventType.PENALTY_SCORED
    );
    if (hasScoreEvent) {
      await recalculateGameScore(tx, gameId);
    }

    return created;
  });
}

export async function registerGameSubstitution(gameId: string, input: GameSubstitutionInput) {
  return prisma.$transaction(async (tx) => {
    if (input.athleteOutId === input.athleteInId) {
      throw new Error("Escolha atletas diferentes para entrada e saida.");
    }

    const game = await tx.game.findUnique({
      where: { id: gameId },
      select: { id: true, date: true, status: true, startedAt: true, elapsedSeconds: true }
    });

    if (!game) {
      throw new Error("Jogo não encontrado.");
    }

    const lineups = await tx.gameLineup.findMany({
      where: {
        gameId,
        athleteId: { in: [input.athleteOutId, input.athleteInId] }
      },
      select: {
        athleteId: true,
        side: true,
        role: true,
        tacticalSlot: true,
        shirtName: true
      }
    });

    const outLineup = lineups.find((lineup) => lineup.athleteId === input.athleteOutId);
    const inLineup = lineups.find((lineup) => lineup.athleteId === input.athleteInId);

    if (!outLineup || !inLineup) {
      throw new Error("Os dois atletas precisam estar na escalação do jogo.");
    }

    const side = input.side ?? outLineup.side ?? inLineup.side;

    const outgoingSlot = outLineup.tacticalSlot;
    const outgoingRole = outLineup.role === LineupRole.GOALKEEPER ? LineupRole.GOALKEEPER : LineupRole.STARTER;

    await tx.gameLineup.update({
      where: {
        gameId_athleteId: {
          gameId,
          athleteId: input.athleteOutId
        }
      },
      data: { presence: true, side, role: LineupRole.RESERVE, tacticalSlot: null }
    });

    await tx.gameLineup.update({
      where: {
        gameId_athleteId: {
          gameId,
          athleteId: input.athleteInId
        }
      },
      data: {
        presence: true,
        side,
        role: outgoingRole,
        tacticalSlot: outgoingSlot,
        shirtName: outLineup.shirtName
      }
    });

    return tx.gameSubstitution.create({
      data: {
        gameId,
        athleteOutId: input.athleteOutId,
        athleteInId: input.athleteInId,
        side,
        minute: input.minute ?? currentMatchMinute(game),
        ...(input.note ? { note: input.note } : {})
      },
      include: {
        athleteOut: { select: { id: true, name: true, position: true } },
        athleteIn: { select: { id: true, name: true, position: true } }
      }
    });
  });
}

export async function deleteGameSubstitution(gameId: string, substitutionId: string) {
  const deleted = await prisma.gameSubstitution.deleteMany({
    where: {
      id: substitutionId,
      gameId
    }
  });

  return deleted.count > 0;
}

export async function deleteGameEvent(gameId: string, eventId: string) {
  return prisma.$transaction(async (tx) => {
    const event = await tx.gameEvent.findFirst({
      where: { id: eventId, gameId },
      select: { type: true }
    });

    const deleted = await tx.gameEvent.deleteMany({
      where: { id: eventId, gameId }
    });

    if (deleted.count > 0 && event) {
      const isScoreEvent = event.type === EventType.GOAL ||
        event.type === EventType.OWN_GOAL ||
        event.type === EventType.PENALTY_SCORED;
      if (isScoreEvent) {
        await recalculateGameScore(tx, gameId);
      }
    }

    return deleted.count > 0;
  });
}

export async function getScorerRanking(year: number, month?: number) {
  const periodRange = getPeriodRange(year, month);

  const [goals, assists, appearances] = await Promise.all([
    prisma.gameEvent.groupBy({
      by: ["athleteId"],
      where: {
        type: EventType.GOAL,
        game: {
          date: {
            gte: periodRange.gte,
            lt: periodRange.lt
          }
        }
      },
      _count: { athleteId: true }
    }),
    prisma.gameEvent.groupBy({
      by: ["athleteId"],
      where: {
        type: EventType.ASSIST,
        game: {
          date: {
            gte: periodRange.gte,
            lt: periodRange.lt
          }
        }
      },
      _count: { athleteId: true }
    }),
    prisma.gameLineup.groupBy({
      by: ["athleteId"],
      where: {
        presence: true,
        game: {
          date: {
            gte: periodRange.gte,
            lt: periodRange.lt
          }
        }
      },
      _count: { athleteId: true }
    })
  ]);

  const map = new Map<string, { goals: number; assists: number; games: number }>();

  for (const row of goals) {
    const current = map.get(row.athleteId) ?? { goals: 0, assists: 0, games: 0 };
    map.set(row.athleteId, {
      goals: row._count.athleteId,
      assists: current.assists,
      games: current.games
    });
  }

  for (const row of assists) {
    const current = map.get(row.athleteId) ?? { goals: 0, assists: 0, games: 0 };
    map.set(row.athleteId, {
      goals: current.goals,
      assists: row._count.athleteId,
      games: current.games
    });
  }

  for (const row of appearances) {
    const current = map.get(row.athleteId) ?? { goals: 0, assists: 0, games: 0 };
    map.set(row.athleteId, {
      goals: current.goals,
      assists: current.assists,
      games: row._count.athleteId
    });
  }

  const athleteIds = Array.from(map.keys());
  if (athleteIds.length === 0) {
    return [] as Array<{
      athleteId: string;
      name: string;
      goals: number;
      assists: number;
      games: number;
      goalAverage: number;
    }>;
  }

  const athletes = await prisma.athlete.findMany({
    where: { id: { in: athleteIds } },
    select: { id: true, name: true }
  });

  const nameById = new Map(athletes.map((athlete) => [athlete.id, athlete.name]));

  return athleteIds
    .map((athleteId) => {
      const stats = map.get(athleteId);
      if (!stats) {
        return null;
      }
      const goalsValue = stats.goals ?? 0;
      const gamesValue = stats.games ?? 0;
      return {
        athleteId,
        name: nameById.get(athleteId) ?? "Atleta",
        goals: goalsValue,
        assists: stats.assists ?? 0,
        games: gamesValue,
        goalAverage: gamesValue > 0 ? Number((goalsValue / gamesValue).toFixed(2)) : 0
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists || a.name.localeCompare(b.name));
}

export async function getCompetitionRanking(year: number, month?: number) {
  const periodRange = getPeriodRange(year, month);
  const [scorers, lineups] = await Promise.all([
    getScorerRanking(year, month),
    prisma.gameLineup.findMany({
      where: {
        presence: true,
        role: { not: LineupRole.ABSENT },
        game: {
          date: {
            gte: periodRange.gte,
            lt: periodRange.lt
          },
          redScore: { not: null },
          whiteScore: { not: null }
        }
      },
      select: {
        athleteId: true,
        side: true,
        athlete: {
          select: {
            name: true
          }
        },
        game: {
          select: {
            id: true,
            isDraw: true,
            winnerSide: true
          }
        }
      }
    })
  ]);

  const matchStats = new Map<
    string,
    {
      athleteId: string;
      name: string;
      games: number;
      wins: number;
      draws: number;
      losses: number;
    }
  >();

  for (const lineup of lineups) {
    const current =
      matchStats.get(lineup.athleteId) ??
      {
        athleteId: lineup.athleteId,
        name: lineup.athlete.name,
        games: 0,
        wins: 0,
        draws: 0,
        losses: 0
      };

    current.games += 1;

    if (lineup.game.isDraw) {
      current.draws += 1;
    } else if (lineup.game.winnerSide && lineup.game.winnerSide === lineup.side) {
      current.wins += 1;
    } else {
      current.losses += 1;
    }

    matchStats.set(lineup.athleteId, current);
  }

  const wins = Array.from(matchStats.values())
    .map((item) => ({
      ...item,
      winRate: item.games > 0 ? Number(((item.wins / item.games) * 100).toFixed(1)) : 0
    }))
    .sort((a, b) => b.wins - a.wins || b.winRate - a.winRate || b.games - a.games || a.name.localeCompare(b.name));

  const contributions = scorers
    .map((item) => ({
      athleteId: item.athleteId,
      name: item.name,
      goals: item.goals,
      assists: item.assists,
      total: item.goals + item.assists
    }))
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total || b.goals - a.goals || a.name.localeCompare(b.name));

  return {
    period: {
      month: periodRange.month,
      year: periodRange.year
    },
    scorers,
    wins,
    contributions
  };
}

export async function getDisciplineRanking(year: number, month?: number) {
  const periodRange = getPeriodRange(year, month);

  const [yellowCards, redCards, suspensionCounts, activeSuspensions] = await Promise.all([
    prisma.cardRecord.groupBy({
      by: ["athleteId"],
      where: {
        type: CardType.YELLOW,
        cardDate: {
          gte: periodRange.gte,
          lt: periodRange.lt
        }
      },
      _count: { athleteId: true }
    }),
    prisma.cardRecord.groupBy({
      by: ["athleteId"],
      where: {
        type: CardType.RED,
        cardDate: {
          gte: periodRange.gte,
          lt: periodRange.lt
        }
      },
      _count: { athleteId: true }
    }),
    prisma.suspension.groupBy({
      by: ["athleteId"],
      where: {
        startsAt: {
          gte: periodRange.gte,
          lt: periodRange.lt
        }
      },
      _count: { athleteId: true }
    }),
    prisma.suspension.count({
      where: {
        active: true,
        startsAt: { lte: new Date() },
        OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }]
      }
    })
  ]);

  const map = new Map<string, { yellow: number; red: number; suspensions: number }>();

  for (const row of yellowCards) {
    map.set(row.athleteId, {
      yellow: row._count.athleteId,
      red: map.get(row.athleteId)?.red ?? 0,
      suspensions: map.get(row.athleteId)?.suspensions ?? 0
    });
  }

  for (const row of redCards) {
    map.set(row.athleteId, {
      yellow: map.get(row.athleteId)?.yellow ?? 0,
      red: row._count.athleteId,
      suspensions: map.get(row.athleteId)?.suspensions ?? 0
    });
  }

  for (const row of suspensionCounts) {
    map.set(row.athleteId, {
      yellow: map.get(row.athleteId)?.yellow ?? 0,
      red: map.get(row.athleteId)?.red ?? 0,
      suspensions: row._count.athleteId
    });
  }

  const athleteIds = Array.from(map.keys());
  const athletes = athleteIds.length
    ? await prisma.athlete.findMany({
        where: { id: { in: athleteIds } },
        select: { id: true, name: true }
      })
    : [];

  const nameById = new Map(athletes.map((athlete) => [athlete.id, athlete.name]));
  const ranking = athleteIds
    .map((athleteId) => {
      const stats = map.get(athleteId);
      const yellowValue = stats?.yellow ?? 0;
      const redValue = stats?.red ?? 0;
      return {
        athleteId,
        name: nameById.get(athleteId) ?? "Atleta",
        yellowCards: yellowValue,
        redCards: redValue,
        suspensions: stats?.suspensions ?? 0,
        fairPlayScore: yellowValue + redValue * 3
      };
    })
    .sort((a, b) => b.fairPlayScore - a.fairPlayScore || b.suspensions - a.suspensions || a.name.localeCompare(b.name));

  const totals = ranking.reduce(
    (acc, item) => {
      acc.yellow += item.yellowCards;
      acc.red += item.redCards;
      acc.suspensions += item.suspensions;
      return acc;
    },
    { yellow: 0, red: 0, suspensions: 0 }
  );

  return {
    period: {
      month: periodRange.month,
      year: periodRange.year
    },
    activeSuspensions,
    totals,
    ranking
  };
}

export async function getConfrontationStats(year: number, month?: number) {
  const periodRange = getPeriodRange(year, month);

  const matches = await prisma.confrontationMatch.findMany({
    where: {
      game: {
        date: {
          gte: periodRange.gte,
          lt: periodRange.lt
        }
      }
    },
    include: {
      game: {
        select: {
          id: true,
          date: true
        }
      }
    },
    orderBy: {
      game: {
        date: "asc"
      }
    }
  });

  let redWins = 0;
  let whiteWins = 0;
  let draws = 0;
  let redGoals = 0;
  let whiteGoals = 0;

  let currentStreakSide: TeamSide | null = null;
  let currentStreak = 0;
  let bestStreakSide: TeamSide | null = null;
  let bestStreak = 0;

  let biggestBlowout: {
    gameId: string;
    redScore: number;
    whiteScore: number;
    goalDifference: number;
  } | null = null;

  for (const match of matches) {
    redGoals += match.redScore;
    whiteGoals += match.whiteScore;

    const diff = Math.abs(match.redScore - match.whiteScore);
    if (!biggestBlowout || diff > biggestBlowout.goalDifference) {
      biggestBlowout = {
        gameId: match.gameId,
        redScore: match.redScore,
        whiteScore: match.whiteScore,
        goalDifference: diff
      };
    }

    if (match.isDraw) {
      draws += 1;
      currentStreakSide = null;
      currentStreak = 0;
      continue;
    }

    if (match.winnerSide === TeamSide.RED) {
      redWins += 1;
    } else if (match.winnerSide === TeamSide.WHITE) {
      whiteWins += 1;
    }

    if (match.winnerSide && (match.winnerSide === TeamSide.RED || match.winnerSide === TeamSide.WHITE)) {
      if (currentStreakSide === match.winnerSide) {
        currentStreak += 1;
      } else {
        currentStreakSide = match.winnerSide;
        currentStreak = 1;
      }

      if (currentStreak > bestStreak) {
        bestStreak = currentStreak;
        bestStreakSide = currentStreakSide;
      }
    }
  }

  const lastMatch = matches.at(-1);

  return {
    period: {
      month: periodRange.month,
      year: periodRange.year
    },
    matches: matches.length,
    redWins,
    whiteWins,
    draws,
    redGoals,
    whiteGoals,
    goalDifference: redGoals - whiteGoals,
    lastMatch: lastMatch ?
       {
          gameId: lastMatch.gameId,
          redScore: lastMatch.redScore,
          whiteScore: lastMatch.whiteScore,
          isDraw: lastMatch.isDraw,
          winnerSide: lastMatch.winnerSide,
          date: lastMatch.game.date.toISOString()
        }
      : null,
    bestStreak:
      bestStreakSide && bestStreak > 0
        ? {
            side: bestStreakSide,
            wins: bestStreak
          }
        : null,
    biggestBlowout
  };
}

export async function getActiveSuspensions() {
  const now = new Date();

  return prisma.suspension.findMany({
    where: {
      active: true,
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gte: now } }]
    },
    include: {
      athlete: {
        select: {
          id: true,
          name: true,
          status: true
        }
      }
    },
    orderBy: { startsAt: "desc" }
  });
}

type LineupSuggestionAthlete = {
  athleteId: string;
  name: string;
  position: string;
  role: string;
};

type LineupSuggestionResult = {
  redTeam: LineupSuggestionAthlete[];
  whiteTeam: LineupSuggestionAthlete[];
  formation: string;
  reasoning: string;
};

function fallbackLineupSuggestion(
  athletes: Array<{ id: string; name: string; position: string; rating: number }>
): LineupSuggestionResult {
  // Sort by rating descending
  const sorted = [...athletes].sort((a, b) => b.rating - a.rating);

  const goalkeepers = sorted.filter((a) => a.position === "GOALKEEPER" || a.position === "BOTH");
  const outfield = sorted.filter((a) => a.position !== "GOALKEEPER" && a.position !== "BOTH");

  const redTeam: LineupSuggestionAthlete[] = [];
  const whiteTeam: LineupSuggestionAthlete[] = [];

  // Assign one goalkeeper per side
  const gkRed = goalkeepers[0];
  const gkWhite = goalkeepers[1];

  if (gkRed) {
    redTeam.push({ athleteId: gkRed.id, name: gkRed.name, position: gkRed.position, role: "GOALKEEPER" });
  }
  if (gkWhite) {
    whiteTeam.push({ athleteId: gkWhite.id, name: gkWhite.name, position: gkWhite.position, role: "GOALKEEPER" });
  }

  // Distribute outfield players alternately
  outfield.forEach((athlete, index) => {
    const entry: LineupSuggestionAthlete = { athleteId: athlete.id, name: athlete.name, position: athlete.position, role: "STARTER" };
    if (index % 2 === 0) {
      if (redTeam.length < 11) redTeam.push(entry);
      else if (whiteTeam.length < 11) whiteTeam.push(entry);
    } else {
      if (whiteTeam.length < 11) whiteTeam.push(entry);
      else if (redTeam.length < 11) redTeam.push(entry);
    }
  });

  return {
    redTeam,
    whiteTeam,
    formation: "4-3-3",
    reasoning: "Sugestão automática sem IA: atletas ordenados por rating e distribuídos de forma equilibrada."
  };
}

export async function suggestLineup(gameId: string, tenantId: string): Promise<LineupSuggestionResult> {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: {
      id: true,
      date: true,
      callUps: {
        where: { status: { in: ["CONFIRMED", "CALLED"] } },
        select: {
          athleteId: true,
          athlete: {
            select: {
              id: true,
              name: true,
              position: true,
              rating: true,
              medicalStatus: true,
              status: true
            }
          }
        }
      }
    }
  });

  if (!game) {
    throw new Error("Jogo não encontrado.");
  }

  const calledAthletes = game.callUps.map((c) => ({
    id: c.athlete.id,
    name: c.athlete.name,
    position: c.athlete.position as string,
    rating: c.athlete.rating,
    medicalStatus: c.athlete.medicalStatus,
    status: c.athlete.status as string
  }));

  // Busca suspensões ativas
  const now = game.date;
  const suspensions = await prisma.suspension.findMany({
    where: {
      athleteId: { in: calledAthletes.map((a) => a.id) },
      active: true,
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gte: now } }]
    },
    select: { athleteId: true, reason: true }
  });
  const suspendedIds = new Set(suspensions.map((s) => s.athleteId));

  // Available athletes (not suspended, active, cleared)
  const available = calledAthletes.filter(
    (a) => !suspendedIds.has(a.id) && a.status === "ACTIVE" && a.medicalStatus === "CLEARED"
  );

  // Busca presença nos últimos 10 jogos
  const recentLineups = await prisma.gameLineup.groupBy({
    by: ["athleteId"],
    where: {
      athleteId: { in: available.map((a) => a.id) },
      presence: true,
      game: { tenantId, date: { lte: now } }
    },
    _count: { athleteId: true },
    orderBy: { _count: { athleteId: "desc" } },
    take: 10
  });

  const presenceMap = new Map(recentLineups.map((r) => [r.athleteId, r._count.athleteId]));
  const athletesWithPresence = available.map((a) => ({
    ...a,
    recentAppearances: presenceMap.get(a.id) ?? 0
  }));

  if (!process.env.OPENAI_API_KEY) {
    return fallbackLineupSuggestion(available);
  }

  try {
    const client = new OpenAI();
    const suspendedList = suspensions.map((s) => ({ athleteId: s.athleteId, reason: s.reason }));

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Você é um assistente técnico de futebol. Dado o elenco abaixo, sugira a melhor escalação dividida entre Time A (RED) e Time B (WHITE) para um racha interno.
Retorne JSON: { "redTeam": [{ "athleteId": "...", "name": "...", "position": "...", "role": "..." }], "whiteTeam": [...], "formation": "4-3-3", "reasoning": "..." }
Distribua os atletas de forma equilibrada por qualidade (rating).
Elenco: ${JSON.stringify(athletesWithPresence)}
Atletas suspensos (não podem jogar): ${JSON.stringify(suspendedList)}`
        }
      ],
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return fallbackLineupSuggestion(available);
    }

    const parsed = JSON.parse(content) as LineupSuggestionResult;
    return parsed;
  } catch {
    return fallbackLineupSuggestion(available);
  }
}
