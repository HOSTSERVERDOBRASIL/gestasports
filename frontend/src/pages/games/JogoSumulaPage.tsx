import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { apiRequest } from "../../services/api";
import { PageHeader } from "../../components/ui/PageHeader";
import { SectionCard } from "../../components/ui/SectionCard";
import type { Game, GameEventType } from "../../types/domain";
import { formatDate } from "./gameLogic";

const eventTypeLabel: Record<GameEventType, string> = {
  GOAL: "Gol",
  ASSIST: "Assistência",
  YELLOW_CARD: "Cartão amarelo",
  RED_CARD: "Cartão vermelho"
};

const eventTypeColor: Record<GameEventType, string> = {
  GOAL: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ASSIST: "bg-blue-50 text-blue-700 border-blue-200",
  YELLOW_CARD: "bg-amber-50 text-amber-700 border-amber-200",
  RED_CARD: "bg-red-50 text-red-700 border-red-200"
};

export function JogoSumulaPage() {
  const { id } = useParams<{ id: string }>();

  const gameQuery = useQuery({
    queryKey: ["game", id],
    queryFn: () => apiRequest<Game>(`/sports/games/${id}`),
    enabled: Boolean(id)
  });

  const g = gameQuery.data;

  if (!g && !gameQuery.isLoading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
        <p className="text-sm font-semibold text-slate-500">Jogo não encontrado.</p>
        <Link to="/jogos/lista" className="mt-2 inline-block text-xs font-black text-red-600 hover:underline">Voltar →</Link>
      </div>
    );
  }

  const events = g?.events ?? [];
  const goals = events.filter((e) => e.type === "GOAL");
  const assists = events.filter((e) => e.type === "ASSIST");
  const yellows = events.filter((e) => e.type === "YELLOW_CARD");
  const reds = events.filter((e) => e.type === "RED_CARD");
  const redScore = goals.filter((e) => e.side === "RED").length;
  const whiteScore = goals.filter((e) => e.side === "WHITE").length;
  const redTeamName = g?.redTeamName ?? "Time A";
  const whiteTeamName = g?.whiteTeamName ?? "Time B";

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Jogos"
        breadcrumbs={[
          { label: "Jogos", href: "/jogos" },
          { label: "Lista", href: "/jogos/lista" },
          ...(g ? [{ label: g.awayClub?.name ?? g.homeClub?.name ?? "Jogo", href: `/jogos/${id}` }] : []),
          { label: "Súmula" }
        ]}
        title="Súmula"
        subtitle={g ? `${formatDate(g.date)} · ${g.location}` : "Carregando..."}
        action={
          <div className="flex gap-2">
            <Link
              to={`/jogos/${id}`}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft size={14} /> Voltar ao jogo
            </Link>
            <Link
              to={`/jogos?view=OPERACAO&subView=EVENTOS&gameId=${id}`}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-black text-white hover:bg-slate-800"
            >
              <ClipboardList size={14} /> Modo súmula
            </Link>
          </div>
        }
      />

      {gameQuery.isLoading ? (
        <div className="h-32 animate-pulse rounded-lg bg-slate-100" />
      ) : (
        <>
          {/* Placar */}
          <SectionCard>
            <div className="flex items-center justify-center gap-8 py-4">
              <div className="text-center">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">{redTeamName}</p>
                <p className="mt-1 text-5xl font-black text-slate-950">{g?.redScore ?? redScore}</p>
              </div>
              <p className="text-2xl font-black text-slate-300">×</p>
              <div className="text-center">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">{whiteTeamName}</p>
                <p className="mt-1 text-5xl font-black text-slate-950">{g?.whiteScore ?? whiteScore}</p>
              </div>
            </div>
          </SectionCard>

          {/* Resumo */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Gols", value: goals.length, color: "text-emerald-600" },
              { label: "Assistências", value: assists.length, color: "text-blue-600" },
              { label: "Cartões amarelos", value: yellows.length, color: "text-amber-600" },
              { label: "Cartões vermelhos", value: reds.length, color: "text-red-600" }
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-lg border border-slate-200 bg-white p-3 text-center shadow-sm">
                <p className={`text-2xl font-black ${color}`}>{value}</p>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">{label}</p>
              </div>
            ))}
          </div>

          {/* Eventos */}
          {events.length === 0 ? (
            <SectionCard>
              <div className="py-6 text-center">
                <ClipboardList size={32} className="mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-semibold text-slate-500">Nenhum evento registrado</p>
                <Link
                  to={`/jogos?view=OPERACAO&subView=EVENTOS&gameId=${id}`}
                  className="mt-2 inline-block text-xs font-black text-red-600 hover:underline"
                >
                  Registrar eventos →
                </Link>
              </div>
            </SectionCard>
          ) : (
            <SectionCard title="Eventos do jogo" subtitle={`${events.length} eventos`}>
              <div className="space-y-1.5">
                {events
                  .sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0))
                  .map((e) => (
                    <div key={e.id} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2">
                      <span className="w-8 shrink-0 text-center text-sm font-black text-slate-400">
                        {e.minute ?? "?"}′
                      </span>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-black ${eventTypeColor[e.type]}`}>
                        {eventTypeLabel[e.type]}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">
                        {e.athlete?.name ?? "—"}
                      </span>
                      <span className={`shrink-0 text-xs font-semibold ${e.side === "RED" ? "text-red-600" : "text-slate-500"}`}>
                        {e.side === "RED" ? redTeamName : whiteTeamName}
                      </span>
                    </div>
                  ))}
              </div>
            </SectionCard>
          )}

          <div className="rounded-lg border border-amber-100 bg-amber-50 p-4 text-sm font-semibold text-amber-700">
            Para registrar gols, cartões e substituições em tempo real, use o{" "}
            <Link
              to={`/jogos?view=OPERACAO&subView=EVENTOS&gameId=${id}`}
              className="font-black text-amber-800 underline"
            >
              Modo súmula completo →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
