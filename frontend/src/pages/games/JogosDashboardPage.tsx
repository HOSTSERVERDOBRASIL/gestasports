import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  CalendarDays, CheckCircle2, Clock, Plus, Shield, TrendingUp, Trophy, Users
} from "lucide-react";
import { apiRequest } from "../../services/api";
import { KpiCard } from "../../components/ui/KpiCard";
import { PageHeader } from "../../components/ui/PageHeader";
import { SectionCard } from "../../components/ui/SectionCard";
import type { DashboardSummary, Game, GameStatus } from "../../types/domain";
import { formatDate, formatDateTime } from "./gameLogic";

type OutletPeriod = { month: number; year: number };

const gameStatusLabel: Record<GameStatus, string> = {
  SCHEDULED: "Agendado",
  RUNNING: "Em andamento",
  PAUSED: "Pausado",
  FINISHED: "Finalizado",
  CANCELED: "Cancelado"
};

const gameStatusVariant: Record<GameStatus, string> = {
  SCHEDULED: "bg-blue-50 text-blue-700 border-blue-200",
  RUNNING: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PAUSED: "bg-amber-50 text-amber-700 border-amber-200",
  FINISHED: "bg-slate-100 text-slate-600 border-slate-200",
  CANCELED: "bg-red-50 text-red-600 border-red-200"
};

function getInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

export function JogosDashboardPage() {
  const { month, year } = useOutletContext<OutletPeriod>();

  const summaryQuery = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => apiRequest<DashboardSummary>("/dashboard/summary")
  });

  const gamesQuery = useQuery({
    queryKey: ["sports-games", month, year, false, "ALL"],
    queryFn: () => apiRequest<Game[]>(`/sports/games?month=${month}&year=${year}`)
  });

  const summary = summaryQuery.data;
  const games = gamesQuery.data ?? [];
  const nextGame = summary?.nextMatch ?? null;

  const scheduled = games.filter((g) => g.status === "SCHEDULED").length;
  const finished = games.filter((g) => g.status === "FINISHED").length;
  const running = games.filter((g) => g.status === "RUNNING").length;
  const upcoming = games
    .filter((g) => g.status === "SCHEDULED")
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Futebol"
        title="Dashboard de Jogos"
        subtitle={`${games.length} jogos em ${new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1))}`}
        action={
          <Link
            to="/jogos/novo"
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-black text-white hover:bg-red-700"
          >
            <Plus size={16} /> Cadastrar jogo
          </Link>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          label="Total do mês"
          value={games.length}
          icon={CalendarDays}
          iconClass="bg-blue-50 text-blue-600"
          href="/jogos/lista"
        />
        <KpiCard
          label="Agendados"
          value={scheduled}
          icon={Clock}
          iconClass="bg-amber-50 text-amber-600"
          href="/jogos/lista?status=SCHEDULED"
        />
        <KpiCard
          label="Finalizados"
          value={finished}
          icon={CheckCircle2}
          iconClass="bg-emerald-50 text-emerald-600"
          href="/jogos/lista?status=FINISHED"
        />
        <KpiCard
          label="Em andamento"
          value={running}
          icon={TrendingUp}
          iconClass="bg-red-50 text-red-600"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Próximo jogo */}
        <div className="lg:col-span-2">
          <SectionCard
            title="Próximo jogo"
            action={
              <Link to="/jogos/lista" className="text-xs font-black text-slate-500 hover:text-slate-700">
                Ver todos →
              </Link>
            }
          >
            {!nextGame ? (
              <div className="rounded-lg bg-slate-50 p-6 text-center">
                <CalendarDays size={32} className="mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-semibold text-slate-500">Nenhum jogo agendado</p>
                <Link to="/jogos/novo" className="mt-2 inline-block text-xs font-black text-red-600 hover:underline">
                  Cadastrar jogo →
                </Link>
              </div>
            ) : (
              <Link to={`/jogos/${nextGame.id}`} className="block rounded-lg border border-slate-100 p-4 hover:border-slate-200 hover:bg-slate-50">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-slate-500">Próximo jogo</p>
                    <p className="mt-1 text-lg font-black text-slate-950">{nextGame.opponent}</p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold text-slate-500">
                      <span className="flex items-center gap-1"><CalendarDays size={12} />{formatDateTime(nextGame.startsAt)}</span>
                      <span className="flex items-center gap-1"><Shield size={12} />{nextGame.location}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-emerald-600">{nextGame.confirmedCount} confirmados</p>
                    <p className="text-xs font-semibold text-amber-600">{nextGame.pendingCount} pendentes</p>
                  </div>
                </div>
                {nextGame.confirmed.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {nextGame.confirmed.slice(0, 12).map((p) => (
                      <div
                        key={p.id}
                        title={p.name}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-xs font-black text-emerald-700"
                      >
                        {getInitials(p.name)}
                      </div>
                    ))}
                    {nextGame.confirmed.length > 12 && (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-500">
                        +{nextGame.confirmed.length - 12}
                      </div>
                    )}
                  </div>
                )}
              </Link>
            )}

            {/* Próximos jogos */}
            {upcoming.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">Próximos agendados</p>
                {upcoming.map((g) => (
                  <Link
                    key={g.id}
                    to={`/jogos/${g.id}`}
                    className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 hover:bg-slate-50"
                  >
                    <div>
                      <p className="text-sm font-black text-slate-800">
                        {g.awayClub?.name ?? g.homeClub?.name ?? "Jogo interno"}
                      </p>
                      <p className="text-xs font-semibold text-slate-500">{formatDate(g.date)} · {g.location}</p>
                    </div>
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-black ${gameStatusVariant[g.status]}`}>
                      {gameStatusLabel[g.status]}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Ranking de presença */}
        <div>
          <SectionCard
            title="Ranking de presença"
            subtitle="Mês atual"
            action={
              <Link to="/participacoes" className="text-xs font-black text-slate-500 hover:text-slate-700">
                Ver completo →
              </Link>
            }
          >
            {!summary?.presenceRanking || summary.presenceRanking.length === 0 ? (
              <p className="text-sm font-semibold text-slate-400">Nenhum dado ainda</p>
            ) : (
              <div className="space-y-2">
                {summary.presenceRanking.slice(0, 8).map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <span className="w-4 text-center text-xs font-black text-slate-400">{i + 1}</span>
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-600">
                      {getInitials(p.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-black text-slate-800">{p.name}</p>
                      <div className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${p.presencePercent}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs font-black text-slate-600">{p.presencePercent}%</span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>

      {/* Atalhos */}
      <SectionCard title="Ações rápidas">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Cadastrar jogo", href: "/jogos/novo", icon: Plus, color: "bg-red-50 text-red-600" },
            { label: "Lista de jogos", href: "/jogos/lista", icon: CalendarDays, color: "bg-blue-50 text-blue-600" },
            { label: "Campo e Times", href: "/jogos/campo-times", icon: Users, color: "bg-emerald-50 text-emerald-600" },
            { label: "Confirmações", href: "/convocacoes", icon: Trophy, color: "bg-amber-50 text-amber-600" },
          ].map(({ label, href, icon: Icon, color }) => (
            <Link
              key={href}
              to={href}
              className="flex flex-col items-center gap-2 rounded-lg border border-slate-200 p-3 text-center hover:border-slate-300 hover:bg-slate-50"
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${color}`}>
                <Icon size={18} />
              </div>
              <span className="text-xs font-black text-slate-700">{label}</span>
            </Link>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
