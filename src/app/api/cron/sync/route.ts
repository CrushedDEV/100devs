import { NextResponse, type NextRequest } from "next/server";

import { syncDiscordMembers } from "@/server/discord/sync";
import { getActiveEvent } from "@/server/services/events";
import { refreshShiftStatuses } from "@/server/services/shifts";
import { assertCronRequest } from "../guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Periodic Discord sync + shift status reconciliation.
 * Scheduled from `vercel.json`; also callable manually with the CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  const denied = assertCronRequest(request);
  if (denied) return denied;

  try {
    const { event, settings } = await getActiveEvent();

    const refreshed = await refreshShiftStatuses(event.id);

    if (!settings.autoSyncEnabled) {
      return NextResponse.json({
        ok: true,
        skipped: "auto-sync disabled",
        shiftsRefreshed: refreshed,
      });
    }

    const result = await syncDiscordMembers("cron");

    return NextResponse.json({ ok: true, shiftsRefreshed: refreshed, ...result });
  } catch (error) {
    console.error("[cron:sync]", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "unknown" },
      { status: 500 },
    );
  }
}
