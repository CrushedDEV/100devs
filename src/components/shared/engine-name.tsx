import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ENGINES, ENGINE_LABELS, type EngineKey } from "@/lib/constants";
import { cn } from "@/lib/utils";

/** Theme-aware colour token per engine, defined in `globals.css`. */
export function engineColor(engine: EngineKey): string {
  return `var(--engine-${engine})`;
}

/**
 * A participant's name, tinted with their engine's colour.
 *
 * Colour alone is not an accessible signal, so the name also carries a tooltip
 * naming the engine, and the participants page renders a legend.
 */
export function EngineName({
  engine,
  children,
  className,
}: {
  engine: EngineKey | null;
  children: React.ReactNode;
  className?: string;
}) {
  // Truncation is left to the caller: the board shows names in full, while
  // denser surfaces such as the participants table clip them.
  if (!engine) {
    return <span className={className}>{children}</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={className} style={{ color: engineColor(engine) }}>
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent>{ENGINE_LABELS[engine]}</TooltipContent>
    </Tooltip>
  );
}

/** Key explaining what each name colour means. */
export function EngineLegend({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1 text-xs",
        className,
      )}
    >
      <span className="text-muted-foreground">Motor:</span>
      {ENGINES.map((engine) => (
        <span
          key={engine.key}
          className="font-medium"
          style={{ color: engineColor(engine.key) }}
        >
          {engine.label}
        </span>
      ))}
      <span className="text-muted-foreground">· sin color: sin especificar</span>
    </div>
  );
}
