type StatusBadgeProps = {
  label: string;
  variant: "success" | "warning" | "danger" | "neutral" | "info";
  size?: "sm" | "md";
};

const variantClass: Record<StatusBadgeProps["variant"], string> = {
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  danger: "bg-red-50 text-red-700 border-red-200",
  neutral: "bg-slate-100 text-slate-600 border-slate-200",
  info: "bg-blue-50 text-blue-700 border-blue-200"
};

export function StatusBadge({ label, variant, size = "sm" }: StatusBadgeProps) {
  const sizeClass = size === "md" ? "px-3 py-1 text-xs" : "px-2 py-0.5 text-xs";
  return (
    <span className={`inline-flex items-center rounded-full border font-black ${sizeClass} ${variantClass[variant]}`}>
      {label}
    </span>
  );
}
