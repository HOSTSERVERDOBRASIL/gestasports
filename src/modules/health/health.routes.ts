import type { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma.js";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async (_request, reply) => {
    const startedAt = process.uptime();

    try {
      await prisma.$queryRaw`SELECT 1`;
      return {
        status: "ok",
        service: "gestasports-system",
        uptimeSeconds: Math.floor(startedAt),
        database: "connected"
      };
    } catch {
      return reply.status(503).send({
        status: "degraded",
        service: "gestasports-system",
        uptimeSeconds: Math.floor(startedAt),
        database: "disconnected"
      });
    }
  });
}
