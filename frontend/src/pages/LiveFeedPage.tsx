import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../services/api";
import { Activity, Clock, Share2 } from "lucide-react";

type LiveGame = {
  id: string;
  date: string;
  location: string;
  status: string;
  redScore: number | null;
  whiteScore: number | null;
  elapsedSeconds: number | null;
  startedAt: string | null;
  pausedAt: string | null;
  halfDurationMinutes: number | null;
  redTeamName: string | null;
  whiteTeamName: string | null;
  homeClub?: { name: string; shortName?: string | null; logoUrl?: string | null } | null;
  awayClub?: { name: string; shortName?: string | null; logoUrl?: string | null } | null;
  tenant?: { brandName: string; primaryColor: string; logoUrl?: string | null } | null;
  events: Array<{ id: string; type: string; minute: number | null; side: string | null; athlete?: { name: string } | null }>;
  substitutions: Array<{ id: string; minute: number | null; side: string | null; athleteIn?: { name: string } | null; athleteOut?: { name: string } | null }>;
};

const EVENT_ICONS: Record<string, string> = {
  GOAL: "⚽",
  OWN_GOAL: "⚽",
  YELLOW_CARD: "🟨",
  RED_CARD: "🟥",
  PENALTY_SCORED: "⚽",
  PENALTY_MISSED: "❌",
  ASSIST: "🅰️",
};

const EVENT_LABELS: Record<string, string> = {
  GOAL: "Gol",
  OWN_GOAL: "Gol contra",
  YELLOW_CARD: "Cartão amarelo",
  RED_CARD: "Cartão vermelho",
  PENALTY_SCORED: "Pênalti convertido",
  PENALTY_MISSED: "Pênalti perdido",
  ASSIST: "Assistência",
};

export function LiveFeedPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const [displaySeconds, setDisplaySeconds] = useState(0);

  const gameQuery = useQuery({
    queryKey: ["live-game", gameId],
    queryFn: () => apiRequest<LiveGame>(`/public/games/${gameId}/live`, { skipAuth: true }),
    enabled: Boolean(gameId),
    refetchInterval: (q) => q.state.data?.status === "RUNNING" ? 8000 : 20000
  });

  const game = gameQuery.data;

  // Cronômetro local
  useEffect(() => {
    if (!game || game.status !== "RUNNING" || !game.startedAt) {
      setDisplaySeconds(game?.elapsedSeconds ?? 0);
      return;
    }
    const tick = () => {
      const elapsed = (game.elapsedSeconds ?? 0) + Math.floor((Date.now() - new Date(game.startedAt!).getTime()) / 1000);
      setDisplaySeconds(Math.max(0, elapsed));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [game]);

  const minute = Math.min(130, Math.floor(displaySeconds / 60));

  function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      void navigator.share({ title: "Acompanhe o jogo ao vivo!", url });
    } else {
      void navigator.clipboard.writeText(url);
    }
  }

  // Combinar eventos e substituições em timeline única
  const timeline = [
    ...(game?.events ?? []).map(e => ({ ...e, kind: "event" as const })),
    ...(game?.substitutions ?? []).map(s => ({ ...s, type: "SUBSTITUTION", kind: "sub" as const }))
  ].sort((a, b) => (b.minute ?? 0) - (a.minute ?? 0));

  const statusLabel = game?.status === "RUNNING" ? "AO VIVO"
    : game?.status === "PAUSED" ? "INTERVALO"
    : game?.status === "FINISHED" ? "ENCERRADO"
    : game?.status === "SCHEDULED" ? "AGUARDANDO"
    : game?.status ?? "";

  const statusColor = game?.status === "RUNNING" ? "#22c55e"
    : game?.status === "PAUSED" ? "#f59e0b"
    : game?.status === "FINISHED" ? "#94a3b8"
    : "#60a5fa";

  const primaryColor = game?.tenant?.primaryColor ?? "#dc2626";

  if (gameQuery.isLoading) {
    return (
      <div style={{ minHeight: "100dvh", background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#94a3b8", fontFamily: "sans-serif", fontSize: "14px" }}>Carregando...</div>
      </div>
    );
  }

  if (!game) {
    return (
      <div style={{ minHeight: "100dvh", background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "8px" }}>
        <p style={{ color: "#94a3b8", fontFamily: "sans-serif" }}>Jogo não encontrado</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", background: "#0f172a", fontFamily: '"Sora", "Segoe UI", sans-serif', color: "white" }}>
      {/* Header */}
      <div style={{ background: "#111827", borderBottom: "1px solid #1e293b", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {game.tenant?.logoUrl ? (
            <img src={game.tenant.logoUrl} alt="" style={{ height: "28px", width: "28px", borderRadius: "50%", objectFit: "cover" }} />
          ) : (
            <span style={{ fontSize: "20px" }}>⚽</span>
          )}
          <span style={{ fontWeight: 900, fontSize: "13px", color: "#e2e8f0" }}>{game.tenant?.brandName ?? "GestaSports"}</span>
        </div>
        <button
          onClick={handleShare}
          style={{ background: "none", border: "1px solid #334155", borderRadius: "8px", padding: "6px 12px", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 700 }}
        >
          <Share2 size={13} /> Compartilhar
        </button>
      </div>

      {/* Placar */}
      <div style={{ padding: "24px 16px 16px", textAlign: "center" }}>
        {/* Status badge */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#1e293b", borderRadius: "999px", padding: "4px 12px", marginBottom: "16px" }}>
          {game.status === "RUNNING" && (
            <span style={{ width: "7px", height: "7px", background: statusColor, borderRadius: "50%", animation: "pulse 1.5s infinite" }} />
          )}
          {(game.status === "RUNNING" || game.status === "PAUSED") && (
            <span style={{ color: statusColor, fontWeight: 900, fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}>
              <Clock size={11} /> {minute}&apos;
            </span>
          )}
          <span style={{ color: statusColor, fontWeight: 900, fontSize: "12px" }}>{statusLabel}</span>
        </div>

        {/* Times e placar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px" }}>
          <div style={{ flex: 1, textAlign: "right" }}>
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#94a3b8", marginBottom: "4px" }}>
              {game.redTeamName ?? game.homeClub?.shortName ?? "Time A"}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "52px", fontWeight: 900, lineHeight: 1, color: primaryColor }}>{game.redScore ?? 0}</span>
            <span style={{ fontSize: "28px", fontWeight: 900, color: "#475569" }}>:</span>
            <span style={{ fontSize: "52px", fontWeight: 900, lineHeight: 1, color: "#e2e8f0" }}>{game.whiteScore ?? 0}</span>
          </div>
          <div style={{ flex: 1, textAlign: "left" }}>
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#94a3b8", marginBottom: "4px" }}>
              {game.whiteTeamName ?? game.awayClub?.shortName ?? "Time B"}
            </div>
          </div>
        </div>

        {/* Local e data */}
        <p style={{ fontSize: "11px", color: "#475569", marginTop: "8px", fontWeight: 600 }}>
          {new Date(game.date).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}
          {game.location ? ` · ${game.location}` : ""}
        </p>
      </div>

      {/* Timeline */}
      <div style={{ padding: "0 16px 32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
          <Activity size={14} color="#475569" />
          <span style={{ fontSize: "11px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", color: "#475569" }}>
            Eventos do jogo
          </span>
        </div>

        {timeline.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 0", color: "#475569", fontSize: "13px", fontWeight: 600 }}>
            {game.status === "SCHEDULED" ? "O jogo ainda não começou." : "Nenhum evento registrado."}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {timeline.map((item, i) => {
              const isSub = item.kind === "sub";
              const sub = isSub ? item as typeof game.substitutions[0] & { kind: "sub"; type: string } : null;
              const ev = !isSub ? item as typeof game.events[0] & { kind: "event" } : null;
              const isRedSide = item.side === "RED";
              const icon = isSub ? "🔄" : (EVENT_ICONS[item.type] ?? "•");
              const label = isSub
                ? `${sub!.athleteIn?.name ?? "?"} ↔ ${sub!.athleteOut?.name ?? "?"}`
                : `${ev!.athlete?.name ?? "Atleta"} — ${EVENT_LABELS[item.type] ?? item.type}`;

              return (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  background: "#111827", borderRadius: "10px", padding: "10px 12px",
                  borderLeft: `3px solid ${isRedSide ? primaryColor : "#475569"}`
                }}>
                  <span style={{ fontSize: "18px" }}>{icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "13px", fontWeight: 700, color: "#e2e8f0", margin: 0 }}>{label}</p>
                    <p style={{ fontSize: "11px", color: "#475569", margin: "2px 0 0", fontWeight: 600 }}>
                      {item.minute != null ? `${item.minute}'` : ""} · {isRedSide ? (game.redTeamName ?? "Time A") : (game.whiteTeamName ?? "Time B")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  );
}
