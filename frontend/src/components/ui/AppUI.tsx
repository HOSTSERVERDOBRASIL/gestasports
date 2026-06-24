import type { ReactNode } from "react";

type SurfaceProps = {
  children: ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md";
  tone?: "default" | "muted" | "dark";
};

const surfacePadding = {
  none: "",
  sm: "p-3 sm:p-4",
  md: "p-4 sm:p-5"
};

const surfaceTone = {
  default: "border-slate-200 bg-white text-slate-950 shadow-[0_14px_30px_rgba(15,23,42,0.07)]",
  muted: "border-slate-200 bg-slate-50 text-slate-950",
  dark: "border-slate-200 bg-white text-slate-950 shadow-sm"
};

export function Surface({ children, className = "", padding = "md", tone = "default" }: SurfaceProps) {
  return <article className={`fl-ui-surface min-w-0 rounded-lg border ${surfaceTone[tone]} ${surfacePadding[padding]} ${className}`}>{children}</article>;
}

type SectionHeaderProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  action?: ReactNode;
  className?: string;
};

export function SectionHeader({ title, description, eyebrow, action, className = "" }: SectionHeaderProps) {
  return (
    <div className={`fl-section-header grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start ${className}`}>
      <div className="min-w-0">
        {eyebrow ? <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">{eyebrow}</p> : null}
        <h2 className="text-lg font-black leading-tight text-slate-950">{title}</h2>
        {description ? <p className="mt-1 text-sm font-semibold leading-5 text-slate-500">{description}</p> : null}
      </div>
      {action ? <div className="flex min-w-0 flex-wrap items-center justify-start gap-2 sm:justify-end">{action}</div> : null}
    </div>
  );
}

export type SegmentedOption<T extends string> = {
  label: string;
  value: T;
  icon: ReactNode;
};

type SegmentedControlProps<T extends string> = {
  value: T;
  options: Array<SegmentedOption<T>>;
  onChange: (value: T) => void;
  className?: string;
  ariaLabel: string;
};

export function SegmentedControl<T extends string>({ value, options, onChange, className = "", ariaLabel }: SegmentedControlProps<T>) {
  return (
    <div className={`fl-segmented-control flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm ${className}`} role="tablist" aria-label={ariaLabel}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            className={`inline-flex min-h-10 min-w-0 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-sm font-black transition sm:flex-none sm:px-4 ${
              active ? "bg-[#08255b] text-white shadow-[0_10px_20px_rgba(8,37,91,0.16)]" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
            }`}
            onClick={() => onChange(option.value)}
          >
            {option.icon}
            <span className="truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
      <p className="text-sm font-black text-slate-700">{title}</p>
      {description ? <p className="mt-1 text-sm font-semibold text-slate-500">{description}</p> : null}
    </div>
  );
}

export type MetricTile = {
  label: string;
  value: ReactNode;
  helper?: string;
  className?: string;
};

type MetricGridProps = {
  items: MetricTile[];
  className?: string;
};

export function MetricGrid({ items, className = "" }: MetricGridProps) {
  return (
    <div className={`grid gap-2 sm:grid-cols-2 lg:grid-cols-5 ${className}`}>
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
          <p className="text-xs font-bold text-slate-500">{item.label}</p>
          <strong className={`mt-1 block truncate text-2xl font-black ${item.className ?? "text-slate-950"}`}>{item.value}</strong>
          {item.helper ? <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">{item.helper}</p> : null}
        </div>
      ))}
    </div>
  );
}

export type InsightTile = {
  label: string;
  value: ReactNode;
  helper?: string;
  tone?: string;
};

type InsightGridProps = {
  items: InsightTile[];
  className?: string;
};

export function InsightGrid({ items, className = "" }: InsightGridProps) {
  return (
    <div className={`grid gap-3 lg:grid-cols-4 ${className}`}>
      {items.map((item) => (
        <div key={item.label} className={`rounded-lg border px-3 py-3 ${item.tone ?? "border-slate-200 bg-slate-50 text-slate-700"}`}>
          <p className="text-xs font-black uppercase tracking-[0.08em] opacity-80">{item.label}</p>
          <strong className="mt-1 block truncate text-xl font-black">{item.value}</strong>
          {item.helper ? <p className="mt-0.5 truncate text-xs font-semibold opacity-80">{item.helper}</p> : null}
        </div>
      ))}
    </div>
  );
}
