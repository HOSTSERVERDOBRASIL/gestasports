import type { FastifyInstance } from "fastify";
import { MediaType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";

const createMediaSchema = z.object({
  type: z.nativeEnum(MediaType),
  url: z.string().url(),
  title: z.string().min(2).max(120).optional(),
  year: z.number().int().min(2000).max(2100).optional(),
  athleteId: z.string().cuid().optional(),
  gameId: z.string().cuid().optional(),
  confrontationId: z.string().cuid().optional()
});

const updateMediaSchema = createMediaSchema.partial();

const querySchema = z.object({
  type: z.nativeEnum(MediaType).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  athleteId: z.string().cuid().optional(),
  gameId: z.string().cuid().optional(),
  confrontationId: z.string().cuid().optional()
});

const mediaParamsSchema = z.object({
  id: z.string().cuid()
});

export async function galleryRoutes(app: FastifyInstance) {
  app.get("/gallery/assets", { preHandler: app.authenticate }, async (request) => {
    const query = querySchema.parse(request.query);

    return prisma.mediaAsset.findMany({
      where: {
        ...(query.type ? { type: query.type } : {}),
        ...(query.year !== undefined ? { year: query.year } : {}),
        ...(query.athleteId ? { athleteId: query.athleteId } : {}),
        ...(query.gameId ? { gameId: query.gameId } : {}),
        ...(query.confrontationId ? { confrontationId: query.confrontationId } : {})
      },
      orderBy: [{ year: "desc" }, { createdAt: "desc" }],
      take: 500
    });
  });

  app.post("/gallery/assets", { preHandler: app.authorize(["ADMIN", "FINANCIAL"]) }, async (request, reply) => {
    const payload = createMediaSchema.parse(request.body);

    const created = await prisma.mediaAsset.create({
      data: {
        type: payload.type,
        url: payload.url,
        title: payload.title || null,
        year: payload.year || null,
        athleteId: payload.athleteId || null,
        gameId: payload.gameId || null,
        confrontationId: payload.confrontationId || null,
        uploadedById: request.user.sub
      }
    });

    return reply.code(201).send(created);
  });

  app.patch("/gallery/assets/:id", { preHandler: app.authorize(["ADMIN", "FINANCIAL"]) }, async (request) => {
    const { id } = mediaParamsSchema.parse(request.params);
    const payload = updateMediaSchema.parse(request.body);

    return prisma.mediaAsset.update({
      where: { id },
      data: {
        ...(payload.type ? { type: payload.type } : {}),
        ...(payload.url ? { url: payload.url } : {}),
        ...(payload.title !== undefined ? { title: payload.title || null } : {}),
        ...(payload.year !== undefined ? { year: payload.year || null } : {}),
        ...(payload.athleteId !== undefined ? { athleteId: payload.athleteId || null } : {}),
        ...(payload.gameId !== undefined ? { gameId: payload.gameId || null } : {}),
        ...(payload.confrontationId !== undefined ? { confrontationId: payload.confrontationId || null } : {})
      }
    });
  });

  app.delete("/gallery/assets/:id", { preHandler: app.authorize(["ADMIN", "FINANCIAL"]) }, async (request, reply) => {
    const { id } = mediaParamsSchema.parse(request.params);
    await prisma.mediaAsset.delete({ where: { id } });
    return reply.code(204).send();
  });
}
