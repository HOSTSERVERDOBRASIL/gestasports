import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useOutletContext } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiDownload, apiRequest } from "../services/api";
import type { HistoricalArchiveReport, ReportsSummary, YearComparisonReport, YearComparisonSnapshot } from "../types/domain";

type OutletPeriod = {
  month: number;
  year: number;
};

const monthLabels = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((cents || 0) / 100);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value || 0);
}

function formatDelta(value: number, isCurrency = false) {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${isCurrency ? formatCurrency(value) : formatNumber(value)}`;
}

function shortChartLabel(name: string, maxLength = 12) {
  const trimmed = name.trim();
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength - 1)}.` : trimmed;
}

function DeltaPill({ value, percent, reverseTone = false }: { value: number; percent: number | null; reverseTone: boolean }) {
  const positive = value >= 0;
  const good = reverseTone ? !positive : positive;
  return (
    <span className={`rounded-full px-2 py-1 text-[11px] font-black ${good ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
      {formatDelta(value)} {percent !== null ? `(${percent > 0 ? "+" : ""}${percent}%)` : ""}
    </span>
  );
}

function YearMetricCard({
  label,
  current,
  previous,
  delta,
  isCurrency = false,
  reverseTone = false
}: {
  label: string;
  current: number;
  previous: number;
  delta: { value: number; percent: number | null };
  isCurrency?: boolean;
  reverseTone?: boolean;
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-black uppercase tracking-[0.08em] text-slate-500">{label}</p>
          <strong className="mt-2 block truncate text-2xl font-black text-slate-950">
            {isCurrency ? formatCurrency(current) : formatNumber(current)}
          </strong>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Comparado: {isCurrency ? formatCurrency(previous) : formatNumber(previous)}
          </p>
        </div>
        <DeltaPill value={delta.value} percent={delta.percent} reverseTone={reverseTone} />
      </div>
    </article>
  );
}

function MiniYearSummary({ data }: { data: YearComparisonSnapshot }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-black text-slate-950">{data.year}</h3>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">{data.sports.games} jogos</span>
      </div>
      <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
        <span>Receitas: <strong>{formatCurrency(data.finance.incomeCents)}</strong></span>
        <span>Despesas: <strong>{formatCurrency(data.finance.expenseCents)}</strong></span>
        <span>Saldo: <strong>{formatCurrency(data.finance.balanceCents)}</strong></span>
        <span>Presenças: <strong>{formatNumber(data.sports.presences)}</strong></span>
        <span>Atletas ativos: <strong>{formatNumber(data.members.activeAthletes)}</strong></span>
        <span>Ações auditadas: <strong>{formatNumber(data.audit.actions)}</strong></span>
      </div>
    </article>
  );
}

function PerformancePanel({ data, title }: { data: YearComparisonSnapshot; title: string }) {
  const topScorers = data.sports.performance.scorers.slice(0, 5);
  const topWins = data.sports.performance.wins.slice(0, 5);
  const topContributions = data.sports.performance.contributions.slice(0, 5);

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-black text-slate-950">{title}</h3>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{data.year}</span>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Artilharia</p>
          <div className="mt-2 space-y-2">
            {topScorers.length ? topScorers.map((item, index) => (
              <div key={item.athleteId} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="min-w-0 truncate font-bold text-slate-800">{index + 1}. {item.name}</span>
                <strong className="shrink-0 text-slate-950">{item.goals} gols</strong>
              </div>
            )) : <p className="text-sm font-semibold text-slate-400">Sem dados</p>}
          </div>
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Contribuições</p>
          <div className="mt-2 space-y-2">
            {topContributions.length ? topContributions.map((item, index) => (
              <div key={item.athleteId} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="min-w-0 truncate font-bold text-slate-800">{index + 1}. {item.name}</span>
                <strong className="shrink-0 text-slate-950">{item.total}</strong>
              </div>
            )) : <p className="text-sm font-semibold text-slate-400">Sem dados</p>}
          </div>
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Vitórias</p>
          <div className="mt-2 space-y-2">
            {topWins.length ? topWins.map((item, index) => (
              <div key={item.athleteId} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="min-w-0 truncate font-bold text-slate-800">{index + 1}. {item.name}</span>
                <strong className="shrink-0 text-slate-950">{item.wins} ({item.winRate}%)</strong>
              </div>
            )) : <p className="text-sm font-semibold text-slate-400">Sem dados</p>}
          </div>
        </div>
      </div>
    </article>
  );
}

function GameResultsTable({ data, title }: { data: YearComparisonSnapshot; title: string }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-black text-slate-950">{title}</h3>
        <span className="text-xs font-bold text-slate-500">{data.sports.results.length} resultado(s)</span>
      </div>
      <div className="mt-3 overflow-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.08em] text-slate-500">
            <tr>
              <th className="p-2">Data</th>
              <th className="p-2">Jogo</th>
              <th className="p-2">Placar</th>
              <th className="p-2">Resultado</th>
              <th className="p-2">Local</th>
            </tr>
          </thead>
          <tbody>
            {data.sports.results.slice(0, 60).map((game) => {
              const redName = game.redTeamName ?? "Time A";
              const whiteName = game.whiteTeamName ?? "Time B";
              const result = game.isDraw ? "Empate" : game.winnerSide === "RED" ? redName : game.winnerSide === "WHITE" ? whiteName : "-";
              return (
                <tr key={game.id} className="border-t border-slate-100">
                  <td className="p-2 font-bold text-slate-800">{new Date(game.date).toLocaleDateString("pt-BR")}</td>
                  <td className="p-2 text-slate-700">{redName} x {whiteName}</td>
                  <td className="p-2 font-black text-slate-950">{game.redScore ?? "-"} x {game.whiteScore ?? "-"}</td>
                  <td className="p-2 text-slate-700">{result}</td>
                  <td className="p-2 text-slate-600">{game.location}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!data.sports.results.length ? <p className="p-3 text-sm font-semibold text-slate-400">Nenhum jogo finalizado registrado neste ano.</p> : null}
      </div>
    </article>
  );
}

function HistoricalArchivePanel({ archive }: { archive: HistoricalArchiveReport }) {
  const allTimeScorers = archive.allTime?.scorers ?? [];
  const allTimeWinners = archive.allTime?.winners ?? [];
  const yearClosures = archive.yearClosures ?? [];
  const scoringByYear = archive.scoringByYear ?? [];
  const winsByYear = archive.winsByYear ?? [];
  const presidents = archive.presidents ?? [];
  const closureTrendChart = yearClosures.slice(-10).map((item) => ({
    year: String(item.year),
    receitas: Math.round(item.finance.incomeCents / 100),
    despesas: Math.round(item.finance.expenseCents / 100),
    saldo: Math.round(item.finance.balanceCents / 100),
    jogos: item.sports.games,
    gols: item.sports.goals,
    presencas: item.sports.presences
  }));
  const allTimeScorersChart = allTimeScorers.slice(0, 8).map((item) => ({
    name: shortChartLabel(item.name),
    gols: item.goals,
    assistencias: item.assists
  }));
  const allTimeWinnersChart = allTimeWinners.slice(0, 8).map((item) => ({
    name: shortChartLabel(item.name),
    vitorias: item.wins,
    aproveitamento: item.winRate
  }));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 xl:grid-cols-2">
        <article className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-black text-slate-950">Financeiro historico</h3>
              <p className="text-sm font-semibold text-slate-500">Receitas, despesas e saldo por fechamento anual.</p>
            </div>
            <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">{closureTrendChart.length} anos</span>
          </div>
          <div className="mt-4 h-72 min-w-0">
            {closureTrendChart.length ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={closureTrendChart} margin={{ top: 12, right: 12, bottom: 0, left: -18 }}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value, name) => [formatCurrency(Number(value) * 100), String(name)]} />
                  <Bar dataKey="receitas" name="Receitas" fill="#16a34a" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="despesas" name="Despesas" fill="#dc2626" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="saldo" name="Saldo" fill="#0f172a" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-sm font-semibold text-slate-500">Sem fechamento anual</div>
            )}
          </div>
        </article>

        <article className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-black text-slate-950">Evolucao esportiva</h3>
              <p className="text-sm font-semibold text-slate-500">Jogos, gols e presencas do arquivo anual.</p>
            </div>
            <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">serie anual</span>
          </div>
          <div className="mt-4 h-72 min-w-0">
            {closureTrendChart.length ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <LineChart data={closureTrendChart} margin={{ top: 12, right: 12, bottom: 0, left: -18 }}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="jogos" name="Jogos" stroke="#0f172a" strokeWidth={3} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="gols" name="Gols" stroke="#dc2626" strokeWidth={3} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="presencas" name="Presencas" stroke="#16a34a" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-sm font-semibold text-slate-500">Sem serie historica</div>
            )}
          </div>
        </article>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <article className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-black text-slate-950">Top artilharia acumulada</h3>
          <div className="mt-4 h-72 min-w-0">
            {allTimeScorersChart.length ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={allTimeScorersChart} layout="vertical" margin={{ top: 12, right: 20, bottom: 0, left: 12 }}>
                  <CartesianGrid stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} width={86} />
                  <Tooltip />
                  <Bar dataKey="gols" name="Gols" fill="#dc2626" radius={[0, 7, 7, 0]} />
                  <Bar dataKey="assistencias" name="Assistencias" fill="#0f172a" radius={[0, 7, 7, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-sm font-semibold text-slate-500">Sem artilharia acumulada</div>
            )}
          </div>
        </article>

        <article className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-black text-slate-950">Top vencedores acumulados</h3>
          <div className="mt-4 h-72 min-w-0">
            {allTimeWinnersChart.length ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={allTimeWinnersChart} layout="vertical" margin={{ top: 12, right: 20, bottom: 0, left: 12 }}>
                  <CartesianGrid stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} width={86} />
                  <Tooltip />
                  <Bar dataKey="vitorias" name="Vitorias" fill="#0f172a" radius={[0, 7, 7, 0]} />
                  <Bar dataKey="aproveitamento" name="Aproveitamento" fill="#16a34a" radius={[0, 7, 7, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-sm font-semibold text-slate-500">Sem vencedores acumulados</div>
            )}
          </div>
        </article>
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm xl:col-span-2">
          <h3 className="text-lg font-black text-slate-950">Artilharia acumulada</h3>
          <div className="mt-3 overflow-auto">
            <table className="w-full min-w-[620px] border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.08em] text-slate-500">
                <tr>
                  <th className="p-2">Atleta</th>
                  <th className="p-2">Gols</th>
                  <th className="p-2">Assistências</th>
                  <th className="p-2">Jogos</th>
                  <th className="p-2">Média</th>
                </tr>
              </thead>
              <tbody>
                {allTimeScorers.slice(0, 15).map((item, index) => (
                  <tr key={item.athleteId} className="border-t border-slate-100">
                    <td className="p-2 font-black text-slate-900">{index + 1}. {item.name}</td>
                    <td className="p-2 font-bold text-slate-800">{item.goals}</td>
                    <td className="p-2 text-slate-700">{item.assists}</td>
                    <td className="p-2 text-slate-700">{item.games}</td>
                    <td className="p-2 text-slate-700">{item.goalAverage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-black text-slate-950">Mais vencedores</h3>
          <div className="mt-3 space-y-2">
            {allTimeWinners.slice(0, 10).map((item, index) => (
              <div key={item.athleteId} className="rounded-lg bg-slate-50 px-3 py-2">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate font-black text-slate-900">{index + 1}. {item.name}</span>
                  <strong className="text-slate-950">{item.wins}</strong>
                </div>
                <p className="mt-1 text-xs font-semibold text-slate-500">{item.games} jogos, {item.winRate}% aproveitamento</p>
              </div>
            ))}
          </div>
        </article>
      </div>

      <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-lg font-black text-slate-950">Fechamentos por ano</h3>
        <div className="mt-3 overflow-auto">
          <table className="w-full min-w-[920px] border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.08em] text-slate-500">
              <tr>
                <th className="p-2">Ano</th>
                <th className="p-2">Receitas</th>
                <th className="p-2">Despesas</th>
                <th className="p-2">Saldo</th>
                <th className="p-2">Jogos</th>
                <th className="p-2">Finalizados</th>
                <th className="p-2">Gols</th>
                <th className="p-2">Presenças</th>
              </tr>
            </thead>
            <tbody>
              {yearClosures.map((item) => (
                <tr key={item.year} className="border-t border-slate-100">
                  <td className="p-2 font-black text-slate-900">{item.year}</td>
                  <td className="p-2 font-bold text-emerald-700">{formatCurrency(item.finance.incomeCents)}</td>
                  <td className="p-2 font-bold text-red-700">{formatCurrency(item.finance.expenseCents)}</td>
                  <td className="p-2 font-black text-slate-950">{formatCurrency(item.finance.balanceCents)}</td>
                  <td className="p-2 text-slate-700">{item.sports.games}</td>
                  <td className="p-2 text-slate-700">{item.sports.finishedGames}</td>
                  <td className="p-2 text-slate-700">{item.sports.goals}</td>
                  <td className="p-2 text-slate-700">{item.sports.presences}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <div className="grid gap-3 lg:grid-cols-2">
        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-black text-slate-950">Artilharia por ano</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {scoringByYear.map((item) => (
              <div key={item.year} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <strong className="text-slate-950">{item.year}</strong>
                <p className="mt-1 font-semibold text-slate-600">
                  {item.topScorers[0] ? `${item.topScorers[0].name} (${item.topScorers[0].goals} gols)` : "Sem artilheiro"}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-black text-slate-950">Mais vitórias por ano</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {winsByYear.map((item) => (
              <div key={item.year} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <strong className="text-slate-950">{item.year}</strong>
                <p className="mt-1 font-semibold text-slate-600">
                  {item.topWins[0] ? `${item.topWins[0].name} (${item.topWins[0].wins} vitórias)` : "Sem vencedor"}
                </p>
              </div>
            ))}
          </div>
        </article>
      </div>

      <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-lg font-black text-slate-950">Galeria de presidentes</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {presidents.map((president) => (
            <div key={president.id} className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
              <div className="aspect-[4/3] bg-slate-200">
                {president.photoUrl ? <img src={president.photoUrl} alt={president.name} className="h-full w-full object-cover" /> : null}
              </div>
              <div className="p-3">
                <h4 className="font-black text-slate-950">{president.name}</h4>
                <p className="text-xs font-bold text-slate-500">{president.startedYear} - {president.endedYear ?? "atual"}</p>
                {president.note ? <p className="mt-2 text-sm text-slate-600">{president.note}</p> : null}
                {president.achievements ? <p className="mt-2 text-xs font-semibold text-slate-500">{president.achievements}</p> : null}
              </div>
            </div>
          ))}
          {!presidents.length ? <p className="text-sm font-semibold text-slate-400">Nenhum presidente cadastrado ainda.</p> : null}
        </div>
      </article>
    </div>
  );
}

export function RelatoriosPage() {
  const { month, year } = useOutletContext<OutletPeriod>();
  const queryClient = useQueryClient();
  const [compareYear, setCompareYear] = useState(year - 1);
  const [archiveFromYear, setArchiveFromYear] = useState(1980);
  const [archiveToYear, setArchiveToYear] = useState(year);
  const [section, setSection] = useState<"CURRENT" | "HISTORY">("CURRENT");
  const [presidentForm, setPresidentForm] = useState({
    name: "",
    startedYear: String(year),
    endedYear: "",
    photoUrl: "",
    note: "",
    achievements: ""
  });

  const summaryQuery = useQuery({
    queryKey: ["reports-summary", month, year],
    queryFn: () => apiRequest<ReportsSummary>(`/reports/summary?month=${month}&year=${year}`)
  });

  const comparisonQuery = useQuery({
    queryKey: ["reports-year-comparison", year, compareYear],
    queryFn: () => apiRequest<YearComparisonReport>(`/reports/year-comparison?year=${year}&compareYear=${compareYear}`)
  });

  const archiveQuery = useQuery({
    queryKey: ["reports-historical-archive", archiveFromYear, archiveToYear],
    queryFn: () => apiRequest<HistoricalArchiveReport>(`/reports/historical-archive?fromYear=${archiveFromYear}&toYear=${archiveToYear}`),
    enabled: section === "HISTORY"
  });

  const createPresidentMutation = useMutation({
    mutationFn: () =>
      apiRequest("/president-terms", {
        method: "POST",
        body: JSON.stringify({
          name: presidentForm.name,
          startedYear: Number(presidentForm.startedYear),
          endedYear: presidentForm.endedYear ? Number(presidentForm.endedYear) : null,
          photoUrl: presidentForm.photoUrl,
          note: presidentForm.note,
          achievements: presidentForm.achievements
        })
      }),
    onSuccess: () => {
      setPresidentForm({ name: "", startedYear: String(year), endedYear: "", photoUrl: "", note: "", achievements: "" });
      void queryClient.invalidateQueries({ queryKey: ["reports-historical-archive"] });
    }
  });

  async function handleExportCsv() {
    const blob = await apiDownload(`/reports/finance/export.csv?month=${month}&year=${year}`);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio_financeiro_${year}_${String(month).padStart(2, "0")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (summaryQuery.isLoading || comparisonQuery.isLoading) {
    return <div className="rounded-lg border border-slate-200 bg-white p-6 text-slate-500 shadow-sm">Gerando relatórios...</div>;
  }

  if (summaryQuery.isError || !summaryQuery.data || comparisonQuery.isError || !comparisonQuery.data) {
    return <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">Falha ao carregar relatórios.</div>;
  }

  const data = summaryQuery.data;
  const comparison = comparisonQuery.data;
  const monthlyManagementChartData = comparison.current.monthly.map((row) => ({
    month: monthLabels[row.month - 1],
    receitas: Math.round(row.incomeCents / 100),
    despesas: Math.round(row.expenseCents / 100),
    saldo: Math.round(row.balanceCents / 100),
    jogos: row.games,
    gols: row.goals,
    presencas: row.presences
  }));

  return (
    <section className="min-w-0 space-y-4">
      <article className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-slate-950">Relatórios e histórico</h2>
            <p className="text-sm font-semibold text-slate-500">
              Ano vigente separado do arquivo histórico para consulta e comparação
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { key: "CURRENT" as const, label: `Ano vigente ${year}` },
            { key: "HISTORY" as const, label: "Histórico anual" }
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setSection(item.key)}
              className={`rounded-lg border px-4 py-2 text-sm font-black ${
                section === item.key ?
                   "border-red-600 bg-red-600 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </article>

      {section === "CURRENT" ? (
        <>
          <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-950">Ano vigente</h3>
                <p className="text-sm font-semibold text-slate-500">
                  Competencia atual {String(data.period.month).padStart(2, "0")}/{data.period.year}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleExportCsv()}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-black text-white hover:bg-red-700"
              >
                Exportar financeiro CSV
              </button>
            </div>
          </article>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <YearMetricCard label="Receitas no ano" current={comparison.current.finance.incomeCents} previous={comparison.current.finance.incomeCents} delta={{ value: 0, percent: 0 }} isCurrency />
            <YearMetricCard label="Despesas no ano" current={comparison.current.finance.expenseCents} previous={comparison.current.finance.expenseCents} delta={{ value: 0, percent: 0 }} isCurrency reverseTone />
            <YearMetricCard label="Saldo no ano" current={comparison.current.finance.balanceCents} previous={comparison.current.finance.balanceCents} delta={{ value: 0, percent: 0 }} isCurrency />
            <YearMetricCard label="Presenças no ano" current={comparison.current.sports.presences} previous={comparison.current.sports.presences} delta={{ value: 0, percent: 0 }} />
          </div>

          <div className="grid gap-3 xl:grid-cols-2">
            <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-lg font-black text-slate-950">Financeiro mensal</h3>
                  <p className="text-sm font-semibold text-slate-500">Receitas, despesas e saldo do ano vigente.</p>
                </div>
                <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">{comparison.current.year}</span>
              </div>
              <div className="mt-4 h-64 min-w-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart data={monthlyManagementChartData} margin={{ top: 12, right: 12, bottom: 0, left: -18 }}>
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(value, name) => [formatCurrency(Number(value) * 100), String(name)]} />
                    <Bar dataKey="receitas" fill="#16a34a" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="despesas" fill="#dc2626" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="saldo" fill="#08255b" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-lg font-black text-slate-950">Movimento esportivo</h3>
                  <p className="text-sm font-semibold text-slate-500">Jogos, gols e presenças por mês.</p>
                </div>
                <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">{comparison.current.sports.games} jogos</span>
              </div>
              <div className="mt-4 h-64 min-w-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <LineChart data={monthlyManagementChartData} margin={{ top: 12, right: 12, bottom: 0, left: -18 }}>
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="jogos" stroke="#08255b" strokeWidth={3} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="gols" stroke="#dc2626" strokeWidth={3} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="presencas" stroke="#16a34a" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </article>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-base font-black text-slate-900">Resumo financeiro do mês</h3>
              <p className="mt-2 text-sm text-slate-600">Receitas pagas: {formatCurrency(data.financial.incomeCents)}</p>
              <p className="text-sm text-slate-600">Despesas pagas: {formatCurrency(data.financial.expenseCents)}</p>
              <p className="text-sm text-slate-600">Saldo: {formatCurrency(data.financial.balanceCents)}</p>
              <p className="text-sm text-slate-600">Pendentes: {data.financial.pendingCount}</p>
              <p className="text-sm text-slate-600">Vencidos: {data.financial.overdueCount}</p>
            </article>

            <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-base font-black text-slate-900">Esportivo do ano vigente</h3>
              <p className="mt-2 text-sm text-slate-600">Artilheiro: {data.topScorer ? `${data.topScorer.name} (${data.topScorer.goals})` : "-"}</p>
              <p className="text-sm text-slate-600">Amarelos: {data.discipline.yellow}</p>
              <p className="text-sm text-slate-600">Vermelhos: {data.discipline.red}</p>
              <p className="text-sm text-slate-600">Suspensoes: {data.discipline.suspensions}</p>
            </article>

            <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-base font-black text-slate-900">Confrontos do ano vigente</h3>
              <p className="mt-2 text-sm text-slate-600">Time A: {data.confrontations.redWins}</p>
              <p className="text-sm text-slate-600">Time B: {data.confrontations.whiteWins}</p>
              <p className="text-sm text-slate-600">Empates: {data.confrontations.draws}</p>
              <p className="text-sm text-slate-600">Saldo: {data.confrontations.goalDifference}</p>
            </article>
          </div>

          <PerformancePanel data={comparison.current} title="Performance do ano vigente" />
          <GameResultsTable data={comparison.current} title="Resultados dos jogos do ano vigente" />
        </>
      ) : (
        <>
          <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-950">Arquivo histórico anual</h3>
                <p className="text-sm font-semibold text-slate-500">
                  Visualize anos encerrados e compare contra {year}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <label className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">
                  Comparar ano
                  <input
                    type="number"
                    min={1980}
                    max={2100}
                    value={compareYear}
                    onChange={(event) => setCompareYear(Number(event.target.value))}
                    className="ml-2 w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm font-black text-slate-800"
                  />
                </label>
                <label className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">
                  De
                  <input
                    type="number"
                    min={1980}
                    max={2100}
                    value={archiveFromYear}
                    onChange={(event) => setArchiveFromYear(Number(event.target.value))}
                    className="ml-2 w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm font-black text-slate-800"
                  />
                </label>
                <label className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">
                  Até
                  <input
                    type="number"
                    min={1980}
                    max={2100}
                    value={archiveToYear}
                    onChange={(event) => setArchiveToYear(Number(event.target.value))}
                    className="ml-2 w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm font-black text-slate-800"
                  />
                </label>
              </div>
            </div>
          </article>

          <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-lg font-black text-slate-950">Cadastrar presidente no histórico</h3>
            <form className="mt-3 grid gap-2 md:grid-cols-3 xl:grid-cols-6" onSubmit={(event) => {
              event.preventDefault();
              void createPresidentMutation.mutateAsync();
            }}>
              <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-2" placeholder="Nome" value={presidentForm.name} onChange={(event) => setPresidentForm((prev) => ({ ...prev, name: event.target.value }))} required />
              <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Inicio" type="number" min={1980} max={2100} value={presidentForm.startedYear} onChange={(event) => setPresidentForm((prev) => ({ ...prev, startedYear: event.target.value }))} required />
              <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Fim" type="number" min={1980} max={2100} value={presidentForm.endedYear} onChange={(event) => setPresidentForm((prev) => ({ ...prev, endedYear: event.target.value }))} />
              <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-2" placeholder="URL da foto" value={presidentForm.photoUrl} onChange={(event) => setPresidentForm((prev) => ({ ...prev, photoUrl: event.target.value }))} />
              <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-3" placeholder="Observação" value={presidentForm.note} onChange={(event) => setPresidentForm((prev) => ({ ...prev, note: event.target.value }))} />
              <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-2" placeholder="Feitos / gestão" value={presidentForm.achievements} onChange={(event) => setPresidentForm((prev) => ({ ...prev, achievements: event.target.value }))} />
              <button type="submit" disabled={createPresidentMutation.isPending} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-black text-white hover:bg-red-700 disabled:opacity-60">
                {createPresidentMutation.isPending ? "Salvando..." : "Salvar"}
              </button>
            </form>
          </article>

          <div className="grid gap-3 md:grid-cols-2">
            <MiniYearSummary data={comparison.current} />
            <MiniYearSummary data={comparison.previous} />
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <YearMetricCard label="Receitas no ano" current={comparison.current.finance.incomeCents} previous={comparison.previous.finance.incomeCents} delta={comparison.deltas.incomeCents} isCurrency />
            <YearMetricCard label="Despesas no ano" current={comparison.current.finance.expenseCents} previous={comparison.previous.finance.expenseCents} delta={comparison.deltas.expenseCents} isCurrency reverseTone />
            <YearMetricCard label="Saldo no ano" current={comparison.current.finance.balanceCents} previous={comparison.previous.finance.balanceCents} delta={comparison.deltas.balanceCents} isCurrency />
            <YearMetricCard label="Presenças" current={comparison.current.sports.presences} previous={comparison.previous.sports.presences} delta={comparison.deltas.presences} />
            <YearMetricCard label="Jogos" current={comparison.current.sports.games} previous={comparison.previous.sports.games} delta={comparison.deltas.games} />
            <YearMetricCard label="Gols" current={comparison.current.sports.goals} previous={comparison.previous.sports.goals} delta={comparison.deltas.goals} />
            <YearMetricCard label="Atletas ativos" current={comparison.current.members.activeAthletes} previous={comparison.previous.members.activeAthletes} delta={comparison.deltas.activeAthletes} />
            <YearMetricCard label="Associados ativos" current={comparison.current.members.activeAssociates} previous={comparison.previous.members.activeAssociates} delta={comparison.deltas.activeAssociates} />
          </div>

          <div className="grid gap-3 xl:grid-cols-2">
            <PerformancePanel data={comparison.current} title={`Performance ${comparison.current.year}`} />
            <PerformancePanel data={comparison.previous} title={`Performance historica ${comparison.previous.year}`} />
          </div>

          <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-black text-slate-950">Comparativo mês a mês</h3>
              <span className="text-xs font-bold text-slate-500">{comparison.current.year} x {comparison.previous.year}</span>
            </div>
            <div className="mt-3 overflow-auto">
              <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-[0.08em] text-slate-500">
                  <tr>
                    <th className="p-2">Mês</th>
                    <th className="p-2">Receita vigente</th>
                    <th className="p-2">Receita historica</th>
                    <th className="p-2">Saldo vigente</th>
                    <th className="p-2">Saldo histórico</th>
                    <th className="p-2">Jogos</th>
                    <th className="p-2">Presenças</th>
                    <th className="p-2">Gols</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.current.monthly.map((row, index) => {
                    const previous = comparison.previous.monthly[index];
                    return (
                      <tr key={row.month} className="border-t border-slate-100">
                        <td className="p-2 font-black text-slate-900">{monthLabels[row.month - 1]}</td>
                        <td className="p-2 font-bold text-emerald-700">{formatCurrency(row.incomeCents)}</td>
                        <td className="p-2 text-slate-600">{formatCurrency(previous.incomeCents)}</td>
                        <td className="p-2 font-bold text-slate-900">{formatCurrency(row.balanceCents)}</td>
                        <td className="p-2 text-slate-600">{formatCurrency(previous.balanceCents)}</td>
                        <td className="p-2 text-slate-700">{row.games} / {previous.games}</td>
                        <td className="p-2 text-slate-700">{row.presences} / {previous.presences}</td>
                        <td className="p-2 text-slate-700">{row.goals} / {previous.goals}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </article>

          <div className="grid gap-3 xl:grid-cols-2">
            <GameResultsTable data={comparison.current} title={`Fechamento dos jogos ${comparison.current.year}`} />
            <GameResultsTable data={comparison.previous} title={`Fechamento dos jogos ${comparison.previous.year}`} />
          </div>

          {archiveQuery.isLoading ? (
            <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-500 shadow-sm">Carregando arquivo histórico de {archiveFromYear} até {archiveToYear}...</div>
          ) : archiveQuery.data ? (
            <HistoricalArchivePanel archive={archiveQuery.data} />
          ) : (
            <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">Falha ao carregar arquivo histórico.</div>
          )}
        </>
      )}
    </section>
  );
}
