import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(10),
  auth: z.string().min(10)
});

export async function pushRoutes(app: FastifyInstance) {
  // Salvar subscription do browser
  app.post("/push/subscribe", { preHandler: app.authenticate }, async (request, reply) => {
    const data = subscribeSchema.parse(request.body);
    await prisma.pushSubscription.upsert({
      where: { endpoint: data.endpoint },
      update: { p256dh: data.p256dh, auth: data.auth },
      create: {
        userId: request.user.sub,
        tenantId: request.user.tenantId ?? null,
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth
      }
    });
    return reply.status(201).send({ ok: true });
  });

  // Remover subscription
  app.delete("/push/subscribe", { preHandler: app.authenticate }, async (request, reply) => {
    const { endpoint } = z.object({ endpoint: z.string() }).parse(request.body);
    await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: request.user.sub } });
    return reply.status(204).send();
  });
}
