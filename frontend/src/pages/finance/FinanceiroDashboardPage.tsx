import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  AlertCircle, ArrowRight, Coins, TrendingDown, TrendingUp, WalletCards
} from "lucide-react";
import { apiRequest } from "../../services/api";
import { KpiCard } from "../../components/ui/KpiCard";
import { PageHeader } from "../../components/ui/PageHeader";
import { SectionCard } from "../../components/ui/SectionCard";
import type { DashboardSummary, FinancialSummary } from "../../types/domain";
import { formatCurrency } from "../../utils/formatters";

type OutletPeriod = { month: number; year: number };

export function FinanceiroDashboardPage() {
  const { month, year } = useOutletContext<OutletPeriod>();

  const summaryQuery = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => apiRequest<DashboardSummary>("/dashboard/summary")
  });

  const financeSummaryQuery = useQuery({
    queryKey: ["finance-summary", month, year],
    queryFn: () => apiRequest<FinancialSummary>(`/finance/summary?month=${month}&year=${year}`)
  });

  const summary = summaryQuery.data;
  const finance = financeSummaryQuery.data;
  const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Financeiro"
        title="Dashboard Financeiro"
        subtitle={`Resumo de ${monthLabel}`}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          label="Receita do mês"
          value={formatCurrency(summary?.monthRevenueCents ?? finance?.incomeCents ?? 0)}
          icon={TrendingUp}
          iconClass="bg-emerald-50 text-emerald-600"
          href="/financeiro/receitas"
        />
        <KpiCard
          label="Despesas do mês"
          value={formatCurrency(summary?.monthExpenseCents ?? finance?.expenseCents ?? 0)}
          icon={TrendingDown}
          iconClass="bg-red-50 text-red-600"
          href="/financeiro/despesas"
        />
        <KpiCard
          label="Saldo"
          value={formatCurrency((summary?.monthRevenueCents ?? 0) - (summary?.monthExpenseCents ?? 0))}
          icon={Coins}
          iconClass="bg-blue-50 text-blue-600"
        />
        <KpiCard
          label="Mensalidades"
          value={`${summary?.monthlyFeeAlert?.pendingCount ?? 0} pendentes`}
          sub={`${summary?.monthlyFeeAlert?.lateCount ?? 0} em atraso`}
          icon={WalletCards}
          iconClass="bg-amber-50 text-amber-600"
          href="/financeiro/mensalidades"
        />
      </div>

      {/* Alertas e atalhos */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Alertas financeiros">
          {summary?.monthlyFeeAlert && (summary.monthlyFeeAlert.pendingCount > 0 || summary.monthlyFeeAlert.lateCount > 0) ? (
            <div className="space-y-2">
              {summary.monthlyFeeAlert.lateCount > 0 && (
                <Link
                  to="/financeiro/mensalidades?status=LATE"
                  className="flex items-center gap-3 rounded-lg border border-red-100 bg-red-50 p-3 hover:bg-red-100"
                >
                  <AlertCircle size={16} className="shrink-0 text-red-600" />
                  <div>
                    <p className="text-sm font-black text-red-800">{summary.monthlyFeeAlert.lateCount} mensalidades em atraso</p>
                    <p className="text-xs font-semibold text-red-600">{formatCurrency(summary.monthlyFeeAlert.amountCents)} em risco</p>
                  </div>
                  <ArrowRight size={14} className="ml-auto text-red-500" />
                </Link>
              )}
              {summary.monthlyFeeAlert.pendingCount > 0 && (
                <Link
                  to="/financeiro/mensalidades?status=PENDING"
                  className="flex items-center gap-3 rounded-lg border border-amber-100 bg-amber-50 p-3 hover:bg-amber-100"
                >
                  <AlertCircle size={16} className="shrink-0 text-amber-600" />
                  <div>
                    <p className="text-sm font-black text-amber-800">{summary.monthlyFeeAlert.pendingCount} mensalidades pendentes</p>
                  </div>
                  <ArrowRight size={14} className="ml-auto text-amber-500" />
                </Link>
              )}
            </div>
          ) : (
            <div className="py-4 text-center">
              <p className="text-sm font-semibold text-emerald-600">Nenhum alerta financeiro</p>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Módulos financeiros">
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Mensalidades", href: "/financeiro/mensalidades", color: "bg-blue-50 text-blue-700" },
              { label: "Receitas", href: "/financeiro/receitas", color: "bg-emerald-50 text-emerald-700" },
              { label: "Despesas", href: "/financeiro/despesas", color: "bg-red-50 text-red-700" },
              { label: "Cobranças", href: "/financeiro/cobrancas", color: "bg-amber-50 text-amber-700" },
            ].map(({ label, href, color }) => (
              <Link
                key={href}
                to={href}
                className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5 hover:bg-slate-50"
              >
                <span className={`rounded px-2 py-0.5 text-xs font-black ${color}`}>{label}</span>
                <ArrowRight size={14} className="text-slate-400" />
              </Link>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Lançamentos recentes */}
      {summary?.recentFinancialEntries && summary.recentFinancialEntries.length > 0 && (
        <SectionCard
          title="Lançamentos recentes"
          action={
            <Link to="/financeiro/receitas" className="text-xs font-black text-slate-500 hover:text-slate-700">
              Ver todos →
            </Link>
          }
        >
          <div className="space-y-1.5">
            {summary.recentFinancialEntries.slice(0, 6).map((e) => (
              <div key={e.id} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2">
                <span className={`text-xs font-black ${e.type === "INCOME" ? "text-emerald-600" : "text-red-600"}`}>
                  {e.type === "INCOME" ? "+" : "-"}{formatCurrency(e.amountCents)}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700">{e.description}</span>
                <span className="shrink-0 text-xs font-semibold text-slate-400">{e.category}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
