import { useState, useEffect, useRef } from "react";

export interface FieldPlayer {
  lineupId: string;
  athleteId: string;
  name: string;
  jerseyNumber?: number | null;
  position: string; // AthletePosition string
  side: "RED" | "WHITE";
  role: "STARTER" | "GOALKEEPER" | "RESERVE" | "ABSENT";
  // Posição no campo normalizada 0-1 (x=largura, y=profundidade)
  fieldX?: number | null;
  fieldY?: number | null;
}

interface FieldLineupEditorProps {
  players: FieldPlayer[];
  onMove?: (lineupId: string, x: number, y: number) => void;
  readOnly?: boolean;
  playersPerTeam?: number; // 7 ou 11
}

const DEFAULT_POSITIONS: Record<string, { x: number; y: number }> = {
  GOALKEEPER: { x: 0.5, y: 0.9 },
  RIGHT_BACK: { x: 0.85, y: 0.78 },
  LEFT_BACK: { x: 0.15, y: 0.78 },
  CENTER_BACK: { x: 0.5, y: 0.82 },
  RIGHT_MIDFIELDER: { x: 0.8, y: 0.62 },
  LEFT_MIDFIELDER: { x: 0.2, y: 0.62 },
  CENTRAL_MIDFIELDER: { x: 0.5, y: 0.65 },
  DEFENSIVE_MIDFIELDER: { x: 0.5, y: 0.72 },
  ATTACKING_MIDFIELDER: { x: 0.5, y: 0.58 },
  RIGHT_WINGER: { x: 0.82, y: 0.58 },
  LEFT_WINGER: { x: 0.18, y: 0.58 },
  CENTER_FORWARD: { x: 0.5, y: 0.60 },
  STRIKER: { x: 0.5, y: 0.60 },
};

function FieldSVG() {
  return (
    <>
      {/* Grama */}
      <rect x="0" y="0" width="400" height="560" fill="#2d7a22" rx="6" />
      {/* Linha de fundo e laterais */}
      <rect x="20" y="20" width="360" height="520" fill="none" stroke="white" strokeWidth="2" opacity="0.7" />
      {/* Meio campo */}
      <line x1="20" y1="280" x2="380" y2="280" stroke="white" strokeWidth="2" opacity="0.7" />
      {/* Círculo central */}
      <circle cx="200" cy="280" r="50" fill="none" stroke="white" strokeWidth="2" opacity="0.7" />
      <circle cx="200" cy="280" r="3" fill="white" opacity="0.9" />
      {/* Área grande RED (baixo) */}
      <rect x="110" y="430" width="180" height="110" fill="none" stroke="white" strokeWidth="1.5" opacity="0.7" />
      {/* Área pequena RED */}
      <rect x="155" y="480" width="90" height="60" fill="none" stroke="white" strokeWidth="1.5" opacity="0.7" />
      {/* Marca penalty RED */}
      <circle cx="200" cy="490" r="3" fill="white" opacity="0.8" />
      {/* Área grande WHITE (cima) */}
      <rect x="110" y="20" width="180" height="110" fill="none" stroke="white" strokeWidth="1.5" opacity="0.7" />
      {/* Área pequena WHITE */}
      <rect x="155" y="20" width="90" height="60" fill="none" stroke="white" strokeWidth="1.5" opacity="0.7" />
      {/* Marca penalty WHITE */}
      <circle cx="200" cy="70" r="3" fill="white" opacity="0.8" />
      {/* Label dos times */}
      <text x="200" y="548" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold" opacity="0.6">Time A</text>
      <text x="200" y="14" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold" opacity="0.6">Time B</text>
    </>
  );
}

function PlayerToken({
  player,
  x,
  y,
  isDragging,
  onPointerDown,
}: {
  player: FieldPlayer;
  x: number;
  y: number;
  isDragging: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
}) {
  const isRed = player.side === "RED";
  const fill = isRed ? "#dc2626" : "#f8fafc";
  const textFill = isRed ? "white" : "#0f172a";
  const stroke = isDragging ? "#facc15" : isRed ? "#991b1b" : "#cbd5e1";
  const label =
    player.jerseyNumber != null
      ? String(player.jerseyNumber)
      : player.name.split(" ")[0].slice(0, 3).toUpperCase();

  return (
    <g
      transform={`translate(${x},${y})`}
      style={{ cursor: "grab", userSelect: "none" }}
      onPointerDown={onPointerDown}
    >
      <circle
        r="18"
        fill={fill}
        stroke={stroke}
        strokeWidth={isDragging ? 2.5 : 1.5}
        style={{
          filter: isDragging
            ? "drop-shadow(0 2px 8px rgba(0,0,0,.5))"
            : "drop-shadow(0 1px 3px rgba(0,0,0,.3))",
        }}
      />
      <text textAnchor="middle" dy="4" fontSize="11" fontWeight="900" fill={textFill}>
        {label}
      </text>
      <text
        textAnchor="middle"
        y="28"
        fontSize="8.5"
        fontWeight="700"
        fill="white"
        style={{ textShadow: "0 1px 2px rgba(0,0,0,.8)" }}
      >
        {player.name.split(" ")[0].slice(0, 8)}
      </text>
    </g>
  );
}

export function FieldLineupEditor({
  players,
  onMove,
  readOnly = false,
  playersPerTeam: _playersPerTeam = 11,
}: FieldLineupEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<{
    lineupId: string;
    startX: number;
    startY: number;
  } | null>(null);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});

  // Inicializa posições
  useEffect(() => {
    const initial: Record<string, { x: number; y: number }> = {};
    for (const p of players) {
      if (p.fieldX != null && p.fieldY != null) {
        initial[p.lineupId] = { x: p.fieldX, y: p.fieldY };
      } else {
        const def = DEFAULT_POSITIONS[p.position] ?? { x: 0.5, y: 0.7 };
        initial[p.lineupId] =
          p.side === "WHITE" ? { x: def.x, y: 1 - def.y } : def;
      }
    }
    setPositions(initial);
  }, [players]);

  function svgPoint(e: React.PointerEvent): { x: number; y: number } | null {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
    };
  }

  function handlePointerDown(lineupId: string, e: React.PointerEvent) {
    if (readOnly) return;
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    setDragging({ lineupId, startX: e.clientX, startY: e.clientY });
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    const pt = svgPoint(e);
    if (!pt) return;
    setPositions((prev) => ({ ...prev, [dragging.lineupId]: pt }));
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (!dragging) return;
    const pt = svgPoint(e);
    if (pt) onMove?.(dragging.lineupId, pt.x, pt.y);
    setDragging(null);
  }

  // Apenas titulares + goleiros no campo
  const onField = players.filter(
    (p) => p.role === "STARTER" || p.role === "GOALKEEPER"
  );

  return (
    <div className="w-full">
      <svg
        ref={svgRef}
        viewBox="0 0 400 560"
        className="w-full max-w-[360px] mx-auto touch-none select-none rounded-xl shadow-lg"
        style={{ aspectRatio: "400/560" }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <FieldSVG />
        {onField.map((player) => {
          const pos = positions[player.lineupId];
          if (!pos) return null;
          const px = pos.x * 400;
          const py = pos.y * 560;
          return (
            <PlayerToken
              key={player.lineupId}
              player={player}
              x={px}
              y={py}
              isDragging={dragging?.lineupId === player.lineupId}
              onPointerDown={(e) => handlePointerDown(player.lineupId, e)}
            />
          );
        })}
      </svg>
      {/* Reservas abaixo do campo */}
      {players.filter((p) => p.role === "RESERVE").length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500 mb-2">
            Banco
          </p>
          <div className="flex flex-wrap gap-2">
            {players
              .filter((p) => p.role === "RESERVE")
              .map((p) => (
                <div
                  key={p.lineupId}
                  className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${
                    p.side === "RED"
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-slate-200 bg-slate-50 text-slate-700"
                  }`}
                >
                  {p.jerseyNumber != null ? (
                    <span className="font-black">{p.jerseyNumber}</span>
                  ) : null}
                  {p.name.split(" ")[0]}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
