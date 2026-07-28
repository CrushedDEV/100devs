import {
  differenceInMinutes,
  format,
  formatDistanceToNowStrict,
  isSameDay,
} from "date-fns";
import { es } from "date-fns/locale";

/** Formats a date in an arbitrary IANA timezone without extra dependencies. */
export function formatInTimeZone(
  date: Date,
  timeZone: string,
  pattern: "HH:mm" | "dd/MM" | "dd/MM HH:mm" | "full",
): string {
  const options: Intl.DateTimeFormatOptions = { timeZone };

  switch (pattern) {
    case "HH:mm":
      options.hour = "2-digit";
      options.minute = "2-digit";
      options.hour12 = false;
      break;
    case "dd/MM":
      options.day = "2-digit";
      options.month = "2-digit";
      break;
    case "dd/MM HH:mm":
      options.day = "2-digit";
      options.month = "2-digit";
      options.hour = "2-digit";
      options.minute = "2-digit";
      options.hour12 = false;
      break;
    case "full":
      options.dateStyle = "full";
      options.timeStyle = "short";
      break;
  }

  return new Intl.DateTimeFormat("es-ES", options).format(date);
}

export function formatTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return format(new Date(date), "HH:mm", { locale: es });
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return format(new Date(date), "d MMM yyyy", { locale: es });
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return format(new Date(date), "d MMM yyyy · HH:mm", { locale: es });
}

export function formatDayLabel(date: Date | string): string {
  return format(new Date(date), "EEEE d 'de' MMMM", { locale: es });
}

export function formatRelative(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return formatDistanceToNowStrict(new Date(date), {
    locale: es,
    addSuffix: true,
  });
}

/** Renders a shift range compactly: "12 mar · 10:00 → 11:30". */
export function formatRange(start: Date | string, end: Date | string): string {
  const from = new Date(start);
  const to = new Date(end);

  if (isSameDay(from, to)) {
    return `${format(from, "d MMM", { locale: es })} · ${format(from, "HH:mm")} → ${format(to, "HH:mm")}`;
  }

  return `${format(from, "d MMM HH:mm", { locale: es })} → ${format(to, "d MMM HH:mm", { locale: es })}`;
}

export function formatDuration(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return "—";
  if (minutes < 60) return `${Math.round(minutes)} min`;

  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

export function durationBetween(start: Date, end: Date): number {
  return Math.max(0, differenceInMinutes(end, start));
}

export function formatPercent(value: number, fractionDigits = 0): string {
  return `${value.toFixed(fractionDigits)}%`;
}

export function initials(name: string): string {
  return name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}
