import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ENGINE_LABELS, type EngineKey } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Simplified monochrome marks rather than the official full-colour logos:
 * they stay legible at badge size, tint with the surrounding theme, and avoid
 * shipping trademarked artwork. Swap the paths for the official SVGs if the
 * event ever needs exact branding.
 *
 * All geometry is kept inside a 4..20 box of the 24×24 viewBox so the stroke
 * never touches the badge border.
 */
function UnityMark(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M12 4 19 8v8l-7 4-7-4V8l7-4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M12 12 19 8M12 12v8M12 12 5 8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UnrealMark(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M9.3 8.6v4.2a2.7 2.7 0 0 0 5.4 0V8.6"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

function GodotMark(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M5.5 9.5c0-2.8 2.9-5 6.5-5s6.5 2.2 6.5 5v3c0 2.8-2.9 5-6.5 5s-6.5-2.2-6.5-5v-3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="9.4" cy="11" r="1.6" fill="currentColor" />
      <circle cx="14.6" cy="11" r="1.6" fill="currentColor" />
    </svg>
  );
}

/**
 * Colours are chosen for contrast on both light and dark surfaces rather than
 * strict brand accuracy — Unity and Unreal are monochrome brands, which would
 * be indistinguishable from one another as badges.
 */
const ENGINE_STYLE: Record<
  EngineKey,
  {
    mark: (props: React.SVGProps<SVGSVGElement>) => React.ReactElement;
    color: string;
  }
> = {
  unity: { mark: UnityMark, color: "#8b93a7" },
  unreal: { mark: UnrealMark, color: "#7c8cf8" },
  godot: { mark: GodotMark, color: "#4a9fd8" },
};

/**
 * Size is a variant rather than a `className` override: passing `size-4` from
 * outside shrank the box without shrinking the glyph, which is what made the
 * mark spill over the border.
 */
const SIZES = {
  sm: { box: "size-4 rounded", glyph: "size-2.5" },
  md: { box: "size-5 rounded-md", glyph: "size-3.5" },
} as const;

export function EngineBadge({
  engine,
  size = "md",
  className,
}: {
  engine: EngineKey | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  if (!engine) return null;

  const { mark: Mark, color } = ENGINE_STYLE[engine];
  const { box, glyph } = SIZES[size];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex shrink-0 items-center justify-center border",
            box,
            className,
          )}
          // A `border` utility reads `border-color`; the previous `ring-inset`
          // ignored it, which is why the outline kept its default colour.
          style={{
            backgroundColor: `${color}24`,
            borderColor: `${color}66`,
            color,
          }}
        >
          <Mark className={glyph} />
          <span className="sr-only">{ENGINE_LABELS[engine]}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent>{ENGINE_LABELS[engine]}</TooltipContent>
    </Tooltip>
  );
}

export { ENGINE_STYLE };
