import { Clock3, DollarSign, Eye, Printer, Trash2, Users } from "lucide-react";
import type { Game, GameLineup, TeamSide } from "../../types/domain";
import { teamKitBackground } from "../../utils/teamColors";
import {
  DEFAULT_RED_UNIFORM_COLOR,
  DEFAULT_WHITE_UNIFORM_COLOR,
  buttonStyles,
  detectPitchFormation,
  firstFilledText,
  formatCurrency,
  gameTypeLabels,
  hasLineupAthlete,
  normalizedHex,
  readableTextColor
} from "./gameLogic";

type InternalShirtIdentity = {
  color?: string | null;
};

type GameAgendaCardProps = {
  game: Game;
  selected: boolean;
  defaultRedName: string;
  defaultWhiteName: string;
  defaultRedColor: string;
  defaultWhiteColor: string;
  configuredRedName?: string | null;
  configuredWhiteName?: string | null;
  configuredRedColor?: string | null;
  configuredWhiteColor?: string | null;
  internalLogoUrl?: string | null;
  cancelPending: boolean;
  resolveInternalShirt: (name: string, side: TeamSide) => InternalShirtIdentity | null;
  splitLineups: (lineups: GameLineup[]) => { starters: GameLineup[]; reserves: GameLineup[] };
  onConfirmations: (game: Game) => void;
  onOfficials: (game: Game) => void;
  onLineup: (game: Game) => void;
  onPrint: (game: Game) => void;
  onEdit: (game: Game) => void;
  onCancel: (game: Game) => void;
};

export function GameAgendaCard({
  game,
  selected,
  defaultRedName,
  defaultWhiteName,
  defaultRedColor,
  defaultWhiteColor,
  configuredRedName,
  configuredWhiteName,
  configuredRedColor,
  configuredWhiteColor,
  internalLogoUrl,
  cancelPending,
  resolveInternalShirt,
  splitLineups,
  onConfirmations,
  onOfficials,
  onLineup,
  onPrint,
  onEdit,
  onCancel
}: GameAgendaCardProps) {
  const gameLineups = (game.lineups ?? []).filter((lineup) => hasLineupAthlete(lineup) && lineup.role !== "ABSENT");
  const hasLineup = gameLineups.length > 0;
  const redName = game.redTeamName || configuredRedName || defaultRedName;
  const whiteName = game.whiteTeamName || configuredWhiteName || defaultWhiteName;
  const redIdentity = game.type === "INTERNAL" ? resolveInternalShirt(redName, "RED") : null;
  const whiteIdentity = game.type === "INTERNAL" ? resolveInternalShirt(whiteName, "WHITE") : null;
  const savedRedHex = normalizedHex(game.redUniformColor ?? undefined);
  const savedWhiteHex = normalizedHex(game.whiteUniformColor ?? undefined);
  const redKitSource = firstFilledText(
    savedRedHex && savedRedHex !== DEFAULT_RED_UNIFORM_COLOR ? game.redUniformColor : null,
    redIdentity?.color,
    configuredRedColor,
    game.redUniformColor,
    defaultRedColor
  ) ?? defaultRedColor;
  const whiteKitSource = firstFilledText(
    savedWhiteHex && savedWhiteHex !== DEFAULT_WHITE_UNIFORM_COLOR ? game.whiteUniformColor : null,
    whiteIdentity?.color,
    configuredWhiteColor,
    game.whiteUniformColor,
    defaultWhiteColor
  ) ?? defaultWhiteColor;
  const redColor = normalizedHex(redKitSource) ?? defaultRedColor;
  const whiteColor = normalizedHex(whiteKitSource) ?? defaultWhiteColor;
  const redSplit = splitLineups(gameLineups.filter((lineup) => lineup.side === "RED"));
  const whiteSplit = splitLineups(gameLineups.filter((lineup) => lineup.side === "WHITE"));
  const teams = [
    {
      side: "RED" as const,
      name: redName,
      textColor: readableTextColor(redColor),
      crestUrl: game.redCrestUrl ?? (game.type === "EXTERNAL" ? game.homeClub?.logoUrl ?? internalLogoUrl : internalLogoUrl),
      background: teamKitBackground(redKitSource, defaultRedColor),
      formation: detectPitchFormation(redSplit.starters.map((lineup) => lineup.athlete)),
      starters: redSplit.starters,
      reserves: redSplit.reserves
    },
    {
      side: "WHITE" as const,
      name: whiteName,
      textColor: readableTextColor(whiteColor),
      crestUrl: game.whiteCrestUrl ?? (game.type === "EXTERNAL" ? game.awayClub?.logoUrl ?? null : internalLogoUrl),
      background: teamKitBackground(whiteKitSource, defaultWhiteColor),
      formation: detectPitchFormation(whiteSplit.starters.map((lineup) => lineup.athlete)),
      starters: whiteSplit.starters,
      reserves: whiteSplit.reserves
    }
  ];

  return (
    <article className={`min-w-0 rounded-lg border p-4 ${selected ? "border-[var(--brand-primary)]/40 bg-[var(--brand-primary)]/5" : "border-slate-200 bg-white"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <span className={`mb-2 inline-flex rounded-md px-2.5 py-1 text-xs font-black ${game.status === "FINISHED" ? "bg-slate-200 text-slate-700" : "bg-blue-100 text-blue-700"}`}>
            {game.status === "FINISHED" ? "Finalizado" : "Aberto"}
          </span>
          <h3 className="truncate text-lg font-black text-slate-950">{gameTypeLabels[game.type]} - {game.location}</h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
            <span className="inline-flex items-center gap-1"><Clock3 size={15} />{new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(game.date))}</span>
            <span className="inline-flex items-center gap-1"><Users size={15} />{gameLineups.length || game._count.lineups || 0} atletas</span>
            <span className="inline-flex items-center gap-1"><DollarSign size={15} />{formatCurrency(game.gameValueCents)}</span>
            <span>{game._count.lineups ?? gameLineups.length} escalados</span>
          </p>
        </div>
        <p className="text-sm font-bold text-slate-500">ID: {game.id.slice(-4).toUpperCase()}</p>
      </div>
      <p className="mt-2 text-sm text-slate-500">{game.championship ?? game.note ?? "Sem observações"}</p>

      {hasLineup ? (
        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-600">Escalação formada</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">Formação automática por distribuição de posições, com banco separado.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">{gameLineups.length} atletas</span>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {teams.map((team) => (
              <div key={`${game.id}-${team.side}`} className="overflow-hidden rounded-lg border border-slate-200">
                <div className="relative overflow-hidden px-3 py-2" style={{ ...team.background, color: team.textColor }}>
                  <div className="absolute inset-0 bg-black/15" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/25 via-transparent to-white/10" />
                  <div className="relative flex items-center gap-2">
                    {team.crestUrl ? (
                      <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full border border-white/50 bg-white/90 p-0.5 shadow-sm">
                        <img src={team.crestUrl} alt="" className="max-h-full max-w-full object-contain" />
                      </span>
                    ) : null}
                    <span className="min-w-0 rounded-lg bg-white/90 px-2 py-1 text-slate-950 shadow-sm ring-1 ring-black/5">
                      <p className="truncate font-black">{team.name}</p>
                      <p className="truncate text-[10px] font-black uppercase text-slate-700">{team.formation} / {team.starters.length} titulares / {team.reserves.length} reservas</p>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className={buttonStyles.primary} onClick={() => onConfirmations(game)}>Selecionar e ver confirmações</button>
        <button type="button" className={buttonStyles.secondary} onClick={() => onOfficials(game)}>Arbitragem (opcional)</button>
        {hasLineup ? (
          <>
            <button type="button" className={`${buttonStyles.secondary} inline-flex items-center gap-2`} onClick={() => onLineup(game)}><Eye size={16} />Ver escalação</button>
            <button type="button" className={`${buttonStyles.secondary} inline-flex items-center gap-2`} onClick={() => onPrint(game)}><Printer size={16} />Imprimir</button>
          </>
        ) : null}
        <button type="button" className={buttonStyles.secondary} onClick={() => onEdit(game)}>Editar</button>
        <button
          type="button"
          className="fl-danger-action grid size-10 place-items-center rounded-lg border border-transparent disabled:opacity-60"
          disabled={cancelPending}
          onClick={() => onCancel(game)}
          title="Cancelar jogo"
          aria-label="Cancelar jogo"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </article>
  );
}
