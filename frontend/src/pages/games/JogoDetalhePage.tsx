import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  ClipboardList, MapPin, Pencil, Users
} from "lucide-react";
import { apiRequest } from "../../services/api";
import { PageHeader } from "../../components/ui/PageHeader";
import { SectionCard } from "../../components/ui/SectionCard";
import { TabPanel } from "../../components/ui/TabPanel";
import { StatusBadge } from "../../components/ui/StatusBadge";
import type { Game, GameStatus } from "../../types/domain";
import { formatDate, formatDateTime } from "./gameLogic";

const statusLabel: Record<GameStatus, string> = {
  SCHEDULED: "Agendado",
  RUNNING: "Em andamento",
  PAUSED: "Pausado",
  FINISHED: "Finalizado",
  CANCELED: "Cancelado"
};

const statusVariant: Record<GameStatus, "info" | "success" | "warning" | "neutral" | "danger"> = {
  SCHEDULED: "info",
  RUNNING: "success",
  PAUSED: "warning",
  FINISHED: "neutral",
  CANCELED: "danger"
};


const TABS = [
  { id: "info", label: "Informações" },
  { id: "escalacao", label: "Escalação" },
  { id: "sumula", label: "Súmula" },
  { id: "estatisticas", label: "Estatísticas" }
];

export function JogoDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState("info");

  const gameQuery = useQuery({
    queryKey: ["game", id],
    queryFn: () => apiRequest<Game>(`/sports/games/${id}`),
    enabled: Boolean(id)
  });

  const g = gameQuery.data;

  if (gameQuery.isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-48 animate-pulse rounded bg-slate-100" />
        <div className="h-32 animate-pulse rounded-lg bg-slate-100" />
      </div>
    );
  }

  if (!g) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
        <p className="text-sm font-semibold text-slate-500">Jogo não encontrado.</p>
        <Link to="/jogos/lista" className="mt-2 inline-block text-xs font-black text-red-600 hover:underline">
          Voltar à lista →
        </Link>
      </div>
    );
  }

  const opponent = g.awayClub?.name ?? g.homeClub?.name ?? "Jogo interno";
  const redScore = g.redScore ?? 0;
  const whiteScore = g.whiteScore ?? 0;
  const hasResult = g.status === "FINISHED";
  const redTeam = g.lineups.filter((l) => l.side === "RED");
  const whiteTeam = g.lineups.filter((l) => l.side === "WHITE");
  const goals = g.events.filter((e) => e.type === "GOAL");
  const yellowCards = g.events.filter((e) => e.type === "YELLOW_CARD");
  const redCards = g.events.filter((e) => e.type === "RED_CARD");

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Jogos"
        breadcrumbs={[
          { label: "Jogos", href: "/jogos" },
          { label: "Lista", href: "/jogos/lista" },
          { label: opponent }
        ]}
        title={opponent}
        subtitle={`${formatDate(g.date)} · ${g.location}`}
        action={
          g.status === "SCHEDULED" ? (
            <Link
              to={`/jogos/${g.id}/editar`}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
            >
              <Pencil size={14} /> Editar
            </Link>
          ) : undefined
        }
      />

      {/* Header card com placar */}
      <SectionCard>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <StatusBadge label={statusLabel[g.status]} variant={statusVariant[g.status]} size="md" />
            {hasResult && (
              <div className="flex items-center gap-3 text-2xl font-black text-slate-950">
                <span className="rounded-lg bg-slate-100 px-3 py-1">{redScore}</span>
                <span className="text-slate-300">×</span>
                <span className="rounded-lg bg-slate-100 px-3 py-1">{whiteScore}</span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-4 text-sm font-semibold text-slate-500">
            <span className="flex items-center gap-1.5"><CalendarDays size={14} />{formatDateTime(g.date)}</span>
            <span className="flex items-center gap-1.5"><MapPin size={14} />{g.location}</span>
            <span className="flex items-center gap-1.5"><Users size={14} />{g.lineups.length} escalados</span>
          </div>
        </div>

        {g.status === "SCHEDULED" && (
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to={`/jogos/${g.id}/escalacao`}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-black text-white hover:bg-slate-800"
            >
              <Users size={14} /> Ir para escalação
            </Link>
            <Link
              to={`/jogos/${g.id}/sumula`}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
            >
              <ClipboardList size={14} /> Ir para súmula
            </Link>
          </div>
        )}
      </SectionCard>

      {/* Tabs */}
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <TabPanel tabs={TABS} active={tab} onChange={setTab}>
          {tab === "info" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">Dados do jogo</p>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-50">
                    {[
                      ["Tipo", g.type === "INTERNAL" ? "Interno" : "Externo"],
                      ["Modalidade", g.gameMode],
                      ["Data e hora", formatDateTime(g.date)],
                      ["Local", g.location],
                      ["Status", statusLabel[g.status]],
                      g.championship ? ["Competição", g.championship] : null,
                      g.round ? ["Rodada", g.round] : null,
                    ].filter(Boolean).map(([label, value]) => (
                      <tr key={label as string}>
                        <td className="py-1.5 pr-3 font-black text-slate-500">{label}</td>
                        <td className="py-1.5 font-semibold text-slate-800">{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {(g.refereeName || g.assistantOneName) && (
                <div>
                  <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">Arbitragem</p>
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-slate-50">
                      {[
                        g.refereeName ? ["Árbitro", g.refereeName] : null,
                        g.assistantOneName ? ["Assistente 1", g.assistantOneName] : null,
                        g.assistantTwoName ? ["Assistente 2", g.assistantTwoName] : null,
                      ].filter(Boolean).map(([label, value]) => (
                        <tr key={label as string}>
                          <td className="py-1.5 pr-3 font-black text-slate-500">{label}</td>
                          <td className="py-1.5 font-semibold text-slate-800">{value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === "escalacao" && (
            <div className="grid gap-4 sm:grid-cols-2">
              {(["RED", "WHITE"] as const).map((side) => {
                const team = side === "RED" ? redTeam : whiteTeam;
                const teamName = side === "RED" ? (g.redTeamName ?? "Time A") : (g.whiteTeamName ?? "Time B");
                return (
                  <div key={side}>
                    <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">{teamName}</p>
                    {team.length === 0 ? (
                      <p className="text-sm font-semibold text-slate-400">Sem jogadores escalados</p>
                    ) : (
                      <div className="space-y-1.5">
                        {team.map((l) => (
                          <div key={l.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs font-black text-slate-600">
                              {l.jerseyNumber ?? "?"}
                            </div>
                            <span className="text-sm font-semibold text-slate-800">{l.athlete?.name ?? "—"}</span>
                            <span className="ml-auto text-xs font-semibold text-slate-400">{l.role}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="sm:col-span-2">
                <Link
                  to={`/jogos/${g.id}/escalacao`}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
                >
                  <Users size={14} /> Ir para escalação completa
                </Link>
              </div>
            </div>
          )}

          {tab === "sumula" && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg bg-slate-50 p-3 text-center">
                  <p className="text-2xl font-black text-slate-950">{goals.length}</p>
                  <p className="text-xs font-black text-slate-500">Gols</p>
                </div>
                <div className="rounded-lg bg-amber-50 p-3 text-center">
                  <p className="text-2xl font-black text-amber-700">{yellowCards.length}</p>
                  <p className="text-xs font-black text-amber-600">Cartões amarelos</p>
                </div>
                <div className="rounded-lg bg-red-50 p-3 text-center">
                  <p className="text-2xl font-black text-red-700">{redCards.length}</p>
                  <p className="text-xs font-black text-red-600">Cartões vermelhos</p>
                </div>
              </div>
              {goals.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">Gols</p>
                  <div className="space-y-1.5">
                    {goals.map((e) => (
                      <div key={e.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                        <span className="font-black text-slate-950">{e.minute ?? "?"}′</span>
                        <span className="font-semibold text-slate-700">{e.athlete?.name ?? "—"}</span>
                        <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-black ${e.side === "RED" ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600"}`}>
                          {e.side === "RED" ? (g.redTeamName ?? "Time A") : (g.whiteTeamName ?? "Time B")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <Link
                to={`/jogos/${g.id}/sumula`}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                <ClipboardList size={14} /> Ir para súmula completa
              </Link>
            </div>
          )}

          {tab === "estatisticas" && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-500">
                Estatísticas detalhadas disponíveis em{" "}
                <Link to="/artilharia" className="font-black text-red-600 hover:underline">Artilharia</Link>,{" "}
                <Link to="/participacoes" className="font-black text-red-600 hover:underline">Participações</Link> e{" "}
                <Link to="/disciplina" className="font-black text-red-600 hover:underline">Disciplina</Link>.
              </p>
            </div>
          )}
        </TabPanel>
      </div>
    </div>
  );
}
