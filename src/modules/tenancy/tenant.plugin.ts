import fp from "fastify-plugin";
import type { FastifyRequest } from "fastify";
import { TenantDomainStatus, type OrganizationTenant } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { tenantContext } from "./tenant-context.js";
import { isLocalHostname, isPlatformHostname, isTenantSlug, normalizeHostname, tenantSlugFromHostname } from "./tenant-domain.js";

function requestHost(request: FastifyRequest) {
  const forwardedHost = request.headers["x-forwarded-host"];
  const host = Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost ?? request.headers.host;
  return typeof host === "string" ? normalizeHostname(host.split(",")[0]) : "";
}

function requestTenantSlug(request: FastifyRequest) {
  const rawSlug = request.headers["x-tenant-slug"];
  const slug = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug;
  return typeof slug === "string" && isTenantSlug(slug) ? slug : "";
}

export async function resolveTenantBySlug(slug: string) {
  if (!slug) {
    return null;
  }

  return prisma.organizationTenant.findFirst({
    where: {
      slug,
      status: { not: "CANCELED" }
    }
  });
}

export async function resolveTenantByHost(hostname: string) {
  if (isLocalHostname(hostname) || isPlatformHostname(hostname)) {
    return null;
  }

  const domain = await prisma.tenantDomain.findUnique({
    where: { hostname },
    include: { tenant: true }
  });

  if (domain?.status === TenantDomainStatus.VERIFIED) {
    return domain.tenant;
  }

  return prisma.organizationTenant.findFirst({
    where: {
      defaultSubdomain: hostname,
      status: { not: "CANCELED" }
    }
  });
}

export const tenantPlugin = fp(async (app) => {
  app.addHook("onRequest", async (request) => {
    const hostname = requestHost(request);
    const hostTenantSlug = tenantSlugFromHostname(hostname);
    const pathTenantSlug = requestTenantSlug(request);
    const canUsePathFallback = isLocalHostname(hostname) || isPlatformHostname(hostname);
    const tenant =
      (await resolveTenantByHost(hostname)) ??
      (await resolveTenantBySlug(hostTenantSlug)) ??
      (canUsePathFallback ? await resolveTenantBySlug(pathTenantSlug) : null);

    request.tenant = tenant;
    tenantContext.enterWith({ tenantId: tenant?.id || null, bypassTenant: false });
  });

  // Body parsing (which runs after onRequest, before preHandler) does not reliably preserve
  // AsyncLocalStorage continuity in Fastify — confirmed empirically, and already worked around
  // ad hoc for the PIX webhook route (see finance.routes.ts) and for authenticated routes (see
  // applyAuthenticatedTenant in auth.plugin.ts). Any OTHER route with no preHandler of its own
  // to re-enter the context — e.g. /auth/login, which has none — would otherwise run its handler
  // with whatever tenant context happened to be left over from a PREVIOUS, unrelated request
  // (reproduced: a login for tenant A immediately followed by a login attempt for tenant B ran
  // tenant B's request under tenant A's tenantId). Re-entering here, globally, from
  // `request.tenant` (a plain property set above, unaffected by the AsyncLocalStorage issue)
  // guarantees every request starts its handler with a correct baseline; authenticate/authorize's
  // own preHandler then overrides it with the JWT's own tenantId for protected routes.
  app.addHook("preHandler", async (request) => {
    tenantContext.enterWith({ tenantId: request.tenant?.id ?? null, bypassTenant: false });
  });
});

declare module "fastify" {
  interface FastifyRequest {
    tenant: OrganizationTenant | null;
  }
}

