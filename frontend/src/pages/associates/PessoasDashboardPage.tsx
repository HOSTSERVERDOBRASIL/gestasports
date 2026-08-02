import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  TrendingUp,
  Users,
  UserPlus,
  Wallet,
  X,
  Activity,
  Gift,
  ShieldAlert
} from "lucide-react";
import { apiRequest } from "../../services/api";
import type { Associate, JoinRequest } from "../../types/domain";

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function getInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

function todayBirthday(associate: Associate): boolean {
  if (!associate.joinedAt) return false;
  const d = new Date(associate.joinedAt);
  const now = new Date();
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth();
}

function monthName(month: number) {
  return new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(new Date(2024, month - 1, 1));
}

function growthByMonth(associates: Associate[]) {
  const counts: Record<string, number> = {};
  for (const a of associates) {
    const d = new Date(a.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  const sorted = Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)).slice(-6);
  return sorted.map(([key, value]) => {
    const [, month] = key.split("-");
    return { label: monthName(Number(month)), value };
  });
}

export function PessoasDashboardPage() {
  const queryClient = useQueryClient();

  const associatesQuery = useQuery({
    queryKey: ["associates"],
    queryFn: () => apiRequest<Associate[]>("/associates")
  });

  const joinRequestsQuery = useQuery({
    queryKey: ["group-join-requests"],
    queryFn: () => apiRequest<JoinRequest[]>("/group/join-requests")
  });

  const requestStatusMutation = useMutation({
    mutationFn: ({ request, status }: { request: JoinRequest; status: "APPROVED" | "REJECTED" }) =>
      apiRequest<JoinRequest>(`/group/join-requests/${request.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["group-join-requests"] });
      void queryClient.invalidateQueries({ queryKey: ["associates"] });
    }
  });

  const associates = associatesQuery.data ?? [];
  const joinRequests = joinRequestsQuery.data ?? [];
  const pending = joinRequests.filter((r) => r.status === "PENDING");

  const active = associates.filter((a) => a.status === "ACTIVE").length;
  const late = associates.filter((a) => a.status === "LATE").length;
  const inactive = associates.filter((a) => a.status === "INACTIVE").length;
  const total = associates.length;
  const athletesLinked = associates.filter((a) => a.athlete).length;
  const monthlyTotal = associates.reduce((s, a) => s + a.monthlyFeeCents, 0);
  const activeMonthly = associates.filter((a) => a.status === "ACTIVE").reduce((s, a) => s + a.monthlyFeeCents, 0);
  const lateMonthly = associates.filter((a) => a.status === "LATE").reduce((s, a) => s + a.monthlyFeeCents, 0);
  const healthPct = total > 0 ? Math.round((active / total) * 100) : 100;
  const conversionPct = total > 0 ? Math.round((athletesLinked / total) * 100) : 0;
  const withoutContact = associates.filter((a) => !a.email && !a.phone).length;
  const growth = growthByMonth(associates);
  const maxGrowth = Math.max(...growth.map((g) => g.value), 1);

  const statusBars = [
    { label: "Ativos", value: active, pct: total > 0 ? (active / total) * 100 : 0, color: "bg-emerald-500" },
    { label: "Atrasados", value: late, pct: total > 0 ? (late / total) * 100 : 0, color: "bg-amber-500" },
    { label: "Inativos", value: inactive, pct: total > 0 ? (inactive / total) * 100 : 0, color: "bg-slate-400" }
  ];

  const aniversariantes = associates.filter(todayBirthday);

  if (associatesQuery.isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-slate-200" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">Módulo Pessoas</p>
          <h1 className="mt-1 text-2xl font-black text-slate-950">Dashboard</h1>
          <p className="mt-1 text-sm font-semibold text-slate-500">Visão gerencial — indicadores, alertas e tendências.</p>
        </div>
        <Link
          to="/associados/novo"
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-black text-white shadow-sm hover:bg-red-700"
        >
          <UserPlus size={15} />
          Novo associado
        </Link>
      </div>

      {/* KPIs principais */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Total de associados",
            value: total,
            helper: `${active} ativos hoje`,
            icon: <Users size={18} />,
            color: "text-slate-950",
            bg: "bg-slate-100",
            link: "/associados"
          },
          {
            label: "Receita mensal prevista",
            value: formatCurrency(monthlyTotal),
            helper: `${formatCurrency(activeMonthly)} confirmado`,
            icon: <Wallet size={18} />,
            color: "text-emerald-700",
            bg: "bg-emerald-50",
            link: "/financeiro?area=DASHBOARD"
          },
          {
            label: "Inadimplentes",
            value: late,
            helper: `${formatCurrency(lateMonthly)} em risco`,
            icon: <AlertTriangle size={18} />,
            color: "text-amber-700",
            bg: "bg-amber-50",
            link: "/associados?status=LATE"
          },
          {
            label: "Saúde da base",
            value: `${healthPct}%`,
            helper: `${active} de ${total} em dia`,
            icon: <Activity size={18} />,
            color: healthPct >= 80 ? "text-emerald-700" : healthPct >= 60 ? "text-amber-700" : "text-red-700",
            bg: healthPct >= 80 ? "bg-emerald-50" : healthPct >= 60 ? "bg-amber-50" : "bg-red-50",
            link: "/associados"
          }
        ].map((kpi) => (
          <Link
            key={kpi.label}
            to={kpi.link}
            className="group rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">{kpi.label}</p>
              <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${kpi.bg} ${kpi.color}`}>
                {kpi.icon}
              </span>
            </div>
            <strong className={`mt-2 block text-2xl font-black ${kpi.color}`}>{kpi.value}</strong>
            <p className="mt-1 text-xs font-semibold text-slate-500">{kpi.helper}</p>
          </Link>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">

        {/* Crescimento por mês */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-black text-slate-950">Crescimento da base</h2>
              <p className="text-xs font-semibold text-slate-500">Novos cadastros por mês (últimos 6 meses)</p>
            </div>
            <TrendingUp size={16} className="shrink-0 text-slate-400" />
          </div>
          {growth.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Sem dados suficientes</p>
          ) : (
            <div className="flex items-end gap-2 pt-2" style={{ height: "8rem" }}>
              {growth.map((g) => (
                <div key={g.label} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] font-black text-slate-700">{g.value}</span>
                  <div
                    className="w-full rounded-t-sm bg-red-500 transition-all"
                    style={{ height: `${Math.max(4, (g.value / maxGrowth) * 96)}px` }}
                  />
                  <span className="text-[10px] font-semibold text-slate-500">{g.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Distribuição por status */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-black text-slate-950">Distribuição por status</h2>
          <div className="space-y-3">
            {statusBars.map((bar) => (
              <div key={bar.label}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">{bar.label}</span>
                  <span className="text-xs font-black text-slate-950">{bar.value}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className={`h-2 rounded-full transition-all ${bar.color}`}
                    style={{ width: `${bar.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 border-t border-slate-100 pt-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-500">Vinculados ao elenco</span>
              <span className="font-black text-slate-950">{athletesLinked} ({conversionPct}%)</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div className="h-2 rounded-full bg-blue-500 transition-all" style={{ width: `${conversionPct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Linha: alertas + aniversariantes */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">

        {/* Pendências */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-black text-slate-950">Pendências</h2>
            <ShieldAlert size={16} className="shrink-0 text-slate-400" />
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <Link
              to="/associados?status=LATE"
              className="group rounded-lg border border-amber-200 bg-amber-50 p-3 hover:bg-amber-100"
            >
              <p className="text-xs font-black uppercase tracking-wide text-amber-700">Inadimplentes</p>
              <strong className="mt-1 block text-2xl font-black text-amber-800">{late}</strong>
              <p className="mt-1 text-xs font-semibold text-amber-600">{formatCurrency(lateMonthly)} em aberto</p>
              <span className="mt-2 inline-flex items-center gap-1 text-xs font-black text-amber-700 group-hover:underline">
                Cobrar <ArrowRight size={11} />
              </span>
            </Link>
            <Link
              to="/convites"
              className="group rounded-lg border border-blue-200 bg-blue-50 p-3 hover:bg-blue-100"
            >
              <p className="text-xs font-black uppercase tracking-wide text-blue-700">Solicitações</p>
              <strong className="mt-1 block text-2xl font-black text-blue-800">{pending.length}</strong>
              <p className="mt-1 text-xs font-semibold text-blue-600">aguardando aprovação</p>
              <span className="mt-2 inline-flex items-center gap-1 text-xs font-black text-blue-700 group-hover:underline">
                Revisar <ArrowRight size={11} />
              </span>
            </Link>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">Sem contato</p>
              <strong className="mt-1 block text-2xl font-black text-slate-800">{withoutContact}</strong>
              <p className="mt-1 text-xs font-semibold text-slate-500">sem email ou telefone</p>
              <Link
                to="/associados"
                className="mt-2 inline-flex items-center gap-1 text-xs font-black text-slate-600 hover:underline"
              >
                Ver lista <ArrowRight size={11} />
              </Link>
            </div>
          </div>
        </div>

        {/* Aniversariantes / novos vínculos */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-black text-slate-950">Aniversariantes hoje</h2>
            <Gift size={16} className="shrink-0 text-slate-400" />
          </div>
          {aniversariantes.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-xs font-semibold text-slate-400">
              Nenhum aniversariante hoje
            </p>
          ) : (
            <div className="space-y-2">
              {aniversariantes.map((a) => (
                <Link
                  key={a.id}
                  to={`/associados/${a.id}`}
                  className="flex items-center gap-3 rounded-lg p-2 hover:bg-slate-50"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-black text-slate-700">
                    {getInitials(a.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-950">{a.name}</p>
                    <p className="text-xs font-semibold text-slate-500">{a.boardRole?.name ?? "Membro"}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Solicitações de entrada — até 3 */}
      {pending.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-black text-slate-950">Solicitações de entrada</h2>
              <p className="text-xs font-semibold text-slate-500">{pending.length} aguardando aprovação</p>
            </div>
            <Link to="/convites" className="inline-flex items-center gap-1 text-xs font-black text-slate-600 hover:underline">
              Ver todas <ArrowRight size={11} />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pending.slice(0, 3).map((req) => (
              <article key={req.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-950">{req.name}</p>
                    <p className="truncate text-xs font-semibold text-slate-500">{req.email}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-700">Pendente</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={requestStatusMutation.isPending}
                    onClick={() => void requestStatusMutation.mutateAsync({ request: req, status: "APPROVED" })}
                    className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-600 px-2 py-1.5 text-xs font-black text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    <Check size={12} /> Aprovar
                  </button>
                  <button
                    type="button"
                    disabled={requestStatusMutation.isPending}
                    onClick={() => void requestStatusMutation.mutateAsync({ request: req, status: "REJECTED" })}
                    className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    <X size={12} /> Rejeitar
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* Atalhos */}
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-black text-slate-950">Módulos do Pessoas</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Associados", desc: `${total} cadastros`, path: "/associados", badge: total },
            { label: "Atletas", desc: `${athletesLinked} vinculados`, path: "/atletas", badge: athletesLinked },
            { label: "Diretoria", desc: "Cargos e mandatos", path: "/diretoria", badge: null },
            { label: "Comissão Técnica", desc: "Equipe técnica", path: "/comissao-tecnica", badge: null },
            { label: "Convites", desc: `${pending.length} pendentes`, path: "/convites", badge: pending.length > 0 ? pending.length : null },
            { label: "Categorias", desc: "Planos e grupos", path: "/configuracoes?aba=board", badge: null },
            { label: "Financeiro", desc: "Mensalidades", path: "/financeiro?area=DASHBOARD", badge: late > 0 ? late : null },
            { label: "Relatórios", desc: "Exportar dados", path: "/relatorios", badge: null }
          ].map((item) => (
            <Link
              key={item.label}
              to={item.path}
              className="group flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5 hover:bg-slate-50"
            >
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-950">{item.label}</p>
                <p className="text-xs font-semibold text-slate-500">{item.desc}</p>
              </div>
              <div className="flex items-center gap-2">
                {item.badge !== null && item.badge !== undefined && item.badge > 0 ? (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-black text-amber-700">{item.badge}</span>
                ) : null}
                <ArrowRight size={14} className="shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-700" />
              </div>
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}
