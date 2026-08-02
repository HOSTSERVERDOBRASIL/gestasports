import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  CircleOff,
  Clock,
  FileText,
  History,
  Mail,
  MessageSquare,
  Pencil,
  Phone,
  Trophy,
  User,
  UserPlus,
  Wallet
} from "lucide-react";
import { apiRequest } from "../../services/api";
import type { Associate, AssociateStatus, AthletePosition, AthleteStatus, MonthlyFeePayment, PaymentStatus } from "../../types/domain";

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((cents || 0) / 100);
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(iso));
}

function formatMonthYear(month: number, year: number) {
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
}

function getInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

const statusLabel: Record<AssociateStatus, string> = {
  ACTIVE: "Ativo",
  LATE: "Atrasado",
  INACTIVE: "Inativo"
};

const statusBadge: Record<AssociateStatus, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  LATE: "bg-amber-50 text-amber-700 border-amber-200",
  INACTIVE: "bg-slate-100 text-slate-600 border-slate-200"
};

const paymentStatusLabel: Record<PaymentStatus, string> = {
  PAID: "Pago",
  PENDING: "Pendente",
  LATE: "Atrasado"
};

const paymentStatusBadge: Record<PaymentStatus, string> = {
  PAID: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  LATE: "bg-red-50 text-red-700 border-red-200"
};

type Tab = "resumo" | "financeiro" | "historico" | "mensagens" | "logs";

const tabs: Array<{ id: Tab; label: string; icon: typeof User }> = [
  { id: "resumo", label: "Resumo", icon: User },
  { id: "financeiro", label: "Financeiro", icon: Wallet },
  { id: "historico", label: "Histórico", icon: History },
  { id: "mensagens", label: "Mensagens", icon: MessageSquare },
  { id: "logs", label: "Logs", icon: FileText }
];

export function AssociateProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("resumo");

  const associateQuery = useQuery({
    queryKey: ["associate", id],
    queryFn: () => apiRequest<Associate>(`/associates/${id}`),
    enabled: Boolean(id)
  });

  const paymentsQuery = useQuery({
    queryKey: ["associate-payments", id],
    queryFn: () => apiRequest<MonthlyFeePayment[]>(`/finance/monthly-fees?associateId=${id}&limit=24`),
    enabled: Boolean(id) && activeTab === "financeiro"
  });

  const quickStatusMutation = useMutation({
    mutationFn: (status: AssociateStatus) =>
      apiRequest<Associate>(`/associates/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["associate", id] });
      void queryClient.invalidateQueries({ queryKey: ["associates"] });
    }
  });

  const promoteMutation = useMutation({
    mutationFn: (associate: Associate) =>
      apiRequest("/athletes", {
        method: "POST",
        body: JSON.stringify({
          name: associate.name,
          position: "CENTRAL_MIDFIELDER" as AthletePosition,
          linkType: "ASSOCIATE",
          status: (associate.status === "ACTIVE" ? "ACTIVE" : "DELINQUENT") as AthleteStatus,
          rating: 3,
          associateId: associate.id
        })
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["associate", id] });
      void queryClient.invalidateQueries({ queryKey: ["associates"] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest<void>(`/associates/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["associates"] });
      navigate("/associados");
    }
  });

  const associate = associateQuery.data;

  if (associateQuery.isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-32 animate-pulse rounded-lg bg-slate-200" />
        <div className="h-36 animate-pulse rounded-lg bg-slate-200" />
      </div>
    );
  }

  if (!associate) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center">
        <p className="text-sm font-black text-slate-700">Associado não encontrado</p>
        <Link to="/associados" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:underline">
          <ArrowLeft size={14} /> Voltar para lista
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
        <Link to="/pessoas" className="hover:text-slate-700">Pessoas</Link>
        <ChevronRight size={12} />
        <Link to="/associados" className="hover:text-slate-700">Associados</Link>
        <ChevronRight size={12} />
        <span className="text-slate-950">{associate.name}</span>
      </nav>

      {/* Cabeçalho do perfil */}
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="grid size-16 shrink-0 place-items-center rounded-full bg-slate-100 text-xl font-black text-slate-700 ring-2 ring-slate-200">
              {getInitials(associate.name)}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-black text-slate-950">{associate.name}</h1>
                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-black ${statusBadge[associate.status]}`}>
                  {statusLabel[associate.status]}
                </span>
                {associate.boardRole && !associate.boardRole.isDefault && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                    {associate.boardRole.name}
                  </span>
                )}
                {associate.athlete && (
                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-black text-blue-700 border border-blue-200">
                    Atleta
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                {associate.email && (
                  <span className="flex items-center gap-1"><Mail size={13} />{associate.email}</span>
                )}
                {associate.phone && (
                  <span className="flex items-center gap-1"><Phone size={13} />{associate.phone}</span>
                )}
                {associate.joinedAt && (
                  <span className="flex items-center gap-1"><Clock size={13} />Desde {formatDate(associate.joinedAt)}</span>
                )}
              </div>
            </div>
          </div>

          {/* Ações */}
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={`/associados/${associate.id}/editar`}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
            >
              <Pencil size={14} /> Editar
            </Link>
            {!associate.athlete && (
              <button
                type="button"
                disabled={promoteMutation.isPending}
                onClick={() => void promoteMutation.mutateAsync(associate)}
                className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-black text-blue-700 hover:bg-blue-100 disabled:opacity-60"
              >
                <UserPlus size={14} /> Tornar atleta
              </button>
            )}
            {associate.athlete && (
              <Link
                to={`/atletas/${associate.athlete.id}/perfil`}
                className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-black text-blue-700 hover:bg-blue-100"
              >
                <Trophy size={14} /> Ver perfil atleta
              </Link>
            )}
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Excluir ${associate.name}? Esta ação não pode ser desfeita.`)) {
                  void deleteMutation.mutateAsync();
                }
              }}
              disabled={deleteMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-black text-red-700 hover:bg-red-100 disabled:opacity-60"
            >
              Excluir
            </button>
          </div>
        </div>

        {/* Métricas rápidas */}
        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-4">
          <div>
            <p className="text-xs font-semibold text-slate-500">Mensalidade</p>
            <strong className="text-lg font-black text-slate-950">{formatCurrency(associate.monthlyFeeCents)}</strong>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Situação</p>
            <strong className={`text-lg font-black ${associate.status === "ACTIVE" ? "text-emerald-700" : associate.status === "LATE" ? "text-amber-700" : "text-slate-600"}`}>
              {statusLabel[associate.status]}
            </strong>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Função</p>
            <strong className="text-lg font-black text-slate-950">{associate.boardRole?.name ?? "Membro"}</strong>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Elenco</p>
            <strong className="text-lg font-black text-slate-950">{associate.athlete ? "Atleta" : "Não vinculado"}</strong>
          </div>
        </div>
      </div>

      {/* Abas */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex overflow-x-auto border-b border-slate-200">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-black transition ${
                  activeTab === tab.id
                    ? "border-red-600 text-red-700"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-5">
          {/* Aba: Resumo */}
          {activeTab === "resumo" && (
            <div className="space-y-5">
              <div className="grid gap-5 lg:grid-cols-2">
                {/* Dados pessoais */}
                <section>
                  <h2 className="mb-3 text-xs font-black uppercase tracking-widest text-slate-500">Dados pessoais</h2>
                  <div className="space-y-2 rounded-lg border border-slate-200 p-4">
                    {[
                      { label: "Nome completo", value: associate.name },
                      { label: "Email", value: associate.email ?? "—" },
                      { label: "Telefone", value: associate.phone ?? "—" },
                      { label: "Membro desde", value: associate.joinedAt ? formatDate(associate.joinedAt) : "—" },
                      { label: "Cadastrado em", value: formatDate(associate.createdAt) }
                    ].map((row) => (
                      <div key={row.label} className="flex items-start justify-between gap-4 py-1.5 border-b border-slate-100 last:border-0">
                        <span className="text-xs font-semibold text-slate-500 shrink-0">{row.label}</span>
                        <span className="text-xs font-black text-slate-950 text-right">{row.value}</span>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Vínculo no clube */}
                <section>
                  <h2 className="mb-3 text-xs font-black uppercase tracking-widest text-slate-500">Vínculo no clube</h2>
                  <div className="space-y-2 rounded-lg border border-slate-200 p-4">
                    {[
                      { label: "Situação", value: statusLabel[associate.status] },
                      { label: "Função", value: associate.boardRole?.name ?? "Membro" },
                      { label: "Acesso admin", value: associate.boardRole?.canAccessAdmin ? "Sim" : "Não" },
                      { label: "Acesso financeiro", value: associate.boardRole?.canAccessFinancial ? "Sim" : "Não" },
                      { label: "Elenco atleta", value: associate.athlete ? "Vinculado" : "Não vinculado" }
                    ].map((row) => (
                      <div key={row.label} className="flex items-start justify-between gap-4 py-1.5 border-b border-slate-100 last:border-0">
                        <span className="text-xs font-semibold text-slate-500 shrink-0">{row.label}</span>
                        <span className="text-xs font-black text-slate-950 text-right">{row.value}</span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              {/* Alterar status rápido */}
              <section>
                <h2 className="mb-3 text-xs font-black uppercase tracking-widest text-slate-500">Alterar situação</h2>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={quickStatusMutation.isPending || associate.status === "ACTIVE"}
                    onClick={() => void quickStatusMutation.mutateAsync("ACTIVE")}
                    className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-700 hover:bg-emerald-100 disabled:opacity-40"
                  >
                    <CheckCircle2 size={14} /> Marcar ativo
                  </button>
                  <button
                    type="button"
                    disabled={quickStatusMutation.isPending || associate.status === "LATE"}
                    onClick={() => void quickStatusMutation.mutateAsync("LATE")}
                    className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-black text-amber-700 hover:bg-amber-100 disabled:opacity-40"
                  >
                    <AlertTriangle size={14} /> Marcar atrasado
                  </button>
                  <button
                    type="button"
                    disabled={quickStatusMutation.isPending || associate.status === "INACTIVE"}
                    onClick={() => void quickStatusMutation.mutateAsync("INACTIVE")}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                  >
                    <CircleOff size={14} /> Marcar inativo
                  </button>
                </div>
              </section>
            </div>
          )}

          {/* Aba: Financeiro */}
          {activeTab === "financeiro" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-black text-slate-950">Mensalidades</h2>
                  <p className="text-xs font-semibold text-slate-500">Histórico de cobranças dos últimos 24 meses</p>
                </div>
                <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-black text-slate-950">
                  {formatCurrency(associate.monthlyFeeCents)}/mês
                </span>
              </div>

              {paymentsQuery.isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
                  ))}
                </div>
              ) : !paymentsQuery.data || paymentsQuery.data.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 px-4 py-10 text-center">
                  <p className="text-sm font-black text-slate-600">Nenhuma cobrança encontrada</p>
                  <p className="mt-1 text-xs font-semibold text-slate-400">
                    As mensalidades aparecerão aqui após a geração mensal
                  </p>
                  <Link to="/financeiro?area=COBRANCA" className="mt-3 inline-flex items-center gap-1 text-xs font-black text-slate-600 hover:underline">
                    Ir para cobrança <ChevronRight size={11} />
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-2.5">Período</th>
                        <th className="px-4 py-2.5">Vencimento</th>
                        <th className="px-4 py-2.5 text-right">Valor</th>
                        <th className="px-4 py-2.5">Pago em</th>
                        <th className="px-4 py-2.5">Situação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paymentsQuery.data.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="px-4 py-2.5 font-semibold text-slate-950">{formatMonthYear(p.month, p.year)}</td>
                          <td className="px-4 py-2.5 text-slate-600">{formatDate(p.dueDate)}</td>
                          <td className="px-4 py-2.5 text-right font-black text-slate-950">{formatCurrency(p.amountCents)}</td>
                          <td className="px-4 py-2.5 text-slate-600">{p.paidAt ? formatDate(p.paidAt) : "—"}</td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-black ${paymentStatusBadge[p.status]}`}>
                              {paymentStatusLabel[p.status]}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Aba: Histórico */}
          {activeTab === "historico" && (
            <div className="space-y-3">
              <h2 className="text-sm font-black text-slate-950">Histórico de alterações</h2>
              <div className="space-y-2">
                <div className="flex items-start gap-3 rounded-lg border border-slate-200 p-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600">
                    <Clock size={13} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-slate-950">Cadastro criado</p>
                    <p className="text-xs font-semibold text-slate-500">{formatDate(associate.createdAt)}</p>
                  </div>
                </div>
                {associate.joinedAt && associate.joinedAt !== associate.createdAt && (
                  <div className="flex items-start gap-3 rounded-lg border border-slate-200 p-3">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                      <CheckCircle2 size={13} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-950">Tornou-se membro</p>
                      <p className="text-xs font-semibold text-slate-500">{formatDate(associate.joinedAt)}</p>
                    </div>
                  </div>
                )}
                {associate.athlete && (
                  <div className="flex items-start gap-3 rounded-lg border border-slate-200 p-3">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-600">
                      <Trophy size={13} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-950">Vinculado ao elenco</p>
                      <p className="text-xs font-semibold text-slate-500">Atleta ativo no clube</p>
                    </div>
                  </div>
                )}
                <p className="pt-2 text-xs font-semibold text-slate-400">
                  Histórico detalhado disponível em Logs de Auditoria.
                </p>
              </div>
            </div>
          )}

          {/* Aba: Mensagens */}
          {activeTab === "mensagens" && (
            <div className="space-y-3">
              <h2 className="text-sm font-black text-slate-950">Comunicação</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {associate.email && (
                  <a
                    href={`mailto:${associate.email}`}
                    className="flex items-center gap-3 rounded-lg border border-slate-200 p-4 hover:bg-slate-50"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-700">
                      <Mail size={16} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-950">Enviar email</p>
                      <p className="truncate text-xs font-semibold text-slate-500">{associate.email}</p>
                    </div>
                  </a>
                )}
                {associate.phone && (
                  <a
                    href={`tel:${associate.phone}`}
                    className="flex items-center gap-3 rounded-lg border border-slate-200 p-4 hover:bg-slate-50"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-700">
                      <Phone size={16} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-950">Ligar</p>
                      <p className="truncate text-xs font-semibold text-slate-500">{associate.phone}</p>
                    </div>
                  </a>
                )}
                {associate.phone && (
                  <a
                    href={`https://wa.me/55${associate.phone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 hover:bg-emerald-100"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
                      <MessageSquare size={16} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-emerald-900">WhatsApp</p>
                      <p className="truncate text-xs font-semibold text-emerald-700">{associate.phone}</p>
                    </div>
                  </a>
                )}
              </div>
              {!associate.email && !associate.phone && (
                <div className="rounded-lg border border-dashed border-slate-300 px-4 py-10 text-center">
                  <p className="text-sm font-black text-slate-600">Sem dados de contato</p>
                  <Link to={`/associados/${associate.id}/editar`} className="mt-2 inline-flex items-center gap-1 text-xs font-black text-slate-600 hover:underline">
                    Adicionar contato <ChevronRight size={11} />
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Aba: Logs */}
          {activeTab === "logs" && (
            <div className="space-y-3">
              <h2 className="text-sm font-black text-slate-950">Logs de auditoria</h2>
              <p className="text-xs font-semibold text-slate-500">
                Registro completo de ações relacionadas a este associado.
              </p>
              <Link
                to={`/auditoria?targetId=${associate.id}`}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                <FileText size={14} /> Ver trilha de auditoria completa
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
