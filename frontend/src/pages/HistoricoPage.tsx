import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, BookOpenText, Landmark, Pencil, Shirt, Trophy, Users, WalletCards } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { apiRequest } from "../services/api";
import type { HistoricalArchiveReport, PresidentTerm, YearComparisonReport } from "../types/domain";

const currentYear = new Date().getFullYear();

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((cents || 0) / 100);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value || 0);
}

function hasYearData(year: HistoricalArchiveReport["yearClosures"][number]) {
  return year.finance.incomeCents > 0 || year.finance.expenseCents > 0 || year.sports.games > 0 || year.sports.goals > 0 || year.sports.presences > 0;
}

function emptyArchive(fromYear: number, toYear: number): HistoricalArchiveReport {
  const years = Array.from({ length: Math.max(0, toYear - fromYear + 1) }, (_, index) => fromYear + index);
  return {
    period: { fromYear, toYear },
    yearClosures: years.map((year) => ({
      year,
      finance: { incomeCents: 0, expenseCents: 0, balanceCents: 0, pendingCents: 0, overdueCents: 0 },
      sports: { games: 0, finishedGames: 0, goals: 0, presences: 0 }
    })),
    allTime: { scorers: [], winners: [] },
    scoringByYear: [],
    winsByYear: [],
    gameResults: [],
    presidents: [],
    boardTerms: [],
    uniformHistory: []
  };
}

function emptyYearSnapshot(year: number): YearComparisonReport["current"] {
  return {
    year,
    finance: {
      incomeCents: 0,
      expenseCents: 0,
      balanceCents: 0,
      pendingCents: 0,
      overdueCents: 0,
      paidMonthlyFeesCents: 0,
      paidMonthlyFeesCount: 0
    },
    sports: {
      games: 0,
      finishedGames: 0,
      goals: 0,
      lineups: 0,
      presences: 0,
      draftAttempts: 0,
      topScorer: null,
      performance: { scorers: [], wins: [], contributions: [], discipline: [] },
      results: [],
      discipline: { yellow: 0, red: 0, suspensions: 0, activeSuspensions: 0 },
      confrontations: {
        matches: 0,
        redWins: 0,
        whiteWins: 0,
        draws: 0,
        redGoals: 0,
        whiteGoals: 0,
        goalDifference: 0,
        lastMatch: null,
        bestStreak: null,
        biggestBlowout: null
      }
    },
    members: { activeAthletes: 0, createdAthletes: 0, activeAssociates: 0, createdAssociates: 0 },
    audit: { actions: 0 },
    monthly: []
  };
}

type Mode = "view" | "edit";
type EditType = "finance" | "game" | "president";
type ViewSection = "overview" | "games" | "rankings" | "finance" | "institutional" | "presidents";

export function HistoricoPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [fromYear, setFromYear] = useState(1980);
  const [toYear, setToYear] = useState(currentYear);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [activeDecade, setActiveDecade] = useState(Math.floor(currentYear / 10) * 10);
  const [mode, setMode] = useState<Mode>("view");
  const [editType, setEditType] = useState<EditType>("finance");
  const [viewSection, setViewSection] = useState<ViewSection>("overview");
  const [editingPresidentId, setEditingPresidentId] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{ title: string; description: string; run: () => Promise<unknown> } | null>(null);
  const [confirmationPassword, setConfirmationPassword] = useState("");
  const [confirmationError, setConfirmationError] = useState("");
  const [confirmationPending, setConfirmationPending] = useState(false);

  const [financeForm, setFinanceForm] = useState({
    type: "INCOME",
    category: "OTHER",
    description: "",
    amountBRL: "",
    status: "PAID",
    month: "1",
    costCenter: ""
  });
  const [gameForm, setGameForm] = useState({
    date: `${currentYear}-01-01`,
    location: "",
    redTeamName: "Time A",
    whiteTeamName: "Time B",
    redScore: "",
    whiteScore: "",
    note: ""
  });
  const [presidentForm, setPresidentForm] = useState({
    name: "",
    startedYear: String(currentYear),
    endedYear: "",
    photoUrl: "",
    note: "",
    achievements: ""
  });

  const archiveQuery = useQuery({
    queryKey: ["club-history-document", fromYear, toYear],
    queryFn: () => apiRequest<HistoricalArchiveReport>(`/reports/historical-archive?fromYear=${fromYear}&toYear=${toYear}`)
  });

  const selectedYearQuery = useQuery({
    queryKey: ["club-history-year", selectedYear],
    queryFn: () => apiRequest<YearComparisonReport>(`/reports/year-comparison?year=${selectedYear}&compareYear=${Math.max(1980, selectedYear - 1)}`)
  });

  const createFinanceMutation = useMutation({
    mutationFn: () =>
      apiRequest("/finance/entries", {
        method: "POST",
        body: JSON.stringify({
          type: financeForm.type,
          category: financeForm.category,
          description: financeForm.description,
          amountCents: Math.round(Number(financeForm.amountBRL.replace(",", ".")) * 100),
          competenceMonth: Number(financeForm.month),
          competenceYear: selectedYear,
          status: financeForm.status,
          costCenter: financeForm.costCenter || undefined,
          paidAt: financeForm.status === "PAID" ? new Date(Date.UTC(selectedYear, Number(financeForm.month) - 1, 1)).toISOString() : undefined
        })
      }),
    onSuccess: () => {
      setFinanceForm({ type: "INCOME", category: "OTHER", description: "", amountBRL: "", status: "PAID", month: "1", costCenter: "" });
      invalidateHistory();
    }
  });

  const createGameMutation = useMutation({
    mutationFn: async () => {
      const game = await apiRequest<{ id: string }>("/sports/games", {
        method: "POST",
        body: JSON.stringify({
          type: "INTERNAL",
          date: new Date(`${gameForm.date}T12:00:00`).toISOString(),
          location: gameForm.location,
          redTeamName: gameForm.redTeamName,
          whiteTeamName: gameForm.whiteTeamName,
          note: gameForm.note || undefined
        })
      });

      if (gameForm.redScore !== "" && gameForm.whiteScore !== "") {
        await apiRequest(`/sports/games/${game.id}/result`, {
          method: "PATCH",
          body: JSON.stringify({ redScore: Number(gameForm.redScore), whiteScore: Number(gameForm.whiteScore) })
        });
      }
    },
    onSuccess: () => {
      setGameForm({ date: `${selectedYear}-01-01`, location: "", redTeamName: "Time A", whiteTeamName: "Time B", redScore: "", whiteScore: "", note: "" });
      invalidateHistory();
    }
  });

  const savePresidentMutation = useMutation({
    mutationFn: () =>
      apiRequest(editingPresidentId ? `/president-terms/${editingPresidentId}` : "/president-terms", {
        method: editingPresidentId ? "PATCH" : "POST",
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
      setPresidentForm({ name: "", startedYear: String(selectedYear), endedYear: "", photoUrl: "", note: "", achievements: "" });
      setEditingPresidentId(null);
      invalidateHistory();
    }
  });

  function invalidateHistory() {
    void queryClient.invalidateQueries({ queryKey: ["club-history-document"] });
    void queryClient.invalidateQueries({ queryKey: ["club-history-year", selectedYear] });
  }

  function editPresident(president: PresidentTerm) {
    setMode("edit");
    setEditType("president");
    setEditingPresidentId(president.id);
    setPresidentForm({
      name: president.name,
      startedYear: String(president.startedYear),
      endedYear: president.endedYear ? String(president.endedYear) : "",
      photoUrl: president.photoUrl ?? "",
      note: president.note ?? "",
      achievements: president.achievements ?? ""
    });
  }

  function handlePresidentPhotoFile(file: File | null) {
    if (!file || !file.type.startsWith("image/")) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const photoUrl = reader.result;
      if (typeof photoUrl === "string") {
        setPresidentForm((current) => ({ ...current, photoUrl }));
      }
    };
    reader.readAsDataURL(file);
  }

  function requestHistoricalChange(title: string, description: string, run: () => Promise<unknown>) {
    setConfirmation({ title, description, run });
    setConfirmationPassword("");
    setConfirmationError("");
  }

  function selectHistoricalYear(year: number) {
    setSelectedYear(year);
    setActiveDecade(Math.floor(year / 10) * 10);
  }

  async function confirmHistoricalChange() {
    if (!confirmation) {
      return;
    }

    setConfirmationPending(true);
    setConfirmationError("");

    try {
      await apiRequest("/auth/reauth", {
        method: "POST",
        body: JSON.stringify({
          password: confirmationPassword,
          reason: confirmation.title,
          context: {
            year: selectedYear,
            section: editType,
            requestedBy: user ? { id: user.id, name: user.name, email: user.email, role: user.role, roles: user.roles } : null
          }
        })
      });

      await confirmation.run();
      setConfirmation(null);
      setConfirmationPassword("");
    } catch (error) {
      setConfirmationError(error instanceof Error ? error.message : "Não foi possível confirmar a alteração.");
    } finally {
      setConfirmationPending(false);
    }
  }

  const emptyArchiveData = emptyArchive(fromYear, toYear);
  const archiveRaw = archiveQuery.data;
  const archive: HistoricalArchiveReport = {
    ...emptyArchiveData,
    ...archiveRaw,
    period: archiveRaw?.period ?? emptyArchiveData.period,
    yearClosures: archiveRaw?.yearClosures ?? emptyArchiveData.yearClosures,
    allTime: {
      scorers: archiveRaw?.allTime?.scorers ?? [],
      winners: archiveRaw?.allTime?.winners ?? []
    },
    scoringByYear: archiveRaw?.scoringByYear ?? [],
    winsByYear: archiveRaw?.winsByYear ?? [],
    gameResults: archiveRaw?.gameResults ?? [],
    presidents: archiveRaw?.presidents ?? [],
    boardTerms: archiveRaw?.boardTerms ?? [],
    uniformHistory: archiveRaw?.uniformHistory ?? []
  };
  const archiveYearClosures = archive.yearClosures;
  const archivePresidents = archive.presidents;
  const archiveBoardTerms = archive.boardTerms;
  const archiveUniformHistory = archive.uniformHistory;
  const archiveScoringByYear = archive.scoringByYear;
  const emptySelectedYearDocument = emptyYearSnapshot(selectedYear);
  const selectedYearRaw = selectedYearQuery.data?.current;
  const selectedYearDocument: YearComparisonReport["current"] = {
    ...emptySelectedYearDocument,
    ...selectedYearRaw,
    finance: { ...emptySelectedYearDocument.finance, ...(selectedYearRaw?.finance ?? {}) },
    sports: {
      ...emptySelectedYearDocument.sports,
      ...(selectedYearRaw?.sports ?? {}),
      performance: {
        ...emptySelectedYearDocument.sports.performance,
        ...(selectedYearRaw?.sports?.performance ?? {}),
        scorers: selectedYearRaw?.sports?.performance?.scorers ?? [],
        wins: selectedYearRaw?.sports?.performance?.wins ?? [],
        contributions: selectedYearRaw?.sports?.performance?.contributions ?? [],
        discipline: selectedYearRaw?.sports?.performance?.discipline ?? []
      },
      results: selectedYearRaw?.sports?.results ?? [],
      discipline: { ...emptySelectedYearDocument.sports.discipline, ...(selectedYearRaw?.sports?.discipline ?? {}) },
      confrontations: { ...emptySelectedYearDocument.sports.confrontations, ...(selectedYearRaw?.sports?.confrontations ?? {}) }
    },
    members: { ...emptySelectedYearDocument.members, ...(selectedYearRaw?.members ?? {}) },
    audit: { ...emptySelectedYearDocument.audit, ...(selectedYearRaw?.audit ?? {}) },
    monthly: selectedYearRaw?.monthly ?? emptySelectedYearDocument.monthly
  };
  const selectedClosure = archiveYearClosures.find((item) => item.year === selectedYear);
  const yearsWithData = useMemo(() => archiveYearClosures.filter(hasYearData).length, [archiveYearClosures]);
  const decadeGroups = useMemo(() => {
    const grouped = new Map<number, HistoricalArchiveReport["yearClosures"]>();

    for (const item of archiveYearClosures) {
      const decade = Math.floor(item.year / 10) * 10;
      grouped.set(decade, [...(grouped.get(decade) ?? []), item]);
    }

    return Array.from(grouped.entries())
      .sort(([a], [b]) => b - a)
      .map(([decade, years]) => ({
        decade,
        years: years.sort((a, b) => b.year - a.year),
        yearsWithData: years.filter(hasYearData).length
      }));
  }, [archiveYearClosures]);
  const activeDecadeGroup = decadeGroups.find((group) => group.decade === activeDecade) ?? decadeGroups[0];
  const presidentDecadeGroups = useMemo(() => {
    const grouped = new Map<number, PresidentTerm[]>();
    for (const president of archivePresidents) {
      const startDecade = Math.floor(president.startedYear / 10) * 10;
      const endDecade = Math.floor((president.endedYear ?? president.startedYear) / 10) * 10;
      for (let decade = startDecade; decade <= endDecade; decade += 10) {
        grouped.set(decade, [...(grouped.get(decade) ?? []), president]);
      }
    }

    return Array.from(grouped.entries())
      .sort(([a], [b]) => b - a)
      .map(([decade, presidents]) => ({
        decade,
        presidents: presidents.sort((a, b) => b.startedYear - a.startedYear || a.name.localeCompare(b.name))
      }));
  }, [archivePresidents]);
  const presidentsInSelectedYear =
    archivePresidents.filter((president) => president.startedYear <= selectedYear && (president.endedYear ?? selectedYear) >= selectedYear);
  const mainPresident = presidentsInSelectedYear[0] ?? null;
  const boardTermsInSelectedYear =
    archiveBoardTerms.filter((term) => term.startedYear <= selectedYear && (term.endedYear ?? selectedYear) >= selectedYear);
  const uniformsInSelectedYear =
    archiveUniformHistory.filter((uniform) => uniform.seasonYear === selectedYear || uniform.seasonLabel.includes(String(selectedYear)));
  const scoringInSelectedYear = archiveScoringByYear.find((item) => item.year === selectedYear)?.topScorers ?? [];

  return (
    <section className="min-w-0 space-y-4">
      <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-950">Histórico do clube</h1>
            <p className="mt-1 max-w-3xl text-sm font-semibold text-slate-500">
              Consulte o arquivo anual do clube por períodos, temporadas, presidentes e registros históricos.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">
              De
              <input type="number" min={1980} max={2100} value={fromYear} onChange={(event) => setFromYear(Number(event.target.value))} className="ml-2 w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm font-black text-slate-800" />
            </label>
            <label className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">
              Até
              <input type="number" min={1980} max={2100} value={toYear} onChange={(event) => setToYear(Number(event.target.value))} className="ml-2 w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm font-black text-slate-800" />
            </label>
          </div>
        </div>
      </article>

      <div className="grid gap-3 md:grid-cols-3">
        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Período</p>
          <strong className="mt-2 block text-2xl font-black text-slate-950">{fromYear} - {toYear}</strong>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Anos com registro</p>
          <strong className="mt-2 block text-2xl font-black text-slate-950">{formatNumber(yearsWithData)}</strong>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Presidentes</p>
          <strong className="mt-2 block text-2xl font-black text-slate-950">{formatNumber(archivePresidents.length)}</strong>
        </article>
      </div>

      <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-0 xl:grid-cols-[18rem_minmax(0,1fr)]">
          <div className="border-b border-slate-200 bg-slate-50 p-4 xl:border-b-0 xl:border-r">
            <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Arquivo anual</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">Linha do tempo</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">Escolha um ciclo histórico e abra o arquivo do ano.</p>

            <label className="mt-4 block text-xs font-black uppercase tracking-[0.08em] text-slate-500">
              Ir para ano
              <select className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base font-black text-slate-900" value={selectedYear} onChange={(event) => selectHistoricalYear(Number(event.target.value))}>
                {archiveYearClosures.map((item) => (
                  <option key={item.year} value={item.year}>{item.year} - {hasYearData(item) ? "com dados" : "pendente"}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="min-w-0 p-4">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {archiveQuery.isLoading ? <p className="text-sm font-semibold text-slate-500">Carregando anos...</p> : null}
              {decadeGroups.map((group) => {
                const isActive = group.decade === activeDecadeGroup?.decade;
                const firstYear = group.years.at(-1)?.year ?? group.decade;
                const lastYear = group.years[0]?.year ?? group.decade + 9;

                return (
                  <button
                    key={group.decade}
                    type="button"
                    onClick={() => setActiveDecade(group.decade)}
                    className={`min-w-[9.5rem] rounded-lg border px-3 py-2 text-left transition ${isActive ? "border-red-500 bg-red-600 text-white shadow-[0_14px_24px_rgba(220,38,38,0.2)]" : "border-slate-200 bg-slate-50 text-slate-700 hover:border-red-200 hover:bg-white"}`}
                  >
                    <span className="block text-sm font-black">{firstYear} - {lastYear}</span>
                    <span className={`mt-0.5 block text-xs font-semibold ${isActive ? "text-red-100" : "text-slate-500"}`}>
                      {group.yearsWithData} de {group.years.length} com registros
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Arquivo por ciclo</p>
                  <h3 className="text-lg font-black text-slate-950">
                    {activeDecadeGroup ? `${activeDecadeGroup.decade} - ${activeDecadeGroup.decade + 9}` : "Sem anos"}
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2 text-[11px] font-black uppercase tracking-[0.06em]">
                  <span className="rounded-full bg-red-600 px-2 py-1 text-white">Selecionado</span>
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-700">Com dados</span>
                  <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-slate-500">Pendente</span>
                </div>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
                {(activeDecadeGroup?.years ?? []).map((item) => {
                  const hasData = hasYearData(item);
                  const isSelected = selectedYear === item.year;
                  const balance = item.finance.incomeCents - item.finance.expenseCents;

                  return (
                    <button
                      key={item.year}
                      type="button"
                      onClick={() => selectHistoricalYear(item.year)}
                      className={`min-h-24 rounded-lg border p-3 text-left transition ${isSelected ? "border-red-500 bg-red-600 text-white shadow-[0_14px_24px_rgba(220,38,38,0.18)]" : hasData ? "border-emerald-200 bg-white text-slate-900 hover:border-emerald-300" : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"}`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <strong className="text-xl font-black">{item.year}</strong>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${isSelected ? "bg-white/20 text-white" : hasData ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                          {hasData ? "Dados" : "Pendente"}
                        </span>
                      </span>
                      <span className={`mt-2 grid grid-cols-3 gap-1 text-xs font-bold ${isSelected ? "text-red-50" : "text-slate-500"}`}>
                        <span>{formatNumber(item.sports.games)} jogos</span>
                        <span>{formatNumber(item.sports.goals)} gols</span>
                        <span>{formatCurrency(balance)}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </article>

      <article className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black text-slate-950">Arquivo histórico de {selectedYear}</h2>
              <p className="text-sm font-semibold text-slate-500">{selectedClosure && hasYearData(selectedClosure) ? "Temporada com informações cadastradas no histórico do clube." : "Temporada ainda pendente de cadastro no histórico do clube."}</p>
            </div>
            <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
              <button type="button" onClick={() => setMode("view")} className={`rounded-md px-3 py-1.5 text-sm font-black ${mode === "view" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}>Visualizar</button>
              <button type="button" onClick={() => setMode("edit")} className={`rounded-md px-3 py-1.5 text-sm font-black ${mode === "edit" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}>Editar dados</button>
            </div>
          </div>
        </div>

        {mode === "view" ? (
          <div className="p-4">
            <div className="mb-4 flex gap-2 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-2">
              {[
                { key: "overview" as const, label: "Visão geral", icon: <BookOpenText size={16} /> },
                { key: "games" as const, label: "Jogos", icon: <Trophy size={16} /> },
                { key: "rankings" as const, label: "Artilharia", icon: <BarChart3 size={16} /> },
                { key: "finance" as const, label: "Financeiro", icon: <WalletCards size={16} /> },
                { key: "institutional" as const, label: "Diretoria e uniformes", icon: <Landmark size={16} /> },
                { key: "presidents" as const, label: "Presidentes", icon: <Landmark size={16} /> }
              ].map((item) => (
                <button key={item.key} type="button" onClick={() => setViewSection(item.key)} className={`flex shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-sm font-black ${viewSection === item.key ? "border-red-200 bg-white text-red-700 shadow-sm" : "border-transparent text-slate-600 hover:bg-white"}`}>
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>

            {viewSection === "overview" ? (
              <div className="grid gap-4 xl:grid-cols-[20rem_minmax(0,1fr)]">
                <aside className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                  <div className="aspect-[4/3] bg-slate-200">
                    {mainPresident.photoUrl ? <img src={mainPresident.photoUrl} alt={mainPresident.name} className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="p-4">
                    <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Presidente do ano</p>
                    <h3 className="mt-1 text-xl font-black text-slate-950">{mainPresident.name ?? "Não cadastrado"}</h3>
                    {mainPresident ? <p className="mt-1 text-sm font-semibold text-slate-500">{mainPresident.startedYear} - {mainPresident.endedYear ?? "atual"}</p> : null}
                    {mainPresident.note ? <p className="mt-3 text-sm text-slate-600">{mainPresident.note}</p> : null}
                    {mainPresident.achievements ? <p className="mt-3 text-xs font-semibold text-slate-500">{mainPresident.achievements}</p> : null}
                  </div>
                </aside>

                <div className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {[
                      { label: "Receitas", value: formatCurrency(selectedYearDocument.finance.incomeCents ?? 0) },
                      { label: "Despesas", value: formatCurrency(selectedYearDocument.finance.expenseCents ?? 0) },
                      { label: "Saldo", value: formatCurrency(selectedYearDocument.finance.balanceCents ?? 0) },
                      { label: "Jogos", value: formatNumber(selectedYearDocument.sports.games ?? 0) }
                    ].map((item) => (
                      <article key={item.label} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">{item.label}</p>
                        <strong className="mt-2 block text-xl font-black text-slate-950">{item.value}</strong>
                      </article>
                    ))}
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <article className="rounded-lg border border-slate-200 bg-white p-4">
                      <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Artilheiro</p>
                      <strong className="mt-2 block text-lg font-black text-slate-950">{selectedYearDocument.sports.topScorer?.name ?? "Sem registro"}</strong>
                      <span className="text-sm font-semibold text-slate-500">{formatNumber(selectedYearDocument.sports.topScorer?.goals ?? 0)} gols</span>
                    </article>
                    <article className="rounded-lg border border-slate-200 bg-white p-4">
                      <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Presenças</p>
                      <strong className="mt-2 block text-lg font-black text-slate-950">{formatNumber(selectedYearDocument.sports.presences ?? 0)}</strong>
                      <span className="text-sm font-semibold text-slate-500">participações registradas</span>
                    </article>
                    <article className="rounded-lg border border-slate-200 bg-white p-4">
                      <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Mensalidades</p>
                      <strong className="mt-2 block text-lg font-black text-slate-950">{formatCurrency(selectedYearDocument.finance.paidMonthlyFeesCents ?? 0)}</strong>
                      <span className="text-sm font-semibold text-slate-500">{formatNumber(selectedYearDocument.finance.paidMonthlyFeesCount ?? 0)} pagamentos</span>
                    </article>
                  </div>
                </div>
              </div>
            ) : null}

            {viewSection === "games" ? (
              <div className="overflow-auto rounded-lg border border-slate-200">
                <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-[0.08em] text-slate-500">
                    <tr>
                      <th className="p-3">Data</th>
                      <th className="p-3">Jogo</th>
                      <th className="p-3">Placar</th>
                      <th className="p-3">Resultado</th>
                      <th className="p-3">Local</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedYearDocument.sports.results ?? []).map((game) => {
                      const redName = game.redTeamName ?? "Time A";
                      const whiteName = game.whiteTeamName ?? "Time B";
                      const result = game.isDraw ? "Empate" : game.winnerSide === "RED" ? redName : game.winnerSide === "WHITE" ? whiteName : "-";
                      return (
                        <tr key={game.id} className="border-t border-slate-100">
                          <td className="p-3 font-bold text-slate-800">{new Date(game.date).toLocaleDateString("pt-BR")}</td>
                          <td className="p-3 text-slate-700">{redName} x {whiteName}</td>
                          <td className="p-3 font-black text-slate-950">{game.redScore ?? "-"} x {game.whiteScore ?? "-"}</td>
                          <td className="p-3 text-slate-700">{result}</td>
                          <td className="p-3 text-slate-600">{game.location}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {!selectedYearDocument.sports.results.length ? <p className="p-3 text-sm font-semibold text-slate-400">Nenhum jogo cadastrado neste ano.</p> : null}
              </div>
            ) : null}

            {viewSection === "rankings" ? (
              <div className="space-y-3">
                <article className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                  <div className="border-b border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.08em] text-red-600">Artilharia de {selectedYear}</p>
                    <h3 className="mt-1 text-xl font-black text-slate-950">Ranking completo de gols, assistências e participação</h3>
                    <p className="mt-1 text-sm font-semibold text-slate-500">Histórico anual preservado para consultar artilheiros de temporadas anteriores.</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left text-sm">
                      <thead className="bg-white text-xs font-black uppercase tracking-[0.08em] text-slate-500">
                        <tr>
                          <th className="px-3 py-3">#</th>
                          <th className="px-3 py-3">Atleta</th>
                          <th className="px-3 py-3 text-right">Gols</th>
                          <th className="px-3 py-3 text-right">Assistências</th>
                          <th className="px-3 py-3 text-right">Jogos</th>
                          <th className="px-3 py-3 text-right">Média</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {scoringInSelectedYear.map((row, index) => (
                          <tr key={`year-scorer-${row.athleteId}`}>
                            <td className="px-3 py-3 font-black text-slate-500">{index + 1}</td>
                            <td className="px-3 py-3 font-black text-slate-950">{row.name}</td>
                            <td className="px-3 py-3 text-right font-black text-red-600">{formatNumber(row.goals)}</td>
                            <td className="px-3 py-3 text-right font-semibold text-slate-700">{formatNumber(row.assists)}</td>
                            <td className="px-3 py-3 text-right font-semibold text-slate-700">{formatNumber(row.games)}</td>
                            <td className="px-3 py-3 text-right font-semibold text-slate-700">{row.games > 0 ? (row.goals / row.games).toFixed(2) : "0.00"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {!scoringInSelectedYear.length ? <p className="p-4 text-sm font-semibold text-slate-400">Sem artilharia cadastrada para este ano.</p> : null}
                </article>
                <div className="grid gap-3 xl:grid-cols-2">
                <article className="rounded-lg border border-slate-200 bg-white p-4">
                  <h3 className="font-black text-slate-950">Mais vitórias</h3>
                  <div className="mt-3 space-y-2">
                    {(selectedYearDocument.sports.performance.wins ?? []).slice(0, 10).map((row, index) => (
                      <div key={row.athleteId} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                        <span className="min-w-0 truncate font-bold text-slate-800">{index + 1}. {row.name}</span>
                        <strong className="shrink-0 text-slate-950">{formatNumber(row.wins)}</strong>
                      </div>
                    ))}
                    {!selectedYearDocument.sports.performance.wins.length ? <p className="text-sm font-semibold text-slate-400">Sem dados.</p> : null}
                  </div>
                </article>
                <article className="rounded-lg border border-slate-200 bg-white p-4">
                  <h3 className="font-black text-slate-950">Contribuições</h3>
                  <div className="mt-3 space-y-2">
                    {(selectedYearDocument.sports.performance.contributions ?? []).slice(0, 10).map((row, index) => (
                      <div key={row.athleteId} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                        <span className="min-w-0 truncate font-bold text-slate-800">{index + 1}. {row.name}</span>
                        <strong className="shrink-0 text-slate-950">{formatNumber(row.total)}</strong>
                      </div>
                    ))}
                    {!selectedYearDocument.sports.performance.contributions.length ? <p className="text-sm font-semibold text-slate-400">Sem dados.</p> : null}
                  </div>
                </article>
                </div>
              </div>
            ) : null}

            {viewSection === "finance" ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {[
                  { label: "Receitas", value: formatCurrency(selectedYearDocument.finance.incomeCents ?? 0) },
                  { label: "Despesas", value: formatCurrency(selectedYearDocument.finance.expenseCents ?? 0) },
                  { label: "Saldo", value: formatCurrency(selectedYearDocument.finance.balanceCents ?? 0) },
                  { label: "Pendente", value: formatCurrency(selectedYearDocument.finance.pendingCents ?? 0) },
                  { label: "Vencido", value: formatCurrency(selectedYearDocument.finance.overdueCents ?? 0) },
                  { label: "Mensalidades pagas", value: `${formatNumber(selectedYearDocument.finance.paidMonthlyFeesCount ?? 0)} registros` }
                ].map((item) => (
                  <article key={item.label} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">{item.label}</p>
                    <strong className="mt-2 block text-xl font-black text-slate-950">{item.value}</strong>
                  </article>
                ))}
              </div>
            ) : null}

            {viewSection === "institutional" ? (
              <div className="space-y-4">
                <section className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Diretoria de {selectedYear}</p>
                      <h3 className="mt-1 text-xl font-black text-slate-950">Associados por cargo e finalidade</h3>
                      <p className="mt-1 text-sm font-semibold text-slate-500">Registro histórico preservado quando um associado é vinculado ou removido da diretoria.</p>
                    </div>
                    <Users size={22} className="text-slate-400" />
                  </div>
                  <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full min-w-[760px] text-left text-sm">
                      <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.08em] text-slate-500">
                        <tr>
                          <th className="px-3 py-3">Associado</th>
                          <th className="px-3 py-3">Cargo</th>
                          <th className="px-3 py-3">Período</th>
                          <th className="px-3 py-3">Finalidade</th>
                          <th className="px-3 py-3">Acessos</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {boardTermsInSelectedYear.map((term) => (
                          <tr key={`board-term-${term.id}`}>
                            <td className="px-3 py-3 font-black text-slate-950">{term.associate.name}</td>
                            <td className="px-3 py-3 font-semibold text-slate-700">{term.boardRole.name}</td>
                            <td className="px-3 py-3 font-semibold text-slate-600">{term.startedYear} - {term.endedYear ?? "atual"}</td>
                            <td className="max-w-[22rem] px-3 py-3 text-slate-600">{term.boardRole.description ?? term.note ?? "-"}</td>
                            <td className="px-3 py-3">
                              <div className="flex flex-wrap gap-1">
                                {term.boardRole.canAccessAdmin ? <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-black text-blue-700">Admin</span> : null}
                                {term.boardRole.canAccessFinancial ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700">Financeiro</span> : null}
                                {term.boardRole.canAccessAthlete ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-600">Atleta</span> : null}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {!boardTermsInSelectedYear.length ? <p className="mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-semibold text-slate-500">Nenhuma diretoria por cargo registrada para {selectedYear}.</p> : null}
                </section>

                <section className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Uniformes de {selectedYear}</p>
                      <h3 className="mt-1 text-xl font-black text-slate-950">Modelos utilizados na temporada</h3>
                      <p className="mt-1 text-sm font-semibold text-slate-500">Cada uniforme salvo em Configurações com ano/temporada entra no acervo.</p>
                    </div>
                    <Shirt size={22} className="text-slate-400" />
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {uniformsInSelectedYear.map((uniform) => (
                      <article key={`uniform-history-${uniform.id}`} className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                        <div className="flex min-h-28 items-center gap-3 p-3">
                          <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-lg border border-slate-200 bg-white" style={{ backgroundColor: uniform.imageUrl ? undefined : uniform.color }}>
                            {uniform.imageUrl ? <img src={uniform.imageUrl} alt={uniform.name} className="h-full w-full object-contain" /> : <Shirt size={26} className="text-white" />}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-black text-slate-950">{uniform.name}</p>
                            <p className="text-xs font-semibold text-slate-500">{uniform.side === "TIME_A" ? "Time A" : "Time B"} · {uniform.seasonLabel}</p>
                            <p className="mt-1 font-mono text-xs font-bold text-slate-500">{uniform.color}</p>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                  {!uniformsInSelectedYear.length ? <p className="mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-semibold text-slate-500">Nenhum uniforme registrado para {selectedYear}.</p> : null}
                </section>
              </div>
            ) : null}

            {viewSection === "presidents" ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Acervo da diretoria</p>
                  <h3 className="mt-1 text-xl font-black text-slate-950">Presidentes históricos por década</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Organize as fotos e mandatos dos presidentes por ciclo histórico. Um presidente com mandato atravessando décadas aparece em cada década correspondente.
                  </p>
                </div>

                {presidentDecadeGroups.map((group) => (
                  <section key={`president-decade-${group.decade}`} className="rounded-lg border border-slate-200 bg-white p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Década</p>
                        <h3 className="text-lg font-black text-slate-950">{group.decade} - {group.decade + 9}</h3>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">
                        {group.presidents.length} presidente{group.presidents.length === 1 ? "" : "s"}
                      </span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      {group.presidents.map((president) => (
                        <article key={`${group.decade}-${president.id}`} className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                          <div className="aspect-[4/3] bg-slate-200">
                            {president.photoUrl ? (
                              <img src={president.photoUrl} alt={president.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="grid h-full place-items-center bg-slate-100 text-center text-sm font-black text-slate-400">
                                Sem foto
                              </div>
                            )}
                          </div>
                          <div className="space-y-2 p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h4 className="truncate font-black text-slate-950">{president.name}</h4>
                                <p className="text-xs font-semibold text-slate-500">{president.startedYear} - {president.endedYear ?? "atual"}</p>
                              </div>
                              <button type="button" onClick={() => editPresident(president)} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" title="Editar presidente">
                                <Pencil size={16} />
                              </button>
                            </div>
                            {president.note ? <p className="text-sm text-slate-600">{president.note}</p> : null}
                            {president.achievements ? <p className="text-xs font-semibold text-slate-500">{president.achievements}</p> : null}
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                ))}

                {!presidentDecadeGroups.length ? (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm font-semibold text-slate-500">
                    Nenhum presidente cadastrado ainda. Use “Editar dados” e “Presidente” para montar o acervo histórico.
                  </div>
                ) : null}

                {presidentsInSelectedYear.length > 0 ? (
                  <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.08em] text-emerald-700">Diretoria de {selectedYear}</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {presidentsInSelectedYear.map((president) => (
                        <div key={`selected-year-president-${president.id}`} className="rounded-lg border border-emerald-200 bg-white px-3 py-2">
                          <p className="font-black text-slate-950">{president.name}</p>
                          <p className="text-xs font-semibold text-slate-500">{president.startedYear} - {president.endedYear ?? "atual"}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-4 p-4 xl:grid-cols-[16rem_minmax(0,1fr)]">
            <aside className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="mb-3 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Cadastrar no ano</p>
              {[
                { key: "finance" as const, label: "Financeiro", icon: <WalletCards size={16} /> },
                { key: "game" as const, label: "Jogo", icon: <Trophy size={16} /> },
                { key: "president" as const, label: "Presidente", icon: <Landmark size={16} /> }
              ].map((item) => (
                <button key={item.key} type="button" onClick={() => setEditType(item.key)} className={`mb-2 flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm font-black ${editType === item.key ? "border-red-300 bg-white text-red-700" : "border-slate-200 bg-white text-slate-700"}`}>
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </aside>

            <div className="rounded-lg border border-slate-200 bg-white p-4">
              {editType === "finance" ? (
                <form
                  className="grid gap-3 md:grid-cols-2 xl:grid-cols-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    requestHistoricalChange(
                      `Adicionar financeiro em ${selectedYear}`,
                      "Esta alteração entra no histórico financeiro do clube e ficará vinculada ao usuário logado.",
                      () => createFinanceMutation.mutateAsync()
                    );
                  }}
                >
                  <h3 className="text-lg font-black text-slate-950 md:col-span-2 xl:col-span-3">Adicionar financeiro em {selectedYear}</h3>
                  <select className="rounded-lg border border-slate-200 px-3 py-2 text-sm" value={financeForm.type} onChange={(event) => setFinanceForm((prev) => ({ ...prev, type: event.target.value, category: event.target.value === "INCOME" ? "OTHER" : "ADMINISTRATIVE" }))}>
                    <option value="INCOME">Receita</option>
                    <option value="EXPENSE">Despesa</option>
                  </select>
                  <select className="rounded-lg border border-slate-200 px-3 py-2 text-sm" value={financeForm.category} onChange={(event) => setFinanceForm((prev) => ({ ...prev, category: event.target.value }))}>
                    <option value="MONTHLY_FEE">Mensalidade</option>
                    <option value="EVENTS">Eventos</option>
                    <option value="SPONSORSHIP">Patrocínio</option>
                    <option value="FUNDRAISING">Arrecadação</option>
                    <option value="FIELD">Campo</option>
                    <option value="REFEREE">Arbitragem</option>
                    <option value="GOALKEEPER_CONTRACT">Goleiro</option>
                    <option value="UNIFORMS">Uniformes</option>
                    <option value="ADMINISTRATIVE">Administrativo</option>
                    <option value="OTHER">Outros</option>
                  </select>
                  <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Mês" type="number" min={1} max={12} value={financeForm.month} onChange={(event) => setFinanceForm((prev) => ({ ...prev, month: event.target.value }))} />
                  <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Valor R$" value={financeForm.amountBRL} onChange={(event) => setFinanceForm((prev) => ({ ...prev, amountBRL: event.target.value }))} required />
                  <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-2" placeholder="Descrição" value={financeForm.description} onChange={(event) => setFinanceForm((prev) => ({ ...prev, description: event.target.value }))} required />
                  <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Centro de custo" value={financeForm.costCenter} onChange={(event) => setFinanceForm((prev) => ({ ...prev, costCenter: event.target.value }))} />
                  <button type="submit" disabled={createFinanceMutation.isPending} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-black text-white disabled:opacity-60">{createFinanceMutation.isPending ? "Salvando..." : "Salvar"}</button>
                </form>
              ) : null}

              {editType === "game" ? (
                <form
                  className="grid gap-3 md:grid-cols-2 xl:grid-cols-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    requestHistoricalChange(
                      `Adicionar jogo em ${selectedYear}`,
                      "Esta alteração entra no histórico esportivo do clube e ficará vinculada ao usuário logado.",
                      () => createGameMutation.mutateAsync()
                    );
                  }}
                >
                  <h3 className="text-lg font-black text-slate-950 md:col-span-2 xl:col-span-3">Adicionar jogo em {selectedYear}</h3>
                  <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm" type="date" value={gameForm.date} onChange={(event) => setGameForm((prev) => ({ ...prev, date: event.target.value }))} required />
                  <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-2" placeholder="Local" value={gameForm.location} onChange={(event) => setGameForm((prev) => ({ ...prev, location: event.target.value }))} required />
                  <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Time 1" value={gameForm.redTeamName} onChange={(event) => setGameForm((prev) => ({ ...prev, redTeamName: event.target.value }))} />
                  <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Time 2" value={gameForm.whiteTeamName} onChange={(event) => setGameForm((prev) => ({ ...prev, whiteTeamName: event.target.value }))} />
                  <div className="grid grid-cols-2 gap-2">
                    <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Placar 1" type="number" min={0} value={gameForm.redScore} onChange={(event) => setGameForm((prev) => ({ ...prev, redScore: event.target.value }))} />
                    <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Placar 2" type="number" min={0} value={gameForm.whiteScore} onChange={(event) => setGameForm((prev) => ({ ...prev, whiteScore: event.target.value }))} />
                  </div>
                  <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-2" placeholder="Observação" value={gameForm.note} onChange={(event) => setGameForm((prev) => ({ ...prev, note: event.target.value }))} />
                  <button type="submit" disabled={createGameMutation.isPending} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-black text-white disabled:opacity-60">{createGameMutation.isPending ? "Salvando..." : "Salvar"}</button>
                </form>
              ) : null}

              {editType === "president" ? (
                <div className="space-y-4">
                  <form
                    className="grid gap-3 md:grid-cols-2 xl:grid-cols-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      requestHistoricalChange(
                        editingPresidentId ? `Editar presidente em ${selectedYear}` : `Adicionar presidente em ${selectedYear}`,
                        "Esta alteração entra na galeria histórica de presidentes e ficará vinculada ao usuário logado.",
                        () => savePresidentMutation.mutateAsync()
                      );
                    }}
                  >
                    <h3 className="text-lg font-black text-slate-950 md:col-span-2 xl:col-span-3">{editingPresidentId ? "Editar presidente" : "Adicionar presidente"}</h3>
                    <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Nome" value={presidentForm.name} onChange={(event) => setPresidentForm((prev) => ({ ...prev, name: event.target.value }))} required />
                    <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Início" type="number" min={1980} max={2100} value={presidentForm.startedYear} onChange={(event) => setPresidentForm((prev) => ({ ...prev, startedYear: event.target.value }))} required />
                    <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Fim" type="number" min={1980} max={2100} value={presidentForm.endedYear} onChange={(event) => setPresidentForm((prev) => ({ ...prev, endedYear: event.target.value }))} />
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 md:col-span-2">
                      <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Foto do presidente</p>
                      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-lg border border-slate-200 bg-white text-xs font-black text-slate-400">
                          {presidentForm.photoUrl ? <img src={presidentForm.photoUrl} alt="Foto do presidente" className="h-full w-full object-cover" /> : "Sem foto"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <label className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-black text-white hover:bg-red-700">
                            Carregar foto
                            <input type="file" accept="image/*" className="sr-only" onChange={(event) => handlePresidentPhotoFile(event.target.files?.[0] ?? null)} />
                          </label>
                          <input
                            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                            placeholder="Ou cole uma URL https://"
                            value={presidentForm.photoUrl}
                            onChange={(event) => setPresidentForm((prev) => ({ ...prev, photoUrl: event.target.value }))}
                          />
                        </div>
                      </div>
                    </div>
                    <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Observação" value={presidentForm.note} onChange={(event) => setPresidentForm((prev) => ({ ...prev, note: event.target.value }))} />
                    <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-2" placeholder="Feitos da gestão" value={presidentForm.achievements} onChange={(event) => setPresidentForm((prev) => ({ ...prev, achievements: event.target.value }))} />
                    <button type="submit" disabled={savePresidentMutation.isPending} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-black text-white disabled:opacity-60">{savePresidentMutation.isPending ? "Salvando..." : "Salvar"}</button>
                  </form>

                  <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {archivePresidents.map((president) => (
                      <button key={president.id} type="button" onClick={() => editPresident(president)} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-left hover:bg-slate-100">
                        <strong className="text-slate-950">{president.name}</strong>
                        <p className="text-xs font-semibold text-slate-500">{president.startedYear} - {president.endedYear ?? "atual"}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </article>

      {confirmation ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4">
          <form
            className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-5 shadow-2xl"
            onSubmit={(event) => {
              event.preventDefault();
              void confirmHistoricalChange();
            }}
          >
            <p className="text-xs font-black uppercase tracking-[0.08em] text-red-600">Confirmação obrigatória</p>
            <h3 className="mt-2 text-xl font-black text-slate-950">{confirmation.title}</h3>
            <p className="mt-2 text-sm font-semibold text-slate-600">{confirmation.description}</p>
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
              Você está alterando um registro histórico de {selectedYear}. A senha será validada novamente e o usuário solicitante ficará registrado na auditoria.
            </div>
            <label className="mt-4 block text-sm font-black text-slate-700">
              Senha do usuário logado
              <input
                type="password"
                minLength={6}
                value={confirmationPassword}
                onChange={(event) => setConfirmationPassword(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-red-300 focus:ring"
                autoFocus
                required
              />
            </label>
            {confirmationError ? <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2 text-sm font-bold text-red-700">{confirmationError}</p> : null}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmation(null);
                  setConfirmationPassword("");
                  setConfirmationError("");
                }}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
                disabled={confirmationPending}
              >
                Cancelar
              </button>
              <button type="submit" disabled={confirmationPending} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-black text-white disabled:opacity-60">
                {confirmationPending ? "Confirmando..." : "Confirmar e salvar"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}
