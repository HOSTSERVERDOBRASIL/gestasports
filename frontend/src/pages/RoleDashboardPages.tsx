import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  Archive,
  ArrowRight,
  CalendarDays,
  CircleDollarSign,
  ClipboardCheck,
  FileText,
  Landmark,
  MapPinned,
  Settings,
  ShieldCheck,
  Shirt,
  Trophy,
  UserCheck,
  Users
} from "lucide-react";
import { Link, useOutletContext } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiRequest } from "../services/api";
import type { AssociateSelfSummary, DashboardSummary, SportsDirectorSummary } from "../types/domain";

type PeriodContext = { month: number; year: number };

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function money(cents: number) {
  return currency.format((cents || 0) / 100);
}

function shortChartLabel(name: string, maxLength = 12) {
  const trimmed = name.trim();
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength - 1)}.` : trimmed;
}

function Stat({ label, value, helper, icon }: { label: string; value: string | number; helper: string; icon: ReactNode }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">{helper}</p>
        </div>
        <span className="grid size-10 place-items-center rounded-lg bg-blue-50 text-[#123b7a]">{icon}</span>
      </div>
    </article>
  );
}

function Action({ to, title, description, icon, primary = false }: { to: string; title: string; description: string; icon: ReactNode; primary?: boolean }) {
  return (
    <Link to={to} className={`group rounded-lg border p-4 transition hover:-translate-y-0.5 hover:shadow-md ${primary ? "border-[#123b7a] bg-[#123b7a] text-white" : "border-slate-200 bg-white text-slate-950"}`}>
      <span className={`grid size-10 place-items-center rounded-lg ${primary ? "bg-white/15 text-white" : "bg-slate-100 text-[#123b7a]"}`}>{icon}</span>
      <h3 className="mt-3 font-black">{title}</h3>
      <p className={`mt-1 text-sm font-semibold ${primary ? "text-blue-100" : "text-slate-500"}`}>{description}</p>
    </Link>
  );
}

function useDashboardSummary() {
  const { month, year } = useOutletContext<PeriodContext>();
  return useQuery({
    queryKey: ["role-dashboard-summary", month, year],
    queryFn: () => apiRequest<DashboardSummary>(`/dashboard/summary?month=${month}&year=${year}`)
  });
}

function AdminMetric({
  label,
  value,
  helper,
  icon,
  tone = "blue"
}: {
  label: string;
  value: string | number;
  helper: string;
  icon: ReactNode;
  tone?: "blue" | "green" | "amber" | "red";
}) {
  const toneClass = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700"
  }[tone];

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase text-slate-500">{label}</p>
          <strong className="mt-2 block truncate text-2xl font-black leading-none text-slate-950 md:text-3xl">{value}</strong>
          <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">{helper}</p>
        </div>
        <span className={`grid size-10 shrink-0 place-items-center rounded-lg ${toneClass}`}>{icon}</span>
      </div>
    </article>
  );
}

function AdminTile({ to, title, description, icon, primary = false }: { to: string; title: string; description: string; icon: ReactNode; primary?: boolean }) {
  return (
    <Link
      to={to}
      className={`group grid min-h-[8.25rem] rounded-lg border p-4 transition hover:-translate-y-0.5 hover:shadow-md ${
        primary ? "border-[#123b7a] bg-[#123b7a] text-white" : "border-slate-200 bg-white text-slate-950"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className={`grid size-10 shrink-0 place-items-center rounded-lg ${primary ? "bg-white/15 text-white" : "bg-slate-50 text-[#123b7a]"}`}>{icon}</span>
        <ArrowRight className={`mt-1 transition group-hover:translate-x-0.5 ${primary ? "text-white/70" : "text-slate-300"}`} size={18} />
      </div>
      <div className="mt-3 self-end">
        <h3 className="text-base font-black">{title}</h3>
        <p className={`mt-1 text-sm font-semibold leading-5 ${primary ? "text-blue-100" : "text-slate-500"}`}>{description}</p>
      </div>
    </Link>
  );
}

export function AdministrativeDashboardPage() {
  const query = useDashboardSummary();
  const data = query.data;
  const pendingFees = data?.monthlyFeeAlert?.pendingCount ?? 0;
  const lateFees = data?.monthlyFeeAlert?.lateCount ?? 0;
  const openFees = data?.monthlyFeeAlert?.amountCents ?? 0;
  const balance = data?.balanceCents ?? 0;
  const totalAssociates = (data?.associatesActive ?? 0) + (data?.lateAssociates ?? 0);
  const delinquencyPercent = totalAssociates > 0 ? Math.round(((data?.lateAssociates ?? 0) / totalAssociates) * 100) : 0;
  const alerts = data?.alerts?.length ? data.alerts : [
    { title: "Mensalidades para conferir", subtitle: "Acompanhe cobranças, vencimentos e regularizações do mês." },
    { title: "Cadastros administrativos", subtitle: "Revise dados de associados, diretoria e permissões." },
    { title: "Documentos institucionais", subtitle: "Mantenha atas, estatuto, contratos e acervo em ordem." }
  ];
  const operations = [
    { to: "/associados", title: "Associados", description: "Cadastros, vínculos, categorias e situação associativa.", icon: <Users size={20} />, primary: true },
    { to: "/financeiro", title: "Financeiro", description: "Mensalidades, receitas, despesas, cobranças e caixa.", icon: <CircleDollarSign size={20} /> },
    { to: "/diretoria", title: "Governança", description: "Mandatos, cargos, responsabilidades e permissões.", icon: <ShieldCheck size={20} /> },
    { to: "/memorial/documentos", title: "Documentos", description: "Atas, estatuto, contratos, comprovantes e arquivos oficiais.", icon: <FileText size={20} /> },
    { to: "/memorial", title: "Acervo", description: "História, patrimônio, títulos, fotos e memória do clube.", icon: <Archive size={20} /> },
    { to: "/configuracoes/visao-geral", title: "Configurações", description: "Usuários, identidade, Pix, auditoria e regras do ambiente.", icon: <Settings size={20} /> }
  ];
  const quickActions = [
    ["Novo associado", "/associados?edit=new"],
    ["Cobranças do mês", "/financeiro?area=MENSALIDADES"],
    ["Prestação de contas", "/relatorios"],
    ["Atualizar diretoria", "/diretoria"],
    ["Cadastrar documento", "/memorial/documentos/novo"]
  ];
  const financialChartData = (data?.monthlySeries ?? []).slice(-6).map((row) => ({
    month: row.month,
    receitas: Math.round(row.revenueCents / 100),
    despesas: Math.round(row.expenseCents / 100),
    saldo: Math.round((row.revenueCents - row.expenseCents) / 100)
  }));
  const expenseChartData = (data?.expenseComposition ?? []).slice(0, 6).map((item) => ({
    category: shortChartLabel(item.category || "Sem categoria", 14),
    total: Math.round(item.totalCents / 100)
  }));
  const associationChartData = [
    { name: "Associados ativos", value: data?.associatesActive ?? 0, color: "#123b7a" },
    { name: "Associados em atraso", value: data?.lateAssociates ?? 0, color: "#ef4444" },
    { name: "Atletas aptos", value: data?.athletesReady ?? 0, color: "#10b981" },
    { name: "Atletas pendentes", value: Math.max((data?.athletesTotal ?? 0) - (data?.athletesReady ?? 0), 0), color: "#f59e0b" }
  ].filter((item) => item.value > 0);

  return (
    <section className="space-y-4">
      <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="p-5 md:p-6">
            <div className="flex min-w-0 items-start gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-[#123b7a] text-white">
                <Landmark size={24} />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase text-[#123b7a]">Administração</p>
                <h2 className="mt-1 text-2xl font-black leading-tight text-slate-950 md:text-3xl">Gestão institucional do clube</h2>
                <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
                  Visão executiva para acompanhar associados, caixa, governança, documentos e pendências sem espalhar a operação pela tela inteira.
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link to="/associados?edit=new" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#123b7a] px-4 text-sm font-black text-white">
                <Users size={16} />
                Novo associado
              </Link>
              <Link to="/financeiro?area=MENSALIDADES" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-black text-slate-700">
                <CircleDollarSign size={16} />
                Mensalidades
              </Link>
            </div>
          </div>
          <div className="border-t border-slate-200 bg-slate-50 p-5 lg:border-l lg:border-t-0">
            <p className="text-xs font-black uppercase text-slate-500">Resumo do mês</p>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-slate-500">Receitas</span>
                <strong className="text-lg font-black text-emerald-700">{data ? money(data.monthRevenueCents) : "—"}</strong>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-slate-500">Despesas</span>
                <strong className="text-lg font-black text-slate-900">{data ? money(data.monthExpenseCents) : "—"}</strong>
              </div>
              <div className="border-t border-slate-200 pt-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-black text-slate-700">Saldo operacional</span>
                  <strong className={`text-xl font-black ${balance >= 0 ? "text-emerald-700" : "text-amber-700"}`}>{data ? money(balance) : "—"}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </article>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetric label="Associados ativos" value={data?.associatesActive ?? "—"} helper="quadro associativo atual" icon={<Users size={20} />} tone="blue" />
        <AdminMetric label="Inadimplência" value={data ? `${delinquencyPercent}%` : "—"} helper={`${data?.lateAssociates ?? 0} associado(s) em atraso`} icon={<AlertTriangle size={20} />} tone={lateFees > 0 ? "red" : "green"} />
        <AdminMetric label="Em aberto" value={data ? money(openFees) : "—"} helper={`${pendingFees + lateFees} cobrança(s) para resolver`} icon={<CircleDollarSign size={20} />} tone={openFees > 0 ? "amber" : "green"} />
        <AdminMetric label="Próximo controle" value={alerts.length} helper="pendências administrativas no radar" icon={<ClipboardCheck size={20} />} tone="blue" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]">
        <article className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-slate-950">Fluxo financeiro mensal</h3>
              <p className="mt-1 text-sm font-semibold text-slate-500">Receitas, despesas e saldo dos ultimos meses.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{financialChartData.length} meses</span>
          </div>
          <div className="mt-4 h-72 min-w-0">
            {financialChartData.length ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={financialChartData} margin={{ top: 12, right: 12, bottom: 0, left: -18 }}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#52607a", fontSize: 12, fontWeight: 700 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#52607a", fontSize: 12, fontWeight: 700 }} />
                  <Tooltip formatter={(value, name) => [money(Number(value) * 100), String(name)]} contentStyle={{ borderRadius: 8, borderColor: "#e2e8f0" }} />
                  <Bar dataKey="receitas" name="Receitas" fill="#16a34a" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="despesas" name="Despesas" fill="#dc2626" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="saldo" name="Saldo" fill="#123b7a" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-sm font-semibold text-slate-500">Sem serie financeira ainda</div>
            )}
          </div>
        </article>

        <article className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h3 className="text-lg font-black text-slate-950">Base e risco</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">Associados, atletas aptos e pontos de atencao.</p>
          <div className="mt-4 h-56 min-w-0">
            {associationChartData.length ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Tooltip contentStyle={{ borderRadius: 8, borderColor: "#e2e8f0" }} />
                  <Pie data={associationChartData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={86} paddingAngle={3}>
                    {associationChartData.map((item) => (
                      <Cell key={item.name} fill={item.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-sm font-semibold text-slate-500">Sem dados da base</div>
            )}
          </div>
          <div className="mt-3 grid gap-2">
            {associationChartData.map((item) => (
              <div key={item.name} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
                <span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />{item.name}</span>
                <span className="text-slate-950">{item.value}</span>
              </div>
            ))}
          </div>
        </article>
      </div>

      <article className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-slate-950">Despesas por categoria</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">Onde o caixa do clube esta sendo consumido.</p>
          </div>
          <Link to="/financeiro?area=DESPESAS" className="text-sm font-black text-[#123b7a]">Abrir despesas</Link>
        </div>
        <div className="mt-4 h-64 min-w-0">
          {expenseChartData.length ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={expenseChartData} layout="vertical" margin={{ top: 12, right: 24, bottom: 0, left: 12 }}>
                <CartesianGrid stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#52607a", fontSize: 12, fontWeight: 700 }} />
                <YAxis type="category" dataKey="category" axisLine={false} tickLine={false} tick={{ fill: "#52607a", fontSize: 12, fontWeight: 700 }} width={104} />
                <Tooltip formatter={(value) => money(Number(value) * 100)} contentStyle={{ borderRadius: 8, borderColor: "#e2e8f0" }} />
                <Bar dataKey="total" name="Total" fill="#0f172a" radius={[0, 8, 8, 0]} barSize={26} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="grid h-full place-items-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-sm font-semibold text-slate-500">Sem despesas categorizadas</div>
          )}
        </div>
      </article>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {operations.map((item) => <AdminTile key={item.title} {...item} />)}
        </div>

        <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-slate-950">Prioridades</h3>
              <p className="mt-1 text-sm font-semibold leading-5 text-slate-500">Fila curta para fechar o administrativo.</p>
            </div>
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-700">
              <AlertTriangle size={20} />
            </span>
          </div>
          <div className="mt-4 divide-y divide-slate-100">
            {alerts.slice(0, 5).map((alert) => (
              <div key={`${alert.title}-${alert.subtitle}`} className="py-3">
                <p className="text-sm font-black text-slate-950">{alert.title}</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{alert.subtitle}</p>
              </div>
            ))}
          </div>
        </aside>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-slate-950">Movimentações recentes</h3>
              <p className="mt-1 text-sm font-semibold text-slate-500">Últimos lançamentos financeiros do período.</p>
            </div>
            <Link to="/financeiro" className="text-sm font-black text-[#123b7a]">Abrir financeiro</Link>
          </div>
          <div className="mt-3 divide-y divide-slate-100">
            {(data?.recentFinancialEntries ?? []).slice(0, 4).map((entry) => (
              <div key={entry.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-950">{entry.description}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{entry.category} · {entry.status}</p>
                </div>
                <strong className={entry.type === "INCOME" ? "text-sm font-black text-emerald-700" : "text-sm font-black text-slate-900"}>
                  {entry.type === "INCOME" ? "+" : "-"}{money(entry.amountCents)}
                </strong>
              </div>
            ))}
            {!data?.recentFinancialEntries?.length ? <p className="py-5 text-sm font-semibold text-slate-500">Sem lançamentos recentes para exibir.</p> : null}
          </div>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-black text-slate-950">Ações rápidas</h3>
          <div className="mt-3 space-y-2">
            {quickActions.map(([label, path]) => (
              <Link key={label} to={path} className="flex min-h-10 items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 text-sm font-black text-slate-700 hover:border-[#123b7a]/40 hover:text-[#123b7a]">
                <span>{label}</span>
                <ArrowRight size={16} />
              </Link>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}

export function SportsDirectorDashboardPage() {
  const query = useQuery({ queryKey: ["sports-director-dashboard"], queryFn: () => apiRequest<SportsDirectorSummary>("/dashboard/sports-summary") });
  const data = query.data;
  const next = data?.nextMatch;
  const presenceChartData = (data?.presenceRanking ?? []).slice(0, 6).map((athlete) => ({
    name: shortChartLabel(athlete.name, 12),
    presenca: athlete.presencePercent,
    confirmados: athlete.confirmedCount
  }));
  const confirmationChartData = next ? [
    { name: "Confirmados", value: next.confirmedCount, color: "#16a34a" },
    { name: "Pendentes", value: next.pendingCount, color: "#f59e0b" }
  ].filter((item) => item.value > 0) : [];
  const agendaChartData = (data?.upcomingMatches ?? []).slice(0, 6).map((match) => ({
    date: new Date(match.startsAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    confirmados: match.confirmedCount,
    custo: Math.round(match.costCents / 100)
  }));
  const readinessChartData = [
    { name: "Aptos", value: data?.athletesReady ?? 0, color: "#16a34a" },
    { name: "Pendentes", value: Math.max((data?.athletesTotal ?? 0) - (data?.athletesReady ?? 0), 0), color: "#ef4444" }
  ].filter((item) => item.value > 0);

  return (
    <section className="space-y-5">
      <div>
        <p className="text-xs font-black uppercase text-emerald-700">Direção de esportes</p>
        <h2 className="mt-1 text-2xl font-black text-slate-950">Central esportiva</h2>
        <p className="mt-1 text-sm font-semibold text-slate-500">Jogos, elenco, confirmações, escalações e organização visual no Campo e Times.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Próximos jogos" value={data?.upcomingMatches.length ?? "—"} helper="partidas agendadas" icon={<CalendarDays size={20} />} />
        <Stat label="Atletas disponíveis" value={data ? `${data.athletesReady}/${data.athletesTotal}` : "—"} helper="elenco apto" icon={<Shirt size={20} />} />
        <Stat label="Confirmados" value={next?.confirmedCount ?? "—"} helper="no próximo jogo" icon={<ClipboardCheck size={20} />} />
        <Stat label="Pendentes" value={next?.pendingCount ?? "—"} helper="aguardando resposta" icon={<Users size={20} />} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <article className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-slate-950">Presenca do elenco</h3>
              <p className="mt-1 text-sm font-semibold text-slate-500">Atletas com maior presenca nos jogos recentes.</p>
            </div>
            <Link to="/estatisticas" className="text-sm font-black text-emerald-700">Abrir estatisticas</Link>
          </div>
          <div className="mt-4 h-72 min-w-0">
            {presenceChartData.length ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={presenceChartData} margin={{ top: 12, right: 12, bottom: 0, left: -18 }}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#52607a", fontSize: 12, fontWeight: 700 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#52607a", fontSize: 12, fontWeight: 700 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, borderColor: "#e2e8f0" }} />
                  <Bar dataKey="presenca" name="Presenca %" fill="#16a34a" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="confirmados" name="Confirmados" fill="#123b7a" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-sm font-semibold text-slate-500">Sem presencas registradas</div>
            )}
          </div>
        </article>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
          <article className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-lg font-black text-slate-950">Proximo jogo</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">Confirmacoes e pendencias da convocacao.</p>
            <div className="mt-4 h-48 min-w-0">
              {confirmationChartData.length ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <PieChart>
                    <Tooltip contentStyle={{ borderRadius: 8, borderColor: "#e2e8f0" }} />
                    <Pie data={confirmationChartData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={4}>
                      {confirmationChartData.map((item) => (
                        <Cell key={item.name} fill={item.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="grid h-full place-items-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-sm font-semibold text-slate-500">Sem jogo selecionado</div>
              )}
            </div>
          </article>

          <article className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-lg font-black text-slate-950">Elenco apto</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">Disponibilidade geral para escalar.</p>
            <div className="mt-4 grid gap-3">
              {readinessChartData.map((item) => (
                <div key={item.name}>
                  <div className="mb-1 flex items-center justify-between text-sm font-black text-slate-700">
                    <span>{item.name}</span>
                    <span>{item.value}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full" style={{ width: `${data?.athletesTotal ? Math.min(100, Math.round((item.value / data.athletesTotal) * 100)) : 0}%`, backgroundColor: item.color }} />
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>
      </div>

      <article className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-slate-950">Agenda e custo dos proximos jogos</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">Confirmados por partida e custo previsto em campo.</p>
          </div>
          <Link to="/jogos?view=OPERACAO&subView=AGENDA" className="text-sm font-black text-emerald-700">Ver agenda</Link>
        </div>
        <div className="mt-4 h-64 min-w-0">
          {agendaChartData.length ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <LineChart data={agendaChartData} margin={{ top: 12, right: 12, bottom: 0, left: -18 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#52607a", fontSize: 12, fontWeight: 700 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#52607a", fontSize: 12, fontWeight: 700 }} />
                <Tooltip contentStyle={{ borderRadius: 8, borderColor: "#e2e8f0" }} />
                <Line type="monotone" dataKey="confirmados" name="Confirmados" stroke="#16a34a" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} />
                <Line type="monotone" dataKey="custo" name="Custo R$" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="grid h-full place-items-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-sm font-semibold text-slate-500">Sem jogos futuros</div>
          )}
        </div>
      </article>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Action to="/jogos/campo-times" title="Campo e Times" description="Monte titulares, reservas, posições e formação no campo." icon={<MapPinned size={22} />} primary />
        <Action to="/jogos?view=OPERACAO&subView=CADASTRO" title="Marcar jogo" description="Cadastre data, adversário, local e custos." icon={<CalendarDays size={20} />} />
        <Action to="/jogos?view=OPERACAO&subView=CONFIRMACOES" title="Convocações" description="Acompanhe respostas e disponibilidade do elenco." icon={<UserCheck size={20} />} />
        <Action to="/jogos?view=OPERACAO&subView=ESCALACAO" title="Escalação" description="Organize titulares, banco e numeração." icon={<Shirt size={20} />} />
        <Action to="/atletas" title="Elenco" description="Atletas, posições, condição física e avaliações." icon={<Users size={20} />} />
        <Action to="/competicoes" title="Competições" description="Campeonatos, participantes e classificação." icon={<Trophy size={20} />} />
        <Action to="/campos" title="Campos" description="Locais, estrutura, disponibilidade e custos." icon={<MapPinned size={20} />} />
      </div>

      <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-black uppercase text-slate-500">Próximo compromisso</p>
        {next ? (
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-xl font-black text-slate-950">{next.opponent}</h3>
              <p className="text-sm font-semibold text-slate-500">{new Date(next.startsAt).toLocaleString("pt-BR")} · {next.location}</p>
            </div>
            <Link to="/jogos/campo-times" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-black text-white">Abrir Campo e Times</Link>
          </div>
        ) : <p className="mt-2 text-sm font-semibold text-slate-500">Nenhum jogo agendado. Use “Marcar jogo” para criar o próximo compromisso.</p>}
      </article>
    </section>
  );
}

export function AssociateDashboardPage() {
  const query = useQuery({ queryKey: ["associate-self-summary"], queryFn: () => apiRequest<AssociateSelfSummary>("/associates/me/summary") });
  const data = query.data;
  const latestPayment = data?.payments[0];
  const paymentChartData = (data?.payments ?? []).slice(0, 8).reverse().map((payment) => ({
    label: `${String(payment.month).padStart(2, "0")}/${String(payment.year).slice(-2)}`,
    pago: payment.status === "PAID" ? Math.round(payment.amountCents / 100) : 0,
    aberto: payment.status !== "PAID" ? Math.round(payment.amountCents / 100) : 0
  }));
  const paymentStatusChart = [
    { name: "Pago", value: data?.totals.paidCents ?? 0, color: "#16a34a" },
    { name: "Em aberto", value: data?.totals.pendingCents ?? 0, color: "#ef4444" }
  ].filter((item) => item.value > 0);

  return (
    <section className="space-y-5">
      <div>
        <p className="text-xs font-black uppercase text-[#123b7a]">Área do associado</p>
        <h2 className="mt-1 text-2xl font-black text-slate-950">Minha associação</h2>
        <p className="mt-1 text-sm font-semibold text-slate-500">Situação cadastral, mensalidades, comunicados e memória do clube.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Situação" value={data?.associate.status === "ACTIVE" ? "Ativo" : data?.associate.status === "LATE" ? "Pendente" : "—"} helper="vínculo associativo" icon={<UserCheck size={20} />} />
        <Stat label="Mensalidade" value={data ? money(data.associate.monthlyFeeCents) : "—"} helper="valor atual" icon={<CircleDollarSign size={20} />} />
        <Stat label="Em aberto" value={data ? money(data.totals.pendingCents) : "—"} helper={`${data?.totals.lateCount ?? 0} vencimento(s)`} icon={<Landmark size={20} />} />
        <Stat label="Última competência" value={latestPayment ? `${String(latestPayment.month).padStart(2, "0")}/${latestPayment.year}` : "—"} helper={latestPayment?.status ?? "sem lançamento"} icon={<FileText size={20} />} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <article className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-slate-950">Histórico financeiro</h3>
              <p className="mt-1 text-sm font-semibold text-slate-500">Mensalidades pagas e abertas nas últimas competências.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{paymentChartData.length} lançamentos</span>
          </div>
          <div className="mt-4 h-72 min-w-0">
            {paymentChartData.length ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={paymentChartData} margin={{ top: 12, right: 12, bottom: 0, left: -18 }}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#52607a", fontSize: 12, fontWeight: 700 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#52607a", fontSize: 12, fontWeight: 700 }} />
                  <Tooltip formatter={(value) => money(Number(value) * 100)} contentStyle={{ borderRadius: 8, borderColor: "#e2e8f0" }} />
                  <Bar dataKey="pago" name="Pago" fill="#16a34a" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="aberto" name="Em aberto" fill="#ef4444" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-sm font-semibold text-slate-500">Sem histórico financeiro</div>
            )}
          </div>
        </article>

        <article className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h3 className="text-lg font-black text-slate-950">Resumo anual</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">Distribuição entre pago e aberto.</p>
          <div className="mt-4 h-52 min-w-0">
            {paymentStatusChart.length ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Tooltip formatter={(value) => money(Number(value))} contentStyle={{ borderRadius: 8, borderColor: "#e2e8f0" }} />
                  <Pie data={paymentStatusChart} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={4}>
                    {paymentStatusChart.map((item) => <Cell key={item.name} fill={item.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-sm font-semibold text-slate-500">Sem valores no ano</div>
            )}
          </div>
          <div className="mt-3 grid gap-2">
            {paymentStatusChart.map((item) => (
              <div key={item.name} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
                <span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />{item.name}</span>
                <span className="text-slate-950">{money(item.value)}</span>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Action to="/acervo" title="Acervo do clube" description="História, títulos, fotos, documentos e patrimônio." icon={<Archive size={20} />} primary />
        <Action to="/acervo/linha-do-tempo" title="Linha do tempo" description="Acompanhe os principais marcos da associação." icon={<CalendarDays size={20} />} />
        <Action to="/acervo/titulos" title="Títulos e memória" description="Conquistas e registros históricos do clube." icon={<Trophy size={20} />} />
      </div>
      {query.isError ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">Vincule este usuário a um associado para exibir os dados financeiros pessoais.</p> : null}
    </section>
  );
}
