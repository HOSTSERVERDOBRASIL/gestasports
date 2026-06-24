import type { FastifyInstance, FastifyReply } from "fastify";
import { ArchiveAttachmentType, ArchiveItemStatus, ArchiveItemType, Prisma, TenantModuleCode } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";

const optionalText = (max = 500) => z.string().trim().max(max).optional().nullable().or(z.literal(""));

const attachmentSchema = z.object({
  type: z.nativeEnum(ArchiveAttachmentType).default(ArchiveAttachmentType.OTHER),
  title: optionalText(160),
  url: z.string().trim().min(1).max(2_500_000),
  mimeType: optionalText(120),
  sizeBytes: z.number().int().min(0).optional().nullable()
});

const archiveItemSchema = z.object({
  type: z.nativeEnum(ArchiveItemType),
  status: z.nativeEnum(ArchiveItemStatus).default(ArchiveItemStatus.PUBLISHED),
  title: z.string().trim().min(2).max(180),
  subtitle: optionalText(220),
  description: optionalText(4000),
  year: z.number().int().min(1800).max(2200).optional().nullable(),
  occurredAt: z.string().datetime().optional().nullable().or(z.literal("")),
  category: optionalText(120),
  tags: z.array(z.string().trim().min(1).max(48)).max(24).default([]),
  coverImageUrl: optionalText(2_500_000),
  externalUrl: optionalText(2_500_000),
  location: optionalText(180),
  periodLabel: optionalText(120),
  personName: optionalText(160),
  personRole: optionalText(120),
  competition: optionalText(180),
  resultLabel: optionalText(120),
  scoreLabel: optionalText(120),
  assetCode: optionalText(80),
  assetCondition: optionalText(80),
  documentNumber: optionalText(120),
  visibility: z.string().trim().min(2).max(40).default("PUBLIC"),
  linkedEntityType: optionalText(80),
  linkedEntityId: optionalText(80),
  metadata: z.record(z.unknown()).optional().nullable(),
  attachments: z.array(attachmentSchema).max(20).default([])
});

const archiveItemUpdateSchema = archiveItemSchema.partial();

const archiveQuerySchema = z.object({
  type: z.nativeEnum(ArchiveItemType).optional(),
  status: z.nativeEnum(ArchiveItemStatus).optional(),
  year: z.coerce.number().int().min(1800).max(2200).optional(),
  category: z.string().trim().max(120).optional(),
  search: z.string().trim().max(120).optional(),
  linkedEntityType: z.string().trim().max(80).optional(),
  linkedEntityId: z.string().trim().max(80).optional()
});

const idParamsSchema = z.object({ id: z.string().cuid() });
const attachmentParamsSchema = z.object({ id: z.string().cuid(), attachmentId: z.string().cuid() });
const memorialCategoryParamsSchema = z.object({ slug: z.string().trim().min(2).max(80) });
const memorialCategorySchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  description: optionalText(500),
  archiveType: z.nativeEnum(ArchiveItemType).default(ArchiveItemType.DOCUMENT),
  icon: z.string().trim().min(2).max(60).default("Archive"),
  enabled: z.boolean().default(true),
  showInDashboard: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(999).default(0)
});

type MemorialCategoryRow = {
  id: string;
  tenantId: string;
  slug: string;
  name: string;
  description: string | null;
  archiveType: ArchiveItemType;
  icon: string;
  enabled: boolean;
  showInDashboard: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

function publicArchiveWhere(query: z.infer<typeof archiveQuerySchema>) {
  return {
    ...whereForQuery(query),
    status: ArchiveItemStatus.PUBLISHED,
    visibility: "PUBLIC"
  };
}
const archiveModuleByType: Record<ArchiveItemType, TenantModuleCode> = {
  DASHBOARD: TenantModuleCode.DOCUMENTS,
  GAME: TenantModuleCode.GAMES,
  ATHLETE: TenantModuleCode.ATHLETES,
  DIRECTOR: TenantModuleCode.ASSOCIATES,
  TITLE: TenantModuleCode.DOCUMENTS,
  MATCH_REPORT: TenantModuleCode.DOCUMENTS,
  TIMELINE: TenantModuleCode.DOCUMENTS,
  SHIRT: TenantModuleCode.GALLERY,
  GALLERY: TenantModuleCode.GALLERY,
  DOCUMENT: TenantModuleCode.DOCUMENTS,
  AWARD: TenantModuleCode.DOCUMENTS,
  ASSET: TenantModuleCode.DOCUMENTS,
  HALL_OF_FAME: TenantModuleCode.DOCUMENTS
};

function cleanText(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";
  return normalized ? normalized : null;
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function serializeMemorialCategory(category: MemorialCategoryRow) {
  return {
    ...category,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString()
  };
}

async function tenantHasModule(tenantId: string, code: TenantModuleCode) {
  const module = await prisma.tenantModule.findFirst({
    where: { tenantId, code, enabled: true },
    select: { id: true }
  });

  return Boolean(module);
}

function serializeArchiveItem(item: {
  occurredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  attachments?: Array<{ createdAt: Date; [key: string]: unknown }>;
  [key: string]: unknown;
}) {
  return {
    ...item,
    occurredAt: item.occurredAt?.toISOString() ?? null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    attachments: (item.attachments ?? []).map((attachment) => ({
      ...attachment,
      createdAt: attachment.createdAt.toISOString()
    }))
  };
}

function whereForQuery(query: z.infer<typeof archiveQuerySchema>) {
  return {
    ...(query.type ? { type: query.type } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.year !== undefined ? { year: query.year } : {}),
    ...(query.category ? { category: { contains: query.category, mode: "insensitive" as const } } : {}),
    ...(query.linkedEntityType ? { linkedEntityType: query.linkedEntityType } : {}),
    ...(query.linkedEntityId ? { linkedEntityId: query.linkedEntityId } : {}),
    ...(query.search
      ? {
          OR: [
            { title: { contains: query.search, mode: "insensitive" as const } },
            { subtitle: { contains: query.search, mode: "insensitive" as const } },
            { description: { contains: query.search, mode: "insensitive" as const } },
            { category: { contains: query.search, mode: "insensitive" as const } },
            { personName: { contains: query.search, mode: "insensitive" as const } },
            { competition: { contains: query.search, mode: "insensitive" as const } }
          ]
        }
      : {})
  };
}

function dataFromPayload(payload: z.infer<typeof archiveItemSchema>) {
  return {
    type: payload.type,
    status: payload.status,
    title: payload.title,
    subtitle: cleanText(payload.subtitle),
    description: cleanText(payload.description),
    year: payload.year ?? null,
    occurredAt: payload.occurredAt ? new Date(payload.occurredAt) : null,
    category: cleanText(payload.category),
    tags: payload.tags,
    coverImageUrl: cleanText(payload.coverImageUrl),
    externalUrl: cleanText(payload.externalUrl),
    location: cleanText(payload.location),
    periodLabel: cleanText(payload.periodLabel),
    personName: cleanText(payload.personName),
    personRole: cleanText(payload.personRole),
    competition: cleanText(payload.competition),
    resultLabel: cleanText(payload.resultLabel),
    scoreLabel: cleanText(payload.scoreLabel),
    assetCode: cleanText(payload.assetCode),
    assetCondition: cleanText(payload.assetCondition),
    documentNumber: cleanText(payload.documentNumber),
    visibility: payload.visibility,
    linkedEntityType: cleanText(payload.linkedEntityType),
    linkedEntityId: cleanText(payload.linkedEntityId),
    ...(payload.metadata ? { metadata: payload.metadata as Prisma.InputJsonObject } : {})
  };
}

export async function archiveRoutes(app: FastifyInstance) {
  function ensurePublicTenant(reply: FastifyReply) {
    const tenantId = reply.request.tenant?.id;
    if (!tenantId) {
      reply.status(400).send({ message: "Ambiente do clube nao identificado para acessar o acervo publico." });
      return false;
    }

    return true;
  }

  async function ensureArchiveAccess(reply: FastifyReply, type: ArchiveItemType) {
    const tenantId = reply.request.tenant?.id;
    if (!tenantId) {
      reply.status(400).send({ message: "Ambiente do clube nÃ£o identificado para acessar o acervo." });
      return false;
    }

    const moduleCode = archiveModuleByType[type];
    if (!(await tenantHasModule(tenantId, moduleCode))) {
      reply.status(403).send({ message: "Modulo do acervo nao habilitado para este plano." });
      return false;
    }

    return true;
  }

  app.get("/public/archive-items", async (request, reply) => {
    const query = archiveQuerySchema.parse(request.query);
    if (!ensurePublicTenant(reply)) {
      return;
    }

    const items = await prisma.archiveItem.findMany({
      where: publicArchiveWhere(query),
      include: { attachments: { orderBy: { createdAt: "desc" } } },
      orderBy: [{ year: "desc" }, { occurredAt: "desc" }, { createdAt: "desc" }],
      take: 500
    });

    return items.map(serializeArchiveItem);
  });

  app.get("/public/archive-items/:id", async (request, reply) => {
    const { id } = idParamsSchema.parse(request.params);
    if (!ensurePublicTenant(reply)) {
      return;
    }

    const item = await prisma.archiveItem.findFirst({
      where: {
        id,
        status: ArchiveItemStatus.PUBLISHED,
        visibility: "PUBLIC"
      },
      include: { attachments: { orderBy: { createdAt: "desc" } } }
    });
    if (!item) {
      return reply.status(404).send({ message: "Registro publico do acervo nao encontrado." });
    }

    return serializeArchiveItem(item);
  });

  app.get("/public/memorial-categories", async (_request, reply) => {
    const tenantId = reply.request.tenant?.id;
    if (!tenantId) {
      return reply.status(400).send({ message: "Ambiente do clube nao identificado para acessar categorias publicas." });
    }

    const categories = await prisma.$queryRaw<MemorialCategoryRow[]>`
      SELECT *
      FROM "MemorialCategory"
      WHERE "tenantId" = ${tenantId} AND "enabled" = true
      ORDER BY "sortOrder" ASC, "name" ASC
    `;

    return categories.map(serializeMemorialCategory);
  });

  app.get("/memorial-categories", { preHandler: app.authorize(["ADMIN", "FINANCIAL"]) }, async (_request, reply) => {
    const tenantId = reply.request.tenant?.id;
    if (!tenantId) {
      return reply.status(400).send({ message: "Ambiente do clube nao identificado para acessar categorias do memorial." });
    }

    const categories = await prisma.$queryRaw<MemorialCategoryRow[]>`
      SELECT *
      FROM "MemorialCategory"
      WHERE "tenantId" = ${tenantId}
      ORDER BY "sortOrder" ASC, "name" ASC
    `;

    return categories.map(serializeMemorialCategory);
  });

  app.post("/memorial-categories", { preHandler: app.authorize(["ADMIN"]) }, async (request, reply) => {
    const tenantId = request.tenant?.id;
    if (!tenantId) {
      return reply.status(400).send({ message: "Ambiente do clube nao identificado para criar categoria do memorial." });
    }

    const payload = memorialCategorySchema.parse(request.body);
    const slug = payload.slug ?? slugify(payload.name);
    const id = randomUUID();
    const [category] = await prisma.$queryRaw<MemorialCategoryRow[]>`
      INSERT INTO "MemorialCategory" ("id", "tenantId", "slug", "name", "description", "archiveType", "icon", "enabled", "showInDashboard", "sortOrder", "createdAt", "updatedAt")
      VALUES (${id}, ${tenantId}, ${slug}, ${payload.name}, ${cleanText(payload.description)}, ${payload.archiveType}::"ArchiveItemType", ${payload.icon}, ${payload.enabled}, ${payload.showInDashboard}, ${payload.sortOrder}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;
    if (!category) {
      return reply.status(500).send({ message: "Nao foi possivel criar a categoria do memorial." });
    }

    return reply.code(201).send(serializeMemorialCategory(category));
  });

  app.patch("/memorial-categories/:slug", { preHandler: app.authorize(["ADMIN"]) }, async (request, reply) => {
    const tenantId = request.tenant?.id;
    if (!tenantId) {
      return reply.status(400).send({ message: "Ambiente do clube nao identificado para atualizar categoria do memorial." });
    }

    const params = memorialCategoryParamsSchema.parse(request.params);
    const payload = memorialCategorySchema.partial().parse(request.body);
    const nextSlug = payload.slug ?? params.slug;
    const shouldUpdateDescription = payload.description !== undefined;
    const nextDescription = shouldUpdateDescription ? cleanText(payload.description) : null;
    const [category] = await prisma.$queryRaw<MemorialCategoryRow[]>`
      UPDATE "MemorialCategory"
      SET
        "slug" = ${nextSlug},
        "name" = COALESCE(${payload.name ?? null}, "name"),
        "description" = CASE WHEN ${shouldUpdateDescription} THEN ${nextDescription} ELSE "description" END,
        "archiveType" = COALESCE(${payload.archiveType ?? null}::"ArchiveItemType", "archiveType"),
        "icon" = COALESCE(${payload.icon ?? null}, "icon"),
        "enabled" = COALESCE(${payload.enabled ?? null}, "enabled"),
        "showInDashboard" = COALESCE(${payload.showInDashboard ?? null}, "showInDashboard"),
        "sortOrder" = COALESCE(${payload.sortOrder ?? null}, "sortOrder"),
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE "tenantId" = ${tenantId} AND "slug" = ${params.slug}
      RETURNING *
    `;

    if (!category) {
      return reply.status(404).send({ message: "Categoria do memorial nao encontrada." });
    }

    return serializeMemorialCategory(category);
  });

  app.get("/archive-items", { preHandler: app.authorize(["ADMIN", "FINANCIAL"]) }, async (request, reply) => {
    const query = archiveQuerySchema.parse(request.query);
    if (!(await ensureArchiveAccess(reply, query.type ?? ArchiveItemType.DASHBOARD))) {
      return;
    }

    const items = await prisma.archiveItem.findMany({
      where: whereForQuery(query),
      include: { attachments: { orderBy: { createdAt: "desc" } } },
      orderBy: [{ year: "desc" }, { occurredAt: "desc" }, { createdAt: "desc" }],
      take: 500
    });

    return items.map(serializeArchiveItem);
  });

  app.get("/archive-items/:id", { preHandler: app.authorize(["ADMIN", "FINANCIAL"]) }, async (request, reply) => {
    const { id } = idParamsSchema.parse(request.params);
    const item = await prisma.archiveItem.findFirstOrThrow({
      where: { id },
      include: { attachments: { orderBy: { createdAt: "desc" } } }
    });
    if (!(await ensureArchiveAccess(reply, item.type))) {
      return;
    }

    return serializeArchiveItem(item);
  });

  app.post("/archive-items", { preHandler: app.authorize(["ADMIN"]) }, async (request, reply) => {
    const tenantId = request.tenant?.id;
    if (!tenantId) {
      return reply.status(400).send({ message: "Ambiente do clube nÃ£o identificado para cadastrar item do acervo." });
    }

    const payload = archiveItemSchema.parse(request.body);
    if (!(await ensureArchiveAccess(reply, payload.type))) {
      return;
    }

    const item = await prisma.archiveItem.create({
      data: {
        ...dataFromPayload(payload),
        createdById: request.user.sub,
        attachments: {
          create: payload.attachments.map((attachment) => ({
            tenantId,
            type: attachment.type,
            title: cleanText(attachment.title),
            url: attachment.url,
            mimeType: cleanText(attachment.mimeType),
            sizeBytes: attachment.sizeBytes ?? null
          }))
        }
      },
      include: { attachments: { orderBy: { createdAt: "desc" } } }
    });

    return reply.code(201).send(serializeArchiveItem(item));
  });

  app.patch("/archive-items/:id", { preHandler: app.authorize(["ADMIN"]) }, async (request, reply) => {
    const { id } = idParamsSchema.parse(request.params);
    const payload = archiveItemUpdateSchema.parse(request.body);
    const current = await prisma.archiveItem.findFirstOrThrow({
      where: { id },
      select: { type: true }
    });
    if (!(await ensureArchiveAccess(reply, payload.type ?? current.type))) {
      return;
    }

    const item = await prisma.archiveItem.update({
      where: { id },
      data: {
        ...(payload.type !== undefined ? { type: payload.type } : {}),
        ...(payload.status !== undefined ? { status: payload.status } : {}),
        ...(payload.title !== undefined ? { title: payload.title } : {}),
        ...(payload.subtitle !== undefined ? { subtitle: cleanText(payload.subtitle) } : {}),
        ...(payload.description !== undefined ? { description: cleanText(payload.description) } : {}),
        ...(payload.year !== undefined ? { year: payload.year ?? null } : {}),
        ...(payload.occurredAt !== undefined ? { occurredAt: payload.occurredAt ? new Date(payload.occurredAt) : null } : {}),
        ...(payload.category !== undefined ? { category: cleanText(payload.category) } : {}),
        ...(payload.tags !== undefined ? { tags: payload.tags } : {}),
        ...(payload.coverImageUrl !== undefined ? { coverImageUrl: cleanText(payload.coverImageUrl) } : {}),
        ...(payload.externalUrl !== undefined ? { externalUrl: cleanText(payload.externalUrl) } : {}),
        ...(payload.location !== undefined ? { location: cleanText(payload.location) } : {}),
        ...(payload.periodLabel !== undefined ? { periodLabel: cleanText(payload.periodLabel) } : {}),
        ...(payload.personName !== undefined ? { personName: cleanText(payload.personName) } : {}),
        ...(payload.personRole !== undefined ? { personRole: cleanText(payload.personRole) } : {}),
        ...(payload.competition !== undefined ? { competition: cleanText(payload.competition) } : {}),
        ...(payload.resultLabel !== undefined ? { resultLabel: cleanText(payload.resultLabel) } : {}),
        ...(payload.scoreLabel !== undefined ? { scoreLabel: cleanText(payload.scoreLabel) } : {}),
        ...(payload.assetCode !== undefined ? { assetCode: cleanText(payload.assetCode) } : {}),
        ...(payload.assetCondition !== undefined ? { assetCondition: cleanText(payload.assetCondition) } : {}),
        ...(payload.documentNumber !== undefined ? { documentNumber: cleanText(payload.documentNumber) } : {}),
        ...(payload.visibility !== undefined ? { visibility: payload.visibility } : {}),
        ...(payload.linkedEntityType !== undefined ? { linkedEntityType: cleanText(payload.linkedEntityType) } : {}),
        ...(payload.linkedEntityId !== undefined ? { linkedEntityId: cleanText(payload.linkedEntityId) } : {}),
        ...(payload.metadata !== undefined ? { metadata: payload.metadata ? (payload.metadata as Prisma.InputJsonObject) : Prisma.JsonNull } : {})
      },
      include: { attachments: { orderBy: { createdAt: "desc" } } }
    });

    return serializeArchiveItem(item);
  });

  app.delete("/archive-items/:id", { preHandler: app.authorize(["ADMIN"]) }, async (request, reply) => {
    const { id } = idParamsSchema.parse(request.params);
    const item = await prisma.archiveItem.findFirstOrThrow({
      where: { id },
      select: { type: true }
    });
    if (!(await ensureArchiveAccess(reply, item.type))) {
      return;
    }

    await prisma.archiveItem.delete({ where: { id } });
    return reply.status(204).send();
  });

  app.post("/archive-items/:id/attachments", { preHandler: app.authorize(["ADMIN"]) }, async (request, reply) => {
    const tenantId = request.tenant?.id;
    if (!tenantId) {
      return reply.status(400).send({ message: "Ambiente do clube nÃ£o identificado para anexar arquivo." });
    }

    const { id } = idParamsSchema.parse(request.params);
    const item = await prisma.archiveItem.findFirstOrThrow({
      where: { id },
      select: { type: true }
    });
    if (!(await ensureArchiveAccess(reply, item.type))) {
      return;
    }

    const payload = attachmentSchema.parse(request.body);
    const attachment = await prisma.archiveAttachment.create({
      data: {
        tenantId,
        archiveItemId: id,
        type: payload.type,
        title: cleanText(payload.title),
        url: payload.url,
        mimeType: cleanText(payload.mimeType),
        sizeBytes: payload.sizeBytes ?? null
      }
    });

    return reply.code(201).send({ ...attachment, createdAt: attachment.createdAt.toISOString() });
  });

  app.delete("/archive-items/:id/attachments/:attachmentId", { preHandler: app.authorize(["ADMIN"]) }, async (request, reply) => {
    const { id, attachmentId } = attachmentParamsSchema.parse(request.params);
    const item = await prisma.archiveItem.findFirstOrThrow({
      where: { id },
      select: { type: true }
    });
    if (!(await ensureArchiveAccess(reply, item.type))) {
      return;
    }

    await prisma.archiveAttachment.deleteMany({
      where: { id: attachmentId, archiveItemId: id }
    });
    return reply.status(204).send();
  });
}
