import { Check, UserPlus, X } from "lucide-react";
import { Link } from "react-router-dom";
import type { JoinRequest } from "../../types/domain";

type AssociateJoinRequestsProps = {
  requests: JoinRequest[];
  totalRequests: number;
  updating: boolean;
  onReview: (request: JoinRequest, status: "APPROVED" | "REJECTED") => void;
};

export function AssociateJoinRequests({ requests, totalRequests, updating, onReview }: AssociateJoinRequestsProps) {
  const visibleRequests = requests.slice(0, 3);

  return (
    <section className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-950">Solicitações de Entrada</h3>
          <p className="text-sm text-slate-500">{requests.length} solicitação(ões) pendente(s) para virar associado.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-slate-700">{totalRequests} total</span>
          <Link className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-black text-white shadow-sm hover:bg-red-700" to="/convites">
            <UserPlus size={16} />
            Aprovar solicitações
          </Link>
        </div>
      </div>

      {requests.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleRequests.map((request) => (
            <article key={request.id} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-950">{request.name}</p>
                  <p className="text-sm text-slate-500">{request.email}</p>
                  {request.phone ? <p className="text-sm text-slate-500">{request.phone}</p> : null}
                  <p className="mt-1 text-xs text-slate-500">Indicado por {request.invitedByAssociate?.name ?? "associado"}</p>
                </div>
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">Pendente</span>
              </div>
              {request.message ? <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{request.message}</p> : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60" disabled={updating} onClick={() => onReview(request, "APPROVED")}>
                  <Check size={16} />
                  Aprovar
                </button>
                <button type="button" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60" disabled={updating} onClick={() => onReview(request, "REJECTED")}>
                  <X size={16} />
                  Rejeitar
                </button>
              </div>
            </article>
          ))}
          {requests.length > visibleRequests.length ? (
            <Link to="/convites" className="grid min-h-32 place-items-center rounded-lg border border-dashed border-slate-300 bg-white p-3 text-center text-sm font-black text-slate-600 hover:bg-slate-50">
              Ver mais {requests.length - visibleRequests.length} solicitação(ões)
            </Link>
          ) : null}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-4 text-sm text-slate-500">Nenhuma solicitação de entrada pendente.</p>
      )}
    </section>
  );
}
