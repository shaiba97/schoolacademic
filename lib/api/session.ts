const API_URL = process.env.ACADEMIC_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

export const ACADEMIC_AUTH_HEADER = "authorization";
export const ACADEMIC_TENANT_HEADER = "x-tenant-id";

export class AcademicSessionError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AcademicSessionError";
    this.status = status;
  }
}

const NO_SESSION = process.env.ACADEMIC_NO_AUTH === "true";

export function academicRequestHeaders(source: Headers) {
  const authorization = source.get(ACADEMIC_AUTH_HEADER);
  const tenantId = source.get(ACADEMIC_TENANT_HEADER);

  if (NO_SESSION) {
    return {
      authorization: authorization || "",
      tenantId: tenantId || process.env.NEXT_PUBLIC_TENANT_ID || "",
    };
  }
  if (!authorization) throw new AcademicSessionError("Academic session is missing", 401);
  if (!tenantId) throw new AcademicSessionError("Academic tenant is missing", 403);
  return { authorization, tenantId };
}

export async function getIncomingAcademicHeaders() {
  const { headers } = await import("next/headers");
  return academicRequestHeaders(await headers());
}

export function academicApiUrl(path: string) {
  return `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
