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
});

declare module "fastify" {
  interface FastifyRequest {
    tenant: OrganizationTenant | null;
  }
}

