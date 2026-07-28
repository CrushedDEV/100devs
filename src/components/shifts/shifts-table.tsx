import { CalendarClock } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { UserAvatar } from "@/components/shared/user-avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDuration, formatRange, formatRelative } from "@/lib/format";
import { durationBetween } from "@/lib/format";
import type { ShiftView } from "@/server/services/shifts";

import { ShiftStatusSelect } from "./shift-status-select";

interface ShiftsTableProps {
  shifts: ShiftView[];
  /** Hides the team column on a team's own page. */
  showTeam?: boolean;
}

export function ShiftsTable({ shifts, showTeam = false }: ShiftsTableProps) {
  if (!shifts.length) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="Sin turnos programados"
        description="Genera una rotación o crea turnos manualmente desde el calendario."
        className="py-10"
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead>Participante</TableHead>
            {showTeam && <TableHead>Equipo</TableHead>}
            <TableHead>Horario</TableHead>
            <TableHead className="hidden md:table-cell">Duración</TableHead>
            <TableHead className="hidden lg:table-cell">Inicio</TableHead>
            <TableHead className="text-right">Estado</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {shifts.map((shift) => (
            <TableRow key={shift.id}>
              <TableCell>
                {shift.participantName ? (
                  <div className="flex items-center gap-2.5">
                    <UserAvatar
                      name={shift.participantName}
                      avatarUrl={shift.participantAvatar}
                    />
                    <span className="truncate text-sm font-medium">
                      {shift.participantName}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    Sin asignar
                  </span>
                )}
              </TableCell>

              {showTeam && (
                <TableCell>
                  <span className="inline-flex items-center gap-1.5 text-sm">
                    <span
                      aria-hidden
                      className="size-2 rounded-full"
                      style={{ backgroundColor: shift.teamColor }}
                    />
                    {shift.teamName}
                  </span>
                </TableCell>
              )}

              <TableCell className="text-sm whitespace-nowrap tabular-nums">
                {formatRange(shift.startsAt, shift.endsAt)}
              </TableCell>

              <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                {formatDuration(durationBetween(shift.startsAt, shift.endsAt))}
              </TableCell>

              <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                {formatRelative(shift.startsAt)}
              </TableCell>

              <TableCell className="text-right">
                <div className="flex justify-end">
                  <ShiftStatusSelect shiftId={shift.id} status={shift.status} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
