import type { ReactNode } from "react";

type SectionCardProps = {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
};

export function SectionCard({ title, subtitle, action, children, className, noPadding }: SectionCardProps) {
  return (
    <div className={`rounded-lg border border-slate-200 bg-white shadow-sm ${className ?? ""}`}>
      {(title || action) && (
        <div className={`flex items-center justify-between gap-3 ${noPadding ? "px-5 pt-5" : "px-5 pt-5"}`}>
          <div>
            {title && <h2 className="text-base font-black text-slate-950">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs font-semibold text-slate-500">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={noPadding ? "" : "p-5"}>{children}</div>
    </div>
  );
}
