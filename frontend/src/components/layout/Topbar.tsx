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
  if (role === "ATHLETE") return "/minha-conta";
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
    <header className="fl-topbar sticky top-0 z-20 flex min-h-[5.25rem] flex-col gap-3 px-4 py-3 sm:px-5 md:px-6 lg:flex-row lg:items-center lg:justify-between xl:px-8" aria-label={`Página atual: ${title}`}>
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          className="fl-topbar-icon-btn grid size-11 shrink-0 place-items-center rounded-lg border shadow-sm lg:hidden"
          onClick={onMenuClick}
          aria-label="Abrir menu"
        >
          <Menu size={20} />
        </button>
        <div className="min-w-0">
          <h1 className="fl-topbar-title break-words text-2xl font-black leading-tight tracking-normal sm:text-3xl xl:text-[2.1rem]">{title}</h1>
          {subtitle ? <p className="fl-topbar-subtitle hidden truncate text-xs font-semibold sm:block">{subtitle}</p> : null}
        </div>
      </div>

      <div className="grid w-full grid-cols-2 items-center gap-2 md:flex md:w-auto md:flex-wrap md:justify-end md:gap-3">
        {actionLabel && actionPath ? (
          <Link
            to={actionPath}
            className="fl-topbar-primary-action col-span-2 inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-black text-white shadow-sm md:col-span-1"
          >
            <Plus size={16} />
            {actionLabel}
          </Link>
        ) : null}

        {user?.roles && user.roles.length > 1 ? (
          <div className="fl-topbar-control col-span-2 inline-flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-black shadow-sm sm:col-span-1 sm:px-4 md:h-11 md:min-w-[10rem]">
            <UserCog size={16} className={`shrink-0 ${accentText}`} />
            <label className="sr-only" htmlFor="active-role">
              Perfil ativo
            </label>
            <select
              id="active-role"
              className="max-w-[8rem] appearance-none rounded bg-transparent pr-1 font-black outline-none"
              value={activeRole ?? user.role}
              onChange={(event) => onActiveRoleChange(event.target.value as UserRole)}
            >
              {user.roles.map((role) => (
                <option key={role} value={role}>
                  {roleLabels[role]}
                </option>
              ))}
            </select>
            <ChevronDown size={15} className="text-slate-500" />
          </div>
        ) : null}

        <button
          type="button"
          className="fl-topbar-icon-btn relative grid size-10 place-items-center rounded-lg border hover:bg-white/8 md:size-11"
          aria-label="Notificações"
          title={user?.name ?? "Usuário"}
          onClick={onNotificationsClick}
        >
          <Bell size={18} />
          <span className={`absolute right-2 top-2 size-2 rounded-full ${notificationDot} ring-2 ring-white/70`} />
        </button>

        <button
          type="button"
          className="fl-topbar-icon-btn grid size-10 place-items-center rounded-lg border hover:bg-white/8 md:size-11"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}
          title={theme === "dark" ? "Tema escuro" : "Tema claro"}
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div className="relative col-span-2 sm:col-span-2 md:col-span-1">
          <button
            type="button"
            className="fl-topbar-control inline-flex h-12 w-full min-w-0 items-center gap-3 rounded-lg border px-3 text-left shadow-sm transition hover:bg-white/8 md:min-w-[14rem]"
            aria-label="Abrir menu da conta"
            aria-expanded={profileOpen}
            onClick={() => setProfileOpen((current) => !current)}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-red-600 text-xs font-black text-white">{initials}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-black leading-tight text-slate-950">{userTitle}</span>
              <span className="block truncate text-xs font-semibold text-slate-500">{userSubtitle}</span>
            </span>
            <ChevronDown size={15} className={`shrink-0 text-slate-500 transition ${profileOpen ? "rotate-180" : ""}`} />
          </button>

          {profileOpen ? (
            <div className="absolute right-0 top-[calc(100%+0.5rem)] z-30 w-full min-w-[15rem] rounded-lg border border-slate-200 bg-white p-2 shadow-xl">
              <div className="rounded-md bg-slate-100 px-3 py-2">
                <p className="truncate text-sm font-black text-slate-950">{user?.name ?? "Admin GestaSports"}</p>
                <p className="truncate text-xs font-semibold text-slate-500">{user?.email ?? "-"}</p>
                <p className="mt-1 text-[10px] font-black uppercase tracking-[0.08em] text-red-600">{userSubtitle}</p>
              </div>
              <Link
                to={profilePathForRole(activeRole ?? user?.role)}
                onClick={() => setProfileOpen(false)}
                className="mt-2 flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-black text-slate-700 hover:bg-slate-100"
              >
                <UserCircle2 size={16} />
                Ver perfil
              </Link>
              <button
                type="button"
                className="mt-1 flex min-h-10 w-full items-center gap-2 rounded-md bg-red-600 px-3 text-left text-sm font-black text-white hover:bg-red-700"
                onClick={() => {
                  setProfileOpen(false);
                  onLogout();
                }}
              >
                <LogOut size={16} />
                Sair
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
