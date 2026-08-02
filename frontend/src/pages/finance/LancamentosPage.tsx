import { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { apiRequest } from "../../services/api";
import { PageHeader } from "../../components/ui/PageHeader";
import { SectionCard } from "../../components/ui/SectionCard";
import { StatusBadge } from "../../components/ui/StatusBadge";
import type { FinancialEntry } from "../../types/domain";
import { formatCurrency } from "../../utils/formatters";

type OutletPeriod = { month: number; year: number };

const PAGE_SIZE = 15;

const entryStatusLabel: Record<FinancialEntry["status"], string> = {
  PAID: "Pago",
  PENDING: "Pendente",
  OVERDUE: "Vencido",
  CANCELED: "Cancelado"
};

const entryStatusVariant: Record<FinancialEntry["status"], "success" | "neutral" | "danger" | "warning"> = {
  PAID: "success",
  PENDING: "neutral",
  OVERDUE: "danger",
  CANCELED: "warning"
};

type LancamentosPageProps = {
  type: "INCOME" | "EXPENSE";
};

export function LancamentosPage({ type }: LancamentosPageProps) {
  const { month, year } = useOutletContext<OutletPeriod>();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | FinancialEntry["status"]>("ALL");
  const [page, setPage] = useState(1);

  const title = type === "INCOME" ? "Receitas" : "Despesas";
  const eyebrow = "Financeiro";
  const breadcrumb = type === "INCOME" ? "Receitas" : "Despesas";
  const entriesQuery = useQuery({
    queryKey: ["financial-entries", type, month, year],
    queryFn: () => apiRequest<FinancialEntry[]>(`/finance/entries?type=${type}&month=${month}&year=${year}&limit=200`)
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest<void>(`/finance/entries/${id}`, { method: "DELETE" }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["financial-entries"] })
  });

  const entries = entriesQuery.data ?? [];
  const filtered = entries.filter((e) => {
    const q = search.trim().toLowerCase();
    const matchSearch = !q || e.description.toLowerCase().includes(q) || e.category.toLowerCase().includes(q);
    const matchStatus = statusFilter === "ALL" || e.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const normalizedPage = Math.min(page, totalPages);
  const pageStart = (normalizedPage - 1) * PAGE_SIZE;
  const paginated = filtered.slice(pageStart, pageStart + PAGE_SIZE);
  const total = entries.reduce((s, e) => s + (e.status !== "CANCELED" ? e.amountCents : 0), 0);

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow={eyebrow}
        breadcrumbs={[{ label: "Financeiro", href: "/financeiro" }, { label: breadcrumb }]}
        title={title}
        subtitle={`${entries.length} lançamentos · Total: ${formatCurrency(total)}`}
        action={
          <Link
            to={`/financeiro?area=${type === "INCOME" ? "RECEITAS" : "DESPESAS"}&action=novo`}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-black text-white hover:bg-red-700"
          >
            <Plus size={16} /> Novo lançamento
          </Link>
        }
      />

      <SectionCard noPadding>
        <div className="flex flex-wrap items-center gap-2 p-4">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-8 text-sm font-semibold text-slate-950 focus:border-slate-400 focus:outline-none"
              placeholder="Buscar por descrição ou categoria..."
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
            {(["ALL", "PAID", "PENDING", "OVERDUE"] as const).map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`rounded-lg border px-3 py-1.5 text-xs font-black transition-colors ${
                  statusFilter === s ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                {s === "ALL" ? "Todos" : entryStatusLabel[s]}
              </button>
            ))}
          </div>
        </div>

        {entriesQuery.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-160">
              <thead>
                <tr className="border-y border-slate-100 bg-slate-50">
                  {["Descrição", "Categoria", "Valor", "Competência", "Vencimento", "Situação", "Ações"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-black uppercase tracking-wide text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm font-semibold text-slate-400">Nenhum lançamento encontrado</td>
                  </tr>
                ) : paginated.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-black text-slate-950 max-w-48 truncate">{e.description}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-500">{e.category}</td>
                    <td className={`px-4 py-3 text-sm font-black ${type === "INCOME" ? "text-emerald-600" : "text-red-600"}`}>
                      {formatCurrency(e.amountCents)}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-600">
                      {String(e.competenceMonth).padStart(2, "0")}/{e.competenceYear}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-600">
                      {e.dueDate ? new Intl.DateTimeFormat("pt-BR").format(new Date(e.dueDate)) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge label={entryStatusLabel[e.status]} variant={entryStatusVariant[e.status]} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Link
                          to={`/financeiro?area=${type === "INCOME" ? "RECEITAS" : "DESPESAS"}&edit=${e.id}`}
                          className="rounded p-1 text-slate-500 hover:bg-slate-100"
                        >
                          <Pencil size={13} />
                        </Link>
                        <button
                          onClick={() => {
                            if (window.confirm("Excluir este lançamento?")) {
                              void deleteMutation.mutateAsync(e.id);
                            }
                          }}
                          className="rounded p-1 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
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
