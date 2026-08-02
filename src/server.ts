import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ZodError } from "zod";
import { env } from "./config/env.js";
import { healthRoutes } from "./modules/health/health.routes.js";
import { associateRoutes } from "./modules/associates/associates.routes.js";
import { financeRoutes } from "./modules/finance/finance.routes.js";
import { dashboardRoutes } from "./modules/dashboard/dashboard.routes.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { authPlugin } from "./modules/auth/auth.plugin.js";
import { groupRoutes } from "./modules/group/group.routes.js";
import { sportsRoutes } from "./modules/sports/sports.routes.js";
import { galleryRoutes } from "./modules/gallery/gallery.routes.js";
import { archiveRoutes } from "./modules/archive/archive.routes.js";
import { eventRoutes } from "./modules/events/events.routes.js";
import { athleteRoutes } from "./modules/athletes/athletes.routes.js";
import { clubRoutes } from "./modules/clubs/clubs.routes.js";
import { auditPlugin } from "./modules/audit/audit.plugin.js";
import { auditRoutes } from "./modules/audit/audit.routes.js";
import { superadminRoutes } from "./modules/superadmin/superadmin.routes.js";
import { tenantPlugin } from "./modules/tenancy/tenant.plugin.js";
import { tenantRoutes } from "./modules/tenancy/tenant.routes.js";
import { prisma } from "./lib/prisma.js";

const app = Fastify({ logger: env.NODE_ENV !== "production", bodyLimit: 6 * 1024 * 1024 });
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const frontendDistDir = path.join(rootDir, "frontend", "dist");

function normalizeOriginHost(value: string) {
  try {
    return new URL(value).hostname.toLowerCase().replace(/\.$/, "");
  } catch {
    return value
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "")
      .replace(/:\d+$/, "")
      .replace(/\.$/, "");
  }
}

function productionCorsOrigin(origin: string | undefined, callback: (error: Error | null, allow: boolean) => void) {
  if (!origin) {
    return callback(null, true);
  }

  const originHost = normalizeOriginHost(origin);
  const appHost = normalizeOriginHost(env.SAAS_APP_HOST);
  const configuredOrigins = new Set(
    (env.CORS_ORIGINS ?? "")
      .split(",")
      .map((item) => normalizeOriginHost(item))
      .filter(Boolean)
  );
  const allowed =
    originHost === appHost ||
    originHost === `www.${appHost}` ||
    originHost.endsWith(`.${appHost}`) ||
    configuredOrigins.has(originHost);

  return callback(null, allowed);
}

if (env.NODE_ENV === "production") {
  await app.register(cors, { origin: productionCorsOrigin, credentials: true });
} else {
  await app.register(cors, { origin: true, credentials: true });
}
await app.register(tenantPlugin);
await app.register(authPlugin);
await app.register(auditPlugin);

/*
 * No brute-force protection existed anywhere in the app: login, password
 * reset, and invite-registration could be hit as fast as the network
 * allows, with no lockout. The global limit here is generous (it only
 * exists as a backstop against scripted abuse of the whole API); the
 * real protection is the tighter, IP+email-based limits set directly on
 * /auth/login, /auth/password/forgot, /auth/password/reset and
 * /auth/invite-register in auth.routes.ts.
 */
await app.register(rateLimit, {
  global: true,
  max: 300,
  timeWindow: "1 minute"
});

if (fs.existsSync(frontendDistDir)) {
  await app.register(fastifyStatic, {
    root: frontendDistDir
  });
}

await app.register(async (api) => {
  await api.register(healthRoutes);
  await api.register(authRoutes, { prefix: "/api" });
  await api.register(tenantRoutes, { prefix: "/api" });
  await api.register(associateRoutes, { prefix: "/api" });
  await api.register(financeRoutes, { prefix: "/api" });
  await api.register(dashboardRoutes, { prefix: "/api" });
  await api.register(groupRoutes, { prefix: "/api" });
  await api.register(athleteRoutes, { prefix: "/api" });
  await api.register(clubRoutes, { prefix: "/api" });
  await api.register(sportsRoutes, { prefix: "/api" });
  await api.register(eventRoutes, { prefix: "/api" });
  await api.register(galleryRoutes, { prefix: "/api" });
  await api.register(archiveRoutes, { prefix: "/api" });
  await api.register(auditRoutes, { prefix: "/api" });
  await api.register(superadminRoutes, { prefix: "/api" });
});

app.setErrorHandler((error, _request, reply) => {
  if (typeof error === "object" && error !== null && "statusCode" in error && error.statusCode === 413) {
    return reply.status(413).send({
      message: "O arquivo enviado é muito grande. Reduza a imagem e tente novamente."
    });
  }

  if (error instanceof ZodError) {
    return reply.status(400).send({
      message: "Erro de validação",
      issues: error.issues
    });
  }

  app.log.error(error);
  return reply.status(500).send({ message: "Erro interno do servidor" });
});

app.setNotFoundHandler((request, reply) => {
  const isApiRequest = request.url.startsWith("/api") || request.url.startsWith("/health");
  const indexPath = path.join(frontendDistDir, "index.html");

  if (request.method === "GET" && !isApiRequest && fs.existsSync(indexPath)) {
    return reply.type("text/html").send(fs.createReadStream(indexPath));
  }

  return reply.status(404).send({
    message: `Route ${request.method}:${request.url} not found`,
    error: "Not Found",
    statusCode: 404
  });
});

app.addHook("onClose", async () => {
  await prisma.$disconnect();
});

let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  app.log.info(`Recebido ${signal}. Encerrando servidor...`);

  try {
    await app.close();
    process.exit(0);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

async function start() {
  if (env.NODE_ENV === "production") {
    const { spawnSync } = await import("node:child_process");
    console.log("Executando prisma migrate deploy...");
    const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
      stdio: "inherit",
      env: process.env
    });
    if (result.status !== 0) {
      console.error("Falha ao aplicar migrations, status:", result.status);
      process.exit(1);
    }
    console.log("Migrations aplicadas com sucesso.");
  }

  await app.listen({ port: env.PORT, host: "0.0.0.0" });
  console.log(`Servidor iniciado na porta ${env.PORT}`);
}

start().catch((error) => {
  app.log.error(error);
  process.exit(1);
});

