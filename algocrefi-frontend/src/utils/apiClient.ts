const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
  "https://algocrefi-backend.onrender.com";

const SESSION_KEYS = ["algocrefi_token", "algocrefi_wallet", "algocrefi_wallet_type"] as const;

type ApiRequestOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean;
};

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function clearSession() {
  if (typeof window === "undefined") return;

  SESSION_KEYS.forEach((key) => localStorage.removeItem(key));
  window.location.href = "/";
}

function extractErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;

  const data = payload as { error?: unknown; message?: unknown };
  if (typeof data.error === "string" && data.error.trim()) return data.error;
  if (typeof data.message === "string" && data.message.trim()) return data.message;

  return fallback;
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (auth && typeof window !== "undefined") {
    const token = localStorage.getItem("algocrefi_token");
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  let payload: unknown = null;
  const raw = await response.text();
  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = { message: raw };
    }
  }

  if (response.status === 401) {
    const message = extractErrorMessage(payload, "Unauthorized");
    clearSession();
    throw new ApiError(401, message);
  }

  if (!response.ok) {
    const message = extractErrorMessage(payload, `Request failed with status ${response.status}`);
    throw new ApiError(response.status, message);
  }

  return (payload ?? {}) as T;
}
