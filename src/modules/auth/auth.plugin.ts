import fp from "fastify-plugin";
import fastifyJwt from "@fastify/jwt";
import type { FastifyReply, FastifyRequest } from "fastify";
import { TenantModuleCode, type UserRole } from "@prisma/client";
import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import { tenantContext } from "../tenancy/tenant-context.js";
import { getEnabledTenantModuleCodes } from "../tenancy/tenant-modules.js";

type JwtUser = {
  sub: string;
  tenantId: string | null;
  role: UserRole;
  roles: UserRole[];
  name: string;
  email: string;
  jti: string;
};

async function isTokenRevoked(jti: string) {
  // Lazily sweep expired rows instead of running a scheduled job — cheap since revocations are
  // rare (only explicit logouts) and this keeps the table from growing unbounded.
  if (Math.random() < 0.01) {
    await prisma.revokedToken.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  }

  const revoked = await prisma.revokedToken.findUnique({ where: { jti } });
  return Boolean(revoked);
}

const tenantAccessAllowList = new Set([
  "/api/auth/me",
  "/api/tenant/current",
  "/api/tenant/billing-status"
]);

function effectiveRolesFor(user: JwtUser) {
  return user.roles && user.roles.length > 0 ? user.roles : [user.role];
}

// request.tenant comes from the (attacker-controllable) Host/X-Tenant-Slug header and must
// never be trusted for data scoping once we have a verified JWT — always scope by the token's tenantId.
//
// This must run as its own preHandler, separate from the one that calls request.jwtVerify(),
// and must use enterWith (never a mutate-existing-store setter). Confirmed empirically: the
// AsyncLocalStorage store entered by tenant.plugin.ts's onRequest hook does not survive a
// request.jwtVerify() call — reads taken later in that SAME hook function still show the
// right value, but it never reaches the route handler. Splitting jwtVerify() and this call
// into two separate preHandler hooks (see authPlugin below) avoids whatever internally
// resets continuity, and reliably carries the context into the handler.
async function applyAuthenticatedTenant(request: FastifyRequest) {
  const user = request.user as JwtUser | undefined;
  if (!user) {
    return;
  }

  const bypassTenant = effectiveRolesFor(user).includes("SUPERADMIN");
  tenantContext.enterWith({ tenantId: user.tenantId, bypassTenant });
}

// Reject requests where the Host-resolved tenant differs from the token's own tenant, so a
// valid user from tenant A can't act on tenant B's data by spoofing the Host header.
function isTenantMismatched(request: FastifyRequest, user: JwtUser) {
  if (effectiveRolesFor(user).includes("SUPERADMIN")) {
    return false;
  }

  return Boolean(request.tenant) && request.tenant?.id !== user.tenantId;
}

function isTenantBlocked(request: FastifyRequest, user: JwtUser) {
  if (effectiveRolesFor(user).includes("SUPERADMIN")) {
    return false;
  }

  if (!request.tenant || request.tenant.status === "ACTIVE" || request.tenant.status === "TRIAL" || request.tenant.status === "IMPLEMENTATION") {
    return false;
  }

  return !tenantAccessAllowList.has(request.url.split("?")[0] ?? request.url);
}

function blockedTenantPayload(request: FastifyRequest) {
  const tenant = request.tenant;

  return {
    code: "TENANT_ACCESS_BLOCKED",
    message: tenant?.status === "CANCELED" ? "Este ambiente foi cancelado pela GestaSports." : "Este ambiente está suspenso por pendência comercial.",
    tenant: tenant ?
       {
          id: tenant.id,
          name: tenant.name,
          status: tenant.status,
          suspendedReason: tenant.suspendedReason
        }
      : null
  };
}

function requestPath(request: FastifyRequest) {
  return request.url.split("?")[0] ?? request.url;
}

function isSportsDirectorPath(path: string) {
  return [
    "/api/dashboard",
    "/api/sports",
    "/api/clubs",
    "/api/teams",
    "/api/competitions",
    "/api/game-callups",
    "/api/athletes",
    "/api/events",
    "/api/gallery"
  ].some((prefix) => path.startsWith(prefix));
}

function moduleForRequestPath(path: string): TenantModuleCode | undefined {
  if (!path.startsWith("/api/")) return undefined;
  if (path.startsWith("/api/superadmin")) return undefined;
  if (path === "/api/auth/me" || path === "/api/auth/reauth") return undefined;
  if (path.startsWith("/api/auth/users")) return TenantModuleCode.SETTINGS;
  if (path.startsWith("/api/tenant/branding")) return TenantModuleCode.SETTINGS;
  if (path.startsWith("/api/tenant/")) return undefined;
  if (path.startsWith("/api/dashboard")) return undefined;
  if (path.startsWith("/api/associates") || path.startsWith("/api/board-roles") || path.startsWith("/api/group/join-requests") || path.startsWith("/api/group/my-join-requests")) return TenantModuleCode.ASSOCIATES;
  if (path.startsWith("/api/group/settings")) return TenantModuleCode.SETTINGS;
  if (path.startsWith("/api/athletes/lineup-draft")) return TenantModuleCode.LINEUPS;
  if (path.startsWith("/api/athlete/me/payments")) return TenantModuleCode.FINANCE;
  if (path.startsWith("/api/athlete/me/lineups")) return TenantModuleCode.ATTENDANCE;
  if (path.startsWith("/api/athletes") || path.startsWith("/api/athlete")) return TenantModuleCode.ATHLETES;
  if (path.startsWith("/api/clubs")) return TenantModuleCode.CLUBS;
  if (path.startsWith("/api/teams")) return TenantModuleCode.TEAMS;
  if (path.startsWith("/api/competitions")) return TenantModuleCode.COMPETITIONS;
  if (path.startsWith("/api/game-callups")) return TenantModuleCode.CALLUPS;
  if (path.startsWith("/api/sports/fields")) return TenantModuleCode.CLUBS;
  if (path.includes("/lineups") || path.includes("/tactical-plans")) return TenantModuleCode.LINEUPS;
  if (path.startsWith("/api/sports/stats") || path.startsWith("/api/sports/suspensions")) return TenantModuleCode.RANKINGS;
  if (path.startsWith("/api/sports/games")) return TenantModuleCode.GAMES;
  if (path.startsWith("/api/events")) return TenantModuleCode.EVENTS;
  if (path.startsWith("/api/gallery")) return TenantModuleCode.GALLERY;
  if (path.startsWith("/api/archive-items")) return undefined;
  if (path.startsWith("/api/reports/historical-archive")) return TenantModuleCode.DOCUMENTS;
  if (path.startsWith("/api/reports") || path.startsWith("/api/finance/reports")) return TenantModuleCode.REPORTS;
  if (path.startsWith("/api/president-terms")) return TenantModuleCode.ASSOCIATES;
  if (path.startsWith("/api/finance") || path.startsWith("/api/goalkeepers")) return TenantModuleCode.FINANCE;
  if (path.startsWith("/api/audit-logs")) return TenantModuleCode.SETTINGS;
  return undefined;
}

function moduleBlockedPayload(moduleCode: TenantModuleCode) {
  return {
    code: "TENANT_MODULE_DISABLED",
    module: moduleCode,
    message: "Este modulo nao esta habilitado para o plano deste clube."
  };
}

async function ensureModuleAccess(request: FastifyRequest, reply: FastifyReply, user: JwtUser) {
  if (effectiveRolesFor(user).includes("SUPERADMIN")) {
    return true;
  }

  const moduleCode = moduleForRequestPath(requestPath(request));
  if (!moduleCode) {
    return true;
  }

  const tenantId = request.tenant?.id ?? user.tenantId;
  if (!tenantId) {
    reply.status(403).send(moduleBlockedPayload(moduleCode));
    return false;
  }

  const enabledModules = await getEnabledTenantModuleCodes(tenantId);
  if (!enabledModules.includes(moduleCode)) {
    reply.status(403).send(moduleBlockedPayload(moduleCode));
    return false;
  }

  return true;
}

export const authPlugin = fp(async (app) => {
  await app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: "12h" }
  });

  async function verifyAndCheckAccess(roles: UserRole[] | null, request: FastifyRequest, reply: FastifyReply) {
    let user: JwtUser;
    try {
      await request.jwtVerify();
      user = request.user as JwtUser;
    } catch {
      reply.status(401).send({ message: "Não autorizado" });
      return;
    }

    if (await isTokenRevoked(user.jti)) {
      reply.status(401).send({ message: "Sessão encerrada. Faça login novamente." });
      return;
    }

    if (roles) {
      const effectiveRoles = effectiveRolesFor(user);
      const directlyAuthorized = roles.some((role) => effectiveRoles.includes(role));
      const sportsDirectorAuthorized =
        effectiveRoles.includes("SPORTS_DIRECTOR") &&
        roles.includes("ADMIN") &&
        isSportsDirectorPath(requestPath(request));

      if (!directlyAuthorized && !sportsDirectorAuthorized) {
        reply.status(403).send({ message: "Sem permissão para esta ação" });
        return;
      }
    }

    if (isTenantMismatched(request, user)) {
      reply.status(403).send({ message: "Token não pertence a este ambiente" });
      return;
    }

    if (isTenantBlocked(request, user)) {
      reply.status(402).send(blockedTenantPayload(request));
      return;
    }

    if (!(await ensureModuleAccess(request, reply, user))) {
      return;
    }
  }

  // Each of these is an array of two preHandlers, not a single function — see the comment on
  // applyAuthenticatedTenant for why the tenant-context step must run as its own hook,
  // separate from the one that calls request.jwtVerify(). If either hook already sent a
  // reply (auth/role/tenant failure), Fastify skips the remaining preHandlers automatically.
  app.decorate("authenticate", [
    async (request: FastifyRequest, reply: FastifyReply) => verifyAndCheckAccess(null, request, reply),
    applyAuthenticatedTenant
  ]);

  app.decorate("authorize", (roles: UserRole[]) => [
    async (request: FastifyRequest, reply: FastifyReply) => verifyAndCheckAccess(roles, request, reply),
    applyAuthenticatedTenant
  ]);
});

