import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  SaaSChargeStatus,
  SaaSChargeType,
  TenantDomainStatus,
  TenantModuleCode,
  TenantProvisioningStatus,
  TenantStatus,
  UserRole
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma.js";
import {
  isPlatformSubdomain,
  isProtectedPlatformDomain,
  isValidHostname,
  normalizeHostname,
  platformHostname,
  tenantDefaults,
  tenantPathUrl,
  tenantPrimaryUrl
} from "../tenancy/tenant-domain.js";
import { defaultTenantModuleCodes, ensureTenantModules, tenantModuleCatalog } from "../tenancy/tenant-modules.js";
import { createAuditLog } from "../audit/audit.service.js";
import { provisionPhysicalTenantDatabase, type PhysicalTenantProvisioningResult } from "../tenancy/tenant-provisioning.js";

const tenantParamsSchema = z.object({ tenantId: z.string().cuid() });
const domainParamsSchema = z.object({ domainId: z.string().cuid() });
const chargeParamsSchema = z.object({ chargeId: z.string().cuid() });
const planParamsSchema = z.object({ planId: z.string().cuid().or(z.string().startsWith("plan_")) });

const planPayloadSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(60).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().max(800).optional().or(z.literal("")),
  monthlyFeeCents: z.number().int().min(0).default(0),
  implementationFeeCents: z.number().int().min(0).default(0),
  monthlyDueDay: z.number().int().min(1).max(28).default(10),
  maxUsers: z.number().int().positive().nullable().optional(),
  maxAthletes: z.number().int().positive().nullable().optional(),
  maxTeams: z.number().int().positive().nullable().optional(),
  customDomainAllowed: z.boolean().default(false),
  moduleCodes: z.array(z.nativeEnum(TenantModuleCode)).default([]),
  active: z.boolean().default(true)
});

const updatePlanSchema = planPayloadSchema.partial();

const platformSettingsSchema = z.object({
  platformName: z.string().min(2).max(80),
  supportEmail: z.string().email(),
  commercialEmail: z.string().email(),
  baseDomain: z.string().min(4).max(120),
  defaultTrialDays: z.number().int().min(0).max(120),
  defaultImplementationDays: z.number().int().min(0).max(120),
  defaultBillingGraceDays: z.number().int().min(0).max(90),
  defaultMonthlyDueDay: z.number().int().min(1).max(28),
  autoSuspendEnabled: z.boolean(),
  autoReactivateEnabled: z.boolean(),
  requireVerifiedDomain: z.boolean(),
  allowPathAccess: z.boolean(),
  defaultProvisioningMode: z.enum(["AUTOMATIC", "MANUAL", "HYBRID"]),
  tenantNamingPattern: z.string().min(2).max(80),
  auditRetentionDays: z.number().int().min(30).max(3650)
});

const createTenantBaseSchema = z.object({
  planId: z.string().optional().nullable(),
  name: z.string().min(2).max(120),
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use apenas letras minúsculas, números e hífens entre as palavras."),
  contactName: z.string().max(120).optional().or(z.literal("")),
  contactEmail: z.string().email("Informe o email do administrador inicial."),
  contactPhone: z.string().max(40).optional().or(z.literal("")),
  status: z.nativeEnum(TenantStatus).default(TenantStatus.IMPLEMENTATION),
  planName: z.string().min(2).max(80).default("Padrão"),
  monthlyFeeCents: z.number().int().min(0).default(0),
  implementationFeeCents: z.number().int().min(0).default(0),
  monthlyDueDay: z.number().int().min(1).max(28).default(10),
  databaseUrl: z.string().url().optional().or(z.literal("")),
  brandName: z.string().max(80).optional().or(z.literal("")),
  primaryColor: z.string().min(4).max(40).default("#08255b"),
  secondaryColor: z.string().min(4).max(40).default("#55ad32"),
  accentColor: z.string().min(4).max(40).default("#7ac943"),
  logoUrl: z.string().max(2_000_000).optional().or(z.literal("")),
  playersPerTeam: z.number().int().min(7).max(11).default(11),
  adminPassword: z.string()
    .min(10, "A senha inicial deve ter pelo menos 10 caracteres.")
    .max(80)
    .regex(/[a-z]/, "A senha inicial deve ter letra minúscula.")
    .regex(/[A-Z]/, "A senha inicial deve ter letra maiúscula.")
    .regex(/[0-9]/, "A senha inicial deve ter número.")
    .describe("Senha inicial do administrador"),
  notes: z.string().max(1200).optional().or(z.literal(""))
});

const createTenantSchema = createTenantBaseSchema.superRefine((payload, ctx) => {
  if (payload.contactEmail && !payload.adminPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["adminPassword"],
      message: "Informe uma senha inicial forte para criar o admin do cliente."
    });
  }
});

const updateTenantSchema = createTenantBaseSchema.partial().extend({
  suspendedReason: z.string().max(500).optional().or(z.literal("")),
  provisioningStatus: z.nativeEnum(TenantProvisioningStatus).optional(),
  provisioningError: z.string().max(1000).optional().or(z.literal(""))
});

const createDomainSchema = z.object({
  hostname: z.string().min(4).max(180),
  expectedCname: z.string().min(4).max(180).optional()
});

const createChargeSchema = z.object({
  type: z.nativeEnum(SaaSChargeType),
  description: z.string().min(2).max(160),
  amountCents: z.number().int().positive(),
  competenceMonth: z.number().int().min(1).max(12).optional().nullable(),
  competenceYear: z.number().int().min(2020).max(2100).optional().nullable(),
  dueDate: z.string().datetime(),
  status: z.nativeEnum(SaaSChargeStatus).default(SaaSChargeStatus.PENDING),
  notes: z.string().max(800).optional().or(z.literal(""))
});

const createTenantUserSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string()
    .min(10, "A senha inicial deve ter pelo menos 10 caracteres.")
    .max(80)
    .regex(/[a-z]/, "A senha inicial deve ter letra minúscula.")
    .regex(/[A-Z]/, "A senha inicial deve ter letra maiúscula.")
    .regex(/[0-9]/, "A senha inicial deve ter número."),
  role: z.nativeEnum(UserRole).default(UserRole.ADMIN),
  roles: z.array(z.nativeEnum(UserRole)).min(1).optional()
});

const updateTenantModulesSchema = z.object({
  enabledModules: z.array(z.nativeEnum(TenantModuleCode))
});

const monthlyGenerationSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2020).max(2100)
});

const billingEnforcementSchema = z.object({
  graceDays: z.coerce.number().int().min(0).max(90).optional()
});

const AUTO_SUSPENSION_REASON_PREFIX = "Suspensão automática por inadimplência SaaS";

function uniqueRoles(roles: UserRole[]) {
  return Array.from(new Set(roles));
}

function resolveEffectiveRoles(primaryRole: UserRole, assignedRoles: Array<{ role: UserRole }>) {
  return uniqueRoles([primaryRole, ...assignedRoles.map((assignment) => assignment.role)]);
}

function dueDateFor(month: number, year: number, dueDay: number) {
  return new Date(Date.UTC(year, month - 1, Math.min(Math.max(dueDay, 1), 28), 12));
}

async function updateOverdueCharges() {
  await prisma.saaSCharge.updateMany({
    where: {
      status: SaaSChargeStatus.PENDING,
      dueDate: { lt: new Date() }
    },
    data: { status: SaaSChargeStatus.OVERDUE }
  });
}

async function getPlatformSettings() {
  return prisma.platformSettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" }
  });
}

function daysOverdue(dueDate: Date) {
  const today = new Date();
  const todayStart = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const dueStart = Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate());
  return Math.max(0, Math.floor((todayStart - dueStart) / 86_400_000));
}

async function maybeReactivateTenantAfterPayment(tenantId: string) {
  const tenant = await prisma.organizationTenant.findUnique({
    where: { id: tenantId },
    select: { id: true, status: true, suspendedReason: true }
  });

  if (!tenant || tenant.status !== TenantStatus.SUSPENDED || !tenant.suspendedReason?.startsWith(AUTO_SUSPENSION_REASON_PREFIX)) {
    return false;
  }

  await updateOverdueCharges();

  const overdueCount = await prisma.saaSCharge.count({
    where: {
      tenantId,
      status: SaaSChargeStatus.OVERDUE
    }
  });

  if (overdueCount > 0) {
    return false;
  }

  await prisma.organizationTenant.update({
    where: { id: tenantId },
    data: {
      status: TenantStatus.ACTIVE,
      suspendedReason: null
    }
  });

  return true;
}

async function enforceBillingDelinquency(graceDays: number, autoSuspendEnabled = true) {
  await updateOverdueCharges();

  const overdueTenants = await prisma.organizationTenant.findMany({
    where: {
      status: { in: [TenantStatus.ACTIVE, TenantStatus.TRIAL, TenantStatus.IMPLEMENTATION] },
      charges: {
        some: {
          status: SaaSChargeStatus.OVERDUE
        }
      }
    },
    include: {
      charges: {
        where: { status: SaaSChargeStatus.OVERDUE },
        orderBy: { dueDate: "asc" }
      }
    }
  });

  let suspended = 0;
  const reviewed = overdueTenants.length;
  const affectedTenants: Array<{ id: string; name: string; maxDaysOverdue: number; openAmountCents: number; suspended: boolean }> = [];

  for (const tenant of overdueTenants) {
    const maxDaysOverdue = Math.max(...tenant.charges.map((charge) => daysOverdue(charge.dueDate)), 0);
    const openAmountCents = tenant.charges.reduce((total, charge) => total + charge.amountCents, 0);
    const shouldSuspend = autoSuspendEnabled && maxDaysOverdue >= graceDays;

    if (shouldSuspend) {
      await prisma.organizationTenant.update({
        where: { id: tenant.id },
        data: {
          status: TenantStatus.SUSPENDED,
          suspendedReason: `${AUTO_SUSPENSION_REASON_PREFIX}: ${maxDaysOverdue} dia(s) em atraso, ${tenant.charges.length} fatura(s) vencida(s).`
        }
      });
      suspended += 1;
    }

    affectedTenants.push({
      id: tenant.id,
      name: tenant.name,
      maxDaysOverdue,
      openAmountCents,
      suspended: shouldSuspend
    });
  }

  return {
    graceDays,
    autoSuspendEnabled,
    reviewed,
    suspended,
    affectedTenants
  };
}

async function serializeTenant(tenantId: string) {
  const tenant = await prisma.organizationTenant.findUniqueOrThrow({
    where: { id: tenantId },
    include: {
      plan: true,
      domains: { orderBy: [{ status: "asc" }, { createdAt: "desc" }] },
      modules: { orderBy: { code: "asc" } },
      charges: { orderBy: [{ dueDate: "desc" }, { createdAt: "desc" }], take: 24 },
      users: {
        orderBy: [{ role: "asc" }, { createdAt: "desc" }],
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          roleAssignments: {
            select: {
              role: true
            }
          },
          createdAt: true,
          updatedAt: true
        }
      },
      groupSettings: true,
      paymentSettings: true
    }
  });

  const openCharges = tenant.charges.filter((charge) => charge.status === SaaSChargeStatus.PENDING || charge.status === SaaSChargeStatus.OVERDUE);
  const paidCharges = tenant.charges.filter((charge) => charge.status === SaaSChargeStatus.PAID);

  return {
    ...tenant,
    users: tenant.users.map((user) => ({
      ...user,
      roles: resolveEffectiveRoles(user.role, user.roleAssignments),
      roleAssignments: undefined
    })),
    moduleCatalog: tenantModuleCatalog,
    enabledModules: tenant.modules.filter((module) => module.enabled).map((module) => module.code),
    primaryUrl: tenantPrimaryUrl(tenant.slug),
    pathUrl: tenantPathUrl(tenant.slug),
    publicPathUrl: tenantPrimaryUrl(tenant.slug),
    openAmountCents: openCharges.reduce((total, charge) => total + charge.amountCents, 0),
    paidAmountCents: paidCharges.reduce((total, charge) => total + charge.amountCents, 0)
  };
}

async function applyPlanModulesToTenant(tenantId: string, moduleCodes: TenantModuleCode[]) {
  const enabledSet = new Set(moduleCodes);
  await ensureTenantModules(tenantId);

  await prisma.$transaction(
    tenantModuleCatalog.map((module) =>
      prisma.tenantModule.upsert({
        where: {
          tenantId_code: {
            tenantId,
            code: module.code
          }
        },
        update: {
          enabled: enabledSet.has(module.code)
        },
        create: {
          tenantId,
          code: module.code,
          enabled: enabledSet.has(module.code)
        }
      })
    )
  );
}

type EnsureTenantWorkspaceOptions = {
  physicalDatabaseUrl?: string | null;
  requirePhysicalDatabase?: boolean;
  provisioningSkippedReason?: string | null;
};

async function resolvePhysicalTenantDatabase(
  databaseName: string,
  existingDatabaseUrl: string | null | undefined,
  mode: "AUTOMATIC" | "MANUAL" | "HYBRID"
): Promise<PhysicalTenantProvisioningResult> {
  if (existingDatabaseUrl) {
    return {
      databaseUrl: existingDatabaseUrl,
      skippedReason: null,
      createdOrMigrated: false
    };
  }

  if (mode === "MANUAL") {
    return {
      databaseUrl: null,
      skippedReason: "Provisionamento manual selecionado. Informe a DATABASE_URL do tenant ou execute o provisionamento.",
      createdOrMigrated: false
    };
  }

  return provisionPhysicalTenantDatabase(databaseName);
}

export async function ensureTenantWorkspace(tenantId: string, options: EnsureTenantWorkspaceOptions = {}) {
  const tenant = await prisma.organizationTenant.findUniqueOrThrow({
    where: { id: tenantId },
    include: {
      domains: true,
      groupSettings: true,
      paymentSettings: true,
      users: {
        where: { role: UserRole.ADMIN },
        select: { id: true }
      }
    }
  });

  const defaults = tenantDefaults(tenant.slug);
  await ensureTenantModules(tenant.id);
  const operations = [];

  if (tenant.defaultSubdomain !== defaults.defaultSubdomain || tenant.databaseName !== defaults.databaseName) {
    operations.push(
      prisma.organizationTenant.update({
        where: { id: tenant.id },
        data: {
          defaultSubdomain: defaults.defaultSubdomain,
          databaseName: defaults.databaseName
        }
      })
    );
  }

  if (!tenant.groupSettings) {
    operations.push(
      prisma.groupSettings.create({
        data: {
          id: `${tenant.slug}-settings`,
          tenantId: tenant.id,
          groupName: tenant.brandName || tenant.name,
          playersPerTeam: 11,
          closedMode: true
        }
      })
    );
  }

  if (!tenant.paymentSettings) {
    operations.push(
      prisma.paymentSettings.create({
        data: {
          id: `${tenant.slug}-payment`,
          tenantId: tenant.id,
          pixKey: tenant.contactEmail || `financeiro@${defaults.defaultSubdomain}`,
          pixReceiverName: tenant.brandName || tenant.name,
          pixCity: "Florianopolis",
          monthlyDueDay: tenant.monthlyDueDay
        }
      })
    );
  }

  const hasDefaultDomain = tenant.domains.some((domain) => domain.hostname === defaults.defaultSubdomain);
  if (!hasDefaultDomain) {
    operations.push(
      prisma.tenantDomain.create({
        data: {
          tenantId: tenant.id,
          hostname: defaults.defaultSubdomain,
          type: "SUBDOMAIN",
          status: TenantDomainStatus.VERIFIED,
          expectedCname: platformHostname(),
          verifiedAt: new Date(),
          lastCheckedAt: new Date()
        }
      })
    );
  }

  if (operations.length > 0) {
    await prisma.$transaction(operations);
  }

  const hasPhysicalDatabase = Boolean(options.physicalDatabaseUrl || tenant.databaseUrl);
  const provisioningStatus = options.requirePhysicalDatabase && !hasPhysicalDatabase
    ? TenantProvisioningStatus.DATABASE_PENDING
    : TenantProvisioningStatus.READY;

  await prisma.organizationTenant.update({
    where: { id: tenant.id },
    data: {
      ...(options.physicalDatabaseUrl !== undefined ? { databaseUrl: options.physicalDatabaseUrl } : {}),
      provisioningStatus,
      provisioningError: options.provisioningSkippedReason ?? null,
      provisionedAt: provisioningStatus === TenantProvisioningStatus.READY ? new Date() : tenant.provisionedAt,
      notes: tenant.notes
        ? tenant.notes
        : `Ambiente criado pelo blueprint GestaSports: login próprio, subdomínio ${defaults.defaultSubdomain} e banco reservado ${defaults.databaseName}.`
    }
  });

  await ensureTenantModules(tenant.id);
}

export async function superadminRoutes(app: FastifyInstance) {
  app.get("/superadmin/settings", { preHandler: app.authorize(["SUPERADMIN"]) }, async () => {
    return getPlatformSettings();
  });

  app.patch("/superadmin/settings", { preHandler: app.authorize(["SUPERADMIN"]) }, async (request) => {
    const payload = platformSettingsSchema.parse(request.body);

    return prisma.platformSettings.upsert({
      where: { id: "default" },
      update: payload,
      create: { id: "default", ...payload }
    });
  });

  app.get("/superadmin/plans", { preHandler: app.authorize(["SUPERADMIN"]) }, async () => {
    return prisma.saaSPlan.findMany({
      orderBy: [{ active: "desc" }, { monthlyFeeCents: "asc" }, { name: "asc" }]
    });
  });

  app.post("/superadmin/plans", { preHandler: app.authorize(["SUPERADMIN"]) }, async (request, reply) => {
    const payload = planPayloadSchema.parse(request.body);

    const plan = await prisma.saaSPlan.create({
      data: {
        name: payload.name,
        slug: payload.slug,
        description: payload.description || null,
        monthlyFeeCents: payload.monthlyFeeCents,
        implementationFeeCents: payload.implementationFeeCents,
        monthlyDueDay: payload.monthlyDueDay,
        maxUsers: payload.maxUsers || null,
        maxAthletes: payload.maxAthletes || null,
        maxTeams: payload.maxTeams || null,
        customDomainAllowed: payload.customDomainAllowed,
        moduleCodes: payload.moduleCodes,
        active: payload.active
      }
    });

    return reply.code(201).send(plan);
  });

  app.patch("/superadmin/plans/:planId", { preHandler: app.authorize(["SUPERADMIN"]) }, async (request) => {
    const params = planParamsSchema.parse(request.params);
    const payload = updatePlanSchema.parse(request.body);

    return prisma.saaSPlan.update({
      where: { id: params.planId },
      data: {
        ...(payload.name !== undefined ? { name: payload.name } : {}),
        ...(payload.slug !== undefined ? { slug: payload.slug } : {}),
        ...(payload.description !== undefined ? { description: payload.description || null } : {}),
        ...(payload.monthlyFeeCents !== undefined ? { monthlyFeeCents: payload.monthlyFeeCents } : {}),
        ...(payload.implementationFeeCents !== undefined ? { implementationFeeCents: payload.implementationFeeCents } : {}),
        ...(payload.monthlyDueDay !== undefined ? { monthlyDueDay: payload.monthlyDueDay } : {}),
        ...(payload.maxUsers !== undefined ? { maxUsers: payload.maxUsers || null } : {}),
        ...(payload.maxAthletes !== undefined ? { maxAthletes: payload.maxAthletes || null } : {}),
        ...(payload.maxTeams !== undefined ? { maxTeams: payload.maxTeams || null } : {}),
        ...(payload.customDomainAllowed !== undefined ? { customDomainAllowed: payload.customDomainAllowed } : {}),
        ...(payload.moduleCodes !== undefined ? { moduleCodes: payload.moduleCodes } : {}),
        ...(payload.active !== undefined ? { active: payload.active } : {})
      }
    });
  });

  app.patch("/superadmin/tenants/:tenantId/plan", { preHandler: app.authorize(["SUPERADMIN"]) }, async (request) => {
    const params = tenantParamsSchema.parse(request.params);
    const payload = z.object({ planId: z.string() }).parse(request.body);
    const plan = await prisma.saaSPlan.findUniqueOrThrow({ where: { id: payload.planId } });

    await prisma.organizationTenant.update({
      where: { id: params.tenantId },
      data: {
        planId: plan.id,
        planName: plan.name,
        monthlyFeeCents: plan.monthlyFeeCents,
        implementationFeeCents: plan.implementationFeeCents,
        monthlyDueDay: plan.monthlyDueDay
      }
    });

    await applyPlanModulesToTenant(params.tenantId, plan.moduleCodes);

    return serializeTenant(params.tenantId);
  });

  app.get("/superadmin/tenants", { preHandler: app.authorize(["SUPERADMIN"]) }, async () => {
    await updateOverdueCharges();

    const tenants = await prisma.organizationTenant.findMany({
      include: {
        plan: true,
        domains: { orderBy: [{ status: "asc" }, { createdAt: "desc" }] },
        modules: { orderBy: { code: "asc" } },
        charges: {
          orderBy: [{ dueDate: "desc" }, { createdAt: "desc" }],
          take: 24
        },
        users: {
          orderBy: [{ role: "asc" }, { createdAt: "desc" }],
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            roleAssignments: {
              select: {
                role: true
              }
            },
            createdAt: true,
            updatedAt: true
          }
        },
        groupSettings: true,
        paymentSettings: true
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }]
    });

    return tenants.map((tenant) => {
      const openCharges = tenant.charges.filter((charge) => charge.status === SaaSChargeStatus.PENDING || charge.status === SaaSChargeStatus.OVERDUE);
      const paidCharges = tenant.charges.filter((charge) => charge.status === SaaSChargeStatus.PAID);

      return {
        ...tenant,
        users: tenant.users.map((user) => ({
          ...user,
          roles: resolveEffectiveRoles(user.role, user.roleAssignments),
          roleAssignments: undefined
        })),
        moduleCatalog: tenantModuleCatalog,
        enabledModules: tenant.modules.filter((module) => module.enabled).map((module) => module.code),
        primaryUrl: tenantPrimaryUrl(tenant.slug),
        pathUrl: tenantPathUrl(tenant.slug),
        publicPathUrl: tenantPrimaryUrl(tenant.slug),
        openAmountCents: openCharges.reduce((total, charge) => total + charge.amountCents, 0),
        paidAmountCents: paidCharges.reduce((total, charge) => total + charge.amountCents, 0),
        verifiedDomains: tenant.domains.filter((domain) => domain.status === TenantDomainStatus.VERIFIED).length,
        pendingDomains: tenant.domains.filter((domain) => domain.status === TenantDomainStatus.PENDING).length
      };
    });
  });

  app.post("/superadmin/tenants", { preHandler: app.authorize(["SUPERADMIN"]) }, async (request, reply) => {
    const payload = createTenantSchema.parse(request.body);
    const selectedPlan = payload.planId ? await prisma.saaSPlan.findUnique({ where: { id: payload.planId } }) : null;
    const platformSettings = await getPlatformSettings();
    const defaults = tenantDefaults(payload.slug);
    const provisioningMode = platformSettings.defaultProvisioningMode as "AUTOMATIC" | "MANUAL" | "HYBRID";
    const physicalDatabase = await resolvePhysicalTenantDatabase(defaults.databaseName, payload.databaseUrl || null, provisioningMode);
    const adminPasswordHash = await bcrypt.hash(payload.adminPassword, 10);
    const planName = selectedPlan?.name ?? payload.planName;
    const monthlyFeeCents = selectedPlan?.monthlyFeeCents ?? payload.monthlyFeeCents;
    const implementationFeeCents = selectedPlan?.implementationFeeCents ?? payload.implementationFeeCents;
    const monthlyDueDay = selectedPlan?.monthlyDueDay ?? payload.monthlyDueDay;
    const selectedModuleCodes = selectedPlan?.moduleCodes ?? defaultTenantModuleCodes;

    const tenant = await prisma.organizationTenant.create({
      data: {
        name: payload.name,
        planId: selectedPlan?.id || null,
        slug: payload.slug,
        contactName: payload.contactName || null,
        contactEmail: payload.contactEmail || null,
        contactPhone: payload.contactPhone || null,
        status: payload.status,
        planName,
        monthlyFeeCents,
        implementationFeeCents,
        monthlyDueDay,
        defaultSubdomain: defaults.defaultSubdomain,
        databaseName: defaults.databaseName,
        databaseUrl: physicalDatabase.databaseUrl,
        provisioningStatus: TenantProvisioningStatus.MIGRATING,
        provisionedAt: physicalDatabase.databaseUrl ? new Date() : null,
        brandName: payload.brandName || payload.name,
        primaryColor: payload.primaryColor,
        secondaryColor: payload.secondaryColor,
        accentColor: payload.accentColor,
        logoUrl: payload.logoUrl || null,
        notes: payload.notes || null,
        groupSettings: {
          create: {
            id: `${payload.slug}-settings`,
            groupName: payload.brandName || payload.name,
            playersPerTeam: payload.playersPerTeam,
            closedMode: true
          }
        },
        paymentSettings: {
          create: {
            id: `${payload.slug}-payment`,
            pixKey: payload.contactEmail || `financeiro@${defaults.defaultSubdomain}`,
            pixReceiverName: payload.brandName || payload.name,
            pixCity: "Florianopolis",
            monthlyDueDay
          }
        },
        domains: {
          create: {
            hostname: defaults.defaultSubdomain,
            type: "SUBDOMAIN",
            status: TenantDomainStatus.VERIFIED,
            expectedCname: platformHostname(),
            verifiedAt: new Date(),
            lastCheckedAt: new Date()
          }
        },
        users: {
          create: {
            name: payload.contactName || `Admin ${payload.name}`,
            email: payload.contactEmail,
            passwordHash: adminPasswordHash,
            role: UserRole.ADMIN
          }
        },
        modules: {
          create: tenantModuleCatalog.map((module) => ({
            code: module.code,
            enabled: selectedModuleCodes.includes(module.code)
          }))
        },
        ...(implementationFeeCents > 0 ?
           {
              charges: {
                create: {
                  type: SaaSChargeType.IMPLEMENTATION,
                  description: "Implementação inicial",
                  amountCents: implementationFeeCents,
                  dueDate: dueDateFor(new Date().getUTCMonth() + 1, new Date().getUTCFullYear(), monthlyDueDay),
                  status: SaaSChargeStatus.PENDING
                }
              }
            }
          : {})
      }
    });

    await ensureTenantWorkspace(tenant.id, {
      physicalDatabaseUrl: physicalDatabase.databaseUrl,
      requirePhysicalDatabase: true,
      provisioningSkippedReason: physicalDatabase.skippedReason
    });
    await ensureTenantModules(tenant.id, selectedModuleCodes);
    if (selectedPlan) {
      await applyPlanModulesToTenant(tenant.id, selectedPlan.moduleCodes);
    }

    return reply.code(201).send(await serializeTenant(tenant.id));
  });

  app.patch("/superadmin/tenants/:tenantId", { preHandler: app.authorize(["SUPERADMIN"]) }, async (request) => {
    const params = tenantParamsSchema.parse(request.params);
    const payload = updateTenantSchema.parse(request.body);
    const statusActivated = payload.status === TenantStatus.ACTIVE;

    await prisma.organizationTenant.update({
      where: { id: params.tenantId },
      data: {
        ...(payload.name !== undefined ? { name: payload.name } : {}),
        ...(payload.planId !== undefined ? { planId: payload.planId || null } : {}),
        ...(payload.contactName !== undefined ? { contactName: payload.contactName || null } : {}),
        ...(payload.contactEmail !== undefined ? { contactEmail: payload.contactEmail || null } : {}),
        ...(payload.contactPhone !== undefined ? { contactPhone: payload.contactPhone || null } : {}),
        ...(payload.status !== undefined ? { status: payload.status } : {}),
        ...(payload.planName !== undefined ? { planName: payload.planName } : {}),
        ...(payload.monthlyFeeCents !== undefined ? { monthlyFeeCents: payload.monthlyFeeCents } : {}),
        ...(payload.implementationFeeCents !== undefined ? { implementationFeeCents: payload.implementationFeeCents } : {}),
        ...(payload.monthlyDueDay !== undefined ? { monthlyDueDay: payload.monthlyDueDay } : {}),
        ...(payload.databaseUrl !== undefined ? { databaseUrl: payload.databaseUrl || null } : {}),
        ...(payload.brandName !== undefined ? { brandName: payload.brandName || null } : {}),
        ...(payload.primaryColor !== undefined ? { primaryColor: payload.primaryColor } : {}),
        ...(payload.secondaryColor !== undefined ? { secondaryColor: payload.secondaryColor } : {}),
        ...(payload.accentColor !== undefined ? { accentColor: payload.accentColor } : {}),
        ...(payload.logoUrl !== undefined ? { logoUrl: payload.logoUrl || null } : {}),
        ...(payload.provisioningStatus !== undefined ? { provisioningStatus: payload.provisioningStatus } : {}),
        ...(payload.provisioningError !== undefined ? { provisioningError: payload.provisioningError || null } : {}),
        ...(payload.notes !== undefined ? { notes: payload.notes || null } : {}),
        ...(payload.suspendedReason !== undefined ? { suspendedReason: payload.suspendedReason || null } : {}),
        ...(statusActivated ? { activatedAt: new Date() } : {})
      }
    });

    if (payload.planId !== undefined || payload.status !== undefined) {
      await createAuditLog(prisma, {
        request,
        action: "superadmin:tenant:update",
        targetType: "OrganizationTenant",
        targetId: params.tenantId,
        tenantId: params.tenantId,
        metadata: {
          ...(payload.planId !== undefined ? { planId: payload.planId } : {}),
          ...(payload.status !== undefined ? { status: payload.status } : {}),
          ...(payload.suspendedReason !== undefined ? { suspendedReason: payload.suspendedReason } : {})
        }
      });
    }

    return serializeTenant(params.tenantId);
  });

  app.post("/superadmin/tenants/:tenantId/provision", { preHandler: app.authorize(["SUPERADMIN"]) }, async (request) => {
    const params = tenantParamsSchema.parse(request.params);
    const settings = await getPlatformSettings();
    const provisioningMode = settings.defaultProvisioningMode as "AUTOMATIC" | "MANUAL" | "HYBRID";
    const tenant = await prisma.organizationTenant.findUniqueOrThrow({
      where: { id: params.tenantId },
      select: { databaseName: true, databaseUrl: true }
    });

    await prisma.organizationTenant.update({
      where: { id: params.tenantId },
      data: {
        provisioningStatus: TenantProvisioningStatus.MIGRATING,
        provisioningError: null
      }
    });

    const physicalDatabase = await resolvePhysicalTenantDatabase(tenant.databaseName, tenant.databaseUrl, provisioningMode);
    await ensureTenantWorkspace(params.tenantId, {
      physicalDatabaseUrl: physicalDatabase.databaseUrl,
      requirePhysicalDatabase: true,
      provisioningSkippedReason: physicalDatabase.skippedReason
    });

    return serializeTenant(params.tenantId);
  });

  app.post("/superadmin/tenants/:tenantId/users", { preHandler: app.authorize(["SUPERADMIN"]) }, async (request, reply) => {
    const params = tenantParamsSchema.parse(request.params);
    const payload = createTenantUserSchema.parse(request.body);

    const roles = uniqueRoles(payload.roles ?? [payload.role]);
    const primaryRole = roles[0] ?? UserRole.ADMIN;
    const additionalRoles = roles.filter((role) => role !== primaryRole);

    if (roles.includes(UserRole.SUPERADMIN)) {
      return reply.code(400).send({ message: "SUPERADMIN so pode existir no painel GestaSports." });
    }

    await prisma.organizationTenant.findUniqueOrThrow({ where: { id: params.tenantId }, select: { id: true } });

    await prisma.user.create({
      data: {
        tenantId: params.tenantId,
        name: payload.name,
        email: payload.email,
        passwordHash: await bcrypt.hash(payload.password, 10),
        role: primaryRole,
        roleAssignments: {
          create: additionalRoles.map((role) => ({ role }))
        }
      }
    });

    return reply.code(201).send(await serializeTenant(params.tenantId));
  });

  app.patch("/superadmin/tenants/:tenantId/modules", { preHandler: app.authorize(["SUPERADMIN"]) }, async (request) => {
    const params = tenantParamsSchema.parse(request.params);
    const payload = updateTenantModulesSchema.parse(request.body);
    const enabledSet = new Set(payload.enabledModules);

    await applyPlanModulesToTenant(params.tenantId, Array.from(enabledSet));

    await createAuditLog(prisma, {
      request,
      action: "superadmin:tenant:modules-update",
      targetType: "OrganizationTenant",
      targetId: params.tenantId,
      tenantId: params.tenantId,
      metadata: { enabledModules: Array.from(enabledSet) }
    });

    return serializeTenant(params.tenantId);
  });

  app.post("/superadmin/tenants/:tenantId/domains", { preHandler: app.authorize(["SUPERADMIN"]) }, async (request, reply) => {
    const params = tenantParamsSchema.parse(request.params);
    const payload = createDomainSchema.parse(request.body);
    const hostname = normalizeHostname(payload.hostname);
    const tenant = await prisma.organizationTenant.findUniqueOrThrow({ where: { id: params.tenantId } });

    if (!isValidHostname(hostname)) {
      return reply.code(400).send({ message: "Informe um domínio válido, sem protocolo, porta, caminho ou caracteres especiais." });
    }

    if (isProtectedPlatformDomain(hostname)) {
      return reply.code(400).send({ message: "O domínio principal do GestaSports não pode ser vinculado a um cliente." });
    }

    if (hostname === tenant.defaultSubdomain) {
      return reply.code(409).send({ message: "Este subdomínio já é o acesso automatico do cliente." });
    }

    if (isPlatformSubdomain(hostname)) {
      return reply.code(400).send({ message: "Subdomínios gestasports.com.br são gerados automaticamente pelo slug do cliente. Cadastre apenas domínios próprios, como www.clube.com.br." });
    }

    const expectedCname = normalizeHostname(payload.expectedCname) || tenant.defaultSubdomain;
    if (!isValidHostname(expectedCname)) {
      return reply.code(400).send({ message: "O CNAME esperado precisa ser um hostname valido." });
    }

    await prisma.tenantDomain.create({
      data: {
        tenantId: params.tenantId,
        hostname,
        type: "CUSTOM",
        expectedCname,
        status: TenantDomainStatus.PENDING
      }
    });

    return reply.code(201).send(await serializeTenant(params.tenantId));
  });

  app.patch("/superadmin/domains/:domainId/verify", { preHandler: app.authorize(["SUPERADMIN"]) }, async (request) => {
    const params = domainParamsSchema.parse(request.params);
    const domain = await prisma.tenantDomain.update({
      where: { id: params.domainId },
      data: {
        status: TenantDomainStatus.VERIFIED,
        verifiedAt: new Date(),
        lastCheckedAt: new Date(),
        failureReason: null
      },
      select: { tenantId: true }
    });

    return serializeTenant(domain.tenantId);
  });

  app.post("/superadmin/tenants/:tenantId/charges", { preHandler: app.authorize(["SUPERADMIN"]) }, async (request, reply) => {
    const params = tenantParamsSchema.parse(request.params);
    const payload = createChargeSchema.parse(request.body);

    const charge = await prisma.saaSCharge.create({
      data: {
        tenantId: params.tenantId,
        type: payload.type,
        description: payload.description,
        amountCents: payload.amountCents,
        competenceMonth: payload.competenceMonth || null,
        competenceYear: payload.competenceYear || null,
        dueDate: new Date(payload.dueDate),
        status: payload.status,
        notes: payload.notes || null
      }
    });

    await createAuditLog(prisma, {
      request,
      action: "superadmin:charge:create",
      targetType: "SaaSCharge",
      targetId: charge.id,
      tenantId: params.tenantId,
      metadata: { type: charge.type, amountCents: charge.amountCents }
    });

    return reply.code(201).send(await serializeTenant(params.tenantId));
  });

  app.patch("/superadmin/charges/:chargeId/settle", { preHandler: app.authorize(["SUPERADMIN"]) }, async (request) => {
    const params = chargeParamsSchema.parse(request.params);
    const charge = await prisma.saaSCharge.update({
      where: { id: params.chargeId },
      data: {
        status: SaaSChargeStatus.PAID,
        paidAt: new Date()
      },
      select: { tenantId: true, amountCents: true }
    });

    await maybeReactivateTenantAfterPayment(charge.tenantId);

    await createAuditLog(prisma, {
      request,
      action: "superadmin:charge:settle",
      targetType: "SaaSCharge",
      targetId: params.chargeId,
      tenantId: charge.tenantId,
      metadata: { amountCents: charge.amountCents }
    });

    return serializeTenant(charge.tenantId);
  });

  app.post("/superadmin/billing/generate-monthly", { preHandler: app.authorize(["SUPERADMIN"]) }, async (request) => {
    const query = monthlyGenerationSchema.parse(request.query);
    const tenants = await prisma.organizationTenant.findMany({
      where: {
        status: { in: [TenantStatus.ACTIVE, TenantStatus.TRIAL, TenantStatus.IMPLEMENTATION] },
        monthlyFeeCents: { gt: 0 }
      }
    });

    let created = 0;
    for (const tenant of tenants) {
      const existing = await prisma.saaSCharge.findFirst({
        where: {
          tenantId: tenant.id,
          type: SaaSChargeType.MONTHLY,
          competenceMonth: query.month,
          competenceYear: query.year
        },
        select: { id: true }
      });

      if (existing) {
        continue;
      }

      await prisma.saaSCharge.create({
        data: {
          tenantId: tenant.id,
          type: SaaSChargeType.MONTHLY,
          description: `Mensalidade SaaS ${String(query.month).padStart(2, "0")}/${query.year}`,
          amountCents: tenant.monthlyFeeCents,
          competenceMonth: query.month,
          competenceYear: query.year,
          dueDate: dueDateFor(query.month, query.year, tenant.monthlyDueDay),
          status: SaaSChargeStatus.PENDING
        }
      });
      created += 1;
    }

    return {
      month: query.month,
      year: query.year,
      eligibleTenants: tenants.length,
      created
    };
  });

  app.post("/superadmin/billing/enforce-delinquency", { preHandler: app.authorize(["SUPERADMIN"]) }, async (request) => {
    const query = billingEnforcementSchema.parse(request.query);
    const settings = await getPlatformSettings();
    return enforceBillingDelinquency(query.graceDays ?? settings.defaultBillingGraceDays, settings.autoSuspendEnabled);
  });
}



