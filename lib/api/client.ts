import { notifyTenantLock } from "@/lib/tenant-lock";

const BACKEND_URL =
  process.env.ACADEMIC_API_URL || process.env.NEXT_PUBLIC_API_URL || "https://schoolbackend-7n8a.onrender.com/api";

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

function parseBody(text: string): unknown {
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const body = text ? parseBody(text) : undefined;
  if (!response.ok) {
    const message =
      typeof body === "object" && body && "message" in body
        ? String((body as { message: unknown }).message)
        : `Request failed with status ${response.status}`;
    notifyTenantLock(body);
    throw new ApiError(message, response.status, body);
  }
  return body as T;
}

/**
 * Server components call the backend directly with the session cookies;
 * the browser goes through the same-origin /api/backend proxy, which
 * attaches the session to the upstream request.
 */
export async function academicApiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");

  if (typeof window === "undefined") {
    // Imported here so the browser bundle never pulls the server-only API.
    const { cookies } = await import("next/headers");
    const store = await cookies();
    const token = store.get("ac_token")?.value;
    const tenantId = store.get("ac_tenant")?.value;
    if (!token || !tenantId) throw new ApiError("Not authenticated", 401);
    headers.set("Authorization", `Bearer ${token}`);
    headers.set("X-Tenant-Id", tenantId);
    const response = await fetch(`${BACKEND_URL}${path}`, { ...init, headers, cache: "no-store" });
    return parseResponse<T>(response);
  }

  const response = await fetch(`/api/backend${path}`, { ...init, headers, credentials: "include", cache: "no-store" });
  if (response.status === 401 && window.location.pathname !== "/login") {
    window.location.assign("/login");
    throw new ApiError("Session expired â€” please sign in again", 401);
  }
  return parseResponse<T>(response);
}
