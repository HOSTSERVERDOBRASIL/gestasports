import type { FormEvent } from "react";
import type { AssociateStatus, BoardRole } from "../../types/domain";

export type AssociateFormState = {
  name: string;
  email: string;
  phone: string;
  monthlyFeeBRL: string;
  status: AssociateStatus;
  boardRoleId: string;
};

type AssociateEditorProps = {
  form: AssociateFormState;
  boardRoles: BoardRole[];
  editing: boolean;
  saving: boolean;
  onChange: (form: AssociateFormState) => void;
  onCancel: () => void;
  onSubmit: () => void;
};

export function AssociateEditor({
  form,
  boardRoles,
  editing,
  saving,
  onChange,
  onCancel,
  onSubmit
}: AssociateEditorProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <article className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-slate-950">{editing ? "Editar associado" : "Novo associado"}</h2>
          <p className="text-sm text-slate-500">Salve para voltar para a listagem ou apenas retorne sem alterações.</p>
        </div>
        <button type="button" className="ml-auto rounded-lg border border-slate-200 px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-50" onClick={onCancel}>
          Voltar para lista
        </button>
      </div>

      <form className="space-y-3" onSubmit={handleSubmit}>
        <label className="block text-sm font-medium text-slate-600">
          Nome
          <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" value={form.name} onChange={(event) => onChange({ ...form, name: event.target.value })} required />
        </label>
        <label className="block text-sm font-medium text-slate-600">
          Email
          <input type="email" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" value={form.email} onChange={(event) => onChange({ ...form, email: event.target.value })} />
        </label>
        <label className="block text-sm font-medium text-slate-600">
          Telefone
          <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" value={form.phone} onChange={(event) => onChange({ ...form, phone: event.target.value })} />
        </label>
        <label className="block text-sm font-medium text-slate-600">
          Mensalidade (R$)
          <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" value={form.monthlyFeeBRL} onChange={(event) => onChange({ ...form, monthlyFeeBRL: event.target.value })} />
        </label>
        <label className="block text-sm font-medium text-slate-600">
          Status
          <select className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" value={form.status} onChange={(event) => onChange({ ...form, status: event.target.value as AssociateStatus })}>
            <option value="ACTIVE">Ativo</option>
            <option value="LATE">Atrasado</option>
            <option value="INACTIVE">Inativo</option>
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-600">
          Função no clube
          <select className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" value={form.boardRoleId} onChange={(event) => onChange({ ...form, boardRoleId: event.target.value })}>
            <option value="">Membro</option>
            {boardRoles.map((role) => (
              <option key={role.id} value={role.id}>{role.name}</option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={saving} className="w-full rounded-lg bg-red-600 px-4 py-2.5 font-semibold text-white hover:bg-red-700 disabled:opacity-60">
          {saving ? "Salvando..." : editing ? "Salvar alterações" : "Cadastrar"}
        </button>
      </form>
    </article>
  );
}
