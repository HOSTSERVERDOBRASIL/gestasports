import { useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Edit, Plus, Search, UserRound } from "lucide-react";
import { apiRequest } from "../../services/api";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatusBadge } from "../../components/ui/StatusBadge";
import type { AthleteProfile, AthletePosition, AthleteStatus } from "../../types/domain";

type OutletPeriod = { month: number; year: number };

const positionLabel: Record<AthletePosition, string> = {
  GOALKEEPER: "Goleiro",
  DEFENDER: "Zagueiro",
  RIGHT_BACK: "Lat. direito",
  LEFT_BACK: "Lat. esquerdo",
  DEFENSIVE_MIDFIELDER: "Volante",
  CENTRAL_MIDFIELDER: "Meia central",
  ATTACKING_MIDFIELDER: "Meia atacante",
  RIGHT_WINGER: "Ponta direita",
  LEFT_WINGER: "Ponta esquerda",
  STRIKER: "Centroavante",
  FULLBACK: "Lateral",
  MIDFIELDER: "Meia",
  FORWARD: "Atacante",
  LINE: "Linha",
  BOTH: "Ambos"
};

const statusVariant: Record<AthleteStatus, "success" | "neutral" | "danger" | "warning"> = {
  ACTIVE: "success",
  INACTIVE: "neutral",
  DELINQUENT: "danger",
  SUSPENDED: "warning"
};

const statusLabel: Record<AthleteStatus, string> = {
  ACTIVE: "Ativo",
  INACTIVE: "Inativo",
  DELINQUENT: "Inadimplente",
  SUSPENDED: "Suspenso"
};

const ALL = "__ALL__";

export function ElencoListPage() {
  const { month, year } = useOutletContext<OutletPeriod>();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [positionFilter, setPositionFilter] = useState<string>(ALL);

  const query = useQuery({
    queryKey: ["athletes", month, year, "list"],
    queryFn: () => apiRequest<AthleteProfile[]>(`/athletes?month=${month}&year=${year}`)
  });

  const athletes = query.data ?? [];

  const filtered = athletes.filter((a) => {
    if (statusFilter !== ALL && a.status !== statusFilter) return false;
    if (positionFilter !== ALL && a.position !== positionFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!a.name.toLowerCase().includes(q) && !positionLabel[a.position].toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const statusCounts = {
    ACTIVE: athletes.filter((a) => a.status === "ACTIVE").length,
    INACTIVE: athletes.filter((a) => a.status === "INACTIVE").length,
    DELINQUENT: athletes.filter((a) => a.status === "DELINQUENT").length,
    SUSPENDED: athletes.filter((a) => a.status === "SUSPENDED").length
  };

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Pessoas"
        breadcrumbs={[
          { label: "Pessoas", href: "/pessoas" },
          { label: "Elenco" }
        ]}
        title="Elenco"
        subtitle={`${filtered.length} de ${athletes.length} atletas`}
        action={
          <Link
            to="/atletas/novo"
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-black text-white hover:bg-red-700"
          >
            <Plus size={15} /> Novo atleta
          </Link>
        }
      />

      {/* Filtros rápidos de status */}
      <div className="flex flex-wrap gap-2">
        {([ALL, "ACTIVE", "DELINQUENT", "SUSPENDED", "INACTIVE"] as const).map((s) => {
          const isAll = s === ALL;
          const count = isAll ? athletes.length : statusCounts[s];
          const active = statusFilter === s;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full px-3 py-1 text-xs font-black transition-colors ${active ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              {isAll ? "Todos" : statusLabel[s]} <span className="ml-1 opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Barra de busca e filtro de posição */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm font-semibold text-slate-950 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
            placeholder="Buscar por nome ou posição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 focus:border-slate-400 focus:outline-none"
          value={positionFilter}
          onChange={(e) => setPositionFilter(e.target.value)}
        >
          <option value={ALL}>Todas as posições</option>
          {Object.entries(positionLabel).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-160 w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="py-3 pl-4 pr-3 text-left text-xs font-black uppercase tracking-wide text-slate-500">Atleta</th>
              <th className="px-3 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500">Posição</th>
              <th className="px-3 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500">Situação</th>
              <th className="px-3 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500">Vínculo</th>
              <th className="px-3 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500">Mensalidade</th>
              <th className="py-3 pl-3 pr-4 text-right text-xs font-black uppercase tracking-wide text-slate-500">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {query.isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="px-4 py-3">
                      <div className="h-5 animate-pulse rounded bg-slate-100" />
                    </td>
                  </tr>
                ))
              : filtered.length === 0
              ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm font-semibold text-slate-400">
                      Nenhum atleta encontrado
                    </td>
                  </tr>
                )
              : filtered.map((a) => (
                  <tr
                    key={a.id}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => navigate(`/atletas/${a.id}/perfil`)}
                  >
                    <td className="py-3 pl-4 pr-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-black text-slate-600">
                          {a.name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase()}
                        </div>
                        <span className="font-black text-slate-800">{a.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{positionLabel[a.position]}</td>
                    <td className="px-3 py-3">
                      <StatusBadge label={statusLabel[a.status]} variant={statusVariant[a.status]} size="sm" />
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      {a.linkType === "ASSOCIATE" ? "Associado" : a.linkType === "CONTRACTED" ? "Contratado" : "Convidado"}
                    </td>
                    <td className="px-3 py-3">
                      {a.paidThisMonth ? (
                        <span className="text-xs font-black text-emerald-600">Pago</span>
                      ) : a.amountDueCents > 0 ? (
                        <span className="text-xs font-black text-red-600">Em aberto</span>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 pl-3 pr-4 text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Link
                          to={`/atletas/${a.id}/perfil`}
                          className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                          title="Ver perfil"
                        >
                          <UserRound size={14} />
                        </Link>
                        <Link
                          to={`/atletas/${a.id}/editar`}
                          className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                          title="Editar"
                        >
                          <Edit size={14} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {filtered.length > 0 && (
        <p className="text-right text-xs font-semibold text-slate-400">
          {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
