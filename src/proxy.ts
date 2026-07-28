import { NextResponse, type NextRequest } from "next/server";

/**
 * Cheap edge-level redirect for unauthenticated visitors.
 *
 * The authoritative check (guild membership + staff role) lives in
 * `requireStaff()` inside the panel layout and every server action — this only
 * avoids rendering the shell for someone with no session cookie at all.
 */
const SESSION_COOKIES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
];

export function proxy(request: NextRequest) {
  const hasSession = SESSION_COOKIES.some(
    (name) => request.cookies.get(name)?.value,
  );

  if (hasSession) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("callbackUrl", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/participants/:path*",
    "/teams/:path*",
    "/calendar/:path*",
    "/timeline/:path*",
    "/checkpoints/:path*",
    "/stats/:path*",
    "/settings/:path*",
  ],
};
