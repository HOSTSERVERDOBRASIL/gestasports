import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, Link, useLocation } from "react-router-dom";
import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coins,
  CreditCard,
  Download,
  Heart,
  Home,
  LogOut,
  MapPin,
  Medal,
  MessageCircle,
  QrCode,
  Settings,
  Share2,
  ShieldCheck,
  Star,
  Target,
  Trophy,
  UserRound,
  X,
  Zap
} from "lucide-react";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { apiRequest } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import type { AthleteSelfOverview, AthleteSelfCheckoutResponse } from "../types/domain";

// ── helpers ─────────────────────────────────
function fmtCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((cents || 0) / 100);
}

function fmtDate(v: string) {
  return new Date(v).toLocaleDateString("pt-BR");
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

// ── Micro components ─────────────────────────
function APStat({ label, value, icon, helper }: { label: string; value: string | number; icon?: React.ReactNode; helper?: string }) {
  return (
    <div className="ap-stat">
      {icon ? <span className="ap-stat__icon">{icon}</span> : null}
      <strong className="ap-stat__value">{value}</strong>
      <p className="ap-stat__label">{label}</p>
      {helper ? <span className="ap-stat__helper">{helper}</span> : null}
    </div>
  );
}

function APCard({ children, className = "", style, onClick }: { children: React.ReactNode; className?: string; style?: React.CSSProperties; onClick?: () => void }) {
  return <article className={`ap-card ${className}`} style={style} onClick={onClick}>{children}</article>;
}

function APSectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="ap-section-title">{children}</h2>;
}

function APBadge({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "success" | "warning" | "danger" | "info" | "gold" }) {
  return <span className={`ap-badge ap-badge--${tone}`}>{children}</span>;
}

function APButton({ children, tone = "primary", size = "md", icon, onClick, disabled, fullWidth }: {
  children: React.ReactNode;
  tone?: "primary" | "secondary" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <button type="button" className={`ap-btn ap-btn--${tone} ap-btn--${size} ${fullWidth ? "ap-btn--full" : ""}`} onClick={onClick} disabled={disabled}>
      {icon}{children}
    </button>
  );
}

function APTopbar({ name, photo, notifications = 0, onBack, action }: { name: string; photo?: string | null; notifications?: number; onBack?: () => void; action?: React.ReactNode }) {
  const { logout } = useAuth();
  return (
    <header className="ap-topbar">
      {onBack ? (
        <button type="button" className="ap-topbar__back" onClick={onBack}><ChevronLeft size={20} /></button>
      ) : (
        <span className="ap-topbar__logo">
          {photo ? <img src={photo} alt={name} className="ap-topbar__avatar" /> : <span className="ap-topbar__avatar ap-topbar__avatar--initials">{initials(name)}</span>}
        </span>
      )}
      <div className="ap-topbar__center">{action}</div>
      <div className="ap-topbar__right">
        <button type="button" className="ap-topbar__icon-btn">
          <Bell size={20} />
          {notifications > 0 ? <span className="ap-topbar__notif-dot">{notifications}</span> : null}
        </button>
        <button type="button" className="ap-topbar__icon-btn ap-topbar__icon-btn--name" onClick={logout}>
          <span>{name.split(" ")[0]}</span>
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}

const AP_NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: <Home size={18} />, path: "/atleta" },
  { id: "jogos", label: "Jogos", icon: <Trophy size={18} />, path: "/atleta/jogos" },
  { id: "desempenho", label: "Desempenho", icon: <Activity size={18} />, path: "/atleta/desempenho" },
  { id: "financeiro", label: "Financeiro", icon: <Coins size={18} />, path: "/atleta/financeiro" },
  { id: "saude", label: "Saúde", icon: <Heart size={18} />, path: "/atleta/saude" },
  { id: "perfil", label: "Perfil", icon: <UserRound size={18} />, path: "/atleta/perfil" },
];

function APNav({ active }: { active: string }) {
  return (
    <nav className="ap-nav">
      {AP_NAV_ITEMS.map((item) => (
        <Link key={item.id} to={item.path} className={`ap-nav__item ${active === item.id ? "ap-nav__item--active" : ""}`}>
          {item.icon}
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

function APSidebar({ name, photo }: { name: string; photo?: string | null }) {
  const location = useLocation();
  const { logout } = useAuth();
  const active = AP_NAV_ITEMS.reduce((found, item) => {
    if (location.pathname.startsWith(item.path) && item.path.length > found.length) return item.path;
    return found;
  }, "/atleta");

  return (
    <aside className="ap-sidebar">
      <div className="ap-sidebar__logo">
        <div className="ap-sidebar__club-name">
          <span style={{ fontSize: "1.4rem" }}>⚽</span>
        </div>
        <div>
          <div className="ap-sidebar__club-name">Portal do Atleta</div>
          <div className="ap-sidebar__club-sub">GestaSports</div>
        </div>
      </div>

      <nav className="ap-sidebar__nav">
        {AP_NAV_ITEMS.map((item) => (
          <Link
            key={item.id}
            to={item.path}
            className={`ap-sidebar__item ${active === item.path ? "ap-sidebar__item--active" : ""}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ))}

        <div className="ap-sidebar__section">Memorial</div>
        <Link to="/acervo" className="ap-sidebar__item">
          <Trophy size={18} />
          <span>Acervo do clube</span>
        </Link>
        <Link to="/atleta/carreira" className="ap-sidebar__item">
          <Star size={18} />
          <span>Minha carreira</span>
        </Link>
        <Link to="/atleta/conquistas" className="ap-sidebar__item">
          <Medal size={18} />
          <span>Conquistas</span>
        </Link>
      </nav>

      <div className="ap-sidebar__user">
        {photo ? (
          <img src={photo} alt={name} className="ap-sidebar__avatar" />
        ) : (
          <div className="ap-sidebar__avatar">{initials(name)}</div>
        )}
        <div>
          <div className="ap-sidebar__user-name">{name.split(" ")[0]}</div>
          <div className="ap-sidebar__user-role">Atleta</div>
        </div>
        <button
          type="button"
          onClick={logout}
          style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", marginLeft: "auto" }}
        >
          <LogOut size={15} />
        </button>
      </div>
    </aside>
  );
}

// ── Shared data hook ─────────────────────────
function useAthleteOverview() {
  const now = useMemo(() => {
    const d = new Date();
    return { month: d.getUTCMonth() + 1, year: d.getUTCFullYear() };
  }, []);
  return useQuery({
    queryKey: ["athlete-portal-overview", now.month, now.year],
    queryFn: () => apiRequest<AthleteSelfOverview>(`/athlete/me?month=${now.month}&year=${now.year}`)
  });
}

// ── Page: Dashboard ──────────────────────────
export function AthletePortalDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: overview, isLoading } = useAthleteOverview();

  const now = useMemo(() => {
    const d = new Date();
    return { month: d.getUTCMonth() + 1, year: d.getUTCFullYear() };
  }, []);

  const currentPaymentQuery = useQuery({
    queryKey: ["athlete-portal-current-payment", now.month, now.year],
    queryFn: () => apiRequest<{ payment: AthleteSelfOverview["currentPayment"] }>(`/athlete/me/payments/current?month=${now.month}&year=${now.year}`),
    refetchInterval: 8000
  });

  const name = overview?.athlete?.name ?? overview?.associate?.name ?? user?.name ?? "Atleta";
  const photo = overview?.athlete?.photoUrl ?? null;
  const position = overview?.athlete?.position ?? "";
  const nextGame = overview?.nextGame;
  const payment = currentPaymentQuery.data?.payment ?? overview?.currentPayment;
  const isPending = payment?.status !== "PAID";

  const positionLabels: Record<string, string> = {
    GOALKEEPER: "Goleiro", DEFENDER: "Zagueiro", FULLBACK: "Lateral",
    MIDFIELDER: "Meia", FORWARD: "Atacante", LINE: "Linha"
  };

  return (
    <div className="ap-root">
      <APSidebar name={name} photo={photo} />
      <div className="ap-page">
        <APTopbar name={name} photo={photo} notifications={3} />

        <div className="ap-page-body">
          {/* Hero da pessoa */}
          <APCard className="ap-dashboard-hero">
            <div className="ap-dashboard-hero__left">
              {photo ? (
                <img src={photo} alt={name} className="ap-dashboard-hero__photo" />
              ) : (
                <span className="ap-dashboard-hero__initials">{initials(name)}</span>
              )}
              <div>
                <p className="ap-dashboard-hero__greeting">Olá, {name.split(" ")[0]}! 👋</p>
                <p className="ap-dashboard-hero__sub">Aqui está o seu resumo pessoal na temporada {now.year}.</p>
                <div className="ap-dashboard-hero__chips">
                  {position ? <APBadge tone="default">{positionLabels[position] ?? position}</APBadge> : null}
                  {(overview?.athlete as any)?.jerseyNumber ? <APBadge tone="info">Nº {(overview?.athlete as any).jerseyNumber}</APBadge> : null}
                  {overview?.athlete?.medicalStatus === "CLEARED"
                    ? <APBadge tone="success"><ShieldCheck size={10} style={{ marginRight: 3 }} />Liberado</APBadge>
                    : overview?.athlete?.medicalStatus
                    ? <APBadge tone="danger">Vetado</APBadge>
                    : null}
                </div>
              </div>
            </div>
            <div className="ap-dashboard-hero__right">
              <p className="ap-dashboard-hero__season-label">Temporada {now.year}</p>
            </div>
          </APCard>

        {/* Próximo jogo */}
        {nextGame ? (
          <APCard className="ap-next-game-card">
            <p className="ap-next-game-card__label">Próximo jogo</p>
            <div className="ap-next-game-card__matchup">
              <span className="ap-next-game-card__team">{nextGame.redTeamName ?? "Time A"}</span>
              <div className="ap-next-game-card__vs">
                <span>VS</span>
                <div className="ap-next-game-card__details">
                  {nextGame.date ? <span>{new Date(nextGame.date).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}</span> : null}
                  {nextGame.location ? <span className="ap-next-game-card__location"><MapPin size={13} />{nextGame.location}</span> : null}
                </div>
              </div>
              <span className="ap-next-game-card__team">{nextGame.whiteTeamName ?? "Time B"}</span>
            </div>
            <div className="ap-next-game-card__actions">
              <APButton tone="primary" icon={<Check size={16} />} onClick={() => navigate(`/atleta/jogos`)}>Confirmar presença</APButton>
              <APButton tone="ghost" icon={<X size={16} />} onClick={() => navigate(`/atleta/jogos`)}>Não vou jogar</APButton>
            </div>
          </APCard>
        ) : null}

        {/* Stats da temporada */}
        {!isLoading && overview ? (
          <div className="ap-stats-row">
            <APStat label="Jogos" value={overview.numbers?.gamesPlayed ?? 0} icon={<Trophy size={16} />} />
            <APStat label="Gols" value={overview.numbers?.goals ?? 0} icon={<Target size={16} />} />
            <APStat label="Assistências" value={overview.numbers?.assists ?? 0} icon={<Zap size={16} />} />
            <APStat label="Presença" value={`${overview.presence?.presencePercent ?? 0}%`} icon={<CalendarDays size={16} />} />
            <APStat label="Presenças" value={overview.presence?.gamesPresent ?? 0} icon={<Activity size={16} />} />
            <APStat label="Cartões" value={overview.numbers?.yellowCards ?? 0} icon={<Star size={16} />} />
          </div>
        ) : null}

        {/* Situação financeira */}
        {payment ? (
          <APCard className={`ap-finance-card ${isPending ? "ap-finance-card--pending" : "ap-finance-card--ok"}`}>
            <div className="ap-finance-card__header">
              <p className="ap-finance-card__title">Situação financeira</p>
              <APBadge tone={isPending ? "warning" : "success"}>{isPending ? "Pendente" : "Em dia"}</APBadge>
            </div>
            {isPending ? (
              <>
                <p className="ap-finance-card__amount">{fmtCurrency(payment.amountCents ?? 0)}</p>
                <p className="ap-finance-card__desc">Vencimento: {payment.dueDate ? fmtDate(payment.dueDate) : "-"}</p>
                <APButton tone="primary" icon={<QrCode size={16} />} fullWidth onClick={() => navigate("/atleta/financeiro")}>Pagar com PIX</APButton>
              </>
            ) : (
              <p className="ap-finance-card__desc">Todas as cobranças estão em dia.</p>
            )}
          </APCard>
        ) : null}

        {/* Acesso rápido */}
        <APSectionTitle>Acesso rápido</APSectionTitle>
        <div className="ap-quick-access">
          {[
            { label: "Convocações", icon: <CalendarDays size={20} />, path: "/atleta/jogos" },
            { label: "Financeiro", icon: <CreditCard size={20} />, path: "/atleta/financeiro" },
            { label: "Estatísticas", icon: <BarChart3 size={20} />, path: "/atleta/desempenho" },
            { label: "Saúde", icon: <Heart size={20} />, path: "/atleta/saude" },
            { label: "Carreira", icon: <Trophy size={20} />, path: "/atleta/carreira" },
            { label: "Perfil", icon: <UserRound size={20} />, path: "/atleta/perfil" },
          ].map((item) => (
            <Link key={item.label} to={item.path} className="ap-quick-item">
              <span className="ap-quick-item__icon">{item.icon}</span>
              <span className="ap-quick-item__label">{item.label}</span>
            </Link>
          ))}
        </div>

        {/* Últimos jogos */}
        {overview?.recentGames && overview.recentGames.length > 0 ? (
          <>
            <APSectionTitle>Últimos jogos</APSectionTitle>
            <APCard>
              {overview.recentGames.slice(0, 5).map((game) => {
                const result = game.winnerSide == null ? "d" : game.winnerSide === game.side ? "w" : "l";
                return (
                  <div key={game.gameId} className="ap-game-row">
                    <div className="ap-game-row__date">{game.date ? new Date(game.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : "-"}</div>
                    <div className="ap-game-row__teams">
                      <span>{game.redTeamName}</span>
                      <strong>{game.redScore ?? "-"} × {game.whiteScore ?? "-"}</strong>
                      <span>{game.whiteTeamName}</span>
                    </div>
                    <span className={`ap-result-badge ap-result-badge--${result}`}>{result === "w" ? "V" : result === "d" ? "E" : "D"}</span>
                  </div>
                );
              })}
            </APCard>
          </>
        ) : null}
        </div>

        <APNav active="dashboard" />
      </div>
    </div>
  );
}

// ── Page: Jogos / Convocações ────────────────
export function AthletePortalGamesPage() {
  const { user } = useAuth();
  const { data: overview, isLoading } = useAthleteOverview();
  const name = overview?.athlete?.name ?? overview?.associate?.name ?? user?.name ?? "Atleta";
  const photo = overview?.athlete?.photoUrl ?? null;
  const [tab, setTab] = useState<"proximos" | "historico">("proximos");
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const respondCallupMutation = useMutation({
    mutationFn: ({ gameId, status }: { gameId: string; status: "CONFIRMED" | "DECLINED" }) =>
      apiRequest(`/sports/games/${gameId}/my-callup`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["athlete-overview"] })
  });

  const nextGame = overview?.nextGame;
  const recentGames = overview?.recentGames ?? [];
  const showConvocacao = selectedGame && nextGame && selectedGame === nextGame.gameId;

  if (showConvocacao && nextGame) {
    const weekday = nextGame.date
      ? new Date(nextGame.date).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })
      : null;
    const time = nextGame.date
      ? new Date(nextGame.date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      : null;

    return (
      <div className="ap-root">
        <APSidebar name={name} photo={photo} />
        <div className="ap-page">
          <APTopbar
            name={name}
            photo={photo}
            onBack={() => setSelectedGame(null)}
            action={<span className="ap-topbar__title">Convocação</span>}
          />
          <div className="ap-page-body">
            <div className="ap-convocacao-detail">
              {/* Hero da partida */}
              <div className="ap-convocacao-detail__hero">
                <APBadge tone="danger">CONVOCADO</APBadge>
                <p className="ap-convocacao-detail__competition">{(nextGame as any).competition ?? "Jogo oficial"}</p>
                <div className="ap-convocacao-detail__matchup">
                  <div className="ap-convocacao-detail__team">
                    <div className="ap-convocacao-detail__team-logo">⚽</div>
                    <span className="ap-convocacao-detail__team-name">{nextGame.redTeamName ?? "Time A"}</span>
                  </div>
                  <span className="ap-convocacao-detail__vs">X</span>
                  <div className="ap-convocacao-detail__team">
                    <div className="ap-convocacao-detail__team-logo">⚽</div>
                    <span className="ap-convocacao-detail__team-name">{nextGame.whiteTeamName ?? "Time B"}</span>
                  </div>
                </div>
                <div className="ap-convocacao-detail__game-info">
                  {weekday ? <span><CalendarDays size={13} />{weekday}</span> : null}
                  {time ? <span><Clock size={13} />{time}</span> : null}
                  {nextGame.location ? <span><MapPin size={13} />{nextGame.location}</span> : null}
                </div>
              </div>

              {/* Informações da convocação */}
              <APCard>
                <APSectionTitle>Informações da convocação</APSectionTitle>
                <div className="ap-convocacao-detail__fields" style={{ marginTop: "0.75rem" }}>
                  {(nextGame as any).competition ? (
                    <div className="ap-convocacao-detail__field">
                      <p className="ap-convocacao-detail__field-label">Competição</p>
                      <p className="ap-convocacao-detail__field-value">{(nextGame as any).competition}</p>
                    </div>
                  ) : null}
                  {weekday ? (
                    <div className="ap-convocacao-detail__field">
                      <p className="ap-convocacao-detail__field-label">Data</p>
                      <p className="ap-convocacao-detail__field-value">{weekday}</p>
                    </div>
                  ) : null}
                  {time ? (
                    <div className="ap-convocacao-detail__field">
                      <p className="ap-convocacao-detail__field-label">Horário</p>
                      <p className="ap-convocacao-detail__field-value">{time}</p>
                    </div>
                  ) : null}
                  {nextGame.location ? (
                    <div className="ap-convocacao-detail__field">
                      <p className="ap-convocacao-detail__field-label">Local</p>
                      <p className="ap-convocacao-detail__field-value">{nextGame.location}</p>
                    </div>
                  ) : null}
                </div>
              </APCard>

              {/* Ações */}
              <div className="ap-convocacao-detail__actions">
                <APButton tone="success" icon={<Check size={16} />} size="lg" fullWidth
                  onClick={() => nextGame && respondCallupMutation.mutate({ gameId: nextGame.gameId, status: "CONFIRMED" })}
                  disabled={respondCallupMutation.isPending}>
                  Confirmar presença
                </APButton>
                <APButton tone="ghost" icon={<X size={16} />} size="lg" fullWidth
                  onClick={() => nextGame && respondCallupMutation.mutate({ gameId: nextGame.gameId, status: "DECLINED" })}
                  disabled={respondCallupMutation.isPending}>
                  Não poderei comparecer
                </APButton>
              </div>

              {/* Histórico */}
              {recentGames.length > 0 ? (
                <APCard>
                  <APSectionTitle>Histórico de convocações</APSectionTitle>
                  <div className="ap-convocacao-history" style={{ marginTop: "0.75rem" }}>
                    {recentGames.slice(0, 5).map((game) => {
                      const result = game.winnerSide == null ? "d" : game.winnerSide === game.side ? "w" : "l";
                      const dateLabel = game.date
                        ? new Date(game.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
                        : "-";
                      return (
                        <div key={game.gameId} className="ap-convocacao-history__row">
                          <span className="ap-convocacao-history__date">{dateLabel}</span>
                          <div className="ap-convocacao-history__game">
                            <p className="ap-convocacao-history__teams">{game.redTeamName} x {game.whiteTeamName}</p>
                            <p className="ap-convocacao-history__score">{game.location ?? "—"}</p>
                          </div>
                          <span
                            className={`ap-convocacao-history__status ap-convocacao-history__status--${result === "w" || result === "d" ? "present" : "absent"}`}
                          >
                            {result === "w" ? "V" : result === "d" ? "E" : "D"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </APCard>
              ) : null}
            </div>
          </div>
          <APNav active="jogos" />
        </div>
      </div>
    );
  }

  return (
    <div className="ap-root">
      <APSidebar name={name} photo={photo} />
      <div className="ap-page">
        <APTopbar name={name} photo={photo} action={<span className="ap-topbar__title">Jogos</span>} />

        <div className="ap-page-body">
          <div className="ap-tabs">
            <button type="button" className={`ap-tab ${tab === "proximos" ? "ap-tab--active" : ""}`} onClick={() => setTab("proximos")}>Próximos</button>
            <button type="button" className={`ap-tab ${tab === "historico" ? "ap-tab--active" : ""}`} onClick={() => setTab("historico")}>Histórico</button>
          </div>

          {isLoading ? <div className="ap-loading">Carregando...</div> : null}

          {tab === "proximos" && !isLoading ? (
            nextGame ? (
              <APCard
                className="ap-convocacao-card"
                style={{ cursor: "pointer" }}
                onClick={() => setSelectedGame(nextGame.gameId)}
              >
                <p className="ap-next-game-card__label"><Trophy size={13} />Próxima convocação</p>
                <div className="ap-convocacao-card__matchup">
                  <div className="ap-convocacao-card__team">
                    <span className="ap-convocacao-card__team-name">{nextGame.redTeamName}</span>
                  </div>
                  <div className="ap-convocacao-card__center">
                    <span className="ap-convocacao-card__sep">X</span>
                    <div className="ap-convocacao-card__info">
                      {nextGame.date ? <span>{new Date(nextGame.date).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}</span> : null}
                      {nextGame.location ? <span><MapPin size={12} />{nextGame.location}</span> : null}
                    </div>
                  </div>
                  <div className="ap-convocacao-card__team">
                    <span className="ap-convocacao-card__team-name">{nextGame.whiteTeamName}</span>
                  </div>
                </div>
                <div className="ap-convocacao-card__actions">
                  <APButton tone="success" icon={<Check size={15} />} fullWidth
                    onClick={() => nextGame && respondCallupMutation.mutate({ gameId: nextGame.gameId, status: "CONFIRMED" })}
                    disabled={respondCallupMutation.isPending}>
                    Confirmar presença
                  </APButton>
                  <APButton tone="ghost" icon={<X size={15} />} fullWidth
                    onClick={() => nextGame && respondCallupMutation.mutate({ gameId: nextGame.gameId, status: "DECLINED" })}
                    disabled={respondCallupMutation.isPending}>
                    Não vou jogar
                  </APButton>
                </div>
              </APCard>
            ) : (
              <div className="ap-empty">
                <Trophy size={36} />
                <p>Nenhum jogo agendado por enquanto.</p>
              </div>
            )
          ) : null}

          {tab === "historico" && !isLoading ? (
            recentGames.length > 0 ? (
              <APCard>
                {recentGames.map((game) => {
                  const result = game.winnerSide == null ? "d" : game.winnerSide === game.side ? "w" : "l";
                  return (
                    <div key={game.gameId} className="ap-game-row">
                      <div className="ap-game-row__date">{game.date ? new Date(game.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : "-"}</div>
                      <div className="ap-game-row__teams">
                        <span>{game.redTeamName}</span>
                        <strong>{game.redScore ?? "-"} × {game.whiteScore ?? "-"}</strong>
                        <span>{game.whiteTeamName}</span>
                      </div>
                      <div className="ap-game-row__right">
                        <span className={`ap-result-badge ap-result-badge--${result}`}>{result === "w" ? "V" : result === "d" ? "E" : "D"}</span>
                      </div>
                    </div>
                  );
                })}
              </APCard>
            ) : (
              <div className="ap-empty">
                <Trophy size={36} />
                <p>Nenhum jogo no histórico.</p>
              </div>
            )
          ) : null}
        </div>
        <APNav active="jogos" />
      </div>
    </div>
  );
}

// ── Page: Desempenho / Estatísticas ──────────
export function AthletePortalPerformancePage() {
  const { user } = useAuth();
  const { data: overview } = useAthleteOverview();
  const name = overview?.athlete?.name ?? overview?.associate?.name ?? user?.name ?? "Atleta";
  const photo = overview?.athlete?.photoUrl ?? null;

  const chartData = overview?.evolution ?? [];
  const gamesPlayed = overview?.numbers?.gamesPlayed ?? 0;

  return (
    <div className="ap-root">
      <APSidebar name={name} photo={photo} />
      <div className="ap-page">
        <APTopbar name={name} photo={photo} action={<span className="ap-topbar__title">Desempenho</span>} />

        <div className="ap-page-body">
          {/* Stats principais */}
          <div className="ap-stats-row ap-stats-row--hero">
          <APStat label="Jogos" value={gamesPlayed} icon={<Trophy size={18} />} />
          <APStat label="Gols" value={overview?.numbers?.goals ?? 0} icon={<Target size={18} />} helper={`Média ${((overview?.numbers?.goals ?? 0) / Math.max(gamesPlayed, 1)).toFixed(2)} por jogo`} />
          <APStat label="Assistências" value={overview?.numbers?.assists ?? 0} icon={<Zap size={18} />} helper={`Média ${((overview?.numbers?.assists ?? 0) / Math.max(gamesPlayed, 1)).toFixed(2)} por jogo`} />
          <APStat label="Presença" value={`${overview?.presence?.presencePercent ?? 0}%`} icon={<CalendarDays size={18} />} helper={`${overview?.presence?.gamesPresent ?? 0} de ${gamesPlayed} jogos`} />
          <APStat label="Participações" value={overview?.insights?.goalParticipations ?? 0} icon={<Activity size={18} />} helper={`${(overview?.insights?.goalsPerGame ?? 0).toFixed(2)} gols/jogo`} />
          <APStat label="Cartões" value={overview?.numbers?.yellowCards ?? 0} icon={<Star size={18} />} />
        </div>

        {/* Gráfico de evolução */}
        {chartData.length > 0 ? (
          <APCard className="ap-chart-card">
            <APSectionTitle>Evolução na temporada</APSectionTitle>
            <div className="ap-chart-wrap">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="goals" stroke="var(--brand-primary, #dc2626)" strokeWidth={2} dot={{ r: 3 }} name="Gols" />
                  <Line type="monotone" dataKey="assists" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Assists" />
                  <Line type="monotone" dataKey="games" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="Jogos" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </APCard>
        ) : null}

        {/* Rankings */}
        {overview?.ranking ? (
          <APCard>
            <APSectionTitle>Rankings na temporada</APSectionTitle>
            <div className="ap-rankings">
              {overview.ranking.topGoals ? (
                <div className="ap-ranking-block">
                  <p className="ap-ranking-block__label">Artilharia</p>
                  {overview.ranking.topGoals.slice(0, 3).map((r) => (
                    <div key={r.athleteId} className={`ap-ranking-row ${r.athleteId === overview.athlete?.id ? "ap-ranking-row--me" : ""}`}>
                      <span className="ap-ranking-row__pos">#{r.rank}</span>
                      <span className="ap-ranking-row__name">{r.name}</span>
                      <strong className="ap-ranking-row__val">{r.value} gols</strong>
                    </div>
                  ))}
                </div>
              ) : null}
              {overview.ranking.topAssists ? (
                <div className="ap-ranking-block">
                  <p className="ap-ranking-block__label">Assistências</p>
                  {overview.ranking.topAssists.slice(0, 3).map((r) => (
                    <div key={r.athleteId} className={`ap-ranking-row ${r.athleteId === overview.athlete?.id ? "ap-ranking-row--me" : ""}`}>
                      <span className="ap-ranking-row__pos">#{r.rank}</span>
                      <span className="ap-ranking-row__name">{r.name}</span>
                      <strong className="ap-ranking-row__val">{r.value} assist.</strong>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </APCard>
          ) : null}
        </div>
        <APNav active="desempenho" />
      </div>
    </div>
  );
}

// ── Page: Financeiro ─────────────────────────
export function AthletePortalFinancePage() {
  const { user } = useAuth();
  const now = useMemo(() => { const d = new Date(); return { month: d.getUTCMonth() + 1, year: d.getUTCFullYear() }; }, []);
  const { data: overview } = useAthleteOverview();
  const queryClient = useQueryClient();
  const name = overview?.athlete?.name ?? overview?.associate?.name ?? user?.name ?? "Atleta";
  const photo = overview?.athlete?.photoUrl ?? null;

  const currentPaymentQuery = useQuery({
    queryKey: ["athlete-portal-current-payment", now.month, now.year],
    queryFn: () => apiRequest<{ payment: AthleteSelfOverview["currentPayment"] }>(`/athlete/me/payments/current?month=${now.month}&year=${now.year}`),
    refetchInterval: 4000
  });

  const [checkout, setCheckout] = useState<AthleteSelfCheckoutResponse["checkout"] | null>(null);
  const [pixOpen, setPixOpen] = useState(false);

  const checkoutMutation = useMutation({
    mutationFn: () => apiRequest<AthleteSelfCheckoutResponse>(`/athlete/me/payments/current/checkout?month=${now.month}&year=${now.year}`, { method: "POST" }),
    onSuccess: async (res) => {
      setCheckout(res.checkout);
      setPixOpen(true);
      await queryClient.invalidateQueries({ queryKey: ["athlete-portal-current-payment"] });
    }
  });

  const payment = currentPaymentQuery.data?.payment ?? overview?.currentPayment;
  const isPending = payment?.status !== "PAID";
  const dueDate = payment?.dueDate ? fmtDate(payment.dueDate) : "-";

  const recentPayments = overview?.recentPayments ?? [];

  return (
    <div className="ap-root">
      <APSidebar name={name} photo={photo} />
      <div className="ap-page">
        <APTopbar name={name} photo={photo} action={<span className="ap-topbar__title">Financeiro</span>} />

        <div className="ap-page-body">
          {/* Resumo financeiro */}
        <div className="ap-finance-summary">
          <APCard className="ap-finance-summary__item ap-finance-summary__item--open">
            <p className="ap-finance-summary__label">Em aberto</p>
            <strong className="ap-finance-summary__value">{fmtCurrency(payment?.amountCents ?? 0)}</strong>
            <span className="ap-finance-summary__hint">{isPending ? "1 cobrança pendente" : "Sem pendências"}</span>
          </APCard>
          <APCard className="ap-finance-summary__item">
            <p className="ap-finance-summary__label">Total pago</p>
            <strong className="ap-finance-summary__value">{fmtCurrency(overview?.financeSummary?.paidCentsInYear ?? 0)}</strong>
            <span className="ap-finance-summary__hint">{overview?.financeSummary?.paidCount ?? 0} pagamentos</span>
          </APCard>
          <APCard className="ap-finance-summary__item">
            <p className="ap-finance-summary__label">Próx. vencimento</p>
            <strong className="ap-finance-summary__value ap-finance-summary__value--date">{dueDate}</strong>
            <span className="ap-finance-summary__hint">Mensalidade</span>
          </APCard>
          <APCard className="ap-finance-summary__item">
            <p className="ap-finance-summary__label">Adimplência</p>
            <strong className="ap-finance-summary__value">{overview?.insights?.adimplenciaPercent ?? 0}%</strong>
            <APBadge tone={((overview?.insights?.adimplenciaPercent ?? 0) >= 90) ? "success" : "warning"}>
              {((overview?.insights?.adimplenciaPercent ?? 0) >= 90) ? "Bom pagador" : "Em atraso"}
            </APBadge>
          </APCard>
        </div>

        {/* Cobrança atual + PIX */}
        {isPending && payment ? (
          <APCard className="ap-pix-card">
            <div className="ap-pix-card__info">
              <p className="ap-pix-card__charge-name">Mensalidade</p>
              <strong className="ap-pix-card__amount">{fmtCurrency(payment.amountCents ?? 0)}</strong>
              <p className="ap-pix-card__due">Vencimento: {dueDate}</p>
              <APBadge tone="danger">Pendente</APBadge>
            </div>
            {checkout && pixOpen ? (
              <div className="ap-pix-card__qr">
                <img src={checkout.qrCodeDataUrl} alt="QR Code PIX" className="ap-pix-card__qr-img" />
                <p className="ap-pix-card__copy-label">Código copia e cola:</p>
                <textarea readOnly className="ap-pix-card__copy-code" value={checkout.pixCopyPaste} rows={3} />
                <APButton tone="secondary" icon={<Download size={15} />} fullWidth onClick={() => navigator.clipboard.writeText(checkout.pixCopyPaste)}>
                  Copiar código PIX
                </APButton>
              </div>
            ) : null}
            <APButton tone="primary" icon={<QrCode size={16} />} fullWidth disabled={checkoutMutation.isPending} onClick={() => checkoutMutation.mutate()}>
              {checkoutMutation.isPending ? "Gerando QR..." : "Gerar PIX"}
            </APButton>
          </APCard>
        ) : (
          <APCard className="ap-pix-card ap-pix-card--paid">
            <Check size={24} className="ap-pix-card__paid-icon" />
            <p className="ap-pix-card__paid-text">Mensalidade em dia!</p>
          </APCard>
        )}

        {/* Histórico de pagamentos */}
        <APSectionTitle>Todas as cobranças</APSectionTitle>
        <APCard>
          {recentPayments.length > 0 ? recentPayments.map((p) => (
            <div key={p.id} className="ap-payment-row">
              <div className="ap-payment-row__info">
                <span className="ap-payment-row__ref">{String(p.month).padStart(2, "0")}/{p.year}</span>
                <span className="ap-payment-row__amount">{fmtCurrency(p.amountCents)}</span>
              </div>
              <div className="ap-payment-row__right">
                <APBadge tone={p.status === "PAID" ? "success" : p.status === "LATE" ? "danger" : "warning"}>
                  {p.status === "PAID" ? "Pago" : p.status === "LATE" ? "Atrasado" : "Pendente"}
                </APBadge>
                {p.status === "PAID" ? <Download size={14} className="ap-payment-row__download" /> : null}
              </div>
            </div>
          )) : <p className="ap-empty-text">Nenhum pagamento encontrado.</p>}
          </APCard>
        </div>
        <APNav active="financeiro" />
      </div>
    </div>
  );
}

// ── Page: Saúde e Condição Física ────────────
export function AthletePortalHealthPage() {
  const { user } = useAuth();
  const { data: overview } = useAthleteOverview();
  const name = overview?.athlete?.name ?? overview?.associate?.name ?? user?.name ?? "Atleta";
  const photo = overview?.athlete?.photoUrl ?? null;
  const medical = overview?.athlete;
  const statusLabels: Record<string, string> = {
    CLEARED: "Liberado",
    OBSERVATION: "Em observação",
    INJURED: "Vetado por lesão",
    TREATMENT: "Em tratamento"
  };
  const statusTones: Record<string, "success" | "warning" | "danger"> = {
    CLEARED: "success",
    OBSERVATION: "warning",
    INJURED: "danger",
    TREATMENT: "warning"
  };

  return (
    <div className="ap-root">
      <APSidebar name={name} photo={photo} />
      <div className="ap-page">
        <APTopbar name={name} photo={photo} action={<span className="ap-topbar__title">Saúde</span>} />

      <div className="ap-page-body">
        {/* Status de saúde */}
        <APCard className="ap-health-status-card">
          <div className="ap-health-status-card__header">
            <Heart size={28} className="ap-health-status-card__icon" />
            <div>
              <p className="ap-health-status-card__label">Status de saúde</p>
              <APBadge tone={statusTones[medical?.medicalStatus ?? "CLEARED"] ?? "success"}>
                {statusLabels[medical?.medicalStatus ?? "CLEARED"] ?? "Liberado"}
              </APBadge>
            </div>
          </div>
          {medical?.medicalNote ? <p className="ap-health-status-card__note">{medical.medicalNote}</p> : null}
          {medical?.medicalReturnDate ? <p className="ap-health-status-card__return">Retorno previsto: {fmtDate(medical.medicalReturnDate)}</p> : null}
        </APCard>

        {/* Stats de saúde mockados (em produção viria de endpoint dedicado) */}
        <div className="ap-stats-row">
          <APStat label="Status físico" value={statusLabels[medical?.medicalStatus ?? "CLEARED"]} icon={<Heart size={16} />} />
          <APStat label="Avaliação física" value="–" icon={<Activity size={16} />} helper="Aguardando avaliação" />
          <APStat label="Carga de treino" value="–" icon={<Zap size={16} />} helper="Últimos 7 dias" />
          <APStat label="Hidratação" value="–" icon={<Star size={16} />} helper="Meta diária" />
        </div>

        {/* Aviso médico */}
        <APCard>
          <APSectionTitle>Enviar aviso médico</APSectionTitle>
          <p className="ap-health-note-hint">Comunique à comissão técnica se estiver com alguma limitação física.</p>
          <div className="ap-health-form">
            <select className="ap-health-form__select">
              <option value="CLEARED">Liberado</option>
              <option value="OBSERVATION">Em observação</option>
              <option value="INJURED">Vetado por lesão</option>
              <option value="TREATMENT">Em tratamento</option>
            </select>
            <textarea className="ap-health-form__note" placeholder="Observações (opcional)..." rows={3} />
            <APButton tone="primary" fullWidth>Enviar aviso</APButton>
          </div>
        </APCard>

        {/* Documentos médicos */}
        <APSectionTitle>Documentos médicos</APSectionTitle>
        <APCard>
          <div className="ap-empty">
            <BookOpen size={28} />
            <p>Nenhum documento médico cadastrado.</p>
          </div>
          </APCard>
        </div>
        <APNav active="saude" />
      </div>
    </div>
  );
}

// ── Page: Carreira ───────────────────────────
export function AthletePortalCareerPage() {
  const { user } = useAuth();
  const { data: overview } = useAthleteOverview();
  const name = overview?.athlete?.name ?? overview?.associate?.name ?? user?.name ?? "Atleta";
  const photo = overview?.athlete?.photoUrl ?? null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const careerData = (overview as any)?.career;

  return (
    <div className="ap-root">
      <APSidebar name={name} photo={photo} />
      <div className="ap-page">
      <APTopbar name={name} photo={photo} action={<span className="ap-topbar__title">Minha Carreira</span>} />

      <div className="ap-page-body">
        {/* Stats gerais de carreira */}
        <div className="ap-stats-row ap-stats-row--hero">
          <APStat label="Jogos" value={overview?.numbers?.gamesPlayed ?? 0} icon={<Trophy size={18} />} helper="Nesta temporada" />
          <APStat label="Gols" value={overview?.numbers?.goals ?? 0} icon={<Target size={18} />} />
          <APStat label="Assistências" value={overview?.numbers?.assists ?? 0} icon={<Zap size={18} />} />
          <APStat label="Títulos" value={careerData?.totalTitles ?? 0} icon={<Medal size={18} />} />
          <APStat label="Prêmios ind." value={careerData?.totalAwards ?? 0} icon={<Star size={18} />} />
          <APStat label="Permanência" value={overview?.membership?.athleteTenureLabel ?? "–"} icon={<CalendarDays size={18} />} helper="No clube" />
        </div>

        {/* Linha do tempo da carreira */}
        <APSectionTitle>Linha do tempo da carreira</APSectionTitle>
        <APCard>
          {careerData?.timeline && careerData.timeline.length > 0 ? (
            <div className="ap-career-timeline">
              {careerData.timeline.map((event: { year: number; title: string; description: string }, i: number) => (
                <div key={i} className="ap-career-event">
                  <div className="ap-career-event__year">{event.year}</div>
                  <div className="ap-career-event__dot" />
                  <div className="ap-career-event__body">
                    <p className="ap-career-event__title">{event.title}</p>
                    <p className="ap-career-event__desc">{event.description}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="ap-empty">
              <Trophy size={28} />
              <p>Linha do tempo ainda em construção.</p>
            </div>
          )}
        </APCard>

        {/* Conquistas */}
        <APSectionTitle>Títulos conquistados</APSectionTitle>
        <APCard>
          {careerData?.titles && careerData.titles.length > 0 ? (
            <div className="ap-titles-grid">
              {careerData.titles.map((t: { year: number; name: string; competition: string }, i: number) => (
                <div key={i} className="ap-title-card">
                  <span className="ap-title-card__trophy">🏆</span>
                  <p className="ap-title-card__year">{t.year}</p>
                  <p className="ap-title-card__name">{t.name}</p>
                  <p className="ap-title-card__competition">{t.competition}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="ap-empty">
              <Medal size={28} />
              <p>Nenhum título registrado ainda.</p>
            </div>
          )}
        </APCard>

        {/* Você na história */}
        <APCard className="ap-hall-cta">
          <Star size={24} />
          <div>
            <p className="ap-hall-cta__title">Você na história do clube</p>
            <p className="ap-hall-cta__sub">Veja sua posição entre os maiores da história.</p>
          </div>
          <Link to="/atleta/conquistas" className="ap-btn ap-btn--ghost ap-btn--sm">Ver ranking</Link>
        </APCard>
      </div>
      <APNav active="jogos" />
      </div>
    </div>
  );
}

// ── Page: Perfil ─────────────────────────────
export function AthletePortalProfilePage() {
  const { user, logout } = useAuth();
  const { data: overview } = useAthleteOverview();
  const name = overview?.athlete?.name ?? overview?.associate?.name ?? user?.name ?? "Atleta";
  const photo = overview?.athlete?.photoUrl ?? null;
  const athlete = overview?.athlete;

  const positionLabels: Record<string, string> = {
    GOALKEEPER: "Goleiro",
    DEFENDER: "Zagueiro",
    FULLBACK: "Lateral",
    MIDFIELDER: "Meia",
    FORWARD: "Atacante",
    LINE: "Linha"
  };

  return (
    <div className="ap-root">
      <APSidebar name={name} photo={photo} />
      <div className="ap-page">
      <APTopbar name={name} photo={photo} action={<span className="ap-topbar__title">Meu Perfil</span>} />

      <div className="ap-page-body">
        {/* Card de perfil */}
        <APCard className="ap-profile-hero">
          <div className="ap-profile-hero__photo-wrap">
            {photo ? (
              <img src={photo} alt={name} className="ap-profile-hero__photo" />
            ) : (
              <span className="ap-profile-hero__initials">{initials(name)}</span>
            )}
            <button type="button" className="ap-profile-hero__photo-btn" title="Alterar foto">📷</button>
          </div>
          <div className="ap-profile-hero__info">
            <h1 className="ap-profile-hero__name">{name}</h1>
            <div className="ap-profile-hero__badges">
              <APBadge tone="default">{athlete?.position ? (positionLabels[athlete.position] ?? athlete.position) : "Atleta"}</APBadge>
              <APBadge tone={athlete?.medicalStatus === "CLEARED" ? "success" : "danger"}>
                {athlete?.medicalStatus === "CLEARED" ? "Liberado" : "Vetado"}
              </APBadge>
            </div>
          </div>
          <button type="button" className="ap-btn ap-btn--outline ap-btn--sm ap-profile-hero__edit">Editar perfil</button>
        </APCard>

        {/* Dados do atleta */}
        <APCard>
          <APSectionTitle>Sobre mim</APSectionTitle>
          <div className="ap-profile-fields">
            {athlete?.position ? (
              <div className="ap-profile-field">
                <p className="ap-profile-field__label">Posição</p>
                <p className="ap-profile-field__value">{positionLabels[athlete.position] ?? athlete.position}</p>
              </div>
            ) : null}
            {overview?.associate?.email ? (
              <div className="ap-profile-field">
                <p className="ap-profile-field__label">Email</p>
                <p className="ap-profile-field__value">{overview.associate.email}</p>
              </div>
            ) : null}
            {overview?.associate?.phone ? (
              <div className="ap-profile-field">
                <p className="ap-profile-field__label">Telefone</p>
                <p className="ap-profile-field__value">{overview.associate.phone}</p>
              </div>
            ) : null}
            {athlete?.joinedAt ? (
              <div className="ap-profile-field">
                <p className="ap-profile-field__label">Associado desde</p>
                <p className="ap-profile-field__value">{fmtDate(athlete.joinedAt)}</p>
              </div>
            ) : null}
            {athlete?.sportsNote ? (
              <div className="ap-profile-field">
                <p className="ap-profile-field__label">Observações técnicas</p>
                <p className="ap-profile-field__value">{athlete.sportsNote}</p>
              </div>
            ) : null}
          </div>
        </APCard>

        {/* Estatísticas do perfil */}
        <APSectionTitle>Estatísticas na temporada</APSectionTitle>
        <div className="ap-stats-row">
          <APStat label="Jogos" value={overview?.numbers?.gamesPlayed ?? 0} icon={<Trophy size={16} />} />
          <APStat label="Gols" value={overview?.numbers?.goals ?? 0} icon={<Target size={16} />} />
          <APStat label="Assistências" value={overview?.numbers?.assists ?? 0} icon={<Zap size={16} />} />
          <APStat label="Presença" value={`${overview?.presence?.presencePercent ?? 0}%`} icon={<Star size={16} />} />
        </div>

        {/* Ações */}
        <APCard>
          <div className="ap-profile-actions">
            <button type="button" className="ap-profile-action-item">
              <Settings size={18} />
              <span>Configurações</span>
              <ChevronRight size={16} />
            </button>
            <button type="button" className="ap-profile-action-item">
              <Share2 size={18} />
              <span>Compartilhar perfil</span>
              <ChevronRight size={16} />
            </button>
            <button type="button" className="ap-profile-action-item">
              <MessageCircle size={18} />
              <span>Fale com a diretoria</span>
              <ChevronRight size={16} />
            </button>
            <button type="button" className="ap-profile-action-item ap-profile-action-item--danger" onClick={logout}>
              <LogOut size={18} />
              <span>Sair</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </APCard>
      </div>
      <APNav active="perfil" />
      </div>
    </div>
  );
}

// ── Page: Conquistas ─────────────────────────
export function AthletePortalAchievementsPage() {
  const { user } = useAuth();
  const { data: overview } = useAthleteOverview();
  const name = overview?.athlete?.name ?? overview?.associate?.name ?? user?.name ?? "Atleta";
  const photo = overview?.athlete?.photoUrl ?? null;
  const [tab, setTab] = useState<"titulos" | "premios" | "medalhas">("titulos");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const careerData = (overview as any)?.career;

  return (
    <div className="ap-root">
      <APSidebar name={name} photo={photo} />
      <div className="ap-page">
      <APTopbar name={name} photo={photo} action={<span className="ap-topbar__title">Conquistas</span>} />

      <div className="ap-page-body">
        <div className="ap-achievements-summary">
          <APStat label="Títulos" value={careerData?.totalTitles ?? 0} icon={<Trophy size={18} />} />
          <APStat label="Prêmios ind." value={careerData?.totalAwards ?? 0} icon={<Star size={18} />} />
          <APStat label="Medalhas" value="–" icon={<Medal size={18} />} />
          <APStat label="Permanência" value={overview?.membership?.athleteTenureLabel ?? "–"} icon={<CalendarDays size={18} />} />
        </div>

        <div className="ap-tabs">
          <button type="button" className={`ap-tab ${tab === "titulos" ? "ap-tab--active" : ""}`} onClick={() => setTab("titulos")}>Títulos</button>
          <button type="button" className={`ap-tab ${tab === "premios" ? "ap-tab--active" : ""}`} onClick={() => setTab("premios")}>Prêmios individuais</button>
          <button type="button" className={`ap-tab ${tab === "medalhas" ? "ap-tab--active" : ""}`} onClick={() => setTab("medalhas")}>Medalhas</button>
        </div>

        {tab === "titulos" ? (
          careerData?.titles && careerData.titles.length > 0 ? (
            <div className="ap-titles-grid">
              {careerData.titles.map((t: { year: number; name: string; competition: string }, i: number) => (
                <div key={i} className="ap-title-card">
                  <span className="ap-title-card__trophy">🏆</span>
                  <p className="ap-title-card__year">{t.year}</p>
                  <p className="ap-title-card__name">{t.name}</p>
                  <p className="ap-title-card__competition">{t.competition}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="ap-empty"><Trophy size={32} /><p>Nenhum título ainda.</p></div>
          )
        ) : (
          <div className="ap-empty"><Medal size={32} /><p>Nenhum registro encontrado.</p></div>
        )}
      </div>
      <APNav active="jogos" />
      </div>
    </div>
  );
}
