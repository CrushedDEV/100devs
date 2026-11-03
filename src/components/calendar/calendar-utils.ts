import {
  addDays,
  addMinutes,
  differenceInCalendarDays,
  differenceInMinutes,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";

export type CalendarMode = "week" | "month";

/**
 * Drop targets are encoded as `slot|<epochMs of day>|<hour>`.
 * A pipe separator keeps parsing trivial (ISO strings contain colons).
 */
const SEPARATOR = "|";

export function buildSlotId(day: Date, hour: number): string {
  return ["slot", startOfDay(day).getTime(), hour].join(SEPARATOR);
}

export function parseSlotId(id: string): { day: Date; hour: number } | null {
  const [prefix, epoch, hour] = id.split(SEPARATOR);
  if (prefix !== "slot" || !epoch) return null;

  return { day: new Date(Number(epoch)), hour: Number(hour ?? 0) };
}

export function weekRange(anchor: Date): { start: Date; end: Date } {
  return {
    start: startOfWeek(anchor, { weekStartsOn: 1 }),
    end: endOfWeek(anchor, { weekStartsOn: 1 }),
  };
}

export function monthRange(anchor: Date): { start: Date; end: Date } {
  return {
    start: startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 }),
  };
}

export function daysBetween(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  let cursor = startOfDay(start);

  while (cursor <= end) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }

  return days;
}

export function minutesFromMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function shiftDurationMinutes(start: Date, end: Date): number {
  return Math.max(15, differenceInMinutes(end, start));
}

/**
 * Turns of a day or more (the usual 48 h rotation) don't fit an hour grid:
 * they go in the week view's all-day band instead.
 */
export function isMultiDayShift(start: Date, end: Date): boolean {
  return differenceInMinutes(end, start) >= 20 * 60;
}

export function overlapsRange(
  shift: { startsAt: Date; endsAt: Date },
  start: Date,
  end: Date,
): boolean {
  return shift.startsAt <= end && shift.endsAt >= start;
}

/** Calendar days covered by a shift, as whole days from `origin`. */
export function shiftDaySpan(
  shift: { startsAt: Date; endsAt: Date },
  origin: Date,
): { first: number; last: number } {
  // An end at exactly midnight belongs to the previous day.
  const end = addMinutes(shift.endsAt, -1);
  return {
    first: differenceInCalendarDays(shift.startsAt, origin),
    last: differenceInCalendarDays(end < shift.startsAt ? shift.startsAt : end, origin),
  };
}
