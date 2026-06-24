const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const columns = await prisma.$queryRaw`
    SELECT table_name
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND column_name = 'tenantId'
    ORDER BY table_name
  `;

  const results = [];

  for (const row of columns) {
    const tableName = row.table_name;
    const whereClause = tableName === "User"
      ? `WHERE "tenantId" IS NULL AND "role" <> 'SUPERADMIN'`
      : tableName === "AuditLog"
        ? `WHERE "tenantId" IS NULL AND COALESCE("path", '') NOT LIKE '/api/superadmin%'`
        : `WHERE "tenantId" IS NULL`;
    const countRows = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS count FROM "${tableName}" ${whereClause}`);
    const count = Number(countRows[0]?.count ?? 0);
    if (count > 0) {
      results.push({ tableName, count });
    }
  }

  if (results.length > 0) {
    console.error("Registros operacionais sem tenantId encontrados:");
    for (const result of results) {
      console.error(`- ${result.tableName}: ${result.count}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("Tenant audit passed: nenhum registro com tenantId nulo.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
