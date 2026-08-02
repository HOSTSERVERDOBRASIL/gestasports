import type { FastifyInstance } from "fastify";
import { JoinRequestStatus, AssociateStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";

const createJoinRequestSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(8).optional(),
  message: z.string().max(240).optional()
});

const updateRequestStatusSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"])
});

const updateSettingsSchema = z.object({
  groupName: z.string().trim().min(2).max(60).optional(),
  organizationType: z.string().trim().max(40).optional(),
  foundedAt: z.string().datetime().nullable().optional(),
  foundationYear: z.number().int().min(1800).max(2200).nullable().optional(),
  documentNumber: z.string().trim().max(40).nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  email: z.string().trim().email().max(160).nullable().optional().or(z.literal("")),
  websiteUrl: z.string().trim().max(240).nullable().optional(),
  address: z.string().trim().max(180).nullable().optional(),
  addressNumber: z.string().trim().max(30).nullable().optional(),
  neighborhood: z.string().trim().max(100).nullable().optional(),
  city: z.string().trim().max(100).nullable().optional(),
  state: z.string().trim().max(40).nullable().optional(),
  postalCode: z.string().trim().max(30).nullable().optional(),
  country: z.string().trim().max(80).nullable().optional(),
  history: z.string().trim().max(2_000).nullable().optional(),
  playersPerTeam: z.number().int().min(7).max(11).optional(),
  closedMode: z.boolean().optional(),
  blockDelinquentFromLineup: z.boolean().optional(),
  inviteCode: z.string().trim().min(4).max(40).nullable().optional(),
  uniform1Name: z.string().trim().min(2).max(60).optional(),
  uniform1Season: z.string().trim().max(30).nullable().optional(),
  uniform1Color: z.string().min(2).max(2_000).optional(),
  uniform1ImageUrl: z.string().max(2_000_000).nullable().optional(),
  uniform2Name: z.string().trim().min(2).max(60).optional(),
  uniform2Season: z.string().trim().max(30).nullable().optional(),
  uniform2Color: z.string().min(2).max(2_000).optional(),
  uniform2ImageUrl: z.string().max(2_000_000).nullable().optional()
});

function normalizeGroupSettings(settings: {
  foundedAt?: Date | string | null;
  uniform1Name: string;
  uniform1Color: string;
  uniform2Name: string;
  uniform2Color: string;
  [key: string]: unknown;
}) {
  return {
    ...settings,
    foundedAt: settings.foundedAt instanceof Date ? settings.foundedAt.toISOString() : settings.foundedAt ?? null,
    uniform1Name: settings.uniform1Name === "Uniforme 1" ? "Time A" : settings.uniform1Name,
    uniform1Color: settings.uniform1Color === "Vermelho" ? "#94a3b8" : settings.uniform1Color,
    uniform2Name: settings.uniform2Name === "Uniforme 2" ? "Time B" : settings.uniform2Name,
    uniform2Color: settings.uniform2Color === "Branco" ? "#cbd5e1" : settings.uniform2Color
  };
}

function seasonYearFromLabel(value: string | null | undefined) {
  const match = (value ?? "").match(/\d{4}/);
  return match ? Number(match[0]) : null;
}

async function recordUniformHistory(settings: {
  tenantId?: string | null;
  uniform1Name: string;
  uniform1Season?: string | null;
  uniform1Color: string;
  uniform1ImageUrl?: string | null;
  uniform2Name: string;
  uniform2Season?: string | null;
  uniform2Color: string;
  uniform2ImageUrl?: string | null;
}) {
  const currentYear = new Date().getFullYear();
  const uniforms = [
    {
      side: "TIME_A",
      seasonLabel: settings.uniform1Season?.trim() || String(currentYear),
      name: settings.uniform1Name,
      color: settings.uniform1Color,
      imageUrl: settings.uniform1ImageUrl || null
    },
    {
      side: "TIME_B",
      seasonLabel: settings.uniform2Season?.trim() || String(currentYear),
      name: settings.uniform2Name,
      color: settings.uniform2Color,
      imageUrl: settings.uniform2ImageUrl || null
    }
  ];

  for (const uniform of uniforms) {
    const data = {
      tenantId: settings.tenantId ?? null,
      side: uniform.side,
      seasonLabel: uniform.seasonLabel,
      seasonYear: seasonYearFromLabel(uniform.seasonLabel),
      name: uniform.name,
      color: uniform.color,
      imageUrl: uniform.imageUrl
    };

    if (settings.tenantId) {
      await prisma.uniformHistory.upsert({
        where: {
          tenantId_side_seasonLabel: {
            tenantId: settings.tenantId,
            side: uniform.side,
            seasonLabel: uniform.seasonLabel
          }
        },
        update: data,
        create: data
      });
      continue;
    }

    const existing = await prisma.uniformHistory.findFirst({
      where: { tenantId: null, side: uniform.side, seasonLabel: uniform.seasonLabel },
      select: { id: true }
    });
    if (existing) {
      await prisma.uniformHistory.update({ where: { id: existing.id }, data });
    } else {
      await prisma.uniformHistory.create({ data });
    }
  }
}

export async function groupRoutes(app: FastifyInstance) {
  app.get("/group/public", async () => {
    const settings = await prisma.groupSettings.findFirst({
      select: { groupName: true, closedMode: true }
    });

    return settings ?? { groupName: "GestaSports", closedMode: true };
  });

  app.post("/group/join-requests", { preHandler: app.authorize(["ATHLETE"]) }, async (request, reply) => {
    const payload = createJoinRequestSchema.parse(request.body);

    const inviterUser = await prisma.user.findUnique({
      where: { id: request.user.sub },
      select: {
        id: true,
        associateId: true,
        associate: {
          select: {
            id: true,
            status: true
          }
        }
      }
    });

    if (!inviterUser?.associateId || !inviterUser.associate) {
      return reply.status(403).send({
        message: "Apenas associado vinculado pode indicar convidado."
      });
    }

    if (inviterUser.associate.status !== AssociateStatus.ACTIVE) {
      return reply.status(403).send({
        message: "Somente associado ativo pode indicar convidado."
      });
    }

    const existingPending = await prisma.joinRequest.findFirst({
      where: { email: payload.email, status: JoinRequestStatus.PENDING }
    });

    if (existingPending) {
      return reply.status(409).send({
        message: "Já existe uma solicitação pendente para este convidado."
      });
    }

    const joinRequest = await prisma.joinRequest.create({
      data: {
        name: payload.name,
        email: payload.email,
        phone: payload.phone || null,
        message: payload.message || null,
        invitedByAssociateId: inviterUser.associate.id,
        invitedByUserId: inviterUser.id
      }
    });

    return reply.code(201).send(joinRequest);
  });

  app.get("/group/my-join-requests", { preHandler: app.authorize(["ATHLETE"]) }, async (request) => {
    return prisma.joinRequest.findMany({
      where: { invitedByUserId: request.user.sub },
      orderBy: { createdAt: "desc" },
      take: 100
    });
  });

  app.get("/group/join-requests", { preHandler: app.authorize(["ADMIN", "FINANCIAL"]) }, async () => {
    return prisma.joinRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        invitedByAssociate: {
          select: { name: true }
        }
      }
    });
  });

  app.patch(
    "/group/join-requests/:id/status",
    { preHandler: app.authorize(["ADMIN", "FINANCIAL"]) },
    async (request, reply) => {
      const params = z.object({ id: z.string().cuid() }).parse(request.params);
      const payload = updateRequestStatusSchema.parse(request.body);

      const updated = await prisma.$transaction(async (tx) => {
        const requestRow = await tx.joinRequest.update({
          where: { id: params.id },
          data: {
            status: payload.status,
            reviewedAt: new Date()
          }
        });

        if (payload.status === "APPROVED") {
          const existingAssociate = await tx.associate.findFirst({ where: { email: requestRow.email } });
          if (existingAssociate) {
            await tx.associate.update({
              where: { id: existingAssociate.id },
              data: {
                name: requestRow.name,
                phone: requestRow.phone || null,
                status: AssociateStatus.ACTIVE
              }
            });
          } else {
            await tx.associate.create({
              data: {
              name: requestRow.name,
              email: requestRow.email,
              phone: requestRow.phone || null,
              status: AssociateStatus.ACTIVE,
              monthlyFeeCents: 6000
              }
            });
          }
        }

        return requestRow;
      });

      return reply.send(updated);
    }
  );

  app.get("/group/settings", { preHandler: app.authorize(["ADMIN"]) }, async () => {
    const settings = await prisma.groupSettings.findFirst();

    if (!settings) {
      return {
        id: "main",
        groupName: "GestaSports",
        organizationType: "ASSOCIACAO",
        foundedAt: null,
        foundationYear: null,
        documentNumber: null,
        phone: null,
        email: null,
        websiteUrl: null,
        address: null,
        addressNumber: null,
        neighborhood: null,
        city: null,
        state: null,
        postalCode: null,
        country: "Brasil",
        history: null,
        playersPerTeam: 11,
        closedMode: true,
        blockDelinquentFromLineup: false,
        inviteCode: null,
        uniform1Name: "Time A",
        uniform1Season: null,
        uniform1Color: "#94a3b8",
        uniform1ImageUrl: null,
        uniform2Name: "Time B",
        uniform2Season: null,
        uniform2Color: "#cbd5e1",
        uniform2ImageUrl: null
      };
    }

    return normalizeGroupSettings(settings);
  });

  app.patch("/group/settings", { preHandler: app.authorize(["ADMIN"]) }, async (request) => {
    const payload = updateSettingsSchema.parse(request.body);

    const existing = await prisma.groupSettings.findFirst();
    if (existing) {
      const updated = await prisma.groupSettings.update({
        where: { id: existing.id },
        data: {
        ...(payload.groupName !== undefined ? { groupName: payload.groupName } : {}),
        ...(payload.organizationType !== undefined ? { organizationType: payload.organizationType || "ASSOCIACAO" } : {}),
        ...(payload.foundedAt !== undefined ? { foundedAt: payload.foundedAt ? new Date(payload.foundedAt) : null } : {}),
        ...(payload.foundationYear !== undefined ? { foundationYear: payload.foundationYear } : {}),
        ...(payload.documentNumber !== undefined ? { documentNumber: payload.documentNumber || null } : {}),
        ...(payload.phone !== undefined ? { phone: payload.phone || null } : {}),
        ...(payload.email !== undefined ? { email: payload.email || null } : {}),
        ...(payload.websiteUrl !== undefined ? { websiteUrl: payload.websiteUrl || null } : {}),
        ...(payload.address !== undefined ? { address: payload.address || null } : {}),
        ...(payload.addressNumber !== undefined ? { addressNumber: payload.addressNumber || null } : {}),
        ...(payload.neighborhood !== undefined ? { neighborhood: payload.neighborhood || null } : {}),
        ...(payload.city !== undefined ? { city: payload.city || null } : {}),
        ...(payload.state !== undefined ? { state: payload.state || null } : {}),
        ...(payload.postalCode !== undefined ? { postalCode: payload.postalCode || null } : {}),
        ...(payload.country !== undefined ? { country: payload.country || "Brasil" } : {}),
        ...(payload.history !== undefined ? { history: payload.history || null } : {}),
        ...(payload.playersPerTeam !== undefined ? { playersPerTeam: payload.playersPerTeam } : {}),
        ...(payload.closedMode !== undefined ? { closedMode: payload.closedMode } : {}),
        ...(payload.blockDelinquentFromLineup !== undefined ? { blockDelinquentFromLineup: payload.blockDelinquentFromLineup } : {}),
        ...(payload.inviteCode !== undefined ? { inviteCode: payload.inviteCode } : {}),
        ...(payload.uniform1Name !== undefined ? { uniform1Name: payload.uniform1Name } : {}),
        ...(payload.uniform1Season !== undefined ? { uniform1Season: payload.uniform1Season } : {}),
        ...(payload.uniform1Color !== undefined ? { uniform1Color: payload.uniform1Color } : {}),
        ...(payload.uniform1ImageUrl !== undefined ? { uniform1ImageUrl: payload.uniform1ImageUrl } : {}),
        ...(payload.uniform2Name !== undefined ? { uniform2Name: payload.uniform2Name } : {}),
        ...(payload.uniform2Season !== undefined ? { uniform2Season: payload.uniform2Season } : {}),
        ...(payload.uniform2Color !== undefined ? { uniform2Color: payload.uniform2Color } : {}),
          ...(payload.uniform2ImageUrl !== undefined ? { uniform2ImageUrl: payload.uniform2ImageUrl } : {})
        }
      });

      await recordUniformHistory(updated);
      return normalizeGroupSettings(updated);
    }

    const created = await prisma.groupSettings.create({
      data: {
        id: "main",
        groupName: payload.groupName ?? "GestaSports",
        organizationType: payload.organizationType || "ASSOCIACAO",
        foundedAt: payload.foundedAt ? new Date(payload.foundedAt) : null,
        foundationYear: payload.foundationYear ?? null,
        documentNumber: payload.documentNumber || null,
        phone: payload.phone || null,
        email: payload.email || null,
        websiteUrl: payload.websiteUrl || null,
        address: payload.address || null,
        addressNumber: payload.addressNumber || null,
        neighborhood: payload.neighborhood || null,
        city: payload.city || null,
        state: payload.state || null,
        postalCode: payload.postalCode || null,
        country: payload.country || "Brasil",
        history: payload.history || null,
        playersPerTeam: payload.playersPerTeam ?? 11,
        closedMode: payload.closedMode ?? true,
        blockDelinquentFromLineup: payload.blockDelinquentFromLineup ?? false,
        inviteCode: payload.inviteCode || null,
        uniform1Name: payload.uniform1Name ?? "Time A",
        uniform1Season: payload.uniform1Season || null,
        uniform1Color: payload.uniform1Color ?? "#94a3b8",
        uniform1ImageUrl: payload.uniform1ImageUrl || null,
        uniform2Name: payload.uniform2Name ?? "Time B",
        uniform2Season: payload.uniform2Season || null,
        uniform2Color: payload.uniform2Color ?? "#cbd5e1",
        uniform2ImageUrl: payload.uniform2ImageUrl || null
      }
    });

    await recordUniformHistory(created);
    return normalizeGroupSettings(created);
  });
}
