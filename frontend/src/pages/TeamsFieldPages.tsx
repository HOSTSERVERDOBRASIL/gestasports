import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useOutletContext } from "react-router-dom";
import { BenchPlayerCard } from "../components/ui/KitRenderer";
import { FullPitchBoard, type PitchPlayer } from "../components/ui/FullPitchBoard";
import { TeamColorCard } from "../components/ui/TeamColorCard";
import { apiRequest } from "../services/api";
import type { AthleteProfile, Club, Game, GameLineup, GroupSettings, TeamSide, TenantBrandingSettings } from "../types/domain";
import { invalidateLineupQueries } from "../utils/lineupQueries";

type OutletPeriod = {
  month: number;
  year: number;
};

type FormationKey =
  | "4-3-3"
  | "4-4-2"
  | "3-5-2"
  | "4-2-3-1"
  | "4-3-1-2"
  | "3-4-3"
  | "3-4-1-2"
  | "4-1-4-1"
  | "4-5-1"
  | "5-3-2"
  | "5-4-1"
  | "4-2-2-2"
  | "3-6-1";

const formationTemplates: Array<{ key: FormationKey; label: string; style: string }> = [
  { key: "4-3-3", label: "4-3-3", style: "Com pontas" },
  { key: "4-4-2", label: "4-4-2", style: "Sem pontas" },
  { key: "3-5-2", label: "3-5-2", style: "Ala forte" },
  { key: "4-2-3-1", label: "4-2-3-1", style: "Meia central" },
  { key: "4-3-1-2", label: "4-3-1-2", style: "Dois atacantes" },
  { key: "3-4-3", label: "3-4-3", style: "Ataque aberto" },
  { key: "3-4-1-2", label: "3-4-1-2", style: "Meia livre" },
  { key: "4-1-4-1", label: "4-1-4-1", style: "Volante fixo" },
  { key: "4-5-1", label: "4-5-1", style: "Meio forte" },
  { key: "5-3-2", label: "5-3-2", style: "Defesa forte" },
  { key: "5-4-1", label: "5-4-1", style: "Fechado" },
  { key: "4-2-2-2", label: "4-2-2-2", style: "Dois meias" },
  { key: "3-6-1", label: "3-6-1", style: "Controle" }
];

const validFormationKeys = new Set<FormationKey>(formationTemplates.map((formation) => formation.key));

function savedFormation(value: string | null | undefined): FormationKey | null {
  return value && validFormationKeys.has(value as FormationKey) ? (value as FormationKey) : null;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function inMedicalDepartment(athlete: AthleteProfile) {
  return getMedicalReasons(athlete).length > 0;
}

function getMedicalReasons(athlete: AthleteProfile) {
  const reasons: string[] = [];
  if (athlete.medicalStatus && athlete.medicalStatus !== "CLEARED") {
    const labels = {
      OBSERVATION: "Em observação",
      INJURED: "Vetado por lesão",
      TREATMENT: "Em tratamento"
    } as const;
    reasons.push(labels[athlete.medicalStatus as keyof typeof labels] ?? "Aviso médico registrado");
  }
  if (athlete.medicalNote) {
    reasons.push(athlete.medicalNote);
  }
  if (athlete.status === "SUSPENDED") {
    reasons.push("Status suspenso");
  }
  if (!athlete.canPlay) {
    reasons.push("Marcado como inapto para jogo");
  }
  const note = (athlete.sportsNote ?? "").toLowerCase();
  if (/(lesao|lesão|contus|departamento medico|departamento médico|dm|tratamento|fisioterapia)/.test(note)) {
    reasons.push("Observação esportiva indica tratamento/lesão");
  }
  return reasons;
}

function sortFieldLineups(lineups: GameLineup[]) {
  return [...lineups].sort((a, b) => {
    const slotA = a.role === "GOALKEEPER" ? 0 : a.tacticalSlot ?? 999;
    const slotB = b.role === "GOALKEEPER" ? 0 : b.tacticalSlot ?? 999;
    return slotA - slotB || (a.jerseyNumber ?? 999) - (b.jerseyNumber ?? 999) || a.athlete.name.localeCompare(b.athlete.name);
  });
}

function hasRenderableLineup(lineup: GameLineup | null | undefined): lineup is GameLineup {
  return Boolean(lineup?.athlete?.id && lineup.athlete.name && lineup.athlete.position);
}

function lineupsToPitchSlots(lineups: GameLineup[]) {
  const slots: Array<PitchPlayer | null> = Array.from({ length: 11 }, () => null);
  const unslotted: GameLineup[] = [];

  for (const lineup of lineups) {
    const player = { id: lineup.athlete.id, name: lineup.athlete.name, number: lineup.jerseyNumber, position: lineup.athlete.position };
    const slotIndex = lineup.tacticalSlot !== null ? lineup.tacticalSlot - 1 : lineup.role === "GOALKEEPER" ? 0 : -1;
    if (slotIndex >= 0 && slotIndex < slots.length && !slots[slotIndex]) {
      slots[slotIndex] = player;
    } else {
      unslotted.push(lineup);
    }
  }

  for (const lineup of unslotted) {
    const emptyIndex = slots.findIndex((slot) => slot === null);
    if (emptyIndex === -1) break;
    slots[emptyIndex] = { id: lineup.athlete.id, name: lineup.athlete.name, number: lineup.jerseyNumber, position: lineup.athlete.position };
  }

  return slots;
}

function lineupsToSlotList(lineups: GameLineup[]) {
  const slots: Array<GameLineup | null> = Array.from({ length: 11 }, () => null);
  const unslotted: GameLineup[] = [];

  for (const lineup of lineups) {
    const slotIndex = lineup.tacticalSlot !== null ? lineup.tacticalSlot - 1 : lineup.role === "GOALKEEPER" ? 0 : -1;
    if (slotIndex >= 0 && slotIndex < slots.length && !slots[slotIndex]) {
      slots[slotIndex] = lineup;
    } else {
      unslotted.push(lineup);
    }
  }

  for (const lineup of unslotted) {
    const emptyIndex = slots.findIndex((slot) => slot === null);
    if (emptyIndex === -1) break;
    slots[emptyIndex] = lineup;
  }

  return slots;
}

function lineupToPitchPlayer(lineup: GameLineup): PitchPlayer {
  return {
    id: lineup.athlete.id,
    name: lineup.athlete.name,
    number: lineup.jerseyNumber,
    position: lineup.athlete.position
  };
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

function TeamsFieldContent({ source }: { source: "dashboard" | "jogos" }) {
  const { month, year } = useOutletContext<OutletPeriod>();
  const queryClient = useQueryClient();
  const [selectedGameId, setSelectedGameId] = useState<string>("");
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>("");
  const [selectedSide, setSelectedSide] = useState<TeamSide>("RED");
  const [selectedFieldSide, setSelectedFieldSide] = useState<"RED" | "WHITE">("RED");
  const [formationKey, setFormationKey] = useState<FormationKey>("4-3-3");
  const [jerseyNumber, setJerseyNumber] = useState<string>("");
  const [medicalFilter, setMedicalFilter] = useState<"ALL" | "SUSPENDED" | "UNFIT" | "NOTE">("ALL");

  const gamesQuery = useQuery({
    queryKey: ["sports-games", month, year, "internal-field-view"],
    queryFn: () => apiRequest<Game[]>(`/sports/games?month=${month}&year=${year}`)
  });

  const athletesQuery = useQuery({
    queryKey: ["athletes", month, year, "internal-field-view"],
    queryFn: () => apiRequest<AthleteProfile[]>(`/athletes?month=${month}&year=${year}`)
  });

  const groupSettingsQuery = useQuery({
    queryKey: ["group-settings", "teams-field"],
    queryFn: () => apiRequest<GroupSettings>("/group/settings")
  });

  const tenantBrandingQuery = useQuery({
    queryKey: ["tenant-branding"],
    queryFn: () => apiRequest<TenantBrandingSettings>("/tenant/branding")
  });

  const clubsQuery = useQuery({
    queryKey: ["clubs", "teams-field"],
    queryFn: () => apiRequest<Club[]>("/clubs")
  });

  const games = useMemo(() => gamesQuery.data ?? [], [gamesQuery.data]);
  const selectedGame = useMemo(() => {
    if (selectedGameId) {
      return games.find((game) => game.id === selectedGameId) ?? null;
    }
    return games[0] ?? null;
  }, [games, selectedGameId]);
  const redFormation = savedFormation(selectedGame?.redFormation) ?? "4-3-3";
  const whiteFormation = savedFormation(selectedGame?.whiteFormation) ?? "4-3-3";

  useEffect(() => {
    setFormationKey(selectedFieldSide === "RED" ? redFormation : whiteFormation);
  }, [redFormation, selectedFieldSide, selectedGame?.id, whiteFormation]);

  const groupSettings = groupSettingsQuery.data;
  const redKitColor = (selectedGame?.redUniformColor ?? "").trim() || (groupSettings?.uniform1Color ?? "").trim() || "#ffffff";
  const whiteKitColor = (selectedGame?.whiteUniformColor ?? "").trim() || (groupSettings?.uniform2Color ?? "").trim() || "#ffffff";
  const redTeamName = (selectedGame?.redTeamName ?? "").trim() || (groupSettings?.uniform1Name ?? "").trim() || "Time A";
  const whiteTeamName = (selectedGame?.whiteTeamName ?? "").trim() || (groupSettings?.uniform2Name ?? "").trim() || "Time B";
  const redUniformImageUrl = selectedGame?.redUniformImageUrl ?? groupSettings?.uniform1ImageUrl ?? null;
  const whiteUniformImageUrl = selectedGame?.whiteUniformImageUrl ?? groupSettings?.uniform2ImageUrl ?? null;
  const clubs = clubsQuery.data ?? [];
  const appearanceLogoUrl = tenantBrandingQuery.data?.logoUrl ?? null;
  const registeredInternalClubLogoUrl = clubs.find((club) => club.type === "INTERNAL" && club.logoUrl)?.logoUrl ?? null;
  const internalGameLogoUrl = appearanceLogoUrl ?? registeredInternalClubLogoUrl;
  const redClubLogoUrl = selectedGame?.redCrestUrl ?? (selectedGame?.type === "EXTERNAL" ? (selectedGame.homeClub?.logoUrl ?? internalGameLogoUrl) : internalGameLogoUrl);
  const whiteClubLogoUrl = selectedGame?.whiteCrestUrl ?? (selectedGame?.type === "EXTERNAL" ? (selectedGame.awayClub?.logoUrl ?? null) : internalGameLogoUrl);
  const selectedGameSeasonLabel = selectedGame ? new Date(selectedGame.date).getFullYear() : year;
  const selectedFormation = formationTemplates.find((formation) => formation.key === formationKey) ?? formationTemplates[0];
  const selectedLineups = (selectedGame?.lineups ?? []).filter(hasRenderableLineup);

  const redStarterLineups = sortFieldLineups(
    selectedLineups.filter((lineup) => lineup.side === "RED" && (lineup.role === "STARTER" || lineup.role === "GOALKEEPER"))
  );
  const whiteStarterLineups = sortFieldLineups(
    selectedLineups.filter((lineup) => lineup.side === "WHITE" && (lineup.role === "STARTER" || lineup.role === "GOALKEEPER"))
  );
  const redReserveLineups = sortFieldLineups(selectedLineups.filter((lineup) => lineup.side === "RED" && lineup.role === "RESERVE"));
  const whiteReserveLineups = sortFieldLineups(selectedLineups.filter((lineup) => lineup.side === "WHITE" && lineup.role === "RESERVE"));
  const redFieldSlots = lineupsToSlotList(redStarterLineups);
  const whiteFieldSlots = lineupsToSlotList(whiteStarterLineups);
  const redPlayers = lineupsToPitchSlots(redStarterLineups);
  const whitePlayers = lineupsToPitchSlots(whiteStarterLineups);
  const redBenchPlayers = redReserveLineups.map(lineupToPitchPlayer);
  const whiteBenchPlayers = whiteReserveLineups.map(lineupToPitchPlayer);
  const selectedBenchPlayers = selectedFieldSide === "RED" ? redBenchPlayers : whiteBenchPlayers;
  const selectedBenchName = selectedFieldSide === "RED" ? redTeamName : whiteTeamName;
  const selectedBenchKitColor = selectedFieldSide === "RED" ? redKitColor : whiteKitColor;
  const selectedBenchCrestUrl = selectedFieldSide === "RED" ? redClubLogoUrl : whiteClubLogoUrl;
  const selectedFieldLineups = selectedFieldSide === "RED" ? redFieldSlots : whiteFieldSlots;
  const selectedPlayerCount = (selectedFieldSide === "RED" ? redPlayers : whitePlayers).filter(Boolean).length;

  const lineupAthleteIds = new Set(selectedLineups.filter((lineup) => lineup.role !== "ABSENT").map((lineup) => lineup.athleteId));
  const athletes = athletesQuery.data ?? [];
  const availableAthletes = athletes.filter((athlete) => !lineupAthleteIds.has(athlete.id) && athlete.status !== "INACTIVE");
  const medicalAthletes = athletes
    .filter(inMedicalDepartment)
    .filter((athlete) => {
      if (medicalFilter === "ALL") return true;
      const reasons = getMedicalReasons(athlete).join(" ").toLowerCase();
      if (medicalFilter === "SUSPENDED") return athlete.status === "SUSPENDED";
      if (medicalFilter === "UNFIT") return !athlete.canPlay;
      if (medicalFilter === "NOTE") return reasons.includes("observação") || reasons.includes("lesão") || reasons.includes("tratamento");
      return true;
    });

  const saveFormationMutation = useMutation({
    mutationFn: async ({ side, formation }: { side: "RED" | "WHITE"; formation: FormationKey }) => {
      if (!selectedGame) {
        throw new Error("Selecione um jogo para salvar a formação.");
      }

      await apiRequest(`/sports/games/${selectedGame.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          [side === "RED" ? "redFormation" : "whiteFormation"]: formation
        })
      });
    },
    onSuccess: () => {
      invalidateLineupQueries(queryClient);
      void queryClient.invalidateQueries({ queryKey: ["sports-games"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-tactical-games"] });
    }
  });

  const saveLineupMutation = useMutation({
    mutationFn: async ({
      lineup,
      side,
      tacticalSlot,
      role
    }: {
      lineup: GameLineup;
      side: TeamSide;
      tacticalSlot: number | null;
      role: "STARTER" | "GOALKEEPER" | "RESERVE";
    }) => {
      if (!selectedGame) {
        throw new Error("Selecione um jogo para organizar o campo.");
      }

      await apiRequest(`/sports/games/${selectedGame.id}/lineups`, {
        method: "POST",
        body: JSON.stringify({
          athleteId: lineup.athleteId,
          side,
          role,
          presence: true,
          jerseyNumber: lineup.jerseyNumber ?? undefined,
          shirtName: side === "RED" ? redTeamName : whiteTeamName,
          tacticalSlot
        })
      });
    },
    onSuccess: async () => {
      await invalidateLineupQueries(queryClient);
    }
  });

  const jerseyNumberMutation = useMutation({
    mutationFn: async ({ lineup, jerseyNumber }: { lineup: GameLineup; jerseyNumber: number | null }) => {
      if (!selectedGame) {
        throw new Error("Selecione um jogo para alterar a camisa.");
      }

      await apiRequest(`/sports/games/${selectedGame.id}/lineups`, {
        method: "POST",
        body: JSON.stringify({
          athleteId: lineup.athleteId,
          side: lineup.side,
          role: lineup.role,
          presence: lineup.presence,
          tacticalSlot: lineup.tacticalSlot,
          shirtName: lineup.shirtName ?? (lineup.side === "RED" ? redTeamName : whiteTeamName),
          jerseyNumber
        })
      });
    },
    onSuccess: async () => {
      await invalidateLineupQueries(queryClient);
    }
  });

  const postLineupMutation = useMutation({
    mutationFn: async () => {
      if (!selectedGame) {
        throw new Error("Selecione um jogo para postar no campo.");
      }

      const athlete = athletes.find((item) => item.id === selectedAthleteId);
      if (!athlete) {
        throw new Error("Selecione um atleta para postar no campo.");
      }

      const sideSlots = selectedSide === "RED" ? redFieldSlots : whiteFieldSlots;
      const firstEmptyIndex = sideSlots.findIndex((slot) => slot === null);
      const parsedJersey = Number(jerseyNumber);

      await apiRequest(`/sports/games/${selectedGame.id}/lineups`, {
        method: "POST",
        body: JSON.stringify({
          athleteId: athlete.id,
          side: selectedSide,
          role: athlete.position === "GOALKEEPER" || firstEmptyIndex === 0 ? "GOALKEEPER" : "STARTER",
          presence: true,
          tacticalSlot: (firstEmptyIndex >= 0 ? firstEmptyIndex : sideSlots.length) + 1,
          shirtName: selectedSide === "RED" ? redTeamName : whiteTeamName,
          ...(Number.isInteger(parsedJersey) && parsedJersey > 0 ? { jerseyNumber: parsedJersey } : {})
        })
      });
    },
    onSuccess: async () => {
      setSelectedAthleteId("");
      setJerseyNumber("");
      await invalidateLineupQueries(queryClient);
    }
  });

  function moveBoardPlayer(team: "RED" | "WHITE", fromIndex: number, toIndex: number) {
    const slots = team === "RED" ? redFieldSlots : whiteFieldSlots;
    const moving = slots[fromIndex];
    const displaced = slots[toIndex];
    if (!moving || fromIndex === toIndex || toIndex < 0 || toIndex > 10) {
      return;
    }

    const movingRole = toIndex === 0 ? "GOALKEEPER" : "STARTER";
    const displacedRole = fromIndex === 0 ? "GOALKEEPER" : "STARTER";
    void Promise.all([
      saveLineupMutation.mutateAsync({ lineup: moving, side: team, tacticalSlot: toIndex + 1, role: movingRole }),
      displaced ? saveLineupMutation.mutateAsync({ lineup: displaced, side: team, tacticalSlot: fromIndex + 1, role: displacedRole }) : Promise.resolve()
    ]);
  }

  function moveBenchPlayerToField(team: "RED" | "WHITE", athleteId: string, toIndex: number) {
    const slots = team === "RED" ? redFieldSlots : whiteFieldSlots;
    const target = selectedLineups.find((lineup) => lineup.athleteId === athleteId && lineup.role !== "ABSENT");
    const displaced = slots[toIndex];
    if (!target || toIndex < 0 || toIndex > 10) {
      return;
    }

    void Promise.all([
      saveLineupMutation.mutateAsync({ lineup: target, side: team, tacticalSlot: toIndex + 1, role: toIndex === 0 ? "GOALKEEPER" : "STARTER" }),
      displaced ? saveLineupMutation.mutateAsync({ lineup: displaced, side: team, tacticalSlot: null, role: "RESERVE" }) : Promise.resolve()
    ]);
  }

  function moveFieldPlayerToBench(team: "RED" | "WHITE", index: number) {
    const slots = team === "RED" ? redFieldSlots : whiteFieldSlots;
    const lineup = slots[index];
    if (!lineup) {
      return;
    }
    void saveLineupMutation.mutateAsync({ lineup, side: team, tacticalSlot: null, role: "RESERVE" });
  }

  function handleJerseyNumberBlur(lineup: GameLineup, value: string, input: HTMLInputElement) {
    const nextJerseyNumber = parseJerseyNumber(value);
    if (nextJerseyNumber === undefined || nextJerseyNumber === lineup.jerseyNumber) {
      input.value = lineup.jerseyNumber !== null ? String(lineup.jerseyNumber) : "";
      return;
    }

    void jerseyNumberMutation.mutateAsync({ lineup, jerseyNumber: nextJerseyNumber });
  }

  return (
    <section className="space-y-4">
      <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <select
            className="min-h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 sm:max-w-xl"
            value={selectedGame?.id ?? ""}
            onChange={(event) => setSelectedGameId(event.target.value)}
          >
            <option value="">Selecione o jogo</option>
            {games.map((game) => (
              <option key={game.id} value={game.id}>
                {formatDateTime(game.date)} - {game.location}
              </option>
            ))}
          </select>
          <Link
            to={source === "dashboard" ? "/" : "/jogos?view=OPERACAO&subView=ESCALACAO"}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-slate-900 hover:bg-slate-50"
          >
            Voltar
          </Link>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[17rem_minmax(0,1fr)]">
          <aside className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="grid gap-2">
              <button
                type="button"
                className={`rounded-lg text-left ring-offset-2 transition ${selectedFieldSide === "RED" ? "ring-2 ring-red-500" : "hover:-translate-y-0.5"}`}
                onClick={() => {
                  setSelectedFieldSide("RED");
                  setSelectedSide("RED");
                }}
              >
                <TeamColorCard label="" name={redTeamName} color={redKitColor} fallback="#ffffff" imageUrl={redUniformImageUrl} crestUrl={redClubLogoUrl} formation={redFormation} seasonLabel={selectedGameSeasonLabel} />
              </button>
              <button
                type="button"
                className={`rounded-lg text-left ring-offset-2 transition ${selectedFieldSide === "WHITE" ? "ring-2 ring-slate-500" : "hover:-translate-y-0.5"}`}
                onClick={() => {
                  setSelectedFieldSide("WHITE");
                  setSelectedSide("WHITE");
                }}
              >
                <TeamColorCard label="" name={whiteTeamName} color={whiteKitColor} fallback="#ffffff" imageUrl={whiteUniformImageUrl} crestUrl={whiteClubLogoUrl} formation={whiteFormation} seasonLabel={selectedGameSeasonLabel} />
              </button>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">Formação</p>
              <div className="mt-2 grid gap-2">
                <select
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-900"
                  value={formationKey}
                  onChange={(event) => {
                    const nextFormation = event.target.value as FormationKey;
                    setFormationKey(nextFormation);
                    void saveFormationMutation.mutateAsync({ side: selectedFieldSide, formation: nextFormation });
                  }}
                >
                  {formationTemplates.map((formation) => (
                    <option key={formation.key} value={formation.key}>
                      {formation.label}
                    </option>
                  ))}
                </select>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-center text-[10px] font-black uppercase text-slate-600">{selectedFormation.style}</span>
              </div>
            </div>

            <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">Adicionar atleta</p>
              <select
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={selectedSide}
                onChange={(event) => {
                  const side = event.target.value as "RED" | "WHITE";
                  setSelectedSide(side);
                  setSelectedFieldSide(side);
                }}
              >
                <option value="RED">{redTeamName}</option>
                <option value="WHITE">{whiteTeamName}</option>
              </select>
              <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={selectedAthleteId} onChange={(event) => setSelectedAthleteId(event.target.value)}>
                <option value="">Selecione o atleta</option>
                {availableAthletes.map((athlete) => (
                  <option key={athlete.id} value={athlete.id}>
                    {athlete.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                max={99}
                placeholder="Número"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={jerseyNumber}
                onChange={(event) => setJerseyNumber(event.target.value)}
              />
              <button
                type="button"
                className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-red-600 px-3 text-sm font-black text-white hover:bg-red-700 disabled:opacity-50"
                disabled={!selectedGame || !selectedAthleteId || postLineupMutation.isPending}
                onClick={() => void postLineupMutation.mutateAsync()}
              >
                {postLineupMutation.isPending ? "Adicionando..." : "Adicionar no campo"}
              </button>
              {postLineupMutation.isError ? <p className="text-xs font-semibold text-red-700">{(postLineupMutation.error as Error).message}</p> : null}
              {saveLineupMutation.isError ? <p className="text-xs font-semibold text-red-700">{(saveLineupMutation.error as Error).message}</p> : null}
              {jerseyNumberMutation.isError ? <p className="text-xs font-semibold text-red-700">{(jerseyNumberMutation.error as Error).message}</p> : null}
            </div>
          </aside>

          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Campo avançado</p>
                <p className="text-sm font-black text-slate-950">
                  {selectedBenchName} - {selectedPlayerCount}/11 em campo
                </p>
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-slate-600">{selectedFormation.label}</span>
            </div>

            <div className="grid gap-3">
              <FullPitchBoard
                redColor={redKitColor}
                whiteColor={whiteKitColor}
                redPlayers={redPlayers}
                whitePlayers={whitePlayers}
                redBenchPlayers={redBenchPlayers}
                whiteBenchPlayers={whiteBenchPlayers}
                redTeamName={redTeamName}
                whiteTeamName={whiteTeamName}
                redCrestUrl={redClubLogoUrl}
                whiteCrestUrl={whiteClubLogoUrl}
                redFormation={selectedFieldSide === "RED" ? formationKey : redFormation}
                whiteFormation={selectedFieldSide === "WHITE" ? formationKey : whiteFormation}
                focusTeam={selectedFieldSide}
                mode="edit"
                interactive={Boolean(selectedGame)}
                showBench={false}
                onPlayerDrop={moveBoardPlayer}
                onAthleteDrop={moveBenchPlayerToField}
                onPlayerRemove={moveFieldPlayerToBench}
                className="aspect-[1.85] min-h-[18rem] sm:min-h-[22rem]"
              />
              <aside className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Banco</p>
                    <h3 className="text-sm font-black text-slate-950">{selectedBenchName}</h3>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-slate-600">{selectedBenchPlayers.length} reservas</span>
                </div>
                {selectedBenchPlayers.length > 0 ? (
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
                    {selectedBenchPlayers.map((player, index) => (
                      <BenchPlayerCard
                        key={`${selectedFieldSide}-bench-${player.id}-${index}`}
                        draggable={Boolean(selectedGame)}
                        onDragStart={(event) => {
                          event.dataTransfer.setData("text/plain", `ATHLETE:${selectedFieldSide}:${player.id}`);
                        }}
                        kitSource={selectedBenchKitColor}
                        fallbackColor="#ffffff"
                        crestUrl={selectedBenchCrestUrl}
                        name={player.name}
                        position={player.position === "GOALKEEPER" ? "GOL" : player.position}
                        number={player.number ?? index + 12}
                        title="Arraste para uma posição do campo"
                      />
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 rounded-lg border border-dashed border-slate-200 bg-white px-3 py-4 text-sm font-semibold text-slate-500">Nenhum atleta no banco deste time.</p>
                )}
                <div className="mt-4 border-t border-slate-200 pt-3">
                  <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Camisas em campo</p>
                  <div className="mt-2 grid max-h-56 gap-2 overflow-auto pr-1">
                    {selectedFieldLineups.filter((lineup): lineup is GameLineup => Boolean(lineup)).map((lineup) => (
                      <label key={`field-jersey-${lineup.id}`} className="grid grid-cols-[minmax(0,1fr)_4.5rem] items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs">
                        <span className="min-w-0">
                          <span className="block truncate font-black text-slate-900">{lineup.athlete.name}</span>
                          <span className="block truncate text-[10px] font-semibold text-slate-500">{lineup.role === "GOALKEEPER" ? "Goleiro" : `P${lineup.tacticalSlot ?? ""}`}</span>
                        </span>
                        <input
                          key={`${lineup.id}-${lineup.jerseyNumber ?? "empty"}`}
                          type="number"
                          min={0}
                          max={999}
                          defaultValue={lineup.jerseyNumber ?? ""}
                          disabled={jerseyNumberMutation.isPending}
                          className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2 text-center text-xs font-black text-slate-900 outline-none focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-100 disabled:opacity-60"
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
                      </label>
                    ))}
                  </div>
                </div>
              </aside>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[10px] font-black uppercase tracking-[0.08em] text-amber-700">Departamento Médico</p>
                <select className="rounded border border-amber-300 bg-white px-1.5 py-1 text-[10px] font-semibold text-amber-800" value={medicalFilter} onChange={(event) => setMedicalFilter(event.target.value as typeof medicalFilter)}>
                  <option value="ALL">Todos</option>
                  <option value="UNFIT">Inaptos</option>
                  <option value="SUSPENDED">Suspensos</option>
                  <option value="NOTE">Por observação</option>
                </select>
              </div>
              {medicalAthletes.length > 0 ? (
                <ul className="mt-2 grid gap-1 sm:grid-cols-2 xl:grid-cols-3">
                  {medicalAthletes.map((athlete) => (
                    <li key={athlete.id} className="rounded bg-white px-2 py-1 text-xs font-semibold text-slate-800">
                      <p>{athlete.name}</p>
                      <p className="text-[10px] font-medium text-slate-500">{getMedicalReasons(athlete).join(" - ")}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-slate-600">Nenhum atleta em departamento médico no período.</p>
              )}
            </div>
          </div>
        </div>
      </article>
    </section>
  );
}

export function DashboardTeamsFieldPage() {
  return <TeamsFieldContent source="dashboard" />;
}

export function JogosTeamsFieldPage() {
  return <TeamsFieldContent source="jogos" />;
}
