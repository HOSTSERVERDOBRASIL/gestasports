import { useState } from "react";
import { useOutletContext, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { apiRequest } from "../../services/api";
import { PageHeader } from "../../components/ui/PageHeader";
import { SectionCard } from "../../components/ui/SectionCard";
import { StatusBadge } from "../../components/ui/StatusBadge";
import type { MonthlyFeePayment, PaymentStatus } from "../../types/domain";
import { formatCurrency } from "../../utils/formatters";

type OutletPeriod = { month: number; year: number };

const PAGE_SIZE = 15;

const statusLabel: Record<PaymentStatus, string> = {
  PAID: "Pago",
  PENDING: "Pendente",
  LATE: "Em atraso"
};

const statusVariant: Record<PaymentStatus, "success" | "neutral" | "danger"> = {
  PAID: "success",
  PENDING: "neutral",
  LATE: "danger"
};

export function MensalidadesPage() {
  const { month, year } = useOutletContext<OutletPeriod>();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | PaymentStatus>(
    () => {
      const s = new URLSearchParams(location.search).get("status");
      return s === "PAID" || s === "PENDING" || s === "LATE" ? s : "ALL";
    }
  );
  const [page, setPage] = useState(1);

  const paymentsQuery = useQuery({
    queryKey: ["monthly-fee-payments", month, year],
    queryFn: () => apiRequest<MonthlyFeePayment[]>(`/finance/monthly-fees?month=${month}&year=${year}&limit=200`)
  });

  const quickStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: PaymentStatus }) =>
      apiRequest<MonthlyFeePayment>(`/finance/monthly-fees/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["monthly-fee-payments"] })
  });

  const payments = paymentsQuery.data ?? [];
  const filtered = payments.filter((p) => {
    const q = search.trim().toLowerCase();
    const matchSearch = !q || (p.associateName ?? "").toLowerCase().includes(q);
    const matchStatus = statusFilter === "ALL" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const normalizedPage = Math.min(page, totalPages);
  const pageStart = (normalizedPage - 1) * PAGE_SIZE;
  const paginated = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  const paid = payments.filter((p) => p.status === "PAID").length;
  const late = payments.filter((p) => p.status === "LATE").length;

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Financeiro"
        breadcrumbs={[{ label: "Financeiro", href: "/financeiro" }, { label: "Mensalidades" }]}
        title="Mensalidades"
        subtitle={`${payments.length} cobranças · ${paid} pagas · ${late} em atraso`}
      />

      <SectionCard noPadding>
        <div className="flex flex-wrap items-center gap-2 p-4">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-8 text-sm font-semibold text-slate-950 focus:border-slate-400 focus:outline-none"
              placeholder="Buscar associado..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            )}
          </div>
          <div className="flex gap-1">
            {(["ALL", "PAID", "PENDING", "LATE"] as const).map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`rounded-lg border px-3 py-1.5 text-xs font-black transition-colors ${
                  statusFilter === s ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                {s === "ALL" ? "Todos" : statusLabel[s]}
              </button>
            ))}
          </div>
        </div>

        {paymentsQuery.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-150">
              <thead>
                <tr className="border-y border-slate-100 bg-slate-50">
                  {["Associado", "Período", "Valor", "Vencimento", "Situação", "Ações"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-black uppercase tracking-wide text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm font-semibold text-slate-400">Nenhuma mensalidade encontrada</td>
                  </tr>
                ) : paginated.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-black text-slate-950">{p.associateName ?? "—"}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-600">
                      {String(p.month).padStart(2, "0")}/{p.year}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-700">{formatCurrency(p.amountCents)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-600">
                      {p.dueDate ? new Intl.DateTimeFormat("pt-BR").format(new Date(p.dueDate)) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge label={statusLabel[p.status]} variant={statusVariant[p.status]} />
                    </td>
                    <td className="px-4 py-3">
                      {p.status !== "PAID" && (
                        <button
                          onClick={() => void quickStatusMutation.mutateAsync({ id: p.id, status: "PAID" })}
                          disabled={quickStatusMutation.isPending}
                          className="rounded px-2 py-1 text-xs font-black text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
                        >
                          Marcar pago
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
            <p className="text-xs font-semibold text-slate-500">
              {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, filtered.length)} de {filtered.length}
            </p>
            <div className="flex gap-1">
              <button disabled={normalizedPage === 1} onClick={() => setPage((p) => p - 1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50">
                <ChevronLeft size={14} />
              </button>
              <button disabled={normalizedPage === totalPages} onClick={() => setPage((p) => p + 1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
