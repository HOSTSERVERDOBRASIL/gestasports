import "dotenv/config";
import { PrismaClient, TenantDomainStatus, TenantProvisioningStatus, TenantStatus, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const initialPassword = process.env.SUPERADMIN_INITIAL_PASSWORD;
  if (!initialPassword || initialPassword.length < 10 || !/[a-z]/.test(initialPassword) || !/[A-Z]/.test(initialPassword) || !/[0-9]/.test(initialPassword)) {
    throw new Error("Defina SUPERADMIN_INITIAL_PASSWORD com pelo menos 10 caracteres, letra maiúscula, letra minúscula e número.");
  }

  const passwordHash = await bcrypt.hash(initialPassword, 10);

  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: null, email: "superadmin@gestasports.com" } },
    update: {
      name: "Superadmin",
      role: UserRole.SUPERADMIN,
      passwordHash
    },
    create: {
      name: "Superadmin",
      email: "superadmin@gestasports.com",
      role: UserRole.SUPERADMIN,
      passwordHash
    }
  });

  const tenant = await prisma.organizationTenant.upsert({
    where: { slug: "gestasports-demo" },
    update: {
      name: "GestaSports Demo",
      status: TenantStatus.ACTIVE,
      planName: "Cliente piloto",
      defaultSubdomain: "demo.gestasports.com.br",
      databaseName: "gestasports_demo",
      databaseUrl: process.env.DATABASE_URL,
      provisioningStatus: TenantProvisioningStatus.READY,
      provisionedAt: new Date(),
      brandName: "GestaSports",
      primaryColor: "#08255b",
      secondaryColor: "#08255b",
      accentColor: "#55ad32",
      notes: "Cliente piloto usado para validar o SaaS GestaSports antes de novos clientes.",
      activatedAt: new Date()
    },
    create: {
      name: "GestaSports Demo",
      slug: "gestasports-demo",
      contactName: "Admin GestaSports",
      contactEmail: "admin@gestasports.com.br",
      status: TenantStatus.ACTIVE,
      planName: "Cliente piloto",
      monthlyFeeCents: 0,
      implementationFeeCents: 0,
      monthlyDueDay: 10,
      defaultSubdomain: "demo.gestasports.com.br",
      databaseName: "gestasports_demo",
      databaseUrl: process.env.DATABASE_URL,
      provisioningStatus: TenantProvisioningStatus.READY,
      provisionedAt: new Date(),
      brandName: "GestaSports",
      primaryColor: "#08255b",
      secondaryColor: "#08255b",
      accentColor: "#55ad32",
      notes: "Cliente piloto usado para validar o SaaS GestaSports antes de novos clientes.",
      activatedAt: new Date()
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
    where: { hostname: { in: ["flamilha.localhost", "flamilha.clube360.com.br", "flamilha.gestasports.com.br", "flamilia.gestasports.com.br"] } }
  });

  console.log("Superadmin e cliente piloto GestaSports garantidos.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
