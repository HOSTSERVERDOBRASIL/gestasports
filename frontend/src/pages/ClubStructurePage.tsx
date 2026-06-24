import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, CalendarDays, Search, Shield, Shirt, Upload, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiRequest } from "../services/api";
import { TeamColorCard } from "../components/ui/TeamColorCard";
import { encodeTeamKit, parseTeamKit, type TeamKit, type UniformStyle } from "../utils/teamColors";
import type { AthleteProfile, Club, ClubStatus, ClubType, Competition, CompetitionFormat, CompetitionType, Game, GameCallUp, Team, TeamCategory, TeamGender, TeamStatus } from "../types/domain";

const clubTypeLabels: Record<ClubType, string> = {
  INTERNAL: "Clube principal",
  EXTERNAL: "Adversário",
  PARTNER: "Parceiro",
  GUEST: "Avulso"
};

const categoryLabels: Record<TeamCategory, string> = {
  PRINCIPAL: "Principal",
  VETERANO: "Veterano",
  SUB_20: "Sub-20",
  SUB_17: "Sub-17",
  SUB_15: "Sub-15",
  FEMININO: "Feminino",
  MISTO: "Misto"
};

const genderLabels: Record<TeamGender, string> = {
  MALE: "Masculino",
  FEMALE: "Feminino",
  MIXED: "Misto"
};

const competitionTypeLabels: Record<CompetitionType, string> = {
  LEAGUE: "Campeonato",
  CUP: "Copa",
  TOURNAMENT: "Torneio",
  FRIENDLY_SERIES: "Série amistosa"
};

const competitionFormatLabels: Record<CompetitionFormat, string> = {
  PONTOS_CORRIDOS: "Pontos corridos",
  MATA_MATA: "Mata-mata",
  GRUPOS: "Grupos",
  GRUPOS_E_MATA_MATA: "Grupos + mata-mata",
  JOGO_UNICO: "Jogo único",
  IDA_E_VOLTA: "Ida e volta"
};

function PageShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="fl-internal-screen min-w-0" aria-label={title}>
      <article className="fl-internal-panel min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        {children}
      </article>
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-500">{text}</p>;
}

const shirtModelOptions: Array<{ value: UniformStyle; label: string }> = [
  { value: "SOLID", label: "Liso" },
  { value: "HALF_AND_HALF", label: "Duas cores" },
  { value: "TWO_CENTER_LINES", label: "Barras centrais" },
  { value: "CENTER_BARS_DUO", label: "Barras premium" },
  { value: "STRIPES", label: "Listrado" },
  { value: "STRIPED_THIN", label: "Listras finas" },
  { value: "STRIPED_THICK", label: "Listras largas" },
  { value: "HOOPS", label: "Horizontal" },
  { value: "DIAGONAL_ELITE", label: "Diagonal" },
  { value: "MESH_PATTERN", label: "Textura" }
];

function setKitValue(currentValue: string, patch: Partial<TeamKit>, fallback = "#94a3b8") {
  const current = parseTeamKit(currentValue, fallback);
  const next = { ...current, ...patch };
  return encodeTeamKit(next.primary, next.accent, next.style, next);
}

function ShirtKitControls({
  value,
  fallback,
  onChange
}: {
  value: string;
  fallback: string;
  onChange: (value: string) => void;
}) {
  const kit = parseTeamKit(value, fallback);
  const usesExtraColors = kit.style !== "SOLID";
  const usesThirdColor = kit.colorCount === "TRICOLOR" || kit.colorCount === "FOUR" || kit.style === "TWO_CENTER_LINES" || kit.style === "CENTER_BARS_DUO";
  const usesFourthColor = kit.colorCount === "FOUR";

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs font-bold text-slate-600">
          Modelo
          <select
            className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2 text-sm font-semibold"
            value={kit.style}
            onChange={(event) => {
              const nextStyle = event.target.value as UniformStyle;
              onChange(setKitValue(value, {
                style: nextStyle,
                colorCount: nextStyle === "SOLID" ? "ONE" : nextStyle === "TWO_CENTER_LINES" || nextStyle === "CENTER_BARS_DUO" ? "TRICOLOR" : kit.colorCount === "ONE" ? "TWO" : kit.colorCount
              }, fallback));
            }}
          >
            {shirtModelOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className="text-xs font-bold text-slate-600">
          Cores
          <select
            className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2 text-sm font-semibold"
            value={kit.colorCount}
            onChange={(event) => onChange(setKitValue(value, { colorCount: event.target.value as TeamKit["colorCount"] }, fallback))}
          >
            <option value="ONE">1 cor</option>
            <option value="TWO">2 cores</option>
            <option value="TRICOLOR">Tricolor</option>
            <option value="FOUR">4 cores</option>
          </select>
        </label>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-5">
        {[
          { key: "primary" as const, label: "Cor 1", show: true },
          { key: "accent" as const, label: "Cor 2", show: usesExtraColors },
          { key: "tertiary" as const, label: "Cor 3", show: usesThirdColor },
          { key: "quaternary" as const, label: "Cor 4", show: usesFourthColor },
          { key: "sleeveColor" as const, label: "Mangas", show: true }
        ].map((item) => item.show ? (
          <label key={item.key} className="text-xs font-bold text-slate-600">
            {item.label}
            <input
              type="color"
              className="mt-1 h-8 w-full cursor-pointer rounded-lg border border-slate-300 bg-white p-0.5"
              value={kit[item.key]}
              onInput={(event) => onChange(setKitValue(value, { [item.key]: event.currentTarget.value, ...(item.key === "sleeveColor" ? { sleeveMode: "COLORED" as const } : {}) }, fallback))}
              onChange={(event) => onChange(setKitValue(value, { [item.key]: event.target.value, ...(item.key === "sleeveColor" ? { sleeveMode: "COLORED" as const } : {}) }, fallback))}
            />
          </label>
        ) : null)}
      </div>
    </div>
  );
}

const blankClubForm = {
  name: "",
  shortName: "",
  type: "EXTERNAL" as ClubType,
  city: "",
  state: "",
  country: "Brasil",
  responsibleName: "",
  responsiblePhone: "",
  responsibleEmail: "",
  logoUrl: "",
  shirtName: "",
  shirtColor: "#94a3b8",
  shirtImageUrl: ""
};

export function ClubesPageReal() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const [form, setForm] = useState(blankClubForm);
  const [editingClubId, setEditingClubId] = useState<string | null>(null);
  const [showClubEditor, setShowClubEditor] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | ClubType>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | ClubStatus>("ALL");
  const clubsQuery = useQuery({ queryKey: ["clubs"], queryFn: () => apiRequest<Club[]>("/clubs") });
  const saveClub = useMutation({
    mutationFn: () => apiRequest<Club>(editingClubId ? `/clubs/${editingClubId}` : "/clubs", { method: editingClubId ? "PATCH" : "POST", body: JSON.stringify(form) }),
    onSuccess: () => {
      setForm(blankClubForm);
      setEditingClubId(null);
      setShowClubEditor(false);
      navigate("/clubes", { replace: true });
      void queryClient.invalidateQueries({ queryKey: ["clubs"] });
    }
  });
  const statusClub = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ClubStatus }) => apiRequest<Club>(`/clubs/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["clubs"] })
  });

  function editClub(club: Club) {
    setEditingClubId(club.id);
    setShowClubEditor(true);
    setForm({
      name: club.name,
      shortName: club.shortName ?? "",
      type: club.type,
      city: club.city ?? "",
      state: club.state ?? "",
      country: club.country ?? "Brasil",
      responsibleName: club.responsibleName ?? "",
      responsiblePhone: club.responsiblePhone ?? "",
      responsibleEmail: club.responsibleEmail ?? "",
      logoUrl: club.logoUrl ?? "",
      shirtName: club.shirtName ?? club.shortName ?? club.name,
      shirtColor: club.shirtColor ?? "#94a3b8",
      shirtImageUrl: club.shirtImageUrl ?? ""
    });
  }

  function clearClubForm() {
    setEditingClubId(null);
    setShowClubEditor(false);
    setForm(blankClubForm);
    navigate("/clubes", { replace: true });
  }

  function handleLogoFile(file: File | null) {
    if (!file || !file.type.startsWith("image/")) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setForm((prev) => ({ ...prev, logoUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  }

  function handleClubShirtFile(file: File | null) {
    if (!file || !file.type.startsWith("image/")) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setForm((prev) => ({ ...prev, shirtImageUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  }

  const clubs = clubsQuery.data ?? [];
  const activeClubs = clubs.filter((club) => club.status === "ACTIVE");
  const externalClubs = clubs.filter((club) => club.type === "EXTERNAL");
  const internalClubs = clubs.filter((club) => club.type === "INTERNAL");
  const totalTeams = clubs.reduce((total, club) => total + (club.teams?.length ?? 0), 0);
  const filteredClubs = clubs.filter((club) => {
    const normalized = search.trim().toLowerCase();
    const matchesSearch = !normalized || [
      club.name,
      club.shortName ?? "",
      club.city ?? "",
      club.state ?? "",
      club.country ?? "",
      club.responsibleName ?? ""
    ].some((value) => value.toLowerCase().includes(normalized));
    const matchesType = typeFilter === "ALL" || club.type === typeFilter;
    const matchesStatus = statusFilter === "ALL" || club.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("edit") === "new") {
      setEditingClubId(null);
      setForm(blankClubForm);
      setShowClubEditor(true);
    }
  }, [location.search]);

  return (
    <PageShell title="Clubes e equipes">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="flex items-center gap-2 text-sm font-bold text-slate-500"><Building2 size={18} /> Clubes cadastrados</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">{clubs.length}</h2>
        </article>
        <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="flex items-center gap-2 text-sm font-bold text-slate-500"><Shield size={18} /> Ativos</p>
          <h2 className="mt-2 text-2xl font-black text-emerald-700">{activeClubs.length}</h2>
        </article>
        <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm font-bold text-slate-500">Adversários</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">{externalClubs.length}</h2>
        </article>
        <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="flex items-center gap-2 text-sm font-bold text-slate-500"><UsersRound size={18} /> Equipes vinculadas</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">{totalTeams}</h2>
        </article>
      </div>

      <section className="mt-4">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-950">Clubes, escudos e adversários</h2>
            <p className="text-sm font-semibold text-slate-500">Cadastre o clube principal, adversários e parceiros usados nos jogos externos.</p>
          </div>
          <span className="rounded-lg bg-white px-3 py-2 text-sm font-black text-slate-700">{filteredClubs.length} exibido(s)</span>
        </div>

      {showClubEditor ? (
        <section className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-950">{editingClubId ? "Editar clube" : "Novo clube"}</h2>
              <p className="text-sm font-semibold text-slate-500">Dados, responsável, localização e escudo.</p>
            </div>
            <button type="button" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50" onClick={clearClubForm}>
              Voltar para lista
            </button>
          </div>
          <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); saveClub.mutate(); }}>
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)]">
            <div className="grid gap-4 lg:grid-cols-[8rem_minmax(0,1fr)]">
              <span className="grid h-32 w-32 place-items-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                {form.logoUrl ? <img src={form.logoUrl} alt={form.name || "Escudo"} className="h-full w-full object-contain" /> : <Building2 size={32} className="text-slate-500" />}
              </span>
              <div className="grid gap-3">
              <div className="grid gap-3 md:grid-cols-2">
                <input className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold" placeholder="Nome do clube" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} required />
                <input className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold" placeholder="Nome curto" value={form.shortName} onChange={(event) => setForm((prev) => ({ ...prev, shortName: event.target.value }))} />
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <select className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold" value={form.type} onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value as ClubType }))}>
                  {Object.entries(clubTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <input className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold" placeholder="Cidade" value={form.city} onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))} />
                <input className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold" placeholder="UF" value={form.state} onChange={(event) => setForm((prev) => ({ ...prev, state: event.target.value.toUpperCase().slice(0, 2) }))} />
              </div>
              <input className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold" placeholder="Pais" value={form.country} onChange={(event) => setForm((prev) => ({ ...prev, country: event.target.value }))} />
              <div className="grid gap-3 md:grid-cols-3">
                <input className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold" placeholder="Responsavel" value={form.responsibleName} onChange={(event) => setForm((prev) => ({ ...prev, responsibleName: event.target.value }))} />
                <input className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold" placeholder="Telefone" value={form.responsiblePhone} onChange={(event) => setForm((prev) => ({ ...prev, responsiblePhone: event.target.value }))} />
                <input className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold" placeholder="E-mail" type="email" value={form.responsibleEmail} onChange={(event) => setForm((prev) => ({ ...prev, responsibleEmail: event.target.value }))} />
              </div>
              <input className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold" placeholder="URL do escudo" value={form.logoUrl} onChange={(event) => setForm((prev) => ({ ...prev, logoUrl: event.target.value }))} />
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">
                <Upload size={16} />
                Enviar escudo
                <input type="file" accept="image/*" className="hidden" onChange={(event) => handleLogoFile(event.target.files?.[0] ?? null)} />
              </label>
              </div>
            </div>
            <section className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="mb-3 flex items-center gap-2">
                <Shirt size={16} className="text-slate-500" />
                <div>
                  <h3 className="text-sm font-black text-slate-950">Camiseta do clube</h3>
                  <p className="text-xs font-semibold text-slate-500">Identidade usada em jogos, confrontos e acervo.</p>
                </div>
              </div>
              <TeamColorCard
                label="Preview"
                name={form.shirtName || form.shortName || form.name || "Camisa do clube"}
                color={form.shirtColor || "#94a3b8"}
                fallback="#94a3b8"
                imageUrl={form.shirtImageUrl || null}
                crestUrl={form.logoUrl || null}
                formation="4-3-3"
              />
              <div className="mt-3 grid gap-2">
                <input className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold" placeholder="Nome da camisa" value={form.shirtName} onChange={(event) => setForm((prev) => ({ ...prev, shirtName: event.target.value }))} />
                <ShirtKitControls value={form.shirtColor || "#94a3b8"} fallback="#94a3b8" onChange={(value) => setForm((prev) => ({ ...prev, shirtColor: value }))} />
                <input className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold" placeholder="URL da imagem da camisa" value={form.shirtImageUrl} onChange={(event) => setForm((prev) => ({ ...prev, shirtImageUrl: event.target.value }))} />
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">
                  <Upload size={16} />
                  Enviar imagem da camisa
                  <input type="file" accept="image/*" className="hidden" onChange={(event) => handleClubShirtFile(event.target.files?.[0] ?? null)} />
                </label>
              </div>
            </section>
            </div>
              {saveClub.isError ? (
                <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                  {saveClub.error instanceof Error ? saveClub.error.message : "Não foi possível salvar o clube."}
                </div>
              ) : null}
              <button className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-black text-white shadow-sm shadow-red-200 disabled:opacity-60" disabled={saveClub.isPending}>{saveClub.isPending ? "Salvando..." : editingClubId ? "Atualizar clube" : "Salvar clube"}</button>
          </form>
        </section>
      ) : (
      <div className="grid gap-4">
        <section className="min-w-0">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-950">Base de clubes</h2>
              <p className="text-sm text-slate-500">Use para seu clube, adversários, parceiros, equipes externas e jogos oficiais.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-lg bg-white px-3 py-2 text-sm font-black text-slate-700">{internalClubs.length} clube principal</span>
              <button type="button" className="rounded-lg bg-red-600 px-4 py-2 text-sm font-black text-white shadow-sm shadow-red-200" onClick={() => { setEditingClubId(null); setForm(blankClubForm); setShowClubEditor(true); navigate("/clubes?edit=new"); }}>
                Novo clube
              </button>
            </div>
          </div>

          <div className="mt-4 grid min-w-0 gap-2 lg:grid-cols-[minmax(14rem,1fr)_13rem_12rem]">
            <label className="relative block min-w-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} aria-hidden="true" />
              <input
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 pl-9 text-sm font-semibold"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar clube"
              />
            </label>
            <select className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)}>
              <option value="ALL">Todos os tipos</option>
              {Object.entries(clubTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
              <option value="ALL">Todos status</option>
              <option value="ACTIVE">Ativo</option>
              <option value="INACTIVE">Inativo</option>
            </select>
          </div>

          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.08em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Clube</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Local</th>
                  <th className="px-4 py-3">Camisa</th>
                  <th className="px-4 py-3">Equipes</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredClubs.map((club) => (
                  <tr key={club.id}>
                    <td className="px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                          {club.logoUrl ? <img src={club.logoUrl} alt={club.name} className="h-full w-full object-contain" /> : <Building2 size={18} className="text-slate-500" />}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-black text-slate-950">{club.name}</span>
                          <span className="block truncate text-xs font-semibold text-slate-500">{club.shortName || club.slug}</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{clubTypeLabels[club.type]}</td>
                    <td className="px-4 py-3 text-slate-600">{club.city ? `${club.city}${club.state ? `/${club.state}` : ""}` : "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="grid size-8 place-items-center overflow-hidden rounded border border-slate-200 bg-slate-50">
                          {club.shirtImageUrl ? <img src={club.shirtImageUrl} alt={club.shirtName ?? club.name} className="h-full w-full object-contain" /> : <Shirt size={16} style={{ color: parseTeamKit(club.shirtColor, "#94a3b8").primary }} />}
                        </span>
                        <span className="max-w-28 truncate text-xs font-black text-slate-600">{club.shirtName || "Padrão"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-black text-slate-950">{club.teams?.length ?? 0}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-black ${club.status === "ACTIVE" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-500"}`}>{club.status === "ACTIVE" ? "Ativo" : "Inativo"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button type="button" className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-700 hover:bg-slate-50" onClick={() => editClub(club)}>Editar</button>
                        <button
                          type="button"
                          className={`rounded-lg border px-3 py-1.5 text-xs font-black ${club.status === "ACTIVE" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}
                          onClick={() => void statusClub.mutateAsync({ id: club.id, status: club.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" })}
                        >
                          {club.status === "ACTIVE" ? "Inativar" : "Ativar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!clubsQuery.isLoading && filteredClubs.length === 0 ? <div className="p-4"><EmptyState text="Nenhum clube encontrado." /></div> : null}
          </div>
          {clubsQuery.isLoading ? <p className="mt-4 text-sm font-semibold text-slate-500">Carregando clubes...</p> : null}
        </section>

      </div>
      )}
      </section>

      <div className="mt-5">
        <EquipesContent />
      </div>
    </PageShell>
  );
}

function EquipesContent() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const clubsQuery = useQuery({ queryKey: ["clubs"], queryFn: () => apiRequest<Club[]>("/clubs") });
  const teamsQuery = useQuery({ queryKey: ["teams"], queryFn: () => apiRequest<Team[]>("/teams") });
  const firstClubId = clubsQuery.data?.[0]?.id ?? "";
  const [form, setForm] = useState({ clubId: "", name: "", category: "PRINCIPAL" as TeamCategory, gender: "MIXED" as TeamGender, coachName: "", assistantName: "", logoUrl: "", shirtName: "", shirtColor: "", shirtImageUrl: "" });
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [showTeamEditor, setShowTeamEditor] = useState(false);
  const effectiveClubId = form.clubId || firstClubId;
  const saveTeam = useMutation({
    mutationFn: () => apiRequest<Team>(editingTeamId ? `/teams/${editingTeamId}` : "/teams", { method: editingTeamId ? "PATCH" : "POST", body: JSON.stringify({ ...form, clubId: effectiveClubId }) }),
    onSuccess: () => {
      setForm((prev) => ({ ...prev, name: "", coachName: "", assistantName: "" }));
      setEditingTeamId(null);
      setShowTeamEditor(false);
      navigate("/clubes", { replace: true });
      void queryClient.invalidateQueries({ queryKey: ["teams"] });
      void queryClient.invalidateQueries({ queryKey: ["clubs"] });
    }
  });
  const statusTeam = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TeamStatus }) => apiRequest<Team>(`/teams/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["teams"] })
  });

  function editTeam(team: Team) {
    setEditingTeamId(team.id);
    setShowTeamEditor(true);
    setForm({
      clubId: team.clubId,
      name: team.name,
      category: team.category,
      gender: team.gender,
      coachName: team.coachName ?? "",
      assistantName: team.assistantName ?? "",
      logoUrl: team.logoUrl ?? "",
      shirtName: team.shirtName ?? "",
      shirtColor: team.shirtColor ?? "",
      shirtImageUrl: team.shirtImageUrl ?? ""
    });
  }

  const teams = teamsQuery.data ?? [];
  const activeTeams = teams.filter((team) => team.status === "ACTIVE");
  const principalTeams = teams.filter((team) => team.category === "PRINCIPAL");
  const selectedClub = (clubsQuery.data ?? []).find((club) => club.id === effectiveClubId) ?? null;
  const resetTeamForm = () => {
    setEditingTeamId(null);
    setShowTeamEditor(false);
    setForm({ clubId: "", name: "", category: "PRINCIPAL", gender: "MIXED", coachName: "", assistantName: "", logoUrl: "", shirtName: "", shirtColor: "", shirtImageUrl: "" });
    navigate("/clubes", { replace: true });
  };

  function handleTeamShirtFile(file: File | null) {
    if (!file || !file.type.startsWith("image/")) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setForm((prev) => ({ ...prev, shirtImageUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  }

  function handleTeamLogoFile(file: File | null) {
    if (!file || !file.type.startsWith("image/")) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setForm((prev) => ({ ...prev, logoUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  }

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("equipe") === "new") {
      setEditingTeamId(null);
      setForm({ clubId: "", name: "", category: "PRINCIPAL", gender: "MIXED", coachName: "", assistantName: "", logoUrl: "", shirtName: "", shirtColor: "", shirtImageUrl: "" });
      setShowTeamEditor(true);
    }
  }, [location.search]);

  return (
    <section className="mt-5 border-t border-slate-100 pt-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-950">Equipes vinculadas</h2>
          <p className="text-sm font-semibold text-slate-500">Organize categorias, gênero e comissão técnica dentro de cada clube.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-lg bg-white px-3 py-2 text-sm font-black text-slate-700">{teams.length} equipe(s)</span>
          <span className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-700">{activeTeams.length} ativa(s)</span>
          <span className="rounded-lg bg-white px-3 py-2 text-sm font-black text-slate-700">{principalTeams.length} principal</span>
          {!showTeamEditor ? (
            <button type="button" className="rounded-lg bg-red-600 px-4 py-2 text-sm font-black text-white shadow-sm shadow-red-200" onClick={() => { setEditingTeamId(null); setShowTeamEditor(true); navigate("/clubes?view=equipes&editTeam=new"); }}>
              Nova equipe
            </button>
          ) : null}
        </div>
      </div>

      {showTeamEditor ? (
        <section className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold text-slate-950">{editingTeamId ? "Editar equipe" : "Nova equipe"}</h3>
              <p className="text-sm font-semibold text-slate-500">Equipe, categoria, gênero e comissão técnica.</p>
            </div>
            <button type="button" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50" onClick={resetTeamForm}>Voltar para lista</button>
          </div>
          <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); void saveTeam.mutateAsync(); }}>
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)]">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <select className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold" value={effectiveClubId} onChange={(event) => {
                  const nextClub = (clubsQuery.data ?? []).find((club) => club.id === event.target.value);
                  setForm((prev) => ({
                    ...prev,
                    clubId: event.target.value,
                    shirtName: prev.shirtName || nextClub?.shirtName || "",
                    shirtColor: prev.shirtColor || nextClub?.shirtColor || "",
                    shirtImageUrl: prev.shirtImageUrl || nextClub?.shirtImageUrl || ""
                  }));
                }} required>
                  {(clubsQuery.data ?? []).map((club) => <option key={club.id} value={club.id}>{club.name}</option>)}
                </select>
                <input className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold" placeholder="Nome da equipe" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} required />
                <select className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold" value={form.category} onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value as TeamCategory }))}>
                  {Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <select className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold" value={form.gender} onChange={(event) => setForm((prev) => ({ ...prev, gender: event.target.value as TeamGender }))}>
                  {Object.entries(genderLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <input className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold" placeholder="Treinador" value={form.coachName} onChange={(event) => setForm((prev) => ({ ...prev, coachName: event.target.value }))} />
                <input className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold" placeholder="Auxiliar" value={form.assistantName} onChange={(event) => setForm((prev) => ({ ...prev, assistantName: event.target.value }))} />
              </div>
              <section className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="mb-3 flex items-center gap-2">
                  <Shirt size={16} className="text-slate-500" />
                  <div>
                    <h4 className="text-sm font-black text-slate-950">Camiseta da equipe</h4>
                    <p className="text-xs font-semibold text-slate-500">Se vazio, usa a identidade do clube.</p>
                  </div>
                </div>
                <TeamColorCard
                  label={selectedClub?.name ?? "Clube"}
                  name={form.shirtName || form.name || selectedClub?.shirtName || selectedClub?.shortName || selectedClub?.name || "Camisa da equipe"}
                  color={form.shirtColor || selectedClub?.shirtColor || "#94a3b8"}
                  fallback="#94a3b8"
                  imageUrl={form.shirtImageUrl || selectedClub?.shirtImageUrl || null}
                  crestUrl={form.logoUrl || selectedClub?.logoUrl || null}
                  formation={categoryLabels[form.category]}
                />
                <div className="mt-3 grid gap-2">
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Escudo da equipe</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          {form.logoUrl ? "Usando escudo próprio desta equipe." : "Herdando o escudo oficial do clube."}
                        </p>
                      </div>
                      <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                        {form.logoUrl || selectedClub?.logoUrl ? <img src={form.logoUrl || selectedClub?.logoUrl || ""} alt="Escudo da equipe" className="h-full w-full object-contain" /> : <Building2 size={18} className="text-slate-400" />}
                      </span>
                    </div>
                    <input className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold" placeholder="URL do escudo próprio da equipe" value={form.logoUrl} onChange={(event) => setForm((prev) => ({ ...prev, logoUrl: event.target.value }))} />
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">
                        <Upload size={16} />
                        Enviar escudo
                        <input type="file" accept="image/*" className="hidden" onChange={(event) => handleTeamLogoFile(event.target.files?.[0] ?? null)} />
                      </label>
                      <button type="button" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-black text-slate-700 hover:bg-white" onClick={() => setForm((prev) => ({ ...prev, logoUrl: "" }))}>
                        Usar escudo do clube
                      </button>
                    </div>
                  </div>
                  <input className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold" placeholder="Nome da camisa da equipe" value={form.shirtName} onChange={(event) => setForm((prev) => ({ ...prev, shirtName: event.target.value }))} />
                  <ShirtKitControls value={form.shirtColor || selectedClub?.shirtColor || "#94a3b8"} fallback="#94a3b8" onChange={(value) => setForm((prev) => ({ ...prev, shirtColor: value }))} />
                  <input className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold" placeholder="URL da imagem da camisa" value={form.shirtImageUrl} onChange={(event) => setForm((prev) => ({ ...prev, shirtImageUrl: event.target.value }))} />
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">
                    <Upload size={16} />
                    Enviar imagem da camisa
                    <input type="file" accept="image/*" className="hidden" onChange={(event) => handleTeamShirtFile(event.target.files?.[0] ?? null)} />
                  </label>
                </div>
              </section>
            </div>
            <div className="flex justify-end">
            <button className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-black text-white shadow-sm shadow-red-200 disabled:opacity-60" disabled={saveTeam.isPending || !effectiveClubId}>{saveTeam.isPending ? "Salvando..." : editingTeamId ? "Atualizar equipe" : "Salvar equipe"}</button>
            </div>
          </form>
        </section>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.08em] text-slate-500">
              <tr><th className="px-4 py-3">Equipe</th><th>Clube</th><th>Camisa</th><th>Categoria</th><th>Gênero</th><th>Treinador</th><th>Ações</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {teams.map((team) => (
                <tr key={team.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                        {team.logoUrl || team.club?.logoUrl ? <img src={team.logoUrl || team.club?.logoUrl || ""} alt={team.name} className="h-full w-full object-contain" /> : <Building2 size={16} className="text-slate-400" />}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-black text-slate-950">{team.name}</p>
                        <p className="text-xs font-semibold text-slate-500">{team.logoUrl ? "Escudo próprio" : "Escudo do clube"}</p>
                      </div>
                    </div>
                  </td><td>{team.club?.name ?? "-"}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className="grid size-8 place-items-center overflow-hidden rounded border border-slate-200 bg-slate-50">
                        {team.shirtImageUrl || team.club?.shirtImageUrl ? <img src={team.shirtImageUrl || team.club?.shirtImageUrl || ""} alt={team.shirtName ?? team.name} className="h-full w-full object-contain" /> : <Shirt size={16} style={{ color: parseTeamKit(team.shirtColor || team.club?.shirtColor, "#94a3b8").primary }} />}
                      </span>
                      <span className="max-w-28 truncate text-xs font-black text-slate-600">{team.shirtName || team.club?.shirtName || "Padrão"}</span>
                    </div>
                  </td>
                  <td>{categoryLabels[team.category]}</td><td>{genderLabels[team.gender]}</td><td>{team.coachName ?? "-"}</td>
                  <td>
                    <div className="flex gap-2 py-2">
                      <button type="button" className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-black text-slate-700 hover:bg-slate-50" onClick={() => editTeam(team)}>Editar</button>
                      <button type="button" className={`rounded-lg border px-2 py-1 text-xs font-black ${team.status === "ACTIVE" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`} onClick={() => void statusTeam.mutateAsync({ id: team.id, status: team.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" })}>{team.status === "ACTIVE" ? "Inativar" : "Ativar"}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!teamsQuery.isLoading && !(teamsQuery.data ?? []).length ? <div className="p-4"><EmptyState text="Nenhuma equipe cadastrada ainda." /></div> : null}
        </div>
      )}
    </section>
  );
}

export function EquipesPageReal() {
  return (
    <PageShell title="Equipes">
      <EquipesContent />
    </PageShell>
  );
}

export function CompeticoesPageReal() {
  const queryClient = useQueryClient();
  const competitionsQuery = useQuery({ queryKey: ["competitions"], queryFn: () => apiRequest<Competition[]>("/competitions") });
  const teamsQuery = useQuery({ queryKey: ["teams"], queryFn: () => apiRequest<Team[]>("/teams") });
  const [form, setForm] = useState({ name: "", type: "LEAGUE" as CompetitionType, format: "PONTOS_CORRIDOS" as CompetitionFormat });
  const [selectedCompetitionId, setSelectedCompetitionId] = useState("");
  const [participantForm, setParticipantForm] = useState({ teamId: "", groupName: "" });
  const competitions = competitionsQuery.data ?? [];
  const teams = teamsQuery.data ?? [];
  const selectedCompetition = competitions.find((competition) => competition.id === selectedCompetitionId) ?? competitions[0] ?? null;
  useEffect(() => {
    if (!selectedCompetitionId && competitionsQuery.data?.[0]?.id) {
      setSelectedCompetitionId(competitionsQuery.data[0]?.id ?? "");
    }
  }, [competitionsQuery.data, selectedCompetitionId]);
  const saveCompetition = useMutation({
    mutationFn: () => apiRequest<Competition>("/competitions", { method: "POST", body: JSON.stringify(form) }),
    onSuccess: () => {
      setForm({ name: "", type: "LEAGUE", format: "PONTOS_CORRIDOS" });
      void queryClient.invalidateQueries({ queryKey: ["competitions"] });
    }
  });
  const addParticipant = useMutation({
    mutationFn: () => {
      if (!selectedCompetition) {
        throw new Error("Selecione uma competição.");
      }
      return apiRequest(`/competitions/${selectedCompetition.id}/teams`, { method: "POST", body: JSON.stringify(participantForm) });
    },
    onSuccess: () => {
      setParticipantForm({ teamId: "", groupName: "" });
      void queryClient.invalidateQueries({ queryKey: ["competitions"] });
    }
  });

  return (
    <PageShell title="Competições">
      <div className="grid gap-4 xl:grid-cols-[22rem_minmax(0,1fr)_22rem]">
        <form className="rounded-lg border border-slate-200 bg-slate-50 p-4" onSubmit={(event) => { event.preventDefault(); void saveCompetition.mutateAsync(); }}>
          <h3 className="text-sm font-black text-slate-950">Nova competição</h3>
          <div className="mt-3 grid gap-3">
            <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold" placeholder="Nome" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} required />
            <select className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold" value={form.type} onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value as CompetitionType }))}>
              {Object.entries(competitionTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold" value={form.format} onChange={(event) => setForm((prev) => ({ ...prev, format: event.target.value as CompetitionFormat }))}>
              {Object.entries(competitionFormatLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <button className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-black text-white disabled:opacity-60" disabled={saveCompetition.isPending}>{saveCompetition.isPending ? "Salvando..." : "Salvar competição"}</button>
          </div>
        </form>
        <div className="grid gap-3 md:grid-cols-2">
          {competitions.map((competition) => (
            <article key={competition.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">{competitionTypeLabels[competition.type]}</p>
              <h3 className="mt-1 text-base font-black text-slate-950">{competition.name}</h3>
              <p className="mt-1 text-sm font-bold text-slate-500">{competitionFormatLabels[competition.format]}</p>
              <p className="mt-3 text-xs font-black text-slate-600">{competition.teams?.length ?? 0} participante(s) - {competition._count?.games ?? 0} jogo(s)</p>
            </article>
          ))}
          {!competitionsQuery.isLoading && !competitions.length ? <EmptyState text="Nenhuma competição cadastrada ainda." /> : null}
        </div>
        <aside className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-black text-slate-950">Participantes</h3>
          <div className="mt-3 grid gap-3">
            <select className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold" value={selectedCompetition?.id ?? ""} onChange={(event) => setSelectedCompetitionId(event.target.value)}>
              {competitions.map((competition) => <option key={competition.id} value={competition.id}>{competition.name}</option>)}
            </select>
            <select className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold" value={participantForm.teamId} onChange={(event) => setParticipantForm((prev) => ({ ...prev, teamId: event.target.value }))}>
              <option value="">Selecionar equipe</option>
              {teams.map((team) => <option key={team.id} value={team.id}>{team.name} - {team.club?.name ?? "Sem clube"}</option>)}
            </select>
            <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold" placeholder="Grupo" value={participantForm.groupName} onChange={(event) => setParticipantForm((prev) => ({ ...prev, groupName: event.target.value }))} />
            <button className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-black text-white disabled:opacity-60" disabled={!selectedCompetition || !participantForm.teamId || addParticipant.isPending} onClick={() => void addParticipant.mutateAsync()} type="button">
              {addParticipant.isPending ? "Vinculando..." : "Adicionar participante"}
            </button>
          </div>
          <div className="mt-4 grid gap-2">
            {(selectedCompetition?.teams ?? []).map((participant) => (
              <div key={participant.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-black text-slate-950">{participant.team?.name ?? participant.club?.name ?? "Participante"}</p>
                <p className="text-xs font-bold text-slate-500">Grupo {participant.groupName || "-"} - {participant.points} pts</p>
              </div>
            ))}
            {selectedCompetition && !(selectedCompetition.teams?.length ?? 0) ? <EmptyState text="Nenhum participante nesta competição." /> : null}
          </div>
        </aside>
      </div>
    </PageShell>
  );
}

export function ConvocacoesPageReal() {
  const queryClient = useQueryClient();
  const callUpsQuery = useQuery({ queryKey: ["game-callups"], queryFn: () => apiRequest<GameCallUp[]>("/game-callups") });
  const gamesQuery = useQuery({ queryKey: ["sports-games-callups"], queryFn: () => apiRequest<Game[]>("/sports/games") });
  const athletesQuery = useQuery({ queryKey: ["athletes-callups"], queryFn: () => apiRequest<AthleteProfile[]>("/athletes") });
  const externalGames = (gamesQuery.data ?? []).filter((game) => game.type === "EXTERNAL" || game.gameMode !== "INTERNAL_SPLIT");
  const [selectedGameId, setSelectedGameId] = useState("");
  const [selectedAthleteIds, setSelectedAthleteIds] = useState<string[]>([]);
  const effectiveGameId = selectedGameId || externalGames[0]?.id || "";
  const createCallUps = useMutation({
    mutationFn: () => apiRequest<GameCallUp[]>("/game-callups", { method: "POST", body: JSON.stringify({ gameId: effectiveGameId, athleteIds: selectedAthleteIds }) }),
    onSuccess: () => {
      setSelectedAthleteIds([]);
      void queryClient.invalidateQueries({ queryKey: ["game-callups"] });
    }
  });
  const grouped = useMemo(() => {
    return (callUpsQuery.data ?? []).reduce<Record<string, GameCallUp[]>>((map, callUp) => {
      const key = callUp.gameId;
      map[key] = [...(map[key] ?? []), callUp];
      return map;
    }, {});
  }, [callUpsQuery.data]);

  return (
    <PageShell title="Convocações">
      <div className="grid gap-4 xl:grid-cols-[24rem_minmax(0,1fr)]">
        <aside className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-black text-slate-950">Nova convocação</h3>
          <div className="mt-3 grid gap-3">
            <select className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold" value={effectiveGameId} onChange={(event) => setSelectedGameId(event.target.value)}>
              {externalGames.map((game) => <option key={game.id} value={game.id}>{new Date(game.date).toLocaleDateString("pt-BR")} - {game.location}</option>)}
            </select>
            <div className="max-h-[28rem] space-y-2 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-2">
              {(athletesQuery.data ?? []).filter((athlete) => athlete.canPlay).map((athlete) => {
                const checked = selectedAthleteIds.includes(athlete.id);
                return (
                  <label key={athlete.id} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold ${checked ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-700"}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => setSelectedAthleteIds((current) => checked ? current.filter((id) => id !== athlete.id) : [...current, athlete.id])}
                    />
                    <span className="min-w-0 truncate">{athlete.name}</span>
                  </label>
                );
              })}
            </div>
            <button className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-black text-white disabled:opacity-60" disabled={!effectiveGameId || selectedAthleteIds.length === 0 || createCallUps.isPending} onClick={() => void createCallUps.mutateAsync()} type="button">
              {createCallUps.isPending ? "Convocando..." : `Convocar ${selectedAthleteIds.length} atleta(s)`}
            </button>
          </div>
        </aside>
        <div className="grid gap-3">
          {Object.entries(grouped).map(([gameId, callUps]) => (
            <article key={gameId} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Jogo</p>
                  <h3 className="text-base font-black text-slate-950">{callUps[0]?.game?.location ?? gameId}</h3>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700"><CalendarDays size={13} /> {callUps.length} convocado(s)</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {callUps.map((callUp) => <span key={callUp.id} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-700">{callUp.athlete?.name ?? callUp.athleteId} - {callUp.status}</span>)}
              </div>
            </article>
          ))}
          {!callUpsQuery.isLoading && Object.keys(grouped).length === 0 ? <EmptyState text="Nenhuma convocação registrada ainda." /> : null}
        </div>
      </div>
    </PageShell>
  );
}
