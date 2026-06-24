import { useId } from "react";
import { normalizeTeamColor, parseTeamKit, type ShirtStyleDirection, type UniformStyle } from "../../utils/teamColors";


function lightenDarkenColor(color: string, amount: number) {
  const normalized = /^#[0-9a-fA-F]{6}$/.test(color) ? color : "#222222";
  const next = Number.parseInt(normalized.slice(1), 16);
  const r = Math.max(0, Math.min(255, (next >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((next >> 8) & 0x00ff) + amount));
  const b = Math.max(0, Math.min(255, (next & 0x0000ff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function jerseyStyle(style: UniformStyle) {
  if (style === "CHECKERED") return "plain";
  if (style === "SINGLE_BAND" || style === "CLEAN_PREMIUM" || style === "DIAGONAL_ELITE") return "single-band";
  if (style === "TWO_CENTER_LINES" || style === "CENTER_BARS_DUO") return "center-bars";
  if (style === "HALF_AND_HALF") return "two-color";
  if (style === "STRIPED_THIN") return "striped-thin";
  if (style === "STRIPED_THICK") return "striped-thick";
  if (style === "STRIPES" || style === "HORIZONTAL_CLASSIC") return "striped";
  if (style === "HOOPS") return "hoops";
  if (style === "SOUND_WAVE") return "waves";
  if (style === "DIGITAL_CAMO" || style === "MESH_PATTERN") return "dashed";
  return "plain";
}

function jerseyDirection(direction: ShirtStyleDirection) {
  if (direction === "DIAGONAL_LEFT") return "diagonal-left";
  if (direction === "DIAGONAL_RIGHT") return "diagonal-right";
  if (direction === "HORIZONTAL") return "horizontal";
  return "vertical";
}

const modernBodyPath =
  "M34 7 C39 14 63 14 68 7 L80 13 C78 34 78 64 76 90 C63 96 39 96 26 90 C24 64 24 34 22 13 Z";
const modernBodyShadePath = modernBodyPath;
const modernLeftSleevePath =
  "M34 7 L22 13 C14 20 7 29 1 38 C6 43 13 48 20 51 L29 39 C30 28 32 16 34 7 Z";
const modernRightSleevePath =
  "M68 7 L80 13 C88 20 95 29 101 38 C96 43 89 48 82 51 L73 39 C72 28 70 16 68 7 Z";
const modernCollarPath =
  "M35 5 C40 13 62 13 67 5 L73 11 C65 23 37 23 29 11 Z";
const modernCollarOpeningPath =
  "M42 8 C46 13 56 13 60 8 C58 17 44 17 42 8 Z";
const modernHemPath = "M25 88 C40 94 62 94 77 88";

function patternMarkup(style: string, direction: string, primary: string, secondary: string, tertiary = secondary, quaternary = tertiary, centerBarsVariant = "SPACED") {
  if (style === "center-bars") {
    if (centerBarsVariant === "JOINED") {
      return (
        <>
          <rect width="100" height="100" fill={primary} />
          <rect x="42" width="8" height="100" fill={secondary} />
          <rect x="50" width="8" height="100" fill={tertiary} />
        </>
      );
    }
    if (centerBarsVariant === "TRIPLE") {
      return (
        <>
          <rect width="100" height="100" fill={primary} />
          <rect x="36" width="8" height="100" fill={secondary} />
          <rect x="46" width="8" height="100" fill={tertiary} />
          <rect x="56" width="8" height="100" fill={quaternary} />
        </>
      );
    }
    if (centerBarsVariant === "WIDE") {
      return (
        <>
          <rect width="100" height="100" fill={primary} />
          <rect x="30" width="15" height="100" fill={secondary} />
          <rect x="55" width="15" height="100" fill={tertiary} />
        </>
      );
    }
    return (
      <>
        <rect width="100" height="100" fill={primary} />
        <rect x="37" width="8" height="100" fill={secondary} />
        <rect x="55" width="8" height="100" fill={tertiary} />
      </>
    );
  }

  if (style === "striped-thick") {
    return (
      <>
        <rect width="20" height="4" fill={primary} />
        <rect x="5" width="5" height="4" fill={secondary} />
        <rect x="10" width="5" height="4" fill={tertiary} />
        <rect x="15" width="5" height="4" fill={quaternary} />
      </>
    );
  }

  if (style === "striped-thin") {
    return (
      <>
        <rect width="8" height="4" fill={primary} />
        <rect width="1" height="4" fill={secondary} />
      </>
    );
  }

  if (style === "striped") {
    return (
      <>
        <rect width="20" height="4" fill={primary} />
        <rect x="5" width="5" height="4" fill={secondary} />
        <rect x="10" width="5" height="4" fill={tertiary} />
        <rect x="15" width="5" height="4" fill={quaternary} />
      </>
    );
  }

  if (style === "hoops") {
    return (
      <>
        <rect width="20" height="20" fill={primary} />
        <rect width="20" height="10" fill={secondary} />
      </>
    );
  }

  if (style === "two-color") {
    if (direction === "diagonal-right") {
      return (
        <>
          <rect width="90" height="100" fill={primary} />
          <rect x="50" width="50" height="120" fill={secondary} transform="rotate(35 50 0)" />
        </>
      );
    }
    if (direction === "diagonal-left") {
      return (
        <>
          <rect width="90" height="100" fill={primary} />
          <rect x="52" y="-20" width="60" height="140" fill={secondary} transform="rotate(145 52 -20)" />
        </>
      );
    }
    if (direction === "horizontal") {
      return (
        <>
          <rect width="100" height="100" fill={primary} />
          <rect y="52" width="100" height="50" fill={secondary} />
        </>
      );
    }
    return (
      <>
        <rect width="90" height="100" fill={primary} />
        <rect x="50" width="50" height="100" fill={secondary} />
      </>
    );
  }

  if (style === "single-band") {
    if (direction === "diagonal-right") {
      return (
        <>
          <rect width="100" height="100" fill={primary} />
          <rect y="40" width="120" height="20" fill={secondary} transform="rotate(120 0 40)" />
        </>
      );
    }
    if (direction === "diagonal-left") {
      return (
        <>
          <rect width="100" height="100" fill={primary} />
          <rect y="40" width="120" height="20" fill={secondary} transform="rotate(60 0 40)" />
        </>
      );
    }
    if (direction === "horizontal") {
      return (
        <>
          <rect width="100" height="90" fill={primary} />
          <rect y="30" width="100" height="30" fill={secondary} />
        </>
      );
    }
    return (
      <>
        <rect width="90" height="100" fill={primary} />
        <rect x="40" width="20" height="100" fill={secondary} />
      </>
    );
  }

  if (style === "waves") {
    if (direction === "horizontal") {
      return (
        <>
          <rect width="20" height="12" fill={primary} />
          <rect x="-3" y="3" width="14" height="6" fill={secondary} transform="rotate(-15 -3 3)" />
          <rect x="9" y="3" width="14" height="6" fill={secondary} transform="rotate(15 9 3)" />
        </>
      );
    }
    return (
      <>
        <rect width="12" height="20" fill={primary} />
        <rect x="3" y="-3" width="6" height="14" fill={secondary} transform="rotate(-15 3 -3)" />
        <rect x="3" y="9" width="6" height="14" fill={secondary} transform="rotate(15 3 9)" />
      </>
    );
  }

  if (style === "dashed") {
    if (direction === "diagonal-left") {
      return (
        <>
          <rect width="10" height="10" fill={primary} />
          <rect x="5" y="5" width="5" height="2" fill={secondary} transform="rotate(45 5 5)" />
        </>
      );
    }
    if (direction === "diagonal-right") {
      return (
        <>
          <rect width="10" height="10" fill={primary} />
          <rect x="5" y="5" width="5" height="2" fill={secondary} transform="rotate(135 5 5)" />
        </>
      );
    }
    if (direction === "horizontal") {
      return (
        <>
          <rect width="10" height="10" fill={primary} />
          <rect width="5" height="2" fill={secondary} />
          <rect x="5" y="5" width="5" height="2" fill={secondary} />
        </>
      );
    }
    return (
      <>
        <rect width="10" height="10" fill={primary} />
        <rect width="2" height="5" fill={secondary} />
        <rect x="5" y="5" width="2" height="5" fill={secondary} />
      </>
    );
  }

  return <rect width="100" height="100" fill={primary} />;
}

export function UniformShirtPreview({
  color,
  fallback,
  imageUrl,
  size = "large"
}: {
  color: string | null | undefined;
  fallback: string;
  imageUrl?: string | null;
  size?: "thumb" | "small" | "medium" | "large" | "studio";
  showDetails?: boolean;
  showLogo?: boolean;
}) {
  const svgId = useId().replace(/:/g, "");
  const kit = parseTeamKit(color, fallback);
  const sizeClass =
    size === "thumb" ?
       "h-12 w-12"
      : size === "small"
        ? "h-32 w-32"
        : size === "medium"
          ? "h-56 w-56"
          : size === "studio"
            ? "absolute inset-0 h-full w-full"
            : "h-[400px] w-full";
  const studioSizeStyle =
    size === "studio"
      ? {
          width: "100%",
          height: "100%" 
        }
      : undefined;
  const svgViewBox = "0 0 102 100";
  const style = jerseyStyle(kit.style);
  const direction = jerseyDirection(kit.shirtStyleDirection);
  const optimizedSleeveColor =
    kit.sleeveMode === "BODY"
      ? kit.primary
      : kit.sleeveMode === "DARK"
        ? "#111111"
        : kit.sleeveColor || kit.accent || kit.primary;
  const optimizedShirtColor = kit.primary;
  const patternWidth = style === "center-bars" ? 100 : style === "striped-thin" ? 8 : style === "striped" || style === "dashed" ? 10 : style === "striped-thick" || style === "hoops" ? 20 : style === "waves" && direction !== "horizontal" ? 12 : style === "waves" ? 20 : style === "single-band" && direction === "vertical" ? 90 : 100;
  const patternHeight = style === "striped-thin" || style === "striped" || style === "striped-thick" ? 4 : style === "hoops" ? 20 : style === "waves" && direction === "horizontal" ? 12 : style === "waves" ? 20 : style === "single-band" && direction === "horizontal" ? 90 : 100;
  const patternId = `${svgId}-jersey-pattern`;
  const bodyShadeId = `${svgId}-jersey-body-shade`;
  const leftSleeveId = `${svgId}-jersey-left-sleeve`;
  const rightSleeveId = `${svgId}-jersey-right-sleeve`;
  const bodyClipId = `${svgId}-jersey-body-clip`;
  const shirtFill = style === "plain" ? optimizedShirtColor : `url(#${patternId})`;
  const centerBarRightColor = kit.tertiary || kit.accent || "#222222";
  const patternFourthColor = kit.colorCount === "FOUR" ? kit.quaternary || kit.tertiary || "#222222" : kit.tertiary || kit.accent || "#222222";
  const displayText = kit.shirtText || kit.sponsorFront || "";
  const fontSize = Math.min(30, Math.max(8, (20 / Math.max(displayText.length, 1)) * 3));
  const jerseyScale = size === "thumb" || size === "small" ? 1 : size === "medium" ? 1.12 : size === "studio" ? 1.68 : 1.38;
  const jerseyTransform = `translate(51 50) scale(${jerseyScale}) translate(-51 -50)`;

  if (imageUrl) {
    return (
      <span className={`relative mx-auto grid shrink-0 place-items-center overflow-hidden ${sizeClass}`} style={studioSizeStyle}>
        <img src={imageUrl} alt="Camisa cadastrada" className="max-h-full max-w-full object-contain drop-shadow-lg" />
      </span>
    );
  }

  return (
    <span className={`relative mx-auto block shrink-0 ${sizeClass}`} style={studioSizeStyle}>
      <svg viewBox={svgViewBox} preserveAspectRatio="xMidYMid meet" className="block h-full w-full overflow-visible drop-shadow-lg" role="img" aria-label="Camisa personalizada">
        <defs>
          <pattern id={patternId} width={patternWidth} height={patternHeight} patternUnits="userSpaceOnUse">
            {patternMarkup(style, direction, optimizedShirtColor, kit.accent || "#222222", centerBarRightColor, patternFourthColor, kit.centerBarsVariant)}
          </pattern>
          <clipPath id={bodyClipId}>
            <path d={modernBodyPath} />
          </clipPath>
          <linearGradient id={bodyShadeId} x1="1" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#000000" stopOpacity="0.2" />
            <stop offset="0.44" stopColor="#dddddd" stopOpacity="0.1" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id={leftSleeveId} x1="1" y1="1" x2="0" y2="0">
            <stop offset="0.21" stopColor={lightenDarkenColor(optimizedSleeveColor, -6)} />
            <stop offset="1" stopColor={optimizedSleeveColor} />
          </linearGradient>
          <linearGradient id={rightSleeveId} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0.21" stopColor={lightenDarkenColor(optimizedSleeveColor, -6)} />
            <stop offset="1" stopColor={optimizedSleeveColor} />
          </linearGradient>
        </defs>
        <g transform={jerseyTransform}>
          <path d={modernLeftSleevePath} fill={`url(#${leftSleeveId})`} />
          <path d={modernRightSleevePath} fill={`url(#${rightSleeveId})`} />
          <path d={modernBodyPath} fill={shirtFill} />
          <path d={modernBodyShadePath} fill={`url(#${bodyShadeId})`} />
          <path d={modernBodyPath} fill="none" stroke="rgba(15,23,42,0.15)" strokeWidth="0.75" />
          <path d="M33 8 C28 18 27 28 29 39" fill="none" stroke="rgba(255,255,255,0.62)" strokeWidth="1.2" />
          <path d="M69 8 C74 18 75 28 73 39" fill="none" stroke="rgba(255,255,255,0.62)" strokeWidth="1.2" />
          <path d={modernCollarPath} fill={kit.collarColor || "#111111"} />
          <path d={modernCollarOpeningPath} fill="rgba(15,23,42,0.22)" />
          <path d={modernHemPath} stroke={kit.hemStyle === "NONE" ? "rgba(15,23,42,0.12)" : kit.hemColor} strokeWidth={kit.hemStyle === "DOUBLE" ? "4.2" : kit.hemStyle === "SIMPLE" ? "3.2" : "1.2"} strokeLinecap="round" fill="none" />
          {kit.hemStyle === "DOUBLE" ? <path d="M26 84 C40 89 62 89 76 84" stroke={lightenDarkenColor(kit.hemColor, 48)} strokeWidth="1.4" strokeLinecap="round" fill="none" /> : null}
          {kit.cuffStyle !== "NONE" ? (
            <>
              <path d="M5 37 C10 41 15 44 20 46" stroke={kit.cuffColor} strokeWidth={kit.cuffStyle === "DOUBLE" ? "4.6" : "3.4"} strokeLinecap="round" fill="none" />
              <path d="M97 37 C92 41 87 44 82 46" stroke={kit.cuffColor} strokeWidth={kit.cuffStyle === "DOUBLE" ? "4.6" : "3.4"} strokeLinecap="round" fill="none" />
              {kit.cuffStyle === "DOUBLE" || kit.cuffStyle === "STRIPED" ? (
                <>
                  <path d="M7 31.5 C12 35.5 17 38.5 22 40.5" stroke={kit.cuffStyle === "STRIPED" ? kit.accent : lightenDarkenColor(kit.cuffColor, 48)} strokeWidth="1.5" strokeLinecap="round" fill="none" />
                  <path d="M95 31.5 C90 35.5 85 38.5 80 40.5" stroke={kit.cuffStyle === "STRIPED" ? kit.accent : lightenDarkenColor(kit.cuffColor, 48)} strokeWidth="1.5" strokeLinecap="round" fill="none" />
                </>
              ) : null}
            </>
          ) : null}
          {displayText ? (
            <text x="50" y="37" textAnchor="middle" dominantBaseline="middle" fill={lightenDarkenColor(kit.numberColor || "#ffffff", -50)} stroke={kit.numberStyle === "OUTLINE" ? kit.tertiary : lightenDarkenColor(kit.numberColor || "#ffffff", 10)} strokeWidth="0.5" fontFamily="Monospace" fontWeight="700" fontSize={fontSize}>
              {displayText}
            </text>
          ) : null}
        </g>
      </svg>
    </span>
  );
}

export function TeamColorCard({
  label,
  name,
  color,
  fallback = "#94a3b8",
  imageUrl,
  crestUrl,
  formation,
  seasonLabel,
  className = "",
  variant = "compact"
}: {
  label: string;
  name: string;
  color: string | null | undefined;
  fallback?: string;
  imageUrl?: string | null;
  crestUrl?: string | null;
  formation?: string | null;
  seasonLabel?: string | number | null;
  className?: string;
  variant?: "compact" | "studio";
}) {
  const background = normalizeTeamColor(color, fallback);
  const kit = parseTeamKit(color, fallback);
  const studioSvgId = useId().replace(/:/g, "");

  if (variant === "studio") {
    if (imageUrl) {
      return (
        <div className={`fl-transparent-checker relative grid h-[520px] w-full place-items-center overflow-hidden rounded-lg border border-slate-200 p-4 sm:h-[640px] lg:h-[720px] ${className}`}>
          <img src={imageUrl} alt="Camisa cadastrada" className="max-h-full max-w-full object-contain drop-shadow-lg" />
        </div>
      );
    }

    const style = jerseyStyle(kit.style);
    const direction = jerseyDirection(kit.shirtStyleDirection);
    const primary = kit.primary;
    const patternId = `${studioSvgId}-studio-pattern`;
    const bodyShadeId = `${patternId}-shade`;
    const leftSleeveId = `${patternId}-left-sleeve`;
    const rightSleeveId = `${patternId}-right-sleeve`;
    const patternWidth = style === "center-bars" ? 100 : style === "striped-thin" ? 8 : style === "striped" || style === "dashed" ? 10 : style === "striped-thick" || style === "hoops" ? 20 : style === "waves" && direction !== "horizontal" ? 12 : style === "waves" ? 20 : style === "single-band" && direction === "vertical" ? 90 : 100;
    const patternHeight = style === "striped-thin" || style === "striped" || style === "striped-thick" ? 4 : style === "hoops" ? 20 : style === "waves" && direction === "horizontal" ? 12 : style === "waves" ? 20 : style === "single-band" && direction === "horizontal" ? 90 : 100;
    const shirtFill = style === "plain" ? primary : `url(#${patternId})`;
    const centerBarRightColor = kit.tertiary || kit.accent || "#222222";
    const patternFourthColor = kit.colorCount === "FOUR" ? kit.quaternary || kit.tertiary || "#222222" : kit.tertiary || kit.accent || "#222222";
    const sleeveBaseColor =
      kit.sleeveMode === "BODY"
        ? kit.primary
        : kit.sleeveMode === "DARK"
          ? "#111111"
          : kit.sleeveColor || kit.accent || kit.primary;
    const optimizedSleeveColor = sleeveBaseColor;
    const labelFill = lightenDarkenColor(kit.numberColor || kit.tertiary || "#111827", 0);
    const labelStroke = "#ffffff";
    const frontSponsor = kit.sponsorFront.trim().slice(0, 18);
    const sleeveSponsor = kit.sponsorSleeve.trim().slice(0, 10);
    const shirtText = kit.shirtText.trim().slice(0, 18);
    return (
      <div
        className={`fl-transparent-checker relative h-[520px] w-full overflow-hidden rounded-lg border border-slate-200 sm:h-[640px] lg:h-[720px] ${className}`}
      >
        <div className="relative flex h-full min-h-0 w-full items-center justify-center">
          <svg
            viewBox="-4 -6 110 112"
            preserveAspectRatio="xMidYMid meet"
            className="fl-uniform-studio-svg block h-full min-h-[400px] w-full"
            role="img"
            aria-label="Camisa personalizada em tamanho grande"
          >
            <defs>
              <pattern id={patternId} width={patternWidth} height={patternHeight} patternUnits="userSpaceOnUse">
                {patternMarkup(style, direction, primary, kit.accent || "#222222", centerBarRightColor, patternFourthColor, kit.centerBarsVariant)}
              </pattern>
              <linearGradient id={bodyShadeId} x1="1" y1="1" x2="1" y2="0">
                <stop offset="0" stopColor="#000000" stopOpacity="0.2" />
                <stop offset="0.44" stopColor="#dddddd" stopOpacity="0.1" />
                <stop offset="1" stopColor="#ffffff" stopOpacity="0.1" />
              </linearGradient>
              <linearGradient id={leftSleeveId} x1="1" y1="1" x2="0" y2="0">
                <stop offset="0.21" stopColor={lightenDarkenColor(optimizedSleeveColor, -6)} />
                <stop offset="1" stopColor={optimizedSleeveColor} />
              </linearGradient>
              <linearGradient id={rightSleeveId} x1="0" y1="1" x2="1" y2="0">
                <stop offset="0.21" stopColor={lightenDarkenColor(optimizedSleeveColor, -6)} />
                <stop offset="1" stopColor={optimizedSleeveColor} />
              </linearGradient>
            </defs>
            <g>
              <path d={modernLeftSleevePath} fill={`url(#${leftSleeveId})`} />
              <path d={modernRightSleevePath} fill={`url(#${rightSleeveId})`} />
              <path d={modernBodyPath} fill={shirtFill} />
              <path d={modernBodyShadePath} fill={`url(#${bodyShadeId})`} />
              <path d={modernBodyPath} fill="none" stroke="rgba(15,23,42,0.16)" strokeWidth="0.72" />
              <path d="M33 8 C28 18 27 28 29 39" fill="none" stroke="rgba(255,255,255,0.62)" strokeWidth="1.15" />
              <path d="M69 8 C74 18 75 28 73 39" fill="none" stroke="rgba(255,255,255,0.62)" strokeWidth="1.15" />
              {kit.cuffStyle !== "NONE" ? (
                <>
                  <path d="M5 37 C10 41 15 44 20 46" stroke={kit.cuffColor} strokeWidth={kit.cuffStyle === "DOUBLE" ? 4.6 : 3.6} strokeLinecap="round" />
                  <path d="M97 37 C92 41 87 44 82 46" stroke={kit.cuffColor} strokeWidth={kit.cuffStyle === "DOUBLE" ? 4.6 : 3.6} strokeLinecap="round" />
                  {kit.cuffStyle === "DOUBLE" || kit.cuffStyle === "STRIPED" ? (
                    <>
                      <path d="M7 31.5 C12 35.5 17 38.5 22 40.5" stroke={kit.cuffStyle === "STRIPED" ? kit.accent : lightenDarkenColor(kit.cuffColor, 50)} strokeWidth="1.8" strokeLinecap="round" />
                      <path d="M95 31.5 C90 35.5 85 38.5 80 40.5" stroke={kit.cuffStyle === "STRIPED" ? kit.accent : lightenDarkenColor(kit.cuffColor, 50)} strokeWidth="1.8" strokeLinecap="round" />
                    </>
                  ) : null}
                </>
              ) : null}
              <path d={modernCollarPath} fill={kit.collarColor || "#111111"} />
              <path d={modernCollarOpeningPath} fill="rgba(15,23,42,0.22)" />
              {kit.hemStyle !== "NONE" ? (
                <>
                  <path d={modernHemPath} stroke={kit.hemColor} strokeWidth={kit.hemStyle === "DOUBLE" ? 5 : 4} strokeLinecap="round" fill="none" />
                  {kit.hemStyle === "DOUBLE" ? <path d="M26 84 C40 89 62 89 76 84" stroke={lightenDarkenColor(kit.hemColor, 50)} strokeWidth="2" strokeLinecap="round" fill="none" /> : null}
                </>
              ) : <path d={modernHemPath} stroke="rgba(15,23,42,0.12)" strokeWidth="1.2" strokeLinecap="round" fill="none" />}
              {shirtText ? (
                <text x="50.5" y="34" textAnchor="middle" dominantBaseline="middle" fill={labelFill} stroke={labelStroke} strokeWidth="0.45" paintOrder="stroke" fontFamily="Arial, sans-serif" fontSize={Math.max(4.4, 8 - shirtText.length * 0.14)} fontWeight="800">
                  {shirtText}
                </text>
              ) : null}
              {frontSponsor ? (
                <text x="50.5" y="50" textAnchor="middle" dominantBaseline="middle" fill={labelFill} stroke={labelStroke} strokeWidth="0.55" paintOrder="stroke" fontFamily="Arial, sans-serif" fontSize={Math.max(5.6, 12 - frontSponsor.length * 0.22)} fontWeight="900">
                  {frontSponsor}
                </text>
              ) : null}
              {sleeveSponsor ? (
                <>
                  <text x="13" y="25.5" textAnchor="middle" dominantBaseline="middle" fill={labelFill} stroke={labelStroke} strokeWidth="0.35" paintOrder="stroke" fontFamily="Arial, sans-serif" fontSize={Math.max(3.2, 5.6 - sleeveSponsor.length * 0.16)} fontWeight="800" transform="rotate(-53 13 25.5)">
                    {sleeveSponsor}
                  </text>
                  <text x="88" y="25.5" textAnchor="middle" dominantBaseline="middle" fill={labelFill} stroke={labelStroke} strokeWidth="0.35" paintOrder="stroke" fontFamily="Arial, sans-serif" fontSize={Math.max(3.2, 5.6 - sleeveSponsor.length * 0.16)} fontWeight="800" transform="rotate(53 88 25.5)">
                    {sleeveSponsor}
                  </text>
                </>
              ) : null}
            </g>
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-lg border border-slate-200 bg-white p-3 shadow-sm ${className}`}>
      <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: background }} />
      <div className="grid gap-3 sm:grid-cols-[4.5rem_minmax(0,1fr)_6.5rem] sm:items-center">
        <div className="grid size-16 place-items-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-1 sm:size-[4.5rem]">
          {crestUrl ? <img src={crestUrl} alt="" className="max-h-full max-w-full object-contain" /> : <span className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-400">Escudo</span>}
        </div>
        <div className="min-w-0">
          {label.trim() ? <p className="truncate text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">{label}</p> : null}
          <p className="mt-1 truncate text-base font-black text-slate-950">{name}</p>
          <span className="mt-2 inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-black text-slate-700">
            Formação {formation || "automática"}
          </span>
        </div>
        <div className="grid justify-start gap-1 sm:justify-end">
          <div className="fl-transparent-checker grid h-24 w-24 place-items-center overflow-hidden rounded-lg border border-slate-200">
            <span className="grid place-items-center scale-75">
              <UniformShirtPreview color={color} fallback={fallback} imageUrl={imageUrl} size="small" />
            </span>
          </div>
          {seasonLabel ? <span className="text-center text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">{seasonLabel}</span> : null}
        </div>
      </div>
    </div>
  );
}
