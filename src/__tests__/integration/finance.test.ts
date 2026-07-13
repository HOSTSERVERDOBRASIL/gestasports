import type { FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createTestApp, loginAs } from "./helpers/app.js";
import { createTestTenant, createTestUser, deleteTestTenant } from "./helpers/db.js";
import { prisma } from "../../lib/prisma.js";

describe("POST /api/finance/monthly-fees/generate", () => {
  let app: FastifyInstance;
  const tenantIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterEach(async () => {
    await Promise.all(tenantIds.splice(0).map((id) => deleteTestTenant(id)));
  });

  afterAll(async () => {
    await app.close();
  });

  it("creates one payment per active associate and does not duplicate on a second call", async () => {
    const tenant = await createTestTenant();
    tenantIds.push(tenant.id);
    const { user, password } = await createTestUser({ tenantId: tenant.id, role: "ADMIN" });

    await prisma.associate.createMany({
      data: [
        { tenantId: tenant.id, name: "Associado Um", monthlyFeeCents: 6000, status: "ACTIVE" },
        { tenantId: tenant.id, name: "Associado Dois", monthlyFeeCents: 8000, status: "ACTIVE" },
        { tenantId: tenant.id, name: "Associado Inativo", monthlyFeeCents: 6000, status: "INACTIVE" }
      ]
    });

    const loginResponse = await loginAs(app, tenant.slug, user.email, password);
    const { token } = loginResponse.json();

    const firstRun = await app.inject({
      method: "POST",
      url: "/api/finance/monthly-fees/generate?month=6&year=2026",
      headers: { host: "localhost", "x-tenant-slug": tenant.slug, authorization: `Bearer ${token}` }
    });

    expect(firstRun.statusCode).toBe(200);
    const firstBody = firstRun.json();
    expect(firstBody.created).toBe(2);
    expect(firstBody.eligibleAssociates).toBe(2);

    const secondRun = await app.inject({
      method: "POST",
      url: "/api/finance/monthly-fees/generate?month=6&year=2026",
      headers: { host: "localhost", "x-tenant-slug": tenant.slug, authorization: `Bearer ${token}` }
    });

    expect(secondRun.statusCode).toBe(200);
    expect(secondRun.json().created).toBe(0);

    const payments = await prisma.payment.findMany({ where: { month: 6, year: 2026 } });
    expect(payments).toHaveLength(2);
  });
});
