import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PanelLeftClose, PanelLeftOpen, Search, X } from "lucide-react";
import { getDefaultFavoritePathsByRoles, getNavigationSectionsByRoles } from "../../data/navigation";
import { useAuth } from "../../hooks/useAuth";
import { apiRequest } from "../../services/api";
import type { CurrentTenant, TenantBrandingSettings } from "../../types/domain";
import { getWorkspaceStorageKey } from "../../utils/tenantPath";

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
};

const NAV_FAVORITES_KEY = "gestasports-sidebar-favorites";

function routeMatches(path: string, locationPath: string, currentPath: string) {
  return path.includes("?") || path.includes("#") ? path === currentPath : path === locationPath;
}

function readSavedFavorites() {
  const raw = localStorage.getItem(NAV_FAVORITES_KEY);
  if (!raw) {
    return [] as string[];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function Sidebar({ collapsed, onToggle, mobileOpen, onCloseMobile }: SidebarProps) {
  const location = useLocation();
  const { user, activeRole } = useAuth();
  const effectiveRoles = activeRole ? [activeRole] : user?.roles ?? [];
  const effectiveModules = user?.enabledModules ?? [];
  const effectiveRole = activeRole ?? user?.role ?? null;
  const tenantQuery = useQuery({
    queryKey: ["tenant-current", getWorkspaceStorageKey()],
    queryFn: () => apiRequest<CurrentTenant>("/tenant/current", { skipAuth: true }),
    retry: false
  });
  const isSuperadmin = effectiveRole === "SUPERADMIN";
  const tenantBrandingQuery = useQuery({
    queryKey: ["tenant-branding", user?.tenantId],
    queryFn: () => apiRequest<TenantBrandingSettings>("/tenant/branding"),
    enabled: Boolean(user?.tenantId && effectiveRole === "ADMIN"),
    retry: false
  });
  const tenant = tenantQuery.data;
  const tenantBranding = tenantBrandingQuery.data;
  const brandLogo = isSuperadmin ? "/brand/gestasports-logo.svg" : tenantBranding?.logoUrl ?? tenant?.logoUrl ?? "/brand/gestasports-logo.svg";
  const brandName = isSuperadmin ? "GestaSports" : tenantBranding?.brandName ?? tenant?.brandName ?? tenant?.name ?? "Clube";
  const activeNavClass = "fl-brand-nav-active";
  const activeSubitemClass = "fl-brand-subitem-active";
  const searchFocusClass = "focus:border-[var(--brand-accent)]";
  const visibleSections = getNavigationSectionsByRoles(effectiveRoles, effectiveModules);
  const visibleItems = visibleSections.flatMap((section) => section.items);
  const [menuSearch, setMenuSearch] = useState("");
  const [favoritePaths] = useState<string[]>(readSavedFavorites);
  const visiblePathSet = new Set(visibleItems.map((item) => item.path));
  const currentPath = `${location.pathname}${location.search}${location.hash}`;
  const filteredFavorites = favoritePaths.filter((path) => visiblePathSet.has(path));
  const effectiveFavorites =
    filteredFavorites.length > 0 ?
       filteredFavorites
      : getDefaultFavoritePathsByRoles(effectiveRoles, effectiveModules).filter((path) => visiblePathSet.has(path));
  const effectiveFavoritesKey = effectiveFavorites.join("|");

  useEffect(() => {
    localStorage.setItem(NAV_FAVORITES_KEY, JSON.stringify(effectiveFavoritesKey ? effectiveFavoritesKey.split("|") : []));
  }, [effectiveFavoritesKey]);

  const filteredSections = visibleSections
    .map((section) => {
      const term = menuSearch.trim().toLowerCase();
      if (!term) {
        return section;
      }

      const sectionMatches = section.label.toLowerCase().includes(term) || (section.hint.toLowerCase().includes(term) ?? false);
      if (sectionMatches) {
        return section;
      }

      const filteredItems = section.items
        .map((item) => {
          const childMatches = item.children?.filter((child) => child.label.toLowerCase().includes(term)) ?? [];
          if (item.label.toLowerCase().includes(term)) {
            return item;
          }
          return childMatches && childMatches.length > 0 ? { ...item, children: childMatches } : null;
        })
        .filter((item): item is (typeof section.items)[number] => Boolean(item));
      return { ...section, items: filteredItems };
    })
    .filter((section) => section.items.length > 0);

  const favoriteItems = visibleItems.filter((item) => effectiveFavorites.includes(item.path));

  return (
    <>
      {mobileOpen ? <div className="fixed inset-0 z-30 bg-slate-950/70 lg:hidden" onClick={onCloseMobile} aria-hidden="true" /> : null}

      <aside
        className={`fl-sidebar-shell fixed inset-y-0 left-0 z-40 h-dvh border-r transition-all duration-300 lg:sticky lg:top-0 lg:z-auto lg:h-dvh ${
          mobileOpen ? "translate-x-0" : "-translate-x-[120%] lg:translate-x-0"
        } w-[min(22rem,100vw)] sm:w-80 ${collapsed ? "lg:w-20" : "lg:w-72"}`}
      >
        <div className="flex h-full min-h-0 flex-col">
          <div className="relative flex flex-col items-center justify-center border-b border-white/10 px-4 py-4 lg:hidden">
            <div className="fl-sidebar-club-logo-frame">
              <img src={brandLogo} alt={brandName} className="fl-sidebar-club-logo" />
            </div>
            <p className="mt-2 max-w-64 truncate text-base font-black text-white">{brandName}</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{isSuperadmin ? "Gestão da plataforma" : "Painel do clube"}</p>
            <button
              type="button"
              onClick={onCloseMobile}
              className="fl-sidebar-close absolute right-4 top-4 grid size-10 place-items-center rounded-lg border border-white/10 text-slate-300 hover:bg-white/8 lg:hidden"
              aria-label="Fechar menu"
            >
              <X size={16} />
            </button>
          </div>

          <div className={`fl-sidebar-logo hidden border-b border-white/10 lg:flex ${collapsed ? "items-center justify-center px-2 py-3" : "flex-col items-center justify-center px-3 py-4"}`}>
            <div className={collapsed ? "fl-sidebar-club-logo-frame fl-sidebar-club-logo-frame-collapsed" : "fl-sidebar-club-logo-frame"}>
              <img src={brandLogo} alt={brandName} className="fl-sidebar-club-logo" />
            </div>
            {!collapsed ? (
              <div className="mt-2 min-w-0 text-center">
                <p className="max-w-60 truncate text-base font-black text-white">{brandName}</p>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{isSuperadmin ? "Gestão da plataforma" : "Painel do clube"}</p>
              </div>
            ) : null}
          </div>

          <nav className="fl-sidebar-nav min-h-0 flex-1 overflow-y-auto px-2 py-3">
            {!collapsed ? (
              <div className="mb-3 px-1">
                <label className="relative block">
                  <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    value={menuSearch}
                    onChange={(event) => setMenuSearch(event.target.value)}
                    placeholder="Buscar menu"
                    className={`fl-sidebar-search h-8 w-full rounded-md border pl-8 pr-2 text-xs font-semibold outline-none ${searchFocusClass}`}
                  />
                </label>
              </div>
            ) : null}

            {!collapsed && favoriteItems.length > 1 ? (
              <div className="mb-3 px-1">
                <div className="fl-sidebar-favorites rounded-lg border border-white/10 bg-white/[0.03] p-1.5">
                  <p className="fl-sidebar-favorites-title px-1 pb-1 text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">Acesso rápido</p>
                  <div className="space-y-0.5">
                    {favoriteItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={`favorite-${item.path}`}
                          to={item.path}
                          end={item.path === "/"}
                          onClick={onCloseMobile}
                          className={() => {
                            const isActive = routeMatches(item.path, location.pathname, currentPath);
                            return (
                            `fl-sidebar-nav-item fl-sidebar-favorite-link flex min-h-8 items-center gap-2 rounded-md px-2 text-xs font-bold transition ${
                              isActive ? `fl-sidebar-nav-active ${activeNavClass}` : "text-slate-400 hover:bg-white/8 hover:text-white"
                            }`
                            );
                          }}
                        >
                          <Icon size={14} strokeWidth={2} />
                          <span className="truncate">{item.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="space-y-0.5">
              {filteredSections.map((section, sectionIndex) => (
                <div key={section.id}>
                  {!collapsed && section.label && filteredSections.length > 1 && sectionIndex > 0 ? (
                    <p className="fl-sidebar-section-label">{section.label}</p>
                  ) : null}
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const hasActiveChild = item.children?.some((child) => routeMatches(child.path, location.pathname, currentPath)) ?? false;
                    const isItemActive = routeMatches(item.path, location.pathname, currentPath);
                    return (
                      <div key={item.path}>
                        <NavLink
                          to={item.path}
                          end={item.path === "/"}
                          onClick={onCloseMobile}
                          className={() =>
                            `fl-sidebar-nav-item relative flex min-h-[2.625rem] items-center gap-3 rounded-lg px-2.5 text-sm font-bold leading-tight transition ${
                              isItemActive || hasActiveChild ? `fl-sidebar-nav-active ${activeNavClass}` : "text-slate-300 hover:bg-white/8 hover:text-white"
                            } ${collapsed ? "lg:justify-center lg:px-0" : ""}`
                          }
                          title={item.label}
                        >
                          <span className={`fl-sidebar-icon grid shrink-0 place-items-center rounded-lg text-current ${collapsed ? "size-10" : "size-8"}`}>
                            <Icon size={collapsed ? 22 : 19} strokeWidth={2} />
                          </span>
                          <span className={collapsed ? "lg:hidden" : ""}>{item.label}</span>
                        </NavLink>
                        {!collapsed && item.children?.length && (menuSearch.trim() || isItemActive || hasActiveChild) ? (
                          <div className="fl-sidebar-submenu">
                            {item.children.map((child) => {
                              const childActive = routeMatches(child.path, location.pathname, currentPath);
                              return (
                                <NavLink
                                  key={`${item.path}-${child.label}`}
                                  to={child.path}
                                  onClick={onCloseMobile}
                                  className={`fl-sidebar-subitem ${
                                    childActive ? `fl-sidebar-subitem-active ${activeSubitemClass}` : "text-slate-500 hover:bg-white/8 hover:text-slate-200"
                                  }`}
                                >
                                  <span className="block min-w-0 truncate">{child.label}</span>
                                </NavLink>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </nav>

          <div className="shrink-0 border-t border-white/10 p-2">
            {!collapsed ? (
              <div className="fl-sidebar-platform-footer mb-2 rounded-lg border border-white/10 px-3 py-3 text-center">
                <img src="/brand/gestasports-logo-transparent.png" alt="GestaSports" className="mx-auto h-7 max-w-28 object-contain" />
                <p className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Todos os direitos reservados</p>
              </div>
            ) : (
              <img src="/brand/gestasports-logo-transparent.png" alt="GestaSports" className="mx-auto mb-2 h-6 w-10 object-contain opacity-70" />
            )}
            <button
              type="button"
              onClick={onToggle}
              className={`hidden min-h-10 w-full items-center rounded-lg border border-white/10 text-slate-300 transition hover:bg-white/8 hover:text-white lg:flex ${collapsed ? "justify-center px-0" : "justify-between px-3"}`}
              aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
              title={collapsed ? "Expandir menu" : "Recolher menu"}
            >
              {!collapsed ? <span className="text-xs font-bold">Recolher menu</span> : null}
              {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
