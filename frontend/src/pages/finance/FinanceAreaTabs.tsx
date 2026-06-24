import type { ReactNode } from "react";
import { Surface } from "../../components/ui/AppUI";

export type FinanceAreaTabValue = "DASHBOARD" | "MENSALIDADES" | "RECEITAS" | "DESPESAS" | "COBRANCAS" | "RELATORIOS";

export type FinanceAreaTab = {
  value: FinanceAreaTabValue;
  label: string;
  icon: ReactNode;
  description: string;
};

export function FinanceAreaTabs({
  areas,
  activeArea,
  onChange
}: {
  areas: FinanceAreaTab[];
  activeArea: FinanceAreaTabValue;
  onChange: (area: FinanceAreaTabValue) => void;
}) {
  return (
    <Surface padding="sm">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6" role="tablist" aria-label="Módulos financeiros">
        {areas.map((area) => {
          const active = activeArea === area.value;

          return (
            <button
              key={area.value}
              type="button"
              role="tab"
              aria-selected={active}
              className={`min-h-20 rounded-lg border px-3 py-2 text-left transition ${
                active ? "border-[#08255b] bg-[#08255b] text-white shadow-sm" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
              onClick={() => onChange(area.value)}
            >
              <span className="flex items-center gap-2 text-sm font-black">
                {area.icon}
                {area.label}
              </span>
              <span className={`mt-1 block text-xs font-semibold ${active ? "text-blue-100" : "text-slate-500"}`}>{area.description}</span>
            </button>
          );
        })}
      </div>
    </Surface>
  );
}
