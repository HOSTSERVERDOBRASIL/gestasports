import "dotenv/config";
import { TenantDomainStatus } from "@prisma/client";
import { prisma } from "../src/lib/prisma.js";

async function main() {
  const tenant = await prisma.organizationTenant.findFirst({
    where: { slug: { in: ["flamilha", "flamilia", "gestasports-demo"] } },
    orderBy: { createdAt: "asc" }
  });
  const existingDemoTenant = await prisma.organizationTenant.findUnique({ where: { slug: "gestasports-demo" } });

  if (tenant && existingDemoTenant && tenant.id !== existingDemoTenant.id) {
    throw new Error("Ja existe outro tenant com slug gestasports-demo.");
  }

  if (!tenant) {
    throw new Error("Cliente piloto nao encontrado.");
  }

  await prisma.organizationTenant.update({
    where: { id: tenant.id },
    data: {
      name: "GestaSports Demo",
      slug: "gestasports-demo",
      contactName: "Admin GestaSports",
      contactEmail: "admin@gestasports.com.br",
      defaultSubdomain: "demo.gestasports.com.br",
      databaseName: "gestasports_demo",
      brandName: "GestaSports",
      primaryColor: "#08255b",
      secondaryColor: "#08255b",
      accentColor: "#55ad32"
    }
  });

  await prisma.tenantDomain.upsert({
    where: { hostname: "demo.gestasports.com.br" },
    update: {
      tenantId: tenant.id,
      status: TenantDomainStatus.VERIFIED,
      expectedCname: "gestasports.com.br",
      verifiedAt: new Date(),
      lastCheckedAt: new Date()
    },
    create: {
      tenantId: tenant.id,
      hostname: "demo.gestasports.com.br",
      type: "SUBDOMAIN",
      status: TenantDomainStatus.VERIFIED,
      expectedCname: "gestasports.com.br",
      verifiedAt: new Date(),
      lastCheckedAt: new Date()
    }
  });

  await prisma.tenantDomain.deleteMany({
    where: {
      hostname: {
        in: [
          "flamilha.gestasports.com.br",
          "flamilia.gestasports.com.br",
          "flamilha.localhost",
          "flamilha.clube360.com.br"
        ]
      }
    }
  });

  await prisma.user.updateMany({
    where: { tenantId: tenant.id, email: { in: ["admin@flamilha.com", "admin@flamilia.com"] } },
    data: { email: "admin@gestasports.com.br", name: "Admin GestaSports" }
  });
  await prisma.user.updateMany({
    where: { tenantId: tenant.id, email: { in: ["financeiro@flamilha.com", "financeiro@flamilia.com"] } },
    data: { email: "financeiro@gestasports.com.br", name: "Financeiro GestaSports" }
  });
  await prisma.user.updateMany({
    where: { tenantId: tenant.id, email: { in: ["atleta@flamilha.com", "atleta@flamilia.com"] } },
    data: { email: "atleta@gestasports.com.br", name: "Atleta GestaSports" }
  });

  await prisma.groupSettings.updateMany({
    where: { tenantId: tenant.id },
    data: { groupName: "GestaSports" }
  });
  await prisma.paymentSettings.updateMany({
    where: { tenantId: tenant.id },
    data: { pixKey: "financeiro@gestasports.com.br", pixReceiverName: "GestaSports" }
  });

  const renamed = await prisma.organizationTenant.findUniqueOrThrow({
    where: { id: tenant.id },
    select: {
      name: true,
      slug: true,
      contactEmail: true,
      defaultSubdomain: true,
      databaseName: true,
      brandName: true
    }
  });

  console.log(JSON.stringify(renamed, null, 2));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
