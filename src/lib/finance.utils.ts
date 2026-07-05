import { FinancialCategory, FinancialEntryStatus, FinancialEntryType } from "@prisma/client";
import { prisma } from "./prisma.js";

export function dueDateForCompetence(month: number, year: number, dueDay: number) {
  return new Date(Date.UTC(year, month - 1, Math.min(Math.max(dueDay, 1), 28)));
}

export async function settleMonthlyFeeIncome(input: {
  associateId: string;
  associateName: string;
  month: number;
  year: number;
  amountCents: number;
}) {
  const description = `Mensalidade - ${input.associateName}`;
  const existing = await prisma.financialEntry.findFirst({
    where: {
      associateId: input.associateId,
      competenceMonth: input.month,
      competenceYear: input.year,
      category: FinancialCategory.MONTHLY_FEE,
      type: FinancialEntryType.INCOME
    },
    orderBy: { createdAt: "desc" }
  });

  if (existing) {
    await prisma.financialEntry.update({
      where: { id: existing.id },
      data: {
        description,
        amountCents: input.amountCents,
        status: FinancialEntryStatus.PAID,
        paidAt: new Date()
      }
    });
    return;
  }

  await prisma.financialEntry.create({
    data: {
      type: FinancialEntryType.INCOME,
      category: FinancialCategory.MONTHLY_FEE,
      description,
      amountCents: input.amountCents,
      competenceMonth: input.month,
      competenceYear: input.year,
      status: FinancialEntryStatus.PAID,
      paidAt: new Date(),
      associateId: input.associateId
    }
  });
}
