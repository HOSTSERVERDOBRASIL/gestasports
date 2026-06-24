import type { CurrentTenant, TenantBrandingSettings } from "../types/domain";

type BrandingSource = Partial<CurrentTenant & TenantBrandingSettings> | null | undefined;

const DEFAULT_PRIMARY = "#e11d2e";
const DEFAULT_ACCENT = "#22c55e";
const DEFAULT_MENU = "#07111f";

function valueOrDefault(value: string | null | undefined, fallback: string) {
  return value && value.trim() ? value : fallback;
}

export function applyTenantBranding(branding?: BrandingSource) {
  const root = document.documentElement;
  const primary = valueOrDefault(branding?.primaryColor, DEFAULT_PRIMARY);
  const accent = valueOrDefault(branding?.accentColor, DEFAULT_ACCENT);
  const menu = valueOrDefault(branding?.secondaryColor, DEFAULT_MENU);

  root.style.setProperty("--brand-primary", primary);
  root.style.setProperty("--brand-accent", accent);
  root.style.setProperty("--brand-menu", menu);
  root.style.setProperty("--brand-secondary", menu);
  root.style.setProperty("--brand-radius", "1.15rem");
  root.style.setProperty("--brand-font", '"Sora", "Segoe UI", sans-serif');
  root.style.setProperty("--sidebar-bg", `linear-gradient(180deg, ${menu} 0%, #0b1728 100%)`);
}
