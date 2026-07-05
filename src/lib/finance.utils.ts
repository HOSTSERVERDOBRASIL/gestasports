import { FinancialCategory, FinancialEntryStatus, FinancialEntryType } from "@prisma/client";
import { prisma } from "./prisma.js";

export function dueDateForCompetence(month: number, year: number, dueDay: number) {
  return new Date(Date.UTC(year, month - 1, Math.min(Math.max(dueDay, 1), 28)));
}

/** Pro-rated fee for the first month of membership, based on days remaining from joinDate through month end. */
export function prorataFeeForJoinDate(joinDate: Date, monthlyFeeCents: number) {
  const year = joinDate.getUTCFullYear();
  const month = joinDate.getUTCMonth() + 1;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const remainingDays = daysInMonth - joinDate.getUTCDate() + 1;
  const prorataFeeCents = Math.round((monthlyFeeCents * remainingDays) / daysInMonth);

  return { month, year, daysInMonth, remainingDays, prorataFeeCents, isProrata: remainingDays < daysInMonth };
}

export async function settleMonthlyFeeIncome(
  input: {
    associateId: string;
    associateName: string;
    month: number;
    year: number;
    amountCents: number;
  },
  client: Pick<typeof prisma, "financialEntry"> = prisma
) {
  const description = `Mensalidade - ${input.associateName}`;
  const existing = await client.financialEntry.findFirst({
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
    await client.financialEntry.update({
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

  await client.financialEntry.create({
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
