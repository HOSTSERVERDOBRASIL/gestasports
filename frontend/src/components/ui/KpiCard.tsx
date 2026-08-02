import type { ComponentType, ReactNode } from "react";
import { Link } from "react-router-dom";

type KpiCardProps = {
  label: string;
  value: string | number;
  sub?: string;
  icon?: ComponentType<{ size?: number; className?: string }>;
  iconClass?: string;
  href?: string;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  children?: ReactNode;
};

export function KpiCard({ label, value, sub, icon: Icon, iconClass, href, trend, trendLabel, children }: KpiCardProps) {
  const trendColor = trend === "up" ? "text-emerald-600" : trend === "down" ? "text-red-500" : "text-slate-500";

  const content = (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
        {sub && <p className="mt-0.5 text-xs font-semibold text-slate-500">{sub}</p>}
        {trendLabel && (
          <p className={`mt-1 text-xs font-semibold ${trendColor}`}>{trendLabel}</p>
        )}
        {children}
      </div>
      {Icon && (
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconClass ?? "bg-slate-100 text-slate-500"}`}>
          <Icon size={18} />
        </div>
      )}
    </div>
  );

  const card = (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      {content}
    </div>
  );

  if (href) {
    return (
      <Link to={href} className="block transition-shadow hover:shadow-md">
        {card}
      </Link>
    );
  }
  return card;
}
