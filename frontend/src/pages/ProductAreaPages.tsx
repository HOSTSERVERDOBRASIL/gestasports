import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpenText, CalendarDays, ClipboardList, Eye, Filter, Landmark, MoreHorizontal, Pencil, Plus, Search, Shield, Shirt, Trash2, Trophy, UserCircle2, Users } from "lucide-react";
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiRequest } from "../services/api";
import type { Associate, BoardRole, Club, ClubEvent, ClubEventRegistration, ClubEventRegistrationStatus, ClubEventStatus, ClubEventType, CompetitionRankingSummary, Field, FieldStatus, FinancialEntry, GalleryAsset, Game, HistoricalArchiveReport, PresidentTerm, Team } from "../types/domain";

type OutletPeriod = {
  month: number;
  year: number;
};

type AreaMetric = {
  label: string;
  value: string;
  hint: string;
};

const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((cents || 0) / 100);
}

function toDateKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function formatLongDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}

function SectionShell({ eyebrow, title, description, icon, action, children }: {
  eyebrow: string;
  title: string;
  description: string;
  icon: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 space-y-4">
      <article className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-5">
        <h1 className="sr-only">{title}</h1>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.08em] text-slate-500">
              {icon}
              {eyebrow}
            </p>
            <p className="mt-1 max-w-4xl text-sm font-semibold leading-5 text-slate-500">{description}</p>
          </div>
          {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
        </div>
      </article>
      {children}
    </section>
  );
}

function MetricGrid({ metrics }: { metrics: AreaMetric[] }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {metrics.map((metric) => (
        <div key={metric.label} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
          <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">{metric.label}</p>
          <strong className="mt-1 block truncate text-2xl font-black text-slate-950">{metric.value}</strong>
          <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">{metric.hint}</p>
        </div>
      ))}
      </div>
    </article>
  );
}

function PrimaryAreaButton({ children, onClick, to }: { children: ReactNode; onClick?: () => void; to?: string }) {
  const className = "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#08255b] px-4 text-sm font-black text-white shadow-sm hover:bg-[#0b3278]";
  if (to) {
    return <Link className={className} to={to}>{children}</Link>;
  }
  return <button type="button" className={className} onClick={onClick}>{children}</button>;
}

function EmptyState({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-sm font-semibold text-slate-500">{children}</p>;
}

const eventTypeLabels: Record<ClubEventType, string> = {
  SOCIAL: "Social",
  SPORT: "Esportivo",
  FUNDRAISING: "Arrecadação",
  MEETING: "Reunião",
  COMMUNITY: "Comunidade",
  OTHER: "Outro"
};

const eventStatusLabels: Record<ClubEventStatus, string> = {
  DRAFT: "Rascunho",
  OPEN: "Aberto",
  CLOSED: "Encerrado",
  CANCELED: "Cancelado"
};

function ActionIconButton({ label, tone = "neutral", children, onClick, disabled }: {
  label: string;
  tone?: "neutral" | "danger";
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border disabled:opacity-60 ${
        tone === "danger" ? "border-red-200 bg-red-50 text-red-700" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function DiretoriaPage() {
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  const presidentsQuery = useQuery({
    queryKey: ["president-terms", "diretoria"],
    queryFn: () => apiRequest<PresidentTerm[]>("/president-terms")
  });
  const associatesQuery = useQuery({
    queryKey: ["associates", "diretoria-registro"],
    queryFn: () => apiRequest<Associate[]>("/associates")
  });
  const boardRolesQuery = useQuery({
    queryKey: ["board-roles", "diretoria-registro"],
    queryFn: () => apiRequest<BoardRole[]>("/board-roles")
  });
  const [search, setSearch] = useState("");
  const [boardAssignmentForm, setBoardAssignmentForm] = useState({ associateId: "", boardRoleId: "" });
  const presidents = presidentsQuery.data ?? [];
  const associates = associatesQuery.data ?? [];
  const boardRoles = boardRolesQuery.data ?? [];
  const activeAssociates = associates.filter((associate) => associate.status === "ACTIVE");
  const assignableBoardRoles = boardRoles.filter((role) => !role.isDefault);
  const boardMembers = associates.filter((associate) => associate.boardRole && !associate.boardRole.isDefault);
  const boardRolesInUse = new Set(boardMembers.map((associate) => associate.boardRoleId).filter(Boolean));
  const vacantBoardRoles = boardRoles.filter((role) => !role.isDefault && !boardRolesInUse.has(role.id));
  const selectedBoardRole = boardRoles.find((role) => role.id === boardAssignmentForm.boardRoleId) ?? null;
  const filteredPresidents = presidents.filter((term) => term.name.toLowerCase().includes(search.trim().toLowerCase()));
  const currentTerms = presidents.filter((term) => term.startedYear <= currentYear && (term.endedYear ?? currentYear) >= currentYear);
  const finishedTerms = presidents.filter((term) => term.endedYear !== null);
  const yearsCovered = new Set(presidents.flatMap((term) => {
    const end = term.endedYear ?? currentYear;
    return Array.from({ length: Math.max(0, end - term.startedYear + 1) }, (_, index) => term.startedYear + index);
  })).size;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest<void>(`/president-terms/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["president-terms"] });
      void queryClient.invalidateQueries({ queryKey: ["club-history-document"] });
    }
  });

  const assignBoardRoleMutation = useMutation({
    mutationFn: ({ associateId, boardRoleId }: { associateId: string; boardRoleId: string }) =>
      apiRequest<Associate>(`/associates/${associateId}`, {
        method: "PATCH",
        body: JSON.stringify({ boardRoleId })
      }),
    onSuccess: () => {
      setBoardAssignmentForm({ associateId: "", boardRoleId: "" });
      void queryClient.invalidateQueries({ queryKey: ["associates"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    }
  });

  return (
    <SectionShell
      eyebrow="Pessoas"
      title="Diretoria"
      description="Registro da diretoria atual e histórico de mandatos preservados no Acervo do Clube."
      icon={<Landmark size={16} />}
      action={
        <PrimaryAreaButton to="/diretoria/mandatos/novo">
          <Plus size={16} />
          Novo mandato
        </PrimaryAreaButton>
      }
    >
      <MetricGrid
        metrics={[
          { label: "Mandatos", value: String(presidents.length), hint: "Registros cadastrados" },
          { label: "Diretoria atual", value: String(boardMembers.length), hint: "Associados com cargo" },
          { label: "Anos cobertos", value: String(yearsCovered), hint: "Histórico preservado" }
        ]}
      />

      <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-950">Registro atual da diretoria</h2>
            <p className="text-sm font-semibold text-slate-500">Cargos vinculados ao cadastro de associados. Este bloco representa a diretoria operacional do momento.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 hover:bg-slate-50" to="/associados">
              Associados
            </Link>
            <Link className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 hover:bg-slate-50" to="/configuracoes?aba=board">
              Cargos
            </Link>
          </div>
        </div>

        <form
          className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!boardAssignmentForm.associateId || !boardAssignmentForm.boardRoleId) {
              return;
            }
            void assignBoardRoleMutation.mutateAsync(boardAssignmentForm);
          }}
        >
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
            <label className="text-sm font-black text-slate-700">
              Associado
              <select
                className="mt-1 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900"
                value={boardAssignmentForm.associateId}
                onChange={(event) => setBoardAssignmentForm((prev) => ({ ...prev, associateId: event.target.value }))}
              >
                <option value="">Selecione um associado</option>
                {activeAssociates.map((associate) => (
                  <option key={`board-associate-${associate.id}`} value={associate.id}>
                    {associate.name}{associate.boardRole && !associate.boardRole.isDefault ? ` - ${associate.boardRole.name}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-black text-slate-700">
              Finalidade da função
              <select
                className="mt-1 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900"
                value={boardAssignmentForm.boardRoleId}
                onChange={(event) => setBoardAssignmentForm((prev) => ({ ...prev, boardRoleId: event.target.value }))}
              >
                <option value="">Selecione um cargo/finalidade</option>
                {assignableBoardRoles.map((role) => (
                  <option key={`board-role-option-${role.id}`} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              disabled={!boardAssignmentForm.associateId || !boardAssignmentForm.boardRoleId || assignBoardRoleMutation.isPending}
              className="h-11 rounded-lg bg-red-600 px-4 text-sm font-black text-white hover:bg-red-700 disabled:opacity-60"
            >
              {assignBoardRoleMutation.isPending ? "Salvando..." : "Vincular função"}
            </button>
          </div>
          {selectedBoardRole ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1">{selectedBoardRole.description || "Função operacional da diretoria."}</span>
              {selectedBoardRole.canAccessAdmin ? <span className="rounded-full bg-blue-50 px-2.5 py-1 font-black text-blue-700">Admin</span> : null}
              {selectedBoardRole.canAccessFinancial ? <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-black text-emerald-700">Financeiro</span> : null}
              {selectedBoardRole.canAccessAthlete ? <span className="rounded-full bg-slate-100 px-2.5 py-1 font-black text-slate-600">Atleta</span> : null}
            </div>
          ) : null}
          {activeAssociates.length === 0 ? (
            <p className="mt-3 text-sm font-semibold text-slate-500">Cadastre um associado ativo antes de vincular funções da diretoria.</p>
          ) : null}
          {assignableBoardRoles.length === 0 ? (
            <p className="mt-3 text-sm font-semibold text-slate-500">Cadastre cargos/finalidades em Configurações para liberar esta seleção.</p>
          ) : null}
        </form>

        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.08em] text-slate-500">
              <tr>
                <th className="px-3 py-3">Associado</th>
                <th className="px-3 py-3">Cargo</th>
                <th className="px-3 py-3">Contato</th>
                <th className="px-3 py-3">Acessos</th>
                <th className="px-3 py-3">Status</th>
                <th className="w-24 px-3 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {boardMembers.map((associate) => (
                <tr key={`board-member-${associate.id}`}>
                  <td className="px-3 py-3 font-black text-slate-950">{associate.name}</td>
                  <td className="px-3 py-3">
                    <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-black text-slate-700">
                      {associate.boardRole?.name ?? "Diretoria"}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-semibold text-slate-600">{associate.email ?? associate.phone ?? "-"}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1">
                      {associate.boardRole?.canAccessAdmin ? <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-black text-blue-700">Admin</span> : null}
                      {associate.boardRole?.canAccessFinancial ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700">Financeiro</span> : null}
                      {associate.boardRole?.canAccessAthlete ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-600">Atleta</span> : null}
                      {!associate.boardRole?.canAccessAdmin && !associate.boardRole?.canAccessFinancial && !associate.boardRole?.canAccessAthlete ? <span className="text-xs font-semibold text-slate-400">Sem acesso extra</span> : null}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${associate.status === "ACTIVE" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : associate.status === "LATE" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                      {associate.status === "ACTIVE" ? "Ativo" : associate.status === "LATE" ? "Atrasado" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <ActionIconButton
                      label={`Remover ${associate.name} da diretoria`}
                      tone="danger"
                      disabled={assignBoardRoleMutation.isPending}
                      onClick={() => void assignBoardRoleMutation.mutateAsync({ associateId: associate.id, boardRoleId: "" })}
                    >
                      <Trash2 size={14} />
                    </ActionIconButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!associatesQuery.isLoading && boardMembers.length === 0 ? <div className="mt-3"><EmptyState>Nenhum associado vinculado a cargo da diretoria.</EmptyState></div> : null}
        {vacantBoardRoles.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-700">Cargos sem associado:</span>
            {vacantBoardRoles.map((role) => (
              <span key={`vacant-board-role-${role.id}`} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">{role.name}</span>
            ))}
          </div>
        ) : null}
      </article>

      <div className="grid gap-4">
        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-950">Mandatos cadastrados</h2>
              <p className="text-sm font-semibold text-slate-500">{finishedTerms.length} encerrado(s), {currentTerms.length} em vigência.</p>
            </div>
            <label className="relative block w-full min-w-0 sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} aria-hidden="true" />
              <input
                className="h-10 w-full rounded-lg border border-slate-200 px-3 pl-9 text-sm font-semibold"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar mandato"
              />
            </label>
          </div>
          <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.08em] text-slate-500">
                <tr>
                  <th className="px-3 py-3">Presidente</th>
                  <th className="px-3 py-3">Período</th>
                  <th className="px-3 py-3">Observações</th>
                  <th className="px-3 py-3">Conquistas</th>
                  <th className="w-24 px-3 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPresidents.map((term) => (
                  <tr key={term.id}>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                          {term.photoUrl ? <img src={term.photoUrl} alt={term.name} className="h-full w-full object-cover" /> : <Landmark size={18} className="text-slate-400" />}
                        </span>
                        <span className="font-black text-slate-950">{term.name}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 font-semibold text-slate-700">{term.startedYear} - {term.endedYear ?? "atual"}</td>
                    <td className="max-w-[18rem] px-3 py-3 text-slate-600"><span className="line-clamp-2">{term.note ?? "-"}</span></td>
                    <td className="max-w-[18rem] px-3 py-3 text-slate-600"><span className="line-clamp-2">{term.achievements ?? "-"}</span></td>
                    <td className="px-3 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <Link className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" title={`Editar mandato de ${term.name}`} aria-label={`Editar mandato de ${term.name}`} to={`/diretoria/mandatos/${term.id}/editar`}>
                          <Pencil size={14} />
                        </Link>
                        <ActionIconButton label={`Excluir mandato de ${term.name}`} tone="danger" disabled={deleteMutation.isPending} onClick={() => {
                          if (window.confirm(`Excluir mandato de ${term.name}?`)) void deleteMutation.mutateAsync(term.id);
                        }}><Trash2 size={14} /></ActionIconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!presidentsQuery.isLoading && filteredPresidents.length === 0 ? <div className="mt-3"><EmptyState>Nenhum mandato cadastrado.</EmptyState></div> : null}
        </article>
      </div>
    </SectionShell>
  );
}

export function DiretoriaMandatoFormPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const currentYear = new Date().getFullYear();
  const isEditing = Boolean(id);
  const presidentsQuery = useQuery({
    queryKey: ["president-terms", "diretoria-form"],
    queryFn: () => apiRequest<PresidentTerm[]>("/president-terms"),
    enabled: isEditing
  });
  const editingTerm = presidentsQuery.data?.find((term) => term.id === id) ?? null;
  const [form, setForm] = useState({
    name: "",
    startedYear: String(currentYear),
    endedYear: "",
    photoUrl: "",
    note: "",
    achievements: ""
  });
  const [photoError, setPhotoError] = useState("");

  useEffect(() => {
    if (!editingTerm) return;
    setForm({
      name: editingTerm.name,
      startedYear: String(editingTerm.startedYear),
      endedYear: editingTerm.endedYear ? String(editingTerm.endedYear) : "",
      photoUrl: editingTerm.photoUrl ?? "",
      note: editingTerm.note ?? "",
      achievements: editingTerm.achievements ?? ""
    });
  }, [editingTerm]);

  const saveMutation = useMutation({
    mutationFn: () =>
      apiRequest<PresidentTerm>(isEditing ? `/president-terms/${id}` : "/president-terms", {
        method: isEditing ? "PATCH" : "POST",
        body: JSON.stringify({
          name: form.name,
          startedYear: Number(form.startedYear),
          endedYear: form.endedYear ? Number(form.endedYear) : null,
          photoUrl: form.photoUrl || "",
          note: form.note || "",
          achievements: form.achievements || ""
        })
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["president-terms"] });
      void queryClient.invalidateQueries({ queryKey: ["club-history-document"] });
      navigate("/diretoria");
    }
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void saveMutation.mutateAsync();
  }

  function handlePhotoFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPhotoError("Envie uma imagem em JPG, PNG ou WebP.");
      return;
    }
    if (file.size > 1_500_000) {
      setPhotoError("A foto precisa ter ate 1,5 MB para ser salva diretamente.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, photoUrl: typeof reader.result === "string" ? reader.result : "" }));
      setPhotoError("");
    };
    reader.onerror = () => setPhotoError("Nao foi possivel ler a foto selecionada.");
    reader.readAsDataURL(file);
  }

  if (isEditing && presidentsQuery.isLoading) {
    return <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-500 shadow-sm">Carregando mandato...</div>;
  }

  if (isEditing && !editingTerm) {
    return (
      <section className="min-w-0 space-y-4">
        <article className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700 shadow-sm">
          Mandato não encontrado.
        </article>
        <Link className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 hover:bg-slate-50" to="/diretoria">
          Voltar para Diretoria
        </Link>
      </section>
    );
  }

  return (
    <SectionShell
      eyebrow="Pessoas"
      title={isEditing ? "Editar mandato" : "Novo mandato"}
      description="Registre presidentes, períodos, fotos, observações e conquistas em uma página separada do acervo."
      icon={<Landmark size={16} />}
      action={<Link className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 hover:bg-slate-50" to="/diretoria">Voltar</Link>}
    >
      <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <form className="grid gap-4 lg:grid-cols-2" onSubmit={handleSubmit}>
          <div className="space-y-3">
            <h2 className="text-lg font-black text-slate-950">{isEditing ? "Dados do mandato" : "Cadastrar mandato"}</h2>
            <input className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-900 placeholder:text-slate-400" placeholder="Nome do presidente" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} required />
            <div className="grid grid-cols-2 gap-2">
              <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold" placeholder="Início" type="number" min={1900} max={2200} value={form.startedYear} onChange={(event) => setForm((prev) => ({ ...prev, startedYear: event.target.value }))} required />
              <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold" placeholder="Fim" type="number" min={1900} max={2200} value={form.endedYear} onChange={(event) => setForm((prev) => ({ ...prev, endedYear: event.target.value }))} />
            </div>
            <input className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-900 placeholder:text-slate-400" placeholder="URL da foto ou imagem enviada" value={form.photoUrl} onChange={(event) => setForm((prev) => ({ ...prev, photoUrl: event.target.value }))} />
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
              {form.photoUrl ? <img src={form.photoUrl} alt={form.name || "Foto do presidente"} className="h-48 w-full object-cover" /> : <div className="grid h-48 place-items-center text-sm font-black text-slate-400">Sem foto</div>}
            </div>
            <label className="block rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm font-black text-slate-700">
              Enviar foto do presidente
              <input className="mt-2 block w-full text-sm font-semibold text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-red-600 file:px-3 file:py-2 file:text-sm file:font-black file:text-white" type="file" accept="image/*" onChange={handlePhotoFile} />
            </label>
            {photoError ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700">{photoError}</p> : null}
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-black text-slate-950">Acervo</h2>
            <textarea className="min-h-24 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold" placeholder="Observações" value={form.note} onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))} />
            <textarea className="min-h-24 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold" placeholder="Conquistas da gestão" value={form.achievements} onChange={(event) => setForm((prev) => ({ ...prev, achievements: event.target.value }))} />
          </div>

          <div className="flex flex-col gap-2 border-t border-slate-200 pt-4 sm:flex-row lg:col-span-2">
            <button className="min-h-10 rounded-lg bg-[#08255b] px-4 text-sm font-black text-white disabled:opacity-60" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Salvando..." : isEditing ? "Salvar edição" : "Salvar mandato"}
            </button>
            <Link className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 hover:bg-slate-50" to="/diretoria">
              Cancelar
            </Link>
          </div>
        </form>
      </article>
    </SectionShell>
  );
}

export function ComissaoTecnicaPage() {
  const queryClient = useQueryClient();
  const teamsQuery = useQuery({ queryKey: ["teams", "technical-staff-page"], queryFn: () => apiRequest<Team[]>("/teams") });
  const associatesQuery = useQuery({ queryKey: ["associates", "technical-staff-page"], queryFn: () => apiRequest<Associate[]>("/associates") });
  const teams = teamsQuery.data ?? [];
  const associates = associatesQuery.data ?? [];
  const activeAssociates = associates.filter((associate) => associate.status !== "INACTIVE");
  const [staffForm, setStaffForm] = useState({
    teamId: "",
    role: "COACH" as "COACH" | "ASSISTANT",
    source: "ASSOCIATE" as "ASSOCIATE" | "EXTERNAL",
    associateId: "",
    externalName: ""
  });
  const teamsWithCoach = teams.filter((team) => team.coachName);
  const teamsWithAssistant = teams.filter((team) => team.assistantName);
  const staffRows = teams.flatMap((team) => [
    ...(team.coachName ? [{ id: `${team.id}-coach`, name: team.coachName, role: "Técnico", source: team.coachAssociateId ? "Associado" : "Externo", team }] : []),
    ...(team.assistantName ? [{ id: `${team.id}-assistant`, name: team.assistantName, role: "Auxiliar", source: team.assistantAssociateId ? "Associado" : "Externo", team }] : [])
  ]);
  const selectedStaffAssociate = activeAssociates.find((associate) => associate.id === staffForm.associateId) ?? null;

  const saveStaffMutation = useMutation({
    mutationFn: () => {
      if (!staffForm.teamId) {
        throw new Error("Selecione a equipe.");
      }
      const staffName = staffForm.source === "ASSOCIATE" ? selectedStaffAssociate?.name : staffForm.externalName.trim();
      if (!staffName) {
        throw new Error(staffForm.source === "ASSOCIATE" ? "Selecione um associado." : "Informe o nome da pessoa externa.");
      }
      const isCoach = staffForm.role === "COACH";
      return apiRequest<Team>(`/teams/${staffForm.teamId}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...(isCoach
            ? {
                coachName: staffName,
                coachAssociateId: staffForm.source === "ASSOCIATE" ? staffForm.associateId : ""
              }
            : {
                assistantName: staffName,
                assistantAssociateId: staffForm.source === "ASSOCIATE" ? staffForm.associateId : ""
              })
        })
      });
    },
    onSuccess: () => {
      setStaffForm((prev) => ({ ...prev, associateId: "", externalName: "" }));
      void queryClient.invalidateQueries({ queryKey: ["teams"] });
      void queryClient.invalidateQueries({ queryKey: ["teams", "technical-staff-page"] });
    }
  });

  return (
    <SectionShell
      eyebrow="Pessoas"
      title="Comissão Técnica"
      description="Treinadores e auxiliares vinculados às equipes cadastradas, separados dos atletas e associados."
      icon={<ClipboardList size={16} />}
      action={<PrimaryAreaButton to="/clubes?view=equipes"><Users size={16} />Gerenciar equipes</PrimaryAreaButton>}
    >
      <MetricGrid
        metrics={[
          { label: "Membros", value: String(staffRows.length), hint: "Técnicos e auxiliares" },
          { label: "Com técnico", value: String(teamsWithCoach.length), hint: "Equipes com treinador" },
          { label: "Com auxiliar", value: String(teamsWithAssistant.length), hint: "Equipes com auxiliar" },
          { label: "Equipes", value: String(teams.length), hint: "Categorias cadastradas" }
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-950">Comissão por equipe</h2>
              <p className="text-sm font-semibold text-slate-500">Lista gerada a partir do cadastro de equipes.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-2 md:hidden">
            {staffRows.map((row) => (
              <div key={`staff-card-${row.id}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-950">{row.name}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{row.team.name} · {row.team.category}</p>
                  </div>
                  <span className="shrink-0 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-black text-slate-700">{row.role}</span>
                </div>
                <p className="mt-2 text-xs font-semibold text-slate-500">{row.team.club?.name ?? "Sem clube vinculado"}</p>
              </div>
            ))}
            {!teamsQuery.isLoading && staffRows.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
                <p className="text-sm font-black text-slate-950">Nenhuma comissão cadastrada</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">Vincule técnico ou auxiliar a uma equipe para preencher esta lista.</p>
                <Link className="mt-3 inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 hover:bg-slate-100" to="/clubes?view=equipes">
                  Gerenciar equipes
                </Link>
              </div>
            ) : null}
          </div>
          <div className="mt-4 hidden overflow-x-auto rounded-lg border border-slate-200 md:block">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.08em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Função</th>
                  <th className="px-4 py-3">Equipe</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3">Clube</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staffRows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 font-black text-slate-950">{row.name}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-black text-slate-700">{row.role}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{row.team.name}</td>
                    <td className="px-4 py-3 font-semibold text-slate-500">{row.team.category}</td>
                    <td className="px-4 py-3 font-semibold text-slate-500">{row.team.club?.name ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!teamsQuery.isLoading && staffRows.length === 0 ? (
              <div className="p-4">
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5">
                  <p className="text-sm font-black text-slate-950">Nenhuma comissão cadastrada</p>
                  <p className="mt-1 text-sm font-semibold text-slate-500">Vincule técnico ou auxiliar a uma equipe para preencher esta lista.</p>
                  <Link className="mt-4 inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 hover:bg-slate-100" to="/clubes?view=equipes">
                    Gerenciar equipes
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        </article>
        <div className="space-y-4">
          <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-black text-slate-950">Vincular comissão</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">Escolha associado da base ou pessoa externa.</p>
            <form className="mt-4 space-y-3" onSubmit={(event) => { event.preventDefault(); void saveStaffMutation.mutateAsync(); }}>
            <label className="block text-sm font-semibold text-slate-600">
              Equipe
              <select className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" value={staffForm.teamId} onChange={(event) => setStaffForm((prev) => ({ ...prev, teamId: event.target.value }))} required>
                <option value="">Selecionar equipe</option>
                {teams.map((team) => <option key={team.id} value={team.id}>{team.name} - {team.club?.name ?? "Sem clube"}</option>)}
              </select>
            </label>
            <label className="block text-sm font-semibold text-slate-600">
              Função
              <select className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" value={staffForm.role} onChange={(event) => setStaffForm((prev) => ({ ...prev, role: event.target.value as "COACH" | "ASSISTANT" }))}>
                <option value="COACH">Técnico</option>
                <option value="ASSISTANT">Auxiliar</option>
              </select>
            </label>
            <label className="block text-sm font-semibold text-slate-600">
              Origem
              <select className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" value={staffForm.source} onChange={(event) => setStaffForm((prev) => ({ ...prev, source: event.target.value as "ASSOCIATE" | "EXTERNAL", associateId: "", externalName: "" }))}>
                <option value="ASSOCIATE">Associado</option>
                <option value="EXTERNAL">Pessoa externa</option>
              </select>
            </label>
            {staffForm.source === "ASSOCIATE" ? (
              <label className="block text-sm font-semibold text-slate-600">
                Associado
                <select className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" value={staffForm.associateId} onChange={(event) => setStaffForm((prev) => ({ ...prev, associateId: event.target.value }))} required>
                  <option value="">Selecionar associado</option>
                  {activeAssociates.map((associate) => <option key={associate.id} value={associate.id}>{associate.name}</option>)}
                </select>
              </label>
            ) : (
              <label className="block text-sm font-semibold text-slate-600">
                Pessoa externa
                <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" value={staffForm.externalName} onChange={(event) => setStaffForm((prev) => ({ ...prev, externalName: event.target.value }))} placeholder="Nome completo" required />
              </label>
            )}
            {saveStaffMutation.isError ? (
              <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                {saveStaffMutation.error instanceof Error ? saveStaffMutation.error.message : "Não foi possível salvar a comissão."}
              </p>
            ) : null}
            <button
              className="w-full rounded-lg bg-red-600 px-4 py-2.5 text-sm font-black text-white shadow-sm shadow-red-600/20 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={saveStaffMutation.isPending || !staffForm.teamId || (staffForm.source === "ASSOCIATE" ? !staffForm.associateId : !staffForm.externalName.trim())}
            >
              {saveStaffMutation.isPending ? "Salvando..." : "Salvar na equipe"}
            </button>
          </form>
          </article>

          <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-black text-slate-950">Pendências</h2>
            <div className="mt-3 space-y-2">
              {teams.filter((team) => !team.coachName || !team.assistantName).slice(0, 8).map((team) => (
                <div key={team.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="font-black text-slate-950">{team.name}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {!team.coachName && !team.assistantName ? "Sem técnico e auxiliar" : !team.coachName ? "Sem técnico" : "Sem auxiliar"}
                  </p>
                </div>
              ))}
              {!teamsQuery.isLoading && teams.length === 0 ? (
                <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-600">Cadastre equipes antes de montar a comissão técnica.</p>
              ) : null}
              {!teamsQuery.isLoading && teams.length > 0 && teams.every((team) => team.coachName && team.assistantName) ? (
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">Todas as equipes possuem técnico e auxiliar.</p>
              ) : null}
            </div>
          </article>
        </div>
      </div>
    </SectionShell>
  );
}

export function CamposPage() {
  const { year } = useOutletContext<OutletPeriod>();
  const queryClient = useQueryClient();
  const fieldsQuery = useQuery({
    queryKey: ["sports-fields"],
    queryFn: () => apiRequest<Field[]>("/sports/fields")
  });
  const gamesQuery = useQuery({
    queryKey: ["sports-games", "fields-page", year],
    queryFn: () => apiRequest<Game[]>(`/sports/games?year=${year}`)
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    surface: "",
    capacity: "",
    defaultCostBRL: "",
    status: "ACTIVE" as FieldStatus,
    notes: ""
  });
  const fieldStatusLabels: Record<FieldStatus, string> = {
    ACTIVE: "Ativo",
    INACTIVE: "Inativo",
    MAINTENANCE: "Manutenção"
  };
  const fieldRows = useMemo(() => {
    const games = gamesQuery.data ?? [];
    const fields = fieldsQuery.data ?? [];
    const map = new Map<string, { id: string | null; location: string; games: number; finished: number; costCents: number; nextDate: string | null }>();
    for (const field of fields) {
      map.set(field.id, { id: field.id, location: field.name, games: 0, finished: 0, costCents: 0, nextDate: null });
    }
    for (const game of games) {
      const legacyLocation = game.location.trim() || "Sem local";
      const key = game.fieldId ?? legacyLocation;
      const row = map.get(key) ?? { id: game.fieldId, location: game.field?.name ?? legacyLocation, games: 0, finished: 0, costCents: 0, nextDate: null };
      row.games += 1;
      if (game.status === "FINISHED") row.finished += 1;
      row.costCents += game.gameValueCents ?? 0;
      if (new Date(game.date).getTime() >= Date.now() && (!row.nextDate || new Date(game.date) < new Date(row.nextDate))) {
        row.nextDate = game.date;
      }
      map.set(key, row);
    }
    return Array.from(map.values()).sort((a, b) => b.games - a.games || a.location.localeCompare(b.location));
  }, [fieldsQuery.data, gamesQuery.data]);
  const fields = fieldsQuery.data ?? [];
  const games = gamesQuery.data ?? [];
  const totalCost = fieldRows.reduce((total, row) => total + row.costCents, 0);
  const saveFieldMutation = useMutation({
    mutationFn: () =>
      apiRequest<Field>(editingId ? `/sports/fields/${editingId}` : "/sports/fields", {
        method: editingId ? "PATCH" : "POST",
        body: JSON.stringify({
          name: form.name,
          address: form.address,
          city: form.city,
          state: form.state,
          surface: form.surface,
          capacity: form.capacity ? Number(form.capacity) : null,
          defaultCostCents: Math.round(Number(form.defaultCostBRL.replace(",", ".") || 0) * 100),
          status: form.status,
          notes: form.notes
        })
      }),
    onSuccess: () => {
      setEditingId(null);
      setForm({ name: "", address: "", city: "", state: "", surface: "", capacity: "", defaultCostBRL: "", status: "ACTIVE", notes: "" });
      void queryClient.invalidateQueries({ queryKey: ["sports-fields"] });
    }
  });
  const deleteFieldMutation = useMutation({
    mutationFn: (id: string) => apiRequest<void>(`/sports/fields/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["sports-fields"] });
      void queryClient.invalidateQueries({ queryKey: ["sports-games"] });
    }
  });

  function editField(field: Field) {
    setEditingId(field.id);
    setForm({
      name: field.name,
      address: field.address ?? "",
      city: field.city ?? "",
      state: field.state ?? "",
      surface: field.surface ?? "",
      capacity: field.capacity ? String(field.capacity) : "",
      defaultCostBRL: (field.defaultCostCents / 100).toFixed(2).replace(".", ","),
      status: field.status,
      notes: field.notes ?? ""
    });
  }

  return (
    <SectionShell
      eyebrow="Agenda e Jogos"
      title="Campos"
      description="Cadastro único dos locais de jogo. Campo não pertence a uma equipe; ele é selecionado depois no lançamento do jogo."
      icon={<CalendarDays size={16} />}
      action={<PrimaryAreaButton to="/jogos?view=OPERACAO&subView=CADASTRO"><Plus size={16} />Cadastrar jogo</PrimaryAreaButton>}
    >
      <MetricGrid
        metrics={[
          { label: "Campos cadastrados", value: String(fields.length), hint: `${fields.filter((field) => field.status === "ACTIVE").length} ativos` },
          { label: "Jogos com local", value: String(games.filter((game) => game.location).length), hint: "Partidas cadastradas" },
          { label: "Custo total", value: formatCurrency(totalCost), hint: "Somado dos jogos" }
        ]}
      />
      <div className="grid gap-4 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <form className="space-y-3" onSubmit={(event: FormEvent) => { event.preventDefault(); saveFieldMutation.mutate(); }}>
            <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold" placeholder="Nome do campo" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
            <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold" placeholder="Endereço" value={form.address} onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))} />
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold" placeholder="Cidade" value={form.city} onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))} />
              <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold" placeholder="UF" value={form.state} onChange={(event) => setForm((prev) => ({ ...prev, state: event.target.value }))} />
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold" placeholder="Piso" value={form.surface} onChange={(event) => setForm((prev) => ({ ...prev, surface: event.target.value }))} />
              <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold" placeholder="Capacidade" value={form.capacity} onChange={(event) => setForm((prev) => ({ ...prev, capacity: event.target.value }))} />
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold" placeholder="Custo padrão R$" value={form.defaultCostBRL} onChange={(event) => setForm((prev) => ({ ...prev, defaultCostBRL: event.target.value }))} />
              <select className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold" value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as FieldStatus }))}>
                {Object.entries(fieldStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <textarea className="min-h-20 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold" placeholder="Observações" value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} />
            <div className="flex flex-col gap-2 sm:flex-row">
              <button className="min-h-10 flex-1 rounded-lg bg-[#08255b] px-4 text-sm font-black text-white disabled:opacity-60" disabled={saveFieldMutation.isPending}>
                {saveFieldMutation.isPending ? "Salvando..." : editingId ? "Salvar campo" : "Cadastrar campo"}
              </button>
              {editingId ? (
                <button type="button" className="min-h-10 rounded-lg border border-slate-200 px-4 text-sm font-black text-slate-700" onClick={() => setEditingId(null)}>
                  Cancelar
                </button>
              ) : null}
            </div>
          </form>
        </article>

        <article className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-2">
            {fields.map((field) => {
              const row = fieldRows.find((item) => item.id === field.id || item.location === field.name);
              return (
                <article key={field.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-black text-slate-950">{field.name}</h3>
                      <p className="mt-1 text-xs font-semibold text-slate-500">{field.city ? `${field.city}${field.state ? `/${field.state}` : ""}` : field.address ?? "Localização não informada"}</p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-black ${field.status === "ACTIVE" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : field.status === "MAINTENANCE" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-slate-200 bg-white text-slate-500"}`}>
                      {fieldStatusLabels[field.status]}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-semibold text-slate-600 sm:grid-cols-4">
                    <span><strong className="block text-sm text-slate-950">{row?.games ?? 0}</strong> jogos</span>
                    <span><strong className="block text-sm text-slate-950">{row?.finished ?? 0}</strong> finalizados</span>
                    <span><strong className="block text-sm text-slate-950">{field.capacity ?? "-"}</strong> capacidade</span>
                    <span><strong className="block text-sm text-slate-950">{formatCurrency(field.defaultCostCents)}</strong> custo</span>
                  </div>
                  <p className="mt-3 text-xs font-semibold text-slate-500">{field.surface ?? "Piso não informado"} {row?.nextDate ? `- próximo uso ${new Date(row.nextDate).toLocaleDateString("pt-BR")}` : ""}</p>
                  <div className="mt-3 flex justify-end gap-2">
                    <ActionIconButton label={`Editar campo ${field.name}`} onClick={() => editField(field)}><Pencil size={14} /></ActionIconButton>
                    <ActionIconButton label={`Remover campo ${field.name}`} tone="danger" disabled={deleteFieldMutation.isPending || (row?.games ?? 0) > 0} onClick={() => deleteFieldMutation.mutate(field.id)}><Trash2 size={14} /></ActionIconButton>
                  </div>
                </article>
              );
            })}
            {!fieldsQuery.isLoading && fields.length === 0 ? <EmptyState>Nenhum campo cadastrado ainda.</EmptyState> : null}
          </div>
          {fieldRows.some((row) => !row.id) ? (
            <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.08em] text-slate-500">
                  <tr><th className="px-4 py-3">Local legado</th><th className="px-4 py-3">Jogos</th><th className="px-4 py-3">Custo acumulado</th><th className="px-4 py-3">Próximo uso</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fieldRows.filter((row) => !row.id).map((row) => (
                    <tr key={row.location}>
                      <td className="px-4 py-3 font-black text-slate-950">{row.location}</td>
                      <td className="px-4 py-3 font-semibold text-slate-700">{row.games}</td>
                      <td className="px-4 py-3 font-semibold text-slate-700">{formatCurrency(row.costCents)}</td>
                      <td className="px-4 py-3 font-semibold text-slate-500">{row.nextDate ? new Date(row.nextDate).toLocaleDateString("pt-BR") : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </article>
      </div>
    </SectionShell>
  );
}

export function AdversariosPage() {
  const clubsQuery = useQuery({ queryKey: ["clubs", "opponents-page"], queryFn: () => apiRequest<Club[]>("/clubs") });
  const { year } = useOutletContext<OutletPeriod>();
  const gamesQuery = useQuery({ queryKey: ["sports-games", "opponents-page", year], queryFn: () => apiRequest<Game[]>(`/sports/games?year=${year}`) });
  const [search, setSearch] = useState("");
  const clubs = clubsQuery.data ?? [];
  const opponents = clubs.filter((club) => club.type === "EXTERNAL" || club.type === "PARTNER" || club.type === "GUEST");
  const filteredOpponents = opponents.filter((club) => {
    const term = search.trim().toLowerCase();
    return !term || [club.name, club.city, club.state, club.responsibleName].some((value) => (value ?? "").toLowerCase().includes(term));
  });
  const gamesByOpponent = useMemo(() => {
    const games = gamesQuery.data ?? [];
    const map = new Map<string, number>();
    for (const game of games) {
      if (game.homeClubId) map.set(game.homeClubId, (map.get(game.homeClubId) ?? 0) + 1);
      if (game.awayClubId) map.set(game.awayClubId, (map.get(game.awayClubId) ?? 0) + 1);
    }
    return map;
  }, [gamesQuery.data]);
  const activeOpponents = opponents.filter((club) => club.status === "ACTIVE");

  return (
    <SectionShell
      eyebrow="Agenda e Jogos"
      title="Adversários"
      description="Clubes externos, parceiros e convidados usados em jogos oficiais, amistosos e confrontos."
      icon={<Shield size={16} />}
      action={<PrimaryAreaButton to="/clubes?edit=new"><Plus size={16} />Novo adversário</PrimaryAreaButton>}
    >
      <MetricGrid
        metrics={[
          { label: "Adversários", value: String(opponents.length), hint: "Externos, parceiros e convidados" },
          { label: "Ativos", value: String(activeOpponents.length), hint: "Disponíveis para agenda" },
          { label: "Jogos vinculados", value: String(Array.from(gamesByOpponent.values()).reduce((sum, count) => sum + count, 0)), hint: `Ano ${year}` }
        ]}
      />
      <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-950">Base de adversários</h2>
            <p className="text-sm font-semibold text-slate-500">Clubes externos usados na agenda e no histórico de confrontos.</p>
          </div>
          <label className="relative block w-full min-w-0 sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} aria-hidden="true" />
            <input
              className="h-10 w-full rounded-lg border border-slate-200 px-3 pl-9 text-sm font-semibold"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar adversário"
            />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredOpponents.map((club) => (
            <article key={club.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start gap-3">
                <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                  {club.logoUrl ? <img src={club.logoUrl} alt={club.name} className="h-full w-full object-contain" /> : <Shield size={20} className="text-slate-400" />}
                </span>
                <div className="min-w-0">
                  <h3 className="truncate font-black text-slate-950">{club.name}</h3>
                  <p className="text-xs font-semibold text-slate-500">{club.city ? `${club.city}${club.state ? `/${club.state}` : ""}` : "Local não informado"}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-black text-slate-700">{club.type}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-black ${club.status === "ACTIVE" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-500"}`}>{club.status === "ACTIVE" ? "Ativo" : "Inativo"}</span>
                    <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-black text-slate-700">{gamesByOpponent.get(club.id) ?? 0} jogo(s)</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 text-xs font-semibold text-slate-500">
                <p>{club.responsibleName ?? "Responsável não informado"}</p>
                <p>{club.responsiblePhone ?? club.responsibleEmail ?? "Contato não informado"}</p>
              </div>
            </article>
          ))}
          {!clubsQuery.isLoading && filteredOpponents.length === 0 ? <EmptyState>Nenhum adversário cadastrado.</EmptyState> : null}
        </div>
      </article>
    </SectionShell>
  );
}


type AgendaKind = "ALL" | "GAME" | "TRAINING" | "EVENT" | "MEETING" | "CHAMPIONSHIP" | "TRAVEL" | "RESERVATION" | "DISCIPLINE";

const agendaKindConfig: Record<Exclude<AgendaKind, "ALL">, { label: string; listLabel: string; color: string; bg: string; border: string; text: string }> = {
  GAME: { label: "Jogos", listLabel: "Jogo", color: "#ef3340", bg: "bg-red-50", border: "border-red-200", text: "text-red-700" },
  TRAINING: { label: "Treinos", listLabel: "Treino", color: "#1d72e8", bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700" },
  EVENT: { label: "Eventos", listLabel: "Evento", color: "#159957", bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700" },
  MEETING: { label: "Reuniões", listLabel: "Reunião", color: "#f4b400", bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700" },
  CHAMPIONSHIP: { label: "Campeonatos", listLabel: "Campeonato", color: "#7c3aed", bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-700" },
  TRAVEL: { label: "Viagens", listLabel: "Viagem", color: "#f97316", bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700" },
  RESERVATION: { label: "Reservas", listLabel: "Reserva", color: "#94a3b8", bg: "bg-slate-100", border: "border-slate-200", text: "text-slate-700" },
  DISCIPLINE: { label: "Disciplina", listLabel: "Disciplina", color: "#0f172a", bg: "bg-slate-100", border: "border-slate-300", text: "text-slate-800" }
};

function classifyAgendaEvent(event: ClubEvent): AgendaKind {
  const text = `${event.title} ${event.description ?? ""} ${event.location ?? ""}`.toLowerCase();
  if (text.includes("treino")) return "TRAINING";
  if (text.includes("viagem") || text.includes("excurs")) return "TRAVEL";
  if (text.includes("reserva de campo")) return "RESERVATION";
  if (text.includes("disciplina") || text.includes("suspens")) return "DISCIPLINE";
  if (text.includes("campeonato") || text.includes("copa") || text.includes("torneio")) return "CHAMPIONSHIP";
  if (event.type === "MEETING") return "MEETING";
  if (event.type === "SPORT") return "TRAINING";
  return "EVENT";
}

function classifyAgendaGame(game: Game): AgendaKind {
  const text = `${game.championship ?? ""} ${game.round ?? ""} ${game.note ?? ""}`.toLowerCase();
  if (text.includes("treino")) return "TRAINING";
  if (game.championship || text.includes("campeonato") || text.includes("copa") || text.includes("torneio")) return "CHAMPIONSHIP";
  return "GAME";
}

export function AgendaPage() {
  const { month, year } = useOutletContext<OutletPeriod>();
  const eventsQuery = useQuery({ queryKey: ["club-events", "agenda", month, year], queryFn: () => apiRequest<ClubEvent[]>(`/events?month=${month}&year=${year}`) });
  const gamesQuery = useQuery({ queryKey: ["sports-games", "agenda", month, year], queryFn: () => apiRequest<Game[]>(`/sports/games?month=${month}&year=${year}`) });
  const [kindFilter, setKindFilter] = useState<AgendaKind>("ALL");
  const [calendarView, setCalendarView] = useState<"MONTH" | "WEEK" | "DAY">("MONTH");
  const [selectedDate, setSelectedDate] = useState(toDateKey(new Date(year, month - 1, new Date().getDate())));

  useEffect(() => {
    setSelectedDate((current) => {
      const currentDate = new Date(`${current}T12:00:00`);
      return currentDate.getMonth() === month - 1 && currentDate.getFullYear() === year ? current : toDateKey(new Date(year, month - 1, 1));
    });
  }, [month, year]);

  const agendaItems = useMemo(() => {
    const eventItems = (eventsQuery.data ?? []).map((event) => {
      const kind = classifyAgendaEvent(event);
      return { id: event.id, kind, source: "EVENT" as const, title: event.title, startsAt: event.startsAt, location: event.location ?? "Sede", responsible: event.type === "MEETING" ? "Diretoria" : event.type === "SPORT" ? "Comissão Técnica" : "Administração", href: `/eventos/${event.id}/editar` };
    });
    const gameItems = (gamesQuery.data ?? []).map((game) => {
      const kind = classifyAgendaGame(game);
      const homeName = game.redTeamName ?? game.homeClub?.shortName ?? game.homeClub?.name ?? "GestaSports FC";
      const awayName = game.whiteTeamName ?? game.awayClub?.shortName ?? game.awayClub?.name ?? "Adversário";
      return { id: game.id, kind, source: "GAME" as const, title: `${homeName} x ${awayName}`, startsAt: game.date, location: game.field?.name ?? game.location, responsible: "Diretoria de Futebol", href: `/jogos?view=OPERACAO&subView=AGENDA&gameId=${game.id}` };
    });
    return [...eventItems, ...gameItems].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  }, [eventsQuery.data, gamesQuery.data]);

  const filteredItems = kindFilter === "ALL" ? agendaItems : agendaItems.filter((item) => item.kind === kindFilter);
  const itemsByDay = useMemo(() => {
    const map = new Map<string, typeof agendaItems>();
    for (const item of filteredItems) {
      const key = toDateKey(item.startsAt);
      map.set(key, [...(map.get(key) ?? []), item]);
    }
    return map;
  }, [filteredItems]);
  const calendarCells = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1);
    const start = new Date(firstDay);
    start.setDate(firstDay.getDate() - firstDay.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const key = toDateKey(date);
      return { key, day: date.getDate(), inMonth: date.getMonth() === month - 1, items: itemsByDay.get(key) ?? [] };
    });
  }, [itemsByDay, month, year]);
  const upcomingItems = agendaItems.filter((item) => new Date(item.startsAt).getTime() >= Date.now()).slice(0, 3);
  const counts = agendaItems.reduce<Record<Exclude<AgendaKind, "ALL">, number>>((acc, item) => {
    acc[item.kind] += 1;
    return acc;
  }, { GAME: 0, TRAINING: 0, EVENT: 0, MEETING: 0, CHAMPIONSHIP: 0, TRAVEL: 0, RESERVATION: 0, DISCIPLINE: 0 });
  const selectedDateItems = filteredItems.filter((item) => toDateKey(item.startsAt) === selectedDate);
  const monthLabel = `${monthNames[month - 1]} ${year}`;
  const loading = eventsQuery.isLoading || gamesQuery.isLoading;

  return (
    <section className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm" title="Filtros" aria-label="Filtros"><Filter size={16} /></button>
        {[{ key: "ALL" as const, label: "Todos" }, ...Object.entries(agendaKindConfig).map(([key, value]) => ({ key: key as Exclude<AgendaKind, "ALL">, label: value.label }))].map((option) => {
          const config = option.key === "ALL" ? null : agendaKindConfig[option.key];
          const active = kindFilter === option.key;
          return <button key={option.key} type="button" className={`inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-black shadow-sm ${active ? "border-red-300 bg-red-50 text-red-700" : config ? `${config.border} ${config.bg} ${config.text}` : "border-slate-200 bg-white text-slate-700"}`} onClick={() => setKindFilter(option.key)}><span className="size-2.5 rounded-full" style={{ backgroundColor: config?.color ?? "#ef3340" }} />{option.label}</button>;
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="space-y-4">
          <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <div className="flex items-center gap-3"><h2 className="text-xl font-black text-slate-950">Calendário</h2><div className="flex gap-1"><button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600">‹</button><button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600">›</button><button type="button" className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700" onClick={() => setSelectedDate(toDateKey(new Date()))}>Hoje</button></div></div>
              <h3 className="text-lg font-black text-slate-950">{monthLabel}</h3>
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">{[{ key: "MONTH" as const, label: "Mês" }, { key: "WEEK" as const, label: "Semana" }, { key: "DAY" as const, label: "Dia" }].map((option) => <button key={option.key} type="button" className={`h-8 rounded-md px-3 text-xs font-black ${calendarView === option.key ? "bg-white text-red-600 shadow-sm ring-1 ring-red-200" : "text-slate-600"}`} onClick={() => setCalendarView(option.key)}>{option.label}</button>)}</div>
            </div>
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-[11px] font-black uppercase text-slate-500">{["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => <div key={day} className="border-r border-slate-200 py-3 last:border-r-0">{day}</div>)}</div>
            <div className="grid grid-cols-7">{calendarCells.map((cell) => <button key={cell.key} type="button" className={`min-h-24 border-b border-r border-slate-200 p-2 text-left last:border-r-0 hover:bg-slate-50 ${cell.inMonth ? "bg-white text-slate-950" : "bg-slate-50/60 text-slate-400"} ${selectedDate === cell.key ? "ring-2 ring-inset ring-red-200" : ""}`} onClick={() => setSelectedDate(cell.key)}><span className="text-sm font-black">{cell.day}</span><span className="mt-2 block space-y-1">{cell.items.slice(0, 3).map((item) => { const config = agendaKindConfig[item.kind]; const date = new Date(item.startsAt); return <span key={`${item.source}-${item.id}`} className={`block truncate rounded-md border px-1.5 py-1 text-[11px] font-black ${config.bg} ${config.border} ${config.text}`}><span className="mr-1 inline-block size-2 rounded-full" style={{ backgroundColor: config.color }} />{date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} {item.title}</span>; })}</span></button>)}</div>
          </article>

          <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-3"><h2 className="text-lg font-black text-slate-950">Lista de eventos</h2></div>
            <div className="overflow-x-auto"><table className="w-full min-w-[980px] table-fixed text-left text-sm"><colgroup><col className="w-32" /><col className="w-20" /><col className="w-28" /><col className="w-[22%]" /><col className="w-[24%]" /><col className="w-[18%]" /><col className="w-24" /></colgroup><thead className="bg-slate-50 text-xs font-black uppercase text-slate-500"><tr><th className="px-4 py-3">Data</th><th className="px-4 py-3">Hora</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Título</th><th className="px-4 py-3">Local</th><th className="px-4 py-3">Responsável</th><th className="px-4 py-3 text-right">Ações</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredItems.map((item) => { const config = agendaKindConfig[item.kind]; const date = new Date(item.startsAt); return <tr key={`agenda-row-${item.source}-${item.id}`}><td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-700">{date.toLocaleDateString("pt-BR")}</td><td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-700">{date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</td><td className="px-4 py-3"><span className={`inline-flex min-w-20 justify-center whitespace-nowrap rounded-md border px-2 py-1 text-xs font-black ${config.bg} ${config.border} ${config.text}`}>{config.listLabel}</span></td><td className="px-4 py-3 font-semibold text-slate-900"><span className="line-clamp-2 break-words">{item.title}</span></td><td className="px-4 py-3 text-slate-700"><span className="line-clamp-2 break-words">{item.location}</span></td><td className="px-4 py-3 text-slate-700"><span className="line-clamp-2 break-words">{item.responsible}</span></td><td className="px-4 py-3"><div className="flex justify-end gap-1.5"><Link className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" to={item.href} title="Visualizar" aria-label="Visualizar"><Eye size={15} /></Link><Link className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" to={item.href} title="Mais opções" aria-label="Mais opções"><MoreHorizontal size={15} /></Link></div></td></tr>; })}</tbody></table>{!loading && filteredItems.length === 0 ? <p className="p-4 text-sm font-semibold text-slate-500">Nenhum item encontrado para este filtro.</p> : null}</div>
            <div className="border-t border-slate-200 px-4 py-3 text-center"><Link className="text-sm font-black text-slate-700 hover:text-red-600" to="/eventos">Ver todos os eventos →</Link></div>
          </article>
        </div>

        <aside className="space-y-4">
          <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><h2 className="font-black text-slate-950">Legenda de cores</h2><div className="mt-4 space-y-3">{Object.entries(agendaKindConfig).map(([key, config]) => <div key={`legend-${key}`} className="flex items-center gap-3 text-sm font-semibold text-slate-700"><span className="size-3 rounded" style={{ backgroundColor: config.color }} />{config.label === "Eventos" ? "Eventos Sociais" : config.label === "Reservas" ? "Reservas de Campo" : config.label === "Disciplina" ? "Suspensão / Disciplina" : config.label}</div>)}</div></article>
          <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><h2 className="font-black text-slate-950">Próximos eventos</h2><div className="mt-4 divide-y divide-slate-100">{upcomingItems.map((item) => { const config = agendaKindConfig[item.kind]; const date = new Date(item.startsAt); return <Link key={`upcoming-${item.source}-${item.id}`} to={item.href} className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-3 py-3"><span className="mt-1 size-3 rounded-full" style={{ backgroundColor: config.color }} /><span className="min-w-0"><span className="block truncate font-black text-slate-950">{item.title}</span><span className="block text-sm font-semibold text-slate-500">{config.listLabel}</span></span><span className="text-right text-sm font-semibold text-slate-600">{date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}<span className="block">{date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span></span></Link>; })}{!loading && upcomingItems.length === 0 ? <p className="py-3 text-sm font-semibold text-slate-500">Nenhum próximo evento.</p> : null}</div><Link className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-lg border border-slate-200 text-sm font-black text-slate-700 hover:bg-slate-50" to="/eventos">Ver todos →</Link></article>
          <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><h2 className="font-black text-slate-950">KPI da Agenda</h2><div className="mt-4 space-y-4">{[{ label: "Próximos Jogos", value: counts.GAME + counts.CHAMPIONSHIP, color: "text-red-600" }, { label: "Treinos do Mês", value: counts.TRAINING, color: "text-blue-600" }, { label: "Eventos Sociais", value: counts.EVENT, color: "text-emerald-600" }, { label: "Campos Reservados", value: counts.RESERVATION, color: "text-slate-600" }].map((metric) => <div key={metric.label} className="flex items-center justify-between gap-3"><span className="font-semibold text-slate-700">{metric.label}</span><strong className={`text-xl font-black ${metric.color}`}>{metric.value}</strong></div>)}</div></article>
          {selectedDateItems.length > 0 ? <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><h2 className="font-black text-slate-950">{new Date(`${selectedDate}T12:00:00`).toLocaleDateString("pt-BR")}</h2><div className="mt-3 space-y-2">{selectedDateItems.map((item) => { const config = agendaKindConfig[item.kind]; return <Link key={`selected-date-${item.source}-${item.id}`} to={item.href} className={`block rounded-lg border px-3 py-2 text-sm font-black ${config.bg} ${config.border} ${config.text}`}>{item.title}</Link>; })}</div></article> : null}
        </aside>
      </div>
    </section>
  );
}

export function EventosPage() {
  const { month, year } = useOutletContext<OutletPeriod>();
  const queryClient = useQueryClient();
  const location = useLocation();
  const eventsQuery = useQuery({ queryKey: ["club-events", month, year], queryFn: () => apiRequest<ClubEvent[]>(`/events?month=${month}&year=${year}`) });
  const gamesQuery = useQuery({ queryKey: ["sports-games", "events-page", month, year], queryFn: () => apiRequest<Game[]>(`/sports/games?month=${month}&year=${year}`) });
  const galleryQuery = useQuery({ queryKey: ["gallery-assets", "events-page"], queryFn: () => apiRequest<GalleryAsset[]>("/gallery/assets") });
  const financeQuery = useQuery({ queryKey: ["finance-entries", "events-page", month, year], queryFn: () => apiRequest<FinancialEntry[]>(`/finance/entries?month=${month}&year=${year}`) });
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"CALENDARIO" | "LISTA">(() => new URLSearchParams(location.search).get("view") === "lista" ? "LISTA" : "CALENDARIO");
  const [selectedDate, setSelectedDate] = useState(toDateKey(new Date(year, month - 1, new Date().getDate())));
  const events = useMemo(() => eventsQuery.data ?? [], [eventsQuery.data]);
  const games = useMemo(() => gamesQuery.data ?? [], [gamesQuery.data]);
  const eventAssets = (galleryQuery.data ?? []).filter((asset) => asset.type === "EVENT");
  const eventEntries = (financeQuery.data ?? []).filter((entry) => entry.category === "EVENTS");
  const agendaItems = useMemo(() => {
    const clubItems = events.map((event) => ({
      id: event.id,
      kind: "EVENT" as const,
      title: event.title,
      startsAt: event.startsAt,
      location: event.location ?? "",
      status: eventStatusLabels[event.status],
      detail: event.description ?? "",
      badge: eventTypeLabels[event.type],
      href: `/eventos/${event.id}/editar`,
      event
    }));
    const gameItems = games.map((game) => ({
      id: game.id,
      kind: "GAME" as const,
      title: `${game.redTeamName ?? "Time A"} x ${game.whiteTeamName ?? "Time B"}`,
      startsAt: game.date,
      location: game.location,
      status: game.status === "FINISHED" ? "Finalizado" : game.status === "CANCELED" ? "Cancelado" : game.status === "RUNNING" ? "Em andamento" : "Agendado",
      detail: game.championship ?? game.note ?? "",
      badge: game.type === "INTERNAL" ? "Jogo interno" : "Jogo externo",
      href: `/jogos?view=OPERACAO&subView=AGENDA&gameId=${game.id}`,
      game
    }));
    return [...clubItems, ...gameItems].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  }, [events, games]);
  const filteredAgendaItems = agendaItems.filter((item) => {
    const term = search.trim().toLowerCase();
    return !term || [item.title, item.location, item.detail, item.badge, item.status].some((value) => value.toLowerCase().includes(term));
  });
  const agendaItemsByDay = useMemo(() => {
    const map = new Map<string, typeof agendaItems>();
    for (const item of agendaItems) {
      const key = toDateKey(item.startsAt);
      map.set(key, [...(map.get(key) ?? []), item]);
    }
    return map;
  }, [agendaItems]);
  const selectedDateItems = filteredAgendaItems.filter((item) => toDateKey(item.startsAt) === selectedDate);
  const visibleAgendaItems = viewMode === "CALENDARIO" ? selectedDateItems : filteredAgendaItems;
  const calendarCells = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1);
    const start = new Date(firstDay);
    start.setDate(firstDay.getDate() - firstDay.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const key = toDateKey(date);
      return { key, day: date.getDate(), inMonth: date.getMonth() === month - 1, today: key === toDateKey(new Date()), count: agendaItemsByDay.get(key)?.length ?? 0 };
    });
  }, [agendaItemsByDay, month, year]);
  const eventIncome = eventEntries.filter((entry) => entry.type === "INCOME").reduce((total, entry) => total + entry.amountCents, 0);
  const eventExpense = eventEntries.filter((entry) => entry.type === "EXPENSE").reduce((total, entry) => total + entry.amountCents, 0);
  const openEvents = events.filter((event) => event.status === "OPEN");

  useEffect(() => {
    const nextView = new URLSearchParams(location.search).get("view") === "lista" ? "LISTA" : "CALENDARIO";
    setViewMode((current) => current === nextView ? current : nextView);
  }, [location.search]);

  const deleteEventMutation = useMutation({
    mutationFn: (id: string) => apiRequest<void>(`/events/${id}`, { method: "DELETE" }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["club-events"] })
  });

  return (
    <SectionShell
      eyebrow="Comunidade"
      title="Eventos"
      description="Calendário único para eventos, agenda e jogos, com datas e detalhes de cada registro."
      icon={<CalendarDays size={16} />}
      action={
        <>
          <Link className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 hover:bg-slate-50" to="/eventos/inscricoes">
            <ClipboardList size={16} />
            Inscrições
          </Link>
          <PrimaryAreaButton to="/eventos/novo"><Plus size={16} />Novo evento</PrimaryAreaButton>
        </>
      }
    >
      <MetricGrid
        metrics={[
          { label: "Eventos", value: String(events.length), hint: `${String(month).padStart(2, "0")}/${year}` },
          { label: "Jogos", value: String(games.length), hint: "Na agenda" },
          { label: "Abertos", value: String(openEvents.length), hint: "Com inscrição ou divulgação" },
          { label: "Receitas", value: formatCurrency(eventIncome), hint: `${String(month).padStart(2, "0")}/${year}` },
        ]}
      />
      <div className="grid gap-4">
        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-950">Calendário e agenda</h2>
              <p className="text-sm font-semibold text-slate-500">{agendaItems.length} item(ns) no período, {eventAssets.length} mídia(s), {formatCurrency(eventExpense)} em despesas.</p>
            </div>
            <div className="flex w-full flex-wrap gap-2 sm:w-auto">
              <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
                <button type="button" className={`inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-black ${viewMode === "CALENDARIO" ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"}`} onClick={() => setViewMode("CALENDARIO")}><CalendarDays size={15} />Calendário</button>
                <button type="button" className={`inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-black ${viewMode === "LISTA" ? "bg-slate-50 text-slate-950" : "text-slate-600 hover:bg-slate-50"}`} onClick={() => setViewMode("LISTA")}><ClipboardList size={15} />Lista</button>
              </div>
              <label className="relative block w-full min-w-0 sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} aria-hidden="true" />
                <input
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 pl-9 text-sm font-semibold"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por data, jogo ou evento"
                />
              </label>
            </div>
          </div>
          <div className={viewMode === "CALENDARIO" ? "mt-4 grid gap-4 xl:grid-cols-[minmax(24rem,0.9fr)_minmax(0,1.1fr)]" : "mt-4"}>
            {viewMode === "CALENDARIO" ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black uppercase tracking-[0.06em] text-slate-500">
                  {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => <span key={day}>{day}</span>)}
                </div>
                <div className="mt-2 grid grid-cols-7 gap-1">
                  {calendarCells.map((cell) => (
                    <button key={cell.key} type="button" className={`min-h-16 rounded-lg border p-1.5 text-left transition ${selectedDate === cell.key ? "border-blue-500 bg-blue-50 text-blue-800" : cell.inMonth ? "border-slate-200 bg-white text-slate-800 hover:border-slate-300" : "border-slate-100 bg-white/60 text-slate-300"}`} onClick={() => setSelectedDate(cell.key)}>
                      <span className={`grid size-6 place-items-center rounded-full text-xs font-black ${cell.today ? "bg-red-600 text-white" : ""}`}>{cell.day}</span>
                      {cell.count > 0 ? <span className="mt-2 block rounded-full bg-slate-900 px-1.5 py-0.5 text-center text-[10px] font-black text-white">{cell.count}</span> : null}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="grid gap-3">
            {viewMode === "CALENDARIO" ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black capitalize text-slate-950">{formatLongDate(selectedDate)}</h3>
                  <p className="text-sm font-semibold text-slate-500">{visibleAgendaItems.length} item(ns) nesta data</p>
                </div>
                <button type="button" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50" onClick={() => setViewMode("LISTA")}>Ver lista completa</button>
              </div>
            ) : null}
            {visibleAgendaItems.map((item) => (
              <article key={`${item.kind}-${item.id}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-black text-slate-950">{item.title}</h3>
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-black ${item.kind === "GAME" ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-700"}`}>{item.badge}</span>
                      <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-black text-slate-700">{item.status}</span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-500">{formatDateTime(item.startsAt)} {item.location ? `- ${item.location}` : ""}</p>
                    {item.detail ? <p className="mt-2 text-sm text-slate-600">{item.detail}</p> : null}
                    {item.kind === "EVENT" ? <div className="mt-2 flex flex-wrap gap-2 text-xs font-black text-slate-600">
                      <span className="rounded bg-white px-2 py-1">Capacidade: {item.event.capacity ?? "-"}</span>
                      <span className="rounded bg-white px-2 py-1">Inscrição: {item.event.registrationEnabled ? formatCurrency(item.event.registrationFeeCents) : "Fechada"}</span>
                      <span className="rounded bg-white px-2 py-1">Previsto: {formatCurrency(item.event.expectedRevenueCents - item.event.expectedExpenseCents)}</span>
                    </div> : null}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Link className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" title={item.kind === "EVENT" ? `Editar evento ${item.title}` : `Abrir jogo ${item.title}`} aria-label={item.kind === "EVENT" ? `Editar evento ${item.title}` : `Abrir jogo ${item.title}`} to={item.href}>
                      <Pencil size={14} />
                    </Link>
                    {item.kind === "EVENT" ? <ActionIconButton label={`Excluir evento ${item.title}`} tone="danger" disabled={deleteEventMutation.isPending} onClick={() => {
                      if (window.confirm(`Excluir evento ${item.title}?`)) void deleteEventMutation.mutateAsync(item.id);
                    }}>
                      <Trash2 size={14} />
                    </ActionIconButton> : null}
                  </div>
                </div>
              </article>
            ))}
            {!eventsQuery.isLoading && !gamesQuery.isLoading && visibleAgendaItems.length === 0 ? <EmptyState>Nenhum item encontrado neste período.</EmptyState> : null}
            </div>
          </div>
        </article>
      </div>
    </SectionShell>
  );
}

export function EventoFormPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const eventsQuery = useQuery({
    queryKey: ["club-events", "event-form"],
    queryFn: () => apiRequest<ClubEvent[]>("/events"),
    enabled: isEditing
  });
  const editingEvent = eventsQuery.data?.find((event) => event.id === id) ?? null;
  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "SOCIAL" as ClubEventType,
    status: "DRAFT" as ClubEventStatus,
    startsAt: "",
    endsAt: "",
    location: "",
    capacity: "",
    registrationEnabled: false,
    registrationFeeBRL: "",
    expectedRevenueBRL: "",
    expectedExpenseBRL: "",
    coverImageUrl: ""
  });

  useEffect(() => {
    if (!editingEvent) return;
    setForm({
      title: editingEvent.title,
      description: editingEvent.description ?? "",
      type: editingEvent.type,
      status: editingEvent.status,
      startsAt: editingEvent.startsAt.slice(0, 16),
      endsAt: editingEvent.endsAt?.slice(0, 16) ?? "",
      location: editingEvent.location ?? "",
      capacity: editingEvent.capacity ? String(editingEvent.capacity) : "",
      registrationEnabled: editingEvent.registrationEnabled,
      registrationFeeBRL: (editingEvent.registrationFeeCents / 100).toFixed(2).replace(".", ","),
      expectedRevenueBRL: (editingEvent.expectedRevenueCents / 100).toFixed(2).replace(".", ","),
      expectedExpenseBRL: (editingEvent.expectedExpenseCents / 100).toFixed(2).replace(".", ","),
      coverImageUrl: editingEvent.coverImageUrl ?? ""
    });
  }, [editingEvent]);

  const saveEventMutation = useMutation({
    mutationFn: () =>
      apiRequest<ClubEvent>(isEditing ? `/events/${id}` : "/events", {
        method: isEditing ? "PATCH" : "POST",
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          type: form.type,
          status: form.status,
          startsAt: new Date(form.startsAt).toISOString(),
          endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
          location: form.location,
          capacity: form.capacity ? Number(form.capacity) : null,
          registrationEnabled: form.registrationEnabled,
          registrationFeeCents: Math.round(Number(form.registrationFeeBRL.replace(",", ".") || 0) * 100),
          expectedRevenueCents: Math.round(Number(form.expectedRevenueBRL.replace(",", ".") || 0) * 100),
          expectedExpenseCents: Math.round(Number(form.expectedExpenseBRL.replace(",", ".") || 0) * 100),
          coverImageUrl: form.coverImageUrl
        })
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["club-events"] });
      navigate("/eventos");
    }
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void saveEventMutation.mutateAsync();
  }

  if (isEditing && eventsQuery.isLoading) {
    return <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-500 shadow-sm">Carregando evento...</div>;
  }

  if (isEditing && !editingEvent) {
    return (
      <section className="min-w-0 space-y-4">
        <article className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700 shadow-sm">Evento não encontrado.</article>
        <Link className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 hover:bg-slate-50" to="/eventos">Voltar para Eventos</Link>
      </section>
    );
  }

  return (
    <SectionShell
      eyebrow="Comunidade"
      title={isEditing ? "Editar evento" : "Novo evento"}
      description="Cadastre evento social, esportivo ou comunitário sem misturar com jogos. Inscrições e check-in ficam na tela própria."
      icon={<CalendarDays size={16} />}
      action={<Link className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 hover:bg-slate-50" to="/eventos">Voltar</Link>}
    >
      <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(22rem,0.75fr)]">
          <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h2 className="text-lg font-black text-slate-950">Dados do evento</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">Informações principais para a agenda e a lista de eventos.</p>
            <label className="mt-4 block text-sm font-bold text-slate-600">
              Título
              <input className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold" value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} required />
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="text-sm font-bold text-slate-600">
                Tipo
                <select className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold" value={form.type} onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value as ClubEventType }))}>
                  {Object.entries(eventTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="text-sm font-bold text-slate-600">
                Status
                <select className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold" value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as ClubEventStatus }))}>
                  {Object.entries(eventStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="text-sm font-bold text-slate-600">
                Início
                <input className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold" type="datetime-local" value={form.startsAt} onChange={(event) => setForm((prev) => ({ ...prev, startsAt: event.target.value }))} required />
              </label>
              <label className="text-sm font-bold text-slate-600">
                Término
                <input className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold" type="datetime-local" value={form.endsAt} onChange={(event) => setForm((prev) => ({ ...prev, endsAt: event.target.value }))} />
              </label>
            </div>
            <label className="block text-sm font-bold text-slate-600">
              Local
              <input className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold" value={form.location} onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))} />
            </label>
            <label className="block text-sm font-bold text-slate-600">
              Descrição
              <textarea className="mt-1 min-h-28 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold" value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
            </label>
          </section>

          <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h2 className="text-lg font-black text-slate-950">Inscrições e previsão</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">Controle vagas, cobrança e previsão financeira.</p>
            <div className="mt-4 grid gap-3">
              <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm font-black text-slate-700">
                <input className="mt-1 size-4 accent-red-600" type="checkbox" checked={form.registrationEnabled} onChange={(event) => setForm((prev) => ({ ...prev, registrationEnabled: event.target.checked }))} />
                <span>
                  Inscrição aberta
                  <span className="block text-xs font-semibold text-slate-500">Permite controle de participantes e pagamentos.</span>
                </span>
              </label>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <label className="text-sm font-bold text-slate-600">
                  Capacidade
                  <input className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold" type="number" min={0} value={form.capacity} onChange={(event) => setForm((prev) => ({ ...prev, capacity: event.target.value }))} />
                </label>
                <label className="text-sm font-bold text-slate-600">
                  Taxa de inscrição
                  <input className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold" inputMode="decimal" placeholder="R$ 0,00" value={form.registrationFeeBRL} onChange={(event) => setForm((prev) => ({ ...prev, registrationFeeBRL: event.target.value }))} />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <label className="text-sm font-bold text-slate-600">
                  Receita prevista
                  <input className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold" inputMode="decimal" placeholder="R$ 0,00" value={form.expectedRevenueBRL} onChange={(event) => setForm((prev) => ({ ...prev, expectedRevenueBRL: event.target.value }))} />
                </label>
                <label className="text-sm font-bold text-slate-600">
                  Despesa prevista
                  <input className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold" inputMode="decimal" placeholder="R$ 0,00" value={form.expectedExpenseBRL} onChange={(event) => setForm((prev) => ({ ...prev, expectedExpenseBRL: event.target.value }))} />
                </label>
              </div>
              <label className="text-sm font-bold text-slate-600">
                Imagem de capa
                <input className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold" placeholder="https://..." value={form.coverImageUrl} onChange={(event) => setForm((prev) => ({ ...prev, coverImageUrl: event.target.value }))} />
              </label>
              <div className="grid min-h-28 place-items-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-white">
                {form.coverImageUrl ? <img src={form.coverImageUrl} alt="" className="h-36 w-full object-cover" /> : <span className="text-sm font-semibold text-slate-400">Prévia da capa</span>}
              </div>
            </div>
          </section>
          </div>

          <div className="flex flex-col gap-2 border-t border-slate-200 pt-4 sm:flex-row">
            <button className="min-h-10 rounded-lg bg-[#08255b] px-4 text-sm font-black text-white disabled:opacity-60" disabled={saveEventMutation.isPending}>
              {saveEventMutation.isPending ? "Salvando..." : isEditing ? "Salvar edição" : "Salvar evento"}
            </button>
            <Link className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 hover:bg-slate-50" to="/eventos">Cancelar</Link>
          </div>
        </form>
      </article>
    </SectionShell>
  );
}

export function LegacyInscricoesPage() {
  type AssociateOption = { id: string; name: string; email: string | null; phone: string | null; status: string };

  const { year } = useOutletContext<OutletPeriod>();
  const queryClient = useQueryClient();
  const eventsQuery = useQuery({ queryKey: ["club-events", "registrations", year], queryFn: () => apiRequest<ClubEvent[]>(`/events?year=${year}`) });
  const associatesQuery = useQuery({ queryKey: ["associates", "event-registrations-page"], queryFn: () => apiRequest<AssociateOption[]>("/associates") });
  const events = eventsQuery.data ?? [];
  const associates = associatesQuery.data ?? [];
  const active = associates.filter((associate) => associate.status === "ACTIVE");
  const [selectedEventId, setSelectedEventId] = useState("");
  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? events[0] ?? null;
  const registrationsQuery = useQuery({
    queryKey: ["club-event-registrations", selectedEvent?.id],
    enabled: Boolean(selectedEvent?.id),
    queryFn: () => apiRequest<ClubEventRegistration[]>(`/events/${selectedEvent?.id}/registrations`)
  });
  const registrations = registrationsQuery.data ?? [];
  const [form, setForm] = useState({
    associateId: "",
    name: "",
    email: "",
    phone: "",
    status: "PENDING" as ClubEventRegistrationStatus,
    amountBRL: "",
    note: ""
  });
  const registrationStatusLabels: Record<ClubEventRegistrationStatus, string> = {
    PENDING: "Pendente",
    CONFIRMED: "Confirmada",
    CANCELED: "Cancelada",
    CHECKED_IN: "Check-in"
  };
  const confirmedCount = registrations.filter((item) => item.status === "CONFIRMED" || item.status === "CHECKED_IN").length;
  const checkedInCount = registrations.filter((item) => item.status === "CHECKED_IN").length;
  const paidTotal = registrations.reduce((total, item) => total + item.amountCents, 0);

  const createRegistrationMutation = useMutation({
    mutationFn: () => {
      if (!selectedEvent) throw new Error("Selecione um evento.");
      return apiRequest<ClubEventRegistration>(`/events/${selectedEvent.id}/registrations`, {
        method: "POST",
        body: JSON.stringify({
          associateId: form.associateId || null,
          name: form.name,
          email: form.email,
          phone: form.phone,
          status: form.status,
          amountCents: Math.round(Number(form.amountBRL.replace(",", ".") || 0) * 100),
          note: form.note
        })
      });
    },
    onSuccess: () => {
      setForm({ associateId: "", name: "", email: "", phone: "", status: "PENDING", amountBRL: "", note: "" });
      void queryClient.invalidateQueries({ queryKey: ["club-event-registrations", selectedEvent?.id] });
    }
  });

  const updateRegistrationMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ClubEventRegistrationStatus }) =>
      apiRequest<ClubEventRegistration>(`/events/registrations/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["club-event-registrations", selectedEvent?.id] });
    }
  });

  const deleteRegistrationMutation = useMutation({
    mutationFn: (id: string) => apiRequest<void>(`/events/registrations/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["club-event-registrations", selectedEvent?.id] });
    }
  });

  function handleAssociateChange(associateId: string) {
    const associate = active.find((item) => item.id === associateId);
    setForm((prev) => ({
      ...prev,
      associateId,
      name: associate?.name ?? prev.name,
      email: associate?.email ?? prev.email,
      phone: associate?.phone ?? prev.phone
    }));
  }

  return (
    <SectionShell
      eyebrow="Eventos"
      title="Inscrições"
      description="Controle de inscritos por evento, com confirmação, check-in, valores e contatos em uma tela própria."
      icon={<Users size={16} />}
      action={<Link className="rounded-lg bg-[#08255b] px-4 py-2 text-sm font-black text-white shadow-sm hover:bg-[#0b3278]" to="/eventos">Gerenciar eventos</Link>}
    >
      <MetricGrid
        metrics={[
          { label: "Eventos no ano", value: String(events.length), hint: `${year}` },
          { label: "Confirmados", value: String(confirmedCount), hint: `${checkedInCount} com check-in` },
          { label: "Valores", value: formatCurrency(paidTotal), hint: "Total informado nas inscrições" }
        ]}
      />
      <div className="grid gap-4 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="space-y-3">
            <label className="block text-xs font-black uppercase tracking-[0.08em] text-slate-500">Evento</label>
            <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold" value={selectedEvent?.id ?? ""} onChange={(event) => setSelectedEventId(event.target.value)}>
              {events.map((event) => (
                <option key={event.id} value={event.id}>{event.title}</option>
              ))}
            </select>
            {selectedEvent ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-black text-slate-950">{selectedEvent.title}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{new Date(selectedEvent.startsAt).toLocaleDateString("pt-BR")} - {selectedEvent.location ?? "Local não informado"}</p>
                <p className="mt-2 text-xs font-black text-slate-600">{selectedEvent.capacity ? `${registrations.length}/${selectedEvent.capacity} vagas` : `${registrations.length} inscrições`}</p>
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-slate-300 p-3 text-sm font-semibold text-slate-500">Cadastre um evento antes de abrir inscrições.</p>
            )}
          </div>

          <form className="mt-4 space-y-3" onSubmit={(event: FormEvent) => { event.preventDefault(); createRegistrationMutation.mutate(); }}>
            <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold" value={form.associateId} onChange={(event) => handleAssociateChange(event.target.value)}>
              <option value="">Participante avulso</option>
              {active.map((associate) => (
                <option key={associate.id} value={associate.id}>{associate.name}</option>
              ))}
            </select>
            <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold" placeholder="Nome" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold" placeholder="Email" value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} />
              <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold" placeholder="Telefone" value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} />
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <select className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold" value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as ClubEventRegistrationStatus }))}>
                {Object.entries(registrationStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold" placeholder="Valor R$" value={form.amountBRL} onChange={(event) => setForm((prev) => ({ ...prev, amountBRL: event.target.value }))} />
            </div>
            <textarea className="min-h-20 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold" placeholder="Observações" value={form.note} onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))} />
            <button className="min-h-10 w-full rounded-lg bg-[#08255b] px-4 text-sm font-black text-white disabled:opacity-60" disabled={!selectedEvent || createRegistrationMutation.isPending}>
              {createRegistrationMutation.isPending ? "Salvando..." : "Salvar inscrição"}
            </button>
          </form>
        </article>

        <article className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.08em] text-slate-500">
                <tr><th className="px-4 py-3">Participante</th><th className="px-4 py-3">Contato</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Valor</th><th className="px-4 py-3 text-right">Ações</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {registrations.map((registration) => (
                  <tr key={registration.id}>
                    <td className="px-4 py-3">
                      <p className="font-black text-slate-950">{registration.name}</p>
                      <p className="text-xs font-semibold text-slate-500">{registration.associate ? "Associado" : "Avulso"}</p>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-600">{registration.email ?? registration.phone ?? "-"}</td>
                    <td className="px-4 py-3"><span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-black text-slate-700">{registrationStatusLabels[registration.status]}</span></td>
                    <td className="px-4 py-3 font-black text-slate-950">{formatCurrency(registration.amountCents)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button className="rounded-lg border border-emerald-200 px-3 py-2 text-xs font-black text-emerald-700 disabled:opacity-60" disabled={updateRegistrationMutation.isPending} onClick={() => updateRegistrationMutation.mutate({ id: registration.id, status: "CONFIRMED" })}>Confirmar</button>
                        <button className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-black text-blue-700 disabled:opacity-60" disabled={updateRegistrationMutation.isPending} onClick={() => updateRegistrationMutation.mutate({ id: registration.id, status: "CHECKED_IN" })}>Check-in</button>
                        <button className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 disabled:opacity-60" disabled={updateRegistrationMutation.isPending} onClick={() => updateRegistrationMutation.mutate({ id: registration.id, status: "CANCELED" })}>Cancelar</button>
                        <button className="rounded-lg border border-red-200 p-2 text-red-700 disabled:opacity-60" disabled={deleteRegistrationMutation.isPending} onClick={() => deleteRegistrationMutation.mutate(registration.id)} aria-label="Remover inscrição"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!registrationsQuery.isLoading && registrations.length === 0 ? <p className="p-4 text-sm font-semibold text-slate-500">Nenhuma inscrição cadastrada para este evento.</p> : null}
          </div>
        </article>
      </div>
    </SectionShell>
  );
}

export function AssistenciasPage() {
  return <StatsAreaPage title="Assistências" primaryAction="Recalcular assistências" />;
}

export function ParticipacoesStatsPage() {
  return <StatsAreaPage title="Participações" primaryAction="Atualizar participações" />;
}

export function RankingsPage() {
  return <StatsAreaPage title="Rankings" primaryAction="Recalcular rankings" />;
}

function StatsAreaPage({ title, primaryAction }: { title: string; primaryAction: string }) {
  const { month, year } = useOutletContext<OutletPeriod>();
  const [periodMode, setPeriodMode] = useState<"MONTH" | "YEAR">("MONTH");
  const periodLabel = periodMode === "MONTH" ? `${monthNames[month - 1]} de ${year}` : `Ano ${year}`;
  const periodQuery = periodMode === "MONTH" ? `?month=${month}&year=${year}` : `?year=${year}`;
  const statsQuery = useQuery({
    queryKey: ["sports-stats", title, month, year, periodMode],
    queryFn: () => apiRequest<CompetitionRankingSummary>(`/sports/stats/competition${periodQuery}`)
  });
  const data = statsQuery.data;
  const rows =
    title === "Assistências"
      ? data?.contributions.map((item) => ({ id: item.athleteId, name: item.name, main: item.assists, aux: `${item.goals} gols`, label: "assistências" })) ?? []
      : title === "Participações"
        ? data?.wins.map((item) => ({ id: item.athleteId, name: item.name, main: item.games, aux: `${item.winRate}% aproveitamento`, label: "jogos" })) ?? []
        : data?.scorers.map((item) => ({ id: item.athleteId, name: item.name, main: item.goals, aux: `${item.assists} assistências`, label: "gols" })) ?? [];

  return (
    <SectionShell
      eyebrow="Estatisticas"
      title={title}
      description="Indicadores esportivos reais do período, com ranking calculado a partir de jogos, súmulas e participações."
      icon={<Trophy size={16} />}
      action={<Link className="rounded-lg bg-[#08255b] px-4 py-2 text-sm font-black text-white shadow-sm hover:bg-[#0b3278]" to="/relatorios">{primaryAction}</Link>}
    >
      <article className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Período da estatística</p>
            <h2 className="truncate text-lg font-black text-slate-950">{periodLabel}</h2>
          </div>
          <div className="inline-flex w-full rounded-lg border border-slate-200 bg-white p-1 shadow-sm sm:w-auto">
            {[
              { key: "YEAR" as const, label: `Ano ${year}` },
              { key: "MONTH" as const, label: monthNames[month - 1] }
            ].map((option) => (
              <button
                key={option.key}
                type="button"
                className={`h-9 flex-1 rounded-md px-3 text-xs font-black sm:flex-none ${periodMode === option.key ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-50"}`}
                onClick={() => setPeriodMode(option.key)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </article>
      <MetricGrid
        metrics={[
          { label: "Período", value: periodLabel, hint: "Filtro atual" },
          { label: "Atletas ranqueados", value: String(rows.length), hint: "Com dados no período" },
          { label: "Lider", value: rows[0]?.name ?? "-", hint: rows[0] ? `${rows[0].main} ${rows[0].label}` : "Sem dados" }
        ]}
      />
      <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.08em] text-slate-500">
              <tr><th className="px-4 py-3">#</th><th className="px-4 py-3">Atleta</th><th className="px-4 py-3">Principal</th><th className="px-4 py-3">Complemento</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.slice(0, 30).map((row, index) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 font-black text-slate-500">{index + 1}</td>
                  <td className="px-4 py-3 font-black text-slate-950">{row.name}</td>
                  <td className="px-4 py-3 font-black text-slate-950">{row.main} {row.label}</td>
                  <td className="px-4 py-3 font-semibold text-slate-500">{row.aux}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!statsQuery.isLoading && rows.length === 0 ? <p className="p-4 text-sm font-semibold text-slate-500">Sem estatísticas para este período.</p> : null}
        </div>
      </article>
    </SectionShell>
  );
}

export function MemorialJogosPage() {
  return <MemorialAreaPage title="Jogos Históricos" icon={<Trophy size={16} />} primaryAction="Arquivar jogo" />;
}

export function MemorialAtletasPage() {
  return <MemorialAreaPage title="Atletas Históricos" icon={<UserCircle2 size={16} />} primaryAction="Abrir perfil histórico" />;
}

export function MemorialDiretoriasPage() {
  return <MemorialAreaPage title="Presidentes e Diretorias" icon={<Landmark size={16} />} primaryAction="Novo mandato" />;
}

export function MemorialTitulosPage() {
  return <MemorialAreaPage title="Títulos" icon={<Trophy size={16} />} primaryAction="Novo título" />;
}

export function MemorialSumulasPage() {
  return <MemorialAreaPage title="Súmulas" icon={<ClipboardList size={16} />} primaryAction="Nova súmula" />;
}

export function MemorialUniformesPage() {
  return <MemorialAreaPage title="Camisas Históricas" icon={<Shirt size={16} />} primaryAction="Configurar uniformes" />;
}

export function MemorialLinhaTempoPage() {
  return <MemorialAreaPage title="Linha do Tempo" icon={<CalendarDays size={16} />} primaryAction="Novo marco" />;
}

export function MemorialDashboardPage() {
  const currentYear = new Date().getFullYear();
  const [selectedMemorialYear, setSelectedMemorialYear] = useState(currentYear);
  const archiveQuery = useQuery({
    queryKey: ["historical-archive", "memorial-dashboard", currentYear],
    queryFn: () => apiRequest<HistoricalArchiveReport>(`/reports/historical-archive?fromYear=1980&toYear=${currentYear}`)
  });
  const archive = archiveQuery.data;
  const archiveYearClosures = archive?.yearClosures ?? [];
  const yearRows = archiveYearClosures
    .filter((year) => year.sports.games > 0 || year.sports.goals > 0 || year.finance.incomeCents > 0 || year.finance.expenseCents > 0)
    .slice(0, 8);
  const scoringByYear = archive?.scoringByYear ?? [];
  const gameResults = archive?.gameResults ?? [];
  const boardTerms = archive?.boardTerms ?? [];
  const uniformHistory = archive?.uniformHistory ?? [];
  const archiveYearsWithData = archiveYearClosures
    .filter((row) => row.sports.games > 0 || row.sports.goals > 0 || row.finance.incomeCents > 0 || row.finance.expenseCents > 0)
    .map((row) => row.year);
  const availableYears = Array.from(new Set([
    currentYear,
    ...archiveYearsWithData,
    ...scoringByYear.map((row) => row.year),
    ...gameResults.map((row) => row.year),
    ...boardTerms.flatMap((term) => [term.startedYear, term.endedYear].filter((year): year is number => typeof year === "number")),
    ...uniformHistory.flatMap((uniform) => [
      uniform.seasonYear,
      ...Array.from(uniform.seasonLabel.matchAll(/\b(19|20)\d{2}\b/g)).map((match) => Number(match[0]))
    ].filter((year): year is number => typeof year === "number"))
  ])).filter((year) => year >= 1900 && year <= currentYear).sort((a, b) => b - a);
  const selectedYearSummary = archiveYearClosures.find((item) => item.year === selectedMemorialYear) ?? null;
  const selectedScoring = scoringByYear.find((item) => item.year === selectedMemorialYear)?.topScorers ?? [];
  const selectedResults = gameResults.find((item) => item.year === selectedMemorialYear)?.games ?? [];
  const selectedPresidents = archive?.presidents.filter((president) => president.startedYear <= selectedMemorialYear && (president.endedYear ?? selectedMemorialYear) >= selectedMemorialYear) ?? [];
  const selectedBoard = boardTerms.filter((term) => term.startedYear <= selectedMemorialYear && (term.endedYear ?? selectedMemorialYear) >= selectedMemorialYear);
  const selectedUniforms = uniformHistory.filter((uniform) => uniform.seasonYear === selectedMemorialYear || uniform.seasonLabel.includes(String(selectedMemorialYear)));
  const selectedUniformSlots = ["TIME_A", "TIME_B"].map((side) => {
    const exact = selectedUniforms.find((uniform) => uniform.side === side);
    const fallback = uniformHistory
      .filter((uniform) => uniform.side === side && (uniform.seasonYear ?? 0) <= selectedMemorialYear)
      .sort((a, b) => (b.seasonYear ?? 0) - (a.seasonYear ?? 0))[0];
    return {
      side,
      label: side === "TIME_A" ? "Uniforme 1" : "Uniforme 2",
      uniform: exact ?? fallback ?? null,
      inherited: !exact && !!fallback
    };
  });
  const totalGames = archiveYearClosures.reduce((sum, year) => sum + year.sports.games, 0);
  const totalGoals = archiveYearClosures.reduce((sum, year) => sum + year.sports.goals, 0);
  const yearsWithData = archiveYearClosures.filter((year) => year.sports.games > 0 || year.finance.incomeCents > 0 || year.finance.expenseCents > 0).length;
  const yearChartData = archiveYearClosures
    .filter((year) => year.sports.games > 0 || year.sports.goals > 0 || year.finance.incomeCents > 0 || year.finance.expenseCents > 0)
    .slice()
    .sort((a, b) => a.year - b.year)
    .slice(-10)
    .map((year) => ({
      year: String(year.year),
      jogos: year.sports.games,
      gols: year.sports.goals,
      saldo: Math.round(year.finance.balanceCents / 100)
    }));
  const scorerChartData = selectedScoring.slice(0, 8).map((row) => ({
    name: row.name.split(" ")[0] || row.name,
    gols: row.goals,
    assistencias: row.assists
  }));

  return (
    <SectionShell
      eyebrow="Acervo"
      title="Acervo do Clube"
      description="Arquivo futebolístico por ano: jogos, artilharia, presidentes, diretorias, uniformes, finanças e registros preservados."
      icon={<BookOpenText size={16} />}
      action={<Link className="rounded-lg bg-[#08255b] px-4 py-2 text-sm font-black text-white shadow-sm hover:bg-[#0b3278]" to="/memorial/linha-do-tempo">Linha do tempo</Link>}
    >
      <MetricGrid
        metrics={[
          { label: "Anos com história", value: String(yearsWithData), hint: "Temporadas com dados" },
          { label: "Jogos preservados", value: String(totalGames), hint: "Arquivo esportivo" },
          { label: "Gols registrados", value: String(totalGoals), hint: "Artilharia histórica" }
        ]}
      />

      <article className="min-w-0 rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem] sm:items-start">
          <div className="min-w-0">
            <h2 className="text-lg font-black text-slate-950">Linha do tempo do acervo</h2>
            <p className="text-sm font-semibold text-slate-500">Selecione o ano e acesse atletas históricos, artilharia, diretoria, jogos e uniformes daquele período.</p>
          </div>
          <label className="w-full text-sm font-bold text-slate-600">
            Ano
            <select className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-black text-slate-950" value={selectedMemorialYear} onChange={(event) => setSelectedMemorialYear(Number(event.target.value) || currentYear)}>
              {availableYears.map((year) => <option key={`memorial-year-option-${year}`} value={year}>{year}</option>)}
            </select>
          </label>
        </div>

        <div
          className="mt-4 grid max-h-[15rem] gap-2 overflow-y-auto pr-1"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(10.5rem, 1fr))" }}
        >
          {availableYears.map((year) => {
            const summary = archiveYearClosures.find((item) => item.year === year);
            const yearTopScorer = scoringByYear.find((item) => item.year === year)?.topScorers?.[0];
            const boardCount = boardTerms.filter((term) => term.startedYear <= year && (term.endedYear ?? year) >= year).length;
            const active = year === selectedMemorialYear;
            return (
              <button
                key={`memorial-timeline-${year}`}
                type="button"
                className={`min-h-[7.25rem] min-w-0 rounded-lg border px-3 py-2 text-left transition ${active ? "border-red-500 bg-red-50 text-red-700" : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-white"}`}
                onClick={() => setSelectedMemorialYear(year)}
              >
                <strong className="block text-lg font-black">{year}</strong>
                <span className="mt-1 block text-xs font-bold">{summary?.sports.games ?? 0} jogos</span>
                <span className="block truncate text-xs font-bold" title={yearTopScorer?.name ?? "Sem artilheiro"}>
                  {yearTopScorer ? `${yearTopScorer.name} (${yearTopScorer.goals})` : "Sem artilheiro"}
                </span>
                <span className="block text-xs font-bold">{boardCount} diretoria</span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid gap-3 min-[520px]:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Jogos", value: String(selectedYearSummary?.sports.games ?? 0), hint: `${selectedYearSummary?.sports.finishedGames ?? 0} finalizados` },
            { label: "Gols", value: String(selectedYearSummary?.sports.goals ?? 0), hint: "Placares e súmulas" },
            { label: "Artilharia", value: String(selectedScoring.length), hint: "Atletas ranqueados" },
          { label: "Uniformes", value: "1 e 2", hint: `${selectedUniforms.length} registro(s) no ano` }
          ].map((item) => (
            <div key={`memorial-year-metric-${item.label}`} className="min-h-[6rem] min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-black uppercase tracking-[0.08em] text-slate-500">{item.label}</p>
              <strong className="mt-1 block text-2xl font-black text-slate-950">{item.value}</strong>
              <p className="mt-0.5 text-xs font-semibold text-slate-500">{item.hint}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-2 min-[520px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          {[
            { label: "Atletas históricos", to: "/memorial/atletas" },
            { label: "Artilharia do ano", to: "/artilharia" },
            { label: "Presidência e diretoria", to: "/memorial/diretorias" },
            { label: "Jogos e placares", to: "/memorial/jogos" },
            { label: "Camisas do ano", to: "/memorial/uniformes" },
            { label: "Acervo e súmulas", to: "/memorial/sumulas" }
          ].map((action) => (
            <Link key={`memorial-action-${action.label}`} className="flex min-h-[4.5rem] min-w-0 flex-col justify-center rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm font-black text-slate-700 hover:border-red-200 hover:bg-red-50 hover:text-red-700" to={action.to}>
              <span className="block break-words">{action.label}</span>
              <span className="mt-1 block text-xs font-semibold text-slate-500">{selectedMemorialYear}</span>
            </Link>
          ))}
        </div>
      </article>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-950">Evolução do acervo</h2>
              <p className="text-sm font-semibold text-slate-500">Jogos, gols e saldo financeiro preservados nos anos com movimento.</p>
            </div>
            <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-500">Últimos 10 anos</span>
          </div>
          <div className="mt-4 h-64 min-w-0">
            {yearChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <LineChart data={yearChartData} margin={{ top: 12, right: 12, bottom: 0, left: -18 }}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value, name) => [String(value), name === "saldo" ? "saldo (R$)" : String(name)]} />
                  <Line type="monotone" dataKey="jogos" stroke="#08255b" strokeWidth={3} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="gols" stroke="#dc2626" strokeWidth={3} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="saldo" stroke="#16a34a" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm font-semibold text-slate-500">Sem dados históricos para gerar gráfico.</div>
            )}
          </div>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">Artilharia em gráfico</h2>
          <p className="text-sm font-semibold text-slate-500">Top atletas do ano atual por gols e assistências.</p>
          <div className="mt-4 h-64 min-w-0">
            {scorerChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={scorerChartData} margin={{ top: 12, right: 12, bottom: 0, left: -18 }}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="gols" fill="#dc2626" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="assistencias" fill="#08255b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm font-semibold text-slate-500">Sem artilharia para gerar gráfico.</div>
            )}
          </div>
        </article>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-950">Linha do tempo recente</h2>
              <p className="text-sm font-semibold text-slate-500">Anos com jogos, gols e saldo histórico já registrados.</p>
            </div>
            <Link className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50" to="/historico">
              Ver tudo
            </Link>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {yearRows.map((year) => (
              <Link key={`memorial-year-${year.year}`} to={`/historico`} className="rounded-lg border border-slate-200 bg-slate-50 p-3 hover:border-red-200 hover:bg-white">
                <div className="flex items-start justify-between gap-3">
                  <strong className="text-xl font-black text-slate-950">{year.year}</strong>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-slate-600">{year.sports.games} jogos</span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs font-bold text-slate-500">
                  <span>{year.sports.goals} gols</span>
                  <span>{year.sports.finishedGames} finalizados</span>
                  <span>{formatCurrency(year.finance.balanceCents)}</span>
                </div>
              </Link>
            ))}
            {!archiveQuery.isLoading && yearRows.length === 0 ? <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-semibold text-slate-500">Nenhum ano consolidado ainda.</p> : null}
          </div>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">Artilharia {selectedMemorialYear}</h2>
          <p className="text-sm font-semibold text-slate-500">Ranking anual com gols, assistências e jogos.</p>
          <div className="mt-4 space-y-2">
            {selectedScoring.slice(0, 8).map((row, index) => (
              <div key={`memorial-scorer-${row.athleteId}`} className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="font-black text-slate-500">{index + 1}</span>
                <span className="min-w-0 truncate font-black text-slate-950">{row.name}</span>
                <span className="text-right text-xs font-bold text-slate-500">
                  <strong className="text-base text-red-600">{row.goals}</strong> gols · {row.assists} ast · {row.games} jogos
                </span>
              </div>
            ))}
            {!archiveQuery.isLoading && selectedScoring.length === 0 ? <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-semibold text-slate-500">Sem artilharia registrada neste ano.</p> : null}
          </div>
        </article>
      </div>

      <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-950">Placares e registros do futebol</h2>
            <p className="text-sm font-semibold text-slate-500">Jogos lançados no ano com data, local, placar e competição.</p>
          </div>
          <Link className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50" to="/memorial/jogos">
            Ver jogos
          </Link>
        </div>
        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.08em] text-slate-500">
              <tr><th className="px-4 py-3">Data</th><th className="px-4 py-3">Jogo</th><th className="px-4 py-3">Placar</th><th className="px-4 py-3">Registro</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {selectedResults.slice(0, 10).map((game) => (
                <tr key={`memorial-score-${game.id}`}>
                  <td className="px-4 py-3 font-semibold text-slate-500">{new Date(game.date).toLocaleDateString("pt-BR")}</td>
                  <td className="px-4 py-3 font-black text-slate-950">{game.redTeamName ?? "Time A"} x {game.whiteTeamName ?? "Time B"}</td>
                  <td className="px-4 py-3 font-black text-slate-950">{game.redScore ?? "-"} x {game.whiteScore ?? "-"}</td>
                  <td className="px-4 py-3 font-semibold text-slate-500">{game.championship || game.gameMode} - {game.location}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!archiveQuery.isLoading && selectedResults.length === 0 ? <p className="p-4 text-sm font-semibold text-slate-500">Nenhum placar registrado neste ano.</p> : null}
        </div>
      </article>

      <div className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-950">Presidência e diretoria em {selectedMemorialYear}</h2>
              <p className="text-sm font-semibold text-slate-500">Mandatos, cargos e fotos preservados por temporada.</p>
            </div>
            <Link className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50" to="/diretoria">
              Gerenciar
            </Link>
          </div>
          <div className="mt-4 grid gap-2">
            {selectedPresidents.map((president) => (
              <div key={`memorial-president-${president.id}`} className="flex min-w-0 items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg border border-amber-200 bg-white text-xs font-black text-amber-700">
                  {president.photoUrl ? <img src={president.photoUrl} alt={president.name} className="h-full w-full object-cover" /> : "Foto"}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-black text-slate-950">{president.name}</p>
                  <p className="text-xs font-semibold text-amber-700">Presidente · {president.startedYear} - {president.endedYear ?? "atual"}</p>
                  {president.achievements || president.note ? <p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-500">{president.achievements ?? president.note}</p> : null}
                </div>
              </div>
            ))}
            {selectedBoard.map((term) => (
              <div key={`memorial-board-${term.id}`} className="flex min-w-0 items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg border border-slate-200 bg-white text-xs font-black text-slate-500">
                  {term.associate.athlete?.photoUrl ? <img src={term.associate.athlete.photoUrl} alt={term.associate.name} className="h-full w-full object-cover" /> : "Foto"}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-black text-slate-950">{term.associate.name}</p>
                  <p className="text-xs font-semibold text-slate-500">{term.boardRole.name} · {term.startedYear} - {term.endedYear ?? "atual"}</p>
                  {term.note || term.boardRole.description ? <p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-500">{term.note ?? term.boardRole.description}</p> : null}
                </div>
              </div>
            ))}
            {!archiveQuery.isLoading && selectedBoard.length === 0 && selectedPresidents.length === 0 ? <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-semibold text-slate-500">Nenhuma presidência ou diretoria registrada neste ano.</p> : null}
          </div>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-950">Camisas de {selectedMemorialYear}</h2>
              <p className="text-sm font-semibold text-slate-500">Uniforme 1 e uniforme 2 salvos por ano/temporada.</p>
            </div>
            <Link className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50" to="/configuracoes?aba=uniforms">
              Configurar
            </Link>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {selectedUniformSlots.map((slot) => (
              <div key={`memorial-uniform-${slot.side}`} className="flex min-w-0 items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-lg border border-slate-200 bg-white" style={{ backgroundColor: slot.uniform?.imageUrl ? undefined : slot.uniform?.color ?? "#e2e8f0" }}>
                  {slot.uniform?.imageUrl ? <img src={slot.uniform.imageUrl} alt={slot.uniform.name} className="h-full w-full object-contain" /> : <Shirt size={26} className={slot.uniform ? "text-white" : "text-slate-400"} />}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-black text-slate-950">{slot.uniform?.name ?? slot.label}</p>
                  <p className="text-xs font-semibold text-slate-500">{slot.label} · {slot.uniform?.seasonLabel ?? selectedMemorialYear}</p>
                  <p className={`mt-1 text-xs font-bold ${slot.uniform ? "text-emerald-700" : "text-amber-700"}`}>
                    {slot.uniform ? slot.inherited ? "Usando registro anterior" : "Registro do ano" : "Sem foto/modelo cadastrado"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>
    </SectionShell>
  );
}

function MemorialAreaPage({ title, icon, primaryAction }: { title: string; icon: ReactNode; primaryAction: string }) {
  const currentYear = new Date().getFullYear();
  const [selectedAreaYear, setSelectedAreaYear] = useState(currentYear);
  const archiveQuery = useQuery({
    queryKey: ["historical-archive", "memorial-area", title, currentYear],
    queryFn: () => apiRequest<HistoricalArchiveReport>(`/reports/historical-archive?fromYear=1980&toYear=${currentYear}`)
  });
  const archive = archiveQuery.data;
  const yearClosures = archive?.yearClosures ?? [];
  const scoringByYear = archive?.scoringByYear ?? [];
  const gameResults = archive?.gameResults ?? [];
  const boardTerms = archive?.boardTerms ?? [];
  const presidents = archive?.presidents ?? [];
  const uniformHistory = archive?.uniformHistory ?? [];
  const availableYears = Array.from(new Set([
    currentYear,
    ...yearClosures.map((year) => year.year),
    ...scoringByYear.map((year) => year.year),
    ...gameResults.map((year) => year.year),
    ...boardTerms.flatMap((term) => [term.startedYear, term.endedYear].filter((year): year is number => typeof year === "number")),
    ...uniformHistory.flatMap((uniform) => [
      uniform.seasonYear,
      ...Array.from(uniform.seasonLabel.matchAll(/\b(19|20)\d{2}\b/g)).map((match) => Number(match[0]))
    ].filter((year): year is number => typeof year === "number"))
  ])).filter((year) => year >= 1900 && year <= currentYear).sort((a, b) => b - a);
  const selectedSummary = yearClosures.find((item) => item.year === selectedAreaYear) ?? null;
  const selectedScoring = scoringByYear.find((item) => item.year === selectedAreaYear)?.topScorers ?? [];
  const selectedGames = gameResults.find((item) => item.year === selectedAreaYear)?.games ?? [];
  const selectedPresidents = presidents.filter((president) => president.startedYear <= selectedAreaYear && (president.endedYear ?? selectedAreaYear) >= selectedAreaYear);
  const selectedBoard = boardTerms.filter((term) => term.startedYear <= selectedAreaYear && (term.endedYear ?? selectedAreaYear) >= selectedAreaYear);
  const selectedUniforms = uniformHistory.filter((uniform) => uniform.seasonYear === selectedAreaYear || uniform.seasonLabel.includes(String(selectedAreaYear)));
  const selectedUniformSlots = ["TIME_A", "TIME_B"].map((side) => {
    const exact = selectedUniforms.find((uniform) => uniform.side === side);
    const fallback = uniformHistory
      .filter((uniform) => uniform.side === side && (uniform.seasonYear ?? 0) <= selectedAreaYear)
      .sort((a, b) => (b.seasonYear ?? 0) - (a.seasonYear ?? 0))[0];
    return {
      side,
      label: side === "TIME_A" ? "Uniforme 1" : "Uniforme 2",
      uniform: exact ?? fallback ?? null,
      inherited: !exact && !!fallback
    };
  });

  const rows = (() => {
    if (!archive) return [];
    if (title.includes("Jogos") || title === "Súmulas") {
      return selectedGames.slice(0, 80).map((game) => ({
        title: new Date(game.date).toLocaleDateString("pt-BR"),
        main: `${game.redTeamName ?? "Time A"} ${game.redScore ?? "-"} x ${game.whiteScore ?? "-"} ${game.whiteTeamName ?? "Time B"}`,
        detail: `${selectedAreaYear} - ${game.championship || game.gameMode} - ${game.location}`
      }));
    }
    if (title.includes("Atletas")) {
      return selectedScoring.slice(0, 50).map((athlete, index) => ({
        title: `${index + 1}. ${athlete.name}`,
        main: `${athlete.goals} gols`,
        detail: `${athlete.assists} assistências, ${athlete.games} jogos, média ${athlete.goalAverage.toFixed(2)}`
      }));
    }
    if (title === "Presidentes e Diretorias") {
      const presidentRows = selectedPresidents.map((president) => ({
        title: president.name,
        main: `Presidência - ${president.startedYear} a ${president.endedYear ?? "atual"}`,
        detail: president.achievements ?? president.note ?? "Sem conquistas registradas"
      }));
      const boardRows = selectedBoard.map((term) => ({
        title: term.associate.name,
        main: `${term.boardRole.name} - ${term.startedYear} a ${term.endedYear ?? "atual"}`,
        detail: term.boardRole.description ?? term.note ?? "Cargo registrado no acervo"
      }));
      return [...presidentRows, ...boardRows];
    }
    if (title === "Camisas Históricas") {
      return selectedUniformSlots.map((slot) => ({
        title: `${selectedAreaYear} - ${slot.label}`,
        main: slot.uniform?.name ?? "Sem camisa cadastrada",
        detail: slot.uniform
          ? `${slot.uniform.seasonLabel}${slot.inherited ? " - herdado de temporada anterior" : " - registro do ano"}`
          : "Cadastre foto/modelo em Configurações > Uniformes"
      }));
    }
    if (title === "Títulos") {
      return selectedSummary
        ? [{ title: `Temporada ${selectedAreaYear}`, main: `${selectedSummary.sports.finishedGames} jogos finalizados`, detail: "Títulos oficiais entram aqui quando o módulo de títulos for conectado." }]
        : [];
    }
    return selectedSummary
      ? [{ title: String(selectedAreaYear), main: `${selectedSummary.sports.games} jogos`, detail: `${formatCurrency(selectedSummary.finance.balanceCents)} de saldo histórico` }]
      : [];
  })();

  return (
    <SectionShell
      eyebrow="Acervo"
      title={title}
      description="Acervo histórico alimentado pelos jogos, estatísticas, financeiro, presidentes, diretorias e camisas já registradas."
      icon={icon}
      action={<Link className="rounded-lg bg-[#08255b] px-4 py-2 text-sm font-black text-white shadow-sm hover:bg-[#0b3278]" to={title === "Presidentes e Diretorias" ? "/diretoria" : title === "Camisas Históricas" ? "/configuracoes?aba=uniforms" : "/historico"}>{primaryAction}</Link>}
    >
      <MetricGrid
        metrics={[
          { label: "Itens do ano", value: String(rows.length), hint: String(selectedAreaYear) },
          { label: "Anos no arquivo", value: String(availableYears.length), hint: "Linha do tempo" },
          { label: "Presidentes", value: String(presidents.length), hint: "Diretorias registradas" }
        ]}
      />

      <article className="min-w-0 rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem] sm:items-start">
          <div className="min-w-0">
            <h2 className="text-lg font-black text-slate-950">Linha do tempo de {title}</h2>
            <p className="text-sm font-semibold text-slate-500">Selecione o ano para filtrar esta área do Acervo do Clube.</p>
          </div>
          <label className="w-full text-sm font-bold text-slate-600">
            Ano
            <select className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-black text-slate-950" value={selectedAreaYear} onChange={(event) => setSelectedAreaYear(Number(event.target.value) || currentYear)}>
              {availableYears.map((year) => <option key={`area-year-option-${title}-${year}`} value={year}>{year}</option>)}
            </select>
          </label>
        </div>

        <div className="mt-4 grid max-h-[15rem] gap-2 overflow-y-auto pr-1" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(10.5rem, 1fr))" }}>
          {availableYears.map((year) => {
            const summary = yearClosures.find((item) => item.year === year);
            const games = gameResults.find((item) => item.year === year)?.games.length ?? summary?.sports.games ?? 0;
            const scorers = scoringByYear.find((item) => item.year === year)?.topScorers.length ?? 0;
            const boardCount = boardTerms.filter((term) => term.startedYear <= year && (term.endedYear ?? year) >= year).length;
            const uniformCount = uniformHistory.filter((uniform) => uniform.seasonYear === year || uniform.seasonLabel.includes(String(year))).length;
            const active = year === selectedAreaYear;
            return (
              <button
                key={`area-timeline-${title}-${year}`}
                type="button"
                className={`min-h-[7.25rem] min-w-0 rounded-lg border px-3 py-2 text-left transition ${active ? "border-red-500 bg-red-50 text-red-700" : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-white"}`}
                onClick={() => setSelectedAreaYear(year)}
              >
                <strong className="block text-lg font-black">{year}</strong>
                <span className="mt-1 block text-xs font-bold">{games} jogos</span>
                <span className="block text-xs font-bold">{scorers} atleta(s)</span>
                <span className="block text-xs font-bold">{boardCount} diretoria · {uniformCount} camisa(s)</span>
              </button>
            );
          })}
        </div>
      </article>

      <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.08em] text-slate-500">
              <tr><th className="px-4 py-3">Registro</th><th className="px-4 py-3">Marco</th><th className="px-4 py-3">Detalhe</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={`${row.title}-${row.main}`}>
                  <td className="px-4 py-3 font-black text-slate-950">{row.title}</td>
                  <td className="px-4 py-3 font-semibold text-slate-700">{row.main}</td>
                  <td className="px-4 py-3 font-semibold text-slate-500">{row.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!archiveQuery.isLoading && rows.length === 0 ? <p className="p-4 text-sm font-semibold text-slate-500">Sem registros para esta área do acervo em {selectedAreaYear}.</p> : null}
        </div>
      </article>
    </SectionShell>
  );
}
