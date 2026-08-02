/**
 * AmateurPages — Páginas do mercado amador do GestaSports.
 *
 * Páginas exportadas:
 *  - AmateurDashboardPage      — dashboard do time amador (técnico/admin)
 *  - AmateurMatchConfirmPage   — confirmação de presença no jogo
 *  - AmateurRachaPage          — racha financeiro do jogo (cobranças PIX)
 *  - AmateurLeaguePage         — tabela de classificação da liga
 *  - AmateurRosterPage         — elenco do time amador
 *  - AmateurPublicMatchPage    — página pública de jogo (sem login)
 */

import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Link2,
  Plus,
  Share2,
  Trophy,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import { apiRequest } from "../services/api";
import {
  AmateurPage,
  AmateurPageHeader,
  AmateurStatsGrid,
  AmateurStatCard,
  AmateurSection,
  AmateurMatchCard,
  AmateurButton,
  AmateurCTA,
  AmateurEmpty,
  AmateurLeagueTable,
  AmateurPaymentCard,
  AmateurTopScorerRow,
  AmateurFilterChip,
  AmateurSearch,
  AmateurBadge,
  AmateurDivider,
  PlayerConfirmItem,
  type LeagueTableRow,
} from "../components/ui/AmateurUI";

// ---------------------------------------------------------------------------
// Tipos locais compartilhados
// ---------------------------------------------------------------------------

type AmateurGame = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  time?: string;
  venue?: string;
  status: "upcoming" | "live" | "finished" | "cancelled";
  homeScore?: number;
  awayScore?: number;
  competition?: string;
  confirmedCount?: number;
  pendingCount?: number;
};

type AmateurPlayer = {
  id: string;
  name: string;
  position?: string;
  number?: number;
  photoUrl?: string | null;
  confirmStatus?: "confirmed" | "pending" | "declined" | "unknown";
  goals?: number;
  assists?: number;
};

// ---------------------------------------------------------------------------
// Dashboard do time amador
// ---------------------------------------------------------------------------

export function AmateurDashboardPage() {
  const nextGames = useQuery<AmateurGame[]>({
    queryKey: ["amateur-next-games"],
    queryFn: () => apiRequest("/sports/games?status=upcoming&limit=3"),
    placeholderData: [],
  });

  const recentResults = useQuery<AmateurGame[]>({
    queryKey: ["amateur-recent-games"],
    queryFn: () => apiRequest("/sports/games?status=finished&limit=3"),
    placeholderData: [],
  });

  const stats = useQuery<{
    activePlayers: number;
    gamesThisSeason: number;
    wins: number;
    pendingPayments: number;
    pendingConfirmations: number;
    nextGameDate?: string;
  }>({
    queryKey: ["amateur-stats"],
    queryFn: () => apiRequest("/dashboard/summary?scope=amateur"),
    placeholderData: {
      activePlayers: 0,
      gamesThisSeason: 0,
      wins: 0,
      pendingPayments: 0,
      pendingConfirmations: 0,
    },
  });

  const s = stats.data ?? {
    activePlayers: 0,
    gamesThisSeason: 0,
    wins: 0,
    pendingPayments: 0,
    pendingConfirmations: 0,
  };

  return (
    <AmateurPage>
      <AmateurPageHeader
        eyebrow="Seu time"
        title="Dashboard"
        description="Visão geral do time, jogos e finanças"
        actions={
          <Link to="/jogos?view=OPERACAO&subView=CADASTRO">
            <AmateurButton tone="brand" size="sm">
              <Plus size={15} /> Novo jogo
            </AmateurButton>
          </Link>
        }
      />

      {/* Stats rápidas */}
      <AmateurStatsGrid cols={4}>
        <AmateurStatCard
          label="Jogadores ativos"
          value={s.activePlayers}
          icon={<Users size={20} />}
          tone="info"
          helper="no elenco"
        />
        <AmateurStatCard
          label="Jogos na temporada"
          value={s.gamesThisSeason}
          icon={<CalendarDays size={20} />}
          tone="default"
          helper={`${s.wins} vitórias`}
        />
        <AmateurStatCard
          label="Confirmações pendentes"
          value={s.pendingConfirmations}
          icon={<ClipboardList size={20} />}
          tone={s.pendingConfirmations > 0 ? "warning" : "success"}
          helper="para o próximo jogo"
        />
        <AmateurStatCard
          label="Cobranças em aberto"
          value={s.pendingPayments}
          icon={<Wallet size={20} />}
          tone={s.pendingPayments > 0 ? "danger" : "success"}
          helper="via PIX"
        />
      </AmateurStatsGrid>

      {/* Próximos jogos */}
      <AmateurSection
        title="Próximos jogos"
        action={
          <Link to="/jogos">
            <AmateurButton tone="ghost" size="sm">
              Ver todos <ChevronRight size={14} />
            </AmateurButton>
          </Link>
        }
      >
        {!nextGames.data?.length ? (
          <AmateurCTA
            icon={<CalendarDays size={24} />}
            title="Nenhum jogo agendado"
            description="Crie o próximo jogo do seu time e envie as convocações."
            primaryAction={{
              label: "Agendar jogo",
              onClick: () => window.location.assign("/jogos?view=OPERACAO&subView=CADASTRO"),
            }}
          />
        ) : (
          <div className="space-y-3">
            {nextGames.data.map((g) => (
              <AmateurMatchCard
                key={g.id}
                homeTeam={g.homeTeam}
                awayTeam={g.awayTeam}
                date={g.date}
                time={g.time}
                venue={g.venue}
                status={g.status}
                competition={g.competition}
                confirmedCount={g.confirmedCount}
                pendingCount={g.pendingCount}
                onViewDetails={() => window.location.assign(`/jogos?id=${g.id}`)}
                onConfirm={() => window.location.assign(`/amador/confirmacoes/${g.id}`)}
              />
            ))}
          </div>
        )}
      </AmateurSection>

      {/* Resultados recentes */}
      {!!recentResults.data?.length && (
        <AmateurSection
          title="Resultados recentes"
          action={
            <Link to="/jogos">
              <AmateurButton tone="ghost" size="sm">
                Ver todos <ChevronRight size={14} />
              </AmateurButton>
            </Link>
          }
        >
          <div className="space-y-3">
            {recentResults.data.map((g) => (
              <AmateurMatchCard
                key={g.id}
                homeTeam={g.homeTeam}
                awayTeam={g.awayTeam}
                homeScore={g.homeScore}
                awayScore={g.awayScore}
                date={g.date}
                status={g.status}
                competition={g.competition}
                onViewDetails={() => window.location.assign(`/jogos?id=${g.id}`)}
              />
            ))}
          </div>
        </AmateurSection>
      )}

      {/* Atalhos rápidos */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Elenco", icon: <Users size={20} />, to: "/atletas" },
          { label: "Tabela da liga", icon: <Trophy size={20} />, to: "/amador/liga" },
          { label: "Racha financeiro", icon: <CircleDollarSign size={20} />, to: "/amador/racha" },
          { label: "Compartilhar", icon: <Share2 size={20} />, to: "/amador/compartilhar" },
        ].map(({ label, icon, to }) => (
          <Link
            key={label}
            to={to}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-5 text-center font-black text-[var(--shell-text)] transition hover:border-[var(--brand-accent)]/40 hover:shadow-md active:scale-95"
          >
            <span className="grid size-10 place-items-center rounded-xl bg-slate-100 text-[var(--muted)]">
              {icon}
            </span>
            <span className="text-xs">{label}</span>
          </Link>
        ))}
      </div>
    </AmateurPage>
  );
}

// ---------------------------------------------------------------------------
// Confirmação de presença
// ---------------------------------------------------------------------------

export function AmateurMatchConfirmPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const queryClient = useQueryClient();

  const gameQuery = useQuery<{
    id: string;
    homeTeam: string;
    awayTeam: string;
    date: string;
    time?: string;
    venue?: string;
    competition?: string;
    players: AmateurPlayer[];
  }>({
    queryKey: ["amateur-game-confirm", gameId],
    queryFn: () => apiRequest(`/sports/games/${gameId}/callup`),
    enabled: Boolean(gameId),
  });

  const confirmMutation = useMutation({
    mutationFn: ({ playerId, confirmed }: { playerId: string; confirmed: boolean }) =>
      apiRequest(`/sports/games/${gameId}/callup/${playerId}`, {
        method: "PATCH",
        body: JSON.stringify({ confirmed }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["amateur-game-confirm", gameId] }),
  });

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "confirmed" | "pending" | "declined">("all");

  const game = gameQuery.data;
  const players = (game?.players ?? []).filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "all" || p.confirmStatus === filter || (filter === "pending" && !p.confirmStatus);
    return matchSearch && matchFilter;
  });

  const confirmed = game?.players.filter((p) => p.confirmStatus === "confirmed").length ?? 0;
  const pending = game?.players.filter((p) => !p.confirmStatus || p.confirmStatus === "pending").length ?? 0;
  const declined = game?.players.filter((p) => p.confirmStatus === "declined").length ?? 0;

  const handleCopyLink = () => {
    const url = `${window.location.origin}/amador/confirmacao-publica/${gameId}`;
    navigator.clipboard.writeText(url).then(() => alert("Link copiado! Envie pelo WhatsApp."));
  };

  if (!game) {
    return (
      <AmateurPage>
        <div className="flex min-h-64 items-center justify-center">
          <p className="text-sm font-semibold text-[var(--muted)]">Carregando...</p>
        </div>
      </AmateurPage>
    );
  }

  return (
    <AmateurPage>
      <AmateurPageHeader
        eyebrow="Confirmações"
        title="Presença no jogo"
        description={`${game.homeTeam} × ${game.awayTeam} · ${game.date}${game.time ? ` às ${game.time}` : ""}`}
        actions={
          <AmateurButton tone="outline" size="sm" onClick={handleCopyLink}>
            <Link2 size={14} /> Copiar link WhatsApp
          </AmateurButton>
        }
      />

      {/* Resumo rápido */}
      <AmateurStatsGrid cols={4}>
        <AmateurStatCard label="Confirmados" value={confirmed} tone="success" icon={<CheckCircle2 size={18} />} />
        <AmateurStatCard label="Aguardando" value={pending} tone="warning" icon={<ClipboardList size={18} />} />
        <AmateurStatCard label="Recusaram" value={declined} tone="danger" icon={<XCircle size={18} />} />
        <AmateurStatCard
          label="Total convocados"
          value={game.players.length}
          tone="default"
          icon={<Users size={18} />}
        />
      </AmateurStatsGrid>

      {/* Lista de jogadores */}
      <AmateurSection title="Convocados" description="Clique em ✓ ou ✕ para registrar a resposta manualmente">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <AmateurSearch value={search} onChange={setSearch} placeholder="Buscar jogador..." />
          <div className="flex flex-wrap gap-1.5">
            {(["all", "confirmed", "pending", "declined"] as const).map((f) => (
              <AmateurFilterChip
                key={f}
                label={f === "all" ? "Todos" : f === "confirmed" ? "Confirmados" : f === "pending" ? "Aguardando" : "Recusaram"}
                active={filter === f}
                onClick={() => setFilter(f)}
              />
            ))}
          </div>
        </div>

        {players.length === 0 ? (
          <AmateurEmpty
            icon={<Users size={20} />}
            title="Nenhum convocado encontrado"
            description="Adicione atletas ao elenco e convoque para o jogo."
          />
        ) : (
          <ul>
            {players.map((p) => (
              <PlayerConfirmItem
                key={p.id}
                name={p.name}
                position={p.position}
                number={p.number}
                status={p.confirmStatus ?? "unknown"}
                photoUrl={p.photoUrl}
                onConfirm={() => confirmMutation.mutate({ playerId: p.id, confirmed: true })}
                onDecline={() => confirmMutation.mutate({ playerId: p.id, confirmed: false })}
              />
            ))}
          </ul>
        )}
      </AmateurSection>
    </AmateurPage>
  );
}

// ---------------------------------------------------------------------------
// Racha financeiro
// ---------------------------------------------------------------------------

type RachaItem = {
  id: string;
  gameTitle: string;
  gameDate: string;
  totalAmount: number;
  perPlayerAmount: number;
  paidCount: number;
  totalPlayers: number;
  status: "open" | "closed";
};

type RachaPlayerItem = {
  id: string;
  name: string;
  photoUrl?: string | null;
  amount: number;
  paid: boolean;
  paidAt?: string;
};

export function AmateurRachaPage() {
  const [selectedRacha, setSelectedRacha] = useState<string | null>(null);

  const rachaList = useQuery<RachaItem[]>({
    queryKey: ["amateur-racha-list"],
    queryFn: () => apiRequest("/finance/game-collections"),
    placeholderData: [],
  });

  const rachaDetail = useQuery<{ racha: RachaItem; players: RachaPlayerItem[] }>({
    queryKey: ["amateur-racha-detail", selectedRacha],
    queryFn: () => apiRequest(`/finance/game-collections/${selectedRacha}`),
    enabled: Boolean(selectedRacha),
  });

  const list = rachaList.data ?? [];

  if (selectedRacha && rachaDetail.data) {
    const { racha, players } = rachaDetail.data;
    const paidPlayers = players.filter((p) => p.paid);
    const pendingPlayers = players.filter((p) => !p.paid);

    return (
      <AmateurPage>
        <AmateurPageHeader
          eyebrow="Racha do jogo"
          title={racha.gameTitle}
          description={`${racha.gameDate} · R$ ${racha.perPlayerAmount.toFixed(2)} por jogador`}
          actions={
            <AmateurButton tone="ghost" size="sm" onClick={() => setSelectedRacha(null)}>
              ← Voltar
            </AmateurButton>
          }
        />

        <AmateurStatsGrid>
          <AmateurStatCard
            label="Arrecadado"
            value={(racha.paidCount * racha.perPlayerAmount).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
            tone="success"
            icon={<CircleDollarSign size={20} />}
          />
          <AmateurStatCard
            label="Faltando"
            value={((racha.totalPlayers - racha.paidCount) * racha.perPlayerAmount).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
            tone={racha.paidCount < racha.totalPlayers ? "danger" : "success"}
            icon={<Wallet size={20} />}
          />
        </AmateurStatsGrid>

        {/* Progresso */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-black text-[var(--shell-text)]">
              {racha.paidCount} de {racha.totalPlayers} pagaram
            </p>
            <span className="text-sm font-black text-[var(--brand-primary)]">
              {Math.round((racha.paidCount / racha.totalPlayers) * 100)}%
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[var(--brand-primary)] transition-all"
              style={{ width: `${(racha.paidCount / racha.totalPlayers) * 100}%` }}
            />
          </div>
        </div>

        {pendingPlayers.length > 0 && (
          <AmateurSection title="Aguardando pagamento">
            <ul className="space-y-2">
              {pendingPlayers.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="flex items-center gap-2">
                    {p.photoUrl ? (
                      <img src={p.photoUrl} alt={p.name} className="size-8 rounded-full object-cover" />
                    ) : (
                      <span className="grid size-8 place-items-center rounded-full bg-slate-200 text-[10px] font-black text-[var(--muted)]">
                        {p.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <span className="text-sm font-black text-[var(--shell-text)]">{p.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-red-600">
                      {p.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                    <AmateurButton
                      tone="brand"
                      size="sm"
                      onClick={() => {
                        const text = `Olá ${p.name}! O racha do jogo ${racha.gameTitle} foi de R$${p.amount.toFixed(2)}. Pode pagar via PIX?`;
                        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
                      }}
                    >
                      Cobrar no WhatsApp
                    </AmateurButton>
                  </div>
                </li>
              ))}
            </ul>
          </AmateurSection>
        )}

        {paidPlayers.length > 0 && (
          <AmateurSection title="Pagamentos confirmados">
            <ul className="space-y-2">
              {paidPlayers.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="flex items-center gap-2">
                    {p.photoUrl ? (
                      <img src={p.photoUrl} alt={p.name} className="size-8 rounded-full object-cover" />
                    ) : (
                      <span className="grid size-8 place-items-center rounded-full bg-emerald-100 text-[10px] font-black text-emerald-700">
                        {p.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <span className="text-sm font-black text-[var(--shell-text)]">{p.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-emerald-600">
                      {p.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                    <AmateurBadge label="Pago" tone="success" />
                  </div>
                </li>
              ))}
            </ul>
          </AmateurSection>
        )}
      </AmateurPage>
    );
  }

  return (
    <AmateurPage>
      <AmateurPageHeader
        eyebrow="Financeiro"
        title="Racha dos jogos"
        description="Divida as despesas do jogo entre os jogadores via PIX"
        actions={
          <Link to="/financeiro?area=MENSALIDADES">
            <AmateurButton tone="brand" size="sm">
              <Plus size={14} /> Nova cobrança
            </AmateurButton>
          </Link>
        }
      />

      {list.length === 0 ? (
        <AmateurCTA
          icon={<CircleDollarSign size={24} />}
          title="Nenhum racha cadastrado"
          description="Crie cobranças para dividir despesas de campo, árbitro e bola com os jogadores via PIX."
          primaryAction={{
            label: "Criar primeira cobrança",
            onClick: () => window.location.assign("/financeiro?area=MENSALIDADES"),
          }}
        />
      ) : (
        <div className="space-y-3">
          {list.map((r) => (
            <article
              key={r.id}
              role="button"
              onClick={() => setSelectedRacha(r.id)}
              className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[var(--brand-accent)]/40 hover:shadow-md active:scale-[0.98]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-black text-[var(--shell-text)]">{r.gameTitle}</p>
                  <p className="mt-0.5 text-[12px] font-semibold text-[var(--muted)]">{r.gameDate}</p>
                </div>
                <AmateurBadge
                  label={r.status === "open" ? "Em andamento" : "Fechado"}
                  tone={r.status === "open" ? "warning" : "success"}
                />
              </div>
              <div className="mt-3">
                <div className="mb-1.5 flex justify-between text-[11px] font-semibold text-[var(--muted)]">
                  <span>{r.paidCount} de {r.totalPlayers} pagaram</span>
                  <span>
                    R${(r.paidCount * r.perPlayerAmount).toFixed(2)} / R${r.totalAmount.toFixed(2)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-[var(--brand-primary)]"
                    style={{ width: `${(r.paidCount / r.totalPlayers) * 100}%` }}
                  />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[12px] font-semibold text-[var(--muted)]">
                  R$ {r.perPlayerAmount.toFixed(2)} por jogador
                </span>
                <span className="text-[12px] font-black text-[var(--brand-primary)]">
                  Ver detalhes →
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </AmateurPage>
  );
}

// ---------------------------------------------------------------------------
// Tabela da liga
// ---------------------------------------------------------------------------

export function AmateurLeaguePage() {
  const [activeCompetition, setActiveCompetition] = useState<string | null>(null);

  const competitions = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ["amateur-competitions"],
    queryFn: () => apiRequest("/competitions?type=amateur"),
    placeholderData: [],
  });

  const effectiveCompetitionId = activeCompetition ?? competitions.data?.[0]?.id ?? null;

  const table = useQuery<{
    competition: { id: string; name: string; season: string };
    rows: LeagueTableRow[];
    myTeamName?: string;
    topScorers: Array<{ name: string; teamName: string; goals: number; assists: number; photoUrl?: string | null }>;
  }>({
    queryKey: ["amateur-table", effectiveCompetitionId],
    queryFn: () => apiRequest(`/competitions/${effectiveCompetitionId}/table`),
    enabled: Boolean(effectiveCompetitionId),
  });

  const data = table.data;
  const comps = competitions.data ?? [];

  return (
    <AmateurPage>
      <AmateurPageHeader
        eyebrow="Competição"
        title="Tabela de classificação"
        description="Pontuação, aproveitamento e últimos resultados"
        actions={
          <Link to="/competicoes">
            <AmateurButton tone="outline" size="sm">
              <Trophy size={14} /> Gerenciar ligas
            </AmateurButton>
          </Link>
        }
        badge={
          data?.competition.season ? (
            <AmateurBadge label={data.competition.season} tone="info" />
          ) : undefined
        }
      />

      {/* Seleção de competição */}
      {comps.length > 1 && (
        <div className="flex flex-wrap gap-2 overflow-x-auto pb-1">
          {comps.map((c) => (
            <AmateurFilterChip
              key={c.id}
              label={c.name}
              active={c.id === effectiveCompetitionId}
              onClick={() => setActiveCompetition(c.id)}
            />
          ))}
        </div>
      )}

      {!data && !table.isFetching && (
        <AmateurCTA
          icon={<Trophy size={24} />}
          title="Nenhuma competição cadastrada"
          description="Crie uma liga ou campeonato para começar a registrar a tabela de classificação."
          primaryAction={{
            label: "Criar competição",
            onClick: () => window.location.assign("/competicoes"),
          }}
        />
      )}

      {data && (
        <>
          <AmateurLeagueTable rows={data.rows} myTeamName={data.myTeamName} />

          {/* Legenda */}
          <div className="flex flex-wrap gap-3 text-[11px] font-semibold text-[var(--muted)]">
            <span className="flex items-center gap-1.5"><span className="h-3 w-1 rounded-full bg-amber-500" /> Campeão</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-1 rounded-full bg-emerald-500" /> Classificado</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-1 rounded-full bg-red-400" /> Rebaixado</span>
          </div>

          {/* Artilheiros */}
          {data.topScorers.length > 0 && (
            <AmateurSection title="Artilheiros" description="Maiores goleadores da competição">
              <ul>
                {data.topScorers.slice(0, 10).map((p, i) => (
                  <AmateurTopScorerRow
                    key={`${p.name}-${i}`}
                    position={i + 1}
                    name={p.name}
                    teamName={p.teamName}
                    goals={p.goals}
                    assists={p.assists}
                    photoUrl={p.photoUrl}
                  />
                ))}
              </ul>
            </AmateurSection>
          )}
        </>
      )}
    </AmateurPage>
  );
}

// ---------------------------------------------------------------------------
// Elenco do time amador
// ---------------------------------------------------------------------------

export function AmateurRosterPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "goalkeeper" | "defender" | "midfielder" | "forward">("all");

  const roster = useQuery<AmateurPlayer[]>({
    queryKey: ["amateur-roster"],
    queryFn: () => apiRequest("/athletes?status=ACTIVE&limit=100"),
    placeholderData: [],
  });

  const positionMap: Record<string, string> = {
    GOALKEEPER: "goalkeeper",
    DEFENDER: "defender",
    MIDFIELDER: "midfielder",
    FORWARD: "forward",
  };

  const players = (roster.data ?? []).filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const positionKey = p.position ? positionMap[p.position] ?? "all" : "all";
    const matchFilter = filter === "all" || positionKey === filter;
    return matchSearch && matchFilter;
  });

  const filterLabels = { all: "Todos", goalkeeper: "Goleiros", defender: "Defensores", midfielder: "Meio-campo", forward: "Atacantes" };

  return (
    <AmateurPage>
      <AmateurPageHeader
        eyebrow="Elenco"
        title="Jogadores"
        description="Gerencie os atletas do seu time"
        actions={
          <Link to="/atletas?edit=new">
            <AmateurButton tone="brand" size="sm">
              <Plus size={14} /> Novo jogador
            </AmateurButton>
          </Link>
        }
      />

      <AmateurSection title="Elenco">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <AmateurSearch value={search} onChange={setSearch} placeholder="Buscar por nome..." />
          <div className="flex flex-wrap gap-1.5">
            {(Object.entries(filterLabels) as Array<[typeof filter, string]>).map(([key, label]) => (
              <AmateurFilterChip
                key={key}
                label={label}
                active={filter === key}
                onClick={() => setFilter(key)}
              />
            ))}
          </div>
        </div>

        {players.length === 0 ? (
          <AmateurCTA
            icon={<Users size={24} />}
            title="Nenhum jogador cadastrado"
            description="Adicione os jogadores do seu time para começar a gerenciar escalações e confirmações."
            primaryAction={{
              label: "Adicionar jogador",
              onClick: () => window.location.assign("/atletas?edit=new"),
            }}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {players.map((p) => (
              <Link
                key={p.id}
                to={`/atletas/${p.id}/perfil`}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 transition hover:border-[var(--brand-accent)]/40 hover:shadow-md"
              >
                {p.photoUrl ? (
                  <img src={p.photoUrl} alt={p.name} className="size-12 rounded-full object-cover ring-2 ring-slate-200" />
                ) : (
                  <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[var(--brand-primary)] text-sm font-black text-white">
                    {p.number ?? p.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-[var(--shell-text)]">{p.name}</p>
                  {p.position && (
                    <p className="text-[11px] font-semibold text-[var(--muted)]">{p.position}</p>
                  )}
                  {(p.goals !== undefined || p.assists !== undefined) && (
                    <div className="mt-1 flex gap-2 text-[10px] font-black text-[var(--muted)]">
                      {p.goals !== undefined && <span className="text-[var(--brand-primary)]">{p.goals} gols</span>}
                      {p.assists !== undefined && <span className="text-sky-600">{p.assists} assist.</span>}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </AmateurSection>
    </AmateurPage>
  );
}

// ---------------------------------------------------------------------------
// Página pública de confirmação (sem login, via link WhatsApp)
// ---------------------------------------------------------------------------

export function AmateurPublicConfirmPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const [token] = useState(() => new URLSearchParams(window.location.search).get("t") ?? "");
  const [submitted, setSubmitted] = useState(false);

  const gameQuery = useQuery<{
    homeTeam: string;
    awayTeam: string;
    date: string;
    time?: string;
    venue?: string;
    playerName: string;
  }>({
    queryKey: ["public-game-confirm", gameId, token],
    queryFn: () => apiRequest(`/sports/games/${gameId}/public-confirm?t=${token}`, { skipAuth: true }),
    enabled: Boolean(gameId && token),
    retry: false,
  });

  const confirmMutation = useMutation({
    mutationFn: (confirmed: boolean) =>
      apiRequest(`/sports/games/${gameId}/public-confirm`, {
        method: "POST",
        body: JSON.stringify({ token, confirmed }),
        skipAuth: true,
      }),
    onSuccess: () => setSubmitted(true),
  });

  if (submitted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--shell-bg)] p-6 text-center">
        <span className="text-5xl">⚽</span>
        <p className="text-xl font-black text-[var(--shell-text)]">Resposta registrada!</p>
        <p className="text-sm font-semibold text-[var(--muted)]">
          O técnico foi notificado da sua confirmação.
        </p>
      </div>
    );
  }

  if (!gameQuery.data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[var(--shell-bg)] p-6 text-center">
        <span className="text-4xl">⚽</span>
        <p className="text-sm font-semibold text-[var(--muted)]">Carregando jogo...</p>
      </div>
    );
  }

  const { homeTeam, awayTeam, date, time, venue, playerName } = gameQuery.data;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--shell-bg)] p-6">
      <div className="w-full max-w-sm space-y-5">
        {/* Header da marca */}
        <div className="text-center">
          <span className="text-4xl">⚽</span>
          <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">
            GestaSports
          </p>
        </div>

        {/* Card do jogo */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
          <p className="mb-4 text-center text-[11px] font-black uppercase tracking-widest text-[var(--muted)]">
            Convocação
          </p>
          <p className="text-center text-base font-black text-[var(--shell-text)]">
            Olá, <span className="text-[var(--brand-primary)]">{playerName}</span>!
          </p>
          <AmateurDivider />
          <div className="space-y-2 text-center">
            <p className="text-lg font-black text-[var(--shell-text)]">
              {homeTeam} × {awayTeam}
            </p>
            <p className="text-sm font-semibold text-[var(--muted)]">
              {date}
              {time ? ` às ${time}` : ""}
            </p>
            {venue && <p className="text-sm font-semibold text-[var(--muted)]">📍 {venue}</p>}
          </div>
          <AmateurDivider label="Você vai?" />
          <div className="grid grid-cols-2 gap-3">
            <AmateurButton
              tone="success"
              fullWidth
              onClick={() => confirmMutation.mutate(true)}
              disabled={confirmMutation.isPending}
            >
              ✓ Vou jogar
            </AmateurButton>
            <AmateurButton
              tone="danger"
              fullWidth
              onClick={() => confirmMutation.mutate(false)}
              disabled={confirmMutation.isPending}
            >
              ✕ Não vou
            </AmateurButton>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Página de compartilhamento / link público do time
// ---------------------------------------------------------------------------

export function AmateurSharePage() {
  const team = useQuery<{ name: string; logoUrl?: string; publicSlug?: string }>({
    queryKey: ["amateur-team-share"],
    queryFn: () => apiRequest("/tenant/current"),
  });

  const publicUrl = team.data?.publicSlug
    ? `${window.location.origin}/t/${team.data.publicSlug}`
    : null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => alert("Copiado!"));
  };

  return (
    <AmateurPage>
      <AmateurPageHeader
        eyebrow="Compartilhar"
        title="Divulgar o time"
        description="Links para compartilhar no WhatsApp, redes sociais e grupos"
      />

      <div className="space-y-3">
        {publicUrl && (
          <AmateurPaymentCard
            title="Página pública do time"
            description="Qualquer pessoa pode ver a tabela, elenco e resultados"
            amount={0}
            status="paid"
            onCopy={() => handleCopy(publicUrl)}
          />
        )}

        <AmateurSection title="Links rápidos" description="Compartilhe com um toque">
          <div className="space-y-3">
            {[
              { label: "Tabela de classificação", path: "/amador/liga", icon: <Trophy size={16} /> },
              { label: "Elenco do time", path: "/amador/elenco", icon: <Users size={16} /> },
              { label: "Próximos jogos", path: "/jogos", icon: <CalendarDays size={16} /> },
            ].map(({ label, path, icon }) => {
              const url = `${window.location.origin}${path}`;
              return (
                <div
                  key={path}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex items-center gap-2">
                    <span className="grid size-8 place-items-center rounded-lg bg-slate-100 text-[var(--muted)]">
                      {icon}
                    </span>
                    <span className="text-sm font-black text-[var(--shell-text)]">{label}</span>
                  </div>
                  <AmateurButton tone="outline" size="sm" onClick={() => handleCopy(url)}>
                    <Link2 size={13} /> Copiar
                  </AmateurButton>
                </div>
              );
            })}
          </div>
        </AmateurSection>

        <AmateurSection title="WhatsApp" description="Envie uma mensagem pronta para o grupo">
          <div className="space-y-2">
            {[
              {
                label: "Convocar para o jogo",
                text: `Pessoal! Temos jogo. Confirme sua presença em: ${publicUrl ?? window.location.origin}`,
              },
              {
                label: "Cobrar mensalidade",
                text: `Lembrete de mensalidade do time! Pague via PIX: ${publicUrl ?? window.location.origin}/amador/racha`,
              },
            ].map(({ label, text }) => (
              <AmateurButton
                key={label}
                tone="success"
                fullWidth
                onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank")}
              >
                {label} (WhatsApp)
              </AmateurButton>
            ))}
          </div>
        </AmateurSection>
      </div>
    </AmateurPage>
  );
}
