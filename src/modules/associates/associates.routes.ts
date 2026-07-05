import type { FastifyInstance } from "fastify";
import { PaymentStatus, UserRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { dueDateForCompetence, prorataFeeForJoinDate } from "../../lib/finance.utils.js";
import { getPaymentSettings } from "../finance/finance.routes.js";

const createAssociateSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional(),
  phone: z.string().min(8).optional(),
  monthlyFeeCents: z.number().int().positive().default(6000),
  boardRoleId: z.string().min(1).optional().or(z.literal("")),
  joinDate: z.string().date().optional()
});

const associateParamsSchema = z.object({
  id: z.string().cuid()
});

const associatesQuerySchema = z.object({
  status: z.enum(["ACTIVE", "LATE", "INACTIVE"]).optional()
});

const updateAssociateSchema = createAssociateSchema.partial().extend({
  status: z.enum(["ACTIVE", "LATE", "INACTIVE"]).optional()
});

const boardRoleSchema = z.object({
  name: z.string().min(2),
  description: z.string().max(300).optional().or(z.literal("")),
  canAccessAdmin: z.boolean().default(false),
  canAccessFinancial: z.boolean().default(false),
  canAccessAthlete: z.boolean().default(false),
  isDefault: z.boolean().default(false)
});

const boardRoleParamsSchema = z.object({
  id: z.string().min(1)
});

export async function associateRoutes(app: FastifyInstance) {
  app.get("/associates/me/summary", { preHandler: app.authorize(["ASSOCIATE", "ATHLETE"]) }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user.sub },
      include: {
        associate: {
          include: {
            payments: { orderBy: [{ year: "desc" }, { month: "desc" }], take: 18 }
          }
        }
      }
    });

    if (!user?.associate) {
      return reply.status(404).send({ message: "Usuário sem vínculo de associado." });
    }

    const payments = user.associate.payments;
    return {
      associate: {
        id: user.associate.id,
        name: user.associate.name,
        status: user.associate.status,
        monthlyFeeCents: user.associate.monthlyFeeCents,
        createdAt: user.associate.createdAt.toISOString()
      },
      payments: payments.map((payment) => ({
        ...payment,
        dueDate: payment.dueDate.toISOString(),
        paidAt: payment.paidAt?.toISOString() ?? null
      })),
      totals: {
        paidCents: payments.filter((payment) => payment.status === "PAID").reduce((total, payment) => total + payment.amountCents, 0),
        pendingCents: payments.filter((payment) => payment.status === "PENDING" || payment.status === "LATE").reduce((total, payment) => total + payment.amountCents, 0),
        lateCount: payments.filter((payment) => payment.status === "LATE").length
      }
    };
  });

  app.get("/associates", { preHandler: app.authenticate }, async (request) => {
    const query = associatesQuerySchema.parse(request.query);

    const associates = await prisma.associate.findMany({
      where: {
        ...(query.status ? { status: query.status } : {})
      },
      orderBy: { createdAt: "desc" },
      take: 500,
      include: {
        athlete: {
          select: {
            id: true,
            position: true,
            status: true,
            rating: true
          }
        },
        boardRole: {
          select: {
            id: true,
            name: true,
            description: true,
            canAccessAdmin: true,
            canAccessFinancial: true,
            canAccessAthlete: true,
            isDefault: true
          }
        }
      }
    });

    return associates;
  });

  app.post("/associates", { preHandler: app.authorize(["ADMIN", "FINANCIAL"]) }, async (request, reply) => {
    const payload = createAssociateSchema.parse(request.body);
    const joinDate = payload.joinDate ? new Date(`${payload.joinDate}T00:00:00.000Z`) : new Date();

    const associate = await prisma.associate.create({
      data: {
        name: payload.name,
        monthlyFeeCents: payload.monthlyFeeCents,
        email: payload.email || null,
        phone: payload.phone || null,
        boardRoleId: payload.boardRoleId || (await defaultBoardRoleId()),
        joinedAt: joinDate
      }
    });

    const prorata = prorataFeeForJoinDate(joinDate, payload.monthlyFeeCents);
    const { monthlyDueDay } = await getPaymentSettings();
    await prisma.payment.create({
      data: {
        associateId: associate.id,
        month: prorata.month,
        year: prorata.year,
        amountCents: prorata.prorataFeeCents,
        dueDate: dueDateForCompetence(prorata.month, prorata.year, monthlyDueDay),
        status: PaymentStatus.PENDING,
        isProrata: prorata.isProrata
      }
    });

    return reply.code(201).send({ ...associate, prorataApplied: prorata.isProrata, prorataFeeCents: prorata.prorataFeeCents });
  });

  app.patch("/associates/:id", { preHandler: app.authorize(["ADMIN", "FINANCIAL"]) }, async (request) => {
    const { id } = associateParamsSchema.parse(request.params);
    const payload = updateAssociateSchema.parse(request.body);

    const updated = await prisma.associate.update({
      where: { id },
      data: {
        ...(payload.name !== undefined ? { name: payload.name } : {}),
        ...(payload.email !== undefined ? { email: payload.email || null } : {}),
        ...(payload.phone !== undefined ? { phone: payload.phone || null } : {}),
        ...(payload.monthlyFeeCents !== undefined ? { monthlyFeeCents: payload.monthlyFeeCents } : {}),
        ...(payload.boardRoleId !== undefined ? { boardRoleId: payload.boardRoleId || null } : {}),
        ...(payload.status !== undefined ? { status: payload.status } : {})
      }
    });

    if (payload.boardRoleId !== undefined) {
      await applyBoardRoleAccessToLinkedUser(updated.id, payload.boardRoleId || null);
      await recordBoardMemberTerm(updated.id, payload.boardRoleId || null);
    }

    return updated;
  });

  app.delete("/associates/:id", { preHandler: app.authorize(["ADMIN", "FINANCIAL"]) }, async (request, reply) => {
    const { id } = associateParamsSchema.parse(request.params);
    await prisma.associate.delete({ where: { id } });
    return reply.status(204).send();
  });

  app.get("/board-roles", { preHandler: app.authorize(["ADMIN", "FINANCIAL"]) }, async () => {
    return prisma.boardRole.findMany({
      orderBy: [{ isDefault: "desc" }, { name: "asc" }]
    });
  });

  app.post("/board-roles", { preHandler: app.authorize(["ADMIN"]) }, async (request, reply) => {
    const payload = boardRoleSchema.parse(request.body);
    const role = await prisma.boardRole.create({
      data: {
        name: payload.name,
        description: payload.description || null,
        canAccessAdmin: payload.canAccessAdmin,
        canAccessFinancial: payload.canAccessFinancial,
        canAccessAthlete: payload.canAccessAthlete,
        isDefault: payload.isDefault
      }
    });

    return reply.code(201).send(role);
  });

  app.patch("/board-roles/:id", { preHandler: app.authorize(["ADMIN"]) }, async (request) => {
    const { id } = boardRoleParamsSchema.parse(request.params);
    const payload = boardRoleSchema.partial().parse(request.body);

    const updated = await prisma.boardRole.update({
      where: { id },
      data: {
        ...(payload.name !== undefined ? { name: payload.name } : {}),
        ...(payload.description !== undefined ? { description: payload.description || null } : {}),
        ...(payload.canAccessAdmin !== undefined ? { canAccessAdmin: payload.canAccessAdmin } : {}),
        ...(payload.canAccessFinancial !== undefined ? { canAccessFinancial: payload.canAccessFinancial } : {}),
        ...(payload.canAccessAthlete !== undefined ? { canAccessAthlete: payload.canAccessAthlete } : {}),
        ...(payload.isDefault !== undefined ? { isDefault: payload.isDefault } : {})
      }
    });

    const linkedAssociates = await prisma.associate.findMany({
      where: { boardRoleId: updated.id },
      select: { id: true }
    });
    await Promise.all(linkedAssociates.map((associate) => applyBoardRoleAccessToLinkedUser(associate.id, updated.id)));

    return updated;
  });

  app.delete("/board-roles/:id", { preHandler: app.authorize(["ADMIN"]) }, async (request, reply) => {
    const { id } = boardRoleParamsSchema.parse(request.params);
    await prisma.boardRole.delete({ where: { id } });
    return reply.status(204).send();
  });
}

async function defaultBoardRoleId() {
  const defaultRole = await prisma.boardRole.findFirst({
    where: { isDefault: true },
    select: { id: true }
  });

  return defaultRole?.id || null;
}

async function applyBoardRoleAccessToLinkedUser(associateId: string, boardRoleId: string | null) {
  const user = await prisma.user.findUnique({
    where: { associateId },
    select: { id: true }
  });

  if (!user || !boardRoleId) {
    return;
  }

  const boardRole = await prisma.boardRole.findUnique({ where: { id: boardRoleId } });
  if (!boardRole) {
    return;
  }

  const roles = [
    ...(boardRole.canAccessAdmin ? [UserRole.ADMIN] : []),
    ...(boardRole.canAccessFinancial ? [UserRole.FINANCIAL] : []),
    ...(boardRole.canAccessAthlete ? [UserRole.ATHLETE] : [])
  ];
  const normalizedRoles = roles.length > 0 ? roles : [UserRole.ATHLETE];
  const primaryRole = normalizedRoles[0] ?? UserRole.ATHLETE;
  const additionalRoles = normalizedRoles.filter((role) => role !== primaryRole);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { role: primaryRole }
    }),
    prisma.userRoleAssignment.deleteMany({ where: { userId: user.id } }),
    ...(additionalRoles.length > 0 ?
       [
          prisma.userRoleAssignment.createMany({
            data: additionalRoles.map((role) => ({ userId: user.id, role })),
            skipDuplicates: true
          })
        ]
      : [])
  ]);
}

async function recordBoardMemberTerm(associateId: string, boardRoleId: string | null) {
  const year = new Date().getFullYear();

  await prisma.boardMemberTerm.updateMany({
    where: {
      associateId,
      endedYear: null,
      ...(boardRoleId ? { boardRoleId: { not: boardRoleId } } : {})
    },
    data: { endedYear: year }
  });

  if (!boardRoleId) {
    return;
  }

  const existing = await prisma.boardMemberTerm.findFirst({
    where: { associateId, boardRoleId, endedYear: null }
  });

  if (existing) {
    return;
  }

  const associate = await prisma.associate.findUnique({
    where: { id: associateId },
    select: { tenantId: true }
  });

  await prisma.boardMemberTerm.create({
    data: {
      tenantId: associate?.tenantId ?? null,
      associateId,
      boardRoleId,
      startedYear: year
    }
  });
}
