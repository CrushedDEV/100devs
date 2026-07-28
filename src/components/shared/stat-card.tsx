import type { LucideIcon } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/constants";

const ACCENT: Record<Tone, string> = {
  neutral: "text-muted-foreground",
  brand: "text-brand",
  info: "text-info",
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
};

const GLOW: Record<Tone, string> = {
  neutral: "from-muted-foreground/10",
  brand: "from-brand/20",
  info: "from-info/20",
  success: "from-success/20",
  warning: "from-warning/20",
  danger: "from-destructive/20",
};

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: Tone;
  /** When provided, renders a progress bar under the value. */
  progress?: number;
  className?: string;
}

/**
 * Compact KPI tile. Deliberately quiet: one number, one label, an optional
 * hint — the dashboard shows several in a row, so restraint keeps it readable.
 */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
  progress,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "group relative flex flex-col justify-between gap-3 overflow-hidden rounded-xl bg-card p-4 ring-1 ring-foreground/10 transition-shadow hover:ring-foreground/20",
        className,
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -top-14 -right-10 size-32 rounded-full bg-gradient-to-br to-transparent opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100",
          GLOW[tone],
        )}
      />

      <div className="relative flex items-start justify-between gap-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </p>
        {Icon && <Icon className={cn("size-4 shrink-0", ACCENT[tone])} />}
      </div>

      <div className="relative space-y-2">
        <p className="font-heading text-2xl font-semibold tracking-tight tabular-nums">
          {value}
        </p>
        {progress !== undefined && (
          <Progress
            value={progress}
            className="h-1.5"
            aria-label={`${label}: ${progress}%`}
          />
        )}
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}
