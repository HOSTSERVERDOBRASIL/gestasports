import type { FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createTestApp, loginAs } from "./helpers/app.js";
import { createTestTenant, createTestUser, deleteTestTenant } from "./helpers/db.js";
import { prisma } from "../../lib/prisma.js";

describe("GET /api/sports/games tenant isolation", () => {
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

  it("never returns games belonging to another club, even with a valid token", async () => {
    const tenantA = await createTestTenant({ name: "Clube A" });
    const tenantB = await createTestTenant({ name: "Clube B" });
    tenantIds.push(tenantA.id, tenantB.id);

    const { user: userA, password: passwordA } = await createTestUser({ tenantId: tenantA.id, role: "ADMIN" });
    await createTestUser({ tenantId: tenantB.id, role: "ADMIN" });

    await prisma.game.create({
      data: { tenantId: tenantA.id, type: "INTERNAL", date: new Date("2026-06-01T18:00:00Z"), location: "Campo do Clube A" }
    });
    await prisma.game.create({
      data: { tenantId: tenantB.id, type: "INTERNAL", date: new Date("2026-06-02T18:00:00Z"), location: "Campo do Clube B" }
    });

    const loginResponse = await loginAs(app, tenantA.slug, userA.email, passwordA);
    const { token } = loginResponse.json();

    const response = await app.inject({
      method: "GET",
      url: "/api/sports/games",
      headers: { host: "localhost", "x-tenant-slug": tenantA.slug, authorization: `Bearer ${token}` }
    });

    expect(response.statusCode).toBe(200);
    const games = response.json();
    expect(games).toHaveLength(1);
    expect(games[0].location).toBe("Campo do Clube A");
    expect(games.every((game: { tenantId: string }) => game.tenantId === tenantA.id)).toBe(true);
  });
});
