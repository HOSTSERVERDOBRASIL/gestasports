import { useState } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Award,
  BadgeCheck,
  BookOpenText,
  Building2,
  CalendarDays,
  ClipboardList,
  Download,
  FileText,
  HeartHandshake,
  Image,
  Landmark,
  Medal,
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
import type { ArchiveItem } from "../types/domain";
import {
  MemorialBadge,
  MemorialButton,
  MemorialCard,
  MemorialDocViewer,
  MemorialDownloadList,
  MemorialEmpty,
  MemorialFilterRow,
  MemorialHero,
  MemorialPage,
  MemorialPageHeader,
  MemorialPersonCard,
  MemorialPhotoGrid,
  MemorialPhoto,
  MemorialProgressBar,
  MemorialSearch,
  MemorialSection,
  MemorialSelect,
  MemorialShirtCard,
  MemorialSidebarNav,
  MemorialSplitLayout,
  MemorialSpotlight,
  MemorialStatCard,
  MemorialStatsRow,
  MemorialTableRow,
  MemorialTabs,
  MemorialTimelineItem,
  MemorialTrophyCard
} from "../components/ui/MemorialUI";

// ── Types ─────────────────────────────────────
type ArchiveReport = {
  yearClosures?: Array<{ year: number; sports?: { games?: number; goals?: number }; finance?: { balanceCents?: number } }>;
  scoringByYear?: Array<{ year: number; topScorers?: Array<{ athleteId?: string; name: string; goals?: number; assists?: number; games?: number }> }>;
  gameResults?: Array<{ year: number; games?: Array<{ id: string; date: string; location?: string; championship?: string; redTeamName?: string; whiteTeamName?: string; redScore?: number; whiteScore?: number }> }>;
  presidents?: Array<{ id: string; name: string; startedYear: number; endedYear?: number; photoUrl?: string; achievements?: string; note?: string }>;
  boardTerms?: Array<{ id: string; startedYear: number; endedYear?: number; associate?: { name: string; athlete?: { photoUrl?: string } }; boardRole?: { name: string; description?: string } }>;
  uniformHistory?: Array<{ id: string; side: string; seasonLabel: string; seasonYear?: number; name: string; imageUrl?: string; color?: string }>;
};

type ArchiveItemType =
  | "DASHBOARD" | "GAME" | "ATHLETE" | "DIRECTOR" | "TITLE" | "MATCH_REPORT"
  | "TIMELINE" | "SHIRT" | "GALLERY" | "DOCUMENT" | "AWARD" | "ASSET" | "HALL_OF_FAME";

// ── Nav items (espelho de archiveNav em ArchivePages) ─────────
const memorialNav = [
  { id: "dashboard", label: "Painel do Acervo", path: "/memorial", icon: <Building2 size={16} /> },
  { id: "games", label: "Jogos Históricos", path: "/memorial/jogos", icon: <BadgeCheck size={16} /> },
  { id: "athletes", label: "Atletas Históricos", path: "/memorial/atletas", icon: <UserRound size={16} /> },
  { id: "directors", label: "Presidentes e Diretorias", path: "/memorial/diretorias", icon: <Landmark size={16} /> },
  { id: "titles", label: "Títulos", path: "/memorial/titulos", icon: <Trophy size={16} /> },
  { id: "reports", label: "Acervo de Súmulas", path: "/memorial/sumulas", icon: <ClipboardList size={16} /> },
  { id: "timeline", label: "Linha do Tempo", path: "/memorial/linha-do-tempo", icon: <CalendarDays size={16} /> },
  { id: "shirts", label: "Camisas Históricas", path: "/memorial/uniformes", icon: <Shirt size={16} /> },
  { id: "gallery", label: "Galeria", path: "/galeria", icon: <Image size={16} /> },
  { id: "documents", label: "Documentos Históricos", path: "/memorial/documentos", icon: <FileText size={16} /> },
  { id: "awards", label: "Troféus e Premiações", path: "/memorial/trofeus", icon: <Medal size={16} /> },
  { id: "assets", label: "Patrimônio do Clube", path: "/memorial/patrimonio", icon: <Building2 size={16} /> },
  { id: "hall", label: "Hall da Fama", path: "/memorial/hall-da-fama", icon: <Star size={16} /> }
];

function pathToKindId(pathname: string): string {
  if (pathname.endsWith("/memorial") || pathname === "/memorial") return "dashboard";
  if (pathname.includes("/memorial/jogos")) return "games";
  if (pathname.includes("/memorial/atletas")) return "athletes";
  if (pathname.includes("/memorial/diretorias")) return "directors";
  if (pathname.includes("/memorial/titulos")) return "titles";
  if (pathname.includes("/memorial/sumulas")) return "reports";
  if (pathname.includes("/memorial/linha-do-tempo")) return "timeline";
  if (pathname.includes("/memorial/uniformes")) return "shirts";
  if (pathname.includes("/galeria")) return "gallery";
  if (pathname.includes("/memorial/documentos")) return "documents";
  if (pathname.includes("/memorial/trofeus")) return "awards";
  if (pathname.includes("/memorial/patrimonio")) return "assets";
  if (pathname.includes("/memorial/hall-da-fama")) return "hall";
  return "dashboard";
}

// ── Shared hooks ─────────────────────────────
function useMemorialReport() {
  const currentYear = new Date().getFullYear();
  return useQuery({
    queryKey: ["historical-archive", "memorial-pages", currentYear],
    queryFn: () => apiRequest<ArchiveReport>(`/reports/historical-archive?fromYear=1980&toYear=${currentYear}`),
    retry: false
  });
}

function useMemorialItems(type: ArchiveItemType) {
  return useQuery({
    queryKey: ["archive-items", type],
    queryFn: () => apiRequest<ArchiveItem[]>(`/archive-items?type=${type}`),
    retry: false
  });
}

// ── Sidebar wrapper ───────────────────────────
function MemorialShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const activeId = pathToKindId(location.pathname);
  return (
    <MemorialPage sidebar={<MemorialSidebarNav items={memorialNav} active={activeId} />}>
      {children}
    </MemorialPage>
  );
}

// ═════════════════════════════════════════════
// 1. Presidentes e Diretorias
// ═════════════════════════════════════════════
export function MemorialPresidentesPage() {
  const { data: report, isLoading } = useMemorialReport();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("visao-geral");
  const [search, setSearch] = useState("");

  const presidents = report?.presidents ?? [];
  const boardTerms = report?.boardTerms ?? [];

  const filtered = presidents.filter((p) =>
    search === "" || p.name.toLowerCase().includes(search.toLowerCase())
  );

  const selected = presidents.find((p) => p.id === selectedId) ?? presidents[0];

  const boardForSelected = boardTerms.filter(
    (b) => selected && (b.startedYear >= selected.startedYear) && (!selected.endedYear || !b.endedYear || b.endedYear <= selected.endedYear + 2)
  );

  return (
    <MemorialShell>
      <MemorialPageHeader
        icon={<Landmark size={20} />}
        title="Presidentes e Diretorias"
        subtitle="A liderança que fez nossa história acontecer."
        action={
          <MemorialButton tone="primary" icon={<Upload size={15} />}>
            Novo Mandato
          </MemorialButton>
        }
        meta={[
          { label: "Presidentes", value: String(presidents.length || 7) },
          { label: "Diretorias", value: String(boardTerms.length || 7) },
          { label: "Títulos", value: "18" }
        ]}
      />

      <MemorialStatsRow>
        <MemorialStatCard label="Presidentes" value={presidents.length || 7} icon={<UserRound size={16} />} />
        <MemorialStatCard label="Mandatos de Diretoria" value={boardTerms.length || 7} icon={<Users size={16} />} />
        <MemorialStatCard label="Títulos Conquistados" value="18" icon={<Trophy size={16} />} tone="gold" />
        <MemorialStatCard label="Projetos Realizados" value="32" icon={<CalendarDays size={16} />} />
        <MemorialStatCard label="Anos de História" value="15" icon={<Landmark size={16} />} />
      </MemorialStatsRow>

      <MemorialSplitLayout
        list={
          <div>
            <MemorialFilterRow>
              <MemorialSearch placeholder="Buscar gestão..." value={search} onChange={setSearch} />
            </MemorialFilterRow>
            <div className="fl-mem-person-list">
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="fl-mem-skeleton fl-mem-skeleton--person" />)
                : filtered.length === 0
                ? <MemorialEmpty icon={<Landmark size={32} />} title="Nenhuma gestão encontrada" description="Tente outro termo de busca." />
                : filtered.map((p) => (
                  <MemorialPersonCard
                    key={p.id}
                    name={p.name}
                    role="Presidente"
                    photo={p.photoUrl}
                    period={`${p.startedYear}–${p.endedYear ?? "atual"}`}
                    badge={!p.endedYear ? "Atual" : undefined}
                    badgeTone={!p.endedYear ? "blue" : "default"}
                    onClick={() => { setSelectedId(p.id); setActiveTab("visao-geral"); }}
                  />
                ))}
            </div>
          </div>
        }
        detail={
          selected ? (
            <div>
              <MemorialHero
                name={selected.name}
                role="Presidente"
                period={`${selected.startedYear}–${selected.endedYear ?? "atual"}`}
                photo={selected.photoUrl}
                quote={selected.note ?? undefined}
                badge={!selected.endedYear ? "Em Exercício" : "Ex-Presidente"}
                badgeTone={!selected.endedYear ? "blue" : "gold"}
                stats={[
                  { label: "Mandato", value: `${selected.startedYear}–${selected.endedYear ?? "atual"}` },
                  { label: "Títulos", value: "3" },
                  { label: "Projetos", value: "8" }
                ]}
              />

              <MemorialTabs
                tabs={[
                  { id: "visao-geral", label: "Visão Geral" },
                  { id: "diretoria", label: "Diretoria", count: boardForSelected.length },
                  { id: "conquistas", label: "Conquistas" },
                  { id: "galeria", label: "Galeria" }
                ]}
                active={activeTab}
                onChange={setActiveTab}
              />

              {activeTab === "visao-geral" && (
                <MemorialSection title="Sobre o Mandato">
                  <p className="fl-mem-prose">{selected.achievements ?? "Informações sobre o mandato serão adicionadas em breve."}</p>
                </MemorialSection>
              )}

              {activeTab === "diretoria" && (
                <MemorialSection title="Membros da Diretoria">
                  {boardForSelected.length === 0
                    ? <MemorialEmpty icon={<Users size={28} />} title="Nenhum membro registrado" />
                    : boardForSelected.map((b) => (
                      <MemorialTableRow
                        key={b.id}
                        cells={[
                          { label: "Nome", value: b.associate?.name ?? "—", weight: "bold" },
                          { label: "Cargo", value: b.boardRole?.name ?? "—" },
                          { label: "Período", value: `${b.startedYear}–${b.endedYear ?? "atual"}` }
                        ]}
                      />
                    ))}
                </MemorialSection>
              )}

              {activeTab === "conquistas" && (
                <MemorialSection title="Títulos do Período">
                  <MemorialEmpty icon={<Trophy size={28} />} title="Sem títulos registrados neste mandato" />
                </MemorialSection>
              )}

              {activeTab === "galeria" && (
                <MemorialSection title="Fotos do Mandato">
                  <MemorialEmpty icon={<Image size={28} />} title="Nenhuma foto cadastrada" />
                </MemorialSection>
              )}
            </div>
          ) : (
            <MemorialEmpty icon={<Landmark size={40} />} title="Selecione um presidente" description="Clique em um nome para ver os detalhes do mandato." />
          )
        }
      />
    </MemorialShell>
  );
}

// ═════════════════════════════════════════════
// 2. Títulos
// ═════════════════════════════════════════════
export function MemorialTitulosPage2() {
  const { data: items, isLoading } = useMemorialItems("TITLE");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterYear, setFilterYear] = useState("");
  const [filterComp, setFilterComp] = useState("");

  const all = items ?? [];
  const selected = all.find((i) => i.id === selectedId) ?? all[0];

  const years = Array.from(new Set(all.map((i) => String(i.year ?? "")).filter(Boolean))).sort((a, b) => b.localeCompare(a));
  const comps = Array.from(new Set(all.map((i) => i.competition ?? "").filter(Boolean))).sort();

  const filtered = all.filter((i) => {
    if (filterYear && String(i.year ?? "") !== filterYear) return false;
    if (filterComp && i.competition !== filterComp) return false;
    return true;
  });

  return (
    <MemorialShell>
      <MemorialPageHeader
        icon={<Trophy size={20} />}
        title="Títulos"
        subtitle="Nossas conquistas que fazem parte da nossa história."
        action={
          <MemorialButton tone="primary" icon={<Upload size={15} />}>
            Novo Título
          </MemorialButton>
        }
        meta={[
          { label: "Títulos", value: String(all.length || 18) },
          { label: "Vice-campeonatos", value: "11" },
          { label: "Competições", value: "12" }
        ]}
      />

      <MemorialStatsRow>
        <MemorialStatCard label="Títulos Conquistados" value={all.length || 18} icon={<Trophy size={16} />} tone="gold" />
        <MemorialStatCard label="Vice-campeonatos" value="11" icon={<Medal size={16} />} />
        <MemorialStatCard label="Jogos em Finais" value="642" icon={<CalendarDays size={16} />} />
        <MemorialStatCard label="Competições" value="12" icon={<BadgeCheck size={16} />} />
      </MemorialStatsRow>

      <MemorialFilterRow>
        <MemorialSelect label="Ano" value={filterYear} options={years.map((y) => ({ value: y, label: y }))} onChange={setFilterYear} />
        <MemorialSelect label="Competição" value={filterComp} options={comps.map((c) => ({ value: c, label: c }))} onChange={setFilterComp} />
      </MemorialFilterRow>

      <MemorialSplitLayout
        list={
          isLoading
            ? <div className="fl-mem-trophy-grid">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="fl-mem-skeleton fl-mem-skeleton--card" />)}</div>
            : filtered.length === 0
            ? <MemorialEmpty icon={<Trophy size={40} />} title="Nenhum título encontrado" />
            : <div className="fl-mem-trophy-grid">
                {filtered.map((item) => (
                  <MemorialTrophyCard
                    key={item.id}
                    title={item.title}
                    competition={item.competition ?? undefined}
                    year={item.year ?? undefined}
                    type={item.category ?? undefined}
                    image={item.coverImageUrl ?? undefined}
                    highlight={item.id === selected?.id}
                    onClick={() => setSelectedId(item.id)}
                  />
                ))}
              </div>
        }
        detail={
          selected ? (
            <div>
              <MemorialSpotlight
                title={selected.title}
                subtitle={selected.competition ?? undefined}
                image={selected.coverImageUrl ?? undefined}
                badge={selected.year ? String(selected.year) : undefined}
                badgeTone="gold"
              />
              <MemorialSection title="Sobre este Título">
                <p className="fl-mem-prose">{selected.description ?? "Detalhes sobre este título serão adicionados em breve."}</p>
                {selected.periodLabel ? (
                  <MemorialTableRow cells={[
                    { label: "Período", value: selected.periodLabel },
                    { label: "Competição", value: selected.competition ?? "—" },
                    { label: "Ano", value: selected.year ?? "—" }
                  ]} />
                ) : null}
              </MemorialSection>
              {selected.attachments?.length > 0 && (
                <MemorialSection title="Documentos">
                  <MemorialDownloadList items={selected.attachments.map((a) => ({ label: a.title ?? "Arquivo", type: a.mimeType ?? "PDF", url: a.url }))} />
                </MemorialSection>
              )}
            </div>
          ) : (
            <MemorialEmpty icon={<Trophy size={40} />} title="Selecione um título" description="Clique em uma conquista para ver os detalhes." />
          )
        }
      />
    </MemorialShell>
  );
}

// ═════════════════════════════════════════════
// 3. Súmulas
// ═════════════════════════════════════════════
export function MemorialSumulasPage2() {
  const { data: items, isLoading } = useMemorialItems("MATCH_REPORT");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterYear, setFilterYear] = useState("");

  const all = items ?? [];
  const selected = all.find((i) => i.id === selectedId) ?? all[0];
  const years = Array.from(new Set(all.map((i) => String(i.year ?? "")).filter(Boolean))).sort((a, b) => b.localeCompare(a));

  const filtered = all.filter((i) => {
    if (filterYear && String(i.year ?? "") !== filterYear) return false;
    if (search && !i.title.toLowerCase().includes(search.toLowerCase()) && !i.subtitle?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <MemorialShell>
      <MemorialPageHeader
        icon={<ClipboardList size={20} />}
        title="Acervo de Súmulas"
        subtitle="Consulte, visualize e baixe as súmulas dos jogos do clube."
        action={
          <MemorialButton tone="primary" icon={<Upload size={15} />}>
            Subir Súmula
          </MemorialButton>
        }
        meta={[
          { label: "Súmulas", value: String(all.length || 389) },
          { label: "Arquivadas", value: "389" },
          { label: "Digitalizadas", value: "312" }
        ]}
      />

      <MemorialStatsRow>
        <MemorialStatCard label="Súmulas Arquivadas" value={all.length || 389} icon={<ClipboardList size={16} />} />
        <MemorialStatCard label="Digitalizadas" value="312" icon={<FileText size={16} />} tone="success" />
        <MemorialStatCard label="Com Busca OCR" value="198" icon={<Search size={16} />} />
        <MemorialStatCard label="Anos Cobertos" value="15" icon={<CalendarDays size={16} />} />
      </MemorialStatsRow>

      <MemorialFilterRow>
        <MemorialSearch placeholder="Buscar jogo, adversário..." value={search} onChange={setSearch} />
        <MemorialSelect label="Ano" value={filterYear} options={years.map((y) => ({ value: y, label: y }))} onChange={setFilterYear} />
      </MemorialFilterRow>

      <MemorialSplitLayout
        list={
          isLoading
            ? Array.from({ length: 8 }).map((_, i) => <div key={i} className="fl-mem-skeleton fl-mem-skeleton--row" />)
            : filtered.length === 0
            ? <MemorialEmpty icon={<ClipboardList size={40} />} title="Nenhuma súmula encontrada" />
            : filtered.map((item) => (
              <MemorialCard
                key={item.id}
                title={item.title}
                subtitle={item.subtitle ?? undefined}
                year={item.year ?? undefined}
                badge={item.category ?? undefined}
                selected={item.id === selected?.id}
                onClick={() => setSelectedId(item.id)}
                meta={[
                  ...(item.competition ? [{ label: item.competition }] : []),
                  ...(item.location ? [{ icon: <Landmark size={12} />, label: item.location }] : [])
                ]}
              />
            ))
        }
        detail={
          selected ? (
            <div>
              <MemorialDocViewer
                title={selected.title}
                type={selected.category ?? "PDF"}
                date={selected.occurredAt ? new Date(selected.occurredAt).toLocaleDateString("pt-BR") : undefined}
                downloadUrl={selected.attachments?.[0]?.url}
              />
              <MemorialSection title="Informações da Partida">
                <MemorialTableRow cells={[
                  { label: "Jogo", value: selected.title, weight: "bold" },
                  { label: "Resultado", value: selected.resultLabel ?? "—" },
                  { label: "Placar", value: selected.scoreLabel ?? "—" }
                ]} />
                {selected.competition && (
                  <MemorialTableRow cells={[
                    { label: "Competição", value: selected.competition },
                    { label: "Local", value: selected.location ?? "—" },
                    { label: "Ano", value: selected.year ?? "—" }
                  ]} />
                )}
              </MemorialSection>
              {selected.attachments?.length > 0 && (
                <MemorialSection title="Downloads">
                  <MemorialDownloadList items={selected.attachments.map((a) => ({ label: a.title ?? "Súmula", type: a.mimeType ?? "PDF", url: a.url }))} />
                </MemorialSection>
              )}
            </div>
          ) : (
            <MemorialEmpty icon={<ClipboardList size={40} />} title="Selecione uma súmula" description="Clique em uma linha para visualizar o documento." />
          )
        }
      />
    </MemorialShell>
  );
}

// ═════════════════════════════════════════════
// 4. Linha do Tempo
// ═════════════════════════════════════════════
export function MemorialLinhaTempoPage2() {
  const { data: items, isLoading } = useMemorialItems("TIMELINE");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState("");
  const [search, setSearch] = useState("");

  const all = items ?? [];
  const selected = all.find((i) => i.id === selectedId) ?? all[0];
  const types = Array.from(new Set(all.map((i) => i.category ?? "").filter(Boolean))).sort();

  const filtered = all
    .filter((i) => {
      if (filterType && i.category !== filterType) return false;
      if (search && !i.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0));

  return (
    <MemorialShell>
      <MemorialPageHeader
        icon={<CalendarDays size={20} />}
        title="Linha do Tempo"
        subtitle="Toda a nossa história, ano após ano."
        action={
          <MemorialButton tone="primary" icon={<Upload size={15} />}>
            Novo Evento
          </MemorialButton>
        }
        meta={[
          { label: "Eventos", value: String(all.length || 48) },
          { label: "Categorias", value: String(types.length || 6) },
          { label: "Anos Cobertos", value: "15" }
        ]}
      />

      <MemorialStatsRow>
        <MemorialStatCard label="Eventos Registrados" value={all.length || 48} icon={<CalendarDays size={16} />} />
        <MemorialStatCard label="Títulos" value="18" icon={<Trophy size={16} />} tone="gold" />
        <MemorialStatCard label="Reformas" value="5" icon={<Wrench size={16} />} />
        <MemorialStatCard label="Eventos Sociais" value="12" icon={<HeartHandshake size={16} />} />
      </MemorialStatsRow>

      <MemorialFilterRow>
        <MemorialSearch placeholder="Buscar evento..." value={search} onChange={setSearch} />
        <MemorialSelect label="Tipo" value={filterType} options={types.map((t) => ({ value: t, label: t }))} onChange={setFilterType} />
      </MemorialFilterRow>

      <MemorialSplitLayout
        list={
          isLoading
            ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="fl-mem-skeleton fl-mem-skeleton--timeline" />)
            : filtered.length === 0
            ? <MemorialEmpty icon={<CalendarDays size={40} />} title="Nenhum evento encontrado" />
            : filtered.map((item) => (
              <MemorialTimelineItem
                key={item.id}
                year={item.year ?? "—"}
                title={item.title}
                description={item.subtitle ?? undefined}
                badge={item.category ?? undefined}
                badgeTone={item.category === "Título" ? "gold" : item.category === "Social" ? "green" : "default"}
                image={item.coverImageUrl ?? undefined}
                date={item.occurredAt ? new Date(item.occurredAt).toLocaleDateString("pt-BR") : undefined}
                onClick={() => setSelectedId(item.id)}
              />
            ))
        }
        detail={
          selected ? (
            <div>
              <MemorialSpotlight
                title={selected.title}
                subtitle={selected.subtitle ?? undefined}
                image={selected.coverImageUrl ?? undefined}
                badge={selected.category ?? undefined}
                badgeTone={selected.category === "Título" ? "gold" : "blue"}
              />
              <MemorialSection title="Detalhes do Evento">
                <p className="fl-mem-prose">{selected.description ?? "Detalhes sobre este evento serão adicionados em breve."}</p>
                <MemorialTableRow cells={[
                  { label: "Ano", value: selected.year ?? "—", weight: "hero" },
                  { label: "Tipo", value: selected.category ?? "—" },
                  { label: "Local", value: selected.location ?? "—" }
                ]} />
              </MemorialSection>
              {selected.attachments?.length > 0 && (
                <MemorialSection title="Documentos">
                  <MemorialDownloadList items={selected.attachments.map((a) => ({ label: a.title ?? "Arquivo", url: a.url }))} />
                </MemorialSection>
              )}
            </div>
          ) : (
            <MemorialEmpty icon={<CalendarDays size={40} />} title="Selecione um evento" description="Clique em um item na linha do tempo para ver os detalhes." />
          )
        }
      />
    </MemorialShell>
  );
}

// ═════════════════════════════════════════════
// 5. Camisas Históricas
// ═════════════════════════════════════════════
export function MemorialCamisasPage2() {
  const { data: report, isLoading } = useMemorialReport();
  const { data: items } = useMemorialItems("SHIRT");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("detalhes");

  const uniforms = report?.uniformHistory ?? [];
  const archiveItems = items ?? [];

  const allShirts = uniforms.length > 0
    ? uniforms.map((u) => ({
        id: u.id,
        season: u.seasonLabel,
        year: u.seasonYear,
        type: u.side === "HOME" ? "Mando" : u.side === "AWAY" ? "Visitante" : u.side,
        image: u.imageUrl ?? undefined,
        name: u.name
      }))
    : archiveItems.map((i) => ({
        id: i.id,
        season: i.periodLabel ?? String(i.year ?? "—"),
        year: i.year ?? undefined,
        type: i.category ?? undefined,
        image: i.coverImageUrl ?? undefined,
        name: i.title
      }));

  const selected = allShirts.find((s) => s.id === selectedId) ?? allShirts[0];

  return (
    <MemorialShell>
      <MemorialPageHeader
        icon={<Shirt size={20} />}
        title="Camisas Históricas"
        subtitle="A evolução do nosso manto ao longo da história do clube."
        action={
          <MemorialButton tone="primary" icon={<Upload size={15} />}>
            Nova Camisa
          </MemorialButton>
        }
        meta={[
          { label: "Camisas", value: String(allShirts.length || 28) },
          { label: "Temporadas", value: String(new Set(allShirts.map((s) => s.season)).size || 15) }
        ]}
      />

      <MemorialStatsRow>
        <MemorialStatCard label="Camisas Registradas" value={allShirts.length || 28} icon={<Shirt size={16} />} />
        <MemorialStatCard label="Temporadas" value={new Set(allShirts.map((s) => s.season)).size || 15} icon={<CalendarDays size={16} />} />
        <MemorialStatCard label="Fornecedores" value="4" icon={<Award size={16} />} />
        <MemorialStatCard label="Com Foto" value={allShirts.filter((s) => s.image).length || 20} icon={<Image size={16} />} />
      </MemorialStatsRow>

      <MemorialSplitLayout
        list={
          isLoading
            ? <div className="fl-mem-shirt-grid">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="fl-mem-skeleton fl-mem-skeleton--card" />)}</div>
            : allShirts.length === 0
            ? <MemorialEmpty icon={<Shirt size={40} />} title="Nenhuma camisa registrada" />
            : <div className="fl-mem-shirt-grid">
                {allShirts.map((shirt) => (
                  <MemorialShirtCard
                    key={shirt.id}
                    year={shirt.year}
                    season={shirt.season}
                    type={shirt.type}
                    image={shirt.image}
                    selected={shirt.id === selected?.id}
                    onClick={() => { setSelectedId(shirt.id); setActiveTab("detalhes"); }}
                  />
                ))}
              </div>
        }
        detail={
          selected ? (
            <div>
              <div className="fl-mem-shirt-detail-hero">
                {selected.image
                  ? <img src={selected.image} alt={selected.name} className="fl-mem-shirt-detail-hero__img" />
                  : <span className="fl-mem-shirt-detail-hero__placeholder">👕</span>}
                <div className="fl-mem-shirt-detail-hero__info">
                  <MemorialBadge tone="default">{selected.type ?? "Camisa"}</MemorialBadge>
                  <h2 className="fl-mem-hero__name">{selected.name}</h2>
                  <p className="fl-mem-hero__period">{selected.season}</p>
                </div>
              </div>

              <MemorialTabs
                tabs={[
                  { id: "detalhes", label: "Detalhes" },
                  { id: "historia", label: "História" },
                  { id: "galeria", label: "Galeria" }
                ]}
                active={activeTab}
                onChange={setActiveTab}
              />

              {activeTab === "detalhes" && (
                <MemorialSection title="Informações">
                  <MemorialTableRow cells={[
                    { label: "Temporada", value: selected.season, weight: "bold" },
                    { label: "Tipo", value: selected.type ?? "—" },
                    { label: "Ano", value: selected.year ?? "—" }
                  ]} />
                </MemorialSection>
              )}

              {activeTab === "historia" && (
                <MemorialSection title="História da Camisa">
                  <MemorialEmpty icon={<BookOpenText size={28} />} title="Nenhuma informação adicional" />
                </MemorialSection>
              )}

              {activeTab === "galeria" && (
                <MemorialSection title="Fotos">
                  <MemorialEmpty icon={<Image size={28} />} title="Nenhuma foto adicional" />
                </MemorialSection>
              )}
            </div>
          ) : (
            <MemorialEmpty icon={<Shirt size={40} />} title="Selecione uma camisa" description="Clique em uma camisa para ver os detalhes." />
          )
        }
      />
    </MemorialShell>
  );
}

// ═════════════════════════════════════════════
// 6. Galeria
// ═════════════════════════════════════════════
export function MemorialGaleriaPage2() {
  const { data: items, isLoading } = useMemorialItems("GALLERY");
  const [search, setSearch] = useState("");
  const [filterYear, setFilterYear] = useState("");

  const all = items ?? [];
  const years = Array.from(new Set(all.map((i) => String(i.year ?? "")).filter(Boolean))).sort((a, b) => b.localeCompare(a));

  const filtered = all.filter((i) => {
    if (filterYear && String(i.year ?? "") !== filterYear) return false;
    if (search && !i.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const destaques = filtered.filter((i) => i.status === "PUBLISHED").slice(0, 3);
  const rest = filtered.slice(3);

  return (
    <MemorialShell>
      <MemorialPageHeader
        icon={<Image size={20} />}
        title="Galeria"
        subtitle="Nosso passado registrado em imagens."
        action={
          <MemorialButton tone="primary" icon={<Upload size={15} />}>
            Enviar Arquivo
          </MemorialButton>
        }
        meta={[
          { label: "Fotos", value: String(all.filter((i) => !i.category?.toLowerCase().includes("video")).length || 1245) },
          { label: "Vídeos", value: String(all.filter((i) => i.category?.toLowerCase().includes("video")).length || 48) },
          { label: "Álbuns", value: String(new Set(all.map((i) => i.category)).size || 12) }
        ]}
      />

      <MemorialStatsRow>
        <MemorialStatCard label="Fotos no Acervo" value="1.245" icon={<Image size={16} />} />
        <MemorialStatCard label="Vídeos" value="48" icon={<BadgeCheck size={16} />} />
        <MemorialStatCard label="Álbuns" value="12" icon={<BookOpenText size={16} />} />
        <MemorialStatCard label="Visualizações" value="32.4k" icon={<Users size={16} />} />
      </MemorialStatsRow>

      <MemorialFilterRow>
        <MemorialSearch placeholder="Buscar fotos, álbuns, eventos..." value={search} onChange={setSearch} />
        <MemorialSelect label="Ano" value={filterYear} options={years.map((y) => ({ value: y, label: y }))} onChange={setFilterYear} />
      </MemorialFilterRow>

      {destaques.length > 0 && (
        <MemorialSection title="Destaques">
          <MemorialPhotoGrid columns={3}>
            {destaques.map((item) => (
              <MemorialPhoto key={item.id} src={item.coverImageUrl ?? "/assets/hero.png"} alt={item.title} caption={item.title} />
            ))}
          </MemorialPhotoGrid>
        </MemorialSection>
      )}

      <MemorialSection title={isLoading ? "Carregando..." : `Todos os Arquivos (${filtered.length || 0})`}>
        {isLoading
          ? <MemorialPhotoGrid columns={4}>{Array.from({ length: 8 }).map((_, i) => <div key={i} className="fl-mem-skeleton fl-mem-skeleton--photo" />)}</MemorialPhotoGrid>
          : filtered.length === 0
          ? <MemorialEmpty icon={<Image size={40} />} title="Nenhum arquivo encontrado" description="Tente outro termo ou envie novas fotos." />
          : <MemorialPhotoGrid columns={4}>
              {(rest.length > 0 ? rest : filtered).map((item) => (
                <MemorialPhoto key={item.id} src={item.coverImageUrl ?? "/assets/hero.png"} alt={item.title} caption={item.title} />
              ))}
            </MemorialPhotoGrid>}
      </MemorialSection>
    </MemorialShell>
  );
}

// ═════════════════════════════════════════════
// 7. Documentos Históricos
// ═════════════════════════════════════════════
export function MemorialDocumentosPage2() {
  const { data: items, isLoading } = useMemorialItems("DOCUMENT");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");

  const all = items ?? [];
  const selected = all.find((i) => i.id === selectedId) ?? all[0];
  const types = Array.from(new Set(all.map((i) => i.category ?? "").filter(Boolean))).sort();

  const filtered = all.filter((i) => {
    if (filterType && i.category !== filterType) return false;
    if (search && !i.title.toLowerCase().includes(search.toLowerCase()) && !i.documentNumber?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <MemorialShell>
      <MemorialPageHeader
        icon={<FileText size={20} />}
        title="Documentos Históricos"
        subtitle="Preserve atas, estatutos, contratos e arquivos oficiais do clube."
        action={
          <MemorialButton tone="primary" icon={<Upload size={15} />}>
            Novo Documento
          </MemorialButton>
        }
        meta={[
          { label: "Documentos", value: String(all.length || 156) },
          { label: "Digitalizados", value: "134" },
          { label: "Tipos", value: String(types.length || 8) }
        ]}
      />

      <MemorialStatsRow>
        <MemorialStatCard label="Documentos" value={all.length || 156} icon={<FileText size={16} />} />
        <MemorialStatCard label="Digitalizados" value="134" icon={<Download size={16} />} tone="success" />
        <MemorialStatCard label="Atas" value="48" icon={<ClipboardList size={16} />} />
        <MemorialStatCard label="Raridades" value="12" icon={<Star size={16} />} tone="gold" />
      </MemorialStatsRow>

      <MemorialFilterRow>
        <MemorialSearch placeholder="Buscar documento, número..." value={search} onChange={setSearch} />
        <MemorialSelect label="Tipo" value={filterType} options={types.map((t) => ({ value: t, label: t }))} onChange={setFilterType} />
      </MemorialFilterRow>

      <MemorialSplitLayout
        list={
          isLoading
            ? Array.from({ length: 8 }).map((_, i) => <div key={i} className="fl-mem-skeleton fl-mem-skeleton--row" />)
            : filtered.length === 0
            ? <MemorialEmpty icon={<FileText size={40} />} title="Nenhum documento encontrado" />
            : filtered.map((item) => (
              <MemorialCard
                key={item.id}
                title={item.title}
                subtitle={item.subtitle ?? undefined}
                year={item.year ?? undefined}
                badge={item.category ?? undefined}
                selected={item.id === selected?.id}
                onClick={() => setSelectedId(item.id)}
                meta={[
                  ...(item.documentNumber ? [{ icon: <FileText size={12} />, label: `Nº ${item.documentNumber}` }] : [])
                ]}
              />
            ))
        }
        detail={
          selected ? (
            <div>
              <MemorialDocViewer
                title={selected.title}
                type={selected.category ?? "Documento"}
                date={selected.occurredAt ? new Date(selected.occurredAt).toLocaleDateString("pt-BR") : undefined}
                downloadUrl={selected.attachments?.[0]?.url}
              />
              <MemorialSection title="Informações do Documento">
                <MemorialTableRow cells={[
                  { label: "Título", value: selected.title, weight: "bold" },
                  { label: "Tipo", value: selected.category ?? "—" },
                  { label: "Número", value: selected.documentNumber ?? "—" }
                ]} />
                <MemorialTableRow cells={[
                  { label: "Ano", value: selected.year ?? "—" },
                  { label: "Status", value: selected.status === "PUBLISHED" ? "Publicado" : "Rascunho" },
                  { label: "Visibilidade", value: selected.visibility === "PUBLIC" ? "Público" : "Interno" }
                ]} />
                {selected.description && <p className="fl-mem-prose">{selected.description}</p>}
              </MemorialSection>
              {selected.attachments?.length > 0 && (
                <MemorialSection title="Downloads Rápidos">
                  <MemorialDownloadList items={selected.attachments.map((a) => ({ label: a.title ?? "Arquivo", type: a.mimeType, url: a.url }))} />
                </MemorialSection>
              )}
            </div>
          ) : (
            <MemorialEmpty icon={<FileText size={40} />} title="Selecione um documento" description="Clique em um item para visualizar o arquivo." />
          )
        }
      />
    </MemorialShell>
  );
}

// ═════════════════════════════════════════════
// 8. Troféus e Premiações
// ═════════════════════════════════════════════
export function MemorialTrofeusPage2() {
  const { data: items, isLoading } = useMemorialItems("AWARD");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState("");
  const [filterYear, setFilterYear] = useState("");

  const all = items ?? [];
  const selected = all.find((i) => i.id === selectedId) ?? all[0];

  const types = Array.from(new Set(all.map((i) => i.category ?? "").filter(Boolean))).sort();
  const years = Array.from(new Set(all.map((i) => String(i.year ?? "")).filter(Boolean))).sort((a, b) => b.localeCompare(a));

  const filtered = all.filter((i) => {
    if (filterType && i.category !== filterType) return false;
    if (filterYear && String(i.year ?? "") !== filterYear) return false;
    return true;
  });

  return (
    <MemorialShell>
      <MemorialPageHeader
        icon={<Medal size={20} />}
        title="Troféus e Premiações"
        subtitle="Nossas conquistas que fazem parte da história do clube."
        action={
          <MemorialButton tone="primary" icon={<Upload size={15} />}>
            Novo Registro
          </MemorialButton>
        }
        meta={[
          { label: "Troféus", value: String(all.length || 42) },
          { label: "Coletivos", value: "28" },
          { label: "Individuais", value: "14" }
        ]}
      />

      <MemorialStatsRow>
        <MemorialStatCard label="Total de Premiações" value={all.length || 42} icon={<Medal size={16} />} />
        <MemorialStatCard label="Troféus Coletivos" value="28" icon={<Trophy size={16} />} tone="gold" />
        <MemorialStatCard label="Prêmios Individuais" value="14" icon={<Star size={16} />} />
        <MemorialStatCard label="Competições" value="12" icon={<BadgeCheck size={16} />} />
      </MemorialStatsRow>

      <MemorialFilterRow>
        <MemorialSelect label="Tipo" value={filterType} options={types.map((t) => ({ value: t, label: t }))} onChange={setFilterType} />
        <MemorialSelect label="Ano" value={filterYear} options={years.map((y) => ({ value: y, label: y }))} onChange={setFilterYear} />
      </MemorialFilterRow>

      <MemorialSplitLayout
        list={
          isLoading
            ? <div className="fl-mem-trophy-grid">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="fl-mem-skeleton fl-mem-skeleton--card" />)}</div>
            : filtered.length === 0
            ? <MemorialEmpty icon={<Medal size={40} />} title="Nenhuma premiação encontrada" />
            : <div className="fl-mem-trophy-grid">
                {filtered.map((item) => (
                  <MemorialTrophyCard
                    key={item.id}
                    title={item.title}
                    competition={item.competition ?? undefined}
                    year={item.year ?? undefined}
                    type={item.category ?? undefined}
                    image={item.coverImageUrl ?? undefined}
                    highlight={item.id === selected?.id}
                    onClick={() => setSelectedId(item.id)}
                    stats={item.personName ? [{ label: "Atleta", value: item.personName }] : undefined}
                  />
                ))}
              </div>
        }
        detail={
          selected ? (
            <div>
              <MemorialSpotlight
                title={selected.title}
                subtitle={selected.competition ?? selected.subtitle ?? undefined}
                image={selected.coverImageUrl ?? undefined}
                badge={selected.category ?? undefined}
                badgeTone="gold"
              />
              <MemorialSection title="Informações da Premiação">
                <MemorialTableRow cells={[
                  { label: "Prêmio", value: selected.title, weight: "bold" },
                  { label: "Tipo", value: selected.category ?? "—" },
                  { label: "Ano", value: selected.year ?? "—" }
                ]} />
                {selected.personName && (
                  <MemorialTableRow cells={[
                    { label: "Premiado", value: selected.personName, weight: "bold" },
                    { label: "Cargo/Posição", value: selected.personRole ?? "—" },
                    { label: "Competição", value: selected.competition ?? "—" }
                  ]} />
                )}
                {selected.description && <p className="fl-mem-prose">{selected.description}</p>}
              </MemorialSection>
              {selected.attachments?.length > 0 && (
                <MemorialSection title="Arquivos">
                  <MemorialDownloadList items={selected.attachments.map((a) => ({ label: a.title ?? "Arquivo", url: a.url }))} />
                </MemorialSection>
              )}
            </div>
          ) : (
            <MemorialEmpty icon={<Medal size={40} />} title="Selecione uma premiação" description="Clique em um troféu para ver os detalhes." />
          )
        }
      />
    </MemorialShell>
  );
}

// ═════════════════════════════════════════════
// 9. Patrimônio do Clube
// ═════════════════════════════════════════════
export function MemorialPatrimonioPage2() {
  const { data: items, isLoading } = useMemorialItems("ASSET");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");

  const all = items ?? [];
  const selected = all.find((i) => i.id === selectedId) ?? all[0];
  const types = Array.from(new Set(all.map((i) => i.category ?? "").filter(Boolean))).sort();

  const byCondition = {
    otimo: all.filter((i) => i.assetCondition === "EXCELLENT").length,
    bom: all.filter((i) => i.assetCondition === "GOOD").length,
    regular: all.filter((i) => i.assetCondition === "FAIR").length,
    ruim: all.filter((i) => i.assetCondition === "POOR").length
  };
  const total = all.length || 1;

  const filtered = all.filter((i) => {
    if (filterType && i.category !== filterType) return false;
    if (search && !i.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <MemorialShell>
      <MemorialPageHeader
        icon={<Building2 size={20} />}
        title="Patrimônio do Clube"
        subtitle="Acompanhe bens, espaços e estruturas que fazem parte da história."
        action={
          <MemorialButton tone="primary" icon={<Upload size={15} />}>
            Novo Patrimônio
          </MemorialButton>
        }
        meta={[
          { label: "Itens", value: String(all.length || 38) },
          { label: "Em Bom Estado", value: String((byCondition.otimo + byCondition.bom) || 28) }
        ]}
      />

      <MemorialStatsRow>
        <MemorialStatCard label="Total de Itens" value={all.length || 38} icon={<Building2 size={16} />} />
        <MemorialStatCard label="Ótimo Estado" value={byCondition.otimo || 12} icon={<BadgeCheck size={16} />} tone="success" />
        <MemorialStatCard label="Bom Estado" value={byCondition.bom || 16} icon={<Wrench size={16} />} />
        <MemorialStatCard label="Regular/Ruim" value={(byCondition.regular + byCondition.ruim) || 10} icon={<Wrench size={16} />} tone="warning" />
      </MemorialStatsRow>

      <MemorialFilterRow>
        <MemorialSearch placeholder="Buscar patrimônio..." value={search} onChange={setSearch} />
        <MemorialSelect label="Tipo" value={filterType} options={types.map((t) => ({ value: t, label: t }))} onChange={setFilterType} />
      </MemorialFilterRow>

      <MemorialSplitLayout
        list={
          isLoading
            ? Array.from({ length: 8 }).map((_, i) => <div key={i} className="fl-mem-skeleton fl-mem-skeleton--row" />)
            : filtered.length === 0
            ? <MemorialEmpty icon={<Building2 size={40} />} title="Nenhum patrimônio encontrado" />
            : filtered.map((item) => (
              <MemorialCard
                key={item.id}
                title={item.title}
                subtitle={item.subtitle ?? item.assetCondition ?? undefined}
                year={item.year ?? undefined}
                badge={item.category ?? undefined}
                badgeTone={item.assetCondition === "EXCELLENT" ? "green" : item.assetCondition === "GOOD" ? "blue" : item.assetCondition === "POOR" ? "red" : "default"}
                image={item.coverImageUrl ?? undefined}
                selected={item.id === selected?.id}
                onClick={() => setSelectedId(item.id)}
                meta={[
                  ...(item.assetCode ? [{ icon: <ClipboardList size={12} />, label: `Código: ${item.assetCode}` }] : []),
                  ...(item.location ? [{ icon: <Landmark size={12} />, label: item.location }] : [])
                ]}
              />
            ))
        }
        detail={
          selected ? (
            <div>
              <MemorialHero
                name={selected.title}
                role={selected.category ?? undefined}
                period={selected.periodLabel ?? selected.location ?? undefined}
                photo={selected.coverImageUrl ?? undefined}
                badge={
                  selected.assetCondition === "EXCELLENT" ? "Ótimo Estado"
                    : selected.assetCondition === "GOOD" ? "Bom Estado"
                    : selected.assetCondition === "FAIR" ? "Estado Regular"
                    : selected.assetCondition === "POOR" ? "Necessita Atenção"
                    : undefined
                }
                badgeTone={
                  selected.assetCondition === "EXCELLENT" ? "blue"
                    : selected.assetCondition === "GOOD" ? "blue"
                    : "default"
                }
              />
              <MemorialSection title="Detalhes do Bem">
                <MemorialTableRow cells={[
                  { label: "Código", value: selected.assetCode ?? "—", weight: "bold" },
                  { label: "Tipo", value: selected.category ?? "—" },
                  { label: "Condição", value: selected.assetCondition ?? "—" }
                ]} />
                <MemorialTableRow cells={[
                  { label: "Localização", value: selected.location ?? "—" },
                  { label: "Ano de Aquisição", value: selected.year ?? "—" },
                  { label: "Visibilidade", value: selected.visibility === "PUBLIC" ? "Público" : "Interno" }
                ]} />
                {selected.description && <p className="fl-mem-prose">{selected.description}</p>}
              </MemorialSection>

              <MemorialSection title="Estado por Categoria">
                <MemorialProgressBar value={byCondition.otimo} max={total} label="Ótimo" tone="success" />
                <MemorialProgressBar value={byCondition.bom} max={total} label="Bom" />
                <MemorialProgressBar value={byCondition.regular} max={total} label="Regular" tone="default" />
                <MemorialProgressBar value={byCondition.ruim} max={total} label="Ruim" tone="danger" />
              </MemorialSection>

              {selected.attachments?.length > 0 && (
                <MemorialSection title="Documentos">
                  <MemorialDownloadList items={selected.attachments.map((a) => ({ label: a.title ?? "Arquivo", url: a.url }))} />
                </MemorialSection>
              )}
            </div>
          ) : (
            <MemorialEmpty icon={<Building2 size={40} />} title="Selecione um item" description="Clique em um patrimônio para ver os detalhes." />
          )
        }
      />
    </MemorialShell>
  );
}

// ═════════════════════════════════════════════
// 10. Hall da Fama
// ═════════════════════════════════════════════
export function MemorialHallPage2() {
  const { data: items, isLoading } = useMemorialItems("HALL_OF_FAME");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("visao-geral");
  const [filterCategory, setFilterCategory] = useState("");
  const [search, setSearch] = useState("");

  const all = items ?? [];
  const selected = all.find((i) => i.id === selectedId) ?? all[0];
  const categories = Array.from(new Set(all.map((i) => i.category ?? "").filter(Boolean))).sort();

  const filtered = all.filter((i) => {
    if (filterCategory && i.category !== filterCategory) return false;
    if (search && !i.title.toLowerCase().includes(search.toLowerCase()) && !i.personName?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const destaqueMes = all.find((i) => i.status === "PUBLISHED" && i.coverImageUrl) ?? all[0];

  return (
    <MemorialShell>
      <MemorialPageHeader
        icon={<Star size={20} />}
        title="Hall da Fama"
        subtitle="Homenageamos aqueles que fizeram e fazem parte da nossa história."
        action={
          <MemorialButton tone="primary" icon={<Upload size={15} />}>
            Indicar Integrante
          </MemorialButton>
        }
        meta={[
          { label: "Membros", value: String(all.length || 24) },
          { label: "Categorias", value: String(categories.length || 5) }
        ]}
      />

      <MemorialStatsRow>
        <MemorialStatCard label="Membros no Hall" value={all.length || 24} icon={<Star size={16} />} tone="gold" />
        <MemorialStatCard label="Jogadores" value={all.filter((i) => i.category === "Jogador" || i.personRole?.includes("jogador")).length || 14} icon={<UserRound size={16} />} />
        <MemorialStatCard label="Dirigentes" value={all.filter((i) => i.category === "Dirigente").length || 6} icon={<Landmark size={16} />} />
        <MemorialStatCard label="Categorias" value={categories.length || 5} icon={<Medal size={16} />} />
      </MemorialStatsRow>

      {destaqueMes && (
        <MemorialSection title="Destaque do Mês">
          <MemorialSpotlight
            title={destaqueMes.personName ?? destaqueMes.title}
            subtitle={destaqueMes.category ?? destaqueMes.personRole ?? undefined}
            image={destaqueMes.coverImageUrl ?? undefined}
            badge="Destaque"
            badgeTone="gold"
          />
        </MemorialSection>
      )}

      <MemorialFilterRow>
        <MemorialSearch placeholder="Buscar no Hall da Fama..." value={search} onChange={setSearch} />
        <MemorialSelect label="Categoria" value={filterCategory} options={categories.map((c) => ({ value: c, label: c }))} onChange={setFilterCategory} />
      </MemorialFilterRow>

      <MemorialSplitLayout
        list={
          isLoading
            ? <div className="fl-mem-person-grid">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="fl-mem-skeleton fl-mem-skeleton--person" />)}</div>
            : filtered.length === 0
            ? <MemorialEmpty icon={<Star size={40} />} title="Nenhum membro encontrado" />
            : <div className="fl-mem-person-grid">
                {filtered.map((item) => (
                  <MemorialPersonCard
                    key={item.id}
                    name={item.personName ?? item.title}
                    role={item.personRole ?? item.category ?? undefined}
                    photo={item.coverImageUrl ?? undefined}
                    period={item.periodLabel ?? undefined}
                    badge={item.category ?? undefined}
                    badgeTone={item.category === "Ídolo" ? "gold" : "default"}
                    onClick={() => { setSelectedId(item.id); setActiveTab("visao-geral"); }}
                  />
                ))}
              </div>
        }
        detail={
          selected ? (
            <div>
              <MemorialHero
                name={selected.personName ?? selected.title}
                role={selected.personRole ?? selected.category ?? undefined}
                period={selected.periodLabel ?? undefined}
                photo={selected.coverImageUrl ?? undefined}
                quote={selected.subtitle ?? undefined}
                badge={selected.category ?? undefined}
                badgeTone={selected.category === "Ídolo" ? "gold" : "blue"}
                stats={[
                  { label: "Categoria", value: selected.category ?? "—" },
                  { label: "Período", value: selected.periodLabel ?? "—" }
                ]}
              />

              <MemorialTabs
                tabs={[
                  { id: "visao-geral", label: "Visão Geral" },
                  { id: "conquistas", label: "Conquistas" },
                  { id: "galeria", label: "Galeria" }
                ]}
                active={activeTab}
                onChange={setActiveTab}
              />

              {activeTab === "visao-geral" && (
                <MemorialSection title="Sobre">
                  <p className="fl-mem-prose">{selected.description ?? "Informações sobre este membro do Hall da Fama serão adicionadas em breve."}</p>
                  <MemorialTableRow cells={[
                    { label: "Nome", value: selected.personName ?? selected.title, weight: "bold" },
                    { label: "Função", value: selected.personRole ?? "—" },
                    { label: "Categoria", value: selected.category ?? "—" }
                  ]} />
                </MemorialSection>
              )}

              {activeTab === "conquistas" && (
                <MemorialSection title="Conquistas">
                  <MemorialEmpty icon={<Trophy size={28} />} title="Nenhuma conquista registrada" />
                </MemorialSection>
              )}

              {activeTab === "galeria" && (
                <MemorialSection title="Galeria">
                  {selected.attachments?.filter((a) => a.mimeType?.startsWith("image")).length > 0
                    ? <MemorialPhotoGrid columns={3}>
                        {selected.attachments.filter((a) => a.mimeType?.startsWith("image")).map((a) => (
                          <MemorialPhoto key={a.id} src={a.url} alt={a.title ?? "Foto"} />
                        ))}
                      </MemorialPhotoGrid>
                    : <MemorialEmpty icon={<Image size={28} />} title="Nenhuma foto cadastrada" />}
                </MemorialSection>
              )}
            </div>
          ) : (
            <MemorialEmpty icon={<Star size={40} />} title="Selecione um membro" description="Clique em um membro para ver o perfil completo." />
          )
        }
      />
    </MemorialShell>
  );
}
