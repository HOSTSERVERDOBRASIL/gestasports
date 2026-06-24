import { useId, type CSSProperties, type DragEventHandler } from "react";
import { kitRendererPropsFromKit } from "./kitRendererProps";

export type KitStripe = {
  direction?: "vertical" | "horizontal" | "diagonal";
  colors: string[];
  width?: number;
};

export type KitSponsors = {
  front?: string;
  back?: string;
  sleeve?: string;
};

export type KitRendererProps = {
  baseColor?: string | null;
  sleeveColor?: string | null;
  collarColor?: string | null;
  stripes?: KitStripe | null;
  crestUrl?: string | null;
  sponsors?: KitSponsors | null;
  number?: number | string | null;
  athleteName?: string | null;
  view: "front" | "back";
  numberColor?: string | null;
  size?: "compact" | "field" | "bench";
  className?: string;
  style?: CSSProperties;
};

export type TacticalJerseyProps = {
  kitSource?: string | null;
  fallbackColor?: string;
  crestUrl?: string | null;
  number?: number | string | null;
  athleteName?: string | null;
  size?: KitRendererProps["size"];
  className?: string;
  style?: CSSProperties;
};

export type TacticalPlayerCardProps = {
  name: string;
  position: string;
  number?: number | string | null;
  kitSource?: string | null;
  fallbackColor?: string;
  crestUrl?: string | null;
  isCaptain?: boolean;
  isGoalkeeper?: boolean;
  draggable?: boolean;
  title?: string;
  onDragStart?: DragEventHandler<HTMLDivElement>;
  onRemove?: () => void;
};

export type BenchPlayerCardProps = {
  name: string;
  position: string;
  number?: number | string | null;
  kitSource?: string | null;
  fallbackColor?: string;
  crestUrl?: string | null;
  isCaptain?: boolean;
  draggable?: boolean;
  title?: string;
  onDragStart?: DragEventHandler<HTMLDivElement>;
  embedded?: boolean;
};

const shirtPath = "M67 17 L82 17 L90 29 L110 29 L118 17 L133 17 L166 48 L148 72 L136 62 L136 176 L64 176 L64 62 L52 72 L34 48 Z";
const sleeveLeftPath = "M67 18 L35 48 L52 72 L64 62 L64 36 Z";
const sleeveRightPath = "M133 18 L165 48 L148 72 L136 62 L136 36 Z";
const bodyPath = "M64 36 L82 17 L90 29 L110 29 L118 17 L136 36 L136 176 L64 176 Z";
const collarRoundPath = "M84 18 Q100 38 116 18 L110 29 L90 29 Z";

function safeColor(value: string | null | undefined, fallback: string) {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value.trim()) ? value.trim() : fallback;
}

function luminance(color: string) {
  const safe = safeColor(color, "#ffffff");
  const r = Number.parseInt(safe.slice(1, 3), 16);
  const g = Number.parseInt(safe.slice(3, 5), 16);
  const b = Number.parseInt(safe.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function automaticNumberColor(baseColor: string, preferred?: string | null) {
  const safePreferred = safeColor(preferred, "");
  if (safePreferred) return safePreferred;
  return luminance(baseColor) > 0.58 ? "#111111" : "#ffffff";
}

function numberStroke(color: string) {
  return luminance(color) > 0.58 ? "rgba(15,23,42,0.82)" : "rgba(255,255,255,0.86)";
}

function shortName(name: string | null | undefined) {
  const parts = (name ?? "").trim().split(" ").filter(Boolean);
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

function textFont(size: KitRendererProps["size"]) {
  if (size === "bench") return { number: 42, name: 13, sponsor: 8 };
  if (size === "compact") return { number: 50, name: 14, sponsor: 9 };
  return { number: 76, name: 15, sponsor: 10 };
}

export function KitRenderer({
  baseColor = "#ffffff",
  sleeveColor,
  collarColor = "#111111",
  stripes = null,
  crestUrl = null,
  sponsors = null,
  number = null,
  athleteName = null,
  view,
  numberColor,
  size = "field",
  className = "",
  style
}: KitRendererProps) {
  const id = useId().replace(/:/g, "");
  const base = safeColor(baseColor, "#ffffff");
  const sleeve = safeColor(sleeveColor, base);
  const collar = safeColor(collarColor, "#111111");
  const finalNumberColor = automaticNumberColor(base, numberColor);
  const stroke = numberStroke(finalNumberColor);
  const fonts = textFont(size);
  const visibleNumber = number !== null && number !== undefined && String(number).trim() !== "" ? String(number) : "";
  const displayName = shortName(athleteName);
  const sponsorText = view === "back" ? sponsors?.back : sponsors?.front;
  const shouldUseReferenceStripe = view === "back" && !stripes?.colors.length && base.toLowerCase() === "#ffffff";
  const renderedSleeve = shouldUseReferenceStripe ? "#dc2626" : sleeve;
  const hasStripes = Boolean(stripes?.colors.length) || shouldUseReferenceStripe;
  const stripeColors = stripes?.colors.length ? stripes.colors.map((color) => safeColor(color, "#111111")) : [];
  const stripeDirection = stripes?.direction ?? "vertical";

  return (
    <svg className={className} style={style} viewBox="20 8 160 184" role="img" aria-label={visibleNumber ? `Camisa ${visibleNumber}` : "Camisa"} preserveAspectRatio="xMidYMid meet">
      <defs>
        <clipPath id={`${id}-shirt-clip`}>
          <path d={shirtPath} />
        </clipPath>
        <filter id={`${id}-soft-shadow`} x="-20%" y="-15%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#020617" floodOpacity="0.28" />
        </filter>
        <linearGradient id={`${id}-fabric`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
          <stop offset="48%" stopColor={base} stopOpacity="0" />
          <stop offset="100%" stopColor="#020617" stopOpacity="0.14" />
        </linearGradient>
        {hasStripes && !shouldUseReferenceStripe ? (
          <pattern id={`${id}-stripes`} x="0" y="0" width={stripeDirection === "horizontal" ? 200 : 48} height={stripeDirection === "horizontal" ? 34 : 210} patternUnits="userSpaceOnUse" patternTransform={stripeDirection === "diagonal" ? "rotate(28 100 105)" : undefined}>
            <rect width="200" height="210" fill={base} />
            {stripeDirection === "horizontal" ? (
              stripeColors.map((color, index) => <rect key={color + index} x="0" y={index * 16} width="200" height={stripes?.width ?? 14} fill={color} opacity="0.96" />)
            ) : (
              stripeColors.map((color, index) => <rect key={color + index} x={18 + index * ((stripes?.width ?? 14) + 4)} y="0" width={stripes?.width ?? 14} height="210" fill={color} opacity="0.96" />)
            )}
          </pattern>
        ) : null}
      </defs>

      <g filter={`url(#${id}-soft-shadow)`}>
        <path d={shirtPath} fill={base} stroke="rgba(15,23,42,0.22)" strokeWidth="2.2" />
        <path d={sleeveLeftPath} fill={renderedSleeve} opacity="0.98" />
        <path d={sleeveRightPath} fill={renderedSleeve} opacity="0.98" />
        <path d={bodyPath} fill={hasStripes && !shouldUseReferenceStripe ? `url(#${id}-stripes)` : base} />
        {shouldUseReferenceStripe ? (
          <g clipPath={`url(#${id}-shirt-clip)`}>
            <rect x="95" y="29" width="10" height="150" fill="#111111" opacity="0.94" />
            <rect x="99" y="29" width="4" height="150" fill="#dc2626" opacity="0.96" />
            <rect x="63" y="37" width="4" height="140" fill="#dc2626" opacity="0.88" />
            <rect x="133" y="37" width="4" height="140" fill="#dc2626" opacity="0.88" />
          </g>
        ) : null}
        <path d={shirtPath} fill={`url(#${id}-fabric)`} clipPath={`url(#${id}-shirt-clip)`} />
        <path d={collarRoundPath} fill={collar} />
        {shouldUseReferenceStripe ? (
          <>
            <path d="M39 54 L52 71" stroke="#111111" strokeWidth="6" strokeLinecap="round" />
            <path d="M161 54 L148 71" stroke="#111111" strokeWidth="6" strokeLinecap="round" />
            <path d="M64 176 H136" stroke="#111111" strokeWidth="5" strokeLinecap="round" />
            <path d="M64 170 H136" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" />
          </>
        ) : null}
        <path d="M83 17 Q100 44 117 17" fill="none" stroke="rgba(255,255,255,0.52)" strokeWidth="3" strokeLinecap="round" />
        <path d="M64 176 H136" stroke="rgba(255,255,255,0.34)" strokeWidth="3" strokeLinecap="round" />
        <path d="M35 48 L52 72 M165 48 L148 72" stroke="rgba(255,255,255,0.35)" strokeWidth="2.2" strokeLinecap="round" />
      </g>

      {view === "front" && crestUrl ? <image href={crestUrl} x="82" y="66" width="36" height="36" preserveAspectRatio="xMidYMid meet" clipPath={`url(#${id}-shirt-clip)`} /> : null}
      {view === "back" && displayName ? (
        <text x="100" y="68" textAnchor="middle" fontFamily="Inter, Arial, sans-serif" fontSize={fonts.name} fontWeight="900" fill={finalNumberColor} stroke={stroke} strokeWidth="0.9" paintOrder="stroke" letterSpacing="0">
          {displayName.toUpperCase()}
        </text>
      ) : null}
      {visibleNumber ? (
        <text
          x="100"
          y={view === "back" ? "128" : "133"}
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily="Arial Black, Impact, Inter, Arial, sans-serif"
          fontSize={fonts.number}
          fontWeight="900"
          fill={finalNumberColor}
          stroke={stroke}
          strokeWidth="2.2"
          paintOrder="stroke"
          letterSpacing="0"
        >
          {visibleNumber}
        </text>
      ) : null}
      {sponsorText ? (
        <text x="100" y={view === "back" ? "154" : "104"} textAnchor="middle" fontFamily="Inter, Arial, sans-serif" fontSize={fonts.sponsor} fontWeight="900" fill={finalNumberColor} opacity="0.82" letterSpacing="0">
          {sponsorText.slice(0, 16).toUpperCase()}
        </text>
      ) : null}
    </svg>
  );
}

export function TacticalJersey({ kitSource, fallbackColor = "#ffffff", crestUrl, number, athleteName, size = "field", className = "", style }: TacticalJerseyProps) {
  const kit = kitRendererPropsFromKit(kitSource, fallbackColor);
  return <KitRenderer {...kit} crestUrl={crestUrl} number={number} athleteName={athleteName} view="back" size={size} className={className} style={style} />;
}

export function TacticalPlayerCard({
  name,
  position,
  number,
  kitSource,
  fallbackColor = "#ffffff",
  crestUrl,
  isCaptain = false,
  isGoalkeeper = false,
  draggable = false,
  title,
  onDragStart,
  onRemove
}: TacticalPlayerCardProps) {
  return (
    <div
      className="group relative grid justify-items-center"
      style={{ width: "clamp(74px, 7.15vw, 132px)" }}
    >
      <div
        draggable={draggable}
        onDragStart={onDragStart}
        className={`relative z-10 grid justify-items-center ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`}
        title={title ?? name}
      >
        <TacticalJersey
          kitSource={kitSource}
          fallbackColor={fallbackColor}
          crestUrl={crestUrl}
          number={number}
          athleteName={null}
          size="field"
          className={isGoalkeeper ? "drop-shadow-[0_0_12px_rgba(56,189,248,0.58)]" : ""}
          style={{
            width: "clamp(68px, 6.7vw, 126px)",
            height: "clamp(72px, 6.9vw, 132px)"
          }}
        />
        {isCaptain ? <span className="absolute right-0 top-[58%] z-20 rounded-full border border-amber-200 bg-amber-400 px-1.5 py-0.5 text-[8px] font-black leading-none text-slate-950 shadow-sm">CAP</span> : null}
      </div>
      <div
        className="relative z-20 border border-emerald-300/15 bg-emerald-950/92 text-center shadow-[0_10px_22px_rgba(2,44,34,0.46)] backdrop-blur"
        style={{ width: "clamp(64px, 5.85vw, 112px)", marginTop: "clamp(-24px, -1.65vw, -14px)", padding: "clamp(5px, 0.48vw, 9px) clamp(5px, 0.4vw, 8px)", borderRadius: "clamp(6px, 0.48vw, 10px)" }}
      >
        <span className="block truncate font-black leading-none text-white" style={{ fontSize: "clamp(9px, 0.78vw, 14px)" }} title={name}>
          {shortName(name)}
        </span>
        <span className="block font-black uppercase leading-none text-emerald-300" style={{ marginTop: "clamp(2px, 0.25vw, 5px)", fontSize: "clamp(7px, 0.56vw, 11px)" }}>{isGoalkeeper ? "GOL" : position}</span>
      </div>
      {onRemove ? (
        <button
          type="button"
          className="absolute -right-1 -top-1 hidden h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[11px] font-black text-white shadow-sm group-hover:flex"
          onClick={onRemove}
          title="Remover do campo"
        >
          x
        </button>
      ) : null}
    </div>
  );
}

export function BenchPlayerCard({
  name,
  position,
  number,
  kitSource,
  fallbackColor = "#ffffff",
  crestUrl,
  isCaptain = false,
  draggable = false,
  title,
  onDragStart,
  embedded = false
}: BenchPlayerCardProps) {
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      className={`relative flex shrink-0 flex-col items-center justify-between border border-emerald-300/10 bg-emerald-950/85 text-center shadow-[0_8px_18px_rgba(2,44,34,0.32)] transition hover:-translate-y-0.5 hover:shadow-md ${embedded ? "" : "h-24 min-w-[6.2rem] rounded-lg px-2 py-2"} ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`}
      style={embedded ? { width: "clamp(44px, 5.4vw, 86px)", minWidth: "clamp(44px, 5.4vw, 86px)", height: "clamp(52px, 5.8vw, 94px)", padding: "clamp(3px, 0.32vw, 6px)", borderRadius: "clamp(5px, 0.45vw, 8px)" } : undefined}
      title={title ?? name}
    >
      <TacticalJersey kitSource={kitSource} fallbackColor={fallbackColor} crestUrl={crestUrl} number={number} athleteName={null} size="bench" className={embedded ? "" : "h-12 w-14"} style={embedded ? { width: "clamp(30px, 3.6vw, 58px)", height: "clamp(30px, 3.4vw, 56px)" } : undefined} />
      {isCaptain ? <span className="absolute right-1 top-1 rounded-full bg-amber-400 px-1 text-[7px] font-black leading-4 text-slate-950">CAP</span> : null}
      <span className={`block w-full truncate font-black leading-none text-white ${embedded ? "" : "text-[10px]"}`} style={embedded ? { fontSize: "clamp(7px, 0.55vw, 10px)" } : undefined}>{shortName(name)}</span>
      <span className={`block font-black uppercase leading-none text-emerald-300 ${embedded ? "" : "text-[8px]"}`} style={embedded ? { fontSize: "clamp(6px, 0.48vw, 9px)" } : undefined}>{position}</span>
    </div>
  );
}
