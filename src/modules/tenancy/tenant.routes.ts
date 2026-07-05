import type { FastifyInstance } from "fastify";
import { SaaSChargeStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { resolveTenantByHost, resolveTenantBySlug } from "./tenant.plugin.js";
import { isLocalHostname, isPlatformHostname, isTenantSlug, normalizeHostname, tenantPathUrl, tenantPrimaryUrl, tenantSlugFromHostname } from "./tenant-domain.js";
import { getEnabledTenantModuleCodes } from "./tenant-modules.js";

const hexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Informe uma cor hexadecimal valida.");
const menuStyleSchema = z.enum(["brand", "light", "glass"]);
const interfaceEffectsSchema = z.enum(["full", "soft", "minimal"]);

const tenantBrandingSchema = z.object({
  brandName: z.string().trim().min(2).max(80),
  primaryColor: hexColorSchema,
  secondaryColor: hexColorSchema,
  accentColor: hexColorSchema,
  logoUrl: z.string().max(2_000_000).nullable().optional(),
  menuStyle: menuStyleSchema.default("brand"),
  interfaceEffects: interfaceEffectsSchema.default("soft")
});

function tenantBrandingPayload(tenant: {
  id: string;
  name: string;
  brandName: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoUrl: string | null;
  menuStyle: string;
  interfaceEffects: string;
}) {
  return {
    id: tenant.id,
    name: tenant.name,
    brandName: tenant.brandName ?? tenant.name,
    primaryColor: tenant.primaryColor,
    secondaryColor: tenant.secondaryColor,
    accentColor: tenant.accentColor,
    logoUrl: tenant.logoUrl,
    menuStyle: menuStyleSchema.safeParse(tenant.menuStyle).success ? tenant.menuStyle : "brand",
    interfaceEffects: interfaceEffectsSchema.safeParse(tenant.interfaceEffects).success ? tenant.interfaceEffects : "soft"
  };
}

function requestHost(request: { headers: Record<string, string | string[] | undefined> }) {
  const forwardedHost = request.headers["x-forwarded-host"];
  const host = Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost ?? request.headers.host;
  return typeof host === "string" ? normalizeHostname(host.split(",")[0]) : "";
}

function requestTenantSlug(request: { headers: Record<string, string | string[] | undefined> }) {
  const rawSlug = request.headers["x-tenant-slug"];
  const slug = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug;
  return typeof slug === "string" && isTenantSlug(slug) ? slug : "";
}

export async function tenantRoutes(app: FastifyInstance) {
  app.get("/tenant/current", async (request, reply) => {
    const hostname = requestHost(request);
    const hostTenantSlug = tenantSlugFromHostname(hostname);
    const pathTenantSlug = requestTenantSlug(request);
    const canUsePathFallback = isLocalHostname(hostname) || isPlatformHostname(hostname);
    const tenant =
      (await resolveTenantByHost(hostname)) ??
      (await resolveTenantBySlug(hostTenantSlug)) ??
      (canUsePathFallback ? await resolveTenantBySlug(pathTenantSlug) : null);

    if (!tenant) {
      return reply.status(404).send({
        hostname,
        platformName: "GestaSports",
        publicPath: pathTenantSlug ? `/${pathTenantSlug}` : null,
        message: "Cliente não encontrado para este domínio"
      });
    }

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      hostname,
      platformName: "GestaSports",
      defaultSubdomain: tenant.defaultSubdomain,
      primaryUrl: tenantPrimaryUrl(tenant.slug),
      publicPath: tenantPathUrl(tenant.slug),
      brandName: tenant.brandName ?? tenant.name,
      primaryColor: tenant.primaryColor,
      secondaryColor: tenant.secondaryColor,
      accentColor: tenant.accentColor,
      logoUrl: tenant.logoUrl,
      organizationType: tenant.organizationType,
      mainClubName: tenant.mainClubName,
      mainClubLogoUrl: tenant.mainClubLogoUrl,
      mainClubPrimaryColor: tenant.mainClubPrimaryColor,
      mainClubSecondaryColor: tenant.mainClubSecondaryColor,
      activeCategories: tenant.activeCategories,
      usesFinance: tenant.usesFinance,
      usesAssociates: tenant.usesAssociates,
      usesExternalGames: tenant.usesExternalGames,
      usesCompetitions: tenant.usesCompetitions,
      usesInternalRanking: tenant.usesInternalRanking,
      menuStyle: menuStyleSchema.safeParse(tenant.menuStyle).success ? tenant.menuStyle : "brand",
      interfaceEffects: interfaceEffectsSchema.safeParse(tenant.interfaceEffects).success ? tenant.interfaceEffects : "soft",
      enabledModules: await getEnabledTenantModuleCodes(tenant.id)
    };
  });

  app.get("/tenant/billing-status", { preHandler: app.authenticate }, async (request, reply) => {
    const tenantId = request.user.tenantId ?? request.tenant?.id;

    if (!tenantId) {
      return reply.status(404).send({ message: "Cliente não encontrado para este domínio" });
    }

    const tenant = await prisma.organizationTenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        status: true,
        suspendedReason: true,
        planName: true,
        monthlyFeeCents: true,
        charges: {
          where: {
            status: { in: [SaaSChargeStatus.PENDING, SaaSChargeStatus.OVERDUE] }
          },
          orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
          take: 12
        }
      }
    });

    return {
      id: tenant.id,
      name: tenant.name,
      status: tenant.status,
      suspendedReason: tenant.suspendedReason,
      planName: tenant.planName,
      monthlyFeeCents: tenant.monthlyFeeCents,
      openAmountCents: tenant.charges.reduce((total, charge) => total + charge.amountCents, 0),
      charges: tenant.charges.map((charge) => ({
        id: charge.id,
        type: charge.type,
        description: charge.description,
        amountCents: charge.amountCents,
        dueDate: charge.dueDate.toISOString(),
        status: charge.status
      }))
    };
  });

  app.get("/tenant/branding", { preHandler: app.authorize(["ADMIN"]) }, async (request, reply) => {
    const tenantId = request.user.tenantId ?? request.tenant?.id;

    if (!tenantId) {
      return reply.status(404).send({ message: "Cliente não encontrado para este domínio" });
    }

    const tenant = await prisma.organizationTenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        brandName: true,
        primaryColor: true,
        secondaryColor: true,
        accentColor: true,
        logoUrl: true,
        menuStyle: true,
        interfaceEffects: true
      }
    });

    return tenantBrandingPayload(tenant);
  });

  app.patch("/tenant/branding", { preHandler: app.authorize(["ADMIN"]) }, async (request, reply) => {
    const tenantId = request.user.tenantId ?? request.tenant?.id;

    if (!tenantId) {
      return reply.status(404).send({ message: "Cliente não encontrado para este domínio" });
    }

    const payload = tenantBrandingSchema.parse(request.body);
    const tenant = await prisma.organizationTenant.update({
      where: { id: tenantId },
      data: {
        brandName: payload.brandName,
        primaryColor: payload.primaryColor,
        secondaryColor: payload.secondaryColor,
        accentColor: payload.accentColor,
        logoUrl: payload.logoUrl || null,
        menuStyle: payload.menuStyle,
        interfaceEffects: payload.interfaceEffects
      },
      select: {
        id: true,
        name: true,
        brandName: true,
        primaryColor: true,
        secondaryColor: true,
        accentColor: true,
        logoUrl: true,
        menuStyle: true,
        interfaceEffects: true
      }
    });

    return tenantBrandingPayload(tenant);
  });
}

