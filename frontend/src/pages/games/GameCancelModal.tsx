import { AlertTriangle, CircleOff, Clock3, CloudRain, Goal, Settings, ShieldCheck, Users, X } from "lucide-react";
import type { Game } from "../../types/domain";
import { formatDateTime } from "./gameLogic";

type GameCancelModalProps = {
  game: Game;
  reason: string;
  note: string;
  confirming: boolean;
  secondaryButtonClass: string;
  onClose: () => void;
  onReasonChange: (reason: string) => void;
  onNoteChange: (note: string) => void;
  onConfirm: () => void;
};

const cancelReasonOptions = [
  { reason: "Campo impraticável", icon: <CloudRain size={14} className="text-blue-600" /> },
  { reason: "Chuva forte", icon: <CloudRain size={14} className="text-blue-600" /> },
  { reason: "Campo alagado", icon: <CloudRain size={14} className="text-blue-600" /> },
  { reason: "Risco de raios", icon: <AlertTriangle size={14} className="text-amber-600" /> },
  { reason: "Falta de atletas", icon: <Users size={14} className="text-slate-500" /> },
  { reason: "Falta de goleiro", icon: <Goal size={14} className="text-slate-500" /> },
  { reason: "Conflito de horário", icon: <Clock3 size={14} className="text-slate-500" /> },
  { reason: "Problema de iluminação", icon: <AlertTriangle size={14} className="text-amber-600" /> },
  { reason: "Manutenção do campo", icon: <Settings size={14} className="text-slate-500" /> },
  { reason: "Decisão da organização", icon: <ShieldCheck size={14} className="text-slate-500" /> },
  { reason: "Outro motivo", icon: <CircleOff size={14} className="text-slate-500" /> }
];

export function GameCancelModal({
  game,
  reason,
  note,
  confirming,
  secondaryButtonClass,
  onClose,
  onReasonChange,
  onNoteChange,
  onConfirm
}: GameCancelModalProps) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-[2px]">
      <div className="max-h-[min(34rem,calc(100dvh-2rem))] w-full max-w-[23rem] overflow-y-auto rounded-lg border border-white/50 bg-white/50 p-3 shadow-2xl backdrop-blur-xl ring-1 ring-slate-950/5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-8 place-items-center rounded-lg border border-red-100 bg-red-50/90 text-red-600">
              <AlertTriangle size={17} />
            </span>
            <div>
              <h2 className="text-sm font-black text-slate-950">Cancelar jogo</h2>
              <p className="mt-0.5 text-xs font-semibold text-slate-500">{formatDateTime(game.date)} - {game.location}</p>
            </div>
          </div>
          <button
            type="button"
            className="grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            onClick={onClose}
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-3 space-y-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-600">Motivo do cancelamento <span className="text-red-600">*</span></p>
            <div className="mt-2 max-h-36 overflow-auto rounded-lg border border-slate-200 bg-white/55">
              {cancelReasonOptions.map(({ reason: optionReason, icon }) => (
                <label key={optionReason} className="grid min-h-8 cursor-pointer grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-2 px-3 text-xs font-bold text-slate-700 hover:bg-white/70">
                  <input
                    type="radio"
                    className="size-4 accent-blue-600"
                    checked={reason === optionReason}
                    onChange={() => onReasonChange(optionReason)}
                  />
                  {icon}
                  <span className="truncate">{optionReason}</span>
                </label>
              ))}
            </div>
          </div>

          <label className="block text-xs font-black uppercase tracking-[0.08em] text-slate-600">
            Observação (opcional)
            <textarea
              className="mt-1 min-h-12 w-full resize-none rounded-lg border border-slate-200 bg-white/55 px-3 py-2 text-sm font-semibold normal-case tracking-normal text-slate-900 placeholder:text-slate-500"
              value={note}
              onChange={(event) => onNoteChange(event.target.value)}
              placeholder="Informe detalhes adicionais..."
            />
          </label>
        </div>

        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <button type="button" className={secondaryButtonClass} onClick={onClose}>
            Voltar
          </button>
          <button
            type="button"
            className="fl-danger-action inline-flex min-h-10 items-center gap-2 rounded-lg px-4 text-sm font-black disabled:opacity-60"
            disabled={confirming}
            onClick={onConfirm}
          >
            {confirming ? "Cancelando..." : "Confirmar cancelamento"}
          </button>
        </div>
      </div>
    </div>
  );
}
