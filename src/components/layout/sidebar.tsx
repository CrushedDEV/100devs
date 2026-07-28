import Link from "next/link";
import { Gamepad2 } from "lucide-react";

import { StatusBadge } from "@/components/shared/status-badge";
import { EVENT_STATUS_META } from "@/lib/constants";
import { formatRelative } from "@/lib/format";
import type { Event, EventSettings } from "@/server/db/schema";

import { SidebarNav } from "./sidebar-nav";

interface SidebarProps {
  event: Event;
  settings: EventSettings;
}

/** Desktop sidebar. The mobile variant reuses `SidebarNav` inside a sheet. */
export function Sidebar({ event, settings }: SidebarProps) {
  const status = EVENT_STATUS_META[event.status];

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <div className="flex items-center gap-2.5 px-4 py-4">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Gamepad2 className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-heading text-sm font-semibold">
              {event.name}
            </span>
            <span className="block text-[11px] text-muted-foreground">
              Centro de control
            </span>
          </span>
        </Link>
      </div>

      <SidebarNav />

      <div className="space-y-2 border-t border-sidebar-border px-4 py-3">
        <StatusBadge label={status.label} tone={status.tone} pulse={event.status === "live"} />
        <p className="text-[11px] text-muted-foreground">
          Última sincronización:{" "}
          <span className="text-foreground/80">
            {settings.lastSyncedAt ? formatRelative(settings.lastSyncedAt) : "nunca"}
          </span>
        </p>
      </div>
    </aside>
  );
}
