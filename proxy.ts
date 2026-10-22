import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/session/login"];
const AUTH_COOKIE = "ac_token";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // The API routes carry their own session handling; the login screen and
  // the session-maker are the only public pages.
  const isPublic = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const isApi = pathname.startsWith("/api/");
  if (isPublic || isApi) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (token) {
    return NextResponse.next();
  }
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
