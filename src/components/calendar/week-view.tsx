"use client";

import { endOfDay, format, isSameDay, isToday, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { useDroppable } from "@dnd-kit/core";

import { cn } from "@/lib/utils";
import type { ShiftView } from "@/server/services/shifts";

import {
  buildSlotId,
  isMultiDayShift,
  minutesFromMidnight,
  shiftDaySpan,
  shiftDurationMinutes,
} from "./calendar-utils";
import { DraggableShiftBlock } from "./shift-block";

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const HOUR_HEIGHT = 48;
const LANE_HEIGHT = 44;

interface WeekViewProps {
  days: Date[];
  shifts: ShiftView[];
  onOpen?: (shift: ShiftView) => void;
}

/**
 * Hour grid with absolutely positioned shift blocks, plus an all-day band on
 * top for turns that last a day or more. Each hour cell is a drop target; the
 * block keeps its duration and its minute offset when moved.
 */
export function WeekView({ days, shifts, onOpen }: WeekViewProps) {
  const longShifts = shifts.filter((shift) =>
    isMultiDayShift(shift.startsAt, shift.endsAt),
  );
  const shortShifts = shifts.filter(
    (shift) => !isMultiDayShift(shift.startsAt, shift.endsAt),
  );

  return (
    <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
      <div className="min-w-[860px]">
        <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-border bg-card/95">
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

        <AllDayBand days={days} shifts={longShifts} onOpen={onOpen} />

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
              shifts={shortShifts.filter((shift) =>
                isSameDay(shift.startsAt, day),
              )}
              onOpen={onOpen}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Multi-day turns as bars spanning their days, stacked in lanes so overlapping
 * turns (one per team) never cover each other.
 */
function AllDayBand({
  days,
  shifts,
  onOpen,
}: {
  days: Date[];
  shifts: ShiftView[];
  onOpen?: (shift: ShiftView) => void;
}) {
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

  const lanes = Math.max(1, laneEnds.length);

  return (
    <div
      className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-border bg-card/40"
      style={{ gridTemplateRows: `repeat(${lanes}, ${LANE_HEIGHT}px)` }}
    >
      <div
        className="flex items-start justify-end px-2 pt-1.5 text-[10px] text-muted-foreground"
        style={{ gridColumn: 1, gridRow: `1 / ${lanes + 1}` }}
      >
        Turnos
      </div>

      {days.map((day, index) => (
        <AllDayCell
          key={day.toISOString()}
          day={day}
          column={index + 2}
          lanes={lanes}
        />
      ))}

      {bars.map(({ shift, first, last, lane, continuesBefore, continuesAfter }) => (
        <div
          key={shift.id}
          className="relative z-10 px-[3px] py-[3px]"
          style={{
            gridColumn: `${first + 2} / ${last + 3}`,
            gridRow: lane + 1,
          }}
        >
          <DraggableShiftBlock
            shift={shift}
            onOpen={onOpen}
            style={{ height: "100%" }}
            continuesBefore={continuesBefore}
            continuesAfter={continuesAfter}
          />
        </div>
      ))}
    </div>
  );
}

function AllDayCell({
  day,
  column,
  lanes,
}: {
  day: Date;
  column: number;
  lanes: number;
}) {
  // hour -1: dropping here keeps the turn's time of day, like the month view.
  const { setNodeRef, isOver } = useDroppable({ id: buildSlotId(day, -1) });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "border-l border-border transition-colors",
        isToday(day) && "bg-brand/5",
        isOver && "bg-brand/12",
      )}
      style={{ gridColumn: column, gridRow: `1 / ${lanes + 1}` }}
    />
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
        // A short turn that crosses midnight is cut at the end of its day
        // instead of spilling below the grid.
        const visibleEnd =
          shift.endsAt > endOfDay(day) ? endOfDay(day) : shift.endsAt;
        const height = Math.max(
          22,
          (shiftDurationMinutes(shift.startsAt, visibleEnd) / 60) *
            HOUR_HEIGHT -
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
              height: Math.min(height, 24 * HOUR_HEIGHT - top),
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
  const { setNodeRef, isOver } = useDroppable({
    id: buildSlotId(startOfDay(day), hour),
  });

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
