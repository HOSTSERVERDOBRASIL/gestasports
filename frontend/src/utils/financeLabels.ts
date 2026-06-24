import type { FinancialEntry } from "../types/domain";

export type FinancialCategory =
  | "MONTHLY_FEE"
  | "EVENTS"
  | "SPONSORSHIP"
  | "FUNDRAISING"
  | "FIELD"
  | "GOALKEEPERS"
  | "REFEREE"
  | "GOALKEEPER_CONTRACT"
  | "UNIFORMS"
  | "ADMINISTRATIVE"
  | "OTHER";

export type FinancialEntryCategory = Exclude<FinancialCategory, "GOALKEEPERS">;
export type FinancialEntryType = FinancialEntry["type"];
export type FinancialEntryStatus = FinancialEntry["status"];

export const typeLabels: Record<FinancialEntryType, string> = {
  INCOME: "Receita",
  EXPENSE: "Despesa"
};

export const statusLabels: Record<FinancialEntryStatus, string> = {
  PENDING: "Pendente",
  PAID: "Pago",
  OVERDUE: "Vencido",
  CANCELED: "Cancelado"
};

export const categoryLabels: Record<FinancialCategory, string> = {
  MONTHLY_FEE: "Mensalidade",
  EVENTS: "Eventos",
  SPONSORSHIP: "Patrocínio",
  FUNDRAISING: "Arrecadação",
  FIELD: "Campo",
  GOALKEEPERS: "Goleiros",
  REFEREE: "Arbitragem",
  GOALKEEPER_CONTRACT: "Contrato de goleiro",
  UNIFORMS: "Uniformes",
  ADMINISTRATIVE: "Administrativo",
  OTHER: "Outros"
};

export const incomeCategoryOptions: FinancialEntryCategory[] = ["MONTHLY_FEE", "EVENTS", "SPONSORSHIP", "FUNDRAISING", "OTHER"];

export const expenseCategoryOptions: FinancialEntryCategory[] = ["FIELD", "REFEREE", "GOALKEEPER_CONTRACT", "UNIFORMS", "ADMINISTRATIVE", "EVENTS", "OTHER"];

export function getCategoryOptions(type: FinancialEntryType) {
  return type === "INCOME" ? incomeCategoryOptions : expenseCategoryOptions;
}

export function formatFinancialType(value: string) {
  return typeLabels[value as FinancialEntryType] ?? value;
}

export function formatFinancialStatus(value: string) {
  return statusLabels[value as FinancialEntryStatus] ?? value;
}

export function formatFinancialCategory(value: string) {
  return categoryLabels[value as FinancialCategory] ?? value;
}
