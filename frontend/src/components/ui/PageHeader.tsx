import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

type BreadcrumbItem = { label: string; href?: string };

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  action?: ReactNode;
};

export function PageHeader({ eyebrow, title, subtitle, breadcrumbs, action }: PageHeaderProps) {
  return (
    <div className="space-y-2">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
          {breadcrumbs.map((item, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight size={12} />}
              {item.href ? (
                <Link to={item.href} className="hover:text-slate-700">{item.label}</Link>
              ) : (
                <span className="text-slate-950">{item.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">{eyebrow}</p>
          )}
          <h1 className="mt-0.5 text-2xl font-black text-slate-950">{title}</h1>
          {subtitle && (
            <p className="mt-1 text-sm font-semibold text-slate-500">{subtitle}</p>
          )}
        </div>
        {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
      </div>
    </div>
  );
}
