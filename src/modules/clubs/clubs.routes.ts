import type { FastifyInstance } from "fastify";
import {
  CallUpStatus,
  ClubStatus,
  ClubType,
  CompetitionFormat,
  CompetitionStatus,
  CompetitionTeamStatus,
  CompetitionType,
  Prisma,
  TeamCategory,
  TeamGender,
  TeamStatus
} from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";

const flexibleIdSchema = z.union([z.string().cuid(), z.string().uuid()]);

const optionalText = (max = 160) => z.string().trim().max(max).optional().or(z.literal(""));

function cleanText(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";
  return normalized ? normalized : null;
}

async function associateNameForStaff(associateId: string | null | undefined) {
  if (!associateId) {
    return null;
  }
  const associate = await prisma.associate.findUnique({
    where: { id: associateId },
    select: { id: true, name: true }
  });
  if (!associate) {
    throw new Error("Associado da comissão técnica não encontrado.");
  }
  return associate.name;
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || `clube-${Date.now()}`;
}

const clubSchema = z.object({
  name: z.string().trim().min(2).max(120),
  shortName: optionalText(40),
  slug: optionalText(90),
  logoUrl: optionalText(2_500_000),
  shirtName: optionalText(80),
  shirtColor: optionalText(2_000),
  shirtImageUrl: optionalText(2_500_000),
  city: optionalText(80),
  state: optionalText(40),
  country: optionalText(80),
  responsibleName: optionalText(120),
  responsiblePhone: optionalText(40),
  responsibleEmail: z.string().trim().email().optional().or(z.literal("")),
  type: z.nativeEnum(ClubType).default(ClubType.EXTERNAL),
  status: z.nativeEnum(ClubStatus).default(ClubStatus.ACTIVE)
});

const teamSchema = z.object({
  clubId: flexibleIdSchema,
  name: z.string().trim().min(2).max(120),
  category: z.nativeEnum(TeamCategory).default(TeamCategory.PRINCIPAL),
  gender: z.nativeEnum(TeamGender).default(TeamGender.MIXED),
  status: z.nativeEnum(TeamStatus).default(TeamStatus.ACTIVE),
  logoUrl: optionalText(2_500_000),
  shirtName: optionalText(80),
  shirtColor: optionalText(2_000),
  shirtImageUrl: optionalText(2_500_000),
  coachName: optionalText(120),
  coachAssociateId: flexibleIdSchema.optional().or(z.literal("")),
  assistantName: optionalText(120),
  assistantAssociateId: flexibleIdSchema.optional().or(z.literal(""))
});

const competitionSchema = z.object({
  name: z.string().trim().min(2).max(140),
  seasonId: flexibleIdSchema.optional().or(z.literal("")),
  type: z.nativeEnum(CompetitionType).default(CompetitionType.LEAGUE),
  format: z.nativeEnum(CompetitionFormat).default(CompetitionFormat.PONTOS_CORRIDOS),
  startDate: z.string().datetime().optional().nullable().or(z.literal("")),
  endDate: z.string().datetime().optional().nullable().or(z.literal("")),
  status: z.nativeEnum(CompetitionStatus).default(CompetitionStatus.DRAFT),
  rules: z.unknown().optional()
});

const competitionTeamSchema = z.object({
  teamId: flexibleIdSchema.optional().or(z.literal("")),
  clubId: flexibleIdSchema.optional().or(z.literal("")),
  groupName: optionalText(40),
  status: z.nativeEnum(CompetitionTeamStatus).default(CompetitionTeamStatus.ACTIVE)
});

const callUpSchema = z.object({
  gameId: flexibleIdSchema,
  athleteIds: z.array(flexibleIdSchema).min(1),
  status: z.nativeEnum(CallUpStatus).default(CallUpStatus.CALLED)
});

const callUpUpdateSchema = z.object({
  status: z.nativeEnum(CallUpStatus),
  responseNote: optionalText(400)
});

const idParamsSchema = z.object({ id: flexibleIdSchema });
const competitionTeamParamsSchema = z.object({ id: flexibleIdSchema, teamId: flexibleIdSchema });
const gameIdQuerySchema = z.object({ gameId: flexibleIdSchema.optional() });

function serializeDate(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

export async function clubRoutes(app: FastifyInstance) {
  app.get("/clubs", { preHandler: app.authorize(["ADMIN", "FINANCIAL"]) }, async () => {
    return prisma.club.findMany({
      include: { teams: { orderBy: { name: "asc" } } },
      orderBy: [{ type: "asc" }, { name: "asc" }]
    });
  });

  app.post("/clubs", { preHandler: app.authorize(["ADMIN"]) }, async (request, reply) => {
    const payload = clubSchema.parse(request.body);
    const club = await prisma.club.create({
      data: {
        name: payload.name,
        shortName: cleanText(payload.shortName),
        slug: slugify(payload.slug || payload.name),
        logoUrl: cleanText(payload.logoUrl),
        shirtName: cleanText(payload.shirtName),
        shirtColor: cleanText(payload.shirtColor),
        shirtImageUrl: cleanText(payload.shirtImageUrl),
        city: cleanText(payload.city),
        state: cleanText(payload.state),
        country: cleanText(payload.country) ?? "Brasil",
        responsibleName: cleanText(payload.responsibleName),
        responsiblePhone: cleanText(payload.responsiblePhone),
        responsibleEmail: cleanText(payload.responsibleEmail),
        type: payload.type,
        status: payload.status
      }
    });

    return reply.code(201).send(club);
  });

  app.patch("/clubs/:id", { preHandler: app.authorize(["ADMIN"]) }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const payload = clubSchema.partial().parse(request.body);
    return prisma.club.update({
      where: { id },
      data: {
        ...(payload.name ? { name: payload.name } : {}),
        ...(payload.slug !== undefined ? { slug: slugify(payload.slug || payload.name || id) } : {}),
        ...(payload.shortName !== undefined ? { shortName: cleanText(payload.shortName) } : {}),
        ...(payload.logoUrl !== undefined ? { logoUrl: cleanText(payload.logoUrl) } : {}),
        ...(payload.shirtName !== undefined ? { shirtName: cleanText(payload.shirtName) } : {}),
        ...(payload.shirtColor !== undefined ? { shirtColor: cleanText(payload.shirtColor) } : {}),
        ...(payload.shirtImageUrl !== undefined ? { shirtImageUrl: cleanText(payload.shirtImageUrl) } : {}),
        ...(payload.city !== undefined ? { city: cleanText(payload.city) } : {}),
        ...(payload.state !== undefined ? { state: cleanText(payload.state) } : {}),
        ...(payload.country !== undefined ? { country: cleanText(payload.country) ?? "Brasil" } : {}),
        ...(payload.responsibleName !== undefined ? { responsibleName: cleanText(payload.responsibleName) } : {}),
        ...(payload.responsiblePhone !== undefined ? { responsiblePhone: cleanText(payload.responsiblePhone) } : {}),
        ...(payload.responsibleEmail !== undefined ? { responsibleEmail: cleanText(payload.responsibleEmail) } : {}),
        ...(payload.type ? { type: payload.type } : {}),
        ...(payload.status ? { status: payload.status } : {})
      }
    });
  });

  app.get("/teams", { preHandler: app.authorize(["ADMIN", "FINANCIAL"]) }, async () => {
    return prisma.team.findMany({
      include: { club: true, coachAssociate: true, assistantAssociate: true },
      orderBy: [{ status: "asc" }, { name: "asc" }]
    });
  });

  app.post("/teams", { preHandler: app.authorize(["ADMIN"]) }, async (request, reply) => {
    const payload = teamSchema.parse(request.body);
    const coachNameFromAssociate = await associateNameForStaff(cleanText(payload.coachAssociateId));
    const assistantNameFromAssociate = await associateNameForStaff(cleanText(payload.assistantAssociateId));
    const team = await prisma.team.create({
      data: {
        clubId: payload.clubId,
        name: payload.name,
        category: payload.category,
        gender: payload.gender,
        status: payload.status,
        logoUrl: cleanText(payload.logoUrl),
        shirtName: cleanText(payload.shirtName),
        shirtColor: cleanText(payload.shirtColor),
        shirtImageUrl: cleanText(payload.shirtImageUrl),
        coachName: coachNameFromAssociate ?? cleanText(payload.coachName),
        coachAssociateId: cleanText(payload.coachAssociateId),
        assistantName: assistantNameFromAssociate ?? cleanText(payload.assistantName),
        assistantAssociateId: cleanText(payload.assistantAssociateId)
      },
      include: { club: true, coachAssociate: true, assistantAssociate: true }
    });

    return reply.code(201).send(team);
  });

  app.patch("/teams/:id", { preHandler: app.authorize(["ADMIN"]) }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const payload = teamSchema.partial().parse(request.body);
    const coachNameFromAssociate = payload.coachAssociateId !== undefined ? await associateNameForStaff(cleanText(payload.coachAssociateId)) : null;
    const assistantNameFromAssociate = payload.assistantAssociateId !== undefined ? await associateNameForStaff(cleanText(payload.assistantAssociateId)) : null;
    return prisma.team.update({
      where: { id },
      data: {
        ...(payload.clubId ? { clubId: payload.clubId } : {}),
        ...(payload.name ? { name: payload.name } : {}),
        ...(payload.category ? { category: payload.category } : {}),
        ...(payload.gender ? { gender: payload.gender } : {}),
        ...(payload.status ? { status: payload.status } : {}),
        ...(payload.logoUrl !== undefined ? { logoUrl: cleanText(payload.logoUrl) } : {}),
        ...(payload.shirtName !== undefined ? { shirtName: cleanText(payload.shirtName) } : {}),
        ...(payload.shirtColor !== undefined ? { shirtColor: cleanText(payload.shirtColor) } : {}),
        ...(payload.shirtImageUrl !== undefined ? { shirtImageUrl: cleanText(payload.shirtImageUrl) } : {}),
        ...(payload.coachName !== undefined ? { coachName: cleanText(payload.coachName) } : {}),
        ...(payload.coachAssociateId !== undefined ? { coachAssociateId: cleanText(payload.coachAssociateId), coachName: coachNameFromAssociate ?? cleanText(payload.coachName) } : {}),
        ...(payload.assistantName !== undefined ? { assistantName: cleanText(payload.assistantName) } : {}),
        ...(payload.assistantAssociateId !== undefined ? { assistantAssociateId: cleanText(payload.assistantAssociateId), assistantName: assistantNameFromAssociate ?? cleanText(payload.assistantName) } : {})
      },
      include: { club: true, coachAssociate: true, assistantAssociate: true }
    });
  });

  app.get("/competitions", { preHandler: app.authorize(["ADMIN", "FINANCIAL"]) }, async () => {
    const competitions = await prisma.competition.findMany({
      include: {
        teams: { include: { team: { include: { club: true } }, club: true } },
        _count: { select: { games: true, confrontations: true } }
      },
      orderBy: [{ status: "asc" }, { startDate: "desc" }, { name: "asc" }]
    });

    return competitions.map((competition) => ({
      ...competition,
      startDate: serializeDate(competition.startDate),
      endDate: serializeDate(competition.endDate),
      createdAt: competition.createdAt.toISOString(),
      updatedAt: competition.updatedAt.toISOString()
    }));
  });

  app.post("/competitions", { preHandler: app.authorize(["ADMIN"]) }, async (request, reply) => {
    const payload = competitionSchema.parse(request.body);
    const competition = await prisma.competition.create({
      data: {
        name: payload.name,
        ...(payload.seasonId !== undefined ? { seasonId: cleanText(payload.seasonId) } : {}),
        type: payload.type,
        format: payload.format,
        startDate: payload.startDate ? new Date(payload.startDate) : null,
        endDate: payload.endDate ? new Date(payload.endDate) : null,
        status: payload.status,
        ...(payload.rules === undefined ? {} : { rules: payload.rules as Prisma.InputJsonValue })
      }
    });

    return reply.code(201).send(competition);
  });

  app.post("/competitions/:id/teams", { preHandler: app.authorize(["ADMIN"]) }, async (request, reply) => {
    const { id } = idParamsSchema.parse(request.params);
    const payload = competitionTeamSchema.parse(request.body);
    const row = await prisma.competitionTeam.create({
      data: {
        competitionId: id,
        teamId: cleanText(payload.teamId),
        clubId: cleanText(payload.clubId),
        groupName: cleanText(payload.groupName),
        status: payload.status
      },
      include: { team: { include: { club: true } }, club: true }
    });

    return reply.code(201).send(row);
  });

  app.patch("/competitions/:id/teams/:teamId", { preHandler: app.authorize(["ADMIN"]) }, async (request) => {
    const { teamId } = competitionTeamParamsSchema.parse(request.params);
    const payload = competitionTeamSchema.partial().parse(request.body);
    return prisma.competitionTeam.update({
      where: { id: teamId },
      data: {
        ...(payload.teamId !== undefined ? { teamId: cleanText(payload.teamId) } : {}),
        ...(payload.clubId !== undefined ? { clubId: cleanText(payload.clubId) } : {}),
        ...(payload.groupName !== undefined ? { groupName: cleanText(payload.groupName) } : {}),
        ...(payload.status ? { status: payload.status } : {})
      },
      include: { team: { include: { club: true } }, club: true }
    });
  });

  app.get("/game-callups", { preHandler: app.authorize(["ADMIN", "FINANCIAL"]) }, async (request) => {
    const query = gameIdQuerySchema.parse(request.query);
    return prisma.gameCallUp.findMany({
      where: query.gameId ? { gameId: query.gameId } : {},
      include: {
        athlete: { select: { id: true, name: true, position: true, photoUrl: true } },
        game: { select: { id: true, date: true, location: true, gameMode: true, homeScore: true, awayScore: true } }
      },
      orderBy: [{ createdAt: "desc" }]
    });
  });

  app.post("/game-callups", { preHandler: app.authorize(["ADMIN"]) }, async (request, reply) => {
    const payload = callUpSchema.parse(request.body);
    await prisma.gameCallUp.createMany({
      data: payload.athleteIds.map((athleteId) => ({
        gameId: payload.gameId,
        athleteId,
        status: payload.status
      })),
      skipDuplicates: true
    });

    const callUps = await prisma.gameCallUp.findMany({
      where: { gameId: payload.gameId, athleteId: { in: payload.athleteIds } },
      include: { athlete: { select: { id: true, name: true, position: true, photoUrl: true } } }
    });

    return reply.code(201).send(callUps);
  });

  app.patch("/game-callups/:id", { preHandler: app.authorize(["ADMIN"]) }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const payload = callUpUpdateSchema.parse(request.body);
    return prisma.gameCallUp.update({
      where: { id },
      data: {
        status: payload.status,
        responseNote: cleanText(payload.responseNote),
        confirmedAt: payload.status === CallUpStatus.CONFIRMED ? new Date() : null
      },
      include: { athlete: { select: { id: true, name: true, position: true, photoUrl: true } } }
    });
  });
}

