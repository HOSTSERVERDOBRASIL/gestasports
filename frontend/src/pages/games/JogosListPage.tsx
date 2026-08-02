import { useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, ChevronLeft, ChevronRight, MapPin, Plus, Search, X } from "lucide-react";
import { apiRequest } from "../../services/api";
import { PageHeader } from "../../components/ui/PageHeader";
import { SectionCard } from "../../components/ui/SectionCard";
import type { Game, GameStatus, GameType } from "../../types/domain";
import { formatDate } from "./gameLogic";
import { GameCancelModal } from "./GameCancelModal";

type OutletPeriod = { month: number; year: number };

const PAGE_SIZE = 10;

const gameStatusLabel: Record<GameStatus, string> = {
  SCHEDULED: "Agendado",
  RUNNING: "Em andamento",
  PAUSED: "Pausado",
  FINISHED: "Finalizado",
  CANCELED: "Cancelado"
};

const gameStatusBadge: Record<GameStatus, string> = {
  SCHEDULED: "bg-blue-50 text-blue-700 border-blue-200",
  RUNNING: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PAUSED: "bg-amber-50 text-amber-700 border-amber-200",
  FINISHED: "bg-slate-100 text-slate-600 border-slate-200",
  CANCELED: "bg-red-50 text-red-600 border-red-200"
};

const gameTypeLabel: Record<GameType, string> = {
  INTERNAL: "Interno",
  EXTERNAL: "Externo"
};

export function JogosListPage() {
  const { month, year } = useOutletContext<OutletPeriod>();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | GameStatus>("ALL");
  const [typeFilter, setTypeFilter] = useState<"ALL" | GameType>("ALL");
  const [page, setPage] = useState(1);
  const [cancelGame, setCancelGame] = useState<Game | null>(null);
  const [cancelReason, setCancelReason] = useState("Campo impraticável");
  const [cancelNote, setCancelNote] = useState("");

  const gamesQuery = useQuery({
    queryKey: ["sports-games", month, year, false, typeFilter],
    queryFn: () => apiRequest<Game[]>(`/sports/games?month=${month}&year=${year}${typeFilter !== "ALL" ? `&type=${typeFilter}` : ""}`)
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason, note }: { id: string; reason: string; note: string }) =>
      apiRequest<void>(`/sports/games/${id}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason, note })
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["sports-games"] });
      setCancelGame(null);
    }
  });

  const games = gamesQuery.data ?? [];

  const filtered = games.filter((g) => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || [
      g.location,
      g.homeClub?.name ?? "",
      g.awayClub?.name ?? "",
      g.championship ?? ""
    ].some((v) => v.toLowerCase().includes(q));
    const matchesStatus = statusFilter === "ALL" || g.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const normalizedPage = Math.min(page, totalPages);
  const pageStart = (normalizedPage - 1) * PAGE_SIZE;
  const paginated = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  const statuses: Array<"ALL" | GameStatus> = ["ALL", "SCHEDULED", "RUNNING", "FINISHED", "CANCELED"];

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Jogos"
        title="Lista de jogos"
        subtitle={`${filtered.length} de ${games.length} jogos`}
        action={
          <Link
            to="/jogos/novo"
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-black text-white hover:bg-red-700"
          >
            <Plus size={16} /> Novo jogo
          </Link>
        }
      />

      <SectionCard noPadding>
        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-2 p-4">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-sm font-semibold text-slate-950 focus:border-slate-400 focus:outline-none"
              placeholder="Buscar por local, clube, competição..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            )}
          </div>

          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value as "ALL" | GameType); setPage(1); }}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 focus:border-slate-400 focus:outline-none"
          >
            <option value="ALL">Todos os tipos</option>
            <option value="INTERNAL">Internos</option>
            <option value="EXTERNAL">Externos</option>
          </select>

          <div className="flex gap-1">
            {statuses.map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`rounded-lg border px-3 py-1.5 text-xs font-black transition-colors ${
                  statusFilter === s
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                {s === "ALL" ? "Todos" : gameStatusLabel[s]}
              </button>
            ))}
          </div>
        </div>

        {/* Tabela */}
        {gamesQuery.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : paginated.length === 0 ? (
          <div className="p-8 text-center">
            <CalendarDays size={32} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold text-slate-500">Nenhum jogo encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-175">
              <thead>
                <tr className="border-y border-slate-100 bg-slate-50">
                  {["Data", "Adversário / Local", "Tipo", "Resultado", "Situação", "Ações"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-black uppercase tracking-wide text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginated.map((g) => {
                  const opponent = g.awayClub?.name ?? g.homeClub?.name ?? "Jogo interno";
                  const hasResult = g.redScore !== null && g.whiteScore !== null;
                  return (
                    <tr
                      key={g.id}
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => navigate(`/jogos/${g.id}`)}
                    >
                      <td className="px-4 py-3 text-sm font-semibold text-slate-700 whitespace-nowrap">
                        {formatDate(g.date)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-black text-slate-950">{opponent}</p>
                        <p className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                          <MapPin size={10} />{g.location}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-600">
                        {gameTypeLabel[g.type]}
                      </td>
                      <td className="px-4 py-3 text-sm font-black text-slate-950">
                        {hasResult ? `${g.redScore ?? 0} × ${g.whiteScore ?? 0}` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-black ${gameStatusBadge[g.status]}`}>
                          {gameStatusLabel[g.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <Link
                            to={`/jogos/${g.id}`}
                            className="rounded px-2 py-1 text-xs font-black text-slate-600 hover:bg-slate-100"
                          >
                            Ver
                          </Link>
                          {g.status === "SCHEDULED" && (
                            <>
                              <Link
                                to={`/jogos/${g.id}/editar`}
                                className="rounded px-2 py-1 text-xs font-black text-slate-600 hover:bg-slate-100"
                              >
                                Editar
                              </Link>
                              <button
                                onClick={() => setCancelGame(g)}
                                className="rounded px-2 py-1 text-xs font-black text-red-600 hover:bg-red-50"
                              >
                                Cancelar
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
            <p className="text-xs font-semibold text-slate-500">
              {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, filtered.length)} de {filtered.length}
            </p>
            <div className="flex gap-1">
              <button
                disabled={normalizedPage === 1}
                onClick={() => setPage((p) => p - 1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                disabled={normalizedPage === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </SectionCard>

      {cancelGame && (
        <GameCancelModal
          game={cancelGame}
          reason={cancelReason}
          note={cancelNote}
          confirming={cancelMutation.isPending}
          secondaryButtonClass="inline-flex min-h-10 items-center rounded-lg border border-slate-200 px-4 text-sm font-black text-slate-700 hover:bg-slate-50"
          onReasonChange={setCancelReason}
          onNoteChange={setCancelNote}
          onConfirm={() => void cancelMutation.mutateAsync({ id: cancelGame.id, reason: cancelReason, note: cancelNote })}
          onClose={() => setCancelGame(null)}
        />
      )}
    </div>
  );
}
