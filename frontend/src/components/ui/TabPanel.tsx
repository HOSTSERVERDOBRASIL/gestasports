import type { ReactNode } from "react";

type Tab = { id: string; label: string; count?: number };

type TabPanelProps = {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
  children: ReactNode;
};

export function TabPanel({ tabs, active, onChange, children }: TabPanelProps) {
  return (
    <div>
      <div className="flex gap-0.5 border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-black transition-colors ${
              active === tab.id
                ? "border-b-2 border-slate-950 text-slate-950"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={`rounded-full px-1.5 py-0.5 text-xs ${active === tab.id ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600"}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="pt-4">{children}</div>
    </div>
  );
}
