import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  BookOpenText,
  CalendarCheck2,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  CircleDollarSign,
  ClipboardList,
  FileText,
  HeartPulse,
  Mail,
  Phone,
  Shield,
  Star,
  Target,
  Trophy,
  TrendingUp,
  UserCheck,
  UserRound,
  UsersRound,
  WalletCards
} from "lucide-react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import { apiRequest } from "../services/api";
import type { AssociateStatus, AthleteAccountOverview, AthleteLinkType, AthleteMedicalStatus, AthletePosition, AthleteStatus, LineupRole, PaymentStatus, TeamSide } from "../types/domain";

type OutletPeriod = {
  month: number;
  year: number;
};

const positionLabels: Record<AthletePosition, string> = {
  GOALKEEPER: "Goleiro",
  DEFENDER: "Zagueiro",
  FULLBACK: "Lateral",
  MIDFIELDER: "Meia",
  FORWARD: "Atacante",
  LINE: "Linha",
  BOTH: "Goleiro/Linha",
  RIGHT_BACK: "Lateral direito",
  LEFT_BACK: "Lateral esquerdo",
  DEFENSIVE_MIDFIELDER: "Volante",
  CENTRAL_MIDFIELDER: "Meia central",
  ATTACKING_MIDFIELDER: "Meia atacante",
  RIGHT_WINGER: "Ponta direita",
  LEFT_WINGER: "Ponta esquerda",
  STRIKER: "Centroavante"
};

const athleteStatusLabels: Record<AthleteStatus, string> = {
  ACTIVE: "Ativo",
  INACTIVE: "Inativo",
  DELINQUENT: "Inadimplente",
  SUSPENDED: "Suspenso"
};

const paymentStatusLabels: Record<PaymentStatus, string> = {
  PAID: "Pago",
  PENDING: "Pendente",
  LATE: "Em atraso",
  REFUNDED: "Estornado"
};

const associateStatusLabels: Record<AssociateStatus, string> = {
  ACTIVE: "Ativo",
  LATE: "Em atraso",
  INACTIVE: "Inativo"
};

const linkLabels: Record<AthleteLinkType, string> = {
  ASSOCIATE: "Associado",
  CONTRACTED: "Contratado",
  GUEST: "Convidado"
};

const medicalStatusLabels: Record<AthleteMedicalStatus, string> = {
  CLEARED: "Liberado",
  OBSERVATION: "Em observação",
  INJURED: "Lesionado",
  TREATMENT: "Em tratamento"
};

const roleLabels: Record<LineupRole, string> = {
  STARTER: "Titular",
  RESERVE: "Reserva",
  GOALKEEPER: "Goleiro",
  ABSENT: "Ausente"
};

const sideLabels: Record<TeamSide, string> = {
  RED: "Time A",
  WHITE: "Time B",
  EXTERNAL: "Adversário"
};

type AthleteProfileTab = "DADOS" | "AVALIACAO" | "PARTICIPACOES" | "DISCIPLINA" | "CONVIDADOS" | "FINANCEIRO" | "DOCUMENTOS" | "MEMORIAL";

const profileTabs: Array<{ key: AthleteProfileTab; label: string; icon: typeof UserRound }> = [
  { key: "DADOS", label: "Cadastro", icon: UserRound },
  { key: "AVALIACAO", label: "Técnico", icon: Star },
  { key: "PARTICIPACOES", label: "Jogos e presença", icon: Trophy },
  { key: "DISCIPLINA", label: "Disciplina", icon: Shield },
  { key: "CONVIDADOS", label: "Vínculo", icon: UsersRound },
  { key: "FINANCEIRO", label: "Pagamentos", icon: CircleDollarSign },
  { key: "DOCUMENTOS", label: "Documentos", icon: FileText },
  { key: "MEMORIAL", label: "Acervo", icon: BookOpenText }
];

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((cents || 0) / 100);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}

function StatTile({ label, value, tone = "slate" }: { label: string; value: string | number; tone?: "slate" | "green" | "red" | "amber" }) {
  const valueClass = {
    slate: "text-slate-950",
    green: "text-emerald-700",
    red: "text-red-700",
    amber: "text-amber-700"
  }[tone];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-black ${valueClass}`}>{value}</p>
    </div>
  );
}

function InsightCard({ label, value, description, icon, tone = "slate" }: { label: string; value: string | number; description: string; icon: ReactNode; tone?: "slate" | "green" | "red" | "amber" | "blue" }) {
  const toneClass = {
    slate: "border-slate-200 bg-white text-slate-700",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    red: "border-red-200 bg-red-50 text-red-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700"
  }[tone];

  return (
    <div className={`rounded-lg border p-4 ${toneClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.08em] opacity-80">{label}</p>
          <strong className="mt-2 block truncate text-2xl font-black">{value}</strong>
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-white/70">{icon}</span>
      </div>
      <p className="mt-3 text-sm font-semibold leading-5 opacity-85">{description}</p>
    </div>
  );
}

function ProgressMetric({ label, value, max = 100, detail }: { label: string; value: number; max?: number; detail: string }) {
  const percent = Math.max(0, Math.min(100, max > 0 ? (value / max) * 100 : 0));

  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-black text-slate-700">{label}</span>
        <span className="font-semibold text-slate-500">{detail}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-blue-950" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function ProfileFeatureCard({
  title,
  label,
  description,
  icon,
  action,
  onClick,
  to
}: {
  title: string;
  label: string;
  description: string;
  icon: ReactNode;
  action: string;
  onClick?: () => void;
  to?: string;
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-slate-950 text-white">{icon}</span>
        <span className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-700">{label}</span>
      </div>
      <h3 className="mt-4 text-lg font-black text-slate-950">{title}</h3>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{description}</p>
      <span className="mt-4 inline-flex min-h-10 items-center justify-center rounded-lg bg-white px-3 text-sm font-black text-slate-800 shadow-sm ring-1 ring-slate-200">
        {action}
      </span>
    </>
  );

  if (to) {
    return (
      <Link to={to} className="block rounded-lg border border-slate-200 bg-slate-50 p-4 shadow-sm transition hover:border-blue-200 hover:bg-white">
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className="block rounded-lg border border-slate-200 bg-slate-50 p-4 text-left shadow-sm transition hover:border-blue-200 hover:bg-white">
      {content}
    </button>
  );
}

function statusPillClass(status: AthleteStatus) {
  if (status === "SUSPENDED") return "border border-red-200 bg-red-50 text-red-700";
  if (status === "DELINQUENT") return "border border-amber-200 bg-amber-50 text-amber-700";
  if (status === "INACTIVE") return "border border-slate-200 bg-slate-100 text-slate-700";
  return "border border-emerald-200 bg-emerald-50 text-emerald-700";
}

function paymentPillClass(status: PaymentStatus | null | undefined) {
  if (status === "PAID") return "border border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "LATE") return "border border-red-200 bg-red-50 text-red-700";
  return "border border-amber-200 bg-amber-50 text-amber-700";
}

export function AthleteAccountPage() {
  const { month, year } = useOutletContext<OutletPeriod>();
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState<AthleteProfileTab>("DADOS");

  const accountQuery = useQuery({
    queryKey: ["athlete-account", id, month, year],
    queryFn: () => apiRequest<AthleteAccountOverview>(`/athletes/${id}/account?month=${month}&year=${year}`),
    enabled: Boolean(id)
  });

  if (accountQuery.isLoading) {
    return <div className="rounded-lg border border-slate-200 bg-white p-6 text-slate-500">Carregando conta do atleta...</div>;
  }

  if (accountQuery.isError || !accountQuery.data || !accountQuery.data.athlete) {
    return <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">Não foi possível carregar a conta do atleta.</div>;
  }

  const data = accountQuery.data;
  const associate = data.associate;
  const payment = data.currentPayment;
  const isGuest = data.athlete.linkType === "GUEST";
  const guestChargeLabel = data.athlete.guestBillingEnabled ? formatCurrency(data.athlete.guestFeeCents) : "Isento";
  const ageLabel = data.athlete.age !== null ? `${data.athlete.age} anos` : "Idade não informada";
  const medicalNeedsAttention = data.athlete.medicalStatus !== "CLEARED";
  const financeNeedsAttention = !isGuest && payment?.status !== "PAID";
  const disciplineNeedsAttention = data.numbers.redCards > 0 || data.numbers.yellowCards >= 3 || data.athlete.status === "SUSPENDED";
  const availabilityTone = data.athlete.status === "ACTIVE" && !medicalNeedsAttention && !financeNeedsAttention ? "green" : data.athlete.status === "SUSPENDED" || medicalNeedsAttention ? "red" : "amber";
  const availabilityLabel = availabilityTone === "green" ? "Liberado" : availabilityTone === "red" ? "Atenção" : "Pendente";
  const goalParticipations = data.numbers.goals + data.numbers.assists;
  const goalParticipationAverage = data.numbers.gamesPlayed > 0 ? (goalParticipations / data.numbers.gamesPlayed).toFixed(2) : "0.00";
  const absencePercent = Math.max(0, 100 - data.presence.presencePercent);
  const lastPresenceItems = data.presenceDetails.slice(0, 5);
  const shirtNumbersLabel = data.numbers.favoriteShirtNumbers.length > 0 ? data.numbers.favoriteShirtNumbers.map((value) => `#${value}`).join(", ") : "-";
  const periodPaymentLabel = isGuest
    ? data.athlete.guestBillingEnabled
      ? "Convidado cobrado"
      : "Convidado isento"
    : payment
      ? paymentStatusLabels[payment.status]
      : "Sem lançamento";
  const nextPaymentLabel = payment ? `${formatCurrency(payment.amountCents)} - ${formatDate(payment.dueDate)}` : isGuest ? guestChargeLabel : "Sem cobranca no periodo";
  const latestGame = data.presenceDetails[0] ?? null;

  return (
    <section className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/atletas" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
          <ArrowLeft size={16} />
          Voltar aos atletas
        </Link>
        <Link to={`/atletas?edit=${data.athlete.id}`} className="rounded-lg bg-blue-950 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-900">
          Editar cadastro
        </Link>
      </div>

      <article className="overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-950 shadow-sm">
        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[auto_minmax(0,1fr)_22rem] lg:items-center">
          <div className="flex justify-center sm:justify-start">
            {data.athlete.photoUrl ? (
              <img src={data.athlete.photoUrl} alt={data.athlete.name} className="size-32 rounded-full border-4 border-slate-200 bg-slate-100 object-cover shadow-sm" />
            ) : (
              <div className="grid size-32 place-items-center rounded-full border-4 border-slate-200 bg-blue-950 text-4xl font-black leading-none text-white shadow-sm">
                {initials(data.athlete.name)}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.08em] ${statusPillClass(data.athlete.status)}`}>{athleteStatusLabels[data.athlete.status]}</span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black uppercase tracking-[0.08em] text-slate-700">{positionLabels[data.athlete.position]}</span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black uppercase tracking-[0.08em] text-slate-700">{linkLabels[data.athlete.linkType]}</span>
              <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-[0.08em] text-blue-700">{ageLabel}</span>
            </div>
            <h2 className="mt-4 truncate text-3xl font-black leading-tight sm:text-4xl">{data.athlete.name}</h2>
            <div className="mt-3 flex flex-wrap gap-2 text-sm font-semibold text-slate-500">
              <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"><Star size={15} /> Nivel {data.athlete.rating}</span>
              <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"><Mail size={15} /> {associate?.email ?? "Sem email"}</span>
              <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"><Phone size={15} /> {associate?.phone ?? "Sem telefone"}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => setActiveTab("PARTICIPACOES")} className="inline-flex items-center gap-2 rounded-lg bg-blue-950 px-3 py-2 text-sm font-bold text-white hover:bg-blue-900">
                <CalendarCheck2 size={16} />
                Ver participacoes
              </button>
              <button type="button" onClick={() => setActiveTab(medicalNeedsAttention ? "DADOS" : "AVALIACAO")} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
                <ClipboardList size={16} />
                Ver diagnostico
              </button>
            </div>
          </div>

          <div className="grid gap-2">
            <div className={`rounded-lg border p-3 ${availabilityTone === "green" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : availabilityTone === "red" ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
              <p className="text-xs font-black uppercase tracking-[0.08em]">Disponibilidade</p>
              <p className="mt-1 flex items-center gap-2 text-2xl font-black"><UserCheck size={22} />{availabilityLabel}</p>
              <p className="mt-1 text-xs font-semibold opacity-80">{medicalNeedsAttention ? "Checar saude antes da escala." : financeNeedsAttention ? "Existe pendencia financeira." : "Pronto para convocacao."}</p>
            </div>
            <div className={`rounded-lg border p-3 ${paymentPillClass(payment?.status)}`}>
              <p className="text-xs font-black uppercase tracking-[0.08em]">Financeiro do periodo</p>
              <p className="mt-1 truncate text-lg font-black">{isGuest ? guestChargeLabel : periodPaymentLabel}</p>
              <p className="mt-1 text-xs font-semibold opacity-80">{payment ? `Vence em ${formatDate(payment.dueDate)}` : isGuest ? "Controle por convite." : "Sem lancamento."}</p>
            </div>
          </div>
        </div>
      </article>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <InsightCard label="Leitura rapida" value={availabilityLabel} description={`${athleteStatusLabels[data.athlete.status]} no cadastro, ${medicalStatusLabels[data.athlete.medicalStatus].toLowerCase()} na saude.`} icon={<BadgeCheck size={19} />} tone={availabilityTone} />
        <InsightCard label="Participacao em gols" value={goalParticipations} description={`${goalParticipationAverage} participacoes por jogo no periodo filtrado.`} icon={<Target size={19} />} tone={goalParticipations > 0 ? "blue" : "slate"} />
        <InsightCard label="Presenca" value={`${data.presence.presencePercent}%`} description={`${data.presence.gamesPresent} presencas em ${data.presence.gamesRegistered} convocacoes.`} icon={<TrendingUp size={19} />} tone={data.presence.presencePercent >= 75 ? "green" : data.presence.presencePercent >= 50 ? "amber" : "red"} />
        <InsightCard label="Risco disciplinar" value={disciplineNeedsAttention ? "Observar" : "Ok"} description={`${data.numbers.yellowCards} amarelos e ${data.numbers.redCards} vermelhos registrados.`} icon={<Shield size={19} />} tone={disciplineNeedsAttention ? "amber" : "green"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Ambiente do associado</p>
              <h3 className="mt-1 text-xl font-black text-slate-950">{associate?.name ?? data.athlete.name}</h3>
              <p className="mt-1 text-sm font-semibold text-slate-500">Contato, mensalidade e situacao financeira do membro.</p>
            </div>
            <span className={`rounded-lg px-3 py-2 text-xs font-black ${paymentPillClass(payment?.status)}`}>
              {associate ? associateStatusLabels[associate.status] : linkLabels[data.athlete.linkType]}
            </span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-black uppercase text-slate-500">Mensalidade</p>
              <p className="mt-1 truncate text-lg font-black text-slate-950">{isGuest ? guestChargeLabel : formatCurrency(associate?.monthlyFeeCents ?? 0)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-black uppercase text-slate-500">Pagamento</p>
              <p className="mt-1 truncate text-lg font-black text-slate-950">{periodPaymentLabel}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-black uppercase text-slate-500">Contato</p>
              <p className="mt-1 truncate text-lg font-black text-slate-950">{associate?.email ?? associate?.phone ?? "-"}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => setActiveTab("FINANCEIRO")} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-black text-white hover:bg-emerald-700">
              Ver financeiro
            </button>
            <button type="button" onClick={() => setActiveTab("DADOS")} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">
              Dados do associado
            </button>
          </div>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.08em] text-red-600">Ambiente do atleta</p>
              <h3 className="mt-1 text-xl font-black text-slate-950">{data.athlete.name}</h3>
              <p className="mt-1 text-sm font-semibold text-slate-500">Escalacao, presenca, avaliacao, saude e desempenho.</p>
            </div>
            <span className={`rounded-lg px-3 py-2 text-xs font-black ${statusPillClass(data.athlete.status)}`}>
              {athleteStatusLabels[data.athlete.status]}
            </span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-black uppercase text-slate-500">Posicao</p>
              <p className="mt-1 truncate text-lg font-black text-slate-950">{positionLabels[data.athlete.position]}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-black uppercase text-slate-500">Presenca</p>
              <p className="mt-1 truncate text-lg font-black text-slate-950">{data.presence.presencePercent}%</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-black uppercase text-slate-500">Saude</p>
              <p className="mt-1 truncate text-lg font-black text-slate-950">{medicalStatusLabels[data.athlete.medicalStatus]}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => setActiveTab("PARTICIPACOES")} className="rounded-lg bg-blue-950 px-3 py-2 text-sm font-black text-white hover:bg-blue-900">
              Ver participacoes
            </button>
            <button type="button" onClick={() => setActiveTab("AVALIACAO")} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">
              Avaliacao tecnica
            </button>
          </div>
        </article>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <StatTile label="Jogos" value={data.numbers.gamesPlayed} />
        <StatTile label="Gols" value={data.numbers.goals} />
        <StatTile label="Assistências" value={data.numbers.assists} />
        <StatTile label="Amarelos" value={data.numbers.yellowCards} tone="amber" />
        <StatTile label="Vermelhos" value={data.numbers.redCards} tone="red" />
        <StatTile label="Ranking Presença" value={data.presence.rank ? `#${data.presence.rank}` : "-"} tone="green" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ProfileFeatureCard
          title="Jogos do atleta"
          label={`${data.presence.gamesPresent}/${data.presence.gamesRegistered} presencas`}
          description={latestGame ? `Ultimo registro: ${latestGame.gameLabel}, em ${formatDate(latestGame.date)}, no papel de ${roleLabels[latestGame.role]}.` : "Convocacoes, presenca, camisa e funcao aparecem aqui conforme os jogos forem cadastrados."}
          icon={<CalendarDays size={20} />}
          action="Abrir jogos"
          onClick={() => setActiveTab("PARTICIPACOES")}
        />
        <ProfileFeatureCard
          title="Acervo pessoal"
          label={`${data.numbers.goals + data.numbers.assists} participacoes`}
          description="Historico do atleta com jogos marcantes, gols, assistencias, camisas usadas e materiais ligados ao memorial."
          icon={<BookOpenText size={20} />}
          action="Ver acervo"
          onClick={() => setActiveTab("MEMORIAL")}
        />
        <ProfileFeatureCard
          title="Pagamentos"
          label={periodPaymentLabel}
          description={`Controle financeiro do perfil: ${nextPaymentLabel}. Use esta area para mensalidade, convite ou cobranca do periodo.`}
          icon={<WalletCards size={20} />}
          action="Abrir pagamentos"
          onClick={() => setActiveTab("FINANCEIRO")}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,0.7fr)]">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-blue-700" />
            <h3 className="font-black text-slate-950">Raio-x esportivo</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <ProgressMetric label="Presenca" value={data.presence.presencePercent} detail={`${data.presence.presencePercent}%`} />
            <ProgressMetric label="Nivel tecnico" value={data.athlete.rating} max={10} detail={`${data.athlete.rating}/10`} />
            <ProgressMetric label="Ausencias" value={absencePercent} detail={`${absencePercent}%`} />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Camisas usadas</p>
              <p className="mt-1 truncate text-lg font-black text-slate-950">{shirtNumbersLabel}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Tipo de vinculo</p>
              <p className="mt-1 truncate text-lg font-black text-slate-950">{linkLabels[data.athlete.linkType]}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Produtividade</p>
              <p className="mt-1 truncate text-lg font-black text-slate-950">{goalParticipationAverage}/jogo</p>
            </div>
          </div>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <WalletCards size={20} className="text-emerald-700" />
            <h3 className="font-black text-slate-950">Situacao do periodo</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <span className="font-semibold text-slate-600">Financeiro</span>
              <strong className="text-slate-950">{periodPaymentLabel}</strong>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <span className="font-semibold text-slate-600">Saude</span>
              <strong className="text-slate-950">{medicalStatusLabels[data.athlete.medicalStatus]}</strong>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <span className="font-semibold text-slate-600">Ranking</span>
              <strong className="text-slate-950">{data.presence.rank ? `#${data.presence.rank} de ${data.presence.totalAthletes}` : "-"}</strong>
            </div>
          </div>
        </article>
      </div>

      <article className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
        <div className="flex gap-1 overflow-x-auto">
          {profileTabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-xs font-black ${active ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-50"}`}
                onClick={() => setActiveTab(tab.key)}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </article>

      {activeTab === "DADOS" ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,0.7fr)]">
          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-black text-slate-950">Dados</h3>
            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div><span className="text-slate-500">Vínculo</span><strong className="mt-1 block text-slate-950">{linkLabels[data.athlete.linkType]}</strong></div>
              <div><span className="text-slate-500">Status</span><strong className="mt-1 block text-slate-950">{athleteStatusLabels[data.athlete.status]}</strong></div>
              <div><span className="text-slate-500">Posição</span><strong className="mt-1 block text-slate-950">{positionLabels[data.athlete.position]}</strong></div>
              <div><span className="text-slate-500">Idade</span><strong className="mt-1 block text-slate-950">{ageLabel}</strong></div>
              <div><span className="text-slate-500">Cadastro</span><strong className="mt-1 block text-slate-950">{formatDate(data.athlete.createdAt)}</strong></div>
              <div><span className="text-slate-500">Contato</span><strong className="mt-1 block truncate text-slate-950">{associate?.email ?? associate?.phone ?? "-"}</strong></div>
            </div>
          </article>
          <article className={`rounded-lg border bg-white p-5 shadow-sm ${medicalNeedsAttention ? "border-amber-200" : "border-slate-200"}`}>
            <div className="mb-3 flex items-center gap-2">
              <HeartPulse size={19} className={medicalNeedsAttention ? "text-amber-600" : "text-emerald-600"} />
              <h3 className="font-black text-slate-950">Saúde</h3>
            </div>
            <span className={`inline-flex rounded-lg px-3 py-2 text-xs font-black ${medicalNeedsAttention ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-700"}`}>
              {medicalStatusLabels[data.athlete.medicalStatus]}
            </span>
            {data.athlete.medicalReturnDate ? <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-600"><CalendarClock size={15} />Retorno em {formatDate(data.athlete.medicalReturnDate)}</p> : null}
            <p className="mt-3 text-sm text-slate-600">{data.athlete.medicalNote || "Sem observações médicas."}</p>
          </article>
        </div>
      ) : null}

      {activeTab === "AVALIACAO" ? (
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-black text-slate-950">Avaliação Técnica</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <StatTile label="Nível atual" value={data.athlete.rating} />
            <StatTile label="Jogos" value={data.numbers.gamesPlayed} />
            <StatTile label="Presença" value={`${data.presence.presencePercent}%`} tone="green" />
          </div>
          <p className="mt-4 text-sm text-slate-600">{data.athlete.sportsNote || "Sem observações técnicas cadastradas."}</p>
        </article>
      ) : null}

      {activeTab === "DISCIPLINA" ? (
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-black text-slate-950">Disciplina</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <StatTile label="Amarelos" value={data.numbers.yellowCards} tone="amber" />
            <StatTile label="Vermelhos" value={data.numbers.redCards} tone="red" />
            <StatTile label="Status" value={athleteStatusLabels[data.athlete.status]} />
          </div>
        </article>
      ) : null}

      {activeTab === "CONVIDADOS" ? (
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-black text-slate-950">Convidados</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <StatTile label="Tipo" value={linkLabels[data.athlete.linkType]} />
            <StatTile label="Cobrança" value={isGuest ? guestChargeLabel : "Não se aplica"} />
            <StatTile label="Status" value={isGuest ? periodPaymentLabel : "-"} />
          </div>
        </article>
      ) : null}

      {activeTab === "FINANCEIRO" ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.08em] text-emerald-700">Pagamentos do perfil</p>
                <h3 className="mt-1 text-xl font-black text-slate-950">Financeiro do atleta</h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">Mensalidade, convite e situacao do periodo ficam ligados diretamente ao perfil.</p>
              </div>
              <span className={`rounded-lg px-3 py-2 text-xs font-black ${paymentPillClass(payment?.status)}`}>{periodPaymentLabel}</span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <StatTile label={isGuest ? "Convite" : "Mensalidade"} value={isGuest ? guestChargeLabel : formatCurrency(associate?.monthlyFeeCents ?? 0)} />
              <StatTile label="Periodo" value={periodPaymentLabel} />
              <StatTile label="Vencimento" value={payment ? formatDate(payment.dueDate) : "-"} />
            </div>
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Leitura para escala</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
                {financeNeedsAttention ? "Existe pendencia financeira para revisar antes de confirmar o atleta em jogos oficiais." : "Sem pendencia financeira bloqueando a disponibilidade do atleta neste periodo."}
              </p>
            </div>
          </article>
          <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-black text-slate-950">Acoes rapidas</h3>
            <div className="mt-4 grid gap-2">
              <Link to="/financeiro?area=DASHBOARD" className="inline-flex min-h-10 items-center justify-center rounded-lg bg-emerald-600 px-3 text-sm font-black text-white hover:bg-emerald-700">Abrir financeiro</Link>
              <button type="button" onClick={() => setActiveTab("PARTICIPACOES")} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 hover:bg-slate-50">Conferir jogos</button>
              <Link to={`/atletas?edit=${data.athlete.id}`} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 hover:bg-slate-50">Editar cadastro</Link>
            </div>
          </aside>
        </div>
      ) : null}

      {activeTab === "DOCUMENTOS" ? (
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-black text-slate-950">Documentos</h3>
          <p className="mt-4 text-sm text-slate-500">Nenhum documento vinculado ao perfil.</p>
        </article>
      ) : null}

      {activeTab === "MEMORIAL" ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.08em] text-red-600">Acervo do atleta</p>
                <h3 className="mt-1 text-xl font-black text-slate-950">Memorial pessoal</h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">Jogos, numeros e lembrancas do atleta reunidos no proprio perfil.</p>
              </div>
              <Link to="/memorial/atletas/novo" className="inline-flex min-h-10 items-center rounded-lg bg-red-600 px-3 text-sm font-black text-white hover:bg-red-700">Novo registro</Link>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <StatTile label="Jogos" value={data.numbers.gamesPlayed} />
              <StatTile label="Gols" value={data.numbers.goals} />
              <StatTile label="Assistencias" value={data.numbers.assists} />
              <StatTile label="Camisas" value={data.numbers.favoriteShirtNumbers.length > 0 ? data.numbers.favoriteShirtNumbers.map((value) => `#${value}`).join(", ") : "-"} />
            </div>
            <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
              <div className="bg-slate-50 px-3 py-2 text-xs font-black uppercase text-slate-500">Ultimos registros de jogo</div>
              {lastPresenceItems.length > 0 ? lastPresenceItems.map((item) => (
                <div key={`memorial-${item.lineupId}`} className="grid gap-1 border-t border-slate-100 px-3 py-3 text-sm">
                  <span className="font-black text-slate-950">{item.gameLabel}</span>
                  <span className="font-semibold text-slate-500">{formatDate(item.date)} - {item.location} - {sideLabels[item.side]} - {roleLabels[item.role]}{item.jerseyNumber !== null ? ` - #${item.jerseyNumber}` : ""}</span>
                </div>
              )) : <p className="p-4 text-sm font-semibold text-slate-500">Sem jogos para compor o acervo ainda.</p>}
            </div>
          </article>
          <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-black text-slate-950">Mandar para o acervo</h3>
            <div className="mt-4 grid gap-2">
              <Link to="/memorial/atletas/novo" className="inline-flex min-h-10 items-center justify-center rounded-lg bg-slate-950 px-3 text-sm font-black text-white hover:bg-slate-800">Atleta historico</Link>
              <Link to="/galeria/novo" className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 hover:bg-slate-50">Foto ou video</Link>
              <Link to="/memorial/sumulas/novo" className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 hover:bg-slate-50">Sumula vinculada</Link>
            </div>
          </aside>
        </div>
      ) : null}

      <div className={`grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)] ${activeTab === "PARTICIPACOES" ? "" : "hidden"}`}>
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Trophy size={20} className="text-emerald-600" />
            <h3 className="text-lg font-black text-slate-950">Detalhamento de presença</h3>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <StatTile label="Convocado" value={data.presence.gamesRegistered} />
            <StatTile label="Presente" value={data.presence.gamesPresent} tone="green" />
            <StatTile label="Ausente" value={data.presence.absences} tone="red" />
          </div>

          <ul className="mt-4 divide-y divide-slate-100">
            {lastPresenceItems.map((item) => (
              <li key={item.lineupId} className="grid gap-3 py-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-950">{item.gameLabel}</p>
                  <p className="mt-1 truncate text-xs font-semibold text-slate-500">{formatDate(item.date)} - {item.location}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {sideLabels[item.side]} - {roleLabels[item.role]}{item.jerseyNumber !== null ? ` - #${item.jerseyNumber}` : ""}
                  </p>
                </div>
                <span className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-black ${item.presence ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {item.presence ? <CheckCircle2 size={15} /> : <CircleAlert size={15} />}
                  {item.presence ? "Presente" : "Pendente/Ausente"}
                </span>
              </li>
            ))}
          </ul>

          {data.presenceDetails.length === 0 ? <p className="mt-4 text-sm text-slate-500">Sem jogos registrados para este atleta no ano selecionado.</p> : null}
          {data.presenceDetails.length > lastPresenceItems.length ? <p className="mt-3 text-xs font-semibold text-slate-500">Exibindo os {lastPresenceItems.length} jogos mais recentes do periodo.</p> : null}
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <UserCheck size={20} className="text-blue-700" />
            <h3 className="text-lg font-black text-slate-950">Resumo de confiabilidade</h3>
          </div>
          <div className="space-y-4">
            <ProgressMetric label="Presencas" value={data.presence.gamesPresent} max={Math.max(1, data.presence.gamesRegistered)} detail={`${data.presence.gamesPresent}/${data.presence.gamesRegistered}`} />
            <ProgressMetric label="Ausencias" value={data.presence.absences} max={Math.max(1, data.presence.gamesRegistered)} detail={`${data.presence.absences}/${data.presence.gamesRegistered}`} />
          </div>
          <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Parecer operacional</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
              {data.presence.presencePercent >= 75
                ? "Boa aderencia as convocacoes. Perfil consistente para escalas recorrentes."
                : data.presence.presencePercent >= 50
                  ? "Participacao intermediaria. Vale confirmar disponibilidade antes de jogos chave."
                  : "Baixa presenca no periodo. Recomenda acompanhar comunicacao e justificativas."}
            </p>
          </div>
        </article>
      </div>
    </section>
  );
}
