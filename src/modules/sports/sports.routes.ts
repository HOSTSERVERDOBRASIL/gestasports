import type { FastifyInstance, FastifyReply } from "fastify";
import { EventType, FieldStatus, GameMode, GameType, Prisma, TeamSide } from "@prisma/client";
import { z } from "zod";
import {
  createGame,
  deleteGameEvent,
  deleteGameSubstitution,
  getActiveSuspensions,
  getCompetitionRanking,
  getConfrontationStats,
  getDisciplineRanking,
  getScorerRanking,
  registerGameSubstitution,
  registerGameEvents,
  setGameResult,
  updateGameClock,
  upsertLineup
} from "./sports.service.js";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";

const flexibleIdSchema = z.union([z.string().cuid(), z.string().uuid()]);
const formationValues = [
  "4-3-3",
  "4-4-2",
  "3-5-2",
  "4-2-3-1",
  "4-3-1-2",
  "3-4-3",
  "3-4-1-2",
  "4-1-4-1",
  "4-5-1",
  "5-3-2",
  "5-4-1",
  "4-2-2-2",
  "3-6-1"
] as const;
const formationSchema = z.enum(formationValues);

const createGameSchema = z.object({
  type: z.nativeEnum(GameType),
  date: z.string().datetime(),
  location: z.string().min(2),
  championship: z.string().min(2).optional(),
  gameMode: z.nativeEnum(GameMode).optional(),
  homeClubId: flexibleIdSchema.optional(),
  awayClubId: flexibleIdSchema.optional(),
  fieldId: flexibleIdSchema.optional(),
  homeTeamId: flexibleIdSchema.optional(),
  awayTeamId: flexibleIdSchema.optional(),
  competitionId: flexibleIdSchema.optional(),
  round: z.string().max(80).optional(),
  matchNumber: z.number().int().min(1).optional(),
  isOfficial: z.boolean().optional(),
  refereeName: z.string().max(120).optional(),
  assistantNames: z.string().max(240).optional(),
  assistantOneName: z.string().max(120).optional(),
  assistantTwoName: z.string().max(120).optional(),
  fourthOfficialName: z.string().max(120).optional(),
  reserveAssistantName: z.string().max(120).optional(),
  varName: z.string().max(120).optional(),
  avarName: z.string().max(120).optional(),
  delegateName: z.string().max(120).optional(),
  note: z.string().max(400).optional(),
  gameValueCents: z.number().int().min(0).optional(),
  seasonId: flexibleIdSchema.optional(),
  redTeamName: z.string().min(2).optional(),
  whiteTeamName: z.string().min(2).optional(),
  redUniformColor: z.string().min(2).optional(),
  whiteUniformColor: z.string().min(2).optional(),
  redUniformImageUrl: z.string().max(2_500_000).optional(),
  whiteUniformImageUrl: z.string().max(2_500_000).optional(),
  redCrestUrl: z.string().max(2_500_000).optional(),
  whiteCrestUrl: z.string().max(2_500_000).optional(),
  redFormation: formationSchema.nullable().optional(),
  whiteFormation: formationSchema.nullable().optional(),
  halfDurationMinutes: z.number().int().min(1).max(90).optional(),
  breakDurationMinutes: z.number().int().min(0).max(40).optional()
});

const gameIdParamsSchema = z.object({
  id: flexibleIdSchema
});

const gameAndLineupParamsSchema = z.object({
  id: flexibleIdSchema,
  lineupId: flexibleIdSchema
});

const gameAndSubstitutionParamsSchema = z.object({
  id: flexibleIdSchema,
  substitutionId: flexibleIdSchema
});

const gameAndEventParamsSchema = z.object({
  id: flexibleIdSchema,
  eventId: flexibleIdSchema
});

const updateGameSchema = createGameSchema.partial();

const fieldSchema = z.object({
  name: z.string().trim().min(2).max(140),
  address: z.string().trim().max(220).optional().or(z.literal("")),
  city: z.string().trim().max(120).optional().or(z.literal("")),
  state: z.string().trim().max(40).optional().or(z.literal("")),
  surface: z.string().trim().max(80).optional().or(z.literal("")),
  capacity: z.number().int().min(0).max(300000).optional().nullable(),
  defaultCostCents: z.number().int().min(0).default(0),
  status: z.nativeEnum(FieldStatus).default(FieldStatus.ACTIVE),
  notes: z.string().trim().max(800).optional().or(z.literal(""))
});

const fieldQuerySchema = z.object({
  status: z.nativeEnum(FieldStatus).optional()
});

function cleanText(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";
  return normalized ? normalized : null;
}

function ensureGameFlowPayload(payload: z.infer<typeof createGameSchema>, reply: FastifyReply) {
  const mode = payload.gameMode ?? (payload.type === GameType.EXTERNAL ? GameMode.EXTERNAL_FRIENDLY : GameMode.INTERNAL_SPLIT);
  const isExternalMode = mode !== GameMode.INTERNAL_SPLIT && mode !== GameMode.TRAINING;

  if (payload.type === GameType.EXTERNAL && isExternalMode && (!payload.homeClubId || !payload.awayClubId)) {
    return reply.status(400).send({ message: "Jogo externo precisa de clube mandante e clube visitante." });
  }

  if (payload.type === GameType.INTERNAL && mode === GameMode.INTERNAL_SPLIT && (payload.homeClubId || payload.awayClubId)) {
    return reply.status(400).send({ message: "Jogo interno usa Time A x Time B, sem clube adversario." });
  }

  return null;
}

const gameResultSchema = z.object({
  redScore: z.number().int().min(0),
  whiteScore: z.number().int().min(0)
});

const gameClockSchema = z.object({
  action: z.enum(["START", "HALFTIME", "SECOND_HALF", "PAUSE", "RESUME", "FINISH", "RESET"])
});

const lineupSchema = z.object({
  athleteId: flexibleIdSchema,
  side: z.nativeEnum(TeamSide),
  role: z.enum(["STARTER", "RESERVE", "GOALKEEPER", "ABSENT"]),
  presence: z.boolean().default(false),
  jerseyNumber: z.number().int().min(0).max(999).nullable().optional(),
  tacticalSlot: z.number().int().min(1).max(11).nullable().optional(),
  shirtName: z.string().max(80).optional().or(z.literal(""))
});

const gameEventSchema = z.object({
  athleteId: flexibleIdSchema,
  type: z.nativeEnum(EventType),
  minute: z.number().int().min(0).max(130).optional(),
  side: z.nativeEnum(TeamSide).optional(),
  note: z.string().max(400).optional(),
  reason: z.string().max(240).optional(),
  referee: z.string().max(120).optional(),
  teamName: z.string().max(80).optional()
});

const registerEventsSchema = z.object({
  events: z.array(gameEventSchema).min(1)
});

const tacticalPlanNodeSchema = z.object({
  formation: formationSchema,
  phase: z.enum(["ATAQUE", "EQUILIBRADO", "DEFESA"]),
  note: z.string().max(2500),
  substitutions: z.string().max(2500)
});

const tacticalPlansSchema = z.object({
  A: tacticalPlanNodeSchema,
  B: tacticalPlanNodeSchema,
  C: tacticalPlanNodeSchema
});

const substitutionSchema = z.object({
  athleteOutId: flexibleIdSchema,
  athleteInId: flexibleIdSchema,
  minute: z.number().int().min(0).max(130).optional(),
  side: z.nativeEnum(TeamSide).optional(),
  note: z.string().max(400).optional()
});

const yearQuerySchema = z.object({
  year: z.coerce.number().int().min(1980).max(2100).default(new Date().getUTCFullYear())
});

const periodQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(1980).max(2100).default(new Date().getUTCFullYear())
});

const gamesQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(1980).max(2100).optional(),
  type: z.nativeEnum(GameType).optional()
});

const gameNotifySchema = z.object({
  channels: z
    .object({
      email: z.boolean().default(true),
      whatsapp: z.boolean().default(true)
    })
    .optional(),
  customMessage: z.string().max(500).optional()
});

async function sendGameReminderEmail(input: {
  to: string;
  athleteName: string;
  gameDate: Date;
  gameLocation: string;
  gameType: GameType;
  customMessage?: string;
}) {
  if (!env.SMTP_HOST || !env.SMTP_PORT || !env.SMTP_FROM) {
    return { success: false, message: "SMTP não configurado" };
  }

  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined
  });

  const gameTypeLabel = input.gameType === "INTERNAL" ? "jogo interno" : "jogo externo";
  const dateLabel = input.gameDate.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });

  await transporter.sendMail({
    from: env.SMTP_FROM,
    to: input.to,
    subject: `Aviso de jogo GestaSports - ${dateLabel}`,
    text: `Olá ${input.athleteName}, lembrete de ${gameTypeLabel} em ${dateLabel}, local ${input.gameLocation}.${input.customMessage ? `\n\n${input.customMessage}` : ""}`,
    html: `<p>Olá <strong>${input.athleteName}</strong>,</p><p>Lembrete de <strong>${gameTypeLabel}</strong> em <strong>${dateLabel}</strong>, local <strong>${input.gameLocation}</strong>.</p>${input.customMessage ? `<p>${input.customMessage}</p>` : ""}`
  });

  return { success: true, message: "E-mail enviado" };
}

async function sendGameReminderWhatsapp(input: {
  phone: string;
  athleteName: string;
  gameDate: Date;
  gameLocation: string;
  gameType: GameType;
  customMessage?: string;
}) {
  if (!env.WHATSAPP_WEBHOOK_URL) {
    return { success: false, message: "Webhook WhatsApp não configurado" };
  }

  const response = await fetch(env.WHATSAPP_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      template: "game_reminder",
      phone: input.phone,
      athleteName: input.athleteName,
      gameDate: input.gameDate.toISOString(),
      gameLocation: input.gameLocation,
      gameType: input.gameType,
      customMessage: input.customMessage || null
    })
  });

  if (!response.ok) {
    return { success: false, message: `Webhook status ${response.status}` };
  }

  return { success: true, message: "WhatsApp enviado" };
}

export async function sportsRoutes(app: FastifyInstance) {
  app.get("/sports/fields", { preHandler: app.authenticate }, async (request) => {
    const query = fieldQuerySchema.parse(request.query);
    return prisma.field.findMany({
      where: {
        ...(query.status ? { status: query.status } : {})
      },
      orderBy: [{ status: "asc" }, { name: "asc" }]
    });
  });

  app.post("/sports/fields", { preHandler: app.authorize(["ADMIN"]) }, async (request, reply) => {
    const tenantId = request.user.tenantId ?? request.tenant?.id;
    if (!tenantId) {
      return reply.status(400).send({ message: "Ambiente do clube não identificado para cadastrar campo." });
    }

    const payload = fieldSchema.parse(request.body);
    const field = await prisma.field.create({
      data: {
        tenantId,
        name: payload.name,
        address: cleanText(payload.address),
        city: cleanText(payload.city),
        state: cleanText(payload.state),
        surface: cleanText(payload.surface),
        capacity: payload.capacity ?? null,
        defaultCostCents: payload.defaultCostCents,
        status: payload.status,
        notes: cleanText(payload.notes)
      }
    });

    return reply.code(201).send(field);
  });

  app.patch("/sports/fields/:id", { preHandler: app.authorize(["ADMIN"]) }, async (request) => {
    const params = gameIdParamsSchema.parse(request.params);
    const payload = fieldSchema.partial().parse(request.body);
    return prisma.field.update({
      where: { id: params.id },
      data: {
        ...(payload.name !== undefined ? { name: payload.name } : {}),
        ...(payload.address !== undefined ? { address: cleanText(payload.address) } : {}),
        ...(payload.city !== undefined ? { city: cleanText(payload.city) } : {}),
        ...(payload.state !== undefined ? { state: cleanText(payload.state) } : {}),
        ...(payload.surface !== undefined ? { surface: cleanText(payload.surface) } : {}),
        ...(payload.capacity !== undefined ? { capacity: payload.capacity ?? null } : {}),
        ...(payload.defaultCostCents !== undefined ? { defaultCostCents: payload.defaultCostCents } : {}),
        ...(payload.status !== undefined ? { status: payload.status } : {}),
        ...(payload.notes !== undefined ? { notes: cleanText(payload.notes) } : {})
      }
    });
  });

  app.delete("/sports/fields/:id", { preHandler: app.authorize(["ADMIN"]) }, async (request, reply) => {
    const params = gameIdParamsSchema.parse(request.params);
    await prisma.field.delete({ where: { id: params.id } });
    return reply.status(204).send();
  });

  app.get("/sports/games", { preHandler: app.authenticate }, async (request) => {
    const query = gamesQuerySchema.parse(request.query);
    const start = query.month && query.year ? new Date(Date.UTC(query.year, query.month - 1, 1)) : null;
    const end = query.month && query.year ? new Date(Date.UTC(query.year, query.month, 1)) : null;

    return prisma.game.findMany({
      where: {
        ...(query.type ? { type: query.type } : {}),
        ...(start && end ? { date: { gte: start, lt: end } } : query.year ? { date: { gte: new Date(Date.UTC(query.year, 0, 1)), lt: new Date(Date.UTC(query.year + 1, 0, 1)) } } : {})
      },
      include: {
        homeClub: {
          select: {
            id: true,
            name: true,
            shortName: true,
            logoUrl: true,
            shirtName: true,
            shirtColor: true,
            shirtImageUrl: true,
            type: true
          }
        },
        awayClub: {
          select: {
            id: true,
            name: true,
            shortName: true,
            logoUrl: true,
            shirtName: true,
            shirtColor: true,
            shirtImageUrl: true,
            type: true
          }
        },
        field: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true,
            surface: true,
            status: true
          }
        },
        lineups: {
          include: {
            athlete: {
              select: {
                id: true,
                name: true,
                position: true
              }
            }
          },
          orderBy: [{ side: "asc" }, { tacticalSlot: "asc" }, { jerseyNumber: "asc" }, { createdAt: "asc" }]
        },
        events: {
          include: {
            athlete: {
              select: {
                id: true,
                name: true,
                position: true
              }
            }
          },
          orderBy: [{ minute: "asc" }, { createdAt: "asc" }]
        },
        substitutions: {
          include: {
            athleteOut: {
              select: {
                id: true,
                name: true,
                position: true
              }
            },
            athleteIn: {
              select: {
                id: true,
                name: true,
                position: true
              }
            }
          },
          orderBy: [{ minute: "asc" }, { createdAt: "asc" }]
        },
        draftHistory: {
          orderBy: { attemptNumber: "asc" }
        },
        _count: {
          select: { lineups: true, events: true, substitutions: true }
        }
      },
      orderBy: { date: "desc" },
      take: 100
    });
  });

  app.post("/sports/games", { preHandler: app.authorize(["ADMIN"]) }, async (request, reply) => {
    const payload = createGameSchema.parse(request.body);
    const tenantId = request.user.tenantId ?? request.tenant?.id;

    if (!tenantId) {
      return reply.status(400).send({ message: "Ambiente do clube não identificado para cadastrar jogo." });
    }

    const flowError = ensureGameFlowPayload(payload, reply);
    if (flowError) return flowError;
    const game = await createGame({ ...payload, tenantId });
    return reply.code(201).send(game);
  });

  app.patch("/sports/games/:id", { preHandler: app.authorize(["ADMIN"]) }, async (request, reply) => {
    const params = gameIdParamsSchema.parse(request.params);
    const payload = updateGameSchema.parse(request.body);
    const current = await prisma.game.findUniqueOrThrow({
      where: { id: params.id },
      select: { type: true, gameMode: true, homeClubId: true, awayClubId: true }
    });
    const flowError = ensureGameFlowPayload(
      {
        type: payload.type ?? current.type,
        date: payload.date ?? new Date().toISOString(),
        location: payload.location ?? "local",
        gameMode: payload.gameMode ?? current.gameMode,
        homeClubId: (payload.homeClubId ?? current.homeClubId) || undefined,
        awayClubId: (payload.awayClubId ?? current.awayClubId) || undefined
      },
      reply
    );
    if (flowError) return flowError;

    return prisma.game.update({
      where: { id: params.id },
      data: {
        ...(payload.type !== undefined ? { type: payload.type } : {}),
        ...(payload.date !== undefined ? { date: new Date(payload.date) } : {}),
        ...(payload.location !== undefined ? { location: payload.location } : {}),
        ...(payload.championship !== undefined ? { championship: payload.championship || null } : {}),
        ...(payload.gameMode !== undefined ? { gameMode: payload.gameMode } : {}),
        ...(payload.homeClubId !== undefined ? { homeClubId: payload.homeClubId || null } : {}),
        ...(payload.awayClubId !== undefined ? { awayClubId: payload.awayClubId || null } : {}),
        ...(payload.fieldId !== undefined ? { fieldId: payload.fieldId || null } : {}),
        ...(payload.homeTeamId !== undefined ? { homeTeamId: payload.homeTeamId || null } : {}),
        ...(payload.awayTeamId !== undefined ? { awayTeamId: payload.awayTeamId || null } : {}),
        ...(payload.competitionId !== undefined ? { competitionId: payload.competitionId || null } : {}),
        ...(payload.round !== undefined ? { round: payload.round || null } : {}),
        ...(payload.matchNumber !== undefined ? { matchNumber: payload.matchNumber || null } : {}),
        ...(payload.isOfficial !== undefined ? { isOfficial: payload.isOfficial } : {}),
        ...(payload.refereeName !== undefined ? { refereeName: payload.refereeName || null } : {}),
        ...(payload.assistantNames !== undefined ? { assistantNames: payload.assistantNames || null } : {}),
        ...(payload.assistantOneName !== undefined ? { assistantOneName: payload.assistantOneName || null } : {}),
        ...(payload.assistantTwoName !== undefined ? { assistantTwoName: payload.assistantTwoName || null } : {}),
        ...(payload.fourthOfficialName !== undefined ? { fourthOfficialName: payload.fourthOfficialName || null } : {}),
        ...(payload.reserveAssistantName !== undefined ? { reserveAssistantName: payload.reserveAssistantName || null } : {}),
        ...(payload.varName !== undefined ? { varName: payload.varName || null } : {}),
        ...(payload.avarName !== undefined ? { avarName: payload.avarName || null } : {}),
        ...(payload.delegateName !== undefined ? { delegateName: payload.delegateName || null } : {}),
        ...(payload.note !== undefined ? { note: payload.note || null } : {}),
        ...(payload.gameValueCents !== undefined ? { gameValueCents: payload.gameValueCents } : {}),
        ...(payload.seasonId !== undefined ? { seasonId: payload.seasonId || null } : {}),
        ...(payload.redTeamName !== undefined ? { redTeamName: payload.redTeamName || null } : {}),
        ...(payload.whiteTeamName !== undefined ? { whiteTeamName: payload.whiteTeamName || null } : {}),
        ...(payload.redUniformColor !== undefined ? { redUniformColor: payload.redUniformColor || null } : {}),
        ...(payload.whiteUniformColor !== undefined ? { whiteUniformColor: payload.whiteUniformColor || null } : {}),
        ...(payload.redUniformImageUrl !== undefined ? { redUniformImageUrl: cleanText(payload.redUniformImageUrl) } : {}),
        ...(payload.whiteUniformImageUrl !== undefined ? { whiteUniformImageUrl: cleanText(payload.whiteUniformImageUrl) } : {}),
        ...(payload.redCrestUrl !== undefined ? { redCrestUrl: cleanText(payload.redCrestUrl) } : {}),
        ...(payload.whiteCrestUrl !== undefined ? { whiteCrestUrl: cleanText(payload.whiteCrestUrl) } : {}),
        ...(payload.redFormation !== undefined ? { redFormation: payload.redFormation || null } : {}),
        ...(payload.whiteFormation !== undefined ? { whiteFormation: payload.whiteFormation || null } : {}),
        ...(payload.halfDurationMinutes !== undefined ? { halfDurationMinutes: payload.halfDurationMinutes } : {}),
        ...(payload.breakDurationMinutes !== undefined ? { breakDurationMinutes: payload.breakDurationMinutes } : {})
      }
    });
  });

  app.patch("/sports/games/:id/clock", { preHandler: app.authorize(["ADMIN"]) }, async (request) => {
    const params = gameIdParamsSchema.parse(request.params);
    const payload = gameClockSchema.parse(request.body);
    return updateGameClock(params.id, payload.action);
  });

  app.patch("/sports/games/:id/result", { preHandler: app.authorize(["ADMIN"]) }, async (request) => {
    const params = gameIdParamsSchema.parse(request.params);
    const payload = gameResultSchema.parse(request.body);

    return setGameResult({
      gameId: params.id,
      redScore: payload.redScore,
      whiteScore: payload.whiteScore
    });
  });

  app.post("/sports/games/:id/notify", { preHandler: app.authorize(["ADMIN"]) }, async (request, reply) => {
    const params = gameIdParamsSchema.parse(request.params);
    const payload = gameNotifySchema.parse(request.body ?? {});
    const channels = payload.channels ?? { email: true, whatsapp: true };

    const game = await prisma.game.findUnique({
      where: { id: params.id },
      include: {
        lineups: {
          where: {
            presence: true,
            role: { not: "ABSENT" }
          },
          include: {
            athlete: {
              select: {
                id: true,
                name: true,
                associate: {
                  select: {
                    id: true,
                    email: true,
                    phone: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!game) {
      return reply.status(404).send({ message: "Jogo não encontrado" });
    }

    const contacts = new Map<string, { athleteName: string; email: string | null; phone: string | null }>();
    for (const lineup of game.lineups) {
      const key = lineup.athlete.associate?.id ?? lineup.athlete.id;
      if (!contacts.has(key)) {
        contacts.set(key, {
          athleteName: lineup.athlete.name,
          email: lineup.athlete.associate?.email || null,
          phone: lineup.athlete.associate?.phone || null
        });
      }
    }

    let sentEmail = 0;
    let sentWhatsapp = 0;
    let skippedNoContact = 0;

    for (const contact of contacts.values()) {
      let hadAnyContact = false;

      if (channels.email && contact.email) {
        hadAnyContact = true;
        const result = await sendGameReminderEmail({
          to: contact.email,
          athleteName: contact.athleteName,
          gameDate: game.date,
          gameLocation: game.location,
          gameType: game.type,
          ...(payload.customMessage ? { customMessage: payload.customMessage } : {})
        });
        if (result.success) {
          sentEmail += 1;
        }
      }

      if (channels.whatsapp && contact.phone) {
        hadAnyContact = true;
        const result = await sendGameReminderWhatsapp({
          phone: contact.phone,
          athleteName: contact.athleteName,
          gameDate: game.date,
          gameLocation: game.location,
          gameType: game.type,
          ...(payload.customMessage ? { customMessage: payload.customMessage } : {})
        });
        if (result.success) {
          sentWhatsapp += 1;
        }
      }

      if (!hadAnyContact) {
        skippedNoContact += 1;
      }
    }

    return {
      gameId: game.id,
      selectedAthletes: game.lineups.length,
      recipients: contacts.size,
      sentEmail,
      sentWhatsapp,
      skippedNoContact,
      channels
    };
  });

  app.post("/sports/games/:id/lineups", { preHandler: app.authorize(["ADMIN"]) }, async (request, reply) => {
    const params = gameIdParamsSchema.parse(request.params);
    const payload = lineupSchema.parse(request.body);

    try {
      const lineup = await upsertLineup({
        gameId: params.id,
        athleteId: payload.athleteId,
        side: payload.side,
        role: payload.role,
        presence: payload.presence,
        jerseyNumber: payload.jerseyNumber,
        tacticalSlot: payload.tacticalSlot,
        shirtName: payload.shirtName
      });

      return reply.code(201).send(lineup);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao salvar escalação";
      if (message.includes("suspenso") || message.includes("Camisa") || message.includes("goleiro") || message.includes("jogador de linha")) {
        return reply.status(409).send({ message });
      }
      throw error;
    }
  });

  app.delete("/sports/games/:id/lineups/:lineupId", { preHandler: app.authorize(["ADMIN"]) }, async (request, reply) => {
    const params = gameAndLineupParamsSchema.parse(request.params);

    const deleted = await prisma.gameLineup.deleteMany({
      where: { id: params.lineupId, gameId: params.id }
    });

    if (deleted.count === 0) {
      return reply.status(404).send({ message: "Escalação não encontrada para este jogo" });
    }

    return reply.status(204).send();
  });

  app.post("/sports/games/:id/events", { preHandler: app.authorize(["ADMIN"]) }, async (request) => {
    const params = gameIdParamsSchema.parse(request.params);
    const payload = registerEventsSchema.parse(request.body);

    return registerGameEvents(params.id, payload.events);
  });

  app.get("/sports/games/:id/tactical-plans", { preHandler: app.authorize(["ADMIN"]) }, async (request, reply) => {
    const params = gameIdParamsSchema.parse(request.params);
    const game = await prisma.game.findUnique({
      where: { id: params.id },
      select: { id: true, tacticalPlans: true }
    });

    if (!game) {
      return reply.status(404).send({ message: "Jogo não encontrado" });
    }

    return {
      gameId: game.id,
      tacticalPlans: game.tacticalPlans || null
    };
  });

  app.patch("/sports/games/:id/tactical-plans", { preHandler: app.authorize(["ADMIN"]) }, async (request, reply) => {
    const params = gameIdParamsSchema.parse(request.params);
    const payload = tacticalPlansSchema.parse(request.body);

    const updated = await prisma.game.updateMany({
      where: { id: params.id },
      data: {
        tacticalPlans: payload as Prisma.InputJsonValue
      }
    });

    if (updated.count === 0) {
      return reply.status(404).send({ message: "Jogo não encontrado" });
    }

    return { gameId: params.id, tacticalPlans: payload };
  });

  app.delete("/sports/games/:id/events/:eventId", { preHandler: app.authorize(["ADMIN"]) }, async (request, reply) => {
    const params = gameAndEventParamsSchema.parse(request.params);
    const deleted = await deleteGameEvent(params.id, params.eventId);

    if (!deleted) {
      return reply.status(404).send({ message: "Evento não encontrado para este jogo" });
    }

    return reply.status(204).send();
  });

  app.post("/sports/games/:id/substitutions", { preHandler: app.authorize(["ADMIN"]) }, async (request, reply) => {
    const params = gameIdParamsSchema.parse(request.params);
    const payload = substitutionSchema.parse(request.body);

    try {
      const substitution = await registerGameSubstitution(params.id, payload);
      return reply.code(201).send(substitution);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao salvar substituição";
      if (message.includes("atletas") || message.includes("Jogo") || message.includes("Escolha")) {
        return reply.status(409).send({ message });
      }
      throw error;
    }
  });

  app.delete("/sports/games/:id/substitutions/:substitutionId", { preHandler: app.authorize(["ADMIN"]) }, async (request, reply) => {
    const params = gameAndSubstitutionParamsSchema.parse(request.params);
    const deleted = await deleteGameSubstitution(params.id, params.substitutionId);

    if (!deleted) {
      return reply.status(404).send({ message: "Substituição não encontrada para este jogo" });
    }

    return reply.status(204).send();
  });

  app.delete("/sports/games/:id", { preHandler: app.authorize(["ADMIN"]) }, async (request, reply) => {
    const params = gameIdParamsSchema.parse(request.params);
    await prisma.game.delete({ where: { id: params.id } });
    return reply.status(204).send();
  });

  app.get("/sports/stats/scorers", { preHandler: app.authenticate }, async (request) => {
    const query = periodQuerySchema.parse(request.query);
    return getScorerRanking(query.year, query.month);
  });

  app.get("/sports/stats/competition", { preHandler: app.authenticate }, async (request) => {
    const query = periodQuerySchema.parse(request.query);
    return getCompetitionRanking(query.year, query.month);
  });

  app.get("/sports/stats/discipline", { preHandler: app.authenticate }, async (request) => {
    const query = periodQuerySchema.parse(request.query);
    return getDisciplineRanking(query.year, query.month);
  });

  app.get("/sports/stats/confrontations", { preHandler: app.authenticate }, async (request) => {
    const query = periodQuerySchema.parse(request.query);
    return getConfrontationStats(query.year, query.month);
  });

  app.get("/sports/suspensions/active", { preHandler: app.authenticate }, async () => {
    return getActiveSuspensions();
  });
}



