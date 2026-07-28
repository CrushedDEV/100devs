import Link from "next/link";
import { CalendarClock } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { UserAvatar } from "@/components/shared/user-avatar";
import { formatRelative, formatTime } from "@/lib/format";
import type { ShiftView } from "@/server/services/shifts";

export function UpcomingShifts({ shifts }: { shifts: ShiftView[] }) {
  if (!shifts.length) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="Sin turnos inminentes"
        description="No hay turnos programados en las próximas dos horas."
        className="py-10"
      />
    );
  }

  return (
    <ol className="divide-y divide-border/70">
      {shifts.map((shift) => (
        <li key={shift.id}>
          <Link
            href={`/teams/${shift.teamId}`}
            className="flex items-center gap-3 px-1 py-2.5 transition-colors hover:bg-muted/50"
          >
            <span
              aria-hidden
              className="h-8 w-0.5 shrink-0 rounded-full"
              style={{ backgroundColor: shift.teamColor }}
            />

            {shift.participantName ? (
              <UserAvatar
                name={shift.participantName}
                avatarUrl={shift.participantAvatar}
                className="size-7"
              />
            ) : (
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] text-muted-foreground">
                ?
              </span>
            )}

            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">
                {shift.participantName ?? "Sin asignar"}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {shift.teamName}
              </span>
            </span>

            <span className="shrink-0 text-right">
              <span className="block text-sm tabular-nums">
                {formatTime(shift.startsAt)}
              </span>
              <span className="block text-xs text-muted-foreground">
                {formatRelative(shift.startsAt)}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
