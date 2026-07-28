import { NextResponse, type NextRequest } from "next/server";

import { dispatchDueReminders } from "@/server/services/reminders";
import { getActiveEvent } from "@/server/services/events";
import { assertCronRequest } from "../guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Queues and delivers the Discord DM reminders that are due. */
export async function GET(request: NextRequest) {
  const denied = assertCronRequest(request);
  if (denied) return denied;

  try {
    const { event, settings } = await getActiveEvent();
    const result = await dispatchDueReminders(event, settings);

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[cron:reminders]", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "unknown" },
      { status: 500 },
    );
  }
}
