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
 * A participant's name, tinted with their engine's colour(s).
 *
 * Text can only carry one colour, so with a single engine the whole name is
 * tinted; with several, the name takes the first engine's colour and a small
 * dot is appended per additional engine. Colour alone is not an accessible
 * signal, so a tooltip spells out the full list, and the participants page
 * renders a legend.
 *
 * `className` (truncation, wrapping, size) is applied to the name text itself
 * so callers keep the exact layout behaviour they'd get from a bare `<span>`;
 * the engine dots sit outside that flow as a separate, non-shrinking sibling.
 */
export function EngineName({
  engines,
  children,
  className,
}: {
  engines: EngineKey[];
  children: React.ReactNode;
  className?: string;
}) {
  if (engines.length === 0) {
    return <span className={className}>{children}</span>;
  }

  const [primary, ...rest] = engines;
  const label = engines.map((engine) => ENGINE_LABELS[engine]).join(" · ");

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex min-w-0 max-w-full items-center gap-1 align-middle">
          <span
            className={cn("min-w-0 flex-1", className)}
            style={{ color: engineColor(primary) }}
          >
            {children}
          </span>
          {rest.length > 0 && (
            <span className="inline-flex shrink-0 items-center gap-0.5">
              {rest.map((engine) => (
                <span
                  key={engine}
                  aria-hidden
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: engineColor(engine) }}
                />
              ))}
            </span>
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
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
      <span className="text-muted-foreground">
        · varios: nombre + punto por motor adicional · sin color: sin
        especificar
      </span>
    </div>
  );
}
