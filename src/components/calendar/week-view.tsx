"use client";

import { format, isToday } from "date-fns";
import { es } from "date-fns/locale";
import { useDroppable } from "@dnd-kit/core";

import { cn } from "@/lib/utils";
import type { ShiftView } from "@/server/services/shifts";

import { buildSlotId, shiftDaySpan } from "./calendar-utils";
import {
  DraggableShiftBlock,
  type ConfirmationChangeHandler,
} from "./shift-block";

const LANE_HEIGHT = 64;
const MIN_LANES = 6;

interface WeekViewProps {
  days: Date[];
  shifts: ShiftView[];
  onOpen?: (shift: ShiftView) => void;
  onConfirmationChange?: ConfirmationChangeHandler;
}

/**
 * Turns last whole days, so the week is a day grid rather than an hour grid:
 * each turn is a bar spanning its days, stacked in lanes so overlapping turns
 * (one per team) never cover each other. The times live inside the bar.
 */
export function WeekView({
  days,
  shifts,
  onOpen,
  onConfirmationChange,
}: WeekViewProps) {
  const lastColumn = days.length - 1;
  const laneEnds: number[] = [];

  const bars = [...shifts]
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
    .map((shift) => {
      const span = shiftDaySpan(shift, days[0]);
      const first = Math.max(0, span.first);
      const last = Math.min(lastColumn, span.last);

      let lane = laneEnds.findIndex((end) => end < first);
      if (lane === -1) lane = laneEnds.length;
      laneEnds[lane] = last;

      return {
        shift,
        first,
        last,
        lane,
        // The bar is cut by the week edges: show it so the turn doesn't look
        // like it starts or ends there.
        continuesBefore: span.first < 0,
        continuesAfter: span.last > lastColumn,
      };
    });

  const lanes = Math.max(MIN_LANES, laneEnds.length);

  return (
    <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
      <div className="min-w-[860px]">
        <div className="grid grid-cols-7 border-b border-border bg-card/95">
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className={cn(
                "border-l border-border px-2 py-2 text-center first:border-l-0",
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

        <div
          className="grid grid-cols-7 py-1"
          style={{ gridTemplateRows: `repeat(${lanes}, ${LANE_HEIGHT}px)` }}
        >
          {days.map((day, index) => (
            <DayCell
              key={day.toISOString()}
              day={day}
              column={index + 1}
              lanes={lanes}
            />
          ))}

          {bars.map(
            ({ shift, first, last, lane, continuesBefore, continuesAfter }) => (
              <div
                key={shift.id}
                className="relative z-10 p-1"
                style={{
                  gridColumn: `${first + 1} / ${last + 2}`,
                  gridRow: lane + 1,
                }}
              >
                <DraggableShiftBlock
                  shift={shift}
                  onOpen={onOpen}
                  onConfirmationChange={onConfirmationChange}
                  style={{ height: "100%" }}
                  continuesBefore={continuesBefore}
                  continuesAfter={continuesAfter}
                />
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

function DayCell({
  day,
  column,
  lanes,
}: {
  day: Date;
  column: number;
  lanes: number;
}) {
  // hour -1: dropping on a day keeps the turn's time of day.
  const { setNodeRef, isOver } = useDroppable({ id: buildSlotId(day, -1) });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "-my-1 border-l border-border transition-colors first:border-l-0",
        isToday(day) && "bg-brand/5",
        isOver && "bg-brand/12",
      )}
      style={{ gridColumn: column, gridRow: `1 / ${lanes + 1}` }}
    />
  );
}
