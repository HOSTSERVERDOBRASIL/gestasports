import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, CheckCircle2, MapPin, Shirt, Trophy, Wallet } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { TeamColorCard } from "../components/ui/TeamColorCard";
import { apiRequest } from "../services/api";
import { normalizeTeamColor } from "../utils/teamColors";
import type { GameType, GroupSettings } from "../types/domain";

type CreateGameFormData = {
  type: GameType;
  location: string;
  championship: string;
  note: string;
  gameValueCents: number;
  redTeamName: string;
  whiteTeamName: string;
  redUniformColor: string;
  whiteUniformColor: string;
  calendarDate: string;
  manualDate: string;
};

const DEFAULT_RED_UNIFORM_COLOR = "#94a3b8";
const DEFAULT_WHITE_UNIFORM_COLOR = "#cbd5e1";
const INITIAL_FORM: CreateGameFormData = {
  type: "INTERNAL",
  location: "",
  championship: "",
  note: "",
  gameValueCents: 0,
  redTeamName: "Time A",
  whiteTeamName: "Time B",
  redUniformColor: DEFAULT_RED_UNIFORM_COLOR,
  whiteUniformColor: DEFAULT_WHITE_UNIFORM_COLOR,
  calendarDate: "",
  manualDate: ""
};

function parseManualDateToIso(input: string) {
  const trimmed = input.trim();
  const match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})(:\s+(\d{2}):(\d{2}))$/);

  if (!match) {
    return null;
  }

  const [, day, month, year, hours = "20", minutes = "00"] = match;
  const normalized = `${year}-${month}-${day}T${hours}:${minutes}:00`;
  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

export default function CreateGamePage() {
  const { user } = useAuth();
  const [form, setForm] = useState<CreateGameFormData>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [dateMode, setDateMode] = useState<"calendar" | "manual">("calendar");
  const groupSettingsQuery = useQuery({
    queryKey: ["group-settings", "create-game"],
    queryFn: () => apiRequest<GroupSettings>("/group/settings")
  });
  const safeRedColor = normalizeTeamColor(form.redUniformColor, DEFAULT_RED_UNIFORM_COLOR);
  const safeWhiteColor = normalizeTeamColor(form.whiteUniformColor, DEFAULT_WHITE_UNIFORM_COLOR);

  useEffect(() => {
    const settings = groupSettingsQuery.data;
    if (!settings) return;
    setForm((current) => ({
      ...current,
      redTeamName: current.redTeamName === INITIAL_FORM.redTeamName ? settings.uniform1Name : current.redTeamName,
      whiteTeamName: current.whiteTeamName === INITIAL_FORM.whiteTeamName ? settings.uniform2Name : current.whiteTeamName,
      redUniformColor: current.redUniformColor === INITIAL_FORM.redUniformColor ? settings.uniform1Color : current.redUniformColor,
      whiteUniformColor: current.whiteUniformColor === INITIAL_FORM.whiteUniformColor ? settings.uniform2Color : current.whiteUniformColor
    }));
  }, [groupSettingsQuery.data]);

  function updateForm<K extends keyof CreateGameFormData>(key: K, value: CreateGameFormData[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleCreateGame(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const gameDateIso =
      dateMode === "calendar" ?
         (form.calendarDate ? new Date(form.calendarDate).toISOString() : null)
        : parseManualDateToIso(form.manualDate);

    if (!gameDateIso) {
      setError("Informe uma data valida. No modo manual, use DD/MM/AAAA HH:mm.");
      setLoading(false);
      return;
    }

    try {
      await apiRequest("/sports/games", {
        method: "POST",
        body: JSON.stringify({
          type: form.type,
          date: gameDateIso,
          location: form.location,
          championship: form.championship || undefined,
          note: form.note || undefined,
          gameValueCents: Number(form.gameValueCents) || 0,
          redTeamName: form.redTeamName || undefined,
          whiteTeamName: form.whiteTeamName || undefined,
          redUniformColor: form.redUniformColor || undefined,
          whiteUniformColor: form.whiteUniformColor || undefined
        })
      });
      setForm(INITIAL_FORM);
      setSuccess("Jogo registrado.");
    } catch {
      setError("Erro ao cadastrar o jogo. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (!user || user.role !== "ADMIN") {
    return (
      <section className="min-w-0">
        <article className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700 shadow-sm">
          Você não tem permissão para acessar esta página.
        </article>
      </section>
    );
  }

  return (
    <section className="min-w-0 space-y-4">
      <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.08em] text-red-600">
              <Trophy size={16} />
              Novo compromisso
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Cadastrar jogo</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">Defina data, local, custo e cores dos uniformes em um só lugar.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs font-black">
            <span className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700">
              <span className="size-3 rounded-full" style={{ backgroundColor: safeRedColor }} />
              Time A
            </span>
            <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
              <span className="size-3 rounded-full border border-slate-300" style={{ backgroundColor: safeWhiteColor }} />
              Time B
            </span>
          </div>
        </div>
      </article>

      <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        {error ? <p className="fl-state-error mb-4 rounded-lg border px-3 py-2 text-sm font-semibold">{error}</p> : null}
        {success ? (
          <p className="fl-state-success mb-4 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold">
            <CheckCircle2 size={18} />
            {success}
          </p>
        ) : null}

        <form className="grid gap-4" onSubmit={(event) => void handleCreateGame(event)}>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm font-semibold text-slate-600">
              Tipo do jogo
              <select className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" value={form.type} onChange={(event) => updateForm("type", event.target.value as GameType)}>
                <option value="INTERNAL">Interno</option>
                <option value="EXTERNAL">Externo</option>
              </select>
            </label>

            <label className="text-sm font-semibold text-slate-600">
              Custo (em centavos)
              <div className="relative mt-1">
                <Wallet size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="w-full rounded-lg border border-slate-200 py-2 pl-10 pr-3"
                  type="number"
                  min={0}
                  step={1}
                  value={form.gameValueCents}
                  onChange={(event) => updateForm("gameValueCents", Number(event.target.value) || 0)}
                  required
                />
              </div>
            </label>
          </div>

          <label className="text-sm font-semibold text-slate-600">
            Local
            <div className="relative mt-1">
              <MapPin size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="w-full rounded-lg border border-slate-200 py-2 pl-10 pr-3" value={form.location} onChange={(event) => updateForm("location", event.target.value)} required />
            </div>
          </label>

          <div className="grid gap-3 md:grid-cols-[14rem_minmax(0,1fr)]">
            <label className="text-sm font-semibold text-slate-600">
              Como informar a data
              <select
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                value={dateMode}
                onChange={(event) => {
                  setDateMode(event.target.value as "calendar" | "manual");
                }}
              >
                <option value="calendar">Selecionar no calendário</option>
                <option value="manual">Digitar manualmente</option>
              </select>
            </label>

            {dateMode === "calendar" ? (
              <label className="text-sm font-semibold text-slate-600">
                Data e hora
                <div className="relative mt-1">
                  <CalendarDays size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    className="w-full rounded-lg border border-slate-200 py-2 pl-10 pr-3"
                    type="datetime-local"
                    value={form.calendarDate}
                    onChange={(event) => updateForm("calendarDate", event.target.value)}
                    required
                  />
                </div>
              </label>
            ) : (
              <label className="text-sm font-semibold text-slate-600">
                Data manual
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                  placeholder="Ex.: 25/05/2026 20:00"
                  value={form.manualDate}
                  onChange={(event) => updateForm("manualDate", event.target.value)}
                  required
                />
              </label>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm font-semibold text-slate-600">
              Campeonato
              <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" value={form.championship} onChange={(event) => updateForm("championship", event.target.value)} />
            </label>
            <label className="text-sm font-semibold text-slate-600">
              Observações
              <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" value={form.note} onChange={(event) => updateForm("note", event.target.value)} />
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm font-semibold text-slate-600">
              Nome do Time A
              <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" value={form.redTeamName} onChange={(event) => updateForm("redTeamName", event.target.value)} />
            </label>
            <label className="text-sm font-semibold text-slate-600">
              Nome do Time B
              <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" value={form.whiteTeamName} onChange={(event) => updateForm("whiteTeamName", event.target.value)} />
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm font-semibold text-slate-600">
              Cor do Time A
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="color"
                  className="h-10 w-14 shrink-0 cursor-pointer rounded-lg border border-slate-300 bg-white p-1"
                  value={safeRedColor}
                  onChange={(event) => updateForm("redUniformColor", event.target.value)}
                />
                <div className="relative min-w-0 flex-1">
                  <Shirt size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    className="w-full rounded-lg border border-slate-200 py-2 pl-10 pr-3 font-mono text-sm"
                    value={form.redUniformColor}
                    onChange={(event) => updateForm("redUniformColor", event.target.value)}
                  />
                </div>
              </div>
            </label>
            <label className="text-sm font-semibold text-slate-600">
              Cor do Time B
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="color"
                  className="h-10 w-14 shrink-0 cursor-pointer rounded-lg border border-slate-300 bg-white p-1"
                  value={safeWhiteColor}
                  onChange={(event) => updateForm("whiteUniformColor", event.target.value)}
                />
                <div className="relative min-w-0 flex-1">
                  <Shirt size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    className="w-full rounded-lg border border-slate-200 py-2 pl-10 pr-3 font-mono text-sm"
                    value={form.whiteUniformColor}
                    onChange={(event) => updateForm("whiteUniformColor", event.target.value)}
                  />
                </div>
              </div>
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <TeamColorCard label="Previa Time A" name={form.redTeamName || "Time A"} color={form.redUniformColor} fallback={DEFAULT_RED_UNIFORM_COLOR} />
            <TeamColorCard label="Previa Time B" name={form.whiteTeamName || "Time B"} color={form.whiteUniformColor} fallback={DEFAULT_WHITE_UNIFORM_COLOR} />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-black text-white shadow-[0_14px_24px_rgba(185,28,28,0.22)] hover:bg-red-700 disabled:opacity-60"
          >
            <Trophy size={18} />
            {loading ? "Cadastrando..." : "Cadastrar jogo"}
          </button>
        </form>
      </article>
    </section>
  );
}

