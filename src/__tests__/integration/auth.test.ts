import type { FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createTestApp, loginAs } from "./helpers/app.js";
import { createTestTenant, createTestUser, deleteTestTenant } from "./helpers/db.js";

describe("POST /api/auth/login", () => {
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

  it("returns a JWT for valid credentials", async () => {
    const tenant = await createTestTenant();
    tenantIds.push(tenant.id);
    const { user, password } = await createTestUser({ tenantId: tenant.id, role: "ADMIN" });

    const response = await loginAs(app, tenant.slug, user.email, password);

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(typeof body.token).toBe("string");
    expect(body.user.email).toBe(user.email);
    expect(body.user.tenantId).toBe(tenant.id);
  });

  it("returns 401 for an invalid password", async () => {
    const tenant = await createTestTenant();
    tenantIds.push(tenant.id);
    const { user } = await createTestUser({ tenantId: tenant.id, role: "ADMIN" });

    const response = await loginAs(app, tenant.slug, user.email, "wrong-password");

    expect(response.statusCode).toBe(401);
  });

  it("returns 401 for a non-existent email", async () => {
    const tenant = await createTestTenant();
    tenantIds.push(tenant.id);

    const response = await loginAs(app, tenant.slug, "nobody@teste.local", "whatever");

    expect(response.statusCode).toBe(401);
  });

  it("locks the account for 15 minutes after 5 failed attempts, even with the correct password on the 6th try", async () => {
    const tenant = await createTestTenant();
    tenantIds.push(tenant.id);
    const { user, password } = await createTestUser({ tenantId: tenant.id, role: "ADMIN" });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await loginAs(app, tenant.slug, user.email, "wrong-password");
      expect(response.statusCode).toBe(401);
    }

    const lockedOutResponse = await loginAs(app, tenant.slug, user.email, password);
    expect(lockedOutResponse.statusCode).toBe(429);
  });

  it("rejects a token whose tenant doesn't match the one resolved from the request (spoofed X-Tenant-Slug)", async () => {
    const tenantA = await createTestTenant();
    const tenantB = await createTestTenant();
    tenantIds.push(tenantA.id, tenantB.id);
    const { user, password } = await createTestUser({ tenantId: tenantA.id, role: "ADMIN" });

    const loginResponse = await loginAs(app, tenantA.slug, user.email, password);
    const { token } = loginResponse.json();

    const spoofedResponse = await app.inject({
      method: "GET",
      url: "/api/auth/users",
      headers: { host: "localhost", "x-tenant-slug": tenantB.slug, authorization: `Bearer ${token}` }
    });

    expect(spoofedResponse.statusCode).toBe(403);
  });
});
