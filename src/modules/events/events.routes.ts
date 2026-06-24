import type { FastifyInstance } from "fastify";
import { ClubEventRegistrationStatus, ClubEventStatus, ClubEventType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";

const flexibleIdSchema = z.union([z.string().cuid(), z.string().uuid()]);
const optionalText = (max = 160) => z.string().trim().max(max).optional().or(z.literal(""));

const eventSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: optionalText(1200),
  type: z.nativeEnum(ClubEventType).default(ClubEventType.SOCIAL),
  status: z.nativeEnum(ClubEventStatus).default(ClubEventStatus.DRAFT),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional().nullable().or(z.literal("")),
  location: optionalText(180),
  capacity: z.number().int().min(0).max(100000).optional().nullable(),
  registrationEnabled: z.boolean().default(false),
  registrationFeeCents: z.number().int().min(0).default(0),
  expectedRevenueCents: z.number().int().min(0).default(0),
  expectedExpenseCents: z.number().int().min(0).default(0),
  coverImageUrl: optionalText(2_500_000)
});

const eventQuerySchema = z.object({
  year: z.coerce.number().int().min(1900).max(2200).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  status: z.nativeEnum(ClubEventStatus).optional(),
  type: z.nativeEnum(ClubEventType).optional()
});

const registrationSchema = z.object({
  associateId: flexibleIdSchema.optional().nullable().or(z.literal("")),
  name: z.string().trim().min(2).max(160).optional(),
  email: optionalText(180),
  phone: optionalText(60),
  status: z.nativeEnum(ClubEventRegistrationStatus).default(ClubEventRegistrationStatus.PENDING),
  amountCents: z.number().int().min(0).default(0),
  paidAt: z.string().datetime().optional().nullable().or(z.literal("")),
  checkedInAt: z.string().datetime().optional().nullable().or(z.literal("")),
  note: optionalText(800)
});

const registrationUpdateSchema = registrationSchema.partial();
const idParamsSchema = z.object({ id: flexibleIdSchema });
const registrationIdParamsSchema = z.object({ registrationId: flexibleIdSchema });

function cleanText(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";
  return normalized ? normalized : null;
}

function rangeForQuery(query: z.infer<typeof eventQuerySchema>) {
  if (!query.year) {
    return {};
  }

  const startMonth = query.month ? query.month - 1 : 0;
  const endMonth = query.month ? query.month : 12;
  return {
    startsAt: {
      gte: new Date(Date.UTC(query.year, startMonth, 1)),
      lt: new Date(Date.UTC(query.year, endMonth, 1))
    }
  };
}

function serializeEvent(event: Awaited<ReturnType<typeof prisma.clubEvent.findFirstOrThrow>>) {
  return {
    ...event,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt?.toISOString() ?? null,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString()
  };
}

function serializeRegistration(registration: {
  paidAt: Date | null;
  checkedInAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: unknown;
}) {
  return {
    ...registration,
    paidAt: registration.paidAt?.toISOString() ?? null,
    checkedInAt: registration.checkedInAt?.toISOString() ?? null,
    createdAt: registration.createdAt.toISOString(),
    updatedAt: registration.updatedAt.toISOString()
  };
}

export async function eventRoutes(app: FastifyInstance) {
  app.get("/events", { preHandler: app.authorize(["ADMIN", "FINANCIAL"]) }, async (request) => {
    const query = eventQuerySchema.parse(request.query);
    const events = await prisma.clubEvent.findMany({
      where: {
        ...rangeForQuery(query),
        ...(query.status ? { status: query.status } : {}),
        ...(query.type ? { type: query.type } : {})
      },
      orderBy: [{ startsAt: "asc" }, { title: "asc" }]
    });

    return events.map(serializeEvent);
  });

  app.post("/events", { preHandler: app.authorize(["ADMIN"]) }, async (request, reply) => {
    const tenantId = request.tenant?.id ?? request.user.tenantId;
    if (!tenantId) {
      return reply.status(400).send({ message: "Ambiente do clube não identificado para cadastrar evento." });
    }

    const payload = eventSchema.parse(request.body);
    const event = await prisma.clubEvent.create({
      data: {
        tenantId,
        title: payload.title,
        description: cleanText(payload.description),
        type: payload.type,
        status: payload.status,
        startsAt: new Date(payload.startsAt),
        endsAt: payload.endsAt ? new Date(payload.endsAt) : null,
        location: cleanText(payload.location),
        capacity: payload.capacity ?? null,
        registrationEnabled: payload.registrationEnabled,
        registrationFeeCents: payload.registrationFeeCents,
        expectedRevenueCents: payload.expectedRevenueCents,
        expectedExpenseCents: payload.expectedExpenseCents,
        coverImageUrl: cleanText(payload.coverImageUrl)
      }
    });

    return reply.code(201).send(serializeEvent(event));
  });

  app.get("/events/:id/registrations", { preHandler: app.authorize(["ADMIN", "FINANCIAL"]) }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    await prisma.clubEvent.findFirstOrThrow({ where: { id } });
    const registrations = await prisma.clubEventRegistration.findMany({
      where: { eventId: id },
      include: {
        associate: {
          select: { id: true, name: true, email: true, phone: true, status: true }
        }
      },
      orderBy: [{ status: "asc" }, { name: "asc" }]
    });

    return registrations.map(serializeRegistration);
  });

  app.get("/events/registrations/:registrationId", { preHandler: app.authorize(["ADMIN", "FINANCIAL"]) }, async (request) => {
    const { registrationId } = registrationIdParamsSchema.parse(request.params);
    const registration = await prisma.clubEventRegistration.findUniqueOrThrow({
      where: { id: registrationId },
      include: {
        event: true,
        associate: {
          select: { id: true, name: true, email: true, phone: true, status: true }
        }
      }
    });

    return {
      ...serializeRegistration(registration),
      event: serializeEvent(registration.event)
    };
  });

  app.post("/events/:id/registrations", { preHandler: app.authorize(["ADMIN"]) }, async (request, reply) => {
    const tenantId = request.tenant?.id ?? request.user.tenantId;
    if (!tenantId) {
      return reply.status(400).send({ message: "Ambiente do clube não identificado para cadastrar inscrição." });
    }

    const { id } = idParamsSchema.parse(request.params);
    const payload = registrationSchema.parse(request.body);
    const event = await prisma.clubEvent.findFirstOrThrow({ where: { id } });
    const associateId = payload.associateId ? payload.associateId : null;

    if (!event.registrationEnabled && payload.status !== ClubEventRegistrationStatus.CANCELED) {
      return reply.status(409).send({ message: "Inscrições não estão abertas para este evento." });
    }

    if (event.capacity && payload.status !== ClubEventRegistrationStatus.CANCELED) {
      const activeRegistrations = await prisma.clubEventRegistration.count({
        where: {
          eventId: event.id,
          status: { not: ClubEventRegistrationStatus.CANCELED }
        }
      });

      if (activeRegistrations >= event.capacity) {
        return reply.status(409).send({ message: "Capacidade do evento esgotada." });
      }
    }

    if (associateId) {
      const existingRegistration = await prisma.clubEventRegistration.findFirst({
        where: {
          eventId: event.id,
          associateId
        }
      });

      if (existingRegistration) {
        return reply.status(409).send({ message: "Associado já possui inscrição neste evento. Edite a inscrição existente." });
      }
    }

    const associate = associateId
      ? await prisma.associate.findFirst({
          where: { id: associateId },
          select: { id: true, name: true, email: true, phone: true }
        })
      : null;

    if (associateId && !associate) {
      return reply.status(404).send({ message: "Associado não encontrado neste clube." });
    }

    const name = payload.name?.trim() || associate?.name;
    if (!name) {
      return reply.status(400).send({ message: "Informe o nome da pessoa inscrita." });
    }

    const registration = await prisma.clubEventRegistration.create({
      data: {
        tenantId,
        eventId: event.id,
        associateId,
        name,
        email: cleanText(payload.email) ?? associate?.email ?? null,
        phone: cleanText(payload.phone) ?? associate?.phone ?? null,
        status: payload.status,
        amountCents: payload.amountCents,
        paidAt: payload.paidAt ? new Date(payload.paidAt) : null,
        checkedInAt: payload.checkedInAt ? new Date(payload.checkedInAt) : null,
        note: cleanText(payload.note)
      },
      include: {
        associate: {
          select: { id: true, name: true, email: true, phone: true, status: true }
        }
      }
    });

    return reply.code(201).send(serializeRegistration(registration));
  });

  app.patch("/events/registrations/:registrationId", { preHandler: app.authorize(["ADMIN"]) }, async (request, reply) => {
    const { registrationId } = registrationIdParamsSchema.parse(request.params);
    const payload = registrationUpdateSchema.parse(request.body);
    const checkedInAt =
      payload.checkedInAt !== undefined
        ? payload.checkedInAt
          ? new Date(payload.checkedInAt)
          : null
        : payload.status === ClubEventRegistrationStatus.CHECKED_IN
          ? new Date()
          : undefined;

    const currentRegistration = await prisma.clubEventRegistration.findUniqueOrThrow({
      where: { id: registrationId },
      include: { event: true }
    });
    const nextStatus = payload.status ?? currentRegistration.status;

    if (
      currentRegistration.event.capacity &&
      currentRegistration.status === ClubEventRegistrationStatus.CANCELED &&
      nextStatus !== ClubEventRegistrationStatus.CANCELED
    ) {
      const activeRegistrations = await prisma.clubEventRegistration.count({
        where: {
          eventId: currentRegistration.eventId,
          id: { not: registrationId },
          status: { not: ClubEventRegistrationStatus.CANCELED }
        }
      });

      if (activeRegistrations >= currentRegistration.event.capacity) {
        return reply.status(409).send({ message: "Capacidade do evento esgotada." });
      }
    }

    const registration = await prisma.clubEventRegistration.update({
      where: { id: registrationId },
      data: {
        ...(payload.associateId !== undefined ? { associateId: payload.associateId ? payload.associateId : null } : {}),
        ...(payload.name !== undefined ? { name: payload.name } : {}),
        ...(payload.email !== undefined ? { email: cleanText(payload.email) } : {}),
        ...(payload.phone !== undefined ? { phone: cleanText(payload.phone) } : {}),
        ...(payload.status !== undefined ? { status: payload.status } : {}),
        ...(payload.amountCents !== undefined ? { amountCents: payload.amountCents } : {}),
        ...(payload.paidAt !== undefined ? { paidAt: payload.paidAt ? new Date(payload.paidAt) : null } : {}),
        ...(checkedInAt !== undefined ? { checkedInAt } : {}),
        ...(payload.note !== undefined ? { note: cleanText(payload.note) } : {})
      },
      include: {
        associate: {
          select: { id: true, name: true, email: true, phone: true, status: true }
        }
      }
    });

    return serializeRegistration(registration);
  });

  app.delete("/events/registrations/:registrationId", { preHandler: app.authorize(["ADMIN"]) }, async (request, reply) => {
    const { registrationId } = registrationIdParamsSchema.parse(request.params);
    await prisma.clubEventRegistration.delete({ where: { id: registrationId } });
    return reply.status(204).send();
  });

  app.patch("/events/:id", { preHandler: app.authorize(["ADMIN"]) }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const payload = eventSchema.partial().parse(request.body);
    const event = await prisma.clubEvent.update({
      where: { id },
      data: {
        ...(payload.title ? { title: payload.title } : {}),
        ...(payload.description !== undefined ? { description: cleanText(payload.description) } : {}),
        ...(payload.type ? { type: payload.type } : {}),
        ...(payload.status ? { status: payload.status } : {}),
        ...(payload.startsAt ? { startsAt: new Date(payload.startsAt) } : {}),
        ...(payload.endsAt !== undefined ? { endsAt: payload.endsAt ? new Date(payload.endsAt) : null } : {}),
        ...(payload.location !== undefined ? { location: cleanText(payload.location) } : {}),
        ...(payload.capacity !== undefined ? { capacity: payload.capacity ?? null } : {}),
        ...(payload.registrationEnabled !== undefined ? { registrationEnabled: payload.registrationEnabled } : {}),
        ...(payload.registrationFeeCents !== undefined ? { registrationFeeCents: payload.registrationFeeCents } : {}),
        ...(payload.expectedRevenueCents !== undefined ? { expectedRevenueCents: payload.expectedRevenueCents } : {}),
        ...(payload.expectedExpenseCents !== undefined ? { expectedExpenseCents: payload.expectedExpenseCents } : {}),
        ...(payload.coverImageUrl !== undefined ? { coverImageUrl: cleanText(payload.coverImageUrl) } : {})
      }
    });

    return serializeEvent(event);
  });

  app.delete("/events/:id", { preHandler: app.authorize(["ADMIN"]) }, async (request, reply) => {
    const { id } = idParamsSchema.parse(request.params);
    await prisma.clubEvent.delete({ where: { id } });
    return reply.status(204).send();
  });
}
