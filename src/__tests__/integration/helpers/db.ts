import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";

export async function createTestTenant(overrides: { name?: string } = {}) {
  const suffix = crypto.randomUUID().slice(0, 8);
  return prisma.organizationTenant.create({
    data: {
      name: overrides.name ?? `Clube Teste ${suffix}`,
      slug: `clube-teste-${suffix}`,
      defaultSubdomain: `clube-teste-${suffix}`,
      databaseName: `clube_teste_${suffix}`,
      status: "ACTIVE"
    }
  });
}

export async function createTestUser(input: { tenantId: string; role: UserRole; email?: string; password?: string; name?: string }) {
  const suffix = crypto.randomUUID().slice(0, 8);
  const password = input.password ?? "Sup3rSecret!";
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      tenantId: input.tenantId,
      name: input.name ?? `Usuario Teste ${suffix}`,
      email: input.email ?? `usuario-${suffix}@teste.local`,
      passwordHash,
      role: input.role,
      emailVerifiedAt: new Date()
    }
  });

  return { user, password };
}

export async function deleteTestTenant(tenantId: string) {
  await prisma.organizationTenant.delete({ where: { id: tenantId } }).catch(() => undefined);
}
