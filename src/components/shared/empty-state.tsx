import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center gap-3 overflow-hidden rounded-xl border border-dashed border-border px-6 py-14 text-center",
        className,
      )}
    >
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-[0.35] [mask-image:radial-gradient(ellipse_at_center,black,transparent_72%)]" />
      <div className="relative flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground ring-1 ring-border">
        <Icon className="size-5" />
      </div>
      <div className="relative space-y-1">
        <p className="font-heading text-sm font-medium text-foreground">{title}</p>
        {description && (
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action && <div className="relative pt-1">{action}</div>}
    </div>
  );
}
