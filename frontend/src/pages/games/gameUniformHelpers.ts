import { parseTeamKit, type CenterBarsVariant, type TeamKit, type UniformStyle } from "../../utils/teamColors";

export const DEFAULT_RED_UNIFORM_COLOR = "#94a3b8";
export const DEFAULT_WHITE_UNIFORM_COLOR = "#cbd5e1";
export const DEFAULT_WHITE_SLEEVE_COLOR = "#ffffff";
export const DEFAULT_RED_UNIFORM_NAME = "Time A";
export const DEFAULT_WHITE_UNIFORM_NAME = "Time B";

export const uniformModelOptions: Array<{ value: UniformStyle; label: string; description: string }> = [
  { value: "SOLID", label: "plain", description: "Camisa lisa, sem padrão no corpo." },
  { value: "HALF_AND_HALF", label: "two-color", description: "Cor principal com segunda cor em área ampla." },
  { value: "CENTER_BARS_DUO", label: "center-bars-duo", description: "Somente duas barras centrais: esquerda com a Cor 2 e direita com a Cor 3." },
  { value: "TWO_CENTER_LINES", label: "center-bars", description: "Duas barras centrais verticais: esquerda com a Cor 2 e direita com a Cor 3." },
  { value: "HORIZONTAL_CLASSIC", label: "horizontal-classic", description: "Faixas clássicas em repetição." },
  { value: "STRIPES", label: "striped", description: "Listras verticais médias." },
  { value: "STRIPED_THIN", label: "striped-thin", description: "Listras verticais finas." },
  { value: "STRIPED_THICK", label: "striped-thick", description: "Listras verticais largas." },
  { value: "HOOPS", label: "hoops", description: "Listras horizontais." },
  { value: "SINGLE_BAND", label: "single-band", description: "Uma faixa em qualquer direção." },
  { value: "CLEAN_PREMIUM", label: "clean-premium", description: "Visual limpo premium com detalhe central." },
  { value: "DIAGONAL_ELITE", label: "diagonal-elite", description: "Faixa diagonal em estilo competitivo." },
  { value: "SOUND_WAVE", label: "waves", description: "Ondas horizontais ou verticais." },
  { value: "DIGITAL_CAMO", label: "dashed", description: "Traços curtos repetidos." },
  { value: "MESH_PATTERN", label: "mesh", description: "Textura em grade discreta." },
  { value: "GRADIENT_FLOW", label: "gradient-flow", description: "Base lisa com leitura de degradê." }
];

export const centerBarsOptions: Array<{ value: CenterBarsVariant; label: string; description: string }> = [
  { value: "SPACED", label: "2 barras com vao", description: "Duas barras estreitas com respiro no centro." },
  { value: "JOINED", label: "2 barras unidas", description: "Duas barras coladas no centro da camisa." },
  { value: "TRIPLE", label: "3 barras centrais", description: "Tres barras centrais usando Cor 2, Cor 3 e Cor 4." },
  { value: "WIDE", label: "2 barras largas", description: "Duas barras mais largas e fortes no peito." }
];

export type ShirtFillMode = "PLAIN" | "TWO_TONE" | "TRICOLOR" | "FOUR_COLORS" | "TEXTURE";

export const shirtFillOptions: Array<{ value: ShirtFillMode; label: string; description: string }> = [
  { value: "PLAIN", label: "Liso", description: "Uma cor preenchendo toda a camisa." },
  { value: "TWO_TONE", label: "Duas cores", description: "Preenchimento dividido em duas cores." },
  { value: "TRICOLOR", label: "Tricolor", description: "Fundo com duas barras ou faixas de apoio." },
  { value: "FOUR_COLORS", label: "Quatro cores", description: "Preenchimento com detalhe extra." },
  { value: "TEXTURE", label: "Textura", description: "Preenchimento padronizado em grade." }
];

export const stripeStyles: UniformStyle[] = ["SINGLE_BAND", "CENTER_BARS_DUO", "TWO_CENTER_LINES", "HALF_AND_HALF", "HORIZONTAL_CLASSIC", "STRIPES", "STRIPED_THIN", "STRIPED_THICK", "CLEAN_PREMIUM", "DIAGONAL_ELITE", "SOUND_WAVE", "HOOPS", "DIGITAL_CAMO", "MESH_PATTERN"];
export const directionalStyles: UniformStyle[] = ["SINGLE_BAND", "HALF_AND_HALF", "SOUND_WAVE", "DIGITAL_CAMO", "DIAGONAL_ELITE"];

export function shirtFillModeForKit(kit: Pick<TeamKit, "style" | "colorCount" | "centerBarsVariant">): ShirtFillMode {
  if (kit.style === "MESH_PATTERN" || kit.style === "DIGITAL_CAMO" || kit.style === "SOUND_WAVE") return "TEXTURE";
  if (kit.colorCount === "FOUR" || kit.centerBarsVariant === "TRIPLE") return "FOUR_COLORS";
  if (kit.colorCount === "TRICOLOR" || kit.style === "TWO_CENTER_LINES" || kit.style === "CENTER_BARS_DUO") return "TRICOLOR";
  if (kit.colorCount === "TWO" || kit.style === "HALF_AND_HALF") return "TWO_TONE";
  return "PLAIN";
}

function normalizedHex(value: string | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed;
  return null;
}

export function uniformColorHex(value: string | null | undefined, fallback: string) {
  if (!value) return fallback;
  const parsed = parseTeamKit(value);
  return normalizedHex(parsed.primary) ?? normalizedHex(value) ?? fallback;
}
