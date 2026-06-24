import { useEffect, useMemo, useState, type ChangeEvent, type ComponentType, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Archive,
  Award,
  BadgeCheck,
  BookOpenText,
  Building2,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Download,
  FileText,
  Filter,
  HeartHandshake,
  Image,
  Landmark,
  MapPin,
  Medal,
  Menu,
  Search,
  Shirt,
  Star,
  Trophy,
  Upload,
  UserRound,
  Users,
  Wrench
} from "lucide-react";
import { apiRequest } from "../services/api";
import { ContentCard, GalleryGrid, PageTemplate, StatsGrid, EnterpriseStatCard } from "../components/ui/EnterpriseUI";
import { useTenantTheme } from "../context/TenantThemeContext";
import type { ArchiveItem, ArchiveItemPayload, ArchiveItemType } from "../types/domain";

type IconType = ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
type ArchiveKind =
  | "dashboard"
  | "games"
  | "athletes"
  | "directors"
  | "titles"
  | "reports"
  | "timeline"
  | "shirts"
  | "gallery"
  | "documents"
  | "awards"
  | "assets"
  | "hall";

type ArchiveReport = {
  yearClosures?: Array<{ year: number; sports?: { games?: number; finishedGames?: number; goals?: number }; finance?: { balanceCents?: number } }>;
  scoringByYear?: Array<{ year: number; topScorers?: Array<{ athleteId?: string; name: string; goals?: number; assists?: number; games?: number }> }>;
  gameResults?: Array<{ year: number; games?: Array<{ id: string; date: string; location?: string; championship?: string; redTeamName?: string; whiteTeamName?: string; redScore?: number; whiteScore?: number }> }>;
  presidents?: Array<{ id: string; name: string; startedYear: number; endedYear?: number; photoUrl?: string; achievements?: string; note?: string }>;
  boardTerms?: Array<{ id: string; startedYear: number; endedYear?: number; associate?: { name: string; athlete?: { photoUrl?: string } }; boardRole?: { name: string; description?: string } }>;
  uniformHistory?: Array<{ id: string; side: string; seasonLabel: string; seasonYear?: number; name: string; imageUrl?: string; color?: string }>;
};

type ArchiveStat = {
  label: string;
  value: string;
  hint: string;
  icon: IconType;
  tone: string;
  path?: string;
};

type ArchiveConfig = {
  title: string;
  subtitle: string;
  icon: IconType;
  action: string;
  actionIcon: IconType;
  actionPath: string;
  search: string;
};

type ArchiveCard = {
  id?: string;
  title: string;
  subtitle: string;
  description: string;
  badge: string;
  image: string;
  metaA: string;
  metaB: string;
  year?: string;
  category?: string;
  season?: string;
  type?: string;
  searchable?: string;
  detailPath?: string;
  editPath?: string;
  actionPath?: string;
};

type ArchiveFilters = {
  search: string;
  year: string;
  category: string;
  season: string;
  type: string;
};

type MemorialCategory = {
  id: string;
  tenantId: string;
  slug: string;
  name: string;
  description: string | null;
  archiveType: ArchiveItemType;
  icon: string;
  enabled: boolean;
  showInDashboard: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

const defaultArchiveFilters: ArchiveFilters = {
  search: "",
  year: "",
  category: "",
  season: "",
  type: ""
};

const archiveNav: Array<{ label: string; path: string; icon: IconType; kind: ArchiveKind }> = [
  { label: "Painel do acervo", path: "/memorial", icon: Building2, kind: "dashboard" },
  { label: "Jogos historicos", path: "/memorial/jogos", icon: BadgeCheck, kind: "games" },
  { label: "Atletas historicos", path: "/memorial/atletas", icon: UserRound, kind: "athletes" },
  { label: "Presidentes e diretorias", path: "/memorial/diretorias", icon: Landmark, kind: "directors" },
  { label: "Titulos", path: "/memorial/titulos", icon: Trophy, kind: "titles" },
  { label: "Acervo de sumulas", path: "/memorial/sumulas", icon: ClipboardList, kind: "reports" },
  { label: "Linha do tempo", path: "/memorial/linha-do-tempo", icon: CalendarDays, kind: "timeline" },
  { label: "Camisas historicas", path: "/memorial/uniformes", icon: Shirt, kind: "shirts" },
  { label: "Galeria", path: "/galeria", icon: Image, kind: "gallery" },
  { label: "Documentos historicos", path: "/memorial/documentos", icon: FileText, kind: "documents" },
  { label: "Trofeus e premiacoes", path: "/memorial/trofeus", icon: Medal, kind: "awards" },
  { label: "Patrimonio do clube", path: "/memorial/patrimonio", icon: Building2, kind: "assets" },
  { label: "Hall da fama", path: "/memorial/hall-da-fama", icon: Star, kind: "hall" }
];

const configs: Record<ArchiveKind, ArchiveConfig> = {
  dashboard: { title: "Acervo do Clube", subtitle: "A memoria que construiu nossa historia.", icon: Building2, action: "Novo registro", actionIcon: Upload, actionPath: "/memorial/linha-do-tempo/novo", search: "Buscar no acervo..." },
  games: { title: "Jogos historicos", subtitle: "Reviva os momentos que marcaram nossa historia.", icon: BadgeCheck, action: "Novo jogo historico", actionIcon: Upload, actionPath: "/memorial/jogos/novo", search: "Buscar jogos historicos..." },
  athletes: { title: "Atletas historicos", subtitle: "Os craques que fizeram parte da nossa historia.", icon: UserRound, action: "Novo atleta historico", actionIcon: Upload, actionPath: "/memorial/atletas/novo", search: "Buscar atleta..." },
  directors: { title: "Presidentes e Diretorias", subtitle: "A lideranca que fez nossa historia acontecer.", icon: Landmark, action: "Novo mandato", actionIcon: Upload, actionPath: "/diretoria/mandatos/novo", search: "Buscar gestao..." },
  titles: { title: "Titulos", subtitle: "Nossas conquistas que fazem parte da nossa historia.", icon: Trophy, action: "Novo titulo", actionIcon: Upload, actionPath: "/memorial/titulos/novo", search: "Buscar titulo..." },
  reports: { title: "Acervo de Sumulas", subtitle: "Consulte, visualize e baixe as sumulas dos jogos do clube.", icon: ClipboardList, action: "Subir sumula antiga", actionIcon: Upload, actionPath: "/memorial/sumulas/novo", search: "Buscar jogo, adversario..." },
  timeline: { title: "Linha do Tempo", subtitle: "Toda a nossa historia, ano apos ano.", icon: CalendarDays, action: "Novo evento", actionIcon: Upload, actionPath: "/memorial/linha-do-tempo/novo", search: "Buscar evento..." },
  shirts: { title: "Camisas Historicas", subtitle: "A evolucao do nosso manto ao longo da historia do clube.", icon: Shirt, action: "Nova camisa historica", actionIcon: Upload, actionPath: "/memorial/uniformes/novo", search: "Buscar camisa, ano, fornecedor..." },
  gallery: { title: "Galeria", subtitle: "Nosso passado registrado em imagens.", icon: Image, action: "Enviar arquivo", actionIcon: Upload, actionPath: "/galeria/novo", search: "Buscar fotos, albuns, eventos..." },
  documents: { title: "Documentos Historicos", subtitle: "Preserve atas, estatutos, contratos e arquivos oficiais do clube.", icon: FileText, action: "Novo documento", actionIcon: Upload, actionPath: "/memorial/documentos/novo", search: "Buscar documento..." },
  awards: { title: "Trofeus e Premiacoes", subtitle: "Nossas conquistas que fazem parte da historia do clube.", icon: Medal, action: "Novo registro", actionIcon: Upload, actionPath: "/memorial/trofeus/novo", search: "Buscar trofeu, premiacao..." },
  assets: { title: "Patrimonio do Clube", subtitle: "Acompanhe bens, espacos e estruturas que fazem parte da historia.", icon: Building2, action: "Novo patrimonio", actionIcon: Upload, actionPath: "/memorial/patrimonio/novo", search: "Buscar patrimonio..." },
  hall: { title: "Hall da Fama", subtitle: "Homenageamos aqueles que fizeram e fazem parte da nossa historia.", icon: Star, action: "Indicar integrante", actionIcon: Upload, actionPath: "/memorial/hall-da-fama/novo", search: "Buscar no hall da fama..." }
};

const archiveTypeByKind: Record<ArchiveKind, ArchiveItemType> = {
  dashboard: "DASHBOARD",
  games: "GAME",
  athletes: "ATHLETE",
  directors: "DIRECTOR",
  titles: "TITLE",
  reports: "MATCH_REPORT",
  timeline: "TIMELINE",
  shirts: "SHIRT",
  gallery: "GALLERY",
  documents: "DOCUMENT",
  awards: "AWARD",
  assets: "ASSET",
  hall: "HALL_OF_FAME"
};

const archivePathByType: Partial<Record<ArchiveItemType, string>> = {
  GAME: "/memorial/jogos",
  ATHLETE: "/memorial/atletas",
  TITLE: "/memorial/titulos",
  MATCH_REPORT: "/memorial/sumulas",
  TIMELINE: "/memorial/linha-do-tempo",
  SHIRT: "/memorial/uniformes",
  GALLERY: "/galeria",
  DOCUMENT: "/memorial/documentos",
  AWARD: "/memorial/trofeus",
  ASSET: "/memorial/patrimonio",
  HALL_OF_FAME: "/memorial/hall-da-fama"
};

const archivePathByKind: Partial<Record<ArchiveKind, string>> = {
  games: "/memorial/jogos",
  athletes: "/memorial/atletas",
  titles: "/memorial/titulos",
  reports: "/memorial/sumulas",
  timeline: "/memorial/linha-do-tempo",
  shirts: "/memorial/uniformes",
  documents: "/memorial/documentos",
  awards: "/memorial/trofeus",
  assets: "/memorial/patrimonio",
  hall: "/memorial/hall-da-fama",
  gallery: "/galeria"
};

const publicArchiveSlugByKind: Partial<Record<ArchiveKind, string>> = {
  dashboard: "",
  games: "jogos",
  athletes: "atletas",
  directors: "diretorias",
  titles: "titulos",
  reports: "sumulas",
  timeline: "linha-do-tempo",
  shirts: "uniformes",
  gallery: "galeria",
  documents: "documentos",
  awards: "trofeus",
  assets: "patrimonio",
  hall: "hall-da-fama"
};

const publicArchiveKindBySlug: Record<string, ArchiveKind> = Object.fromEntries(
  Object.entries(publicArchiveSlugByKind)
    .filter(([, slug]) => Boolean(slug))
    .map(([kind, slug]) => [slug, kind as ArchiveKind])
);

function publicArchivePath(kind: ArchiveKind, id?: string) {
  const slug = publicArchiveSlugByKind[kind];
  const base = slug ? `/acervo/${slug}` : "/acervo";
  return id ? `${base}/${id}` : base;
}

const visualImages = [
  "/assets/hero.png",
  "/mockups/retro-vertical-shirt.png",
  "/mockups/retro-vertical-configurator.png",
  "/brand/gestasports-logo-transparent.png",
  "/brand/gestasports-full-transparent.png"
];

const people = ["Joao Paulo", "Rafael Silva", "Bruno Costa", "Lucas Mendes", "Carlos Eduardo", "Marcos Jose", "Pedro Henrique", "Andre Martins"];
const competitions = ["Campeonato Municipal", "Copa Ribeirao", "Supercopa Regional", "Copa Verao", "Torneio Inicio"];
const years = [2026, 2024, 2023, 2022, 2021, 2019, 2018, 2017, 2014, 2012, 2010, 2009];

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function getArchiveNumbers(report?: ArchiveReport) {
  const yearClosures = report?.yearClosures ?? [];
  const scoring = report?.scoringByYear ?? [];
  const games = report?.gameResults ?? [];
  const presidents = report?.presidents ?? [];
  const board = report?.boardTerms ?? [];
  const uniforms = report?.uniformHistory ?? [];
  const totalGames = yearClosures.reduce((sum, row) => sum + (row.sports?.games ?? 0), 0) || games.reduce((sum, row) => sum + (row.games?.length ?? 0), 0) || 642;
  const totalGoals = yearClosures.reduce((sum, row) => sum + (row.sports?.goals ?? 0), 0) || scoring.reduce((sum, row) => sum + (row.topScorers ?? []).reduce((acc, player) => acc + (player.goals ?? 0), 0), 0) || 1392;
  const totalAthletes = new Set(scoring.flatMap((row) => (row.topScorers ?? []).map((player) => player.athleteId ?? player.name))).size || 278;
  const firstYear = Math.min(...yearClosures.map((row) => row.year), ...games.map((row) => row.year), 2009);

  return {
    totalGames,
    totalGoals,
    totalAthletes,
    presidents: presidents.length || 7,
    board: board.length || 7,
    uniforms: uniforms.length || 28,
    years: Math.max(new Date().getFullYear() - firstYear + 1, 15),
    firstYear
  };
}

function useArchiveReport() {
  const currentYear = new Date().getFullYear();
  return useQuery({
    queryKey: ["historical-archive", "visual-acervo", currentYear],
    queryFn: () => apiRequest<ArchiveReport>(`/reports/historical-archive?fromYear=1980&toYear=${currentYear}`),
    retry: false
  });
}

function useArchiveItems(kind: ArchiveKind) {
  const type = archiveTypeByKind[kind];
  return useQuery({
    queryKey: ["archive-items", type],
    queryFn: () => apiRequest<ArchiveItem[]>(kind === "dashboard" ? "/archive-items" : `/archive-items?type=${type}`),
    retry: false
  });
}

function useArchiveItem(id: string | undefined) {
  return useQuery({
    queryKey: ["archive-item", id],
    queryFn: () => apiRequest<ArchiveItem>(`/archive-items/${id}`),
    enabled: Boolean(id),
    retry: false
  });
}

function useMemorialCategories(publicOnly = false) {
  return useQuery({
    queryKey: [publicOnly ? "public-memorial-categories" : "memorial-categories"],
    queryFn: () => apiRequest<MemorialCategory[]>(publicOnly ? "/public/memorial-categories" : "/memorial-categories", { skipAuth: publicOnly }),
    retry: false
  });
}

function useArchiveItemsByDynamicCategory(category: MemorialCategory | undefined, enabled = true) {
  return useQuery({
    queryKey: ["archive-items", "dynamic-category", category?.slug, category?.archiveType],
    queryFn: () => apiRequest<ArchiveItem[]>(`/archive-items?type=${category?.archiveType}&category=${encodeURIComponent(category?.name ?? "")}`),
    enabled: enabled && Boolean(category)
  });
}

function usePublicArchiveItemsByDynamicCategory(category: MemorialCategory | undefined, enabled = true) {
  return useQuery({
    queryKey: ["public-archive-items", "dynamic-category", category?.slug, category?.archiveType],
    queryFn: () => apiRequest<ArchiveItem[]>(`/public/archive-items?type=${category?.archiveType}&category=${encodeURIComponent(category?.name ?? "")}`, { skipAuth: true }),
    enabled: enabled && Boolean(category),
    retry: false
  });
}

function usePublicArchiveItems(kind: ArchiveKind) {
  const type = archiveTypeByKind[kind];
  return useQuery({
    queryKey: ["public-archive-items", type],
    queryFn: () => apiRequest<ArchiveItem[]>(kind === "dashboard" ? "/public/archive-items" : `/public/archive-items?type=${type}`, { skipAuth: true }),
    retry: false
  });
}

function usePublicArchiveItem(id: string | undefined) {
  return useQuery({
    queryKey: ["public-archive-item", id],
    queryFn: () => apiRequest<ArchiveItem>(`/public/archive-items/${id}`, { skipAuth: true }),
    enabled: Boolean(id),
    retry: false
  });
}

function archiveItemDetailPath(item: ArchiveItem) {
  const basePath = archivePathByType[item.type] ?? "/memorial";
  return `${basePath}/${item.id}`;
}

function archiveItemEditPath(item: ArchiveItem) {
  const basePath = archivePathByType[item.type] ?? "/memorial";
  return `${basePath}/${item.id}/editar`;
}

function StatGrid({ stats }: { stats: ArchiveStat[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {stats.map((stat) => {
        const Icon = stat.icon;
        const content = (
          <>
            <div className="flex items-center gap-4">
              <span className={`grid size-12 shrink-0 place-items-center rounded-lg ${stat.tone}`}>
                <Icon size={24} />
              </span>
              <div>
                <strong className="block text-2xl font-black leading-tight text-slate-950">{stat.value}</strong>
                <span className="block text-sm font-black text-slate-700">{stat.label}</span>
                <span className="block text-xs font-semibold text-slate-500">{stat.hint}</span>
              </div>
            </div>
          </>
        );
        return stat.path ? (
          <Link key={stat.label} to={stat.path} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-red-300 hover:shadow-md">
            {content}
          </Link>
        ) : (
          <article key={stat.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            {content}
          </article>
        );
      })}
    </div>
  );
}

function ArchiveChrome({ kind, children }: { kind: ArchiveKind; children: ReactNode }) {
  const config = configs[kind];
  const HeaderIcon = config.icon;
  const ActionIcon = config.actionIcon;

  return (
    <section className="fl-archive-page space-y-4">
      <div className="min-w-0 space-y-4">
        <header className="fl-archive-toolbar flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-red-600 shadow-sm">
              <HeaderIcon size={22} />
            </span>
            <div>
              <h2 className="text-base font-black leading-tight text-slate-950">{config.title}</h2>
              <p className="mt-1 text-xs font-semibold text-slate-500">{config.subtitle}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 shadow-sm">
              <CalendarDays size={16} />
              2026
            </button>
            <Link to={config.actionPath} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-black text-white shadow-sm">
              <ActionIcon size={16} />
              {config.action}
            </Link>
          </div>
        </header>
        {children}
      </div>
    </section>
  );
}

function uniqueOptions(values: Array<string | number | null | undefined>) {
  return Array.from(new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function FilterBar({ kind, filters, onChange, cards }: { kind: ArchiveKind; filters: ArchiveFilters; onChange: (filters: ArchiveFilters) => void; cards: ArchiveCard[] }) {
  const config = configs[kind];
  const years = uniqueOptions(cards.map((card) => card.year ?? card.badge));
  const categories = uniqueOptions(cards.map((card) => card.category ?? card.subtitle));
  const seasons = uniqueOptions(cards.map((card) => card.season ?? card.year ?? card.subtitle));
  const types = uniqueOptions(cards.map((card) => card.type ?? card.metaA));
  const selectClass = "mt-1 h-11 w-full rounded-lg border-slate-200 bg-white px-3 text-sm font-black leading-none text-slate-950";
  return (
    <article className="fl-premium-card rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="grid items-end gap-3 lg:grid-cols-[minmax(15rem,1.45fr)_repeat(4,minmax(9rem,1fr))_auto]">
        <label className="block text-[11px] font-black text-slate-500">
          Buscar
          <span className="relative mt-1 block">
            <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input
              className="h-11 w-full rounded-lg border-slate-200 px-3 pr-9 text-sm font-semibold leading-none text-slate-900 placeholder:text-slate-400"
              placeholder={config.search}
              value={filters.search}
              onChange={(event) => onChange({ ...filters, search: event.target.value })}
            />
          </span>
        </label>
        <label className="text-[11px] font-black text-slate-500">
          Ano
          <select className={selectClass} value={filters.year} onChange={(event) => onChange({ ...filters, year: event.target.value })}>
            <option value="">Todos</option>
            {years.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
        </label>
        <label className="text-[11px] font-black text-slate-500">
          Categoria
          <select className={selectClass} value={filters.category} onChange={(event) => onChange({ ...filters, category: event.target.value })}>
            <option value="">Todas</option>
            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </label>
        <label className="text-[11px] font-black text-slate-500">
          Temporada
          <select className={selectClass} value={filters.season} onChange={(event) => onChange({ ...filters, season: event.target.value })}>
            <option value="">Todas</option>
            {seasons.map((season) => <option key={season} value={season}>{season}</option>)}
          </select>
        </label>
        <label className="text-[11px] font-black text-slate-500">
          Tipo
          <select className={selectClass} value={filters.type} onChange={(event) => onChange({ ...filters, type: event.target.value })}>
            <option value="">Todas</option>
            {types.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </label>
        <button type="button" onClick={() => onChange(defaultArchiveFilters)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-black text-slate-800 hover:border-red-200 hover:text-red-700">
          <Filter size={16} />
          Limpar
        </button>
      </div>
    </article>
  );
}

function statsFor(kind: ArchiveKind, report?: ArchiveReport): ArchiveStat[] {
  const numbers = getArchiveNumbers(report);
  const base: Record<ArchiveKind, ArchiveStat[]> = {
    dashboard: [
      { label: "Titulos conquistados", value: "18", hint: "Confira todos", icon: Trophy, tone: "bg-red-50 text-red-600", path: "/memorial/titulos" },
      { label: "Jogos registrados", value: formatNumber(numbers.totalGames), hint: "Ver jogos historicos", icon: CalendarDays, tone: "bg-emerald-50 text-emerald-700", path: "/memorial/jogos" },
      { label: "Atletas registrados", value: formatNumber(numbers.totalAthletes), hint: "Ver atletas historicos", icon: UserRound, tone: "bg-violet-50 text-violet-700", path: "/memorial/atletas" },
      { label: "Sumulas arquivadas", value: "389", hint: "Arquivos oficiais", icon: FileText, tone: "bg-amber-50 text-amber-700", path: "/memorial/sumulas" },
      { label: "Fotos no acervo", value: "1.245", hint: "Ver galeria", icon: Image, tone: "bg-blue-50 text-blue-700", path: "/galeria" }
    ],
    games: [
      { label: "Jogos historicos", value: formatNumber(numbers.totalGames), hint: `Desde ${numbers.firstYear}`, icon: CalendarDays, tone: "bg-red-50 text-red-600" },
      { label: "Vitorias", value: "382", hint: "59,5% do acervo", icon: Trophy, tone: "bg-emerald-50 text-emerald-700" },
      { label: "Gols marcados", value: formatNumber(numbers.totalGoals), hint: "Total historico", icon: BadgeCheck, tone: "bg-amber-50 text-amber-700" },
      { label: "Competicoes", value: "12", hint: "Diferentes", icon: Medal, tone: "bg-blue-50 text-blue-700" },
      { label: "Publico", value: "32.450", hint: "Pessoas impactadas", icon: Users, tone: "bg-violet-50 text-violet-700" }
    ],
    athletes: [
      { label: "Atletas registrados", value: formatNumber(numbers.totalAthletes), hint: `Desde ${numbers.firstYear}`, icon: UserRound, tone: "bg-red-50 text-red-600" },
      { label: "Jogos disputados", value: "4.862", hint: "Total", icon: CalendarDays, tone: "bg-emerald-50 text-emerald-700" },
      { label: "Gols marcados", value: formatNumber(numbers.totalGoals), hint: "Total", icon: BadgeCheck, tone: "bg-amber-50 text-amber-700" },
      { label: "Titulos conquistados", value: "18", hint: "Total", icon: Trophy, tone: "bg-violet-50 text-violet-700" },
      { label: "Idolos", value: "5", hint: "Top historico", icon: Star, tone: "bg-blue-50 text-blue-700" }
    ],
    directors: [
      { label: "Presidentes", value: String(numbers.presidents), hint: `Desde ${numbers.firstYear}`, icon: UserRound, tone: "bg-red-50 text-red-600" },
      { label: "Diretorias", value: String(numbers.board), hint: "Mandatos completos", icon: Users, tone: "bg-amber-50 text-amber-700" },
      { label: "Titulos conquistados", value: "18", hint: "Durante os mandatos", icon: Trophy, tone: "bg-emerald-50 text-emerald-700" },
      { label: "Projetos realizados", value: "32", hint: "Infraestrutura e melhorias", icon: CalendarDays, tone: "bg-blue-50 text-blue-700" },
      { label: "Anos de historia", value: String(numbers.years), hint: "Linha institucional", icon: Landmark, tone: "bg-violet-50 text-violet-700" }
    ],
    titles: [
      { label: "Titulos conquistados", value: "18", hint: `Desde ${numbers.firstYear}`, icon: Trophy, tone: "bg-amber-50 text-amber-700" },
      { label: "Vice-campeonatos", value: "11", hint: `Desde ${numbers.firstYear}`, icon: Medal, tone: "bg-slate-100 text-slate-600" },
      { label: "Jogos em finais", value: "642", hint: `Desde ${numbers.firstYear}`, icon: CalendarDays, tone: "bg-emerald-50 text-emerald-700" },
      { label: "Competicoes", value: "12", hint: "Diferentes", icon: BadgeCheck, tone: "bg-blue-50 text-blue-700" },
      { label: "Titulos invictos", value: "7", hint: "Campanhas perfeitas", icon: Award, tone: "bg-violet-50 text-violet-700" }
    ],
    reports: [
      { label: "Sumulas cadastradas", value: "842", hint: `Desde ${numbers.firstYear}`, icon: FileText, tone: "bg-red-50 text-red-600" },
      { label: "Jogos registrados", value: formatNumber(numbers.totalGames), hint: "Com sumula", icon: CalendarDays, tone: "bg-emerald-50 text-emerald-700" },
      { label: "Competicoes", value: "12", hint: "Diferentes", icon: Trophy, tone: "bg-blue-50 text-blue-700" },
      { label: "Digitalizadas", value: "100%", hint: "Disponiveis", icon: ClipboardList, tone: "bg-amber-50 text-amber-700" },
      { label: "Armazenamento", value: "2.41 GB", hint: "Utilizado", icon: Download, tone: "bg-violet-50 text-violet-700" }
    ],
    timeline: [
      { label: "Eventos registrados", value: "187", hint: `Desde ${numbers.firstYear}`, icon: CalendarDays, tone: "bg-red-50 text-red-600" },
      { label: "Titulos conquistados", value: "18", hint: "18 conquistas", icon: Trophy, tone: "bg-blue-50 text-blue-700" },
      { label: "Sedes e estruturas", value: "3", hint: "Evolucao do clube", icon: Building2, tone: "bg-emerald-50 text-emerald-700" },
      { label: "Atletas historicos", value: formatNumber(numbers.totalAthletes), hint: "Desde a fundacao", icon: Users, tone: "bg-amber-50 text-amber-700" },
      { label: "Documentos", value: "1.248", hint: "Relacionados", icon: FileText, tone: "bg-violet-50 text-violet-700" }
    ],
    shirts: [
      { label: "Camisas cadastradas", value: String(numbers.uniforms), hint: `Desde ${numbers.firstYear}`, icon: Shirt, tone: "bg-red-50 text-red-600" },
      { label: "Temporadas", value: "15", hint: `${numbers.firstYear} - 2024`, icon: CalendarDays, tone: "bg-emerald-50 text-emerald-700" },
      { label: "Fornecedores", value: "7", hint: "Parceiros do clube", icon: Building2, tone: "bg-amber-50 text-amber-700" },
      { label: "Titulos com camisas", value: "18", hint: "Conquistas vestidas", icon: Trophy, tone: "bg-violet-50 text-violet-700" },
      { label: "Documentos", value: "34", hint: "Registros anexos", icon: FileText, tone: "bg-blue-50 text-blue-700" }
    ],
    gallery: [
      { label: "Fotos", value: "8.642", hint: `Desde ${numbers.firstYear}`, icon: Image, tone: "bg-violet-50 text-violet-700" },
      { label: "Videos", value: "368", hint: `Desde ${numbers.firstYear}`, icon: ClipboardList, tone: "bg-red-50 text-red-600" },
      { label: "Albuns", value: "156", hint: "Organizados", icon: BookOpenText, tone: "bg-blue-50 text-blue-700" },
      { label: "Armazenamento", value: "2.15 GB", hint: "Utilizado", icon: Download, tone: "bg-emerald-50 text-emerald-700" },
      { label: "Colaboradores", value: "12", hint: "Enviaram conteudo", icon: Users, tone: "bg-amber-50 text-amber-700" }
    ],
    documents: [
      { label: "Documentos", value: "1.248", hint: "Arquivados", icon: FileText, tone: "bg-red-50 text-red-600" },
      { label: "Categorias", value: "18", hint: "Cadastradas", icon: BookOpenText, tone: "bg-blue-50 text-blue-700" },
      { label: "Anos de acervo", value: String(numbers.years), hint: `Desde ${numbers.firstYear}`, icon: CalendarDays, tone: "bg-emerald-50 text-emerald-700" },
      { label: "Em nuvem", value: "12.4 GB", hint: "Armazenados", icon: Download, tone: "bg-violet-50 text-violet-700" },
      { label: "Digitalizados", value: "98%", hint: "Do acervo", icon: Award, tone: "bg-amber-50 text-amber-700" }
    ],
    awards: [
      { label: "Trofeus", value: "87", hint: `Desde ${numbers.firstYear}`, icon: Trophy, tone: "bg-red-50 text-red-600" },
      { label: "Medalhas", value: "156", hint: "Conquistadas", icon: Medal, tone: "bg-amber-50 text-amber-700" },
      { label: "Premiacoes individuais", value: "28", hint: "Atletas e comissao", icon: Award, tone: "bg-emerald-50 text-emerald-700" },
      { label: "Ano mais vitorioso", value: "2021", hint: "Historico", icon: Star, tone: "bg-violet-50 text-violet-700" },
      { label: "Competicoes", value: "6", hint: "Com titulos", icon: Trophy, tone: "bg-blue-50 text-blue-700" }
    ],
    assets: [
      { label: "Bens cadastrados", value: "23", hint: "Imoveis e estruturas", icon: Building2, tone: "bg-red-50 text-red-600" },
      { label: "Imoveis", value: "7", hint: "Terrenos e construcoes", icon: Landmark, tone: "bg-blue-50 text-blue-700" },
      { label: "Estruturas", value: "11", hint: "Campos e arenas", icon: CalendarDays, tone: "bg-emerald-50 text-emerald-700" },
      { label: "Equipamentos", value: "32", hint: "Moveis e materiais", icon: ClipboardList, tone: "bg-violet-50 text-violet-700" },
      { label: "Manutencao", value: "5", hint: "Aguardando intervencao", icon: Wrench, tone: "bg-amber-50 text-amber-700" }
    ],
    hall: [
      { label: "Membros no Hall", value: "56", hint: `Desde ${numbers.firstYear}`, icon: Star, tone: "bg-amber-50 text-amber-700" },
      { label: "Atletas", value: "18", hint: "Idolos em campo", icon: UserRound, tone: "bg-violet-50 text-violet-700" },
      { label: "Dirigentes", value: "12", hint: "Lideranca e gestao", icon: Landmark, tone: "bg-blue-50 text-blue-700" },
      { label: "Comissoes tecnicas", value: "8", hint: "Estrategia e dedicacao", icon: Trophy, tone: "bg-emerald-50 text-emerald-700" },
      { label: "Colaboradores", value: "18", hint: "Apoio e servicos", icon: HeartHandshake, tone: "bg-orange-50 text-orange-700" }
    ]
  };

  return base[kind];
}

function DashboardContent({ report, archiveItems }: { report?: ArchiveReport; archiveItems: ArchiveItem[] }) {
  const numbers = getArchiveNumbers(report);
  const featuredItem = archiveItems[0];
  const sectionShortcuts = [
    { label: "Titulos", path: "/memorial/titulos", createPath: "/memorial/titulos/novo", count: "18", image: visualImages[0] },
    { label: "Jogos historicos", path: "/memorial/jogos", createPath: "/memorial/jogos/novo", count: formatNumber(numbers.totalGames), image: visualImages[1] },
    { label: "Atletas", path: "/memorial/atletas", createPath: "/memorial/atletas/novo", count: formatNumber(numbers.totalAthletes), image: visualImages[2] },
    { label: "Sumulas", path: "/memorial/sumulas", createPath: "/memorial/sumulas/novo", count: "389", image: visualImages[3] },
    { label: "Uniformes", path: "/memorial/uniformes", createPath: "/memorial/uniformes/novo", count: String(numbers.uniforms), image: visualImages[1] },
    { label: "Galeria", path: "/galeria", createPath: "/galeria/novo", count: "1.245", image: visualImages[4] }
  ];
  const timeline = [
    ["2009", "Fundacao do GestaSports FC", "O inicio de uma grande historia", "/memorial/linha-do-tempo"],
    ["2012", "Primeiro titulo municipal", "Conquista marcante para o clube", "/memorial/titulos"],
    ["2015", "Construcao da sede propria", "Um sonho que se tornou realidade", "/memorial/patrimonio"],
    ["2018", "Bicampeonato municipal", "Uma geracao inesquecivel", "/memorial/jogos"],
    ["2024", "Milesimo jogo disputado", "Marca historica alcancada", "/memorial/linha-do-tempo"]
  ];

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(24rem,0.9fr)]">
        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-black text-slate-950">Destaque do acervo</h2>
            <Link to={featuredItem ? archiveItemEditPath(featuredItem) : "/memorial/jogos/novo"} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-black text-red-700 hover:bg-red-50">
              {featuredItem ? "Editar destaque" : "Cadastrar destaque"}
            </Link>
          </div>
          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
            <Link to={featuredItem ? archiveItemDetailPath(featuredItem) : "/memorial/jogos/novo"} className="block">
              <SafeArchiveImage src={featuredItem?.coverImageUrl ?? "/assets/hero.png"} alt={featuredItem?.title ?? "Final historica do GestaSports FC"} className="h-72 w-full object-cover" />
            </Link>
            <div className="p-4">
              <span className="text-xs font-black uppercase text-red-600">{featuredItem?.periodLabel ?? "12/08/2018"}</span>
              <h3 className="mt-2 text-2xl font-black text-slate-950">{featuredItem?.title ?? "Final do Campeonato Municipal 2018"}</h3>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{featuredItem?.description ?? "Uma final emocionante que garantiu o titulo inedito para o GestaSports FC."}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <MiniInfo icon={Users} label="Publico" value="350 pessoas" />
                <MiniInfo icon={Star} label="Melhor jogador" value="Joao Silva" />
                <MiniInfo icon={UserRound} label="Tecnico" value="Carlos Souza" />
              </div>
            </div>
          </div>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-black text-slate-950">Linha do tempo</h2>
            <Link to="/memorial/linha-do-tempo" className="text-sm font-black text-red-600">Ver completa</Link>
          </div>
          <div className="mt-5 space-y-5">
            {timeline.map(([year, title, text, path], index) => (
              <Link key={year} to={path} className="grid grid-cols-[4rem_1.5rem_minmax(0,1fr)] gap-3 rounded-lg p-1 hover:bg-slate-50">
                <strong className="text-red-600">{year}</strong>
                <span className={`mt-1 size-3 rounded-full ${index % 2 ? "bg-amber-400" : "bg-red-600"}`} />
                <div>
                  <p className="font-black text-slate-950">{title}</p>
                  <p className="text-sm font-semibold text-slate-500">{text}</p>
                </div>
              </Link>
            ))}
          </div>
        </article>
      </div>
      <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-black text-slate-950">Areas do acervo</h2>
          <Link to="/memorial/linha-do-tempo/novo" className="text-sm font-black text-red-600">Novo registro geral</Link>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {sectionShortcuts.map((section) => (
            <article key={section.label} className="overflow-hidden rounded-lg border border-slate-200 bg-white hover:border-red-200">
              <Link to={section.path} className="block">
                <SafeArchiveImage src={section.image} alt={section.label} className="h-32 w-full object-cover" />
              </Link>
              <div className="p-3">
                <p className="font-black text-slate-950">{section.label}</p>
                <p className="text-xs font-semibold text-slate-500">{section.count} registros</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Link to={section.path} className="rounded-lg border border-slate-200 px-2 py-2 text-center text-xs font-black text-slate-700 hover:border-red-200">Ver</Link>
                  <Link to={section.createPath} className="rounded-lg bg-red-600 px-2 py-2 text-center text-xs font-black text-white">Criar</Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </article>
      <p className="sr-only">{numbers.totalGames}</p>
      {archiveItems.length > 0 ? (
        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">Lancamentos manuais recentes</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {archiveItems.slice(0, 6).map((item) => (
              <article key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-black uppercase text-red-600">{item.category ?? item.type}</p>
                <h3 className="mt-1 font-black text-slate-950">{item.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm font-semibold text-slate-500">{item.description ?? item.subtitle ?? "Registro manual do acervo."}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link to={archiveItemDetailPath(item)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:border-red-200">Abrir</Link>
                  <Link to={archiveItemEditPath(item)} className="rounded-lg bg-red-600 px-3 py-2 text-xs font-black text-white">Editar</Link>
                </div>
              </article>
            ))}
          </div>
        </article>
      ) : null}
    </>
  );
}

function MiniInfo({ icon: Icon, label, value }: { icon: IconType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <Icon size={18} className="text-red-600" />
      <div>
        <span className="block text-xs font-semibold text-slate-500">{label}</span>
        <strong className="block text-sm font-black text-slate-950">{value}</strong>
      </div>
    </div>
  );
}

function matchesArchiveFilters(card: ArchiveCard, filters: ArchiveFilters) {
  const query = filters.search.trim().toLowerCase();
  const searchable = (card.searchable ?? `${card.title} ${card.subtitle} ${card.description} ${card.metaA} ${card.metaB}`).toLowerCase();
  return (
    (!query || searchable.includes(query)) &&
    (!filters.year || card.year === filters.year || card.badge === filters.year) &&
    (!filters.category || card.category === filters.category || card.subtitle === filters.category) &&
    (!filters.season || card.season === filters.season || card.year === filters.season || card.subtitle === filters.season) &&
    (!filters.type || card.type === filters.type || card.metaA === filters.type)
  );
}

function CardGridPage({ kind, report, archiveItems, filters }: { kind: ArchiveKind; report?: ArchiveReport; archiveItems: ArchiveItem[]; filters: ArchiveFilters }) {
  if (kind === "dashboard") return <DashboardContent report={report} archiveItems={archiveItems} />;
  if (kind === "timeline") return <TimelinePage archiveItems={archiveItems} />;
  if (kind === "directors") return <DirectorsPage report={report} />;
  if (kind === "reports") return <ReportsPage report={report} archiveItems={archiveItems} />;
  if (kind === "assets") return <AssetsPage archiveItems={archiveItems} />;
  if (kind === "documents") return <DocumentsPage archiveItems={archiveItems} />;

  const items = [...cardsFromArchiveItems(kind, archiveItems), ...buildCards(kind, report)];
  const visibleItems = items.filter((item) => matchesArchiveFilters(item, filters));
  const highlighted = visibleItems[0] ?? items[0];
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <article className="fl-premium-card rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-black text-slate-950">{sectionTitle(kind)} ({visibleItems.length})</h2>
          <select className="w-44 rounded-lg border-slate-200 bg-white text-sm font-black">
            <option>Mais recentes</option>
          </select>
        </div>
        {highlighted ? (
          <div className="mt-4 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-[9rem_minmax(0,1fr)_auto] md:items-center">
            <img src={highlighted.image} alt={highlighted.title} className="h-28 w-full rounded-lg object-cover md:h-24" />
            <div className="min-w-0">
              <span className="rounded-lg bg-red-600 px-2 py-1 text-xs font-black text-white">{highlighted.badge}</span>
              <h3 className="mt-2 truncate text-lg font-black text-slate-950">{highlighted.title}</h3>
              <p className="mt-1 line-clamp-2 text-sm font-semibold text-slate-600">{highlighted.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center text-xs font-black text-slate-700 md:w-44">
              <span className="rounded-lg border border-slate-200 bg-white px-3 py-2">{highlighted.metaA}</span>
              <span className="rounded-lg border border-slate-200 bg-white px-3 py-2">{highlighted.metaB}</span>
            </div>
          </div>
        ) : null}
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
          {visibleItems.map((item) => (
            <Link key={item.id ?? item.title} to={item.detailPath ?? item.actionPath ?? configs[kind].actionPath} className="fl-archive-tile group overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:border-red-300 hover:shadow-md">
              <article>
                <div className="relative h-44 bg-slate-100">
                  <img src={item.image} alt={item.title} className="h-44 w-full object-cover" />
                  <span className="absolute left-3 top-3 rounded-lg bg-red-600 px-2 py-1 text-xs font-black text-white">{item.badge}</span>
                </div>
                <div className="p-3">
                  <h3 className="font-black text-slate-950 group-hover:text-red-700">{item.title}</h3>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{item.subtitle}</p>
                  <p className="mt-2 text-sm font-semibold text-slate-600">{item.description}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-xs font-black text-slate-500">
                    <span>{item.metaA}</span>
                    <span>{item.metaB}</span>
                    <span className="ml-auto inline-flex min-h-8 items-center rounded-lg border border-red-200 px-3 text-xs font-black text-red-700 group-hover:bg-red-50">
                      {item.detailPath ? "Abrir pagina" : "Criar item"}
                    </span>
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>
        {!visibleItems.length ? (
          <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
            <p className="font-black text-slate-700">Nenhum item encontrado com esses filtros.</p>
            <Link to={configs[kind].actionPath} className="mt-3 inline-flex min-h-10 items-center rounded-lg bg-red-600 px-4 text-sm font-black text-white">Criar novo item</Link>
          </div>
        ) : null}
      </article>
      <RightPanel kind={kind} items={visibleItems.length ? visibleItems : items} />
    </div>
  );
}

function sectionTitle(kind: ArchiveKind) {
  const labels: Partial<Record<ArchiveKind, string>> = {
    games: "Jogos em destaque",
    athletes: "Todos os atletas",
    titles: "Galeria de titulos",
    shirts: "Todas as camisas",
    gallery: "Albuns recentes",
    awards: "Trofeus conquistados",
    hall: "Membros do Hall da Fama"
  };
  return labels[kind] ?? configs[kind].title;
}

function cardsFromArchiveItems(kind: ArchiveKind, items: ArchiveItem[]): ArchiveCard[] {
  return items.map((item, index) => {
    const basePath = archivePathByKind[kind] ?? archivePathByType[item.type];
    return {
      id: item.id,
      title: item.title,
      subtitle: item.subtitle ?? item.personRole ?? item.category ?? item.type,
      description: item.description ?? item.periodLabel ?? item.resultLabel ?? "Registro manual do acervo.",
      badge: item.year ? String(item.year) : item.status === "DRAFT" ? "Rascunho" : "Acervo",
      image: item.coverImageUrl || item.attachments.find((attachment) => attachment.type === "IMAGE")?.url || visualImages[index % visualImages.length],
      metaA: item.competition ?? item.location ?? item.category ?? "Manual",
      metaB: item.scoreLabel ?? item.resultLabel ?? `${item.attachments.length} anexos`,
      year: item.year ? String(item.year) : undefined,
      category: item.category ?? item.subtitle ?? item.type,
      season: item.periodLabel ?? (item.year ? String(item.year) : undefined),
      type: item.type,
      searchable: `${item.title} ${item.subtitle ?? ""} ${item.description ?? ""} ${item.category ?? ""} ${item.competition ?? ""} ${item.location ?? ""}`,
      detailPath: basePath ? `${basePath}/${item.id}` : undefined,
      editPath: basePath ? `${basePath}/${item.id}/editar` : undefined
    };
  });
}

function buildCards(kind: ArchiveKind, report?: ArchiveReport): ArchiveCard[] {
  if (kind === "athletes") {
    const scorers = report?.scoringByYear?.flatMap((row) => row.topScorers ?? []) ?? [];
    const names = scorers.length ? scorers.map((item) => item.name) : people;
    return names.slice(0, 10).map((name, index) => ({
      title: name,
      subtitle: index % 3 === 0 ? "Atacante" : index % 3 === 1 ? "Meio-campo" : "Dirigente",
      description: `${2009 + index} - ${2018 + index}`,
      badge: index === 0 ? "Idolo do clube" : "Historico",
      image: visualImages[index % visualImages.length],
      metaA: `${214 - index * 8} jogos`,
      metaB: `${127 - index * 9} gols`,
      year: String(2009 + index),
      category: index % 3 === 0 ? "Atacante" : index % 3 === 1 ? "Meio-campo" : "Dirigente",
      season: `${2009 + index} - ${2018 + index}`,
      type: "Atleta",
      actionPath: configs[kind].actionPath
    }));
  }

  if (kind === "shirts") {
    const uniforms = report?.uniformHistory ?? [];
    const source = uniforms.length ? uniforms.map((uniform, index) => ({ name: uniform.name, year: uniform.seasonYear ?? 2024 - index, image: uniform.imageUrl || visualImages[index % visualImages.length] })) : years.slice(1, 11).map((year, index) => ({ name: "Titular", year, image: visualImages[(index + 1) % visualImages.length] }));
    return source.slice(0, 10).map((item, index) => ({
      title: item.name,
      subtitle: String(item.year),
      description: "Fornecedor: Icone | Patrocinador: Sicoob",
      badge: String(item.year),
      image: item.image,
      metaA: `${18 - (index % 6)} titulos`,
      metaB: `${28 - index} jogos`,
      year: String(item.year),
      category: item.name,
      season: String(item.year),
      type: "Camisa",
      actionPath: configs[kind].actionPath
    }));
  }

  if (kind === "gallery") {
    return ["Titulos e conquistas", "Historias que marcaram", "Arena GestaSports", "Grandes jogos", "Memorias antigas", "Categorias de base", "Idolos do clube", "Treinos e preparacao"].map((title, index) => ({
      title,
      subtitle: `${86 + index * 23} arquivos`,
      description: "Album organizado por temporada e categoria.",
      badge: `${48 + index * 12}`,
      image: visualImages[index % visualImages.length],
      metaA: "Fotos",
      metaB: "Videos",
      year: String(2024 - (index % 6)),
      category: title,
      season: String(2024 - (index % 6)),
      type: "Album",
      actionPath: configs[kind].actionPath
    }));
  }

  if (kind === "hall") {
    return people.slice(0, 10).map((name, index) => ({
      title: name,
      subtitle: index % 2 ? "Dirigente" : "Atleta",
      description: `${2009 + index} - ${2018 + index}`,
      badge: "Hall da fama",
      image: visualImages[index % visualImages.length],
      metaA: `${3 + index} titulos`,
      metaB: index % 2 ? `${2 + index} mandatos` : `${128 + index * 18} jogos`,
      year: String(2009 + index),
      category: index % 2 ? "Dirigente" : "Atleta",
      season: `${2009 + index} - ${2018 + index}`,
      type: "Hall da fama",
      actionPath: configs[kind].actionPath
    }));
  }

  const titleSource = kind === "awards" ? competitions.concat(["Campeonato Municipal 2024", "Copa Cidade"]) : competitions;
  return titleSource.concat(titleSource).slice(0, 10).map((title, index) => ({
    title: `${title} ${2024 - index}`,
    subtitle: kind === "games" ? "Jogo historico" : "Titular",
    description: kind === "games" ? "Final emocionante registrada no acervo do clube." : "Conquista preservada com fotos, documentos e registros.",
    badge: String(2024 - index),
    image: visualImages[index % visualImages.length],
    metaA: kind === "games" ? "3 x 2" : "Campeao",
    metaB: `${12 + index} fotos`,
    year: String(2024 - index),
    category: kind === "games" ? "Jogo historico" : kind === "awards" ? "Premiacao" : "Titulo",
    season: String(2024 - index),
    type: kind === "games" ? "Jogo" : kind === "awards" ? "Trofeu" : "Conquista",
    actionPath: configs[kind].actionPath
  }));
}

function RightPanel({ kind, items }: { kind: ArchiveKind; items: ArchiveCard[] }) {
  const selected = items[0];
  const metrics = [
    { label: kind === "shirts" ? "Jogos" : kind === "gallery" ? "Arquivos" : kind === "hall" ? "Anos" : "Registros", value: selected?.metaB ?? "0" },
    { label: kind === "titles" || kind === "awards" ? "Conquista" : kind === "games" ? "Placar" : "Categoria", value: selected?.metaA ?? "-" },
    { label: "Ano", value: selected?.year ?? selected?.badge ?? "-" },
    { label: "Tipo", value: selected?.type ?? configs[kind].title }
  ];
  const related = items.slice(1, 4);
  return (
    <aside className="fl-archive-side space-y-4">
      <article className="fl-premium-card rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-black text-slate-950">{kind === "hall" ? "Destaque do mes" : kind === "titles" ? "Resumo de titulos" : "Dashboard do item"}</h2>
        {selected ? (
          <div className="mt-4">
            <img src={selected.image} alt={selected.title} className="h-56 w-full rounded-lg object-cover" />
            <h3 className="mt-4 text-xl font-black text-slate-950">{selected.title}</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">{selected.description}</p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-black text-slate-700">{selected.metaA}</span>
              <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-black text-slate-700">{selected.metaB}</span>
            </div>
            <Link to={selected.detailPath ?? selected.actionPath ?? configs[kind].actionPath} className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-red-200 px-4 text-sm font-black text-red-700 hover:bg-red-50">
              Ver detalhes
            </Link>
          </div>
        ) : null}
      </article>
      <article className="fl-premium-card rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-black text-slate-950">Indicadores</h2>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="truncate text-[11px] font-black uppercase text-slate-500">{metric.label}</p>
              <strong className="mt-1 block truncate text-base font-black text-slate-950">{metric.value}</strong>
            </div>
          ))}
        </div>
      </article>
      <article className="fl-premium-card rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-black text-slate-950">Itens relacionados</h2>
          <span className="text-xs font-black text-slate-400">{related.length}</span>
        </div>
        <div className="mt-4 space-y-3">
          {related.length ? related.map((item) => (
            <Link key={item.id ?? item.title} to={item.detailPath ?? item.actionPath ?? configs[kind].actionPath} className="grid grid-cols-[4rem_minmax(0,1fr)] gap-3 rounded-lg border border-slate-200 p-2 hover:border-red-200 hover:bg-red-50">
              <img src={item.image} alt={item.title} className="h-14 w-16 rounded-lg object-cover" />
              <span className="min-w-0">
                <strong className="block truncate text-sm text-slate-950">{item.title}</strong>
                <span className="block truncate text-xs font-semibold text-slate-500">{item.subtitle}</span>
              </span>
            </Link>
          )) : <p className="rounded-lg border border-dashed border-slate-300 p-3 text-sm font-semibold text-slate-500">Sem relações cadastradas.</p>}
        </div>
      </article>
      <article className="fl-premium-card rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-black text-slate-950">Categorias</h2>
        <div className="mt-4 space-y-3">
          {["Jogos", "Titulos", "Atletas", "Documentos", "Galeria"].map((label, index) => (
            <div key={label} className="flex items-center justify-between gap-3 text-sm">
              <span className="font-black text-slate-700">{label}</span>
              <span className="font-black text-slate-500">{18 + index * 7}</span>
            </div>
          ))}
        </div>
      </article>
    </aside>
  );
}

function SafeArchiveImage({ src, alt, className }: { src?: string | null; alt: string; className: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    const initials = alt.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
    return (
      <span className={`${className} grid place-items-center bg-slate-100 text-lg font-black text-slate-500`}>
        {initials || "AC"}
      </span>
    );
  }
  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />;
}

function TimelinePage({ archiveItems }: { archiveItems: ArchiveItem[] }) {
  const rows = archiveItems.length ? archiveItems.map((item) => [
    String(item.year ?? new Date(item.occurredAt ?? item.createdAt).getFullYear()),
    item.title,
    item.description ?? item.subtitle ?? "Marco historico cadastrado manualmente."
  ]) : [
    ["2009", "Fundacao do GestaSports Futebol Clube", "No dia 15 de marco nasce um sonho que comecou pequeno."],
    ["2010", "Primeiro titulo - Campeonato Municipal", "Primeira competicao oficial e primeira conquista."],
    ["2012", "Inauguracao da Sede Social", "Entrega da sede para a comunidade."],
    ["2014", "Campeao da Copa Ribeirao", "Conquista emocionante e memoravel."],
    ["2018", "500o jogo oficial", "Marca celebrada com a torcida."],
    ["2021", "Campeao Municipal - Tricampeonato", "Consolidacao da hegemonia na cidade."],
    ["2024", "Milesimo jogo oficial", "Trajetoria construida por muitas maos."]
  ];
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_25rem]">
      <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-slate-950">Nossa historia em movimento</h2>
        <div className="mt-5 space-y-3">
          {rows.map(([year, title, text], index) => (
            <div key={year} className="grid gap-3 rounded-lg border border-slate-200 p-4 sm:grid-cols-[6rem_3rem_minmax(0,1fr)_9rem] sm:items-center">
              <strong className="text-2xl font-black text-slate-950">{year}</strong>
              <span className={`grid size-11 place-items-center rounded-full text-white ${index % 3 === 0 ? "bg-red-600" : index % 3 === 1 ? "bg-amber-500" : "bg-emerald-600"}`}>
                <Trophy size={18} />
              </span>
              <div>
                <h3 className="font-black text-slate-950">{title}</h3>
                <p className="text-sm font-semibold text-slate-500">{text}</p>
              </div>
              <span className="rounded-lg bg-slate-50 px-3 py-2 text-center text-xs font-black text-slate-600">Historico</span>
            </div>
          ))}
        </div>
      </article>
      <aside className="space-y-4">
        <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <img src="/assets/hero.png" alt="Destaque do momento" className="h-64 w-full object-cover" />
          <div className="p-4">
            <span className="rounded-lg bg-red-600 px-2 py-1 text-xs font-black text-white">Evento recente</span>
            <h2 className="mt-3 text-xl font-black text-slate-950">Inauguracao da Arena Familia</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">Um novo capitulo na nossa historia.</p>
          </div>
        </article>
        <article className="rounded-lg border border-red-100 bg-red-50 p-4">
          <h2 className="font-black text-slate-950">Faca parte da nossa historia</h2>
          <p className="mt-2 text-sm font-semibold text-slate-600">Tem algum registro, foto ou informacao sobre um evento historico do clube?</p>
          <button type="button" className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-black text-white">Enviar conteudo</button>
        </article>
      </aside>
    </div>
  );
}

function DirectorsPage({ report }: { report?: ArchiveReport }) {
  const presidents = report?.presidents?.length ? report.presidents : people.slice(0, 5).map((name, index) => ({ id: name, name, startedYear: 2009 + index * 3, endedYear: index === 4 ? undefined : 2012 + index * 3, achievements: "Gestao marcada por conquistas e melhorias do clube.", photoUrl: null }));
  const [selectedId, setSelectedId] = useState(presidents[0]?.id ?? "");
  const selected = presidents.find((person) => person.id === selectedId) ?? presidents[0];
  const directors = report?.boardTerms?.filter((term) => term.startedYear >= selected.startedYear && (selected.endedYear ? term.startedYear <= selected.endedYear : true)).slice(0, 6) ?? [];
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(21rem,0.8fr)_minmax(0,1.2fr)]">
      <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-black text-slate-950">Linha do tempo das gestoes</h2>
          <button type="button" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-black">Ver todos</button>
        </div>
        <div className="mt-4 space-y-3">
          {presidents.map((person) => (
            <button type="button" key={person.id} onClick={() => setSelectedId(person.id)} className={`grid w-full gap-3 rounded-lg border p-3 text-left sm:grid-cols-[4rem_5rem_minmax(0,1fr)_auto] sm:items-center ${person.id === selected.id ? "border-red-400 bg-red-50" : "border-slate-200 bg-white hover:border-red-200"}`}>
              <strong className="text-slate-950">{person.startedYear}<br />{person.endedYear ?? "Atual"}</strong>
              <SafeArchiveImage src={person.photoUrl} alt={person.name} className="size-20 rounded-lg object-cover" />
              <div>
                <h3 className="font-black text-slate-950">{person.name}</h3>
                <p className="text-xs font-black text-red-600">Presidente</p>
                <p className="mt-1 text-sm font-semibold text-slate-500">{person.achievements ?? person.note}</p>
              </div>
              <ChevronRight size={18} className="text-slate-400" />
            </button>
          ))}
        </div>
      </article>
      <article className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="relative overflow-hidden rounded-t-lg bg-slate-950 p-6 text-white">
          <img src="/assets/hero.png" alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="rounded-lg bg-red-600 px-3 py-1 text-sm font-black">{selected.startedYear} - {selected.endedYear ?? "Atual"}</span>
              <h2 className="mt-4 text-3xl font-black">{selected.name}</h2>
              <p className="mt-1 text-xl font-black text-red-300">Presidente</p>
              <p className="mt-4 max-w-xl text-sm font-semibold text-white">"Plantamos a semente de um clube que hoje e motivo de orgulho para todos."</p>
            </div>
            <SafeArchiveImage src={selected.photoUrl} alt={selected.name} className="size-36 rounded-lg border border-white/40 object-cover" />
          </div>
        </div>
        <div className="grid gap-4 p-4 lg:grid-cols-2">
          <InfoBox title="Sobre o mandato" rows={["Periodo: 01/01/2009 a 31/12/2013", "Duracao: 5 anos", "Naturalidade: Florianopolis - SC", "Profissao: Empresario"]} />
          <InfoBox title="Principais conquistas" rows={["Primeiro titulo municipal", "Vice-campeao da Copa Ribeirao", "Construcao dos vestiarios", "Iluminacao do campo principal"]} />
        </div>
        <div className="border-t border-slate-100 p-4">
          <h3 className="font-black text-slate-950">Diretores do periodo</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(directors.length ? directors : people.slice(0, 6).map((name, index) => ({ id: `fallback-${name}`, associate: { name, athlete: { photoUrl: null } }, boardRole: { name: index % 2 ? "Diretor financeiro" : "Diretor de futebol" } }))).map((director) => (
              <article key={director.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
                <SafeArchiveImage src={director.associate?.athlete?.photoUrl} alt={director.associate?.name ?? "Diretor"} className="size-14 rounded-lg object-cover" />
                <div>
                  <h4 className="font-black text-slate-950">{director.associate?.name ?? "Diretor"}</h4>
                  <p className="text-xs font-semibold text-slate-500">{director.boardRole?.name ?? "Diretoria"}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </article>
    </div>
  );
}

function InfoBox({ title, rows }: { title: string; rows: string[] }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="font-black text-slate-950">{title}</h3>
      <div className="mt-3 space-y-2">
        {rows.map((row) => (
          <p key={row} className="text-sm font-semibold text-slate-600">{row}</p>
        ))}
      </div>
    </article>
  );
}

function ReportsPage({ report, archiveItems }: { report?: ArchiveReport; archiveItems: ArchiveItem[] }) {
  const games = report?.gameResults?.flatMap((year) => year.games ?? []).slice(0, 9) ?? [];
  const rows = games.length ? games : Array.from({ length: 9 }, (_, index) => ({ id: String(index), date: `2024-06-${String(15 - index).padStart(2, "0")}`, championship: "Campeonato Municipal 2024", location: "Arena GestaSports", redTeamName: "GestaSports FC", whiteTeamName: "Ribeirao FC", redScore: index % 3, whiteScore: index % 2 }));
  const manualRows = archiveItems.map((item) => ({
    id: item.id,
    date: item.occurredAt ?? `${item.year ?? 2024}-01-01T12:00:00.000Z`,
    championship: item.competition ?? item.category ?? "Acervo manual",
    location: item.location ?? "-",
    redTeamName: item.title,
    whiteTeamName: item.resultLabel ?? "Sumula",
    redScore: null,
    whiteScore: null
  }));
  const visibleRows = [...manualRows, ...rows].slice(0, 12);
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_28rem]">
      <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-black text-slate-950">Sumulas encontradas (842)</h2>
        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
              <tr><th>Data</th><th>Jogo</th><th>Competicao</th><th>Resultado</th><th>Estadio</th><th>PDF</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleRows.map((game) => (
                <tr key={game.id}>
                  <td className="font-semibold text-slate-500">{new Date(game.date).toLocaleDateString("pt-BR")}</td>
                  <td className="font-black text-slate-950">{game.redTeamName} {game.redScore} x {game.whiteScore} {game.whiteTeamName}</td>
                  <td>{game.championship}</td>
                  <td><span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700">V</span></td>
                  <td>{game.location}</td>
                  <td><FileText size={18} className="text-red-600" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
      <aside className="space-y-4">
        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">Visualizador de sumula</h2>
          <div className="mt-4 rounded-lg border border-slate-300 bg-slate-50 p-4">
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <p className="text-center text-xs font-black uppercase text-slate-500">Federacao Catarinense de Futebol</p>
              <h3 className="mt-2 text-center text-xl font-black text-slate-950">Sumula da Partida</h3>
              <div className="mt-6 grid grid-cols-3 gap-2 text-center text-sm font-black">
                <span>GestaSports FC</span><span>3 x 2</span><span>Ribeirao FC</span>
              </div>
              <div className="mt-6 h-52 rounded border border-slate-200 bg-[repeating-linear-gradient(180deg,#f8fafc_0,#f8fafc_28px,#ffffff_28px,#ffffff_56px)]" />
            </div>
          </div>
        </article>
        <InfoBox title="Downloads rapidos" rows={["Sumula (PDF)", "Relacao de atletas", "Resumo da partida", "Escalacoes"]} />
      </aside>
    </div>
  );
}

function DocumentsPage({ archiveItems }: { archiveItems: ArchiveItem[] }) {
  const docs = archiveItems.length ? archiveItems.map((item) => item.title) : ["Ata de Fundacao", "Estatuto Social 2012", "Ata Assembleia Geral", "Regimento Interno", "Contrato de Locacao", "Recorte Jornal", "Escritura do Terreno"];
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(24rem,1fr)_22rem]">
      <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-black text-slate-950">Documentos (1.248)</h2>
        <div className="mt-4 space-y-2">
          {docs.map((doc, index) => (
            <div key={doc} className={`grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border p-3 ${index === 0 ? "border-red-400 bg-red-50" : "border-slate-200"}`}>
              <span className="grid size-10 place-items-center rounded-lg bg-red-50 text-red-600"><FileText size={18} /></span>
              <div>
                <p className="font-black text-slate-950">{doc}</p>
                <p className="text-xs font-semibold text-slate-500">{15 + index}/03/2009 | Institucional | PDF</p>
              </div>
              <Menu size={16} className="text-slate-400" />
            </div>
          ))}
        </div>
      </article>
      <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-black text-slate-950">Ata de Fundacao</h2>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">Documento oficial</span>
        </div>
        <div className="mt-4 rounded-lg bg-slate-800 p-4">
          <div className="mx-auto max-w-xl rounded bg-white p-8 text-slate-950 shadow-sm">
            <img src="/brand/gestasports-logo-transparent.png" alt="GestaSports" className="mx-auto h-16 w-16 object-contain" />
            <h3 className="mt-4 text-center text-2xl font-black">ATA DE FUNDACAO</h3>
            <p className="mt-6 text-sm font-semibold leading-7 text-slate-700">Aos quinze dias do mes de marco de dois mil e nove, reuniram-se os abaixo assinados para fundar o GestaSports Futebol Clube e preservar sua memoria esportiva.</p>
            <div className="mt-12 grid grid-cols-3 gap-4 text-center text-xs font-semibold text-slate-500">
              <span>Joao da Silva<br />Presidente</span>
              <span>Carlos Lima<br />Vice-presidente</span>
              <span>Marcos Alves<br />Secretario</span>
            </div>
          </div>
        </div>
      </article>
      <aside className="space-y-4">
        <InfoBox title="Informacoes do documento" rows={["Categoria: Institucional", "Tipo: Ata", "Data: 15/03/2009", "Status: Oficial", "Paginas: 4"]} />
        <InfoBox title="Documentos relacionados" rows={["Lista de socios fundadores", "Primeiro Estatuto Social", "Regimento Interno 2010"]} />
      </aside>
    </div>
  );
}

function AssetsPage({ archiveItems }: { archiveItems: ArchiveItem[] }) {
  const assets = archiveItems.length ? archiveItems.map((item) => item.title) : ["Arena Familia", "Centro de Treinamento", "Sede Social", "Campo Auxiliar", "Academia de Musculacao", "Iluminacao do Campo"];
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(22rem,0.85fr)_minmax(0,1fr)_22rem]">
      <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-black text-slate-950">Patrimonios cadastrados (23)</h2>
        <div className="mt-4 space-y-2">
          {assets.map((asset, index) => (
            <div key={asset} className={`grid grid-cols-[5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border p-2 ${index === 0 ? "border-red-400 bg-red-50" : "border-slate-200"}`}>
              <img src={visualImages[index % visualImages.length]} alt={asset} className="h-14 w-20 rounded-lg object-cover" />
              <div>
                <p className="font-black text-slate-950">{asset}</p>
                <p className="text-xs font-semibold text-slate-500">Sede Principal</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700">Bom</span>
            </div>
          ))}
        </div>
      </article>
      <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-black text-slate-950">Arena Familia</h2>
        <img src="/assets/hero.png" alt="Arena Familia" className="mt-4 h-80 w-full rounded-lg object-cover" />
        <p className="mt-4 text-sm font-semibold leading-6 text-slate-600">Estadio principal do GestaSports Futebol Clube. Palco de grandes conquistas, jogos memoraveis e encontros da comunidade.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MiniInfo icon={Building2} label="Tipo" value="Estadio" />
          <MiniInfo icon={MapPin} label="Localizacao" value="Sede Principal" />
          <MiniInfo icon={Users} label="Capacidade" value="1.200 pessoas" />
          <MiniInfo icon={BadgeCheck} label="Estado" value="Excelente" />
        </div>
      </article>
      <aside className="space-y-4">
        <InfoBox title="Informacoes do patrimonio" rows={["Codigo: PAT-001", "Responsavel: Diretoria Administrativa", "Valor estimado: R$ 3.200.000,00", "Seguro: Ativo"]} />
        <InfoBox title="Documentos vinculados" rows={["Escritura do imovel", "Habite-se", "Auto de vistoria"]} />
      </aside>
    </div>
  );
}

function MemorialCategoryManager() {
  const queryClient = useQueryClient();
  const categoriesQuery = useMemorialCategories();
  const [form, setForm] = useState({ name: "", description: "", archiveType: "DOCUMENT" as ArchiveItemType, showInDashboard: true });
  const createMutation = useMutation({
    mutationFn: () =>
      apiRequest<MemorialCategory>("/memorial-categories", {
        method: "POST",
        body: JSON.stringify(form)
      }),
    onSuccess: async () => {
      setForm({ name: "", description: "", archiveType: "DOCUMENT", showInDashboard: true });
      await queryClient.invalidateQueries({ queryKey: ["memorial-categories"] });
    }
  });
  const updateMutation = useMutation({
    mutationFn: ({ slug, payload }: { slug: string; payload: Partial<MemorialCategory> }) =>
      apiRequest<MemorialCategory>(`/memorial-categories/${slug}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["memorial-categories"] });
    }
  });

  const categories = categoriesQuery.data ?? [];

  return (
    <ContentCard title="Categorias personalizadas" description="Crie acervos como viagens, projetos sociais, escolinhas, homenagens, obras e uniformes alternativos.">
      <form
        className="grid gap-3 lg:grid-cols-[minmax(12rem,1fr)_minmax(14rem,1.2fr)_11rem_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          void createMutation.mutateAsync();
        }}
      >
        <input className="h-11 rounded-lg border-slate-200 px-3 text-sm font-semibold" placeholder="Nome da categoria" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
        <input className="h-11 rounded-lg border-slate-200 px-3 text-sm font-semibold" placeholder="Descricao publica" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
        <select className="h-11 rounded-lg border-slate-200 bg-white px-3 text-sm font-black" value={form.archiveType} onChange={(event) => setForm((current) => ({ ...current, archiveType: event.target.value as ArchiveItemType }))}>
          <option value="DOCUMENT">Documento</option>
          <option value="GALLERY">Galeria</option>
          <option value="TIMELINE">Linha do tempo</option>
          <option value="ASSET">Patrimonio</option>
          <option value="AWARD">Premiacao</option>
        </select>
        <button type="submit" disabled={createMutation.isPending} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--brand-primary)] px-4 text-sm font-black text-white disabled:opacity-60">
          {createMutation.isPending ? "Criando..." : "Criar"}
        </button>
      </form>
      {createMutation.isError ? <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-black text-red-700">Nao foi possivel criar a categoria.</p> : null}
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {categories.map((category) => (
          <article key={category.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-950">{category.name}</h3>
                <p className="mt-1 text-xs font-semibold text-slate-500">{category.description ?? category.archiveType}</p>
              </div>
              <span className={`rounded-full px-2 py-1 text-[10px] font-black ${category.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>{category.enabled ? "Ativa" : "Oculta"}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link to={`/memorial/categorias/${category.slug}`} className="inline-flex min-h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700">Abrir</Link>
              <Link to={`/acervo/categorias/${category.slug}`} className="inline-flex min-h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700">Publico</Link>
              <button type="button" className="inline-flex min-h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700" onClick={() => void updateMutation.mutateAsync({ slug: category.slug, payload: { enabled: !category.enabled } })}>
                {category.enabled ? "Ocultar" : "Ativar"}
              </button>
            </div>
          </article>
        ))}
        {categories.length === 0 ? <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm font-semibold text-slate-500">Nenhuma categoria personalizada criada ainda.</p> : null}
      </div>
    </ContentCard>
  );
}

export function ArchivePage({ kind }: { kind: ArchiveKind }) {
  const reportQuery = useArchiveReport();
  const archiveItemsQuery = useArchiveItems(kind);
  const report = reportQuery.data;
  const archiveItems = useMemo(() => archiveItemsQuery.data ?? [], [archiveItemsQuery.data]);
  const stats = useMemo(() => statsFor(kind, report), [kind, report]);
  const cardsForFilters = useMemo(() => [...cardsFromArchiveItems(kind, archiveItems), ...buildCards(kind, report)], [archiveItems, kind, report]);
  const [filters, setFilters] = useState(defaultArchiveFilters);
  const hasGridFilters = !["dashboard", "timeline", "directors", "reports", "assets", "documents"].includes(kind);

  return (
    <ArchiveChrome kind={kind}>
      <StatGrid stats={stats} />
      {kind === "dashboard" ? <MemorialCategoryManager /> : null}
      {hasGridFilters ? <FilterBar kind={kind} filters={filters} onChange={setFilters} cards={cardsForFilters} /> : null}
      <CardGridPage kind={kind} report={report} archiveItems={archiveItems} filters={filters} />
    </ArchiveChrome>
  );
}

function PublicArchiveNav({ activeKind }: { activeKind: ArchiveKind }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {archiveNav.filter((item) => item.kind !== "dashboard").map((item) => {
        const Icon = item.icon;
        const active = item.kind === activeKind;
        return (
          <Link
            key={item.kind}
            to={publicArchivePath(item.kind)}
            className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm font-black ${
              active ? "border-[var(--brand-accent)] bg-[color-mix(in_oklab,var(--brand-accent)_12%,white)] text-[var(--brand-accent)]" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Icon size={16} />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

function PublicArchiveCard({ item }: { item: ArchiveItem }) {
  const kind = Object.entries(archiveTypeByKind).find(([, type]) => type === item.type)?.[0] as ArchiveKind | undefined;
  const path = publicArchivePath(kind ?? "dashboard", item.id);

  return {
    id: item.id,
    title: item.title,
    imageUrl: item.coverImageUrl,
    description: item.subtitle ?? item.description ?? item.category ?? null,
    action: (
      <Link to={path} className="inline-flex min-h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 hover:border-[var(--brand-accent)] hover:text-[var(--brand-accent)]">
        Ver
      </Link>
    )
  };
}

function kindForArchiveType(type: ArchiveItemType): ArchiveKind {
  return (Object.entries(archiveTypeByKind).find(([, value]) => value === type)?.[0] as ArchiveKind | undefined) ?? "documents";
}

function PublicArchiveDetail({ id, kind }: { id: string; kind: ArchiveKind }) {
  const itemQuery = usePublicArchiveItem(id);
  const tenantTheme = useTenantTheme();
  const item = itemQuery.data;

  if (itemQuery.isLoading) {
    return <PageTemplate title="Carregando acervo" description="Buscando o registro publico..." eyebrow="Memorial publico"><ContentCard title="Aguarde">Carregando...</ContentCard></PageTemplate>;
  }

  if (itemQuery.isError || !item) {
    return <PageTemplate title="Registro nao encontrado" description="Este item nao esta publicado ou nao pertence ao acervo publico." eyebrow="Memorial publico"><Link to={publicArchivePath(kind)} className="font-black text-[var(--brand-accent)]">Voltar ao acervo</Link></PageTemplate>;
  }

  return (
    <PageTemplate
      eyebrow={`${tenantTheme.brandName || tenantTheme.name} / Memorial`}
      title={item.title}
      description={item.subtitle ?? item.category ?? "Registro publico do acervo institucional."}
      actions={<Link to={publicArchivePath(kind)} className="inline-flex min-h-10 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-black text-slate-700">Voltar</Link>}
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <article className="fl-enterprise-card overflow-hidden rounded-[var(--brand-radius)] border border-slate-200 bg-white shadow-sm">
          <SafeArchiveImage src={item.coverImageUrl ?? tenantTheme.logoUrl ?? "/assets/hero.png"} alt={item.title} className="max-h-[28rem] w-full object-cover" />
          <div className="space-y-5 p-5">
            <div className="flex flex-wrap gap-2">
              {item.year ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">{item.year}</span> : null}
              {item.category ? <span className="rounded-full bg-[color-mix(in_oklab,var(--brand-accent)_12%,white)] px-3 py-1 text-xs font-black text-[var(--brand-accent)]">{item.category}</span> : null}
              {item.periodLabel ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">{item.periodLabel}</span> : null}
            </div>
            <p className="text-base font-semibold leading-8 text-slate-700">{item.description ?? "Este registro integra o memorial publico do clube."}</p>
            {item.attachments.length ? (
              <section>
                <h2 className="text-lg font-black text-slate-950">Arquivos relacionados</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {item.attachments.map((attachment) => (
                    <a key={attachment.id} href={attachment.url} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 p-3 text-sm font-black text-slate-700 hover:border-[var(--brand-accent)] hover:text-[var(--brand-accent)]">
                      {attachment.title ?? attachment.type}
                      <span className="mt-1 block text-xs font-semibold text-slate-500">{attachment.type}</span>
                    </a>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </article>
        <ContentCard title="Ficha do acervo" description="Informacoes publicas deste registro.">
          <div className="space-y-3">
            {archiveDetailRows(item).map(([label, value]) => (
              <div key={label} className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2 text-sm">
                <span className="font-black text-slate-500">{label}</span>
                <span className="text-right font-black text-slate-900">{value}</span>
              </div>
            ))}
          </div>
        </ContentCard>
      </div>
    </PageTemplate>
  );
}

export function PublicMemorialPage() {
  const { category, id } = useParams();
  const tenantTheme = useTenantTheme();
  const activeKind = category ? publicArchiveKindBySlug[category] ?? "dashboard" : "dashboard";
  const itemsQuery = usePublicArchiveItems(activeKind);
  const customCategoriesQuery = useMemorialCategories(true);
  const publicItems = itemsQuery.data ?? [];
  const customCategories = (customCategoriesQuery.data ?? []).filter((item) => item.showInDashboard);
  const categoryConfig = configs[activeKind];
  const featured = publicItems[0];

  if (id) {
    return <PublicArchiveDetail id={id} kind={activeKind} />;
  }

  return (
    <PageTemplate
      eyebrow="Memorial publico"
      title={activeKind === "dashboard" ? `Acervo de ${tenantTheme.brandName || tenantTheme.name}` : categoryConfig.title}
      description={activeKind === "dashboard" ? "Explore a historia, conquistas, documentos e imagens publicas do clube." : categoryConfig.subtitle}
      actions={<Link to="/login" className="inline-flex min-h-10 items-center rounded-lg bg-[var(--brand-primary)] px-4 text-sm font-black text-white">Area administrativa</Link>}
    >
      <PublicArchiveNav activeKind={activeKind} />

      {activeKind === "dashboard" ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,.8fr)]">
          <article className="fl-enterprise-card overflow-hidden rounded-[var(--brand-radius)] border border-slate-200 bg-white shadow-sm">
            <SafeArchiveImage src={featured?.coverImageUrl ?? tenantTheme.logoUrl ?? "/assets/hero.png"} alt={featured?.title ?? "Memorial publico"} className="h-80 w-full object-cover" />
            <div className="p-5">
              <p className="text-xs font-black uppercase text-[var(--brand-accent)]">Destaque do acervo</p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">{featured?.title ?? "Memorial em construcao"}</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{featured?.description ?? "Publique registros no modulo administrativo para alimentar esta vitrine publica."}</p>
              {featured ? <Link to={publicArchivePath(Object.entries(archiveTypeByKind).find(([, type]) => type === featured.type)?.[0] as ArchiveKind, featured.id)} className="mt-4 inline-flex min-h-10 items-center rounded-lg border border-slate-200 px-4 text-sm font-black text-slate-700">Abrir registro</Link> : null}
            </div>
          </article>
          <StatsGrid>
            {archiveNav.filter((item) => item.kind !== "dashboard").slice(0, 6).map((item) => {
              const Icon = item.icon;
              const count = publicItems.filter((archiveItem) => archiveItem.type === archiveTypeByKind[item.kind]).length;
              return <EnterpriseStatCard key={item.kind} label={item.label} value={count} helper="publicados" icon={<Icon size={18} />} tone="default" />;
            })}
          </StatsGrid>
        </div>
      ) : null}

      <ContentCard title={activeKind === "dashboard" ? "Categorias publicas" : "Registros publicados"} description={itemsQuery.isLoading ? "Carregando registros..." : `${publicItems.length} item(ns) publicado(s).`}>
        {activeKind === "dashboard" ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {archiveNav.filter((item) => item.kind !== "dashboard").map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.kind} to={publicArchivePath(item.kind)} className="rounded-lg border border-slate-200 bg-white p-4 transition hover:border-[var(--brand-accent)] hover:shadow-sm">
                  <Icon size={22} className="text-[var(--brand-accent)]" />
                  <h3 className="mt-3 text-sm font-black text-slate-950">{item.label}</h3>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{configs[item.kind].subtitle}</p>
                </Link>
              );
            })}
            {customCategories.map((item) => (
              <Link key={item.id} to={`/acervo/categorias/${item.slug}`} className="rounded-lg border border-slate-200 bg-white p-4 transition hover:border-[var(--brand-accent)] hover:shadow-sm">
                <Archive size={22} className="text-[var(--brand-accent)]" />
                <h3 className="mt-3 text-sm font-black text-slate-950">{item.name}</h3>
                <p className="mt-1 text-xs font-semibold text-slate-500">{item.description ?? "Categoria personalizada do memorial."}</p>
              </Link>
            ))}
          </div>
        ) : (
          <GalleryGrid items={publicItems.map((item) => PublicArchiveCard({ item }))} />
        )}
      </ContentCard>
    </PageTemplate>
  );
}

export function DynamicMemorialCategoryPage({ publicView = false }: { publicView?: boolean }) {
  const { slug, id } = useParams();
  const queryClient = useQueryClient();
  const categoriesQuery = useMemorialCategories(publicView);
  const categories = categoriesQuery.data ?? [];
  const category = categories.find((item) => item.slug === slug);
  const adminItemsQuery = useArchiveItemsByDynamicCategory(category, !publicView);
  const publicItemsQuery = usePublicArchiveItemsByDynamicCategory(category, publicView);
  const itemsQuery = publicView ? publicItemsQuery : adminItemsQuery;
  const items = itemsQuery.data ?? [];
  const [itemForm, setItemForm] = useState({ title: "", description: "", coverImageUrl: "", visibility: "PUBLIC" });
  const createItemMutation = useMutation({
    mutationFn: () =>
      apiRequest<ArchiveItem>("/archive-items", {
        method: "POST",
        body: JSON.stringify({
          type: category?.archiveType ?? "DOCUMENT",
          status: itemForm.visibility === "DRAFT" ? "DRAFT" : itemForm.visibility === "PRIVATE" ? "PRIVATE" : "PUBLISHED",
          title: itemForm.title,
          subtitle: category?.name ?? null,
          description: itemForm.description || null,
          category: category?.name ?? null,
          coverImageUrl: itemForm.coverImageUrl || null,
          visibility: itemForm.visibility,
          metadata: { dynamicCategorySlug: category?.slug, source: "dynamic_memorial_category" }
        })
      }),
    onSuccess: async () => {
      setItemForm({ title: "", description: "", coverImageUrl: "", visibility: "PUBLIC" });
      await queryClient.invalidateQueries({ queryKey: ["archive-items", "dynamic-category", category?.slug, category?.archiveType] });
    }
  });

  if (categoriesQuery.isLoading) {
    return <PageTemplate title="Carregando categoria" description="Buscando configuracao do memorial..." eyebrow="Memorial"><ContentCard title="Aguarde">Carregando...</ContentCard></PageTemplate>;
  }

  if (!category) {
    return <PageTemplate title="Categoria nao encontrada" description="Esta categoria nao existe ou nao esta ativa." eyebrow="Memorial"><Link to={publicView ? "/acervo" : "/memorial"} className="font-black text-[var(--brand-accent)]">Voltar ao memorial</Link></PageTemplate>;
  }

  if (publicView && id) {
    return <PublicArchiveDetail id={id} kind={kindForArchiveType(category.archiveType)} />;
  }

  return (
    <PageTemplate
      eyebrow={publicView ? "Acervo publico" : "Categoria personalizada"}
      title={category.name}
      description={category.description ?? "Categoria configuravel do Memorial."}
      actions={<Link to={publicView ? "/acervo" : "/memorial"} className="inline-flex min-h-10 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-black text-slate-700">Voltar</Link>}
    >
      {!publicView ? (
        <ContentCard title="Novo registro nesta categoria" description="O cadastro usa o tipo e as permissoes configuradas para a categoria.">
          <form
            className="grid gap-3 lg:grid-cols-[minmax(14rem,1fr)_minmax(14rem,1.3fr)_minmax(12rem,1fr)_9rem_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              void createItemMutation.mutateAsync();
            }}
          >
            <input className="h-11 rounded-lg border-slate-200 px-3 text-sm font-semibold" placeholder="Titulo do registro" value={itemForm.title} onChange={(event) => setItemForm((current) => ({ ...current, title: event.target.value }))} required />
            <input className="h-11 rounded-lg border-slate-200 px-3 text-sm font-semibold" placeholder="Descricao curta" value={itemForm.description} onChange={(event) => setItemForm((current) => ({ ...current, description: event.target.value }))} />
            <input className="h-11 rounded-lg border-slate-200 px-3 text-sm font-semibold" placeholder="URL da imagem" value={itemForm.coverImageUrl} onChange={(event) => setItemForm((current) => ({ ...current, coverImageUrl: event.target.value }))} />
            <select className="h-11 rounded-lg border-slate-200 bg-white px-3 text-sm font-black" value={itemForm.visibility} onChange={(event) => setItemForm((current) => ({ ...current, visibility: event.target.value }))}>
              <option value="PUBLIC">Publico</option>
              <option value="PRIVATE">Privado</option>
              <option value="DRAFT">Rascunho</option>
            </select>
            <button type="submit" disabled={createItemMutation.isPending} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--brand-primary)] px-4 text-sm font-black text-white disabled:opacity-60">
              {createItemMutation.isPending ? "Salvando..." : "Salvar"}
            </button>
          </form>
        </ContentCard>
      ) : null}

      <ContentCard title={publicView ? "Registros publicados" : "Registros da categoria"} description={itemsQuery.isLoading ? "Carregando..." : `${items.length} registro(s).`}>
        <GalleryGrid items={items.map((item) => ({
          id: item.id,
          title: item.title,
          imageUrl: item.coverImageUrl,
          description: item.description ?? item.subtitle ?? category.name,
          action: publicView ? (
            <Link to={`/acervo/categorias/${category.slug}/${item.id}`} className="inline-flex min-h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700">Ver</Link>
          ) : (
            <Link to={`${archivePathByType[item.type] ?? "/memorial"}/${item.id}`} className="inline-flex min-h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700">Abrir</Link>
          )
        }))} />
      </ContentCard>
    </PageTemplate>
  );
}

function launchFieldsFor(kind: ArchiveKind) {
  const common = [
    { label: "Titulo do registro", placeholder: "Ex.: Campeonato Municipal 2024" },
    { label: "Data ou temporada", placeholder: "Ex.: 2024 ou 15/06/2024" },
    { label: "Categoria", placeholder: "Ex.: Institucional, titulo, patrimonio" }
  ];

  const specific: Partial<Record<ArchiveKind, Array<{ label: string; placeholder: string }>>> = {
    games: [
      { label: "Data do jogo", placeholder: "Ex.: 12/08/2018" },
      { label: "Competicao", placeholder: "Ex.: Campeonato Municipal 2018" },
      { label: "Placar", placeholder: "Ex.: GestaSports FC 3 x 2 Amigos FC" },
      { label: "Local", placeholder: "Ex.: Campo Municipal" },
      { label: "Destaque da partida", placeholder: "Ex.: Final historica, titulo inedito" }
    ],
    athletes: [
      { label: "Nome do atleta", placeholder: "Ex.: Joao Paulo" },
      { label: "Posicao ou funcao", placeholder: "Ex.: Atacante, goleiro, dirigente" },
      { label: "Periodo no clube", placeholder: "Ex.: 2009 - 2018" },
      { label: "Numeros historicos", placeholder: "Ex.: 214 jogos, 127 gols" },
      { label: "Status", placeholder: "Ex.: Historico, ativo, hall da fama" }
    ],
    titles: [
      { label: "Competicao", placeholder: "Ex.: Campeonato Municipal" },
      { label: "Resultado final", placeholder: "Ex.: Campeao, vice-campeao, invicto" },
      { label: "Placar da final", placeholder: "Ex.: GestaSports FC 3 x 1 Ribeirao FC" }
    ],
    reports: [
      { label: "Data da partida", placeholder: "Ex.: 15/06/2024" },
      { label: "Competicao", placeholder: "Ex.: Campeonato Municipal" },
      { label: "Placar", placeholder: "Ex.: GestaSports FC 3 x 1 Ribeirao FC" },
      { label: "Numero da sumula", placeholder: "Ex.: SUM-2024-001" },
      { label: "Arbitro ou responsavel", placeholder: "Ex.: Joao P. Silva" }
    ],
    shirts: [
      { label: "Temporada", placeholder: "Ex.: 2024" },
      { label: "Tipo da camisa", placeholder: "Ex.: Titular, reserva, goleiro" },
      { label: "Fornecedor", placeholder: "Ex.: Icone Sports" },
      { label: "Patrocinador", placeholder: "Ex.: Sicoob" },
      { label: "Periodo de uso", placeholder: "Ex.: Jan 2024 - Dez 2024" }
    ],
    documents: [
      { label: "Tipo de documento", placeholder: "Ex.: Ata, estatuto, contrato, recorte" },
      { label: "Autor ou responsavel", placeholder: "Ex.: Diretoria administrativa" },
      { label: "Codigo interno", placeholder: "Ex.: DOC-001" }
    ],
    awards: [
      { label: "Tipo de premiacao", placeholder: "Ex.: Trofeu, medalha, premio individual" },
      { label: "Competicao relacionada", placeholder: "Ex.: Copa Ribeirao" },
      { label: "Pessoa ou equipe premiada", placeholder: "Ex.: Rafael Santos" }
    ],
    assets: [
      { label: "Tipo de patrimonio", placeholder: "Ex.: Imovel, estrutura, equipamento" },
      { label: "Localizacao", placeholder: "Ex.: Sede principal" },
      { label: "Estado de conservacao", placeholder: "Ex.: Excelente, bom, manutencao" }
    ],
    hall: [
      { label: "Nome do homenageado", placeholder: "Ex.: Carlos Alberto Lima" },
      { label: "Vinculo com o clube", placeholder: "Ex.: Atleta, dirigente, colaborador" },
      { label: "Periodo no clube", placeholder: "Ex.: 2010 - 2015" }
    ],
    timeline: [
      { label: "Ano do marco", placeholder: "Ex.: 2018" },
      { label: "Tipo de evento", placeholder: "Ex.: Titulo, estrutura, institucional" },
      { label: "Registro relacionado", placeholder: "Ex.: Jogo, titulo, documento ou foto" }
    ]
  };

  return [...common, ...(specific[kind] ?? [])];
}

function getRawArchiveFields(item: ArchiveItem) {
  if (item.metadata && typeof item.metadata === "object" && "rawFields" in item.metadata) {
    const rawFields = (item.metadata as { rawFields?: unknown }).rawFields;
    if (rawFields && typeof rawFields === "object") {
      return Object.fromEntries(
        Object.entries(rawFields as Record<string, unknown>).map(([key, value]) => [key, typeof value === "string" ? value : String(value ?? "")])
      );
    }
  }
  return {};
}

function valueForField(item: ArchiveItem, label: string) {
  const metadata = item.metadata && typeof item.metadata === "object" ? item.metadata as Record<string, unknown> : {};
  const metaValue = (key: string) => typeof metadata[key] === "string" ? String(metadata[key]) : "";
  const values: Record<string, string | null | undefined> = {
    "Titulo do registro": item.title,
    "Data ou temporada": item.periodLabel ?? String(item.year ?? ""),
    Categoria: item.category ?? item.subtitle,
    "Data do jogo": item.periodLabel,
    "Data da partida": item.periodLabel,
    Temporada: item.periodLabel ?? String(item.year ?? ""),
    Competicao: item.competition,
    "Competicao relacionada": item.competition,
    Placar: item.scoreLabel,
    "Placar da final": item.scoreLabel,
    Local: item.location,
    Localizacao: item.location,
    "Destaque da partida": metaValue("highlight"),
    "Nome do atleta": item.personName,
    "Nome do homenageado": item.personName,
    "Pessoa ou equipe premiada": item.personName,
    "Posicao ou funcao": item.personRole,
    "Vinculo com o clube": item.personRole ?? item.subtitle,
    "Periodo no clube": item.periodLabel,
    "Numeros historicos": metaValue("historicalNumbers"),
    Status: item.category,
    "Resultado final": item.resultLabel,
    "Numero da sumula": item.documentNumber,
    "Arbitro ou responsavel": metaValue("responsible"),
    "Tipo da camisa": item.category ?? item.subtitle,
    Fornecedor: metaValue("supplier"),
    Patrocinador: metaValue("sponsor"),
    "Periodo de uso": item.periodLabel,
    "Tipo de documento": item.category ?? item.subtitle,
    "Autor ou responsavel": metaValue("responsible"),
    "Codigo interno": item.assetCode ?? item.documentNumber,
    "Tipo de premiacao": item.category ?? item.subtitle,
    "Tipo de patrimonio": item.category ?? item.subtitle,
    "Estado de conservacao": item.assetCondition,
    "Ano do marco": String(item.year ?? ""),
    "Tipo de evento": item.category,
    "Registro relacionado": item.linkedEntityId
  };
  return values[label] ?? "";
}

function archiveDetailRows(item: ArchiveItem) {
  return [
    ["Tipo", item.type],
    ["Status", item.status],
    ["Ano", item.year ? String(item.year) : null],
    ["Categoria", item.category],
    ["Periodo", item.periodLabel],
    ["Local", item.location],
    ["Pessoa", item.personName],
    ["Funcao", item.personRole],
    ["Competicao", item.competition],
    ["Resultado", item.resultLabel],
    ["Placar", item.scoreLabel],
    ["Codigo", item.assetCode ?? item.documentNumber],
    ["Conservacao", item.assetCondition]
  ].filter(([, value]) => Boolean(value));
}

export function ArchiveDetailPage({ kind }: { kind: ArchiveKind }) {
  const { id } = useParams();
  const itemQuery = useArchiveItem(id);
  const returnPath = archiveNav.find((item) => item.kind === kind)?.path ?? "/memorial";
  const editPath = id ? `${returnPath}/${id}/editar` : returnPath;
  const item = itemQuery.data;

  return (
    <ArchiveChrome kind={kind}>
      {itemQuery.isLoading ? (
        <article className="rounded-lg border border-slate-200 bg-white p-6 text-sm font-black text-slate-600 shadow-sm">Carregando pagina do acervo...</article>
      ) : itemQuery.isError || !item ? (
        <article className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm font-black text-red-700 shadow-sm">Nao foi possivel abrir este registro do acervo.</article>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="relative min-h-72 bg-slate-950">
              <img src={item.coverImageUrl || item.attachments.find((attachment) => attachment.type === "IMAGE")?.url || visualImages[0]} alt={item.title} className="h-96 w-full object-cover opacity-80" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 to-transparent p-5 text-white">
                <span className="inline-flex rounded-lg bg-red-600 px-3 py-1 text-xs font-black">{item.year ?? item.category ?? "Acervo"}</span>
                <h2 className="mt-3 text-3xl font-black">{item.title}</h2>
                <p className="mt-1 max-w-3xl text-sm font-semibold text-white/80">{item.subtitle ?? item.periodLabel ?? "Registro historico do clube"}</p>
              </div>
            </div>
            <div className="space-y-5 p-5">
              <div className="flex flex-wrap gap-2">
                <Link to={returnPath} className="inline-flex min-h-10 items-center rounded-lg border border-slate-200 px-4 text-sm font-black text-slate-700">Voltar</Link>
                <Link to={editPath} className="inline-flex min-h-10 items-center rounded-lg bg-red-600 px-4 text-sm font-black text-white">Editar registro</Link>
              </div>
              <section>
                <h3 className="text-lg font-black text-slate-950">Historia do registro</h3>
                <p className="mt-2 whitespace-pre-line text-sm font-semibold leading-7 text-slate-600">{item.description || "Este item ainda nao possui descricao historica detalhada."}</p>
              </section>
              {item.attachments.length ? (
                <section>
                  <h3 className="text-lg font-black text-slate-950">Anexos e imagens</h3>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {item.attachments.map((attachment) => (
                      <a key={attachment.id} href={attachment.url} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 p-3 text-sm font-black text-slate-700 hover:border-red-200 hover:text-red-700">
                        {attachment.title ?? attachment.type}
                        <span className="mt-1 block text-xs font-semibold text-slate-500">{attachment.type}</span>
                      </a>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          </article>
          <aside className="space-y-4">
            <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="font-black text-slate-950">Informacoes</h3>
              <div className="mt-3 space-y-3">
                {archiveDetailRows(item).map(([label, value]) => (
                  <div key={label} className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2 text-sm">
                    <span className="font-black text-slate-500">{label}</span>
                    <span className="text-right font-black text-slate-900">{value}</span>
                  </div>
                ))}
              </div>
            </article>
          </aside>
        </div>
      )}
    </ArchiveChrome>
  );
}

export function ArchiveLaunchPage({ kind }: { kind: ArchiveKind }) {
  const { id: editingId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const config = configs[kind];
  const Icon = config.icon;
  const fields = useMemo(() => launchFieldsFor(kind), [kind]);
  const archiveType = archiveTypeByKind[kind];
  const returnPath = archiveNav.find((item) => item.kind === kind)?.path ?? "/memorial";
  const itemQuery = useArchiveItem(editingId);
  const editingItem = itemQuery.data;
  const isEditing = Boolean(editingId);
  const [form, setForm] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((field) => [field.label, ""]))
  );
  const [description, setDescription] = useState("");
  const [linkedEntityType, setLinkedEntityType] = useState("");
  const [linkedEntityId, setLinkedEntityId] = useState("");
  const [visibility, setVisibility] = useState("PUBLIC");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [initialAttachmentUrl, setInitialAttachmentUrl] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [fileError, setFileError] = useState("");
  const saveMutation = useMutation({
    mutationFn: async (payload: ArchiveItemPayload) => {
      const item = await apiRequest<ArchiveItem>(editingId ? `/archive-items/${editingId}` : "/archive-items", {
        method: editingId ? "PATCH" : "POST",
        body: JSON.stringify(payload)
      });
      const nextAttachmentUrl = attachmentUrl.trim();
      if (editingId && nextAttachmentUrl && nextAttachmentUrl !== initialAttachmentUrl) {
        await apiRequest(`/archive-items/${editingId}/attachments`, {
          method: "POST",
          body: JSON.stringify({
            type: nextAttachmentUrl.toLowerCase().endsWith(".pdf") ? "PDF" : "LINK",
            title: "Anexo principal",
            url: nextAttachmentUrl
          })
        });
      }
      return item;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["archive-items", archiveType] });
      if (editingId) {
        await queryClient.invalidateQueries({ queryKey: ["archive-item", editingId] });
      }
      navigate(returnPath);
    }
  });
  const deleteMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/archive-items/${editingId}`, {
        method: "DELETE"
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["archive-items", archiveType] });
      navigate(returnPath);
    }
  });

  useEffect(() => {
    if (!editingItem) return;
    const rawFields = getRawArchiveFields(editingItem);
    setForm(Object.fromEntries(fields.map((field) => [field.label, rawFields[field.label] ?? valueForField(editingItem, field.label) ?? ""])));
    setDescription(editingItem.description ?? "");
    setLinkedEntityType(editingItem.linkedEntityType ?? "");
    setLinkedEntityId(editingItem.linkedEntityId ?? "");
    setVisibility(editingItem.visibility || (editingItem.status === "DRAFT" ? "DRAFT" : "PUBLIC"));
    setCoverImageUrl(editingItem.coverImageUrl ?? "");
    const primaryAttachment = editingItem.attachments[0]?.url ?? "";
    setAttachmentUrl(primaryAttachment);
    setInitialAttachmentUrl(primaryAttachment);
  }, [editingItem, fields]);

  function fieldValue(label: string) {
    return form[label]?.trim() ?? "";
  }

  function setField(label: string, value: string) {
    setForm((current) => ({ ...current, [label]: value }));
  }

  function handleCoverFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFileError("Envie uma imagem em JPG, PNG ou WebP.");
      return;
    }
    if (file.size > 1_500_000) {
      setFileError("A imagem precisa ter ate 1,5 MB para ser salva diretamente no acervo.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCoverImageUrl(typeof reader.result === "string" ? reader.result : "");
      setFileError("");
    };
    reader.onerror = () => setFileError("Nao foi possivel ler a imagem selecionada.");
    reader.readAsDataURL(file);
  }

  function handleDelete() {
    if (!editingId) return;
    if (!window.confirm("Excluir este registro do acervo? Esta acao nao pode ser desfeita.")) return;
    void deleteMutation.mutateAsync();
  }

  function buildPayload(): ArchiveItemPayload {
    const title = fieldValue("Titulo do registro") || fieldValue("Nome do atleta") || fieldValue("Nome do homenageado") || fieldValue("Ano do marco") || config.action;
    const dateOrSeason = fieldValue("Data ou temporada") || fieldValue("Data do jogo") || fieldValue("Data da partida") || fieldValue("Temporada") || fieldValue("Ano do marco") || fieldValue("Periodo no clube");
    const yearMatch = dateOrSeason.match(/\b(18|19|20|21|22)\d{2}\b/);
    const attachment = attachmentUrl.trim()
      ? [{
          type: attachmentUrl.toLowerCase().endsWith(".pdf") ? "PDF" as const : "LINK" as const,
          title: "Anexo principal",
          url: attachmentUrl.trim()
        }]
      : [];

    return {
      type: archiveType,
      status: visibility === "DRAFT" ? "DRAFT" : visibility === "PRIVATE" ? "PRIVATE" : "PUBLISHED",
      title,
      subtitle: fieldValue("Categoria") || fieldValue("Vinculo com o clube") || fieldValue("Posicao ou funcao") || fieldValue("Tipo da camisa") || fieldValue("Tipo de patrimonio") || null,
      description: description.trim() || null,
      year: yearMatch ? Number(yearMatch[0]) : null,
      category: fieldValue("Categoria") || fieldValue("Tipo de evento") || fieldValue("Tipo de documento") || fieldValue("Tipo de premiacao") || fieldValue("Tipo de patrimonio") || fieldValue("Tipo da camisa") || fieldValue("Status") || null,
      coverImageUrl: coverImageUrl.trim() || null,
      location: fieldValue("Localizacao") || fieldValue("Local") || null,
      periodLabel: fieldValue("Periodo no clube") || fieldValue("Periodo de uso") || fieldValue("Data ou temporada") || fieldValue("Data do jogo") || fieldValue("Data da partida") || null,
      personName: fieldValue("Nome do atleta") || fieldValue("Nome do homenageado") || fieldValue("Pessoa ou equipe premiada") || null,
      personRole: fieldValue("Vinculo com o clube") || fieldValue("Posicao ou funcao") || null,
      competition: fieldValue("Competicao") || fieldValue("Competicao relacionada") || null,
      resultLabel: fieldValue("Resultado final") || null,
      scoreLabel: fieldValue("Placar da final") || fieldValue("Placar") || null,
      assetCode: fieldValue("Codigo interno") || null,
      assetCondition: fieldValue("Estado de conservacao") || null,
      documentNumber: fieldValue("Codigo interno") || fieldValue("Numero da sumula") || null,
      visibility,
      linkedEntityType: linkedEntityType || null,
      linkedEntityId: linkedEntityId || null,
      metadata: {
        rawFields: form,
        highlight: fieldValue("Destaque da partida") || null,
        historicalNumbers: fieldValue("Numeros historicos") || null,
        supplier: fieldValue("Fornecedor") || null,
        sponsor: fieldValue("Patrocinador") || null,
        responsible: fieldValue("Arbitro ou responsavel") || null,
        source: "manual_archive_form"
      },
      attachments: attachment
    };
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void saveMutation.mutateAsync(buildPayload());
  }

  if (isEditing && itemQuery.isLoading) {
    return (
      <ArchiveChrome kind={kind}>
        <article className="rounded-lg border border-slate-200 bg-white p-6 text-sm font-black text-slate-600 shadow-sm">
          Carregando registro do acervo...
        </article>
      </ArchiveChrome>
    );
  }

  if (isEditing && itemQuery.isError) {
    return (
      <ArchiveChrome kind={kind}>
        <article className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm font-black text-red-700 shadow-sm">
          Nao foi possivel carregar este registro para edicao.
        </article>
      </ArchiveChrome>
    );
  }

  return (
    <ArchiveChrome kind={kind}>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-red-50 text-red-600">
              <Icon size={22} />
            </span>
            <div>
              <h2 className="text-xl font-black text-slate-950">{isEditing ? "Editar registro do acervo" : config.action}</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">{isEditing ? "Atualize as informacoes, imagem e vinculos desse item historico." : "Cadastro interno do acervo para registros que nao nascem automaticamente nos modulos operacionais."}</p>
            </div>
          </div>

          <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              {fields.map((field) => (
                <label key={field.label} className="text-sm font-black text-slate-700">
                  {field.label}
                  <input
                    className="mt-1 h-11 rounded-lg border-slate-200 text-sm font-semibold"
                    placeholder={field.placeholder}
                    value={fieldValue(field.label)}
                    onChange={(event) => setField(field.label, event.target.value)}
                    required={field.label === "Titulo do registro" || field.label === "Nome do homenageado" || field.label === "Ano do marco"}
                  />
                </label>
              ))}
            </div>

            <label className="text-sm font-black text-slate-700">
              Descricao historica
              <textarea
                className="mt-1 min-h-32 rounded-lg border-slate-200 text-sm font-semibold"
                placeholder="Conte a importancia desse registro para a historia do clube."
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="text-sm font-black text-slate-700">
                Vincular a jogo
                <select
                  className="mt-1 h-11 rounded-lg border-slate-200 bg-white text-sm font-black"
                  value={linkedEntityType === "GAME" ? linkedEntityId : ""}
                  onChange={(event) => {
                    setLinkedEntityType(event.target.value ? "GAME" : "");
                    setLinkedEntityId(event.target.value);
                  }}
                >
                  <option value="">Nenhum jogo vinculado</option>
                  <option value="final-campeonato-municipal-2018">Final do Campeonato Municipal 2018</option>
                  <option value="campeonato-municipal-2024">Campeonato Municipal 2024</option>
                </select>
              </label>
              <label className="text-sm font-black text-slate-700">
                Vincular a pessoa
                <select
                  className="mt-1 h-11 rounded-lg border-slate-200 bg-white text-sm font-black"
                  value={linkedEntityType === "PERSON" ? linkedEntityId : ""}
                  onChange={(event) => {
                    setLinkedEntityType(event.target.value ? "PERSON" : "");
                    setLinkedEntityId(event.target.value);
                  }}
                >
                  <option value="">Nenhuma pessoa vinculada</option>
                  <option value="joao-paulo">Joao Paulo</option>
                  <option value="rafael-silva">Rafael Silva</option>
                </select>
              </label>
              <label className="text-sm font-black text-slate-700">
                Visibilidade
                <select className="mt-1 h-11 rounded-lg border-slate-200 bg-white text-sm font-black" value={visibility} onChange={(event) => setVisibility(event.target.value)}>
                  <option value="PUBLIC">Publico no acervo</option>
                  <option value="PRIVATE">Somente diretoria</option>
                  <option value="DRAFT">Rascunho</option>
                </select>
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="text-sm font-black text-slate-700">
                <span>Imagem de capa</span>
                <div className="mt-1 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <input
                    className="h-11 rounded-lg border-slate-200 text-sm font-semibold"
                    placeholder="URL da imagem ou envie um arquivo"
                    value={coverImageUrl}
                    onChange={(event) => setCoverImageUrl(event.target.value)}
                  />
                  <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-black text-white shadow-sm hover:bg-red-700">
                    <Upload size={16} />
                    Enviar imagem
                    <input className="sr-only" type="file" accept="image/*" onChange={handleCoverFile} />
                  </label>
                </div>
                <span className="mt-2 block text-xs font-semibold text-slate-500">JPG, PNG ou WebP ate 1,5 MB. O arquivo enviado preenche a capa automaticamente.</span>
                {fileError ? <span className="mt-2 block text-xs font-black text-red-600">{fileError}</span> : null}
              </div>
              <label className="text-sm font-black text-slate-700">
                Anexo principal
                <input className="mt-1 h-11 rounded-lg border-slate-200 text-sm font-semibold" placeholder="URL de PDF, foto, video ou documento" value={attachmentUrl} onChange={(event) => setAttachmentUrl(event.target.value)} />
              </label>
            </div>
            {coverImageUrl ? (
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Previa da imagem</span>
                <img src={coverImageUrl} alt="Previa da capa do acervo" className="mt-3 max-h-72 w-full rounded-lg object-contain bg-slate-100" />
              </div>
            ) : null}

            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
              {isEditing ? (
                <button type="button" disabled={deleteMutation.isPending || saveMutation.isPending} onClick={handleDelete} className="mr-auto inline-flex min-h-10 items-center rounded-lg border border-red-200 bg-white px-4 text-sm font-black text-red-700 disabled:opacity-60">
                  {deleteMutation.isPending ? "Excluindo..." : "Excluir registro"}
                </button>
              ) : null}
              <Link to={returnPath} className="inline-flex min-h-10 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-black text-slate-700">
                Cancelar
              </Link>
              <button type="submit" disabled={saveMutation.isPending || deleteMutation.isPending} className="inline-flex min-h-10 items-center rounded-lg bg-red-600 px-4 text-sm font-black text-white disabled:opacity-60">
                {saveMutation.isPending ? "Salvando..." : isEditing ? "Salvar edicao" : "Salvar no acervo"}
              </button>
            </div>
            {saveMutation.isError ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-black text-red-700">Nao foi possivel salvar o registro. Confira os campos e tente novamente.</p> : null}
            {deleteMutation.isError ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-black text-red-700">Nao foi possivel excluir o registro agora.</p> : null}
          </form>
        </article>

        <aside className="space-y-4">
          <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="font-black text-slate-950">O que entra automatico</h3>
            <div className="mt-3 space-y-3 text-sm font-semibold text-slate-600">
              <p>Jogos cadastrados alimentam jogos historicos, sumulas, linha do tempo e estatisticas.</p>
              <p>Atletas cadastrados alimentam atletas historicos, rankings e hall da fama.</p>
              <p>Mandatos, uniformes e galeria ja podem nascer ligados aos modulos existentes.</p>
            </div>
          </article>
          <article className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <h3 className="font-black text-slate-950">Cadastro interno</h3>
            <p className="mt-2 text-sm font-semibold text-slate-600">Use esta tela para registros que nao pertencem ao fluxo operacional: documentos antigos, trofeus fisicos, bens patrimoniais, homenagens e marcos historicos.</p>
          </article>
        </aside>
      </div>
    </ArchiveChrome>
  );
}

export function MemorialDashboardPage() {
  return <ArchivePage kind="dashboard" />;
}

export function MemorialJogosPage() {
  return <ArchivePage kind="games" />;
}

export function MemorialAtletasPage() {
  return <ArchivePage kind="athletes" />;
}

export function MemorialDiretoriasPage() {
  return <ArchivePage kind="directors" />;
}

export function MemorialTitulosPage() {
  return <ArchivePage kind="titles" />;
}

export function MemorialSumulasPage() {
  return <ArchivePage kind="reports" />;
}

export function MemorialLinhaTempoPage() {
  return <ArchivePage kind="timeline" />;
}

export function MemorialUniformesPage() {
  return <ArchivePage kind="shirts" />;
}

export function MemorialGalleryPage() {
  return <ArchivePage kind="gallery" />;
}

export function MemorialDocumentsPage() {
  return <ArchivePage kind="documents" />;
}

export function MemorialAwardsPage() {
  return <ArchivePage kind="awards" />;
}

export function MemorialAssetsPage() {
  return <ArchivePage kind="assets" />;
}

export function MemorialHallPage() {
  return <ArchivePage kind="hall" />;
}
