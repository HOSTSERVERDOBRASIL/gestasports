import { prisma } from "../src/lib/prisma.js";
import { ensureTenantWorkspace } from "../src/modules/superadmin/superadmin.routes.js";
import { provisionPhysicalTenantDatabase } from "../src/modules/tenancy/tenant-provisioning.js";

const slug = process.argv[2]?.trim().toLowerCase();
const appHost = process.env.SAAS_APP_HOST?.trim() || "gestasports.com.br";

async function main() {
  if (!slug) {
    throw new Error("Informe o slug: npm run tenant:provision -- gestasports-demo");
  }

  const tenant = await prisma.organizationTenant.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, databaseName: true, databaseUrl: true }
  });

  if (!tenant) {
    throw new Error(`Tenant não encontrado para o slug "${slug}".`);
  }

  const physicalDatabase = tenant.databaseUrl
    ? { databaseUrl: tenant.databaseUrl, skippedReason: null, createdOrMigrated: false }
    : await provisionPhysicalTenantDatabase(tenant.databaseName);

  await ensureTenantWorkspace(tenant.id, {
    physicalDatabaseUrl: physicalDatabase.databaseUrl,
    requirePhysicalDatabase: true,
    provisioningSkippedReason: physicalDatabase.skippedReason
  });

  console.log(`Tenant provisionado: ${tenant.name}`);
  console.log(`Subdominio: ${tenant.slug}.${appHost}`);
  console.log(`Subpasta: https://${appHost}/${tenant.slug}`);
  console.log(`Banco: ${tenant.databaseName}${physicalDatabase.databaseUrl ? " criado/migrado" : " reservado"}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
