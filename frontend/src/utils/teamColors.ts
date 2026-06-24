export type UniformStyle =
  | "CHECKERED"
  | "HORIZONTAL_CLASSIC"
  | "CENTER_BARS_DUO"
  | "TWO_CENTER_LINES"
  | "SINGLE_BAND"
  | "DIAGONAL_ELITE"
  | "HALF_AND_HALF"
  | "SHOULDER_TEXTURE"
  | "GRADIENT_FLOW"
  | "HEX_PATTERN"
  | "CARBON_FIBER"
  | "BRUSH_STROKE"
  | "LIGHTNING_PATTERN"
  | "DIGITAL_CAMO"
  | "SMOKE_TEXTURE"
  | "GEO_FRAGMENT"
  | "VINTAGE_90"
  | "SOUND_WAVE"
  | "TOPOGRAPHIC_MAP"
  | "FLAME_PATTERN"
  | "MESH_PATTERN"
  | "PIXEL_PATTERN"
  | "CLEAN_PREMIUM"
  | "SOLID"
  | "STRIPES"
  | "STRIPED_THIN"
  | "STRIPED_THICK"
  | "SASH"
  | "HALVES"
  | "HOOPS";

export type ShirtStyleDirection = "HORIZONTAL" | "VERTICAL" | "DIAGONAL_LEFT" | "DIAGONAL_RIGHT";
export type CenterBarsVariant = "SPACED" | "JOINED" | "TRIPLE" | "WIDE";

export type TeamKit = {
  primary: string;
  accent: string;
  tertiary: string;
  quaternary: string;
  collarColor: string;
  cuffColor: string;
  hemColor: string;
  sleeveColor: string;
  colorCount: "ONE" | "TWO" | "TRICOLOR" | "FOUR";
  sleeveMode: "BODY" | "COLORED" | "DARK" | "RAGLAN" | "NONE";
  collarStyle: "V" | "ROUND" | "POLO" | "RETRO";
  cuffStyle: "NONE" | "SIMPLE" | "DOUBLE" | "STRIPED";
  hemStyle: "NONE" | "SIMPLE" | "DOUBLE";
  style: UniformStyle;
  shirtStyleDirection: ShirtStyleDirection;
  centerBarsVariant: CenterBarsVariant;
  shirtText: string;
  shirtNumber: string;
  logoPosition: "CENTER" | "LEFT_CHEST" | "RIGHT_CHEST" | "NONE";
  sponsorFront: string;
  sponsorBack: string;
  sponsorSleeve: string;
  numberFont: "BLOCK" | "CONDENSED" | "CLASSIC" | "SPORT";
  numberColor: string;
  numberStyle: "SOLID" | "OUTLINE" | "SHADOW";
};

const supportedUniformStyles: UniformStyle[] = [
  "CHECKERED",
  "HORIZONTAL_CLASSIC",
  "CENTER_BARS_DUO",
  "TWO_CENTER_LINES",
  "SINGLE_BAND",
  "DIAGONAL_ELITE",
  "HALF_AND_HALF",
  "SHOULDER_TEXTURE",
  "GRADIENT_FLOW",
  "HEX_PATTERN",
  "CARBON_FIBER",
  "BRUSH_STROKE",
  "LIGHTNING_PATTERN",
  "DIGITAL_CAMO",
  "SMOKE_TEXTURE",
  "GEO_FRAGMENT",
  "VINTAGE_90",
  "SOUND_WAVE",
  "TOPOGRAPHIC_MAP",
  "FLAME_PATTERN",
  "MESH_PATTERN",
  "PIXEL_PATTERN",
  "CLEAN_PREMIUM",
  "SOLID",
  "STRIPES",
  "STRIPED_THIN",
  "STRIPED_THICK",
  "SASH",
  "HALVES",
  "HOOPS"
];

function safeHex(value: unknown, fallback: string) {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

function safeStyle(value: unknown): UniformStyle {
  if (value === "CHECKERED") return "SOLID";
  if (value === "SASH") return "SINGLE_BAND";
  if (value === "HALVES") return "HALF_AND_HALF";
  return supportedUniformStyles.includes(value as UniformStyle) ? (value as UniformStyle) : "SOLID";
}

function safeDirection(value: unknown): ShirtStyleDirection {
  return value === "HORIZONTAL" || value === "DIAGONAL_LEFT" || value === "DIAGONAL_RIGHT" ? value : "VERTICAL";
}

function safeCenterBarsVariant(value: unknown): CenterBarsVariant {
  return value === "JOINED" || value === "TRIPLE" || value === "WIDE" ? value : "SPACED";
}

function defaultKit(fallback: string): TeamKit {
  return {
    primary: fallback,
    accent: "#ffffff",
    tertiary: "#111827",
    quaternary: "#111827",
    collarColor: "#111111",
    cuffColor: "#111111",
    hemColor: fallback,
    sleeveColor: fallback,
    colorCount: "TRICOLOR",
    sleeveMode: "BODY",
    collarStyle: "ROUND",
    cuffStyle: "NONE",
    hemStyle: "NONE",
    style: "SOLID",
    shirtStyleDirection: "VERTICAL",
    centerBarsVariant: "SPACED",
    shirtText: "",
    shirtNumber: "",
    logoPosition: "LEFT_CHEST",
    sponsorFront: "",
    sponsorBack: "",
    sponsorSleeve: "",
    numberFont: "BLOCK",
    numberColor: "#ffffff",
    numberStyle: "SOLID"
  };
}

export function parseTeamKit(value: string | null | undefined, fallback = "#94a3b8"): TeamKit {
  const trimmed = (value ?? "").trim();
  if (trimmed.startsWith("kitj:")) {
    try {
      const raw = JSON.parse(decodeURIComponent(trimmed.slice(5))) as Partial<TeamKit>;
      return {
        ...defaultKit(fallback),
        primary: safeHex(raw.primary, fallback),
        accent: safeHex(raw.accent, "#ffffff"),
        tertiary: safeHex(raw.tertiary, "#111827"),
        quaternary: safeHex(raw.quaternary, "#111827"),
        collarColor: safeHex(raw.collarColor, "#111111"),
        cuffColor: safeHex(raw.cuffColor, "#111111"),
        hemColor: safeHex(raw.hemColor, raw.primary ?? fallback),
        sleeveColor: safeHex(raw.sleeveColor, raw.primary ?? fallback),
        colorCount: raw.colorCount === "ONE" || raw.colorCount === "TWO" || raw.colorCount === "TRICOLOR" || raw.colorCount === "FOUR" ? raw.colorCount : "TRICOLOR",
        sleeveMode: raw.sleeveMode === "BODY" || raw.sleeveMode === "COLORED" || raw.sleeveMode === "DARK" || raw.sleeveMode === "RAGLAN" || raw.sleeveMode === "NONE" ? raw.sleeveMode : "BODY",
        collarStyle: raw.collarStyle === "POLO" || raw.collarStyle === "RETRO" ? raw.collarStyle : "ROUND",
        cuffStyle: raw.cuffStyle === "SIMPLE" || raw.cuffStyle === "DOUBLE" || raw.cuffStyle === "STRIPED" ? raw.cuffStyle : "NONE",
        hemStyle: raw.hemStyle === "SIMPLE" || raw.hemStyle === "DOUBLE" ? raw.hemStyle : "NONE",
        style: safeStyle(raw.style),
        shirtStyleDirection: safeDirection(raw.shirtStyleDirection),
        centerBarsVariant: safeCenterBarsVariant(raw.centerBarsVariant),
        shirtText: typeof raw.shirtText === "string" ? raw.shirtText.slice(0, 18) : "",
        shirtNumber: typeof raw.shirtNumber === "string" ? raw.shirtNumber.slice(0, 3) : "",
        logoPosition: raw.logoPosition === "CENTER" || raw.logoPosition === "RIGHT_CHEST" || raw.logoPosition === "NONE" ? raw.logoPosition : "LEFT_CHEST",
        sponsorFront: typeof raw.sponsorFront === "string" ? raw.sponsorFront : "",
        sponsorBack: typeof raw.sponsorBack === "string" ? raw.sponsorBack : "",
        sponsorSleeve: typeof raw.sponsorSleeve === "string" ? raw.sponsorSleeve : "",
        numberFont: raw.numberFont === "CONDENSED" || raw.numberFont === "CLASSIC" || raw.numberFont === "SPORT" ? raw.numberFont : "BLOCK",
        numberColor: safeHex(raw.numberColor, "#ffffff"),
        numberStyle: raw.numberStyle === "OUTLINE" || raw.numberStyle === "SHADOW" ? raw.numberStyle : "SOLID"
      };
    } catch {
      return defaultKit(fallback);
    }
  }

  if (trimmed.startsWith("kit:")) {
    const [, primary, accent, style, tertiary] = trimmed.split(":");
    return {
      ...defaultKit(fallback),
      primary: safeHex(primary, fallback),
      accent: safeHex(accent, "#ffffff"),
      tertiary: safeHex(tertiary, "#111827"),
      quaternary: "#111827",
      collarColor: "#111111",
      cuffColor: "#111111",
      hemColor: safeHex(primary, fallback),
      sleeveColor: safeHex(primary, fallback),
      colorCount: "TRICOLOR",
      sleeveMode: "BODY",
      collarStyle: "ROUND",
      cuffStyle: "NONE",
      hemStyle: "NONE",
      shirtStyleDirection: "VERTICAL",
      centerBarsVariant: "SPACED",
      shirtText: "",
      shirtNumber: "",
      style: safeStyle(style)
    };
  }

  return {
    ...defaultKit(fallback),
    primary: safeHex(trimmed, fallback)
  };
}

export function encodeTeamKit(primary: string, accent: string, style: UniformStyle, details: Partial<Omit<TeamKit, "primary" | "accent" | "style">> = {}) {
  const kit: TeamKit = {
    ...defaultKit(primary),
    ...details,
    primary,
    accent,
    tertiary: safeHex(details.tertiary, "#111827"),
    quaternary: safeHex(details.quaternary, "#111827"),
    collarColor: safeHex(details.collarColor, "#111111"),
    cuffColor: safeHex(details.cuffColor, "#111111"),
    hemColor: safeHex(details.hemColor, primary),
    sleeveColor: safeHex(details.sleeveColor, primary),
    style: safeStyle(style),
    shirtStyleDirection: safeDirection(details.shirtStyleDirection),
    centerBarsVariant: safeCenterBarsVariant(details.centerBarsVariant),
    shirtText: typeof details.shirtText === "string" ? details.shirtText.slice(0, 18) : "",
    shirtNumber: typeof details.shirtNumber === "string" ? details.shirtNumber.slice(0, 3) : "",
    numberColor: safeHex(details.numberColor, "#ffffff")
  };
  return `kitj:${encodeURIComponent(JSON.stringify(kit))}`;
}

export function normalizeTeamColor(value: string | null | undefined, fallback = "#94a3b8") {
  return parseTeamKit(value, fallback).primary;
}

export function readableTeamTextColor(background: string | null | undefined) {
  const color = normalizeTeamColor(background, "#94a3b8");
  const r = Number.parseInt(color.slice(1, 3), 16);
  const g = Number.parseInt(color.slice(3, 5), 16);
  const b = Number.parseInt(color.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.65 ? "#0f172a" : "#ffffff";
}

function hexToRgb(color: string) {
  return {
    r: Number.parseInt(color.slice(1, 3), 16),
    g: Number.parseInt(color.slice(3, 5), 16),
    b: Number.parseInt(color.slice(5, 7), 16)
  };
}

function relativeLuminance(color: string) {
  const { r, g, b } = hexToRgb(color);
  const convert = (value: number) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * convert(r) + 0.7152 * convert(g) + 0.0722 * convert(b);
}

function contrastRatio(first: string, second: string) {
  const light = Math.max(relativeLuminance(first), relativeLuminance(second));
  const dark = Math.min(relativeLuminance(first), relativeLuminance(second));
  return (light + 0.05) / (dark + 0.05);
}

export function analyzeTeamKitHarmony(kit: Pick<TeamKit, "primary" | "accent" | "tertiary" | "quaternary" | "colorCount" | "style" | "centerBarsVariant">) {
  const visibleColors = [kit.primary];
  if (kit.colorCount !== "ONE" && kit.style !== "SOLID") visibleColors.push(kit.accent);
  if ((kit.style === "CENTER_BARS_DUO" || kit.style === "TWO_CENTER_LINES" || kit.colorCount === "TRICOLOR" || kit.colorCount === "FOUR") && kit.style !== "SOLID") visibleColors.push(kit.tertiary);
  if (kit.colorCount === "FOUR" && kit.style !== "SOLID" && (kit.style !== "TWO_CENTER_LINES" && kit.style !== "CENTER_BARS_DUO" || kit.centerBarsVariant === "TRIPLE")) visibleColors.push(kit.quaternary);

  const contrasts = visibleColors.flatMap((color, index) => visibleColors.slice(index + 1).map((other) => contrastRatio(color, other)));
  const lowestContrast = contrasts.length ? Math.min(...contrasts) : contrastRatio(kit.primary, "#ffffff");
  const uniqueColors = new Set(visibleColors.map((color) => color.toLowerCase())).size;
  const hasSimilarColors = lowestContrast < 1.8 && visibleColors.length > 1;
  const hasStrongContrast = lowestContrast >= 3;

  if (visibleColors.length > 1 && uniqueColors === 1) {
    return {
      status: "Ajustar",
      tone: "danger" as const,
      summary: "As cores estão iguais.",
      suggestion: "Use uma cor clara, uma escura e uma cor de destaque para o desenho aparecer."
    };
  }

  if (hasSimilarColors) {
    return {
      status: "Baixo contraste",
      tone: "warning" as const,
      summary: "As cores estão muito próximas.",
      suggestion: "Aumente a diferença entre fundo, faixa e detalhe para a camisa ficar legível."
    };
  }

  if (hasStrongContrast) {
    return {
      status: "Boa harmonia",
      tone: "success" as const,
      summary: "As cores têm contraste suficiente.",
      suggestion: "Combinação boa para leitura no campo e identificação rápida do time."
    };
  }

  return {
    status: "Harmonia suave",
    tone: "info" as const,
    summary: "A combinação funciona, mas é discreta.",
    suggestion: "Para jogo, prefira ao menos uma cor mais escura ou mais clara para destacar faixas e números."
  };
}

export function teamKitBackground(value: string | null | undefined, fallback = "#94a3b8") {
  const kit = parseTeamKit(value, fallback);
  if (kit.style === "HORIZONTAL_CLASSIC" || kit.style === "HOOPS" || kit.style === "STRIPES") {
    return { backgroundColor: kit.primary, backgroundImage: `repeating-linear-gradient(90deg, ${kit.primary} 0 12px, ${kit.accent} 12px 24px), linear-gradient(180deg, transparent 0 72%, ${kit.tertiary}66 72% 100%)` };
  }
  if (kit.style === "TWO_CENTER_LINES" || kit.style === "CENTER_BARS_DUO") {
    const rightBarColor = kit.tertiary;
    if (kit.centerBarsVariant === "JOINED") {
      return { backgroundColor: kit.primary, backgroundImage: `linear-gradient(90deg, ${kit.primary} 0 42%, ${kit.accent} 42% 50%, ${rightBarColor} 50% 58%, ${kit.primary} 58% 100%)` };
    }
    if (kit.centerBarsVariant === "TRIPLE") {
      return { backgroundColor: kit.primary, backgroundImage: `linear-gradient(90deg, ${kit.primary} 0 36%, ${kit.accent} 36% 44%, ${rightBarColor} 44% 52%, ${kit.quaternary} 52% 60%, ${kit.primary} 60% 100%)` };
    }
    if (kit.centerBarsVariant === "WIDE") {
      return { backgroundColor: kit.primary, backgroundImage: `linear-gradient(90deg, ${kit.primary} 0 30%, ${kit.accent} 30% 45%, ${kit.primary} 45% 55%, ${rightBarColor} 55% 70%, ${kit.primary} 70% 100%)` };
    }
    return { backgroundColor: kit.primary, backgroundImage: `linear-gradient(90deg, ${kit.primary} 0 37%, ${kit.accent} 37% 45%, ${kit.primary} 45% 55%, ${rightBarColor} 55% 63%, ${kit.primary} 63% 100%)` };
  }
  if (kit.style === "DIAGONAL_ELITE" || kit.style === "SASH") {
    return { backgroundColor: kit.primary, backgroundImage: `linear-gradient(135deg, transparent 0 38%, ${kit.accent} 38% 52%, ${kit.tertiary} 52% 58%, transparent 58% 100%)` };
  }
  if (kit.style === "HALF_AND_HALF" || kit.style === "HALVES") {
    return { backgroundColor: kit.primary, backgroundImage: `linear-gradient(90deg, ${kit.primary} 0 50%, ${kit.accent} 50% 100%), linear-gradient(180deg, transparent 0 82%, ${kit.tertiary} 82% 100%)` };
  }
  if (kit.style === "SHOULDER_TEXTURE") {
    return { backgroundColor: kit.primary, backgroundImage: `radial-gradient(circle at 20% 0%, ${kit.accent} 0 3px, transparent 4px), radial-gradient(circle at 80% 0%, #111827 0 3px, transparent 4px)` };
  }
  if (kit.style === "GRADIENT_FLOW") {
    return { backgroundColor: kit.primary, backgroundImage: `linear-gradient(135deg, ${kit.primary}, ${kit.accent})` };
  }
  if (kit.style === "HEX_PATTERN") {
    return { backgroundColor: kit.primary, backgroundImage: `linear-gradient(30deg, ${kit.accent}22 12%, transparent 12.5%, transparent 87%, ${kit.accent}22 87.5%), linear-gradient(150deg, ${kit.accent}22 12%, transparent 12.5%, transparent 87%, ${kit.accent}22 87.5%)`, backgroundSize: "18px 31px" };
  }
  if (kit.style === "CARBON_FIBER") {
    return { backgroundColor: kit.primary, backgroundImage: `repeating-linear-gradient(45deg, #00000033 0 4px, transparent 4px 8px), repeating-linear-gradient(-45deg, ${kit.accent}22 0 3px, transparent 3px 9px)` };
  }
  if (kit.style === "BRUSH_STROKE") {
    return { backgroundColor: kit.primary, backgroundImage: `linear-gradient(110deg, transparent 0 20%, ${kit.accent} 20% 31%, transparent 31% 44%, ${kit.tertiary} 44% 52%, transparent 52% 100%)` };
  }
  if (kit.style === "LIGHTNING_PATTERN") {
    return { backgroundColor: kit.primary, backgroundImage: `linear-gradient(120deg, transparent 0 35%, ${kit.accent} 35% 42%, transparent 42% 50%, ${kit.accent} 50% 56%, transparent 56% 100%)` };
  }
  if (kit.style === "DIGITAL_CAMO" || kit.style === "PIXEL_PATTERN") {
    return { backgroundColor: kit.primary, backgroundImage: `linear-gradient(90deg, ${kit.accent}55 10%, transparent 10% 40%, #11182744 40% 55%, transparent 55%), linear-gradient(0deg, transparent 0 45%, ${kit.accent}33 45% 65%, transparent 65%)`, backgroundSize: "22px 22px" };
  }
  if (kit.style === "SMOKE_TEXTURE") {
    return { backgroundColor: kit.primary, backgroundImage: `radial-gradient(circle at 20% 35%, ${kit.accent}66, transparent 35%), radial-gradient(circle at 75% 65%, #11182766, transparent 32%)` };
  }
  if (kit.style === "GEO_FRAGMENT" || kit.style === "VINTAGE_90") {
    return { backgroundColor: kit.primary, backgroundImage: `linear-gradient(135deg, ${kit.accent} 0 18%, transparent 18% 42%, #11182755 42% 60%, transparent 60% 100%)` };
  }
  if (kit.style === "SOUND_WAVE") {
    return { backgroundColor: kit.primary, backgroundImage: `repeating-linear-gradient(180deg, ${kit.primary} 0 10px, ${kit.accent} 10px 20px)` };
  }
  if (kit.style === "TOPOGRAPHIC_MAP") {
    return { backgroundColor: kit.primary, backgroundImage: `repeating-radial-gradient(circle at 40% 40%, transparent 0 8px, ${kit.accent}44 9px 10px, transparent 11px 18px)` };
  }
  if (kit.style === "FLAME_PATTERN") {
    return { backgroundColor: kit.primary, backgroundImage: `radial-gradient(ellipse at 30% 100%, ${kit.accent} 0 16%, transparent 17%), radial-gradient(ellipse at 70% 100%, #111827 0 14%, transparent 15%)` };
  }
  if (kit.style === "MESH_PATTERN" || kit.style === "CLEAN_PREMIUM") {
    return { backgroundColor: kit.primary, backgroundImage: `repeating-linear-gradient(90deg, ${kit.accent}22 0 1px, transparent 1px 7px), repeating-linear-gradient(0deg, ${kit.accent}22 0 1px, transparent 1px 7px)` };
  }
  return { backgroundColor: kit.primary };
}
