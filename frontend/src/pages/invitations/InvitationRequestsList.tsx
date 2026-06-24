import { Check, X } from "lucide-react";
import type { JoinRequest } from "../../types/domain";
import { formatDate } from "../../utils/formatters";

type InvitationRequestsListProps = {
  requests: JoinRequest[];
  pendingCount: number;
  loading: boolean;
  updating: boolean;
  onRefresh: () => void;
  onReview: (request: JoinRequest, status: "APPROVED" | "REJECTED") => void;
};

const statusLabels: Record<JoinRequest["status"], string> = {
  PENDING: "Pendente",
  APPROVED: "Aprovado",
  REJECTED: "Rejeitado"
};

export function InvitationRequestsList({ requests, pendingCount, loading, updating, onRefresh, onReview }: InvitationRequestsListProps) {
  return (
    <section className="mt-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-950">Solicitações de entrada</h2>
          <p className="text-sm text-slate-500">{pendingCount} solicitação(ões) pendente(s) para virar associado.</p>
        </div>
        <button type="button" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50" onClick={onRefresh}>
          Atualizar
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {requests.map((request) => (
          <article key={request.id} className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate font-bold text-slate-950">{request.name}</h3>
                <p className="text-sm text-slate-500">{request.email}</p>
                {request.phone ? <p className="text-sm text-slate-500">{request.phone}</p> : null}
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">{statusLabels[request.status]}</span>
            </div>
            <p className="mt-3 rounded-lg bg-white px-3 py-2 text-sm text-slate-600">{request.message ?? "Sem mensagem"}</p>
            <p className="mt-2 text-xs font-semibold text-slate-400">Indicado por {request.invitedByAssociate?.name ?? "-"} em {formatDate(request.createdAt)}</p>
            {request.status === "PENDING" ? (
              <div className="mt-4 flex gap-2">
                <button type="button" className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60" disabled={updating} onClick={() => onReview(request, "APPROVED")}>
                  <Check size={16} />
                  Aprovar
                </button>
                <button type="button" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60" disabled={updating} onClick={() => onReview(request, "REJECTED")}>
                  <X size={16} />
                  Rejeitar
                </button>
              </div>
            ) : null}
          </article>
        ))}
      </div>
      {loading ? <p className="mt-4 text-sm font-semibold text-slate-500">Carregando convites...</p> : null}
      {!loading && requests.length === 0 ? <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">Nenhuma solicitação encontrada.</p> : null}
    </section>
  );
}
