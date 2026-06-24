import { AlertTriangle, CheckCircle2, CircleOff, Pencil, Search, Trash2, UserPlus } from "lucide-react";
import type { Associate, AssociateStatus } from "../../types/domain";
import { formatCurrency } from "../../utils/formatters";

type AssociatesListProps = {
  associates: Associate[];
  search: string;
  statusFilter: "ALL" | AssociateStatus;
  statusCounts: Record<AssociateStatus, number>;
  loading: boolean;
  actionsPending: boolean;
  page: number;
  totalPages: number;
  pageStart: number;
  pageEnd: number;
  filteredTotal: number;
  pageSize: number;
  onSearchChange: (search: string) => void;
  onStatusChange: (status: "ALL" | AssociateStatus) => void;
  onPageChange: (page: number) => void;
  onStatusUpdate: (associateId: string, status: AssociateStatus) => void;
  onPromote: (associate: Associate) => void;
  onEdit: (associate: Associate) => void;
  onDelete: (associate: Associate) => void;
};

const statusHelp: Record<AssociateStatus, { label: string; badge: string }> = {
  ACTIVE: { label: "Ativo", badge: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  LATE: { label: "Atrasado", badge: "border-amber-200 bg-amber-50 text-amber-700" },
  INACTIVE: { label: "Inativo", badge: "border-slate-200 bg-slate-50 text-slate-700" }
};

const statusChipStyles: Record<AssociateStatus, { idle: string; selected: string }> = {
  ACTIVE: {
    idle: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    selected: "border-emerald-500 bg-emerald-600 text-white shadow-emerald-900/20 ring-2 ring-emerald-200 hover:bg-emerald-700"
  },
  LATE: {
    idle: "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
    selected: "border-amber-500 bg-amber-600 text-white shadow-amber-900/20 ring-2 ring-amber-200 hover:bg-amber-700"
  },
  INACTIVE: {
    idle: "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200",
    selected: "border-slate-500 bg-slate-700 text-white shadow-slate-900/20 ring-2 ring-slate-300 hover:bg-slate-800"
  }
};

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function AssociatesList({
  associates,
  search,
  statusFilter,
  statusCounts,
  loading,
  actionsPending,
  page,
  totalPages,
  pageStart,
  pageEnd,
  filteredTotal,
  pageSize,
  onSearchChange,
  onStatusChange,
  onPageChange,
  onStatusUpdate,
  onPromote,
  onEdit,
  onDelete
}: AssociatesListProps) {
  const statuses: AssociateStatus[] = ["ACTIVE", "LATE", "INACTIVE"];

  return (
    <>
      <div className="mt-3 mb-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">Ativo: em dia</span>
        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-700">Atrasado: pendente</span>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700">Inativo: pausado</span>
      </div>

      <div className="mb-4 space-y-3">
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-slate-950">Base de associados</h2>
          <p className="text-sm text-slate-500">Associado tem função no clube; atleta entra em sorteio, jogo e estatísticas.</p>
        </div>
        <div className="grid min-w-0 gap-2 md:grid-cols-[18rem_12rem_minmax(0,1fr)] md:items-center">
          <label className="relative block min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} aria-hidden="true" />
            <input
              className="h-10 w-full rounded-lg border border-slate-200 px-3 pl-9 text-sm"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Buscar por nome"
            />
          </label>
          <select
            className="h-10 w-full min-w-0 rounded-lg border border-slate-200 px-3 text-sm font-semibold"
            value={statusFilter}
            onChange={(event) => onStatusChange(event.target.value as "ALL" | AssociateStatus)}
          >
            <option value="ALL">Todos status</option>
            <option value="ACTIVE">Ativo</option>
            <option value="LATE">Atrasado</option>
            <option value="INACTIVE">Inativo</option>
          </select>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {statuses.map((status) => {
              const count = statusCounts[status];
              const selected = statusFilter === status;
              const label = status === "ACTIVE" ? (count === 1 ? "ativo" : "ativos") : status === "LATE" ? (count === 1 ? "atrasado" : "atrasados") : count === 1 ? "inativo" : "inativos";
              return (
                <button
                  key={status}
                  type="button"
                  aria-pressed={selected}
                  className={`inline-flex h-10 shrink-0 items-center justify-center rounded-full border px-2.5 text-sm font-black shadow-sm ${selected ? statusChipStyles[status].selected : statusChipStyles[status].idle}`}
                  onClick={() => onStatusChange(status)}
                >
                  {count} {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="fl-associates-table w-full min-w-[860px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-3">Nome</th>
              <th className="px-3 py-3">Contato</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Função</th>
              <th className="px-3 py-3 text-right">Mensalidade</th>
              <th className="w-28 px-3 py-3 text-right xl:w-56">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {associates.map((associate) => (
              <tr key={associate.id}>
                <td className="whitespace-nowrap px-3 py-3 font-semibold text-slate-900">
                  <div className="flex min-w-[12rem] items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-black text-slate-700 ring-1 ring-slate-200" aria-hidden="true">
                      {getInitials(associate.name)}
                    </span>
                    <span className="min-w-0 truncate">{associate.name}</span>
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-slate-600">{associate.email ?? associate.phone ?? "-"}</td>
                <td className="px-3 py-3 text-slate-600">
                  <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${statusHelp[associate.status].badge}`}>
                    {statusHelp[associate.status].label}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{associate.boardRole?.name ?? "Membro"}</span>
                    {associate.boardRole?.canAccessAdmin ? <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-black text-red-700">Admin</span> : null}
                    {associate.boardRole?.canAccessFinancial ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700">Financeiro</span> : null}
                    {associate.boardRole?.canAccessAthlete ? <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-black text-slate-600">Atleta</span> : null}
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-slate-900">{formatCurrency(associate.monthlyFeeCents)}</td>
                <td className="w-28 px-3 py-3 text-right xl:w-56">
                  <div className="inline-flex max-w-28 flex-wrap items-center justify-end gap-1 xl:max-w-none xl:flex-nowrap">
                    <button type="button" title="Marcar ativo" aria-label={`Marcar ${associate.name} como ativo`} className="fl-associate-action-active inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border disabled:opacity-60 xl:h-8 xl:w-8" disabled={actionsPending} onClick={() => onStatusUpdate(associate.id, "ACTIVE")}><CheckCircle2 size={14} /></button>
                    <button type="button" title="Marcar atrasado" aria-label={`Marcar ${associate.name} como atrasado`} className="fl-associate-action-late inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border disabled:opacity-60 xl:h-8 xl:w-8" disabled={actionsPending} onClick={() => onStatusUpdate(associate.id, "LATE")}><AlertTriangle size={14} /></button>
                    <button type="button" title="Marcar inativo" aria-label={`Marcar ${associate.name} como inativo`} className="fl-associate-action-inactive inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border disabled:opacity-60 xl:h-8 xl:w-8" disabled={actionsPending} onClick={() => onStatusUpdate(associate.id, "INACTIVE")}><CircleOff size={14} /></button>
                    {!associate.athlete ? <button type="button" title="Converter para atleta" aria-label={`Converter ${associate.name} para atleta`} className="fl-associate-action-promote inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border disabled:opacity-60 xl:h-8 xl:w-8" disabled={actionsPending} onClick={() => onPromote(associate)}><UserPlus size={14} /></button> : null}
                    <button type="button" title="Editar associado" aria-label={`Editar ${associate.name}`} className="fl-associate-action-edit inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border xl:h-8 xl:w-8" onClick={() => onEdit(associate)}><Pencil size={14} /></button>
                    <button type="button" title="Excluir associado" aria-label={`Excluir ${associate.name}`} className="fl-associate-action-delete fl-action-delete inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border xl:h-8 xl:w-8" onClick={() => onDelete(associate)}><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && filteredTotal > pageSize ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-500">Mostrando {pageStart + 1}-{pageEnd} de {filteredTotal} associados</p>
          <div className="flex items-center gap-2">
            <button type="button" disabled={page === 1} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => onPageChange(Math.max(1, page - 1))}>Anterior</button>
            <span className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-black text-slate-700">{page}/{totalPages}</span>
            <button type="button" disabled={page === totalPages} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => onPageChange(Math.min(totalPages, page + 1))}>Próxima</button>
          </div>
        </div>
      ) : null}
      {!loading && filteredTotal === 0 ? <p className="mt-3 text-sm text-slate-500">Nenhum associado encontrado.</p> : null}
    </>
  );
}
