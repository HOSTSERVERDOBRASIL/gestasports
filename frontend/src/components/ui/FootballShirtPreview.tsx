export type ShirtPattern = 
  | "SOLID"
  | "CENTER_BARS_DUO"
  | "TWO_CENTER_LINES"
  | "HORIZONTAL_CLASSIC"
  | "STRIPES"
  | "CLEAN_PREMIUM"
  | "SOUND_WAVE"
  | "HOOPS"
  | "HALF_AND_HALF"
  | "DIAGONAL_ELITE"
  | "GRADIENT_FLOW"
  | "DIGITAL_CAMO"
  | "MESH_PATTERN";

interface FootballShirtPreviewProps {
  primaryColor: string;
  secondaryColor: string;
  tertiaryColor: string;
  pattern: ShirtPattern;
  logoUrl: string;
  size: "small" | "medium" | "large";
}

const PatternDefs: Record<ShirtPattern, string> = {
  SOLID: "solid",
  CENTER_BARS_DUO: "center-lines",
  TWO_CENTER_LINES: "center-lines",
  HORIZONTAL_CLASSIC: "vertical-stripes",
  STRIPES: "multi-stripes",
  CLEAN_PREMIUM: "center-band",
  SOUND_WAVE: "horizontal",
  HOOPS: "horizontal-hoops",
  HALF_AND_HALF: "half",
  DIAGONAL_ELITE: "diagonal",
  GRADIENT_FLOW: "gradient",
  DIGITAL_CAMO: "camo",
  MESH_PATTERN: "mesh"
};

export function FootballShirtPreview({
  primaryColor,
  secondaryColor,
  tertiaryColor = "#111827",
  pattern,
  logoUrl,
  size = "large"
}: FootballShirtPreviewProps) {
  const sizeMap = {
    small: { width: 120, height: 160 },
    medium: { width: 200, height: 270 },
    large: { width: 280, height: 380 }
  };

  const dims = sizeMap[size];
  const patternId = `pattern-${PatternDefs[pattern]}-${Date.now()}`;
  const gradId = `gradient-${Date.now()}`;

  return (
    <svg
      viewBox="0 0 200 300"
      width={dims.width}
      height={dims.height}
      className="drop-shadow-lg"
    >
      <defs>
        {/* Padrões */}
        <pattern
          id={`${patternId}-center-lines`}
          x="0"
          y="0"
          width="200"
          height="300"
          patternUnits="userSpaceOnUse"
        >
          <rect width="200" height="300" fill={primaryColor} />
          <rect x="75" y="0" width="50" height="300" fill={secondaryColor} />
        </pattern>

        <pattern
          id={`${patternId}-vertical-stripes`}
          x="0"
          y="0"
          width="40"
          height="300"
          patternUnits="userSpaceOnUse"
        >
          <rect width="40" height="300" fill={primaryColor} />
          <rect x="0" y="0" width="20" height="300" fill={secondaryColor} />
        </pattern>

        <pattern
          id={`${patternId}-multi-stripes`}
          x="0"
          y="0"
          width="60"
          height="300"
          patternUnits="userSpaceOnUse"
        >
          <rect width="60" height="300" fill={primaryColor} />
          <rect x="0" y="0" width="20" height="300" fill={secondaryColor} />
          <rect x="40" y="0" width="20" height="300" fill={secondaryColor} />
        </pattern>

        <pattern
          id={`${patternId}-center-band`}
          x="0"
          y="0"
          width="200"
          height="300"
          patternUnits="userSpaceOnUse"
        >
          <rect width="200" height="300" fill={primaryColor} />
          <rect x="60" y="0" width="80" height="300" fill={secondaryColor} />
        </pattern>

        <pattern
          id={`${patternId}-horizontal`}
          x="0"
          y="0"
          width="200"
          height="40"
          patternUnits="userSpaceOnUse"
        >
          <rect width="200" height="40" fill={primaryColor} />
          <rect x="0" y="0" width="200" height="20" fill={secondaryColor} />
        </pattern>

        <pattern
          id={`${patternId}-horizontal-hoops`}
          x="0"
          y="0"
          width="200"
          height="50"
          patternUnits="userSpaceOnUse"
        >
          <rect width="200" height="50" fill={primaryColor} />
          <rect x="0" y="0" width="200" height="25" fill={secondaryColor} />
        </pattern>

        <pattern
          id={`${patternId}-half`}
          x="0"
          y="0"
          width="200"
          height="300"
          patternUnits="userSpaceOnUse"
        >
          <rect width="100" height="300" fill={primaryColor} />
          <rect x="100" y="0" width="100" height="300" fill={secondaryColor} />
        </pattern>

        <pattern
          id={`${patternId}-diagonal`}
          x="0"
          y="0"
          width="60"
          height="60"
          patternUnits="userSpaceOnUse"
        >
          <rect width="60" height="60" fill={primaryColor} />
          <polygon points="0,0 60,0 0,60" fill={secondaryColor} />
          <polygon points="60,60 60,0 0,60" fill={secondaryColor} />
        </pattern>

        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={primaryColor} />
          <stop offset="50%" stopColor={secondaryColor} />
          <stop offset="100%" stopColor={tertiaryColor} />
        </linearGradient>

        <pattern
          id={`${patternId}-camo`}
          x="0"
          y="0"
          width="80"
          height="80"
          patternUnits="userSpaceOnUse"
        >
          <rect width="80" height="80" fill={primaryColor} />
          <circle cx="20" cy="20" r="15" fill={secondaryColor} opacity="0.7" />
          <circle cx="50" cy="50" r="20" fill={secondaryColor} opacity="0.5" />
          <circle cx="70" cy="30" r="18" fill={tertiaryColor} opacity="0.6" />
        </pattern>

        <pattern
          id={`${patternId}-mesh`}
          x="0"
          y="0"
          width="20"
          height="20"
          patternUnits="userSpaceOnUse"
        >
          <rect width="20" height="20" fill={primaryColor} />
          <rect x="0" y="0" width="20" height="20" fill="none" stroke={secondaryColor} strokeWidth="1" />
        </pattern>
      </defs>

      {/* Fundo */}
      <rect width="200" height="300" fill="#f5f5f5" />

      {/* Corpo da camiseta com padrão */}
      <rect
        x="40"
        y="60"
        width="120"
        height="140"
        rx="15"
        fill={`url(#${patternId}-${PatternDefs[pattern]})`}
      />

      {/* Mangas esquerda */}
      <ellipse cx="35" cy="85" rx="18" ry="30" fill={`url(#${patternId}-${PatternDefs[pattern]})`} />

      {/* Mangas direita */}
      <ellipse cx="165" cy="85" rx="18" ry="30" fill={`url(#${patternId}-${PatternDefs[pattern]})`} />

      {/* Gola */}
      <ellipse cx="100" cy="60" rx="30" ry="18" fill={tertiaryColor} />

      {/* Logo/Escudo (se fornecido) */}
      {logoUrl && (
        <image
          x="85"
          y="95"
          width="30"
          height="30"
          href={logoUrl}
          preserveAspectRatio="xMidYMid slice"
          opacity="0.9"
        />
      )}

      {/* Número na camiseta (opcional visual) */}
      <text
        x="100"
        y="180"
        fontSize="24"
        fontWeight="bold"
        fill={secondaryColor === primaryColor ? tertiaryColor : secondaryColor}
        textAnchor="middle"
        opacity="0.3"
      >
        10
      </text>

      {/* Bordas e detalhes */}
      <rect
        x="40"
        y="60"
        width="120"
        height="140"
        rx="15"
        fill="none"
        stroke="#e0e0e0"
        strokeWidth="1"
      />
    </svg>
  );
}
