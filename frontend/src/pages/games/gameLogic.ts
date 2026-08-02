import { parseTeamKit } from "../../utils/teamColors";
import type { AthletePosition, AthleteProfile, AthleteStatus, GameEventType, GameLineup, GameType } from "../../types/domain";
export type OutletPeriod = {
  month: number;
  year: number;
};

export type GameSubView = "LISTA" | "CADASTRO" | "AGENDA" | "ARBITRAGEM" | "CONFIRMACOES" | "ESCALACAO" | "TACTICA" | "EVENTOS";

export function hasId<T extends { id?: unknown } | null | undefined>(value: T): value is T & { id: string } {
  return Boolean(value && typeof value.id === "string" && value.id);
}

export function hasAthleteIdentity(value: { id?: unknown; name?: unknown; position?: unknown } | null | undefined): value is { id: string; name: string; position: AthletePosition } {
  return Boolean(value && typeof value.id === "string" && value.id && typeof value.name === "string" && value.name && typeof value.position === "string" && value.position);
}

export function hasAthleteProfile(value: AthleteProfile | null | undefined): value is AthleteProfile {
  return hasAthleteIdentity(value);
}

export const gameFlowSteps: Array<{ view: GameSubView; label: string; helper: string }> = [
  { view: "CADASTRO", label: "Cadastrar jogo", helper: "Dados do jogo" },
  { view: "AGENDA", label: "Agenda", helper: "Selecionar data" },
  { view: "CONFIRMACOES", label: "Confirmações", helper: "Presenças" },
  { view: "ESCALACAO", label: "Escalação", helper: "Times" },
  { view: "EVENTOS", label: "Súmula", helper: "Eventos do jogo" }
];

export function getGameSubViewFromSearch(search: string): GameSubView | null {
  const subView = new URLSearchParams(search).get("subView");
  return subView === "LISTA" ||
    subView === "CADASTRO" ||
    subView === "AGENDA" ||
    subView === "ARBITRAGEM" ||
    subView === "CONFIRMACOES" ||
    subView === "ESCALACAO" ||
    subView === "TACTICA" ||
    subView === "EVENTOS" ?
     subView
    : null;
}

export const showLegacyGameSections = false;
export const maxDraftAttemptsPerGame = 3;
export const defaultPlayersPerTeam = 11;
export const minGoalkeepersForDraft = 2;
export const DEFAULT_RED_UNIFORM_COLOR = "#94a3b8";
export const DEFAULT_WHITE_UNIFORM_COLOR = "#cbd5e1";
export const DEFAULT_RED_UNIFORM_NAME = "Time A";
export const DEFAULT_WHITE_UNIFORM_NAME = "Time B";

export function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style:"currency", currency:"BRL" }).format((cents || 0) / 100);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day:"2-digit", month:"2-digit", year:"numeric" }).format(new Date(value));
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" }).format(new Date(value));
}

export function firstFilledText(...values: Array<string | null | undefined>) {
  return values.find((value) => typeof value === "string" && value.trim().length > 0) ?? null;
}

export function formatLongDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}

export function toDateKey(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function toCents(value: string) {
  return Math.round(Number(value.replace(/\./g,"").replace(",",".")) * 100);
}

export function dateToInput(value: Date) {
  const offset = value.getTimezoneOffset();
  return new Date(value.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

export function datePartFromInput(value: string) {
  return value.includes("T") ? value.slice(0, 10) : value;
}

export function timePartFromInput(value: string) {
  return value.includes("T") ? value.slice(11, 16) : "";
}

export function setDatePartOnInput(value: string, nextDate: string) {
  const time = timePartFromInput(value) || "18:45";
  return `${nextDate}T${time}`;
}

export function setTimePartOnInput(value: string, nextTime: string) {
  const date = datePartFromInput(value) || toDateKey(new Date());
  return `${date}T${nextTime}`;
}

/**
 * Whether an athlete can be drafted/entered into a game lineup.
 *
 * `blockDelinquent` mirrors the club's `blockDelinquentFromLineup` setting
 * (see GroupSettings). It defaults to false so callers that don't pass it
 * keep today's behavior: an athlete whose own status is DELINQUENT, or
 * whose associate is LATE on dues, is still allowed to play — only
 * INACTIVE/SUSPENDED athletes and INACTIVE associates are blocked. Pass the
 * club's actual setting explicitly wherever this is used for real draft
 * decisions, not just this default.
 */
export function canEnterLineup(athlete: AthleteProfile, blockDelinquent = false) {
  const medicallyAvailable = athlete.medicalStatus !== "INJURED" && athlete.medicalStatus !== "TREATMENT";
  const statusBlocked = blockDelinquent
    ? athlete.status === "INACTIVE" || athlete.status === "SUSPENDED" || athlete.status === "DELINQUENT"
    : athlete.status === "INACTIVE" || athlete.status === "SUSPENDED";
  const associateBlocked = blockDelinquent
    ? athlete.associate?.status === "INACTIVE" || athlete.associate?.status === "LATE"
    : athlete.associate?.status === "INACTIVE";
  return medicallyAvailable && !statusBlocked && !associateBlocked;
}

export function isLineupFieldAthlete(athlete: AthleteProfile, blockDelinquent = false) {
  return canEnterLineup(athlete, blockDelinquent) && athlete.position !== "GOALKEEPER" && athlete.position !== "BOTH";
}

export function isGoalkeeperAthlete(athlete: Pick<AthleteProfile, "position"> | { position: string | null }) {
  return athlete.position === "GOALKEEPER" || athlete.position === "BOTH";
}

export function hasLineupAthlete(lineup: GameLineup | null | undefined): lineup is GameLineup {
  return Boolean(lineup && hasAthleteIdentity(lineup.athlete));
}

export function lineupBlockReason(athlete: AthleteProfile, blockDelinquent = false) {
  if (athlete.status === "INACTIVE" || athlete.status === "SUSPENDED") {
    const labels: Record<AthleteStatus, string> = {
      ACTIVE: "ativo",
      DELINQUENT: "inadimplente",
      INACTIVE: "inativo",
      SUSPENDED: "suspenso"
    };
    return `status ${labels[athlete.status] ?? athlete.status}`;
  }

  if (blockDelinquent && athlete.status === "DELINQUENT") {
    return "status inadimplente";
  }

  if (athlete.associate?.status === "INACTIVE") {
    return "associado inativo";
  }

  if (blockDelinquent && athlete.associate?.status === "LATE") {
    return "associado com mensalidade atrasada";
  }

  if (athlete.medicalStatus === "INJURED") {
    return "lesionado";
  }

  if (athlete.medicalStatus === "TREATMENT") {
    return "em tratamento";
  }

  return null;
}

export const gameTypeLabels: Record<GameType, string> = {
  INTERNAL:"Interno",
  EXTERNAL:"Externo"
};

export const teamCategoryLabels: Record<string, string> = {
  PRINCIPAL: "Principal",
  VETERANO: "Veterano",
  SUB_20: "Sub-20",
  SUB_17: "Sub-17",
  SUB_15: "Sub-15",
  FEMININO: "Feminino",
  MISTO: "Misto"
};

export const arrivalStatusLabels: Record<string, string> = {
  ON_TIME: "No horário",
  LATE: "Atrasado",
  NEEDS_RIDE: "Precisa carona",
  UNAVAILABLE: "Não vai"
};

export const athletePositionLabels: Record<AthletePosition, string> = {
  GOALKEEPER:"Goleiro",
  DEFENDER:"Zagueiro",
  FULLBACK:"Lateral",
  MIDFIELDER:"Meia",
  FORWARD:"Atacante",
  LINE:"Linha",
  BOTH:"Goleiro/Linha",
  RIGHT_BACK:"Lateral direito",
  LEFT_BACK:"Lateral esquerdo",
  DEFENSIVE_MIDFIELDER:"Volante",
  CENTRAL_MIDFIELDER:"Meia central",
  ATTACKING_MIDFIELDER:"Meia atacante",
  RIGHT_WINGER:"Ponta direita",
  LEFT_WINGER:"Ponta esquerda",
  STRIKER:"Centroavante"
};

export const draftDistributionPositions: AthletePosition[] = [
  "GOALKEEPER",
  "DEFENDER",
  "RIGHT_BACK",
  "LEFT_BACK",
  "DEFENSIVE_MIDFIELDER",
  "CENTRAL_MIDFIELDER",
  "ATTACKING_MIDFIELDER",
  "RIGHT_WINGER",
  "LEFT_WINGER",
  "STRIKER"
];

export function athletePositionText(athlete: Pick<AthleteProfile, "position" | "secondaryPositions">) {
  const alternatives = (athlete.secondaryPositions ?? []).filter((position) => position !== athlete.position);
  return [athletePositionLabels[athlete.position], ...alternatives.map((position) => athletePositionLabels[position])].join(" / ");
}

export function draftPositionDistribution(players: AthleteProfile[]) {
  return draftDistributionPositions
    .map((position) => ({
      position,
      label: athletePositionLabels[position],
      players: players.filter((athlete) => athlete.position === position || (athlete.secondaryPositions ?? []).includes(position))
    }))
    .filter((item) => item.players.length > 0);
}

export const pitchPositionOrder: Record<AthletePosition, number> = {
  GOALKEEPER: 0,
  DEFENDER: 1,
  RIGHT_BACK: 1,
  LEFT_BACK: 1,
  FULLBACK: 1,
  DEFENSIVE_MIDFIELDER: 2,
  CENTRAL_MIDFIELDER: 2,
  MIDFIELDER: 2,
  ATTACKING_MIDFIELDER: 3,
  RIGHT_WINGER: 4,
  LEFT_WINGER: 4,
  FORWARD: 4,
  STRIKER: 4,
  LINE: 5,
  BOTH: 5
};

export type PitchFormationKey =
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

export function lineupsToPitchSlots(lineups: GameLineup[], playersPerTeam = defaultPlayersPerTeam) {
  const slots: Array<{ id: string; name: string; number: number | null; position: AthletePosition } | null> = Array.from({ length: playersPerTeam }, () => null);
  const unslotted: GameLineup[] = [];

  for (const lineup of lineups) {
    if (!hasAthleteIdentity(lineup.athlete)) continue;
    const player = { id: lineup.athlete.id, name: lineup.athlete.name, number: lineup.jerseyNumber, position: lineup.athlete.position };
    const slotIndex = lineup.tacticalSlot !== null ? lineup.tacticalSlot - 1 : -1;
    if (slotIndex >= 0 && slotIndex < slots.length && !slots[slotIndex]) {
      slots[slotIndex] = player;
    } else {
      unslotted.push(lineup);
    }
  }

  for (const lineup of unslotted) {
    if (!hasAthleteIdentity(lineup.athlete)) continue;
    const emptyIndex = slots.findIndex((slot) => slot === null);
    if (emptyIndex === -1) break;
    slots[emptyIndex] = { id: lineup.athlete.id, name: lineup.athlete.name, number: lineup.jerseyNumber, position: lineup.athlete.position };
  }

  return slots;
}

export function lineupsToSlotList(lineups: GameLineup[], playersPerTeam = defaultPlayersPerTeam) {
  const slots: Array<GameLineup | null> = Array.from({ length: playersPerTeam }, () => null);
  const unslotted: GameLineup[] = [];

  for (const lineup of lineups) {
    if (!hasAthleteIdentity(lineup.athlete)) continue;
    const slotIndex = lineup.tacticalSlot !== null ? lineup.tacticalSlot - 1 : -1;
    if (slotIndex >= 0 && slotIndex < slots.length && !slots[slotIndex]) {
      slots[slotIndex] = lineup;
    } else {
      unslotted.push(lineup);
    }
  }

  for (const lineup of unslotted) {
    if (!lineup.athlete) continue;
    const emptyIndex = slots.findIndex((slot) => slot === null);
    if (emptyIndex === -1) break;
    slots[emptyIndex] = lineup;
  }

  return slots;
}

export const pitchFormationSlots: Record<PitchFormationKey, AthletePosition[][]> = {
  "4-3-3": [
    ["GOALKEEPER", "BOTH"],
    ["RIGHT_BACK", "FULLBACK", "DEFENDER", "LINE"],
    ["DEFENDER", "FULLBACK", "LINE"],
    ["DEFENDER", "FULLBACK", "LINE"],
    ["LEFT_BACK", "FULLBACK", "DEFENDER", "LINE"],
    ["DEFENSIVE_MIDFIELDER", "CENTRAL_MIDFIELDER", "MIDFIELDER", "LINE"],
    ["CENTRAL_MIDFIELDER", "MIDFIELDER", "ATTACKING_MIDFIELDER", "LINE"],
    ["ATTACKING_MIDFIELDER", "CENTRAL_MIDFIELDER", "MIDFIELDER", "LINE"],
    ["RIGHT_WINGER", "FORWARD", "STRIKER", "LINE"],
    ["STRIKER", "FORWARD", "RIGHT_WINGER", "LEFT_WINGER", "LINE"],
    ["LEFT_WINGER", "FORWARD", "STRIKER", "LINE"]
  ],
  "4-4-2": [
    ["GOALKEEPER", "BOTH"],
    ["RIGHT_BACK", "FULLBACK", "DEFENDER", "LINE"],
    ["DEFENDER", "FULLBACK", "LINE"],
    ["DEFENDER", "FULLBACK", "LINE"],
    ["LEFT_BACK", "FULLBACK", "DEFENDER", "LINE"],
    ["RIGHT_WINGER", "MIDFIELDER", "LINE"],
    ["DEFENSIVE_MIDFIELDER", "CENTRAL_MIDFIELDER", "MIDFIELDER", "LINE"],
    ["CENTRAL_MIDFIELDER", "ATTACKING_MIDFIELDER", "MIDFIELDER", "LINE"],
    ["LEFT_WINGER", "MIDFIELDER", "LINE"],
    ["FORWARD", "STRIKER", "LINE"],
    ["STRIKER", "FORWARD", "LINE"]
  ],
  "3-5-2": [
    ["GOALKEEPER", "BOTH"],
    ["DEFENDER", "RIGHT_BACK", "FULLBACK", "LINE"],
    ["DEFENDER", "FULLBACK", "LINE"],
    ["DEFENDER", "LEFT_BACK", "FULLBACK", "LINE"],
    ["RIGHT_WINGER", "RIGHT_BACK", "FULLBACK", "MIDFIELDER", "LINE"],
    ["DEFENSIVE_MIDFIELDER", "CENTRAL_MIDFIELDER", "MIDFIELDER", "LINE"],
    ["CENTRAL_MIDFIELDER", "MIDFIELDER", "LINE"],
    ["ATTACKING_MIDFIELDER", "CENTRAL_MIDFIELDER", "MIDFIELDER", "LINE"],
    ["LEFT_WINGER", "LEFT_BACK", "FULLBACK", "MIDFIELDER", "LINE"],
    ["FORWARD", "STRIKER", "LINE"],
    ["STRIKER", "FORWARD", "LINE"]
  ],
  "4-2-3-1": [
    ["GOALKEEPER", "BOTH"],
    ["RIGHT_BACK", "FULLBACK", "DEFENDER", "LINE"],
    ["DEFENDER", "FULLBACK", "LINE"],
    ["DEFENDER", "FULLBACK", "LINE"],
    ["LEFT_BACK", "FULLBACK", "DEFENDER", "LINE"],
    ["DEFENSIVE_MIDFIELDER", "CENTRAL_MIDFIELDER", "MIDFIELDER", "LINE"],
    ["DEFENSIVE_MIDFIELDER", "CENTRAL_MIDFIELDER", "MIDFIELDER", "LINE"],
    ["RIGHT_WINGER", "ATTACKING_MIDFIELDER", "FORWARD", "LINE"],
    ["ATTACKING_MIDFIELDER", "CENTRAL_MIDFIELDER", "MIDFIELDER", "LINE"],
    ["LEFT_WINGER", "ATTACKING_MIDFIELDER", "FORWARD", "LINE"],
    ["STRIKER", "FORWARD", "LINE"]
  ],
  "4-3-1-2": [
    ["GOALKEEPER", "BOTH"],
    ["RIGHT_BACK", "FULLBACK", "DEFENDER", "LINE"],
    ["DEFENDER", "FULLBACK", "LINE"],
    ["DEFENDER", "FULLBACK", "LINE"],
    ["LEFT_BACK", "FULLBACK", "DEFENDER", "LINE"],
    ["DEFENSIVE_MIDFIELDER", "CENTRAL_MIDFIELDER", "MIDFIELDER", "LINE"],
    ["CENTRAL_MIDFIELDER", "MIDFIELDER", "LINE"],
    ["CENTRAL_MIDFIELDER", "MIDFIELDER", "LINE"],
    ["ATTACKING_MIDFIELDER", "MIDFIELDER", "LINE"],
    ["FORWARD", "STRIKER", "LINE"],
    ["STRIKER", "FORWARD", "LINE"]
  ],
  "3-4-3": [
    ["GOALKEEPER", "BOTH"],
    ["DEFENDER", "RIGHT_BACK", "FULLBACK", "LINE"],
    ["DEFENDER", "FULLBACK", "LINE"],
    ["DEFENDER", "LEFT_BACK", "FULLBACK", "LINE"],
    ["RIGHT_WINGER", "RIGHT_BACK", "FULLBACK", "MIDFIELDER", "LINE"],
    ["DEFENSIVE_MIDFIELDER", "CENTRAL_MIDFIELDER", "MIDFIELDER", "LINE"],
    ["CENTRAL_MIDFIELDER", "ATTACKING_MIDFIELDER", "MIDFIELDER", "LINE"],
    ["LEFT_WINGER", "LEFT_BACK", "FULLBACK", "MIDFIELDER", "LINE"],
    ["RIGHT_WINGER", "FORWARD", "STRIKER", "LINE"],
    ["STRIKER", "FORWARD", "LINE"],
    ["LEFT_WINGER", "FORWARD", "STRIKER", "LINE"]
  ],
  "3-4-1-2": [
    ["GOALKEEPER", "BOTH"],
    ["DEFENDER", "RIGHT_BACK", "FULLBACK", "LINE"],
    ["DEFENDER", "FULLBACK", "LINE"],
    ["DEFENDER", "LEFT_BACK", "FULLBACK", "LINE"],
    ["RIGHT_WINGER", "RIGHT_BACK", "FULLBACK", "MIDFIELDER", "LINE"],
    ["DEFENSIVE_MIDFIELDER", "CENTRAL_MIDFIELDER", "MIDFIELDER", "LINE"],
    ["CENTRAL_MIDFIELDER", "MIDFIELDER", "LINE"],
    ["LEFT_WINGER", "LEFT_BACK", "FULLBACK", "MIDFIELDER", "LINE"],
    ["ATTACKING_MIDFIELDER", "CENTRAL_MIDFIELDER", "MIDFIELDER", "LINE"],
    ["FORWARD", "STRIKER", "LINE"],
    ["STRIKER", "FORWARD", "LINE"]
  ],
  "4-1-4-1": [
    ["GOALKEEPER", "BOTH"],
    ["RIGHT_BACK", "FULLBACK", "DEFENDER", "LINE"],
    ["DEFENDER", "FULLBACK", "LINE"],
    ["DEFENDER", "FULLBACK", "LINE"],
    ["LEFT_BACK", "FULLBACK", "DEFENDER", "LINE"],
    ["DEFENSIVE_MIDFIELDER", "CENTRAL_MIDFIELDER", "MIDFIELDER", "LINE"],
    ["RIGHT_WINGER", "MIDFIELDER", "LINE"],
    ["CENTRAL_MIDFIELDER", "MIDFIELDER", "LINE"],
    ["ATTACKING_MIDFIELDER", "CENTRAL_MIDFIELDER", "MIDFIELDER", "LINE"],
    ["LEFT_WINGER", "MIDFIELDER", "LINE"],
    ["STRIKER", "FORWARD", "LINE"]
  ],
  "4-5-1": [
    ["GOALKEEPER", "BOTH"],
    ["RIGHT_BACK", "FULLBACK", "DEFENDER", "LINE"],
    ["DEFENDER", "FULLBACK", "LINE"],
    ["DEFENDER", "FULLBACK", "LINE"],
    ["LEFT_BACK", "FULLBACK", "DEFENDER", "LINE"],
    ["RIGHT_WINGER", "MIDFIELDER", "LINE"],
    ["DEFENSIVE_MIDFIELDER", "CENTRAL_MIDFIELDER", "MIDFIELDER", "LINE"],
    ["CENTRAL_MIDFIELDER", "MIDFIELDER", "LINE"],
    ["ATTACKING_MIDFIELDER", "CENTRAL_MIDFIELDER", "MIDFIELDER", "LINE"],
    ["LEFT_WINGER", "MIDFIELDER", "LINE"],
    ["STRIKER", "FORWARD", "LINE"]
  ],
  "5-3-2": [
    ["GOALKEEPER", "BOTH"],
    ["RIGHT_BACK", "FULLBACK", "DEFENDER", "LINE"],
    ["DEFENDER", "FULLBACK", "LINE"],
    ["DEFENDER", "FULLBACK", "LINE"],
    ["DEFENDER", "LEFT_BACK", "FULLBACK", "LINE"],
    ["LEFT_BACK", "FULLBACK", "DEFENDER", "LINE"],
    ["DEFENSIVE_MIDFIELDER", "CENTRAL_MIDFIELDER", "MIDFIELDER", "LINE"],
    ["CENTRAL_MIDFIELDER", "MIDFIELDER", "LINE"],
    ["ATTACKING_MIDFIELDER", "CENTRAL_MIDFIELDER", "MIDFIELDER", "LINE"],
    ["FORWARD", "STRIKER", "LINE"],
    ["STRIKER", "FORWARD", "LINE"]
  ],
  "5-4-1": [
    ["GOALKEEPER", "BOTH"],
    ["RIGHT_BACK", "FULLBACK", "DEFENDER", "LINE"],
    ["DEFENDER", "FULLBACK", "LINE"],
    ["DEFENDER", "FULLBACK", "LINE"],
    ["DEFENDER", "LEFT_BACK", "FULLBACK", "LINE"],
    ["LEFT_BACK", "FULLBACK", "DEFENDER", "LINE"],
    ["RIGHT_WINGER", "MIDFIELDER", "LINE"],
    ["DEFENSIVE_MIDFIELDER", "CENTRAL_MIDFIELDER", "MIDFIELDER", "LINE"],
    ["CENTRAL_MIDFIELDER", "ATTACKING_MIDFIELDER", "MIDFIELDER", "LINE"],
    ["LEFT_WINGER", "MIDFIELDER", "LINE"],
    ["STRIKER", "FORWARD", "LINE"]
  ],
  "4-2-2-2": [
    ["GOALKEEPER", "BOTH"],
    ["RIGHT_BACK", "FULLBACK", "DEFENDER", "LINE"],
    ["DEFENDER", "FULLBACK", "LINE"],
    ["DEFENDER", "FULLBACK", "LINE"],
    ["LEFT_BACK", "FULLBACK", "DEFENDER", "LINE"],
    ["DEFENSIVE_MIDFIELDER", "CENTRAL_MIDFIELDER", "MIDFIELDER", "LINE"],
    ["DEFENSIVE_MIDFIELDER", "CENTRAL_MIDFIELDER", "MIDFIELDER", "LINE"],
    ["ATTACKING_MIDFIELDER", "RIGHT_WINGER", "MIDFIELDER", "LINE"],
    ["ATTACKING_MIDFIELDER", "LEFT_WINGER", "MIDFIELDER", "LINE"],
    ["FORWARD", "STRIKER", "LINE"],
    ["STRIKER", "FORWARD", "LINE"]
  ],
  "3-6-1": [
    ["GOALKEEPER", "BOTH"],
    ["DEFENDER", "RIGHT_BACK", "FULLBACK", "LINE"],
    ["DEFENDER", "FULLBACK", "LINE"],
    ["DEFENDER", "LEFT_BACK", "FULLBACK", "LINE"],
    ["RIGHT_WINGER", "RIGHT_BACK", "FULLBACK", "MIDFIELDER", "LINE"],
    ["DEFENSIVE_MIDFIELDER", "CENTRAL_MIDFIELDER", "MIDFIELDER", "LINE"],
    ["CENTRAL_MIDFIELDER", "MIDFIELDER", "LINE"],
    ["ATTACKING_MIDFIELDER", "CENTRAL_MIDFIELDER", "MIDFIELDER", "LINE"],
    ["LEFT_WINGER", "LEFT_BACK", "FULLBACK", "MIDFIELDER", "LINE"],
    ["ATTACKING_MIDFIELDER", "MIDFIELDER", "LINE"],
    ["STRIKER", "FORWARD", "LINE"]
  ]
};

export function detectPitchFormation<T extends { position: AthletePosition }>(athletes: T[]): PitchFormationKey {
  const outfield = athletes.filter((athlete) => athlete.position !== "GOALKEEPER" && athlete.position !== "BOTH").slice(0, 10);
  const defenders = outfield.filter((athlete) => ["DEFENDER", "RIGHT_BACK", "LEFT_BACK", "FULLBACK"].includes(athlete.position)).length;
  const midfielders = outfield.filter((athlete) => ["DEFENSIVE_MIDFIELDER", "CENTRAL_MIDFIELDER", "MIDFIELDER", "ATTACKING_MIDFIELDER", "LINE"].includes(athlete.position)).length;
  const attackers = outfield.filter((athlete) => ["RIGHT_WINGER", "LEFT_WINGER", "FORWARD", "STRIKER"].includes(athlete.position)).length;
  const attackingMids = outfield.filter((athlete) => athlete.position === "ATTACKING_MIDFIELDER").length;
  const defensiveMids = outfield.filter((athlete) => athlete.position === "DEFENSIVE_MIDFIELDER").length;
  const wingers = outfield.filter((athlete) => ["RIGHT_WINGER", "LEFT_WINGER"].includes(athlete.position)).length;

  if (defenders >= 5 && midfielders >= 4 && attackers <= 1) return "5-4-1";
  if (defenders >= 5 && attackers >= 2) return "5-3-2";
  if (defenders <= 3 && midfielders >= 6 && attackers <= 1) return "3-6-1";
  if (defenders <= 3 && midfielders >= 4 && attackingMids >= 1 && attackers >= 2) return "3-4-1-2";
  if (defenders <= 3 && midfielders >= 4 && attackers >= 3) return "3-4-3";
  if (defenders <= 3 && midfielders >= 5 && attackers >= 2) return "3-5-2";
  if (defenders >= 4 && midfielders >= 5 && attackers <= 1 && defensiveMids >= 1) return "4-1-4-1";
  if (defenders >= 4 && midfielders >= 5 && attackers <= 1) return "4-5-1";
  if (defenders >= 4 && defensiveMids >= 2 && attackingMids >= 2 && attackers >= 2) return "4-2-2-2";
  if (defenders >= 4 && midfielders >= 5 && attackers <= 2 && wingers >= 2) return "4-2-3-1";
  if (defenders >= 4 && midfielders >= 4 && attackers === 2) return "4-4-2";
  if (defenders >= 4 && midfielders >= 4 && attackers <= 2) return "4-3-1-2";
  return "4-3-3";
}

export function sortAthletesForPitch<T extends { name: string; position: AthletePosition; rating?: number | null }>(athletes: T[], formation?: PitchFormationKey) {
  const remaining = athletes
    .slice()
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || a.name.localeCompare(b.name));
  const slots = pitchFormationSlots[formation ?? detectPitchFormation(athletes)];
  const ordered: T[] = [];

  for (const preferredPositions of slots) {
    const exactIndex = remaining.findIndex((athlete) => preferredPositions.includes(athlete.position));
    const fallbackIndex = exactIndex >= 0 ? exactIndex : remaining.findIndex((athlete) => athlete.position !== "GOALKEEPER");
    const index = fallbackIndex >= 0 ? fallbackIndex : remaining.length > 0 ? 0 : -1;
    if (index >= 0) {
      const [athlete] = remaining.splice(index, 1);
      ordered.push(athlete as T);
    }
  }

  return [...ordered, ...remaining];
}

export const eventTypeLabels: Record<GameEventType, string> = {
  GOAL: "Gol",
  OWN_GOAL: "Gol contra",
  ASSIST: "Assistência",
  YELLOW_CARD: "Cartão amarelo",
  RED_CARD: "Cartão vermelho",
  PENALTY_SCORED: "Pênalti convertido",
  PENALTY_MISSED: "Pênalti perdido"
};

export const buttonStyles = {
  primary: "fl-brand-primary-action rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-60",
  secondary: "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60",
  danger: "fl-danger-action rounded-lg border border-transparent px-3 py-2 text-sm font-semibold disabled:opacity-60",
  dangerOutline: "rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60",
  info: "rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-60"
};

export type TacticalPlanKey = "A" | "B" | "C";
export type TacticalFormationKey = PitchFormationKey;

export type TacticalFormationTemplate = {
  key: TacticalFormationKey;
  label: string;
  lines: number[];
  profile: string;
};

export type TacticalPlanState = {
  formation: TacticalFormationKey;
  phase: "ATAQUE" | "EQUILIBRADO" | "DEFESA";
  note: string;
  substitutions: string;
};

export type TacticalAthlete = {
  id: string;
  name: string;
  position: AthletePosition;
  rating: number;
};

export type GameNotifyResponse = {
  gameId: string;
  selectedAthletes: number;
  recipients: number;
  sentEmail: number;
  sentWhatsapp: number;
  skippedNoContact: number;
  channels: {
    email: boolean;
    whatsapp: boolean;
  };
};

export const tacticalFormationTemplates: TacticalFormationTemplate[] = [
  { key: "4-3-3", label: "4-3-3", lines: [4, 3, 3], profile: "Com pontas" },
  { key: "4-4-2", label: "4-4-2", lines: [4, 4, 2], profile: "Sem ponta" },
  { key: "3-5-2", label: "3-5-2", lines: [3, 5, 2], profile: "Ala forte" },
  { key: "4-2-3-1", label: "4-2-3-1", lines: [4, 2, 3, 1], profile: "Com meia central" },
  { key: "4-3-1-2", label: "4-3-1-2", lines: [4, 3, 1, 2], profile: "Sem ponta, dois atacantes" },
  { key: "3-4-3", label: "3-4-3", lines: [3, 4, 3], profile: "Ataque aberto" },
  { key: "3-4-1-2", label: "3-4-1-2", lines: [3, 4, 1, 2], profile: "Meia livre" },
  { key: "4-1-4-1", label: "4-1-4-1", lines: [4, 1, 4, 1], profile: "Volante fixo" },
  { key: "4-5-1", label: "4-5-1", lines: [4, 5, 1], profile: "Meio forte" },
  { key: "5-3-2", label: "5-3-2", lines: [5, 3, 2], profile: "Defesa forte" },
  { key: "5-4-1", label: "5-4-1", lines: [5, 4, 1], profile: "Fechado" },
  { key: "4-2-2-2", label: "4-2-2-2", lines: [4, 2, 2, 2], profile: "Dois meias" },
  { key: "3-6-1", label: "3-6-1", lines: [3, 6, 1], profile: "Controle do meio" }
];

export const validPitchFormations = new Set<PitchFormationKey>(Object.keys(pitchFormationSlots) as PitchFormationKey[]);

export function persistedPitchFormation(value: string | null | undefined): PitchFormationKey | "AUTO" {
  return value && validPitchFormations.has(value as PitchFormationKey) ? (value as PitchFormationKey) : "AUTO";
}

export const defaultTacticalPlan: TacticalPlanState = {
  formation: "4-4-2",
  phase: "EQUILIBRADO",
  note: "",
  substitutions: ""
};

export function createDefaultTacticalPlans(): Record<TacticalPlanKey, TacticalPlanState> {
  return {
    A: { ...defaultTacticalPlan, formation: "4-4-2", phase: "EQUILIBRADO" },
    B: { ...defaultTacticalPlan, formation: "4-3-3", phase: "ATAQUE" },
    C: { ...defaultTacticalPlan, formation: "4-3-1-2", phase: "DEFESA" }
  };
}

export function shortAthleteName(name: string) {
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length <= 1) {
    return name;
  }
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

export function normalizedHex(value: string | undefined) {
  if (!value) {
    return null;
  }
  const kit = parseTeamKit(value);
  if (value.trim().startsWith("kit:")) {
    return kit.primary;
  }
  const trimmed = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed : null;
}

export function uniformColorHex(value: string | null | undefined, fallback: string) {
  const normalized = normalizedHex(value ?? undefined);
  if (normalized) {
    return normalized;
  }

  const namedColors: Record<string, string> = {
    vermelho: "#ef3340",
    branca: "#ffffff",
    branco: "#ffffff",
    preto: "#111827",
    preta: "#111827",
    azul: "#2563eb",
    verde: "#059669",
    amarelo: "#facc15",
    cinza: "#64748b"
  };

  return namedColors[(value ?? "").trim().toLowerCase()] ?? fallback;
}

export function readableTextColor(background: string | undefined) {
  const hex = normalizedHex(background);
  if (!hex) {
    return "#ffffff";
  }
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.66 ? "#0f172a" : "#ffffff";
}

export function buildFormationRowsFromAthletes(athletes: TacticalAthlete[], formation: TacticalFormationKey) {
  const template = tacticalFormationTemplates.find((item) => item.key === formation) ?? tacticalFormationTemplates[0];
  const ordered = [...athletes].sort((a, b) => b.rating - a.rating);
  const goalkeeper = ordered.find((athlete) => athlete.position === "GOALKEEPER" || athlete.position === "BOTH") ?? null;
  const outfield = goalkeeper ? ordered.filter((athlete) => athlete.id !== goalkeeper.id) : ordered;

  const defenders = outfield.filter((athlete) => ["DEFENDER", "FULLBACK", "RIGHT_BACK", "LEFT_BACK"].includes(athlete.position));
  const midfielders = outfield.filter((athlete) => ["MIDFIELDER", "DEFENSIVE_MIDFIELDER", "CENTRAL_MIDFIELDER", "ATTACKING_MIDFIELDER", "LINE"].includes(athlete.position));
  const forwards = outfield.filter((athlete) => ["FORWARD", "RIGHT_WINGER", "LEFT_WINGER", "STRIKER"].includes(athlete.position));
  const fallback = outfield.filter((athlete) => !defenders.some((item) => item.id === athlete.id) && !midfielders.some((item) => item.id === athlete.id) && !forwards.some((item) => item.id === athlete.id));
  const usedIds = new Set<string>();

  const defensePool = [...defenders, ...fallback];
  const midfieldPool = [...midfielders, ...fallback];
  const attackPool = [...forwards, ...fallback];

  const rows = template.lines.map((count, index) => {
    const source = index === 0 ? defensePool : index === template.lines.length - 1 ? attackPool : midfieldPool;
    const selected = source.filter((athlete) => !usedIds.has(athlete.id)).slice(0, count);
    selected.forEach((athlete) => usedIds.add(athlete.id));
    if (selected.length < count) {
      const extras = outfield.filter((athlete) => !usedIds.has(athlete.id)).slice(0, count - selected.length);
      extras.forEach((athlete) => usedIds.add(athlete.id));
      selected.push(...extras);
    }
    const filled = [...selected, ...Array.from({ length: Math.max(0, count - selected.length) }, () => null)];
    return filled;
  });

  return {
    template,
    goalkeeper,
    rows
  };
}

export function recommendFormations(athletes: TacticalAthlete[]) {
  const defenders = athletes.filter((athlete) => ["DEFENDER", "FULLBACK", "RIGHT_BACK", "LEFT_BACK"].includes(athlete.position)).length;
  const midfielders = athletes.filter((athlete) => ["MIDFIELDER", "DEFENSIVE_MIDFIELDER", "CENTRAL_MIDFIELDER", "ATTACKING_MIDFIELDER", "LINE"].includes(athlete.position)).length;
  const forwards = athletes.filter((athlete) => ["FORWARD", "RIGHT_WINGER", "LEFT_WINGER", "STRIKER"].includes(athlete.position)).length;
  const wingers = athletes.filter((athlete) => ["RIGHT_WINGER", "LEFT_WINGER"].includes(athlete.position)).length;
  const strikers = athletes.filter((athlete) => athlete.position === "STRIKER").length;

  const scoring = [
    { key: "4-3-3" as TacticalFormationKey, need: { d: 4, m: 3, f: 3, w: 2, s: 1 }, text: "Melhor quando o time tem pontas de origem." },
    { key: "4-4-2" as TacticalFormationKey, need: { d: 4, m: 4, f: 2, w: 0, s: 2 }, text: "Equilibrada para jogo fisico e veterano." },
    { key: "3-5-2" as TacticalFormationKey, need: { d: 3, m: 5, f: 2, w: 0, s: 2 }, text: "Domina meio-campo com dois atacantes." },
    { key: "4-2-3-1" as TacticalFormationKey, need: { d: 4, m: 5, f: 1, w: 2, s: 1 }, text: "Cria entrelinhas com meia central." },
    { key: "4-3-1-2" as TacticalFormationKey, need: { d: 4, m: 4, f: 2, w: 0, s: 2 }, text: "Sem ponta, foco no corredor central." }
  ];

  return scoring
    .map((item) => {
      const score =
        Math.min(defenders, item.need.d) * 3 +
        Math.min(midfielders, item.need.m) * 2 +
        Math.min(forwards, item.need.f) * 3 +
        Math.min(wingers, item.need.w) * 2 +
        Math.min(strikers, item.need.s) * 2;
      return { ...item, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item, index) => ({
      rank: index + 1,
      formation: item.key,
      score: item.score,
      reason: item.text
    }));
}

