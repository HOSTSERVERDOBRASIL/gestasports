import type { FastifyInstance } from "fastify";
import { buildApp } from "../../../app.js";

export async function createTestApp(): Promise<FastifyInstance> {
  return buildApp();
}

export async function loginAs(app: FastifyInstance, tenantSlug: string, email: string, password: string) {
  const response = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    headers: { host: "localhost", "x-tenant-slug": tenantSlug },
    payload: { email, password }
  });

  return response;
}
