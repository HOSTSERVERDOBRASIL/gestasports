import type { FastifyInstance } from "fastify";
import { randomInt } from "node:crypto";
import {
  AssociateStatus,
  AthleteLinkType,
  AthletePosition,
  AthleteStatus,
  EventType,
  FinancialCategory,
  FinancialEntryStatus,
  FinancialEntryType,
  PaymentStatus,
  Prisma
} from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { canUsePixAutoSettlement, createPixCheckout, createPixTxid, scheduleAutoSettlement, sendPaymentConfirmationEmail } from "./athlete-payment.service.js";
import { env } from "../../config/env.js";
import { canCreateSicoobPixCharge, createSicoobPixCheckout } from "../finance/sicoob-pix.service.js";

const athleteQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12).default(new Date().getUTCMonth() + 1),
  year: z.coerce.number().int().min(1980).max(2100).default(new Date().getUTCFullYear()),
  status: z.nativeEnum(AthleteStatus).optional(),
  position: z.nativeEnum(AthletePosition).optional()
});

const athleteParamsSchema = z.object({
  id: z.string().min(1)
});

const athletePhotoSchema = z
  .string()
  .max(2_500_000)
  .refine((value) => value === "" || /^https:\/\//.test(value) || /^data:image\/(png|jpeg|webp);base64,/.test(value), "Foto deve ser uma URL ou imagem enviada");

const athletePayloadSchema = z.object({
  name: z.string().min(2),
  position: z.nativeEnum(AthletePosition),
  secondaryPositions: z.array(z.nativeEnum(AthletePosition)).default([]),
  linkType: z.nativeEnum(AthleteLinkType).default(AthleteLinkType.ASSOCIATE),
  status: z.nativeEnum(AthleteStatus).default(AthleteStatus.ACTIVE),
  rating: z.number().int().min(1).max(5).default(3),
  birthDate: z.string().datetime().optional().nullable().or(z.literal("")),
  joinedAt: z.string().datetime().optional().nullable().or(z.literal("")),
  photoUrl: athletePhotoSchema.optional(),
  sportsNote: z.string().max(500).optional().or(z.literal("")),
  medicalStatus: z.enum(["CLEARED", "OBSERVATION", "INJURED", "TREATMENT"]).optional(),
  medicalNote: z.string().max(700).optional().or(z.literal("")),
  medicalReturnDate: z.string().datetime().optional().nullable().or(z.literal("")),
  associateId: z.string().min(1).optional().or(z.literal("")),
  guestBillingEnabled: z.boolean().default(false),
  guestFeeCents: z.number().int().min(0).default(0),
  associate: z
    .object({
      email: z.string().email().optional().or(z.literal("")),
      phone: z.string().min(8).optional().or(z.literal("")),
      monthlyFeeCents: z.number().int().min(0).default(6000),
      status: z.nativeEnum(AssociateStatus).default(AssociateStatus.ACTIVE),
      joinedAt: z.string().datetime().optional().nullable().or(z.literal(""))
    })
    .optional()
});

const updateAthleteSchema = athletePayloadSchema.partial();
const athleteSelfPhotoSchema = z.object({
  photoUrl: athletePhotoSchema
});
const athleteSelfMedicalSchema = z.object({
  medicalStatus: z.enum(["CLEARED", "OBSERVATION", "INJURED", "TREATMENT"]),
  medicalNote: z.string().max(700).optional().or(z.literal("")),
  medicalReturnDate: z.string().datetime().optional().nullable().or(z.literal(""))
});

const lineupDraftSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(1980).max(2100),
  gameId: z.string().min(1).optional(),
  athleteIds: z.array(z.string().min(1)).default([]),
  captainRedId: z.string().min(1).optional().or(z.literal("")),
  captainWhiteId: z.string().min(1).optional().or(z.literal("")),
  playersPerTeam: z.number().int().min(7).max(11).optional(),
  includeDelinquent: z.boolean().default(true)
});

const minGoalkeepersForDraft = 2;

const athleteMePeriodSchema = z.object({
  month: z.coerce.number().int().min(1).max(12).default(new Date().getUTCMonth() + 1),
  year: z.coerce.number().int().min(1980).max(2100).default(new Date().getUTCFullYear())
});

const athletePresenceSchema = z.object({
  presence: z.boolean(),
  arrivalStatus: z.enum(["ON_TIME", "LATE", "NEEDS_RIDE", "UNAVAILABLE"]).optional().nullable(),
  confirmationNote: z.string().max(280).optional().or(z.literal(""))
});

const technicalEvaluationQuerySchema = z.object({
  year: z.coerce.number().int().min(1980).max(2100).default(new Date().getUTCFullYear())
});

const technicalEvaluationSchema = z.object({
  year: z.number().int().min(1980).max(2100),
  technicalScore: z.number().int().min(1).max(10),
  tacticalScore: z.number().int().min(1).max(10),
  physicalScore: z.number().int().min(1).max(10),
  defensiveScore: z.number().int().min(1).max(10),
  offensiveScore: z.number().int().min(1).max(10),
  commitmentScore: z.number().int().min(1).max(10),
  disciplineScore: z.number().int().min(1).max(10),
  justification: z.string().min(10).max(700),
  notes: z.string().max(700).optional().or(z.literal(""))
});

function gameLabel(game: {
  type: string;
  championship: string | null;
  redTeamName: string | null;
  whiteTeamName: string | null;
}) {
  if (game.type === "INTERNAL") {
    return `${game.redTeamName || "Time A"} x ${game.whiteTeamName || "Time B"}`;
  }

  return game.championship || "Jogo externo";
}

function dueDateForCompetence(month: number, year: number) {
  return new Date(Date.UTC(year, month - 1, 10));
}

async function settleMonthlyFeeIncome(input: {
  associateId: string;
  associateName: string;
  month: number;
  year: number;
  amountCents: number;
}) {
  const description = `Mensalidade - ${input.associateName}`;
  const existing = await prisma.financialEntry.findFirst({
    where: {
      associateId: input.associateId,
      competenceMonth: input.month,
      competenceYear: input.year,
      category: FinancialCategory.MONTHLY_FEE,
      type: FinancialEntryType.INCOME
    },
    orderBy: { createdAt: "desc" }
  });

  if (existing) {
    await prisma.financialEntry.update({
      where: { id: existing.id },
      data: {
        description,
        amountCents: input.amountCents,
        status: FinancialEntryStatus.PAID,
        paidAt: new Date()
      }
    });
    return;
  }

  await prisma.financialEntry.create({
    data: {
      type: FinancialEntryType.INCOME,
      category: FinancialCategory.MONTHLY_FEE,
      description,
      amountCents: input.amountCents,
      competenceMonth: input.month,
      competenceYear: input.year,
      status: FinancialEntryStatus.PAID,
      paidAt: new Date(),
      associateId: input.associateId
    }
  });
}

function monthsBetween(from: Date, to: Date) {
  const years = to.getUTCFullYear() - from.getUTCFullYear();
  const months = to.getUTCMonth() - from.getUTCMonth();
  const base = years * 12 + months;
  return Math.max(0, base + (to.getUTCDate() >= from.getUTCDate() ? 0 : -1));
}

function tenureLabel(totalMonths: number) {
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  if (years <= 0) {
    return months === 1 ? "1 mês" : `${months} meses`;
  }

  if (months === 0) {
    return `${years} ano${years === 1 ? "" : "s"}`;
  }

  return `${years} ano${years === 1 ? "" : "s"} e ${months === 1 ? "1 mês" : `${months} meses`}`;
}

const shortMonthLabels = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function cleanText(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";
  return normalized ? normalized : null;
}

function cleanDate(value: string | null | undefined) {
  return value ? new Date(value) : null;
}

function ageAt(date: Date | null | undefined, reference: Date) {
  if (!date) {
    return null;
  }

  let age = reference.getUTCFullYear() - date.getUTCFullYear();
  const monthDiff = reference.getUTCMonth() - date.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && reference.getUTCDate() < date.getUTCDate())) {
    age -= 1;
  }
  return Math.max(0, age);
}

function ageBucket(age: number | null | undefined) {
  if (age === null || age === undefined) {
    return "UNKNOWN";
  }
  if (age < 30) {
    return "19-29";
  }
  if (age < 40) {
    return "30-39";
  }
  if (age < 50) {
    return "40-49";
  }
  if (age < 60) {
    return "50-59";
  }
  return "60+";
}

function roundScore(value: number) {
  return Math.round(value * 10) / 10;
}

function classifyScore(score: number) {
  if (score >= 9) {
    return "Destaque";
  }
  if (score >= 7.5) {
    return "Avancado";
  }
  if (score >= 6) {
    return "Intermediario";
  }
  if (score >= 4) {
    return "Basico";
  }
  return "Inicial";
}

async function computeAthleteTechnicalStats(athleteId: string, year: number) {
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));

  const [lineups, goals, assists, yellowCards, redCards] = await Promise.all([
    prisma.gameLineup.findMany({
      where: { athleteId, game: { date: { gte: start, lt: end } } },
      select: {
        presence: true,
        confirmedAt: true,
        role: true,
        game: {
          select: {
            winnerSide: true,
            isDraw: true
          }
        },
        side: true
      }
    }),
    prisma.gameEvent.count({ where: { athleteId, type: EventType.GOAL, game: { date: { gte: start, lt: end } } } }),
    prisma.gameEvent.count({ where: { athleteId, type: EventType.ASSIST, game: { date: { gte: start, lt: end } } } }),
    prisma.cardRecord.count({ where: { athleteId, type: "YELLOW", cardDate: { gte: start, lt: end } } }),
    prisma.cardRecord.count({ where: { athleteId, type: "RED", cardDate: { gte: start, lt: end } } })
  ]);

  const eligibleLineups = lineups.filter((lineup) => lineup.role !== "ABSENT");
  const gamesRegistered = eligibleLineups.length;
  const gamesPresent = eligibleLineups.filter((lineup) => lineup.presence).length;
  const confirmations = eligibleLineups.filter((lineup) => lineup.confirmedAt).length;
  const wins = eligibleLineups.filter((lineup) => lineup.presence && !lineup.game.isDraw && lineup.game.winnerSide === lineup.side).length;
  const draws = eligibleLineups.filter((lineup) => lineup.presence && lineup.game.isDraw).length;
  const losses = Math.max(0, gamesPresent - wins - draws);
  const presencePercent = gamesRegistered > 0 ? Math.round((gamesPresent / gamesRegistered) * 100) : 0;
  const confirmationPercent = gamesRegistered > 0 ? Math.round((confirmations / gamesRegistered) * 100) : 0;
  const winRate = gamesPresent > 0 ? Math.round((wins / gamesPresent) * 100) : 0;

  const presenceScore = Math.min(10, presencePercent / 10);
  const confirmationScore = Math.min(10, confirmationPercent / 10);
  const contributionScore = Math.min(10, goals * 0.8 + assists * 0.6);
  const resultScore = Math.min(10, winRate / 10);
  const disciplineScore = Math.max(1, 10 - yellowCards * 0.7 - redCards * 2.5);
  const statsScore = roundScore((presenceScore * 0.24) + (confirmationScore * 0.16) + (contributionScore * 0.24) + (resultScore * 0.16) + (disciplineScore * 0.2));

  return {
    gamesRegistered,
    gamesPresent,
    confirmations,
    presencePercent,
    confirmationPercent,
    goals,
    assists,
    yellowCards,
    redCards,
    wins,
    draws,
    losses,
    winRate,
    statsScore
  };
}

function mapTechnicalEvaluation(evaluation: {
  id: string;
  athleteId: string;
  year: number;
  evaluatedById: string | null;
  evaluatedByName: string | null;
  evaluatedByEmail: string | null;
  technicalScore: number;
  tacticalScore: number;
  physicalScore: number;
  defensiveScore: number;
  offensiveScore: number;
  commitmentScore: number;
  disciplineScore: number;
  manualScore: number;
  statsScore: number;
  finalScore: number;
  classification: string;
  justification: string;
  notes: string | null;
  statsSnapshot: Prisma.JsonValue;
  createdAt: Date;
}) {
  return {
    ...evaluation,
    createdAt: evaluation.createdAt.toISOString()
  };
}

function normalizeAthletePosition(position: AthletePosition) {
  const legacyPositions: Partial<Record<AthletePosition, AthletePosition>> = {
    [AthletePosition.FULLBACK]: AthletePosition.RIGHT_BACK,
    [AthletePosition.MIDFIELDER]: AthletePosition.CENTRAL_MIDFIELDER,
    [AthletePosition.FORWARD]: AthletePosition.STRIKER,
    [AthletePosition.LINE]: AthletePosition.CENTRAL_MIDFIELDER,
    [AthletePosition.BOTH]: AthletePosition.GOALKEEPER
  };

  return legacyPositions[position] ?? position;
}

function normalizeAthletePositions(position: AthletePosition, secondaryPositions: AthletePosition[] = []) {
  return Array.from(
    new Set(
      secondaryPositions
        .map(normalizeAthletePosition)
        .filter((item) => item !== normalizeAthletePosition(position))
    )
  );
}

function isInvalidContractedGoalkeeper(linkType: AthleteLinkType, position: AthletePosition) {
  return linkType === AthleteLinkType.CONTRACTED && normalizeAthletePosition(position) !== AthletePosition.GOALKEEPER;
}

function positionFilterValues(position: AthletePosition) {
  const legacyMatches: Partial<Record<AthletePosition, AthletePosition[]>> = {
    [AthletePosition.GOALKEEPER]: [AthletePosition.GOALKEEPER, AthletePosition.BOTH],
    [AthletePosition.RIGHT_BACK]: [AthletePosition.RIGHT_BACK, AthletePosition.FULLBACK],
    [AthletePosition.CENTRAL_MIDFIELDER]: [AthletePosition.CENTRAL_MIDFIELDER, AthletePosition.MIDFIELDER, AthletePosition.LINE],
    [AthletePosition.STRIKER]: [AthletePosition.STRIKER, AthletePosition.FORWARD]
  };

  return legacyMatches[position] ?? [position];
}

async function listAthletesForPeriod(month: number, year: number, filters: Partial<{ status: AthleteStatus; position: AthletePosition }>) {
  const positionValues = filters.position ? positionFilterValues(filters.position) : null;
  const athletes = await prisma.athlete.findMany({
    where: {
      ...(filters.status ? { status: filters.status } : {}),
      ...(positionValues ?
         {
            OR: [
              { position: { in: positionValues } },
              { secondaryPositions: { hasSome: positionValues } }
            ]
          }
        : {})
    },
    include: {
      associate: {
        include: {
          payments: {
            where: { month, year },
            orderBy: { createdAt: "desc" },
            take: 1
          }
        }
      },
      technicalEvaluations: {
        where: { year },
        orderBy: { createdAt: "desc" },
        take: 1
      }
    },
    orderBy: [{ status: "asc" }, { name: "asc" }]
  });

  const referenceDate = new Date(Date.UTC(year, month - 1, 1));

  return athletes.map((athlete) => {
    const payment = athlete.associate?.payments[0] || null;
    const birthDate = (athlete.birthDate ?? athlete.associate?.birthDate) || null;
    const isAssociate = athlete.linkType === AthleteLinkType.ASSOCIATE && athlete.associate;
    const paidThisMonth = !isAssociate || payment?.status === PaymentStatus.PAID;
    const amountDueCents = isAssociate && !paidThisMonth ? athlete.associate?.monthlyFeeCents ?? 0 : 0;
    const blockedByStatus =
      athlete.status !== AthleteStatus.ACTIVE ||
      athlete.associate?.status === AssociateStatus.INACTIVE ||
      athlete.medicalStatus === "INJURED" ||
      athlete.medicalStatus === "TREATMENT";
    const canPlay = !blockedByStatus;
    const technicalEvaluation = athlete.technicalEvaluations[0] ?? null;
    const technicalBalanceScore = technicalEvaluation?.finalScore ?? athlete.rating * 2;

    return {
      id: athlete.id,
      name: athlete.name,
      position: normalizeAthletePosition(athlete.position),
      secondaryPositions: normalizeAthletePositions(athlete.position, athlete.secondaryPositions),
      linkType: athlete.linkType,
      status: athlete.status,
      rating: athlete.rating,
      technicalBalanceScore,
      technicalBalanceSource: technicalEvaluation ? "TECHNICAL_EVALUATION" : "RATING",
      birthDate: birthDate?.toISOString() ?? null,
      age: ageAt(birthDate, referenceDate),
      ageBucket: ageBucket(ageAt(birthDate, referenceDate)),
      photoUrl: athlete.photoUrl,
      sportsNote: athlete.sportsNote,
      medicalStatus: athlete.medicalStatus,
      medicalNote: athlete.medicalNote,
      medicalReturnDate: athlete.medicalReturnDate?.toISOString() ?? null,
      medicalReportedBy: athlete.medicalReportedBy,
      associateId: athlete.associateId,
      guestBillingEnabled: athlete.guestBillingEnabled,
      guestFeeCents: athlete.guestFeeCents,
      joinedAt: athlete.joinedAt?.toISOString() ?? null,
      createdAt: athlete.createdAt.toISOString(),
      updatedAt: athlete.updatedAt.toISOString(),
      associate: athlete.associate ?
         {
            id: athlete.associate.id,
            name: athlete.associate.name,
            email: athlete.associate.email,
            phone: athlete.associate.phone,
            status: athlete.associate.status,
            monthlyFeeCents: athlete.associate.monthlyFeeCents,
            joinedAt: athlete.associate.joinedAt?.toISOString() ?? null
          }
        : null,
      payment: payment ?
         {
            id: payment.id,
            status: payment.status,
            amountCents: payment.amountCents,
            dueDate: payment.dueDate?.toISOString() ?? null,
            paidAt: payment.paidAt?.toISOString() ?? null
          }
        : null,
      paidThisMonth,
      amountDueCents,
      canPlay
    };
  });
}

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = randomInt(index + 1);
    const current = copy[index] as T;
    copy[index] = copy[target] as T;
    copy[target] = current;
  }
  return copy;
}

function playerTechnicalLevel(player: { rating: number; technicalBalanceScore?: number | null }) {
  return player.technicalBalanceScore ?? player.rating * 2;
}

function teamTechnicalLevel<T extends { rating: number; technicalBalanceScore?: number | null }>(players: T[]) {
  return players.reduce((total, player) => total + playerTechnicalLevel(player), 0);
}

function athleteCanPlayPosition(player: { position: AthletePosition; secondaryPositions: AthletePosition[] }, position: AthletePosition) {
  return player.position === position || (player.secondaryPositions ?? []).includes(position);
}

function positionCount<T extends { position: AthletePosition; secondaryPositions: AthletePosition[] }>(players: T[], position: AthletePosition) {
  return players.filter((player) => athleteCanPlayPosition(player, position)).length;
}

function averageAge<T extends { age: number | null }>(players: T[]) {
  const ages = players.map((player) => player.age).filter((age): age is number => typeof age === "number");
  if (ages.length === 0) {
    return null;
  }
  return ages.reduce((total, age) => total + age, 0) / ages.length;
}

function ageBucketBalancePenalty<T extends { age: number | null }>(red: T[], white: T[]) {
  const buckets = ["19-29", "30-39", "40-49", "50-59", "60+", "UNKNOWN"];
  return buckets.reduce((penalty, bucket) => {
    const redCount = red.filter((player) => ageBucket(player.age) === bucket).length;
    const whiteCount = white.filter((player) => ageBucket(player.age) === bucket).length;
    return penalty + Math.abs(redCount - whiteCount) * (bucket === "UNKNOWN" ? 6 : 14);
  }, 0);
}

function teamBalanceScore<T extends { rating: number; technicalBalanceScore?: number | null; position: AthletePosition; secondaryPositions: AthletePosition[]; age: number | null }>(red: T[], white: T[]) {
  const technicalLevelPenalty = Math.abs(teamTechnicalLevel(red) - teamTechnicalLevel(white)) * 55;
  const redAverageAge = averageAge(red);
  const whiteAverageAge = averageAge(white);
  const ageAveragePenalty = redAverageAge !== null && whiteAverageAge !== null ? Math.abs(redAverageAge - whiteAverageAge) * 8 : 0;
  const ageBucketPenalty = ageBucketBalancePenalty(red, white);
  const goalkeeperPenalty = Math.abs(positionCount(red, AthletePosition.GOALKEEPER) - positionCount(white, AthletePosition.GOALKEEPER)) * 45;
  const tacticalPositionPenalty =
    Math.abs(positionCount(red, AthletePosition.DEFENDER) - positionCount(white, AthletePosition.DEFENDER)) * 18 +
    Math.abs(positionCount(red, AthletePosition.RIGHT_BACK) - positionCount(white, AthletePosition.RIGHT_BACK)) * 16 +
    Math.abs(positionCount(red, AthletePosition.LEFT_BACK) - positionCount(white, AthletePosition.LEFT_BACK)) * 16 +
    Math.abs(positionCount(red, AthletePosition.DEFENSIVE_MIDFIELDER) - positionCount(white, AthletePosition.DEFENSIVE_MIDFIELDER)) * 18 +
    Math.abs(positionCount(red, AthletePosition.CENTRAL_MIDFIELDER) - positionCount(white, AthletePosition.CENTRAL_MIDFIELDER)) * 18 +
    Math.abs(positionCount(red, AthletePosition.ATTACKING_MIDFIELDER) - positionCount(white, AthletePosition.ATTACKING_MIDFIELDER)) * 18 +
    Math.abs(positionCount(red, AthletePosition.RIGHT_WINGER) - positionCount(white, AthletePosition.RIGHT_WINGER)) * 18 +
    Math.abs(positionCount(red, AthletePosition.LEFT_WINGER) - positionCount(white, AthletePosition.LEFT_WINGER)) * 18 +
    Math.abs(positionCount(red, AthletePosition.STRIKER) - positionCount(white, AthletePosition.STRIKER)) * 18;
  const sizePenalty = Math.abs(red.length - white.length) * 8;

  return technicalLevelPenalty + goalkeeperPenalty + tacticalPositionPenalty + ageAveragePenalty + ageBucketPenalty + sizePenalty;
}

function pickRandomBest<T>(candidates: Array<{ score: number; value: T }>) {
  let bestScore = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    if (candidate.score < bestScore) {
      bestScore = candidate.score;
    }
  }
  const bestCandidates = candidates.filter((candidate) => candidate.score === bestScore);
  return (bestCandidates[randomInt(bestCandidates.length)] as { score: number; value: T }).value;
}

function splitBalancedTeamsWithSize<T extends { rating: number; technicalBalanceScore?: number | null; position: AthletePosition; secondaryPositions: AthletePosition[]; age: number | null }>(players: T[], redSize: number) {
  const shuffledPlayers = shuffle(players);

  if (shuffledPlayers.length <= 20) {
    const candidates: Array<{ score: number; value: { red: T[]; white: T[] } }> = [];

    function visit(index: number, red: T[]) {
      if (red.length === redSize) {
        const redSet = new Set(red);
        const white = shuffledPlayers.filter((player) => !redSet.has(player));
        candidates.push({
          score: teamBalanceScore(red, white),
          value: { red, white }
        });
        return;
      }

      if (index >= shuffledPlayers.length || red.length + (shuffledPlayers.length - index) < redSize) {
        return;
      }

      visit(index + 1, [...red, shuffledPlayers[index] as T]);
      visit(index + 1, red);
    }

    visit(0, []);
    return pickRandomBest(candidates);
  }

  const candidates = Array.from({ length: 300 }, () => {
    const sorted = shuffle(shuffledPlayers).sort((a, b) => playerTechnicalLevel(b) - playerTechnicalLevel(a));
    const red: T[] = [];
    const white: T[] = [];

    sorted.forEach((player) => {
      const redCandidate = [...red, player];
      const whiteCandidate = [...white, player];
      const canAddRed = red.length < redSize;
      const canAddWhite = white.length < shuffledPlayers.length - redSize;

      if (!canAddWhite || (canAddRed && teamBalanceScore(redCandidate, white) <= teamBalanceScore(red, whiteCandidate))) {
        red.push(player);
      } else {
        white.push(player);
      }
    });

    return {
      score: teamBalanceScore(red, white),
      value: { red, white }
    };
  });

  return pickRandomBest(candidates);
}

function splitBalancedTeamsWithFixed<T extends { rating: number; technicalBalanceScore?: number | null; position: AthletePosition; secondaryPositions: AthletePosition[]; age: number | null }>(
  players: T[],
  fixedRed: T[],
  fixedWhite: T[],
  redSize: number
) {
  const shuffledPlayers = shuffle(players);
  const whiteSize = shuffledPlayers.length - redSize;

  if (shuffledPlayers.length <= 20) {
    const candidates: Array<{ score: number; value: { red: T[]; white: T[] } }> = [];

    function visit(index: number, red: T[]) {
      if (red.length === redSize) {
        const redSet = new Set(red);
        const white = shuffledPlayers.filter((player) => !redSet.has(player));
        candidates.push({
          score: teamBalanceScore([...fixedRed, ...red], [...fixedWhite, ...white]),
          value: { red, white }
        });
        return;
      }

      if (index >= shuffledPlayers.length || red.length + (shuffledPlayers.length - index) < redSize) {
        return;
      }

      visit(index + 1, [...red, shuffledPlayers[index] as T]);
      visit(index + 1, red);
    }

    visit(0, []);
    return pickRandomBest(candidates);
  }

  const candidates = Array.from({ length: 300 }, () => {
    const sorted = shuffle(shuffledPlayers).sort((a, b) => playerTechnicalLevel(b) - playerTechnicalLevel(a));
    const red: T[] = [];
    const white: T[] = [];

    sorted.forEach((player) => {
      const redCandidate = [...fixedRed, ...red, player];
      const whiteCandidate = [...fixedWhite, ...white, player];
      const canAddRed = red.length < redSize;
      const canAddWhite = white.length < whiteSize;

      if (!canAddWhite || (canAddRed && teamBalanceScore(redCandidate, [...fixedWhite, ...white]) <= teamBalanceScore([...fixedRed, ...red], whiteCandidate))) {
        red.push(player);
      } else {
        white.push(player);
      }
    });

    return {
      score: teamBalanceScore([...fixedRed, ...red], [...fixedWhite, ...white]),
      value: { red, white }
    };
  });

  return pickRandomBest(candidates);
}

function splitBalancedTeams<T extends { rating: number; technicalBalanceScore?: number | null; position: AthletePosition; secondaryPositions: AthletePosition[]; age: number | null }>(players: T[]) {
  return splitBalancedTeamsWithSize(players, Math.floor(players.length / 2));
}

function splitContractedGoalkeepersForTeams<T extends { rating: number; technicalBalanceScore?: number | null; position: AthletePosition; secondaryPositions: AthletePosition[]; age: number | null }>(goalkeepers: T[], fixedRed: T[] = [], fixedWhite: T[] = []) {
  const candidates: Array<{ score: number; value: { red: T[]; white: T[] } }> = [];

  for (let firstIndex = 0; firstIndex < goalkeepers.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < goalkeepers.length; secondIndex += 1) {
      const first = goalkeepers[firstIndex] as T;
      const second = goalkeepers[secondIndex] as T;
      const assignments = [
        { red: [first], white: [second] },
        { red: [second], white: [first] }
      ];

      for (const assignment of assignments) {
        candidates.push({
          score: teamBalanceScore([...fixedRed, ...assignment.red], [...fixedWhite, ...assignment.white]),
          value: assignment
        });
      }
    }
  }

  return pickRandomBest(candidates);
}

function isContractedGoalkeeper(athlete: { position: AthletePosition; linkType: AthleteLinkType }) {
  return athlete.position === AthletePosition.GOALKEEPER && athlete.linkType === AthleteLinkType.CONTRACTED;
}

function isGoalkeeper(athlete: { position: AthletePosition }) {
  return athlete.position === AthletePosition.GOALKEEPER;
}

async function ensureActiveGoalkeeperContractAthletes() {
  const activeContracts = await prisma.goalkeeperContract.findMany({
    where: { active: true },
    select: { id: true, keeperName: true, athleteId: true }
  });
  const athleteIds: string[] = [];

  for (const contract of activeContracts) {
    if (contract.athleteId) {
      await prisma.athlete.update({
        where: { id: contract.athleteId },
        data: {
          name: contract.keeperName,
          position: AthletePosition.GOALKEEPER,
          secondaryPositions: [],
          linkType: AthleteLinkType.CONTRACTED,
          status: AthleteStatus.ACTIVE
        }
      });
      athleteIds.push(contract.athleteId);
      continue;
    }

    const athlete = await prisma.athlete.create({
      data: {
        name: contract.keeperName,
        position: AthletePosition.GOALKEEPER,
        secondaryPositions: [],
        linkType: AthleteLinkType.CONTRACTED,
        status: AthleteStatus.ACTIVE,
        rating: 3
      },
      select: { id: true }
    });

    await prisma.goalkeeperContract.update({
      where: { id: contract.id },
      data: { athleteId: athlete.id }
    });
    athleteIds.push(athlete.id);
  }

  return athleteIds;
}

function lineupArea(position: AthletePosition) {
  if (
    position === AthletePosition.DEFENDER ||
    position === AthletePosition.RIGHT_BACK ||
    position === AthletePosition.LEFT_BACK ||
    position === AthletePosition.FULLBACK
  ) {
    return "DEFENSE";
  }

  if (
    position === AthletePosition.STRIKER ||
    position === AthletePosition.RIGHT_WINGER ||
    position === AthletePosition.LEFT_WINGER ||
    position === AthletePosition.FORWARD
  ) {
    return "ATTACK";
  }

  return "MIDFIELD";
}

function selectStarterFieldPlayers<T extends { rating: number; technicalBalanceScore?: number | null; position: AthletePosition; age: number | null }>(players: T[], size: number) {
  const shuffled = shuffle(players);
  const quotas = [
    { area: "DEFENSE", min: 5 },
    { area: "MIDFIELD", min: 7 },
    { area: "ATTACK", min: 4 }
  ] as const;
  const selected: T[] = [];
  const selectedSet = new Set<T>();

  for (const quota of quotas) {
    const candidates = shuffled
      .filter((player) => lineupArea(player.position) === quota.area && !selectedSet.has(player))
      .sort((a, b) => playerTechnicalLevel(b) - playerTechnicalLevel(a));
    for (const player of candidates.slice(0, quota.min)) {
      selected.push(player);
      selectedSet.add(player);
    }
  }

  const remaining = shuffled.filter((player) => !selectedSet.has(player)).sort((a, b) => playerTechnicalLevel(b) - playerTechnicalLevel(a));
  for (const player of remaining) {
    if (selected.length >= size) {
      break;
    }
    selected.push(player);
    selectedSet.add(player);
  }

  return selected.slice(0, size);
}

async function createAssociateForAthlete(payload: z.infer<typeof athletePayloadSchema>) {
  if (payload.linkType !== AthleteLinkType.ASSOCIATE || payload.associateId) {
    return payload.associateId || null;
  }

  const associatePayload = payload.associate;
  const associate = await prisma.associate.create({
    data: {
      name: payload.name,
      email: cleanText(associatePayload?.email) || null,
      phone: cleanText(associatePayload?.phone) || null,
      monthlyFeeCents: associatePayload?.monthlyFeeCents ?? 6000,
      status: associatePayload?.status ?? AssociateStatus.ACTIVE,
      joinedAt: cleanDate(associatePayload?.joinedAt)
    }
  });

  return associate.id;
}

export async function athleteRoutes(app: FastifyInstance) {
  app.get("/athletes", { preHandler: app.authorize(["ADMIN", "FINANCIAL"]) }, async (request) => {
    const query = athleteQuerySchema.parse(request.query);
    const filters: Partial<{ status: AthleteStatus; position: AthletePosition }> = {};
    if (query.status) {
      filters.status = query.status;
    }
    if (query.position) {
      filters.position = query.position;
    }

    return listAthletesForPeriod(query.month, query.year, filters);
  });

  app.get("/athletes/:id/account", { preHandler: app.authorize(["ADMIN", "FINANCIAL"]) }, async (request, reply) => {
    const { id } = athleteParamsSchema.parse(request.params);
    const period = athleteMePeriodSchema.parse(request.query);
    const yearStart = new Date(Date.UTC(period.year, 0, 1));
    const yearEnd = new Date(Date.UTC(period.year + 1, 0, 1));

    const athlete = await prisma.athlete.findFirst({
      where: { OR: [{ id }, { associateId: id }] },
      include: {
        associate: {
          include: {
            payments: {
              where: { month: period.month, year: period.year },
              orderBy: { createdAt: "desc" },
              take: 1
            }
          }
        }
      }
    });

    if (!athlete) {
      return reply.status(404).send({ message: "Atleta não encontrado" });
    }

    const [lineupsInYear, goals, assists, yellowCards, redCards, allAthletes, rankingLineups] = await Promise.all([
      prisma.gameLineup.findMany({
        where: {
          athleteId: athlete.id,
          game: { date: { gte: yearStart, lt: yearEnd } }
        },
        select: {
          id: true,
          presence: true,
          role: true,
          side: true,
          jerseyNumber: true,
          game: {
            select: {
              id: true,
              type: true,
              date: true,
              location: true,
              championship: true,
              redTeamName: true,
              whiteTeamName: true
            }
          }
        },
        orderBy: { game: { date: "desc" } }
      }),
      prisma.gameEvent.count({ where: { athleteId: athlete.id, type: "GOAL", game: { date: { gte: yearStart, lt: yearEnd } } } }),
      prisma.gameEvent.count({ where: { athleteId: athlete.id, type: "ASSIST", game: { date: { gte: yearStart, lt: yearEnd } } } }),
      prisma.cardRecord.count({ where: { athleteId: athlete.id, type: "YELLOW", cardDate: { gte: yearStart, lt: yearEnd } } }),
      prisma.cardRecord.count({ where: { athleteId: athlete.id, type: "RED", cardDate: { gte: yearStart, lt: yearEnd } } }),
      prisma.athlete.findMany({ select: { id: true } }),
      prisma.gameLineup.findMany({
        where: { game: { date: { gte: yearStart, lt: yearEnd } } },
        select: { athleteId: true, presence: true }
      })
    ]);

    const gamesPresent = lineupsInYear.filter((lineup) => lineup.presence && lineup.role !== "ABSENT").length;
    const gamesRegistered = lineupsInYear.filter((lineup) => lineup.role !== "ABSENT").length;
    const absences = Math.max(0, gamesRegistered - gamesPresent);
    const presencePercent = gamesRegistered > 0 ? Math.round((gamesPresent / gamesRegistered) * 100) : 0;
    const shirtFrequency = new Map<number, number>();

    lineupsInYear.forEach((lineup) => {
      if (lineup.jerseyNumber !== null) {
        shirtFrequency.set(lineup.jerseyNumber, (shirtFrequency.get(lineup.jerseyNumber) ?? 0) + 1);
      }
    });

    const favoriteShirtNumbers = Array.from(shirtFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([number]) => number);

    const rankingMap = new Map<string, { present: number; total: number }>();
    allAthletes.forEach((item) => rankingMap.set(item.id, { present: 0, total: 0 }));
    rankingLineups.forEach((lineup) => {
      const current = rankingMap.get(lineup.athleteId);
      if (!current) {
        return;
      }
      current.total += 1;
      if (lineup.presence) {
        current.present += 1;
      }
    });

    const presenceRows = Array.from(rankingMap.entries())
      .map(([athleteId, stats]) => ({
        id: athleteId,
        present: stats.present,
        total: stats.total,
        percent: stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0
      }))
      .sort((a, b) => b.percent - a.percent || b.present - a.present || a.id.localeCompare(b.id));
    const presenceRankIndex = presenceRows.findIndex((row) => row.id === athlete.id);
    const currentPayment = athlete.associate?.payments[0] || null;
    const birthDate = (athlete.birthDate ?? athlete.associate?.birthDate) || null;
    const athleteAge = ageAt(birthDate, new Date());

    return {
      athlete: {
        id: athlete.id,
        name: athlete.name,
        position: normalizeAthletePosition(athlete.position),
        linkType: athlete.linkType,
        status: athlete.status,
        rating: athlete.rating,
        birthDate: birthDate?.toISOString() ?? null,
        age: athleteAge,
        ageBucket: ageBucket(athleteAge),
        photoUrl: athlete.photoUrl,
        sportsNote: athlete.sportsNote,
        medicalStatus: athlete.medicalStatus,
        medicalNote: athlete.medicalNote,
        medicalReturnDate: athlete.medicalReturnDate?.toISOString() ?? null,
        medicalReportedBy: athlete.medicalReportedBy,
        guestBillingEnabled: athlete.guestBillingEnabled,
        guestFeeCents: athlete.guestFeeCents,
        createdAt: athlete.createdAt.toISOString()
      },
      associate: athlete.associate ?
         {
            id: athlete.associate.id,
            name: athlete.associate.name,
            email: athlete.associate.email,
            phone: athlete.associate.phone,
            status: athlete.associate.status,
            monthlyFeeCents: athlete.associate.monthlyFeeCents
          }
        : null,
      period,
      numbers: {
        gamesPlayed: gamesPresent,
        goals,
        assists,
        yellowCards,
        redCards,
        favoriteShirtNumbers
      },
      presence: {
        gamesRegistered,
        gamesPresent,
        absences,
        presencePercent,
        rank: presenceRankIndex >= 0 ? presenceRankIndex + 1 : null,
        totalAthletes: allAthletes.length
      },
      currentPayment: currentPayment ?
         {
            id: currentPayment.id,
            status: currentPayment.status,
            amountCents: currentPayment.amountCents,
            dueDate: currentPayment.dueDate.toISOString(),
            paidAt: currentPayment.paidAt?.toISOString() ?? null
          }
        : null,
      presenceDetails: lineupsInYear.map((lineup) => ({
        lineupId: lineup.id,
        gameId: lineup.game.id,
        gameLabel: gameLabel(lineup.game),
        date: lineup.game.date.toISOString(),
        location: lineup.game.location,
        presence: lineup.presence,
        role: lineup.role,
        side: lineup.side,
        jerseyNumber: lineup.jerseyNumber
      }))
    };
  });

  app.get("/athletes/:id/technical-evaluations", { preHandler: app.authorize(["ADMIN", "FINANCIAL"]) }, async (request, reply) => {
    const { id } = athleteParamsSchema.parse(request.params);
    const query = technicalEvaluationQuerySchema.parse(request.query);
    const athlete = await prisma.athlete.findUnique({ where: { id }, select: { id: true } });

    if (!athlete) {
      return reply.status(404).send({ message: "Atleta não encontrado" });
    }

    const [latest, history, stats] = await Promise.all([
      prisma.athleteTechnicalEvaluation.findFirst({
        where: { athleteId: id, year: query.year },
        orderBy: { createdAt: "desc" }
      }),
      prisma.athleteTechnicalEvaluation.findMany({
        where: { athleteId: id },
        orderBy: [{ year: "desc" }, { createdAt: "desc" }],
        take: 12
      }),
      computeAthleteTechnicalStats(id, query.year)
    ]);

    return {
      year: query.year,
      stats,
      latest: latest ? mapTechnicalEvaluation(latest) : null,
      history: history.map(mapTechnicalEvaluation)
    };
  });

  app.post("/athletes/:id/technical-evaluations", { preHandler: app.authorize(["ADMIN", "FINANCIAL"]) }, async (request, reply) => {
    const { id } = athleteParamsSchema.parse(request.params);
    const payload = technicalEvaluationSchema.parse(request.body);
    const athlete = await prisma.athlete.findUnique({ where: { id }, select: { id: true } });

    if (!athlete) {
      return reply.status(404).send({ message: "Atleta não encontrado" });
    }

    const stats = await computeAthleteTechnicalStats(id, payload.year);
    const manualScore = roundScore(
      (payload.technicalScore * 0.18) +
        (payload.tacticalScore * 0.16) +
        (payload.physicalScore * 0.13) +
        (payload.defensiveScore * 0.12) +
        (payload.offensiveScore * 0.15) +
        (payload.commitmentScore * 0.16) +
        (payload.disciplineScore * 0.1)
    );
    const finalScore = roundScore(manualScore * 0.65 + stats.statsScore * 0.35);

    const created = await prisma.athleteTechnicalEvaluation.create({
      data: {
        athleteId: id,
        year: payload.year,
        evaluatedById: request.user.sub,
        evaluatedByName: request.user.name,
        evaluatedByEmail: request.user.email,
        technicalScore: payload.technicalScore,
        tacticalScore: payload.tacticalScore,
        physicalScore: payload.physicalScore,
        defensiveScore: payload.defensiveScore,
        offensiveScore: payload.offensiveScore,
        commitmentScore: payload.commitmentScore,
        disciplineScore: payload.disciplineScore,
        manualScore,
        statsScore: stats.statsScore,
        finalScore,
        classification: classifyScore(finalScore),
        justification: payload.justification,
        notes: cleanText(payload.notes),
        statsSnapshot: stats
      }
    });

    await prisma.athlete.update({
      where: { id },
      data: { rating: Math.max(1, Math.min(5, Math.round(finalScore / 2))) }
    });

    return reply.code(201).send(mapTechnicalEvaluation(created));
  });

  app.get("/athletes/:id", { preHandler: app.authorize(["ADMIN", "FINANCIAL"]) }, async (request, reply) => {
    const { id } = athleteParamsSchema.parse(request.params);
    const athletes = await listAthletesForPeriod(new Date().getUTCMonth() + 1, new Date().getUTCFullYear(), {});
    const profile = athletes.find((item) => item.id === id);

    if (!profile) {
      return reply.status(404).send({ message: "Atleta não encontrado" });
    }

    return profile;
  });

  app.post("/athletes", { preHandler: app.authorize(["ADMIN", "FINANCIAL"]) }, async (request, reply) => {
    const payload = athletePayloadSchema.parse(request.body);
    const position = normalizeAthletePosition(payload.position);
    const secondaryPositions = payload.linkType === AthleteLinkType.CONTRACTED ? [] : normalizeAthletePositions(position, payload.secondaryPositions);

    if (isInvalidContractedGoalkeeper(payload.linkType, position)) {
      return reply.status(400).send({ message: "Atleta contratado só pode ser goleiro." });
    }

    const associateId = await createAssociateForAthlete(payload);

    const athlete = await prisma.athlete.create({
      data: {
        name: payload.name,
        position,
        secondaryPositions,
        linkType: payload.linkType,
        status: payload.status,
        rating: payload.rating,
        birthDate: cleanDate(payload.birthDate),
        joinedAt: cleanDate(payload.joinedAt),
        photoUrl: cleanText(payload.photoUrl),
        sportsNote: cleanText(payload.sportsNote),
        medicalStatus: payload.medicalStatus ?? "CLEARED",
        medicalNote: cleanText(payload.medicalNote),
        medicalReturnDate: cleanDate(payload.medicalReturnDate),
        medicalReportedBy: payload.medicalStatus && payload.medicalStatus !== "CLEARED" ? request.user.name : null,
        guestBillingEnabled: payload.linkType === AthleteLinkType.GUEST ? payload.guestBillingEnabled : false,
        guestFeeCents: payload.linkType === AthleteLinkType.GUEST && payload.guestBillingEnabled ? payload.guestFeeCents : 0,
        associateId
      }
    });

    return reply.code(201).send(athlete);
  });

  app.patch("/athletes/:id", { preHandler: app.authorize(["ADMIN", "FINANCIAL"]) }, async (request, reply) => {
    const { id } = athleteParamsSchema.parse(request.params);
    const payload = updateAthleteSchema.parse(request.body);
    const currentPositionData =
      payload.position !== undefined || payload.secondaryPositions !== undefined || payload.linkType !== undefined
        ? await prisma.athlete.findUniqueOrThrow({ where: { id }, select: { position: true, secondaryPositions: true, linkType: true } })
        : null;
    const nextPosition = payload.position ? normalizeAthletePosition(payload.position) : currentPositionData?.position;
    const nextLinkType = payload.linkType ?? currentPositionData?.linkType;
    if (nextPosition && nextLinkType && isInvalidContractedGoalkeeper(nextLinkType, nextPosition)) {
      return reply.status(400).send({ message: "Atleta contratado só pode ser goleiro." });
    }
    const nextSecondaryPositions =
      nextPosition && currentPositionData
        ? nextLinkType === AthleteLinkType.CONTRACTED
          ? []
          : normalizeAthletePositions(nextPosition, payload.secondaryPositions ?? currentPositionData.secondaryPositions)
        : undefined;

    const athleteData: Prisma.AthleteUncheckedUpdateInput = {
        ...(payload.name ? { name: payload.name } : {}),
        ...(payload.position && nextPosition ? { position: nextPosition } : {}),
        ...(nextSecondaryPositions !== undefined ? { secondaryPositions: nextSecondaryPositions } : {}),
        ...(payload.linkType ? { linkType: payload.linkType } : {}),
        ...(payload.status ? { status: payload.status } : {}),
        ...(payload.rating !== undefined ? { rating: payload.rating } : {}),
        ...(payload.birthDate !== undefined ? { birthDate: cleanDate(payload.birthDate) } : {}),
        ...(payload.joinedAt !== undefined ? { joinedAt: cleanDate(payload.joinedAt) } : {}),
        ...(payload.photoUrl !== undefined ? { photoUrl: cleanText(payload.photoUrl) } : {}),
        ...(payload.sportsNote !== undefined ? { sportsNote: cleanText(payload.sportsNote) } : {}),
        ...(payload.medicalStatus !== undefined ? { medicalStatus: payload.medicalStatus } : {}),
        ...(payload.medicalNote !== undefined ? { medicalNote: cleanText(payload.medicalNote) } : {}),
        ...(payload.medicalReturnDate !== undefined ? { medicalReturnDate: cleanDate(payload.medicalReturnDate) } : {}),
        ...(payload.medicalStatus !== undefined || payload.medicalNote !== undefined ? { medicalReportedBy: request.user.name } : {}),
        ...(payload.linkType && payload.linkType !== AthleteLinkType.GUEST ? { guestBillingEnabled: false, guestFeeCents: 0 } : {}),
        ...(payload.guestBillingEnabled !== undefined ? { guestBillingEnabled: payload.linkType === AthleteLinkType.GUEST || !payload.linkType ? payload.guestBillingEnabled : false } : {}),
        ...(payload.guestFeeCents !== undefined ? { guestFeeCents: payload.linkType === AthleteLinkType.GUEST || !payload.linkType ? payload.guestFeeCents : 0 } : {}),
        ...(payload.associateId !== undefined ? { associateId: payload.associateId || null } : {})
    };

    const athlete = await prisma.athlete.update({
      where: { id },
      data: athleteData
    });

    if (payload.associate && athlete.associateId) {
      const associateData: Partial<{
        name: string;
        email: string | null;
        phone: string | null;
        monthlyFeeCents: number;
        status: AssociateStatus;
        joinedAt: Date | null;
      }> = {};

      if (payload.name) {
        associateData.name = payload.name;
      }
      if (payload.associate.email !== undefined) {
        associateData.email = cleanText(payload.associate.email);
      }
      if (payload.associate.phone !== undefined) {
        associateData.phone = cleanText(payload.associate.phone);
      }
      if (payload.associate.monthlyFeeCents !== undefined) {
        associateData.monthlyFeeCents = payload.associate.monthlyFeeCents;
      }
      if (payload.associate.status) {
        associateData.status = payload.associate.status;
      }
      if (payload.associate.joinedAt !== undefined) {
        associateData.joinedAt = cleanDate(payload.associate.joinedAt);
      }

      await prisma.associate.update({
        where: { id: athlete.associateId },
        data: associateData
      });
    }

    return athlete;
  });

  app.delete("/athletes/:id", { preHandler: app.authorize(["ADMIN", "FINANCIAL"]) }, async (request, reply) => {
    const { id } = athleteParamsSchema.parse(request.params);

    await prisma.$transaction(async (tx) => {
      await tx.gameLineup.deleteMany({ where: { athleteId: id } });
      await tx.gameEvent.deleteMany({ where: { athleteId: id } });
      await tx.cardRecord.deleteMany({ where: { athleteId: id } });
      await tx.suspension.deleteMany({ where: { athleteId: id } });
      await tx.athlete.delete({ where: { id } });
    });

    return reply.status(204).send();
  });

  app.post("/athletes/lineup-draft", { preHandler: app.authorize(["ADMIN"]) }, async (request, reply) => {
    const payload = lineupDraftSchema.parse(request.body);
    const playersPerTeam = payload.playersPerTeam ?? 11;
    const minLinePlayersPerTeam = Math.max(1, playersPerTeam - 1);
    const minLinePlayersForDraft = minLinePlayersPerTeam * 2;
    if (payload.gameId) {
      const game = await prisma.game.findUnique({
        where: { id: payload.gameId },
        select: { draftAttempts: true }
      });

      if (!game) {
        return reply.status(404).send({ message: "Jogo não encontrado para o sorteio." });
      }

      if (game.draftAttempts >= 3) {
        return reply.status(409).send({ message: "Limite de 3 sorteios atingido para este jogo. Use ajustes manuais para evitar favorecimento." });
      }
    }

    const captainRedId = payload.captainRedId || undefined;
    const captainWhiteId = payload.captainWhiteId || undefined;

    if ((captainRedId && !captainWhiteId) || (!captainRedId && captainWhiteId)) {
      return reply.status(400).send({ message: "Selecione dois capitães: um para cada time." });
    }

    if (captainRedId && captainWhiteId && captainRedId === captainWhiteId) {
      return reply.status(400).send({ message: "Os capitães precisam ser atletas diferentes." });
    }

    const activeGoalkeeperAthleteIds = await ensureActiveGoalkeeperContractAthletes();
    const athletes = await listAthletesForPeriod(payload.month, payload.year, {});
    const requestedAthleteIds = Array.from(new Set([...payload.athleteIds, ...activeGoalkeeperAthleteIds, ...(captainRedId ? [captainRedId] : []), ...(captainWhiteId ? [captainWhiteId] : [])]));
    const selected = requestedAthleteIds.length > 0 ? athletes.filter((athlete) => requestedAthleteIds.includes(athlete.id)) : athletes;

    const eligible = selected.filter((athlete) => {
      const activeForLineup = athlete.status !== AthleteStatus.INACTIVE && athlete.status !== AthleteStatus.SUSPENDED && athlete.associate?.status !== AssociateStatus.INACTIVE;
      const medicallyAvailable = athlete.medicalStatus !== "INJURED" && athlete.medicalStatus !== "TREATMENT";
      return activeForLineup && medicallyAvailable && (payload.includeDelinquent || athlete.canPlay);
    });

    const notes: string[] = [];
    const captainRed = captainRedId ? eligible.find((athlete) => athlete.id === captainRedId) : undefined;
    const captainWhite = captainWhiteId ? eligible.find((athlete) => athlete.id === captainWhiteId) : undefined;

    if (captainRedId && !captainRed) {
      return reply.status(400).send({ message: "Capitão do Time A não está elegível para o sorteio." });
    }

    if (captainWhiteId && !captainWhite) {
      return reply.status(400).send({ message: "Capitão do Time B não está elegível para o sorteio." });
    }

    if ((captainRed && isGoalkeeper(captainRed)) || (captainWhite && isGoalkeeper(captainWhite))) {
      return reply.status(400).send({ message: "Escolha capitães entre os jogadores de linha. Goleiros contratados entram separados." });
    }

    const goalkeepers = eligible.filter(isContractedGoalkeeper).sort((a, b) => playerTechnicalLevel(b) - playerTechnicalLevel(a));
    const fieldPlayers = eligible.filter((athlete) => !isGoalkeeper(athlete));
    const fixedCaptainIds = new Set([captainRed?.id, captainWhite?.id].filter((id): id is string => Boolean(id)));
    const fixedRedCaptains = captainRed ? [captainRed] : [];
    const fixedWhiteCaptains = captainWhite ? [captainWhite] : [];

    if (goalkeepers.length < minGoalkeepersForDraft) {
      return reply.status(400).send({ message: `Para sortear, selecione ${minGoalkeepersForDraft} goleiros contratados. Selecionados: ${goalkeepers.length}/${minGoalkeepersForDraft}.` });
    }

    const goalkeeperTeams = splitContractedGoalkeepersForTeams(goalkeepers, fixedRedCaptains, fixedWhiteCaptains);
    const selectedGoalkeepers = [...goalkeeperTeams.red, ...goalkeeperTeams.white];
    const selectedGoalkeeperIds = new Set(selectedGoalkeepers.map((athlete) => athlete.id));
    const availableFieldPlayers = fieldPlayers.filter((athlete) => !selectedGoalkeeperIds.has(athlete.id) && !fixedCaptainIds.has(athlete.id));

    const selectedLinePlayersCount = availableFieldPlayers.length + fixedCaptainIds.size;
    if (selectedLinePlayersCount < minLinePlayersForDraft) {
      return reply.status(400).send({ message: `Para sortear, selecione no minimo ${minLinePlayersPerTeam} jogadores de linha por time (${minLinePlayersForDraft} no total). Selecionados: ${selectedLinePlayersCount}/${minLinePlayersForDraft}.` });
    }

    const redFieldCapacity = Math.max(0, playersPerTeam - goalkeeperTeams.red.length);
    const whiteFieldCapacity = Math.max(0, playersPerTeam - goalkeeperTeams.white.length);
    const starterFieldTarget = Math.min(availableFieldPlayers.length, redFieldCapacity + whiteFieldCapacity - fixedCaptainIds.size);
    const starterFieldPlayers = selectStarterFieldPlayers(availableFieldPlayers, starterFieldTarget);
    const allStarterFieldPlayers = [...fixedRedCaptains, ...fixedWhiteCaptains, ...starterFieldPlayers];
    const starterFieldIds = new Set(starterFieldPlayers.map((athlete) => athlete.id));
    const benchPool = availableFieldPlayers.filter((athlete) => !starterFieldIds.has(athlete.id));
    const areaCounts = {
      defense: allStarterFieldPlayers.filter((athlete) => lineupArea(athlete.position) === "DEFENSE").length,
      midfield: allStarterFieldPlayers.filter((athlete) => lineupArea(athlete.position) === "MIDFIELD").length,
      attack: allStarterFieldPlayers.filter((athlete) => lineupArea(athlete.position) === "ATTACK").length
    };

    if (areaCounts.defense < 4 || areaCounts.midfield < 6 || areaCounts.attack < 4) {
      notes.push("Formação adaptada por falta de atletas suficientes em todas as posições.");
    }

    const starterTeams = splitBalancedTeamsWithFixed(
      starterFieldPlayers,
      [...goalkeeperTeams.red, ...fixedRedCaptains],
      [...goalkeeperTeams.white, ...fixedWhiteCaptains],
      redFieldCapacity - fixedRedCaptains.length
    );
    const benchTeams = benchPool.length > 0 ? splitBalancedTeamsWithSize(benchPool, Math.min(10, Math.ceil(benchPool.length / 2))) : { red: [], white: [] };
    const red = [...goalkeeperTeams.red, ...fixedRedCaptains, ...starterTeams.red].slice(0, playersPerTeam);
    const white = [...goalkeeperTeams.white, ...fixedWhiteCaptains, ...starterTeams.white].slice(0, playersPerTeam);
    const redBench = benchTeams.red.slice(0, 10);
    const whiteBench = benchTeams.white.slice(0, 10);
    const redAverageAge = averageAge(red);
    const whiteAverageAge = averageAge(white);
    const knownAgeCount = [...red, ...white].filter((athlete) => athlete.age !== null && athlete.age !== undefined).length;
    if (knownAgeCount > 0 && redAverageAge !== null && whiteAverageAge !== null) {
      notes.push(`Idade equilibrada: média ${redAverageAge.toFixed(1)} x ${whiteAverageAge.toFixed(1)} anos.`);
    } else {
      notes.push("Cadastre a data de nascimento dos atletas para o sorteio equilibrar também por idade.");
    }
    const evaluatedDraftedCount = [...red, ...white].filter((athlete) => athlete.technicalBalanceSource === "TECHNICAL_EVALUATION").length;
    notes.push(
      evaluatedDraftedCount > 0
        ? `Nivelamento técnico usou ${evaluatedDraftedCount} avaliação(ões) técnicas e rating manual para os demais.`
        : "Nivelamento técnico usou rating manual dos atletas."
    );
    const draftedIds = new Set([...red, ...white, ...redBench, ...whiteBench].map((athlete) => athlete.id));
    const blocked = selected.filter((athlete) => !eligible.some((item) => item.id === athlete.id) || !draftedIds.has(athlete.id));
    const totals = {
      redRating: red.reduce((total, athlete) => total + athlete.rating, 0),
      whiteRating: white.reduce((total, athlete) => total + athlete.rating, 0),
      redTechnicalLevel: teamTechnicalLevel(red),
      whiteTechnicalLevel: teamTechnicalLevel(white),
      eligible: eligible.length,
      blocked: blocked.length,
      redBench: redBench.length,
      whiteBench: whiteBench.length,
      emergencyGoalkeepers: 0
    };
    const draftAttempts = payload.gameId
      ? await prisma.game.update({
          where: { id: payload.gameId },
          data: { draftAttempts: { increment: 1 } },
          select: { draftAttempts: true }
        })
      : null;
    const responseNotes = draftAttempts
      ? [`Sorteio ${draftAttempts.draftAttempts}/3 registrado para este jogo.`, ...notes]
      : notes;
    if (captainRed && captainWhite) {
      responseNotes.push(`Capitães fixados: ${captainRed.name} no Time A e ${captainWhite.name} no Time B.`);
    }

    responseNotes.push(`Goleiros contratados: ${goalkeeperTeams.red[0]?.name ?? "Goleiro"} no Time A e ${goalkeeperTeams.white[0]?.name ?? "Goleiro"} no Time B.`);

    if (payload.gameId && draftAttempts) {
      await prisma.lineupDraftAttempt.create({
        data: {
          gameId: payload.gameId,
          attemptNumber: draftAttempts?.draftAttempts ?? 1,
          createdById: request.user.sub,
          createdByName: request.user.name,
          redSnapshot: red,
          whiteSnapshot: white,
          redBenchSnapshot: redBench,
          whiteBenchSnapshot: whiteBench,
          blockedSnapshot: blocked,
          notes: responseNotes,
          totals
        }
      });
    }

    return {
      red,
      white,
      redBench,
      whiteBench,
      blocked,
      attemptNumber: draftAttempts?.draftAttempts || null,
      notes: responseNotes,
      totals
    };
  });

  app.get("/athlete/me", { preHandler: app.authorize(["ATHLETE"]) }, async (request, reply) => {
    const period = athleteMePeriodSchema.parse(request.query);

    const user = await prisma.user.findUnique({
      where: { id: request.user.sub },
      include: {
        associate: {
          include: {
            payments: {
              where: { month: period.month, year: period.year },
              orderBy: { createdAt: "desc" },
              take: 1
            }
          }
        }
      }
    });

    if (!user?.associate) {
      return reply.status(404).send({ message: "Associado do atleta não encontrado" });
    }

    const associate = user.associate;

    const athlete = await prisma.athlete.findFirst({
      where: { OR: [{ associateId: user.associate.id }, { name: user.associate.name }] },
      orderBy: { createdAt: "desc" }
    });

    const yearStart = new Date(Date.UTC(period.year, 0, 1));
    const yearEnd = new Date(Date.UTC(period.year + 1, 0, 1));

    const athleteNumbers = athlete
      ? await (async () => {
          const [lineupsInYear, goals, assists, yellowCards, redCards] = await Promise.all([
            prisma.gameLineup.findMany({
              where: {
                athleteId: athlete.id,
                game: {
                  date: { gte: yearStart, lt: yearEnd }
                }
              },
              select: { jerseyNumber: true, presence: true }
            }),
            prisma.gameEvent.count({ where: { athleteId: athlete.id, type: "GOAL", game: { date: { gte: yearStart, lt: yearEnd } } } }),
            prisma.gameEvent.count({ where: { athleteId: athlete.id, type: "ASSIST", game: { date: { gte: yearStart, lt: yearEnd } } } }),
            prisma.cardRecord.count({ where: { athleteId: athlete.id, type: "YELLOW", cardDate: { gte: yearStart, lt: yearEnd } } }),
            prisma.cardRecord.count({ where: { athleteId: athlete.id, type: "RED", cardDate: { gte: yearStart, lt: yearEnd } } })
          ]);

          const gamesPlayed = lineupsInYear.filter((lineup) => lineup.presence).length;
          const registeredGames = lineupsInYear.length;
          const absences = Math.max(0, registeredGames - gamesPlayed);
          const shirtFrequency = new Map<number, number>();

          lineupsInYear.forEach((lineup) => {
            if (lineup.jerseyNumber !== null) {
              shirtFrequency.set(lineup.jerseyNumber, (shirtFrequency.get(lineup.jerseyNumber) ?? 0) + 1);
            }
          });

          const favoriteShirtNumbers = Array.from(shirtFrequency.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([number]) => number);

          return {
            gamesPlayed,
            goals,
            assists,
            yellowCards,
            redCards,
            favoriteShirtNumbers,
            registeredGames,
            absences,
            presencePercent: registeredGames > 0 ? Math.round((gamesPlayed / registeredGames) * 100) : 0
          };
        })()
      : {
          gamesPlayed: 0,
          goals: 0,
          assists: 0,
          yellowCards: 0,
          redCards: 0,
          favoriteShirtNumbers: [] as number[],
          registeredGames: 0,
          absences: 0,
          presencePercent: 0
        };

    const ranking = athlete
      ? await (async () => {
          const athletes = await prisma.athlete.findMany({
            select: { id: true, name: true }
          });

          const athleteIds = athletes.map((item) => item.id);
          const [events, cards, lineups] = await Promise.all([
            prisma.gameEvent.findMany({
              where: {
                athleteId: { in: athleteIds },
                game: { date: { gte: yearStart, lt: yearEnd } }
              },
              select: { athleteId: true, type: true }
            }),
            prisma.cardRecord.findMany({
              where: {
                athleteId: { in: athleteIds },
                cardDate: { gte: yearStart, lt: yearEnd }
              },
              select: { athleteId: true, type: true }
            }),
            prisma.gameLineup.findMany({
              where: {
                athleteId: { in: athleteIds },
                game: { date: { gte: yearStart, lt: yearEnd } }
              },
              select: { athleteId: true, presence: true, side: true, game: { select: { winnerSide: true, isDraw: true } } }
            })
          ]);

          const statsMap = new Map<string, { goals: number; assists: number; yellow: number; red: number; present: number; total: number; wins: number }>();
          athleteIds.forEach((id) => {
            statsMap.set(id, { goals: 0, assists: 0, yellow: 0, red: 0, present: 0, total: 0, wins: 0 });
          });

          events.forEach((event) => {
            const current = statsMap.get(event.athleteId);
            if (!current) {
              return;
            }
            if (event.type === "GOAL") {
              current.goals += 1;
            }
            if (event.type === "ASSIST") {
              current.assists += 1;
            }
          });

          cards.forEach((card) => {
            const current = statsMap.get(card.athleteId);
            if (!current) {
              return;
            }
            if (card.type === "YELLOW") {
              current.yellow += 1;
            }
            if (card.type === "RED") {
              current.red += 1;
            }
          });

          lineups.forEach((lineup) => {
            const current = statsMap.get(lineup.athleteId);
            if (!current) {
              return;
            }
            current.total += 1;
            if (lineup.presence) {
              current.present += 1;
            }
            if (lineup.presence && !lineup.game.isDraw && lineup.game.winnerSide === lineup.side) {
              current.wins += 1;
            }
          });

          const rankingRows = athletes.map((item) => {
            const stats = statsMap.get(item.id) ?? { goals: 0, assists: 0, yellow: 0, red: 0, present: 0, total: 0, wins: 0 };
            return {
              id: item.id,
              name: item.name,
              goals: stats.goals,
              assists: stats.assists,
              wins: stats.wins,
              games: stats.present,
              fairPlayScore: stats.yellow + stats.red * 3,
              presencePercent: stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0
            };
          });

          const getRank = (rows: Array<{ id: string }>, athleteId: string) => {
            const index = rows.findIndex((item) => item.id === athleteId);
            return index >= 0 ? index + 1 : null;
          };

          const goalsRanking = [...rankingRows].sort((a, b) => b.goals - a.goals || b.assists - a.assists);
          const assistsRanking = [...rankingRows].sort((a, b) => b.assists - a.assists || b.goals - a.goals);
          const fairPlayRanking = [...rankingRows].sort((a, b) => a.fairPlayScore - b.fairPlayScore || b.presencePercent - a.presencePercent);
          const presenceRanking = [...rankingRows].sort((a, b) => b.presencePercent - a.presencePercent || b.goals - a.goals);
          const winsRanking = [...rankingRows].sort((a, b) => b.wins - a.wins || b.games - a.games || b.goals - a.goals);

          return {
            goalsRank: getRank(goalsRanking, athlete.id),
            assistsRank: getRank(assistsRanking, athlete.id),
            fairPlayRank: getRank(fairPlayRanking, athlete.id),
            presenceRank: getRank(presenceRanking, athlete.id),
            totalAthletes: rankingRows.length,
            topGoals: goalsRanking.slice(0, 5).map((row, index) => ({ rank: index + 1, athleteId: row.id, name: row.name, value: row.goals })),
            topAssists: assistsRanking.slice(0, 5).map((row, index) => ({ rank: index + 1, athleteId: row.id, name: row.name, value: row.assists })),
            topWins: winsRanking.slice(0, 5).map((row, index) => ({ rank: index + 1, athleteId: row.id, name: row.name, value: row.wins })),
            topPresence: presenceRanking.slice(0, 5).map((row, index) => ({ rank: index + 1, athleteId: row.id, name: row.name, value: row.presencePercent }))
          };
        })()
      : {
          goalsRank: null,
          assistsRank: null,
          fairPlayRank: null,
          presenceRank: null,
          totalAthletes: 0,
          topGoals: [],
          topAssists: [],
          topWins: [],
          topPresence: []
        };

    const paymentHistory = await prisma.payment.findMany({
      where: { associateId: user.associate.id },
      orderBy: [{ year: "desc" }, { month: "desc" }, { createdAt: "desc" }],
      take: 60
    });

      const evolution = athlete
        ? await (async () => {
            const [yearEvents, yearLineups] = await Promise.all([
              prisma.gameEvent.findMany({
                where: {
                  athleteId: athlete.id,
                  game: { date: { gte: yearStart, lt: yearEnd } }
                },
                select: {
                  type: true,
                  game: { select: { date: true } }
                }
              }),
              prisma.gameLineup.findMany({
                where: {
                  athleteId: athlete.id,
                  game: { date: { gte: yearStart, lt: yearEnd } }
                },
                select: {
                  presence: true,
                  game: { select: { date: true } }
                }
              })
            ]);

            const monthMap = new Map<number, { goals: number; assists: number; registeredGames: number; presentGames: number; paidCents: number }>();
            for (let month = 1; month <= 12; month += 1) {
              monthMap.set(month, { goals: 0, assists: 0, registeredGames: 0, presentGames: 0, paidCents: 0 });
            }

            yearEvents.forEach((event) => {
              const month = event.game.date.getUTCMonth() + 1;
              const row = monthMap.get(month);
              if (!row) {
                return;
              }
              if (event.type === "GOAL") {
                row.goals += 1;
              }
              if (event.type === "ASSIST") {
                row.assists += 1;
              }
            });

            yearLineups.forEach((lineup) => {
              const month = lineup.game.date.getUTCMonth() + 1;
              const row = monthMap.get(month);
              if (!row) {
                return;
              }
              row.registeredGames += 1;
              if (lineup.presence) {
                row.presentGames += 1;
              }
            });

            paymentHistory
              .filter((payment) => payment.year === period.year && payment.status === PaymentStatus.PAID)
              .forEach((payment) => {
                const row = monthMap.get(payment.month);
                if (row) {
                  row.paidCents += payment.amountCents;
                }
              });

            return Array.from({ length: 12 }, (_, index) => {
              const month = index + 1;
              const row = monthMap.get(month) ?? { goals: 0, assists: 0, registeredGames: 0, presentGames: 0, paidCents: 0 };
              return {
                month,
                label: shortMonthLabels[index],
                goals: row.goals,
                assists: row.assists,
                registeredGames: row.registeredGames,
                presentGames: row.presentGames,
                presencePercent: row.registeredGames > 0 ? Math.round((row.presentGames / row.registeredGames) * 100) : 0,
                paidCents: row.paidCents
              };
            });
          })()
        : Array.from({ length: 12 }, (_, index) => ({
            month: index + 1,
            label: shortMonthLabels[index],
            goals: 0,
            assists: 0,
            registeredGames: 0,
            presentGames: 0,
            presencePercent: 0,
            paidCents: 0
          }));

    const currentPayment = user.associate.payments[0] || null;
    const recentPayments = paymentHistory.slice(0, 6);

    const yearlyPaidCents = paymentHistory
      .filter((payment) => payment.year === period.year && payment.status === PaymentStatus.PAID)
      .reduce((total, payment) => total + payment.amountCents, 0);

    const paidCount = paymentHistory.filter((payment) => payment.status === PaymentStatus.PAID).length;
    const pendingCount = paymentHistory.filter((payment) => payment.status === PaymentStatus.PENDING).length;
    const lateCount = paymentHistory.filter((payment) => payment.status === PaymentStatus.LATE).length;

    const associationJoinedAt = user.associate.joinedAt ?? user.associate.createdAt;
    const athleteJoinedAt = athlete ? athlete.joinedAt ?? athlete.createdAt : null;
    const joinedAt = athleteJoinedAt && athleteJoinedAt < associationJoinedAt ? athleteJoinedAt : associationJoinedAt;
    const tenureMonths = monthsBetween(joinedAt, new Date());
    const associationTenureMonths = monthsBetween(associationJoinedAt, new Date());
    const athleteTenureMonths = athleteJoinedAt ? monthsBetween(athleteJoinedAt, new Date()) : 0;
    const now = new Date();
    const selfLineups = athlete
      ? await prisma.gameLineup.findMany({
          where: { athleteId: athlete.id },
          include: {
            game: {
              include: {
                lineups: {
                  include: { athlete: { select: { id: true, name: true, position: true } } },
                  orderBy: [{ side: "asc" }, { tacticalSlot: "asc" }, { jerseyNumber: "asc" }]
                },
                events: {
                  where: { athleteId: athlete.id },
                  orderBy: [{ minute: "asc" }, { createdAt: "asc" }]
                },
                substitutions: {
                  where: { OR: [{ athleteOutId: athlete.id }, { athleteInId: athlete.id }] },
                  include: {
                    athleteOut: { select: { id: true, name: true, position: true } },
                    athleteIn: { select: { id: true, name: true, position: true } }
                  },
                  orderBy: [{ minute: "asc" }, { createdAt: "asc" }]
                }
              }
            }
          },
          orderBy: { game: { date: "desc" } },
          take: 40
        })
      : [];

    const nextSelfLineup = [...selfLineups]
      .filter((lineup) => lineup.role !== "ABSENT" && lineup.game.status !== "FINISHED")
      .sort((a, b) => {
        const aFuture = a.game.date >= now ? 0 : 1;
        const bFuture = b.game.date >= now ? 0 : 1;
        return aFuture - bFuture || a.game.date.getTime() - b.game.date.getTime();
      })[0] || null;

    const recentGames = selfLineups
      .filter((lineup) => lineup.game.date < now || lineup.game.status === "FINISHED")
      .slice(0, 8)
      .map((lineup) => {
        const goals = lineup.game.events.filter((event) => event.type === "GOAL").length;
        const assists = lineup.game.events.filter((event) => event.type === "ASSIST").length;
        const yellowCards = lineup.game.events.filter((event) => event.type === "YELLOW_CARD").length;
        const redCards = lineup.game.events.filter((event) => event.type === "RED_CARD").length;
        const substitutions = lineup.game.substitutions.map((substitution) => ({
          id: substitution.id,
          minute: substitution.minute,
          direction: substitution.athleteInId === athlete?.id ? "IN" : "OUT",
          athleteOutName: substitution.athleteOut.name,
          athleteInName: substitution.athleteIn.name
        }));

        return {
          gameId: lineup.gameId,
          date: lineup.game.date.toISOString(),
          location: lineup.game.location,
          side: lineup.side,
          role: lineup.role,
          presence: lineup.presence,
          jerseyNumber: lineup.jerseyNumber,
          redTeamName: lineup.game.redTeamName,
          whiteTeamName: lineup.game.whiteTeamName,
          redScore: lineup.game.redScore,
          whiteScore: lineup.game.whiteScore,
          winnerSide: lineup.game.winnerSide,
          goals,
          assists,
          yellowCards,
          redCards,
          substitutions
        };
      });

    const activeInviteSettings = await prisma.groupSettings.findFirst({
      select: { groupName: true, inviteCode: true }
    });

    return {
      athlete: athlete ?
         {
            id: athlete.id,
            name: athlete.name,
            position: normalizeAthletePosition(athlete.position),
            linkType: athlete.linkType,
            status: athlete.status,
            rating: athlete.rating,
            photoUrl: athlete.photoUrl,
            sportsNote: athlete.sportsNote,
            medicalStatus: athlete.medicalStatus,
            medicalNote: athlete.medicalNote,
            medicalReturnDate: athlete.medicalReturnDate?.toISOString() ?? null,
            medicalReportedBy: athlete.medicalReportedBy,
            guestBillingEnabled: athlete.guestBillingEnabled,
            guestFeeCents: athlete.guestFeeCents,
            joinedAt: athlete.joinedAt?.toISOString() ?? null
          }
        : null,
      associate: {
        id: user.associate.id,
        name: user.associate.name,
        email: user.associate.email,
        phone: user.associate.phone,
        status: user.associate.status,
        monthlyFeeCents: user.associate.monthlyFeeCents,
        joinedAt: user.associate.joinedAt?.toISOString() ?? null
      },
      period,
      membership: {
        joinedAt: joinedAt.toISOString(),
        tenureMonths,
        tenureLabel: tenureLabel(tenureMonths),
        associationJoinedAt: associationJoinedAt.toISOString(),
        associationTenureMonths,
        associationTenureLabel: tenureLabel(associationTenureMonths),
        athleteJoinedAt: athleteJoinedAt?.toISOString() ?? null,
        athleteTenureMonths,
        athleteTenureLabel: athleteJoinedAt ? tenureLabel(athleteTenureMonths) : null
      },
      numbers: athleteNumbers,
      insights: {
        goalParticipations: athleteNumbers.goals + athleteNumbers.assists,
        goalsPerGame: athleteNumbers.gamesPlayed > 0 ? Number((athleteNumbers.goals / athleteNumbers.gamesPlayed).toFixed(2)) : 0,
        adimplenciaPercent:
          paymentHistory.length > 0
            ? Math.round((paidCount / paymentHistory.length) * 100)
            : 100
      },
      presence: {
        gamesRegistered: athleteNumbers.registeredGames,
        gamesPresent: athleteNumbers.gamesPlayed,
        absences: athleteNumbers.absences,
        presencePercent: athleteNumbers.presencePercent
      },
      ranking,
      nextGame: nextSelfLineup ?
         {
            gameId: nextSelfLineup.gameId,
            date: nextSelfLineup.game.date.toISOString(),
            location: nextSelfLineup.game.location,
            status: nextSelfLineup.game.status,
            side: nextSelfLineup.side,
            role: nextSelfLineup.role,
            presence: nextSelfLineup.presence,
            confirmedAt: nextSelfLineup.confirmedAt?.toISOString() ?? null,
            arrivalStatus: nextSelfLineup.arrivalStatus,
            confirmationNote: nextSelfLineup.confirmationNote,
            jerseyNumber: nextSelfLineup.jerseyNumber,
            tacticalSlot: nextSelfLineup.tacticalSlot,
            redTeamName: nextSelfLineup.game.redTeamName,
            whiteTeamName: nextSelfLineup.game.whiteTeamName,
            redUniformColor: nextSelfLineup.game.redUniformColor,
            whiteUniformColor: nextSelfLineup.game.whiteUniformColor,
            lineups: nextSelfLineup.game.lineups.map((lineup) => ({
              id: lineup.id,
              athleteId: lineup.athleteId,
              athleteName: lineup.athlete.name,
              position: lineup.athlete.position,
              side: lineup.side,
              role: lineup.role,
              presence: lineup.presence,
              confirmedAt: lineup.confirmedAt?.toISOString() ?? null,
              arrivalStatus: lineup.arrivalStatus,
              confirmationNote: lineup.confirmationNote,
              jerseyNumber: lineup.jerseyNumber,
              tacticalSlot: lineup.tacticalSlot
            }))
          }
        : null,
      recentGames,
      invite: {
        groupName: activeInviteSettings?.groupName ?? "GestaSports",
        code: activeInviteSettings?.inviteCode || null
      },
      evolution,
      financeSummary: {
        paidCount,
        pendingCount,
        lateCount,
        paidCentsInYear: yearlyPaidCents
      },
      currentPayment: currentPayment ?
         {
            id: currentPayment.id,
            status: currentPayment.status,
            amountCents: currentPayment.amountCents,
            dueDate: currentPayment.dueDate.toISOString(),
            paidAt: currentPayment.paidAt?.toISOString() ?? null
          }
        : {
            id: null,
            status: PaymentStatus.PENDING,
            amountCents: user.associate.monthlyFeeCents,
            dueDate: dueDateForCompetence(period.month, period.year).toISOString(),
            paidAt: null
          },
      recentPayments: recentPayments.map((payment) => ({
        id: payment.id,
        month: payment.month,
        year: payment.year,
        status: payment.status,
        amountCents: payment.amountCents,
        dueDate: payment.dueDate?.toISOString() ?? null,
        paidAt: payment.paidAt?.toISOString() ?? null
      }))
    };
  });

  app.patch("/athlete/me/photo", { preHandler: app.authorize(["ATHLETE"]) }, async (request, reply) => {
    const payload = athleteSelfPhotoSchema.parse(request.body);

    const user = await prisma.user.findUnique({
      where: { id: request.user.sub },
      include: { associate: true }
    });

    if (!user?.associate) {
      return reply.status(404).send({ message: "Associado do atleta não encontrado" });
    }

    const athlete = await prisma.athlete.findFirst({
      where: { OR: [{ associateId: user.associate.id }, { name: user.associate.name }] },
      orderBy: { createdAt: "desc" }
    });

    if (!athlete) {
      return reply.status(404).send({ message: "Atleta não encontrado" });
    }

    const updated = await prisma.athlete.update({
      where: { id: athlete.id },
      data: { photoUrl: cleanText(payload.photoUrl) },
      select: { id: true, photoUrl: true }
    });

    return updated;
  });

  app.patch("/athlete/me/medical", { preHandler: app.authorize(["ATHLETE"]) }, async (request, reply) => {
    const payload = athleteSelfMedicalSchema.parse(request.body);

    const user = await prisma.user.findUnique({
      where: { id: request.user.sub },
      include: { associate: true }
    });

    if (!user?.associate) {
      return reply.status(404).send({ message: "Associado do atleta não encontrado" });
    }

    const athlete = await prisma.athlete.findFirst({
      where: { OR: [{ associateId: user.associate.id }, { name: user.associate.name }] },
      orderBy: { createdAt: "desc" }
    });

    if (!athlete) {
      return reply.status(404).send({ message: "Atleta não encontrado" });
    }

    const updated = await prisma.athlete.update({
      where: { id: athlete.id },
      data: {
        medicalStatus: payload.medicalStatus,
        medicalNote: cleanText(payload.medicalNote),
        medicalReturnDate: cleanDate(payload.medicalReturnDate),
        medicalReportedBy: user.name ?? user.associate.name
      },
      select: { id: true, medicalStatus: true, medicalNote: true, medicalReturnDate: true, medicalReportedBy: true }
    });

    return updated;
  });

  app.get("/athlete/me/payments/current", { preHandler: app.authorize(["ATHLETE"]) }, async (request, reply) => {
    const period = athleteMePeriodSchema.parse(request.query);

    const user = await prisma.user.findUnique({
      where: { id: request.user.sub },
      include: { associate: true }
    });

    if (!user?.associate) {
      return reply.status(404).send({ message: "Associado do atleta não encontrado" });
    }

    const associate = user.associate;

    const payment = await prisma.payment.findFirst({
      where: {
        associateId: associate.id,
        month: period.month,
        year: period.year
      },
      orderBy: { createdAt: "desc" }
    });

    return {
      month: period.month,
      year: period.year,
      payment: payment ?
         {
            id: payment.id,
            status: payment.status,
            amountCents: payment.amountCents,
            dueDate: payment.dueDate?.toISOString() ?? null,
            paidAt: payment.paidAt?.toISOString() ?? null
          }
        : null
    };
  });

  app.patch("/athlete/me/lineups/:lineupId/presence", { preHandler: app.authorize(["ATHLETE"]) }, async (request, reply) => {
    const params = z.object({ lineupId: z.string().cuid() }).parse(request.params);
    const payload = athletePresenceSchema.parse(request.body);

    const user = await prisma.user.findUnique({
      where: { id: request.user.sub },
      include: { associate: true }
    });

    if (!user?.associate) {
      return reply.status(404).send({ message: "Associado do atleta não encontrado" });
    }

    const athlete = await prisma.athlete.findFirst({
      where: { OR: [{ associateId: user.associate.id }, { name: user.associate.name }] },
      select: { id: true }
    });

    if (!athlete) {
      return reply.status(404).send({ message: "Perfil de atleta não encontrado" });
    }

    const updated = await prisma.gameLineup.updateMany({
      where: {
        id: params.lineupId,
        athleteId: athlete.id
      },
      data: {
        presence: payload.presence,
        confirmedAt: new Date(),
        arrivalStatus: payload.presence ? payload.arrivalStatus ?? "ON_TIME" : "UNAVAILABLE",
        confirmationNote: cleanText(payload.confirmationNote)
      }
    });

    if (updated.count === 0) {
      return reply.status(404).send({ message: "Escalação não encontrada para este atleta" });
    }

    return prisma.gameLineup.findUnique({
      where: { id: params.lineupId },
      include: { athlete: { select: { id: true, name: true, position: true } } }
    });
  });

  app.post("/athlete/me/payments/current/checkout", { preHandler: app.authorize(["ATHLETE"]) }, async (request, reply) => {
    const period = athleteMePeriodSchema.parse(request.query);

    const user = await prisma.user.findUnique({
      where: { id: request.user.sub },
      include: { associate: true }
    });

    if (!user?.associate) {
      return reply.status(404).send({ message: "Associado do atleta não encontrado" });
    }

    const associate = user.associate;

    let payment = await prisma.payment.findFirst({
      where: {
        associateId: associate.id,
        month: period.month,
        year: period.year
      },
      orderBy: { createdAt: "desc" }
    });

    if (!payment) {
      payment = await prisma.payment.create({
        data: {
          associateId: associate.id,
          month: period.month,
          year: period.year,
          amountCents: associate.monthlyFeeCents,
          dueDate: dueDateForCompetence(period.month, period.year),
          status: PaymentStatus.PENDING
        }
      });
    }

    if (payment.status === PaymentStatus.PAID) {
      return {
        payment: {
          id: payment.id,
          status: payment.status,
          amountCents: payment.amountCents,
          dueDate: payment.dueDate?.toISOString() ?? null,
          paidAt: payment.paidAt?.toISOString() ?? null
        },
        checkout: null,
        message: "Mensalidade já quitada para este período."
      };
    }

    const pixSettings = await prisma.paymentSettings.findFirst();
    const pixConfig = {
      paymentMode: pixSettings?.paymentMode ?? "MANUAL_PIX",
      paymentProvider: pixSettings?.paymentProvider ?? "MANUAL_PIX",
      providerClientId: pixSettings?.providerClientId ?? "",
      providerClientSecret: pixSettings?.providerClientSecret ?? "",
      autoSettleEnabled: pixSettings?.autoSettleEnabled ?? false,
      pixKey: pixSettings?.pixKey ?? env.PIX_KEY,
      pixReceiverName: pixSettings?.pixReceiverName ?? env.PIX_RECEIVER_NAME,
      pixCity: pixSettings?.pixCity ?? env.PIX_CITY,
      pixAutoSettleSeconds: pixSettings?.pixAutoSettleSeconds ?? env.PIX_AUTO_SETTLE_SECONDS,
      autoSettleSeconds: pixSettings?.pixAutoSettleSeconds ?? env.PIX_AUTO_SETTLE_SECONDS
    };

    const txid = createPixTxid(payment.id);
    const checkout =
      pixConfig.paymentMode === "PROVIDER" &&
      pixConfig.paymentProvider === "SICOOB" &&
      canCreateSicoobPixCharge(pixConfig)
        ? await createSicoobPixCheckout({
            settings: pixConfig,
            txid,
            amountCents: payment.amountCents,
            payerName: associate.name,
            month: period.month,
            year: period.year
          })
        : await createPixCheckout({
            amountCents: payment.amountCents,
            txid,
            pixKey: pixConfig.pixKey,
            pixReceiverName: pixConfig.pixReceiverName,
            pixCity: pixConfig.pixCity,
            autoSettleSeconds: pixConfig.autoSettleSeconds
          });

    if (pixConfig.autoSettleEnabled && canUsePixAutoSettlement()) {
    scheduleAutoSettlement(payment.id, pixConfig.autoSettleSeconds, async () => {
      const settled = await prisma.payment.updateMany({
        where: {
          id: payment.id,
          status: { in: [PaymentStatus.PENDING, PaymentStatus.LATE] }
        },
        data: {
          status: PaymentStatus.PAID,
          paidAt: new Date()
        }
      });

      if (settled.count > 0) {
        await prisma.associate.update({
          where: { id: associate.id },
          data: { status: AssociateStatus.ACTIVE }
        });

        await settleMonthlyFeeIncome({
          associateId: associate.id,
          associateName: associate.name,
          month: period.month,
          year: period.year,
          amountCents: payment.amountCents
        });

        const targetEmail = associate.email ?? user.email;
        if (targetEmail) {
          try {
            await sendPaymentConfirmationEmail({
              to: targetEmail,
              athleteName: user.name,
              amountCents: payment.amountCents,
              month: period.month,
              year: period.year
            });
          } catch (error) {
            app.log.error({ error, email: targetEmail }, "Falha ao enviar e-mail de confirmação de pagamento");
          }
        }
      }
    });
    }

    return reply.code(201).send({
      payment: {
        id: payment.id,
        status: payment.status,
        amountCents: payment.amountCents,
        dueDate: payment.dueDate?.toISOString() ?? null,
        paidAt: payment.paidAt?.toISOString() ?? null
      },
      checkout: {
        txid,
        pixCopyPaste: checkout.pixCopyPaste,
        qrCodeDataUrl: checkout.qrCodeDataUrl,
        expiresAt: checkout.expiresAt,
        autoSettleSeconds: pixConfig.autoSettleSeconds
      }
    });
  });
}







