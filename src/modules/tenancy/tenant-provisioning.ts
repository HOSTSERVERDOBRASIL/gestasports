import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

export type PhysicalTenantProvisioningResult = {
  databaseUrl: string | null;
  skippedReason: string | null;
  createdOrMigrated: boolean;
};

export function databaseUrlForTenant(baseUrl: string, databaseName: string) {
  const parsed = new URL(baseUrl);
  parsed.pathname = `/${databaseName}`;
  return parsed.toString();
}

function quoteIdentifier(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function assertSafeDatabaseName(databaseName: string) {
  if (!/^[a-z][a-z0-9_]{1,62}$/.test(databaseName)) {
    throw new Error(`Nome de banco invalido para tenant: ${databaseName}`);
  }
}

export async function provisionPhysicalTenantDatabase(databaseName: string): Promise<PhysicalTenantProvisioningResult> {
  assertSafeDatabaseName(databaseName);

  const adminUrl = process.env.DATABASE_ADMIN_URL?.trim();
  if (!adminUrl) {
    return {
      databaseUrl: null,
      skippedReason: "DATABASE_ADMIN_URL nao configurado. O banco independente ficou pendente de provisionamento.",
      createdOrMigrated: false
    };
  }

  const adminPrisma = new PrismaClient({
    datasources: { db: { url: adminUrl } }
  });

  try {
    const existing = await adminPrisma.$queryRaw<Array<{ datname: string }>>`
      SELECT datname FROM pg_database WHERE datname = ${databaseName}
    `;

    if (existing.length === 0) {
      await adminPrisma.$executeRawUnsafe(`CREATE DATABASE ${quoteIdentifier(databaseName)}`);
    }
  } finally {
    await adminPrisma.$disconnect();
  }

  const tenantDatabaseUrl = process.env.TENANT_DATABASE_URL_TEMPLATE?.replace("{databaseName}", databaseName) ?? databaseUrlForTenant(adminUrl, databaseName);
  const migrate = spawnSync("npx", ["prisma", "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: tenantDatabaseUrl },
    stdio: "inherit",
    shell: process.platform === "win32"
  });

  if (migrate.status !== 0) {
    throw new Error(`Falha ao aplicar migrations no banco ${databaseName}.`);
  }

  return {
    databaseUrl: tenantDatabaseUrl,
    skippedReason: null,
    createdOrMigrated: true
  };
}
