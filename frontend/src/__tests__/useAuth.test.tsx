import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { AuthProvider } from "../context/AuthContext";
import { useAuth } from "../hooks/useAuth";
import { getToken } from "../services/api";

const { apiRequestMock } = vi.hoisted(() => ({ apiRequestMock: vi.fn() }));

vi.mock("../services/api", async () => {
  const actual = await vi.importActual<typeof import("../services/api")>("../services/api");
  return { ...actual, apiRequest: apiRequestMock };
});

function fakeJwt(expiresInSeconds: number) {
  const header = btoa(JSON.stringify({ alg: "none" }));
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + expiresInSeconds }));
  return `${header}.${payload}.signature`;
}

const authUser = {
  id: "user-1",
  tenantId: "tenant-1",
  tenantName: "Clube Teste",
  tenantStatus: "ACTIVE" as const,
  tenantSuspendedReason: null,
  enabledModules: [],
  name: "Fulano",
  email: "fulano@teste.local",
  role: "ADMIN" as const,
  roles: ["ADMIN" as const]
};

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe("useAuth", () => {
  beforeEach(() => {
    localStorage.clear();
    apiRequestMock.mockReset();
  });

  afterEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  it("persists the token and user after a successful login", async () => {
    apiRequestMock.mockResolvedValueOnce({ token: fakeJwt(12 * 60 * 60), user: authUser });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login("fulano@teste.local", "senha-correta");
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.email).toBe("fulano@teste.local");
    expect(getToken()).toBeTruthy();
  });

  it("clears the token and user on logout", async () => {
    apiRequestMock.mockResolvedValueOnce({ token: fakeJwt(12 * 60 * 60), user: authUser });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login("fulano@teste.local", "senha-correta");
    });
    expect(result.current.isAuthenticated).toBe(true);

    act(() => {
      result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(getToken()).toBeNull();
  });

  it("switches the active role among the user's granted roles", async () => {
    apiRequestMock.mockResolvedValueOnce({
      token: fakeJwt(12 * 60 * 60),
      user: { ...authUser, role: "ADMIN", roles: ["ADMIN", "FINANCIAL"] }
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login("fulano@teste.local", "senha-correta");
    });
    expect(result.current.activeRole).toBe("ADMIN");

    act(() => {
      result.current.setActiveRole("FINANCIAL");
    });
    expect(result.current.activeRole).toBe("FINANCIAL");

    act(() => {
      // A role the user doesn't hold must be ignored — no privilege escalation from the client.
      result.current.setActiveRole("SUPERADMIN");
    });
    expect(result.current.activeRole).toBe("FINANCIAL");
  });

  it("flags the session as expiring soon once under 5 minutes remain", async () => {
    vi.useFakeTimers();
    apiRequestMock.mockResolvedValueOnce({ token: fakeJwt(6 * 60), user: authUser });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login("fulano@teste.local", "senha-correta");
    });
    expect(result.current.sessionExpiringSoon).toBe(false);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(61 * 1000);
    });
    expect(result.current.sessionExpiringSoon).toBe(true);

  });

  it("skips restoring a session with no persisted token", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);
    expect(apiRequestMock).not.toHaveBeenCalled();
  });
});
