import fp from "fastify-plugin";
import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../lib/prisma.js";

const mutatingMethods = new Set(["POST", "PATCH", "PUT", "DELETE"]);

function actionFromPath(method: string, path: string) {
  const cleanPath = path.replace(/^\/api\//, "").split("?")[0] ?? "";
  const firstSegment = cleanPath.split("/").filter(Boolean)[0] ?? "system";
  const verb = method === "POST" ? "create" : method === "PATCH" || method === "PUT" ? "update" : "delete";
  return `${verb}:${firstSegment}`;
}

function targetFromPath(path: string) {
  const segments = (path.replace(/^\/api\//, "").split("?")[0] ?? "").split("/").filter(Boolean);
  const id = segments.find((segment) => /^[a-z0-9]{12,}$/i.test(segment));
  return {
    targetType: segments[0] ?? null,
    targetId: id ?? null
  };
}

export const auditPlugin = fp(async (app) => {
  app.addHook("onResponse", async (request: FastifyRequest, reply: FastifyReply) => {
    if (!mutatingMethods.has(request.method) || reply.statusCode >= 400 || request.url.startsWith("/health")) {
      return;
    }

    const user = request.user;
    if (!user?.sub) {
      return;
    }

    const target = targetFromPath(request.url);

    try {
      await prisma.auditLog.create({
        data: {
          userId: user.sub,
          userName: user.name,
          userEmail: user.email,
          userRole: user.role,
          action: actionFromPath(request.method, request.url),
          method: request.method,
          path: request.url.split("?")[0] ?? request.url,
          statusCode: reply.statusCode,
          targetType: target.targetType,
          targetId: target.targetId,
          metadata: {
            roles: user.roles ?? [],
            query: request.url.includes("?") ? request.url.split("?")[1] : null
          }
        }
      });
    } catch (error) {
      app.log.error({ error }, "Falha ao registrar auditoria");
    }
  });
});
