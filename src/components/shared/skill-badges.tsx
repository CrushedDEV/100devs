import {
  AudioLines,
  Blocks,
  Box,
  Code,
  Mic,
  Music,
  Palette,
  PenLine,
  Video,
  type LucideIcon,
} from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SKILL_LABELS, type SkillKey } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Icon + colour per skill. Colours are hard-coded hex rather than theme tokens
 * because these badges must stay distinguishable from each other in both
 * light and dark mode, independently of the event's accent colour.
 */
const SKILL_STYLE: Record<SkillKey, { icon: LucideIcon; color: string }> = {
  music: { icon: Music, color: "#a78bfa" },
  sfx: { icon: AudioLines, color: "#22d3ee" },
  level_design: { icon: Blocks, color: "#fbbf24" },
  art_2d: { icon: Palette, color: "#f472b6" },
  art_3d: { icon: Box, color: "#fb923c" },
  programming: { icon: Code, color: "#4ade80" },
  writing: { icon: PenLine, color: "#60a5fa" },
  mic: { icon: Mic, color: "#f87171" },
  webcam: { icon: Video, color: "#2dd4bf" },
};

interface SkillBadgesProps {
  skills: SkillKey[];
  /** Beyond this, the rest collapse into a "+N" chip. */
  max?: number;
  className?: string;
}

/** Compact icon row shown next to a participant's name. */
export function SkillBadges({ skills, max = 5, className }: SkillBadgesProps) {
  if (!skills.length) return null;

  const visible = skills.slice(0, max);
  const hidden = skills.slice(max);

  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {visible.map((skill) => {
        const { icon: Icon, color } = SKILL_STYLE[skill];

        return (
          <Tooltip key={skill}>
            <TooltipTrigger asChild>
              <span
                className="flex size-5 items-center justify-center rounded-md ring-1 ring-inset"
                style={{
                  backgroundColor: `${color}1f`,
                  color,
                  borderColor: `${color}55`,
                }}
              >
                <Icon className="size-3" />
                <span className="sr-only">{SKILL_LABELS[skill]}</span>
              </span>
            </TooltipTrigger>
            <TooltipContent>{SKILL_LABELS[skill]}</TooltipContent>
          </Tooltip>
        );
      })}

      {hidden.length > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="flex h-5 items-center rounded-md bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
              +{hidden.length}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {hidden.map((skill) => SKILL_LABELS[skill]).join(" · ")}
          </TooltipContent>
        </Tooltip>
      )}
    </span>
  );
}

/** Full-width labelled chips, used where there is room for the names. */
export function SkillChips({
  skills,
  className,
}: {
  skills: SkillKey[];
  className?: string;
}) {
  if (!skills.length) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        Sin categorías asignadas.
      </p>
    );
  }

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {skills.map((skill) => {
        const { icon: Icon, color } = SKILL_STYLE[skill];

        return (
          <span
            key={skill}
            className="inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium ring-1 ring-inset"
            style={{
              backgroundColor: `${color}1f`,
              color,
              borderColor: `${color}55`,
            }}
          >
            <Icon className="size-3" />
            {SKILL_LABELS[skill]}
          </span>
        );
      })}
    </div>
  );
}

export { SKILL_STYLE };
