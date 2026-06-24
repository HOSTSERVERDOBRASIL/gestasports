import type { Dispatch, FormEvent, SetStateAction } from "react";
import type { Associate, FinancialEntry } from "../../types/domain";
import {
  formatFinancialCategory,
  getCategoryOptions,
  statusLabels,
  typeLabels,
  type FinancialEntryCategory
} from "../../utils/financeLabels";

export type FinancialEntryFormState = {
  type: "INCOME" | "EXPENSE";
  category: FinancialEntryCategory;
  description: string;
  amountBRL: string;
  status: FinancialEntry["status"];
  dueDate: string;
  paidAt: string;
  receiptUrl: string;
  costCenter: string;
  associateId: string;
};

const quickExpenseTemplates = [
  { label: "Despesa administrativa", category: "ADMINISTRATIVE" as FinancialEntryCategory, description: "Despesa administrativa", costCenter: "Administrativo" },
  { label: "Fornecedor", category: "ADMINISTRATIVE" as FinancialEntryCategory, description: "Pagamento de fornecedor", costCenter: "Fornecedores" },
  { label: "Manutenção", category: "ADMINISTRATIVE" as FinancialEntryCategory, description: "Manutenção do clube", costCenter: "Manutenção" },
  { label: "Taxas bancárias", category: "ADMINISTRATIVE" as FinancialEntryCategory, description: "Taxas bancárias", costCenter: "Financeiro" },
  { label: "Documento ou cartório", category: "ADMINISTRATIVE" as FinancialEntryCategory, description: "Documento ou cartório", costCenter: "Governança" }
];

export function FinanceEntryForm({
  editingEntryId,
  form,
  associates,
  categoryOptions,
  saving,
  setForm,
  onCancelEdit,
  onReceiptFile,
  onSubmit
}: {
  editingEntryId: string | null;
  form: FinancialEntryFormState;
  associates: Associate[];
  categoryOptions: FinancialEntryCategory[];
  saving: boolean;
  setForm: Dispatch<SetStateAction<FinancialEntryFormState>>;
  onCancelEdit: () => void;
  onReceiptFile: (file: File | null) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
}) {
  return (
    <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-slate-900">{editingEntryId ? "Editar lançamento" : "Novo lançamento"}</h3>
        {editingEntryId ? (
          <button type="button" className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={onCancelEdit}>
            Cancelar edição
          </button>
        ) : null}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {quickExpenseTemplates.map((template) => (
          <button
            key={template.label}
            type="button"
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100"
            onClick={() =>
              setForm((prev) => ({
                ...prev,
                type: "EXPENSE",
                category: template.category,
                description: template.description,
                costCenter: template.costCenter,
                status: "PAID"
              }))
            }
          >
            {template.label}
          </button>
        ))}
      </div>

      <form className="mt-3 space-y-3" onSubmit={(event) => void onSubmit(event)}>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="text-sm text-slate-600">
            Tipo
            <select
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              value={form.type}
              onChange={(event) => {
                const nextType = event.target.value as FinancialEntryFormState["type"];
                setForm((prev) => ({
                  ...prev,
                  type: nextType,
                  category: getCategoryOptions(nextType)[0]
                }));
              }}
            >
              {Object.entries(typeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-600">
            Status
            <select
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              value={form.status}
              onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as FinancialEntryFormState["status"] }))}
            >
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block text-sm text-slate-600">
          Categoria
          <select
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            value={form.category}
            onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value as FinancialEntryCategory }))}
          >
            {categoryOptions.map((category) => (
              <option key={category} value={category}>
                {formatFinancialCategory(category)}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm text-slate-600">
          Descrição
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            required
          />
        </label>

        <label className="block text-sm text-slate-600">
          Associado vinculado
          <select
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            value={form.associateId}
            onChange={(event) => setForm((prev) => ({ ...prev, associateId: event.target.value }))}
          >
            <option value="">Sem associado específico</option>
            {associates.map((associate) => (
              <option key={associate.id} value={associate.id}>
                {associate.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm text-slate-600">
          Valor (R$)
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            value={form.amountBRL}
            onChange={(event) => setForm((prev) => ({ ...prev, amountBRL: event.target.value }))}
            placeholder="0,00"
            required
          />
        </label>

        <div className="grid gap-2 sm:grid-cols-2">
          <label className="text-sm text-slate-600">
            Vencimento
            <input
              type="date"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              value={form.dueDate}
              onChange={(event) => setForm((prev) => ({ ...prev, dueDate: event.target.value }))}
            />
          </label>
          <label className="text-sm text-slate-600">
            Pagamento
            <input
              type="date"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              value={form.paidAt}
              onChange={(event) => setForm((prev) => ({ ...prev, paidAt: event.target.value }))}
            />
          </label>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm font-semibold text-slate-700">Comprovante</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <label className="text-sm text-slate-600">
              Anexar arquivo
              <input
                type="file"
                accept="image/*,application/pdf"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
                onChange={(event) => onReceiptFile(event.target.files?.[0] ?? null)}
              />
            </label>
            <label className="text-sm text-slate-600">
              Ou link do comprovante
              <input
                type="text"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
                value={form.receiptUrl.startsWith("data:") ? "Arquivo anexado" : form.receiptUrl}
                onChange={(event) => setForm((prev) => ({ ...prev, receiptUrl: event.target.value }))}
                disabled={form.receiptUrl.startsWith("data:")}
                placeholder="https://..."
              />
            </label>
          </div>
          {form.receiptUrl ? (
            <div className="mt-2 flex flex-wrap gap-2">
              <a className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700" href={form.receiptUrl} target="_blank" rel="noreferrer">
                Ver comprovante
              </a>
              <button type="button" className="rounded border border-red-200 bg-white px-2 py-1 text-xs font-semibold text-red-700" onClick={() => setForm((prev) => ({ ...prev, receiptUrl: "" }))}>
                Remover anexo
              </button>
            </div>
          ) : null}
        </div>

        <label className="block text-sm text-slate-600">
          Centro de custo
          <input
            list="cost-centers"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            value={form.costCenter}
            onChange={(event) => setForm((prev) => ({ ...prev, costCenter: event.target.value }))}
          />
          <datalist id="cost-centers">
            <option value="Administrativo" />
            <option value="Financeiro" />
            <option value="Fornecedores" />
            <option value="Manutenção" />
            <option value="Mensalidade" />
            <option value="Governança" />
          </datalist>
        </label>

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-xl bg-[#08255b] px-4 py-2.5 font-semibold text-white hover:bg-[#0b3278] disabled:opacity-60"
        >
          {saving ? "Salvando..." : editingEntryId ? "Salvar edição" : "Salvar lançamento"}
        </button>
      </form>
    </article>
  );
}
