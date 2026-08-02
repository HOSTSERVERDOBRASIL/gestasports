import { Link } from "react-router-dom";
import type { ReactNode } from "react";

/* ─────────────────────────────────────────────
   Memorial Design System — Acervo do Clube
   Sidebar escura + estilo arquivo institucional
───────────────────────────────────────────── */

// ── Layout ─────────────────────────────────
export function MemorialPage({ children, sidebar, className = "" }: { children: ReactNode; sidebar: ReactNode; className?: string }) {
  return (
    <div className={`fl-memorial-layout ${className}`}>
      <aside className="fl-memorial-sidebar">{sidebar}</aside>
      <main className="fl-memorial-main">{children}</main>
    </div>
  );
}

export function MemorialPageHeader({
  icon,
  title,
  subtitle,
  action,
  meta
}: {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  meta?: Array<{ label: string; value: string }>;
}) {
  return (
    <header className="fl-mem-page-header">
      <div className="fl-mem-page-header__top">
        {icon ? <span className="fl-mem-page-header__icon">{icon}</span> : null}
        <div className="fl-mem-page-header__text">
          <h1 className="fl-mem-page-header__title">{title}</h1>
          {subtitle ? <p className="fl-mem-page-header__sub">{subtitle}</p> : null}
        </div>
        {action ? <div className="fl-mem-page-header__action">{action}</div> : null}
      </div>
      {meta && meta.length > 0 ? (
        <div className="fl-mem-page-header__meta">
          {meta.map((m) => (
            <span key={m.label} className="fl-mem-page-header__meta-item">
              <span className="fl-mem-page-header__meta-label">{m.label}</span>
              <span className="fl-mem-page-header__meta-value">{m.value}</span>
            </span>
          ))}
        </div>
      ) : null}
    </header>
  );
}

// ── Stats ───────────────────────────────────
export function MemorialStatCard({
  label,
  value,
  helper,
  icon,
  tone = "default"
}: {
  label: string;
  value: string | number;
  helper?: string;
  icon?: ReactNode;
  tone?: "default" | "gold" | "silver" | "success" | "warning" | "danger";
}) {
  return (
    <article className={`fl-mem-stat fl-mem-stat--${tone}`}>
      {icon ? <span className="fl-mem-stat__icon">{icon}</span> : null}
      <strong className="fl-mem-stat__value">{value}</strong>
      <p className="fl-mem-stat__label">{label}</p>
      {helper ? <span className="fl-mem-stat__helper">{helper}</span> : null}
    </article>
  );
}

export function MemorialStatsRow({ children }: { children: ReactNode }) {
  return <div className="fl-mem-stats-row">{children}</div>;
}

// ── Timeline card (Linha do tempo) ──────────
export function MemorialTimelineItem({
  year,
  title,
  description,
  badge,
  badgeTone = "default",
  image,
  date,
  onClick
}: {
  year: string | number;
  title: string;
  description?: string;
  badge?: string;
  badgeTone?: "default" | "gold" | "blue" | "green" | "red";
  image?: string;
  date?: string;
  onClick?: () => void;
}) {
  return (
    <article className="fl-mem-timeline-item" onClick={onClick} role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : undefined}>
      <div className="fl-mem-timeline-item__year-col">
        <span className="fl-mem-timeline-item__year">{year}</span>
        <span className="fl-mem-timeline-item__dot" />
        <span className="fl-mem-timeline-item__line" />
      </div>
      <div className="fl-mem-timeline-item__body">
        <div className="fl-mem-timeline-item__row">
          <div className="fl-mem-timeline-item__info">
            <h3 className="fl-mem-timeline-item__title">{title}</h3>
            {description ? <p className="fl-mem-timeline-item__desc">{description}</p> : null}
            <div className="fl-mem-timeline-item__footer">
              {badge ? <span className={`fl-mem-badge fl-mem-badge--${badgeTone}`}>{badge}</span> : null}
              {date ? <span className="fl-mem-timeline-item__date">{date}</span> : null}
            </div>
          </div>
          {image ? <img src={image} alt={title} className="fl-mem-timeline-item__img" /> : null}
        </div>
      </div>
    </article>
  );
}

// ── Card genérico do acervo ──────────────────
export function MemorialCard({
  title,
  subtitle,
  badge,
  badgeTone = "default",
  year,
  image,
  meta,
  footer,
  selected,
  onClick
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  badgeTone?: "default" | "gold" | "silver" | "blue" | "green" | "red";
  year?: string | number;
  image?: string;
  meta?: Array<{ icon?: ReactNode; label: string }>;
  footer?: ReactNode;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <article className={`fl-mem-card ${selected ? "fl-mem-card--selected" : ""}`} onClick={onClick} role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : undefined}>
      {image ? (
        <div className="fl-mem-card__img-wrap">
          <img src={image} alt={title} className="fl-mem-card__img" />
          {year ? <span className="fl-mem-card__year">{year}</span> : null}
        </div>
      ) : year ? <span className="fl-mem-card__year fl-mem-card__year--no-img">{year}</span> : null}
      <div className="fl-mem-card__body">
        {badge ? <span className={`fl-mem-badge fl-mem-badge--${badgeTone}`}>{badge}</span> : null}
        <h3 className="fl-mem-card__title">{title}</h3>
        {subtitle ? <p className="fl-mem-card__subtitle">{subtitle}</p> : null}
        {meta && meta.length > 0 ? (
          <ul className="fl-mem-card__meta">
            {meta.map((m, i) => (
              <li key={i} className="fl-mem-card__meta-item">
                {m.icon}
                <span>{m.label}</span>
              </li>
            ))}
          </ul>
        ) : null}
        {footer ? <div className="fl-mem-card__footer">{footer}</div> : null}
      </div>
    </article>
  );
}

// ── Galeria de fotos ─────────────────────────
export function MemorialPhotoGrid({ children, columns = 4 }: { children: ReactNode; columns?: 2 | 3 | 4 | 5 }) {
  return <div className={`fl-mem-photo-grid fl-mem-photo-grid--${columns}`}>{children}</div>;
}

export function MemorialPhoto({ src, alt, caption, onClick }: { src: string; alt: string; caption?: string; onClick?: () => void }) {
  return (
    <figure className="fl-mem-photo" onClick={onClick} role={onClick ? "button" : undefined}>
      <img src={src} alt={alt} className="fl-mem-photo__img" />
      {caption ? <figcaption className="fl-mem-photo__caption">{caption}</figcaption> : null}
    </figure>
  );
}

// ── Visualizador de PDF / documento ─────────
export function MemorialDocViewer({
  title,
  type,
  pages,
  size,
  date,
  downloadUrl,
  children
}: {
  title: string;
  type?: string;
  pages?: number;
  size?: string;
  date?: string;
  downloadUrl?: string;
  children?: ReactNode;
}) {
  return (
    <div className="fl-mem-docviewer">
      <div className="fl-mem-docviewer__preview">{children ?? <span className="fl-mem-docviewer__placeholder">Pré-visualização não disponível</span>}</div>
      <div className="fl-mem-docviewer__info">
        <p className="fl-mem-docviewer__title">{title}</p>
        {type ? <p className="fl-mem-docviewer__meta">{type}</p> : null}
        <div className="fl-mem-docviewer__chips">
          {pages ? <span className="fl-mem-chip">{pages} págs.</span> : null}
          {size ? <span className="fl-mem-chip">{size}</span> : null}
          {date ? <span className="fl-mem-chip">{date}</span> : null}
        </div>
        {downloadUrl ? (
          <a href={downloadUrl} download className="fl-mem-btn fl-mem-btn--primary fl-mem-docviewer__btn">
            Baixar PDF
          </a>
        ) : null}
      </div>
    </div>
  );
}

// ── Tabs do detalhe ──────────────────────────
export function MemorialTabs({ tabs, active, onChange }: { tabs: Array<{ id: string; label: string; count?: number }>; active: string; onChange: (id: string) => void }) {
  return (
    <nav className="fl-mem-tabs">
      {tabs.map((tab) => (
        <button key={tab.id} type="button" className={`fl-mem-tab ${active === tab.id ? "fl-mem-tab--active" : ""}`} onClick={() => onChange(tab.id)}>
          {tab.label}
          {tab.count !== undefined ? <span className="fl-mem-tab__count">({tab.count})</span> : null}
        </button>
      ))}
    </nav>
  );
}

// ── Seção com título ─────────────────────────
export function MemorialSection({ title, action, children, className = "" }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`fl-mem-section ${className}`}>
      <div className="fl-mem-section__head">
        <h2 className="fl-mem-section__title">{title}</h2>
        {action ? <div className="fl-mem-section__action">{action}</div> : null}
      </div>
      <div className="fl-mem-section__body">{children}</div>
    </section>
  );
}

// ── Linha de tabela (mandatos, artilharia…) ──
export function MemorialTableRow({ cells, highlight }: { cells: Array<{ label: string; value: ReactNode; weight?: "normal" | "bold" | "hero" }>; highlight?: boolean }) {
  return (
    <div className={`fl-mem-table-row ${highlight ? "fl-mem-table-row--highlight" : ""}`}>
      {cells.map((cell, i) => (
        <div key={i} className={`fl-mem-table-cell fl-mem-table-cell--${cell.weight ?? "normal"}`}>
          <span className="fl-mem-table-cell__label">{cell.label}</span>
          <span className="fl-mem-table-cell__value">{cell.value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Pessoa / avatar card ─────────────────────
export function MemorialPersonCard({
  name,
  role,
  photo,
  period,
  badge,
  badgeTone = "default",
  onClick
}: {
  name: string;
  role?: string;
  photo?: string;
  period?: string;
  badge?: string;
  badgeTone?: "default" | "gold" | "blue";
  onClick?: () => void;
}) {
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  return (
    <article className="fl-mem-person-card" onClick={onClick} role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : undefined}>
      {photo ? (
        <img src={photo} alt={name} className="fl-mem-person-card__photo" />
      ) : (
        <span className="fl-mem-person-card__initials">{initials}</span>
      )}
      <div className="fl-mem-person-card__info">
        <p className="fl-mem-person-card__name">{name}</p>
        {role ? <p className="fl-mem-person-card__role">{role}</p> : null}
        {period ? <p className="fl-mem-person-card__period">{period}</p> : null}
        {badge ? <span className={`fl-mem-badge fl-mem-badge--${badgeTone}`}>{badge}</span> : null}
      </div>
    </article>
  );
}

// ── Hero de detalhe (presidente selecionado) ──
export function MemorialHero({
  name,
  role,
  period,
  photo,
  quote,
  badge,
  badgeTone = "default",
  stats,
  children
}: {
  name: string;
  role?: string;
  period?: string;
  photo?: string;
  quote?: string;
  badge?: string;
  badgeTone?: "default" | "gold" | "blue";
  stats?: Array<{ label: string; value: string | number }>;
  children?: ReactNode;
}) {
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  return (
    <div className="fl-mem-hero">
      <div className="fl-mem-hero__media">
        {photo ? <img src={photo} alt={name} className="fl-mem-hero__photo" /> : <span className="fl-mem-hero__initials">{initials}</span>}
      </div>
      <div className="fl-mem-hero__content">
        {badge ? <span className={`fl-mem-badge fl-mem-badge--${badgeTone} fl-mem-hero__badge`}>{badge}</span> : null}
        <h2 className="fl-mem-hero__name">{name}</h2>
        {role ? <p className="fl-mem-hero__role">{role}</p> : null}
        {period ? <p className="fl-mem-hero__period">{period}</p> : null}
        {quote ? <blockquote className="fl-mem-hero__quote">"{quote}"</blockquote> : null}
        {stats && stats.length > 0 ? (
          <div className="fl-mem-hero__stats">
            {stats.map((s) => (
              <div key={s.label} className="fl-mem-hero__stat">
                <strong>{s.value}</strong>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}

// ── Badge ────────────────────────────────────
export function MemorialBadge({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "gold" | "silver" | "blue" | "green" | "red" }) {
  return <span className={`fl-mem-badge fl-mem-badge--${tone}`}>{children}</span>;
}

// ── Botão ────────────────────────────────────
export function MemorialButton({
  children,
  tone = "primary",
  size = "md",
  icon,
  disabled,
  onClick,
  href,
  type = "button"
}: {
  children: ReactNode;
  tone?: "primary" | "ghost" | "outline" | "danger";
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  href?: string;
  type?: "button" | "submit";
}) {
  const cls = `fl-mem-btn fl-mem-btn--${tone} fl-mem-btn--${size}`;
  if (href) return <a href={href} className={cls}>{icon}{children}</a>;
  return <button type={type} className={cls} disabled={disabled} onClick={onClick}>{icon}{children}</button>;
}

// ── Filtro / chip de filtro ──────────────────
export function MemorialFilterRow({ children }: { children: ReactNode }) {
  return <div className="fl-mem-filter-row">{children}</div>;
}

export function MemorialSelect({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (v: string) => void }) {
  return (
    <select className="fl-mem-select" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
      <option value="">{label}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export function MemorialSearch({ placeholder, value, onChange }: { placeholder?: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="fl-mem-search">
      <input className="fl-mem-search__input" type="text" placeholder={placeholder ?? "Buscar..."} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

// ── Empty state ──────────────────────────────
export function MemorialEmpty({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="fl-mem-empty">
      {icon ? <span className="fl-mem-empty__icon">{icon}</span> : null}
      <h3 className="fl-mem-empty__title">{title}</h3>
      {description ? <p className="fl-mem-empty__desc">{description}</p> : null}
      {action ? <div className="fl-mem-empty__action">{action}</div> : null}
    </div>
  );
}

// ── Listagem de links de download ────────────
export function MemorialDownloadList({ items }: { items: Array<{ label: string; type?: string; size?: string; url?: string }> }) {
  return (
    <ul className="fl-mem-download-list">
      {items.map((item, i) => (
        <li key={i} className="fl-mem-download-item">
          <div className="fl-mem-download-item__info">
            <span className="fl-mem-download-item__label">{item.label}</span>
            {item.type ? <span className="fl-mem-chip">{item.type}</span> : null}
            {item.size ? <span className="fl-mem-chip">{item.size}</span> : null}
          </div>
          {item.url ? <a href={item.url} download className="fl-mem-download-item__btn">Baixar</a> : null}
        </li>
      ))}
    </ul>
  );
}

// ── Split layout (lista + detalhe) ────────────
export function MemorialSplitLayout({ list, detail }: { list: ReactNode; detail: ReactNode }) {
  return (
    <div className="fl-mem-split">
      <div className="fl-mem-split__list">{list}</div>
      <div className="fl-mem-split__detail">{detail}</div>
    </div>
  );
}

// ── Card de conquista / troféu ────────────────
export function MemorialTrophyCard({
  title,
  competition,
  year,
  type,
  image,
  stats,
  highlight,
  onClick
}: {
  title: string;
  competition?: string;
  year?: string | number;
  type?: string;
  image?: string;
  stats?: Array<{ label: string; value: string | number }>;
  highlight?: boolean;
  onClick?: () => void;
}) {
  return (
    <article className={`fl-mem-trophy-card ${highlight ? "fl-mem-trophy-card--highlight" : ""}`} onClick={onClick} role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : undefined}>
      {year ? <span className="fl-mem-trophy-card__year">{year}</span> : null}
      {image ? <img src={image} alt={title} className="fl-mem-trophy-card__img" /> : <span className="fl-mem-trophy-card__icon-placeholder">🏆</span>}
      <div className="fl-mem-trophy-card__body">
        <p className="fl-mem-trophy-card__competition">{competition}</p>
        <h3 className="fl-mem-trophy-card__title">{title}</h3>
        {type ? <span className="fl-mem-badge fl-mem-badge--gold">{type}</span> : null}
        {stats && stats.length > 0 ? (
          <div className="fl-mem-trophy-card__stats">
            {stats.map((s) => (
              <div key={s.label} className="fl-mem-trophy-card__stat">
                <strong>{s.value}</strong>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}

// ── Card de camisa histórica ──────────────────
export function MemorialShirtCard({
  year,
  season,
  type,
  supplier,
  sponsor,
  image,
  titles,
  games,
  documents,
  selected,
  onClick
}: {
  year?: string | number;
  season: string;
  type?: string;
  supplier?: string;
  sponsor?: string;
  image?: string;
  titles?: number;
  games?: number;
  documents?: number;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <article className={`fl-mem-shirt-card ${selected ? "fl-mem-shirt-card--selected" : ""}`} onClick={onClick} role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : undefined}>
      {year ? <span className="fl-mem-shirt-card__year">{year}</span> : null}
      <div className="fl-mem-shirt-card__img-wrap">
        {image ? <img src={image} alt={season} className="fl-mem-shirt-card__img" /> : <span className="fl-mem-shirt-card__placeholder">👕</span>}
      </div>
      <div className="fl-mem-shirt-card__body">
        {type ? <p className="fl-mem-shirt-card__type">{type}</p> : null}
        {supplier ? <p className="fl-mem-shirt-card__meta">Fornecedor: {supplier}</p> : null}
        {sponsor ? <p className="fl-mem-shirt-card__meta">Patrocinador: {sponsor}</p> : null}
      </div>
      <div className="fl-mem-shirt-card__footer">
        {titles !== undefined ? <span className="fl-mem-chip">🏆 {titles}</span> : null}
        {games !== undefined ? <span className="fl-mem-chip">⚽ {games}</span> : null}
        {documents !== undefined ? <span className="fl-mem-chip">📄 {documents}</span> : null}
      </div>
    </article>
  );
}

// ── Card de jogo histórico ───────────────────
export function MemorialMatchCard({
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  date,
  competition,
  stadium,
  referee,
  result,
  onClick
}: {
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  date?: string;
  competition?: string;
  stadium?: string;
  referee?: string;
  result?: "W" | "D" | "L";
  onClick?: () => void;
}) {
  const resultClass = result === "W" ? "fl-mem-match-card--win" : result === "D" ? "fl-mem-match-card--draw" : result === "L" ? "fl-mem-match-card--loss" : "";
  const resultLabel = result === "W" ? "V" : result === "D" ? "E" : result === "L" ? "D" : null;
  return (
    <article className={`fl-mem-match-card ${resultClass}`} onClick={onClick} role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : undefined}>
      <div className="fl-mem-match-card__teams">
        <span className="fl-mem-match-card__team">{homeTeam}</span>
        <div className="fl-mem-match-card__score">
          {homeScore !== undefined && awayScore !== undefined ? (
            <span>{homeScore} × {awayScore}</span>
          ) : <span>vs</span>}
          {resultLabel ? <span className={`fl-mem-result-badge fl-mem-result-badge--${result?.toLowerCase()}`}>{resultLabel}</span> : null}
        </div>
        <span className="fl-mem-match-card__team fl-mem-match-card__team--away">{awayTeam}</span>
      </div>
      {(date || competition || stadium || referee) ? (
        <div className="fl-mem-match-card__meta">
          {date ? <span>{date}</span> : null}
          {competition ? <span>{competition}</span> : null}
          {stadium ? <span>{stadium}</span> : null}
          {referee ? <span>Árbitro: {referee}</span> : null}
        </div>
      ) : null}
    </article>
  );
}

// ── Destaque / spotlight card ─────────────────
export function MemorialSpotlight({ title, subtitle, image, badge, badgeTone = "gold", action }: {
  title: string;
  subtitle?: string;
  image?: string;
  badge?: string;
  badgeTone?: "default" | "gold" | "blue" | "green" | "red";
  action?: ReactNode;
}) {
  return (
    <div className="fl-mem-spotlight">
      {image ? <img src={image} alt={title} className="fl-mem-spotlight__img" /> : null}
      <div className="fl-mem-spotlight__body">
        {badge ? <span className={`fl-mem-badge fl-mem-badge--${badgeTone}`}>{badge}</span> : null}
        <h3 className="fl-mem-spotlight__title">{title}</h3>
        {subtitle ? <p className="fl-mem-spotlight__sub">{subtitle}</p> : null}
        {action ? <div className="fl-mem-spotlight__action">{action}</div> : null}
      </div>
    </div>
  );
}

// ── Chip genérico ────────────────────────────
export function MemorialChip({ children }: { children: ReactNode }) {
  return <span className="fl-mem-chip">{children}</span>;
}

// ── Barra de progresso ────────────────────────
export function MemorialProgressBar({ value, max, label, tone = "default" }: { value: number; max: number; label?: string; tone?: "default" | "gold" | "success" | "danger" }) {
  const pct = Math.round((value / Math.max(max, 1)) * 100);
  return (
    <div className="fl-mem-progress">
      {label ? <div className="fl-mem-progress__header"><span>{label}</span><span>{value}</span></div> : null}
      <div className="fl-mem-progress__track">
        <div className={`fl-mem-progress__fill fl-mem-progress__fill--${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Sidebar do Acervo ─────────────────────────
export function MemorialSidebarNav({
  items,
  active
}: {
  items: Array<{ id: string; label: string; path: string; icon?: ReactNode }>;
  active: string;
}) {
  return (
    <nav className="fl-mem-sidenav">
      {items.map((item) => (
        <Link
          key={item.id}
          to={item.path}
          className={`fl-mem-sidenav__item ${active === item.id ? "fl-mem-sidenav__item--active" : ""}`}
        >
          {item.icon ? <span className="fl-mem-sidenav__icon">{item.icon}</span> : null}
          <span className="fl-mem-sidenav__label">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
