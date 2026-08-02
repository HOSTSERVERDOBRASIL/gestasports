import { Bell, ChevronDown, LogOut, Menu, Moon, Plus, Sun, UserCircle2, UserCog } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import type { AuthUser, UserRole } from "../../types/domain";
import { useTheme } from "../../hooks/useTheme";

const roleLabels: Record<UserRole, string> = {
  SUPERADMIN: "Superadmin",
  ADMIN: "Gestor do grupo",
  SPORTS_DIRECTOR: "Diretor de esportes",
  ASSOCIATE: "Associado",
  ATHLETE: "Atleta",
  FINANCIAL: "Financeiro"
};

function profilePathForRole(role: UserRole | null | undefined) {
  if (role === "SUPERADMIN") return "/superadmin";
  if (role === "ATHLETE") return "/atleta";
  if (role === "SPORTS_DIRECTOR") return "/esportes";
  if (role === "ASSOCIATE") return "/associado";
  if (role === "FINANCIAL") return "/financeiro?area=DASHBOARD";
  return "/";
}

type TopbarProps = {
  title: string;
  subtitle: string;
  onNotificationsClick: () => void;
  onMenuClick: () => void;
  user: AuthUser | null;
  activeRole: UserRole | null;
  onActiveRoleChange: (role: UserRole) => void;
  onLogout: () => void;
  actionLabel?: string;
  actionPath?: string;
};

export function Topbar({
  title,
  subtitle,
  onNotificationsClick,
  onMenuClick,
  user,
  activeRole,
  onActiveRoleChange,
  onLogout,
  actionLabel,
  actionPath
}: TopbarProps) {
  const { theme, toggleTheme } = useTheme();
  const [profileOpen, setProfileOpen] = useState(false);
  const accentText = "fl-brand-accent-text";
  const notificationDot = "fl-brand-accent-bg";
  const initials = (user?.name ?? "Admin GestaSports")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "AF";
  const userTitle = user?.tenantName ?? "GestaSports";
  const userSubtitle = activeRole ? roleLabels[activeRole] : user?.role ? roleLabels[user.role] : "Gestor do grupo";

  return (
    <header
      className="fl-topbar sticky top-0 z-20 flex min-h-17 items-center gap-3 px-4 sm:px-5 md:px-6 xl:px-8"
      aria-label={`Página atual: ${title}`}
    >
      {/* Mobile menu trigger */}
      <button
        type="button"
        className="fl-topbar-icon-btn grid size-10 shrink-0 place-items-center rounded-lg border lg:hidden"
        onClick={onMenuClick}
        aria-label="Abrir menu"
      >
        <Menu size={18} />
      </button>

      {/* Page title / subtitle */}
      <div className="min-w-0 flex-1">
        <h1 className="fl-topbar-title truncate font-black leading-tight">{title}</h1>
        {subtitle ? (
          <p className="fl-topbar-subtitle hidden truncate sm:block">{subtitle}</p>
        ) : null}
      </div>

      {/* Right side controls */}
      <div className="flex shrink-0 items-center gap-2">
        {/* Role switcher */}
        {user?.roles && user.roles.length > 1 ? (
          <div className="fl-topbar-control hidden items-center gap-1.5 rounded-lg border px-3 text-xs font-black sm:inline-flex" style={{ height: "2.375rem" }}>
            <UserCog size={14} className={`shrink-0 ${accentText}`} />
            <label className="sr-only" htmlFor="active-role">Perfil ativo</label>
            <select
              id="active-role"
              className="max-w-[8rem] appearance-none rounded bg-transparent pr-1 font-black outline-none"
              value={activeRole ?? user.role}
              onChange={(event) => onActiveRoleChange(event.target.value as UserRole)}
            >
              {user.roles.map((role) => (
                <option key={role} value={role}>{roleLabels[role]}</option>
              ))}
            </select>
            <ChevronDown size={13} className="text-slate-500" />
          </div>
        ) : null}

        {/* Notifications */}
        <button
          type="button"
          className="fl-topbar-icon-btn relative grid size-10 place-items-center rounded-lg border"
          aria-label="Notificações"
          onClick={onNotificationsClick}
        >
          <Bell size={17} />
          <span className={`absolute right-2 top-2 size-2 rounded-full ${notificationDot} ring-2 ring-[var(--shell-elevated)]`} />
        </button>

        {/* Theme toggle */}
        <button
          type="button"
          className="fl-topbar-icon-btn hidden size-10 place-items-center rounded-lg border sm:grid"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}
        >
          {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        {/* CTA action button */}
        {actionLabel && actionPath ? (
          <Link
            to={actionPath}
            className="fl-topbar-cta"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span className="hidden sm:inline">{actionLabel}</span>
            <span className="sm:hidden">Novo</span>
          </Link>
        ) : null}

        {/* User profile dropdown */}
        <div className="relative">
          <button
            type="button"
            className="fl-topbar-control inline-flex h-10 items-center gap-2 rounded-lg border px-2.5 transition"
            aria-label="Abrir menu da conta"
            aria-expanded={profileOpen}
            onClick={() => setProfileOpen((current) => !current)}
          >
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--brand-primary)] text-[0.65rem] font-black text-white">{initials}</span>
            <span className="hidden min-w-0 md:block">
              <span className="block max-w-[8rem] truncate text-xs font-black leading-tight">{userTitle}</span>
              <span className="block max-w-[8rem] truncate text-[0.65rem] font-semibold text-slate-500">{userSubtitle}</span>
            </span>
            <ChevronDown size={13} className={`shrink-0 text-slate-400 transition ${profileOpen ? "rotate-180" : ""}`} />
          </button>

          {profileOpen ? (
            <div className="absolute right-0 top-[calc(100%+0.375rem)] z-30 min-w-[14rem] rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-white/10 dark:bg-slate-900">
              <div className="mb-1 rounded-lg bg-slate-50 px-3 py-2.5 dark:bg-white/[0.05]">
                <p className="truncate text-sm font-black text-slate-900 dark:text-white">{user?.name ?? "Admin GestaSports"}</p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.email ?? "-"}</p>
                <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-[var(--brand-primary)]">{userSubtitle}</p>
              </div>
              <Link
                to={profilePathForRole(activeRole ?? user?.role)}
                onClick={() => setProfileOpen(false)}
                className="flex min-h-9 items-center gap-2 rounded-lg px-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/8"
              >
                <UserCircle2 size={15} />
                Ver perfil
              </Link>
              <button
                type="button"
                className="mt-1 flex min-h-9 w-full items-center gap-2 rounded-lg bg-[var(--brand-primary)] px-3 text-left text-sm font-black text-white transition hover:opacity-90"
                onClick={() => { setProfileOpen(false); onLogout(); }}
              >
                <LogOut size={15} />
                Sair
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
