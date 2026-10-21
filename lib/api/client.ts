import { notifyTenantLock } from "@/lib/tenant-lock";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID;

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

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!TENANT_ID) throw new ApiError("NEXT_PUBLIC_TENANT_ID is not configured", 500);
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  headers.set("X-Tenant-Id", TENANT_ID);
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const response = await fetch(`${API_URL}${path}`, { ...init, headers, cache: "no-store" });
  const text = await response.text();
  const body = text ? safeJson(text) : undefined;
  if (!response.ok) {
    const message = typeof body === "object" && body && "message" in body ? String((body as { message: unknown }).message) : `Request failed with status ${response.status}`;
    notifyTenantLock(body);    throw new ApiError(message, response.status, body);
  }
  return body as T;
}

export async function academicApiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");

  if (typeof window === "undefined") {
    const { getIncomingAcademicHeaders } = await import("./session");
    const session = await getIncomingAcademicHeaders();
    const tenantId = session.tenantId || TENANT_ID;
    if (!tenantId) throw new ApiError("NEXT_PUBLIC_TENANT_ID is not configured", 500);
    if (session.authorization) headers.set("Authorization", session.authorization);
    headers.set("X-Tenant-Id", tenantId);
    const response = await fetch(`${API_URL}${path}`, { ...init, headers, cache: "no-store" });
    return parseResponse<T>(response);
  }

  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID;
  if (!tenantId) throw new ApiError("NEXT_PUBLIC_TENANT_ID is not configured", 500);
  headers.set("X-Tenant-Id", tenantId);
  const response = await fetch(`/api/backend${path}`, { ...init, headers, credentials: "include", cache: "no-store" });
  return parseResponse<T>(response);
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const body = text ? safeJson(text) : undefined;
  if (!response.ok) {
    const message = typeof body === "object" && body && "message" in body ? String((body as { message: unknown }).message) : `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, body);
  }
  return body as T;
}

function safeJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
