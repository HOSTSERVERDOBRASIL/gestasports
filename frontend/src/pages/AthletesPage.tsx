import { Fragment, useEffect, useMemo, useState } from"react";
import { useMutation, useQuery, useQueryClient } from"@tanstack/react-query";
import { useLocation, useNavigate, useOutletContext } from"react-router-dom";
import { Activity, AlertTriangle, ArrowLeft, Camera, CheckCircle2, CircleDollarSign, CircleOff, Eye, IdCard, Link2, LockOpen, Mail, Pencil, Phone, Save, Search, Shield, Shuffle, Star, Trash2, UserPlus, UserRound, UsersRound } from"lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiRequest } from"../services/api";
import { DateField } from "../components/ui/DateField";
import { ReauthModal } from "../components/ui/ReauthModal";
import { FullPitchBoard, type PitchPlayer } from "../components/ui/FullPitchBoard";
import type {
  Associate,
  AssociateStatus,
  AthleteLinkType,
  AthletePosition,
  AthleteProfile,
  AthleteMedicalStatus,
  AthleteStatus,
  AthleteTechnicalEvaluationSummary,
  GroupSettings,
  LineupDraft
} from"../types/domain";

type OutletPeriod = {
  month: number;
  year: number;
};

type AthletePayload = {
  name: string;
  position: AthletePosition;
  secondaryPositions: AthletePosition[];
  linkType: AthleteLinkType;
  status: AthleteStatus;
  rating: number;
  birthDate: string | null;
  joinedAt: string | null;
  associateId?: string;
  photoUrl: string;
  sportsNote: string;
  medicalStatus: AthleteMedicalStatus;
  medicalNote: string;
  medicalReturnDate: string | null;
  guestBillingEnabled: boolean;
  guestFeeCents: number;
  associate?: {
    email: string;
    phone: string;
    monthlyFeeCents: number;
    status: AssociateStatus;
    joinedAt: string | null;
  };
};

const blankForm = {
  name:"",
  position:"CENTRAL_MIDFIELDER" as AthletePosition,
  secondaryPositions: [] as AthletePosition[],
  linkType:"ASSOCIATE" as AthleteLinkType,
  status:"ACTIVE" as AthleteStatus,
  rating: 3,
  birthDate:"",
  joinedAt:"",
  associationJoinedAt:"",
  associateId:"",
  monthlyFeeBRL:"60,00",
  guestBillingEnabled: false,
  guestFeeBRL:"0,00",
  email:"",
  phone:"",
  photoUrl:"",
  sportsNote:"",
  medicalStatus:"CLEARED" as AthleteMedicalStatus,
  medicalNote:"",
  medicalReturnDate:"",
  associateStatus:"ACTIVE" as AssociateStatus
};

const medicalStatusLabels: Record<AthleteMedicalStatus, string> = {
  CLEARED: "Liberado",
  OBSERVATION: "Em observação",
  INJURED: "Vetado por lesão",
  TREATMENT: "Em tratamento"
};

const positionLabels: Record<AthletePosition, string> = {
  GOALKEEPER:"Goleiro",
  DEFENDER:"Zagueiro",
  FULLBACK:"Lateral direito",
  MIDFIELDER:"Meia central",
  FORWARD:"Centroavante",
  LINE:"Meia central",
  BOTH:"Goleiro",
  RIGHT_BACK:"Lateral direito",
  LEFT_BACK:"Lateral esquerdo",
  DEFENSIVE_MIDFIELDER:"Volante",
  CENTRAL_MIDFIELDER:"Meia central",
  ATTACKING_MIDFIELDER:"Meia atacante",
  RIGHT_WINGER:"Ponta direita",
  LEFT_WINGER:"Ponta esquerda",
  STRIKER:"Centroavante"
};

const positionGroups: Array<{ label: string; options: Array<[AthletePosition, string]> }> = [
  {
    label:"Defesa",
    options: [
      ["GOALKEEPER", "Goleiro"],
      ["DEFENDER", "Zagueiro"],
      ["RIGHT_BACK", "Lateral direito"],
      ["LEFT_BACK", "Lateral esquerdo"]
    ]
  },
  {
    label:"Meio-campo",
    options: [
      ["DEFENSIVE_MIDFIELDER", "Volante"],
      ["CENTRAL_MIDFIELDER", "Meia central"],
      ["ATTACKING_MIDFIELDER", "Meia atacante"]
    ]
  },
  {
    label:"Ataque",
    options: [
      ["RIGHT_WINGER", "Ponta direita"],
      ["LEFT_WINGER", "Ponta esquerda"],
      ["STRIKER", "Centroavante"]
    ]
  }
] ;

const positionOptions: Array<[AthletePosition, string]> = positionGroups.flatMap((group) => [...group.options]);

const linkLabels: Record<AthleteLinkType, string> = {
  ASSOCIATE:"Associado",
  CONTRACTED:"Contratado",
  GUEST:"Convidado"
};

const ratingLabels: Record<number, string> = {
  1:"Iniciante",
  2:"Básico",
  3:"Intermediário",
  4:"Avançado",
  5:"Destaque"
};

const technicalCriteria = [
  { key: "technicalScore", label: "Técnica" },
  { key: "tacticalScore", label: "Tático" },
  { key: "physicalScore", label: "Físico" },
  { key: "defensiveScore", label: "Defensivo" },
  { key: "offensiveScore", label: "Ofensivo" },
  { key: "commitmentScore", label: "Compromisso" },
  { key: "disciplineScore", label: "Disciplina" }
] as const;

const ATHLETES_PAGE_SIZE = 10;

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style:"currency", currency:"BRL" }).format((cents || 0) / 100);
}

function toCents(value: string) {
  const normalized = value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? Math.max(0, Math.round(amount * 100)) : 0;
}

function buildPayload(form: typeof blankForm): AthletePayload {
  const position = form.linkType === "CONTRACTED" ? "GOALKEEPER" : form.position;
  const secondaryPositions = form.linkType === "CONTRACTED" ? [] : form.secondaryPositions.filter((item) => item !== position);

  return {
    name: form.name,
    position,
    secondaryPositions,
    linkType: form.linkType,
    status: form.status,
    rating: form.rating,
    birthDate: form.birthDate ? new Date(`${form.birthDate}T12:00:00`).toISOString() : null,
    joinedAt: form.joinedAt ? new Date(`${form.joinedAt}T12:00:00`).toISOString() : null,
    ...(form.associateId ? { associateId: form.associateId } : {}),
    photoUrl: form.photoUrl,
    sportsNote: form.sportsNote,
    medicalStatus: form.medicalStatus,
    medicalNote: form.medicalNote,
    medicalReturnDate: form.medicalReturnDate ? new Date(`${form.medicalReturnDate}T12:00:00`).toISOString() : null,
    guestBillingEnabled: form.linkType === "GUEST" ? form.guestBillingEnabled : false,
    guestFeeCents: form.linkType === "GUEST" && form.guestBillingEnabled ? toCents(form.guestFeeBRL) || 0 : 0,
    ...(form.linkType ==="ASSOCIATE" ?
       {
          associate: {
            email: form.email,
            phone: form.phone,
            monthlyFeeCents: toCents(form.monthlyFeeBRL) || 0,
            status: form.associateStatus,
            joinedAt: form.associationJoinedAt ? new Date(`${form.associationJoinedAt}T12:00:00`).toISOString() : null
          }
        }
      : {})
  };
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

function statusClass(athlete: AthleteProfile) {
  if (!athlete.canPlay) {
    return "border-red-200 bg-red-50 text-red-700";
  }
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function athleteChargeLabel(athlete: AthleteProfile) {
  if (athlete.linkType === "GUEST") {
    return athlete.guestBillingEnabled ? formatCurrency(athlete.guestFeeCents) : "Isento";
  }
  if (athlete.linkType === "ASSOCIATE") {
    return formatCurrency(athlete.associate?.monthlyFeeCents ?? 0);
  }
  return "Sem cobrança";
}

function athletePaymentLabel(athlete: AthleteProfile) {
  if (athlete.linkType === "GUEST") {
    return athlete.guestBillingEnabled ? "Convidado cobrado" : "Convidado isento";
  }
  if (athlete.linkType === "CONTRACTED") {
    return "Contratado";
  }
  return athlete.amountDueCents > 0 ? "Pendente" : "Pago";
}

function AthleteMonthlyStatus({ athlete }: { athlete: AthleteProfile }) {
  const isLate = athlete.amountDueCents > 0;

  return (
    <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${isLate ? "border-amber-200 bg-amber-50 text-amber-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
      {isLate ? "Em atraso" : "Em dia"}
    </span>
  );
}

function formFromAthlete(selected: AthleteProfile | null) {
  if (!selected) {
    return blankForm;
  }

  return {
    name: selected.name,
    position: selected.position,
    secondaryPositions: selected.secondaryPositions ?? [],
    linkType: selected.linkType,
    status: selected.status,
    rating: selected.rating,
    birthDate: selected.birthDate ? selected.birthDate.slice(0, 10) : "",
    joinedAt: selected.joinedAt ? selected.joinedAt.slice(0, 10) : "",
    associationJoinedAt: selected.associate?.joinedAt ? selected.associate.joinedAt.slice(0, 10) : "",
    associateId: selected.associateId ?? "",
    monthlyFeeBRL: selected.associate ? String((selected.associate.monthlyFeeCents / 100).toFixed(2)).replace(".",",") :"60,00",
    guestBillingEnabled: selected.guestBillingEnabled,
    guestFeeBRL: String((selected.guestFeeCents / 100).toFixed(2)).replace(".",","),
    email: selected.associate?.email ?? "",
    phone: selected.associate?.phone ?? "",
    photoUrl: selected.photoUrl ?? "",
    sportsNote: selected.sportsNote ?? "",
    medicalStatus: selected.medicalStatus ?? "CLEARED",
    medicalNote: selected.medicalNote ?? "",
    medicalReturnDate: selected.medicalReturnDate ? selected.medicalReturnDate.slice(0, 10) : "",
    associateStatus: selected.associate?.status ?? "ACTIVE"
  };
}

function calculateAgeFromDate(value: string) {
  if (!value) {
    return "";
  }

  const birthDate = new Date(`${value}T12:00:00`);
  if (Number.isNaN(birthDate.getTime())) {
    return "";
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDelta = today.getMonth() - birthDate.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  return age >= 0 ? `${age} anos` : "";
}

function FieldShell({
  label,
  required,
  children
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-xs font-black text-slate-600">
      {label}{required ? <span className="text-red-600"> *</span> : null}
      <div className="mt-1">{children}</div>
    </label>
  );
}

function FormSection({
  title,
  icon,
  children,
  footer
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
        <span className="grid size-8 place-items-center rounded-lg bg-red-50 text-red-600">{icon}</span>
        <h3 className="text-base font-black text-slate-950">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
      {footer ? <div className="border-t border-slate-100 px-4 py-3">{footer}</div> : null}
    </section>
  );
}

const fieldClass = "h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-500/10 disabled:bg-slate-50 disabled:text-slate-500";
const textAreaClass = "min-h-20 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-500/10";

function TechnicalEvaluationPanel({ athlete, year }: { athlete: AthleteProfile; year: number }) {
  const queryClient = useQueryClient();
  const [scores, setScores] = useState({
    technicalScore: 5,
    tacticalScore: 5,
    physicalScore: 5,
    defensiveScore: 5,
    offensiveScore: 5,
    commitmentScore: 5,
    disciplineScore: 5
  });
  const [justification, setJustification] = useState("");
  const [notes, setNotes] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const evaluationQuery = useQuery({
    queryKey: ["athlete-technical-evaluations", athlete.id, year],
    queryFn: () => apiRequest<AthleteTechnicalEvaluationSummary>(`/athletes/${athlete.id}/technical-evaluations?year=${year}`)
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("/auth/reauth", {
        method: "POST",
        body: JSON.stringify({
          password,
          reason: `Avaliação técnica do atleta ${athlete.name}`,
          context: { athleteId: athlete.id, athleteName: athlete.name, year, section: "avaliacao-tecnica" }
        })
      });

      return apiRequest(`/athletes/${athlete.id}/technical-evaluations`, {
        method: "POST",
        body: JSON.stringify({ year, ...scores, justification, notes })
      });
    },
    onSuccess: () => {
      setPassword("");
      setJustification("");
      setNotes("");
      setError("");
      void queryClient.invalidateQueries({ queryKey: ["athlete-technical-evaluations", athlete.id, year] });
      void queryClient.invalidateQueries({ queryKey: ["athletes"] });
    },
    onError: (requestError) => {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível salvar a avaliação.");
    }
  });

  const summary = evaluationQuery.data ?? ({ latest: null, stats: {}, history: [] } as unknown as AthleteTechnicalEvaluationSummary);
  const latest = summary.latest;
  const stats = summary.stats;

  return (
    <section className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="flex items-center gap-2 text-lg font-black text-slate-950">
            <Star size={18} className="text-red-600" />
            Avaliação técnica
          </h4>
          <p className="mt-1 text-sm font-semibold text-slate-500">Notas de 1 a 10, estatística automática, senha e histórico de alterações.</p>
        </div>
        {latest ? (
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-right">
            <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Nivel atual</p>
            <strong className="text-2xl font-black text-slate-950">{latest.finalScore.toFixed(1)}</strong>
            <p className="text-xs font-bold text-red-600">{latest.classification}</p>
          </div>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Nota estatística", value: (stats.statsScore ?? 0).toFixed(1) },
          { label: "Presença", value: `${stats.presencePercent ?? 0}%` },
          { label: "Confirmações", value: `${stats.confirmationPercent ?? 0}%` },
          { label: "Gols + assist.", value: String((stats.goals ?? 0) + (stats.assists ?? 0)) }
        ].map((item) => (
          <article key={item.label} className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">{item.label}</p>
            <strong className="mt-1 block text-xl font-black text-slate-950">{item.value}</strong>
          </article>
        ))}
      </div>

      <form
        className="mt-4 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          void saveMutation.mutateAsync();
        }}
      >
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
          Esta avaliação altera o nível técnico usado no sistema. A senha será validada novamente e o usuário solicitante ficará registrado na auditoria.
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {technicalCriteria.map((criterion) => (
            <label key={criterion.key} className="text-sm font-bold text-slate-700">
              {criterion.label}
              <input
                type="number"
                min={1}
                max={10}
                value={scores[criterion.key]}
                onChange={(event) => setScores((current) => ({ ...current, [criterion.key]: Number(event.target.value) }))}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
                required
              />
            </label>
          ))}
        </div>

        <label className="block text-sm font-bold text-slate-700">
          Justificativa obrigatória
          <textarea className="mt-1 min-h-20 w-full rounded-lg border border-slate-200 bg-white px-3 py-2" value={justification} onChange={(event) => setJustification(event.target.value)} required minLength={10} />
        </label>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_16rem]">
          <label className="block text-sm font-bold text-slate-700">
            Observação
            <input className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2" value={notes} onChange={(event) => setNotes(event.target.value)} />
          </label>
          <label className="block text-sm font-bold text-slate-700">
            Senha para confirmar
            <input className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2" type="password" minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>
        </div>

        {error ? <p className="rounded-lg border border-red-200 bg-red-50 p-2 text-sm font-bold text-red-700">{error}</p> : null}

        <div className="flex justify-end">
          <button type="submit" disabled={saveMutation.isPending} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-black text-white disabled:opacity-60">
            {saveMutation.isPending ? "Confirmando..." : "Confirmar e salvar avaliação"}
          </button>
        </div>
      </form>

      <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.08em] text-slate-500">
            <tr>
              <th className="px-3 py-2">Data</th>
              <th className="px-3 py-2">Ano</th>
              <th className="px-3 py-2">Final</th>
              <th className="px-3 py-2">Manual</th>
              <th className="px-3 py-2">Sistema</th>
              <th className="px-3 py-2">Avaliador</th>
              <th className="px-3 py-2">Justificativa</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(summary.history ?? []).map((evaluation) => (
              <tr key={evaluation.id}>
                <td className="px-3 py-2 font-bold text-slate-700">{new Date(evaluation.createdAt).toLocaleDateString("pt-BR")}</td>
                <td className="px-3 py-2">{evaluation.year}</td>
                <td className="px-3 py-2 font-black text-slate-950">{evaluation.finalScore.toFixed(1)}</td>
                <td className="px-3 py-2">{evaluation.manualScore.toFixed(1)}</td>
                <td className="px-3 py-2">{evaluation.statsScore.toFixed(1)}</td>
                <td className="px-3 py-2">{evaluation.evaluatedByName ?? "-"}</td>
                <td className="px-3 py-2 text-slate-600">{evaluation.justification}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!evaluationQuery.isLoading && !summary.history.length ? <p className="p-3 text-sm font-semibold text-slate-400">Nenhuma avaliação registrada.</p> : null}
      </div>
    </section>
  );
}

function AthleteForm({
  selected,
  onClearSelection,
  year,
  embedded = false
}: {
  selected: AthleteProfile | null;
  onClearSelection: () => void;
  year: number;
  embedded: boolean;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => formFromAthlete(selected));
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const isContracted = form.linkType === "CONTRACTED";
  const associatesQuery = useQuery({
    queryKey: ["associates", "athlete-form"],
    queryFn: () => apiRequest<Associate[]>("/associates")
  });
  const associates = associatesQuery.data ?? [];
  const availableAssociates = associates.filter((associate) => !associate.athlete || associate.id === form.associateId);
  const selectedAssociate = form.associateId ? associates.find((associate) => associate.id === form.associateId) ?? null : null;

  const saveMutation = useMutation({
    mutationFn: (payload: AthletePayload) => {
      if (selected) {
        return apiRequest<AthleteProfile>(`/athletes/${selected.id}`, {
          method:"PATCH",
          body: JSON.stringify(payload)
        });
      }

      return apiRequest<AthleteProfile>("/athletes", {
        method:"POST",
        body: JSON.stringify(payload)
      });
    },
    onSuccess: () => {
      setForm(blankForm);
      onClearSelection();
      void queryClient.invalidateQueries({ queryKey: ["athletes"] });
      void queryClient.invalidateQueries({ queryKey: ["associates"] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!selected) {
        throw new Error("Selecione um atleta para excluir.");
      }

      return apiRequest<void>(`/athletes/${selected.id}`, {
        method:"DELETE"
      });
    },
    onSuccess: () => {
      setForm(blankForm);
      onClearSelection();
      void queryClient.invalidateQueries({ queryKey: ["athletes"] });
      void queryClient.invalidateQueries({ queryKey: ["associates"] });
    }
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await saveMutation.mutateAsync(buildPayload(form));
  }

  function handlePhotoFile(file: File | null) {
    if (!file || !file.type.startsWith("image/")) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const photoUrl = reader.result;
      if (typeof photoUrl === "string") {
        setForm((prev) => ({ ...prev, photoUrl }));
      }
    };
    reader.readAsDataURL(file);
  }

  const ageLabel = selected?.age !== null && selected?.age !== undefined ? `${selected.age} anos` : calculateAgeFromDate(form.birthDate);

  return (
    <article className={embedded ? "min-w-0" : "min-w-0"}>
      <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
        <FormSection title="Dados pessoais" icon={<UserRound size={17} />}>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(12rem,0.5fr)_minmax(9rem,0.35fr)]">
            <FieldShell label="Nome completo" required>
              <input className={fieldClass} value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} required />
            </FieldShell>
            <FieldShell label="Data de nascimento">
              <DateField className="min-w-0" inputClassName="h-11" value={form.birthDate} onChange={(value) => setForm((prev) => ({ ...prev, birthDate: value }))} />
            </FieldShell>
            <FieldShell label="Idade">
              <input className={fieldClass} value={ageLabel || "Não informada"} disabled readOnly />
            </FieldShell>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <FieldShell label="Perfil no sistema" required>
              <select
                className={fieldClass}
                value={form.linkType}
                onChange={(event) => {
                  const nextLinkType = event.target.value as AthleteLinkType;
                  setForm((prev) => ({
                    ...prev,
                    linkType: nextLinkType,
                    position: nextLinkType === "CONTRACTED" ? "GOALKEEPER" : prev.position,
                    secondaryPositions: nextLinkType === "CONTRACTED" ? [] : prev.secondaryPositions
                  }));
                }}
              >
                <option value="ASSOCIATE">Atleta associado</option>
                <option value="CONTRACTED">Atleta contratado</option>
                <option value="GUEST">Atleta convidado</option>
              </select>
            </FieldShell>
            <FieldShell label="E-mail">
              <div className="relative">
                <Mail className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="email" className={`${fieldClass} pr-10`} value={form.email} disabled={form.linkType !== "ASSOCIATE"} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} />
              </div>
            </FieldShell>
            <FieldShell label="Telefone">
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input className={`${fieldClass} pl-10`} value={form.phone} disabled={form.linkType !== "ASSOCIATE"} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} />
              </div>
            </FieldShell>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <FieldShell label="Entrada na associação">
              <DateField className="min-w-0" inputClassName="h-11" value={form.associationJoinedAt} onChange={(value) => setForm((prev) => ({ ...prev, associationJoinedAt: value }))} />
            </FieldShell>
            <FieldShell label="Entrada como atleta">
              <DateField className="min-w-0" inputClassName="h-11" value={form.joinedAt} onChange={(value) => setForm((prev) => ({ ...prev, joinedAt: value }))} />
            </FieldShell>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <FieldShell label="Posição principal" required>
              <select
                className={fieldClass}
                value={isContracted ? "GOALKEEPER" : form.position}
                disabled={isContracted}
                onChange={(event) => {
                  const nextPosition = event.target.value as AthletePosition;
                  setForm((prev) => ({
                    ...prev,
                    position: nextPosition,
                    secondaryPositions: prev.secondaryPositions.filter((position) => position !== nextPosition)
                  }));
                }}
              >
                {positionGroups.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </optgroup>
                ))}
              </select>
            </FieldShell>
            <FieldShell label="Número da camisa">
              <input className={fieldClass} value="Não informado" disabled readOnly />
            </FieldShell>
            <FieldShell label="Nível técnico" required>
              <select className={fieldClass} value={form.rating} onChange={(event) => setForm((prev) => ({ ...prev, rating: Number(event.target.value) }))}>
                {Object.entries(ratingLabels).map(([value, label]) => <option key={value} value={value}>{value} - {label}</option>)}
              </select>
            </FieldShell>
          </div>

          <div className="mt-4">
            <p className="text-xs font-black text-slate-600">Características / habilidades</p>
            {isContracted ? (
              <p className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">Goleiro contratado não recebe posições alternativas.</p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {positionOptions
                  .filter(([value]) => value !== form.position)
                  .map(([value, label]) => {
                    const checked = form.secondaryPositions.includes(value);
                    return (
                      <label key={`secondary-position-${value}`} className={`inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border px-3 text-xs font-black transition ${checked ? "border-red-200 bg-red-50 text-red-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
                        <input
                          type="checkbox"
                          className="size-4 accent-red-600"
                          checked={checked}
                          onChange={() =>
                            setForm((prev) => ({
                              ...prev,
                              secondaryPositions: checked ? prev.secondaryPositions.filter((position) => position !== value) : [...prev.secondaryPositions, value]
                            }))
                          }
                        />
                        {label}
                      </label>
                    );
                  })}
              </div>
            )}
          </div>
        </FormSection>

        <FormSection title="Informações esportivas" icon={<Activity size={17} />}>
          <div className="grid gap-4 lg:grid-cols-2">
            <FieldShell label="Tipo" required>
              <select className={fieldClass} value={form.linkType} onChange={(event) => {
                const nextLinkType = event.target.value as AthleteLinkType;
                setForm((prev) => ({ ...prev, linkType: nextLinkType, position: nextLinkType === "CONTRACTED" ? "GOALKEEPER" : prev.position, secondaryPositions: nextLinkType === "CONTRACTED" ? [] : prev.secondaryPositions }));
              }}>
                <option value="ASSOCIATE">Associado</option>
                <option value="CONTRACTED">Contratado</option>
                <option value="GUEST">Convidado</option>
              </select>
            </FieldShell>
            <FieldShell label="Status" required>
              <select className={fieldClass} value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as AthleteStatus }))}>
                <option value="ACTIVE">Ativo</option>
                <option value="DELINQUENT">Inadimplente</option>
                <option value="SUSPENDED">Suspenso</option>
                <option value="INACTIVE">Inativo</option>
              </select>
            </FieldShell>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <FieldShell label="Departamento médico" required>
              <select className={fieldClass} value={form.medicalStatus} onChange={(event) => setForm((prev) => ({ ...prev, medicalStatus: event.target.value as AthleteMedicalStatus }))}>
                {Object.entries(medicalStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </FieldShell>
            <FieldShell label="Previsão de retorno">
              <DateField className="min-w-0" inputClassName="h-11" value={form.medicalReturnDate} onChange={(value) => setForm((prev) => ({ ...prev, medicalReturnDate: value }))} />
            </FieldShell>
            <FieldShell label="Perfil técnico" required>
              <select className={fieldClass} value={form.rating} onChange={(event) => setForm((prev) => ({ ...prev, rating: Number(event.target.value) }))}>
                {Object.entries(ratingLabels).map(([value, label]) => <option key={`rating-profile-${value}`} value={value}>{label}</option>)}
              </select>
            </FieldShell>
          </div>
          <div className="mt-4">
            <FieldShell label="Avaliação técnica">
              <textarea className={textAreaClass} value={form.medicalNote} maxLength={700} onChange={(event) => setForm((prev) => ({ ...prev, medicalNote: event.target.value }))} placeholder="Ex.: atleta liberado, em observação ou com restrição de minutos." />
            </FieldShell>
            <p className="mt-1 text-right text-xs font-bold text-slate-400">{form.medicalNote.length}/700</p>
          </div>
        </FormSection>

        <FormSection title="Associação / vínculo" icon={<Link2 size={17} />}>
          {form.linkType === "ASSOCIATE" ? (
            <>
              <FieldShell label="Vinculo com a associação" required>
                <select
                  className={fieldClass}
                  value={form.associateId}
                  onChange={(event) => {
                    const associateId = event.target.value;
                    const associate = associates.find((item) => item.id === associateId) ?? null;
                    setForm((prev) => ({
                      ...prev,
                      associateId,
                      name: associate && !selected ? associate.name : prev.name,
                      email: associate?.email ?? prev.email,
                      phone: associate?.phone ?? prev.phone,
                      monthlyFeeBRL: associate ? String((associate.monthlyFeeCents / 100).toFixed(2)).replace(".", ",") : prev.monthlyFeeBRL,
                      associateStatus: associate?.status ?? prev.associateStatus,
                      associationJoinedAt: associate?.joinedAt ? associate.joinedAt.slice(0, 10) : prev.associationJoinedAt
                    }));
                  }}
                >
                  <option value="">Criar novo associado para este atleta</option>
                  {availableAssociates.map((associate) => <option key={associate.id} value={associate.id}>{associate.name}{associate.athlete ? " - atleta atual" : ""}</option>)}
                </select>
              </FieldShell>
              {selectedAssociate ? (
                <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-800">
                  Vinculo ativo com {selectedAssociate.name}. Dados financeiros e contato atualizam o cadastro associado.
                </div>
              ) : null}
              <div className="mt-4 grid gap-4 lg:grid-cols-3">
                <FieldShell label="Mensalidade (R$)">
                  <input className={fieldClass} value={form.monthlyFeeBRL} onChange={(event) => setForm((prev) => ({ ...prev, monthlyFeeBRL: event.target.value }))} />
                </FieldShell>
                <FieldShell label="Status financeiro">
                  <select className={fieldClass} value={form.associateStatus} onChange={(event) => setForm((prev) => ({ ...prev, associateStatus: event.target.value as AssociateStatus }))}>
                    <option value="ACTIVE">Ativo</option>
                    <option value="LATE">Atrasado</option>
                    <option value="INACTIVE">Inativo</option>
                  </select>
                </FieldShell>
                <FieldShell label="Registro">
                  <div className="relative">
                    <IdCard className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input className={`${fieldClass} pl-10`} value={selected?.id.slice(0, 8) ?? "Novo cadastro"} disabled readOnly />
                  </div>
                </FieldShell>
              </div>
            </>
          ) : null}

          {form.linkType === "GUEST" ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="inline-flex items-center gap-2 text-sm font-black text-slate-800">
                  <input type="checkbox" className="size-4 accent-red-600" checked={form.guestBillingEnabled} onChange={(event) => setForm((prev) => ({ ...prev, guestBillingEnabled: event.target.checked }))} />
                  Cobrar este convidado
                </label>
                <span className={`rounded-full px-2.5 py-1 text-xs font-black ${form.guestBillingEnabled ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-700"}`}>{form.guestBillingEnabled ? "Cobrança ativa" : "Isento"}</span>
              </div>
              <div className="mt-3 max-w-md">
                <FieldShell label="Valor do convite (R$)">
                  <input className={fieldClass} value={form.guestFeeBRL} disabled={!form.guestBillingEnabled} onChange={(event) => setForm((prev) => ({ ...prev, guestFeeBRL: event.target.value }))} />
                </FieldShell>
              </div>
            </div>
          ) : null}

          {form.linkType === "CONTRACTED" ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-600">
              Atleta contratado fica registrado como goleiro e sem cobrança de associado.
            </div>
          ) : null}
        </FormSection>

        <FormSection title="Foto do atleta" icon={<Camera size={17} />}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-full border-4 border-white bg-red-600 text-2xl font-black text-white shadow-sm">
              {form.photoUrl ? <img src={form.photoUrl} alt="Foto do atleta" className="h-full w-full object-cover" /> : initials(form.name || "Atleta")}
            </div>
            <div className="min-w-0 flex-1">
              <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50">
                <Camera size={17} />
                Carregar foto
                <input type="file" accept="image/*" className="sr-only" onChange={(event) => handlePhotoFile(event.target.files?.[0] ?? null)} />
              </label>
              <input type="text" className={`${fieldClass} mt-3`} value={form.photoUrl} onChange={(event) => setForm((prev) => ({ ...prev, photoUrl: event.target.value }))} placeholder="Cole uma URL https:// ou carregue uma imagem" />
              <p className="mt-1 text-xs font-bold text-slate-400">PNG, JPG ou JPEG. Máx. 5MB.</p>
            </div>
          </div>
        </FormSection>

        <FormSection title="Observações" icon={<Pencil size={17} />}>
          <textarea className={textAreaClass} value={form.sportsNote} maxLength={500} onChange={(event) => setForm((prev) => ({ ...prev, sportsNote: event.target.value }))} />
          <p className="mt-1 text-right text-xs font-bold text-slate-400">{form.sportsNote.length}/500</p>
        </FormSection>

        <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-lg sm:border">
          <button type="button" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 hover:bg-slate-50" onClick={onClearSelection}>
            <ArrowLeft size={16} />
            Cancelar alterações
          </button>
          {selected ? (
            <button
              type="button"
              disabled={deleteMutation.isPending}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 text-sm font-black text-red-700 hover:bg-red-100 disabled:opacity-60"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 size={16} />
              {deleteMutation.isPending ? "Excluindo..." : "Excluir atleta"}
            </button>
          ) : null}
          {selected ? (
            <ReauthModal
              open={showDeleteConfirm}
              action={`Excluir atleta ${selected.name}`}
              onClose={() => setShowDeleteConfirm(false)}
              onConfirm={() => deleteMutation.mutateAsync()}
            />
          ) : null}
          <button type="submit" disabled={saveMutation.isPending} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-red-600 px-5 text-sm font-black text-white shadow-sm hover:bg-red-700 disabled:opacity-60">
            <Save size={16} />
            {saveMutation.isPending ? "Salvando..." : selected ? "Salvar alterações" : "Cadastrar atleta"}
          </button>
        </div>
      </form>
      {selected ? <TechnicalEvaluationPanel athlete={selected} year={year} /> : null}
    </article>
  );
}

export function AthleteCard({
  athlete,
  selected,
  onSelect,
  onToggle,
  onQuickStatusChange
}: {
  athlete: AthleteProfile;
  selected: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onQuickStatusChange: (status: AthleteStatus) => void;
}) {
  return (
    <article className={`min-w-0 rounded-lg border p-4 shadow-sm ${selected ? "border-red-300 bg-red-50/50" : "border-slate-200 bg-white"}`}>
      <div className="flex items-start gap-3">
        {athlete.photoUrl ? (
          <img src={athlete.photoUrl} alt={athlete.name} className="size-12 rounded-full object-cover" />
        ) : (
          <div className="grid size-12 rounded-full bg-slate-100 text-sm font-bold text-slate-700 place-items-center">{initials(athlete.name)}</div>
        )}
        <div className="min-w-0 flex-1">
          <button type="button" className="block max-w-full truncate text-left text-base font-bold text-slate-950 hover:text-red-600" onClick={onSelect}>
            {athlete.name}
          </button>
          <p className="text-sm text-slate-500">
            {positionLabels[athlete.position]} - {linkLabels[athlete.linkType]}
          </p>
          {(athlete.secondaryPositions ?? []).length > 0 ? (
            <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">
              Também: {athlete.secondaryPositions.map((position) => positionLabels[position]).join(", ")}
            </p>
          ) : null}
        </div>
        {onToggle ? (
          <input type="checkbox" checked={selected} onChange={onToggle} className="mt-1 size-4 accent-red-600" aria-label={`Selecionar ${athlete.name}`} />
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
          <Shield size={13} />
          Posição: {positionLabels[athlete.position]}
        </span>
        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-black shadow-sm ${statusClass(athlete)}`}>{athlete.canPlay ? "Ativo" : "Bloqueado"}</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
          <Star size={13} />
          Nível {athlete.rating} - {ratingLabels[athlete.rating] ?? "Não definido"}
        </span>
      </div>

      {onQuickStatusChange ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            title="Desbloquear atleta"
            aria-label={`Desbloquear ${athlete.name}`}
            className="fl-athlete-action-active rounded-lg border p-1.5"
            onClick={() => onQuickStatusChange("ACTIVE")}
          >
            <LockOpen size={14} />
          </button>
          <button
            type="button"
            title="Marcar inadimplente"
            className="fl-athlete-action-delinquent rounded-lg border p-1.5"
            onClick={() => onQuickStatusChange("DELINQUENT")}
          >
            <AlertTriangle size={14} />
          </button>
          <button
            type="button"
            title="Marcar suspenso"
            className="fl-athlete-action-suspended fl-action-danger-icon rounded-lg border p-1.5 shadow-sm"
            onClick={() => onQuickStatusChange("SUSPENDED")}
          >
            <Shield size={14} />
          </button>
          <button
            type="button"
            title="Marcar inativo"
            className="fl-athlete-action-inactive rounded-lg border p-1.5"
            onClick={() => onQuickStatusChange("INACTIVE")}
          >
            <CircleOff size={14} />
          </button>
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-slate-400">{athlete.linkType === "GUEST" ? "Convite" : "Mensalidade"}</p>
          <p className="font-semibold text-slate-900">{athleteChargeLabel(athlete)}</p>
        </div>
        <div>
          <p className="text-slate-400">Pagamento</p>
          <p className={`font-semibold ${athlete.amountDueCents > 0 || (athlete.linkType === "GUEST" && athlete.guestBillingEnabled) ? "text-amber-700" : "text-emerald-700"}`}>
            {athletePaymentLabel(athlete)}
          </p>
        </div>
      </div>
    </article>
  );
}

function AthleteAvatar({ athlete, size = "sm", emphasis = false }: { athlete: AthleteProfile; size?: "sm" | "md"; emphasis?: boolean }) {
  const sizeClass = size === "md" ? "size-12 text-sm" : "size-9 text-xs";
  if (athlete.photoUrl) {
    return <img src={athlete.photoUrl} alt={athlete.name} className={`${sizeClass} rounded-full object-cover`} />;
  }
  return (
    <div className={`grid ${sizeClass} place-items-center rounded-full font-black ${emphasis ? "bg-red-600 text-white" : "bg-slate-100 text-slate-700"}`}>
      {initials(athlete.name)}
    </div>
  );
}

function AthleteStatusBadge({ athlete }: { athlete: AthleteProfile }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${statusClass(athlete)}`}>{athlete.canPlay ? "Ativo" : "Bloqueado"}</span>;
}

function AthleteActionButtons({
  athlete,
  onOpen,
  onEdit,
  onQuickStatusChange,
  size = "sm"
}: {
  athlete: AthleteProfile;
  onOpen?: (athlete: AthleteProfile) => void;
  onEdit?: (athlete: AthleteProfile) => void;
  onQuickStatusChange?: (athlete: AthleteProfile, status: AthleteStatus) => void;
  size?: "sm" | "md";
}) {
  const buttonClass = size === "md" ? "grid size-9 place-items-center rounded-lg border" : "grid size-8 place-items-center rounded-lg border";
  const iconSize = size === "md" ? 15 : 14;

  return (
    <>
      {onEdit ? (
        <button type="button" className={`fl-associate-action-edit ${buttonClass}`} onClick={() => onEdit(athlete)} aria-label={`Editar cadastro de ${athlete.name}`}>
          <Pencil size={iconSize} />
        </button>
      ) : null}
      {onOpen ? (
        <button type="button" className={`fl-associate-action-edit ${buttonClass}`} onClick={() => onOpen(athlete)} aria-label={`Ver perfil de ${athlete.name}`}>
          <Eye size={iconSize} />
        </button>
      ) : null}
      {onQuickStatusChange ? (
        <>
          <button type="button" title="Ativo" className={`fl-associate-action-active ${buttonClass}`} onClick={() => onQuickStatusChange(athlete, "ACTIVE")}>
            <LockOpen size={iconSize} />
          </button>
          <button type="button" title="Inadimplente" className={`fl-associate-action-late ${buttonClass}`} onClick={() => onQuickStatusChange(athlete, "DELINQUENT")}>
            <AlertTriangle size={iconSize} />
          </button>
          <button type="button" title="Suspenso" className={`fl-associate-action-delete ${buttonClass} shadow-sm`} onClick={() => onQuickStatusChange(athlete, "SUSPENDED")}>
            <Shield size={iconSize} />
          </button>
          <button type="button" title="Inativo" className={`fl-associate-action-inactive ${buttonClass}`} onClick={() => onQuickStatusChange(athlete, "INACTIVE")}>
            <CircleOff size={iconSize} />
          </button>
        </>
      ) : null}
    </>
  );
}

function AthleteListTable({
  athletes,
  selectedIds = [],
  onOpen,
  onEdit,
  onToggle,
  onQuickStatusChange
}: {
  athletes: AthleteProfile[];
  selectedIds?: string[];
  onOpen: (athlete: AthleteProfile) => void;
  onEdit?: (athlete: AthleteProfile) => void;
  onToggle?: (athlete: AthleteProfile) => void;
  onQuickStatusChange?: (athlete: AthleteProfile, status: AthleteStatus) => void;
}) {
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const toggleExpanded = (athleteId: string) => {
    setExpandedIds((current) => current.includes(athleteId) ? current.filter((id) => id !== athleteId) : [...current, athleteId]);
  };

  return (
    <div className="min-w-0">
      <div className="grid gap-3 lg:hidden">
        {athletes.map((athlete) => {
          const selected = selectedIds.includes(athlete.id);
          return (
            <article key={`athlete-card-${athlete.id}`} className={`min-w-0 rounded-lg border p-3 shadow-sm ${selected ? "border-red-300 bg-red-50/70" : "border-slate-200 bg-white"}`}>
              <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3">
                <AthleteAvatar athlete={athlete} size="md" emphasis />
                <div className="min-w-0">
                  <button type="button" className="block max-w-full truncate text-left text-base font-black text-slate-950 hover:text-red-600" onClick={() => onOpen(athlete)}>
                    {athlete.name}
                  </button>
                  <p className="mt-0.5 truncate text-sm font-semibold text-slate-500">{positionLabels[athlete.position]}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-700">{athlete.age !== null ? `${athlete.age} anos` : "Idade -"}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-700">{linkLabels[athlete.linkType]}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-700">Nível {athlete.rating}</span>
                  </div>
                </div>
                {onToggle ? (
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => onToggle(athlete)}
                    className="mt-1 size-4 accent-red-600"
                    aria-label={`Selecionar ${athlete.name}`}
                  />
                ) : null}
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-400">Mensalidade</p>
                  <div className="mt-1"><AthleteMonthlyStatus athlete={athlete} /></div>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-400">Perfil</p>
                  <p className="mt-1 truncate text-sm font-black text-slate-900">{linkLabels[athlete.linkType]}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-400">Status</p>
                  <div className="mt-1"><AthleteStatusBadge athlete={athlete} /></div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                <AthleteActionButtons athlete={athlete} onOpen={onOpen} onEdit={onEdit} onQuickStatusChange={onQuickStatusChange} size="md" />
              </div>
            </article>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto rounded-lg border border-slate-200 lg:block">
        <table className="fl-athletes-table w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.08em] text-slate-500">
            <tr>
              {onToggle ? <th className="w-12 px-3 py-3">Sel.</th> : null}
              <th className="px-3 py-3">Atleta</th>
              <th className="px-3 py-3">Resumo</th>
              <th className="px-3 py-3">Situação</th>
              <th className="px-3 py-3">Mensalidade</th>
              <th className="px-3 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {athletes.map((athlete) => {
              const selected = selectedIds.includes(athlete.id);
              const expanded = expandedIds.includes(athlete.id);
              return (
                <Fragment key={athlete.id}>
                  <tr className={selected ? "bg-red-50/60" : "hover:bg-slate-50"}>
                    {onToggle ? (
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => onToggle(athlete)}
                          className="size-4 accent-red-600"
                          aria-label={`Selecionar ${athlete.name}`}
                        />
                      </td>
                    ) : null}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <AthleteAvatar athlete={athlete} />
                        <button type="button" className="min-w-0 truncate text-left font-black text-slate-950 hover:text-red-600" onClick={() => onOpen(athlete)}>
                          {athlete.name}
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-semibold text-slate-800">{positionLabels[athlete.position]}</p>
                      {(athlete.secondaryPositions ?? []).length > 0 ? (
                        <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                          Também: {athlete.secondaryPositions.map((position) => positionLabels[position]).join(", ")}
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {athlete.age !== null ? `${athlete.age} anos` : "Idade não informada"} · Nível {athlete.rating}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <AthleteStatusBadge athlete={athlete} />
                    </td>
                    <td className="px-3 py-3">
                      <AthleteMonthlyStatus athlete={athlete} />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          className="fl-associate-action-edit h-8 rounded-lg border px-2.5 text-xs font-black"
                          onClick={() => toggleExpanded(athlete.id)}
                        >
                          {expanded ? "Ocultar" : "Detalhes"}
                        </button>
                        <AthleteActionButtons athlete={athlete} onOpen={onOpen} onEdit={onEdit} onQuickStatusChange={onQuickStatusChange} />
                      </div>
                    </td>
                  </tr>
                  {expanded ? (
                    <tr className="bg-slate-50/80">
                      <td colSpan={onToggle ? 6 : 5} className="px-3 py-3">
                        <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 md:grid-cols-4">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-400">Perfil</p>
                            <p className="mt-1 text-sm font-bold text-slate-900">{linkLabels[athlete.linkType]}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-400">Nível</p>
                            <p className="mt-1 text-sm font-bold text-slate-900">{athlete.rating} - {ratingLabels[athlete.rating] ?? "Não definido"}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-400">Mensalidade</p>
                            <div className="mt-1"><AthleteMonthlyStatus athlete={athlete} /></div>
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-400">Médico</p>
                            <p className="mt-1 text-sm font-bold text-slate-900">{medicalStatusLabels[athlete.medicalStatus]}</p>
                            {athlete.medicalReturnDate ? <p className="text-xs font-semibold text-slate-500">Retorno: {new Date(athlete.medicalReturnDate).toLocaleDateString("pt-BR")}</p> : null}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function athleteToPitchPlayer(athlete: AthleteProfile, index: number): PitchPlayer {
  return {
    id: athlete.id,
    name: athlete.name,
    number: index + 1,
    position: athlete.position
  };
}

function DraftFieldResult({
  draft,
  selectedSide,
  onSelectSide,
  uniform1Name,
  uniform2Name,
  uniform1Color,
  uniform2Color
}: {
  draft: LineupDraft;
  selectedSide: "RED" | "WHITE";
  onSelectSide: (side: "RED" | "WHITE") => void;
  uniform1Name: string;
  uniform2Name: string;
  uniform1Color: string;
  uniform2Color: string;
}) {
  const redPlayers = draft.red.map(athleteToPitchPlayer);
  const whitePlayers = draft.white.map(athleteToPitchPlayer);
  const redBenchPlayers = (draft.redBench ?? []).map((athlete, index) => athleteToPitchPlayer(athlete, index + 11));
  const whiteBenchPlayers = (draft.whiteBench ?? []).map((athlete, index) => athleteToPitchPlayer(athlete, index + 11));
  const selectedBenchPlayers = selectedSide === "RED" ? redBenchPlayers : whiteBenchPlayers;
  const selectedTeamName = selectedSide === "RED" ? uniform1Name : uniform2Name;
  const selectedStarterCount = (selectedSide === "RED" ? redPlayers : whitePlayers).length;
  const selectedGoalkeeperCount = (selectedSide === "RED" ? draft.red : draft.white).filter((player) => player.position === "GOALKEEPER" || player.position === "BOTH").length;
  const selectedLineCount = Math.max(0, selectedStarterCount - selectedGoalkeeperCount);

  return (
    <article className="min-w-0 rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-black text-slate-950">{selectedTeamName}</h3>
          <p className="text-xs font-bold text-slate-500">
            {selectedStarterCount} em campo: {selectedGoalkeeperCount} goleiro + {selectedLineCount} linha
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            className={`rounded-md px-3 py-1.5 text-xs font-black ${selectedSide === "RED" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}
            onClick={() => onSelectSide("RED")}
          >
            {uniform1Name}
          </button>
          <button
            type="button"
            className={`rounded-md px-3 py-1.5 text-xs font-black ${selectedSide === "WHITE" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}
            onClick={() => onSelectSide("WHITE")}
          >
            {uniform2Name}
          </button>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_14rem] xl:items-stretch">
        <FullPitchBoard
          redColor={uniform1Color}
          whiteColor={uniform2Color}
          redPlayers={redPlayers}
          whitePlayers={whitePlayers}
          redBenchPlayers={redBenchPlayers}
          whiteBenchPlayers={whiteBenchPlayers}
          redTeamName={uniform1Name}
          whiteTeamName={uniform2Name}
          redFormation="4-3-3"
          whiteFormation="4-3-3"
          focusTeam={selectedSide}
          interactive={false}
          showBench={false}
          showPlayerNumbers
          className="aspect-[1.85] min-h-[18rem] sm:min-h-[22rem]"
        />
        <aside className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Banco</p>
              <h4 className="text-sm font-black text-slate-950">{selectedTeamName}</h4>
            </div>
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-slate-600">{selectedBenchPlayers.length} reservas</span>
          </div>
          {selectedBenchPlayers.length > 0 ? (
            <div className="mt-3 grid max-h-[24rem] gap-2 overflow-auto pr-1">
              {selectedBenchPlayers.map((player, index) => (
                <div key={`${selectedSide}-draft-bench-${player.id}-${index}`} className="flex min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs shadow-sm">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-400 text-[10px] font-black text-white">B{index + 1}</span>
                  <span className="min-w-0">
                    <span className="block truncate font-black text-slate-900">{player.name}</span>
                    <span className="block truncate text-[10px] font-semibold text-slate-500">Reserva</span>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 rounded-lg border border-dashed border-slate-200 bg-white px-3 py-4 text-sm font-semibold text-slate-500">Nenhum atleta no banco deste time.</p>
          )}
        </aside>
      </div>
    </article>
  );
}

export function ElencoPageReal() {
  const { month, year } = useOutletContext<OutletPeriod>();
  const location = useLocation();
  const navigate = useNavigate();
  const [editorTarget, setEditorTarget] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | AthleteStatus>("ALL");
  const [positionFilter, setPositionFilter] = useState<"ALL" | AthletePosition>("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const editParam = params.get("edit");
    setEditorTarget(editParam === "new" || (editParam && editParam.length > 0) ? editParam : null);

    const statusParam = params.get("status");
    if (statusParam === "ALL" || statusParam === "ACTIVE" || statusParam === "DELINQUENT" || statusParam === "SUSPENDED" || statusParam === "INACTIVE") {
      setStatusFilter((current) => (current === statusParam ? current : statusParam));
    }

    const positionParam = params.get("position");
    if (
      positionParam === "ALL" ||
      positionParam === "GOALKEEPER" ||
      positionParam === "DEFENDER" ||
      positionParam === "FULLBACK" ||
      positionParam === "MIDFIELDER" ||
      positionParam === "FORWARD" ||
      positionParam === "LINE" ||
      positionParam === "BOTH" ||
      positionParam === "RIGHT_BACK" ||
      positionParam === "LEFT_BACK" ||
      positionParam === "DEFENSIVE_MIDFIELDER" ||
      positionParam === "CENTRAL_MIDFIELDER" ||
      positionParam === "ATTACKING_MIDFIELDER" ||
      positionParam === "RIGHT_WINGER" ||
      positionParam === "LEFT_WINGER" ||
      positionParam === "STRIKER"
    ) {
      setPositionFilter((current) => (current === positionParam ? current : positionParam));
    }
  }, [location.search]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ month: String(month), year: String(year) });
    if (statusFilter !=="ALL") {
      params.set("status", statusFilter);
    }
    if (positionFilter !=="ALL") {
      params.set("position", positionFilter);
    }
    return params.toString();
  }, [month, year, statusFilter, positionFilter]);

  const athletesQuery = useQuery({
    queryKey: ["athletes", month, year, statusFilter, positionFilter],
    queryFn: () => apiRequest<AthleteProfile[]>(`/athletes?${queryString}`)
  });

  const queryClient = useQueryClient();
  const quickAthleteStatusMutation = useMutation({
    mutationFn: ({ athleteId, status }: { athleteId: string; status: AthleteStatus }) =>
      apiRequest<AthleteProfile>(`/athletes/${athleteId}`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["athletes"] });
      void queryClient.invalidateQueries({ queryKey: ["sports-games"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    }
  });

  const athletes = athletesQuery.data ?? [];
  const selected = editorTarget && editorTarget !== "new" ? athletes.find((athlete) => athlete.id === editorTarget) ?? null : null;
  const activeCount = athletes.filter((athlete) => athlete.canPlay).length;
  const inactiveCount = athletes.filter((athlete) => athlete.status === "INACTIVE").length;
  const delinquentCount = athletes.filter((athlete) => athlete.status === "DELINQUENT").length;
  const suspendedCount = athletes.filter((athlete) => athlete.status === "SUSPENDED").length;
  const dueTotal = athletes.reduce((total, athlete) => total + athlete.amountDueCents, 0);
  const searchedAthletes = athletes.filter((athlete) => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) {
      return true;
    }
    return [
      athlete.name,
      positionLabels[athlete.position],
      ...(athlete.secondaryPositions ?? []).map((position) => positionLabels[position]),
      linkLabels[athlete.linkType]
    ].some((value) => value.toLowerCase().includes(normalized));
  });
  const totalPages = Math.max(1, Math.ceil(searchedAthletes.length / ATHLETES_PAGE_SIZE));
  const normalizedPage = Math.min(currentPage, totalPages);
  const pageStart = (normalizedPage - 1) * ATHLETES_PAGE_SIZE;
  const pageEnd = Math.min(pageStart + ATHLETES_PAGE_SIZE, searchedAthletes.length);
  const paginatedAthletes = searchedAthletes.slice(pageStart, pageEnd);
  const athleteStatusChart = [
    { name: "Liberados", value: activeCount, color: "#10b981" },
    { name: "Inadimplentes", value: delinquentCount, color: "#f59e0b" },
    { name: "Suspensos", value: suspendedCount, color: "#ef4444" },
    { name: "Inativos", value: inactiveCount, color: "#64748b" }
  ].filter((item) => item.value > 0);
  const linkTypeChart = Object.entries(
    athletes.reduce<Record<string, number>>((acc, athlete) => {
      acc[athlete.linkType] = (acc[athlete.linkType] ?? 0) + 1;
      return acc;
    }, {})
  ).map(([linkType, value]) => ({ name: linkLabels[linkType as AthleteLinkType] ?? linkType, value }));
  const positionChart = Object.entries(
    athletes.reduce<Record<string, { count: number; rating: number }>>((acc, athlete) => {
      const current = acc[athlete.position] ?? { count: 0, rating: 0 };
      current.count += 1;
      current.rating += athlete.rating ?? 0;
      acc[athlete.position] = current;
      return acc;
    }, {})
  )
    .map(([position, value]) => ({
      name: positionLabels[position as AthletePosition] ?? position,
      atletas: value.count,
      media: value.count > 0 ? Number((value.rating / value.count).toFixed(1)) : 0
    }))
    .sort((a, b) => b.atletas - a.atletas)
    .slice(0, 8);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, positionFilter, month, year]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <section className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <article className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="flex items-center gap-2 text-sm font-bold text-slate-500">
            <UsersRound size={18} />
            Atletas cadastrados
          </p>
          <h3 className="mt-2 text-2xl font-black text-slate-950">{athletes.length}</h3>
        </article>
        <article className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="flex items-center gap-2 text-sm font-bold text-slate-500">
            <CheckCircle2 size={18} />
            Liberados para jogar
          </p>
          <h3 className="mt-2 text-2xl font-black text-emerald-700">{activeCount}</h3>
        </article>
        <article className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm font-bold text-slate-500">Inativos</p>
          <h3 className="mt-2 text-2xl font-black text-slate-700">{inactiveCount}</h3>
        </article>
        <article className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm font-bold text-slate-500">Inadimplentes</p>
          <h3 className="mt-2 text-2xl font-black text-amber-700">{delinquentCount}</h3>
        </article>
        <article className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm font-bold text-slate-500">Suspensos</p>
          <h3 className="mt-2 text-2xl font-black text-red-700">{suspendedCount}</h3>
        </article>
        <article className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="flex items-center gap-2 text-sm font-bold text-slate-500">
            <CircleDollarSign size={18} />
            Mensalidades pendentes
          </p>
          <h3 className="mt-2 text-2xl font-black text-red-600">{formatCurrency(dueTotal)}</h3>
        </article>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.08em] text-blue-700">Mapa do elenco</p>
              <h2 className="text-lg font-black text-slate-950">Atletas por posição</h2>
            </div>
            <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">{athletes.length} atletas</span>
          </div>
          <div className="h-64 min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={positionChart} margin={{ top: 12, right: 12, bottom: 0, left: -18 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10, fontWeight: 800 }} interval={0} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 700 }} />
                <Tooltip contentStyle={{ borderRadius: 10, borderColor: "#dbe3ee" }} />
                <Bar dataKey="atletas" name="Atletas" fill="#2563eb" radius={[8, 8, 0, 0]} />
                <Bar dataKey="media" name="Nota média" fill="#f59e0b" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4">
            <p className="text-xs font-black uppercase tracking-[0.08em] text-emerald-700">Status</p>
            <h2 className="text-lg font-black text-slate-950">Prontos para jogo</h2>
          </div>
          <div className="relative h-64">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <Pie data={athleteStatusChart.length ? athleteStatusChart : [{ name: "Sem atletas", value: 1, color: "#e5e7eb" }]} dataKey="value" nameKey="name" innerRadius={58} outerRadius={90} paddingAngle={4}>
                  {(athleteStatusChart.length ? athleteStatusChart : [{ name: "Sem atletas", value: 1, color: "#e5e7eb" }]).map((item) => <Cell key={item.name} fill={item.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 10, borderColor: "#dbe3ee" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400">Aptos</p>
                <strong className="text-xl font-black text-emerald-700">{activeCount}</strong>
              </div>
            </div>
          </div>
        </article>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4">
            <p className="text-xs font-black uppercase tracking-[0.08em] text-violet-700">Vínculo</p>
            <h2 className="text-base font-black text-slate-950">Composição do grupo</h2>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={linkTypeChart} margin={{ top: 10, right: 12, bottom: 0, left: -18 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11, fontWeight: 800 }} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 700 }} />
                <Tooltip contentStyle={{ borderRadius: 10, borderColor: "#dbe3ee" }} />
                <Bar dataKey="value" name="Atletas" fill="#7c3aed" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4">
            <p className="text-xs font-black uppercase tracking-[0.08em] text-red-700">Risco operacional</p>
            <h2 className="text-base font-black text-slate-950">Pendências do elenco</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "Inadimplentes", value: delinquentCount, amount: formatCurrency(dueTotal), color: "bg-amber-50 text-amber-700 border-amber-200" },
              { label: "Suspensos", value: suspendedCount, amount: "bloqueados", color: "bg-red-50 text-red-700 border-red-200" },
              { label: "Inativos", value: inactiveCount, amount: "fora do elenco", color: "bg-slate-50 text-slate-700 border-slate-200" }
            ].map((item) => (
              <div key={item.label} className={`rounded-lg border p-3 ${item.color}`}>
                <p className="text-xs font-black uppercase tracking-[0.08em]">{item.label}</p>
                <strong className="mt-2 block text-2xl font-black">{item.value}</strong>
                <span className="mt-1 block text-xs font-bold">{item.amount}</span>
              </div>
            ))}
          </div>
        </article>
      </div>

      {editorTarget ? (
        <div className="mt-4 min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-950">{selected ? "Editar atleta" : "Novo atleta"}</h2>
              <p className="text-sm text-slate-500">Clique em salvar para voltar para a listagem ou use voltar sem alterar.</p>
            </div>
            <button type="button" className="rounded-lg border border-slate-200 px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-50" onClick={() => {
              setEditorTarget(null);
              navigate("/atletas");
            }}>
              Voltar para lista
            </button>
          </div>

          <AthleteForm
            key={selected?.id ?? "new-athlete"}
            selected={selected}
            year={year}
            embedded
            onClearSelection={() => {
              setEditorTarget(null);
              navigate("/atletas");
            }}
          />
        </div>
      ) : (
        <div className="mt-4">
          <section className="min-w-0">
            <div className="mb-4 space-y-3">
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-slate-950">Perfis dos atletas</h2>
                <p className="text-sm text-slate-500">Clique no nome do atleta para abrir a conta completa com presença, financeiro e histórico.</p>
              </div>
              <div className="grid min-w-0 gap-2 md:grid-cols-[18rem_12rem_14rem] md:items-center">
                <label className="relative block min-w-0">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} aria-hidden="true" />
                  <input
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 pl-9 text-sm"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar por nome"
                  />
                </label>
                <select className="h-10 min-w-0 rounded-lg border border-slate-200 px-3 text-sm font-semibold" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
                  <option value="ALL">Todos os status</option>
                  <option value="ACTIVE">Ativo</option>
                  <option value="DELINQUENT">Inadimplente</option>
                  <option value="SUSPENDED">Suspenso</option>
                  <option value="INACTIVE">Inativo</option>
                </select>
                <select className="h-10 min-w-0 rounded-lg border border-slate-200 px-3 text-sm font-semibold" value={positionFilter} onChange={(event) => setPositionFilter(event.target.value as typeof positionFilter)}>
                  <option value="ALL">Todas posições</option>
                  {positionGroups.map((group) => (
                    <optgroup key={group.label} label={group.label}>
                      {group.options.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>

            {athletesQuery.isLoading ? <p className="text-sm text-slate-500">Carregando atletas...</p> : null}
            <AthleteListTable
              athletes={paginatedAthletes}
              onOpen={(athlete) => navigate(`/atletas/${athlete.id}/perfil`)}
              onEdit={(athlete) => {
                setEditorTarget(athlete.id);
                navigate(`/atletas?edit=${athlete.id}`);
              }}
              onQuickStatusChange={(athlete, status) => void quickAthleteStatusMutation.mutateAsync({ athleteId: athlete.id, status })}
            />
            {!athletesQuery.isLoading && searchedAthletes.length === 0 ? <p className="text-sm text-slate-500">Nenhum atleta encontrado.</p> : null}
            {!athletesQuery.isLoading && searchedAthletes.length > ATHLETES_PAGE_SIZE ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <p className="text-sm font-semibold text-slate-500">
                  Mostrando {pageStart + 1}-{pageEnd} de {searchedAthletes.length} atletas
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={normalizedPage === 1}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  >
                    Anterior
                  </button>
                  <span className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-black text-slate-700">
                    {normalizedPage}/{totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={normalizedPage === totalPages}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  >
                    Próxima
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      )}
    </section>
  );
}

export function EscalacoesPageReal() {
  const { month, year } = useOutletContext<OutletPeriod>();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [includeDelinquent, setIncludeDelinquent] = useState(false);
  const [draft, setDraft] = useState<LineupDraft | null>(null);
  const [draftSide, setDraftSide] = useState<"RED" | "WHITE">("RED");

  const athletesQuery = useQuery({
    queryKey: ["athletes", month, year,"lineup"],
    queryFn: () => apiRequest<AthleteProfile[]>(`/athletes?month=${month}&year=${year}`)
  });

  const settingsQuery = useQuery({
    queryKey: ["group-settings", "lineup"],
    queryFn: () => apiRequest<GroupSettings>("/group/settings")
  });

  const draftMutation = useMutation({
    mutationFn: () =>
      apiRequest<LineupDraft>("/athletes/lineup-draft", {
        method:"POST",
        body: JSON.stringify({ month, year, athleteIds: selectedIds, includeDelinquent })
      }),
    onSuccess: (nextDraft) => {
      setDraft(nextDraft);
      setDraftSide("RED");
    }
  });

  const athletes = athletesQuery.data ?? [];
  const settings = settingsQuery.data;
  const uniform1Name = settings?.uniform1Name ?? "Time A";
  const uniform2Name = settings?.uniform2Name ?? "Time B";
  const uniform1Color = settings?.uniform1Color ?? "#94a3b8";
  const uniform2Color = settings?.uniform2Color ?? "#cbd5e1";

  function toggleAthlete(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  return (
    <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <article className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-950">Montar e sortear jogadores</h2>
            <p className="text-sm text-slate-500">Selecione no mínimo 10 jogadores de linha por time (20 no total) e 2 goleiros contratados. O banco aceita até 10 por lado.</p>
          </div>
          <button
            type="button"
            disabled={Boolean(draft) || selectedIds.length < 22 || draftMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            onClick={() => void draftMutation.mutateAsync()}
          >
            <Shuffle size={18} />
            {draft ? "Sorteio realizado" : draftMutation.isPending ? "Sorteando..." : "Sortear times"}
          </button>
        </div>

        {draftMutation.isError ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {draftMutation.error instanceof Error ? draftMutation.error.message :"Não foi possível sortear os times."}
          </div>
        ) : null}

        <label className="mb-4 flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-sm font-medium text-slate-700">
          <input type="checkbox" checked={includeDelinquent} onChange={(event) => setIncludeDelinquent(event.target.checked)} className="size-4 accent-red-600" />
          Permitir atletas com mensalidade pendente no sorteio
        </label>

        <AthleteListTable
          athletes={athletes}
          selectedIds={selectedIds}
          onToggle={(athlete) => toggleAthlete(athlete.id)}
          onOpen={(athlete) => toggleAthlete(athlete.id)}
        />
      </article>

      <div className="space-y-4">
        <article className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-full bg-red-50 text-red-600">
              <UserPlus size={22} />
            </div>
            <div>
              <p className="text-sm text-slate-500">Selecionados</p>
              <h3 className="text-2xl font-bold text-slate-950">{selectedIds.length}</h3>
            </div>
          </div>
        </article>

        {draft ? (
          <>
            <DraftFieldResult
              draft={draft}
              selectedSide={draftSide}
              onSelectSide={setDraftSide}
              uniform1Name={uniform1Name}
              uniform2Name={uniform2Name}
              uniform1Color={uniform1Color}
              uniform2Color={uniform2Color}
            />
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
              Escalações sorteadas. Para refazer, altere a seleção e atualize a página.
            </div>
            {draft.blocked.length > 0 ? (
              <article className="min-w-0 rounded-lg border border-red-200 bg-red-50 p-4">
                <h3 className="font-bold text-red-800">Fora do sorteio</h3>
                <p className="mt-1 text-sm text-red-700">
                  {draft.blocked.map((athlete) => athlete.name).join(",")} ficaram fora por status, mensalidade ou limite de banco.
                </p>
              </article>
            ) : null}
          </>
        ) : (
          <article className="min-w-0 rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500 sm:p-8">
            O sorteio aparece aqui depois que você selecionar os jogadores.
          </article>
        )}
      </div>
    </section>
  );
}
