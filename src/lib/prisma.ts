import { PrismaClient } from "@prisma/client";
import { getTenantContext, tenantScopedModels } from "../modules/tenancy/tenant-context.js";

const basePrisma = new PrismaClient({
  log: ["warn", "error"]
});

const readOperations = new Set(["findFirst", "findFirstOrThrow", "findMany", "count", "aggregate", "groupBy"]);
const uniqueOperations = new Set(["findUnique", "findUniqueOrThrow", "update", "delete"]);

function withTenantWhere(where: unknown, tenantId: string) {
  if (where && typeof where === "object") {
    return { AND: [where, { tenantId }] };
  }

  return { tenantId };
}

function withTenantUniqueWhere(where: unknown, tenantId: string) {
  if (where && typeof where === "object") {
    return { ...(where as Record<string, unknown>), tenantId };
  }

  return { tenantId };
}

function applyTenantToData(data: unknown, tenantId: string): unknown {
  if (Array.isArray(data)) {
    return data.map((item) => applyTenantToData(item, tenantId));
  }

  if (data && typeof data === "object") {
    return { tenantId, ...(data as Record<string, unknown>) };
  }

  return data;
}

export const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const { tenantId, bypassTenant } = getTenantContext();

        if (!model || !tenantId || bypassTenant || !tenantScopedModels.has(model)) {
          return query(args);
        }

        const scopedArgs = { ...(args as Record<string, unknown>) };

        if (readOperations.has(operation) || operation === "updateMany" || operation === "deleteMany") {
          scopedArgs.where = withTenantWhere(scopedArgs.where, tenantId);
        }

        if (uniqueOperations.has(operation)) {
          scopedArgs.where = withTenantUniqueWhere(scopedArgs.where, tenantId);
        }

        if (operation === "create") {
          scopedArgs.data = applyTenantToData(scopedArgs.data, tenantId);
        }

        if (operation === "createMany") {
          const data = (scopedArgs.data && typeof scopedArgs.data === "object" ? (scopedArgs.data as { data: unknown }).data : undefined) ?? scopedArgs.data;
          scopedArgs.data = { ...(scopedArgs.data as Record<string, unknown>), data: applyTenantToData(data, tenantId) };
        }

        if (operation === "upsert") {
          scopedArgs.where = withTenantUniqueWhere(scopedArgs.where, tenantId);
          scopedArgs.create = applyTenantToData(scopedArgs.create, tenantId);
        }

        return query(scopedArgs);
      }
    }
  }
});
