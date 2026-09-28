import { NextResponse } from "next/server";

import { auth } from "@/server/auth";
import { isStaffRole } from "@/server/auth/roles";
import { buildTicketExport } from "@/server/services/tickets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Downloads every ticket conversation as JSON for an offline review.
 *
 * Ticket contents are private, so this is gated on a staff session (the
 * organiser clicks the button while signed in) rather than the cron secret.
 */
export async function GET() {
  const session = await auth();

  if (!session?.user || !isStaffRole(session.user.role)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const data = await buildTicketExport();
    const stamp = data.generatedAt.slice(0, 16).replace(/[:T]/g, "-");

    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="tickets-${stamp}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[tickets:export]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "export failed" },
      { status: 500 },
    );
  }
}
