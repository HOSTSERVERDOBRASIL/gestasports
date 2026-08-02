import type { CSSProperties } from "react";

export const chartSeriesColors = {
  primary: "var(--brand-primary)",
  accent: "var(--brand-accent)",
  secondary: "var(--brand-secondary)",
  success: "#16a34a",
  warning: "#f59e0b",
  danger: "#dc2626",
  neutral: "var(--muted)"
} as const;

export const chartCategoricalPalette = [
  "var(--brand-accent)",
  "var(--brand-primary)",
  "var(--brand-secondary)",
  "#16a34a",
  "#f59e0b",
  "#dc2626",
  "#64748b"
] as const;

export const chartGridStroke = "var(--border-soft)";

export const chartAxisTick = {
  fill: "var(--muted)",
  fontSize: 11,
  fontWeight: 800
} as const;

export const chartSmallAxisTick = {
  fill: "var(--muted)",
  fontSize: 10,
  fontWeight: 700
} as const;

export const chartTooltipStyle: CSSProperties = {
  borderRadius: 10,
  border: "1px solid var(--border-soft)",
  backgroundColor: "var(--surface-1)",
  color: "var(--shell-text)",
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.14)"
};

export const chartTooltipItemStyle: CSSProperties = {
  color: "var(--shell-text)"
};

export const chartTooltipLabelStyle: CSSProperties = {
  color: "var(--muted)",
  fontWeight: 800
};

export const chartTooltipProps = {
  contentStyle: chartTooltipStyle,
  itemStyle: chartTooltipItemStyle,
  labelStyle: chartTooltipLabelStyle
} as const;
