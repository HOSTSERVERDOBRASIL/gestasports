import type { FastifyInstance } from "fastify";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";
import { setTenantBypass } from "../tenancy/tenant-context.js";
import { AssociateStatus, AthleteLinkType, AthletePosition, AthleteStatus, Prisma, type UserRole } from "@prisma/client";
import { getEnabledTenantModuleCodes } from "../tenancy/tenant-modules.js";

type JwtUser = {
  sub: string;
  role: UserRole;
  roles: UserRole[];
  name: string;
  email: string;
  tenantId: string | null;
};

function serializeAuthUser(user: {
  id: string;
  tenantId: string | null;
  name: string;
  role: UserRole;
  email: string;
  tenant: { name: string; status: string; suspendedReason: string | null } | null;
}, roles: UserRole[]) {
  return {
    id: user.id,
    tenantId: user.tenantId,
    tenantName: user.tenant?.name || null,
    tenantStatus: user.tenant?.status || null,
    tenantSuspendedReason: user.tenant?.suspendedReason || null,
    enabledModules: [] as string[],
    name: user.name,
    role: user.role,
    roles,
    email: user.email
  };
}

async function serializeAuthUserWithModules(user: Parameters<typeof serializeAuthUser>[0], roles: UserRole[]) {
  const serialized = serializeAuthUser(user, roles);
  return {
    ...serialized,
    enabledModules: await getEnabledTenantModuleCodes(user.tenantId)
  };
}

const userRoleSchema = z.nativeEnum({
  SUPERADMIN: "SUPERADMIN",
  ADMIN: "ADMIN",
  SPORTS_DIRECTOR: "SPORTS_DIRECTOR",
  FINANCIAL: "FINANCIAL",
  ASSOCIATE: "ASSOCIATE",
  ATHLETE: "ATHLETE"
} as const);
const strongPasswordSchema = z.string()
  .min(10, "A senha deve ter pelo menos 10 caracteres.")
  .regex(/[a-z]/, "A senha deve ter letra minúscula.")
  .regex(/[A-Z]/, "A senha deve ter letra maiúscula.")
  .regex(/[0-9]/, "A senha deve ter número.");

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: strongPasswordSchema,
  associateId: z.string().cuid().optional(),
  roles: z.array(userRoleSchema).min(1)
});

const inviteRegisterSchema = z.object({
  inviteCode: z.string().min(4).max(40),
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(8).optional(),
  password: strongPasswordSchema,
  position: z.nativeEnum(AthletePosition).default(AthletePosition.CENTRAL_MIDFIELDER)
});

const forgotPasswordSchema = z.object({
  email: z.string().email()
});

const resetPasswordSchema = z.object({
  token: z.string().min(32),
  password: strongPasswordSchema
});

const reauthSchema = z.object({
  password: z.string().min(6),
  reason: z.string().min(3).max(500).optional(),
  context: z.record(z.unknown()).optional()
});

const userIdParamsSchema = z.object({
  id: z.string().cuid()
});

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: strongPasswordSchema.optional(),
  roles: z.array(userRoleSchema).min(1).optional(),
  associateId: z.string().cuid().nullable().optional()
});

const updateUserRolesSchema = z.object({
  roles: z.array(userRoleSchema).min(1)
});

function uniqueRoles(roles: UserRole[]) {
  return Array.from(new Set(roles));
}

function resolveEffectiveRoles(primaryRole: UserRole, assignedRoles: UserRole[]) {
  return uniqueRoles([primaryRole, ...assignedRoles]);
}

function hashResetToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function getRequestOrigin(request: { headers: Record<string, string | string[] | undefined> }) {
  const origin = request.headers.origin;
  if (typeof origin === "string") {
    return origin;
  }

  const proto = request.headers["x-forwarded-proto"];
  const host = request.headers.host;
  return `${typeof proto === "string" ? proto : "http"}://${typeof host === "string" ? host : "localhost:5173"}`;
}

async function sendPasswordResetEmail(to: string, name: string, resetUrl: string, productName = "GestaSports") {
  if (!env.SMTP_HOST || !env.SMTP_PORT || !env.SMTP_FROM) {
    return false;
  }

  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined
  });

  await transporter.sendMail({
    from: env.SMTP_FROM,
    to,
    subject: `Recuperação de senha - ${productName}`,
    html: `
      <p>Ola, ${name}.</p>
      <p>Recebemos uma solicitação para redefinir sua senha no ${productName}.</p>
      <p><a href="${resetUrl}">Clique aqui para criar uma nova senha</a>.</p>
      <p>Este link expira em 1 hora. Se você não solicitou, ignore este e-mail.</p>
    `
  });

  return true;
}

async function serializeManagedUser(userId: string, tenantId?: string | null) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      roleAssignments: {
        select: {
          role: true
        }
      },
      associate: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          status: true,
          monthlyFeeCents: true,
          athlete: {
            select: {
              id: true,
              name: true,
              position: true,
              status: true,
              rating: true
            }
          }
        }
      }
    }
  });

  if (tenantId !== undefined && (user.tenantId !== tenantId || user.role === "SUPERADMIN")) {
    throw new Error("Usuário não pertence a este cliente.");
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    roles: resolveEffectiveRoles(
      user.role,
      user.roleAssignments.map((assignment) => assignment.role)
    ),
    associate: user.associate,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

export async function authRoutes(app: FastifyInstance) {
  app.get("/auth/invite", async (request, reply) => {
    const query = z.object({ code: z.string().min(4).max(40) }).parse(request.query);
    const tenantId = request.tenant?.id;

    if (!tenantId) {
      return reply.status(400).send({ message: "Informe o ambiente do clube para validar o convite" });
    }

    const settings = await prisma.groupSettings.findFirst({ where: { tenantId } });
    const expectedCode = settings?.inviteCode?.trim() ?? "";

    if (!settings || !expectedCode || expectedCode !== query.code.trim()) {
      return reply.status(404).send({ message: "Convite inválido ou expirado" });
    }

    return {
      groupName: settings.groupName,
      closedMode: settings.closedMode,
      inviteCode: query.code
    };
  });

  app.post("/auth/invite-register", async (request, reply) => {
    const payload = inviteRegisterSchema.parse(request.body);
    const tenantId = request.tenant?.id;

    if (!tenantId) {
      return reply.status(400).send({ message: "Informe o ambiente do clube para concluir o convite" });
    }

    const settings = await prisma.groupSettings.findFirst({ where: { tenantId } });
    const expectedCode = settings?.inviteCode?.trim() ?? "";

    if (!expectedCode || expectedCode !== payload.inviteCode.trim()) {
      return reply.status(403).send({ message: "Convite inválido ou expirado" });
    }

    const existingUser = await prisma.user.findFirst({ where: { tenantId, email: payload.email } });
    if (existingUser) {
      return reply.status(409).send({ message: "Já existe usuário cadastrado com este email" });
    }

    const passwordHash = await bcrypt.hash(payload.password, 10);

    const created = await prisma.$transaction(async (tx) => {
      const existingAssociate = await tx.associate.findFirst({ where: { tenantId, email: payload.email } });
      const associate = existingAssociate
        ? await tx.associate.update({
            where: { id: existingAssociate.id },
            data: {
              name: payload.name,
              phone: payload.phone ?? existingAssociate.phone,
              status: AssociateStatus.ACTIVE
            }
          })
        : await tx.associate.create({
            data: {
              tenantId,
              name: payload.name,
              email: payload.email,
              phone: payload.phone || null,
              status: AssociateStatus.ACTIVE,
              monthlyFeeCents: 6000
            }
          });

      await tx.athlete.upsert({
        where: { associateId: associate.id },
        update: {
          name: payload.name,
          position: payload.position,
          linkType: AthleteLinkType.ASSOCIATE,
          status: AthleteStatus.ACTIVE
        },
        create: {
          tenantId,
          name: payload.name,
          position: payload.position,
          linkType: AthleteLinkType.ASSOCIATE,
          status: AthleteStatus.ACTIVE,
          rating: 3,
          associateId: associate.id
        }
      });

      return tx.user.create({
        data: {
          tenantId,
          name: payload.name,
          email: payload.email,
          passwordHash,
          role: "ATHLETE",
          associateId: associate.id
        }
      });
    });

    const roles = resolveEffectiveRoles(created.role, []);
    const token = await reply.jwtSign({
      sub: created.id,
      tenantId: created.tenantId,
      role: created.role,
      roles,
      name: created.name,
      email: created.email
    });

    return reply.code(201).send({
      token,
      user: {
        id: created.id,
        tenantId: created.tenantId,
        name: created.name,
        role: created.role,
        roles,
        email: created.email
      }
    });
  });

  app.post(
    "/auth/login",
    { config: { rateLimit: { max: 10, timeWindow: "15 minutes" } } },
    async (request, reply) => {
    const payload = loginSchema.parse(request.body);
    const tenantId = request.tenant?.id || null;
    const allowDevelopmentTenantFallback = env.NODE_ENV !== "production" && !tenantId;

    let user;
    try {
      setTenantBypass(true);
      user = await prisma.user.findFirst({
        where: {
          email: payload.email,
          OR: allowDevelopmentTenantFallback
            ? [
                { role: "SUPERADMIN", tenantId: null },
                { tenantId: { not: null } }
              ]
            : [
                ...(tenantId ? [{ tenantId }] : []),
                { role: "SUPERADMIN", tenantId: null }
              ]
        },
        include: {
          tenant: {
            select: {
              name: true,
              status: true,
              suspendedReason: true
            }
          },
          roleAssignments: {
            select: {
              role: true
            }
          }
        }
      });
    } finally {
      setTenantBypass(false);
    }

    if (!user) {
      return reply.status(401).send({ message: "Credenciais inválidas" });
    }

    const passwordOk = await bcrypt.compare(payload.password, user.passwordHash);

    if (!passwordOk) {
      return reply.status(401).send({ message: "Credenciais inválidas" });
    }

    const roles = resolveEffectiveRoles(
      user.role,
      user.roleAssignments.map((assignment) => assignment.role)
    );

    const token = await reply.jwtSign({
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role,
      roles,
      name: user.name,
      email: user.email
    });

    return {
      token,
      user: await serializeAuthUserWithModules(user, roles)
    };
    }
  );

  app.post("/auth/reauth", { preHandler: app.authenticate }, async (request, reply) => {
    const payload = reauthSchema.parse(request.body);
    const currentUser = request.user as JwtUser;

    const user = await prisma.user.findUnique({
      where: { id: currentUser.sub }
    });

    if (!user) {
      return reply.status(401).send({ message: "Usuário não encontrado" });
    }

    const passwordOk = await bcrypt.compare(payload.password, user.passwordHash);

    if (!passwordOk) {
      return reply.status(401).send({ message: "Senha inválida para confirmar a alteração" });
    }

    const metadata: Prisma.InputJsonObject = {
      reason: payload.reason || null,
      roles: currentUser.roles ?? [currentUser.role],
      ...(payload.context ? { context: payload.context as Prisma.InputJsonObject } : {})
    };

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        userRole: user.role,
        action: "reauth:historical-change",
        method: request.method,
        path: request.url.split("?")[0] ?? request.url,
        statusCode: 200,
        targetType: "historico",
        metadata
      }
    });

    return { ok: true };
  });

  app.post(
    "/auth/password/forgot",
    { config: { rateLimit: { max: 5, timeWindow: "1 hour" } } },
    async (request, reply) => {
    const payload = forgotPasswordSchema.parse(request.body);
    const tenantId = request.tenant?.id ?? null;
    const user = await prisma.user.findFirst({
      where: tenantId
        ? { tenantId, email: payload.email }
        : { tenantId: null, email: payload.email, role: "SUPERADMIN" },
      include: {
        tenant: {
          select: {
            brandName: true,
            name: true
          }
        }
      }
    });

    if (!user) {
      return {
        message: "Se o email estiver cadastrado, enviaremos as instruções de recuperação."
      };
    }

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashResetToken(token);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt
      }
    });

    const resetUrl = `${getRequestOrigin(request)}/recuperar-senha?token=${encodeURIComponent(token)}`;
    let emailSent = false;

    try {
      emailSent = await sendPasswordResetEmail(user.email, user.name, resetUrl, user.tenant?.brandName ?? user.tenant?.name ?? "GestaSports");
    } catch (error) {
      app.log.error({ error, email: user.email }, "Falha ao enviar email de recuperação de senha");
    }

    return reply.send({
      message: emailSent
        ? "Enviamos o link de recuperação para seu email."
        : "Link de recuperação gerado. Configure SMTP para envio automático por email.",
      resetUrl: !emailSent && env.NODE_ENV !== "production" ? resetUrl : undefined
    });
    }
  );

  app.get("/auth/password/reset-token", async (request, reply) => {
    const parsedQuery = z.object({ token: z.string().min(32) }).safeParse(request.query);
    if (!parsedQuery.success) {
      return reply.status(400).send({ message: "Link de recuperação inválido ou expirado" });
    }
    const query = parsedQuery.data;
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashResetToken(query.token) },
      include: {
        user: {
          select: {
            email: true,
            name: true
          }
        }
      }
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      return reply.status(400).send({ message: "Link de recuperação inválido ou expirado" });
    }

    return {
      email: resetToken.user.email,
      name: resetToken.user.name,
      expiresAt: resetToken.expiresAt
    };
  });

  app.post("/auth/password/reset", async (request, reply) => {
    const payload = resetPasswordSchema.parse(request.body);
    const tokenHash = hashResetToken(payload.token);
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash }
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      return reply.status(400).send({ message: "Link de recuperação inválido ou expirado" });
    }

    const passwordHash = await bcrypt.hash(payload.password, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash }
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() }
      })
    ]);

    return {
      message: "Senha atualizada com sucesso"
    };
  });

  app.get("/auth/me", { preHandler: app.authenticate }, async (request) => {
    const user = request.user as JwtUser;

    const dbUser = await prisma.user.findUnique({
      where: { id: user.sub },
      include: {
        tenant: {
          select: {
            name: true,
            status: true,
            suspendedReason: true
          }
        },
        roleAssignments: {
          select: {
            role: true
          }
        }
      }
    });

    if (!dbUser) {
      throw new Error("Usuário não encontrado");
    }

    const roles = resolveEffectiveRoles(
      dbUser.role,
      dbUser.roleAssignments.map((assignment) => assignment.role)
    );

    return serializeAuthUserWithModules(dbUser, roles);
  });

  app.get("/auth/users", { preHandler: app.authorize(["ADMIN"]) }, async (request, reply) => {
    const tenantId = request.user.tenantId ?? request.tenant?.id;

    if (!tenantId) {
      return reply.status(400).send({ message: "Informe o ambiente do cliente para listar usuários." });
    }

    const users = await prisma.user.findMany({
      where: {
        tenantId,
        role: { not: "SUPERADMIN" },
        roleAssignments: {
          none: {
            role: "SUPERADMIN"
          }
        }
      },
      include: {
        roleAssignments: {
          select: {
            role: true
          }
        },
        associate: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            status: true,
            monthlyFeeCents: true,
            athlete: {
              select: {
                id: true,
                name: true,
                position: true,
                status: true,
                rating: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return users.map((item) => ({
      id: item.id,
      name: item.name,
      email: item.email,
      role: item.role,
      roles: resolveEffectiveRoles(
        item.role,
        item.roleAssignments.map((assignment) => assignment.role)
      ),
      associate: item.associate,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    }));
  });

  app.get("/auth/users/:id", { preHandler: app.authorize(["ADMIN"]) }, async (request, reply) => {
    const params = userIdParamsSchema.parse(request.params);
    const tenantId = request.user.tenantId ?? request.tenant?.id;

    if (!tenantId) {
      return reply.status(400).send({ message: "Informe o ambiente do cliente para consultar usuário." });
    }

    return serializeManagedUser(params.id, tenantId);
  });

  app.post("/auth/users", { preHandler: app.authorize(["ADMIN"]) }, async (request, reply) => {
    const payload = createUserSchema.parse(request.body);
    const tenantId = request.user.tenantId ?? request.tenant?.id;

    if (!tenantId) {
      return reply.status(400).send({ message: "Informe o ambiente do cliente para cadastrar usuário." });
    }

    if (payload.roles.includes("SUPERADMIN")) {
      return reply.status(400).send({ message: "Superadmin so pode ser gerenciado no painel da plataforma." });
    }

    const passwordHash = await bcrypt.hash(payload.password, 10);
    const roles = uniqueRoles(payload.roles);
    const primaryRole = roles[0] ?? "ATHLETE";
    const additionalRoles = roles.filter((role) => role !== primaryRole);

    const created = await prisma.user.create({
      data: {
        tenant: {
          connect: {
            id: tenantId
          }
        },
        name: payload.name,
        email: payload.email,
        passwordHash,
        role: primaryRole,
        ...(payload.associateId ?
           {
              associate: {
                connect: {
                  id: payload.associateId
                }
              }
            }
          : {}),
        roleAssignments: {
          create: additionalRoles.map((role) => ({ role }))
        }
      },
      include: {
        roleAssignments: {
          select: {
            role: true
          }
        }
      }
    });

    return reply.code(201).send({
      id: created.id,
      name: created.name,
      email: created.email,
      role: created.role,
      roles: resolveEffectiveRoles(
        created.role,
        created.roleAssignments.map((assignment) => assignment.role)
      ),
      associateId: created.associateId,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt
    });
  });

  app.patch("/auth/users/:id/roles", { preHandler: app.authorize(["ADMIN"]) }, async (request) => {
    const params = userIdParamsSchema.parse(request.params);
    const payload = updateUserRolesSchema.parse(request.body);
    const tenantId = request.user.tenantId ?? request.tenant?.id;

    if (!tenantId) {
      throw new Error("Informe o ambiente do cliente para alterar usuário.");
    }

    if (payload.roles.includes("SUPERADMIN")) {
      throw new Error("Superadmin so pode ser gerenciado no painel da plataforma.");
    }

    const roles = uniqueRoles(payload.roles);
    const primaryRole = roles[0] ?? "ATHLETE";
    const additionalRoles = roles.filter((role) => role !== primaryRole);

    const updated = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: params.id, tenantId, role: { not: "SUPERADMIN" } },
        data: {
          role: primaryRole
        }
      });

      await tx.userRoleAssignment.deleteMany({
        where: { userId: params.id }
      });

      if (additionalRoles.length > 0) {
        await tx.userRoleAssignment.createMany({
          data: additionalRoles.map((role) => ({ userId: params.id, role }))
        });
      }

      return tx.user.findUniqueOrThrow({
        where: { id: params.id, tenantId, role: { not: "SUPERADMIN" } },
        include: {
          roleAssignments: {
            select: {
              role: true
            }
          }
        }
      });
    });

    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      roles: resolveEffectiveRoles(
        updated.role,
        updated.roleAssignments.map((assignment) => assignment.role)
      ),
      updatedAt: updated.updatedAt
    };
  });

  app.patch("/auth/users/:id", { preHandler: app.authorize(["ADMIN"]) }, async (request) => {
    const params = userIdParamsSchema.parse(request.params);
    const payload = updateUserSchema.parse(request.body);
    const tenantId = request.user.tenantId ?? request.tenant?.id;

    if (!tenantId) {
      throw new Error("Informe o ambiente do cliente para alterar usuário.");
    }

    if (payload.roles?.includes("SUPERADMIN")) {
      throw new Error("Superadmin so pode ser gerenciado no painel da plataforma.");
    }

    const passwordHash = payload.password ? await bcrypt.hash(payload.password, 10) : undefined;
    const roles = payload.roles ? uniqueRoles(payload.roles) : undefined;
    const primaryRole = roles?.[0] || undefined;
    const additionalRoles = roles && primaryRole ? roles.filter((role) => role !== primaryRole) : undefined;

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: params.id, tenantId, role: { not: "SUPERADMIN" } },
        data: {
          ...(payload.name !== undefined ? { name: payload.name } : {}),
          ...(payload.email !== undefined ? { email: payload.email } : {}),
          ...(passwordHash ? { passwordHash } : {}),
          ...(primaryRole ? { role: primaryRole } : {}),
          ...(payload.associateId !== undefined ? { associateId: payload.associateId } : {})
        }
      });

      if (roles && additionalRoles) {
        await tx.userRoleAssignment.deleteMany({
          where: { userId: params.id }
        });

        if (additionalRoles.length > 0) {
          await tx.userRoleAssignment.createMany({
            data: additionalRoles.map((role) => ({ userId: params.id, role }))
          });
        }
      }
    });

    return serializeManagedUser(params.id, tenantId);
  });
}



