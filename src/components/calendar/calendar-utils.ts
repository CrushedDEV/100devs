import {
  addDays,
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
