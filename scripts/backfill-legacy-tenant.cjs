const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const slug = process.argv[2] || process.env.DEFAULT_TENANT_SLUG || "gestasports-demo";

const skippedTables = new Set([
  "OrganizationTenant",
  "TenantDomain",
  "TenantModule",
  "SaaSCharge"
]);

async function main() {
  const tenant = await prisma.organizationTenant.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true }
  });

  if (!tenant) {
    throw new Error(`Tenant nao encontrado para slug "${slug}".`);
  }

  const columns = await prisma.$queryRaw`
    SELECT table_name
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND column_name = 'tenantId'
    ORDER BY table_name
  `;

  const updated = [];

  for (const row of columns) {
    const tableName = row.table_name;
    if (skippedTables.has(tableName)) {
      continue;
    }

    const whereClause = tableName === "User"
      ? `"tenantId" IS NULL AND "role" <> 'SUPERADMIN'`
      : tableName === "AuditLog"
        ? `"tenantId" IS NULL AND COALESCE("path", '') NOT LIKE '/api/superadmin%'`
        : `"tenantId" IS NULL`;

    const result = await prisma.$executeRawUnsafe(
      `UPDATE "${tableName}" SET "tenantId" = $1 WHERE ${whereClause}`,
      tenant.id
    );

    if (result > 0) {
      updated.push({ tableName, count: result });
    }
  }

  if (updated.length === 0) {
    console.log(`Nenhum registro legado sem tenantId para ${tenant.slug}.`);
    return;
  }

  console.log(`Backfill aplicado para ${tenant.name} (${tenant.slug}):`);
  for (const item of updated) {
    console.log(`- ${item.tableName}: ${item.count}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
