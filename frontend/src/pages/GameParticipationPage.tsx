import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useOutletContext } from "react-router-dom";
import { ArrowRightLeft, CalendarClock, CheckCircle2, Clock3, Printer, Save, Shield, Target, Trash2, Users } from "lucide-react";
import { apiRequest } from "../services/api";
import type { Game, GameEvent, GameEventType, GameLineup, GameSubstitution, TeamSide } from "../types/domain";
import { invalidateLineupQueries } from "../utils/lineupQueries";

type OutletPeriod = {
  month: number;
  year: number;
};

type TimelineItem =
  | {
      kind: "event";
      id: string;
      minute: number | null;
      createdAt: string;
      event: GameEvent;
    }
  | {
      kind: "substitution";
      id: string;
      minute: number | null;
      createdAt: string;
      substitution: GameSubstitution;
    };

const sideLabels: Record<TeamSide, string> = {
  RED: "Time A",
  WHITE: "Time B",
  EXTERNAL: "Adversário"
};

const roleLabels: Record<string, string> = {
  STARTER: "Titular",
  RESERVE: "Reserva",
  GOALKEEPER: "Goleiro",
  ABSENT: "Ausente"
};

const roleOrder: Record<string, number> = {
  GOALKEEPER: 0,
  STARTER: 1,
  RESERVE: 2,
  ABSENT: 3
};

const eventLabels: Record<GameEventType, string> = {
  GOAL: "Gol",
  ASSIST: "Assistência",
  YELLOW_CARD: "Cartão amarelo",
  RED_CARD: "Cartão vermelho"
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function eventBadgeClass(type: GameEventType) {
  if (type === "GOAL") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  }
  if (type === "ASSIST") {
    return "bg-sky-50 text-sky-700 ring-sky-100";
  }
  if (type === "YELLOW_CARD") {
    return "bg-amber-50 text-amber-700 ring-amber-100";
  }
  return "bg-red-50 text-red-700 ring-red-100";
}

function sortTimeline(items: TimelineItem[]) {
  return [...items].sort((a, b) => {
    const minuteA = a.minute ?? 999;
    const minuteB = b.minute ?? 999;
    if (minuteA !== minuteB) {
      return minuteA - minuteB;
    }
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

function getElapsedSeconds(game: Game | null) {
  if (!game) {
    return 0;
  }

  if (game.status === "RUNNING" && game.startedAt) {
    return Math.max(0, game.elapsedSeconds + Math.floor((Date.now() - new Date(game.startedAt).getTime()) / 1000));
  }

  if (game.status === "SCHEDULED") {
    const scheduledElapsed = Math.floor((Date.now() - new Date(game.date).getTime()) / 1000);
    if (scheduledElapsed >= 0 && scheduledElapsed <= 6 * 60 * 60) {
      return scheduledElapsed;
    }
  }

  return Math.max(0, game.elapsedSeconds);
}

function formatClock(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function matchPhase(game: Game, elapsedSeconds: number) {
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  if (elapsedMinutes < game.halfDurationMinutes) {
    return "1º tempo";
  }
  if (elapsedMinutes < game.halfDurationMinutes + game.breakDurationMinutes) {
    return "Intervalo";
  }
  if (elapsedMinutes < game.halfDurationMinutes * 2 + game.breakDurationMinutes) {
    return "2º tempo";
  }
  return "Tempo final";
}

function lineupPayload(lineup: GameLineup, presence: boolean) {
  return {
    athleteId: lineup.athleteId,
    side: lineup.side,
    role: lineup.role,
    presence,
    jerseyNumber: lineup.jerseyNumber ?? undefined,
    shirtName: lineup.shirtName ?? undefined
  };
}

function sortLineupsForSummary(lineups: GameLineup[]) {
  return [...lineups].sort((first, second) => {
    const roleDiff = (roleOrder[first.role] ?? 99) - (roleOrder[second.role] ?? 99);
    if (roleDiff !== 0) return roleDiff;
    const slotDiff = (first.tacticalSlot ?? 999) - (second.tacticalSlot ?? 999);
    if (slotDiff !== 0) return slotDiff;
    const numberDiff = (first.jerseyNumber ?? 999) - (second.jerseyNumber ?? 999);
    if (numberDiff !== 0) return numberDiff;
    return first.athlete.name.localeCompare(second.athlete.name);
  });
}

function parseJerseyNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 999) {
    return undefined;
  }

  return parsed;
}

function EmptyState({ message }: { message: string }) {
  return <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">{message}</div>;
}

const miniPitchSlots = [
  { x: 8, y: 50 },
  { x: 24, y: 18 },
  { x: 24, y: 39 },
  { x: 24, y: 61 },
  { x: 24, y: 82 },
  { x: 48, y: 28 },
  { x: 48, y: 50 },
  { x: 48, y: 72 },
  { x: 78, y: 22 },
  { x: 84, y: 50 },
  { x: 78, y: 78 }
];

function escapePrintText(value: string | number | null | undefined) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type ParticipacaoPageRealProps = {
  embedded?: boolean;
  initialGameId?: string | null;
  showPresenceControls?: boolean;
};

export function ParticipacaoPageReal({ embedded = false, initialGameId = null, showPresenceControls = true }: ParticipacaoPageRealProps = {}) {
  const { year } = useOutletContext<OutletPeriod>();
  const queryClient = useQueryClient();
  const [selectedGameId, setSelectedGameId] = useState(initialGameId ?? "");
  const [eventForm, setEventForm] = useState({
    athleteId: "",
    type: "GOAL" as GameEventType,
    minute: "",
    note: ""
  });
  const [substitutionForm, setSubstitutionForm] = useState({
    athleteOutId: "",
    athleteInId: "",
    minute: "",
    note: ""
  });
  const [matchSettingsForm, setMatchSettingsForm] = useState({
    halfDurationMinutes: "45",
    breakDurationMinutes: "15"
  });
  const [clockTick, setClockTick] = useState(0);

  const gamesQuery = useQuery({
    queryKey: ["sports-games", year, "participation"],
    queryFn: () => apiRequest<Game[]>(`/sports/games?year=${year}`)
  });

  const games = useMemo(() => gamesQuery.data ?? [], [gamesQuery.data]);
  const selectedGame = games.find((game) => game.id === selectedGameId) ?? null;
  const elapsedSeconds = getElapsedSeconds(selectedGame);
  const currentMinute = Math.min(130, Math.floor(elapsedSeconds / 60));
  const lineups = selectedGame?.lineups ?? [];
  const activeLineups = lineups.filter((lineup) => lineup.role !== "ABSENT");
  const fieldLineups = activeLineups.filter((lineup) => lineup.role === "STARTER" || lineup.role === "GOALKEEPER");
  const reserveLineups = activeLineups.filter((lineup) => lineup.role === "RESERVE");
  const presentLineups = activeLineups.filter((lineup) => lineup.presence);
  const teamName = (side: TeamSide) =>
    side === "RED" ? (selectedGame?.redTeamName ?? sideLabels.RED) : side === "WHITE" ? (selectedGame?.whiteTeamName ?? sideLabels.WHITE) : sideLabels.EXTERNAL;
  const lineupOptionLabel = (lineup: GameLineup) =>
    `${lineup.jerseyNumber !== null ? `#${lineup.jerseyNumber} - ` : ""}${lineup.athlete.name} - ${teamName(lineup.side)}`;
  const redTeamLineups = sortLineupsForSummary(activeLineups.filter((lineup) => lineup.side === "RED"));
  const whiteTeamLineups = sortLineupsForSummary(activeLineups.filter((lineup) => lineup.side === "WHITE"));
  const externalTeamLineups = sortLineupsForSummary(activeLineups.filter((lineup) => lineup.side === "EXTERNAL"));
  const events = selectedGame?.events ?? [];
  const substitutions = selectedGame?.substitutions ?? [];
  const lineupByAthleteId = new Map(lineups.map((lineup) => [lineup.athleteId, lineup]));
  const timeline = sortTimeline([
    ...events.map((event) => ({ kind: "event" as const, id: event.id, minute: event.minute, createdAt: event.createdAt, event })),
    ...substitutions.map((substitution) => ({
      kind: "substitution" as const,
      id: substitution.id,
      minute: substitution.minute,
      createdAt: substitution.createdAt,
      substitution
    }))
  ]);
  const latestDraftAttempt = (selectedGame?.draftHistory ?? []).slice().sort((first, second) => second.attemptNumber - first.attemptNumber)[0] ?? null;
  const draftTeamGroups = latestDraftAttempt
    ? [
        { title: teamName("RED"), starters: latestDraftAttempt.redSnapshot ?? [], bench: latestDraftAttempt.redBenchSnapshot ?? [] },
        { title: teamName("WHITE"), starters: latestDraftAttempt.whiteSnapshot ?? [], bench: latestDraftAttempt.whiteBenchSnapshot ?? [] }
      ]
    : [];
  const crestForSide = (side: TeamSide) =>
    side === "RED"
      ? selectedGame?.redCrestUrl ?? selectedGame?.homeClub?.logoUrl ?? null
      : side === "WHITE"
        ? selectedGame?.whiteCrestUrl ?? selectedGame?.awayClub?.logoUrl ?? null
        : null;
  const miniPitchForTeam = (rows: GameLineup[]) => {
    const fieldRows = sortLineupsForSummary(rows.filter((lineup) => lineup.role === "STARTER" || lineup.role === "GOALKEEPER")).slice(0, 11);

    return (
      <div className="relative mx-3 mt-3 aspect-[1.75] overflow-hidden rounded-lg border border-emerald-200 bg-[#2f8f45]">
        <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.05)_0px,rgba(255,255,255,0.05)_28px,rgba(0,0,0,0.04)_28px,rgba(0,0,0,0.04)_56px)]" />
        <svg className="absolute inset-2 h-[calc(100%-1rem)] w-[calc(100%-1rem)]" viewBox="0 0 105 68" preserveAspectRatio="none" aria-hidden="true">
          <g fill="none" stroke="#ffffff" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.58" strokeWidth="0.8" vectorEffect="non-scaling-stroke">
            <rect x="1" y="1" width="103" height="66" />
            <line x1="52.5" y1="1" x2="52.5" y2="67" />
            <circle cx="52.5" cy="34" r="9.15" />
            <path d="M1 13.84 H17.5 V54.16 H1" />
            <path d="M104 13.84 H87.5 V54.16 H104" />
          </g>
        </svg>
        {fieldRows.map((lineup, index) => {
          const slotIndex = Math.max(0, Math.min(10, (lineup.tacticalSlot ?? index + 1) - 1));
          const slot = miniPitchSlots[slotIndex];
          return (
            <span
              key={`mini-pitch-${lineup.id}`}
              className="absolute grid size-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/80 bg-white text-[11px] font-black text-slate-950 shadow-sm"
              style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
              title={lineup.athlete.name}
            >
              {lineup.jerseyNumber ?? slotIndex + 1}
            </span>
          );
        })}
      </div>
    );
  };

  useEffect(() => {
    if (initialGameId) {
      setSelectedGameId(initialGameId);
    }
  }, [initialGameId]);

  useEffect(() => {
    if (!selectedGame) {
      return;
    }

    setMatchSettingsForm({
      halfDurationMinutes: String(selectedGame.halfDurationMinutes),
      breakDurationMinutes: String(selectedGame.breakDurationMinutes)
    });
  }, [selectedGame]);

  useEffect(() => {
    const scheduledElapsed = selectedGame ? Math.floor((Date.now() - new Date(selectedGame.date).getTime()) / 1000) : -1;
    const isScheduledClockActive = selectedGame?.status === "SCHEDULED" && scheduledElapsed >= 0 && scheduledElapsed <= 6 * 60 * 60;
    if (selectedGame?.status !== "RUNNING" && !isScheduledClockActive) {
      return;
    }

    const interval = window.setInterval(() => setClockTick((value) => value + 1), 1000);
    return () => window.clearInterval(interval);
  }, [selectedGame]);

  void clockTick;

  const selectedEventLineup = eventForm.athleteId ? lineupByAthleteId.get(eventForm.athleteId) : null;
  const selectedOutLineup = substitutionForm.athleteOutId ? lineupByAthleteId.get(substitutionForm.athleteOutId) : null;
  const substitutionEntryOptions = (reserveLineups.length > 0 ? reserveLineups : activeLineups)
    .filter((lineup) => lineup.athleteId !== substitutionForm.athleteOutId)
    .filter((lineup) => !selectedOutLineup || lineup.side === selectedOutLineup.side);
  const launchTeamIndicator = (lineup: GameLineup | null, fallback: string) => (
    <div className={`mb-3 flex min-h-12 items-center justify-between gap-3 rounded-lg border px-3 py-2 ${
      lineup ? "border-red-100 bg-red-50 text-red-700" : "border-slate-200 bg-slate-50 text-slate-500"
    }`}>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.08em]">Time em edição</p>
        <p className="truncate text-sm font-black text-slate-950">{lineup ? teamName(lineup.side) : fallback}</p>
      </div>
      {lineup && crestForSide(lineup.side) ? (
        <img src={crestForSide(lineup.side) ?? ""} alt="" className="size-8 shrink-0 rounded-full border border-white bg-white object-contain p-0.5 shadow-sm" />
      ) : (
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white text-xs font-black text-slate-400 ring-1 ring-slate-200">?</span>
      )}
    </div>
  );

  const invalidateGames = () => {
    void queryClient.invalidateQueries({ queryKey: ["sports-games"] });
    void queryClient.invalidateQueries({ queryKey: ["sports-scorers"] });
    void queryClient.invalidateQueries({ queryKey: ["sports-discipline"] });
    void queryClient.invalidateQueries({ queryKey: ["sports-active-suspensions"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard-tactical-games"] });
  };

  const matchSettingsMutation = useMutation({
    mutationFn: () =>
      selectedGame ? apiRequest(`/sports/games/${selectedGame.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          halfDurationMinutes: Number(matchSettingsForm.halfDurationMinutes),
          breakDurationMinutes: Number(matchSettingsForm.breakDurationMinutes)
        })
      }) : Promise.reject(new Error("Selecione um jogo.")),
    onSuccess: invalidateGames
  });

  const clockMutation = useMutation({
    mutationFn: (action: "START" | "HALFTIME" | "SECOND_HALF" | "PAUSE" | "RESUME" | "FINISH" | "RESET") =>
      selectedGame ? apiRequest(`/sports/games/${selectedGame.id}/clock`, {
        method: "PATCH",
        body: JSON.stringify({ action })
      }) : Promise.reject(new Error("Selecione um jogo.")),
    onSuccess: invalidateGames
  });

  const presenceMutation = useMutation({
    mutationFn: ({ lineup, presence }: { lineup: GameLineup; presence: boolean }) =>
      apiRequest(`/sports/games/${lineup.gameId}/lineups`, {
        method: "POST",
        body: JSON.stringify(lineupPayload(lineup, presence))
      }),
    onSuccess: invalidateGames
  });

  const jerseyNumberMutation = useMutation({
    mutationFn: ({ lineup, jerseyNumber }: { lineup: GameLineup; jerseyNumber: number | null }) =>
      apiRequest(`/sports/games/${lineup.gameId}/lineups`, {
        method: "POST",
        body: JSON.stringify({
          ...lineupPayload(lineup, lineup.presence),
          jerseyNumber
        })
      }),
    onSuccess: invalidateGames
  });

  const markAllPresentMutation = useMutation({
    mutationFn: () =>
      Promise.all(
        activeLineups.map((lineup) =>
          apiRequest(`/sports/games/${lineup.gameId}/lineups`, {
            method: "POST",
            body: JSON.stringify(lineupPayload(lineup, true))
          })
        )
      ),
    onSuccess: invalidateGames
  });

  const eventMutation = useMutation({
    mutationFn: () =>
      selectedGame ? apiRequest(`/sports/games/${selectedGame.id}/events`, {
        method: "POST",
        body: JSON.stringify({
          events: [
            {
              athleteId: eventForm.athleteId,
              type: eventForm.type,
              minute: eventForm.minute ? Number(eventForm.minute) : currentMinute,
              ...(selectedEventLineup ? { side: selectedEventLineup.side } : {}),
              ...(eventForm.note ? { note: eventForm.note } : {})
            }
          ]
        })
      }) : Promise.reject(new Error("Selecione um jogo.")),
    onSuccess: () => {
      setEventForm((current) => ({ ...current, athleteId: "", minute: "", note: "" }));
      invalidateGames();
    }
  });

  const substitutionMutation = useMutation({
    mutationFn: () =>
      selectedGame ? apiRequest(`/sports/games/${selectedGame.id}/substitutions`, {
        method: "POST",
        body: JSON.stringify({
          athleteOutId: substitutionForm.athleteOutId,
          athleteInId: substitutionForm.athleteInId,
          ...(substitutionForm.minute ? { minute: Number(substitutionForm.minute) } : {}),
          ...(selectedOutLineup ? { side: selectedOutLineup.side } : {}),
          ...(substitutionForm.note ? { note: substitutionForm.note } : {})
        })
      }) : Promise.reject(new Error("Selecione um jogo.")),
    onSuccess: () => {
      setSubstitutionForm({ athleteOutId: "", athleteInId: "", minute: "", note: "" });
      void invalidateLineupQueries(queryClient);
      invalidateGames();
    }
  });

  const deleteSubstitutionMutation = useMutation({
    mutationFn: ({ gameId, substitutionId }: { gameId: string; substitutionId: string }) =>
      apiRequest<void>(`/sports/games/${gameId}/substitutions/${substitutionId}`, {
        method: "DELETE"
      }),
    onSuccess: invalidateGames
  });

  function handleEventSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void eventMutation.mutateAsync();
  }

  function handleSubstitutionSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void substitutionMutation.mutateAsync();
  }

  function handleJerseyNumberBlur(lineup: GameLineup, value: string, input: HTMLInputElement) {
    const nextJerseyNumber = parseJerseyNumber(value);
    if (nextJerseyNumber === undefined) {
      input.value = lineup.jerseyNumber !== null ? String(lineup.jerseyNumber) : "";
      return;
    }

    if (nextJerseyNumber === lineup.jerseyNumber) {
      input.value = lineup.jerseyNumber !== null ? String(lineup.jerseyNumber) : "";
      return;
    }

    void jerseyNumberMutation.mutateAsync({ lineup, jerseyNumber: nextJerseyNumber });
  }

  function printMatchSheet() {
    if (!selectedGame) return;
    const teamName = (side: TeamSide) =>
      side === "RED" ? (selectedGame.redTeamName ?? sideLabels.RED) : side === "WHITE" ? (selectedGame.whiteTeamName ?? sideLabels.WHITE) : sideLabels.EXTERNAL;
    const teamList = (side: TeamSide, role: "field" | "bench") => {
      const rows = sortLineupsForSummary(activeLineups.filter((lineup) => {
        if (lineup.side !== side) return false;
        if (role === "field") return lineup.role === "STARTER" || lineup.role === "GOALKEEPER";
        if (role === "bench") return lineup.role === "RESERVE";
        return true;
      }));
      return rows
        .map((lineup, index) => `<tr><td>${index + 1}</td><td class="number-cell">${escapePrintText(lineup.jerseyNumber ?? "")}</td><td>${escapePrintText(lineup.athlete.name)}</td><td>${escapePrintText(lineup.role === "GOALKEEPER" ? "Goleiro" : lineup.role === "STARTER" ? "Titular" : "Banco")}</td><td>${lineup.presence ? "P" : ""}</td></tr>`)
        .join("") || `<tr><td colspan="5">Sem registro</td></tr>`;
    };
    const eventRows = timeline
      .map((item) => {
        if (item.kind === "event") {
          return `<tr><td>${escapePrintText(item.minute !== null ? `${item.minute}'` : "-")}</td><td>${escapePrintText(eventLabels[item.event.type])}</td><td>${escapePrintText(item.event.athlete.name)}</td><td>${escapePrintText(item.event.side ? teamName(item.event.side) : "-")}</td><td>${escapePrintText(item.event.note)}</td></tr>`;
        }
        return `<tr><td>${escapePrintText(item.minute !== null ? `${item.minute}'` : "-")}</td><td>Substituição</td><td>${escapePrintText(`${item.substitution.athleteIn.name} entrou / ${item.substitution.athleteOut.name} saiu`)}</td><td>${escapePrintText(item.substitution.side ? teamName(item.substitution.side) : "-")}</td><td>${escapePrintText(item.substitution.note)}</td></tr>`;
      })
      .join("") || `<tr><td colspan="5">Sem eventos registrados.</td></tr>`;
    const appliedDraftRows = [
      { team: teamName("RED"), group: "Titulares", lineups: sortLineupsForSummary(redTeamLineups.filter((lineup) => lineup.role === "STARTER" || lineup.role === "GOALKEEPER")) },
      { team: teamName("RED"), group: "Banco", lineups: sortLineupsForSummary(redTeamLineups.filter((lineup) => lineup.role === "RESERVE")) },
      { team: teamName("WHITE"), group: "Titulares", lineups: sortLineupsForSummary(whiteTeamLineups.filter((lineup) => lineup.role === "STARTER" || lineup.role === "GOALKEEPER")) },
      { team: teamName("WHITE"), group: "Banco", lineups: sortLineupsForSummary(whiteTeamLineups.filter((lineup) => lineup.role === "RESERVE")) }
    ]
      .map((group) =>
        group.lineups.length > 0
          ? `<tr><td>${escapePrintText(group.team)}</td><td>${escapePrintText(group.group)}</td><td>${escapePrintText(group.lineups.map((lineup) => `${lineup.role === "GOALKEEPER" ? "GOL - " : ""}${lineup.athlete.name}`).join(", "))}</td></tr>`
          : ""
      )
      .join("") || `<tr><td colspan="3">Nenhuma escalação salva para este jogo.</td></tr>`;
    const assistantFallback = selectedGame.assistantNames && !selectedGame.assistantOneName && !selectedGame.assistantTwoName ? selectedGame.assistantNames : "";
    const officialRows = [
      { label: "Árbitro", value: selectedGame.refereeName ?? "" },
      { label: "Assistente 1", value: selectedGame.assistantOneName ?? assistantFallback },
      { label: "Assistente 2", value: selectedGame.assistantTwoName ?? "" },
      { label: "Quarto árbitro", value: selectedGame.fourthOfficialName ?? "" },
      { label: "Assistente reserva", value: selectedGame.reserveAssistantName ?? "" },
      { label: "VAR", value: selectedGame.varName ?? "" },
      { label: "AVAR", value: selectedGame.avarName ?? "" },
      { label: "Delegado/representante", value: selectedGame.delegateName ?? "" }
    ]
      .map((official) => `<div class="official-box"><strong>${escapePrintText(official.label)}</strong><br />${escapePrintText(official.value)}</div>`)
      .join("");
    const popup = window.open("", "_blank", "width=980,height=900");
    if (!popup) return;
    popup.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Súmula - ${escapePrintText(selectedGame.location)}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #0f172a; margin: 18px; }
            header { display: grid; grid-template-columns: 1fr 150px; gap: 12px; border: 2px solid #0f172a; padding: 10px; }
            h1 { margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: .08em; }
            h2 { margin: 14px 0 6px; border: 1px solid #0f172a; background: #e5e7eb; padding: 5px 8px; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: #111827; }
            .meta { margin-top: 6px; color: #111827; font-size: 11px; line-height: 1.45; }
            .score { border-left: 2px solid #0f172a; padding: 6px 10px; text-align: center; }
            .score strong { display: block; font-size: 30px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
            .official-box { border: 1px solid #0f172a; padding: 8px; min-height: 42px; font-size: 11px; }
            .line-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #94a3b8; padding: 5px 6px; text-align: left; vertical-align: top; }
            th { background: #f1f5f9; text-transform: uppercase; color: #334155; font-size: 9px; letter-spacing: .06em; }
            .number-cell { width: 42px; height: 18px; text-align: center; font-weight: 700; }
            .sign { margin-top: 30px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 28px; }
            .line { border-top: 1px solid #0f172a; padding-top: 8px; text-align: center; font-size: 12px; }
            @media print { body { margin: 16px; } }
          </style>
        </head>
        <body>
          <header>
            <div>
              <h1>Súmula da partida</h1>
              <div class="meta">
                <strong>Jogo:</strong> ${escapePrintText(teamName("RED"))} x ${escapePrintText(teamName("WHITE"))}<br />
                <strong>Data:</strong> ${escapePrintText(formatDateTime(selectedGame.date))}<br />
                <strong>Local:</strong> ${escapePrintText(selectedGame.location)}<br />
                <strong>Status:</strong> ${escapePrintText(selectedGame.status === "FINISHED" ? "Encerrado" : selectedGame.status === "RUNNING" ? "Em andamento" : selectedGame.status === "PAUSED" ? "Pausado" : "Jogo não iniciado")}
              </div>
            </div>
            <div class="score">
              <span>Placar</span>
              <strong>${escapePrintText(selectedGame.redScore ?? 0)} x ${escapePrintText(selectedGame.whiteScore ?? 0)}</strong>
            </div>
          </header>
          <main>
            <h2>Arbitragem e organização</h2>
            <section class="line-grid">
              ${officialRows}
              <div class="official-box"><strong>Rodada/Jogo</strong><br />${escapePrintText(selectedGame.round ?? "")} ${selectedGame.matchNumber ? `- ${selectedGame.matchNumber}` : ""}</div>
            </section>
            <h2>Relação de jogadores</h2>
            <section class="grid">
              <div><h2>${escapePrintText(teamName("RED"))} - titulares</h2><table><thead><tr><th>Seq.</th><th>Nº</th><th>Atleta</th><th>T/R</th><th>P/A</th></tr></thead><tbody>${teamList("RED", "field")}</tbody></table><h2>${escapePrintText(teamName("RED"))} - banco</h2><table><thead><tr><th>Seq.</th><th>Nº</th><th>Atleta</th><th>T/R</th><th>P/A</th></tr></thead><tbody>${teamList("RED", "bench")}</tbody></table></div>
              <div><h2>${escapePrintText(teamName("WHITE"))} - titulares</h2><table><thead><tr><th>Seq.</th><th>Nº</th><th>Atleta</th><th>T/R</th><th>P/A</th></tr></thead><tbody>${teamList("WHITE", "field")}</tbody></table><h2>${escapePrintText(teamName("WHITE"))} - banco</h2><table><thead><tr><th>Seq.</th><th>Nº</th><th>Atleta</th><th>T/R</th><th>P/A</th></tr></thead><tbody>${teamList("WHITE", "bench")}</tbody></table></div>
            </section>
            <h2>Escalação salva pelo sorteio${latestDraftAttempt ? ` - tentativa ${escapePrintText(latestDraftAttempt.attemptNumber)}` : ""}</h2>
            <table>
              <thead><tr><th>Time</th><th>Grupo</th><th>Atletas</th></tr></thead>
              <tbody>${appliedDraftRows}</tbody>
            </table>
            <h2>Eventos e substituições</h2>
            <table>
              <thead><tr><th>Min.</th><th>Tipo</th><th>Atleta</th><th>Time</th><th>Observação</th></tr></thead>
              <tbody>${eventRows}</tbody>
            </table>
            <section class="sign">
              <div class="line">Responsável pela súmula</div>
              <div class="line">Árbitro</div>
              <div class="line">Diretoria / Comissão</div>
            </section>
          </main>
        </body>
      </html>
    `);
    popup.document.close();
    popup.focus();
    popup.print();
  }

  return (
    <section className={embedded ? "min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5" : "min-w-0 space-y-4"}>
      {!embedded ? <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Participação e súmula</h1>
          <p className="text-sm text-slate-400">Controle presença, eventos do jogo e substituições em uma única tela.</p>
        </div>
        <Link to="/jogos" className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700">
          <CalendarClock size={18} />
          Lançar jogo
        </Link>
      </div> : null}

      <article className={embedded ? "rounded-lg border border-slate-200 bg-slate-50 p-4" : "rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5"}>
        <div className={`grid gap-3 ${showPresenceControls ? "lg:grid-cols-[minmax(0,1fr)_15rem_15rem_15rem]" : "lg:grid-cols-[minmax(0,1fr)_15rem_15rem]"}`}>
          <label className="text-sm font-medium text-slate-600">
            Jogo
            <select className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" value={selectedGameId} onChange={(event) => setSelectedGameId(event.target.value)}>
              <option value="">Selecione um jogo</option>
              {games.map((game) => (
                <option key={game.id} value={game.id}>
                  {formatDateTime(game.date)} - {game.location}
                </option>
              ))}
            </select>
          </label>

          {showPresenceControls ? <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
              <Users size={15} />
              Presença
            </p>
            <p className="mt-1 text-2xl font-black text-slate-950">
              {presentLineups.length}/{activeLineups.length}
            </p>
          </div> : null}

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
              <Target size={15} />
              Eventos
            </p>
            <p className="mt-1 text-2xl font-black text-slate-950">{events.length}</p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
              <ArrowRightLeft size={15} />
              Substituições
            </p>
            <p className="mt-1 text-2xl font-black text-slate-950">{substitutions.length}</p>
          </div>
        </div>
      </article>

      {gamesQuery.isLoading ? <EmptyState message="Carregando jogos..." /> : null}

      {!selectedGame && !gamesQuery.isLoading ? <EmptyState message="Selecione um jogo para lançar participação, artilharia, cartões e substituições." /> : null}

      {selectedGame ? (
        <div className="space-y-4">
          <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Relógio da partida</p>
                <div className="mt-2 flex flex-wrap items-end gap-3">
                  <strong className="text-4xl font-black text-slate-950">{formatClock(elapsedSeconds)}</strong>
                  <span className="mb-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase text-slate-700">
                    {selectedGame.status === "RUNNING" || selectedGame.status === "PAUSED" || (selectedGame.status === "SCHEDULED" && elapsedSeconds > 0) ? matchPhase(selectedGame, elapsedSeconds) : selectedGame.status === "FINISHED" ? "Encerrado" : "Jogo não iniciado"}
                  </span>
                  <span className="mb-1 text-sm font-semibold text-slate-500">Minuto {currentMinute}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={printMatchSheet} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-800 hover:bg-slate-50">
                  <Printer size={17} />
                  Imprimir súmula
                </button>
                <button type="button" disabled={clockMutation.isPending || selectedGame.status === "FINISHED"} onClick={() => void clockMutation.mutateAsync("START")} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50">1º tempo</button>
                <button type="button" disabled={clockMutation.isPending || selectedGame.status === "FINISHED"} onClick={() => void clockMutation.mutateAsync("HALFTIME")} className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-800 hover:bg-amber-100 disabled:opacity-50">Intervalo</button>
                <button type="button" disabled={clockMutation.isPending || selectedGame.status === "FINISHED"} onClick={() => void clockMutation.mutateAsync("SECOND_HALF")} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50">2º tempo</button>
                {selectedGame.status === "RUNNING" ? (
                  <button type="button" disabled={clockMutation.isPending} onClick={() => void clockMutation.mutateAsync("PAUSE")} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-50">Pausar</button>
                ) : null}
                {selectedGame.status === "PAUSED" ? (
                  <button type="button" disabled={clockMutation.isPending} onClick={() => void clockMutation.mutateAsync("RESUME")} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50">Retomar</button>
                ) : null}
                {selectedGame.status === "RUNNING" || selectedGame.status === "PAUSED" ? (
                  <button type="button" disabled={clockMutation.isPending} onClick={() => void clockMutation.mutateAsync("FINISH")} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50">Encerrar</button>
                ) : null}
                <button type="button" disabled={clockMutation.isPending || selectedGame.status === "RUNNING"} onClick={() => void clockMutation.mutateAsync("RESET")} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-50">Zerar</button>
              </div>
            </div>

            <form
              className="mt-4 grid gap-3 sm:grid-cols-[10rem_10rem_auto]"
              onSubmit={(event) => {
                event.preventDefault();
                void matchSettingsMutation.mutateAsync();
              }}
            >
              <label className="text-sm font-medium text-slate-600">
                Duração do tempo
                <input type="number" min={1} max={90} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" value={matchSettingsForm.halfDurationMinutes} onChange={(event) => setMatchSettingsForm((current) => ({ ...current, halfDurationMinutes: event.target.value }))} />
              </label>
              <label className="text-sm font-medium text-slate-600">
                Intervalo
                <input type="number" min={0} max={40} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" value={matchSettingsForm.breakDurationMinutes} onChange={(event) => setMatchSettingsForm((current) => ({ ...current, breakDurationMinutes: event.target.value }))} />
              </label>
              <button type="submit" disabled={matchSettingsMutation.isPending} className="h-11 self-end rounded-lg bg-slate-950 px-4 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50">Salvar tempo</button>
            </form>
          </article>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(24rem,0.72fr)]">
          <div className="space-y-4">
            <article className="hidden">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-950">Participantes do sorteio</h2>
                  <p className="text-sm text-slate-500">
                    {latestDraftAttempt ? `Tentativa ${latestDraftAttempt.attemptNumber} - ${new Date(latestDraftAttempt.createdAt).toLocaleString("pt-BR")}` : "Nenhum sorteio registrado para este jogo."}
                  </p>
                </div>
                {latestDraftAttempt ? <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">{latestDraftAttempt.totals.eligible} atletas</span> : null}
              </div>

              {latestDraftAttempt ? (
                <div className="grid gap-3 lg:grid-cols-2">
                  {draftTeamGroups.map((team) => (
                    <div key={`draft-team-${team.title}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <h3 className="text-sm font-black text-slate-950">{team.title}</h3>
                      <p className="mt-2 text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">Titulares</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {team.starters.map((athlete) => (
                          <span key={`draft-starter-${team.title}-${athlete.id}`} className="rounded-full bg-white px-2 py-1 text-xs font-bold text-slate-700">{athlete.name}</span>
                        ))}
                      </div>
                      {team.bench.length > 0 ? (
                        <>
                          <p className="mt-3 text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">Banco</p>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {team.bench.map((athlete) => (
                              <span key={`draft-bench-${team.title}-${athlete.id}`} className="rounded-full bg-white px-2 py-1 text-xs font-bold text-slate-700">{athlete.name}</span>
                            ))}
                          </div>
                        </>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Quando o sorteio for feito, os participantes aparecem aqui na súmula.</p>
              )}
            </article>

            <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-950">Times da escalação</h2>
                  <p className="text-sm text-slate-500">Lista puxada da escalação configurada para esta partida.</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">{activeLineups.length} atletas</span>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                {[
                  { side: "RED" as TeamSide, name: teamName("RED"), rows: redTeamLineups },
                  { side: "WHITE" as TeamSide, name: teamName("WHITE"), rows: whiteTeamLineups },
                  ...(externalTeamLineups.length > 0 ? [{ side: "EXTERNAL" as TeamSide, name: teamName("EXTERNAL"), rows: externalTeamLineups }] : [])
                ].map((team) => (
                  <div key={`summary-team-${team.side}`} className="overflow-hidden rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2">
                      <h3 className="flex min-w-0 items-center gap-2 text-sm font-black text-slate-950">
                        {crestForSide(team.side) ? <img src={crestForSide(team.side) ?? ""} alt="" className="size-7 shrink-0 rounded-full border border-slate-200 bg-white object-contain p-0.5" /> : null}
                        <span className="truncate">{team.name}</span>
                      </h3>
                      <span className="rounded-full bg-white px-2 py-1 text-[11px] font-black text-slate-600">{team.rows.length}</span>
                    </div>
                    {miniPitchForTeam(team.rows)}
                    <div className="divide-y divide-slate-100">
                      {team.rows.map((lineup) => (
                        <div key={`summary-lineup-${lineup.id}`} className="grid min-h-12 grid-cols-[4.25rem_minmax(0,1fr)_auto] items-center gap-2 px-3 py-2">
                          <label className="sr-only" htmlFor={`jersey-${lineup.id}`}>Número da camisa de {lineup.athlete.name}</label>
                          <input
                            id={`jersey-${lineup.id}`}
                            key={`jersey-${lineup.id}-${lineup.jerseyNumber ?? "empty"}`}
                            type="number"
                            min={0}
                            max={999}
                            defaultValue={lineup.jerseyNumber ?? ""}
                            disabled={jerseyNumberMutation.isPending}
                            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-center text-xs font-black text-slate-800 outline-none focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-100 disabled:opacity-60"
                            placeholder="--"
                            aria-label={`Número da camisa de ${lineup.athlete.name}`}
                            onBlur={(event) => handleJerseyNumberBlur(lineup, event.currentTarget.value, event.currentTarget)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                event.currentTarget.blur();
                              }
                            }}
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-bold text-slate-950">{lineup.athlete.name}</span>
                            <span className="block truncate text-xs font-semibold text-slate-500">{roleLabels[lineup.role] ?? lineup.role}</span>
                          </span>
                          <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${lineup.presence ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                            {lineup.presence ? "Presente" : "Pendente"}
                          </span>
                        </div>
                      ))}
                    </div>
                    {team.rows.length === 0 ? <p className="px-3 py-4 text-sm text-slate-500">Nenhum atleta neste time.</p> : null}
                  </div>
                ))}
              </div>

              {jerseyNumberMutation.isError ? (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                  {(jerseyNumberMutation.error instanceof Error && jerseyNumberMutation.error.message) || "Não foi possível alterar a numeração da camisa."}
                </div>
              ) : null}
            </article>

            {showPresenceControls ? (
            <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-950">Participação</h2>
                  <p className="text-sm text-slate-500">
                    {formatDateTime(selectedGame.date)} - {selectedGame.location}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={markAllPresentMutation.isPending || activeLineups.length === 0}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                  onClick={() => void markAllPresentMutation.mutateAsync()}
                >
                  <CheckCircle2 size={17} />
                  Marcar todos
                </button>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                {activeLineups.map((lineup) => (
                  <label key={lineup.id} className="grid min-h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      className="size-4 accent-red-600"
                      checked={lineup.presence}
                      disabled={presenceMutation.isPending}
                      onChange={(event) => void presenceMutation.mutateAsync({ lineup, presence: event.target.checked })}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-slate-950">
                        {lineup.jerseyNumber !== null ? `#${lineup.jerseyNumber} ` : ""}
                        {lineup.athlete.name}
                      </span>
                      <span className="mt-1 block truncate text-xs font-semibold text-slate-500">
                        {teamName(lineup.side)} - {roleLabels[lineup.role] ?? lineup.role}
                      </span>
                    </span>
                    <span className={`rounded-full px-2 py-1 text-[11px] font-black uppercase ${lineup.presence ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {lineup.presence ? "Presente" : "Pendente"}
                    </span>
                  </label>
                ))}
              </div>

              {activeLineups.length === 0 ? <p className="text-sm text-slate-500">Este jogo ainda não tem atletas escalados. Faça o sorteio em Jogos ou Escalações.</p> : null}
            </article>
            ) : null}

            <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <h2 className="text-xl font-bold text-slate-950">Lançamentos da súmula</h2>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <form className="rounded-lg border border-slate-200 p-3" onSubmit={handleEventSubmit}>
                  <p className="mb-3 flex items-center gap-2 text-sm font-black uppercase text-slate-600">
                    <Shield size={17} />
                    Gol, assistência ou cartão
                  </p>
                  {launchTeamIndicator(selectedEventLineup, "Selecione o atleta")}
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-slate-600">
                      Atleta
                      <select className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" value={eventForm.athleteId} onChange={(event) => setEventForm((current) => ({ ...current, athleteId: event.target.value }))} required>
                        <option value="">Selecione</option>
                        {fieldLineups.map((lineup) => (
                          <option key={lineup.athleteId} value={lineup.athleteId}>
                            {lineupOptionLabel(lineup)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_7rem]">
                      <label className="block text-sm font-medium text-slate-600">
                        Tipo
                        <select className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" value={eventForm.type} onChange={(event) => setEventForm((current) => ({ ...current, type: event.target.value as GameEventType }))}>
                          <option value="GOAL">Gol</option>
                          <option value="ASSIST">Assistência</option>
                          <option value="YELLOW_CARD">Cartão amarelo</option>
                          <option value="RED_CARD">Cartão vermelho</option>
                        </select>
                      </label>
                      <label className="block text-sm font-medium text-slate-600">
                        Minuto
                        <input type="number" min={0} max={130} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" value={eventForm.minute} onChange={(event) => setEventForm((current) => ({ ...current, minute: event.target.value }))} />
                      </label>
                    </div>
                    <label className="block text-sm font-medium text-slate-600">
                      Observação
                      <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" value={eventForm.note} onChange={(event) => setEventForm((current) => ({ ...current, note: event.target.value }))} placeholder="Opcional" />
                    </label>
                    <button type="submit" disabled={eventMutation.isPending || !eventForm.athleteId} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50">
                      <Save size={17} />
                      {eventMutation.isPending ? "Salvando..." : "Salvar evento"}
                    </button>
                  </div>
                </form>

                <form className="rounded-lg border border-slate-200 p-3" onSubmit={handleSubstitutionSubmit}>
                  <p className="mb-3 flex items-center gap-2 text-sm font-black uppercase text-slate-600">
                    <ArrowRightLeft size={17} />
                    Substituição
                  </p>
                  {launchTeamIndicator(selectedOutLineup, "Selecione quem sai")}
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-slate-600">
                      Sai
                      <select className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" value={substitutionForm.athleteOutId} onChange={(event) => setSubstitutionForm((current) => ({ ...current, athleteOutId: event.target.value, athleteInId: "" }))} required>
                        <option value="">Selecione</option>
                        {activeLineups.map((lineup) => (
                          <option key={lineup.athleteId} value={lineup.athleteId}>
                            {lineupOptionLabel(lineup)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-sm font-medium text-slate-600">
                      Entra
                      <select className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" value={substitutionForm.athleteInId} onChange={(event) => setSubstitutionForm((current) => ({ ...current, athleteInId: event.target.value }))} required>
                        <option value="">Selecione</option>
                        {substitutionEntryOptions.map((lineup) => (
                          <option key={lineup.athleteId} value={lineup.athleteId}>
                            {lineupOptionLabel(lineup)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="grid gap-3 sm:grid-cols-[7rem_minmax(0,1fr)]">
                      <label className="block text-sm font-medium text-slate-600">
                        Minuto
                        <input type="number" min={0} max={130} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" value={substitutionForm.minute} onChange={(event) => setSubstitutionForm((current) => ({ ...current, minute: event.target.value }))} />
                      </label>
                      <label className="block text-sm font-medium text-slate-600">
                        Observação
                        <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" value={substitutionForm.note} onChange={(event) => setSubstitutionForm((current) => ({ ...current, note: event.target.value }))} placeholder="Opcional" />
                      </label>
                    </div>
                    <button type="submit" disabled={substitutionMutation.isPending || !substitutionForm.athleteOutId || !substitutionForm.athleteInId} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50">
                      <Save size={17} />
                      {substitutionMutation.isPending ? "Salvando..." : "Salvar substituição"}
                    </button>
                  </div>
                </form>
              </div>

              {eventMutation.isError || substitutionMutation.isError ? (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                  {(eventMutation.error instanceof Error && eventMutation.error.message) ||
                    (substitutionMutation.error instanceof Error && substitutionMutation.error.message) ||
                    "Não foi possível salvar o lançamento."}
                </div>
              ) : null}
            </article>
          </div>

          <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-950">Linha da partida</h2>
                <p className="text-sm text-slate-500">Eventos ordenados por minuto.</p>
              </div>
              <Clock3 size={20} className="text-slate-400" />
            </div>

            <div className="space-y-3">
              {timeline.map((item) =>
                item.kind === "event" ? (
                  <div key={`event-${item.id}`} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-black uppercase ring-1 ${eventBadgeClass(item.event.type)}`}>{eventLabels[item.event.type]}</span>
                        <p className="mt-2 truncate font-bold text-slate-950">{item.event.athlete.name}</p>
                        <p className="text-xs font-semibold text-slate-500">{item.event.side ? teamName(item.event.side) : "Sem uniforme"}</p>
                      </div>
                      <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-black text-slate-700">{item.minute !== null ? `${item.minute}'` : "sem min."}</span>
                    </div>
                    {item.event.note ? <p className="mt-2 text-sm text-slate-500">{item.event.note}</p> : null}
                  </div>
                ) : (
                  <div key={`sub-${item.id}`} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black uppercase text-slate-700 ring-1 ring-slate-200">Substituição</span>
                        <p className="mt-2 truncate font-bold text-slate-950">
                          {item.substitution.athleteIn.name} entra por {item.substitution.athleteOut.name}
                        </p>
                        <p className="text-xs font-semibold text-slate-500">{item.substitution.side ? teamName(item.substitution.side) : "Sem uniforme"}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-black text-slate-700">{item.minute !== null ? `${item.minute}'` : "sem min."}</span>
                        <button
                          type="button"
                          className="grid size-8 place-items-center rounded-lg border border-red-200 text-red-700 hover:bg-red-50"
                          aria-label="Remover substituição"
                          onClick={() => {
                            const shouldDelete = window.confirm("Remover esta substituição da súmula");
                            if (shouldDelete) {
                              void deleteSubstitutionMutation.mutateAsync({ gameId: selectedGame.id, substitutionId: item.substitution.id });
                            }
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                    {item.substitution.note ? <p className="mt-2 text-sm text-slate-500">{item.substitution.note}</p> : null}
                  </div>
                )
              )}
            </div>

            {timeline.length === 0 ? <p className="text-sm text-slate-500">Nenhum evento lançado ainda.</p> : null}
          </article>
        </div>
        </div>
      ) : null}
    </section>
  );
}
