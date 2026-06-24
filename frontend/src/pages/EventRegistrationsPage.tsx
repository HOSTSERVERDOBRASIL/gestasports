import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Plus, Search, Trash2, Users } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiRequest } from "../services/api";
import type { Associate, ClubEvent, ClubEventRegistration, ClubEventRegistrationStatus } from "../types/domain";

type OutletPeriod = {
  month: number;
  year: number;
};

type RegistrationDetail = ClubEventRegistration & {
  event: ClubEvent;
};

const registrationStatusLabels: Record<ClubEventRegistrationStatus, string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmada",
  CANCELED: "Cancelada",
  CHECKED_IN: "Check-in"
};

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((cents || 0) / 100);
}

function parseCurrencyToCents(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  return Math.round(Number(normalized || 0) * 100);
}

function centsToInput(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.08em] text-slate-500">
              {icon}
              {eyebrow}
            </p>
            <h1 className="mt-1 text-xl font-black text-slate-950">{title}</h1>
            <p className="mt-1 max-w-4xl text-sm font-semibold leading-5 text-slate-500">{description}</p>
          </div>
          {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
        </div>
      </article>
      {children}
    </section>
  );
}

function MetricGrid({ metrics }: { metrics: Array<{ label: string; value: string; hint: string }> }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-2 sm:grid-cols-3">
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

export function EventRegistrationsListPage() {
  const { year } = useOutletContext<OutletPeriod>();
  const queryClient = useQueryClient();
  const location = useLocation();
  const [search, setSearch] = useState("");
  const [selectedEventId, setSelectedEventId] = useState("");
  const [statusFilter, setStatusFilter] = useState<ClubEventRegistrationStatus | "ALL">("ALL");

  const eventsQuery = useQuery({
    queryKey: ["club-events", "registrations-list", year],
    queryFn: () => apiRequest<ClubEvent[]>(`/events?year=${year}`)
  });
  const events = useMemo(() => eventsQuery.data ?? [], [eventsQuery.data]);
  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? events[0] ?? null;

  useEffect(() => {
    const queryEventId = new URLSearchParams(location.search).get("eventId");
    if (queryEventId) {
      setSelectedEventId(queryEventId);
    }
  }, [location.search]);

  const registrationsQuery = useQuery({
    queryKey: ["club-event-registrations", selectedEvent?.id],
    enabled: Boolean(selectedEvent?.id),
    queryFn: () => apiRequest<ClubEventRegistration[]>(`/events/${selectedEvent?.id}/registrations`)
  });
  const registrations = useMemo(() => registrationsQuery.data ?? [], [registrationsQuery.data]);
  const filteredRegistrations = useMemo(() => {
    const term = search.trim().toLowerCase();
    return registrations.filter((registration) => {
      const matchesStatus = statusFilter === "ALL" || registration.status === statusFilter;
      const matchesSearch =
        !term ||
        [registration.name, registration.email ?? "", registration.phone ?? "", registration.associate?.name ?? "", registration.note ?? ""].some((value) =>
          value.toLowerCase().includes(term)
        );

      return matchesStatus && matchesSearch;
    });
  }, [registrations, search, statusFilter]);
  const activeRegistrations = registrations.filter((item) => item.status !== "CANCELED");
  const confirmedCount = registrations.filter((item) => item.status === "CONFIRMED" || item.status === "CHECKED_IN").length;
  const checkedInCount = registrations.filter((item) => item.status === "CHECKED_IN").length;
  const paidTotal = registrations.reduce((total, item) => total + item.amountCents, 0);
  const pendingCount = registrations.filter((item) => item.status === "PENDING").length;
  const canceledCount = registrations.filter((item) => item.status === "CANCELED").length;
  const occupancyPercent = selectedEvent?.capacity ? Math.min(100, Math.round((activeRegistrations.length / selectedEvent.capacity) * 100)) : null;
  const registrationStatusChartData = (Object.entries(registrationStatusLabels) as Array<[ClubEventRegistrationStatus, string]>)
    .map(([status, label]) => ({
      status: label,
      inscricoes: registrations.filter((item) => item.status === status).length
    }))
    .filter((item) => item.inscricoes > 0);

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

  return (
    <SectionShell
      eyebrow="Eventos"
      title="Inscrições"
      description="Os inscritos cadastrados aparecem em lista operacional, com filtros, status, valores, check-in e ações."
      icon={<Users size={16} />}
      action={
        <div className="flex flex-wrap gap-2">
          <Link className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50" to="/eventos">Gerenciar eventos</Link>
          <Link className="inline-flex items-center gap-2 rounded-lg bg-[#08255b] px-4 py-2 text-sm font-black text-white shadow-sm hover:bg-[#0b3278]" to={selectedEvent ? `/eventos/inscricoes/nova?eventId=${selectedEvent.id}` : "/eventos/inscricoes/nova"}>
            <Plus size={16} />
            Nova inscrição
          </Link>
        </div>
      }
    >
      <MetricGrid
        metrics={[
          { label: "Eventos no ano", value: String(events.length), hint: `${year}` },
          { label: "Confirmados", value: String(confirmedCount), hint: `${checkedInCount} com check-in` },
          { label: "Valores", value: formatCurrency(paidTotal), hint: "Total informado nas inscrições" }
        ]}
      />

      <article className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[minmax(0,1fr)_minmax(17rem,0.45fr)]">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-950">Resumo das inscrições</h2>
              <p className="text-sm font-semibold text-slate-500">Status, ocupação e controle rápido do evento selecionado.</p>
            </div>
            <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">{filteredRegistrations.length} na lista</span>
          </div>
          <div className="mt-3 h-48 min-w-0">
            {registrationStatusChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={registrationStatusChartData} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                  <XAxis dataKey="status" tick={{ fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="inscricoes" fill="#dc2626" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm font-semibold text-slate-500">Sem inscrições para gerar gráfico.</div>
            )}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Controle do evento</p>
          <div className="mt-3 space-y-2 text-sm font-semibold text-slate-600">
            <p className="flex items-center justify-between gap-3"><span>Pendentes</span><strong className="text-slate-950">{pendingCount}</strong></p>
            <p className="flex items-center justify-between gap-3"><span>Canceladas</span><strong className="text-slate-950">{canceledCount}</strong></p>
            <p className="flex items-center justify-between gap-3"><span>Check-in</span><strong className="text-slate-950">{checkedInCount}</strong></p>
            <p className="flex items-center justify-between gap-3"><span>Ocupação</span><strong className="text-slate-950">{occupancyPercent === null ? "-" : `${occupancyPercent}%`}</strong></p>
          </div>
        </div>
      </article>

      <article className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:flex-wrap xl:items-end xl:justify-between">
          <div className="grid gap-2 sm:grid-cols-[minmax(16rem,26rem)_12rem]">
            <label className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">
              Evento
              <select className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold normal-case tracking-normal text-slate-700" value={selectedEvent?.id ?? ""} onChange={(event) => setSelectedEventId(event.target.value)}>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>{event.title}</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">
              Status
              <select className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold normal-case tracking-normal text-slate-700" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ClubEventRegistrationStatus | "ALL")}>
                <option value="ALL">Todos</option>
                {Object.entries(registrationStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          </div>
          <label className="relative block w-full xl:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input className="h-10 w-full rounded-lg border border-slate-200 px-3 pl-9 text-sm font-semibold" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar inscrito" />
          </label>
        </div>

        {selectedEvent ? (
          <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="font-black text-slate-950">{selectedEvent.title}</p>
            <p className="mt-1 font-semibold text-slate-500">{new Date(selectedEvent.startsAt).toLocaleDateString("pt-BR")} - {selectedEvent.location ?? "Local não informado"}</p>
            <p className="mt-2 text-xs font-black text-slate-600">{selectedEvent.capacity ? `${activeRegistrations.length}/${selectedEvent.capacity} vagas` : `${registrations.length} inscrições`}</p>
          </div>
        ) : (
          <p className="mb-4 rounded-lg border border-dashed border-slate-300 p-3 text-sm font-semibold text-slate-500">Cadastre um evento antes de abrir inscrições.</p>
        )}

        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.08em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Participante</th>
                <th className="px-4 py-3">Contato</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Check-in</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRegistrations.map((registration) => (
                <tr key={registration.id}>
                  <td className="px-4 py-3">
                    <p className="font-black text-slate-950">{registration.name}</p>
                    <p className="text-xs font-semibold text-slate-500">{registration.associate ? "Associado" : "Avulso"}</p>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-600">{registration.email ?? registration.phone ?? "-"}</td>
                  <td className="px-4 py-3"><span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-black text-slate-700">{registrationStatusLabels[registration.status]}</span></td>
                  <td className="px-4 py-3 font-black text-slate-950">{formatCurrency(registration.amountCents)}</td>
                  <td className="px-4 py-3 font-semibold text-slate-600">{registration.checkedInAt ? new Date(registration.checkedInAt).toLocaleString("pt-BR") : "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50" to={`/eventos/inscricoes/${registration.id}/editar`}>Editar</Link>
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
          {!registrationsQuery.isLoading && filteredRegistrations.length === 0 ? <p className="p-4 text-sm font-semibold text-slate-500">Nenhuma inscrição encontrada para este evento.</p> : null}
        </div>
      </article>
    </SectionShell>
  );
}

export function EventRegistrationFormPage() {
  const { year } = useOutletContext<OutletPeriod>();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { registrationId } = useParams<{ registrationId: string }>();
  const isEditing = Boolean(registrationId);
  const queryEventId = new URLSearchParams(location.search).get("eventId") ?? "";
  const [form, setForm] = useState({
    eventId: queryEventId,
    associateId: "",
    name: "",
    email: "",
    phone: "",
    status: "PENDING" as ClubEventRegistrationStatus,
    amountBRL: "",
    paidAt: "",
    checkedInAt: "",
    note: ""
  });

  const eventsQuery = useQuery({
    queryKey: ["club-events", "registration-form", year],
    queryFn: () => apiRequest<ClubEvent[]>(`/events?year=${year}`)
  });
  const associatesQuery = useQuery({
    queryKey: ["associates", "event-registration-form"],
    queryFn: () => apiRequest<Associate[]>("/associates")
  });
  const registrationQuery = useQuery({
    queryKey: ["club-event-registration", registrationId],
    enabled: isEditing,
    queryFn: () => apiRequest<RegistrationDetail>(`/events/registrations/${registrationId}`)
  });
  const events = useMemo(() => eventsQuery.data ?? [], [eventsQuery.data]);
  const activeAssociates = useMemo(() => (associatesQuery.data ?? []).filter((associate) => associate.status === "ACTIVE"), [associatesQuery.data]);
  const selectedEvent = events.find((event) => event.id === form.eventId) ?? null;

  useEffect(() => {
    if (!form.eventId && events[0]) {
      setForm((prev) => ({ ...prev, eventId: events[0].id, amountBRL: prev.amountBRL || centsToInput(events[0].registrationFeeCents) }));
    }
  }, [events, form.eventId]);

  useEffect(() => {
    const registration = registrationQuery.data;
    if (!registration) return;
    setForm({
      eventId: registration.eventId,
      associateId: registration.associateId ?? "",
      name: registration.name,
      email: registration.email ?? "",
      phone: registration.phone ?? "",
      status: registration.status,
      amountBRL: centsToInput(registration.amountCents),
      paidAt: registration.paidAt ? registration.paidAt.slice(0, 16) : "",
      checkedInAt: registration.checkedInAt ? registration.checkedInAt.slice(0, 16) : "",
      note: registration.note ?? ""
    });
  }, [registrationQuery.data]);

  function handleAssociateChange(associateId: string) {
    const associate = activeAssociates.find((item) => item.id === associateId);
    setForm((prev) => ({
      ...prev,
      associateId,
      name: associate?.name ?? "",
      email: associate?.email ?? "",
      phone: associate?.phone ?? ""
    }));
  }

  function handleEventChange(eventId: string) {
    const event = events.find((item) => item.id === eventId);
    setForm((prev) => ({
      ...prev,
      eventId,
      amountBRL: prev.amountBRL || (event ? centsToInput(event.registrationFeeCents) : "")
    }));
  }

  const saveRegistrationMutation = useMutation({
    mutationFn: () => {
      const payload = {
        associateId: form.associateId || null,
        name: form.name,
        email: form.email,
        phone: form.phone,
        status: form.status,
        amountCents: parseCurrencyToCents(form.amountBRL),
        paidAt: form.paidAt ? new Date(form.paidAt).toISOString() : null,
        checkedInAt: form.checkedInAt ? new Date(form.checkedInAt).toISOString() : null,
        note: form.note
      };

      return apiRequest<ClubEventRegistration>(isEditing ? `/events/registrations/${registrationId}` : `/events/${form.eventId}/registrations`, {
        method: isEditing ? "PATCH" : "POST",
        body: JSON.stringify(payload)
      });
    },
    onSuccess: (registration) => {
      void queryClient.invalidateQueries({ queryKey: ["club-event-registrations", registration.eventId] });
      navigate(`/eventos/inscricoes?eventId=${registration.eventId}`);
    }
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void saveRegistrationMutation.mutateAsync();
  }

  return (
    <SectionShell
      eyebrow="Eventos"
      title={isEditing ? "Editar inscrição" : "Nova inscrição"}
      description="Preencha a inscrição em página própria, com vínculo ao evento, associado opcional, contato, status, pagamento, check-in e observações."
      icon={<ClipboardList size={16} />}
      action={<Link className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50" to={form.eventId ? `/eventos/inscricoes?eventId=${form.eventId}` : "/eventos/inscricoes"}>Voltar para lista</Link>}
    >
      <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <form className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]" onSubmit={handleSubmit}>
          <div className="space-y-3">
            <h2 className="text-lg font-black text-slate-950">Dados da inscrição</h2>
            <label className="block text-sm font-black text-slate-700">
              Evento
              <select className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold" value={form.eventId} onChange={(event) => handleEventChange(event.target.value)} disabled={isEditing} required>
                <option value="">Selecione</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>{event.title}</option>
                ))}
              </select>
            </label>
            {selectedEvent ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs font-semibold text-slate-600">
                <p className="font-black text-slate-950">{selectedEvent.title}</p>
                <p className="mt-1">{new Date(selectedEvent.startsAt).toLocaleString("pt-BR")} - {selectedEvent.location ?? "Local não informado"}</p>
                <p className="mt-1">Inscrição: {selectedEvent.registrationEnabled ? "aberta" : "fechada"} | Taxa {formatCurrency(selectedEvent.registrationFeeCents)} | Capacidade {selectedEvent.capacity ?? "livre"}</p>
              </div>
            ) : null}
            <label className="block text-sm font-black text-slate-700">
              Associado
              <select className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold" value={form.associateId} onChange={(event) => handleAssociateChange(event.target.value)}>
                <option value="">Participante avulso</option>
                {activeAssociates.map((associate) => (
                  <option key={associate.id} value={associate.id}>{associate.name}</option>
                ))}
              </select>
            </label>
            <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold" placeholder="Nome do participante" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} required />
            <div className="grid gap-2 sm:grid-cols-2">
              <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold" placeholder="Email" value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} />
              <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold" placeholder="Telefone" value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} />
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-black text-slate-950">Controle</h2>
            <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold" value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as ClubEventRegistrationStatus }))}>
              {Object.entries(registrationStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold" placeholder="Valor R$" value={form.amountBRL} onChange={(event) => setForm((prev) => ({ ...prev, amountBRL: event.target.value }))} />
            <label className="block text-sm font-black text-slate-700">
              Pago em
              <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold" type="datetime-local" value={form.paidAt} onChange={(event) => setForm((prev) => ({ ...prev, paidAt: event.target.value }))} />
            </label>
            <label className="block text-sm font-black text-slate-700">
              Check-in em
              <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold" type="datetime-local" value={form.checkedInAt} onChange={(event) => setForm((prev) => ({ ...prev, checkedInAt: event.target.value }))} />
            </label>
            <textarea className="min-h-24 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold" placeholder="Observações" value={form.note} onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))} />
          </div>

          <div className="flex flex-col gap-2 border-t border-slate-200 pt-4 sm:flex-row lg:col-span-2">
            <button className="min-h-10 rounded-lg bg-[#08255b] px-4 text-sm font-black text-white disabled:opacity-60" disabled={!form.eventId || saveRegistrationMutation.isPending}>
              {saveRegistrationMutation.isPending ? "Salvando..." : isEditing ? "Salvar inscrição" : "Cadastrar inscrição"}
            </button>
            <Link className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 hover:bg-slate-50" to={form.eventId ? `/eventos/inscricoes?eventId=${form.eventId}` : "/eventos/inscricoes"}>Cancelar</Link>
          </div>
        </form>
      </article>
    </SectionShell>
  );
}
