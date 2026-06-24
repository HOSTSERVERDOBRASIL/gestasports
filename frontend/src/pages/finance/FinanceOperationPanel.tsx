export type FinanceOperationView = "LANCAMENTOS" | "NOVO";

export function FinanceOperationPanel({
  activeView,
  onChange,
  createError,
  deleteError,
  updateStatusError,
  manualSettleError,
  success
}: {
  activeView: FinanceOperationView;
  onChange: (view: FinanceOperationView) => void;
  createError: boolean;
  deleteError: boolean;
  updateStatusError: boolean;
  manualSettleError: boolean;
  success: boolean;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`rounded-lg px-3 py-2 text-sm font-semibold ${activeView === "LANCAMENTOS" ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
          onClick={() => onChange("LANCAMENTOS")}
        >
          Lançamentos
        </button>
        <button
          type="button"
          className={`rounded-lg px-3 py-2 text-sm font-semibold ${activeView === "NOVO" ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
          onClick={() => onChange("NOVO")}
        >
          Novo lançamento
        </button>
      </div>
      {createError ? <p className="fl-state-error mt-2 rounded-lg border px-3 py-2 text-xs font-semibold">Falha ao salvar lançamento. Verifique os dados e tente novamente.</p> : null}
      {deleteError ? <p className="fl-state-error mt-2 rounded-lg border px-3 py-2 text-xs font-semibold">Falha ao remover lançamento. Tente novamente.</p> : null}
      {updateStatusError ? <p className="fl-state-error mt-2 rounded-lg border px-3 py-2 text-xs font-semibold">Falha ao atualizar status do lançamento.</p> : null}
      {manualSettleError ? <p className="fl-state-error mt-2 rounded-lg border px-3 py-2 text-xs font-semibold">Falha ao dar baixa manual na mensalidade.</p> : null}
      {success ? <p className="fl-state-success mt-2 rounded-lg border px-3 py-2 text-xs font-semibold">Operação concluída com sucesso.</p> : null}
    </article>
  );
}
