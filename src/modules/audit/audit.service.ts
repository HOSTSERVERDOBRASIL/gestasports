import type { FastifyRequest } from "fastify";
import type { Prisma, UserRole } from "@prisma/client";

type AuditJwtUser = {
  sub?: string;
  name?: string;
  email?: string;
  role?: UserRole;
};

export async function createAuditLog(
  client: { auditLog: { create: (args: { data: Prisma.AuditLogUncheckedCreateInput }) => Promise<unknown> } },
  input: {
    request: FastifyRequest;
    action: string;
    targetType?: string | null;
    targetId?: string | null;
    metadata?: Prisma.InputJsonValue;
    statusCode?: number;
    /**
     * Explicit tenant to attribute the log to. Needed for SUPERADMIN actions: those requests
     * run with the tenant-scoping extension bypassed (the superadmin's own tenantId is null),
     * so without this the log would otherwise be written with no tenant at all instead of the
     * tenant actually being acted upon.
     */
    tenantId?: string | null;
  }
) {
  const user = input.request.user as AuditJwtUser | undefined;

  await client.auditLog.create({
    data: {
      ...(input.tenantId !== undefined ? { tenantId: input.tenantId } : {}),
      userId: user?.sub ?? null,
      userName: user?.name ?? null,
      userEmail: user?.email ?? null,
      userRole: user?.role ?? null,
      action: input.action,
      method: input.request.method,
      path: input.request.url.split("?")[0] ?? input.request.url,
      statusCode: input.statusCode ?? 200,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      ...(input.metadata !== undefined ? { metadata: input.metadata } : {})
    }
  });
}
