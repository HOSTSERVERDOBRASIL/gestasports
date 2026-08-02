import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save } from "lucide-react";
import { apiRequest } from "../../services/api";
import { PageHeader } from "../../components/ui/PageHeader";
import { SectionCard } from "../../components/ui/SectionCard";
import type {
  Associate, AthleteLinkType, AthleteMedicalStatus,
  AthletePosition, AthleteProfile, AthleteStatus, AssociateStatus
} from "../../types/domain";

function toCents(v: string) {
  return Math.round(Number(v.replace(/\./g, "").replace(",", ".")) * 100) || 0;
}

type FormState = {
  name: string;
  position: AthletePosition;
  linkType: AthleteLinkType;
  status: AthleteStatus;
  rating: number;
  birthDate: string;
  joinedAt: string;
  associateId: string;
  photoUrl: string;
  sportsNote: string;
  medicalStatus: AthleteMedicalStatus;
  medicalNote: string;
  guestBillingEnabled: boolean;
  guestFeeBRL: string;
  email: string;
  phone: string;
  monthlyFeeBRL: string;
  associateStatus: AssociateStatus;
};

const blank: FormState = {
  name: "",
  position: "CENTRAL_MIDFIELDER",
  linkType: "ASSOCIATE",
  status: "ACTIVE",
  rating: 3,
  birthDate: "",
  joinedAt: "",
  associateId: "",
  photoUrl: "",
  sportsNote: "",
  medicalStatus: "CLEARED",
  medicalNote: "",
  guestBillingEnabled: false,
  guestFeeBRL: "0,00",
  email: "",
  phone: "",
  monthlyFeeBRL: "60,00",
  associateStatus: "ACTIVE"
};

const positionOptions: Array<[AthletePosition, string]> = [
  ["GOALKEEPER", "Goleiro"], ["DEFENDER", "Zagueiro"], ["RIGHT_BACK", "Lateral direito"],
  ["LEFT_BACK", "Lateral esquerdo"], ["DEFENSIVE_MIDFIELDER", "Volante"],
  ["CENTRAL_MIDFIELDER", "Meia central"], ["ATTACKING_MIDFIELDER", "Meia atacante"],
  ["RIGHT_WINGER", "Ponta direita"], ["LEFT_WINGER", "Ponta esquerda"], ["STRIKER", "Centroavante"]
];

export function AtletaFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = Boolean(id);
  const [form, setForm] = useState<FormState>(blank);

  const athleteQuery = useQuery({
    queryKey: ["athlete", id],
    queryFn: () => apiRequest<AthleteProfile>(`/athletes/${id}`),
    enabled: isEditing
  });

  const associatesQuery = useQuery({
    queryKey: ["associates"],
    queryFn: () => apiRequest<Associate[]>("/associates")
  });

  useEffect(() => {
    const a = athleteQuery.data;
    if (!a) return;
    setForm({
      name: a.name,
      position: a.position,
      linkType: a.linkType,
      status: a.status,
      rating: a.rating,
      birthDate: a.birthDate?.slice(0, 10) ?? "",
      joinedAt: a.joinedAt?.slice(0, 10) ?? "",
      associateId: a.associateId ?? "",
      photoUrl: a.photoUrl ?? "",
      sportsNote: a.sportsNote ?? "",
      medicalStatus: a.medicalStatus,
      medicalNote: a.medicalNote ?? "",
      guestBillingEnabled: a.guestBillingEnabled,
      guestFeeBRL: String(((a.guestFeeCents || 0) / 100).toFixed(2)).replace(".", ","),
      email: a.associate?.email ?? "",
      phone: a.associate?.phone ?? "",
      monthlyFeeBRL: String(((a.associate?.monthlyFeeCents || 6000) / 100).toFixed(2)).replace(".", ","),
      associateStatus: a.associate?.status ?? "ACTIVE"
    });
  }, [athleteQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      apiRequest<AthleteProfile>(isEditing ? `/athletes/${id}` : "/athletes", {
        method: isEditing ? "PATCH" : "POST",
        body: JSON.stringify({
          name: form.name,
          position: form.position,
          linkType: form.linkType,
          status: form.status,
          rating: form.rating,
          birthDate: form.birthDate || null,
          joinedAt: form.joinedAt || null,
          associateId: form.associateId || undefined,
          photoUrl: form.photoUrl || undefined,
          sportsNote: form.sportsNote || undefined,
          medicalStatus: form.medicalStatus,
          medicalNote: form.medicalNote || undefined,
          guestBillingEnabled: form.guestBillingEnabled,
          guestFeeCents: toCents(form.guestFeeBRL),
          associate: form.linkType === "ASSOCIATE" && !form.associateId ? {
            email: form.email || undefined,
            phone: form.phone || undefined,
            monthlyFeeCents: toCents(form.monthlyFeeBRL) || 6000,
            status: form.associateStatus,
            joinedAt: form.joinedAt || null
          } : undefined
        })
      }),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ["athletes"] });
      navigate(`/atletas/${saved.id}/perfil`);
    }
  });

  const isLoading = isEditing && athleteQuery.isLoading;
  const associates = associatesQuery.data ?? [];
  const set = <K extends keyof FormState>(k: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Pessoas"
        breadcrumbs={[
          { label: "Pessoas", href: "/pessoas" },
          { label: "Elenco", href: "/atletas/elenco" },
          ...(isEditing && athleteQuery.data ? [{ label: athleteQuery.data.name, href: `/atletas/${id}/perfil` }] : []),
          { label: isEditing ? "Editar" : "Novo atleta" }
        ]}
        title={isEditing ? "Editar atleta" : "Novo atleta"}
        subtitle={isEditing ? "Atualize os dados do atleta." : "Preencha os dados para cadastrar um novo atleta."}
        action={
          <Link
            to={isEditing ? `/atletas/${id}/perfil` : "/atletas/elenco"}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft size={14} /> Voltar
          </Link>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-11 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); void saveMutation.mutateAsync(); }} className="space-y-4">
          <SectionCard title="Dados principais">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-black text-slate-700 sm:col-span-2">
                Nome completo <span className="text-red-500">*</span>
                <input required className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 focus:border-slate-400 focus:outline-none" value={form.name} onChange={set("name")} placeholder="Nome do atleta" />
              </label>
              <label className="block text-sm font-black text-slate-700">
                Posição
                <select className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 focus:border-slate-400 focus:outline-none" value={form.position} onChange={set("position")}>
                  {positionOptions.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </label>
              <label className="block text-sm font-black text-slate-700">
                Vínculo
                <select className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 focus:border-slate-400 focus:outline-none" value={form.linkType} onChange={set("linkType")}>
                  <option value="ASSOCIATE">Associado</option>
                  <option value="CONTRACTED">Contratado</option>
                  <option value="GUEST">Convidado</option>
                </select>
              </label>
              <label className="block text-sm font-black text-slate-700">
                Situação
                <select className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 focus:border-slate-400 focus:outline-none" value={form.status} onChange={set("status")}>
                  <option value="ACTIVE">Ativo</option>
                  <option value="INACTIVE">Inativo</option>
                  <option value="DELINQUENT">Inadimplente</option>
                  <option value="SUSPENDED">Suspenso</option>
                </select>
              </label>
              <label className="block text-sm font-black text-slate-700">
                Nível (1–5)
                <input type="number" min={1} max={5} className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 focus:border-slate-400 focus:outline-none" value={form.rating} onChange={(e) => setForm((f) => ({ ...f, rating: Number(e.target.value) }))} />
              </label>
              <label className="block text-sm font-black text-slate-700">
                Data de nascimento
                <input type="date" className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 focus:border-slate-400 focus:outline-none" value={form.birthDate} onChange={set("birthDate")} />
              </label>
              <label className="block text-sm font-black text-slate-700">
                Data de entrada no clube
                <input type="date" className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 focus:border-slate-400 focus:outline-none" value={form.joinedAt} onChange={set("joinedAt")} />
              </label>
              {form.linkType === "ASSOCIATE" && (
                <label className="block text-sm font-black text-slate-700">
                  Vincular associado existente
                  <select className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 focus:border-slate-400 focus:outline-none" value={form.associateId} onChange={set("associateId")}>
                    <option value="">Criar novo associado automaticamente</option>
                    {associates.filter((a) => !a.athlete).map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </label>
              )}
              <label className="block text-sm font-black text-slate-700 sm:col-span-2">
                Observações esportivas
                <textarea className="mt-1.5 min-h-16 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-950 focus:border-slate-400 focus:outline-none" value={form.sportsNote} onChange={set("sportsNote")} placeholder="Notas técnicas, posições secundárias..." />
              </label>
            </div>
          </SectionCard>

          <SectionCard title="Status médico">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-black text-slate-700">
                Status médico
                <select className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 focus:border-slate-400 focus:outline-none" value={form.medicalStatus} onChange={set("medicalStatus")}>
                  <option value="CLEARED">Liberado</option>
                  <option value="OBSERVATION">Em observação</option>
                  <option value="INJURED">Lesionado</option>
                  <option value="TREATMENT">Em tratamento</option>
                </select>
              </label>
              {form.medicalStatus !== "CLEARED" && (
                <label className="block text-sm font-black text-slate-700">
                  Observação médica
                  <input className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 focus:border-slate-400 focus:outline-none" value={form.medicalNote} onChange={set("medicalNote")} placeholder="Detalhe o quadro médico..." />
                </label>
              )}
            </div>
          </SectionCard>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={saveMutation.isPending || !form.name.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-black text-white hover:bg-red-700 disabled:opacity-60"
            >
              <Save size={14} />
              {saveMutation.isPending ? "Salvando..." : isEditing ? "Salvar alterações" : "Cadastrar atleta"}
            </button>
            <Link
              to={isEditing ? `/atletas/${id}/perfil` : "/atletas/elenco"}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </Link>
            {saveMutation.isError && (
              <p className="text-sm font-semibold text-red-600">Erro ao salvar. Verifique os dados.</p>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
