import type { FastifyInstance } from "fastify";
import crypto from "node:crypto";
import { z } from "zod";
import {
  AssociateStatus,
  CollectionChannel,
  CollectionStage,
  EventType,
  ExpenseCategory,
  FinancialCategory,
  FinancialEntryStatus,
  FinancialEntryType,
  GameStatus,
  GoalkeeperCostModel,
  AthleteLinkType,
  AthletePosition,
  AthleteStatus,
  PaymentStatus,
  type Prisma
} from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { dueDateForCompetence, settleMonthlyFeeIncome } from "../../lib/finance.utils.js";
import { getTenantContext, tenantContext } from "../tenancy/tenant-context.js";
import { getCompetitionRanking, getConfrontationStats, getDisciplineRanking, getScorerRanking } from "../sports/sports.service.js";
import { env } from "../../config/env.js";
import { canUsePixAutoSettlement, createPixCheckout, createPixTxid, scheduleAutoSettlement, sendPaymentConfirmationEmail } from "../athletes/athlete-payment.service.js";
import { canCreateSicoobPixCharge, createSicoobPixCheckout } from "./sicoob-pix.service.js";

const createExpenseSchema = z.object({
  description: z.string().min(2),
  category: z.nativeEnum(ExpenseCategory),
  amountCents: z.number().int().positive(),
  occurredAt: z.string().datetime()
});

const receiptSchema = z
  .string()
  .min(5)
  .max(2_500_000)
  .refine((value) => {
    if (value.startsWith("data:image/") || value.startsWith("data:application/pdf")) {
      return true;
    }

    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }, "Comprovante deve ser uma URL http(s), imagem ou PDF anexado");

const createFinancialEntrySchema = z.object({
  type: z.nativeEnum(FinancialEntryType),
  category: z.nativeEnum(FinancialCategory),
  description: z.string().min(2),
  amountCents: z.number().int().positive(),
  competenceMonth: z.number().int().min(1).max(12),
  competenceYear: z.number().int().min(1980).max(2100),
  dueDate: z.string().datetime().optional(),
  paidAt: z.string().datetime().optional(),
  status: z.nativeEnum(FinancialEntryStatus).default(FinancialEntryStatus.PENDING),
  associateId: z.string().cuid().optional(),
  goalkeeperContractId: z.string().cuid().optional(),
  receiptUrl: receiptSchema.optional(),
  costCenter: z.string().max(100).optional()
});

const updateFinancialEntrySchema = createFinancialEntrySchema.partial();

const financialQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(1980).max(2100).optional(),
  type: z.nativeEnum(FinancialEntryType).optional(),
  status: z.nativeEnum(FinancialEntryStatus).optional(),
  category: z.nativeEnum(FinancialCategory).optional()
});

const entryParamsSchema = z.object({ id: z.string().cuid() });
const associateParamsSchema = z.object({ associateId: z.string().cuid() });
const paymentParamsSchema = z.object({ id: z.string().cuid() });
const refundPaymentSchema = z.object({ reason: z.string().min(3).max(500) });
const guestAthleteParamsSchema = z.object({ athleteId: z.string().cuid() });
const guestChargeParamsSchema = z.object({ entryId: z.string().cuid() });
const guestChargeSchema = z.object({
  month: z.number().int().min(1).max(12).optional(),
  year: z.number().int().min(1980).max(2100).optional()
});

const createGoalkeeperContractSchema = z.object({
  keeperName: z.string().min(2),
  monthlyCostCents: z.number().int().min(0),
  startedAt: z.string().datetime(),
  endsAt: z.string().datetime().optional().nullable(),
  active: z.boolean().default(true),
  costModel: z.nativeEnum(GoalkeeperCostModel).default(GoalkeeperCostModel.MONTHLY),
  paymentMethod: z.string().max(80).optional().or(z.literal("")),
  note: z.string().max(400).optional().or(z.literal("")),
  costCenter: z.string().max(100).optional().or(z.literal(""))
});

const updateGoalkeeperContractSchema = createGoalkeeperContractSchema.partial();

const goalkeeperParamsSchema = z.object({ id: z.string().cuid() });

async function ensureGoalkeeperContractAthlete(contract: { id: string; keeperName: string; athleteId: string | null }) {
  if (contract.athleteId) {
    await prisma.athlete.update({
      where: { id: contract.athleteId },
      data: {
        name: contract.keeperName,
        position: AthletePosition.GOALKEEPER,
        secondaryPositions: [],
        linkType: AthleteLinkType.CONTRACTED,
        status: AthleteStatus.ACTIVE
      }
    });
    return contract.athleteId;
  }

  const athlete = await prisma.athlete.create({
    data: {
      name: contract.keeperName,
      position: AthletePosition.GOALKEEPER,
      secondaryPositions: [],
      linkType: AthleteLinkType.CONTRACTED,
      status: AthleteStatus.ACTIVE,
      rating: 3
    },
    select: { id: true }
  });

  await prisma.goalkeeperContract.update({
    where: { id: contract.id },
    data: { athleteId: athlete.id }
  });

  return athlete.id;
}

const reportQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(1980).max(2100)
});

const financePeriodReportQuerySchema = reportQuerySchema.extend({
  range: z.enum(["MONTH", "QUARTER", "SEMESTER", "YEAR"]).default("QUARTER")
});

const yearComparisonQuerySchema = z.object({
  year: z.coerce.number().int().min(1980).max(2100),
  compareYear: z.coerce.number().int().min(1980).max(2100)
});

const historicalArchiveQuerySchema = z.object({
  fromYear: z.coerce.number().int().min(1980).max(2100).default(1980),
  toYear: z.coerce.number().int().min(1980).max(2100).default(new Date().getUTCFullYear())
});

const checkoutQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(1980).max(2100)
});

const paymentHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(10).default(3)
});

const presidentTermSchema = z.object({
  name: z.string().min(2),
  startedYear: z.number().int().min(1980).max(2100),
  endedYear: z.number().int().min(1980).max(2100).optional().nullable(),
  photoUrl: z
    .string()
    .max(2_500_000)
    .refine((value) => value === "" || /^https:\/\//.test(value) || /^data:image\/(png|jpeg|webp);base64,/.test(value), "Foto deve ser uma URL https ou imagem enviada")
    .optional()
    .or(z.literal("")),
  note: z.string().max(800).optional().or(z.literal("")),
  achievements: z.string().max(1200).optional().or(z.literal(""))
});

const presidentTermParamsSchema = z.object({ id: z.string().cuid() });

const pixSettingsSchema = z.object({
  paymentMode: z.enum(["MANUAL_PIX", "PROVIDER"]).default("MANUAL_PIX"),
  paymentProvider: z.enum(["MANUAL_PIX", "SICOOB", "ITAU", "BANCO_DO_BRASIL", "BRADESCO", "CAIXA", "SANTANDER", "ASAAS", "EFI", "MERCADO_PAGO", "STRIPE"]).default("MANUAL_PIX"),
  providerEnvironment: z.enum(["TEST", "PRODUCTION"]).default("TEST"),
  providerApiKey: z.string().max(600).optional().or(z.literal("")),
  providerClientId: z.string().max(240).optional().or(z.literal("")),
  providerClientSecret: z.string().max(600).optional().or(z.literal("")),
  providerWebhookSecret: z.string().max(600).optional().or(z.literal("")),
  providerWebhookUrl: z.string().url().optional().or(z.literal("")),
  autoSettleEnabled: z.boolean().default(false),
  pixKey: z.string().min(5).max(120),
  pixReceiverName: z.string().min(2).max(80),
  pixCity: z.string().min(2).max(40),
  pixAutoSettleSeconds: z.number().int().min(5).max(600),
  monthlyDueDay: z.number().int().min(1).max(28).default(10),
  lateFeeCents: z.number().int().min(0).max(100_000).default(0),
  lateFeePercent: z.number().min(0).max(100).default(0)
});

const pixWebhookParamsSchema = z.object({
  provider: z.enum(["SICOOB", "ITAU", "BANCO_DO_BRASIL", "BRADESCO", "CAIXA", "SANTANDER", "ASAAS", "EFI", "MERCADO_PAGO", "STRIPE", "MANUAL_PIX"])
});

const pixWebhookSchema = z
  .object({
    paymentId: z.string().min(1).optional(),
    txid: z.string().min(1).max(80).optional(),
    externalReference: z.string().min(1).max(120).optional(),
    status: z.string().min(1).max(80).optional(),
    paidAt: z.string().datetime().optional(),
    amountCents: z.number().int().positive().optional(),
    pix: z
      .array(
        z
          .object({
            txid: z.string().min(1).max(80).optional(),
            valor: z.union([z.string(), z.number()]).optional(),
            horario: z.string().optional()
          })
          .passthrough()
      )
      .optional()
  })
  .passthrough();

function escapeCsv(value: string | number | null) {
  if (value === null) {
    return "";
  }

  const text = String(value);
  if (text.includes(",") || text.includes("\n") || text.includes("\"")) {
    return `"${text.replaceAll("\"", '""')}"`;
  }

  return text;
}

function financialTypeLabel(type: FinancialEntryType) {
  const labels: Record<FinancialEntryType, string> = {
    INCOME: "Receita",
    EXPENSE: "Despesa"
  };

  return labels[type];
}

function financialStatusLabel(status: FinancialEntryStatus) {
  const labels: Record<FinancialEntryStatus, string> = {
    PENDING: "Pendente",
    PAID: "Pago",
    OVERDUE: "Vencido",
    CANCELED: "Cancelado"
  };

  return labels[status];
}

function financialCategoryLabel(category: FinancialCategory) {
  const labels: Record<FinancialCategory, string> = {
    MONTHLY_FEE: "Mensalidade",
    EVENTS: "Eventos",
    SPONSORSHIP: "Patrocínio",
    FUNDRAISING: "Arrecadação",
    FIELD: "Campo",
    REFEREE: "Arbitragem",
    GOALKEEPER_CONTRACT: "Contrato de goleiro",
    UNIFORMS: "Uniformes",
    ADMINISTRATIVE: "Administrativo",
    REFUND: "Estorno",
    GUEST_ATHLETE: "Atleta convidado",
    OTHER: "Outros"
  };

  return labels[category];
}

function buildFinancialWhereClause(query: z.infer<typeof financialQuerySchema>): Prisma.FinancialEntryWhereInput {
  return {
    ...(query.month !== undefined ? { competenceMonth: query.month } : {}),
    ...(query.year !== undefined ? { competenceYear: query.year } : {}),
    ...(query.type ? { type: query.type } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.category ? { category: query.category } : {})
  };
}

function toStartOfTodayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

async function updateLatePaymentsForPeriod(month: number, year: number) {
  const today = toStartOfTodayUtc();
  const settings = await getPaymentSettings();
  const overdue = await prisma.payment.findMany({
    where: {
      month,
      year,
      status: PaymentStatus.PENDING,
      dueDate: { lt: today }
    },
    select: { id: true, amountCents: true }
  });

  for (const payment of overdue) {
    const lateFeeAppliedCents = settings.lateFeeCents + Math.round((payment.amountCents * settings.lateFeePercent) / 100);
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.LATE,
        amountCents: payment.amountCents + lateFeeAppliedCents,
        lateFeeAppliedCents
      }
    });
  }
}

function daysDiffFromToday(date: Date) {
  const today = toStartOfTodayUtc().getTime();
  const target = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.round((target - today) / 86_400_000);
}

const SECRET_MASK = "********";

/**
 * Masks provider secrets so they are never sent to the browser. A non-empty
 * secret becomes SECRET_MASK; the PATCH handler treats SECRET_MASK as
 * "keep the stored value", so the configuration form keeps working without
 * ever receiving or overwriting the real credentials.
 */
function toClientPaymentSettings(settings: Awaited<ReturnType<typeof getPaymentSettings>>) {
  return {
    ...settings,
    providerApiKey: settings.providerApiKey ? SECRET_MASK : "",
    providerClientSecret: settings.providerClientSecret ? SECRET_MASK : "",
    providerWebhookSecret: settings.providerWebhookSecret ? SECRET_MASK : ""
  };
}

/** Resolve a masked secret coming from the client back to the stored value. */
function resolveSecret(incoming: string | null | undefined, stored: string | null | undefined) {
  if (incoming === SECRET_MASK) {
    return stored ?? null;
  }
  return incoming || null;
}

export async function getPaymentSettings() {
  const settings = await prisma.paymentSettings.findFirst();
  return {
    id: "main",
    paymentMode: settings?.paymentMode ?? "MANUAL_PIX",
    paymentProvider: settings?.paymentProvider ?? "MANUAL_PIX",
    providerEnvironment: settings?.providerEnvironment ?? "TEST",
    providerApiKey: settings?.providerApiKey ?? "",
    providerClientId: settings?.providerClientId ?? "",
    providerClientSecret: settings?.providerClientSecret ?? "",
    providerWebhookSecret: settings?.providerWebhookSecret ?? "",
    providerWebhookUrl: settings?.providerWebhookUrl ?? "",
    autoSettleEnabled: settings?.autoSettleEnabled ?? false,
    pixKey: settings?.pixKey ?? env.PIX_KEY,
    pixReceiverName: settings?.pixReceiverName ?? env.PIX_RECEIVER_NAME,
    pixCity: settings?.pixCity ?? env.PIX_CITY,
    pixAutoSettleSeconds: settings?.pixAutoSettleSeconds ?? env.PIX_AUTO_SETTLE_SECONDS,
    monthlyDueDay: settings?.monthlyDueDay ?? 10,
    lateFeeCents: settings?.lateFeeCents ?? 0,
    lateFeePercent: settings?.lateFeePercent ?? 0
  };
}

async function ensureMonthlyPaymentsForPeriod(month: number, year: number) {
  const settings = await getPaymentSettings();
  const associates = await prisma.associate.findMany({
    where: { status: { not: AssociateStatus.INACTIVE } },
    select: { id: true, monthlyFeeCents: true }
  });

  let created = 0;
  for (const associate of associates) {
    const existing = await prisma.payment.findFirst({
      where: {
        associateId: associate.id,
        month,
        year
      },
      select: { id: true }
    });

    if (existing) {
      continue;
    }

    await prisma.payment.create({
      data: {
        associateId: associate.id,
        month,
        year,
        amountCents: associate.monthlyFeeCents,
        dueDate: dueDateForCompetence(month, year, settings?.monthlyDueDay),
        status: PaymentStatus.PENDING
      }
    });
    created += 1;
  }

  await updateLatePaymentsForPeriod(month, year);
  return { created, eligibleAssociates: associates.length, dueDay: settings?.monthlyDueDay };
}

function readWebhookHeader(headers: Record<string, string | string[] | undefined>, name: string) {
  const value = headers[name];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function timingSafeEqualStrings(a: string, b: string) {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

const PIX_WEBHOOK_SIGNATURE_MAX_SKEW_SECONDS = 300;

function verifyPixWebhookSignature(rawBody: Buffer, secret: string, signatureHeader: string | null, timestampHeader: string | null) {
  if (!signatureHeader || !timestampHeader) {
    return false;
  }

  const timestampSeconds = Number(timestampHeader);
  if (!Number.isFinite(timestampSeconds)) {
    return false;
  }

  if (Math.abs(Date.now() / 1000 - timestampSeconds) > PIX_WEBHOOK_SIGNATURE_MAX_SKEW_SECONDS) {
    return false;
  }

  const expectedSignature = crypto.createHmac("sha256", secret).update(`${timestampHeader}.`).update(rawBody).digest("hex");

  return timingSafeEqualStrings(expectedSignature, signatureHeader.trim().toLowerCase());
}

function isPaidPixStatus(status: string) {
  const normalized = status.trim().toUpperCase();
  return ["PAID", "CONFIRMED", "COMPLETED", "APPROVED", "RECEIVED", "CONCLUIDA", "CONCLUIDO", "LIQUIDADO"].includes(normalized);
}

function pixValorToCents(value: string | number | undefined) {
  if (value === undefined) {
    return undefined;
  }

  const normalized = typeof value === "number" ? value : Number(value.replace(",", "."));
  if (!Number.isFinite(normalized) || normalized <= 0) {
    return undefined;
  }

  return Math.round(normalized * 100);
}

function normalizePixWebhookPayload(payload: z.infer<typeof pixWebhookSchema>) {
  const bankPix = payload.pix?.[0];

  return {
    reference: payload.paymentId ?? payload.externalReference ?? payload.txid ?? bankPix?.txid,
    status: payload.status ?? (bankPix ? "PAID" : undefined),
    paidAt: payload.paidAt ?? bankPix?.horario,
    amountCents: payload.amountCents ?? pixValorToCents(bankPix?.valor)
  };
}

async function findPaymentFromPixReference(reference: string) {
  const cleanReference = reference.trim();
  if (!cleanReference) {
    return null;
  }

  const exact = await prisma.payment.findFirst({
    where: { id: cleanReference },
    include: { associate: true }
  });

  if (exact) {
    return exact;
  }

  return prisma.payment.findFirst({
    where: { id: { startsWith: cleanReference } },
    include: { associate: true },
    orderBy: { createdAt: "desc" }
  });
}

async function settlePaymentFromPixWebhook(input: {
  paymentId: string;
  paidAt: Date;
  provider: string;
  rawPayload: unknown;
}) {
  const payment = await prisma.payment.findUnique({
    where: { id: input.paymentId },
    include: { associate: true }
  });

  if (!payment) {
    return null;
  }

  if (payment.status === PaymentStatus.PAID) {
    return { payment, changed: false };
  }

  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: PaymentStatus.PAID,
      paidAt: input.paidAt
    },
    include: { associate: true }
  });

  await prisma.associate.update({
    where: { id: updated.associateId },
    data: { status: AssociateStatus.ACTIVE }
  });

  await settleMonthlyFeeIncome({
    associateId: updated.associateId,
    associateName: updated.associate.name,
    month: updated.month,
    year: updated.year,
    amountCents: updated.amountCents
  });

  await prisma.auditLog.create({
    data: {
      tenantId: updated.tenantId,
      action: "PIX_WEBHOOK_SETTLE",
      method: "POST",
      path: `/finance/pix-webhook/${input.provider}`,
      statusCode: 200,
      targetType: "Payment",
      targetId: updated.id,
      metadata: {
        provider: input.provider,
        paidAt: input.paidAt.toISOString(),
        payload: input.rawPayload as Prisma.InputJsonValue
      }
    }
  });

  if (updated.associate.email) {
    await sendPaymentConfirmationEmail({
      to: updated.associate.email,
      athleteName: updated.associate.name,
      amountCents: updated.amountCents,
      month: updated.month,
      year: updated.year
    });
  }

  return { payment: updated, changed: true };
}

async function createCheckoutForPayment(input: {
  settings: Awaited<ReturnType<typeof getPaymentSettings>>;
  payment: { id: string; amountCents: number; month: number; year: number };
  associateName: string;
  txid: string;
}) {
  if (
    input.settings.paymentMode === "PROVIDER" &&
    input.settings.paymentProvider === "SICOOB" &&
    canCreateSicoobPixCharge(input.settings)
  ) {
    return createSicoobPixCheckout({
      settings: input.settings,
      txid: input.txid,
      amountCents: input.payment.amountCents,
      payerName: input.associateName,
      month: input.payment.month,
      year: input.payment.year
    });
  }

  return createPixCheckout({
    amountCents: input.payment.amountCents,
    txid: input.txid,
    pixKey: input.settings.pixKey,
    pixReceiverName: input.settings.pixReceiverName,
    pixCity: input.settings.pixCity,
    autoSettleSeconds: input.settings.pixAutoSettleSeconds
  });
}

async function buildCollectionDashboard(month: number, year: number) {
  await ensureMonthlyPaymentsForPeriod(month, year);
  await updateLatePaymentsForPeriod(month, year);

  const payments = await prisma.payment.findMany({
    where: {
      month,
      year,
      status: { in: [PaymentStatus.PENDING, PaymentStatus.LATE] }
    },
    include: {
      associate: {
        select: { id: true, name: true, phone: true, email: true }
      }
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }]
  });

  const openCents = payments.reduce((total, payment) => total + payment.amountCents, 0);
  const latePayments = payments.filter((payment) => payment.status === PaymentStatus.LATE || daysDiffFromToday(payment.dueDate) < 0);
  const lateCents = latePayments.reduce((total, payment) => total + payment.amountCents, 0);
  const dueSoon = payments.filter((payment) => {
    const diff = daysDiffFromToday(payment.dueDate);
    return diff >= 0 && diff <= 5;
  });

  const segments = {
    current: payments.filter((payment) => daysDiffFromToday(payment.dueDate) >= 0).length,
    d1_7: latePayments.filter((payment) => {
      const delay = Math.abs(Math.min(daysDiffFromToday(payment.dueDate), -1));
      return delay >= 1 && delay <= 7;
    }).length,
    d8_30: latePayments.filter((payment) => {
      const delay = Math.abs(Math.min(daysDiffFromToday(payment.dueDate), -1));
      return delay >= 8 && delay <= 30;
    }).length,
    d31Plus: latePayments.filter((payment) => {
      const delay = Math.abs(Math.min(daysDiffFromToday(payment.dueDate), -1));
      return delay >= 31;
    }).length
  };

  const cadence = {
    preDue3: payments.filter((payment) => daysDiffFromToday(payment.dueDate) === 3).length,
    dPlus3: latePayments.filter((payment) => Math.abs(daysDiffFromToday(payment.dueDate)) === 3).length,
    dPlus7: latePayments.filter((payment) => Math.abs(daysDiffFromToday(payment.dueDate)) === 7).length,
    dPlus15: latePayments.filter((payment) => Math.abs(daysDiffFromToday(payment.dueDate)) >= 15).length
  };

  const debtorMap = new Map<string, { associateId: string; name: string; phone: string | null; email: string | null; amountCents: number; maxDelayDays: number }>();
  for (const payment of latePayments) {
    const id = payment.associateId;
    const delay = Math.abs(daysDiffFromToday(payment.dueDate));
    const existing = debtorMap.get(id);
    if (!existing) {
      debtorMap.set(id, {
        associateId: id,
        name: payment.associate.name,
        phone: payment.associate.phone,
        email: payment.associate.email,
        amountCents: payment.amountCents,
        maxDelayDays: delay
      });
      continue;
    }
    existing.amountCents += payment.amountCents;
    existing.maxDelayDays = Math.max(existing.maxDelayDays, delay);
  }

  const topDebtors = Array.from(debtorMap.values())
    .sort((a, b) => (b.maxDelayDays === a.maxDelayDays ? b.amountCents - a.amountCents : b.maxDelayDays - a.maxDelayDays))
    .slice(0, 10);

  const riskPercent = openCents > 0 ? Math.round((lateCents / openCents) * 100) : 0;
  const actionPlan = [
    cadence.preDue3 > 0 ? `Enviar lembrete preventivo para ${cadence.preDue3} associado(s) em D-3.` : "Sem lembretes D-3 hoje.",
    cadence.dPlus3 > 0 ? `Executar cobrança amigável para ${cadence.dPlus3} associado(s) em D+3.` : "Sem cobrança D+3 hoje.",
    cadence.dPlus7 > 0 ? `Reforçar cobrança em D+7 para ${cadence.dPlus7} associado(s).` : "Sem cobrança D+7 hoje.",
    cadence.dPlus15 > 0 ? `Escalar cobrança/negociação para ${cadence.dPlus15} associado(s) com atraso >= 15 dias.` : "Sem casos críticos >= 15 dias hoje."
  ];

  return {
    month,
    year,
    totals: {
      openCents,
      lateCents,
      dueSoonCount: dueSoon.length,
      riskPercent
    },
    segments,
    cadence,
    topDebtors,
    actionPlan
  };
}

function collectionStageForPayment(payment: { dueDate: Date }) {
  const days = daysDiffFromToday(payment.dueDate);
  if (days === 3) {
    return CollectionStage.PRE_DUE_3;
  }
  if (days === -3) {
    return CollectionStage.D_PLUS_3;
  }
  if (days === -7) {
    return CollectionStage.D_PLUS_7;
  }
  if (days <= -15) {
    return CollectionStage.D_PLUS_15;
  }
  return null;
}

async function sendCollectionEmail(input: {
  to: string;
  associateName: string;
  stage: CollectionStage;
  amountCents: number;
  dueDate: Date;
  month: number;
  year: number;
}) {
  if (!env.SMTP_HOST || !env.SMTP_PORT || !env.SMTP_FROM) {
    return { success: false, message: "SMTP não configurado" };
  }

  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined
  });

  const stageLabel: Record<CollectionStage, string> = {
    PRE_DUE_3: "Lembrete antes do vencimento (D-3)",
    D_PLUS_3: "Cobrança amigável (D+3)",
    D_PLUS_7: "Cobrança reforçada (D+7)",
    D_PLUS_15: "Cobrança crítica (D+15)"
  };

  const amount = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(input.amountCents / 100);

  await transporter.sendMail({
    from: env.SMTP_FROM,
    to: input.to,
    subject: `Mensalidade GestaSports - ${stageLabel[input.stage]}`,
    text: `Olá ${input.associateName}, sua mensalidade de ${String(input.month).padStart(2, "0")}/${input.year} no valor de ${amount} tem vencimento em ${input.dueDate.toLocaleDateString("pt-BR")}.`,
    html: `<p>Olá <strong>${input.associateName}</strong>,</p><p>${stageLabel[input.stage]}.</p><p>Mensalidade ${String(input.month).padStart(2, "0")}/${input.year}: <strong>${amount}</strong>.</p><p>Vencimento: <strong>${input.dueDate.toLocaleDateString("pt-BR")}</strong>.</p>`
  });

  return { success: true, message: "E-mail enviado" };
}

async function sendCollectionWhatsapp(input: {
  phone: string;
  associateName: string;
  stage: CollectionStage;
  amountCents: number;
  dueDate: Date;
  month: number;
  year: number;
}) {
  if (!env.WHATSAPP_WEBHOOK_URL) {
    return { success: false, message: "Webhook WhatsApp não configurado" };
  }

  const amount = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(input.amountCents / 100);
  const response = await fetch(env.WHATSAPP_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phone: input.phone,
      associateName: input.associateName,
      stage: input.stage,
      month: input.month,
      year: input.year,
      amount,
      dueDate: input.dueDate.toISOString()
    })
  });

  if (!response.ok) {
    return { success: false, message: `Webhook status ${response.status}` };
  }

  return { success: true, message: "WhatsApp enviado" };
}

async function runCollectionCadence(month: number, year: number) {
  await updateLatePaymentsForPeriod(month, year);

  const candidates = await prisma.payment.findMany({
    where: {
      month,
      year,
      status: { in: [PaymentStatus.PENDING, PaymentStatus.LATE] }
    },
    include: {
      associate: {
        select: { id: true, name: true, email: true, phone: true }
      }
    }
  });

  let sentEmail = 0;
  let sentWhatsapp = 0;
  let skipped = 0;

  for (const payment of candidates) {
    const stage = collectionStageForPayment(payment);
    if (!stage) {
      skipped += 1;
      continue;
    }

    const channels = [CollectionChannel.EMAIL, CollectionChannel.WHATSAPP];
    for (const channel of channels) {
      const alreadyLogged = await prisma.collectionActionLog.findFirst({
        where: {
          paymentId: payment.id,
          stage,
          channel
        }
      });

      if (alreadyLogged) {
        continue;
      }

      if (channel === CollectionChannel.EMAIL) {
        if (!payment.associate.email) {
          continue;
        }
        const result = await sendCollectionEmail({
          to: payment.associate.email,
          associateName: payment.associate.name,
          stage,
          amountCents: payment.amountCents,
          dueDate: payment.dueDate,
          month,
          year
        });

        await prisma.collectionActionLog.create({
          data: {
            associateId: payment.associateId,
            paymentId: payment.id,
            stage,
            channel,
            success: result.success,
            message: result.message
          }
        });

        if (result.success) {
          sentEmail += 1;
        }
      }

      if (channel === CollectionChannel.WHATSAPP) {
        if (!payment.associate.phone) {
          continue;
        }

        const result = await sendCollectionWhatsapp({
          phone: payment.associate.phone,
          associateName: payment.associate.name,
          stage,
          amountCents: payment.amountCents,
          dueDate: payment.dueDate,
          month,
          year
        });

        await prisma.collectionActionLog.create({
          data: {
            associateId: payment.associateId,
            paymentId: payment.id,
            stage,
            channel,
            success: result.success,
            message: result.message
          }
        });

        if (result.success) {
          sentWhatsapp += 1;
        }
      }
    }
  }

  return {
    month,
    year,
    sentEmail,
    sentWhatsapp,
    skipped
  };
}

async function buildCollectionProductivity(month: number, year: number) {
  const actions = await prisma.collectionActionLog.findMany({
    where: {
      payment: { month, year }
    },
    include: {
      payment: {
        select: { id: true, paidAt: true, status: true }
      }
    }
  });

  const stages = [CollectionStage.PRE_DUE_3, CollectionStage.D_PLUS_3, CollectionStage.D_PLUS_7, CollectionStage.D_PLUS_15];
  const stageRows = stages.map((stage) => {
    const stageActions = actions.filter((action) => action.stage === stage && action.success);
    const recovered = stageActions.filter((action) => action.payment.status === PaymentStatus.PAID && action.payment.paidAt && action.payment.paidAt >= action.sentAt).length;
    const sent = stageActions.length;
    return {
      stage,
      sent,
      recovered,
      recoveryRatePercent: sent > 0 ? Math.round((recovered / sent) * 100) : 0
    };
  });

  const totalSent = stageRows.reduce((total, row) => total + row.sent, 0);
  const totalRecovered = stageRows.reduce((total, row) => total + row.recovered, 0);

  return {
    month,
    year,
    byStage: stageRows,
    totals: {
      sent: totalSent,
      recovered: totalRecovered,
      recoveryRatePercent: totalSent > 0 ? Math.round((totalRecovered / totalSent) * 100) : 0
    }
  };
}

async function computeFinancialSummary(month: number, year: number) {
  const whereMonth = {
    competenceMonth: month,
    competenceYear: year,
    status: FinancialEntryStatus.PAID
  } satisfies Prisma.FinancialEntryWhereInput;

  const [incomeAgg, expenseAgg, pending, overdue, byCategory] = await Promise.all([
    prisma.financialEntry.aggregate({
      where: { ...whereMonth, type: FinancialEntryType.INCOME },
      _sum: { amountCents: true }
    }),
    prisma.financialEntry.aggregate({
      where: { ...whereMonth, type: FinancialEntryType.EXPENSE },
      _sum: { amountCents: true }
    }),
    prisma.financialEntry.count({
      where: {
        competenceMonth: month,
        competenceYear: year,
        status: FinancialEntryStatus.PENDING
      }
    }),
    prisma.financialEntry.count({
      where: {
        competenceMonth: month,
        competenceYear: year,
        status: FinancialEntryStatus.OVERDUE
      }
    }),
    prisma.financialEntry.groupBy({
      by: ["category"],
      where: {
        competenceMonth: month,
        competenceYear: year
      },
      _sum: { amountCents: true }
    })
  ]);

  const incomeCents = incomeAgg._sum.amountCents ?? 0;
  const expenseCents = expenseAgg._sum.amountCents ?? 0;

  return {
    month,
    year,
    incomeCents,
    expenseCents,
    balanceCents: incomeCents - expenseCents,
    pendingCount: pending,
    overdueCount: overdue,
    byCategory: byCategory.map((row) => ({
      category: row.category,
      totalCents: row._sum.amountCents ?? 0
    }))
  };
}

function previousFinancialPeriods(month: number, year: number, range: z.infer<typeof financePeriodReportQuerySchema>["range"]) {
  const countByRange = {
    MONTH: 1,
    QUARTER: 3,
    SEMESTER: 6,
    YEAR: 12
  } satisfies Record<typeof range, number>;
  const count = countByRange[range];

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1 - (count - 1 - index), 1));
    return {
      month: date.getUTCMonth() + 1,
      year: date.getUTCFullYear()
    };
  });
}

function percentDelta(current: number, previous: number) {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}

async function computeFinancePeriodReport(month: number, year: number, range: z.infer<typeof financePeriodReportQuerySchema>["range"]) {
  const periods = previousFinancialPeriods(month, year, range);
  const first = periods[0];
  const last = periods[periods.length - 1];
  const periodKeys = new Set(periods.map((period) => `${period.year}-${period.month}`));
  const rowsByKey = new Map(
    periods.map((period) => [
      `${period.year}-${period.month}`,
      {
        month: period.month,
        year: period.year,
        incomeCents: 0,
        expenseCents: 0,
        balanceCents: 0,
        pendingCents: 0,
        overdueCents: 0,
        pendingCount: 0,
        overdueCount: 0,
        paidCount: 0,
        totalCount: 0
      }
    ])
  );

  const [financialRows, categoryRows] = await Promise.all([
    prisma.financialEntry.groupBy({
      by: ["competenceYear", "competenceMonth", "type", "status"],
      where: {
        OR: periods.map((period) => ({ competenceYear: period.year, competenceMonth: period.month }))
      },
      _sum: { amountCents: true },
      _count: { _all: true }
    }),
    prisma.financialEntry.groupBy({
      by: ["category", "type"],
      where: {
        OR: periods.map((period) => ({ competenceYear: period.year, competenceMonth: period.month }))
      },
      _sum: { amountCents: true },
      _count: { _all: true }
    })
  ]);

  for (const row of financialRows) {
    const key = `${row.competenceYear}-${row.competenceMonth}`;
    if (!periodKeys.has(key)) {
      continue;
    }
    const target = rowsByKey.get(key);
    if (!target) {
      continue;
    }

    const amount = row._sum.amountCents ?? 0;
    const count = row._count._all;
    target.totalCount += count;
    if (row.status === FinancialEntryStatus.PAID) {
      target.paidCount += count;
      if (row.type === FinancialEntryType.INCOME) {
        target.incomeCents += amount;
      } else {
        target.expenseCents += amount;
      }
    }
    if (row.status === FinancialEntryStatus.PENDING) {
      target.pendingCents += amount;
      target.pendingCount += count;
    }
    if (row.status === FinancialEntryStatus.OVERDUE) {
      target.overdueCents += amount;
      target.overdueCount += count;
    }
  }

  const monthly = Array.from(rowsByKey.values()).map((row) => ({
    ...row,
    balanceCents: row.incomeCents - row.expenseCents
  }));
  const totals = monthly.reduce(
    (acc, row) => ({
      incomeCents: acc.incomeCents + row.incomeCents,
      expenseCents: acc.expenseCents + row.expenseCents,
      balanceCents: acc.balanceCents + row.balanceCents,
      pendingCents: acc.pendingCents + row.pendingCents,
      overdueCents: acc.overdueCents + row.overdueCents,
      pendingCount: acc.pendingCount + row.pendingCount,
      overdueCount: acc.overdueCount + row.overdueCount,
      paidCount: acc.paidCount + row.paidCount,
      totalCount: acc.totalCount + row.totalCount
    }),
    { incomeCents: 0, expenseCents: 0, balanceCents: 0, pendingCents: 0, overdueCents: 0, pendingCount: 0, overdueCount: 0, paidCount: 0, totalCount: 0 }
  );
  const previousMonth = monthly.length > 1 ? monthly[monthly.length - 2] : null;
  const currentMonth = monthly[monthly.length - 1];
  const bestMonth = [...monthly].sort((a, b) => b.balanceCents - a.balanceCents)[0] || null;
  const worstMonth = [...monthly].sort((a, b) => a.balanceCents - b.balanceCents)[0] || null;

  return {
    range,
    period: { from: first, to: last },
    totals,
    averages: {
      incomeCents: Math.round(totals.incomeCents / monthly.length),
      expenseCents: Math.round(totals.expenseCents / monthly.length),
      balanceCents: Math.round(totals.balanceCents / monthly.length)
    },
    indicators: {
      marginPercent: totals.incomeCents > 0 ? Math.round((totals.balanceCents / totals.incomeCents) * 100) : 0,
      expenseRatioPercent: totals.incomeCents > 0 ? Math.round((totals.expenseCents / totals.incomeCents) * 100) : 0,
      delinquencyRiskPercent: totals.incomeCents + totals.pendingCents + totals.overdueCents > 0 ? Math.round((totals.overdueCents / (totals.incomeCents + totals.pendingCents + totals.overdueCents)) * 100) : 0,
      incomeDeltaPercent: previousMonth && currentMonth ? percentDelta(currentMonth.incomeCents, previousMonth.incomeCents) : 0,
      expenseDeltaPercent: previousMonth && currentMonth ? percentDelta(currentMonth.expenseCents, previousMonth.expenseCents) : 0,
      balanceDeltaPercent: previousMonth && currentMonth ? percentDelta(currentMonth.balanceCents, previousMonth.balanceCents) : 0
    },
    highlights: {
      bestMonth,
      worstMonth
    },
    categories: categoryRows
      .map((row) => ({
        category: row.category,
        type: row.type,
        totalCents: row._sum.amountCents ?? 0,
        count: row._count._all
      }))
      .sort((a, b) => b.totalCents - a.totalCents)
      .slice(0, 8),
    monthly
  };
}

function yearDateRange(year: number) {
  return {
    start: new Date(Date.UTC(year, 0, 1)),
    end: new Date(Date.UTC(year + 1, 0, 1))
  };
}

function monthFromDate(value: Date) {
  return value.getUTCMonth() + 1;
}

function emptyMonthlyComparisonRow(month: number) {
  return {
    month,
    incomeCents: 0,
    expenseCents: 0,
    balanceCents: 0,
    pendingCents: 0,
    overdueCents: 0,
    games: 0,
    finishedGames: 0,
    goals: 0,
    presences: 0
  };
}

async function computeYearComparisonSnapshot(year: number) {
  const { start, end } = yearDateRange(year);
  const monthly = Array.from({ length: 12 }, (_, index) => emptyMonthlyComparisonRow(index + 1));

  const [
    financialRows,
    paidMonthlyFeeAgg,
    games,
    goals,
    presences,
    totalLineups,
    athletes,
    associates,
    auditActions,
    draftAttempts,
    scorers,
    competition,
    discipline,
    confrontations
  ] = await Promise.all([
    prisma.financialEntry.groupBy({
      by: ["competenceMonth", "type", "status"],
      where: { competenceYear: year },
      _sum: { amountCents: true },
      _count: { _all: true }
    }),
    prisma.payment.aggregate({
      where: { year, status: PaymentStatus.PAID },
      _sum: { amountCents: true },
      _count: { _all: true }
    }),
    prisma.game.findMany({
      where: { date: { gte: start, lt: end } },
      select: {
        id: true,
        date: true,
        location: true,
        status: true,
        redTeamName: true,
        whiteTeamName: true,
        redScore: true,
        whiteScore: true,
        winnerSide: true,
        isDraw: true,
        finishedAt: true
      }
    }),
    prisma.gameEvent.findMany({
      where: { type: EventType.GOAL, game: { date: { gte: start, lt: end } } },
      select: { game: { select: { date: true } } }
    }),
    prisma.gameLineup.findMany({
      where: { presence: true, game: { date: { gte: start, lt: end } } },
      select: { game: { select: { date: true } } }
    }),
    prisma.gameLineup.count({
      where: { game: { date: { gte: start, lt: end } } }
    }),
    prisma.athlete.findMany({
      where: { createdAt: { lt: end } },
      select: { createdAt: true, status: true }
    }),
    prisma.associate.findMany({
      where: { createdAt: { lt: end } },
      select: { createdAt: true, status: true }
    }),
    prisma.auditLog.count({
      where: { createdAt: { gte: start, lt: end } }
    }),
    prisma.lineupDraftAttempt.count({
      where: { createdAt: { gte: start, lt: end } }
    }),
    getScorerRanking(year),
    getCompetitionRanking(year),
    getDisciplineRanking(year),
    getConfrontationStats(year)
  ]);

  for (const row of financialRows) {
    const monthRow = monthly[row.competenceMonth - 1];
    if (!monthRow) {
      continue;
    }
    const amountCents = row._sum.amountCents ?? 0;

    if (row.status === FinancialEntryStatus.PENDING) {
      monthRow.pendingCents += amountCents;
    }
    if (row.status === FinancialEntryStatus.OVERDUE) {
      monthRow.overdueCents += amountCents;
    }
    if (row.status !== FinancialEntryStatus.PAID) {
      continue;
    }

    if (row.type === FinancialEntryType.INCOME) {
      monthRow.incomeCents += amountCents;
    } else {
      monthRow.expenseCents += amountCents;
    }
    monthRow.balanceCents = monthRow.incomeCents - monthRow.expenseCents;
  }

  for (const game of games) {
    const row = monthly[monthFromDate(game.date) - 1];
    if (!row) {
      continue;
    }
    row.games += 1;
    if (game.status === GameStatus.FINISHED) {
      row.finishedGames += 1;
    }
  }

  for (const goal of goals) {
    const row = monthly[monthFromDate(goal.game.date) - 1];
    if (row) {
      row.goals += 1;
    }
  }

  for (const presence of presences) {
    const row = monthly[monthFromDate(presence.game.date) - 1];
    if (row) {
      row.presences += 1;
    }
  }

  const incomeCents = monthly.reduce((total, row) => total + row.incomeCents, 0);
  const expenseCents = monthly.reduce((total, row) => total + row.expenseCents, 0);
  const pendingCents = monthly.reduce((total, row) => total + row.pendingCents, 0);
  const overdueCents = monthly.reduce((total, row) => total + row.overdueCents, 0);
  const activeAthletes = athletes.filter((athlete) => athlete.status === AthleteStatus.ACTIVE).length;
  const createdAthletes = athletes.filter((athlete) => athlete.createdAt >= start && athlete.createdAt < end).length;
  const activeAssociates = associates.filter((associate) => associate.status === AssociateStatus.ACTIVE).length;
  const createdAssociates = associates.filter((associate) => associate.createdAt >= start && associate.createdAt < end).length;

  return {
    year,
    finance: {
      incomeCents,
      expenseCents,
      balanceCents: incomeCents - expenseCents,
      pendingCents,
      overdueCents,
      paidMonthlyFeesCents: paidMonthlyFeeAgg._sum.amountCents ?? 0,
      paidMonthlyFeesCount: paidMonthlyFeeAgg._count._all
    },
    sports: {
      games: games.length,
      finishedGames: games.filter((game) => game.status === GameStatus.FINISHED).length,
      goals: goals.length,
      lineups: totalLineups,
      presences: presences.length,
      draftAttempts,
      topScorer: scorers[0] || null,
      performance: {
        scorers: scorers.slice(0, 10),
        wins: competition.wins.slice(0, 10),
        contributions: competition.contributions.slice(0, 10),
        discipline: discipline.ranking.slice(0, 10)
      },
      results: games
        .filter((game) => game.status === GameStatus.FINISHED || game.redScore !== null || game.whiteScore !== null)
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .map((game) => ({
          id: game.id,
          date: game.date.toISOString(),
          location: game.location,
          status: game.status,
          redTeamName: game.redTeamName,
          whiteTeamName: game.whiteTeamName,
          redScore: game.redScore,
          whiteScore: game.whiteScore,
          winnerSide: game.winnerSide,
          isDraw: game.isDraw,
          finishedAt: game.finishedAt?.toISOString() ?? null
        })),
      discipline: {
        yellow: discipline.totals.yellow,
        red: discipline.totals.red,
        suspensions: discipline.totals.suspensions,
        activeSuspensions: discipline.activeSuspensions
      },
      confrontations
    },
    members: {
      activeAthletes,
      createdAthletes,
      activeAssociates,
      createdAssociates
    },
    audit: {
      actions: auditActions
    },
    monthly
  };
}

function computeDelta(current: number, previous: number) {
  return {
    value: current - previous,
    percent: previous > 0 ? Math.round(((current - previous) / previous) * 100) : null
  };
}

function emptyYearArchiveRow(year: number) {
  return {
    year,
    finance: {
      incomeCents: 0,
      expenseCents: 0,
      balanceCents: 0,
      pendingCents: 0,
      overdueCents: 0
    },
    sports: {
      games: 0,
      finishedGames: 0,
      goals: 0,
      presences: 0
    }
  };
}

async function computeHistoricalArchive(fromYear: number, toYear: number) {
  const startYear = Math.min(fromYear, toYear);
  const endYear = Math.max(fromYear, toYear);
  const years = Array.from({ length: endYear - startYear + 1 }, (_, index) => startYear + index);
  const byYear = new Map(years.map((item) => [item, emptyYearArchiveRow(item)]));
  const start = new Date(Date.UTC(startYear, 0, 1));
  const end = new Date(Date.UTC(endYear + 1, 0, 1));

  const [financialRows, games, goals, presences, presidents, boardTerms, uniformHistories, scorerYears, competitionYears] = await Promise.all([
    prisma.financialEntry.groupBy({
      by: ["competenceYear", "type", "status"],
      where: { competenceYear: { gte: startYear, lte: endYear } },
      _sum: { amountCents: true }
    }),
    prisma.game.findMany({
      where: { date: { gte: start, lt: end } },
      select: {
        id: true,
        date: true,
        location: true,
        status: true,
        championship: true,
        gameMode: true,
        isOfficial: true,
        redTeamName: true,
        whiteTeamName: true,
        redScore: true,
        whiteScore: true,
        winnerSide: true,
        isDraw: true,
        finishedAt: true
      }
    }),
    prisma.gameEvent.findMany({
      where: { type: EventType.GOAL, game: { date: { gte: start, lt: end } } },
      select: { game: { select: { date: true } } }
    }),
    prisma.gameLineup.findMany({
      where: { presence: true, game: { date: { gte: start, lt: end } } },
      select: { game: { select: { date: true } } }
    }),
    prisma.presidentTerm.findMany({
      where: {
        startedYear: { lte: endYear },
        OR: [{ endedYear: null }, { endedYear: { gte: startYear } }]
      },
      orderBy: [{ startedYear: "asc" }, { name: "asc" }]
    }),
    prisma.boardMemberTerm.findMany({
      where: {
        startedYear: { lte: endYear },
        OR: [{ endedYear: null }, { endedYear: { gte: startYear } }]
      },
      include: {
        associate: { select: { id: true, name: true, email: true, phone: true, status: true, athlete: { select: { photoUrl: true } } } },
        boardRole: { select: { id: true, name: true, description: true, canAccessAdmin: true, canAccessFinancial: true, canAccessAthlete: true } }
      },
      orderBy: [{ startedYear: "asc" }, { boardRole: { name: "asc" } }, { associate: { name: "asc" } }]
    }),
    prisma.uniformHistory.findMany({
      where: {
        OR: [
          { seasonYear: { gte: startYear, lte: endYear } },
          { seasonYear: null }
        ]
      },
      orderBy: [{ seasonYear: "desc" }, { seasonLabel: "desc" }, { side: "asc" }]
    }),
    Promise.all(years.map(async (year) => ({ year, ranking: await getScorerRanking(year) }))),
    Promise.all(years.map(async (year) => ({ year, ranking: await getCompetitionRanking(year) })))
  ]);

  for (const row of financialRows) {
    const archive = byYear.get(row.competenceYear);
    if (!archive) {
      continue;
    }

    const amountCents = row._sum.amountCents ?? 0;
    if (row.status === FinancialEntryStatus.PENDING) {
      archive.finance.pendingCents += amountCents;
    }
    if (row.status === FinancialEntryStatus.OVERDUE) {
      archive.finance.overdueCents += amountCents;
    }
    if (row.status !== FinancialEntryStatus.PAID) {
      continue;
    }

    if (row.type === FinancialEntryType.INCOME) {
      archive.finance.incomeCents += amountCents;
    } else {
      archive.finance.expenseCents += amountCents;
    }
    archive.finance.balanceCents = archive.finance.incomeCents - archive.finance.expenseCents;
  }

  for (const game of games) {
    const archive = byYear.get(game.date.getUTCFullYear());
    if (!archive) {
      continue;
    }
    archive.sports.games += 1;
    if (game.status === GameStatus.FINISHED) {
      archive.sports.finishedGames += 1;
    }
  }

  for (const goal of goals) {
    const archive = byYear.get(goal.game.date.getUTCFullYear());
    if (archive) {
      archive.sports.goals += 1;
    }
  }

  for (const presence of presences) {
    const archive = byYear.get(presence.game.date.getUTCFullYear());
    if (archive) {
      archive.sports.presences += 1;
    }
  }

  const scorerTotals = new Map<string, { athleteId: string; name: string; goals: number; assists: number; games: number }>();
  const winTotals = new Map<string, { athleteId: string; name: string; games: number; wins: number; draws: number; losses: number }>();

  const scoringByYear = scorerYears.map((item) => {
    for (const scorer of item.ranking) {
      const current = scorerTotals.get(scorer.athleteId) ?? {
        athleteId: scorer.athleteId,
        name: scorer.name,
        goals: 0,
        assists: 0,
        games: 0
      };
      current.goals += scorer.goals;
      current.assists += scorer.assists;
      current.games += scorer.games;
      scorerTotals.set(scorer.athleteId, current);
    }

    return {
      year: item.year,
      topScorers: item.ranking.slice(0, 10)
    };
  });

  const winsByYear = competitionYears.map((item) => {
    for (const winner of item.ranking.wins) {
      const current = winTotals.get(winner.athleteId) ?? {
        athleteId: winner.athleteId,
        name: winner.name,
        games: 0,
        wins: 0,
        draws: 0,
        losses: 0
      };
      current.games += winner.games;
      current.wins += winner.wins;
      current.draws += winner.draws;
      current.losses += winner.losses;
      winTotals.set(winner.athleteId, current);
    }

    return {
      year: item.year,
      topWins: item.ranking.wins.slice(0, 10)
    };
  });

  const gameResults = years.map((year) => ({
    year,
    games: games
      .filter((game) => game.date.getUTCFullYear() === year)
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .map((game) => ({
        id: game.id,
        date: game.date.toISOString(),
        location: game.location,
        status: game.status,
        championship: game.championship,
        gameMode: game.gameMode,
        isOfficial: game.isOfficial,
        redTeamName: game.redTeamName,
        whiteTeamName: game.whiteTeamName,
        redScore: game.redScore,
        whiteScore: game.whiteScore,
        winnerSide: game.winnerSide,
        isDraw: game.isDraw,
        finishedAt: game.finishedAt?.toISOString() ?? null
      }))
  }));

  return {
    period: { fromYear: startYear, toYear: endYear },
    yearClosures: Array.from(byYear.values()).sort((a, b) => b.year - a.year),
    allTime: {
      scorers: Array.from(scorerTotals.values())
        .map((item) => ({
          ...item,
          goalAverage: item.games > 0 ? Number((item.goals / item.games).toFixed(2)) : 0
        }))
        .sort((a, b) => b.goals - a.goals || b.assists - a.assists || a.name.localeCompare(b.name))
        .slice(0, 30),
      winners: Array.from(winTotals.values())
        .map((item) => ({
          ...item,
          winRate: item.games > 0 ? Number(((item.wins / item.games) * 100).toFixed(1)) : 0
        }))
        .sort((a, b) => b.wins - a.wins || b.winRate - a.winRate || b.games - a.games || a.name.localeCompare(b.name))
        .slice(0, 30)
    },
    scoringByYear: scoringByYear.sort((a, b) => b.year - a.year),
    winsByYear: winsByYear.sort((a, b) => b.year - a.year),
    gameResults: gameResults.sort((a, b) => b.year - a.year),
    presidents: presidents.map((president) => ({
      id: president.id,
      name: president.name,
      startedYear: president.startedYear,
      endedYear: president.endedYear,
      photoUrl: president.photoUrl,
      note: president.note,
      achievements: president.achievements
    })),
    boardTerms: boardTerms.map((term) => ({
      id: term.id,
      startedYear: term.startedYear,
      endedYear: term.endedYear,
      note: term.note,
      associate: term.associate,
      boardRole: term.boardRole
    })),
    uniformHistory: uniformHistories.map((uniform) => ({
      id: uniform.id,
      side: uniform.side,
      seasonLabel: uniform.seasonLabel,
      seasonYear: uniform.seasonYear,
      name: uniform.name,
      color: uniform.color,
      imageUrl: uniform.imageUrl,
      note: uniform.note
    }))
  };
}

export async function financeRoutes(app: FastifyInstance) {
  // Isolated encapsulation context: only this route needs the raw request body
  // (to verify the HMAC signature), so the buffer content-type parser is scoped
  // here and doesn't affect JSON parsing for the rest of financeRoutes.
  await app.register(async (webhookApp) => {
    webhookApp.addContentTypeParser("application/json", { parseAs: "buffer" }, (_request, body, done) => {
      done(null, body);
    });

    webhookApp.post(
      "/finance/pix-webhook/:provider",
      {
        // Fastify's AsyncLocalStorage-based tenant context (set by tenant.plugin.ts's
        // onRequest hook) does not survive body parsing on routes with no
        // authenticate/authorize preHandler to re-enter it afterwards (that preHandler is
        // what keeps it alive for every other authenticated route). This route is public,
        // so we re-enter it explicitly here, right before the handler, from the plain
        // `request.tenant` property (set by the same onRequest hook and unaffected by the
        // AsyncLocalStorage issue since it's a normal object property).
        preHandler: async (request) => {
          tenantContext.enterWith({ tenantId: request.tenant?.id ?? null, bypassTenant: false });
        }
      },
      async (request, reply) => {
      // This route is public (called by the PIX provider), so it has no
      // authenticated user. The tenant is resolved from the host/slug by the
      // tenant plugin. Refuse to run without a resolved tenant, otherwise the
      // Prisma queries below would run unscoped and could touch another tenant's
      // payment settings/records.
      if (!getTenantContext().tenantId) {
        return reply.status(400).send({ message: "Tenant não identificado para o webhook Pix" });
      }

      const params = pixWebhookParamsSchema.parse(request.params);
      const rawBody = request.body as Buffer;

      let parsedBody: unknown;
      try {
        parsedBody = rawBody.length ? JSON.parse(rawBody.toString("utf8")) : {};
      } catch {
        return reply.status(400).send({ message: "JSON inválido no webhook Pix" });
      }

      const payload = pixWebhookSchema.parse(parsedBody);
      const settings = await getPaymentSettings();

      if (!settings.providerWebhookSecret) {
        return reply.status(503).send({ message: "Webhook Pix não configurado" });
      }

      if (settings.paymentProvider !== "MANUAL_PIX" && settings.paymentProvider !== params.provider) {
        return reply.status(400).send({ message: "Provedor Pix diferente da configuração ativa" });
      }

      const signatureHeader = readWebhookHeader(request.headers, "x-gestasports-webhook-signature");
      const timestampHeader = readWebhookHeader(request.headers, "x-gestasports-webhook-timestamp");

      if (!verifyPixWebhookSignature(rawBody, settings.providerWebhookSecret, signatureHeader, timestampHeader)) {
        return reply.status(401).send({ message: "Assinatura do webhook Pix inválida ou expirada" });
      }

      const normalizedPayload = normalizePixWebhookPayload(payload);
      if (!normalizedPayload.status || !isPaidPixStatus(normalizedPayload.status)) {
        return {
          received: true,
          settled: false,
          message: "Evento recebido, mas status ainda não representa pagamento confirmado."
        };
      }

      const reference = normalizedPayload.reference;
      if (!reference) {
        return reply.status(400).send({ message: "Informe paymentId, externalReference ou txid no webhook Pix" });
      }

      const payment = await findPaymentFromPixReference(reference);
      if (!payment) {
        return reply.status(404).send({ message: "Mensalidade não encontrada para a referência Pix" });
      }

      if (normalizedPayload.amountCents !== undefined && normalizedPayload.amountCents !== payment.amountCents) {
        return reply.status(409).send({ message: "Valor do Pix não confere com a mensalidade" });
      }

      const settled = await settlePaymentFromPixWebhook({
        paymentId: payment.id,
        paidAt: normalizedPayload.paidAt ? new Date(normalizedPayload.paidAt) : new Date(),
        provider: params.provider,
        rawPayload: payload
      });

      if (!settled) {
        return reply.status(404).send({ message: "Mensalidade não encontrada" });
      }

      return {
        received: true,
        settled: settled.changed,
        payment: {
          id: settled.payment.id,
          status: settled.payment.status,
          paidAt: settled.payment.paidAt?.toISOString() ?? null
        }
      };
      }
    );
  });

  app.get("/finance/pix-settings", { preHandler: app.authorize(["ADMIN", "FINANCIAL"]) }, async () => {
    return toClientPaymentSettings(await getPaymentSettings());
  });

  app.patch("/finance/pix-settings", { preHandler: app.authorize(["ADMIN", "FINANCIAL"]) }, async (request) => {
    const payload = pixSettingsSchema.parse(request.body);

    const existing = await prisma.paymentSettings.findFirst();

    const data = {
        paymentMode: payload.paymentMode,
        paymentProvider: payload.paymentProvider,
        providerEnvironment: payload.providerEnvironment,
        providerApiKey: resolveSecret(payload.providerApiKey, existing?.providerApiKey),
        providerClientId: payload.providerClientId || null,
        providerClientSecret: resolveSecret(payload.providerClientSecret, existing?.providerClientSecret),
        providerWebhookSecret: resolveSecret(payload.providerWebhookSecret, existing?.providerWebhookSecret),
        providerWebhookUrl: payload.providerWebhookUrl || null,
        autoSettleEnabled: canUsePixAutoSettlement() ? payload.autoSettleEnabled : false,
        pixKey: payload.pixKey,
        pixReceiverName: payload.pixReceiverName,
        pixCity: payload.pixCity,
        pixAutoSettleSeconds: payload.pixAutoSettleSeconds,
        monthlyDueDay: payload.monthlyDueDay,
        lateFeeCents: payload.lateFeeCents,
        lateFeePercent: payload.lateFeePercent
      };

    if (existing) {
      await prisma.paymentSettings.update({ where: { id: existing.id }, data });
    } else {
      await prisma.paymentSettings.create({ data: { id: "main", ...data } });
    }

    return toClientPaymentSettings(await getPaymentSettings());
  });

  app.post("/finance/monthly-fees/generate", { preHandler: app.authorize(["ADMIN", "FINANCIAL"]) }, async (request) => {
    const query = reportQuerySchema.parse(request.query);
    return ensureMonthlyPaymentsForPeriod(query.month, query.year);
  });

  app.get("/finance/monthly-fees", { preHandler: app.authorize(["ADMIN", "FINANCIAL"]) }, async (request) => {
    const query = reportQuerySchema.parse(request.query);
    await ensureMonthlyPaymentsForPeriod(query.month, query.year);

    const payments = await prisma.payment.findMany({
      where: { month: query.month, year: query.year },
      include: {
        associate: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            status: true,
            monthlyFeeCents: true
          }
        }
      },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }, { associate: { name: "asc" } }]
    });

    return payments.map((payment) => ({
      id: payment.id,
      associateId: payment.associateId,
      associateName: payment.associate.name,
      email: payment.associate.email,
      phone: payment.associate.phone,
      associateStatus: payment.associate.status,
      monthlyFeeCents: payment.associate.monthlyFeeCents,
      month: payment.month,
      year: payment.year,
      amountCents: payment.amountCents,
      dueDate: payment.dueDate.toISOString(),
      paidAt: payment.paidAt?.toISOString() ?? null,
      status: payment.status,
      lateFeeAppliedCents: payment.lateFeeAppliedCents,
      lateFeeApplied: payment.lateFeeAppliedCents > 0,
      isProrataMonth: payment.isProrata,
      prorataFee: payment.isProrata ? payment.amountCents : null
    }));
  });

  app.post("/finance/monthly-fees/:id/manual-settle", { preHandler: app.authorize(["ADMIN", "FINANCIAL"]) }, async (request, reply) => {
    const params = paymentParamsSchema.parse(request.params);
    const payment = await prisma.payment.findUnique({
      where: { id: params.id },
      include: { associate: true }
    });

    if (!payment) {
      return reply.status(404).send({ message: "Mensalidade não encontrada" });
    }

    if (payment.status !== PaymentStatus.PAID) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.PAID,
          paidAt: new Date()
        }
      });

      await prisma.associate.update({
        where: { id: payment.associateId },
        data: { status: AssociateStatus.ACTIVE }
      });

      await settleMonthlyFeeIncome({
        associateId: payment.associateId,
        associateName: payment.associate.name,
        month: payment.month,
        year: payment.year,
        amountCents: payment.amountCents
      });
    }

    const updated = await prisma.payment.findUnique({
      where: { id: payment.id },
      include: {
        associate: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            status: true,
            monthlyFeeCents: true
          }
        }
      }
    });

    if (!updated) {
      return reply.status(404).send({ message: "Mensalidade não encontrada" });
    }

    return {
      id: updated.id,
      associateId: updated.associateId,
      associateName: updated.associate.name,
      email: updated.associate.email,
      phone: updated.associate.phone,
      associateStatus: updated.associate.status,
      monthlyFeeCents: updated.associate.monthlyFeeCents,
      month: updated.month,
      year: updated.year,
      amountCents: updated.amountCents,
      dueDate: updated.dueDate.toISOString(),
      paidAt: updated.paidAt?.toISOString() ?? null,
      status: updated.status
    };
  });

  app.post("/finance/monthly-fees/:id/refund", { preHandler: app.authorize(["ADMIN", "FINANCIAL"]) }, async (request, reply) => {
    const params = paymentParamsSchema.parse(request.params);
    const payload = refundPaymentSchema.parse(request.body);

    const payment = await prisma.payment.findUnique({
      where: { id: params.id },
      include: { associate: true }
    });

    if (!payment) {
      return reply.status(404).send({ message: "Mensalidade não encontrada" });
    }

    if (payment.status !== PaymentStatus.PAID) {
      return reply.status(409).send({ message: "Somente pagamentos quitados podem ser estornados" });
    }

    const refunded = await prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.REFUNDED,
          refundedAt: new Date(),
          refundReason: payload.reason
        }
      });

      await tx.financialEntry.create({
        data: {
          type: FinancialEntryType.EXPENSE,
          category: FinancialCategory.REFUND,
          description: `Estorno: ${payload.reason}`,
          amountCents: payment.amountCents,
          competenceMonth: payment.month,
          competenceYear: payment.year,
          status: FinancialEntryStatus.PAID,
          paidAt: new Date(),
          associateId: payment.associateId
        }
      });

      // The associate was marked ACTIVE when this payment settled; reversing it means
      // they're no longer confirmed up to date, so drop them back to LATE (there is no
      // "awaiting payment, not yet due" associate status distinct from ACTIVE).
      if (payment.associate.status === AssociateStatus.ACTIVE) {
        await tx.associate.update({
          where: { id: payment.associateId },
          data: { status: AssociateStatus.LATE }
        });
      }

      await tx.auditLog.create({
        data: {
          userId: request.user.sub,
          userName: request.user.name,
          userEmail: request.user.email,
          userRole: request.user.role,
          action: "payment:refund",
          method: request.method,
          path: request.url.split("?")[0] ?? request.url,
          statusCode: 200,
          targetType: "payment",
          targetId: payment.id,
          metadata: {
            reason: payload.reason,
            amountCents: payment.amountCents,
            associateId: payment.associateId
          }
        }
      });

      return updatedPayment;
    });

    return {
      id: refunded.id,
      status: refunded.status,
      amountCents: refunded.amountCents,
      refundedAt: refunded.refundedAt?.toISOString() ?? null,
      refundReason: refunded.refundReason
    };
  });

  app.post("/finance/guest-athletes/:athleteId/charge", { preHandler: app.authorize(["ADMIN", "FINANCIAL"]) }, async (request, reply) => {
    const params = guestAthleteParamsSchema.parse(request.params);
    const payload = guestChargeSchema.parse(request.body ?? {});

    const athlete = await prisma.athlete.findUnique({ where: { id: params.athleteId } });
    if (!athlete) {
      return reply.status(404).send({ message: "Atleta não encontrado" });
    }

    if (athlete.linkType !== AthleteLinkType.GUEST || !athlete.guestBillingEnabled) {
      return reply.status(400).send({ message: "Atleta não está habilitado para cobrança de convidado" });
    }

    const today = new Date();
    const month = payload.month ?? today.getUTCMonth() + 1;
    const year = payload.year ?? today.getUTCFullYear();

    const entry = await prisma.financialEntry.create({
      data: {
        type: FinancialEntryType.INCOME,
        category: FinancialCategory.GUEST_ATHLETE,
        description: `Cobrança avulsa - ${athlete.name}`,
        amountCents: athlete.guestFeeCents,
        competenceMonth: month,
        competenceYear: year,
        status: FinancialEntryStatus.PENDING,
        athleteId: athlete.id
      }
    });

    return reply.code(201).send(entry);
  });

  app.get("/finance/guest-athletes/charges", { preHandler: app.authorize(["ADMIN", "FINANCIAL"]) }, async (request) => {
    const query = reportQuerySchema.parse(request.query);

    const entries = await prisma.financialEntry.findMany({
      where: {
        category: FinancialCategory.GUEST_ATHLETE,
        competenceMonth: query.month,
        competenceYear: query.year
      },
      include: {
        athlete: { select: { id: true, name: true, position: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    return entries.map((entry) => ({
      id: entry.id,
      athleteId: entry.athleteId,
      athleteName: entry.athlete?.name ?? null,
      description: entry.description,
      amountCents: entry.amountCents,
      competenceMonth: entry.competenceMonth,
      competenceYear: entry.competenceYear,
      status: entry.status,
      paidAt: entry.paidAt?.toISOString() ?? null,
      createdAt: entry.createdAt.toISOString()
    }));
  });

  app.patch("/finance/guest-athletes/charges/:entryId/settle", { preHandler: app.authorize(["ADMIN", "FINANCIAL"]) }, async (request, reply) => {
    const params = guestChargeParamsSchema.parse(request.params);

    const entry = await prisma.financialEntry.findUnique({ where: { id: params.entryId } });
    if (!entry || entry.category !== FinancialCategory.GUEST_ATHLETE) {
      return reply.status(404).send({ message: "Cobrança de convidado não encontrada" });
    }

    const updated = await prisma.financialEntry.update({
      where: { id: entry.id },
      data: { status: FinancialEntryStatus.PAID, paidAt: new Date() }
    });

    return {
      id: updated.id,
      status: updated.status,
      paidAt: updated.paidAt?.toISOString() ?? null
    };
  });

  app.get("/finance/collection-dashboard", { preHandler: app.authorize(["ADMIN", "FINANCIAL"]) }, async (request) => {
    const query = reportQuerySchema.parse(request.query);
    return buildCollectionDashboard(query.month, query.year);
  });

  app.post("/finance/collection/run", { preHandler: app.authorize(["ADMIN", "FINANCIAL"]) }, async (request) => {
    const query = reportQuerySchema.parse(request.query);
    return runCollectionCadence(query.month, query.year);
  });

  app.get("/finance/collection/productivity", { preHandler: app.authorize(["ADMIN", "FINANCIAL"]) }, async (request) => {
    const query = reportQuerySchema.parse(request.query);
    return buildCollectionProductivity(query.month, query.year);
  });

  app.get("/finance/associates/:associateId/payment-history", { preHandler: app.authorize(["ADMIN", "FINANCIAL"]) }, async (request, reply) => {
    const params = associateParamsSchema.parse(request.params);
    const query = paymentHistoryQuerySchema.parse(request.query);

    const associate = await prisma.associate.findUnique({
      where: { id: params.associateId },
      select: { id: true, name: true, email: true, phone: true, status: true, monthlyFeeCents: true }
    });

    if (!associate) {
      return reply.status(404).send({ message: "Associado não encontrado" });
    }

    const now = new Date();
    const payments = await prisma.payment.findMany({
      where: {
        associateId: associate.id,
        OR: [
          { status: PaymentStatus.PAID },
          { status: PaymentStatus.LATE },
          { dueDate: { lt: now } }
        ]
      },
      orderBy: [{ year: "desc" }, { month: "desc" }, { dueDate: "desc" }],
      take: query.limit
    });

    return {
      associate: {
        id: associate.id,
        name: associate.name,
        email: associate.email,
        phone: associate.phone
      },
      payments: payments.map((payment) => ({
        id: payment.id,
        associateId: payment.associateId,
        associateName: associate.name,
        email: associate.email,
        phone: associate.phone,
        associateStatus: associate.status,
        monthlyFeeCents: associate.monthlyFeeCents,
        month: payment.month,
        year: payment.year,
        amountCents: payment.amountCents,
        dueDate: payment.dueDate.toISOString(),
        paidAt: payment.paidAt?.toISOString() ?? null,
        status: payment.status
      }))
    };
  });

  app.post("/finance/associates/:associateId/direct-checkout", { preHandler: app.authorize(["ADMIN", "FINANCIAL"]) }, async (request, reply) => {
    const params = associateParamsSchema.parse(request.params);
    const query = checkoutQuerySchema.parse(request.query);

    const associate = await prisma.associate.findUnique({ where: { id: params.associateId } });
    if (!associate) {
      return reply.status(404).send({ message: "Associado não encontrado" });
    }

    await ensureMonthlyPaymentsForPeriod(query.month, query.year);

    let payment = await prisma.payment.findFirst({
      where: {
        associateId: associate.id,
        month: query.month,
        year: query.year
      },
      orderBy: { createdAt: "desc" }
    });

    if (!payment) {
      payment = await prisma.payment.create({
        data: {
          associateId: associate.id,
          month: query.month,
          year: query.year,
          amountCents: associate.monthlyFeeCents,
          dueDate: dueDateForCompetence(query.month, query.year, (await getPaymentSettings()).monthlyDueDay),
          status: PaymentStatus.PENDING
        }
      });
    }

    const settings = await getPaymentSettings();
    const txid = createPixTxid(payment.id);
    const checkout = await createCheckoutForPayment({
      settings,
      payment,
      associateName: associate.name,
      txid
    });

    if (settings?.autoSettleEnabled && canUsePixAutoSettlement()) {
    scheduleAutoSettlement(payment.id, settings?.pixAutoSettleSeconds, async () => {
      const settled = await prisma.payment.updateMany({
        where: {
          id: payment.id,
          status: { in: [PaymentStatus.PENDING, PaymentStatus.LATE] }
        },
        data: {
          status: PaymentStatus.PAID,
          paidAt: new Date()
        }
      });

      if (settled.count > 0) {
        await prisma.associate.update({
          where: { id: associate.id },
          data: { status: AssociateStatus.ACTIVE }
        });

        await settleMonthlyFeeIncome({
          associateId: associate.id,
          associateName: associate.name,
          month: query.month,
          year: query.year,
          amountCents: payment.amountCents
        });

        if (associate.email) {
          try {
            await sendPaymentConfirmationEmail({
              to: associate.email,
              athleteName: associate.name,
              amountCents: payment.amountCents,
              month: query.month,
              year: query.year
            });
          } catch (error) {
            app.log.error({ error, email: associate.email }, "Falha ao enviar e-mail de confirmação de pagamento");
          }
        }
      }
    });
    }

    return {
      associate: {
        id: associate.id,
        name: associate.name,
        email: associate.email,
        phone: associate.phone
      },
      payment: {
        id: payment.id,
        month: payment.month,
        year: payment.year,
        amountCents: payment.amountCents,
        status: payment.status,
        dueDate: payment.dueDate.toISOString(),
        paidAt: payment.paidAt?.toISOString() ?? null
      },
      checkout: {
        txid,
        pixCopyPaste: checkout.pixCopyPaste,
        qrCodeDataUrl: checkout.qrCodeDataUrl,
        expiresAt: checkout.expiresAt,
        autoSettleSeconds: settings?.pixAutoSettleSeconds
      }
    };
  });

  app.get("/goalkeepers/contracts", { preHandler: app.authorize(["ADMIN", "FINANCIAL"]) }, async () => {
    const activeContracts = await prisma.goalkeeperContract.findMany({
      where: { active: true },
      select: { id: true, keeperName: true, athleteId: true }
    });

    for (const contract of activeContracts) {
      await ensureGoalkeeperContractAthlete(contract);
    }

    return prisma.goalkeeperContract.findMany({
      orderBy: [{ active: "desc" }, { startedAt: "desc" }],
      take: 100
    });
  });

  app.post("/goalkeepers/contracts", { preHandler: app.authorize(["ADMIN", "FINANCIAL"]) }, async (request, reply) => {
    const payload = createGoalkeeperContractSchema.parse(request.body);

    const contract = await prisma.goalkeeperContract.create({
      data: {
        keeperName: payload.keeperName,
        monthlyCostCents: payload.monthlyCostCents,
        startedAt: new Date(payload.startedAt),
        endsAt: payload.endsAt ? new Date(payload.endsAt) : null,
        active: payload.active,
        costModel: payload.costModel,
        paymentMethod: payload.paymentMethod || null,
        note: payload.note || null,
        costCenter: payload.costCenter || null
      }
    });

    if (contract.active) {
      await ensureGoalkeeperContractAthlete(contract);
    }

    const saved = await prisma.goalkeeperContract.findUniqueOrThrow({ where: { id: contract.id } });

    return reply.code(201).send(saved);
  });

  app.patch("/goalkeepers/contracts/:id", { preHandler: app.authorize(["ADMIN", "FINANCIAL"]) }, async (request) => {
    const { id } = goalkeeperParamsSchema.parse(request.params);
    const payload = updateGoalkeeperContractSchema.parse(request.body);

    const contract = await prisma.goalkeeperContract.update({
      where: { id },
      data: {
        ...(payload.keeperName ? { keeperName: payload.keeperName } : {}),
        ...(payload.monthlyCostCents !== undefined ? { monthlyCostCents: payload.monthlyCostCents } : {}),
        ...(payload.startedAt ? { startedAt: new Date(payload.startedAt) } : {}),
        ...(payload.endsAt !== undefined ? { endsAt: payload.endsAt ? new Date(payload.endsAt) : null } : {}),
        ...(payload.active !== undefined ? { active: payload.active } : {}),
        ...(payload.costModel ? { costModel: payload.costModel } : {}),
        ...(payload.paymentMethod !== undefined ? { paymentMethod: payload.paymentMethod || null } : {}),
        ...(payload.note !== undefined ? { note: payload.note || null } : {}),
        ...(payload.costCenter !== undefined ? { costCenter: payload.costCenter || null } : {})
      }
    });

    if (contract.active) {
      await ensureGoalkeeperContractAthlete(contract);
    }

    return prisma.goalkeeperContract.findUniqueOrThrow({ where: { id } });
  });

  app.delete("/goalkeepers/contracts/:id", { preHandler: app.authorize(["ADMIN", "FINANCIAL"]) }, async (request, reply) => {
    const { id } = goalkeeperParamsSchema.parse(request.params);
    await prisma.goalkeeperContract.delete({ where: { id } });
    return reply.status(204).send();
  });

  app.get("/finance/expenses", { preHandler: app.authorize(["ADMIN", "FINANCIAL"]) }, async () => {
    const expenses = await prisma.expense.findMany({
      orderBy: { occurredAt: "desc" },
      take: 100
    });

    return expenses;
  });

  app.post("/finance/expenses", { preHandler: app.authorize(["ADMIN", "FINANCIAL"]) }, async (request, reply) => {
    const payload = createExpenseSchema.parse(request.body);

    const expense = await prisma.expense.create({
      data: {
        description: payload.description,
        category: payload.category,
        amountCents: payload.amountCents,
        occurredAt: new Date(payload.occurredAt)
      }
    });

    return reply.code(201).send(expense);
  });

  app.get("/finance/entries", { preHandler: app.authorize(["ADMIN", "FINANCIAL"]) }, async (request) => {
    const query = financialQuerySchema.parse(request.query);

    return prisma.financialEntry.findMany({
      where: buildFinancialWhereClause(query),
      orderBy: [{ competenceYear: "desc" }, { competenceMonth: "desc" }, { createdAt: "desc" }],
      take: 500
    });
  });

  app.post("/finance/entries", { preHandler: app.authorize(["ADMIN", "FINANCIAL"]) }, async (request, reply) => {
    const payload = createFinancialEntrySchema.parse(request.body);

    const entry = await prisma.financialEntry.create({
      data: {
        type: payload.type,
        category: payload.category,
        description: payload.description,
        amountCents: payload.amountCents,
        competenceMonth: payload.competenceMonth,
        competenceYear: payload.competenceYear,
        status: payload.status,
        dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
        paidAt: payload.paidAt ? new Date(payload.paidAt) : null,
        associateId: payload.associateId || null,
        goalkeeperContractId: payload.goalkeeperContractId || null,
        receiptUrl: payload.receiptUrl || null,
        costCenter: payload.costCenter || null
      }
    });

    return reply.code(201).send(entry);
  });

  app.patch("/finance/entries/:id", { preHandler: app.authorize(["ADMIN", "FINANCIAL"]) }, async (request) => {
    const { id } = entryParamsSchema.parse(request.params);
    const payload = updateFinancialEntrySchema.parse(request.body);

    return prisma.financialEntry.update({
      where: { id },
      data: {
        ...(payload.type ? { type: payload.type } : {}),
        ...(payload.category ? { category: payload.category } : {}),
        ...(payload.description ? { description: payload.description } : {}),
        ...(payload.amountCents !== undefined ? { amountCents: payload.amountCents } : {}),
        ...(payload.competenceMonth !== undefined ? { competenceMonth: payload.competenceMonth } : {}),
        ...(payload.competenceYear !== undefined ? { competenceYear: payload.competenceYear } : {}),
        ...(payload.status ? { status: payload.status } : {}),
        ...(payload.dueDate !== undefined ? { dueDate: payload.dueDate ? new Date(payload.dueDate) : null } : {}),
        ...(payload.paidAt !== undefined ? { paidAt: payload.paidAt ? new Date(payload.paidAt) : null } : {}),
        ...(payload.associateId !== undefined ? { associateId: payload.associateId || null } : {}),
        ...(payload.goalkeeperContractId !== undefined ? { goalkeeperContractId: payload.goalkeeperContractId || null } : {}),
        ...(payload.receiptUrl !== undefined ? { receiptUrl: payload.receiptUrl || null } : {}),
        ...(payload.costCenter !== undefined ? { costCenter: payload.costCenter || null } : {})
      }
    });
  });

  app.delete("/finance/entries/:id", { preHandler: app.authorize(["ADMIN", "FINANCIAL"]) }, async (request, reply) => {
    const { id } = entryParamsSchema.parse(request.params);
    await prisma.financialEntry.delete({ where: { id } });
    return reply.status(204).send();
  });

  app.get("/finance/summary", { preHandler: app.authorize(["ADMIN", "FINANCIAL"]) }, async (request) => {
    const query = reportQuerySchema.parse(request.query);
    return computeFinancialSummary(query.month, query.year);
  });

  app.get("/finance/reports/period", { preHandler: app.authorize(["ADMIN", "FINANCIAL"]) }, async (request) => {
    const query = financePeriodReportQuerySchema.parse(request.query);
    return computeFinancePeriodReport(query.month, query.year, query.range);
  });

  app.get("/reports/summary", { preHandler: app.authorize(["ADMIN", "FINANCIAL"]) }, async (request) => {
    const query = reportQuerySchema.parse(request.query);

    const [financial, scorers, discipline, confrontations] = await Promise.all([
      computeFinancialSummary(query.month, query.year),
      getScorerRanking(query.year),
      getDisciplineRanking(query.year),
      getConfrontationStats(query.year)
    ]);

    return {
      period: { month: query.month, year: query.year },
      financial,
      topScorer: scorers[0] || null,
      discipline: {
        yellow: discipline.totals.yellow,
        red: discipline.totals.red,
        suspensions: discipline.totals.suspensions,
        activeSuspensions: discipline.activeSuspensions
      },
      confrontations
    };
  });

  app.get("/reports/year-comparison", { preHandler: app.authorize(["ADMIN", "FINANCIAL"]) }, async (request) => {
    const query = yearComparisonQuerySchema.parse(request.query);
    const [current, previous] = await Promise.all([
      computeYearComparisonSnapshot(query.year),
      computeYearComparisonSnapshot(query.compareYear)
    ]);

    return {
      current,
      previous,
      deltas: {
        incomeCents: computeDelta(current.finance.incomeCents, previous.finance.incomeCents),
        expenseCents: computeDelta(current.finance.expenseCents, previous.finance.expenseCents),
        balanceCents: computeDelta(current.finance.balanceCents, previous.finance.balanceCents),
        games: computeDelta(current.sports.games, previous.sports.games),
        goals: computeDelta(current.sports.goals, previous.sports.goals),
        presences: computeDelta(current.sports.presences, previous.sports.presences),
        activeAthletes: computeDelta(current.members.activeAthletes, previous.members.activeAthletes),
        activeAssociates: computeDelta(current.members.activeAssociates, previous.members.activeAssociates),
        auditActions: computeDelta(current.audit.actions, previous.audit.actions)
      }
    };
  });

  app.get("/reports/historical-archive", { preHandler: app.authorize(["ADMIN", "FINANCIAL"]) }, async (request) => {
    const query = historicalArchiveQuerySchema.parse(request.query);
    return computeHistoricalArchive(query.fromYear, query.toYear);
  });

  app.get("/president-terms", { preHandler: app.authorize(["ADMIN", "FINANCIAL"]) }, async () => {
    return prisma.presidentTerm.findMany({
      orderBy: [{ startedYear: "asc" }, { name: "asc" }]
    });
  });

  app.post("/president-terms", { preHandler: app.authorize(["ADMIN"]) }, async (request, reply) => {
    const payload = presidentTermSchema.parse(request.body);
    const president = await prisma.presidentTerm.create({
      data: {
        name: payload.name,
        startedYear: payload.startedYear,
        endedYear: payload.endedYear || null,
        photoUrl: payload.photoUrl || null,
        note: payload.note || null,
        achievements: payload.achievements || null
      }
    });

    return reply.code(201).send(president);
  });

  app.patch("/president-terms/:id", { preHandler: app.authorize(["ADMIN"]) }, async (request) => {
    const params = presidentTermParamsSchema.parse(request.params);
    const payload = presidentTermSchema.partial().parse(request.body);

    return prisma.presidentTerm.update({
      where: { id: params.id },
      data: {
        ...(payload.name !== undefined ? { name: payload.name } : {}),
        ...(payload.startedYear !== undefined ? { startedYear: payload.startedYear } : {}),
        ...(payload.endedYear !== undefined ? { endedYear: payload.endedYear || null } : {}),
        ...(payload.photoUrl !== undefined ? { photoUrl: payload.photoUrl || null } : {}),
        ...(payload.note !== undefined ? { note: payload.note || null } : {}),
        ...(payload.achievements !== undefined ? { achievements: payload.achievements || null } : {})
      }
    });
  });

  app.delete("/president-terms/:id", { preHandler: app.authorize(["ADMIN"]) }, async (request, reply) => {
    const params = presidentTermParamsSchema.parse(request.params);
    await prisma.presidentTerm.delete({ where: { id: params.id } });
    return reply.status(204).send();
  });

  app.get("/reports/finance/export.csv", { preHandler: app.authorize(["ADMIN", "FINANCIAL"]) }, async (request, reply) => {
    const query = reportQuerySchema.parse(request.query);

    const entries = await prisma.financialEntry.findMany({
      where: {
        competenceMonth: query.month,
        competenceYear: query.year
      },
      orderBy: [{ competenceYear: "asc" }, { competenceMonth: "asc" }, { createdAt: "asc" }]
    });

    const rows = [
      [
        "id",
        "tipo",
        "categoria",
        "descrição",
        "valor_centavos",
        "mês",
        "ano",
        "status",
        "vencimento",
        "pagamento",
        "comprovante_url"
      ],
      ...entries.map((entry) => [
        entry.id,
        financialTypeLabel(entry.type),
        financialCategoryLabel(entry.category),
        entry.description,
        entry.amountCents,
        entry.competenceMonth,
        entry.competenceYear,
        financialStatusLabel(entry.status),
        entry.dueDate ? entry.dueDate.toISOString() : null,
        entry.paidAt ? entry.paidAt.toISOString() : null,
        entry.receiptUrl
      ])
    ];

    const csv = rows
      .map((row) => row.map((value) => escapeCsv(value as string | number | null)).join(","))
      .join("\n");

    reply.header("Content-Type", "text/csv; charset=utf-8");
    reply.header("Content-Disposition", `attachment; filename=financeiro_${query.year}_${query.month}.csv`);
    return reply.send(csv);
  });
}

