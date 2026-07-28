"use client";

import { format, isSameDay, isSameMonth, isToday } from "date-fns";
import { es } from "date-fns/locale";
import { useDroppable } from "@dnd-kit/core";

import { cn } from "@/lib/utils";
import type { ShiftView } from "@/server/services/shifts";

import { buildSlotId } from "./calendar-utils";
import { DraggableShiftBlock } from "./shift-block";

interface MonthViewProps {
  days: Date[];
  anchor: Date;
  shifts: ShiftView[];
  onOpen?: (shift: ShiftView) => void;
}

const WEEKDAYS = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];

/** Month grid. Dropping onto a day keeps the shift's original time of day. */
export function MonthView({ days, anchor, shifts, onOpen }: MonthViewProps) {
  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
      <div className="grid grid-cols-7 border-b border-border bg-card/95">
        {WEEKDAYS.map((weekday) => (
          <div
            key={weekday}
            className="px-2 py-2 text-center text-[10px] tracking-wide text-muted-foreground uppercase"
          >
            {weekday}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => (
          <DayCell
            key={day.toISOString()}
            day={day}
            outside={!isSameMonth(day, anchor)}
            shifts={shifts.filter((shift) => isSameDay(shift.startsAt, day))}
            onOpen={onOpen}
          />
        ))}
      </div>
    </div>
  );
}

function DayCell({
  day,
  outside,
  shifts,
  onOpen,
}: {
  day: Date;
  outside: boolean;
  shifts: ShiftView[];
  onOpen?: (shift: ShiftView) => void;
}) {
  // Hour 0 acts as "keep the original time" — the drop handler preserves it.
  const { setNodeRef, isOver } = useDroppable({ id: buildSlotId(day, -1) });

  const visible = shifts.slice(0, 3);
  const hidden = shifts.length - visible.length;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-28 space-y-1 border-r border-b border-border/60 p-1.5 transition-colors last:border-r-0",
        outside && "bg-muted/30",
        isOver && "bg-brand/12",
      )}
    >
      <div className="flex items-center justify-between px-0.5">
        <span
          className={cn(
            "text-xs tabular-nums",
            isToday(day)
              ? "flex size-5 items-center justify-center rounded-full bg-brand font-semibold text-brand-foreground"
              : outside
                ? "text-muted-foreground/60"
                : "text-muted-foreground",
          )}
        >
          {format(day, "d", { locale: es })}
        </span>
        {shifts.length > 0 && (
          <span className="text-[10px] tabular-nums text-muted-foreground">
            {shifts.length}
          </span>
        )}
      </div>

      {visible.map((shift) => (
        <DraggableShiftBlock
          key={shift.id}
          shift={shift}
          compact
          onOpen={onOpen}
          style={{ height: 22 }}
        />
      ))}

      {hidden > 0 && (
        <p className="px-0.5 text-[10px] text-muted-foreground">
          +{hidden} más
        </p>
      )}
    </div>
  );
}
