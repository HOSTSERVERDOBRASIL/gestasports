import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";

const createSchema = z.object({
  title: z.string().min(2).max(120),
  body: z.string().min(5).max(2000),
  pinned: z.boolean().default(false),
  publishedAt: z.string().datetime().optional()
});

const paramsSchema = z.object({ id: z.string().cuid() });

export async function announcementRoutes(app: FastifyInstance) {
  // Listar comunicados (público para membros do tenant)
  app.get("/announcements", { preHandler: app.authenticate }, async (request) => {
    const tenantId = request.user.tenantId;
    return prisma.announcement.findMany({
      where: tenantId ? { tenantId } : { tenantId: "" },
      orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
      take: 50,
      select: {
        id: true, title: true, body: true, pinned: true, publishedAt: true, createdAt: true,
        author: { select: { id: true, name: true } }
      }
    });
  });

  // Criar comunicado (ADMIN)
  app.post("/announcements", { preHandler: app.authorize(["ADMIN"]) }, async (request, reply) => {
    const data = createSchema.parse(request.body);
    const item = await prisma.announcement.create({
      data: {
        title: data.title,
        body: data.body,
        pinned: data.pinned,
        publishedAt: data.publishedAt ? new Date(data.publishedAt) : new Date(),
        tenantId: request.user.tenantId!,
        authorId: request.user.sub
      }
    });
    return reply.status(201).send(item);
  });

  // Editar comunicado (ADMIN)
  app.patch("/announcements/:id", { preHandler: app.authorize(["ADMIN"]) }, async (request) => {
    const { id } = paramsSchema.parse(request.params);
    const data = createSchema.partial().parse(request.body);
    return prisma.announcement.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.body !== undefined ? { body: data.body } : {}),
        ...(data.pinned !== undefined ? { pinned: data.pinned } : {}),
        ...(data.publishedAt !== undefined ? { publishedAt: new Date(data.publishedAt) } : {})
      }
    });
  });

  // Deletar comunicado (ADMIN)
  app.delete("/announcements/:id", { preHandler: app.authorize(["ADMIN"]) }, async (request, reply) => {
    const { id } = paramsSchema.parse(request.params);
    await prisma.announcement.delete({ where: { id } });
    return reply.status(204).send();
  });
}
