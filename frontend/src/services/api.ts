import { getTenantSlugFromPath, getWorkspaceStorageKey } from "../utils/tenantPath";

const API_PREFIX = "/api";
const TOKEN_KEY_PREFIX = "gestasports-token";
const API_TIMEOUT_MS = 30000;

type RequestInitExt = RequestInit & {
  skipAuth?: boolean;
};

export class ApiError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status: number, details: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export function getToken() {
  return localStorage.getItem(`${TOKEN_KEY_PREFIX}:${getWorkspaceStorageKey()}`);
}

export function setToken(token: string) {
  localStorage.setItem(`${TOKEN_KEY_PREFIX}:${getWorkspaceStorageKey()}`, token);
}

export function clearToken() {
  localStorage.removeItem(`${TOKEN_KEY_PREFIX}:${getWorkspaceStorageKey()}`);
}

async function parseResponsePayload(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return text ? { message: text } : null;
}

export async function apiRequest<T>(path: string, init: RequestInitExt = {}): Promise<T> {
  const { skipAuth, ...options } = init;
  const token = getToken();
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const headers: Record<string, string> = {
      ...(!skipAuth && token ? { Authorization: `Bearer ${token}` } : {}),
      ...((options.headers as Record<string, string> | undefined) ?? {})
    };
    const tenantSlug = getTenantSlugFromPath();
    if (tenantSlug) {
      headers["X-Tenant-Slug"] = tenantSlug;
    }

    const hasBody = options.body !== undefined && options.body !== null;
    if (hasBody && !Object.keys(headers).some((key) => key.toLowerCase() === "content-type")) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(`${API_PREFIX}${path}`, {
      ...options,
      signal: controller.signal,
      headers
    });

    if (!response.ok) {
      const payload = await parseResponsePayload(response).catch(() => null);
      const message =
        typeof payload === "object" && payload !== null && "message" in payload && typeof payload.message === "string"
          ? payload.message
          : "Erro inesperado na API";
      throw new ApiError(message, response.status, payload);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const contentLength = response.headers.get("content-length");
    if (contentLength === "0") {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("Tempo limite da requisição excedido", 408, null);
    }

    throw new ApiError("Falha de conexão com o servidor", 0, error);
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function apiDownload(path: string): Promise<Blob> {
  const token = getToken();
  const tenantSlug = getTenantSlugFromPath();

  const response = await fetch(`${API_PREFIX}${path}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(tenantSlug ? { "X-Tenant-Slug": tenantSlug } : {})
    }
  });

  if (!response.ok) {
    throw new Error("Falha ao baixar arquivo");
  }

  return response.blob();
}

