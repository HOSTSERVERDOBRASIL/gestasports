import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeftRight,
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
  const goals = g.events.filter((e) => e.type === "GOAL" || e.type === "PENALTY_SCORED");
  const ownGoals = g.events.filter((e) => e.type === "OWN_GOAL");
  const assists = g.events.filter((e) => e.type === "ASSIST");
  const yellowCards = g.events.filter((e) => e.type === "YELLOW_CARD");
  const redCards = g.events.filter((e) => e.type === "RED_CARD");
  const substitutions = g.substitutions ?? [];
  const redTeamName = g.redTeamName ?? "Time A";
  const whiteTeamName = g.whiteTeamName ?? "Time B";

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
              {/* Placar com times */}
              <div className="flex items-center justify-center gap-6 rounded-lg bg-slate-50 py-4">
                <div className="text-center">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">{redTeamName}</p>
                  <p className="text-4xl font-black text-slate-950">{g.redScore ?? goals.filter((e) => e.side === "RED").length + ownGoals.filter((e) => e.side === "WHITE").length}</p>
                </div>
                <p className="text-xl font-black text-slate-300">×</p>
                <div className="text-center">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">{whiteTeamName}</p>
                  <p className="text-4xl font-black text-slate-950">{g.whiteScore ?? goals.filter((e) => e.side === "WHITE").length + ownGoals.filter((e) => e.side === "RED").length}</p>
                </div>
              </div>

              {/* Resumo de eventos */}
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {[
                  { label: "Gols", value: goals.length + ownGoals.length, cls: "text-emerald-600" },
                  { label: "Assistências", value: assists.length, cls: "text-blue-600" },
                  { label: "Substituições", value: substitutions.length, cls: "text-slate-700" },
                  { label: "Amarelos", value: yellowCards.length, cls: "text-amber-600" },
                  { label: "Vermelhos", value: redCards.length, cls: "text-red-600" }
                ].map(({ label, value, cls }) => (
                  <div key={label} className="rounded-lg border border-slate-100 bg-white p-2 text-center">
                    <p className={`text-xl font-black ${cls}`}>{value}</p>
                    <p className="text-xs font-semibold text-slate-400">{label}</p>
                  </div>
                ))}
              </div>

              {/* Timeline: eventos + substituições ordenados por minuto */}
              {(g.events.length > 0 || substitutions.length > 0) && (() => {
                type TLItem =
                  | { kind: "event"; minute: number | null; id: string; type: string; side: string | null; name: string }
                  | { kind: "sub"; minute: number | null; id: string; side: string | null; outName: string; inName: string };

                const tl: TLItem[] = [
                  ...g.events.map((e) => ({ kind: "event" as const, minute: e.minute, id: e.id, type: e.type, side: e.side, name: e.athlete?.name ?? "—" })),
                  ...substitutions.map((s) => ({ kind: "sub" as const, minute: s.minute, id: s.id, side: s.side, outName: s.athleteOut?.name ?? "—", inName: s.athleteIn?.name ?? "—" }))
                ].sort((a, b) => (a.minute ?? 999) - (b.minute ?? 999));

                const eventBadge: Record<string, string> = {
                  GOAL: "bg-emerald-50 text-emerald-700",
                  OWN_GOAL: "bg-orange-50 text-orange-700",
                  ASSIST: "bg-blue-50 text-blue-700",
                  YELLOW_CARD: "bg-amber-50 text-amber-700",
                  RED_CARD: "bg-red-50 text-red-700",
                  PENALTY_SCORED: "bg-teal-50 text-teal-700",
                  PENALTY_MISSED: "bg-slate-100 text-slate-500"
                };
                const eventLabel: Record<string, string> = {
                  GOAL: "Gol", OWN_GOAL: "Gol contra", ASSIST: "Assistência",
                  YELLOW_CARD: "Amarelo", RED_CARD: "Vermelho",
                  PENALTY_SCORED: "Pênalti", PENALTY_MISSED: "Pênalti perdido"
                };

                return (
                  <div>
                    <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">Linha do tempo</p>
                    <div className="space-y-1.5">
                      {tl.map((item) => {
                        const teamName = item.side === "RED" ? redTeamName : item.side === "WHITE" ? whiteTeamName : null;
                        if (item.kind === "sub") {
                          return (
                            <div key={item.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                              <span className="w-7 shrink-0 text-center font-black text-slate-400">{item.minute ?? "?"}′</span>
                              <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-white border border-slate-200 px-2 py-0.5 text-xs font-black text-slate-600">
                                <ArrowLeftRight size={9} /> Sub
                              </span>
                              <span className="flex-1 min-w-0 text-sm font-semibold text-slate-800">
                                <span className="text-red-500">↓ {item.outName}</span>
                                <span className="text-slate-300"> · </span>
                                <span className="text-emerald-600">↑ {item.inName}</span>
                              </span>
                              {teamName && <span className={`shrink-0 text-xs font-semibold ${item.side === "RED" ? "text-red-500" : "text-slate-400"}`}>{teamName}</span>}
                            </div>
                          );
                        }
                        return (
                          <div key={item.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                            <span className="w-7 shrink-0 text-center font-black text-slate-400">{item.minute ?? "?"}′</span>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-black ${eventBadge[item.type] ?? "bg-slate-100 text-slate-600"}`}>
                              {eventLabel[item.type] ?? item.type}
                            </span>
                            <span className="flex-1 min-w-0 truncate font-semibold text-slate-700">{item.name}</span>
                            {teamName && <span className={`shrink-0 text-xs font-semibold ${item.side === "RED" ? "text-red-500" : "text-slate-400"}`}>{teamName}</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              <Link
                to={`/jogos/${g.id}/sumula`}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                <ClipboardList size={14} /> Ver súmula completa
              </Link>
            </div>
          )}

          {tab === "estatisticas" && (
            <div className="space-y-4">
              {/* Artilheiros deste jogo */}
              {goals.length + ownGoals.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">Artilheiros</p>
                  <div className="space-y-1.5">
                    {(() => {
                      const map = new Map<string, { name: string; goals: number; ownGoals: number; side: string | null }>();
                      for (const e of [...goals, ...ownGoals]) {
                        const key = e.athleteId;
                        const cur = map.get(key) ?? { name: e.athlete?.name ?? "—", goals: 0, ownGoals: 0, side: e.side };
                        if (e.type === "OWN_GOAL") cur.ownGoals += 1;
                        else cur.goals += 1;
                        map.set(key, cur);
                      }
                      return Array.from(map.values()).sort((a, b) => (b.goals + b.ownGoals) - (a.goals + a.ownGoals)).map((row, i) => (
                        <div key={i} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                          <span className="w-5 text-center font-black text-slate-400">{row.goals + row.ownGoals}</span>
                          <span className="flex-1 font-semibold text-slate-800">{row.name}</span>
                          {row.ownGoals > 0 && <span className="text-xs font-semibold text-orange-600">{row.ownGoals} contra</span>}
                          <span className={`text-xs font-semibold ${row.side === "RED" ? "text-red-500" : "text-slate-400"}`}>
                            {row.side === "RED" ? redTeamName : whiteTeamName}
                          </span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}

              {/* Assistências deste jogo */}
              {assists.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">Assistências</p>
                  <div className="space-y-1.5">
                    {assists.map((e) => (
                      <div key={e.id} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                        <span className="w-7 shrink-0 text-center text-xs text-slate-400">{e.minute ?? "?"}′</span>
                        <span className="flex-1 font-semibold text-slate-700">{e.athlete?.name ?? "—"}</span>
                        <span className={`text-xs font-semibold ${e.side === "RED" ? "text-red-500" : "text-slate-400"}`}>
                          {e.side === "RED" ? redTeamName : whiteTeamName}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cartões */}
              {(yellowCards.length > 0 || redCards.length > 0) && (
                <div>
                  <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">Disciplina</p>
                  <div className="space-y-1.5">
                    {[...yellowCards, ...redCards].sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0)).map((e) => (
                      <div key={e.id} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                        <span className="w-7 shrink-0 text-center text-xs text-slate-400">{e.minute ?? "?"}′</span>
                        <span className={`shrink-0 h-4 w-3 rounded-sm ${e.type === "YELLOW_CARD" ? "bg-amber-400" : "bg-red-600"}`} />
                        <span className="flex-1 font-semibold text-slate-700">{e.athlete?.name ?? "—"}</span>
                        <span className={`text-xs font-semibold ${e.side === "RED" ? "text-red-500" : "text-slate-400"}`}>
                          {e.side === "RED" ? redTeamName : whiteTeamName}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Resumo por time */}
              <div className="grid gap-3 sm:grid-cols-2">
                {(["RED", "WHITE"] as const).map((side) => {
                  const teamGoals = goals.filter((e) => e.side === side).length + ownGoals.filter((e) => e.side !== side).length;
                  const teamAssists = assists.filter((e) => e.side === side).length;
                  const teamYellow = yellowCards.filter((e) => e.side === side).length;
                  const teamRed = redCards.filter((e) => e.side === side).length;
                  const teamSubs = substitutions.filter((s) => s.side === side).length;
                  const tName = side === "RED" ? redTeamName : whiteTeamName;
                  return (
                    <div key={side} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <p className={`mb-2 text-xs font-black uppercase tracking-wide ${side === "RED" ? "text-red-600" : "text-slate-500"}`}>{tName}</p>
                      <div className="grid grid-cols-5 gap-1 text-center text-xs">
                        {[
                          { label: "Gols", value: teamGoals },
                          { label: "Assist", value: teamAssists },
                          { label: "Subs", value: teamSubs },
                          { label: "AM", value: teamYellow },
                          { label: "VM", value: teamRed }
                        ].map(({ label, value }) => (
                          <div key={label}>
                            <p className="font-black text-slate-800 text-base">{value}</p>
                            <p className="font-semibold text-slate-400">{label}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {goals.length + ownGoals.length + assists.length + yellowCards.length + redCards.length === 0 && (
                <p className="text-sm font-semibold text-slate-400 text-center py-4">
                  Nenhum evento registrado. <Link to={`/jogos?view=OPERACAO&subView=EVENTOS&gameId=${g.id}`} className="font-black text-red-600 hover:underline">Registrar →</Link>
                </p>
              )}
            </div>
          )}
        </TabPanel>
      </div>
    </div>
  );
}
