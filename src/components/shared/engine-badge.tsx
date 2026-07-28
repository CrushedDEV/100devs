import {
  ENGINE_LABELS,
  type EngineKey,
} from "@/lib/constants";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Simplified monochrome marks rather than the official full-colour logos:
 * they stay legible at 12px, tint with the surrounding theme, and avoid
 * shipping trademarked artwork. Swap the paths for the official SVGs if the
 * event ever needs exact branding.
 */
function UnityMark(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M12 2.5 21 7.5v9L12 21.5 3 16.5v-9L12 2.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M12 12 21 7.5M12 12v9.5M12 12 3 7.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UnrealMark(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <circle cx="12" cy="12" r="9.2" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M9 8v5.2a3 3 0 0 0 6 0V8"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function GodotMark(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M4.6 9.2c0-3.1 3.3-5.6 7.4-5.6s7.4 2.5 7.4 5.6v3.4c0 3.1-3.3 5.6-7.4 5.6s-7.4-2.5-7.4-5.6V9.2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="9.2" cy="10.6" r="1.5" fill="currentColor" />
      <circle cx="14.8" cy="10.6" r="1.5" fill="currentColor" />
      <path
        d="M8.8 15h6.4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M7.4 18.4v2M16.6 18.4v2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

const ENGINE_STYLE: Record<
  EngineKey,
  { mark: (props: React.SVGProps<SVGSVGElement>) => React.ReactElement; color: string }
> = {
  unity: { mark: UnityMark, color: "#c7c9d1" },
  unreal: { mark: UnrealMark, color: "#8b9dfb" },
  godot: { mark: GodotMark, color: "#4a9fd8" },
};

/** Small logo shown beside a participant's name. */
export function EngineBadge({
  engine,
  className,
}: {
  engine: EngineKey | null;
  className?: string;
}) {
  if (!engine) return null;

  const { mark: Mark, color } = ENGINE_STYLE[engine];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded-md ring-1 ring-inset",
            className,
          )}
          style={{
            backgroundColor: `${color}1f`,
            color,
            borderColor: `${color}55`,
          }}
        >
          <Mark className="size-3.5" />
          <span className="sr-only">{ENGINE_LABELS[engine]}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent>{ENGINE_LABELS[engine]}</TooltipContent>
    </Tooltip>
  );
}

export { ENGINE_STYLE };
