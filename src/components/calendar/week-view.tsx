"use client";

import { isSameDay, isToday } from "date-fns";
import { es } from "date-fns/locale";
import { format } from "date-fns";
import { useDroppable } from "@dnd-kit/core";

import { cn } from "@/lib/utils";
import type { ShiftView } from "@/server/services/shifts";

import {
  buildSlotId,
  minutesFromMidnight,
  shiftDurationMinutes,
} from "./calendar-utils";
import { DraggableShiftBlock } from "./shift-block";

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const HOUR_HEIGHT = 48;

interface WeekViewProps {
  days: Date[];
  shifts: ShiftView[];
  onOpen?: (shift: ShiftView) => void;
}

/**
 * Hour grid with absolutely positioned shift blocks. Each hour cell is a drop
 * target; the block keeps its duration and its minute offset when moved.
 */
export function WeekView({ days, shifts, onOpen }: WeekViewProps) {
  return (
    <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
      <div className="min-w-[860px]">
        <div className="sticky top-14 z-20 grid grid-cols-[56px_repeat(7,1fr)] border-b border-border bg-card/95 backdrop-blur">
          <div />
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className={cn(
                "border-l border-border px-2 py-2 text-center",
                isToday(day) && "bg-brand/8",
              )}
            >
              <p className="text-[10px] tracking-wide text-muted-foreground uppercase">
                {format(day, "EEE", { locale: es })}
              </p>
              <p
                className={cn(
                  "text-sm font-semibold tabular-nums",
                  isToday(day) && "text-brand",
                )}
              >
                {format(day, "d")}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-[56px_repeat(7,1fr)]">
          <div>
            {HOURS.map((hour) => (
              <div
                key={hour}
                style={{ height: HOUR_HEIGHT }}
                className="relative border-b border-border/60"
              >
                <span className="absolute -top-2 right-2 text-[10px] tabular-nums text-muted-foreground">
                  {hour > 0 ? `${String(hour).padStart(2, "0")}:00` : ""}
                </span>
              </div>
            ))}
          </div>

          {days.map((day) => (
            <DayColumn
              key={day.toISOString()}
              day={day}
              shifts={shifts.filter((shift) => isSameDay(shift.startsAt, day))}
              onOpen={onOpen}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function DayColumn({
  day,
  shifts,
  onOpen,
}: {
  day: Date;
  shifts: ShiftView[];
  onOpen?: (shift: ShiftView) => void;
}) {
  return (
    <div className="relative border-l border-border">
      {HOURS.map((hour) => (
        <HourSlot key={hour} day={day} hour={hour} />
      ))}

      {shifts.map((shift) => {
        const top = (minutesFromMidnight(shift.startsAt) / 60) * HOUR_HEIGHT;
        const height = Math.max(
          22,
          (shiftDurationMinutes(shift.startsAt, shift.endsAt) / 60) * HOUR_HEIGHT -
            2,
        );

        return (
          <DraggableShiftBlock
            key={shift.id}
            shift={shift}
            onOpen={onOpen}
            compact={height < 44}
            style={{
              position: "absolute",
              top,
              height,
              left: 3,
              right: 3,
              zIndex: 10,
            }}
          />
        );
      })}
    </div>
  );
}

function HourSlot({ day, hour }: { day: Date; hour: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: buildSlotId(day, hour) });

  return (
    <div
      ref={setNodeRef}
      style={{ height: HOUR_HEIGHT }}
      className={cn(
        "border-b border-border/60 transition-colors",
        isOver && "bg-brand/12",
      )}
    />
  );
}
