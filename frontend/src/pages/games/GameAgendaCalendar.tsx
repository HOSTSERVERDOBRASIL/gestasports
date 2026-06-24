import { CloudRain, Info } from "lucide-react";
import type { Game } from "../../types/domain";
import { hasLineupAthlete, toDateKey } from "./gameLogic";

type CalendarCell = {
  key: string;
  date: Date;
  inMonth: boolean;
};

type GameAgendaCalendarProps = {
  historyYear: number;
  month: number;
  monthLabel: string;
  selectedDate: string;
  cells: CalendarCell[];
  gamesByDay: Map<string, Game[]>;
  onSelectedDateChange: (date: string) => void;
};

export function GameAgendaCalendar({
  historyYear,
  month,
  monthLabel,
  selectedDate,
  cells,
  gamesByDay,
  onSelectedDateChange
}: GameAgendaCalendarProps) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-4 grid grid-cols-[2.75rem_minmax(0,1fr)_5rem] items-center gap-3">
        <button
          type="button"
          className="grid size-10 place-items-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
          onClick={() => onSelectedDateChange(`${historyYear}-${String(month).padStart(2, "0")}-01`)}
          aria-label="Voltar para o início do mês"
        >
          <span className="text-xl leading-none">‹</span>
        </button>
        <h2 className="text-center text-lg font-black capitalize text-slate-950">{monthLabel}</h2>
        <button
          type="button"
          className="min-h-10 rounded-lg border border-slate-200 px-4 text-sm font-black text-slate-700 hover:bg-slate-50"
          onClick={() => onSelectedDateChange(toDateKey(new Date()))}
        >
          Hoje
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((dayName) => (
            <div key={dayName} className="px-2 py-3 text-center text-sm font-black text-slate-700">{dayName}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((cell) => {
            const dayGames = gamesByDay.get(cell.key) ?? [];
            const selected = selectedDate === cell.key;
            const hasFinished = dayGames.some((game) => game.status === "FINISHED");
            const hasLineupDay = dayGames.some((game) => (game.lineups ?? []).some((lineup) => hasLineupAthlete(lineup) && lineup.role !== "ABSENT"));
            const dotColor = hasFinished ? "bg-red-600" : hasLineupDay ? "bg-emerald-600" : "bg-blue-500";

            return (
              <button
                key={cell.key}
                type="button"
                className={`relative min-h-20 border-b border-r border-slate-100 p-2 text-left transition hover:bg-slate-50 ${selected ? "bg-blue-50" : "bg-white"} ${!cell.inMonth ? "text-slate-400" : "text-slate-950"}`}
                onClick={() => onSelectedDateChange(cell.key)}
              >
                <span className={`grid size-9 place-items-center rounded-full text-sm font-black ${selected ? "bg-blue-600 text-white shadow-[0_12px_22px_rgba(37,99,235,0.24)]" : ""}`}>{cell.date.getDate()}</span>
                {dayGames.length > 0 ? (
                  <span className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
                    {dayGames.slice(0, 3).map((game) => <span key={game.id} className={`size-2 rounded-full ${dotColor}`} />)}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700">
        <span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-full bg-blue-500" />Aberto</span>
        <span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-full bg-emerald-600" />Confirmado</span>
        <span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-full bg-red-600" />Finalizado</span>
        <span className="inline-flex items-center gap-2 text-indigo-700"><CloudRain size={16} />Cancelado (Clima)</span>
      </div>

      <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">
        <div className="flex items-start gap-2">
          <Info size={18} className="mt-0.5" />
          <p>Clique em uma data para ver os jogos do dia.</p>
        </div>
      </div>
    </div>
  );
}
