import { useMemo, useState } from "react";
import { ChevronDown, Palette, Shirt } from "lucide-react";
import { UniformShirtPreview } from "./TeamColorCard";
import { encodeTeamKit, parseTeamKit, type ShirtStyleDirection, type UniformStyle } from "../../utils/teamColors";

export type ShirtConfig = {
  name: string;
  color: string;
  imageUrl: string | null;
};

export type ShirtConfiguratorProps = {
  side: "red" | "white";
  config: ShirtConfig;
  onChange: (config: ShirtConfig) => void;
  label: string;
};

const shirtStyles = [
  { id: "SOLID", label: "Lisa" },
  { id: "SINGLE_BAND", label: "Faixa única" },
  { id: "CENTER_BARS_DUO", label: "2 barras centrais - 2 cores" },
  { id: "TWO_CENTER_LINES", label: "2 barras centrais" },
  { id: "HORIZONTAL_CLASSIC", label: "Faixa dupla" },
  { id: "STRIPES", label: "Listrada" },
  { id: "STRIPED_THIN", label: "Listras finas" },
  { id: "STRIPED_THICK", label: "Listras largas" },
  { id: "CLEAN_PREMIUM", label: "Faixa central larga" },
  { id: "SOUND_WAVE", label: "Faixa horizontal" },
  { id: "HOOPS", label: "Hoops" },
  { id: "HALF_AND_HALF", label: "Meio a meio" },
  { id: "DIAGONAL_ELITE", label: "Diagonal" },
  { id: "GRADIENT_FLOW", label: "Degradê" },
  { id: "DIGITAL_CAMO", label: "Camuflada" },
  { id: "MESH_PATTERN", label: "Premium clean" }
] satisfies Array<{ id: UniformStyle; label: string }>;

const directionalStyles: UniformStyle[] = ["SINGLE_BAND", "HORIZONTAL_CLASSIC", "STRIPES", "STRIPED_THIN", "STRIPED_THICK", "SOUND_WAVE", "DIAGONAL_ELITE"];

export function ShirtConfigurator({ side, config, onChange, label = "Uniforme" }: ShirtConfiguratorProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const fallback = side === "red" ? "#94a3b8" : "#cbd5e1";
  const kit = useMemo(() => parseTeamKit(config.color, fallback), [config.color, fallback]);

  function updateColor(patch: Partial<typeof kit>) {
    const next = {
      ...kit,
      ...patch,
      primary: patch.primary ?? kit.primary,
      accent: patch.accent ?? kit.accent,
      tertiary: patch.tertiary ?? kit.tertiary,
      style: patch.style ?? kit.style
    };

    onChange({
      ...config,
      color: encodeTeamKit(next.primary, next.accent, next.style, next)
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <label className="text-sm font-semibold text-slate-600">
              <Shirt size={16} className="mb-1 mr-2 inline" />
              {label}
            </label>
            <p className="mt-1 text-xs text-slate-500">Configure nome, cores, padrão e imagem a partir de Configurações.</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-600">
              Nome do time
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={config.name}
                onChange={(event) => onChange({ ...config, name: event.target.value })}
                placeholder={`Ex: ${side === "red" ? "Time A" : "Time B"}`}
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-600">
                Cor principal
                <input type="color" className="mt-1 h-10 w-full cursor-pointer rounded-lg border border-slate-300 bg-white p-1" value={kit.primary} onChange={(event) => updateColor({ primary: event.target.value })} />
              </label>
              <label className="block text-sm font-medium text-slate-600">
                Cor secundária
                <input type="color" className="mt-1 h-10 w-full cursor-pointer rounded-lg border border-slate-300 bg-white p-1" value={kit.accent} onChange={(event) => updateColor({ accent: event.target.value })} />
              </label>
            </div>

            <label className="block text-sm font-medium text-slate-600">
              Modelo da camisa
              <select className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={kit.style} onChange={(event) => updateColor({ style: event.target.value as UniformStyle })}>
                {shirtStyles.map((style) => (
                  <option key={style.id} value={style.id}>
                    {style.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={`block text-sm font-medium text-slate-600 ${directionalStyles.includes(kit.style) ? "" : "hidden"}`}>
              Direção do desenho
              <select className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={kit.shirtStyleDirection} onChange={(event) => updateColor({ shirtStyleDirection: event.target.value as ShirtStyleDirection })}>
                <option value="VERTICAL">Vertical</option>
                <option value="HORIZONTAL">Horizontal</option>
                <option value="DIAGONAL_LEFT">Diagonal esquerda</option>
                <option value="DIAGONAL_RIGHT">Diagonal direita</option>
              </select>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-600">
                Texto
                <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={kit.shirtText} maxLength={18} onChange={(event) => updateColor({ shirtText: event.target.value })} placeholder="FLAMILIA" />
              </label>
              <label className="block text-sm font-medium text-slate-600">
                Número
                <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={kit.shirtNumber} maxLength={3} onChange={(event) => updateColor({ shirtNumber: event.target.value.replace(/\D/g, "").slice(0, 3) })} placeholder="10" />
              </label>
            </div>

            <label className="block text-sm font-medium text-slate-600">
              Escudo/logo
              <input
                type="file"
                accept="image/*"
                className="mt-1 w-full text-sm"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => onChange({ ...config, imageUrl: String(reader.result) });
                  reader.readAsDataURL(file);
                }}
              />
              {config.imageUrl ? (
                <button type="button" onClick={() => onChange({ ...config, imageUrl: null })} className="mt-2 text-xs text-red-600 hover:text-red-700">
                  Remover imagem
                </button>
              ) : null}
            </label>
          </div>

          <div className="flex flex-col items-center justify-center rounded-lg bg-slate-50 p-4">
            <div className="mb-3 text-center">
              <p className="text-xs font-semibold uppercase text-slate-500">Preview</p>
            </div>
            <div className="w-full">
              <UniformShirtPreview color={config.color} fallback={fallback} imageUrl={config.imageUrl} size="large" />
            </div>
            <div className="mt-4 flex gap-1">
              {[kit.primary, kit.accent, kit.tertiary].map((swatch, index) => (
                <span key={`${swatch}-${index}`} className="h-4 w-10 rounded border border-slate-300" style={{ backgroundColor: swatch }} title={swatch} />
              ))}
            </div>
          </div>
        </div>

        <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900">
          <ChevronDown size={16} style={{ transform: showAdvanced ? "rotate(180deg)" : "" }} />
          <Palette size={14} />
          Opções avançadas
        </button>

        {showAdvanced ? (
          <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
            <label className="block text-sm font-medium text-slate-600">
              Cor terciária
              <input type="color" className="mt-1 h-10 w-full cursor-pointer rounded-lg border border-slate-300 bg-white p-1" value={kit.tertiary} onChange={(event) => updateColor({ tertiary: event.target.value })} />
            </label>
          </div>
        ) : null}
      </div>
    </div>
  );
}

