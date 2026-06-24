import type { ReactNode } from "react";

export type EnterpriseStatTone = "default" | "success" | "warning" | "danger" | "info";
export type DashboardWidgetSize = "S" | "M" | "L" | "XL" | "FULL";

type PageTemplateProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function PageTemplate({ eyebrow, title, description, actions, children, className = "" }: PageTemplateProps) {
  return (
    <section className={`fl-enterprise-page space-y-4 ${className}`}>
      <PageHeader eyebrow={eyebrow} title={title} description={description} actions={actions} />
      {children}
    </section>
  );
}

export function PageHeader({ eyebrow, title, description, actions, className = "" }: Omit<PageTemplateProps, "children">) {
  return (
    <header className={`fl-enterprise-header rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:p-5 ${className}`}>
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div className="min-w-0">
          {eyebrow ? <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--brand-accent)]">{eyebrow}</p> : null}
          <h1 className="mt-1 text-2xl font-black tracking-normal text-slate-950 md:text-3xl">{title}</h1>
          {description ? <p className="mt-1 max-w-3xl text-sm font-semibold leading-6 text-slate-500">{description}</p> : null}
        </div>
        {actions ? <div className="flex min-w-0 flex-wrap items-center gap-2 md:justify-end">{actions}</div> : null}
      </div>
    </header>
  );
}

export function StatsGrid({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5 ${className}`}>{children}</div>;
}

const statTone = {
  default: "bg-slate-100 text-slate-700",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-red-50 text-red-700",
  info: "bg-sky-50 text-sky-700"
};

export function EnterpriseStatCard({
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
  tone?: EnterpriseStatTone;
}) {
  return (
    <article className="fl-enterprise-card group rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[var(--brand-accent)]/40 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-black text-slate-500">{label}</p>
          <strong className="mt-2 block truncate text-3xl font-black leading-none tracking-normal text-slate-950">{value}</strong>
        </div>
        {icon ? <span className={`grid size-11 shrink-0 place-items-center rounded-lg ${statTone[tone]}`}>{icon}</span> : null}
      </div>
      {helper ? <p className="mt-3 truncate text-sm font-bold text-slate-500">{helper}</p> : null}
    </article>
  );
}

export function ContentGrid({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem] ${className}`}>{children}</div>;
}

export function ContentCard({
  title,
  description,
  action,
  children,
  className = ""
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <article className={`fl-enterprise-card rounded-lg border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-black text-slate-950">{title}</h2>
          {description ? <p className="mt-1 text-sm font-semibold text-slate-500">{description}</p> : null}
        </div>
        {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
      </div>
      {children}
    </article>
  );
}

export function PrimaryButton({ children, className = "", type = "button", onClick }: { children: ReactNode; className?: string; type?: "button" | "submit"; onClick?: () => void }) {
  return (
    <button type={type} onClick={onClick} className={`fl-brand-primary-action inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-black text-white transition ${className}`}>
      {children}
    </button>
  );
}

export function SoftButton({ children, className = "", type = "button", onClick }: { children: ReactNode; className?: string; type?: "button" | "submit"; onClick?: () => void }) {
  return (
    <button type={type} onClick={onClick} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50 ${className}`}>
      {children}
    </button>
  );
}

export function EmptyPanel({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
      <p className="text-sm font-black text-slate-700">{title}</p>
      {description ? <p className="mt-1 text-sm font-semibold text-slate-500">{description}</p> : null}
    </div>
  );
}

const widgetSizeClasses: Record<DashboardWidgetSize, string> = {
  S: "xl:col-span-1",
  M: "xl:col-span-2",
  L: "xl:col-span-3",
  XL: "xl:col-span-4",
  FULL: "xl:col-span-6"
};

export function DashboardWidget({
  title,
  description,
  size = "M",
  action,
  children,
  className = ""
}: {
  title: string;
  description?: string;
  size?: DashboardWidgetSize;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <article className={`fl-dashboard-widget fl-enterprise-card rounded-lg border border-slate-200 bg-white p-5 shadow-sm ${widgetSizeClasses[size]} ${className}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-black text-slate-950">{title}</h2>
          {description ? <p className="mt-1 text-sm font-semibold text-slate-500">{description}</p> : null}
        </div>
        {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
      </div>
      {children}
    </article>
  );
}

export function DashboardWidgetGrid({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`grid grid-cols-1 gap-4 xl:grid-cols-6 ${className}`}>{children}</div>;
}

export type DataTableColumn<T> = {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  className?: string;
};

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  emptyTitle = "Nenhum registro encontrado",
  emptyDescription,
  className = ""
}: {
  columns: Array<DataTableColumn<T>>;
  rows: T[];
  getRowKey: (row: T, index: number) => string;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}) {
  if (rows.length === 0) {
    return <EmptyPanel title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className={`overflow-x-auto rounded-[var(--brand-radius)] border border-slate-200 bg-white ${className}`}>
      <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
        <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" className={`px-4 py-3 ${column.className ?? ""}`}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, rowIndex) => (
            <tr key={getRowKey(row, rowIndex)} className="bg-white transition hover:bg-slate-50">
              {columns.map((column) => (
                <td key={column.key} className={`px-4 py-3 font-semibold text-slate-700 ${column.className ?? ""}`}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FilterBar({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`fl-filter-bar flex flex-wrap items-end gap-3 rounded-[var(--brand-radius)] border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export type TimelineItem = {
  id: string;
  title: string;
  dateLabel?: string;
  description?: ReactNode;
  meta?: ReactNode;
};

export function Timeline({ items, className = "" }: { items: TimelineItem[]; className?: string }) {
  if (items.length === 0) {
    return <EmptyPanel title="Linha do tempo vazia" description="Cadastre marcos para compor o acervo institucional." />;
  }

  return (
    <ol className={`space-y-4 ${className}`}>
      {items.map((item) => (
        <li key={item.id} className="relative pl-8">
          <span className="absolute left-0 top-1 grid size-4 place-items-center rounded-full bg-[var(--brand-accent)] ring-4 ring-white" />
          <div className="fl-enterprise-card rounded-[var(--brand-radius)] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="text-sm font-black text-slate-950">{item.title}</h3>
              {item.dateLabel ? <span className="text-xs font-black uppercase text-[var(--brand-accent)]">{item.dateLabel}</span> : null}
            </div>
            {item.description ? <div className="mt-2 text-sm font-semibold leading-6 text-slate-600">{item.description}</div> : null}
            {item.meta ? <div className="mt-3 text-xs font-bold uppercase text-slate-500">{item.meta}</div> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

export type GalleryGridItem = {
  id: string;
  title: string;
  imageUrl: string | null;
  description?: string | null;
  action?: ReactNode;
};

export function GalleryGrid({ items, className = "" }: { items: GalleryGridItem[]; className?: string }) {
  if (items.length === 0) {
    return <EmptyPanel title="Galeria vazia" description="Adicione fotos, videos ou documentos para exibir este acervo." />;
  }

  return (
    <div className={`grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 ${className}`}>
      {items.map((item) => (
        <article key={item.id} className="fl-enterprise-card overflow-hidden rounded-[var(--brand-radius)] border border-slate-200 bg-white shadow-sm">
          <div className="aspect-[4/3] bg-slate-100">
            {item.imageUrl ? <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-sm font-black text-slate-400">Sem imagem</div>}
          </div>
          <div className="p-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-sm font-black text-slate-950">{item.title}</h3>
              {item.action ? <div className="shrink-0">{item.action}</div> : null}
            </div>
            {item.description ? <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-slate-500">{item.description}</p> : null}
          </div>
        </article>
      ))}
    </div>
  );
}
