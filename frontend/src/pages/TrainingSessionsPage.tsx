import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, CheckCircle2, Clock3, MapPin, Plus, Users } from "lucide-react";
import { ContentCard, DataTable, EnterpriseStatCard, FilterBar, PageTemplate, StatsGrid } from "../components/ui/EnterpriseUI";
import { apiRequest } from "../services/api";
import type { ClubEvent, ClubEventRegistration } from "../types/domain";

const TRAINING_MARKER = "[training-session]";

function isTrainingSession(event: ClubEvent) {
  return event.type === "SPORT" && (event.description ?? "").includes(TRAINING_MARKER);
}

function trainingDescription(form: { objective: string; coach: string; notes: string }) {
  const lines = [
    TRAINING_MARKER,
    `Objetivo: ${form.objective || "Treino técnico"}`,
    `Responsável: ${form.coach || "Comissão técnica"}`,
    form.notes ? `Notas: ${form.notes}` : ""
  ].filter(Boolean);
  return lines.join("\n");
}

function readTrainingLine(event: ClubEvent, label: string) {
  const line = (event.description ?? "").split("\n").find((item) => item.startsWith(`${label}:`));
  return line?.replace(`${label}:`, "").trim() || "-";
}

function toDateTimeLocal(value: Date) {
  const offset = value.getTimezoneOffset();
  return new Date(value.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function durationMinutes(event: ClubEvent) {
  if (!event.endsAt) return "-";
  const minutes = Math.max(0, Math.round((new Date(event.endsAt).getTime() - new Date(event.startsAt).getTime()) / 60_000));
  return `${minutes} min`;
}

export function TrainingSessionsPage() {
  const queryClient = useQueryClient();
  const [selectedTrainingId, setSelectedTrainingId] = useState("");
  const [form, setForm] = useState({
    title: "",
    objective: "",
    coach: "",
    startsAt: toDateTimeLocal(new Date()),
    durationMinutes: "90",
    location: "",
    capacity: "30",
    notes: ""
  });

  const eventsQuery = useQuery({
    queryKey: ["events", "training-sessions"],
    queryFn: () => apiRequest<ClubEvent[]>("/events?type=SPORT"),
    retry: false
  });

  const trainings = useMemo(() => (eventsQuery.data ?? []).filter(isTrainingSession), [eventsQuery.data]);
  const selectedTraining = trainings.find((training) => training.id === selectedTrainingId) ?? trainings[0];
  const upcomingTrainings = trainings.filter((training) => new Date(training.startsAt).getTime() >= Date.now());
  const openTrainings = trainings.filter((training) => training.status === "OPEN");

  const registrationsQuery = useQuery({
    queryKey: ["events", selectedTraining?.id, "registrations", "training"],
    queryFn: () => apiRequest<ClubEventRegistration[]>(`/events/${selectedTraining?.id}/registrations`),
    enabled: Boolean(selectedTraining?.id),
    retry: false
  });

  const registrations = registrationsQuery.data ?? [];
  const confirmed = registrations.filter((registration) => registration.status === "CONFIRMED" || registration.status === "CHECKED_IN").length;
  const checkedIn = registrations.filter((registration) => registration.status === "CHECKED_IN").length;

  const createTrainingMutation = useMutation({
    mutationFn: () => {
      const startsAt = new Date(form.startsAt);
      const endsAt = new Date(startsAt.getTime() + (Number(form.durationMinutes) || 90) * 60_000);
      return apiRequest<ClubEvent>("/events", {
        method: "POST",
        body: JSON.stringify({
          title: form.title,
          description: trainingDescription(form),
          type: "SPORT",
          status: "OPEN",
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
          location: form.location,
          capacity: Number(form.capacity) || null,
          registrationEnabled: true,
          registrationFeeCents: 0,
          expectedRevenueCents: 0,
          expectedExpenseCents: 0
        })
      });
    },
    onSuccess: async (training) => {
      setSelectedTrainingId(training.id);
      setForm({ title: "", objective: "", coach: "", startsAt: toDateTimeLocal(new Date()), durationMinutes: "90", location: "", capacity: "30", notes: "" });
      await queryClient.invalidateQueries({ queryKey: ["events", "training-sessions"] });
    }
  });

  return (
    <PageTemplate
      eyebrow="Agenda"
      title="Treinos"
      description="Planeje sessões de treino, registre responsável, duração, local e acompanhe confirmações dos participantes."
      actions={
        <button type="button" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[var(--brand-primary)] px-4 text-sm font-black text-white" onClick={() => document.getElementById("novo-treino")?.scrollIntoView({ behavior: "smooth" })}>
          <Plus size={16} /> Novo treino
        </button>
      }
    >
      <StatsGrid>
        <EnterpriseStatCard label="Treinos futuros" value={upcomingTrainings.length} helper={`${trainings.length} sessão(ões) no total`} icon={<CalendarDays size={18} />} />
        <EnterpriseStatCard label="Inscrições abertas" value={openTrainings.length} helper="sessões recebendo presença" icon={<CheckCircle2 size={18} />} />
        <EnterpriseStatCard label="Confirmados" value={confirmed} helper={selectedTraining ? selectedTraining.title : "treino selecionado"} icon={<Users size={18} />} />
        <EnterpriseStatCard label="Check-ins" value={checkedIn} helper="presenças registradas" icon={<Clock3 size={18} />} />
      </StatsGrid>

      <ContentCard title="Cadastrar sessão" description="Treinos ficam integrados à Agenda e usam inscrições para controle de presença." className="mt-4">
        <form
          id="novo-treino"
          className="grid gap-3 xl:grid-cols-[minmax(14rem,1fr)_minmax(12rem,0.8fr)_11rem_9rem_minmax(12rem,0.8fr)]"
          onSubmit={(event) => {
            event.preventDefault();
            void createTrainingMutation.mutateAsync();
          }}
        >
          <input className="h-11 rounded-lg border-slate-200 px-3 text-sm font-semibold" placeholder="Título do treino" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required />
          <input className="h-11 rounded-lg border-slate-200 px-3 text-sm font-semibold" placeholder="Objetivo" value={form.objective} onChange={(event) => setForm((current) => ({ ...current, objective: event.target.value }))} />
          <input type="datetime-local" className="h-11 rounded-lg border-slate-200 px-3 text-sm font-semibold" value={form.startsAt} onChange={(event) => setForm((current) => ({ ...current, startsAt: event.target.value }))} required />
          <input className="h-11 rounded-lg border-slate-200 px-3 text-sm font-semibold" placeholder="Duração" value={form.durationMinutes} onChange={(event) => setForm((current) => ({ ...current, durationMinutes: event.target.value.replace(/\D/g, "") }))} />
          <input className="h-11 rounded-lg border-slate-200 px-3 text-sm font-semibold" placeholder="Local" value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} />
          <input className="h-11 rounded-lg border-slate-200 px-3 text-sm font-semibold" placeholder="Responsável" value={form.coach} onChange={(event) => setForm((current) => ({ ...current, coach: event.target.value }))} />
          <input className="h-11 rounded-lg border-slate-200 px-3 text-sm font-semibold" placeholder="Capacidade" value={form.capacity} onChange={(event) => setForm((current) => ({ ...current, capacity: event.target.value.replace(/\D/g, "") }))} />
          <input className="h-11 rounded-lg border-slate-200 px-3 text-sm font-semibold xl:col-span-2" placeholder="Notas" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
          <button type="submit" disabled={createTrainingMutation.isPending} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--brand-primary)] px-4 text-sm font-black text-white disabled:opacity-60">
            {createTrainingMutation.isPending ? "Salvando..." : "Salvar"}
          </button>
        </form>
      </ContentCard>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.75fr)]">
        <ContentCard title="Agenda de treinos" description={eventsQuery.isLoading ? "Carregando treinos..." : `${trainings.length} sessão(ões) encontradas.`}>
          <DataTable
            rows={trainings}
            getRowKey={(training) => training.id}
            emptyTitle="Nenhum treino cadastrado"
            emptyDescription="Crie a primeira sessão para começar a controlar presença e rotina técnica."
            columns={[
              { key: "title", header: "Treino", render: (training) => <button type="button" className="text-left font-black text-slate-950 hover:text-[var(--brand-accent)]" onClick={() => setSelectedTrainingId(training.id)}>{training.title}</button> },
              { key: "date", header: "Data", render: (training) => formatDateTime(training.startsAt) },
              { key: "objective", header: "Objetivo", render: (training) => readTrainingLine(training, "Objetivo") },
              { key: "duration", header: "Duração", render: durationMinutes },
              { key: "status", header: "Status", render: (training) => training.status }
            ]}
          />
        </ContentCard>

        <ContentCard title={selectedTraining ? selectedTraining.title : "Presenças"} description={selectedTraining ? "Acompanhamento da sessão selecionada." : "Selecione um treino para acompanhar."}>
          {selectedTraining ? (
            <div className="space-y-4">
              <div className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-600">
                <p className="flex items-center gap-2"><CalendarDays size={16} /> {formatDateTime(selectedTraining.startsAt)}</p>
                <p className="flex items-center gap-2"><MapPin size={16} /> {selectedTraining.location ?? "Local não informado"}</p>
                <p><strong className="text-slate-950">Responsável:</strong> {readTrainingLine(selectedTraining, "Responsável")}</p>
                <p><strong className="text-slate-950">Capacidade:</strong> {selectedTraining.capacity ?? "Livre"}</p>
              </div>

              <FilterBar>
                <div className="grid w-full grid-cols-3 gap-2 text-center text-xs font-black text-slate-600">
                  <span className="rounded-lg bg-slate-100 px-2 py-2">{registrations.length} inscritos</span>
                  <span className="rounded-lg bg-emerald-50 px-2 py-2 text-emerald-700">{confirmed} confirmados</span>
                  <span className="rounded-lg bg-sky-50 px-2 py-2 text-sky-700">{checkedIn} presentes</span>
                </div>
              </FilterBar>

              <DataTable
                rows={registrations}
                getRowKey={(registration) => registration.id}
                emptyTitle="Sem participantes"
                emptyDescription="Use o fluxo de inscrições da Agenda para adicionar participantes ao treino."
                columns={[
                  { key: "name", header: "Participante", render: (registration) => registration.name },
                  { key: "status", header: "Status", render: (registration) => registration.status },
                  { key: "note", header: "Nota", render: (registration) => registration.note ?? "-" }
                ]}
              />
            </div>
          ) : (
            <p className="text-sm font-semibold text-slate-500">Nenhum treino selecionado.</p>
          )}
        </ContentCard>
      </div>
    </PageTemplate>
  );
}
