import type { DragEvent, ReactNode } from "react";
import { normalizeTeamColor } from "../../utils/teamColors";
import { BenchPlayerCard, TacticalPlayerCard } from "./KitRenderer";

export type PitchPlayer = {
  id: string;
  name: string;
  number: number | null;
  position: string;
  isCaptain?: boolean;
};

export type PitchFormation =
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

type FullPitchBoardProps = {
  redColor: string;
  whiteColor: string;
  redPlayers: Array<PitchPlayer | null>;
  whitePlayers: Array<PitchPlayer | null>;
  redTeamName: string;
  whiteTeamName: string;
  redCrestUrl?: string | null;
  whiteCrestUrl?: string | null;
  redBenchPlayers: PitchPlayer[];
  whiteBenchPlayers: PitchPlayer[];
  redFormation: PitchFormation;
  whiteFormation: PitchFormation;
  focusTeam: "RED" | "WHITE" | "BOTH";
  className?: string;
  minimumWidth?: number;
  aspectRatio?: number;
  presentation?: "standard" | "tactical";
  overlayControls?: ReactNode;
  actionControls?: ReactNode;
  mode?: "edit" | "view";
  interactive?: boolean;
  showBench?: boolean;
  showPlayerNumbers?: boolean;
  onPlayerDrop?: (team: "RED" | "WHITE", fromIndex: number, toIndex: number) => void;
  onAthleteDrop?: (team: "RED" | "WHITE", athleteId: string, toIndex: number) => void;
  onPlayerRemove?: (team: "RED" | "WHITE", index: number) => void;
};

const fullRedSlots = [
  { x: 6, y: 50 },
  { x: 18, y: 18 },
  { x: 18, y: 38 },
  { x: 18, y: 62 },
  { x: 18, y: 82 },
  { x: 32, y: 24 },
  { x: 32, y: 50 },
  { x: 32, y: 76 },
  { x: 45, y: 22 },
  { x: 45, y: 50 },
  { x: 45, y: 78 }
];

const fullWhiteSlots = fullRedSlots.map((slot) => ({ x: 100 - slot.x, y: slot.y }));

const focusedFormationSlots: Record<PitchFormation, Array<{ x: number; y: number; label: string }>> = {
  "4-3-3": [
    { x: 9, y: 50, label: "GOL" },
    { x: 28, y: 17, label: "LD" },
    { x: 28, y: 38, label: "ZAG" },
    { x: 28, y: 58, label: "ZAG" },
    { x: 28, y: 78, label: "LE" },
    { x: 50, y: 24, label: "VOL" },
    { x: 50, y: 48, label: "MEI" },
    { x: 50, y: 70, label: "MEI" },
    { x: 73, y: 21, label: "PD" },
    { x: 75, y: 48, label: "ATA" },
    { x: 73, y: 72, label: "PE" }
  ],
  "4-4-2": [
    { x: 9, y: 50, label: "GOL" },
    { x: 24, y: 18, label: "LD" },
    { x: 24, y: 39, label: "ZAG" },
    { x: 24, y: 61, label: "ZAG" },
    { x: 24, y: 82, label: "LE" },
    { x: 49, y: 18, label: "MD" },
    { x: 49, y: 39, label: "VOL" },
    { x: 49, y: 61, label: "MEI" },
    { x: 49, y: 82, label: "ME" },
    { x: 80, y: 38, label: "ATA" },
    { x: 80, y: 62, label: "ATA" }
  ],
  "3-5-2": [
    { x: 9, y: 50, label: "GOL" },
    { x: 24, y: 30, label: "ZAG" },
    { x: 25, y: 50, label: "ZAG" },
    { x: 24, y: 70, label: "ZAG" },
    { x: 48, y: 10, label: "ALA" },
    { x: 48, y: 31, label: "VOL" },
    { x: 48, y: 50, label: "MEI" },
    { x: 48, y: 69, label: "MEI" },
    { x: 48, y: 90, label: "ALA" },
    { x: 80, y: 38, label: "ATA" },
    { x: 80, y: 62, label: "ATA" }
  ],
  "4-2-3-1": [
    { x: 9, y: 50, label: "GOL" },
    { x: 24, y: 18, label: "LD" },
    { x: 24, y: 39, label: "ZAG" },
    { x: 24, y: 61, label: "ZAG" },
    { x: 24, y: 82, label: "LE" },
    { x: 43, y: 39, label: "VOL" },
    { x: 43, y: 61, label: "VOL" },
    { x: 64, y: 22, label: "PD" },
    { x: 64, y: 50, label: "MEI" },
    { x: 64, y: 78, label: "PE" },
    { x: 84, y: 50, label: "ATA" }
  ],
  "4-3-1-2": [
    { x: 9, y: 50, label: "GOL" },
    { x: 24, y: 18, label: "LD" },
    { x: 24, y: 39, label: "ZAG" },
    { x: 24, y: 61, label: "ZAG" },
    { x: 24, y: 82, label: "LE" },
    { x: 45, y: 28, label: "VOL" },
    { x: 45, y: 50, label: "MEI" },
    { x: 45, y: 72, label: "MEI" },
    { x: 63, y: 50, label: "MEI" },
    { x: 82, y: 38, label: "ATA" },
    { x: 82, y: 62, label: "ATA" }
  ],
  "3-4-3": [
    { x: 9, y: 50, label: "GOL" },
    { x: 24, y: 30, label: "ZAG" },
    { x: 25, y: 50, label: "ZAG" },
    { x: 24, y: 70, label: "ZAG" },
    { x: 48, y: 18, label: "ALA" },
    { x: 48, y: 39, label: "VOL" },
    { x: 48, y: 61, label: "MEI" },
    { x: 48, y: 82, label: "ALA" },
    { x: 78, y: 22, label: "PD" },
    { x: 83, y: 50, label: "ATA" },
    { x: 78, y: 78, label: "PE" }
  ],
  "3-4-1-2": [
    { x: 9, y: 50, label: "GOL" },
    { x: 24, y: 30, label: "ZAG" },
    { x: 25, y: 50, label: "ZAG" },
    { x: 24, y: 70, label: "ZAG" },
    { x: 47, y: 18, label: "ALA" },
    { x: 47, y: 39, label: "VOL" },
    { x: 47, y: 61, label: "MEI" },
    { x: 47, y: 82, label: "ALA" },
    { x: 64, y: 50, label: "MEI" },
    { x: 82, y: 38, label: "ATA" },
    { x: 82, y: 62, label: "ATA" }
  ],
  "4-1-4-1": [
    { x: 9, y: 50, label: "GOL" },
    { x: 24, y: 18, label: "LD" },
    { x: 24, y: 39, label: "ZAG" },
    { x: 24, y: 61, label: "ZAG" },
    { x: 24, y: 82, label: "LE" },
    { x: 43, y: 50, label: "VOL" },
    { x: 62, y: 18, label: "MD" },
    { x: 62, y: 39, label: "MEI" },
    { x: 62, y: 61, label: "MEI" },
    { x: 62, y: 82, label: "ME" },
    { x: 84, y: 50, label: "ATA" }
  ],
  "4-5-1": [
    { x: 9, y: 50, label: "GOL" },
    { x: 24, y: 18, label: "LD" },
    { x: 24, y: 39, label: "ZAG" },
    { x: 24, y: 61, label: "ZAG" },
    { x: 24, y: 82, label: "LE" },
    { x: 50, y: 10, label: "MD" },
    { x: 50, y: 31, label: "VOL" },
    { x: 50, y: 50, label: "MEI" },
    { x: 50, y: 69, label: "MEI" },
    { x: 50, y: 90, label: "ME" },
    { x: 84, y: 50, label: "ATA" }
  ],
  "5-3-2": [
    { x: 9, y: 50, label: "GOL" },
    { x: 24, y: 10, label: "LD" },
    { x: 24, y: 31, label: "ZAG" },
    { x: 24, y: 50, label: "ZAG" },
    { x: 24, y: 69, label: "ZAG" },
    { x: 24, y: 90, label: "LE" },
    { x: 49, y: 28, label: "VOL" },
    { x: 49, y: 50, label: "MEI" },
    { x: 49, y: 72, label: "MEI" },
    { x: 80, y: 38, label: "ATA" },
    { x: 80, y: 62, label: "ATA" }
  ],
  "5-4-1": [
    { x: 9, y: 50, label: "GOL" },
    { x: 24, y: 10, label: "LD" },
    { x: 24, y: 31, label: "ZAG" },
    { x: 24, y: 50, label: "ZAG" },
    { x: 24, y: 69, label: "ZAG" },
    { x: 24, y: 90, label: "LE" },
    { x: 50, y: 18, label: "MD" },
    { x: 50, y: 39, label: "VOL" },
    { x: 50, y: 61, label: "MEI" },
    { x: 50, y: 82, label: "ME" },
    { x: 84, y: 50, label: "ATA" }
  ],
  "4-2-2-2": [
    { x: 9, y: 50, label: "GOL" },
    { x: 24, y: 18, label: "LD" },
    { x: 24, y: 39, label: "ZAG" },
    { x: 24, y: 61, label: "ZAG" },
    { x: 24, y: 82, label: "LE" },
    { x: 43, y: 39, label: "VOL" },
    { x: 43, y: 61, label: "VOL" },
    { x: 64, y: 36, label: "MEI" },
    { x: 64, y: 64, label: "MEI" },
    { x: 82, y: 38, label: "ATA" },
    { x: 82, y: 62, label: "ATA" }
  ],
  "3-6-1": [
    { x: 9, y: 50, label: "GOL" },
    { x: 24, y: 30, label: "ZAG" },
    { x: 25, y: 50, label: "ZAG" },
    { x: 24, y: 70, label: "ZAG" },
    { x: 47, y: 10, label: "ALA" },
    { x: 47, y: 31, label: "VOL" },
    { x: 47, y: 50, label: "MEI" },
    { x: 47, y: 69, label: "MEI" },
    { x: 47, y: 90, label: "ALA" },
    { x: 65, y: 50, label: "MEI" },
    { x: 84, y: 50, label: "ATA" }
  ]
};

const fullSlotLabels = ["GOL", "LD", "ZAG", "ZAG", "LE", "VOL", "MEI", "MEI", "PD", "ATA", "PE"];
const goalkeeperKitColors: Record<"RED" | "WHITE", string> = {
  RED: "#0891b2",
  WHITE: "#0891b2"
};
const shirtClipPath =
  "polygon(22% 0, 36% 0, 42% 11%, 58% 11%, 64% 0, 78% 0, 100% 23%, 84% 40%, 78% 33%, 78% 100%, 22% 100%, 22% 33%, 16% 40%, 0 23%)";

function normalizeHex(color: string, fallback = "#94a3b8") {
  return normalizeTeamColor(color, fallback);
}

function TeamPlayer({
  player,
  kitSource,
  fallbackColor,
  crestUrl,
  goalkeeperKitSource,
  fallbackNumber,
  draggable,
  onDragStart,
  onRemove,
  slotLabel
}: {
  player: PitchPlayer;
  kitSource: string;
  fallbackColor: string;
  crestUrl?: string | null;
  goalkeeperKitSource: string;
  fallbackNumber: number;
  draggable: boolean;
  onDragStart: (event: DragEvent<HTMLDivElement>) => void;
  onRemove?: () => void;
  slotLabel: string;
}) {
  const isGoalkeeper = player.position === "GOALKEEPER";
  const displayNumber = player.number !== null && player.number !== undefined ? player.number : fallbackNumber;
  return (
    <TacticalPlayerCard
      name={player.name}
      position={isGoalkeeper ? "GOL" : slotLabel}
      number={displayNumber}
      kitSource={isGoalkeeper ? goalkeeperKitSource : kitSource}
      fallbackColor={isGoalkeeper ? goalkeeperKitSource : fallbackColor}
      crestUrl={crestUrl}
      isCaptain={player.isCaptain}
      isGoalkeeper={isGoalkeeper}
      draggable={draggable}
      onDragStart={onDragStart}
      onRemove={onRemove}
      title={`${displayNumber ? `#${displayNumber} ` : ""}${player.name}`}
    />
  );
}

function BenchRail({
  label,
  players,
  align = "left",
  team,
  draggable = false,
  showPlayerNumbers = true,
  kitSource,
  fallbackColor,
  crestUrl
}: {
  label: string;
  players: PitchPlayer[];
  align?: "left" | "right";
  team: "RED" | "WHITE";
  draggable?: boolean;
  showPlayerNumbers?: boolean;
  kitSource: string;
  fallbackColor: string;
  crestUrl?: string | null;
}) {
  return (
    <div
      className={`absolute z-30 border border-emerald-300/15 bg-emerald-950/90 shadow-[0_10px_24px_rgba(2,44,34,0.38)] backdrop-blur ${align === "right" ? "right-2" : "left-2"}`}
      style={{ bottom: "clamp(6px, 0.65vw, 12px)", width: "clamp(260px, 62vw, 1010px)", maxWidth: "64%", height: "clamp(72px, 9.4vw, 154px)", padding: "clamp(6px, 0.62vw, 12px)", borderRadius: "clamp(8px, 0.8vw, 14px)" }}
    >
      <p className="font-black uppercase tracking-[0.08em] text-emerald-300" style={{ marginBottom: "clamp(4px, 0.35vw, 7px)", fontSize: "clamp(7px, 0.62vw, 11px)" }}>{label}</p>
      <div className={`flex overflow-hidden ${align === "right" ? "justify-end" : ""}`} style={{ gap: "clamp(5px, 0.45vw, 9px)" }}>
        {players.length === 0 ? (
          <span className="font-bold text-emerald-100/65" style={{ fontSize: "clamp(8px, 0.65vw, 12px)" }}>Nenhum atleta no banco</span>
        ) : players.slice(0, 10).map((player, index) => (
          <BenchPlayerCard
            key={`bench-${player.id}-${index}`}
            draggable={draggable}
            onDragStart={(event) => {
              if (!draggable) return;
              event.dataTransfer.setData("text/plain", `ATHLETE:${team}:${player.id}`);
            }}
            kitSource={player.position === "GOALKEEPER" ? goalkeeperKitColors[team] : kitSource}
            fallbackColor={player.position === "GOALKEEPER" ? goalkeeperKitColors[team] : fallbackColor}
            crestUrl={crestUrl}
            name={player.name}
            position={player.position === "GOALKEEPER" ? "GOL" : player.position}
            number={showPlayerNumbers ? (player.number ?? index + 12) : null}
            isCaptain={player.isCaptain}
            embedded
            title={draggable ? `${player.name} - arraste para o campo` : player.name}
          />
        ))}
      </div>
    </div>
  );
}

export function FullPitchBoard({
  redColor,
  whiteColor,
  redPlayers,
  whitePlayers,
  redTeamName = "Time A",
  whiteTeamName = "Time B",
  redCrestUrl = null,
  whiteCrestUrl = null,
  redBenchPlayers = [],
  whiteBenchPlayers = [],
  redFormation = "4-3-3",
  whiteFormation = "4-3-3",
  focusTeam = "BOTH",
  className = "",
  minimumWidth,
  aspectRatio,
  presentation = "standard",
  overlayControls,
  actionControls,
  mode,
  interactive,
  showBench = true,
  showPlayerNumbers = true,
  onPlayerDrop,
  onAthleteDrop,
  onPlayerRemove
}: FullPitchBoardProps) {
  const isInteractive = interactive ?? mode === "edit";
  const isTacticalPresentation = presentation === "tactical";
  const safeRed = normalizeHex(redColor, "#ffffff");
  const safeWhite = normalizeHex(whiteColor, "#ffffff");

  function handleDrop(team: "RED" | "WHITE", toIndex: number, rawData: string) {
    const [dragType, dragTeam, athleteId] = rawData.split(":");
    if (dragType === "ATHLETE" && (dragTeam === "RED" || dragTeam === "WHITE") && athleteId) {
      onAthleteDrop?.(team, athleteId, toIndex);
      return;
    }

    if (!onPlayerDrop) return;
    const [fromTeam, indexText] = rawData.split(":");
    const fromIndex = Number(indexText);
    if ((fromTeam === "RED" || fromTeam === "WHITE") && fromTeam === team && Number.isInteger(fromIndex)) {
      onPlayerDrop(team, fromIndex, toIndex);
    }
  }

  function renderTeamSlots(team: "RED" | "WHITE", slots: Array<{ x: number; y: number; label?: string }>, players: Array<PitchPlayer | null>, rawColor: string, fallbackColor: string, crestUrl?: string | null) {
    return slots.map((slot, index) => {
      const player = players[index] ?? null;
      return (
        <div
          key={`${team.toLowerCase()}-slot-${index}`}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `${isTacticalPresentation ? Math.min(86, Math.max(8, slot.x)) : slot.x}%`,
            top: `${isTacticalPresentation ? Math.min(79, Math.max(17, slot.y)) : slot.y}%`
          }}
          onDragOver={(event) => {
            if (!isInteractive) return;
            event.preventDefault();
          }}
          onDrop={(event) => {
            if (!isInteractive) return;
            event.preventDefault();
            handleDrop(team, index, event.dataTransfer.getData("text/plain"));
          }}
        >
          {player ? (
            <TeamPlayer
              player={player}
              kitSource={rawColor}
              fallbackColor={fallbackColor}
              crestUrl={crestUrl}
              goalkeeperKitSource={goalkeeperKitColors[team]}
              fallbackNumber={index + 1}
              slotLabel={slot.label ?? fullSlotLabels[index] ?? `P${index + 1}`}
              draggable={isInteractive}
              onDragStart={(event) => {
                if (!isInteractive) return;
                event.dataTransfer.setData("text/plain", `${team}:${index}`);
              }}
              onRemove={isInteractive && onPlayerRemove ? () => onPlayerRemove(team, index) : undefined}
            />
          ) : isTacticalPresentation ? (
            <span
              className="block"
              style={{ width: "clamp(72px, 7vw, 128px)", height: "clamp(86px, 8.2vw, 150px)", opacity: 0 }}
              aria-hidden="true"
            />
          ) : (
            <span
              className="fl-pitch-placeholder inline-flex items-center justify-center border border-dashed border-white/18 bg-black/0 font-black uppercase text-white/38 transition hover:border-white/45 hover:bg-white/10 hover:text-white"
              style={{ width: "clamp(28px, 3.7vw, 64px)", height: "clamp(24px, 3.3vw, 58px)", fontSize: "clamp(6px, 0.48vw, 9px)", clipPath: shirtClipPath }}
            >
              <span className="rounded-full bg-black/18 leading-none" style={{ padding: "clamp(1px, 0.18vw, 3px) clamp(3px, 0.35vw, 6px)" }}>{slot.label ?? fullSlotLabels[index] ?? `P${index + 1}`}</span>
            </span>
          )}
        </div>
      );
    });
  }

  const showBothTeams = focusTeam === "BOTH";
  const focusedTeam = focusTeam === "WHITE" ? "WHITE" : "RED";
  const focusedPlayers = focusedTeam === "RED" ? redPlayers : whitePlayers;
  const focusedBenchPlayers = focusedTeam === "RED" ? redBenchPlayers : whiteBenchPlayers;
  const focusedColor = focusedTeam === "RED" ? safeRed : safeWhite;
  const focusedFormation = focusedTeam === "RED" ? redFormation : whiteFormation;
  const focusedSlots = focusedFormationSlots[focusedFormation] ?? focusedFormationSlots["4-3-3"];

  return (
    <div
      className={`fl-pitch-board relative overflow-hidden border border-emerald-700/35 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18),0_18px_38px_rgba(15,23,42,0.16)] ${className}`}
      style={{
        containerType: "inline-size",
        minWidth: minimumWidth,
        aspectRatio,
        borderRadius: isTacticalPresentation ? "clamp(10px, 1.1vw, 20px)" : "0.5rem",
        borderColor: isTacticalPresentation ? "#022c22" : "#064e3b",
        borderWidth: isTacticalPresentation ? "clamp(5px,0.55vw,9px)" : "clamp(3px,0.35cqw,6px)",
        backgroundColor: isTacticalPresentation ? "#188a23" : "#16823c",
        backgroundImage: isTacticalPresentation
          ? "radial-gradient(circle at 49% 47%, rgba(255,255,255,0.12), transparent 15%), radial-gradient(circle at 50% 52%, rgba(2,44,34,0.18), transparent 33%), linear-gradient(90deg, rgba(0,0,0,0.2), transparent 10%, transparent 88%, rgba(0,0,0,0.24)), linear-gradient(180deg, rgba(136,255,65,0.16), rgba(0,54,21,0.22)), repeating-linear-gradient(90deg, rgba(255,255,255,0.08) 0, rgba(255,255,255,0.08) 8.33%, rgba(0,0,0,0.06) 8.33%, rgba(0,0,0,0.06) 16.66%)"
          : "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(0,0,0,0.12)), repeating-linear-gradient(90deg, rgba(255,255,255,0.055) 0, rgba(255,255,255,0.055) 72px, rgba(0,0,0,0.045) 72px, rgba(0,0,0,0.045) 144px)",
        boxShadow: isTacticalPresentation
          ? "inset 0 0 0 1px rgba(52,211,153,0.28), inset 0 -34px 58px rgba(1,31,21,0.28), inset 0 28px 55px rgba(1,31,21,0.18), 0 16px 34px rgba(15,23,42,0.2)"
          : "inset 0 0 0 1px rgba(255,255,255,0.16), inset 0 -24px 45px rgba(1,50,23,0.16), 0 14px 32px rgba(15,23,42,0.18)"
      }}
    >
      <div className="pointer-events-none absolute inset-0 z-[5]">
        {showBothTeams ? (
          <>
            {redCrestUrl && !isTacticalPresentation ? <img src={redCrestUrl} alt="" aria-hidden="true" className="absolute left-[25%] top-1/2 h-[34%] max-h-44 w-auto -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.14]" /> : null}
            {whiteCrestUrl && !isTacticalPresentation ? <img src={whiteCrestUrl} alt="" aria-hidden="true" className="absolute left-[75%] top-1/2 h-[34%] max-h-44 w-auto -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.14]" /> : null}
          </>
        ) : (
          <>
            {(focusedTeam === "RED" ? redCrestUrl : whiteCrestUrl) && !isTacticalPresentation ? (
              <img
                src={(focusedTeam === "RED" ? redCrestUrl : whiteCrestUrl) ?? ""}
                alt=""
                aria-hidden="true"
                className="absolute left-1/2 top-1/2 h-[42%] max-h-56 w-auto -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.14]"
              />
            ) : null}
          </>
        )}
      </div>
      <svg
        className={`pointer-events-none absolute z-10 ${isTacticalPresentation ? "" : "inset-2 h-[calc(100%-1rem)] w-[calc(100%-1rem)]"}`}
        style={isTacticalPresentation ? { left: "clamp(5px, 0.55vw, 9px)", right: "clamp(5px, 0.55vw, 9px)", top: "clamp(25px, 3.95vw, 66px)", bottom: "clamp(5px, 0.55vw, 9px)", width: "auto", height: "auto" } : undefined}
        viewBox="0 0 105 68"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <g fill="none" stroke="#ffffff" strokeLinecap="round" strokeLinejoin="round" strokeOpacity={isTacticalPresentation ? "0.7" : "0.68"} strokeWidth={isTacticalPresentation ? "0.26" : "0.26"}>
          <rect x="1" y="1" width="103" height="66" />
          <line x1="52.5" y1="1" x2="52.5" y2="67" />
          <circle cx="52.5" cy="34" r="9.15" />
          <path d="M1 13.84 H17.5 V54.16 H1" />
          <path d="M1 24.84 H6.5 V43.16 H1" />
          <path d="M104 13.84 H87.5 V54.16 H104" />
          <path d="M104 24.84 H98.5 V43.16 H104" />
          <path d="M17.5 26.69 A9.15 9.15 0 0 1 17.5 41.31" />
          <path d="M87.5 26.69 A9.15 9.15 0 0 0 87.5 41.31" />
          <rect x="1" y="29.5" width="3.4" height="9" />
          <rect x="100.6" y="29.5" width="3.4" height="9" />
          <path d="M1 29.5 L4.4 31.2 M1 32.5 L4.4 34.2 M1 35.5 L4.4 37.2 M104 29.5 L100.6 31.2 M104 32.5 L100.6 34.2 M104 35.5 L100.6 37.2" strokeOpacity="0.42" strokeWidth="0.18" />
        </g>
        <g fill="#ffffff" opacity="0.7">
          <circle cx="52.5" cy="34" r="0.55" />
          <circle cx="12" cy="34" r="0.55" />
          <circle cx="93" cy="34" r="0.55" />
        </g>
      </svg>
      {!showBothTeams && isTacticalPresentation ? (
        <>
          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-20 border-b border-emerald-200/20"
            style={{ height: "clamp(24px, 3.8vw, 62px)", background: "linear-gradient(180deg, rgba(1,22,18,0.98), rgba(3,48,37,0.95))" }}
          >
            <div className="relative h-full w-full">
              {[
                { label: "Goleiro", active: false, left: "0.6%", width: "15.5%" },
                { label: "Defesa", active: true, left: "18.5%", width: "15.5%" },
                { label: "Meio", active: false, left: "42.5%", width: "15.5%" },
                { label: "Ataque", active: false, right: "1%", width: "15.5%" }
              ].map(({ label, active, ...position }) => (
                <span
                  key={label}
                  className={`absolute top-1/2 grid -translate-y-1/2 place-items-center border font-black uppercase text-white ${active ? "border-emerald-400/45 bg-emerald-500/15 shadow-[inset_0_-2px_0_#34d399,0_0_18px_rgba(52,211,153,0.28)]" : "border-white/10 bg-black/20"}`}
                  style={{ ...position, height: "clamp(15px, 2.5vw, 42px)", borderRadius: "999px", fontSize: "clamp(7px, 0.78vw, 14px)" }}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </>
      ) : null}
      {overlayControls ? (
        <div className="absolute z-40 flex items-center" style={{ right: "clamp(8px, 1vw, 18px)", top: isTacticalPresentation ? "clamp(30px, 4.6vw, 78px)" : "1cqw", gap: "clamp(5px, 0.65vw, 12px)" }}>
          {overlayControls}
        </div>
      ) : null}
      <div className="absolute inset-0 z-30">
        {showBothTeams ? renderTeamSlots("RED", fullRedSlots, redPlayers, redColor, safeRed, redCrestUrl) : null}
        {showBothTeams ? renderTeamSlots("WHITE", fullWhiteSlots, whitePlayers, whiteColor, safeWhite, whiteCrestUrl) : null}
        {!showBothTeams ? renderTeamSlots(focusedTeam, focusedSlots, focusedPlayers, focusedTeam === "RED" ? redColor : whiteColor, focusedColor, focusedTeam === "RED" ? redCrestUrl : whiteCrestUrl) : null}
      </div>
      {showBench && showBothTeams ? (
        <>
          <BenchRail label={`Banco ${redTeamName}`} players={redBenchPlayers} team="RED" draggable={isInteractive} showPlayerNumbers={showPlayerNumbers} kitSource={redColor} fallbackColor={safeRed} crestUrl={redCrestUrl} />
          <BenchRail label={`Banco ${whiteTeamName}`} players={whiteBenchPlayers} align="right" team="WHITE" draggable={isInteractive} showPlayerNumbers={showPlayerNumbers} kitSource={whiteColor} fallbackColor={safeWhite} crestUrl={whiteCrestUrl} />
        </>
      ) : showBench ? (
        <BenchRail
          label={isTacticalPresentation ? "Banco de reservas" : `Banco ${focusedTeam === "RED" ? redTeamName : whiteTeamName}`}
          players={focusedBenchPlayers}
          team={focusedTeam}
          draggable={isInteractive}
          showPlayerNumbers={showPlayerNumbers}
          kitSource={focusedTeam === "RED" ? redColor : whiteColor}
          fallbackColor={focusedColor}
          crestUrl={focusedTeam === "RED" ? redCrestUrl : whiteCrestUrl}
        />
      ) : null}
      {actionControls && isTacticalPresentation ? (
        <div
          className="absolute bottom-2 right-2 z-40 border border-emerald-300/15 bg-emerald-950/90 shadow-[0_10px_24px_rgba(2,44,34,0.36)] backdrop-blur"
          style={{ width: "clamp(190px, 33vw, 560px)", padding: "clamp(6px, 0.65vw, 12px)", borderRadius: "clamp(8px, 0.8vw, 14px)" }}
        >
          <p className="font-black uppercase tracking-[0.08em] text-emerald-300" style={{ marginBottom: "clamp(5px, 0.45vw, 9px)", fontSize: "clamp(7px, 0.62vw, 11px)" }}>Ações rápidas</p>
          <div className="grid grid-cols-4" style={{ gap: "clamp(5px, 0.65vw, 12px)" }}>
            {actionControls}
          </div>
        </div>
      ) : null}

    </div>
  );
}
