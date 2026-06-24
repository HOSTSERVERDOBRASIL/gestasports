import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { AuthUser, LoginResponse, UserRole } from "../types/domain";
import { apiRequest, clearToken, getToken, setToken } from "../services/api";
import { AuthContext } from "./auth-context";
import { getWorkspaceStorageKey } from "../utils/tenantPath";

const ACTIVE_ROLE_KEY_PREFIX = "gestasports-active-role";

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
      setActiveRole,
      login,
      logout,
      refreshMe
    }),
    [user, activeRole, loading, setActiveRole, login, logout, refreshMe]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
