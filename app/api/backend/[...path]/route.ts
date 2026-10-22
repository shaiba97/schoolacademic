import type { NextRequest } from "next/server";
import { academicApiUrl } from "@/lib/api/session";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ path: string[] }> };

function upstreamHeaders(source: Headers) {
  const headers = new Headers();
  const contentType = source.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  const disposition = source.get("content-disposition");
  if (disposition) headers.set("content-disposition", disposition);
  return headers;
}

async function proxy(request: NextRequest, context: RouteContext) {
  const token = request.cookies.get("ac_token")?.value;
  const tenantId = request.cookies.get("ac_tenant")?.value;
  if (!token || !tenantId) {
    return Response.json({ message: "Academic session is missing" }, { status: 401 });
  }

  const { path } = await context.params;
  const target = new URL(academicApiUrl(`/${path.map((segment) => encodeURIComponent(segment)).join("/")}`));
  target.search = request.nextUrl.search;

  const headers = new Headers({
    Accept: request.headers.get("accept") || "application/json",
    Authorization: `Bearer ${token}`,
    "X-Tenant-Id": tenantId,
  });
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);

  const hasBody = !["GET", "HEAD"].includes(request.method);
  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      cache: "no-store",
    });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: upstreamHeaders(upstream.headers),
    });
  } catch {
    return Response.json({ message: "Academic API is unavailable" }, { status: 502 });
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  return proxy(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxy(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return proxy(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return proxy(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return proxy(request, context);
}
