/**
 * AmateurUI — Design system para o mercado amador do GestaSports.
 *
 * Princípios:
 *  - Mobile-first: toda tela deve funcionar bem em 375px
 *  - Toque fácil: alvos mínimos de 44px
 *  - Leitura rápida: hierarquia clara, poucos níveis
 *  - Ação primária sempre visível e grande
 *  - Cores do sistema (--brand-*) para personalização por clube
 */

import { type ReactNode, type ButtonHTMLAttributes } from "react";

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export function AmateurPage({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`fl-amateur-page space-y-4 ${className}`}>
      {children}
    </section>
  );
}

/** Cabeçalho de página com eyebrow, título, descrição e ações */
export function AmateurPageHeader({
  eyebrow,
  title,
  description,
  actions,
  badge,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <header className="fl-am-page-header rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <p className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--brand-accent)]">
              {eyebrow}
            </p>
          )}
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h1 className="text-xl font-black tracking-tight text-[var(--shell-text)] sm:text-2xl">
              {title}
            </h1>
            {badge}
          </div>
          {description && (
            <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Cards de estatísticas
// ---------------------------------------------------------------------------

type StatTone = "default" | "success" | "warning" | "danger" | "info" | "brand";

const toneBg: Record<StatTone, string> = {
  default: "bg-slate-100 text-slate-600",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-red-50 text-red-700",
  info: "bg-sky-50 text-sky-700",
  brand: "bg-[var(--brand-primary)] text-white",
};

/** Card de estatística compacto — ideal para métricas rápidas */
export function AmateurStatCard({
  label,
  value,
  helper,
  icon,
  tone = "default",
  onClick,
}: {
  label: string;
  value: string | number;
  helper?: string;
  icon?: ReactNode;
  tone?: StatTone;
  onClick?: () => void;
}) {
  return (
    <article
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      className={`fl-am-stat-card rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition ${onClick ? "cursor-pointer hover:border-[var(--brand-accent)]/40 hover:shadow-md active:scale-[0.98]" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-black uppercase tracking-widest text-[var(--muted)]">
            {label}
          </p>
          <strong className="mt-2 block text-3xl font-black leading-none tracking-tight text-[var(--shell-text)]">
            {value}
          </strong>
        </div>
        {icon && (
          <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${toneBg[tone]}`}>
            {icon}
          </span>
        )}
      </div>
      {helper && (
        <p className="mt-3 text-[12px] font-bold text-[var(--muted)]">{helper}</p>
      )}
    </article>
  );
}

/** Grid responsivo de cards de stats */
export function AmateurStatsGrid({ children, cols = 2 }: { children: ReactNode; cols?: 2 | 4 }) {
  return (
    <div
      className={`grid gap-3 ${cols === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-2 lg:grid-cols-4"}`}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Seção genérica com cabeçalho
// ---------------------------------------------------------------------------

export function AmateurSection({
  title,
  description,
  action,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`fl-am-section rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-base font-black text-[var(--shell-text)]">{title}</h2>
          {description && (
            <p className="mt-0.5 text-[12px] font-semibold text-[var(--muted)]">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Lista de jogadores / confirmações
// ---------------------------------------------------------------------------

type ConfirmStatus = "confirmed" | "pending" | "declined" | "unknown";

const confirmColors: Record<ConfirmStatus, string> = {
  confirmed: "bg-emerald-500",
  pending: "bg-amber-400",
  declined: "bg-red-500",
  unknown: "bg-slate-300",
};

const confirmLabels: Record<ConfirmStatus, string> = {
  confirmed: "Confirmado",
  pending: "Aguardando",
  declined: "Recusou",
  unknown: "—",
};

export function PlayerConfirmItem({
  name,
  position,
  number,
  status,
  photoUrl,
  onConfirm,
  onDecline,
}: {
  name: string;
  position?: string;
  number?: number | string;
  status: ConfirmStatus;
  photoUrl?: string | null;
  onConfirm?: () => void;
  onDecline?: () => void;
}) {
  return (
    <li className="fl-am-player-item flex items-center gap-3 border-b border-slate-100 py-3 last:border-0">
      <div className="relative shrink-0">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={name}
            className="size-10 rounded-full object-cover ring-2 ring-slate-200"
          />
        ) : (
          <span className="flex size-10 items-center justify-center rounded-full bg-[var(--brand-primary)] text-sm font-black text-white">
            {number ?? name.slice(0, 2).toUpperCase()}
          </span>
        )}
        <span
          className={`absolute -right-0.5 -top-0.5 size-3 rounded-full border-2 border-white ${confirmColors[status]}`}
          title={confirmLabels[status]}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-[var(--shell-text)]">{name}</p>
        {position && (
          <p className="text-[11px] font-semibold text-[var(--muted)]">{position}</p>
        )}
      </div>
      <span
        className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${
          status === "confirmed"
            ? "bg-emerald-50 text-emerald-700"
            : status === "declined"
            ? "bg-red-50 text-red-700"
            : "bg-amber-50 text-amber-700"
        }`}
      >
        {confirmLabels[status]}
      </span>
      {(onConfirm ?? onDecline) && (
        <div className="flex shrink-0 gap-1">
          {onConfirm && (
            <AmateurIconButton
              title="Confirmar"
              tone="success"
              onClick={onConfirm}
              aria-label="Confirmar presença"
            >
              ✓
            </AmateurIconButton>
          )}
          {onDecline && (
            <AmateurIconButton
              title="Recusar"
              tone="danger"
              onClick={onDecline}
              aria-label="Recusar presença"
            >
              ✕
            </AmateurIconButton>
          )}
        </div>
      )}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Botões
// ---------------------------------------------------------------------------

type ButtonTone = "brand" | "success" | "warning" | "danger" | "ghost" | "outline";

const buttonToneClasses: Record<ButtonTone, string> = {
  brand:
    "bg-[var(--brand-primary)] text-white hover:opacity-90 shadow-[0_8px_18px_color-mix(in_oklab,var(--brand-primary)_28%,transparent)]",
  success:
    "bg-emerald-600 text-white hover:bg-emerald-700",
  warning: "bg-amber-500 text-white hover:bg-amber-600",
  danger: "bg-red-600 text-white hover:bg-red-700",
  ghost: "bg-transparent text-[var(--shell-text)] hover:bg-slate-100",
  outline:
    "bg-white border border-slate-200 text-[var(--shell-text)] hover:border-slate-300 hover:bg-slate-50",
};

export function AmateurButton({
  tone = "brand",
  size = "md",
  fullWidth = false,
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: ButtonTone;
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}) {
  const sizeClasses = {
    sm: "h-9 px-3.5 text-xs",
    md: "h-11 px-5 text-sm",
    lg: "h-13 px-6 text-base",
  };
  return (
    <button
      {...props}
      className={`fl-am-btn inline-flex items-center justify-center gap-2 rounded-xl font-black transition active:scale-[0.97] disabled:opacity-50 ${sizeClasses[size]} ${buttonToneClasses[tone]} ${fullWidth ? "w-full" : ""} ${className}`}
    >
      {children}
    </button>
  );
}

export function AmateurIconButton({
  tone = "outline",
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: ButtonTone }) {
  return (
    <button
      {...props}
      className={`fl-am-icon-btn grid size-8 place-items-center rounded-lg text-sm font-black transition active:scale-[0.96] ${buttonToneClasses[tone]} ${className}`}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Card de jogo (próximo jogo / resultado)
// ---------------------------------------------------------------------------

export function AmateurMatchCard({
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  date,
  time,
  venue,
  status,
  competition,
  confirmedCount,
  pendingCount,
  onViewDetails,
  onConfirm,
}: {
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  date: string;
  time?: string;
  venue?: string;
  status: "upcoming" | "live" | "finished" | "cancelled";
  competition?: string;
  confirmedCount?: number;
  pendingCount?: number;
  onViewDetails?: () => void;
  onConfirm?: () => void;
}) {
  const statusBadge: Record<string, string> = {
    upcoming: "bg-sky-50 text-sky-700",
    live: "bg-red-600 text-white animate-pulse",
    finished: "bg-slate-100 text-slate-600",
    cancelled: "bg-slate-100 text-slate-500 line-through",
  };
  const statusLabel: Record<string, string> = {
    upcoming: "Agendado",
    live: "Ao vivo",
    finished: "Encerrado",
    cancelled: "Cancelado",
  };

  return (
    <article className="fl-am-match-card overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      {/* Topo: competição + status */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
        <span className="text-[11px] font-black uppercase tracking-widest text-[var(--muted)]">
          {competition ?? "Jogo amistoso"}
        </span>
        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${statusBadge[status]}`}>
          {statusLabel[status]}
        </span>
      </div>

      {/* Placar / times */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-5">
        <div className="text-center">
          <p className="text-sm font-black leading-tight text-[var(--shell-text)]">{homeTeam}</p>
        </div>
        <div className="flex items-center gap-2">
          {status === "finished" ? (
            <span className="text-2xl font-black text-[var(--shell-text)]">
              {homeScore ?? 0} – {awayScore ?? 0}
            </span>
          ) : (
            <span className="text-sm font-black text-[var(--muted)]">×</span>
          )}
        </div>
        <div className="text-center">
          <p className="text-sm font-black leading-tight text-[var(--shell-text)]">{awayTeam}</p>
        </div>
      </div>

      {/* Info: data + local */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-2.5 text-[11px] font-semibold text-[var(--muted)]">
        <span>
          {date}
          {time ? ` · ${time}` : ""}
        </span>
        {venue && <span className="truncate">{venue}</span>}
      </div>

      {/* Confirmações + ações */}
      {(confirmedCount !== undefined || onViewDetails || onConfirm) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3">
          {confirmedCount !== undefined && (
            <span className="text-[11px] font-semibold text-[var(--muted)]">
              <strong className="text-emerald-700">{confirmedCount}</strong> confirmados
              {pendingCount ? `, ${pendingCount} aguardando` : ""}
            </span>
          )}
          <div className="flex gap-2">
            {onViewDetails && (
              <AmateurButton tone="outline" size="sm" onClick={onViewDetails}>
                Detalhes
              </AmateurButton>
            )}
            {onConfirm && (
              <AmateurButton tone="brand" size="sm" onClick={onConfirm}>
                Confirmar presença
              </AmateurButton>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

// ---------------------------------------------------------------------------
// Tabela de classificação da liga
// ---------------------------------------------------------------------------

export type LeagueTableRow = {
  position: number;
  teamName: string;
  teamLogo?: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form?: Array<"W" | "D" | "L">;
  highlight?: "promotion" | "relegation" | "champion";
};

const formColors = { W: "bg-emerald-500", D: "bg-amber-400", L: "bg-red-500" };
const highlightRow: Record<string, string> = {
  champion: "bg-amber-50 border-l-4 border-l-amber-500",
  promotion: "bg-emerald-50 border-l-4 border-l-emerald-500",
  relegation: "bg-red-50 border-l-4 border-l-red-400",
};

export function AmateurLeagueTable({
  rows,
  myTeamName,
}: {
  rows: LeagueTableRow[];
  myTeamName?: string;
}) {
  return (
    <div className="fl-am-league-table overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[540px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="px-3 py-3 text-left text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">
              #
            </th>
            <th className="px-3 py-3 text-left text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">
              Clube
            </th>
            <th className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">
              J
            </th>
            <th className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">
              V
            </th>
            <th className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">
              E
            </th>
            <th className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">
              D
            </th>
            <th className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">
              GD
            </th>
            <th className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">
              Forma
            </th>
            <th className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-widest text-[var(--brand-accent)]">
              Pts
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isMyTeam = myTeamName && row.teamName === myTeamName;
            return (
              <tr
                key={row.position}
                className={`border-b border-slate-100 transition last:border-0 hover:bg-slate-50 ${row.highlight ? highlightRow[row.highlight] : ""} ${isMyTeam ? "font-extrabold" : ""}`}
              >
                <td className="px-3 py-3 text-center text-xs font-black text-[var(--muted)]">
                  {row.position}
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    {row.teamLogo ? (
                      <img src={row.teamLogo} alt={row.teamName} className="size-6 rounded-full object-contain" />
                    ) : (
                      <span className="grid size-6 place-items-center rounded-full bg-[var(--brand-primary)] text-[9px] font-black text-white">
                        {row.teamName.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <span className={`text-sm ${isMyTeam ? "text-[var(--brand-primary)]" : "text-[var(--shell-text)]"}`}>
                      {row.teamName}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3 text-center text-xs text-[var(--muted)]">{row.played}</td>
                <td className="px-3 py-3 text-center text-xs text-[var(--muted)]">{row.won}</td>
                <td className="px-3 py-3 text-center text-xs text-[var(--muted)]">{row.drawn}</td>
                <td className="px-3 py-3 text-center text-xs text-[var(--muted)]">{row.lost}</td>
                <td className="px-3 py-3 text-center text-xs text-[var(--muted)]">
                  {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                </td>
                <td className="px-3 py-3">
                  <div className="flex justify-center gap-0.5">
                    {(row.form ?? []).slice(-5).map((r, i) => (
                      <span
                        key={i}
                        className={`grid size-4 place-items-center rounded-sm text-[9px] font-black text-white ${formColors[r]}`}
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-3 text-center">
                  <strong className="text-sm font-black text-[var(--brand-primary)]">{row.points}</strong>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card de cobrança PIX / Racha
// ---------------------------------------------------------------------------

export function AmateurPaymentCard({
  title,
  description,
  amount,
  totalAmount,
  dueDate,
  status,
  onPay,
  onCopy,
}: {
  title: string;
  description?: string;
  amount: number;
  totalAmount?: number;
  dueDate?: string;
  status: "open" | "paid" | "overdue" | "partial";
  onPay?: () => void;
  onCopy?: () => void;
}) {
  const statusConfig = {
    open: { label: "Em aberto", cls: "bg-sky-50 text-sky-700" },
    paid: { label: "Pago", cls: "bg-emerald-50 text-emerald-700" },
    overdue: { label: "Vencido", cls: "bg-red-50 text-red-700" },
    partial: { label: "Parcial", cls: "bg-amber-50 text-amber-700" },
  };
  const sc = statusConfig[status];

  return (
    <article className="fl-am-payment-card overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
        <div className="min-w-0">
          <p className="text-sm font-black text-[var(--shell-text)]">{title}</p>
          {description && (
            <p className="mt-0.5 text-[12px] font-semibold text-[var(--muted)]">{description}</p>
          )}
        </div>
        <span className={`ml-3 shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${sc.cls}`}>
          {sc.label}
        </span>
      </div>
      <div className="px-5 py-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--muted)]">
              Valor
            </p>
            <strong className="text-3xl font-black text-[var(--shell-text)]">
              {amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </strong>
            {totalAmount !== undefined && (
              <p className="mt-0.5 text-[11px] font-semibold text-[var(--muted)]">
                de {totalAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} total
              </p>
            )}
          </div>
          {dueDate && (
            <div className="text-right">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--muted)]">
                Vencimento
              </p>
              <p className="text-sm font-black text-[var(--shell-text)]">{dueDate}</p>
            </div>
          )}
        </div>
        {status !== "paid" && (
          <div className="mt-4 flex flex-wrap gap-2">
            {onCopy && (
              <AmateurButton tone="outline" size="md" onClick={onCopy} className="flex-1">
                Copiar chave PIX
              </AmateurButton>
            )}
            {onPay && (
              <AmateurButton tone="brand" size="md" onClick={onPay} className="flex-1">
                Pagar via PIX
              </AmateurButton>
            )}
          </div>
        )}
        {status === "paid" && (
          <p className="mt-3 text-center text-sm font-black text-emerald-600">✓ Pagamento confirmado</p>
        )}
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Banner de onboarding / call to action
// ---------------------------------------------------------------------------

export function AmateurCTA({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  primaryAction?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
}) {
  return (
    <div className="fl-am-cta flex flex-col items-center gap-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-10 text-center">
      {icon && (
        <span className="grid size-14 place-items-center rounded-2xl bg-[var(--brand-primary)] text-white shadow-lg shadow-[var(--brand-primary)]/20">
          {icon}
        </span>
      )}
      <div>
        <p className="text-base font-black text-[var(--shell-text)]">{title}</p>
        {description && (
          <p className="mt-1 max-w-xs text-sm font-semibold text-[var(--muted)]">{description}</p>
        )}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {primaryAction && (
          <AmateurButton tone="brand" onClick={primaryAction.onClick}>
            {primaryAction.label}
          </AmateurButton>
        )}
        {secondaryAction && (
          <AmateurButton tone="outline" onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </AmateurButton>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Badge de status genérico
// ---------------------------------------------------------------------------

export function AmateurBadge({
  label,
  tone = "default",
}: {
  label: string;
  tone?: StatTone;
}) {
  const badgeTone: Record<StatTone, string> = {
    default: "bg-slate-100 text-slate-600",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    danger: "bg-red-50 text-red-700",
    info: "bg-sky-50 text-sky-700",
    brand: "bg-[var(--brand-primary)] text-white",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${badgeTone[tone]}`}>
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Divisor com label
// ---------------------------------------------------------------------------

export function AmateurDivider({ label }: { label?: string }) {
  if (!label) return <hr className="my-4 border-slate-100" />;
  return (
    <div className="my-4 flex items-center gap-3">
      <hr className="flex-1 border-slate-200" />
      <span className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">{label}</span>
      <hr className="flex-1 border-slate-200" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

export function AmateurEmpty({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="fl-am-empty flex flex-col items-center gap-3 px-4 py-12 text-center">
      {icon && (
        <span className="mb-1 grid size-12 place-items-center rounded-full bg-slate-100 text-[var(--muted)]">
          {icon}
        </span>
      )}
      <p className="text-sm font-black text-[var(--shell-text)]">{title}</p>
      {description && (
        <p className="max-w-xs text-[12px] font-semibold text-[var(--muted)]">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card de artilheiro / ranking
// ---------------------------------------------------------------------------

export function AmateurTopScorerRow({
  position,
  name,
  teamName,
  goals,
  assists,
  photoUrl,
}: {
  position: number;
  name: string;
  teamName?: string;
  goals: number;
  assists?: number;
  photoUrl?: string | null;
}) {
  return (
    <li className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-0">
      <span className="w-6 shrink-0 text-center text-xs font-black text-[var(--muted)]">
        {position <= 3 ? ["🥇", "🥈", "🥉"][position - 1] : position}
      </span>
      {photoUrl ? (
        <img src={photoUrl} alt={name} className="size-9 shrink-0 rounded-full object-cover" />
      ) : (
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--brand-primary)] text-xs font-black text-white">
          {name.slice(0, 2).toUpperCase()}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-[var(--shell-text)]">{name}</p>
        {teamName && (
          <p className="text-[11px] font-semibold text-[var(--muted)]">{teamName}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-3 text-right">
        <div>
          <strong className="block text-lg font-black text-[var(--brand-primary)]">{goals}</strong>
          <span className="text-[10px] font-black uppercase tracking-wide text-[var(--muted)]">Gols</span>
        </div>
        {assists !== undefined && (
          <div>
            <strong className="block text-base font-black text-sky-600">{assists}</strong>
            <span className="text-[10px] font-black uppercase tracking-wide text-[var(--muted)]">Assist.</span>
          </div>
        )}
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Chip de seleção rápida (filtro)
// ---------------------------------------------------------------------------

export function AmateurFilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex h-8 items-center rounded-full px-3.5 text-xs font-black transition active:scale-95 ${
        active
          ? "bg-[var(--brand-primary)] text-white shadow-sm"
          : "border border-slate-200 bg-white text-[var(--shell-text)] hover:border-slate-300"
      }`}
    >
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Input de busca amador
// ---------------------------------------------------------------------------

export function AmateurSearch({
  value,
  onChange,
  placeholder = "Buscar...",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">
        🔍
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm font-semibold text-[var(--shell-text)] placeholder:text-[var(--muted)] focus:border-[var(--brand-accent)] focus:outline-none"
      />
    </div>
  );
}
