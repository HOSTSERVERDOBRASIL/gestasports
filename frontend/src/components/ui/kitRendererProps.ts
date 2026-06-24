import { parseTeamKit, type TeamKit } from "../../utils/teamColors";

type KitStripe = {
  direction?: "vertical" | "horizontal" | "diagonal";
  colors: string[];
  width?: number;
};

function safeColor(value: string | null | undefined, fallback: string) {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value.trim()) ? value.trim() : fallback;
}

function stripeFromKit(kit: TeamKit): KitStripe | null {
  const colors = [kit.accent, kit.tertiary, kit.quaternary].filter((color, index, list) => {
    const safe = safeColor(color, "");
    return safe && safe.toLowerCase() !== kit.primary.toLowerCase() && list.indexOf(color) === index;
  });

  if (kit.style === "SOLID" || kit.colorCount === "ONE" || colors.length === 0) return null;

  if (kit.style === "HOOPS" || kit.style === "HORIZONTAL_CLASSIC" || kit.style === "SOUND_WAVE") {
    return { direction: "horizontal", colors: [kit.primary, colors[0]], width: kit.style === "HOOPS" ? 16 : 10 };
  }

  if (kit.style === "DIAGONAL_ELITE" || kit.style === "SINGLE_BAND") {
    const direction = kit.shirtStyleDirection === "DIAGONAL_RIGHT" ? "diagonal" : kit.shirtStyleDirection === "HORIZONTAL" ? "horizontal" : "diagonal";
    return { direction, colors: colors.slice(0, 2), width: 18 };
  }

  if (kit.style === "HALF_AND_HALF") {
    return { direction: "vertical", colors: [kit.accent], width: 48 };
  }

  return { direction: "vertical", colors: colors.slice(0, kit.centerBarsVariant === "TRIPLE" ? 3 : 2), width: kit.style === "STRIPED_THIN" ? 8 : kit.style === "STRIPED_THICK" ? 22 : 14 };
}

export function kitRendererPropsFromKit(kitSource: string | null | undefined, fallbackColor = "#ffffff") {
  const kit = parseTeamKit(kitSource, fallbackColor);
  return {
    baseColor: kit.primary || fallbackColor,
    sleeveColor: kit.sleeveMode === "COLORED" || kit.sleeveMode === "RAGLAN" ? kit.sleeveColor : kit.primary,
    collarColor: kit.collarColor || "#111111",
    stripes: stripeFromKit(kit),
    sponsors: {
      front: kit.sponsorFront,
      back: kit.sponsorBack,
      sleeve: kit.sponsorSleeve
    },
    numberColor: kit.numberColor
  };
}
