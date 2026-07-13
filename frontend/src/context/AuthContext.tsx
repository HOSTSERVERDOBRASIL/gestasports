import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { AuthUser, LoginResponse, UserRole } from "../types/domain";
import { apiRequest, clearToken, getToken, setToken } from "../services/api";
import { AuthContext } from "./auth-context";
import { getWorkspaceStorageKey } from "../utils/tenantPath";

const ACTIVE_ROLE_KEY_PREFIX = "gestasports-active-role";
const SESSION_WARNING_MS = 5 * 60 * 1000;

function decodeJwtExpiryMs(token: string): number | null {
  const segments = token.split(".");
  if (segments.length < 2) {
    return null;
  }

  try {
    const payload = JSON.parse(atob(segments[1].replace(/-/g, "+").replace(/_/g, "/"))) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function activeRoleKey() {
  return `${ACTIVE_ROLE_KEY_PREFIX}:${getWorkspaceStorageKey()}`;
}

function getStoredActiveRole() {
  const value = localStorage.getItem(activeRoleKey());
  if (
    value === "SUPERADMIN" ||
    value === "ADMIN" ||
    value === "SPORTS_DIRECTOR" ||
    value === "FINANCIAL" ||
    value === "ASSOCIATE" ||
    value === "ATHLETE"
  ) {
    return value;
  }

  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeRole, setActiveRoleState] = useState<UserRole | null>(getStoredActiveRole);
  const [loading, setLoading] = useState(() => Boolean(getToken()));
  const [sessionExpiringSoon, setSessionExpiringSoon] = useState(false);

  function ensureActiveRole(nextUser: AuthUser | null) {
    if (!nextUser) {
      setActiveRoleState(null);
      localStorage.removeItem(activeRoleKey());
      return;
    }

    const preferred = getStoredActiveRole();
    const fallback = nextUser.role;
    const resolved = preferred && nextUser.roles.includes(preferred) ? preferred : fallback;
    setActiveRoleState(resolved);
    localStorage.setItem(activeRoleKey(), resolved);
  }

  const setActiveRole = useCallback(
    (role: UserRole) => {
      if (!user || !user.roles.includes(role)) {
        return;
      }

      setActiveRoleState(role);
      localStorage.setItem(activeRoleKey(), role);
    },
    [user]
  );

  const refreshMe = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      return;
    }

    const me = await apiRequest<AuthUser>("/auth/me");
    setUser(me);
    ensureActiveRole(me);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await apiRequest<LoginResponse>("/auth/login", {
      method: "POST",
      skipAuth: true,
      body: JSON.stringify({ email, password })
    });

    setToken(response.token);
    setUser(response.user);
    ensureActiveRole(response.user);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    setActiveRoleState(null);
    localStorage.removeItem(activeRoleKey());
  }, []);

  useEffect(() => {
    setSessionExpiringSoon(false);

    if (!user) {
      return;
    }

    const token = getToken();
    const expiryMs = token ? decodeJwtExpiryMs(token) : null;
    if (!expiryMs) {
      return;
    }

    const warnInMs = expiryMs - SESSION_WARNING_MS - Date.now();
    const expireInMs = expiryMs - Date.now();

    const warnTimer = window.setTimeout(() => setSessionExpiringSoon(true), Math.max(0, warnInMs));
    const expireTimer = window.setTimeout(() => {
      logout();
    }, Math.max(0, expireInMs));

    return () => {
      window.clearTimeout(warnTimer);
      window.clearTimeout(expireTimer);
    };
  }, [user, logout]);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      return;
    }

    let active = true;

    async function loadUser() {
      try {
        const me = await apiRequest<AuthUser>("/auth/me");
        if (active) {
          setUser(me);
          ensureActiveRole(me);
        }
      } catch {
        clearToken();
        if (active) {
          setUser(null);
          setActiveRoleState(null);
          localStorage.removeItem(activeRoleKey());
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadUser();

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      activeRole,
      loading,
      isAuthenticated: Boolean(user),
      sessionExpiringSoon,
      setActiveRole,
      login,
      logout,
      refreshMe
    }),
    [user, activeRole, loading, sessionExpiringSoon, setActiveRole, login, logout, refreshMe]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
