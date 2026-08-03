import { useState, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Coins,
  CreditCard,
  DollarSign,
  FileText,
  Home,
  LogOut,
  MapPin,
  MessageSquare,
  QrCode,
  Receipt,
  Shirt,
  Star,
  Target,
  Trophy,
  TrendingDown,
  TrendingUp,
  Users,
  UserRound,
  Wallet,
} from "lucide-react";
import { apiRequest } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import type {
  AssociateSelfSummary,
  DashboardSummary,
  SportsDirectorSummary,
} from "../types/domain";

// ── helpers ─────────────────────────────────────────────────────────────────

function fmtCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    (cents || 0) / 100
  );
}

function fmtDate(v: string | null | undefined) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("pt-BR");
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function monthName(month: number) {
  return new Date(2000, month - 1, 1).toLocaleDateString("pt-BR", { month: "long" });
}

// ════════════════════════════════════════════════════════════════════════════
// PORTAL DO ASSOCIADO  (as-*)
// ════════════════════════════════════════════════════════════════════════════

const AS_NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: <Home size={18} />, path: "/associado" },
  { id: "mensalidades", label: "Mensalidades", icon: <Coins size={18} />, path: "/associado/mensalidades" },
  { id: "acervo", label: "Acervo", icon: <Trophy size={18} />, path: "/acervo" },
  { id: "comunicados", label: "Comunicados", icon: <MessageSquare size={18} />, path: "/associado/comunicados" },
  { id: "perfil", label: "Perfil", icon: <UserRound size={18} />, path: "/associado/perfil" },
];

function ASSidebar({ name }: { name: string }) {
  const location = useLocation();
  const { logout } = useAuth();
  const active = AS_NAV_ITEMS.reduce((found, item) => {
    if (location.pathname.startsWith(item.path) && item.path.length > found.length) return item.path;
    return found;
  }, "/associado");

  return (
    <aside className="as-sidebar">
      <div className="as-sidebar__logo">
        <div className="as-sidebar__club-name">
          <span style={{ fontSize: "1.4rem" }}>⚽</span>
        </div>
        <div>
          <div className="as-sidebar__club-name">Portal do Associado</div>
          <div className="as-sidebar__club-sub">GestaSports</div>
        </div>
      </div>

      <nav className="as-sidebar__nav">
        {AS_NAV_ITEMS.map((item) => (
          <Link
            key={item.id}
            to={item.path}
            className={`as-sidebar__item ${active === item.path ? "as-sidebar__item--active" : ""}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="as-sidebar__user">
        <div className="as-sidebar__avatar">{initials(name)}</div>
        <div>
          <div className="as-sidebar__user-name">{name.split(" ")[0]}</div>
          <div className="as-sidebar__user-role">Associado</div>
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

function ASTopbar({ name, action }: { name: string; action?: React.ReactNode }) {
  const { logout } = useAuth();
  return (
    <header className="as-topbar">
      <span className="as-topbar__logo">
        <span className="as-topbar__avatar as-topbar__avatar--initials">{initials(name)}</span>
      </span>
      <div className="as-topbar__center">{action}</div>
      <div className="as-topbar__right">
        <button type="button" className="as-topbar__icon-btn">
          <Bell size={20} />
        </button>
        <button type="button" className="as-topbar__icon-btn as-topbar__icon-btn--name" onClick={logout}>
          <span>{name.split(" ")[0]}</span>
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}

function ASNav({ active }: { active: string }) {
  return (
    <nav className="as-nav">
      {AS_NAV_ITEMS.map((item) => (
        <Link
          key={item.id}
          to={item.path}
          className={`as-nav__item ${active === item.id ? "as-nav__item--active" : ""}`}
        >
          {item.icon}
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

function ASCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <article className={`as-card ${className}`}>{children}</article>;
}

function ASStat({ label, value, icon, helper }: { label: string; value: string | number; icon?: React.ReactNode; helper?: string }) {
  return (
    <div className="as-stat">
      {icon ? <span className="as-stat__icon">{icon}</span> : null}
      <strong className="as-stat__value">{value}</strong>
      <p className="as-stat__label">{label}</p>
      {helper ? <span className="as-stat__helper">{helper}</span> : null}
    </div>
  );
}

function ASBadge({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "success" | "warning" | "danger" }) {
  return <span className={`as-badge as-badge--${tone}`}>{children}</span>;
}

function paymentStatusLabel(status: string) {
  if (status === "PAID") return "Pago";
  if (status === "LATE") return "Atrasado";
  return "Pendente";
}

function paymentStatusTone(status: string): "success" | "danger" | "warning" {
  if (status === "PAID") return "success";
  if (status === "LATE") return "danger";
  return "warning";
}

function useAssociateSummary() {
  return useQuery({
    queryKey: ["associate-self-summary"],
    queryFn: () => apiRequest<AssociateSelfSummary>("/associates/me/summary"),
  });
}

// ── Page: Dashboard do Associado ─────────────────────────────────────────────
export function AssociatePortalDashboardPage() {
  const { user } = useAuth();
  const { data, isLoading } = useAssociateSummary();

  const name = data?.associate?.name ?? user?.name ?? "Associado";
  const status = data?.associate?.status ?? "ACTIVE";
  const statusLabel = status === "ACTIVE" ? "Ativo" : status === "LATE" ? "Pendente" : "Inativo";
  const statusTone = status === "ACTIVE" ? "success" : status === "LATE" ? "warning" : "danger";
  const recentPayments = (data?.payments ?? []).slice(0, 6);

  return (
    <div className="as-root">
      <ASSidebar name={name} />
      <div className="as-page">
        <ASTopbar name={name} action={<span className="as-topbar__title">Dashboard</span>} />
        <div className="as-page-body">
          {/* Hero */}
          <ASCard className="as-hero">
            <div className="as-hero__left">
              <span className="as-hero__avatar">{initials(name)}</span>
              <div>
                <p className="as-hero__greeting">Olá, {name.split(" ")[0]}!</p>
                <p className="as-hero__sub">Bem-vindo ao portal do associado.</p>
                <ASBadge tone={statusTone}>{statusLabel}</ASBadge>
              </div>
            </div>
            <div className="as-hero__right">
              <p className="as-hero__fee-label">Mensalidade</p>
              <p className="as-hero__fee-value">{fmtCurrency(data?.associate?.monthlyFeeCents ?? 0)}</p>
            </div>
          </ASCard>

          {/* Stats */}
          {!isLoading && data ? (
            <div className="as-stats-row">
              <ASStat label="Mensalidade" value={fmtCurrency(data.associate.monthlyFeeCents)} icon={<Coins size={16} />} />
              <ASStat label="Total pago no ano" value={fmtCurrency(data.totals.paidCents)} icon={<CheckCircle2 size={16} />} />
              <ASStat label="Em aberto" value={fmtCurrency(data.totals.pendingCents)} icon={<AlertCircle size={16} />} />
              <ASStat label="Vencimentos atrasados" value={data.totals.lateCount} icon={<Receipt size={16} />} helper="pagamentos" />
            </div>
          ) : null}

          {/* Últimos pagamentos */}
          {recentPayments.length > 0 ? (
            <>
              <h2 className="as-section-title">Últimos pagamentos</h2>
              <ASCard>
                {recentPayments.map((p) => (
                  <div key={p.id} className="as-payment-row">
                    <div className="as-payment-row__info">
                      <span className="as-payment-row__month">{monthName(p.month)}/{p.year}</span>
                      <span className="as-payment-row__amount">{fmtCurrency(p.amountCents)}</span>
                    </div>
                    <div className="as-payment-row__right">
                      {p.paidAt ? (
                        <span className="as-payment-row__date">Pago em {fmtDate(p.paidAt)}</span>
                      ) : (
                        <span className="as-payment-row__date">Vence {fmtDate(p.dueDate)}</span>
                      )}
                      <ASBadge tone={paymentStatusTone(p.status)}>{paymentStatusLabel(p.status)}</ASBadge>
                    </div>
                  </div>
                ))}
              </ASCard>
            </>
          ) : null}

          {/* Link acervo */}
          <Link to="/acervo" className="as-acervo-link">
            <BookOpen size={18} />
            <span>Acessar o Acervo do Clube</span>
          </Link>
        </div>
        <ASNav active="dashboard" />
      </div>
    </div>
  );
}

// ── Page: Mensalidades do Associado ──────────────────────────────────────────
export function AssociatePortalMensalidadesPage() {
  const { user } = useAuth();
  const { data } = useAssociateSummary();
  const [filter, setFilter] = useState<"all" | "paid" | "pending">("all");

  const name = data?.associate?.name ?? user?.name ?? "Associado";
  const allPayments = data?.payments ?? [];
  const filtered =
    filter === "paid"
      ? allPayments.filter((p) => p.status === "PAID")
      : filter === "pending"
      ? allPayments.filter((p) => p.status !== "PAID")
      : allPayments;

  return (
    <div className="as-root">
      <ASSidebar name={name} />
      <div className="as-page">
        <ASTopbar name={name} action={<span className="as-topbar__title">Mensalidades</span>} />
        <div className="as-page-body">
          <div className="as-filter-tabs">
            {(["all", "paid", "pending"] as const).map((f) => (
              <button
                key={f}
                type="button"
                className={`as-filter-tab ${filter === f ? "as-filter-tab--active" : ""}`}
                onClick={() => setFilter(f)}
              >
                {f === "all" ? "Todos" : f === "paid" ? "Pagos" : "Em aberto"}
              </button>
            ))}
          </div>

          <ASCard>
            {filtered.length === 0 ? (
              <p className="as-empty">Nenhum pagamento encontrado.</p>
            ) : (
              filtered.map((p) => (
                <div key={p.id} className="as-payment-row">
                  <div className="as-payment-row__info">
                    <span className="as-payment-row__month">{monthName(p.month)}/{p.year}</span>
                    <span className="as-payment-row__amount">{fmtCurrency(p.amountCents)}</span>
                  </div>
                  <div className="as-payment-row__right">
                    {p.paidAt ? (
                      <span className="as-payment-row__date">Pago em {fmtDate(p.paidAt)}</span>
                    ) : (
                      <span className="as-payment-row__date">Vence {fmtDate(p.dueDate)}</span>
                    )}
                    <ASBadge tone={paymentStatusTone(p.status)}>{paymentStatusLabel(p.status)}</ASBadge>
                    {p.status !== "PAID" ? (
                      <Link to="/atleta/financeiro" className="as-pix-btn">
                        <QrCode size={14} />
                        Pagar com PIX
                      </Link>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </ASCard>
        </div>
        <ASNav active="mensalidades" />
      </div>
    </div>
  );
}

// ── Page: Perfil do Associado ─────────────────────────────────────────────────
export function AssociatePortalPerfilPage() {
  const { user, logout } = useAuth();
  const { data } = useAssociateSummary();

  const name = data?.associate?.name ?? user?.name ?? "Associado";
  const status = data?.associate?.status ?? "ACTIVE";
  const statusLabel = status === "ACTIVE" ? "Ativo" : status === "LATE" ? "Pendente" : "Inativo";
  const statusTone = status === "ACTIVE" ? "success" : status === "LATE" ? "warning" : "danger";

  return (
    <div className="as-root">
      <ASSidebar name={name} />
      <div className="as-page">
        <ASTopbar name={name} action={<span className="as-topbar__title">Perfil</span>} />
        <div className="as-page-body">
          <ASCard className="as-profile-card">
            <div className="as-profile-card__avatar">{initials(name)}</div>
            <div className="as-profile-card__name">{name}</div>
            <ASBadge tone={statusTone}>{statusLabel}</ASBadge>
          </ASCard>

          <ASCard>
            <dl className="as-profile-fields">
              <div className="as-profile-field">
                <dt>E-mail</dt>
                <dd>{user?.email ?? "—"}</dd>
              </div>
              <div className="as-profile-field">
                <dt>Associado desde</dt>
                <dd>{fmtDate(data?.associate?.createdAt)}</dd>
              </div>
              <div className="as-profile-field">
                <dt>Mensalidade</dt>
                <dd>{fmtCurrency(data?.associate?.monthlyFeeCents ?? 0)}</dd>
              </div>
              <div className="as-profile-field">
                <dt>Situação</dt>
                <dd><ASBadge tone={statusTone}>{statusLabel}</ASBadge></dd>
              </div>
            </dl>
          </ASCard>

          <button type="button" className="as-logout-btn" onClick={logout}>
            <LogOut size={16} />
            Sair da conta
          </button>
        </div>
        <ASNav active="perfil" />
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PORTAL DO DIRETOR DE ESPORTES  (sd-*)
// ════════════════════════════════════════════════════════════════════════════

const SD_NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: <Home size={18} />, path: "/esportes" },
  { id: "jogos", label: "Jogos", icon: <CalendarDays size={18} />, path: "/jogos" },
  { id: "elenco", label: "Elenco", icon: <Users size={18} />, path: "/atletas" },
  { id: "escalacao", label: "Escalação", icon: <Shirt size={18} />, path: "/jogos/campo-times" },
  { id: "estatisticas", label: "Estatísticas", icon: <BarChart3 size={18} />, path: "/estatisticas" },
  { id: "competicoes", label: "Competições", icon: <Trophy size={18} />, path: "/competicoes" },
];

function SDSidebar({ name }: { name: string }) {
  const location = useLocation();
  const { logout } = useAuth();
  const active = SD_NAV_ITEMS.reduce((found, item) => {
    if (location.pathname.startsWith(item.path) && item.path.length > found.length) return item.path;
    return found;
  }, "/esportes");

  return (
    <aside className="sd-sidebar">
      <div className="sd-sidebar__logo">
        <div className="sd-sidebar__club-name">
          <span style={{ fontSize: "1.4rem" }}>⚽</span>
        </div>
        <div>
          <div className="sd-sidebar__club-name">Direção de Esportes</div>
          <div className="sd-sidebar__club-sub">GestaSports</div>
        </div>
      </div>

      <nav className="sd-sidebar__nav">
        {SD_NAV_ITEMS.map((item) => (
          <Link
            key={item.id}
            to={item.path}
            className={`sd-sidebar__item ${active === item.path ? "sd-sidebar__item--active" : ""}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="sd-sidebar__user">
        <div className="sd-sidebar__avatar">{initials(name)}</div>
        <div>
          <div className="sd-sidebar__user-name">{name.split(" ")[0]}</div>
          <div className="sd-sidebar__user-role">Diretor Esportivo</div>
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

function SDTopbar({ name, action }: { name: string; action?: React.ReactNode }) {
  const { logout } = useAuth();
  return (
    <header className="sd-topbar">
      <span className="sd-topbar__logo">
        <span className="sd-topbar__avatar sd-topbar__avatar--initials">{initials(name)}</span>
      </span>
      <div className="sd-topbar__center">{action}</div>
      <div className="sd-topbar__right">
        <button type="button" className="sd-topbar__icon-btn">
          <Bell size={20} />
        </button>
        <button type="button" className="sd-topbar__icon-btn sd-topbar__icon-btn--name" onClick={logout}>
          <span>{name.split(" ")[0]}</span>
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}

function SDNav({ active }: { active: string }) {
  return (
    <nav className="sd-nav">
      {SD_NAV_ITEMS.map((item) => (
        <Link
          key={item.id}
          to={item.path}
          className={`sd-nav__item ${active === item.id ? "sd-nav__item--active" : ""}`}
        >
          {item.icon}
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

function SDCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <article className={`sd-card ${className}`}>{children}</article>;
}

function SDStat({ label, value, icon, helper }: { label: string; value: string | number; icon?: React.ReactNode; helper?: string }) {
  return (
    <div className="sd-stat">
      {icon ? <span className="sd-stat__icon">{icon}</span> : null}
      <strong className="sd-stat__value">{value}</strong>
      <p className="sd-stat__label">{label}</p>
      {helper ? <span className="sd-stat__helper">{helper}</span> : null}
    </div>
  );
}

function useSportsDirectorSummary() {
  return useQuery({
    queryKey: ["sports-director-portal-summary"],
    queryFn: () => apiRequest<SportsDirectorSummary>("/dashboard/sports-summary"),
  });
}

// ── Page: Dashboard do Diretor de Esportes ───────────────────────────────────
export function SportsDirectorPortalDashboardPage() {
  const { user } = useAuth();
  const { data, isLoading } = useSportsDirectorSummary();

  const name = user?.name ?? "Diretor";
  const next = data?.nextMatch ?? null;
  const top5 = (data?.presenceRanking ?? []).slice(0, 5);
  const upcoming = data?.upcomingMatches ?? [];

  return (
    <div className="sd-root">
      <SDSidebar name={name} />
      <div className="sd-page">
        <SDTopbar name={name} action={<span className="sd-topbar__title">Dashboard</span>} />
        <div className="sd-page-body">
          {/* Hero */}
          <SDCard className="sd-hero">
            <div>
              <p className="sd-hero__title">Direção de Esportes</p>
              <p className="sd-hero__sub">Central esportiva do clube</p>
            </div>
          </SDCard>

          {/* Quick links */}
          <div className="sd-quick-access">
            {[
              { label: "Marcar jogo", icon: <CalendarDays size={20} />, path: "/jogos" },
              { label: "Campo e Times", icon: <Shirt size={20} />, path: "/jogos/campo-times" },
              { label: "Convocações", icon: <Target size={20} />, path: "/jogos" },
              { label: "Elenco", icon: <Users size={20} />, path: "/atletas" },
            ].map((item) => (
              <Link key={item.label} to={item.path} className="sd-quick-item">
                <span className="sd-quick-item__icon">{item.icon}</span>
                <span className="sd-quick-item__label">{item.label}</span>
              </Link>
            ))}
          </div>

          {/* Stats */}
          {!isLoading && data ? (
            <div className="sd-stats-row">
              <SDStat label="Atletas no elenco" value={data.athletesTotal} icon={<Users size={16} />} />
              <SDStat label="Atletas aptos" value={data.athletesReady} icon={<Star size={16} />} />
              <SDStat label="Confirmados" value={next?.confirmedCount ?? "—"} icon={<CheckCircle2 size={16} />} helper="próximo jogo" />
              <SDStat label="Pendentes" value={next?.pendingCount ?? "—"} icon={<AlertCircle size={16} />} helper="próximo jogo" />
            </div>
          ) : null}

          {/* Próximo jogo */}
          {next ? (
            <>
              <h2 className="sd-section-title">Próximo jogo</h2>
              <SDCard className="sd-match-card">
                <div className="sd-match-card__header">
                  <span className="sd-match-card__opponent">vs {next.opponent}</span>
                  <span className="sd-match-card__date">
                    {new Date(next.startsAt).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}
                  </span>
                </div>
                <div className="sd-match-card__meta">
                  <span><MapPin size={14} /> {next.location}</span>
                </div>
                <div className="sd-match-card__counts">
                  <span className="sd-match-card__confirmed">{next.confirmedCount} confirmados</span>
                  <span className="sd-match-card__pending">{next.pendingCount} pendentes</span>
                </div>
                <div className="sd-match-card__actions">
                  <Link to="/jogos" className="sd-btn">Ver convocação</Link>
                  <Link to="/jogos/campo-times" className="sd-btn sd-btn--secondary">Escalar times</Link>
                </div>
              </SDCard>
            </>
          ) : null}

          {/* Top 5 presença */}
          {top5.length > 0 ? (
            <>
              <h2 className="sd-section-title">Top 5 presença no elenco</h2>
              <SDCard>
                {top5.map((athlete, i) => (
                  <div key={athlete.id} className="sd-presence-row">
                    <span className="sd-presence-row__rank">{i + 1}</span>
                    <div className="sd-presence-row__avatar">
                      {athlete.photoUrl ? (
                        <img src={athlete.photoUrl} alt={athlete.name} />
                      ) : (
                        initials(athlete.name)
                      )}
                    </div>
                    <div className="sd-presence-row__info">
                      <span className="sd-presence-row__name">{athlete.name}</span>
                      <span className="sd-presence-row__sub">{athlete.confirmedCount}/{athlete.totalMatches} jogos</span>
                    </div>
                    <span className="sd-presence-row__pct">{athlete.presencePercent}%</span>
                  </div>
                ))}
              </SDCard>
            </>
          ) : null}

          {/* Próximos jogos */}
          {upcoming.length > 0 ? (
            <>
              <h2 className="sd-section-title">Próximos jogos</h2>
              <SDCard>
                {upcoming.map((match) => (
                  <div key={match.id} className="sd-upcoming-row">
                    <div className="sd-upcoming-row__date">
                      {new Date(match.startsAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                    </div>
                    <div className="sd-upcoming-row__info">
                      <span className="sd-upcoming-row__opponent">vs {match.opponent}</span>
                      <span className="sd-upcoming-row__location"><MapPin size={12} /> {match.location}</span>
                    </div>
                    <span className="sd-upcoming-row__confirmed">{match.confirmedCount} conf.</span>
                  </div>
                ))}
              </SDCard>
            </>
          ) : null}
        </div>
        <SDNav active="dashboard" />
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PORTAL FINANCEIRO  (fi-*)
// ════════════════════════════════════════════════════════════════════════════

const FI_NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: <Home size={18} />, path: "/financeiro?area=DASHBOARD" },
  { id: "lancamentos", label: "Lançamentos", icon: <Receipt size={18} />, path: "/financeiro?area=LANCAMENTOS" },
  { id: "mensalidades", label: "Mensalidades", icon: <Coins size={18} />, path: "/financeiro?area=MENSALIDADES" },
  { id: "cobrancas", label: "Cobranças", icon: <CreditCard size={18} />, path: "/financeiro?area=COBRANCAS" },
  { id: "relatorios", label: "Relatórios", icon: <FileText size={18} />, path: "/relatorios" },
];

function FISidebar({ name }: { name: string }) {
  const location = useLocation();
  const { logout } = useAuth();
  const activePath = location.pathname + location.search;
  const active = FI_NAV_ITEMS.reduce((found, item) => {
    if (activePath.startsWith(item.path.split("?")[0]) && item.path.split("?")[0].length > found.split("?")[0].length) {
      return item.path;
    }
    return found;
  }, FI_NAV_ITEMS[0].path);

  return (
    <aside className="fi-sidebar">
      <div className="fi-sidebar__logo">
        <div className="fi-sidebar__club-name">
          <span style={{ fontSize: "1.4rem" }}>⚽</span>
        </div>
        <div>
          <div className="fi-sidebar__club-name">Portal Financeiro</div>
          <div className="fi-sidebar__club-sub">GestaSports</div>
        </div>
      </div>

      <nav className="fi-sidebar__nav">
        {FI_NAV_ITEMS.map((item) => (
          <Link
            key={item.id}
            to={item.path}
            className={`fi-sidebar__item ${active === item.path ? "fi-sidebar__item--active" : ""}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="fi-sidebar__user">
        <div className="fi-sidebar__avatar">{initials(name)}</div>
        <div>
          <div className="fi-sidebar__user-name">{name.split(" ")[0]}</div>
          <div className="fi-sidebar__user-role">Financeiro</div>
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

function FITopbar({ name, action }: { name: string; action?: React.ReactNode }) {
  const { logout } = useAuth();
  return (
    <header className="fi-topbar">
      <span className="fi-topbar__logo">
        <span className="fi-topbar__avatar fi-topbar__avatar--initials">{initials(name)}</span>
      </span>
      <div className="fi-topbar__center">{action}</div>
      <div className="fi-topbar__right">
        <button type="button" className="fi-topbar__icon-btn">
          <Bell size={20} />
        </button>
        <button type="button" className="fi-topbar__icon-btn fi-topbar__icon-btn--name" onClick={logout}>
          <span>{name.split(" ")[0]}</span>
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}

function FINav({ active }: { active: string }) {
  return (
    <nav className="fi-nav">
      {FI_NAV_ITEMS.map((item) => (
        <Link
          key={item.id}
          to={item.path}
          className={`fi-nav__item ${active === item.id ? "fi-nav__item--active" : ""}`}
        >
          {item.icon}
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

function FICard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <article className={`fi-card ${className}`}>{children}</article>;
}

function FIStat({ label, value, icon, helper, tone }: { label: string; value: string | number; icon?: React.ReactNode; helper?: string; tone?: "positive" | "negative" | "neutral" }) {
  return (
    <div className={`fi-stat ${tone ? `fi-stat--${tone}` : ""}`}>
      {icon ? <span className="fi-stat__icon">{icon}</span> : null}
      <strong className="fi-stat__value">{value}</strong>
      <p className="fi-stat__label">{label}</p>
      {helper ? <span className="fi-stat__helper">{helper}</span> : null}
    </div>
  );
}

function useFinancialSummary() {
  const now = useMemo(() => {
    const d = new Date();
    return { month: d.getUTCMonth() + 1, year: d.getUTCFullYear() };
  }, []);
  return {
    ...useQuery({
      queryKey: ["financial-portal-summary", now.month, now.year],
      queryFn: () =>
        apiRequest<DashboardSummary>(`/dashboard/summary?month=${now.month}&year=${now.year}`),
    }),
    now,
  };
}

function entryTypeLabel(type: string) {
  if (type === "REVENUE") return "Receita";
  if (type === "EXPENSE") return "Despesa";
  return type;
}

function entryStatusTone(status: string): "success" | "warning" | "danger" | "default" {
  if (status === "PAID" || status === "RECEIVED") return "success";
  if (status === "LATE") return "danger";
  if (status === "PENDING") return "warning";
  return "default";
}

function entryStatusLabel(status: string) {
  if (status === "PAID") return "Pago";
  if (status === "RECEIVED") return "Recebido";
  if (status === "PENDING") return "Pendente";
  if (status === "LATE") return "Atrasado";
  return status;
}

// ── Page: Dashboard Financeiro ───────────────────────────────────────────────
export function FinancialPortalDashboardPage() {
  const { user } = useAuth();
  const { data, isLoading, now } = useFinancialSummary();

  const name = user?.name ?? "Financeiro";
  const recentEntries = (data?.recentFinancialEntries ?? []).slice(0, 5);
  const inadimplencia =
    data && data.associatesActive > 0
      ? Math.round((data.lateAssociates / data.associatesActive) * 100)
      : 0;

  return (
    <div className="fi-root">
      <FISidebar name={name} />
      <div className="fi-page">
        <FITopbar name={name} action={<span className="fi-topbar__title">Dashboard</span>} />
        <div className="fi-page-body">
          {/* Hero */}
          <FICard className="fi-hero">
            <div>
              <p className="fi-hero__title">Financeiro do Clube</p>
              <p className="fi-hero__sub">
                {new Date(now.year, now.month - 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
              </p>
            </div>
          </FICard>

          {/* Stats principais */}
          {!isLoading && data ? (
            <div className="fi-stats-row">
              <FIStat
                label="Receitas do mês"
                value={fmtCurrency(data.monthRevenueCents)}
                icon={<TrendingUp size={16} />}
                tone="positive"
              />
              <FIStat
                label="Despesas do mês"
                value={fmtCurrency(data.monthExpenseCents)}
                icon={<TrendingDown size={16} />}
                tone="negative"
              />
              <FIStat
                label="Saldo"
                value={fmtCurrency(data.balanceCents)}
                icon={<Wallet size={16} />}
                tone={data.balanceCents >= 0 ? "positive" : "negative"}
              />
              <FIStat
                label="Inadimplência"
                value={`${inadimplencia}%`}
                icon={<AlertCircle size={16} />}
                helper={`${data.lateAssociates} associados`}
                tone={inadimplencia > 20 ? "negative" : inadimplencia > 10 ? "neutral" : "positive"}
              />
            </div>
          ) : null}

          {/* Mensalidades */}
          {data?.monthlyFeeAlert ? (
            <>
              <h2 className="fi-section-title">Mensalidades</h2>
              <FICard className="fi-fee-alert">
                <div className="fi-fee-alert__row">
                  <span className="fi-fee-alert__label">Pendentes</span>
                  <span className="fi-fee-alert__count fi-fee-alert__count--pending">
                    {data.monthlyFeeAlert.pendingCount}
                  </span>
                </div>
                <div className="fi-fee-alert__row">
                  <span className="fi-fee-alert__label">Em atraso</span>
                  <span className="fi-fee-alert__count fi-fee-alert__count--late">
                    {data.monthlyFeeAlert.lateCount}
                  </span>
                </div>
                <div className="fi-fee-alert__row">
                  <span className="fi-fee-alert__label">Valor total em aberto</span>
                  <span className="fi-fee-alert__amount">
                    {fmtCurrency(data.monthlyFeeAlert.amountCents)}
                  </span>
                </div>
                <Link to="/financeiro?area=MENSALIDADES" className="fi-btn fi-btn--secondary fi-btn--full">
                  Ver mensalidades
                </Link>
              </FICard>
            </>
          ) : null}

          {/* Últimos lançamentos */}
          {recentEntries.length > 0 ? (
            <>
              <h2 className="fi-section-title">Últimos lançamentos</h2>
              <FICard>
                {recentEntries.map((entry) => (
                  <div key={entry.id} className="fi-entry-row">
                    <div
                      className={`fi-entry-row__type ${entry.type === "REVENUE" ? "fi-entry-row__type--revenue" : "fi-entry-row__type--expense"}`}
                    >
                      {entry.type === "REVENUE" ? (
                        <TrendingUp size={14} />
                      ) : (
                        <TrendingDown size={14} />
                      )}
                    </div>
                    <div className="fi-entry-row__info">
                      <span className="fi-entry-row__desc">{entry.description}</span>
                      <span className="fi-entry-row__category">{entry.category} · {entryTypeLabel(entry.type)}</span>
                    </div>
                    <div className="fi-entry-row__right">
                      <span
                        className={`fi-entry-row__amount ${entry.type === "REVENUE" ? "fi-entry-row__amount--revenue" : "fi-entry-row__amount--expense"}`}
                      >
                        {entry.type === "REVENUE" ? "+" : "-"}
                        {fmtCurrency(entry.amountCents)}
                      </span>
                      <span className={`fi-badge fi-badge--${entryStatusTone(entry.status)}`}>
                        {entryStatusLabel(entry.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </FICard>
            </>
          ) : null}

          {/* Quick links */}
          <h2 className="fi-section-title">Acesso rápido</h2>
          <div className="fi-quick-access">
            {[
              { label: "Novo lançamento", icon: <DollarSign size={20} />, path: "/financeiro?area=LANCAMENTOS" },
              { label: "Ver cobranças", icon: <CreditCard size={20} />, path: "/financeiro?area=COBRANCAS" },
              { label: "Mensalidades", icon: <Coins size={20} />, path: "/financeiro?area=MENSALIDADES" },
              { label: "Relatórios", icon: <FileText size={20} />, path: "/relatorios" },
            ].map((item) => (
              <Link key={item.label} to={item.path} className="fi-quick-item">
                <span className="fi-quick-item__icon">{item.icon}</span>
                <span className="fi-quick-item__label">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
        <FINav active="dashboard" />
      </div>
    </div>
  );
}
