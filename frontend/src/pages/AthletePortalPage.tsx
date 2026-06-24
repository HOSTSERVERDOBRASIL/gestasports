/* eslint-disable no-useless-assignment */
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import {
  Activity,
  Camera,
  CalendarDays,
  CheckCircle2,
  CircleCheck,
  Clock3,
  Copy,
  CreditCard,
  LogOut,
  MailCheck,
  MapPin,
  Medal,
  QrCode,
  Shirt,
  Target,
  Trophy,
  UserPlus,
  Users
} from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiRequest } from "../services/api";
import { PixCheckoutModal } from "../components/ui/PixCheckoutModal";
import { DashboardWidget, DashboardWidgetGrid, EnterpriseStatCard, PageTemplate } from "../components/ui/EnterpriseUI";
import { getTenantBasename } from "../utils/tenantPath";
import type { AssociateStatus, AthleteMedicalStatus, AthleteSelfCheckoutResponse, AthleteSelfOverview, AuthUser, JoinRequest, LineupRole, TeamSide, UserRole } from "../types/domain";
import { useAuth } from "../hooks/useAuth";
import { useTenantTheme } from "../context/TenantThemeContext";

const roleLabels: Record<UserRole, string> = {
  SUPERADMIN: "Superadmin",
  ADMIN: "Administrador",
  SPORTS_DIRECTOR: "Diretor de esportes",
  ASSOCIATE: "Associado",
  ATHLETE: "Atleta",
  FINANCIAL: "Financeiro"
};

const paymentStatusLabels: Record<string, string> = {
  PAID: "Pago",
  PENDING: "Pendente",
  LATE: "Em atraso",
  OVERDUE: "Vencido",
  CANCELED: "Cancelado"
};

const associateStatusLabels: Record<AssociateStatus, string> = {
  ACTIVE: "Ativo",
  LATE: "Em atraso",
  INACTIVE: "Inativo"
};

const sideLabels: Record<TeamSide, string> = {
  RED: "Time A",
  WHITE: "Time B",
  EXTERNAL: "Adversário"
};

const roleGameLabels: Record<LineupRole, string> = {
  GOALKEEPER: "Goleiro",
  STARTER: "Titular",
  RESERVE: "Banco",
  ABSENT: "Ausente"
};

const arrivalStatusLabels = {
  ON_TIME: "Chego no horário",
  LATE: "Vou chegar atrasado",
  NEEDS_RIDE: "Preciso de carona",
  UNAVAILABLE: "Não vou"
} as const;

const positionLabels: Record<string, string> = {
  GOALKEEPER: "Goleiro",
  DEFENDER: "Zagueiro",
  FULLBACK: "Lateral",
  MIDFIELDER: "Meio-campo",
  FORWARD: "Atacante",
  LINE: "Linha",
  BOTH: "Linha/Gol",
  RIGHT_BACK: "Lateral direito",
  LEFT_BACK: "Lateral esquerdo",
  DEFENSIVE_MIDFIELDER: "Volante",
  CENTRAL_MIDFIELDER: "Meia central",
  ATTACKING_MIDFIELDER: "Meia atacante",
  RIGHT_WINGER: "Ponta direita",
  LEFT_WINGER: "Ponta esquerda",
  STRIKER: "Centroavante"
};

const medicalStatusLabels: Record<AthleteMedicalStatus, string> = {
  CLEARED: "Liberado",
  OBSERVATION: "Em observação",
  INJURED: "Vetado por lesão",
  TREATMENT: "Em tratamento"
};

function formatRoleList(roles: UserRole[] | undefined, fallback: UserRole | undefined) {
  if (roles && roles.length > 0) return roles.map((role) => roleLabels[role] ?? role).join(", ");
  return fallback ? (roleLabels[fallback] ?? fallback) : "-";
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((cents || 0) / 100);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function StatCard({ label, value, icon, helper }: { label: string; value: string | number; icon: ReactNode; helper?: string }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-red-200 hover:shadow-[0_14px_28px_rgba(15,23,42,0.08)]">
      <div className="flex items-center justify-between gap-3">
        <span className="grid size-11 place-items-center rounded-lg bg-red-50 text-red-600">{icon}</span>
        <p className="truncate text-xs font-black text-slate-500">{label}</p>
      </div>
      <strong className="mt-3 block truncate text-3xl font-black leading-none text-slate-950">{value}</strong>
      {helper ? <span className="mt-2 block truncate text-xs font-bold text-slate-500">{helper}</span> : null}
    </article>
  );
}

function PortalMenu({ items, onSelect }: { items: Array<{ id: string; label: string; helper: string; icon: ReactNode }>; onSelect: (id: string) => void }) {
  return (
    <article className="sticky top-3 z-10 rounded-lg border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur">
      <div className="flex gap-1 overflow-x-auto">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-left text-sm font-black text-slate-600 hover:bg-red-50 hover:text-red-700"
            onClick={() => onSelect(item.id)}
          >
            {item.icon}
            <span className="truncate">{item.label}</span>
          </button>
        ))}
      </div>
    </article>
  );
}

function RankingList({ title, rows, suffix = "" }: { title: string; rows: AthleteSelfOverview["ranking"]["topGoals"]; suffix?: string }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-black uppercase tracking-[0.08em] text-slate-500">{title}</h3>
      <div className="mt-3 space-y-2">
        {rows.length > 0 ? rows.map((row) => (
          <div key={`${title}-${row.athleteId}`} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
            <span className="min-w-0 truncate text-sm font-bold text-slate-900">#{row.rank} {row.name}</span>
            <strong className="text-sm text-red-600">{row.value}{suffix}</strong>
          </div>
        )) : <p className="text-sm text-slate-500">Sem ranking ainda.</p>}
      </div>
    </article>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function AssociateOnlyPortal({
  user,
  overview,
  currentPayment,
  checkout,
  pixCheckoutModalOpen,
  checkoutPending,
  onOpenPix,
  onRefreshPix,
  onClosePix,
  onCopyPix,
  onLogout
}: {
  user: AuthUser;
  overview: AthleteSelfOverview;
  currentPayment: AthleteSelfOverview["currentPayment"];
  checkout: AthleteSelfCheckoutResponse["checkout"] | null;
  pixCheckoutModalOpen: boolean;
  checkoutPending: boolean;
  onOpenPix: () => void;
  onRefreshPix: () => void;
  onClosePix: () => void;
  onCopyPix: () => void;
  onLogout: () => void;
}) {
  const isPaid = currentPayment.status === "PAID";
  const nextDueDate = currentPayment.dueDate ? new Date(currentPayment.dueDate).toLocaleDateString("pt-BR") : "-";
  const associatePortalMenu = [
    { id: "associado-inicio", label: "Inicio", helper: "Seu resumo", icon: <Users size={17} /> },
    { id: "associado-financeiro", label: "Pagamentos", helper: "Mensalidade e Pix", icon: <CreditCard size={17} /> },
    { id: "associado-dados", label: "Meus dados", helper: "Contato e acesso", icon: <MailCheck size={17} /> },
    { id: "associado-historico", label: "Historico", helper: "Pagamentos do ano", icon: <Clock3 size={17} /> }
  ];

  function scrollToAssociateSection(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section className="space-y-4">
      {checkout ? (
        <PixCheckoutModal
          open={pixCheckoutModalOpen}
          payerName={overview.associate.name ?? user.name ?? "Associado"}
          reference={`${String(overview.period.month).padStart(2, "0")}/${overview.period.year}`}
          amount={formatCurrency(currentPayment.amountCents ?? overview.associate.monthlyFeeCents)}
          dueDate={nextDueDate}
          status={paymentStatusLabels[currentPayment.status ?? "PENDING"] ?? "Pendente"}
          statusTone={currentPayment.status === "PAID" ? "paid" : "unpaid"}
          description="Mensalidade do clube"
          txid={checkout.txid}
          pixCopyPaste={checkout.pixCopyPaste}
          qrCodeDataUrl={checkout.qrCodeDataUrl}
          expiresAt={checkout.expiresAt}
          autoSettleSeconds={checkout.autoSettleSeconds}
          onRefresh={onRefreshPix}
          onClose={onClosePix}
        />
      ) : null}

      <article id="associado-inicio" className="scroll-mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-stretch">
          <div className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
            <span className="grid size-24 shrink-0 place-items-center rounded-full bg-red-600 text-2xl font-black text-white ring-4 ring-red-50">
              {initials(overview.associate.name ?? user.name ?? "Associado")}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black uppercase tracking-[0.08em] text-red-700">Associado</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-[0.08em] text-slate-600">{overview.membership.tenureLabel}</span>
                <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.08em] ${overview.associate.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : overview.associate.status === "LATE" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                  {associateStatusLabels[overview.associate.status]}
                </span>
              </div>
              <h1 className="mt-4 truncate text-3xl font-black leading-tight text-slate-950 sm:text-4xl">{overview.associate.name ?? user.name ?? "Associado"}</h1>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
                Perfil social e financeiro do associado. Quando houver vínculo esportivo, esta conta passa a mostrar escalações, estatísticas e saúde do atleta.
              </p>
            </div>
          </div>

          <div className="grid content-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Próxima ação</p>
              <h2 className="mt-2 text-xl font-black text-slate-950">{isPaid ? "Conta em dia" : "Regularizar mensalidade"}</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {isPaid ? "Mensalidade quitada para o período atual." : `Vencimento em ${nextDueDate}.`}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {!isPaid ? (
                <button type="button" className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-3 py-3 text-xs font-black text-white hover:bg-red-700 disabled:opacity-60" disabled={checkoutPending} onClick={onOpenPix}>
                  <QrCode size={15} />
                  Pix
                </button>
              ) : (
                <span className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-xs font-black text-emerald-700">
                  <CircleCheck size={15} />
                  Pago
                </span>
              )}
              <button onClick={onLogout} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-3 text-xs font-black text-slate-700 hover:bg-slate-100">
                <LogOut size={15} /> Sair
              </button>
            </div>
          </div>
        </div>
      </article>

      <PortalMenu items={associatePortalMenu} onSelect={scrollToAssociateSection} />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Mensalidade" value={formatCurrency(currentPayment.amountCents ?? overview.associate.monthlyFeeCents)} icon={<CreditCard size={18} />} />
        <StatCard label="Status" value={paymentStatusLabels[currentPayment.status ?? "PENDING"] ?? "Pendente"} icon={<CircleCheck size={18} />} />
        <StatCard label="Adimplência" value={`${overview.insights.adimplenciaPercent}%`} icon={<Medal size={18} />} />
        <StatCard label="Tempo de casa" value={overview.membership.tenureLabel} icon={<CalendarDays size={18} />} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.8fr)]">
        <article id="associado-dados" className="scroll-mt-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">Dados do associado</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div><p className="text-xs uppercase text-slate-500">Email</p><p className="truncate text-sm font-semibold text-slate-900">{overview.associate.email ?? user.email ?? "-"}</p></div>
            <div><p className="text-xs uppercase text-slate-500">Telefone</p><p className="text-sm font-semibold text-slate-900">{overview.associate.phone ?? "-"}</p></div>
            <div><p className="text-xs uppercase text-slate-500">Perfis de acesso</p><p className="text-sm font-semibold text-slate-900">{formatRoleList(user.roles, user.role)}</p></div>
            <div><p className="text-xs uppercase text-slate-500">Entrada</p><p className="text-sm font-semibold text-slate-900">{new Date(overview.membership.joinedAt).toLocaleDateString("pt-BR")}</p></div>
          </div>
          <div className="mt-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
            <p className="text-sm font-semibold leading-6 text-slate-600">
              Este é o perfil correto para quem participa como associado, diretor, apoiador ou membro social sem estar disponível para jogos.
            </p>
          </div>
        </article>

        <article id="associado-financeiro" className="scroll-mt-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">Financeiro atual</h2>
          <div className="mt-4 grid gap-3">
            <div className="rounded-lg border border-slate-200 p-3"><p className="text-xs uppercase text-slate-500">Mensalidade</p><p className="text-2xl font-black text-slate-950">{formatCurrency(currentPayment.amountCents ?? overview.associate.monthlyFeeCents)}</p></div>
            <div className="rounded-lg border border-slate-200 p-3"><p className="text-xs uppercase text-slate-500">Vencimento</p><p className="text-xl font-bold text-slate-950">{nextDueDate}</p></div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-slate-200 p-3"><p className="text-xs uppercase text-slate-500">Pagos</p><p className="text-lg font-black text-slate-950">{overview.financeSummary.paidCount}</p></div>
              <div className="rounded-lg border border-slate-200 p-3"><p className="text-xs uppercase text-slate-500">Pend.</p><p className="text-lg font-black text-slate-950">{overview.financeSummary.pendingCount}</p></div>
              <div className="rounded-lg border border-slate-200 p-3"><p className="text-xs uppercase text-slate-500">Atraso</p><p className="text-lg font-black text-slate-950">{overview.financeSummary.lateCount}</p></div>
            </div>
          </div>
          {!isPaid ? (
            <button type="button" className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 font-semibold text-white hover:bg-red-700 disabled:opacity-60" disabled={checkoutPending} onClick={onOpenPix}>
              <QrCode size={18} /> {checkoutPending ? "Gerando QR..." : "Gerar Pix"}
            </button>
          ) : (
            <div className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700"><CircleCheck size={16} /> Mensalidade quitada</div>
          )}
        </article>
      </div>

      {checkout ? (
        <article id="associado-pix" className="scroll-mt-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-bold text-slate-950">QR Code Pix</h3>
          <div className="mt-3 grid gap-3 lg:grid-cols-[200px,1fr]">
            <img src={checkout.qrCodeDataUrl} alt="QR Code Pix" className="size-48 rounded-lg border border-slate-200 bg-white p-2" />
            <div>
              <textarea readOnly value={checkout.pixCopyPaste} className="min-h-28 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-700" />
              <button type="button" className="mt-2 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={onCopyPix}><Copy size={16} />Copiar código Pix</button>
            </div>
          </div>
        </article>
      ) : null}

      <article id="associado-historico" className="scroll-mt-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-950">Historico do associado</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">Resumo do vinculo, adimplencia e pagamentos recentes.</p>
          </div>
          <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-600">{overview.membership.tenureLabel}</span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-black uppercase text-slate-500">Entrada</p>
            <p className="mt-1 text-lg font-black text-slate-950">{new Date(overview.membership.joinedAt).toLocaleDateString("pt-BR")}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-black uppercase text-slate-500">Adimplencia</p>
            <p className="mt-1 text-lg font-black text-slate-950">{overview.insights.adimplenciaPercent}%</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-black uppercase text-slate-500">Pago no ano</p>
            <p className="mt-1 text-lg font-black text-slate-950">{formatCurrency(overview.financeSummary.paidCentsInYear)}</p>
          </div>
        </div>
        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
          {overview.recentPayments.length > 0 ? overview.recentPayments.slice(0, 6).map((paymentItem) => (
            <div key={paymentItem.id} className="grid gap-2 border-b border-slate-100 px-3 py-3 text-sm last:border-b-0 sm:grid-cols-[minmax(0,1fr)_8rem_8rem] sm:items-center">
              <span className="font-black text-slate-950">{String(paymentItem.month).padStart(2, "0")}/{paymentItem.year}</span>
              <span className="font-semibold text-slate-600">{formatCurrency(paymentItem.amountCents)}</span>
              <span className={paymentItem.status === "PAID" ? "font-black text-emerald-700" : paymentItem.status === "LATE" ? "font-black text-red-700" : "font-black text-amber-700"}>
                {paymentStatusLabels[paymentItem.status] ?? paymentItem.status}
              </span>
            </div>
          )) : <p className="p-4 text-sm font-semibold text-slate-500">Nenhum pagamento recente encontrado.</p>}
        </div>
      </article>
    </section>
  );
}

export function AthletePortalPage() {
  const location = useLocation();
  const { user, activeRole, logout } = useAuth();
  const tenantTheme = useTenantTheme();
  const hasAthleteProfile = Boolean(user?.roles.includes("ATHLETE"));
  const isAthleteContext = hasAthleteProfile && (activeRole === "ATHLETE" || !activeRole);
  const queryClient = useQueryClient();
  const [checkout, setCheckout] = useState<AthleteSelfCheckoutResponse["checkout"] | null>(null);
  const [pixCheckoutModalOpen, setPixCheckoutModalOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [photoError, setPhotoError] = useState("");
  const [confirmationForm, setConfirmationForm] = useState({
    arrivalStatus: "ON_TIME" as keyof typeof arrivalStatusLabels,
    confirmationNote: ""
  });
  const [medicalForm, setMedicalForm] = useState({
    medicalStatus: "CLEARED" as AthleteMedicalStatus,
    medicalNote: "",
    medicalReturnDate: ""
  });

  const now = useMemo(() => {
    const date = new Date();
    return { month: date.getUTCMonth() + 1, year: date.getUTCFullYear() };
  }, []);

  const overviewQuery = useQuery({
    queryKey: ["athlete-self-overview", now.month, now.year],
    queryFn: () => apiRequest<AthleteSelfOverview>(`/athlete/me?month=${now.month}&year=${now.year}`),
    enabled: isAthleteContext
  });

  const currentPaymentQuery = useQuery({
    queryKey: ["athlete-self-current-payment", now.month, now.year],
    queryFn: () => apiRequest<{ payment: AthleteSelfOverview["currentPayment"] }>(`/athlete/me/payments/current?month=${now.month}&year=${now.year}`),
    refetchInterval: 4000,
    enabled: isAthleteContext
  });

  const joinRequestsQuery = useQuery({
    queryKey: ["athlete-my-join-requests"],
    queryFn: () => apiRequest<JoinRequest[]>("/group/my-join-requests"),
    enabled: isAthleteContext
  });

  const checkoutMutation = useMutation({
    mutationFn: () => apiRequest<AthleteSelfCheckoutResponse>(`/athlete/me/payments/current/checkout?month=${now.month}&year=${now.year}`, { method: "POST" }),
    onSuccess: async (response) => {
      setCheckout(response.checkout);
      if (response.checkout) {
        setPixCheckoutModalOpen(true);
      }
      await queryClient.invalidateQueries({ queryKey: ["athlete-self-current-payment"] });
      await queryClient.invalidateQueries({ queryKey: ["athlete-self-overview"] });
    }
  });

  const presenceMutation = useMutation({
    mutationFn: ({ lineupId, presence, arrivalStatus, confirmationNote }: { lineupId: string; presence: boolean; arrivalStatus: keyof typeof arrivalStatusLabels; confirmationNote: string }) =>
      apiRequest(`/athlete/me/lineups/${lineupId}/presence`, {
        method: "PATCH",
        body: JSON.stringify({ presence, arrivalStatus, confirmationNote })
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["athlete-self-overview"] });
    }
  });

  const photoMutation = useMutation({
    mutationFn: (photoUrl: string) =>
      apiRequest<{ id: string; photoUrl: string | null }>("/athlete/me/photo", {
        method: "PATCH",
        body: JSON.stringify({ photoUrl })
      }),
    onSuccess: async () => {
      setPhotoError("");
      await queryClient.invalidateQueries({ queryKey: ["athlete-self-overview"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
    onError: (error) => {
      setPhotoError(error instanceof Error ? error.message : "Não foi possível atualizar a foto.");
    }
  });

  const medicalMutation = useMutation({
    mutationFn: () =>
      apiRequest("/athlete/me/medical", {
        method: "PATCH",
        body: JSON.stringify({
          medicalStatus: medicalForm.medicalStatus,
          medicalNote: medicalForm.medicalNote,
          medicalReturnDate: medicalForm.medicalReturnDate ? new Date(`${medicalForm.medicalReturnDate}T12:00:00`).toISOString() : null
        })
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["athlete-self-overview"] });
      await queryClient.invalidateQueries({ queryKey: ["athletes"] });
    }
  });

  const inviteMutation = useMutation({
    mutationFn: () =>
      apiRequest<JoinRequest>("/group/join-requests", {
        method: "POST",
        body: JSON.stringify({
          name: inviteForm.name,
          email: inviteForm.email,
          ...(inviteForm.phone ? { phone: inviteForm.phone } : {}),
          ...(inviteForm.message ? { message: inviteForm.message } : {})
        })
      }),
    onSuccess: async () => {
      setInviteForm({ name: "", email: "", phone: "", message: "" });
      await queryClient.invalidateQueries({ queryKey: ["athlete-my-join-requests"] });
    }
  });

  async function copyPixCode() {
    if (checkout?.pixCopyPaste) await navigator.clipboard.writeText(checkout.pixCopyPaste);
  }

  async function copyInviteLink(code: string | null) {
    if (!code) return;
    const basename = getTenantBasename() ?? "";
    await navigator.clipboard.writeText(`${window.location.origin}${basename}/convite?codigo=${encodeURIComponent(code)}`);
  }

  function handleAthletePhotoUpload(file: File | null) {
    setPhotoError("");
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setPhotoError("Envie uma imagem válida.");
      return;
    }

    if (file.size > 1_500_000) {
      setPhotoError("A imagem deve ter até 1,5 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      void photoMutation.mutateAsync(String(reader.result ?? ""));
    };
    reader.onerror = () => setPhotoError("Não foi possível ler a imagem.");
    reader.readAsDataURL(file);
  }

  function scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function confirmNextGame(presence: boolean) {
    if (!selfLineup) return;
    void presenceMutation.mutateAsync({
      lineupId: selfLineup.id,
      presence,
      arrivalStatus: presence ? confirmationForm.arrivalStatus : "UNAVAILABLE",
      confirmationNote: confirmationForm.confirmationNote
    });
  }

  useEffect(() => {
    const athlete = overviewQuery.data?.athlete;
    if (!athlete) return;
    setMedicalForm({
      medicalStatus: athlete.medicalStatus ?? "CLEARED",
      medicalNote: athlete.medicalNote ?? "",
      medicalReturnDate: athlete.medicalReturnDate ? athlete.medicalReturnDate.slice(0, 10) : ""
    });
  }, [overviewQuery.data?.athlete]);

  if (!user) {
    return <div className="rounded-lg border border-slate-200 bg-white p-6 text-slate-500">Carregando sua conta...</div>;
  }

  if (!isAthleteContext) {
    return (
      <section className="space-y-4">
        <article id="atleta-financeiro" className="scroll-mt-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">Minha Conta</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div><p className="text-xs uppercase text-slate-500">Nome</p><p className="text-sm font-semibold text-slate-900">{user.name ?? "Usuário"}</p></div>
            <div><p className="text-xs uppercase text-slate-500">Email</p><p className="text-sm font-semibold text-slate-900">{user.email ?? "-"}</p></div>
            <div><p className="text-xs uppercase text-slate-500">Perfis</p><p className="text-sm font-semibold text-slate-900">{formatRoleList(user.roles, user.role)}</p></div>
          </div>
          <button onClick={logout} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-white hover:bg-red-600"><LogOut size={17} />Sair</button>
        </article>
      </section>
    );
  }

  if (overviewQuery.isLoading) return <div className="rounded-lg border border-slate-200 bg-white p-6 text-slate-500">Carregando sua conta...</div>;
  if (overviewQuery.isError || !overviewQuery.data) return <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">Falha ao carregar sua conta.</div>;

  const baseOverview = overviewQuery.data;
  const currentPayment = currentPaymentQuery.data?.payment ?? baseOverview.currentPayment;

  if (!baseOverview.athlete) {
    return (
      <AssociateOnlyPortal
        user={user}
        overview={baseOverview}
        currentPayment={currentPayment}
        checkout={checkout}
        pixCheckoutModalOpen={pixCheckoutModalOpen}
        checkoutPending={checkoutMutation.isPending}
        onOpenPix={() => void checkoutMutation.mutateAsync()}
        onRefreshPix={() => void checkoutMutation.mutateAsync()}
        onClosePix={() => setPixCheckoutModalOpen(false)}
        onCopyPix={() => void copyPixCode()}
        onLogout={logout}
      />
    );
  }

  const overview = baseOverview as AthleteSelfOverview & { athlete: NonNullable<AthleteSelfOverview["athlete"]> };
  const isPaid = currentPayment.status === "PAID";
  const nextGame = overview.nextGame;
  const selfLineup = nextGame?.lineups.find((lineup) => lineup.athleteId === overview.athlete.id) ?? null;
  const teamName = nextGame ? (nextGame.side === "RED" ? nextGame.redTeamName : nextGame.whiteTeamName) : "-";
  const lineupTeam = nextGame ? nextGame.lineups.filter((lineup) => lineup.side === nextGame.side && lineup.role !== "ABSENT") : [];
  const selfConfirmationLabel = selfLineup?.confirmedAt ? (selfLineup.presence ? "Confirmado" : "Fora") : "Pendente";
  const paymentDueDate = currentPayment.dueDate ? new Date(currentPayment.dueDate).toLocaleDateString("pt-BR") : "-";
  const goalParticipation = overview.numbers.goals + overview.numbers.assists;
  const cardsTotal = overview.numbers.yellowCards + overview.numbers.redCards;
  const medicalStatus = overview.athlete.medicalStatus ?? "CLEARED";
  const readinessScore = Math.min(
    100,
    Math.round(
      (overview.presence.presencePercent || 0) * 0.45 +
        (isPaid ? 20 : 0) +
        (medicalStatus === "CLEARED" ? 20 : medicalStatus === "OBSERVATION" ? 12 : 4) +
        (selfLineup?.confirmedAt && selfLineup.presence ? 15 : selfLineup?.confirmedAt ? 6 : nextGame ? 8 : 12)
    )
  );
  const athletePortalMenu = [
    { id: "atleta-resumo", label: "Dashboard", helper: "Resumo do atleta", icon: <Users size={17} /> },
    { id: "atleta-confirmacao", label: "Jogos", helper: "Presenca e escala", icon: <CalendarDays size={17} /> },
    { id: "atleta-evolucao", label: "Desempenho", helper: "Evolucao do ano", icon: <Trophy size={17} /> },
    { id: "atleta-financeiro", label: "Financeiro", helper: "Mensalidade e Pix", icon: <CreditCard size={17} /> },
    { id: "atleta-saude", label: "Saude", helper: "Status fisico", icon: <Activity size={17} /> },
    { id: "atleta-perfil", label: "Perfil", helper: "Dados pessoais", icon: <MailCheck size={17} /> },
    { id: "atleta-historico", label: "Memorial", helper: "Linha do tempo", icon: <Clock3 size={17} /> }
  ];
  const missingDataItems = [
    !overview.athlete.photoUrl ? { area: "Perfil", title: "Foto do atleta", detail: "Cadastrar foto real para substituir o avatar com iniciais." } : null,
    !overview.athlete.position ? { area: "Perfil", title: "Posicao em campo", detail: "Definir posicao para mostrar corretamente no cabecalho e estatisticas." } : null,
    overview.athlete.rating === null || overview.athlete.rating === undefined ? { area: "Desempenho", title: "Nivel/nota do atleta", detail: "Registrar avaliacao tecnica para evitar indicador vazio." } : null,
    overview.numbers.favoriteShirtNumbers.length === 0 ? { area: "Perfil", title: "Numero de camisa", detail: "Vincular numero usado pelo atleta." } : null,
    !nextGame ? { area: "Jogos", title: "Proximo jogo", detail: "Cadastrar jogo futuro e escalacao para habilitar confirmacao de presenca." } : null,
    nextGame && !selfLineup ? { area: "Jogos", title: "Escalacao do atleta", detail: "O proximo jogo existe, mas o atleta ainda nao esta escalado nele." } : null,
    overview.recentGames.length === 0 ? { area: "Jogos", title: "Historico de jogos", detail: "Finalizar jogos com participacao para preencher ultimos jogos e rankings." } : null,
    overview.evolution.length === 0 ? { area: "Desempenho", title: "Evolucao mensal", detail: "Lancar participacoes, gols, assistencias ou presencas no periodo." } : null,
    overview.ranking.topGoals.length === 0 ? { area: "Desempenho", title: "Rankings do time", detail: "Sem ranking calculado para artilharia, assistencias, vitorias ou presenca." } : null,
    !currentPayment.id ? { area: "Financeiro", title: "Cobranca atual", detail: "Gerar mensalidade do periodo para habilitar PIX e status financeiro." } : null,
    !currentPayment.dueDate ? { area: "Financeiro", title: "Vencimento", detail: "Definir data de vencimento da mensalidade atual." } : null,
    !overview.associate.email ? { area: "Perfil", title: "Email", detail: "Cadastrar email do associado/atleta." } : null,
    !overview.associate.phone ? { area: "Perfil", title: "Telefone", detail: "Cadastrar telefone de contato." } : null,
    !overview.invite.code ? { area: "Convites", title: "Codigo de convite", detail: "Gerar codigo para indicacoes pelo atleta." } : null
  ].filter((item): item is { area: string; title: string; detail: string } => Boolean(item));
  const athleteName = overview.athlete.name ?? user.name ?? "Atleta";
  const athleteInitials = initials(athleteName);
  const primaryShirtNumber = overview.numbers.favoriteShirtNumbers[0] ?? nextGame?.jerseyNumber ?? null;
  const nextGameDate = nextGame ? new Date(nextGame.date) : null;
  const nextGameOpponent = nextGame ? (nextGame.side === "RED" ? nextGame.whiteTeamName : nextGame.redTeamName) : null;
  const nextGameTime = nextGameDate ? nextGameDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : null;
  const recentGamesForLayout = overview.recentGames.slice(0, 5);
  const recentPaymentsForLayout = overview.recentPayments.slice(0, 6);
  const topGoalsForLayout = overview.ranking.topGoals.slice(0, 5);
  const evolutionForLayout = overview.evolution.slice(-6);
  const maxGoalsInGame = overview.recentGames.length > 0 ? Math.max(...overview.recentGames.map((game) => game.goals)) : null;
  const maxAssistsInGame = overview.recentGames.length > 0 ? Math.max(...overview.recentGames.map((game) => game.assists)) : null;
  const averageScore = overview.athlete.rating ? Number((overview.athlete.rating * 2).toFixed(1)) : null;
  const profileFields = [
    { label: "Tempo de associacao", value: overview.membership.associationTenureLabel ?? overview.membership.tenureLabel },
    { label: "Tempo como atleta", value: overview.membership.athleteTenureLabel ?? "Nao informado" },
    { label: "Associado desde", value: new Date(overview.membership.associationJoinedAt ?? overview.membership.joinedAt).toLocaleDateString("pt-BR") },
    { label: "Atleta desde", value: overview.membership.athleteJoinedAt ? new Date(overview.membership.athleteJoinedAt).toLocaleDateString("pt-BR") : "-" },
    { label: "Camisa", value: primaryShirtNumber ? String(primaryShirtNumber).padStart(2, "0") : "-" },
    { label: "Posicao", value: positionLabels[overview.athlete.position ?? "LINE"] ?? overview.athlete.position ?? "-" },
    { label: "Categoria", value: overview.athlete.status ?? "-" }
  ];
  const seasonStats = [
    { label: "Jogos", value: overview.numbers.gamesPlayed, helper: `${overview.presence.presencePercent}% de presenca`, icon: <CalendarDays size={18} /> },
    { label: "Gols", value: overview.numbers.goals, helper: `${goalParticipation} participacoes`, icon: <Target size={18} /> },
    { label: "Assistencias", value: overview.numbers.assists, helper: "Temporada atual", icon: <Activity size={18} /> },
    { label: "Presenca", value: `${overview.presence.presencePercent}%`, helper: `${overview.presence.gamesPresent}/${overview.presence.gamesRegistered} jogos`, icon: <Users size={18} /> },
    { label: "Cartoes", value: cardsTotal, helper: `${overview.numbers.yellowCards} amarelos / ${overview.numbers.redCards} vermelhos`, icon: <Medal size={18} /> },
    { label: "Ranking", value: overview.ranking.goalsRank ? `#${overview.ranking.goalsRank}` : "-", helper: `${overview.ranking.totalAthletes || 0} atletas`, icon: <Trophy size={18} /> }
  ];
  const activePanel =
    location.hash === "#atleta-jogos" || location.hash === "#atleta-confirmacao" ? "jogos" :
    location.hash === "#atleta-evolucao" ? "desempenho" :
    location.hash === "#atleta-financeiro" ? "financeiro" :
    location.hash === "#atleta-saude" ? "saude" :
    location.hash === "#atleta-perfil" ? "perfil" :
    "dashboard";
  const panelMeta = {
    dashboard: { title: "Dashboard do Atleta", subtitle: "Acompanhe seus jogos, desempenho, financeiro e muito mais.", icon: <Users size={22} /> },
    jogos: { title: "Jogos", subtitle: "Acompanhe seus proximos jogos, escalacoes e historico de partidas.", icon: <CalendarDays size={22} /> },
    desempenho: { title: "Desempenho", subtitle: "Acompanhe suas estatisticas e evolucao dentro de campo.", icon: <Activity size={22} /> },
    financeiro: { title: "Financeiro", subtitle: "Acompanhe suas cobrancas, pagamentos e historico financeiro.", icon: <CreditCard size={22} /> },
    saude: { title: "Saude e Condicao Fisica", subtitle: "Acompanhe sua saude, treinos e avaliacoes fisicas.", icon: <Activity size={22} /> },
    perfil: { title: "Meu Perfil", subtitle: "Gerencie suas informacoes pessoais e esportivas.", icon: <MailCheck size={22} /> }
  }[activePanel];
  const emptyText = "Nao cadastrado";
  const tenantLogoUrl = tenantTheme.logoUrl ?? "/brand/gestasports-logo-transparent.png";
  const tenantBrandName = tenantTheme.brandName || tenantTheme.name || "Clube";
  const cardClass = "fl-enterprise-card rounded-[var(--brand-radius)] border border-slate-200 bg-white shadow-sm";
  const softCardClass = "rounded-[var(--brand-radius)] border border-slate-200 bg-slate-50 p-4";
  const headerControls = (
    <div className="flex items-center gap-3">
      <button type="button" className="relative grid size-12 place-items-center rounded-lg border border-slate-200 bg-white text-slate-900 shadow-sm">
        <Activity size={18} />
        <span className="absolute right-2 top-2 grid size-5 place-items-center rounded-full bg-[var(--brand-accent)] text-[10px] font-black text-white">3</span>
      </button>
      <button type="button" className="relative grid size-12 place-items-center rounded-lg border border-slate-200 bg-white text-slate-900 shadow-sm">
        <MailCheck size={18} />
        <span className="absolute right-2 top-2 grid size-5 place-items-center rounded-full bg-[var(--brand-accent)] text-[10px] font-black text-white">2</span>
      </button>
      <div className="hidden h-12 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 shadow-sm sm:flex">
        <span className="grid size-9 place-items-center rounded-full bg-[var(--brand-primary)] text-xs font-black text-white">{athleteInitials}</span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-black text-slate-950">{athleteName}</span>
          <span className="block truncate text-xs font-semibold text-slate-500">Atleta</span>
        </span>
      </div>
    </div>
  );
  const miniStat = (label: string, value: string | number, helper?: string, icon?: ReactNode) => (
    <div className={softCardClass}>
      <div className="flex items-center justify-between gap-3">
        <span className="grid size-11 place-items-center rounded-lg bg-[color-mix(in_oklab,var(--brand-accent)_12%,white)] text-[var(--brand-accent)]">{icon ?? <Activity size={18} />}</span>
        <p className="truncate text-xs font-black text-slate-500">{label}</p>
      </div>
      <strong className="mt-3 block truncate text-2xl font-black text-slate-950">{value || emptyText}</strong>
      {helper ? <p className="mt-1 truncate text-xs font-bold text-slate-500">{helper}</p> : null}
    </div>
  );
  const recentGamesBlock = (
    <article className={`${cardClass} p-6`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-black uppercase tracking-[0.04em] text-slate-600">Ultimos jogos</h2>
        <button type="button" className="text-sm font-black text-blue-700">Ver todos</button>
      </div>
      {recentGamesForLayout.length > 0 ? (
        <div className="mt-5 divide-y divide-slate-100">
          {recentGamesForLayout.map((game) => (
            <div key={game.gameId} className="grid gap-3 py-3 text-sm sm:grid-cols-[4rem_minmax(0,1fr)_4rem_minmax(0,1fr)_auto] sm:items-center">
              <span className="font-bold text-slate-500">{new Date(game.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span>
              <strong className="truncate text-slate-950">{game.redTeamName ?? "Time A"}</strong>
              <strong className="text-center text-slate-950">{game.redScore ?? "-"} x {game.whiteScore ?? "-"}</strong>
              <strong className="truncate text-slate-950">{game.whiteTeamName ?? "Time B"}</strong>
              <span className="rounded-lg bg-emerald-50 px-2 py-1 text-center text-xs font-black text-emerald-700">{game.goals} gol(s)</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-lg border border-dashed border-slate-300 p-5 text-sm font-semibold text-slate-500">Sem jogos recentes registrados.</p>
      )}
    </article>
  );
  const nextGameBlock = (
    <article className={`${cardClass} p-6`}>
      <p className="text-sm font-black uppercase tracking-[0.04em] text-slate-600">Proximo jogo</p>
      {nextGame ? (
        <div className="mt-5">
          <div className="grid items-center gap-5 text-center sm:grid-cols-[1fr_auto_1fr]">
            <div className="grid justify-items-center gap-2">
              <img src={tenantLogoUrl} alt={tenantBrandName} className="size-24 object-contain" />
              <strong className="text-base text-slate-950">{teamName}</strong>
            </div>
            <span className="text-4xl font-black text-slate-950">x</span>
            <div className="grid justify-items-center gap-2">
              <span className="grid size-24 place-items-center rounded-lg border border-slate-300 bg-slate-100 text-xs font-black text-slate-600">ADVERSARIO</span>
              <strong className="text-base text-slate-950">{nextGameOpponent ?? emptyText}</strong>
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className={softCardClass}><p className="text-xs font-bold text-slate-500">Data</p><strong>{nextGameDate?.toLocaleDateString("pt-BR")}</strong></div>
            <div className={softCardClass}><p className="text-xs font-bold text-slate-500">Horario</p><strong>{nextGameTime}</strong></div>
            <div className={softCardClass}><p className="text-xs font-bold text-slate-500">Local</p><strong>{nextGame.location || emptyText}</strong></div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button type="button" disabled={!selfLineup || presenceMutation.isPending || selfLineup.presence} onClick={() => confirmNextGame(true)} className="fl-brand-primary-action inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-4 font-black text-white disabled:opacity-60">
              <CheckCircle2 size={17} /> {selfLineup?.presence ? "Presenca confirmada" : "Confirmar presenca"}
            </button>
            <button type="button" disabled={!selfLineup || presenceMutation.isPending} onClick={() => confirmNextGame(false)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 font-black text-slate-700 hover:bg-slate-100 disabled:opacity-60">
              Nao vou jogar
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-5 rounded-lg border border-dashed border-slate-300 p-5 text-sm font-semibold text-slate-500">Nenhum proximo jogo cadastrado.</p>
      )}
    </article>
  );
  const evolutionBlock = (
    <article className={`${cardClass} p-6`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-black uppercase tracking-[0.04em] text-slate-600">Evolucao na temporada</h2>
        <span className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700">{overview.period.year}</span>
      </div>
      {evolutionForLayout.length > 0 ? (
        <div className="mt-5 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={evolutionForLayout}>
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="goals" stroke="var(--brand-accent)" strokeWidth={2.5} name="Gols" />
              <Line type="monotone" dataKey="assists" stroke="var(--brand-primary)" strokeWidth={2.5} name="Assistencias" />
              <Line type="monotone" dataKey="presencePercent" stroke="#16a34a" strokeWidth={2.5} name="Presenca (%)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="mt-5 rounded-lg border border-dashed border-slate-300 p-5 text-sm font-semibold text-slate-500">Sem evolucao registrada.</p>
      )}
    </article>
  );
  const profileHero = (
    <article className={`${cardClass} p-6`}>
      <div className="grid gap-6 xl:grid-cols-[auto_minmax(0,1fr)_12rem] xl:items-center">
        <div className="relative size-36">
          {overview.athlete.photoUrl ? <img src={overview.athlete.photoUrl} alt={athleteName} className="h-full w-full rounded-full object-cover ring-4 ring-slate-100" /> : <span className="grid h-full w-full place-items-center rounded-full bg-[var(--brand-primary)] text-3xl font-black text-white ring-4 ring-slate-100">{athleteInitials}</span>}
          <label className="absolute -bottom-1 -right-1 grid size-9 cursor-pointer place-items-center rounded-full border border-slate-200 bg-white text-slate-900 shadow-lg" title="Carregar foto">
            <Camera size={17} />
            <input type="file" accept="image/*" className="sr-only" disabled={photoMutation.isPending} onChange={(event) => handleAthletePhotoUpload(event.target.files?.[0] ?? null)} />
          </label>
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-3xl font-black text-slate-950">{athleteName}</h2>
            <span className="rounded-lg bg-emerald-100 px-3 py-1 text-sm font-black text-emerald-700">{overview.athlete.status === "ACTIVE" ? "Ativo" : overview.athlete.status}</span>
          </div>
          <p className="mt-3 text-base font-semibold text-slate-600">
            {positionLabels[overview.athlete.position ?? "LINE"] ?? emptyText} - Camisa {primaryShirtNumber ?? emptyText}
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {profileFields.map((field) => <div key={field.label}><p className="text-xs font-bold text-slate-500">{field.label}</p><strong className="mt-1 block text-sm text-slate-950">{field.value}</strong></div>)}
          </div>
        </div>
        <div className="grid min-h-36 place-items-center border-l border-slate-200 text-center">
          <p className="font-black uppercase text-slate-950">{roleGameLabels[nextGame?.role ?? "STARTER"]}</p>
          <strong className="text-7xl font-black text-slate-950">{primaryShirtNumber ?? "-"}</strong>
        </div>
      </div>
    </article>
  );

  return (
    <PageTemplate
      eyebrow="Portal do Atleta"
      title={panelMeta.title}
      description={panelMeta.subtitle}
      actions={headerControls}
      className="fl-athlete-portal"
    >
      {checkout ? (
        <PixCheckoutModal
          open={pixCheckoutModalOpen}
          payerName={overview.athlete.name ?? user.name ?? "Atleta"}
          reference={`${String(now.month).padStart(2, "0")}/${now.year}`}
          amount={formatCurrency(currentPayment.amountCents ?? overview.associate.monthlyFeeCents)}
          dueDate={currentPayment.dueDate ? new Date(currentPayment.dueDate).toLocaleDateString("pt-BR") : undefined}
          status={paymentStatusLabels[currentPayment.status ?? "PENDING"] ?? "Pendente"}
          statusTone={currentPayment.status === "PAID" ? "paid" : "unpaid"}
          description="Mensalidade do clube"
          txid={checkout.txid}
          pixCopyPaste={checkout.pixCopyPaste}
          qrCodeDataUrl={checkout.qrCodeDataUrl}
          expiresAt={checkout.expiresAt}
          autoSettleSeconds={checkout.autoSettleSeconds}
          onRefresh={() => void checkoutMutation.mutateAsync()}
          onClose={() => setPixCheckoutModalOpen(false)}
        />
      ) : null}

      {missingDataItems.length > 0 && activePanel !== "perfil" ? (
        <article className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-black text-amber-800">Dados pendentes para completar a tela: {missingDataItems.map((item) => item.title).join(", ")}.</p>
        </article>
      ) : null}

      {activePanel === "perfil" ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_28rem]">
          <div className="space-y-5">
            <article className={`${cardClass} p-6`}>
              <div className="grid min-h-60 gap-6 lg:grid-cols-[9.5rem_minmax(0,1fr)_13rem] lg:items-center">
                <div className="relative size-36 shrink-0 self-start">
                  {overview.athlete.photoUrl ? (
                    <img src={overview.athlete.photoUrl} alt={athleteName} className="h-full w-full rounded-full object-cover ring-4 ring-slate-100" />
                  ) : (
                    <span className="grid h-full w-full place-items-center rounded-full bg-[var(--brand-primary)] text-3xl font-black text-white ring-4 ring-slate-100">{athleteInitials}</span>
                  )}
                  <label className="absolute -bottom-1 -right-1 grid size-9 cursor-pointer place-items-center rounded-full border border-slate-200 bg-white text-slate-900 shadow-lg" title="Carregar foto">
                    <Camera size={17} />
                    <input type="file" accept="image/*" className="sr-only" disabled={photoMutation.isPending} onChange={(event) => handleAthletePhotoUpload(event.target.files?.[0] ?? null)} />
                  </label>
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="truncate text-3xl font-black text-slate-950">{athleteName}</h2>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">{overview.athlete.status === "ACTIVE" ? "Ativo" : overview.athlete.status}</span>
                  </div>
                  <p className="mt-3 flex flex-wrap items-center gap-3 text-base font-semibold text-slate-600">
                    <span>{positionLabels[overview.athlete.position ?? "LINE"] ?? emptyText}</span>
                    <span>Camisa {primaryShirtNumber ? String(primaryShirtNumber).padStart(2, "0") : emptyText}</span>
                    <span className="inline-flex items-center gap-2 text-slate-950">
                      <img src={tenantLogoUrl} alt={tenantBrandName} className="size-6 object-contain" />
                      {tenantBrandName}
                    </span>
                  </p>
                  <div className="mt-6 grid gap-x-10 gap-y-5 sm:grid-cols-2">
                    {[
                      ["Nascimento", emptyText],
                      ["Associado desde", new Date(overview.membership.associationJoinedAt ?? overview.membership.joinedAt).toLocaleDateString("pt-BR")],
                      ["Peso / Altura", emptyText],
                      ["Categoria", overview.athlete.status === "ACTIVE" ? "Principal" : overview.athlete.status],
                      ["Pe dominante", emptyText],
                      ["Registro", overview.athlete.id.slice(0, 8)],
                    ].map(([label, value]) => (
                      <div key={label} className="grid grid-cols-[1.35rem_minmax(0,1fr)] items-start gap-2">
                        <span className="mt-0.5 text-slate-500"><CalendarDays size={16} /></span>
                        <span className="min-w-0">
                          <p className="text-xs font-bold text-slate-500">{label}</p>
                          <strong className="mt-1 block truncate text-sm text-slate-950">{value}</strong>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex h-full flex-col justify-between border-slate-200 text-center lg:border-l lg:pl-5">
                  <div className="grid min-h-36 place-items-center">
                    <p className="text-base font-black uppercase text-slate-950">{positionLabels[overview.athlete.position ?? "LINE"] ?? "ATLETA"}</p>
                    <strong className="text-7xl font-black leading-none text-slate-950">{primaryShirtNumber ?? "-"}</strong>
                  </div>
                  <button type="button" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-black text-slate-950 hover:bg-slate-50">
                    <MailCheck size={16} /> Editar perfil
                  </button>
                </div>
              </div>
            </article>

            <div className={`${cardClass} flex gap-6 overflow-x-auto px-4`}>
              {["Visao Geral", "Estatisticas", "Historico", "Conquistas", "Documentos"].map((tab, index) => (
                <button key={tab} type="button" className={`relative h-14 shrink-0 px-1 text-sm font-black ${index === 0 ? "text-red-600" : "text-slate-600"}`}>
                  {tab}
                  {index === 0 ? <span className="absolute inset-x-0 bottom-0 h-1 rounded-t-full bg-red-600" /> : null}
                </button>
              ))}
            </div>

            <div className="grid gap-5 xl:grid-cols-[20rem_minmax(0,1fr)]">
              <article className={`${cardClass} p-6`}>
                <h2 className="text-xl font-black text-slate-950">Sobre mim</h2>
                <div className="mt-5 divide-y divide-slate-200">
                  <div className="py-4">
                    <p className="text-sm font-bold text-slate-500">Posicao</p>
                    <strong className="mt-1 block text-slate-950">{positionLabels[overview.athlete.position ?? "LINE"] ?? emptyText}</strong>
                  </div>
                  <div className="py-4">
                    <p className="text-sm font-bold text-slate-500">Estilo de jogo</p>
                    <strong className="mt-1 block leading-6 text-slate-950">{overview.athlete.sportsNote || "Nao cadastrado"}</strong>
                  </div>
                  <div className="py-4">
                    <p className="text-sm font-bold text-slate-500">Caracteristicas</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {["Associado", medicalStatusLabels[medicalStatus], isPaid ? "Em dia" : "Financeiro pendente", overview.presence.presencePercent > 0 ? `${overview.presence.presencePercent}% presenca` : "Presenca sem registro"].map((tag) => (
                        <span key={tag} className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">{tag}</span>
                      ))}
                    </div>
                  </div>
                  <div className="py-4">
                    <p className="text-sm font-bold text-slate-500">Biografia</p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">{overview.athlete.sportsNote || "Biografia ainda nao cadastrada para este atleta."}</p>
                  </div>
                </div>
              </article>

              <article className={`${cardClass} p-6`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xl font-black text-slate-950">Estatisticas na temporada {overview.period.year}</h2>
                  <span className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-700">{overview.period.year}</span>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
                  {[
                    ["Jogos", overview.numbers.gamesPlayed],
                    ["Gols", overview.numbers.goals],
                    ["Assistencias", overview.numbers.assists],
                    ["Presenca", `${overview.presence.presencePercent}%`],
                    ["Cartoes", cardsTotal],
                    ["Ranking", overview.ranking.goalsRank ? `#${overview.ranking.goalsRank}` : "Sem registro"],
                    ["Nota media", averageScore ?? "Sem registro"],
                    ["Camisa", primaryShirtNumber ?? "Sem registro"]
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
                      <p className="text-xs font-bold text-slate-500">{label}</p>
                      <strong className="mt-2 block text-xl font-black text-slate-950">{value}</strong>
                    </div>
                  ))}
                </div>
                <div className="mt-6">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-black text-slate-700">Evolucao da nota media</p>
                    <span className="text-xs font-bold text-slate-500">{evolutionForLayout.length ? "Dados reais do periodo" : "Sem registro"}</span>
                  </div>
                  {evolutionForLayout.length > 0 ? (
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={evolutionForLayout}>
                          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Line type="monotone" dataKey="goals" stroke="var(--brand-accent)" strokeWidth={2.5} name="Gols" />
                          <Line type="monotone" dataKey="assists" stroke="var(--brand-primary)" strokeWidth={2.5} name="Assistencias" />
                          <Line type="monotone" dataKey="presencePercent" stroke="#16a34a" strokeWidth={2.5} name="Presenca (%)" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="grid h-56 place-items-center rounded-lg border border-dashed border-slate-300 text-sm font-semibold text-slate-500">Sem evolucao cadastrada.</div>
                  )}
                </div>
              </article>
            </div>
          </div>

          <div className="space-y-5">
            <article className={`${cardClass} p-6`}>
              <h2 className="text-xl font-black text-slate-950">Melhores marcas pessoais</h2>
              <div className="mt-5 space-y-4">
                {[
                  ["Jogos em uma temporada", overview.numbers.gamesPlayed > 0 ? `${overview.numbers.gamesPlayed} jogos (${overview.period.year})` : "Sem registro"],
                  ["Participacoes em gols", goalParticipation > 0 ? `${goalParticipation} participacoes` : "Sem registro"],
                  ["Gols em um jogo", maxGoalsInGame !== null && maxGoalsInGame > 0 ? `${maxGoalsInGame} gol(s)` : "Sem registro"],
                  ["Assistencias em um jogo", maxAssistsInGame !== null && maxAssistsInGame > 0 ? `${maxAssistsInGame} assist.` : "Sem registro"]
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-b-0">
                    <span className="text-sm font-bold text-slate-600">{label}</span>
                    <strong className="text-right text-sm text-red-600">{value}</strong>
                  </div>
                ))}
              </div>
            </article>

            <article className={`${cardClass} p-6`}>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-black text-slate-950">Conquistas</h2>
                <span className="text-sm font-black text-red-600">Ver todas</span>
              </div>
              <div className="mt-5 space-y-3">
                {[
                  ["Campeonato interno", "Sem conquista cadastrada"],
                  ["Copa regional", "Sem conquista cadastrada"],
                  ["Destaque da temporada", averageScore ? `Nota ${averageScore}` : "Sem registro"],
                  ["Marco pelo clube", overview.numbers.gamesPlayed > 0 ? `${overview.numbers.gamesPlayed} jogos registrados` : "Sem registro"]
                ].map(([title, detail]) => (
                  <div key={title} className="flex gap-3 border-b border-slate-100 pb-3 last:border-b-0">
                    <span className="grid size-10 place-items-center rounded-lg bg-amber-50 text-amber-600"><Trophy size={18} /></span>
                    <span>
                      <strong className="block text-sm text-slate-950">{title}</strong>
                      <span className="text-sm font-semibold text-slate-500">{detail}</span>
                    </span>
                  </div>
                ))}
              </div>
            </article>

            <article className={`${cardClass} p-6`}>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-black text-slate-950">Proximos compromissos</h2>
                <span className="text-sm font-black text-red-600">Ver calendario</span>
              </div>
              {nextGame ? (
                <div className="mt-5 rounded-lg border border-slate-200 p-4">
                  <div className="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-3">
                    <span className="text-center text-sm font-black text-slate-700">{nextGameDate?.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span>
                    <span className="min-w-0">
                      <strong className="block truncate text-sm text-slate-950">{teamName} x {nextGameOpponent ?? emptyText}</strong>
                      <span className="block truncate text-sm font-semibold text-slate-500">{nextGame.location || emptyText}</span>
                    </span>
                    <strong className="text-sm text-slate-700">{nextGameTime}</strong>
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded-lg border border-dashed border-slate-300 p-5 text-sm font-semibold text-slate-500">Sem compromissos cadastrados.</div>
              )}
            </article>
          </div>
        </div>
      ) : null}

      {activePanel === "dashboard" ? (
        <div className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,.65fr)]">
            <DashboardWidget title="Proximo jogo" description="Confirmacao e escala aparecem primeiro no Portal do Atleta." size="FULL">
              {nextGame ? (
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-stretch">
                  <div>
                    <div className="grid items-center gap-5 text-center sm:grid-cols-[1fr_auto_1fr]">
                      <div className="grid justify-items-center gap-2">
                        <img src={tenantLogoUrl} alt={tenantBrandName} className="size-24 object-contain" />
                        <strong className="text-base text-slate-950">{teamName}</strong>
                      </div>
                      <span className="text-4xl font-black text-slate-950">x</span>
                      <div className="grid justify-items-center gap-2">
                        <span className="grid size-24 place-items-center rounded-[var(--brand-radius)] border border-slate-300 bg-slate-100 text-xs font-black uppercase text-slate-600">Adversario</span>
                        <strong className="text-base text-slate-950">{nextGameOpponent ?? emptyText}</strong>
                      </div>
                    </div>
                    <div className="mt-6 grid gap-3 sm:grid-cols-3">
                      <div className={softCardClass}><p className="text-xs font-bold text-slate-500">Data</p><strong>{nextGameDate?.toLocaleDateString("pt-BR")}</strong></div>
                      <div className={softCardClass}><p className="text-xs font-bold text-slate-500">Horario</p><strong>{nextGameTime}</strong></div>
                      <div className={softCardClass}><p className="text-xs font-bold text-slate-500">Local</p><strong>{nextGame.location || emptyText}</strong></div>
                    </div>
                  </div>
                  <div className="grid content-between gap-3 rounded-[var(--brand-radius)] border border-slate-200 bg-slate-50 p-4">
                    <div>
                      <p className="text-xs font-black uppercase text-slate-500">Sua resposta</p>
                      <strong className="mt-2 block text-2xl font-black text-slate-950">{selfConfirmationLabel}</strong>
                      <p className="mt-1 text-sm font-semibold text-slate-500">{selfLineup ? roleGameLabels[selfLineup.role] : "Ainda nao escalado"}</p>
                    </div>
                    <div className="grid gap-2">
                      <button type="button" disabled={!selfLineup || presenceMutation.isPending || selfLineup.presence} onClick={() => confirmNextGame(true)} className="fl-brand-primary-action inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-4 font-black text-white disabled:opacity-60">
                        <CheckCircle2 size={17} /> {selfLineup?.presence ? "Presenca confirmada" : "Confirmar presenca"}
                      </button>
                      <button type="button" disabled={!selfLineup || presenceMutation.isPending} onClick={() => confirmNextGame(false)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 font-black text-slate-700 hover:bg-slate-50 disabled:opacity-60">
                        Nao poderei comparecer
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-slate-300 p-5 text-sm font-semibold text-slate-500">Nenhum proximo jogo cadastrado.</p>
              )}
            </DashboardWidget>
            <DashboardWidget title="Financeiro" description="Resumo rapido, sem competir com o jogo." size="M">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <strong className="block text-3xl font-black text-slate-950">{formatCurrency(currentPayment.amountCents ?? overview.associate.monthlyFeeCents)}</strong>
                  <p className="mt-1 text-sm font-semibold text-slate-500">{paymentStatusLabels[currentPayment.status ?? "PENDING"]}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">Vence em {paymentDueDate}</p>
                </div>
                <span className={`rounded-lg px-3 py-2 text-xs font-black ${isPaid ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{isPaid ? "Em dia" : "Pendente"}</span>
              </div>
              {!isPaid ? (
                <button onClick={() => void checkoutMutation.mutateAsync()} className="fl-brand-primary-action mt-5 min-h-12 w-full rounded-lg font-black text-white">Gerar Pix</button>
              ) : null}
            </DashboardWidget>
          </div>
          <DashboardWidgetGrid>
            <EnterpriseStatCard label="Jogos" value={overview.numbers.gamesPlayed} helper={`Temporada ${overview.period.year}`} icon={<CalendarDays size={18} />} tone="info" />
            <EnterpriseStatCard label="Gols" value={overview.numbers.goals} helper={`${goalParticipation} participacoes`} icon={<Target size={18} />} tone="success" />
            <EnterpriseStatCard label="Assistencias" value={overview.numbers.assists} helper="Temporada atual" icon={<Activity size={18} />} tone="info" />
            <EnterpriseStatCard label="Presenca" value={`${overview.presence.presencePercent}%`} helper={`${overview.presence.gamesPresent}/${overview.presence.gamesRegistered} jogos`} icon={<Users size={18} />} tone="success" />
            <EnterpriseStatCard label="Saude" value={medicalStatusLabels[medicalStatus]} helper={overview.athlete.medicalNote || "Sem restricao"} icon={<Activity size={18} />} tone={medicalStatus === "CLEARED" ? "success" : "warning"} />
            <EnterpriseStatCard label="Ranking" value={overview.ranking.goalsRank ? `#${overview.ranking.goalsRank}` : "-"} helper={`${overview.ranking.totalAthletes} atletas`} icon={<Trophy size={18} />} tone="default" />
          </DashboardWidgetGrid>
          <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">{profileHero}{evolutionBlock}</div>
          <div className="grid gap-5 xl:grid-cols-[1fr_1fr_.9fr]">{recentGamesBlock}<article className={`${cardClass} p-6`}><h2 className="text-sm font-black uppercase text-slate-600">Destaques do time</h2>{topGoalsForLayout.length ? <div className="mt-5 space-y-2">{topGoalsForLayout.map((row) => <div key={row.athleteId} className={`grid grid-cols-[2rem_minmax(0,1fr)_auto] rounded-lg px-3 py-3 ${row.athleteId === overview.athlete.id ? "bg-red-50" : ""}`}><strong>{row.rank}</strong><span>{row.name}</span><strong>{row.value} gols</strong></div>)}</div> : <p className="mt-5 text-sm text-slate-500">Sem ranking cadastrado.</p>}</article><article className={`${cardClass} p-6`}><h2 className="text-sm font-black uppercase text-slate-600">Notificacoes</h2><p className="mt-5 text-sm text-slate-500">Sem notificacoes cadastradas.</p></article></div>
        </div>
      ) : null}

      {activePanel === "jogos" ? <div className="space-y-5"><div className="grid gap-5 xl:grid-cols-[.9fr_1.25fr]">{nextGameBlock}<article className={`${cardClass} p-6`}><h2 className="text-sm font-black uppercase text-slate-600">Proximos jogos</h2>{nextGame ? <div className="mt-5 rounded-lg bg-emerald-50 p-4"><strong>{teamName} x {nextGameOpponent ?? emptyText}</strong><p className="text-sm text-slate-500">{nextGameDate?.toLocaleDateString("pt-BR")} - {nextGameTime} - {nextGame.location}</p></div> : <p className="mt-5 text-sm text-slate-500">Sem jogos futuros cadastrados.</p>}</article></div><div className="grid gap-5 xl:grid-cols-[1fr_.75fr_.95fr]">{recentGamesBlock}<article className={`${cardClass} p-6`}><h2 className="text-sm font-black uppercase text-slate-600">Estatisticas em campo</h2><div className="mt-5 grid grid-cols-3 gap-3">{seasonStats.slice(0, 6).map((stat) => <div key={stat.label} className={softCardClass}><p className="text-xs text-slate-500">{stat.label}</p><strong>{stat.value}</strong></div>)}</div></article><article className={`${cardClass} p-6`}><h2 className="text-sm font-black uppercase text-slate-600">Escalacao provavel</h2><p className="mt-5 rounded-lg border border-dashed border-slate-300 p-5 text-sm font-semibold text-slate-500">Escalacao visual ainda nao cadastrada para este atleta.</p></article></div></div> : null}

      {activePanel === "desempenho" ? <div className="space-y-5"><div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">{seasonStats.map((stat) => miniStat(stat.label, stat.value, stat.helper, stat.icon))}</div><div className="grid gap-5 xl:grid-cols-[1.45fr_.85fr]">{evolutionBlock}<article className={`${cardClass} p-6`}><h2 className="text-sm font-black uppercase text-slate-600">Desempenho por competicao</h2><p className="mt-5 rounded-lg border border-dashed border-slate-300 p-5 text-sm font-semibold text-slate-500">Dados por competicao ainda nao cadastrados.</p></article></div><div className="grid gap-5 xl:grid-cols-[.9fr_.75fr_.9fr]">{recentGamesBlock}<article className={`${cardClass} p-6`}><h2 className="text-sm font-black uppercase text-slate-600">Rankings do time</h2>{topGoalsForLayout.length ? topGoalsForLayout.map((row) => <div key={row.athleteId} className="mt-3 flex justify-between"><span>{row.rank}º {row.name}</span><strong>{row.value}</strong></div>) : <p className="mt-5 text-sm text-slate-500">Sem ranking.</p>}</article><article className={`${cardClass} p-6`}><h2 className="text-sm font-black uppercase text-slate-600">Mapa de calor</h2><p className="mt-5 rounded-lg border border-dashed border-slate-300 p-5 text-sm font-semibold text-slate-500">Mapa de calor ainda nao cadastrado.</p></article></div></div> : null}

      {activePanel === "financeiro" ? <div className="space-y-5"><div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">{miniStat("Em aberto", isPaid ? "R$ 0,00" : formatCurrency(currentPayment.amountCents ?? overview.associate.monthlyFeeCents), isPaid ? "Sem cobranca pendente" : "Cobranca pendente", <CreditCard size={18} />)}{miniStat("Pago no ano", formatCurrency(overview.financeSummary.paidCentsInYear), `${overview.financeSummary.paidCount} pagamentos`, <CircleCheck size={18} />)}{miniStat("Total pago", formatCurrency(overview.financeSummary.paidCentsInYear), "Historico registrado", <Activity size={18} />)}{miniStat("Adimplencia", `${overview.insights.adimplenciaPercent}%`, "Indicador real", <Medal size={18} />)}{miniStat("Proximo vencimento", paymentDueDate, "Mensalidade atual", <CalendarDays size={18} />)}</div><div className="grid gap-5 xl:grid-cols-[1fr_1.1fr]"><article className={`${cardClass} p-6`}><h2 className="text-xl font-black">Cobranca atual</h2><div className="mt-6 grid gap-5 lg:grid-cols-[1fr_18rem]"><div><strong className="text-2xl">Mensalidade</strong><div className="mt-6 grid grid-cols-2 divide-x divide-slate-200 border-y border-slate-200 py-5"><div><p className="text-sm text-slate-500">Vencimento</p><strong className="text-xl text-red-600">{paymentDueDate}</strong></div><div className="pl-6"><p className="text-sm text-slate-500">Valor</p><strong className="text-xl">{formatCurrency(currentPayment.amountCents ?? overview.associate.monthlyFeeCents)}</strong></div></div><div className="mt-6 rounded-lg bg-red-50 p-4"><p>Status</p><strong>{paymentStatusLabels[currentPayment.status ?? "PENDING"]}</strong></div></div><div className="rounded-lg bg-slate-50 p-5 text-center"><h3 className="mb-4 text-left font-black">Pagar com PIX</h3>{checkout?.qrCodeDataUrl ? <img src={checkout.qrCodeDataUrl} alt="QR Code Pix" className="mx-auto size-40" /> : <p className="grid size-40 place-items-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-500">Gerar QR</p>}<button onClick={() => void checkoutMutation.mutateAsync()} className="mt-5 min-h-11 w-full rounded-lg bg-red-600 font-black text-white">Gerar PIX</button></div></div></article><article className={`${cardClass} p-6`}><h2 className="text-xl font-black">Historico de pagamentos</h2>{recentPaymentsForLayout.length ? <div className="mt-5 divide-y">{recentPaymentsForLayout.map((payment) => <div key={payment.id} className="grid grid-cols-5 py-3 text-sm"><strong>{String(payment.month).padStart(2, "0")}/{payment.year}</strong><span>{new Date(payment.dueDate).toLocaleDateString("pt-BR")}</span><span>{formatCurrency(payment.amountCents)}</span><span>{paymentStatusLabels[payment.status]}</span><span>{payment.paidAt ? new Date(payment.paidAt).toLocaleDateString("pt-BR") : "-"}</span></div>)}</div> : <p className="mt-5 text-sm text-slate-500">Sem pagamentos.</p>}</article></div></div> : null}

      {activePanel === "saude" ? <div className="space-y-5"><div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">{miniStat("Status de saude", medicalStatusLabels[medicalStatus], "Status real", <Activity size={18} />)}{miniStat("Avaliacao fisica", "Nao cadastrada", "Sem registro", <Trophy size={18} />)}{miniStat("Frequencia cardiaca", "Nao cadastrada", "Sem registro", <Activity size={18} />)}{miniStat("Carga de treino", "Nao cadastrada", "Sem registro", <Target size={18} />)}{miniStat("Hidratacao", "Nao cadastrada", "Sem registro", <Activity size={18} />)}</div><div className="grid gap-5 xl:grid-cols-[.9fr_.9fr_.8fr]"><article className={`${cardClass} p-6`}><h2 className="text-xl font-black">Ultimo atendimento medico</h2><p className="mt-5 rounded-lg border border-dashed border-slate-300 p-5 text-sm font-semibold text-slate-500">{overview.athlete.medicalNote || "Sem atendimento medico cadastrado."}</p></article><article className={`${cardClass} p-6`}><h2 className="text-xl font-black">Sinais vitais</h2><p className="mt-5 rounded-lg border border-dashed border-slate-300 p-5 text-sm font-semibold text-slate-500">Sinais vitais ainda nao cadastrados.</p></article><article className={`${cardClass} p-6`}><h2 className="text-xl font-black">Proximas avaliacoes</h2><p className="mt-5 rounded-lg border border-dashed border-slate-300 p-5 text-sm font-semibold text-slate-500">Sem avaliacoes agendadas.</p></article></div><article className={`${cardClass} p-6`}><h2 className="text-xl font-black">Atualizar status medico</h2><div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]"><select className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold" value={medicalForm.medicalStatus} onChange={(event) => setMedicalForm((current) => ({ ...current, medicalStatus: event.target.value as AthleteMedicalStatus }))}>{Object.entries(medicalStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><button type="button" className="rounded-lg bg-red-600 px-5 py-2 font-black text-white" disabled={medicalMutation.isPending} onClick={() => void medicalMutation.mutateAsync()}>{medicalMutation.isPending ? "Salvando..." : "Salvar"}</button></div></article></div> : null}
    </PageTemplate>
  );

  return (
    <section className="space-y-5">
      {checkout ? (
        <PixCheckoutModal
          open={pixCheckoutModalOpen}
          payerName={overview.athlete.name ?? user.name ?? "Atleta"}
          reference={`${String(now.month).padStart(2, "0")}/${now.year}`}
          amount={formatCurrency(currentPayment.amountCents ?? overview.associate.monthlyFeeCents)}
          dueDate={currentPayment.dueDate ? new Date(currentPayment.dueDate).toLocaleDateString("pt-BR") : undefined}
          status={paymentStatusLabels[currentPayment.status ?? "PENDING"] ?? "Pendente"}
          statusTone={currentPayment.status === "PAID" ? "paid" : "unpaid"}
          description="Mensalidade do clube"
          txid={checkout.txid}
          pixCopyPaste={checkout.pixCopyPaste}
          qrCodeDataUrl={checkout.qrCodeDataUrl}
          expiresAt={checkout.expiresAt}
          autoSettleSeconds={checkout.autoSettleSeconds}
          onRefresh={() => void checkoutMutation.mutateAsync()}
          onClose={() => setPixCheckoutModalOpen(false)}
        />
      ) : null}

      <PortalMenu items={athletePortalMenu} onSelect={scrollToSection} />

      {missingDataItems.length > 0 ? (
        <article className="rounded-lg border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.08em] text-amber-700">Dados reais pendentes</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">Itens que faltam para a tela ficar completa</h2>
              <p className="mt-1 text-sm font-semibold text-slate-600">Sem dados ficticios: estes pontos dependem de cadastro, jogo finalizado ou calculo no sistema.</p>
            </div>
            <span className="rounded-lg bg-white px-3 py-2 text-xs font-black text-amber-800">{missingDataItems.length} pendente(s)</span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {missingDataItems.map((item) => (
              <div key={`${item.area}-${item.title}`} className="rounded-lg border border-amber-200 bg-white p-3">
                <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-amber-800">{item.area}</span>
                <h3 className="mt-3 text-sm font-black text-slate-950">{item.title}</h3>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">{item.detail}</p>
              </div>
            ))}
          </div>
        </article>
      ) : null}

      <div id="atleta-resumo" className="scroll-mt-4 grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1.25fr)]">
        <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-5 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center">
            <div className="relative size-28 shrink-0">
              {overview.athlete.photoUrl ? (
                <img src={overview.athlete.photoUrl} alt={athleteName} className="h-full w-full rounded-full object-cover ring-4 ring-slate-100" />
              ) : (
                <span className="grid h-full w-full place-items-center rounded-full bg-red-600 text-2xl font-black text-white ring-4 ring-slate-100">{athleteInitials}</span>
              )}
              <label className="absolute -bottom-1 -right-1 grid size-9 cursor-pointer place-items-center rounded-full border border-slate-200 bg-white text-slate-900 shadow-lg hover:bg-slate-100" title="Carregar foto">
                <Camera size={17} />
                <input type="file" accept="image/*" className="sr-only" disabled={photoMutation.isPending} onChange={(event) => handleAthletePhotoUpload(event.target.files?.[0] ?? null)} />
              </label>
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">{medicalStatusLabels[medicalStatus]}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{overview.membership.tenureLabel}</span>
                <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-700">Prontidao {readinessScore}%</span>
              </div>
              <h2 className="mt-4 truncate text-3xl font-black text-slate-950">{athleteName}</h2>
              <p className="mt-2 text-base font-semibold text-slate-600">
                {positionLabels[overview.athlete.position ?? "LINE"] ?? overview.athlete.position ?? "Posicao nao cadastrada"}
                {primaryShirtNumber ? ` • Camisa ${String(primaryShirtNumber).padStart(2, "0")}` : " • Camisa nao cadastrada"}
              </p>
              {photoError ? <p className="mt-2 text-xs font-semibold text-red-600">{photoError}</p> : null}
            </div>

            <div className="grid min-w-28 place-items-center rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
              <span className="text-xs font-black uppercase text-slate-500">{roleGameLabels[nextGame?.role ?? "STARTER"]}</span>
              <strong className="mt-1 text-6xl font-black leading-none text-slate-950">{primaryShirtNumber ?? "-"}</strong>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {profileFields.map((field) => (
              <div key={field.label} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">{field.label}</p>
                <p className="mt-2 truncate text-sm font-black text-slate-950">{field.value}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Indicadores da temporada</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">Resumo do atleta</h2>
            </div>
            <span className={`rounded-lg px-3 py-2 text-xs font-black ${isPaid ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
              Financeiro: {paymentStatusLabels[currentPayment.status ?? "PENDING"] ?? "Pendente"}
            </span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {seasonStats.map((stat) => (
              <div key={stat.label} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="grid size-10 place-items-center rounded-lg bg-red-50 text-red-600">{stat.icon}</span>
                  <p className="truncate text-xs font-black text-slate-500">{stat.label}</p>
                </div>
                <strong className="mt-3 block truncate text-2xl font-black text-slate-950">{stat.value}</strong>
                <p className="mt-1 truncate text-xs font-bold text-slate-500">{stat.helper}</p>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,.9fr)_minmax(0,1.15fr)_minmax(20rem,.75fr)]">
        <article id="atleta-confirmacao" className="scroll-mt-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Proximo jogo</p>
          {nextGame ? (
            <div className="mt-5">
              <div className="grid items-center gap-5 text-center sm:grid-cols-[1fr_auto_1fr]">
                <div className="grid justify-items-center gap-2">
                  <img src="/brand/gestasports-logo-transparent.png" alt="GestaSports" className="size-20 object-contain" />
                  <strong className="text-slate-950">{teamName}</strong>
                </div>
                <span className="text-3xl font-black text-slate-950">x</span>
                <div className="grid justify-items-center gap-2">
                  <span className="grid size-20 place-items-center rounded-lg border border-slate-300 bg-slate-100 text-xs font-black text-slate-600">ADVERSARIO</span>
                  <strong className="text-slate-950">{nextGameOpponent ?? "Nao definido"}</strong>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-slate-200 p-3"><p className="text-xs font-bold text-slate-500">Data</p><strong>{nextGameDate?.toLocaleDateString("pt-BR")}</strong></div>
                <div className="rounded-lg border border-slate-200 p-3"><p className="text-xs font-bold text-slate-500">Horario</p><strong>{nextGameTime}</strong></div>
                <div className="rounded-lg border border-slate-200 p-3"><p className="text-xs font-bold text-slate-500">Local</p><strong>{nextGame.location || "-"}</strong></div>
              </div>

              {selfLineup ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <button type="button" disabled={presenceMutation.isPending || selfLineup.presence} onClick={() => confirmNextGame(true)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 font-black text-white hover:bg-red-700 disabled:opacity-60">
                    <CheckCircle2 size={17} /> {selfLineup.presence ? "Presenca confirmada" : "Confirmar presenca"}
                  </button>
                  <button type="button" disabled={presenceMutation.isPending} onClick={() => confirmNextGame(false)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 font-black text-slate-700 hover:bg-slate-100 disabled:opacity-60">
                    Fora do jogo
                  </button>
                </div>
              ) : (
                <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">Voce ainda nao esta escalado neste jogo.</p>
              )}
            </div>
          ) : (
            <p className="mt-5 rounded-lg border border-dashed border-slate-300 p-5 text-sm font-semibold text-slate-500">Nenhum proximo jogo cadastrado para o atleta.</p>
          )}
        </article>

        <article id="atleta-evolucao" className="scroll-mt-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Desempenho na temporada</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">Evolucao mensal</h2>
            </div>
            <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-600">{overview.period.year}</span>
          </div>
          {evolutionForLayout.length > 0 ? (
            <div className="mt-5 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evolutionForLayout}>
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="goals" stroke="#dc2626" strokeWidth={2.5} name="Gols" />
                  <Line type="monotone" dataKey="assists" stroke="#0ea5e9" strokeWidth={2.5} name="Assistencias" />
                  <Line type="monotone" dataKey="presencePercent" stroke="#16a34a" strokeWidth={2.5} name="Presenca %" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="mt-5 rounded-lg border border-dashed border-slate-300 p-5 text-sm font-semibold text-slate-500">Sem dados de evolucao no periodo.</p>
          )}
        </article>

        <div className="space-y-5">
          <article id="atleta-financeiro" className="scroll-mt-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Situacao financeira</p>
                <strong className="mt-3 block text-3xl font-black text-slate-950">{formatCurrency(currentPayment.amountCents ?? overview.associate.monthlyFeeCents)}</strong>
                <p className="mt-1 text-sm font-semibold text-slate-500">{paymentStatusLabels[currentPayment.status ?? "PENDING"] ?? "Pendente"}</p>
              </div>
              <span className={`rounded-lg px-3 py-2 text-xs font-black ${isPaid ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{isPaid ? "Em dia" : "Pendente"}</span>
            </div>
            <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-bold text-slate-500">Vencimento</p>
              <strong className="mt-1 block text-lg text-slate-950">{paymentDueDate}</strong>
            </div>
            {!isPaid ? (
              <button type="button" className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 font-black text-white hover:bg-red-700 disabled:opacity-60" disabled={checkoutMutation.isPending} onClick={() => void checkoutMutation.mutateAsync()}>
                <QrCode size={18} /> {checkoutMutation.isPending ? "Gerando Pix..." : "Gerar Pix"}
              </button>
            ) : (
              <div className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 font-black text-emerald-700"><CircleCheck size={16} /> Mensalidade quitada</div>
            )}
          </article>

          <article id="atleta-saude" className="scroll-mt-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Saude e disponibilidade</p>
                <h2 className="mt-2 text-xl font-black text-slate-950">{medicalStatusLabels[medicalStatus]}</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">{overview.athlete.medicalNote || "Nenhuma observacao medica cadastrada."}</p>
              </div>
              <span className="grid size-12 place-items-center rounded-lg bg-emerald-50 text-emerald-700"><Activity size={22} /></span>
            </div>
            <div className="mt-4 grid gap-2">
              <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold" value={medicalForm.medicalStatus} onChange={(event) => setMedicalForm((current) => ({ ...current, medicalStatus: event.target.value as AthleteMedicalStatus }))}>
                {Object.entries(medicalStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <button type="button" className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50" disabled={medicalMutation.isPending} onClick={() => void medicalMutation.mutateAsync()}>
                {medicalMutation.isPending ? "Enviando..." : "Salvar aviso medico"}
              </button>
            </div>
          </article>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,.8fr)_minmax(0,.85fr)]">
        <article id="atleta-jogos" className="scroll-mt-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-black text-slate-950">Ultimos jogos</h2>
            <button type="button" className="text-sm font-black text-blue-700">Ver todos</button>
          </div>
          {recentGamesForLayout.length > 0 ? (
            <div className="mt-5 divide-y divide-slate-100">
              {recentGamesForLayout.map((game) => (
                <div key={game.gameId} className="grid gap-3 py-3 text-sm sm:grid-cols-[4rem_minmax(0,1fr)_4rem_minmax(0,1fr)_auto] sm:items-center">
                  <span className="font-bold text-slate-500">{new Date(game.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span>
                  <strong className="truncate text-slate-950">{game.redTeamName ?? "Time A"}</strong>
                  <strong className="text-center text-slate-950">{game.redScore ?? "-"} x {game.whiteScore ?? "-"}</strong>
                  <strong className="truncate text-slate-950">{game.whiteTeamName ?? "Time B"}</strong>
                  <span className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700">{game.goals} gol(s)</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-lg border border-dashed border-slate-300 p-5 text-sm font-semibold text-slate-500">Sem jogos recentes registrados para este atleta.</p>
          )}
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Rankings do time</h2>
          {topGoalsForLayout.length > 0 ? (
            <div className="mt-5 space-y-2">
              {topGoalsForLayout.map((row) => (
                <div key={row.athleteId} className={`grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-3 py-3 ${row.athleteId === overview.athlete.id ? "bg-red-50" : "bg-slate-50"}`}>
                  <strong className="text-slate-500">{row.rank}</strong>
                  <span className="truncate font-black text-slate-950">{row.name}</span>
                  <strong className="text-sm text-slate-700">{row.value} gol(s)</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-lg border border-dashed border-slate-300 p-5 text-sm font-semibold text-slate-500">Sem ranking calculado no periodo.</p>
          )}
        </article>

        <article id="atleta-perfil" className="scroll-mt-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Meu perfil</h2>
          <div className="mt-5 space-y-4">
            <div><p className="text-xs font-black uppercase text-slate-500">Email</p><p className="mt-1 text-sm font-semibold text-slate-900">{user.email ?? overview.associate.email ?? "-"}</p></div>
            <div><p className="text-xs font-black uppercase text-slate-500">Telefone</p><p className="mt-1 text-sm font-semibold text-slate-900">{overview.associate.phone ?? "-"}</p></div>
            <div><p className="text-xs font-black uppercase text-slate-500">Perfis</p><p className="mt-1 text-sm font-semibold text-slate-900">{formatRoleList(user.roles, user.role)}</p></div>
            <div><p className="text-xs font-black uppercase text-slate-500">Adimplencia</p><p className="mt-1 text-sm font-semibold text-slate-900">{overview.insights.adimplenciaPercent}%</p></div>
          </div>
        </article>
      </div>

      <article id="atleta-historico" className="scroll-mt-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-950">Historico financeiro</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">Pagamentos reais retornados pela API.</p>
          </div>
          <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-600">Pago no ano: {formatCurrency(overview.financeSummary.paidCentsInYear)}</span>
        </div>
        {recentPaymentsForLayout.length > 0 ? (
          <div className="mt-5 overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-[42rem] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
                <tr><th>Referencia</th><th>Vencimento</th><th>Valor</th><th>Status</th><th>Pagamento</th></tr>
              </thead>
              <tbody>
                {recentPaymentsForLayout.map((paymentItem) => (
                  <tr key={paymentItem.id} className="border-t border-slate-100">
                    <td className="font-black text-slate-950">{String(paymentItem.month).padStart(2, "0")}/{paymentItem.year}</td>
                    <td>{new Date(paymentItem.dueDate).toLocaleDateString("pt-BR")}</td>
                    <td>{formatCurrency(paymentItem.amountCents)}</td>
                    <td><span className={paymentItem.status === "PAID" ? "font-black text-emerald-700" : paymentItem.status === "LATE" ? "font-black text-red-700" : "font-black text-amber-700"}>{paymentStatusLabels[paymentItem.status] ?? paymentItem.status}</span></td>
                    <td>{paymentItem.paidAt ? new Date(paymentItem.paidAt).toLocaleDateString("pt-BR") : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-5 rounded-lg border border-dashed border-slate-300 p-5 text-sm font-semibold text-slate-500">Sem pagamentos recentes cadastrados.</p>
        )}
      </article>
    </section>
  );

  return (
    <section className="space-y-4">
      {checkout ? (
        <PixCheckoutModal
          open={pixCheckoutModalOpen}
          payerName={overview.athlete.name ?? user.name ?? "Atleta"}
          reference={`${String(now.month).padStart(2, "0")}/${now.year}`}
          amount={formatCurrency(currentPayment.amountCents ?? overview.associate.monthlyFeeCents)}
          dueDate={currentPayment.dueDate ? new Date(currentPayment.dueDate).toLocaleDateString("pt-BR") : undefined}
          status={paymentStatusLabels[currentPayment.status ?? "PENDING"] ?? "Pendente"}
          statusTone={currentPayment.status === "PAID" ? "paid" : "unpaid"}
          description="Mensalidade do clube"
          txid={checkout.txid}
          pixCopyPaste={checkout.pixCopyPaste}
          qrCodeDataUrl={checkout.qrCodeDataUrl}
          expiresAt={checkout.expiresAt}
          autoSettleSeconds={checkout.autoSettleSeconds}
          onRefresh={() => void checkoutMutation.mutateAsync()}
          onClose={() => setPixCheckoutModalOpen(false)}
        />
      ) : null}
      <article className="overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-950 shadow-sm">
        <div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_26rem] xl:items-stretch">
          <div className="min-w-0">
            <div className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
              <div className="relative size-24 shrink-0">
                {overview.athlete.photoUrl ? (
                  <img src={overview.athlete.photoUrl} alt={overview.athlete.name} className="h-full w-full rounded-full object-cover ring-4 ring-slate-100" />
                ) : (
                  <span className="grid h-full w-full place-items-center rounded-full bg-red-600 text-2xl font-black text-white ring-4 ring-slate-100">
                    {(overview.athlete.name ?? user.name ?? "A")
                      .split(" ")
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join("")
                      .toUpperCase()}
                  </span>
                )}
                <label className="absolute -bottom-1 -right-1 grid size-9 cursor-pointer place-items-center rounded-full border border-slate-200 bg-white text-slate-900 shadow-lg hover:bg-slate-100" title="Carregar foto">
                  <Camera size={17} />
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={photoMutation.isPending}
                    onChange={(event) => handleAthletePhotoUpload(event.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-700">{overview.associate ? "Associado + atleta" : "Atleta"}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{overview.membership.tenureLabel}</span>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">Liberado {readinessScore}%</span>
                  {photoMutation.isPending ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">Salvando foto...</span> : null}
                </div>
                <h1 className="mt-4 truncate text-3xl font-black leading-tight sm:text-4xl">{overview.athlete.name ?? user.name ?? "Atleta"}</h1>
                <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
                  {positionLabels[overview.athlete.position ?? "LINE"] ?? overview.athlete.position} · Nível {overview.athlete.rating ?? "-"} · mensalidade, escalação, presença e saúde em uma conta.
                </p>
                {photoError ? <p className="mt-2 text-xs font-semibold text-red-600">{photoError}</p> : null}
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Próximo jogo</p>
                <strong className="mt-2 block truncate text-lg font-black text-slate-950">{nextGame ? formatDateTime(nextGame.date) : "Sem escala"}</strong>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Pagamento</p>
                <strong className={`mt-2 block truncate text-lg font-black ${isPaid ? "text-emerald-700" : "text-amber-700"}`}>{paymentStatusLabels[currentPayment.status ?? "PENDING"] ?? "Pendente"}</strong>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Ranking</p>
                <strong className="mt-2 block truncate text-lg font-black text-slate-950">{overview.ranking.presenceRank ? `#${overview.ranking.presenceRank} presença` : "Sem ranking"}</strong>
              </div>
            </div>
          </div>

          <div className="grid content-between gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Sua próxima ação</p>
              <h2 className="mt-2 text-xl font-black text-slate-950">{selfLineup?.confirmedAt ? selfConfirmationLabel : nextGame ? "Confirme presença" : "Acompanhe sua conta"}</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {nextGame ? `${nextGame.location} · ${teamName}` : "Quando houver escalação, ela aparece aqui primeiro."}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {selfLineup ? (
                <>
                  <button
                    type="button"
                    disabled={presenceMutation.isPending || selfLineup.presence}
                    onClick={() => confirmNextGame(true)}
                    className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-3 text-center text-xs font-black disabled:opacity-60 ${selfLineup.presence ? "border border-emerald-200 bg-emerald-50 text-emerald-700" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}
                  >
                    <CheckCircle2 size={15} />
                    {selfLineup.presence ? "Confirmado" : "Confirmar"}
                  </button>
                  <button
                    type="button"
                    disabled={presenceMutation.isPending}
                    onClick={() => confirmNextGame(false)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-3 text-center text-xs font-black text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                  >
                    Fora
                  </button>
                </>
              ) : null}
              {!isPaid ? (
                <button type="button" className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-3 py-3 text-center text-xs font-black text-white hover:bg-red-700 disabled:opacity-60" disabled={checkoutMutation.isPending} onClick={() => void checkoutMutation.mutateAsync()}>
                  <QrCode size={15} />
                  Pix
                </button>
              ) : null}
              <button onClick={logout} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-3 text-xs font-black text-slate-700 hover:bg-slate-100">
                <LogOut size={15} /> Sair
              </button>
            </div>
          </div>
        </div>
      </article>

      <PortalMenu items={athletePortalMenu} onSelect={scrollToSection} />

      {missingDataItems.length > 0 ? (
        <article className="rounded-lg border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.08em] text-amber-700">Dados reais pendentes</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">Itens que faltam para a tela ficar completa</h2>
              <p className="mt-1 text-sm font-semibold text-slate-600">Nao usei dados ficticios aqui. Estes pontos dependem de cadastro ou calculo no sistema.</p>
            </div>
            <span className="rounded-lg bg-white px-3 py-2 text-xs font-black text-amber-800">{missingDataItems.length} pendente(s)</span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {missingDataItems.map((item) => (
              <div key={`${item.area}-${item.title}`} className="rounded-lg border border-amber-200 bg-white p-3">
                <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-amber-800">{item.area}</span>
                <h3 className="mt-3 text-sm font-black text-slate-950">{item.title}</h3>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">{item.detail}</p>
              </div>
            ))}
          </div>
        </article>
      ) : null}

      <article className="hidden rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {[
            ["atleta-resumo", "Resumo"],
            ["atleta-confirmacao", "Confirmação"],
            ["atleta-evolucao", "Evolução"],
            ["atleta-jogos", "Jogos"],
            ["atleta-financeiro", "Financeiro"],
            ["atleta-convites", "Convites"]
          ].map(([id, label]) => (
            <button key={id} type="button" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50" onClick={() => scrollToSection(id)}>
              {label}
            </button>
          ))}
        </div>
      </article>

      <div id="atleta-resumo" className="scroll-mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Prontidao" value={`${readinessScore}%`} helper={selfLineup?.confirmedAt ? selfConfirmationLabel : "Status do jogo"} icon={<CheckCircle2 size={18} />} />
        <StatCard label="Jogos" value={overview.numbers.gamesPlayed} helper={`${overview.presence.presencePercent}% de presenca`} icon={<CalendarDays size={18} />} />
        <StatCard label="Gols" value={overview.numbers.goals} helper={`${goalParticipation} participacoes`} icon={<Target size={18} />} />
        <StatCard label="Assistências" value={overview.numbers.assists} icon={<Activity size={18} />} />
        <StatCard label="Presença" value={`${overview.presence.presencePercent}%`} icon={<Users size={18} />} />
        <StatCard label="Ranking presença" value={overview.ranking.presenceRank ? `#${overview.ranking.presenceRank}` : "-"} icon={<Medal size={18} />} />
      </div>

      <div id="atleta-evolucao" className="scroll-mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(22rem,0.75fr)]">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.08em] text-red-600">Dashboard</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">Evolução de desempenho</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">Gols, assistências e presença no ano de {overview.period.year}.</p>
            </div>
            <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-600">{goalParticipation} participações em gol</span>
          </div>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={overview.evolution}>
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="goals" stroke="#dc2626" strokeWidth={2.5} name="Gols" />
                <Line type="monotone" dataKey="assists" stroke="#0ea5e9" strokeWidth={2.5} name="Assistências" />
                <Line type="monotone" dataKey="presencePercent" stroke="#16a34a" strokeWidth={2.5} name="Presença %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">O que o atleta precisa saber</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">Central de ações</h2>
            </div>
            <span className={`rounded-lg px-3 py-2 text-xs font-black ${isPaid ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
              {paymentStatusLabels[currentPayment.status ?? "PENDING"] ?? "Pendente"}
            </span>
          </div>
          <div className="mt-4 space-y-3">
            <button type="button" onClick={() => scrollToSection("atleta-confirmacao")} className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-left hover:border-red-200 hover:bg-red-50">
              <CalendarDays size={18} className="text-red-600" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-black text-slate-950">{nextGame ? formatDateTime(nextGame.date) : "Sem próximo jogo"}</span>
                <span className="block truncate text-xs font-semibold text-slate-500">{nextGame ? `${teamName} - ${selfConfirmationLabel}` : "A escala aparece aqui quando o admin publicar."}</span>
              </span>
            </button>
            <button type="button" onClick={() => scrollToSection("atleta-financeiro")} className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-left hover:border-red-200 hover:bg-red-50">
              <CreditCard size={18} className="text-red-600" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-black text-slate-950">{formatCurrency(currentPayment.amountCents ?? overview.associate.monthlyFeeCents)}</span>
                <span className="block truncate text-xs font-semibold text-slate-500">Vencimento {paymentDueDate}</span>
              </span>
            </button>
            <button type="button" onClick={() => scrollToSection("atleta-saude")} className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-left hover:border-red-200 hover:bg-red-50">
              <Activity size={18} className="text-red-600" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-black text-slate-950">{medicalStatusLabels[overview.athlete.medicalStatus ?? "CLEARED"]}</span>
                <span className="block truncate text-xs font-semibold text-slate-500">Informe dor, lesão ou restrição antes do jogo.</span>
              </span>
            </button>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs font-black uppercase text-slate-500">G+A</p>
              <p className="mt-1 text-xl font-black text-slate-950">{goalParticipation}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs font-black uppercase text-slate-500">Cartões</p>
              <p className="mt-1 text-xl font-black text-slate-950">{cardsTotal}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs font-black uppercase text-slate-500">Pres.</p>
              <p className="mt-1 text-xl font-black text-slate-950">{overview.presence.presencePercent}%</p>
            </div>
          </div>
        </article>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.65fr)]">
        <article id="atleta-confirmacao" className="scroll-mt-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-950">Próximo jogo</h2>
              <p className="mt-1 text-sm text-slate-500">{nextGame ? formatDateTime(nextGame.date) : "Nenhum jogo escalado para você."}</p>
            </div>
            {selfLineup ? (
              <span className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-black ${selfLineup.confirmedAt ? selfLineup.presence ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
                <CheckCircle2 size={17} />
                {selfConfirmationLabel}
              </span>
            ) : null}
          </div>

          {nextGame ? (
            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1fr)]">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="space-y-3 text-sm font-semibold text-slate-700">
                  <p className="flex items-center gap-2"><MapPin size={17} className="text-slate-500" /> {nextGame.location}</p>
                  <p className="flex items-center gap-2"><Shirt size={17} className="text-slate-500" /> {teamName}</p>
                  <p className="flex items-center gap-2"><Trophy size={17} className="text-slate-500" /> {roleGameLabels[nextGame.role]} {nextGame.tacticalSlot ? `P${nextGame.tacticalSlot}` : ""}</p>
                  <p className="flex items-center gap-2"><Clock3 size={17} className="text-slate-500" /> {nextGame.status === "RUNNING" ? "Em andamento" : nextGame.status === "FINISHED" ? "Encerrado" : "Agendado"}</p>
                </div>
                <div className="mt-4 rounded-lg bg-white p-3">
                  <p className="text-xs font-black uppercase text-slate-500">Sua camisa</p>
                  <p className="mt-1 text-2xl font-black text-slate-950">{nextGame.jerseyNumber !== null ? `#${nextGame.jerseyNumber}` : "Sem número"}</p>
                </div>
                {selfLineup ? (
                  <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-xs font-black uppercase text-slate-500">Confirmação para o admin</p>
                    <div className="mt-3 grid gap-2">
                      <select
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold"
                        value={confirmationForm.arrivalStatus}
                        onChange={(event) => setConfirmationForm((current) => ({ ...current, arrivalStatus: event.target.value as keyof typeof arrivalStatusLabels }))}
                      >
                        {Object.entries(arrivalStatusLabels).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                      <textarea
                        className="min-h-20 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        value={confirmationForm.confirmationNote}
                        maxLength={280}
                        onChange={(event) => setConfirmationForm((current) => ({ ...current, confirmationNote: event.target.value }))}
                        placeholder="Mensagem para o admin: carona, atraso, restrição, observação..."
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <button type="button" disabled={presenceMutation.isPending} onClick={() => confirmNextGame(true)} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-50">
                          Confirmar
                        </button>
                        <button type="button" disabled={presenceMutation.isPending} onClick={() => confirmNextGame(false)} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-black text-red-700 hover:bg-red-100 disabled:opacity-50">
                          Fora
                        </button>
                      </div>
                      {selfLineup.confirmedAt ? (
                        <p className="text-xs font-semibold text-slate-500">
                          Última resposta: {new Date(selfLineup.confirmedAt).toLocaleString("pt-BR")}
                          {selfLineup.arrivalStatus ? ` - ${arrivalStatusLabels[selfLineup.arrivalStatus] ?? selfLineup.arrivalStatus}` : ""}
                        </p>
                      ) : null}
                      {selfLineup.confirmationNote ? <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">{selfLineup.confirmationNote}</p> : null}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="rounded-lg border border-slate-200 p-4">
                <h3 className="text-sm font-black uppercase tracking-[0.08em] text-slate-500">Sua escalação</h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {lineupTeam.map((lineup) => (
                    <div key={lineup.id} className={`rounded-lg border px-3 py-2 ${lineup.athleteId === overview.athlete.id ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"}`}>
                      <p className="truncate text-sm font-bold text-slate-950">{lineup.jerseyNumber !== null ? `#${lineup.jerseyNumber} ` : ""}{lineup.athleteName}</p>
                      <p className="text-xs font-semibold text-slate-500">{roleGameLabels[lineup.role]} {lineup.tacticalSlot ? `· P${lineup.tacticalSlot}` : ""}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : <p className="mt-4 rounded-lg border border-dashed border-slate-300 p-5 text-sm text-slate-500">Quando você for escalado, confirmação, uniforme, posição e banco aparecem aqui.</p>}
        </article>

        <article id="atleta-saude" className="scroll-mt-4 rounded-lg border border-amber-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.08em] text-amber-700">Departamento médico</p>
              <h2 className="mt-1 text-xl font-bold text-slate-950">Avisar condição física</h2>
              <p className="mt-1 text-sm text-slate-500">Informe dor, lesão, tratamento ou restrição para o administrador e comissão.</p>
            </div>
            <span className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-black text-amber-800">{medicalStatusLabels[overview.athlete.medicalStatus ?? "CLEARED"]}</span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem]">
            <label className="text-sm font-semibold text-slate-700">
              Status
              <select className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" value={medicalForm.medicalStatus} onChange={(event) => setMedicalForm((current) => ({ ...current, medicalStatus: event.target.value as AthleteMedicalStatus }))}>
                {Object.entries(medicalStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="text-sm font-semibold text-slate-700">
              Retorno previsto
              <input type="date" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" value={medicalForm.medicalReturnDate} onChange={(event) => setMedicalForm((current) => ({ ...current, medicalReturnDate: event.target.value }))} />
            </label>
            <label className="md:col-span-2 text-sm font-semibold text-slate-700">
              Observação
              <textarea className="mt-1 min-h-20 w-full rounded-lg border border-slate-200 px-3 py-2" value={medicalForm.medicalNote} maxLength={700} onChange={(event) => setMedicalForm((current) => ({ ...current, medicalNote: event.target.value }))} placeholder="Ex.: senti dor no posterior, estou em tratamento, consigo jogar poucos minutos..." />
            </label>
          </div>
          <button type="button" className="mt-3 inline-flex min-h-10 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-50" disabled={medicalMutation.isPending} onClick={() => void medicalMutation.mutateAsync()}>
            {medicalMutation.isPending ? "Enviando..." : "Enviar aviso médico"}
          </button>
          {medicalMutation.isSuccess ? <p className="mt-2 text-xs font-semibold text-emerald-700">Aviso médico registrado.</p> : null}
        </article>

        <article id="atleta-financeiro" className="scroll-mt-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">Financeiro atual</h2>
          <div className="mt-4 grid gap-3">
            <div className="rounded-lg border border-slate-200 p-3"><p className="text-xs uppercase text-slate-500">Mensalidade</p><p className="text-2xl font-black text-slate-950">{formatCurrency(currentPayment.amountCents ?? overview.associate.monthlyFeeCents)}</p></div>
            <div className="rounded-lg border border-slate-200 p-3"><p className="text-xs uppercase text-slate-500">Status</p><p className="text-xl font-bold text-slate-950">{paymentStatusLabels[currentPayment.status ?? "PENDING"] ?? "Pendente"}</p></div>
            <div className="rounded-lg border border-slate-200 p-3"><p className="text-xs uppercase text-slate-500">Vencimento</p><p className="text-xl font-bold text-slate-950">{currentPayment.dueDate ? new Date(currentPayment.dueDate).toLocaleDateString("pt-BR") : "-"}</p></div>
          </div>
          {!isPaid ? (
            <button type="button" className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 font-semibold text-white hover:bg-red-700 disabled:opacity-60" disabled={checkoutMutation.isPending} onClick={() => void checkoutMutation.mutateAsync()}>
              <QrCode size={18} /> {checkoutMutation.isPending ? "Gerando QR..." : "Gerar Pix"}
            </button>
          ) : (
            <div className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700"><CircleCheck size={16} /> Mensalidade quitada</div>
          )}
        </article>
      </div>

      {checkout ? (
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-bold text-slate-950">QR Code Pix</h3>
          <div className="mt-3 grid gap-3 lg:grid-cols-[200px,1fr]">
            <img src={checkout.qrCodeDataUrl} alt="QR Code Pix" className="size-48 rounded-lg border border-slate-200 bg-white p-2" />
            <div>
              <textarea readOnly value={checkout.pixCopyPaste} className="min-h-28 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-700" />
              <button type="button" className="mt-2 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={() => void copyPixCode()}><Copy size={16} />Copiar código Pix</button>
            </div>
          </div>
        </article>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-4">
        <RankingList title="Artilharia" rows={overview.ranking.topGoals} />
        <RankingList title="Assistências" rows={overview.ranking.topAssists} />
        <RankingList title="Vitórias" rows={overview.ranking.topWins} />
        <RankingList title="Presença" rows={overview.ranking.topPresence} suffix="%" />
      </div>

      <article id="atleta-graficos-detalhados" className="scroll-mt-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-bold text-slate-950">Evolução mensal ({overview.period.year})</h3>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="h-60 rounded-lg border border-slate-200 p-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={overview.evolution}>
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="goals" stroke="#dc2626" strokeWidth={2.5} name="Gols" />
                <Line type="monotone" dataKey="assists" stroke="#0ea5e9" strokeWidth={2.5} name="Assistências" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="h-60 rounded-lg border border-slate-200 p-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={overview.evolution}>
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="presencePercent" stroke="#16a34a" strokeWidth={2.5} name="Presença" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </article>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.8fr)]">
        <article id="atleta-jogos" className="scroll-mt-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-bold text-slate-950">Últimos jogos</h3>
          <div className="mt-3 space-y-2">
            {overview.recentGames.length > 0 ? overview.recentGames.map((game) => (
              <div key={game.gameId} className="rounded-lg border border-slate-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold text-slate-950">{formatDateTime(game.date)} · {game.location}</p>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-black text-slate-700">{game.redScore ?? "-"} x {game.whiteScore ?? "-"}</span>
                </div>
                <p className="mt-1 text-sm text-slate-600">{sideLabels[game.side]} · {roleGameLabels[game.role]} · Gols {game.goals} · Assistências {game.assists}</p>
                {game.substitutions.length > 0 ? <p className="mt-1 text-xs font-semibold text-slate-500">{game.substitutions.map((sub) => `${sub.minute ?? "-"}' ${sub.direction === "IN" ? "entrou" : "saiu"}`).join(" - ")}</p> : null}
              </div>
            )) : <p className="text-sm text-slate-500">Sem jogos recentes registrados.</p>}
          </div>
        </article>

        <article id="atleta-convites" className="scroll-mt-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-bold text-slate-950">Convites</h3>
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-semibold text-slate-900">{overview.invite.groupName}</p>
            <button type="button" disabled={!overview.invite.code} onClick={() => void copyInviteLink(overview.invite.code)} className="mt-2 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              <Copy size={16} /> Copiar link de convite
            </button>
          </div>
          <form
            className="mt-4 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void inviteMutation.mutateAsync();
            }}
          >
            <input className="w-full rounded-lg border border-slate-200 px-3 py-2" placeholder="Nome do convidado" value={inviteForm.name} onChange={(event) => setInviteForm((current) => ({ ...current, name: event.target.value }))} required />
            <input className="w-full rounded-lg border border-slate-200 px-3 py-2" placeholder="Email" type="email" value={inviteForm.email} onChange={(event) => setInviteForm((current) => ({ ...current, email: event.target.value }))} required />
            <input className="w-full rounded-lg border border-slate-200 px-3 py-2" placeholder="Telefone" value={inviteForm.phone} onChange={(event) => setInviteForm((current) => ({ ...current, phone: event.target.value }))} />
            <button type="submit" disabled={inviteMutation.isPending} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"><UserPlus size={17} />Indicar atleta</button>
          </form>
          <div className="mt-4 space-y-2">
            {(joinRequestsQuery.data ?? []).slice(0, 4).map((request) => (
              <div key={request.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2">
                <span className="truncate text-sm font-semibold text-slate-900">{request.name}</span>
                <span className="text-xs font-black text-slate-500">{request.status}</span>
              </div>
            ))}
          </div>
        </article>
      </div>

      <article id="atleta-perfil" className="scroll-mt-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-bold text-slate-950">Meu perfil e financeiro</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div><p className="text-xs uppercase text-slate-500">Email</p><p className="text-sm font-semibold text-slate-900">{user.email ?? overview.associate.email ?? "-"}</p></div>
          <div><p className="text-xs uppercase text-slate-500">Telefone</p><p className="text-sm font-semibold text-slate-900">{overview.associate.phone ?? "-"}</p></div>
          <div><p className="text-xs uppercase text-slate-500">Perfis</p><p className="text-sm font-semibold text-slate-900">{formatRoleList(user.roles, user.role)}</p></div>
          <div><p className="text-xs uppercase text-slate-500">Adimplência</p><p className="text-sm font-semibold text-slate-900">{overview.insights.adimplenciaPercent}%</p></div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 p-3"><CreditCard size={17} className="text-slate-500" /><p className="mt-2 text-sm text-slate-700">Pagos: {overview.financeSummary.paidCount}</p></div>
          <div className="rounded-lg border border-slate-200 p-3"><Clock3 size={17} className="text-slate-500" /><p className="mt-2 text-sm text-slate-700">Pendentes: {overview.financeSummary.pendingCount}</p></div>
          <div className="rounded-lg border border-slate-200 p-3"><MailCheck size={17} className="text-slate-500" /><p className="mt-2 text-sm text-slate-700">Pago no ano: {formatCurrency(overview.financeSummary.paidCentsInYear)}</p></div>
        </div>
      </article>

      <article id="atleta-historico" className="scroll-mt-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-950">Historico pessoal</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">Sua linha do tempo de associado e atleta no clube.</p>
          </div>
          <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-600">{overview.membership.tenureLabel}</span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-black uppercase text-slate-500">Entrada no grupo</p>
            <p className="mt-1 text-lg font-black text-slate-950">{new Date(overview.membership.joinedAt).toLocaleDateString("pt-BR")}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-black uppercase text-slate-500">Participacao em gols</p>
            <p className="mt-1 text-lg font-black text-slate-950">{overview.insights.goalParticipations}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-black uppercase text-slate-500">Cartoes</p>
            <p className="mt-1 text-lg font-black text-slate-950">{overview.numbers.yellowCards + overview.numbers.redCards}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-black uppercase text-slate-500">Camisas</p>
            <p className="mt-1 truncate text-lg font-black text-slate-950">{overview.numbers.favoriteShirtNumbers.length ? overview.numbers.favoriteShirtNumbers.map((number) => `#${number}`).join(", ") : "-"}</p>
          </div>
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <div className="bg-slate-50 px-3 py-2 text-xs font-black uppercase text-slate-500">Ultimos jogos</div>
            {overview.recentGames.length > 0 ? overview.recentGames.slice(0, 5).map((game) => (
              <div key={`history-game-${game.gameId}`} className="grid gap-1 border-t border-slate-100 px-3 py-3 text-sm">
                <span className="font-black text-slate-950">{formatDateTime(game.date)} - {game.location}</span>
                <span className="font-semibold text-slate-500">{sideLabels[game.side]} - {roleGameLabels[game.role]} - gols {game.goals} - assistencias {game.assists}</span>
              </div>
            )) : <p className="p-4 text-sm font-semibold text-slate-500">Sem jogos recentes.</p>}
          </div>
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <div className="bg-slate-50 px-3 py-2 text-xs font-black uppercase text-slate-500">Ultimos pagamentos</div>
            {overview.recentPayments.length > 0 ? overview.recentPayments.slice(0, 5).map((paymentItem) => (
              <div key={`history-payment-${paymentItem.id}`} className="grid grid-cols-[minmax(0,1fr)_7rem_7rem] gap-2 border-t border-slate-100 px-3 py-3 text-sm">
                <span className="font-black text-slate-950">{String(paymentItem.month).padStart(2, "0")}/{paymentItem.year}</span>
                <span className="font-semibold text-slate-600">{formatCurrency(paymentItem.amountCents)}</span>
                <span className={paymentItem.status === "PAID" ? "font-black text-emerald-700" : paymentItem.status === "LATE" ? "font-black text-red-700" : "font-black text-amber-700"}>
                  {paymentStatusLabels[paymentItem.status] ?? paymentItem.status}
                </span>
              </div>
            )) : <p className="p-4 text-sm font-semibold text-slate-500">Sem pagamentos recentes.</p>}
          </div>
        </div>
      </article>
    </section>
  );
}
