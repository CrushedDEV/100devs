import { NextResponse, type NextRequest } from "next/server";

import { getEnv } from "@/lib/env";

/**
 * Cron endpoints are public URLs, so they are gated by a shared secret.
 * Vercel Cron sends it as `Authorization: Bearer <CRON_SECRET>`; manual calls
 * may also pass `?secret=`.
 *
 * Returns a response when the request must be rejected, `null` when allowed.
 */
export function assertCronRequest(request: NextRequest): NextResponse | null {
  const expected = getEnv().CRON_SECRET;

  // No secret configured → only allow in development.
  if (!expected) {
    return process.env.NODE_ENV === "production"
      ? NextResponse.json({ ok: false, error: "CRON_SECRET not set" }, { status: 500 })
      : null;
  }

  const header = request.headers.get("authorization");
  const fromHeader = header?.replace(/^Bearer\s+/i, "");
  const fromQuery = request.nextUrl.searchParams.get("secret");

  if (fromHeader === expected || fromQuery === expected) return null;

  return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
}
