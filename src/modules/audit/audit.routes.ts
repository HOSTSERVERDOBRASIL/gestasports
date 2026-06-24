import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";

const auditQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(80),
  role: z.enum(["SUPERADMIN", "ADMIN", "ATHLETE", "FINANCIAL"]).optional(),
  action: z.string().min(1).optional()
});

export async function auditRoutes(app: FastifyInstance) {
  app.get("/audit-logs", { preHandler: app.authorize(["SUPERADMIN", "ADMIN", "FINANCIAL"]) }, async (request) => {
    const query = auditQuerySchema.parse(request.query);

    return prisma.auditLog.findMany({
      where: {
        ...(query.role ? { userRole: query.role } : {}),
        ...(query.action ? { action: query.action } : {})
      },
      orderBy: { createdAt: "desc" },
      take: query.limit
    });
  });
}
