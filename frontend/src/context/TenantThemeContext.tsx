import { createContext, useContext, useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../hooks/useAuth";
import { apiRequest } from "../services/api";
import type { CurrentTenant, TenantBrandingSettings } from "../types/domain";
import { applyTenantBranding } from "../utils/applyTenantBranding";

type TenantThemeSource = Partial<CurrentTenant & TenantBrandingSettings>;

export type TenantTheme = {
  tenantId: string | null;
  name: string;
  brandName: string;
  primaryColor: string;
  secondaryColor: string;
  sidebarColor: string;
  accentColor: string;
  logoUrl: string | null;
  borderRadius: string;
  fontFamily: string;
  menuStyle: "brand" | "light" | "glass";
  interfaceEffects: "full" | "soft" | "minimal";
  isLoading: boolean;
};

const FALLBACK_THEME: TenantTheme = {
  tenantId: null,
  name: "GestaSports",
  brandName: "GestaSports",
  primaryColor: "#08255b",
  secondaryColor: "#08255b",
  sidebarColor: "#08255b",
  accentColor: "#55ad32",
  logoUrl: null,
  borderRadius: "1.15rem",
  fontFamily: '"Sora", "Segoe UI", sans-serif',
  menuStyle: "brand",
  interfaceEffects: "soft",
  isLoading: false
};

const TenantThemeContext = createContext<TenantTheme>(FALLBACK_THEME);

function normalizeTheme(source: TenantThemeSource | null | undefined, isLoading: boolean): TenantTheme {
  return {
    ...FALLBACK_THEME,
    tenantId: source?.id ?? null,
    name: source?.name?.trim() || FALLBACK_THEME.name,
    brandName: source?.brandName?.trim() || source?.name?.trim() || FALLBACK_THEME.brandName,
    primaryColor: source?.primaryColor?.trim() || FALLBACK_THEME.primaryColor,
    secondaryColor: source?.secondaryColor?.trim() || FALLBACK_THEME.secondaryColor,
    sidebarColor: source?.secondaryColor?.trim() || FALLBACK_THEME.sidebarColor,
    accentColor: source?.accentColor?.trim() || FALLBACK_THEME.accentColor,
    logoUrl: source?.logoUrl ?? null,
    menuStyle: source?.menuStyle ?? FALLBACK_THEME.menuStyle,
    interfaceEffects: source?.interfaceEffects ?? FALLBACK_THEME.interfaceEffects,
    isLoading
  };
}

export function TenantThemeProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user, activeRole } = useAuth();
  const currentTenantQuery = useQuery({
    queryKey: ["tenant-theme-current", user?.tenantId ?? "public"],
    queryFn: () => apiRequest<CurrentTenant>("/tenant/current", { skipAuth: true }),
    retry: false
  });
  const brandingQuery = useQuery({
    queryKey: ["tenant-theme-branding", user?.tenantId],
    queryFn: () => apiRequest<TenantBrandingSettings>("/tenant/branding"),
    enabled: Boolean(isAuthenticated && user?.tenantId && activeRole === "ADMIN"),
    retry: false
  });

  const theme = useMemo(
    () => normalizeTheme(brandingQuery.data ?? currentTenantQuery.data, currentTenantQuery.isLoading || brandingQuery.isLoading),
    [brandingQuery.data, brandingQuery.isLoading, currentTenantQuery.data, currentTenantQuery.isLoading]
  );

  useEffect(() => {
    applyTenantBranding({
      primaryColor: theme.primaryColor,
      secondaryColor: theme.sidebarColor,
      accentColor: theme.accentColor
    });

    const root = document.documentElement;
    root.style.setProperty("--brand-secondary", theme.secondaryColor);
    root.style.setProperty("--brand-radius", theme.borderRadius);
    root.style.setProperty("--brand-font", theme.fontFamily);
    document.body.dataset.menuStyle = theme.menuStyle;
    document.body.dataset.effects = theme.interfaceEffects;
  }, [theme]);

  return <TenantThemeContext.Provider value={theme}>{children}</TenantThemeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTenantTheme() {
  return useContext(TenantThemeContext);
}
