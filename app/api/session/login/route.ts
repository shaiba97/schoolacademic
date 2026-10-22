import { NextResponse } from "next/server";
import { academicApiUrl, COOKIE_MAX_AGE } from "@/lib/api/session";

type Membership = {
  tenantId: string;
  status: string;
  tenant: { id: string; name: string };
  roles: Array<{ slug: string }>;
};

type LoginResponse = {
  accessToken: string;
  memberships: Membership[];
};

/**
 * The portals the Academic Affairs workspace opens on. ACADEMIC_ADMIN is
 * the role the ACADEMIC_AFFAIRS position maps to; ADMIN usually carries
 * the module too; custom roles the tenant names after their own position
 * are honoured with the school's own CUSTOM_ prefix.
 */
const ACADEMIC_ROLES = ["ADMIN", "ACADEMIC_ADMIN", "CUSTOM_ACADEMIC_ADMIN"];

const SESSION_COOKIE_OPTIONS = (_name: string, value: string, secure: boolean) => {
  return [
    {
      name: _name,
      value: encodeURIComponent(value),
      httpOnly: true,
      sameSite: "lax" as const,
      secure,
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    },
  ];
};

/**
 * The Secure flag is only honoured by a browser over HTTPS. Marking the
 * cookie Secure while the portal is served over plain http (a school on the
 * LAN address, for instance) makes the browser drop it silently, so the
 * session never sticks and every request comes back 401. The flag therefore
 * follows the protocol the request actually arrived on.
 */
function requestIsSecure(request: Request) {
  const forwarded = request.headers.get("x-forwarded-proto");
  if (forwarded) return forwarded.split(",")[0].trim() === "https";
  const url = request.headers.get("host");
  return request.url.startsWith("https://") || !url;
}

export async function POST(request: Request) {
  let body: { staffNumber?: string; password?: string; tenantId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  // Academic Affairs staff sign in with their staff number (26ACD0001) and
  // their password. No email: the staff number is the identity the school
  // issued, and it is unique across the platform.
  const staffNumber = body.staffNumber?.trim() ?? "";
  const password = body.password ?? "";
  if (!staffNumber || !password) {
    return NextResponse.json(
      { message: "Staff ID and password are required" },
      { status: 400 },
    );
  }

  const payload: Record<string, string> = { staffNumber, password };
  if (body.tenantId) payload.tenantId = body.tenantId;

  let upstream: Response;
  try {
    upstream = await fetch(academicApiUrl("/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ message: "Academic API is unavailable" }, { status: 502 });
  }
  if (!upstream.ok) {
    const data = (await upstream.json().catch(() => undefined)) as { message?: unknown } | undefined;
    const message =
      typeof data === "object" && data && "message" in data
        ? String((data as { message: unknown }).message)
        : "Sign in failed";
    return NextResponse.json({ message }, { status: upstream.status });
  }

  const data = (await upstream.json()) as LoginResponse;
  const academicMemberships = (data.memberships ?? []).filter(
    (membership) =>
      membership.status === "ACTIVE" &&
      membership.roles.some((role) => ACADEMIC_ROLES.includes(role.slug)),
  );
  if (academicMemberships.length === 0) {
    return NextResponse.json(
      { message: "This account has no Academic Affairs access" },
      { status: 403 },
    );
  }
  if (academicMemberships.length > 1 && !body.tenantId) {
    return NextResponse.json(
      {
        message: "Select your school",
        tenants: academicMemberships.map((membership) => ({
          id: membership.tenantId,
          name: membership.tenant.name,
        })),
      },
      { status: 409 },
    );
  }
  const membership =
    academicMemberships.find((entry) => entry.tenantId === body.tenantId) ?? academicMemberships[0];

  const response = NextResponse.json({
    ok: true,
    tenant: { id: membership.tenantId, name: membership.tenant.name },
    roles: membership.roles.map((role) => role.slug),
  });
  const secure = requestIsSecure(request);
  for (const cookie of [
    ...SESSION_COOKIE_OPTIONS("ac_token", data.accessToken, secure),
    ...SESSION_COOKIE_OPTIONS("ac_tenant", membership.tenantId, secure),
  ]) {
    response.cookies.set(cookie);
  }
  return response;
}
