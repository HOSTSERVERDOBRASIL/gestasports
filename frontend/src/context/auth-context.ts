import { createContext } from "react";
import type { AuthUser } from "../types/domain";
import type { UserRole } from "../types/domain";

export type AuthContextValue = {
  user: AuthUser | null;
  activeRole: UserRole | null;
  loading: boolean;
  isAuthenticated: boolean;
  setActiveRole: (role: UserRole) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
