import { Fragment, useEffect, useMemo, useState, type FormEvent, type ReactNode } from"react";
import { useMutation, useQuery, useQueryClient } from"@tanstack/react-query";
import { useLocation, useNavigate, useOutletContext } from"react-router-dom";
import { AlertCircle, AlertTriangle, CheckCircle2, ChevronDown, Clock3, Coins, Download, Eye, FileText, ListChecks, Pencil, PlusCircle, ReceiptText, Trash2, TrendingDown, TrendingUp, WalletCards } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiDownload, apiRequest } from"../services/api";
import { formatCurrency, formatDateTime } from "../utils/formatters";
import { PixCheckoutModal } from "../components/ui/PixCheckoutModal";
import type {
  Associate,
  CollectionDashboard,
  CollectionProductivity,
  CollectionRunResult,
  DirectChargeCheckoutResponse,
  FinancialEntry,
  FinancePeriodReport,
  FinancialSummary,
  MonthlyFeeGenerationResult,
  MonthlyFeePaymentHistory,
  MonthlyFeePayment
} from"../types/domain";
import {
  formatFinancialCategory,
  formatFinancialStatus,
  formatFinancialType,
  getCategoryOptions,
  statusLabels,
  typeLabels,
  type FinancialEntryCategory
} from "../utils/financeLabels";
import { SegmentedControl, Surface } from "../components/ui/AppUI";
import { FinanceAreaTabs, type FinanceAreaTabValue } from "./finance/FinanceAreaTabs";
import { FinanceOperationPanel } from "./finance/FinanceOperationPanel";
import { FinanceEntryForm, type FinancialEntryFormState } from "./finance/FinanceEntryForm";

type OutletPeriod = {
  month: number;
  year: number;
};

type EntryPayload = {
  type:"INCOME" |"EXPENSE";
  category: FinancialEntryCategory;
  description: string;
  amountCents: number;
  competenceMonth: number;
  competenceYear: number;
  status:"PENDING" |"PAID" |"OVERDUE" |"CANCELED";
  dueDate?: string;
  paidAt?: string;
  receiptUrl?: string;
  costCenter?: string;
  associateId?: string;
};

type FinanceArea = FinanceAreaTabValue;

const paymentStatusLabels: Record<MonthlyFeePayment["status"], string> = {
  PAID: "Pago",
  PENDING: "Não pago",
  LATE: "Em atraso"
};

function daysUntil(dateIso: string) {
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const target = new Date(dateIso);
  const targetStart = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const diffMs = targetStart.getTime() - todayStart.getTime();
  return Math.round(diffMs / 86_400_000);
}

function dateInputValue(value: string | null) {
  if (!value) {
    return "";
  }

  return value.slice(0, 10);
}

function onlyDigits(value: string | null) {
  return (value ?? "").replace(/\D/g, "");
}

function chargeStageForDays(days: number) {
  if (days < -15) return "D+15";
  if (days < -7) return "D+7";
  if (days < -3) return "D+3";
  if (days < 0) return "Atrasada";
  if (days <= 3) return "D-3";
  if (days <= 5) return "Vencendo";
  return "Aberta";
}

function chargePriorityForDays(days: number) {
  if (days < -7) return "Alta";
  if (days < 0) return "Média";
  if (days <= 3) return "Preventiva";
  return "Baixa";
}

function whatsappChargeUrl(payment: MonthlyFeePayment) {
  const phone = onlyDigits(payment.phone);
  const text = `Olá ${payment.associateName}, sua mensalidade ${String(payment.month).padStart(2, "0")}/${payment.year} no valor de ${formatCurrency(payment.amountCents)} vence em ${new Date(payment.dueDate).toLocaleDateString("pt-BR")}. Posso te enviar o PIX`;
  return `https://wa.me/${phone || ""}?text=${encodeURIComponent(text)}`;
}

function FinanceMetricCard({
  label,
  value,
  hint,
  icon,
  tone = "slate"
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: ReactNode;
  tone: "green" | "red" | "amber" | "slate";
}) {
  const toneClass = {
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    red: "bg-red-50 text-red-700 border-red-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    slate: "bg-slate-50 text-slate-700 border-slate-200"
  }[tone];

  return (
    <Surface className="min-h-[7.25rem]" padding="sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-black uppercase tracking-[0.08em] text-slate-500">{label}</p>
          <strong className="mt-2 block truncate text-2xl font-black text-slate-950">{value}</strong>
          <p className="mt-1 truncate text-xs font-semibold text-slate-500">{hint}</p>
        </div>
        <span className={`grid size-10 shrink-0 place-items-center rounded-lg border ${toneClass}`}>{icon}</span>
      </div>
    </Surface>
  );
}

export function FinanceiroPage() {
  const { month, year } = useOutletContext<OutletPeriod>();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [financeArea, setFinanceArea] = useState<FinanceArea>("DASHBOARD");
  const [financeView, setFinanceView] = useState<"OPERACAO" | "ADMIN" | "REPORTS">("OPERACAO");
  const [financeOperationView, setFinanceOperationView] = useState<"LANCAMENTOS" | "NOVO">("LANCAMENTOS");
  const [reportRange, setReportRange] = useState<FinancePeriodReport["range"]>("QUARTER");

  const [typeFilter, setTypeFilter] = useState<"ALL" |"INCOME" |"EXPENSE">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | FinancialEntry["status"]>("ALL");
  const [collectionQueueFilter, setCollectionQueueFilter] = useState<"ALL" | "OVERDUE" | "DUE_SOON" | "NO_CONTACT">("ALL");
  const [checkoutPreview, setCheckoutPreview] = useState<DirectChargeCheckoutResponse | null>(null);
  const [pixCheckoutModalOpen, setPixCheckoutModalOpen] = useState(false);
  const [expandedCollectionAssociateId, setExpandedCollectionAssociateId] = useState<string | null>(null);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);

  const [form, setForm] = useState<FinancialEntryFormState>({
    type:"EXPENSE" as EntryPayload["type"],
    category:"FIELD" as FinancialEntryCategory,
    description:"",
    amountBRL:"",
    status:"PENDING" as EntryPayload["status"],
    dueDate:"",
    paidAt:"",
    receiptUrl:"",
    costCenter:"",
    associateId:""
  });

  const filtersQuery = useMemo(() => {
    const params = new URLSearchParams({ month: String(month), year: String(year) });
    if (typeFilter !=="ALL") {
      params.set("type", typeFilter);
    }
    if (statusFilter !=="ALL") {
      params.set("status", statusFilter);
    }
    return params.toString();
  }, [month, year, typeFilter, statusFilter]);

  const categoryOptions = useMemo(() => getCategoryOptions(form.type), [form.type]);

  const entriesQuery = useQuery({
    queryKey: ["finance-entries", month, year, typeFilter, statusFilter],
    queryFn: () => apiRequest<FinancialEntry[]>(`/finance/entries?${filtersQuery}`)
  });

  const associatesQuery = useQuery({
    queryKey: ["associates", "finance"],
    queryFn: () => apiRequest<Associate[]>("/associates")
  });
  const associateById = useMemo(
    () => new Map((associatesQuery.data ?? []).map((associate) => [associate.id, associate])),
    [associatesQuery.data]
  );
  const associateNameById = useMemo(
    () => new Map((associatesQuery.data ?? []).map((associate) => [associate.id, associate.name])),
    [associatesQuery.data]
  );

  const summaryQuery = useQuery({
    queryKey: ["finance-summary", month, year],
    queryFn: () => apiRequest<FinancialSummary>(`/finance/summary?month=${month}&year=${year}`)
  });

  const periodReportQuery = useQuery({
    queryKey: ["finance-period-report", month, year, reportRange],
    queryFn: () => apiRequest<FinancePeriodReport>(`/finance/reports/period?month=${month}&year=${year}&range=${reportRange}`)
  });

  const collectionDashboardQuery = useQuery({
    queryKey: ["finance-collection-dashboard", month, year],
    queryFn: () => apiRequest<CollectionDashboard>(`/finance/collection-dashboard?month=${month}&year=${year}`)
  });

  const collectionProductivityQuery = useQuery({
    queryKey: ["finance-collection-productivity", month, year],
    queryFn: () => apiRequest<CollectionProductivity>(`/finance/collection/productivity?month=${month}&year=${year}`)
  });

  const monthlyFeesQuery = useQuery({
    queryKey: ["finance-monthly-fees", month, year],
    queryFn: () => apiRequest<MonthlyFeePayment[]>(`/finance/monthly-fees?month=${month}&year=${year}`)
  });

  const expandedPaymentHistoryQuery = useQuery({
    queryKey: ["finance-associate-payment-history", expandedCollectionAssociateId],
    queryFn: () => apiRequest<MonthlyFeePaymentHistory>(`/finance/associates/${expandedCollectionAssociateId}/payment-history?limit=3`),
    enabled: Boolean(expandedCollectionAssociateId)
  });

  const createMutation = useMutation({
    mutationFn: (payload: EntryPayload) =>
      apiRequest<FinancialEntry>("/finance/entries", {
        method:"POST",
        body: JSON.stringify(payload)
      }),
    onSuccess: () => {
      setForm((prev) => ({ ...prev, description:"", amountBRL:"", dueDate:"", paidAt:"", receiptUrl:"", costCenter:"", associateId:"" }));
      void queryClient.invalidateQueries({ queryKey: ["finance-entries"] });
      void queryClient.invalidateQueries({ queryKey: ["finance-summary"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    }
  });

  const updateEntryMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<EntryPayload> }) =>
      apiRequest<FinancialEntry>(`/finance/entries/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      }),
    onSuccess: () => {
      setEditingEntryId(null);
      setFinanceOperationView("LANCAMENTOS");
      setForm((prev) => ({ ...prev, description:"", amountBRL:"", dueDate:"", paidAt:"", receiptUrl:"", costCenter:"", associateId:"" }));
      void queryClient.invalidateQueries({ queryKey: ["finance-entries"] });
      void queryClient.invalidateQueries({ queryKey: ["finance-summary"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, paidAt }: { id: string; status: FinancialEntry["status"]; paidAt: string | null }) =>
      apiRequest<FinancialEntry>(`/finance/entries/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          ...(paidAt !== undefined ? { paidAt } : {})
        })
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["finance-entries"] });
      void queryClient.invalidateQueries({ queryKey: ["finance-summary"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    }
  });

  const deleteEntryMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest<void>(`/finance/entries/${id}`, {
        method: "DELETE"
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["finance-entries"] });
      void queryClient.invalidateQueries({ queryKey: ["finance-summary"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    }
  });

  const runCadenceMutation = useMutation({
    mutationFn: () => apiRequest<CollectionRunResult>(`/finance/collection/run?month=${month}&year=${year}`, { method: "POST" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["finance-collection-dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["finance-collection-productivity"] });
    }
  });

  const generateMonthlyFeesMutation = useMutation({
    mutationFn: () => apiRequest<MonthlyFeeGenerationResult>(`/finance/monthly-fees/generate?month=${month}&year=${year}`, { method: "POST" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["finance-monthly-fees"] });
      void queryClient.invalidateQueries({ queryKey: ["finance-collection-dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["finance-summary"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    }
  });

  const directChargeMutation = useMutation({
    mutationFn: (associateId: string) =>
      apiRequest<DirectChargeCheckoutResponse>(`/finance/associates/${associateId}/direct-checkout?month=${month}&year=${year}`, {
        method: "POST"
    }),
    onSuccess: (response) => {
      setCheckoutPreview(response);
      setPixCheckoutModalOpen(true);
      void queryClient.invalidateQueries({ queryKey: ["finance-monthly-fees"] });
      window.setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: ["finance-monthly-fees"] });
        void queryClient.invalidateQueries({ queryKey: ["finance-collection-dashboard"] });
        void queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      }, (response.checkout.autoSettleSeconds + 1) * 1000);
    }
  });

  const manualSettleMonthlyFeeMutation = useMutation({
    mutationFn: (paymentId: string) =>
      apiRequest<MonthlyFeePayment>(`/finance/monthly-fees/${paymentId}/manual-settle`, {
        method: "POST"
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["finance-monthly-fees"] });
      void queryClient.invalidateQueries({ queryKey: ["finance-collection-dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["finance-collection-productivity"] });
      void queryClient.invalidateQueries({ queryKey: ["finance-entries"] });
      void queryClient.invalidateQueries({ queryKey: ["finance-summary"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    }
  });

  const handleToggleCollectionDetail = (payment: MonthlyFeePayment) => {
    setExpandedCollectionAssociateId((current) => {
      const next = current === payment.associateId ? null : payment.associateId;
      return next;
    });
  };

  async function handleGeneratePix(associateId: string) {
    await directChargeMutation.mutateAsync(associateId);
    setPixCheckoutModalOpen(true);
  }

  const entries = entriesQuery.data ?? [];
  const monthlyFees = monthlyFeesQuery.data ?? [];
  const summary = summaryQuery.data ?? ({
    month,
    year,
    incomeCents: 0,
    expenseCents: 0,
    balanceCents: 0,
    pendingCount: 0,
    overdueCount: 0,
    byCategory: []
  } satisfies FinancialSummary);
  const filteredIncomeCents = entries.filter((entry) => entry.type === "INCOME").reduce((total, entry) => total + entry.amountCents, 0);
  const filteredExpenseCents = entries.filter((entry) => entry.type === "EXPENSE").reduce((total, entry) => total + entry.amountCents, 0);
  const filteredBalanceCents = filteredIncomeCents - filteredExpenseCents;
  const statementEntries = [...entries].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const paidMonthlyFees = monthlyFees.filter((payment) => payment.status === "PAID");
  const openMonthlyFees = monthlyFees.filter((payment) => payment.status !== "PAID");
  const overdueMonthlyFees = openMonthlyFees
    .filter((payment) => payment.status === "LATE" || daysUntil(payment.dueDate) < 0)
    .sort((a, b) => daysUntil(a.dueDate) - daysUntil(b.dueDate));
  const dueSoonMonthlyFees = openMonthlyFees
    .filter((payment) => {
      const remainingDays = daysUntil(payment.dueDate);
      return remainingDays >= 0 && remainingDays <= 5;
    })
    .sort((a, b) => daysUntil(a.dueDate) - daysUntil(b.dueDate));
  const collectionQueueRows = openMonthlyFees
    .map((payment) => {
      const days = daysUntil(payment.dueDate);
      const hasContact = Boolean(payment.phone || payment.email);
      return {
        payment,
        days,
        hasContact,
        stage: chargeStageForDays(days),
        priority: chargePriorityForDays(days)
      };
    })
    .sort((a, b) => {
      const priorityWeight = { Alta: 0, Média: 1, Preventiva: 2, Baixa: 3 } as Record<string, number>;
      return priorityWeight[a.priority] - priorityWeight[b.priority] || a.days - b.days || b.payment.amountCents - a.payment.amountCents;
    });
  const filteredCollectionQueueRows = collectionQueueRows.filter((row) => {
    if (collectionQueueFilter === "OVERDUE") return row.days < 0;
    if (collectionQueueFilter === "DUE_SOON") return row.days >= 0 && row.days <= 5;
    if (collectionQueueFilter === "NO_CONTACT") return !row.hasContact;
    return true;
  });
  const collectionQueueAmountCents = filteredCollectionQueueRows.reduce((total, row) => total + row.payment.amountCents, 0);
  const expectedMonthlyFeeCents = monthlyFees.reduce((total, payment) => total + payment.amountCents, 0);
  const paidMonthlyFeeCents = paidMonthlyFees.reduce((total, payment) => total + payment.amountCents, 0);
  const monthlyCollectionPercent = expectedMonthlyFeeCents > 0 ? Math.round((paidMonthlyFeeCents / expectedMonthlyFeeCents) * 100) : 0;
  const receivableEntries = entries.filter((entry) => entry.type === "INCOME" && ["PENDING", "OVERDUE"].includes(entry.status));
  const overdueEntries = receivableEntries.filter((entry) => {
    if (entry.status === "OVERDUE") {
      return true;
    }
    if (!entry.dueDate) {
      return false;
    }
    return daysUntil(entry.dueDate) < 0;
  });
  const dueSoonEntries = receivableEntries.filter((entry) => {
    if (!entry.dueDate) {
      return false;
    }
    const remainingDays = daysUntil(entry.dueDate);
    return remainingDays >= 0 && remainingDays <= 5;
  });
  const receivableCents = receivableEntries.reduce((total, entry) => total + entry.amountCents, 0);
  const overdueCents = overdueEntries.reduce((total, entry) => total + entry.amountCents, 0);
  const collectionRiskPercent = receivableCents > 0 ? Math.round((overdueCents / receivableCents) * 100) : 0;
  const highPriorityEntries = [...overdueEntries]
    .sort((a, b) => {
      const aDays = a.dueDate ? Math.abs(daysUntil(a.dueDate)) : 0;
      const bDays = b.dueDate ? Math.abs(daysUntil(b.dueDate)) : 0;
      return bDays - aDays;
    })
    .slice(0, 6);
  const collection = collectionDashboardQuery.data ?? ({
    month,
    year,
    totals: { openCents: receivableCents, lateCents: overdueCents, dueSoonCount: dueSoonEntries.length, riskPercent: collectionRiskPercent },
    segments: { current: 0, d1_7: 0, d8_30: 0, d31Plus: 0 },
    cadence: { preDue3: 0, dPlus3: 0, dPlus7: 0, dPlus15: 0 },
    topDebtors: [],
    actionPlan: []
  } satisfies CollectionDashboard);
  const productivity = collectionProductivityQuery.data ?? ({
    month,
    year,
    byStage: [],
    totals: { sent: 0, recovered: 0, recoveryRatePercent: 0 }
  } satisfies CollectionProductivity);
  const prioritizedDebtors =
    collection?.topDebtors ??
    highPriorityEntries.map((entry) => {
      const associate = entry.associateId ? associateById.get(entry.associateId) : null;
      return {
        associateId: entry.associateId ?? entry.id,
        name: associate?.name ?? entry.description,
        phone: associate?.phone ?? null,
        email: associate?.email ?? null,
        amountCents: entry.amountCents,
        maxDelayDays: entry.dueDate ? Math.abs(daysUntil(entry.dueDate)) : 0
      };
    });
  const periodReport = periodReportQuery.data ?? ({
    range: reportRange,
    period: { from: { month, year }, to: { month, year } },
    totals: { incomeCents: 0, expenseCents: 0, balanceCents: 0, pendingCents: 0, overdueCents: 0, pendingCount: 0, overdueCount: 0, paidCount: 0, totalCount: 0 },
    averages: { incomeCents: 0, expenseCents: 0, balanceCents: 0 },
    indicators: { marginPercent: 0, expenseRatioPercent: 0, delinquencyRiskPercent: 0, incomeDeltaPercent: null, expenseDeltaPercent: null, balanceDeltaPercent: null },
    highlights: { bestMonth: null, worstMonth: null },
    categories: [],
    monthly: []
  } satisfies FinancePeriodReport);
  const executiveStatus =
    collectionRiskPercent >= 35
      ? "Atenção alta na inadimplência"
      : collectionRiskPercent >= 15
        ? "Cobrança precisa de acompanhamento"
        : "Carteira em situação controlada";
  const reportMaxAmount = Math.max(
    ...(periodReport.monthly.flatMap((row) => [row.incomeCents, row.expenseCents, Math.abs(row.balanceCents)]) ?? [1]),
    1
  );
  const paidEntries = entries.filter((entry) => entry.status === "PAID");
  const pendingEntries = entries.filter((entry) => entry.status === "PENDING");
  const paidIncomeCents = paidEntries.filter((entry) => entry.type === "INCOME").reduce((total, entry) => total + entry.amountCents, 0);
  const paidExpenseCents = paidEntries.filter((entry) => entry.type === "EXPENSE").reduce((total, entry) => total + entry.amountCents, 0);
  const openEntryCents = pendingEntries.reduce((total, entry) => total + entry.amountCents, 0);
  const unpaidMonthlyFeeCents = openMonthlyFees.reduce((total, payment) => total + payment.amountCents, 0);
  const averageMonthlyFeeCents = monthlyFees.length > 0 ? Math.round(expectedMonthlyFeeCents / monthlyFees.length) : 0;
  const expenseCommitmentPercent = paidIncomeCents > 0 ? Math.round((paidExpenseCents / paidIncomeCents) * 100) : 0;
  const categoryBreakdown = Object.values(
    entries.reduce<Record<string, { category: string; incomeCents: number; expenseCents: number; count: number }>>((acc, entry) => {
      const current = acc[entry.category] ?? { category: entry.category, incomeCents: 0, expenseCents: 0, count: 0 };
      if (entry.type === "INCOME") {
        current.incomeCents += entry.amountCents;
      } else {
        current.expenseCents += entry.amountCents;
      }
      current.count += 1;
      acc[entry.category] = current;
      return acc;
    }, {})
  )
    .sort((a, b) => Math.max(b.incomeCents, b.expenseCents) - Math.max(a.incomeCents, a.expenseCents))
    .slice(0, 5);
  const costCenterBreakdown = Object.values(
    entries.reduce<Record<string, { name: string; totalCents: number; count: number }>>((acc, entry) => {
      const name = entry.costCenter?.trim() || "Sem centro";
      const current = acc[name] ?? { name, totalCents: 0, count: 0 };
      current.totalCents += entry.type === "EXPENSE" ? entry.amountCents : -entry.amountCents;
      current.count += 1;
      acc[name] = current;
      return acc;
    }, {})
  )
    .sort((a, b) => Math.abs(b.totalCents) - Math.abs(a.totalCents))
    .slice(0, 5);
  const closingChecklist = [
    { label: "Mensalidades geradas", done: monthlyFees.length > 0, detail: `${monthlyFees.length} registro(s)` },
    { label: "Baixas conferidas", done: pendingEntries.length === 0, detail: `${pendingEntries.length} pendente(s)` },
    { label: "Atrasos tratados", done: overdueEntries.length === 0, detail: `${overdueEntries.length} atraso(s)` },
    { label: "Comprovantes anexados", done: entries.every((entry) => entry.status !== "PAID" || Boolean(entry.receiptUrl)), detail: `${entries.filter((entry) => entry.status === "PAID" && !entry.receiptUrl).length} sem anexo` }
  ];
  const closingProgressPercent = Math.round((closingChecklist.filter((item) => item.done).length / closingChecklist.length) * 100);
  const financeMonthlyChart = periodReport.monthly.map((row) => ({
    label: `${String(row.month).padStart(2, "0")}/${String(row.year).slice(-2)}`,
    incomeCents: row.incomeCents,
    expenseCents: row.expenseCents,
    balanceCents: row.balanceCents
  }));
  const receivableAgingChart = [
    { label: "Em dia", value: collection.segments.current ?? 0, color: "#10b981" },
    { label: "1-7 dias", value: collection.segments.d1_7 ?? 0, color: "#f59e0b" },
    { label: "8-30 dias", value: collection.segments.d8_30 ?? 0, color: "#f97316" },
    { label: "31+ dias", value: collection.segments.d31Plus ?? 0, color: "#dc2626" }
  ];
  const collectionCadenceChart = [
    { label: "D-3", value: collection.cadence.preDue3 ?? 0 },
    { label: "D+3", value: collection.cadence.dPlus3 ?? 0 },
    { label: "D+7", value: collection.cadence.dPlus7 ?? 0 },
    { label: "D+15", value: collection.cadence.dPlus15 ?? 0 }
  ];
  const categoryChartData = categoryBreakdown.map((item) => ({
    name: formatFinancialCategory(item.category),
    receitas: item.incomeCents,
    despesas: item.expenseCents
  }));
  const productivityChartData = productivity.byStage.map((item) => ({
    stage: item.stage === "PRE_DUE_3" ? "D-3" : item.stage === "D_PLUS_3" ? "D+3" : item.stage === "D_PLUS_7" ? "D+7" : "D+15",
    enviados: item.sent,
    recuperados: item.recovered,
    taxa: item.recoveryRatePercent
  }));

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const areaParam = params.get("area");
    if (areaParam === "DASHBOARD" || areaParam === "MENSALIDADES" || areaParam === "RECEITAS" || areaParam === "DESPESAS" || areaParam === "PIX" || areaParam === "COBRANCAS" || areaParam === "RELATORIOS") {
      const nextArea = areaParam === "PIX" ? "COBRANCAS" : areaParam;
      setFinanceArea((current) => (current === nextArea ? current : nextArea));
      if (nextArea === "RECEITAS" || nextArea === "DESPESAS") {
        setFinanceView("OPERACAO");
        setFinanceOperationView("LANCAMENTOS");
        setTypeFilter((current) => {
          const nextType = nextArea === "RECEITAS" ? "INCOME" : "EXPENSE";
          return current === nextType ? current : nextType;
        });
      }
      if (nextArea === "MENSALIDADES" || nextArea === "COBRANCAS") {
        setFinanceView("ADMIN");
      }
      if (nextArea === "DASHBOARD") {
        setFinanceView("OPERACAO");
        setFinanceOperationView("LANCAMENTOS");
      }
      if (nextArea === "RELATORIOS") {
        setFinanceView("REPORTS");
      }
      if (areaParam === "PIX") {
        navigate("/financeiro?area=COBRANCAS", { replace: true });
      }
    }

    const viewParam = params.get("view");
    if (viewParam === "VISAO") {
      setFinanceView("OPERACAO");
      setFinanceArea("DASHBOARD");
    }
    if (viewParam === "OPERACAO" || viewParam === "ADMIN" || viewParam === "REPORTS") {
      setFinanceView((current) => (current === viewParam ? current : viewParam));
      if (!areaParam && viewParam === "ADMIN") {
        setFinanceArea("COBRANCAS");
      }
      if (!areaParam && viewParam === "REPORTS") {
        setFinanceArea("RELATORIOS");
      }
    }

    const tabParam = params.get("tab");
    if (tabParam === "LANCAMENTOS" || tabParam === "NOVO") {
      setFinanceOperationView((current) => (current === tabParam ? current : tabParam));
      if (!areaParam && viewParam === "OPERACAO" && tabParam === "NOVO") {
        setFinanceArea("RECEITAS");
      }
    }

    const typeParam = params.get("type");
    if (typeParam === "ALL" || typeParam === "INCOME" || typeParam === "EXPENSE") {
      setTypeFilter((current) => (current === typeParam ? current : typeParam));
      if (!areaParam && typeParam === "INCOME") {
        setFinanceArea("RECEITAS");
      }
      if (!areaParam && typeParam === "EXPENSE") {
        setFinanceArea("DESPESAS");
      }
    }

    const statusParam = params.get("status");
    if (statusParam === "ALL" || statusParam === "PENDING" || statusParam === "PAID" || statusParam === "OVERDUE" || statusParam === "CANCELED") {
      setStatusFilter((current) => (current === statusParam ? current : statusParam));
    }
  }, [location.search, navigate]);

  async function handleCreateEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Accept "1.234,56" (pt-BR) as well as "1234.56": drop thousands separators
    // then normalize the decimal comma.
    const normalizedAmount = form.amountBRL.trim().replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
    const amountNumber = Number(normalizedAmount);
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      return;
    }

    const payload = {
      type: form.type,
      category: form.category,
      description: form.description,
      amountCents: Math.round(amountNumber * 100),
      competenceMonth: month,
      competenceYear: year,
      status: form.status,
      ...(form.dueDate ? { dueDate: new Date(form.dueDate).toISOString() } : {}),
      ...(form.paidAt ? { paidAt: new Date(form.paidAt).toISOString() } : {}),
      ...(form.receiptUrl ? { receiptUrl: form.receiptUrl } : {}),
      ...(form.costCenter ? { costCenter: form.costCenter } : {}),
      ...(form.associateId ? { associateId: form.associateId } : {})
    };

    if (editingEntryId) {
      await updateEntryMutation.mutateAsync({ id: editingEntryId, payload });
      return;
    }

    await createMutation.mutateAsync(payload);
  }

  function handleEditEntry(entry: FinancialEntry) {
    setEditingEntryId(entry.id);
    setFinanceView("OPERACAO");
    setFinanceOperationView("NOVO");
    setForm({
      type: entry.type,
      category: entry.category as FinancialEntryCategory,
      description: entry.description,
      amountBRL: (entry.amountCents / 100).toFixed(2).replace(".", ","),
      status: entry.status,
      dueDate: dateInputValue(entry.dueDate),
      paidAt: dateInputValue(entry.paidAt),
      receiptUrl: entry.receiptUrl ?? "",
      costCenter: entry.costCenter ?? "",
      associateId: entry.associateId ?? ""
    });
  }

  function handleCancelEdit() {
    setEditingEntryId(null);
    setForm((prev) => ({ ...prev, description:"", amountBRL:"", dueDate:"", paidAt:"", receiptUrl:"", costCenter:"", associateId:"" }));
  }

  async function handleExportCsv() {
    const blob = await apiDownload(`/reports/finance/export.csv?month=${month}&year=${year}`);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `financeiro_${year}_${String(month).padStart(2,"0")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleReceiptFile(file: File | null) {
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, receiptUrl: String(reader.result ?? "") }));
    };
    reader.readAsDataURL(file);
  }

  const stageLabel: Record<string, string> = {
    PRE_DUE_3: "D-3",
    D_PLUS_3: "D+3",
    D_PLUS_7: "D+7",
    D_PLUS_15: "D+15"
  };

  const financeAreas = [
    { value: "DASHBOARD" as const, label: "Dashboard", icon: <WalletCards size={16} />, description: "Caixa e leitura do mês" },
    { value: "MENSALIDADES" as const, label: "Mensalidades", icon: <Coins size={16} />, description: "Geração e baixas" },
    { value: "RECEITAS" as const, label: "Receitas", icon: <TrendingUp size={16} />, description: "Entradas do período" },
    { value: "DESPESAS" as const, label: "Despesas", icon: <TrendingDown size={16} />, description: "Saídas e custos" },
    { value: "COBRANCAS" as const, label: "Cobranças", icon: <ListChecks size={16} />, description: "Fila e régua" },
    { value: "RELATORIOS" as const, label: "Relatórios", icon: <FileText size={16} />, description: "Prestação de contas" }
  ];

  function goToFinanceArea(nextArea: FinanceArea) {
    setFinanceArea(nextArea);

    if (nextArea === "RECEITAS" || nextArea === "DESPESAS") {
      setFinanceView("OPERACAO");
      setFinanceOperationView("LANCAMENTOS");
      setTypeFilter(nextArea === "RECEITAS" ? "INCOME" : "EXPENSE");
    } else if (nextArea === "MENSALIDADES" || nextArea === "COBRANCAS") {
      setFinanceView("ADMIN");
    } else if (nextArea === "RELATORIOS") {
      setFinanceView("REPORTS");
    } else {
      setFinanceView("OPERACAO");
      setFinanceOperationView("LANCAMENTOS");
      setTypeFilter("ALL");
    }

    navigate(`/financeiro?area=${nextArea}`, { replace: true });
  }

  const showDashboardArea = financeArea === "DASHBOARD";
  const showMonthlyArea = financeArea === "MENSALIDADES";
  const showCollectionArea = financeArea === "COBRANCAS";
  const showAdminArea = showMonthlyArea || showCollectionArea;
  const showEntriesArea = financeArea === "RECEITAS" || financeArea === "DESPESAS" || (financeView === "OPERACAO" && financeOperationView === "LANCAMENTOS" && !showDashboardArea);
  const showEntryFormArea = financeView === "OPERACAO" && financeOperationView === "NOVO";

  return (
    <section className="min-w-0 space-y-4">
      {checkoutPreview ? (
        <PixCheckoutModal
          open={pixCheckoutModalOpen}
          payerName={checkoutPreview.associate.name}
          reference={`${String(checkoutPreview.payment.month).padStart(2, "0")}/${checkoutPreview.payment.year}`}
          amount={formatCurrency(checkoutPreview.payment.amountCents)}
          dueDate={new Date(checkoutPreview.payment.dueDate).toLocaleDateString("pt-BR")}
          status={paymentStatusLabels[checkoutPreview.payment.status] ?? "Aguardando pagamento"}
          statusTone={checkoutPreview.payment.status === "PAID" ? "paid" : "unpaid"}
          description="Mensalidade do clube"
          txid={checkoutPreview.checkout.txid}
          pixCopyPaste={checkoutPreview.checkout.pixCopyPaste}
          qrCodeDataUrl={checkoutPreview.checkout.qrCodeDataUrl}
          expiresAt={checkoutPreview.checkout.expiresAt}
          autoSettleSeconds={checkoutPreview.checkout.autoSettleSeconds}
          whatsappHref={`https://wa.me/?text=${encodeURIComponent(`Olá ${checkoutPreview.associate.name}, segue cobrança PIX GestaSports ${String(checkoutPreview.payment.month).padStart(2, "0")}/${checkoutPreview.payment.year}: ${checkoutPreview.checkout.pixCopyPaste}`)}`}
          emailHref={checkoutPreview.associate.email ? `mailto:${checkoutPreview.associate.email}?subject=${encodeURIComponent("Cobrança mensalidade GestaSports")}&body=${encodeURIComponent(`Olá ${checkoutPreview.associate.name}, segue o PIX da mensalidade: ${checkoutPreview.checkout.pixCopyPaste}`)}` : undefined}
          onRefresh={() => void handleGeneratePix(checkoutPreview.associate.id)}
          onClose={() => setPixCheckoutModalOpen(false)}
        />
      ) : null}
      {showDashboardArea ? (
      <>
      <Surface className="overflow-hidden border-slate-300" padding="none">
        <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-stretch">
          <div className="min-w-0 p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-[0.08em] text-slate-600">Financeiro do clube</span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-[0.08em] text-slate-600">{String(month).padStart(2, "0")}/{year}</span>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-end">
              <div>
                <h1 className="text-3xl font-black leading-tight text-slate-950 sm:text-4xl">Painel financeiro</h1>
                <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
                  Caixa, mensalidades, cobrança e prestação de contas com leitura direta para a diretoria.
                </p>
              </div>
              <div className={`rounded-lg border px-3 py-2 text-sm font-black ${collectionRiskPercent >= 35 ? "border-red-200 bg-red-50 text-red-700" : collectionRiskPercent >= 15 ? "border-amber-200 bg-amber-50 text-amber-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                {executiveStatus}
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Saldo do período</p>
                <strong className="mt-2 block text-2xl font-black text-slate-950">{formatCurrency(summary.balanceCents ?? 0)}</strong>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-xs font-black uppercase tracking-[0.08em] text-emerald-700">A receber</p>
                <strong className="mt-2 block text-2xl font-black text-emerald-800">{formatCurrency(collection.totals.openCents ?? receivableCents)}</strong>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-xs font-black uppercase tracking-[0.08em] text-red-700">Em atraso</p>
                <strong className="mt-2 block text-2xl font-black text-red-800">{formatCurrency(collection.totals.lateCents ?? overdueCents)}</strong>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-black uppercase tracking-[0.08em] text-amber-700">Risco</p>
                <strong className="mt-2 block text-2xl font-black text-amber-800">{collection.totals.riskPercent ?? collectionRiskPercent}%</strong>
              </div>
            </div>
          </div>

          <div className="grid content-between gap-5 border-t border-slate-200 bg-white p-5 text-slate-950 xl:border-l xl:border-t-0">
            <div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-full bg-emerald-50 text-emerald-600 shadow-sm shadow-emerald-200/70 ring-1 ring-emerald-100">
                    <Coins size={22} />
                  </span>
                  <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Fila de cobrança</p>
                </div>
                <span className="grid size-10 place-items-center rounded-lg bg-emerald-50 text-lg font-black text-emerald-600 ring-1 ring-emerald-100">{prioritizedDebtors.length}</span>
              </div>
              <h2 className="mt-5 text-3xl font-black leading-tight text-slate-950 sm:text-4xl">
                <span className="text-emerald-500">{openMonthlyFees.length}</span> mensalidade(s) aberta(s)
              </h2>
              <p className="mt-4 text-lg font-black text-slate-500">
                <span className="text-emerald-600">{formatCurrency(paidMonthlyFeeCents)}</span> recebido de <span className="text-blue-600">{formatCurrency(expectedMonthlyFeeCents)}</span> esperado.
              </p>
              <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-100 shadow-inner ring-1 ring-slate-200">
                <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400" style={{ width: `${Math.min(monthlyCollectionPercent, 100)}%` }} />
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-black text-emerald-600">{monthlyCollectionPercent}% recebido</span>
                <span className="text-sm font-black text-slate-600">{formatCurrency(paidMonthlyFeeCents)} / {formatCurrency(expectedMonthlyFeeCents)}</span>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                className="inline-flex min-h-16 items-center justify-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 text-center text-sm font-black text-emerald-700 shadow-sm hover:bg-emerald-100"
                onClick={() => {
                  setFinanceArea("RECEITAS");
                  setFinanceView("OPERACAO");
                  setFinanceOperationView("NOVO");
                }}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/70">
                  <PlusCircle size={18} />
                </span>
                <span className="whitespace-nowrap">Lançamento</span>
              </button>
              <button
                type="button"
                className="inline-flex min-h-16 items-center justify-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 text-center text-sm font-black text-blue-700 shadow-sm hover:bg-blue-100"
                onClick={() => goToFinanceArea("COBRANCAS")}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/70">
                  <ListChecks size={18} />
                </span>
                <span className="whitespace-nowrap">Cobrança</span>
              </button>
              <button
                type="button"
                className="inline-flex min-h-16 items-center justify-center gap-2 rounded-lg border border-violet-100 bg-violet-50 px-3 text-center text-sm font-black text-violet-700 shadow-sm hover:bg-violet-100"
                onClick={() => void handleExportCsv()}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/70">
                  <Download size={18} />
                </span>
                <span className="whitespace-nowrap">CSV</span>
              </button>
              <button
                type="button"
                className="inline-flex min-h-16 items-center justify-center gap-2 rounded-lg border border-orange-100 bg-orange-50 px-3 text-center text-sm font-black text-orange-600 shadow-sm hover:bg-orange-100"
                onClick={() => {
                  goToFinanceArea("RECEITAS");
                }}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/70">
                  <ReceiptText size={18} />
                </span>
                <span className="whitespace-nowrap">Extrato</span>
              </button>
            </div>
          </div>
        </div>
      </Surface>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.9fr)]">
        <Surface>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.08em] text-emerald-600">Fluxo financeiro</p>
              <h2 className="text-lg font-black text-slate-950">Receitas, despesas e saldo</h2>
            </div>
            <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">{periodReport.range}</span>
          </div>
          <div className="h-72 min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <ComposedChart data={financeMonthlyChart} margin={{ top: 12, right: 12, bottom: 0, left: -18 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11, fontWeight: 800 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 700 }} tickFormatter={(value) => `${Math.round(Number(value) / 100)}`} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={{ borderRadius: 10, borderColor: "#dbe3ee" }} />
                <Bar dataKey="incomeCents" name="Receitas" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="expenseCents" name="Despesas" fill="#ef4444" radius={[6, 6, 0, 0]} />
                <Line type="monotone" dataKey="balanceCents" name="Saldo" stroke="#0f172a" strokeWidth={3} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Surface>

        <Surface>
          <div className="mb-4">
            <p className="text-xs font-black uppercase tracking-[0.08em] text-red-600">Cobrança</p>
            <h2 className="text-lg font-black text-slate-950">Envelhecimento da carteira</h2>
          </div>
          <div className="h-72 min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={receivableAgingChart} margin={{ top: 12, right: 10, bottom: 0, left: -18 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11, fontWeight: 800 }} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 700 }} />
                <Tooltip contentStyle={{ borderRadius: 10, borderColor: "#dbe3ee" }} />
                <Bar dataKey="value" name="Mensalidades" radius={[8, 8, 0, 0]}>
                  {receivableAgingChart.map((item) => <Cell key={item.label} fill={item.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Surface>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Surface>
          <div className="mb-4">
            <p className="text-xs font-black uppercase tracking-[0.08em] text-blue-700">Régua</p>
            <h2 className="text-base font-black text-slate-950">Ações por etapa</h2>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={collectionCadenceChart} margin={{ top: 10, right: 8, bottom: 0, left: -18 }}>
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11, fontWeight: 800 }} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 700 }} />
                <Tooltip contentStyle={{ borderRadius: 10, borderColor: "#dbe3ee" }} />
                <Bar dataKey="value" name="Ações" fill="#2563eb" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Surface>

        <Surface>
          <div className="mb-4">
            <p className="text-xs font-black uppercase tracking-[0.08em] text-violet-700">Categorias</p>
            <h2 className="text-base font-black text-slate-950">Receitas x despesas</h2>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={categoryChartData} layout="vertical" margin={{ top: 6, right: 12, bottom: 0, left: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={92} axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10, fontWeight: 800 }} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={{ borderRadius: 10, borderColor: "#dbe3ee" }} />
                <Bar dataKey="receitas" name="Receitas" fill="#10b981" radius={[0, 6, 6, 0]} />
                <Bar dataKey="despesas" name="Despesas" fill="#ef4444" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Surface>

        <Surface>
          <div className="mb-4">
            <p className="text-xs font-black uppercase tracking-[0.08em] text-emerald-700">Produtividade</p>
            <h2 className="text-base font-black text-slate-950">Cobranças recuperadas</h2>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <ComposedChart data={productivityChartData} margin={{ top: 10, right: 8, bottom: 0, left: -18 }}>
                <XAxis dataKey="stage" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11, fontWeight: 800 }} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 700 }} />
                <Tooltip contentStyle={{ borderRadius: 10, borderColor: "#dbe3ee" }} />
                <Bar dataKey="enviados" name="Enviados" fill="#94a3b8" radius={[6, 6, 0, 0]} />
                <Bar dataKey="recuperados" name="Recuperados" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Line type="monotone" dataKey="taxa" name="Taxa %" stroke="#0f172a" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Surface>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <FinanceMetricCard label="Receitas pagas" value={formatCurrency(summary.incomeCents ?? 0)} hint="Entradas quitadas" icon={<TrendingUp size={18} />} tone="green" />
          <FinanceMetricCard label="Despesas pagas" value={formatCurrency(summary.expenseCents ?? 0)} hint="Saídas quitadas" icon={<TrendingDown size={18} />} tone="red" />
          <FinanceMetricCard label="Saldo" value={formatCurrency(summary.balanceCents ?? 0)} hint="Receitas menos despesas" icon={<WalletCards size={18} />} tone="slate" />
          <FinanceMetricCard label="Pendentes" value={summary.pendingCount ?? 0} hint="Aguardando baixa" icon={<Clock3 size={18} />} tone="amber" />
          <FinanceMetricCard label="Vencidos" value={summary.overdueCount ?? 0} hint="Precisa de ação" icon={<AlertTriangle size={18} />} tone="red" />
          <FinanceMetricCard label="Cobrança" value={`${monthlyCollectionPercent}%`} hint={`${paidMonthlyFees.length} de ${monthlyFees.length} mensalidades`} icon={<ReceiptText size={18} />} tone="green" />
        </div>

        <Surface className="xl:row-span-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.08em] text-red-600">Prioridade</p>
              <h2 className="text-lg font-black text-slate-950">Próximas ações</h2>
            </div>
            <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-black text-slate-700">{dueSoonEntries.length} perto</span>
          </div>
          <div className="mt-4 space-y-2">
            {prioritizedDebtors.slice(0, 4).map((debtor) => (
              <div key={debtor.associateId} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-black text-slate-950">{debtor.name}</p>
                    <p className="text-xs font-semibold text-slate-500">{debtor.phone ?? debtor.email ?? "Sem contato"}</p>
                  </div>
                  <strong className="text-sm text-red-700">{formatCurrency(debtor.amountCents)}</strong>
                </div>
                <p className="mt-2 text-xs font-semibold text-slate-600">{debtor.maxDelayDays} dia(s) de atraso máximo</p>
              </div>
            ))}
            {!prioritizedDebtors.length ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700">Carteira sem prioridade crítica hoje.</div>
            ) : null}
          </div>
        </Surface>
      </div>

      <Surface>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-950">Leitura executiva</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">Resumo para acompanhar caixa, mensalidades e risco de cobrança.</p>
          </div>
          <div className="grid min-w-[14rem] gap-1">
            <div className="flex items-center justify-between text-xs font-black uppercase tracking-[0.08em] text-slate-500">
              <span>Recebimento</span>
              <span>{monthlyCollectionPercent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(monthlyCollectionPercent, 100)}%` }} />
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Mensalidades recebidas</p>
            <strong className="mt-2 block text-2xl font-black text-slate-950">{monthlyCollectionPercent}%</strong>
            <p className="mt-1 text-xs font-semibold text-slate-500">{formatCurrency(paidMonthlyFeeCents)} de {formatCurrency(expectedMonthlyFeeCents)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Pendências abertas</p>
            <strong className="mt-2 block text-2xl font-black text-slate-950">{openMonthlyFees.length}</strong>
            <p className="mt-1 text-xs font-semibold text-slate-500">{formatCurrency(collection.totals.openCents ?? receivableCents)} ainda em aberto</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Próximo passo</p>
            <strong className="mt-2 block text-base font-black text-slate-950">
              {prioritizedDebtors.length > 0 ? "Gerar cobrança PIX dos atrasados" : "Manter rotina de fechamento"}
            </strong>
            <p className="mt-1 text-xs font-semibold text-slate-500">{dueSoonEntries.length} vencimento(s) próximos</p>
          </div>
        </div>
      </Surface>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
        <Surface>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.08em] text-red-600">Fechamento do mês</p>
              <h2 className="text-lg font-black text-slate-950">Controle operacional</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">Caixa realizado, compromissos em aberto e conferência antes de prestar contas.</p>
            </div>
            <div className="min-w-[10rem]">
              <div className="flex items-center justify-between text-xs font-black uppercase tracking-[0.08em] text-slate-500">
                <span>Conferência</span>
                <span>{closingProgressPercent}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-red-600" style={{ width: `${closingProgressPercent}%` }} />
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Caixa realizado</p>
              <strong className={`mt-2 block text-xl font-black ${paidIncomeCents - paidExpenseCents >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                {formatCurrency(paidIncomeCents - paidExpenseCents)}
              </strong>
              <p className="mt-1 text-xs font-semibold text-slate-500">Entradas e saídas quitadas</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Aguardando baixa</p>
              <strong className="mt-2 block text-xl font-black text-amber-700">{formatCurrency(openEntryCents)}</strong>
              <p className="mt-1 text-xs font-semibold text-slate-500">{pendingEntries.length} lançamento(s)</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Mensalidade média</p>
              <strong className="mt-2 block text-xl font-black text-slate-950">{formatCurrency(averageMonthlyFeeCents)}</strong>
              <p className="mt-1 text-xs font-semibold text-slate-500">{monthlyFees.length} cobrança(s) no mês</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Comprometimento</p>
              <strong className={`mt-2 block text-xl font-black ${expenseCommitmentPercent > 85 ? "text-red-700" : expenseCommitmentPercent > 65 ? "text-amber-700" : "text-emerald-700"}`}>
                {expenseCommitmentPercent}%
              </strong>
              <p className="mt-1 text-xs font-semibold text-slate-500">Despesas sobre receitas pagas</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div className="rounded-lg border border-slate-200 p-3">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-sm font-black text-slate-950">Carteira a receber</h3>
                <span className="text-xs font-bold text-slate-500">{formatCurrency(unpaidMonthlyFeeCents)} mensalidades</span>
              </div>
              {[
                { label: "Em dia", value: collection.segments.current ?? 0, tone: "bg-emerald-500" },
                { label: "1 a 7 dias", value: collection.segments.d1_7 ?? 0, tone: "bg-amber-500" },
                { label: "8 a 30 dias", value: collection.segments.d8_30 ?? 0, tone: "bg-orange-500" },
                { label: "31+ dias", value: collection.segments.d31Plus ?? 0, tone: "bg-red-600" }
              ].map((segment) => {
                const totalSegments = Math.max(
                  (collection.segments.current ?? 0) +
                    (collection.segments.d1_7 ?? 0) +
                    (collection.segments.d8_30 ?? 0) +
                    (collection.segments.d31Plus ?? 0),
                  1
                );
                return (
                  <div key={segment.label} className="mb-2 last:mb-0">
                    <div className="mb-1 flex justify-between text-xs font-bold text-slate-600">
                      <span>{segment.label}</span>
                      <span>{segment.value}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${segment.tone}`} style={{ width: `${Math.round((segment.value / totalSegments) * 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-lg border border-slate-200 p-3">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-sm font-black text-slate-950">Checklist do fechamento</h3>
                <button
                  type="button"
                  className="rounded border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  onClick={() => void handleExportCsv()}
                >
                  Exportar CSV
                </button>
              </div>
              <div className="space-y-2">
                {closingChecklist.map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className={`grid size-6 shrink-0 place-items-center rounded-full ${item.done ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                        {item.done ? <CheckCircle2 size={14} /> : <Clock3 size={14} />}
                      </span>
                      <span className="truncate text-sm font-bold text-slate-700">{item.label}</span>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-slate-500">{item.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Surface>

        <Surface>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Composição</p>
              <h2 className="text-lg font-black text-slate-950">Categorias e centros</h2>
            </div>
            <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-black text-slate-700">{entries.length} itens</span>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <h3 className="mb-2 text-sm font-black text-slate-950">Top categorias</h3>
              <div className="space-y-2">
                {categoryBreakdown.map((category) => (
                  <div key={category.category} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-black text-slate-800">{formatFinancialCategory(category.category)}</span>
                      <span className="text-xs font-semibold text-slate-500">{category.count} lançamento(s)</span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs font-bold">
                      <span className="rounded bg-emerald-50 px-2 py-1 text-emerald-700">+ {formatCurrency(category.incomeCents)}</span>
                      <span className="rounded bg-red-50 px-2 py-1 text-red-700">- {formatCurrency(category.expenseCents)}</span>
                    </div>
                  </div>
                ))}
                {!categoryBreakdown.length ? <p className="rounded-lg border border-dashed border-slate-300 p-3 text-sm font-semibold text-slate-500">Sem categorias no período.</p> : null}
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-black text-slate-950">Centros de custo</h3>
              <div className="space-y-2">
                {costCenterBreakdown.map((center) => (
                  <div key={center.name} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-700">{center.name}</p>
                      <p className="text-xs font-semibold text-slate-500">{center.count} registro(s)</p>
                    </div>
                    <strong className={center.totalCents <= 0 ? "text-emerald-700" : "text-red-700"}>{formatCurrency(Math.abs(center.totalCents))}</strong>
                  </div>
                ))}
                {!costCenterBreakdown.length ? <p className="rounded-lg border border-dashed border-slate-300 p-3 text-sm font-semibold text-slate-500">Sem centros de custo no período.</p> : null}
              </div>
            </div>
          </div>
        </Surface>
      </div>
      </>
      ) : null}

      <FinanceAreaTabs areas={financeAreas} activeArea={financeArea} onChange={goToFinanceArea} />

      <SegmentedControl className="hidden"
        ariaLabel="Área financeira"
        value={financeView}
        onChange={(value) => {
          setFinanceView(value);
          if (value === "OPERACAO") {
            setFinanceOperationView("LANCAMENTOS");
          }
        }}
        options={[
          { label: "Lançamentos", value: "OPERACAO", icon: <ReceiptText size={16} /> },
          { label: "Cobrança", value: "ADMIN", icon: <ListChecks size={16} /> },
          { label: "Relatórios", value: "REPORTS", icon: <TrendingUp size={16} /> }
        ]}
      />

      <Surface className="hidden" padding="none" tone="dark">
        <div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_24rem] xl:items-stretch">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-black uppercase tracking-[0.08em] text-emerald-200">Financeiro</span>
              <span className="rounded-full bg-white/8 px-3 py-1 text-xs font-black uppercase tracking-[0.08em] text-slate-300">{String(month).padStart(2, "0")}/{year}</span>
            </div>
            <h1 className="mt-4 text-3xl font-black leading-tight text-white sm:text-4xl">Centro financeiro</h1>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-300">
              Caixa, cobranças e lançamentos em uma rotina financeira separada da gestão do clube.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-400">Saldo do período</p>
                <strong className="mt-2 block text-2xl font-black text-white">{formatCurrency(summary.balanceCents ?? 0)}</strong>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-400">A receber</p>
                <strong className="mt-2 block text-2xl font-black text-emerald-200">{formatCurrency(collection.totals.openCents ?? receivableCents)}</strong>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-400">Em atraso</p>
                <strong className="mt-2 block text-2xl font-black text-red-200">{formatCurrency(collection.totals.lateCents ?? overdueCents)}</strong>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-400">Risco</p>
                <strong className="mt-2 block text-2xl font-black text-amber-200">{collection.totals.riskPercent ?? collectionRiskPercent}%</strong>
              </div>
            </div>
          </div>

          <div className="grid content-between gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <div>
                <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-400">Ação rápida</p>
                <h2 className="mt-2 text-xl font-black text-white">{prioritizedDebtors.length} cobrança(s) prioritária(s)</h2>
                <p className="mt-1 text-sm font-semibold text-slate-300">{openMonthlyFees.length} mensalidade(s) ainda aberta(s) no período.</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-3 py-3 text-center text-xs font-black text-white shadow-[0_12px_24px_rgba(239,51,64,0.24)] hover:bg-red-700"
                onClick={() => {
                  setFinanceView("OPERACAO");
                  setFinanceOperationView("NOVO");
                }}
              >
                <PlusCircle size={15} />
                Novo
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/10 px-3 py-3 text-center text-xs font-black text-white hover:bg-white/15"
                onClick={() => setFinanceView("ADMIN")}
              >
                <ListChecks size={15} />
                Cobrança
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/10 px-3 py-3 text-center text-xs font-black text-white hover:bg-white/15"
                onClick={() => void handleExportCsv()}
              >
                <Download size={15} />
                CSV
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/10 px-3 py-3 text-center text-xs font-black text-white hover:bg-white/15"
                onClick={() => {
                  setFinanceView("OPERACAO");
                  setFinanceOperationView("LANCAMENTOS");
                }}
              >
                <ReceiptText size={15} />
                Extrato
              </button>
            </div>
          </div>
        </div>
      </Surface>

      <div className="hidden">
        <FinanceMetricCard label="Receitas pagas" value={formatCurrency(summary.incomeCents ?? 0)} hint="Entradas quitadas" icon={<TrendingUp size={18} />} tone="green" />
        <FinanceMetricCard label="Despesas pagas" value={formatCurrency(summary.expenseCents ?? 0)} hint="Saídas quitadas" icon={<TrendingDown size={18} />} tone="red" />
        <FinanceMetricCard label="Saldo" value={formatCurrency(summary.balanceCents ?? 0)} hint="Receitas menos despesas" icon={<WalletCards size={18} />} tone="slate" />
        <FinanceMetricCard label="Pendentes" value={summary.pendingCount ?? 0} hint="Aguardando baixa" icon={<Clock3 size={18} />} tone="amber" />
        <FinanceMetricCard label="Vencidos" value={summary.overdueCount ?? 0} hint="Precisa de ação" icon={<AlertTriangle size={18} />} tone="red" />
      </div>

      <Surface className="hidden">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-950">Painel executivo do mês</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">Resumo para diretoria acompanhar caixa, mensalidades e risco de cobrança.</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${collectionRiskPercent >= 35 ? "bg-red-50 text-red-700" : collectionRiskPercent >= 15 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
            {executiveStatus}
          </span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Mensalidades recebidas</p>
            <strong className="mt-2 block text-2xl font-black text-slate-950">{monthlyCollectionPercent}%</strong>
            <p className="mt-1 text-xs font-semibold text-slate-500">{formatCurrency(paidMonthlyFeeCents)} de {formatCurrency(expectedMonthlyFeeCents)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Pendências abertas</p>
            <strong className="mt-2 block text-2xl font-black text-slate-950">{openMonthlyFees.length}</strong>
            <p className="mt-1 text-xs font-semibold text-slate-500">{formatCurrency(collection.totals.openCents ?? receivableCents)} ainda em aberto</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Próximo passo</p>
            <strong className="mt-2 block text-base font-black text-slate-950">
              {prioritizedDebtors.length > 0 ? "Gerar cobrança PIX dos atrasados" : "Manter rotina de fechamento"}
            </strong>
            <p className="mt-1 text-xs font-semibold text-slate-500">{dueSoonEntries.length} vencimento(s) próximos</p>
          </div>
        </div>
      </Surface>

      <article className="hidden rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            className={`inline-flex min-h-10 items-center justify-center rounded-lg px-4 text-sm font-black ${financeView === "OPERACAO" ? "bg-red-600 text-white shadow-[0_10px_20px_rgba(239,51,64,0.16)]" : "text-slate-600 hover:bg-slate-50"}`}
            onClick={() => {
              setFinanceView("OPERACAO");
              setFinanceOperationView("LANCAMENTOS");
            }}
          >
            Lançamentos
          </button>
          <button
            type="button"
            className={`inline-flex min-h-10 items-center justify-center rounded-lg px-4 text-sm font-black ${financeView === "ADMIN" ? "bg-red-600 text-white shadow-[0_10px_20px_rgba(239,51,64,0.16)]" : "text-slate-600 hover:bg-slate-50"}`}
            onClick={() => setFinanceView("ADMIN")}
          >
            Cobrança
          </button>
          <button
            type="button"
            className={`inline-flex min-h-10 items-center justify-center rounded-lg px-4 text-sm font-black ${financeView === "REPORTS" ? "bg-red-600 text-white shadow-[0_10px_20px_rgba(239,51,64,0.16)]" : "text-slate-600 hover:bg-slate-50"}`}
            onClick={() => setFinanceView("REPORTS")}
          >
            Relatórios
          </button>
        </div>
      </article>

      {showAdminArea ? (
      <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Central de cobrança</h3>
            <p className="text-sm text-slate-500">Priorize mensalidades a receber e reduza inadimplência com ação diária.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              onClick={() => {
                setFinanceView("OPERACAO");
                setFinanceOperationView("NOVO");
              }}
            >
              Lançar manualmente
            </button>
            <div className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
              Risco da carteira: {collection.totals.riskPercent ?? collectionRiskPercent}%
            </div>
          </div>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-500">Total a receber</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{formatCurrency(collection.totals.openCents ?? receivableCents)}</p>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-xs font-semibold text-red-700">Em atraso</p>
              <p className="mt-1 text-xl font-bold text-red-700">{formatCurrency(collection.totals.lateCents ?? overdueCents)}</p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-semibold text-amber-700">Vencendo em 5 dias</p>
              <p className="mt-1 text-xl font-bold text-amber-700">{dueSoonMonthlyFees.length}</p>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-xs font-semibold text-emerald-700">Prioridade hoje</p>
              <p className="mt-1 text-xl font-bold text-emerald-700">{overdueMonthlyFees.length}</p>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase text-slate-500">{showMonthlyArea ? "Mensalidades do mês" : "Fila de cobrança"}</p>
              <h4 className="text-lg font-bold text-slate-950">{showMonthlyArea ? `${String(month).padStart(2, "0")}/${year}` : `${filteredCollectionQueueRows.length} mensalidade(s) para tratar`}</h4>
              <p className="text-sm text-slate-500">
                {showMonthlyArea
                  ? `${paidMonthlyFees.length} pago(s), ${openMonthlyFees.length} não pago(s). Cada associado usa o valor mensal cadastrado no perfil.`
                  : "Lista única de cobrança com atrasos, vencimentos próximos, contato e ações."}
              </p>
            </div>
            <button
              type="button"
              className={`rounded-lg bg-[#08255b] px-3 py-2 text-sm font-semibold text-white hover:bg-[#0b3278] disabled:opacity-60 ${showMonthlyArea ? "" : "hidden"}`}
              disabled={generateMonthlyFeesMutation.isPending}
              onClick={() => void generateMonthlyFeesMutation.mutateAsync()}
            >
              {generateMonthlyFeesMutation.isPending ? "Gerando..." : "Gerar mensalidades"}
            </button>
          </div>
          {generateMonthlyFeesMutation.data ? (
            <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
              Mensalidades criadas: {generateMonthlyFeesMutation.data.created}. Vencimento configurado: dia {generateMonthlyFeesMutation.data.dueDay}.
            </p>
          ) : null}

          <div className={`mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 ${(showCollectionArea) ? "" : "hidden"}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase text-slate-500">Visão filtrada</p>
                <h4 className="text-lg font-bold text-slate-950">{collectionQueueFilter === "ALL" ? "Todas as pendências" : collectionQueueFilter === "OVERDUE" ? "Atrasadas" : collectionQueueFilter === "DUE_SOON" ? "Vencendo" : "Sem contato"}</h4>
                <p className="text-sm text-slate-600">Ordem por atraso, vencimento próximo e valor em aberto.</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold uppercase text-slate-500">Valor filtrado</p>
                <p className="text-lg font-black text-slate-950">{formatCurrency(collectionQueueAmountCents)}</p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {[
                { label: "Todas", value: "ALL" },
                { label: "Atrasadas", value: "OVERDUE" },
                { label: "Vencendo", value: "DUE_SOON" },
                { label: "Sem contato", value: "NO_CONTACT" }
              ].map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  className={`rounded-lg border px-3 py-2 text-xs font-black ${collectionQueueFilter === filter.value ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"}`}
                  onClick={() => setCollectionQueueFilter(filter.value as typeof collectionQueueFilter)}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Prioridade</th>
                    <th className="px-3 py-2">Associado</th>
                    <th className="px-3 py-2">Estagio</th>
                    <th className="px-3 py-2">Vencimento</th>
                    <th className="px-3 py-2">Valor</th>
                    <th className="px-3 py-2">Contato</th>
                    <th className="px-3 py-2 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCollectionQueueRows.slice(0, 14).map(({ payment, days, hasContact, priority, stage }) => {
                    const isExpanded = expandedCollectionAssociateId === payment.associateId;
                    const history = isExpanded ? (expandedPaymentHistoryQuery.data?.payments ?? []) : [];

                    return (
                      <Fragment key={`queue-${payment.id}`}>
                        <tr className={days < 0 ? "bg-red-50/50" : days <= 3 ? "bg-amber-50/50" : ""}>
                          <td className="px-3 py-2">
                            <span className={`rounded-full px-2 py-1 text-[11px] font-black ${priority === "Alta" ? "bg-red-100 text-red-700" : priority === "Média" ? "bg-amber-100 text-amber-700" : priority === "Preventiva" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
                              {priority}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <button type="button" className="group flex w-full items-center justify-between gap-3 text-left" onClick={() => handleToggleCollectionDetail(payment)}>
                              <span>
                                <span className="block font-semibold text-slate-900 group-hover:text-blue-700">{payment.associateName}</span>
                                <span className="block text-xs text-slate-500">{paymentStatusLabels[payment.status]}</span>
                              </span>
                              <ChevronDown size={16} className={`shrink-0 text-slate-400 transition ${isExpanded ? "rotate-180 text-blue-700" : "group-hover:text-blue-700"}`} />
                            </button>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 font-black text-slate-700">{stage}</td>
                          <td className="whitespace-nowrap px-3 py-2">
                            <p className={days < 0 ? "font-black text-red-700" : days <= 3 ? "font-black text-amber-700" : "font-semibold text-slate-700"}>
                              {days < 0 ? `${Math.abs(days)} dia(s) atraso` : days === 0 ? "Hoje" : `${days} dia(s)`}
                            </p>
                            <p className="text-xs text-slate-500">{new Date(payment.dueDate).toLocaleDateString("pt-BR")}</p>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 font-black text-slate-900">{formatCurrency(payment.amountCents)}</td>
                          <td className="px-3 py-2 text-xs text-slate-500">
                            {hasContact ? (
                              <>
                                <p>{payment.phone ?? "Sem telefone"}</p>
                                <p>{payment.email ?? "Sem e-mail"}</p>
                              </>
                            ) : (
                              <span className="font-black text-amber-700">Cadastrar contato</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex flex-wrap justify-end gap-1">
                              <button
                                type="button"
                                className="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                                disabled={directChargeMutation.isPending}
                                onClick={() => void handleGeneratePix(payment.associateId)}
                              >
                                PIX
                              </button>
                              {payment.phone ? (
                                <a
                                  className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                                  href={whatsappChargeUrl(payment)}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  WhatsApp
                                </a>
                              ) : null}
                              {payment.email ? (
                                <a
                                  className="rounded border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                  href={`mailto:${payment.email}?subject=${encodeURIComponent("Mensalidade GestaSports")}&body=${encodeURIComponent(`Olá ${payment.associateName}, sua mensalidade ${String(payment.month).padStart(2, "0")}/${payment.year} no valor de ${formatCurrency(payment.amountCents)} está em aberto.`)}`}
                                >
                                  E-mail
                                </a>
                              ) : null}
                              <button
                                type="button"
                                className="rounded border border-emerald-200 bg-white px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                                disabled={manualSettleMonthlyFeeMutation.isPending}
                                onClick={() => void manualSettleMonthlyFeeMutation.mutateAsync(payment.id)}
                              >
                                Baixa
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded ? (
                          <tr className="bg-white">
                            <td colSpan={7} className="px-3 py-3">
                              <div className="grid gap-3 rounded-lg border border-blue-100 bg-blue-50/60 p-3 lg:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.2fr)]">
                                <div className="rounded-lg border border-blue-100 bg-white p-3">
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="text-xs font-black uppercase tracking-[0.08em] text-blue-700">PIX da cobrança</p>
                                      <p className="mt-1 text-sm font-bold text-slate-950">{payment.associateName}</p>
                                      <p className="text-xs font-semibold text-slate-500">{String(payment.month).padStart(2, "0")}/{payment.year} | {formatCurrency(payment.amountCents)}</p>
                                    </div>
                                    <button
                                      type="button"
                                      className="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-black text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                                      disabled={directChargeMutation.isPending}
                                      onClick={() => void handleGeneratePix(payment.associateId)}
                                    >
                                      Atualizar PIX
                                    </button>
                                  </div>
                                  <p className="mt-3 rounded border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">
                                    {directChargeMutation.isPending ? "Gerando PIX..." : "Use o botão acima para abrir o QR Code desta mensalidade."}
                                  </p>
                                </div>
                                <div className="rounded-lg border border-slate-200 bg-white p-3">
                                  <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Últimos 3 pagamentos pagos ou atrasados</p>
                                  <div className="mt-2 space-y-2">
                                    {expandedPaymentHistoryQuery.isLoading ? (
                                      <p className="rounded border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">Carregando histórico financeiro...</p>
                                    ) : history.length > 0 ? (
                                      history.map((item) => {
                                        const itemDays = daysUntil(item.dueDate);
                                        const itemLate = item.status === "LATE" || (item.status !== "PAID" && itemDays < 0);
                                        return (
                                          <div key={`history-${item.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-100 bg-slate-50 px-3 py-2">
                                            <div>
                                              <p className="text-sm font-black text-slate-900">{String(item.month).padStart(2, "0")}/{item.year}</p>
                                              <p className="text-xs font-semibold text-slate-500">Venc. {new Date(item.dueDate).toLocaleDateString("pt-BR")}{item.paidAt ? ` | Pago em ${new Date(item.paidAt).toLocaleDateString("pt-BR")}` : ""}</p>
                                            </div>
                                            <div className="text-right">
                                              <p className="text-sm font-black text-slate-900">{formatCurrency(item.amountCents)}</p>
                                              <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${item.status === "PAID" ? "bg-emerald-50 text-emerald-700" : itemLate ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
                                                {item.status === "PAID" ? "Pago" : itemLate ? "Atrasado" : paymentStatusLabels[item.status]}
                                              </span>
                                            </div>
                                          </div>
                                        );
                                      })
                                    ) : (
                                      <p className="rounded border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">Nenhum pagamento pago ou atrasado encontrado.</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
              {!monthlyFeesQuery.isLoading && filteredCollectionQueueRows.length === 0 ? (
                <p className="px-3 py-4 text-sm text-slate-500">Nenhuma mensalidade neste filtro.</p>
              ) : null}
            </div>
          </div>

          <div className={`mt-3 overflow-x-auto ${showMonthlyArea ? "" : "hidden"}`}>
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Associado</th>
                  <th className="px-3 py-2">Vencimento</th>
                  <th className="px-3 py-2">Valor</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Pix</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthlyFees.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-3 py-2">
                      <p className="font-semibold text-slate-900">{payment.associateName}</p>
                      <p className="text-xs text-slate-500">{payment.phone ?? payment.email ?? "Sem contato"}</p>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">{new Date(payment.dueDate).toLocaleDateString("pt-BR")}</td>
                    <td className="whitespace-nowrap px-3 py-2 font-semibold">{formatCurrency(payment.amountCents)}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-1 text-xs font-bold ${payment.status === "PAID" ? "bg-emerald-50 text-emerald-700" : payment.status === "LATE" ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-700"}`}>
                        {paymentStatusLabels[payment.status]}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex flex-wrap justify-end gap-1">
                        <button
                          type="button"
                          className="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                          disabled={payment.status === "PAID" || directChargeMutation.isPending}
                          onClick={() => void handleGeneratePix(payment.associateId)}
                        >
                          {payment.status === "PAID" ? "Pago" : "Gerar PIX"}
                        </button>
                        {payment.status !== "PAID" ? (
                          <button
                            type="button"
                            className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                            disabled={manualSettleMonthlyFeeMutation.isPending}
                            onClick={() => void manualSettleMonthlyFeeMutation.mutateAsync(payment.id)}
                          >
                            Baixa manual
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!monthlyFeesQuery.isLoading && monthlyFees.length === 0 ? (
              <p className="px-3 py-4 text-sm text-slate-500">Nenhuma mensalidade gerada para o período.</p>
            ) : null}
          </div>
        </div>

          <div className={`mt-3 grid gap-3 lg:grid-cols-3 ${showCollectionArea ? "" : "hidden"}`}>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-bold uppercase text-slate-500">Segmentação da carteira</p>
              <p className="mt-1 text-sm text-slate-700">Atual: {collection.segments.current ?? 0}</p>
              <p className="text-sm text-slate-700">1-7 dias: {collection.segments.d1_7 ?? 0}</p>
              <p className="text-sm text-slate-700">8-30 dias: {collection.segments.d8_30 ?? 0}</p>
              <p className="text-sm text-slate-700">31+ dias: {collection.segments.d31Plus ?? 0}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-bold uppercase text-slate-500">Régua de cobrança</p>
              <p className="mt-1 text-sm text-slate-700">D-3: {collection.cadence.preDue3 ?? 0}</p>
              <p className="text-sm text-slate-700">D+3: {collection.cadence.dPlus3 ?? 0}</p>
              <p className="text-sm text-slate-700">D+7: {collection.cadence.dPlus7 ?? 0}</p>
              <p className="text-sm text-slate-700">D+15: {collection.cadence.dPlus15 ?? 0}</p>
              <button
                type="button"
                className="mt-2 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                disabled={runCadenceMutation.isPending}
                onClick={() => void runCadenceMutation.mutateAsync()}
              >
                {runCadenceMutation.isPending ? "Disparando..." : "Disparar régua agora"}
              </button>
              {runCadenceMutation.data ? (
                <p className="mt-2 text-xs text-slate-600">
                  Última execução: {runCadenceMutation.data.sentEmail} e-mail(s), {runCadenceMutation.data.sentWhatsapp} WhatsApp, {runCadenceMutation.data.skipped} sem ação.
                </p>
              ) : null}
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-bold uppercase text-slate-500">Plano de ação automático</p>
              {(collection.actionPlan ?? []).map((action, index) => (
                <p key={`${action}-${index}`} className="mt-1 text-xs text-slate-700">{index + 1}. {action}</p>
              ))}
            </div>
          </div>

          <div className={`mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 ${showCollectionArea ? "" : "hidden"}`}>
            <p className="text-xs font-bold uppercase text-slate-500">Produtividade da régua</p>
            <div className="mt-2 grid gap-2 md:grid-cols-4">
              {(productivity.byStage ?? []).map((item) => (
                <div key={item.stage} className="rounded border border-slate-200 bg-white p-2">
                  <p className="text-xs font-semibold text-slate-500">{stageLabel[item.stage] ?? item.stage}</p>
                  <p className="text-sm text-slate-700">Envios: {item.sent}</p>
                  <p className="text-sm text-slate-700">Recuperados: {item.recovered}</p>
                  <p className="text-sm font-semibold text-emerald-700">Taxa: {item.recoveryRatePercent}%</p>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs font-semibold text-slate-700">
              Total: {productivity.totals.sent ?? 0} envios | {productivity.totals.recovered ?? 0} recuperados | taxa geral {productivity.totals.recoveryRatePercent ?? 0}%
            </p>
          </div>
      </article>
      ) : null}

      {financeView === "REPORTS" ? (
        <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
            <div>
              <h3 className="text-lg font-black text-slate-950">Relatório financeiro periódico</h3>
              <p className="mt-1 text-sm font-semibold text-slate-500">Prestação de contas para diretoria e associação, com evolução por período.</p>
            </div>
            <select
              className="fl-compact-select h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 shadow-sm"
              value={reportRange}
              onChange={(event) => setReportRange(event.target.value as FinancePeriodReport["range"])}
            >
              <option value="MONTH">Mês atual</option>
              <option value="QUARTER">Últimos 3 meses</option>
              <option value="SEMESTER">Últimos 6 meses</option>
              <option value="YEAR">Últimos 12 meses</option>
            </select>
          </div>

          {periodReportQuery.isLoading ? <p className="mt-4 text-sm font-semibold text-slate-500">Calculando relatório...</p> : null}
          {periodReport ? (
            <>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <FinanceMetricCard label="Receita no período" value={formatCurrency(periodReport.totals.incomeCents)} hint={`Média ${formatCurrency(periodReport.averages.incomeCents)}`} icon={<TrendingUp size={18} />} tone="green" />
                <FinanceMetricCard label="Despesa no período" value={formatCurrency(periodReport.totals.expenseCents)} hint={`Média ${formatCurrency(periodReport.averages.expenseCents)}`} icon={<TrendingDown size={18} />} tone="red" />
                <FinanceMetricCard label="Saldo acumulado" value={formatCurrency(periodReport.totals.balanceCents)} hint={`Margem ${periodReport.indicators.marginPercent}%`} icon={<WalletCards size={18} />} tone={periodReport.totals.balanceCents >= 0 ? "green" : "red"} />
                <FinanceMetricCard label="Risco de atraso" value={`${periodReport.indicators.delinquencyRiskPercent}%`} hint={`${periodReport.totals.overdueCount} vencido(s)`} icon={<AlertTriangle size={18} />} tone={periodReport.indicators.delinquencyRiskPercent > 20 ? "red" : "amber"} />
              </div>

              <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.6fr)]">
                <div className="rounded-lg border border-slate-200 p-3">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h4 className="font-black text-slate-950">Evolução mensal</h4>
                    <span className="text-xs font-bold text-slate-500">Receita, despesa e saldo</span>
                  </div>
                  <div className="space-y-3">
                    {periodReport.monthly.map((row) => {
                      const label = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" }).format(new Date(Date.UTC(row.year, row.month - 1, 1)));
                      const incomeWidth = Math.max(4, Math.round((row.incomeCents / reportMaxAmount) * 100));
                      const expenseWidth = Math.max(4, Math.round((row.expenseCents / reportMaxAmount) * 100));
                      return (
                        <div key={`${row.year}-${row.month}`} className="grid gap-2 rounded-lg bg-slate-50 p-3 md:grid-cols-[5rem_minmax(0,1fr)_8rem] md:items-center">
                          <span className="text-sm font-black capitalize text-slate-700">{label}</span>
                          <div className="space-y-1.5">
                            <div className="h-2 overflow-hidden rounded-full bg-emerald-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${incomeWidth}%` }} /></div>
                            <div className="h-2 overflow-hidden rounded-full bg-red-100"><div className="h-full rounded-full bg-red-500" style={{ width: `${expenseWidth}%` }} /></div>
                          </div>
                          <span className={`text-right text-sm font-black ${row.balanceCents >= 0 ? "text-emerald-700" : "text-red-700"}`}>{formatCurrency(row.balanceCents)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 p-3">
                  <h4 className="font-black text-slate-950">Indicadores</h4>
                  <div className="mt-3 space-y-2 text-sm font-semibold text-slate-600">
                    <p className="flex justify-between gap-3"><span>Comprometimento</span><strong className="text-slate-950">{periodReport.indicators.expenseRatioPercent}%</strong></p>
                    <p className="flex justify-between gap-3"><span>Pendências</span><strong className="text-slate-950">{formatCurrency(periodReport.totals.pendingCents)}</strong></p>
                    <p className="flex justify-between gap-3"><span>Atrasos</span><strong className="text-red-700">{formatCurrency(periodReport.totals.overdueCents)}</strong></p>
                    <p className="flex justify-between gap-3"><span>Melhor mês</span><strong className="text-emerald-700">{periodReport.highlights.bestMonth ? formatCurrency(periodReport.highlights.bestMonth.balanceCents) : "-"}</strong></p>
                    <p className="flex justify-between gap-3"><span>Pior mês</span><strong className="text-red-700">{periodReport.highlights.worstMonth ? formatCurrency(periodReport.highlights.worstMonth.balanceCents) : "-"}</strong></p>
                  </div>
                  <h4 className="mt-5 font-black text-slate-950">Maiores categorias</h4>
                  <div className="mt-3 space-y-2">
                    {periodReport.categories.slice(0, 5).map((category) => (
                      <div key={`${category.type}-${category.category}`} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                        <span className="truncate font-bold text-slate-700">{formatFinancialCategory(category.category)}</span>
                        <strong className={category.type === "INCOME" ? "text-emerald-700" : "text-red-700"}>{formatCurrency(category.totalCents)}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </article>
      ) : null}

      {financeView === "OPERACAO" && !showDashboardArea ? (
      <FinanceOperationPanel
        activeView={financeOperationView}
        onChange={setFinanceOperationView}
        createError={createMutation.isError}
        deleteError={deleteEntryMutation.isError}
        updateStatusError={updateStatusMutation.isError}
        manualSettleError={manualSettleMonthlyFeeMutation.isError}
        success={createMutation.isSuccess || deleteEntryMutation.isSuccess || updateStatusMutation.isSuccess || manualSettleMonthlyFeeMutation.isSuccess}
      />
      ) : null}

      <div className="grid grid-cols-1 gap-3">
        {showEntriesArea ? (
        <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
            <div className="min-w-0">
              <h3 className="text-lg font-black text-slate-950">Lançamentos financeiros</h3>
              <p className="mt-1 text-sm font-semibold text-slate-500">Extrato do período com receitas, despesas, vencimentos e comprovantes.</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-[minmax(9rem,12rem)_minmax(9rem,12rem)_auto]">
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)}
                className="fl-compact-select h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm"
              >
                <option value="ALL">Tipo: Todos</option>
                {Object.entries(typeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
                className="fl-compact-select h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm"
              >
                <option value="ALL">Status: Todos</option>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50"
                onClick={() => void handleExportCsv()}
              >
                <Download size={15} />
                CSV
              </button>
            </div>
          </div>

          <div className="mb-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Pendentes", value: entries.filter((entry) => entry.status === "PENDING").length, action: () => setStatusFilter("PENDING"), className: "border-amber-200 bg-amber-50 text-amber-700" },
              { label: "Vencidos", value: entries.filter((entry) => entry.status === "OVERDUE" || (entry.dueDate && daysUntil(entry.dueDate) < 0 && entry.status !== "PAID")).length, action: () => setStatusFilter("OVERDUE"), className: "border-red-200 bg-red-50 text-red-700" },
              { label: "Receitas", value: formatCurrency(filteredIncomeCents), action: () => setTypeFilter("INCOME"), className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
              { label: "Despesas", value: formatCurrency(filteredExpenseCents), action: () => setTypeFilter("EXPENSE"), className: "border-slate-200 bg-slate-50 text-slate-700" }
            ].map((item) => (
              <button key={item.label} type="button" className={`rounded-lg border px-3 py-2 text-left ${item.className}`} onClick={item.action}>
                <span className="block text-[10px] font-black uppercase tracking-[0.08em]">{item.label}</span>
                <strong className="mt-1 block text-lg font-black">{item.value}</strong>
              </button>
            ))}
          </div>

          <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
            {entries.length} registro(s) filtrado(s) - saldo filtrado {formatCurrency(filteredBalanceCents)}
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[820px] border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="p-3">Lançamento</th>
                  <th className="p-2">Tipo</th>
                  <th className="p-2">Detalhes</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Valor</th>
                  <th className="w-48 p-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const dueDelta = entry.dueDate ? daysUntil(entry.dueDate) : null;
                  const isLate = entry.status === "OVERDUE" || (dueDelta !== null && dueDelta < 0 && entry.status !== "PAID");
                  const isDueSoon = dueDelta !== null && dueDelta >= 0 && dueDelta <= 5 && entry.status !== "PAID";

                  return (
                  <tr key={entry.id} className={`border-t border-slate-100 ${isLate ? "bg-red-50/70" : isDueSoon ? "bg-amber-50/70" : ""}`}>
                    <td className="max-w-[18rem] p-3">
                      <p className="truncate font-black text-slate-900">{entry.description}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {entry.associateId ? (associateNameById.get(entry.associateId) ?? "Associado") : "Sem associado"}
                      </p>
                    </td>
                    <td className="p-2 text-slate-600">
                      <span className={`rounded-full px-2 py-1 text-[11px] font-black ${entry.type === "INCOME" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                        {formatFinancialType(entry.type)}
                      </span>
                    </td>
                    <td className="p-2 text-xs font-semibold text-slate-600">
                      <p>{formatFinancialCategory(entry.category)}</p>
                      <p className="mt-1 text-slate-400">{entry.costCenter ?? "Sem centro de custo"}</p>
                      <p className={`mt-1 ${isLate ? "font-black text-red-700" : isDueSoon ? "font-black text-amber-700" : "text-slate-500"}`}>
                        {entry.dueDate ? `Vence ${new Date(entry.dueDate).toLocaleDateString("pt-BR")} (${dueDelta}d)` : "Sem vencimento"}
                      </p>
                    </td>
                    <td className="p-2 text-slate-600">
                      <span className={`rounded-full px-2 py-1 text-[11px] font-black ${entry.status === "PAID" ? "bg-emerald-50 text-emerald-700" : isLate ? "bg-red-100 text-red-700" : entry.status === "PENDING" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                        {formatFinancialStatus(entry.status)}
                      </span>
                    </td>
                    <td className={`p-2 font-black ${entry.type === "INCOME" ? "text-emerald-700" : "text-red-700"}`}>{formatCurrency(entry.amountCents)}</td>
                    <td className="p-2">
                      <div className="flex min-w-44 flex-nowrap items-center gap-1">
                        <button
                          type="button"
                          className="grid size-8 shrink-0 place-items-center rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          onClick={() => handleEditEntry(entry)}
                          title="Editar lançamento"
                          aria-label="Editar lançamento"
                        >
                          <Pencil size={15} />
                        </button>
                        {entry.status !== "PAID" ? (
                          <button
                            type="button"
                            className="grid size-8 shrink-0 place-items-center rounded border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            disabled={updateStatusMutation.isPending}
                            onClick={() =>
                              void updateStatusMutation.mutateAsync({
                                id: entry.id,
                                status: "PAID",
                                paidAt: new Date().toISOString()
                              })
                            }
                            title="Quitar lançamento"
                            aria-label="Quitar lançamento"
                          >
                            <CheckCircle2 size={15} />
                          </button>
                        ) : null}
                        {entry.status === "PENDING" ? (
                          <button
                            type="button"
                            className="grid size-8 shrink-0 place-items-center rounded border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                            disabled={updateStatusMutation.isPending}
                            onClick={() =>
                              void updateStatusMutation.mutateAsync({
                                id: entry.id,
                                status: "OVERDUE",
                                paidAt: null
                              })
                            }
                            title="Marcar vencido"
                            aria-label="Marcar vencido"
                          >
                            <AlertCircle size={15} />
                          </button>
                        ) : null}
                        {entry.receiptUrl ? (
                          <a
                            className="grid size-8 shrink-0 place-items-center rounded border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                            href={entry.receiptUrl}
                            target="_blank"
                            rel="noreferrer"
                            title="Ver comprovante"
                            aria-label="Ver comprovante"
                          >
                            <Eye size={15} />
                          </a>
                        ) : (
                          <span className="grid size-8 shrink-0 place-items-center rounded border border-slate-200 bg-slate-50 text-slate-300" title="Sem comprovante">
                            <ReceiptText size={15} />
                          </span>
                        )}
                        <button
                          type="button"
                          className="grid size-8 shrink-0 place-items-center rounded border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                          disabled={deleteEntryMutation.isPending}
                          onClick={() => {
                            if (!window.confirm("Excluir este lançamento? Esta ação não pode ser desfeita.")) {
                              return;
                            }
                            void deleteEntryMutation.mutateAsync(entry.id);
                          }}
                          title="Excluir lançamento"
                          aria-label="Excluir lançamento"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>

            {!entries.length ? <p className="p-3 text-sm text-slate-500">Nenhum lançamento encontrado.</p> : null}
          </div>
        </article>
        ) : null}

        {showEntryFormArea ? (
        <FinanceEntryForm
          editingEntryId={editingEntryId}
          form={form}
          associates={associatesQuery.data ?? []}
          categoryOptions={categoryOptions}
          saving={createMutation.isPending || updateEntryMutation.isPending}
          setForm={setForm}
          onCancelEdit={handleCancelEdit}
          onReceiptFile={handleReceiptFile}
          onSubmit={handleCreateEntry}
        />
        ) : null}

        {financeView === "ADMIN" && entries.length < 0 ? (
          <aside className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Extrato lateral</h3>
                <p className="text-xs text-slate-500">Todos os lançamentos do período. Remova aqui se lançou errado.</p>
              </div>
              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{statementEntries.length}</span>
            </div>

            <div className="mt-3 max-h-[42rem] space-y-2 overflow-auto pr-1">
              {statementEntries.map((entry) => (
                <article key={`statement-${entry.id}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{entry.description}</p>
                      <p className="text-[11px] text-slate-500">{formatDateTime(entry.createdAt)} · {formatFinancialType(entry.type)} · {formatFinancialStatus(entry.status)}</p>
                    </div>
                    <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${entry.type === "INCOME" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                      {formatCurrency(entry.amountCents)}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                    <span>{formatFinancialCategory(entry.category)}{entry.costCenter ? ` · ${entry.costCenter}` : ""}</span>
                    <button
                      type="button"
                      className="rounded border border-red-200 bg-white px-2 py-1 font-semibold text-red-700 hover:bg-red-50"
                      disabled={deleteEntryMutation.isPending}
                      onClick={() => {
                        if (!window.confirm("Excluir este lançamento? Esta ação não pode ser desfeita.")) {
                          return;
                        }
                        void deleteEntryMutation.mutateAsync(entry.id);
                      }}
                    >
                      Remover
                    </button>
                  </div>
                </article>
              ))}

              {!statementEntries.length ? <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-sm text-slate-500">Sem lançamentos no período.</p> : null}
            </div>
          </aside>
        ) : null}
      </div>
    </section>
  );
}
