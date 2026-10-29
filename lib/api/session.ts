/**
 * Server-only session helpers. Importing this module pulls in next/headers,
 * so it must never reach a client component â€” the browser path lives in
 * lib/api/client.ts and the same-origin proxy in app/api/backend.
 */
import { cookies } from "next/headers";

const API_URL =
  process.env.ACADEMIC_API_URL || process.env.NEXT_PUBLIC_API_URL || "https://schoolbackend-7n8a.onrender.com/api";

const TOKEN_COOKIE = "ac_token";
const TENANT_COOKIE = "ac_tenant";

export const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export function academicApiUrl(path: string) {
  return `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function getSession(): Promise<{ token?: string; tenantId?: string }> {
  const store = await cookies();
  return {
    token: store.get(TOKEN_COOKIE)?.value,
    tenantId: store.get(TENANT_COOKIE)?.value,
  };
}

export async function setSession(token: string, tenantId: string) {
  const store = await cookies();
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  };
  store.set(TOKEN_COOKIE, token, options);
  store.set(TENANT_COOKIE, tenantId, options);
}

export async function clearSession() {
  const store = await cookies();
  store.delete(TOKEN_COOKIE);
  store.delete(TENANT_COOKIE);
}
