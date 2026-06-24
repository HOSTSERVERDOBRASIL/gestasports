import { useMutation, useQuery, useQueryClient } from"@tanstack/react-query";
import { useLocation, useNavigate, useOutletContext } from"react-router-dom";
import { AlertTriangle, Ban, CalendarDays, CircleEqual, Eye, MapPin, Save, Search, ShieldCheck, Shirt, Target, Trophy, X } from"lucide-react";
import { useEffect, useState } from"react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from"recharts";
import { apiRequest } from"../services/api";
import type { AthleteProfile, CompetitionRankingSummary, ConfrontationSummary, DisciplineSummary, Game } from"../types/domain";
import { FullPitchBoard } from "../components/ui/FullPitchBoard";
import type { PitchPlayer } from "../components/ui/FullPitchBoard";

type OutletPeriod = {
  month: number;
  year: number;
};

type Suspension = {
  id: string;
  reason: string;
  startsAt: string;
  matchesToServe: number;
  athlete: {
    id: string;
    name: string;
    status: string;
  };
};

type EventType = "GOAL" |"ASSIST" |"YELLOW_CARD" |"RED_CARD";

const monthLabels = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
type StatsPeriodMode = "MONTH" | "YEAR";

function statsPeriodQuery(mode: StatsPeriodMode, month: number, year: number) {
  const params = new URLSearchParams({ year: String(year) });
  if (mode === "MONTH") {
    params.set("month", String(month));
  }
  return `?${params.toString()}`;
}

function statsPeriodLabel(mode: StatsPeriodMode, month: number, year: number) {
  return mode === "MONTH" ? `${monthLabels[month - 1]} de ${year}` : `Ano ${year}`;
}

function StatsPeriodToggle({
  mode,
  month,
  year,
  onChange
}: {
  mode: StatsPeriodMode;
  month: number;
  year: number;
  onChange: (mode: StatsPeriodMode) => void;
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Período da estatística</p>
          <h2 className="truncate text-lg font-black text-slate-950">{statsPeriodLabel(mode, month, year)}</h2>
        </div>
        <div className="inline-flex w-full rounded-lg border border-slate-200 bg-white p-1 shadow-sm sm:w-auto">
          {[
            { key: "YEAR" as const, label: `Ano ${year}` },
            { key: "MONTH" as const, label: monthLabels[month - 1] }
          ].map((option) => (
            <button
              key={option.key}
              type="button"
              className={`h-9 flex-1 rounded-md px-3 text-xs font-black sm:flex-none ${mode === option.key ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-50"}`}
              onClick={() => onChange(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </article>
  );
}


function yearOptions(currentYear: number) {
  const start = Math.max(1990, currentYear - 40);
  return Array.from({ length: currentYear - start + 3 }, (_, index) => currentYear + 1 - index);
}
const sideLabels: Record<string, string> = {
  RED:"Time A",
  WHITE:"Time B",
  EXTERNAL:"Adversário"
};

const eventLabels: Record<EventType, string> = {
  GOAL:"Gol",
  ASSIST:"Assistência",
  YELLOW_CARD:"Cartão amarelo",
  RED_CARD:"Cartão vermelho"
};

function EmptyState({ message }: { message: string }) {
  return <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">{message}</div>;
}

function LoadingState({ message }: { message: string }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-6 text-slate-500 shadow-sm">{message}</div>;
}

function ErrorState({ message }: { message: string }) {
  return <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">{message}</div>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day:"2-digit", month:"2-digit", year:"numeric" }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day:"2-digit", month:"2-digit", year:"numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function lineupsToPitchPlayers(game: Game, side: "RED" | "WHITE") {
  const starters = (game.lineups ?? [])
    .filter((lineup) => lineup.side === side && (lineup.role === "STARTER" || lineup.role === "GOALKEEPER") && lineup.athlete?.id)
    .sort((a, b) => (a.tacticalSlot ?? 999) - (b.tacticalSlot ?? 999) || (a.jerseyNumber ?? 999) - (b.jerseyNumber ?? 999));
  const players: Array<PitchPlayer | null> = Array.from({ length: 11 }, () => null);
  const unslotted = [];

  for (const lineup of starters) {
    const slot = lineup.role === "GOALKEEPER" ? 0 : lineup.tacticalSlot ? lineup.tacticalSlot - 1 : -1;
    const player = { id: lineup.athlete.id, name: lineup.athlete.name, number: lineup.jerseyNumber, position: lineup.athlete.position };
    if (slot >= 0 && slot < players.length && !players[slot]) {
      players[slot] = player;
    } else {
      unslotted.push(player);
    }
  }

  for (const player of unslotted) {
    const index = players.findIndex((item) => item === null);
    if (index === -1) break;
    players[index] = player;
  }

  return players;
}

function benchPlayers(game: Game, side: "RED" | "WHITE") {
  return (game.lineups ?? [])
    .filter((lineup) => lineup.side === side && lineup.role === "RESERVE" && lineup.athlete?.id)
    .map((lineup) => ({ id: lineup.athlete.id, name: lineup.athlete.name, number: lineup.jerseyNumber, position: lineup.athlete.position }));
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function shortChartLabel(name: string, maxLength = 12) {
  const trimmed = name.trim();
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength - 1)}.` : trimmed;
}

function EventLaunchForm({
  mode,
  year,
  month,
  onClose
}: {
  mode:"scoring" |"discipline";
  year: number;
  month: number;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [launchMonth, setLaunchMonth] = useState(month);
  const [launchYear, setLaunchYear] = useState(year);
  const [form, setForm] = useState({
    gameId:"",
    athleteId:"",
    type: (mode === "scoring" ? "GOAL" : "YELLOW_CARD") as EventType,
    minute:"",
    side:"RED",
    note:"",
    reason:"",
    referee:""
  });

  const gamesQuery = useQuery({
    queryKey: ["sports-games", launchYear, "event-launch"],
    queryFn: () => apiRequest<Game[]>(`/sports/games?year=${launchYear}`)
  });

  const athletesQuery = useQuery({
    queryKey: ["athletes", launchMonth, launchYear, "event-launch"],
    queryFn: () => apiRequest<AthleteProfile[]>(`/athletes?month=${launchMonth}&year=${launchYear}`)
  });

  const registerMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/sports/games/${form.gameId}/events`, {
        method:"POST",
        body: JSON.stringify({
          events: [
            {
              athleteId: form.athleteId,
              type: form.type,
              ...(form.minute ? { minute: Number(form.minute) } : {}),
              ...(form.side ? { side: form.side } : {}),
              ...(form.note ? { note: form.note } : {}),
              ...(form.reason ? { reason: form.reason } : {}),
              ...(form.referee ? { referee: form.referee } : {})
            }
          ]
        })
      }),
    onSuccess: () => {
      setForm((prev) => ({ ...prev, athleteId:"", minute:"", note:"", reason:"", referee:"" }));
      void queryClient.invalidateQueries({ queryKey: ["sports-scorers"] });
      void queryClient.invalidateQueries({ queryKey: ["sports-competition"] });
      void queryClient.invalidateQueries({ queryKey: ["sports-discipline"] });
      void queryClient.invalidateQueries({ queryKey: ["sports-active-suspensions"] });
      void queryClient.invalidateQueries({ queryKey: ["sports-games"] });
    }
  });

  const games = gamesQuery.data ?? [];
  const athletes = athletesQuery.data ?? [];
  const eventOptions: EventType[] = mode ==="scoring" ? ["GOAL", "ASSIST"] : ["YELLOW_CARD", "RED_CARD"];

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await registerMutation.mutateAsync();
  }

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-950">{mode === "scoring" ? "Lançar artilharia" : "Lançar disciplina"}</h3>
          <p className="text-sm text-slate-500">As camisas seguem o que estiver salvo em Configurações.</p>
        </div>
        <button type="button" className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50" onClick={onClose} aria-label="Fechar formulário">
          <X size={18} />
        </button>
      </div>

      <form className="grid gap-3 md:grid-cols-2" onSubmit={(event) => void handleSubmit(event)}>
        <label className="text-sm font-medium text-slate-600">
          Mês do lançamento
          <select className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" value={launchMonth} onChange={(event) => {
            setLaunchMonth(Number(event.target.value));
            setForm((prev) => ({ ...prev, athleteId: "" }));
          }}>
            {monthLabels.map((label, index) => (
              <option key={label} value={index + 1}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium text-slate-600">
          Ano do lançamento
          <select className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" value={launchYear} onChange={(event) => {
            setLaunchYear(Number(event.target.value));
            setForm((prev) => ({ ...prev, gameId: "", athleteId: "" }));
          }}>
            {yearOptions(year).map((optionYear) => (
              <option key={optionYear} value={optionYear}>
                {optionYear}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium text-slate-600">
          Jogo
          <select className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" value={form.gameId} onChange={(event) => setForm((prev) => ({ ...prev, gameId: event.target.value }))} required>
            <option value="">Selecione</option>
            {games.map((game) => (
              <option key={game.id} value={game.id}>
                {formatDate(game.date)} - {game.location}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium text-slate-600">
          Atleta
          <select className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" value={form.athleteId} onChange={(event) => setForm((prev) => ({ ...prev, athleteId: event.target.value }))} required>
            <option value="">Selecione</option>
            {athletes.map((athlete) => (
              <option key={athlete.id} value={athlete.id}>
                {athlete.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium text-slate-600">
          Tipo
          <select className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" value={form.type} onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value as EventType }))}>
            {eventOptions.map((type) => (
              <option key={type} value={type}>
                {eventLabels[type]}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium text-slate-600">
          Minuto
          <input type="number" min={0} max={130} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" value={form.minute} onChange={(event) => setForm((prev) => ({ ...prev, minute: event.target.value }))} placeholder="Opcional" />
        </label>

        <label className="text-sm font-medium text-slate-600">
          Uniforme/time
          <select className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" value={form.side} onChange={(event) => setForm((prev) => ({ ...prev, side: event.target.value }))}>
            <option value="RED">Time A</option>
            <option value="WHITE">Time B</option>
            <option value="EXTERNAL">Adversário</option>
          </select>
        </label>

        {mode ==="discipline" ? (
          <label className="text-sm font-medium text-slate-600">
            Motivo
            <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" value={form.reason} onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))} placeholder="Opcional" />
          </label>
        ) : null}

        {mode ==="discipline" ? (
          <label className="text-sm font-medium text-slate-600">
            Árbitro
            <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" value={form.referee} onChange={(event) => setForm((prev) => ({ ...prev, referee: event.target.value }))} placeholder="Opcional" />
          </label>
        ) : null}

        <label className={mode === "scoring" ? "text-sm font-medium text-slate-600 md:col-span-2" : "text-sm font-medium text-slate-600"}>
          Observação
          <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" value={form.note} onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))} placeholder="Opcional" />
        </label>

        <button type="submit" disabled={registerMutation.isPending || !form.gameId || !form.athleteId} className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 font-semibold text-white hover:bg-red-700 disabled:opacity-50 md:col-span-2">
          <Save size={18} />
          {registerMutation.isPending ? "Salvando..." : "Salvar lançamento"}
        </button>
      </form>
    </article>
  );
}

export function ArtilhariaPageReal() {
  const { month, year } = useOutletContext<OutletPeriod>();
  const location = useLocation();
  const navigate = useNavigate();
  const [showLaunchForm, setShowLaunchForm] = useState(false);
  const [periodMode, setPeriodMode] = useState<StatsPeriodMode>("MONTH");
  const periodQuery = statsPeriodQuery(periodMode, month, year);
  const competitionQuery = useQuery({
    queryKey: ["sports-competition", year, month, periodMode],
    queryFn: () => apiRequest<CompetitionRankingSummary>(`/sports/stats/competition${periodQuery}`)
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("launch") === "1") {
      setShowLaunchForm(true);
      params.delete("launch");
      navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
    }
  }, [location.pathname, location.search, navigate]);

  if (competitionQuery.isLoading) {
    return <LoadingState message="Carregando artilharia..." />;
  }

  if (competitionQuery.isError || !competitionQuery.data) {
    return <ErrorState message="Falha ao carregar artilharia." />;
  }

  const data = competitionQuery.data;
  const scorers = data.scorers;
  const topScorers = scorers.slice(0, 8);
  const podium = scorers.slice(0, 3);
  const rankingList = scorers.slice(0, 10);
  const leader = scorers[0] ?? null;
  const maxGoals = Math.max(leader?.goals ?? 0, 1);
  const winsLeader = data.wins[0] ?? null;
  const contributionLeader = data.contributions[0] ?? null;
  const periodLabel = statsPeriodLabel(periodMode, month, year);

  return (
    <section className="min-w-0 space-y-4">

      {showLaunchForm ? <EventLaunchForm mode="scoring" month={month} year={year} onClose={() => setShowLaunchForm(false)} /> : null}
      <StatsPeriodToggle mode={periodMode} month={month} year={year} onChange={setPeriodMode} />

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,16rem),1fr))]">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <Trophy size={18} />
            {periodMode === "MONTH" ? "Artilheiro do mês" : "Artilheiro do ano"}
          </p>
          <h2 className="mt-2 truncate text-2xl font-bold text-slate-950">{leader?.name ?? "-"}</h2>
          <p className="mt-1 text-sm text-slate-500">{leader ? `${leader.goals} gols em ${leader.games} jogos` :"Sem eventos registrados"}</p>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <Trophy size={18} />
            Mais vitórias
          </p>
          <h2 className="mt-2 truncate text-2xl font-bold text-slate-950">{winsLeader?.name ?? "-"}</h2>
          <p className="mt-1 text-sm text-slate-500">{winsLeader ? `${winsLeader.wins} vitórias (${winsLeader.winRate}%)` : "Sem jogos com resultado"}</p>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <Target size={18} />
            Participações em gol
          </p>
          <h2 className="mt-2 truncate text-2xl font-bold text-slate-950">{contributionLeader?.name ?? "-"}</h2>
          <p className="mt-1 text-sm text-slate-500">{contributionLeader ? `${contributionLeader.total} participações (${contributionLeader.goals}G + ${contributionLeader.assists}A)` : "Sem participações"}</p>
        </article>
      </div>

      <article className="min-w-0 overflow-hidden rounded-lg border border-slate-900 bg-slate-950 p-4 text-white shadow-[0_18px_40px_rgba(15,23,42,0.28)] sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <Trophy size={20} className="text-amber-300" />
            Pódio da artilharia
          </h2>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.08em] text-slate-200">{periodLabel}</span>
        </div>
        {podium.length > 0 ? (
          <div className="mt-5 grid items-end gap-3 md:grid-cols-3">
            {podium.map((scorer, index) => {
              const rank = index + 1;
              const rankClass = rank === 1 ? "border-amber-300/80 bg-amber-300 text-slate-950 md:order-2 md:min-h-56" : rank === 2 ? "border-slate-300/60 bg-white/12 text-white md:order-1 md:min-h-48" : "border-orange-300/60 bg-orange-400/18 text-white md:order-3 md:min-h-44";
              return (
                <div key={`podium-${scorer.athleteId}`} className={`flex flex-col justify-between rounded-lg border p-4 ${rankClass}`}>
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid size-11 place-items-center rounded-full bg-slate-950 text-sm font-black text-white">#{rank}</span>
                    <span className="text-right text-xs font-black uppercase tracking-[0.08em] opacity-80">{scorer.games} jogos</span>
                  </div>
                  <div className="mt-5">
                    <span className="grid size-14 place-items-center rounded-full bg-white/90 text-lg font-black text-slate-950 ring-4 ring-white/20">{initials(scorer.name)}</span>
                    <p className="mt-3 truncate text-xl font-black">{scorer.name}</p>
                    <p className="mt-2 text-4xl font-black leading-none">{scorer.goals}</p>
                    <p className="mt-1 text-sm font-bold opacity-80">gols | {scorer.assists} assist. | média {scorer.goalAverage.toFixed(2)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">Sem dados para formar pódio neste período.</p>
        )}
      </article>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(min(100%,20rem),0.9fr)]">
        <article className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-xl font-bold text-slate-950">Ranking de gols</h2>
            <span className="text-sm font-semibold capitalize text-slate-500">{periodLabel}</span>
          </div>
          <div className="mt-4 h-80 min-w-0">
            {topScorers.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={topScorers} margin={{ top: 12, right: 12, bottom: 0, left: -18 }}>
                  <CartesianGrid stroke="#eef1f6" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill:"#52607a", fontSize: 12 }} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill:"#52607a", fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, borderColor:"#e2e8f0" }} />
                  <Bar dataKey="goals" name="Gols" radius={[8, 8, 0, 0]} fill="#ef3340" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="Nenhum gol registrado neste período." />
            )}
          </div>
        </article>

        <article className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-xl font-bold text-slate-950">Ranking completo</h2>
            <span className="text-sm font-semibold text-slate-500">Top {rankingList.length || 0}</span>
          </div>
          <div className="mt-4 space-y-2">
            {rankingList.map((scorer, index) => {
              const progress = Math.max(6, Math.round((scorer.goals / maxGoals) * 100));
              const isLeader = index === 0;
              return (
                <div key={scorer.athleteId} className={`rounded-lg border p-3 ${isLeader ? "border-red-200 bg-red-50/80" : "border-slate-200 bg-white"}`}>
                  <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
                    <span className={`grid size-9 place-items-center rounded-full text-xs font-black ${isLeader ? "bg-red-600 text-white" : "bg-slate-100 text-slate-700"}`}>#{index + 1}</span>
                    <div className="min-w-0">
                      <p className="truncate font-black text-slate-950">{scorer.name}</p>
                      <p className="text-xs font-semibold text-slate-500">{scorer.assists} assist. | {scorer.games} jogos | média {scorer.goalAverage.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black leading-none text-slate-950">{scorer.goals}</p>
                      <p className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-400">gols</p>
                    </div>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${isLeader ? "bg-red-600" : "bg-slate-400"}`} style={{ width: `${progress}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          {scorers.length === 0 ? <p className="mt-3 text-sm text-slate-500">Sem atletas no ranking.</p> : null}
        </article>
      </div>

      <article className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="flex items-center gap-2 text-xl font-bold text-slate-950">
          <CircleEqual size={20} className="text-emerald-600" />
          Ranking de vitórias
        </h2>
        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-[720px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-3">Atleta</th>
                <th className="px-3 py-3 text-right">Jogos</th>
                <th className="px-3 py-3 text-right">Vitórias</th>
                <th className="px-3 py-3 text-right">Empates</th>
                <th className="px-3 py-3 text-right">Derrotas</th>
                <th className="px-3 py-3 text-right">Aproveitamento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.wins.map((item) => (
                <tr key={item.athleteId}>
                  <td className="px-3 py-3 font-semibold text-slate-900">{item.name}</td>
                  <td className="px-3 py-3 text-right text-slate-700">{item.games}</td>
                  <td className="px-3 py-3 text-right font-semibold text-emerald-700">{item.wins}</td>
                  <td className="px-3 py-3 text-right text-slate-700">{item.draws}</td>
                  <td className="px-3 py-3 text-right text-slate-700">{item.losses}</td>
                  <td className="px-3 py-3 text-right font-semibold text-slate-900">{item.winRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.wins.length === 0 ? <p className="mt-3 text-sm text-slate-500">Sem jogos com resultado neste período.</p> : null}
      </article>
    </section>
  );
}

export function DisciplinaPageReal() {
  const { month, year } = useOutletContext<OutletPeriod>();
  const location = useLocation();
  const navigate = useNavigate();
  const [showLaunchForm, setShowLaunchForm] = useState(false);
  const [periodMode, setPeriodMode] = useState<StatsPeriodMode>("YEAR");
  const periodQuery = statsPeriodQuery(periodMode, month, year);
  const disciplineQuery = useQuery({
    queryKey: ["sports-discipline", year, month, periodMode],
    queryFn: () => apiRequest<DisciplineSummary>(`/sports/stats/discipline${periodQuery}`)
  });
  const suspensionsQuery = useQuery({
    queryKey: ["sports-active-suspensions"],
    queryFn: () => apiRequest<Suspension[]>("/sports/suspensions/active")
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("launch") === "1") {
      setShowLaunchForm(true);
      params.delete("launch");
      navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
    }
  }, [location.pathname, location.search, navigate]);

  if (disciplineQuery.isLoading) {
    return <LoadingState message="Carregando disciplina..." />;
  }

  if (disciplineQuery.isError || !disciplineQuery.data) {
    return <ErrorState message="Falha ao carregar disciplina." />;
  }

  const data = disciplineQuery.data;
  const periodLabel = statsPeriodLabel(periodMode, month, year);
  const disciplineRankingChart = data.ranking.slice(0, 8).map((item) => ({
    name: shortChartLabel(item.name),
    amarelos: item.yellowCards,
    vermelhos: item.redCards,
    suspensoes: item.suspensions,
    pontos: item.fairPlayScore
  }));
  const disciplineTotalsChart = [
    { name:"Amarelos", value: data.totals.yellow, color:"#f59e0b" },
    { name:"Vermelhos", value: data.totals.red, color:"#dc2626" },
    { name:"Suspensoes", value: data.activeSuspensions, color:"#0f172a" }
  ].filter((item) => item.value > 0);

  return (
    <section className="min-w-0 space-y-4">

      {showLaunchForm ? <EventLaunchForm mode="discipline" month={month} year={year} onClose={() => setShowLaunchForm(false)} /> : null}
      <StatsPeriodToggle mode={periodMode} month={month} year={year} onChange={setPeriodMode} />

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,14rem),1fr))]">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <ShieldCheck size={18} />
            Fair play
          </p>
          <h2 className="mt-2 text-3xl font-bold text-slate-950">{data.ranking.length}</h2>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Amarelos</p>
          <h2 className="mt-2 text-3xl font-bold text-amber-500">{data.totals.yellow}</h2>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Vermelhos</p>
          <h2 className="mt-2 text-3xl font-bold text-red-600">{data.totals.red}</h2>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <Ban size={18} />
            Suspensos ativos
          </p>
          <h2 className="mt-2 text-3xl font-bold text-slate-950">{data.activeSuspensions}</h2>
        </article>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(min(100%,22rem),0.85fr)]">
        <article className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-950">Mapa disciplinar</h2>
              <p className="text-sm font-semibold text-slate-500">Atletas com maior volume de cartões e suspensões.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{periodLabel}</span>
          </div>
          <div className="mt-4 h-72 min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={disciplineRankingChart} margin={{ top: 12, right: 12, bottom: 0, left: -18 }}>
                <CartesianGrid stroke="#eef1f6" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill:"#52607a", fontSize: 12 }} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill:"#52607a", fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: 8, borderColor:"#e2e8f0" }} />
                <Bar dataKey="amarelos" name="Amarelos" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                <Bar dataKey="vermelhos" name="Vermelhos" fill="#dc2626" radius={[8, 8, 0, 0]} />
                <Bar dataKey="suspensoes" name="Suspensoes" fill="#0f172a" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-xl font-bold text-slate-950">Composicao do risco</h2>
          <p className="text-sm font-semibold text-slate-500">Peso dos cartões e suspensões no período.</p>
          <div className="mt-4 h-56 min-w-0">
            {disciplineTotalsChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Tooltip contentStyle={{ borderRadius: 8, borderColor:"#e2e8f0" }} />
                  <Pie data={disciplineTotalsChart} dataKey="value" nameKey="name" innerRadius={58} outerRadius={86} paddingAngle={4}>
                    {disciplineTotalsChart.map((item) => (
                      <Cell key={item.name} fill={item.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-sm font-semibold text-slate-500">Sem cartões no período</div>
            )}
          </div>
          <div className="mt-3 grid gap-2">
            {[
              { label:"Amarelos", value: data.totals.yellow, color:"bg-amber-500" },
              { label:"Vermelhos", value: data.totals.red, color:"bg-red-600" },
              { label:"Suspensos", value: data.activeSuspensions, color:"bg-slate-950" }
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
                <span className="inline-flex items-center gap-2"><span className={`size-2.5 rounded-full ${item.color}`} />{item.label}</span>
                <span className="text-slate-950">{item.value}</span>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(min(100%,24rem),24rem)]">
        <article className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-xl font-bold text-slate-950">Ranking disciplinar ({periodLabel})</h2>
          <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-[620px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-3">Atleta</th>
                  <th className="px-3 py-3 text-right">Amarelos</th>
                  <th className="px-3 py-3 text-right">Vermelhos</th>
                  <th className="px-3 py-3 text-right">Susp.</th>
                  <th className="px-3 py-3 text-right">Pontos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.ranking.map((item) => (
                  <tr key={item.athleteId}>
                    <td className="px-3 py-3 font-semibold text-slate-900">{item.name}</td>
                    <td className="px-3 py-3 text-right text-slate-700">{item.yellowCards}</td>
                    <td className="px-3 py-3 text-right text-slate-700">{item.redCards}</td>
                    <td className="px-3 py-3 text-right text-slate-700">{item.suspensions}</td>
                    <td className="px-3 py-3 text-right font-semibold text-slate-900">{item.fairPlayScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.ranking.length === 0 ? <p className="mt-3 text-sm text-slate-500">Nenhum cartão registrado neste período.</p> : null}
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-xl font-bold text-slate-950">
            <AlertTriangle size={20} />
            Suspensões ativas
          </h2>
          <ul className="mt-4 space-y-3">
            {(suspensionsQuery.data ?? []).map((suspension) => (
              <li key={suspension.id} className="rounded-lg border border-red-100 bg-red-50 p-3">
                <p className="font-semibold text-red-900">{suspension.athlete.name}</p>
                <p className="mt-1 text-sm text-red-700">{suspension.reason}</p>
                <p className="mt-2 text-xs font-semibold text-red-800">
                  Desde {formatDate(suspension.startsAt)} | {suspension.matchesToServe} jogo(s)
                </p>
              </li>
            ))}
          </ul>
          {!suspensionsQuery.isLoading && (suspensionsQuery.data ?? []).length === 0 ? <p className="mt-4 text-sm text-slate-500">Nenhuma suspensão ativa.</p> : null}
        </article>
      </div>
    </section>
  );
}

export function ConfrontosPageReal() {
  const { month, year } = useOutletContext<OutletPeriod>();
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [periodMode, setPeriodMode] = useState<"YEAR" | "MONTH">("YEAR");
  const [gameSearch, setGameSearch] = useState("");
  const periodQuery = statsPeriodQuery(periodMode, month, year);
  const confrontationQuery = useQuery({
    queryKey: ["sports-confrontations", year, month, periodMode],
    queryFn: () => apiRequest<ConfrontationSummary>(`/sports/stats/confrontations${periodQuery}`)
  });
  const gamesQuery = useQuery({
    queryKey: ["sports-games", "confrontos-list", year, month, periodMode],
    queryFn: () => apiRequest<Game[]>(`/sports/games${periodQuery}`)
  });

  if (confrontationQuery.isLoading || gamesQuery.isLoading) {
    return <LoadingState message="Carregando confrontos..." />;
  }

  if (confrontationQuery.isError || !confrontationQuery.data || gamesQuery.isError) {
    return <ErrorState message="Falha ao carregar confrontos." />;
  }

  const data = confrontationQuery.data;
  const games = (gamesQuery.data ?? [])
    .filter((game) => game.type === "INTERNAL")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const normalizedSearch = gameSearch.trim().toLowerCase();
  const listedGames = normalizedSearch
    ? games.filter((game) => {
      const searchable = [
        game.redTeamName,
        game.whiteTeamName,
        game.field?.name,
        game.location,
        game.championship,
        game.round,
        game.status
      ].filter(Boolean).join(" ").toLowerCase();

      return searchable.includes(normalizedSearch);
    })
    : games;
  const selectedGame = games.find((game) => game.id === selectedGameId) ?? null;
  const resultGames = games.filter((game) => game.status === "FINISHED" || game.redScore !== null || game.whiteScore !== null);
  const redWins = resultGames.filter((game) => !game.isDraw && game.winnerSide === "RED").length;
  const whiteWins = resultGames.filter((game) => !game.isDraw && game.winnerSide === "WHITE").length;
  const draws = resultGames.filter((game) => game.isDraw).length;
  const redGoals = resultGames.reduce((total, game) => total + (game.redScore ?? 0), 0);
  const whiteGoals = resultGames.reduce((total, game) => total + (game.whiteScore ?? 0), 0);
  const lastMatch = resultGames[0] ?? null;
  const biggestBlowout = resultGames
    .slice()
    .sort((a, b) => Math.abs((b.redScore ?? 0) - (b.whiteScore ?? 0)) - Math.abs((a.redScore ?? 0) - (a.whiteScore ?? 0)))[0] ?? null;
  const chartData = [
    { side:"Time A", wins: redWins, color:"#94a3b8" },
    { side:"Time B", wins: whiteWins, color:"#cbd5e1" },
    { side:"Empates", wins: draws, color:"#f6a33a" }
  ];
  const goalsChartData = [
    { side:"Time A", goals: redGoals, color:"#ef3340" },
    { side:"Time B", goals: whiteGoals, color:"#0f172a" }
  ];
  const resultTimelineChart = resultGames
    .slice()
    .reverse()
    .slice(-10)
    .map((game) => ({
      label: new Date(game.date).toLocaleDateString("pt-BR", { day:"2-digit", month:"2-digit" }),
      timeA: game.redScore ?? 0,
      timeB: game.whiteScore ?? 0
    }));

  return (
    <section className="min-w-0 space-y-4">
      <StatsPeriodToggle mode={periodMode} month={month} year={year} onChange={(nextMode) => {
        setPeriodMode(nextMode);
        setSelectedGameId(null);
      }} />

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,14rem),1fr))]">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <Trophy size={18} />
            Jogos internos
          </p>
          <h2 className="mt-2 text-3xl font-bold text-slate-950">{games.length}</h2>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Time A</p>
          <h2 className="mt-2 text-3xl font-bold text-red-600">{redWins}</h2>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Time B</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-700">{whiteWins}</h2>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <CircleEqual size={18} />
            Empates
          </p>
          <h2 className="mt-2 text-3xl font-bold text-amber-500">{draws}</h2>
        </article>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <article className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-950">Evolucao dos placares</h2>
              <p className="text-sm font-semibold text-slate-500">Ultimos confrontos finalizados no recorte.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{resultTimelineChart.length} jogos</span>
          </div>
          <div className="mt-4 h-72 min-w-0">
            {resultTimelineChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <LineChart data={resultTimelineChart} margin={{ top: 12, right: 12, bottom: 0, left: -18 }}>
                  <CartesianGrid stroke="#eef1f6" vertical={false} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill:"#52607a", fontSize: 12 }} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill:"#52607a", fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, borderColor:"#e2e8f0" }} />
                  <Line type="monotone" dataKey="timeA" name="Time A" stroke="#ef3340" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="timeB" name="Time B" stroke="#0f172a" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-sm font-semibold text-slate-500">Sem placares finalizados</div>
            )}
          </div>
        </article>

        <article className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-xl font-bold text-slate-950">Gols por lado</h2>
          <p className="text-sm font-semibold text-slate-500">Comparativo ofensivo entre Time A e Time B.</p>
          <div className="mt-4 h-72 min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={goalsChartData} layout="vertical" margin={{ top: 12, right: 24, bottom: 0, left: 12 }}>
                <CartesianGrid stroke="#eef1f6" horizontal={false} />
                <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill:"#52607a", fontSize: 12 }} />
                <YAxis type="category" dataKey="side" axisLine={false} tickLine={false} tick={{ fill:"#52607a", fontSize: 12 }} width={72} />
                <Tooltip contentStyle={{ borderRadius: 8, borderColor:"#e2e8f0" }} />
                <Bar dataKey="goals" name="Gols" radius={[0, 8, 8, 0]} barSize={34}>
                  {goalsChartData.map((item) => (
                    <Cell key={item.side} fill={item.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(min(100%,24rem),24rem)]">
        <article className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-xl font-bold text-slate-950">Resumo Time A x Time B</h2>
          <div className="mt-4 h-80 min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={chartData} margin={{ top: 12, right: 12, bottom: 0, left: -18 }}>
                <CartesianGrid stroke="#eef1f6" vertical={false} />
                <XAxis dataKey="side" axisLine={false} tickLine={false} tick={{ fill:"#52607a", fontSize: 12 }} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill:"#52607a", fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: 8, borderColor:"#e2e8f0" }} />
                <Bar dataKey="wins" name="Resultados" radius={[8, 8, 0, 0]}>
                  {chartData.map((item) => (
                    <Cell key={item.side} fill={item.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <div className="space-y-4">
          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Gols</p>
            <h3 className="mt-2 text-2xl font-bold text-slate-950">
              {redGoals} x {whiteGoals}
            </h3>
            <p className="mt-1 text-sm text-slate-500">Saldo do Time A: {redGoals - whiteGoals}</p>
          </article>
          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Último confronto</p>
            <h3 className="mt-2 text-xl font-bold text-slate-950">
              {lastMatch ? `${lastMatch.redScore ?? 0} x ${lastMatch.whiteScore ?? 0}` :"-"}
            </h3>
            <p className="mt-1 text-sm text-slate-500">{lastMatch ? formatDate(lastMatch.date) :"Sem jogo finalizado"}</p>
          </article>
          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Melhor sequência</p>
            <h3 className="mt-2 text-xl font-bold text-slate-950">
              {periodMode === "YEAR" && data.bestStreak ? `${sideLabels[data.bestStreak.side]} (${data.bestStreak.wins})` :"Recorte mensal"}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Maior goleada: {biggestBlowout ? `${biggestBlowout.redScore ?? 0} x ${biggestBlowout.whiteScore ?? 0}` :"-"}
            </p>
          </article>
        </div>
      </div>

      <article className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-slate-950">Histórico de jogos</h2>
            <p className="text-sm font-semibold text-slate-500">Data, times, resultado, local e detalhamento de escalação.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <label className="relative block w-full sm:w-auto">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-slate-400 sm:min-w-[14rem]"
                value={gameSearch}
                onChange={(event) => setGameSearch(event.target.value)}
                placeholder="Buscar confronto"
              />
            </label>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">{listedGames.length}/{games.length} jogo(s)</span>
          </div>
        </div>

        <div className="space-y-3 md:hidden">
          {listedGames.map((game) => {
            const redName = game.redTeamName || "Time A";
            const whiteName = game.whiteTeamName || "Time B";
            const hasScore = game.redScore !== null && game.whiteScore !== null;
            const winner = game.isDraw ? "Empate" : game.winnerSide === "RED" ? redName : game.winnerSide === "WHITE" ? whiteName : game.status === "CANCELED" ? "Cancelado" : "Pendente";
            const selected = selectedGameId === game.id;

            return (
              <article key={`mobile-${game.id}`} className={`rounded-lg border p-3 shadow-sm ${selected ? "border-blue-200 bg-blue-50/50" : "border-slate-200 bg-white"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.08em] text-slate-500">
                      <CalendarDays size={14} />
                      {formatDate(game.date)}
                    </p>
                    <h3 className="mt-1 truncate text-base font-black text-slate-950">{redName} <span className="text-slate-400">x</span> {whiteName}</h3>
                    <p className="mt-0.5 text-xs font-semibold text-slate-500">{game.status === "FINISHED" ? "Finalizado" : game.status === "CANCELED" ? "Cancelado" : "Agendado"} - {winner}</p>
                  </div>
                  <span className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-base font-black text-slate-950">
                    {hasScore ? `${game.redScore} x ${game.whiteScore}` : "-"}
                  </span>
                </div>

                <div className="mt-3 grid gap-2 text-xs font-semibold text-slate-600">
                  <p className="inline-flex min-w-0 items-center gap-2">
                    <MapPin size={14} className="shrink-0" />
                    <span className="truncate">{game.field?.name ?? game.location}</span>
                  </p>
                  <p className="truncate">{game.championship || game.round || "Sem competição/rodada"}</p>
                </div>

                <button
                  type="button"
                  className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 hover:bg-slate-50"
                  onClick={() => setSelectedGameId(selected ? null : game.id)}
                >
                  <Eye size={14} />
                  {selected ? "Fechar detalhe" : "Ver detalhe"}
                </button>
              </article>
            );
          })}
        </div>

        <div className="hidden overflow-x-auto rounded-lg border border-slate-200 md:block">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.08em] text-slate-500">
              <tr>
                <th className="px-3 py-3">Data</th>
                <th className="px-3 py-3">Mandante x visitante</th>
                <th className="px-3 py-3 text-center">Resultado</th>
                <th className="px-3 py-3">Campo</th>
                <th className="px-3 py-3">Competição/rodada</th>
                <th className="w-32 px-3 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {listedGames.map((game) => {
                const redName = game.redTeamName || "Time A";
                const whiteName = game.whiteTeamName || "Time B";
                const hasScore = game.redScore !== null && game.whiteScore !== null;
                const winner = game.isDraw ? "Empate" : game.winnerSide === "RED" ? redName : game.winnerSide === "WHITE" ? whiteName : game.status === "CANCELED" ? "Cancelado" : "Pendente";
                const selected = selectedGameId === game.id;

                return (
                  <tr key={game.id} className={selected ? "bg-blue-50/50" : undefined}>
                    <td className="whitespace-nowrap px-3 py-3 font-semibold text-slate-700">
                      <span className="inline-flex items-center gap-2"><CalendarDays size={15} />{formatDate(game.date)}</span>
                    </td>
                    <td className="px-3 py-3">
                      <p className="truncate font-black text-slate-950">{redName} <span className="text-slate-400">x</span> {whiteName}</p>
                      <p className="text-xs font-semibold text-slate-500">{game.status === "FINISHED" ? "Finalizado" : game.status === "CANCELED" ? "Cancelado" : "Agendado"} - {winner}</p>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="inline-flex min-w-20 justify-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-lg font-black text-slate-950">
                        {hasScore ? `${game.redScore} x ${game.whiteScore}` : "-"}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-semibold text-slate-600">
                      <span className="inline-flex items-center gap-2"><MapPin size={15} />{game.field?.name ?? game.location}</span>
                    </td>
                    <td className="px-3 py-3 font-semibold text-slate-600">{game.championship || game.round || "-"}</td>
                    <td className="px-3 py-3 text-right">
                      <button
                        type="button"
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-black text-slate-700 hover:bg-slate-50"
                        onClick={() => setSelectedGameId(selected ? null : game.id)}
                      >
                        <Eye size={14} />
                        {selected ? "Fechar" : "Detalhe"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {games.length === 0 ? <p className="mt-3 text-sm text-slate-500">Nenhum confronto interno encontrado neste recorte.</p> : null}
        {games.length > 0 && listedGames.length === 0 ? <p className="mt-3 text-sm text-slate-500">Nenhum confronto combina com a busca informada.</p> : null}
      </article>

      {selectedGame ? (
        <article className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Detalhamento do confronto</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">{selectedGame.redTeamName || "Time A"} x {selectedGame.whiteTeamName || "Time B"}</h2>
              <p className="text-sm font-semibold text-slate-500">{formatDateTime(selectedGame.date)} - {selectedGame.field?.name ?? selectedGame.location}</p>
            </div>
            <button type="button" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50" onClick={() => setSelectedGameId(null)}>
              Fechar detalhe
            </button>
          </div>

          <div className="mb-4 grid gap-2 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Campo</p>
              <p className="mt-1 truncate font-black text-slate-950">{selectedGame.field?.name ?? selectedGame.location}</p>
              <p className="text-xs font-semibold text-slate-500">{selectedGame.field?.city ? `${selectedGame.field.city}${selectedGame.field.state ? `/${selectedGame.field.state}` : ""}` : selectedGame.field?.surface ?? "Local do jogo"}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Formação</p>
              <p className="mt-1 font-black text-slate-950">{selectedGame.redFormation ?? "-"} x {selectedGame.whiteFormation ?? "-"}</p>
              <p className="text-xs font-semibold text-slate-500">Time A x Time B</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Participantes</p>
              <p className="mt-1 font-black text-slate-950">{(selectedGame.lineups ?? []).filter((lineup) => lineup.role !== "ABSENT").length}</p>
              <p className="text-xs font-semibold text-slate-500">{(selectedGame.events ?? []).length} evento(s) registrados</p>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,28rem)] xl:items-start">
            <FullPitchBoard
              redColor={selectedGame.redUniformColor ?? "#94a3b8"}
              whiteColor={selectedGame.whiteUniformColor ?? "#cbd5e1"}
              redPlayers={lineupsToPitchPlayers(selectedGame, "RED")}
              whitePlayers={lineupsToPitchPlayers(selectedGame, "WHITE")}
              redBenchPlayers={benchPlayers(selectedGame, "RED")}
              whiteBenchPlayers={benchPlayers(selectedGame, "WHITE")}
              redTeamName={selectedGame.redTeamName || "Time A"}
              whiteTeamName={selectedGame.whiteTeamName || "Time B"}
              redFormation={selectedGame.redFormation ?? undefined}
              whiteFormation={selectedGame.whiteFormation ?? undefined}
              focusTeam={null}
              mode="view"
              interactive={false}
              showBench
              showPlayerNumbers
              className="aspect-[105/68] min-h-0 w-full self-start"
            />

            <div className="space-y-4 xl:max-h-[calc(100vh-18rem)] xl:overflow-y-auto xl:pr-1">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <h3 className="flex items-center gap-2 font-black text-slate-950"><Shirt size={16} />Participantes</h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                  {(["RED", "WHITE"] as const).map((side) => (
                    <div key={`lineup-${side}`} className="rounded-lg border border-slate-200 bg-white p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">{side === "RED" ? selectedGame.redTeamName || "Time A" : selectedGame.whiteTeamName || "Time B"}</p>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-600">
                          {(selectedGame.lineups ?? []).filter((lineup) => lineup.side === side && lineup.role !== "ABSENT").length}
                        </span>
                      </div>
                      <ul className="mt-2 max-h-56 space-y-1.5 overflow-y-auto pr-1">
                        {(selectedGame.lineups ?? []).filter((lineup) => lineup.side === side && lineup.role !== "ABSENT").slice(0, 18).map((lineup) => (
                          <li key={lineup.id} className="flex items-center justify-between gap-2 rounded bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700">
                            <span className="truncate">{lineup.jerseyNumber !== null ? `#${lineup.jerseyNumber} ` : ""}{lineup.athlete.name}</span>
                            <span className="shrink-0 text-slate-400">{lineup.role === "GOALKEEPER" ? "GOL" : lineup.role === "RESERVE" ? "Banco" : `P${lineup.tacticalSlot ?? ""}`}</span>
                          </li>
                        ))}
                      </ul>
                      {(selectedGame.lineups ?? []).filter((lineup) => lineup.side === side && lineup.role !== "ABSENT").length > 18 ? (
                        <p className="mt-2 text-xs font-semibold text-slate-500">Mais participantes disponíveis na súmula do jogo.</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <h3 className="font-black text-slate-950">Eventos do jogo</h3>
                <ul className="mt-3 space-y-1.5">
                  {(selectedGame.events ?? []).map((event) => (
                    <li key={event.id} className="flex items-center justify-between gap-2 rounded bg-white px-2 py-1.5 text-xs font-semibold text-slate-700">
                      <span className="truncate">{eventLabels[event.type]} - {event.athlete.name}</span>
                      <span className="shrink-0 text-slate-400">{event.minute !== null ? `${event.minute}'` : "-"}</span>
                    </li>
                  ))}
                </ul>
                {(selectedGame.events ?? []).length === 0 ? <p className="mt-2 text-xs font-semibold text-slate-500">Nenhum evento registrado.</p> : null}
              </div>
            </div>
          </div>
        </article>
      ) : null}
    </section>
  );
}
