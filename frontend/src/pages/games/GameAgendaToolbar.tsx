import type { GameType } from "../../types/domain";

type GameAgendaToolbarProps = {
  historyYear: number;
  fallbackYear: number;
  showWholeYear: boolean;
  typeFilter: "ALL" | GameType;
  notice: string;
  onHistoryYearChange: (year: number) => void;
  onShowWholeYearChange: (showWholeYear: boolean) => void;
  onTypeFilterChange: (type: "ALL" | GameType) => void;
};

export function GameAgendaToolbar({
  historyYear,
  fallbackYear,
  showWholeYear,
  typeFilter,
  notice,
  onHistoryYearChange,
  onShowWholeYearChange,
  onTypeFilterChange
}: GameAgendaToolbarProps) {
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Agenda</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">Calendario de jogos</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">As cores ficam no calendario; a lista mostra os jogos da data selecionada.</p>
        </div>
        <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-[minmax(9.5rem,auto)_minmax(10rem,auto)] lg:grid-cols-[minmax(10rem,auto)_minmax(10rem,auto)_minmax(16rem,24rem)]">
          <label className="flex min-w-0 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">
            <span className="shrink-0">Ano</span>
            <input
              type="number"
              min={1980}
              max={2100}
              className="min-w-0 flex-1 rounded-md border border-slate-200 px-2 py-1 text-sm font-bold text-slate-900"
              value={historyYear}
              onChange={(event) => onHistoryYearChange(Number(event.target.value) || fallbackYear)}
            />
          </label>
          <label className="flex min-w-0 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">
            <input type="checkbox" className="size-4 accent-red-600" checked={showWholeYear} onChange={(event) => onShowWholeYearChange(event.target.checked)} />
            <span className="whitespace-nowrap">Ano inteiro</span>
          </label>
          <select
            className="min-h-11 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 sm:col-span-2 lg:col-span-1"
            value={typeFilter}
            onChange={(event) => onTypeFilterChange(event.target.value as "ALL" | GameType)}
          >
            <option value="ALL">Todos</option>
            <option value="INTERNAL">Internos</option>
            <option value="EXTERNAL">Externos</option>
          </select>
        </div>
      </div>
      {notice ? (
        <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
          {notice}
        </p>
      ) : null}
    </>
  );
}
