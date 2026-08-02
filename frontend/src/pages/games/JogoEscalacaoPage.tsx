import { Link, useOutletContext, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Users } from "lucide-react";
import { apiRequest } from "../../services/api";
import { PageHeader } from "../../components/ui/PageHeader";
import { SectionCard } from "../../components/ui/SectionCard";
import type { AthleteProfile, Game, LineupRole, TeamSide } from "../../types/domain";
import { formatDate } from "./gameLogic";

type OutletPeriod = { month: number; year: number };

const roleLabel: Record<LineupRole, string> = {
  STARTER: "Titular",
  RESERVE: "Reserva",
  GOALKEEPER: "Goleiro",
  ABSENT: "Ausente"
};

export function JogoEscalacaoPage() {
  const { id } = useParams<{ id: string }>();
  const { month, year } = useOutletContext<OutletPeriod>();

  const gameQuery = useQuery({
    queryKey: ["game", id],
    queryFn: () => apiRequest<Game>(`/sports/games/${id}`),
    enabled: Boolean(id)
  });

  const athletesQuery = useQuery({
    queryKey: ["athletes", month, year, "game-lineup"],
    queryFn: () => apiRequest<AthleteProfile[]>(`/athletes?month=${month}&year=${year}`)
  });

  const g = gameQuery.data;
  const athletes = athletesQuery.data ?? [];

  if (!g && !gameQuery.isLoading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
        <p className="text-sm font-semibold text-slate-500">Jogo não encontrado.</p>
        <Link to="/jogos/lista" className="mt-2 inline-block text-xs font-black text-red-600 hover:underline">Voltar →</Link>
      </div>
    );
  }

  const redTeam = g?.lineups.filter((l) => l.side === "RED") ?? [];
  const whiteTeam = g?.lineups.filter((l) => l.side === "WHITE") ?? [];

  function athleteName(athleteId: string | null) {
    if (!athleteId) return "—";
    return athletes.find((a) => a.id === athleteId)?.name ?? athleteId;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Jogos"
        breadcrumbs={[
          { label: "Jogos", href: "/jogos" },
          { label: "Lista", href: "/jogos/lista" },
          ...(g ? [{ label: g.awayClub?.name ?? g.homeClub?.name ?? "Jogo", href: `/jogos/${id}` }] : []),
          { label: "Escalação" }
        ]}
        title="Escalação"
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
              to={`/jogos?view=OPERACAO&subView=ESCALACAO&gameId=${id}`}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-black text-white hover:bg-slate-800"
            >
              <Users size={14} /> Modo escalação
            </Link>
          </div>
        }
      />

      {gameQuery.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {(["RED", "WHITE"] as TeamSide[]).map((side) => {
            const team = side === "RED" ? redTeam : whiteTeam;
            const teamName = side === "RED" ? (g?.redTeamName ?? "Time A") : (g?.whiteTeamName ?? "Time B");
            return (
              <SectionCard key={side} title={teamName} subtitle={`${team.length} jogadores`}>
                {team.length === 0 ? (
                  <p className="text-sm font-semibold text-slate-400">Nenhum jogador escalado</p>
                ) : (
                  <div className="space-y-1.5">
                    {team
                      .sort((a, b) => (a.jerseyNumber ?? 99) - (b.jerseyNumber ?? 99))
                      .map((l) => (
                        <div key={l.id} className="flex items-center gap-2.5 rounded-lg bg-slate-50 px-3 py-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-black text-slate-600">
                            {l.jerseyNumber ?? "?"}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-black text-slate-800">
                              {l.athlete?.name ?? athleteName(l.athlete?.id ?? null)}
                            </p>
                            <p className="text-xs font-semibold text-slate-400">{l.athlete?.position ?? "—"}</p>
                          </div>
                          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-black ${
                            l.role === "STARTER" || l.role === "GOALKEEPER"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-slate-200 bg-slate-50 text-slate-600"
                          }`}>
                            {roleLabel[l.role]}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </SectionCard>
            );
          })}
        </div>
      )}

      <div className="rounded-lg border border-amber-100 bg-amber-50 p-4 text-sm font-semibold text-amber-700">
        Para montar ou alterar a escalação com sorteio automático e campo tático, use o{" "}
        <Link
          to={`/jogos?view=OPERACAO&subView=ESCALACAO&gameId=${id}`}
          className="font-black text-amber-800 underline"
        >
          Modo escalação completo →
        </Link>
      </div>
    </div>
  );
}
