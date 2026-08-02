import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronRight, Save } from "lucide-react";
import { apiRequest } from "../../services/api";
import type { Associate, AssociateStatus, BoardRole } from "../../types/domain";

type FormState = {
  name: string;
  email: string;
  phone: string;
  monthlyFeeBRL: string;
  status: AssociateStatus;
  boardRoleId: string;
};

const blank: FormState = {
  name: "",
  email: "",
  phone: "",
  monthlyFeeBRL: "60,00",
  status: "ACTIVE",
  boardRoleId: ""
};

function toCents(value: string) {
  return Math.round(parseFloat(value.replace(",", ".")) * 100) || 0;
}

export function AssociateFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = Boolean(id);

  const [form, setForm] = useState<FormState>(blank);

  const associateQuery = useQuery({
    queryKey: ["associate", id],
    queryFn: () => apiRequest<Associate>(`/associates/${id}`),
    enabled: isEditing
  });

  const boardRolesQuery = useQuery({
    queryKey: ["board-roles"],
    queryFn: () => apiRequest<BoardRole[]>("/board-roles")
  });

  useEffect(() => {
    const a = associateQuery.data;
    if (!a) return;
    setForm({
      name: a.name,
      email: a.email ?? "",
      phone: a.phone ?? "",
      monthlyFeeBRL: String((a.monthlyFeeCents / 100).toFixed(2)).replace(".", ","),
      status: a.status,
      boardRoleId: a.boardRoleId ?? ""
    });
  }, [associateQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      apiRequest<Associate>(isEditing ? `/associates/${id}` : "/associates", {
        method: isEditing ? "PATCH" : "POST",
        body: JSON.stringify({
          name: form.name,
          email: form.email || undefined,
          phone: form.phone || undefined,
          monthlyFeeCents: toCents(form.monthlyFeeBRL) || 6000,
          status: form.status,
          boardRoleId: form.boardRoleId || undefined
        })
      }),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ["associates"] });
      if (isEditing) {
        void queryClient.invalidateQueries({ queryKey: ["associate", id] });
      }
      navigate(`/associados/${saved.id}`);
    }
  });

  const boardRoles = boardRolesQuery.data ?? [];
  const isLoading = isEditing && associateQuery.isLoading;

  return (
    <div className="space-y-4">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
        <Link to="/pessoas" className="hover:text-slate-700">Pessoas</Link>
        <ChevronRight size={12} />
        <Link to="/associados" className="hover:text-slate-700">Associados</Link>
        {isEditing && associateQuery.data && (
          <>
            <ChevronRight size={12} />
            <Link to={`/associados/${id}`} className="hover:text-slate-700">{associateQuery.data.name}</Link>
          </>
        )}
        <ChevronRight size={12} />
        <span className="text-slate-950">{isEditing ? "Editar" : "Novo associado"}</span>
      </nav>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-black text-slate-950">
              {isEditing ? "Editar associado" : "Novo associado"}
            </h1>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {isEditing
                ? "Atualize os dados do cadastro. As alterações são salvas imediatamente."
                : "Preencha os dados para cadastrar um novo membro."}
            </p>
          </div>
          <Link
            to={isEditing && id ? `/associados/${id}` : "/associados"}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft size={14} /> Voltar
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-11 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => { e.preventDefault(); void saveMutation.mutateAsync(); }}
          >
            <div className="grid gap-4 sm:grid-cols-2">

              <label className="block text-sm font-black text-slate-700">
                Nome completo <span className="text-red-500">*</span>
                <input
                  required
                  className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 focus:border-slate-400 focus:outline-none"
                  placeholder="Nome do associado"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </label>

              <label className="block text-sm font-black text-slate-700">
                Email
                <input
                  type="email"
                  className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 focus:border-slate-400 focus:outline-none"
                  placeholder="email@exemplo.com"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </label>

              <label className="block text-sm font-black text-slate-700">
                Telefone / WhatsApp
                <input
                  className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 focus:border-slate-400 focus:outline-none"
                  placeholder="(00) 00000-0000"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </label>

              <label className="block text-sm font-black text-slate-700">
                Mensalidade (R$)
                <input
                  className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 focus:border-slate-400 focus:outline-none"
                  placeholder="60,00"
                  value={form.monthlyFeeBRL}
                  onChange={(e) => setForm((f) => ({ ...f, monthlyFeeBRL: e.target.value }))}
                />
              </label>

              <label className="block text-sm font-black text-slate-700">
                Situação
                <select
                  className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 focus:border-slate-400 focus:outline-none"
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as AssociateStatus }))}
                >
                  <option value="ACTIVE">Ativo — em dia</option>
                  <option value="LATE">Atrasado — pendente</option>
                  <option value="INACTIVE">Inativo — pausado</option>
                </select>
              </label>

              <label className="block text-sm font-black text-slate-700">
                Função no clube
                <select
                  className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 focus:border-slate-400 focus:outline-none"
                  value={form.boardRoleId}
                  onChange={(e) => setForm((f) => ({ ...f, boardRoleId: e.target.value }))}
                >
                  <option value="">Membro</option>
                  {boardRoles.map((role) => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </select>
              </label>

            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
              <button
                type="submit"
                disabled={saveMutation.isPending || !form.name.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-black text-white hover:bg-red-700 disabled:opacity-60"
              >
                <Save size={14} />
                {saveMutation.isPending ? "Salvando..." : isEditing ? "Salvar alterações" : "Cadastrar associado"}
              </button>
              <Link
                to={isEditing && id ? `/associados/${id}` : "/associados"}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </Link>
              {saveMutation.isError && (
                <p className="text-sm font-semibold text-red-600">Erro ao salvar. Verifique os dados e tente novamente.</p>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
