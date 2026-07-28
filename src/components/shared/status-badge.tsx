import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/constants";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground ring-border",
  brand: "bg-brand/12 text-brand ring-brand/25",
  info: "bg-info/12 text-info ring-info/25",
  success: "bg-success/12 text-success ring-success/25",
  warning: "bg-warning/15 text-warning ring-warning/30",
  danger: "bg-destructive/12 text-destructive ring-destructive/25",
};

const DOT_CLASSES: Record<Tone, string> = {
  neutral: "bg-muted-foreground/60",
  brand: "bg-brand",
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
};

interface StatusBadgeProps {
  label: string;
  tone?: Tone;
  /** Adds a pulsing dot — used for the "in progress" state. */
  pulse?: boolean;
  className?: string;
}

/** Uniform status pill used across tables, cards, calendar and timeline. */
export function StatusBadge({
  label,
  tone = "neutral",
  pulse = false,
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-6 w-fit items-center gap-1.5 rounded-full px-2.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap",
        TONE_CLASSES[tone],
        className,
      )}
    >
      <span className="relative flex size-1.5">
        {pulse && (
          <span
            className={cn(
              "absolute inline-flex size-full animate-ping rounded-full opacity-75",
              DOT_CLASSES[tone],
            )}
          />
        )}
        <span
          className={cn(
            "relative inline-flex size-1.5 rounded-full",
            DOT_CLASSES[tone],
          )}
        />
      </span>
      {label}
    </span>
  );
}
