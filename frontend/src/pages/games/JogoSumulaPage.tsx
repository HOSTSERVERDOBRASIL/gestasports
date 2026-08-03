import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowLeftRight, ClipboardList, Printer, Share2 } from "lucide-react";
import { apiRequest } from "../../services/api";
import { PageHeader } from "../../components/ui/PageHeader";
import { SectionCard } from "../../components/ui/SectionCard";
import { PhotoUploadButton } from "../../components/ui/PhotoUploadButton";
import type { Game, GameEventType } from "../../types/domain";
import { formatDate } from "./gameLogic";

const eventTypeLabel: Record<GameEventType, string> = {
  GOAL: "Gol",
  OWN_GOAL: "Gol contra",
  ASSIST: "Assistência",
  YELLOW_CARD: "Cartão amarelo",
  RED_CARD: "Cartão vermelho",
  PENALTY_SCORED: "Pênalti",
  PENALTY_MISSED: "Pênalti perdido"
};

const eventTypeColor: Record<GameEventType, string> = {
  GOAL: "bg-emerald-50 text-emerald-700 border-emerald-200",
  OWN_GOAL: "bg-orange-50 text-orange-700 border-orange-200",
  ASSIST: "bg-blue-50 text-blue-700 border-blue-200",
  YELLOW_CARD: "bg-amber-50 text-amber-700 border-amber-200",
  RED_CARD: "bg-red-50 text-red-700 border-red-200",
  PENALTY_SCORED: "bg-teal-50 text-teal-700 border-teal-200",
  PENALTY_MISSED: "bg-slate-100 text-slate-500 border-slate-200"
};

export function JogoSumulaPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const gameQuery = useQuery({
    queryKey: ["game", id],
    queryFn: () => apiRequest<Game>(`/sports/games/${id}`),
    enabled: Boolean(id),
    refetchInterval: (query) => query.state.data?.status === "RUNNING" ? 5000 : false
  });

  const photosQuery = useQuery({
    queryKey: ["game-photos", id],
    queryFn: () => apiRequest<Array<{ id: string; url: string; title?: string | null }>>(`/gallery/assets?type=GAME&gameId=${id}`),
    enabled: Boolean(id)
  });

  const [displaySeconds, setDisplaySeconds] = useState(0);

  useEffect(() => {
    const g = gameQuery.data;
    if (!g || g.status !== "RUNNING" || !g.startedAt) {
      setDisplaySeconds(g?.elapsedSeconds ?? 0);
      return;
    }
    const interval = setInterval(() => {
      const elapsed = (g.elapsedSeconds ?? 0) + Math.floor((Date.now() - new Date(g.startedAt!).getTime()) / 1000);
      setDisplaySeconds(Math.max(0, elapsed));
    }, 1000);
    return () => clearInterval(interval);
  }, [gameQuery.data]);

  const displayMinute = Math.min(130, Math.floor(displaySeconds / 60));

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
  const substitutions = g?.substitutions ?? [];
  const goals = events.filter((e) => e.type === "GOAL" || e.type === "PENALTY_SCORED");
  const ownGoals = events.filter((e) => e.type === "OWN_GOAL");
  const assists = events.filter((e) => e.type === "ASSIST");
  const yellows = events.filter((e) => e.type === "YELLOW_CARD");
  const reds = events.filter((e) => e.type === "RED_CARD");

  const redTeamName = g?.redTeamName ?? "Time A";
  const whiteTeamName = g?.whiteTeamName ?? "Time B";

  // Build unified timeline: events + substitutions sorted by minute
  type TimelineItem =
    | { kind: "event"; minute: number | null; id: string; type: GameEventType; side: string | null; athleteName: string }
    | { kind: "sub"; minute: number | null; id: string; side: string | null; outName: string; inName: string };

  const timeline: TimelineItem[] = [
    ...events.map((e) => ({
      kind: "event" as const,
      minute: e.minute,
      id: e.id,
      type: e.type,
      side: e.side,
      athleteName: e.athlete?.name ?? "—"
    })),
    ...substitutions.map((s) => ({
      kind: "sub" as const,
      minute: s.minute,
      id: s.id,
      side: s.side,
      outName: s.athleteOut?.name ?? "—",
      inName: s.athleteIn?.name ?? "—"
    }))
  ].sort((a, b) => (a.minute ?? 999) - (b.minute ?? 999));

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
            <button
              onClick={() => {
                const url = `${window.location.origin}/live/${id}`;
                if (navigator.share) { void navigator.share({ title: "Acompanhe ao vivo!", url }); }
                else { void navigator.clipboard.writeText(url); }
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
            >
              <Share2 size={14} /> Link ao vivo
            </button>
            <a
              href={`/api/sports/games/${id}/sumula-print`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-black text-white hover:bg-slate-800"
            >
              <Printer size={14} /> Imprimir súmula
            </a>
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
                <p className="mt-1 text-5xl font-black text-slate-950">{g?.redScore ?? goals.filter((e) => e.side === "RED").length}</p>
              </div>
              <div className="flex flex-col items-center gap-1">
                <p className="text-2xl font-black text-slate-300">×</p>
                {g?.status === "RUNNING" && (
                  <span className="animate-pulse rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-black text-emerald-700">
                    {displayMinute}′
                  </span>
                )}
                {g?.status === "PAUSED" && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-black text-amber-700">
                    {displayMinute}′
                  </span>
                )}
                {g?.status === "FINISHED" && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-black text-slate-500">
                    FIM
                  </span>
                )}
              </div>
              <div className="text-center">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">{whiteTeamName}</p>
                <p className="mt-1 text-5xl font-black text-slate-950">{g?.whiteScore ?? goals.filter((e) => e.side === "WHITE").length}</p>
              </div>
            </div>
          </SectionCard>

          {/* Resumo de stats */}
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {[
              { label: "Gols", value: goals.length + ownGoals.length, color: "text-emerald-600" },
              { label: "Assistências", value: assists.length, color: "text-blue-600" },
              { label: "Substituições", value: substitutions.length, color: "text-slate-700" },
              { label: "Amarelos", value: yellows.length, color: "text-amber-600" },
              { label: "Vermelhos", value: reds.length, color: "text-red-600" },
              { label: "Eventos", value: events.length, color: "text-slate-500" }
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-lg border border-slate-200 bg-white p-3 text-center shadow-sm">
                <p className={`text-2xl font-black ${color}`}>{value}</p>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">{label}</p>
              </div>
            ))}
          </div>

          {/* Timeline unificada */}
          {timeline.length === 0 ? (
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
            <SectionCard title="Linha do tempo" subtitle={`${timeline.length} eventos · ${substitutions.length} substituições`}>
              <div className="space-y-1.5">
                {timeline.map((item) => {
                  const teamName = item.side === "RED" ? redTeamName : item.side === "WHITE" ? whiteTeamName : "—";
                  const teamColor = item.side === "RED" ? "text-red-600" : "text-slate-500";

                  if (item.kind === "sub") {
                    return (
                      <div key={item.id} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2">
                        <span className="w-8 shrink-0 text-center text-sm font-black text-slate-400">
                          {item.minute ?? "?"}′
                        </span>
                        <span className="shrink-0 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-black text-slate-600 flex items-center gap-1">
                          <ArrowLeftRight size={10} /> Substituição
                        </span>
                        <span className="min-w-0 flex-1 text-sm font-semibold text-slate-800 truncate">
                          <span className="text-red-500">↓ {item.outName}</span>
                          {" · "}
                          <span className="text-emerald-600">↑ {item.inName}</span>
                        </span>
                        <span className={`shrink-0 text-xs font-semibold ${teamColor}`}>{teamName}</span>
                      </div>
                    );
                  }

                  return (
                    <div key={item.id} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2">
                      <span className="w-8 shrink-0 text-center text-sm font-black text-slate-400">
                        {item.minute ?? "?"}′
                      </span>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-black ${eventTypeColor[item.type]}`}>
                        {eventTypeLabel[item.type]}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">
                        {item.athleteName}
                      </span>
                      <span className={`shrink-0 text-xs font-semibold ${teamColor}`}>{teamName}</span>
                    </div>
                  );
                })}
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

          {(photosQuery.data?.length ?? 0) > 0 && (
            <section className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-black uppercase tracking-[0.08em] text-slate-500">Fotos do jogo</h2>
                <PhotoUploadButton
                  gameId={id}
                  compact
                  label="Adicionar foto"
                  onUploaded={() => void queryClient.invalidateQueries({ queryKey: ["game-photos", id] })}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {photosQuery.data!.map((photo) => (
                  <a key={photo.id} href={photo.url} target="_blank" rel="noopener noreferrer"
                    className="group relative overflow-hidden rounded-xl aspect-square bg-slate-100">
                    <img src={photo.url} alt={photo.title ?? "Foto"} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                    {photo.title && (
                      <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent px-2 py-1.5">
                        <p className="truncate text-xs font-bold text-white">{photo.title}</p>
                      </div>
                    )}
                  </a>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
