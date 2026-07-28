"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { SKILLS, SKILL_LABELS, type SkillKey, type SkillRoleMap } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { toggleParticipantSkillAction } from "@/server/actions/participants";

import { SKILL_STYLE } from "./skill-badges";

interface SkillToggleGridProps {
  participantId: string;
  skills: SkillKey[];
  /** Which categories the organiser has linked to a Discord role. */
  skillRoleIds: SkillRoleMap;
  className?: string;
}

/**
 * Interactive category chips: clicking one grants or revokes the matching
 * Discord role for real, through the bot — this is the one control in the
 * panel that writes back to Discord instead of only reading from it.
 */
export function SkillToggleGrid({
  participantId,
  skills,
  skillRoleIds,
  className,
}: SkillToggleGridProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pending, setPending] = useState<SkillKey | null>(null);

  const toggle = (skill: SkillKey, next: boolean) => {
    setPending(skill);
    startTransition(async () => {
      const result = await toggleParticipantSkillAction({
        participantId,
        skill,
        enabled: next,
      });

      if (result.ok) {
        router.refresh();
      } else {
        toast.error(result.message ?? "No se pudo actualizar la categoría");
      }
      setPending(null);
    });
  };

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {SKILLS.map((skill) => {
        const linked = Boolean(skillRoleIds[skill.key]);
        const active = skills.includes(skill.key);
        const { icon: Icon, color } = SKILL_STYLE[skill.key];
        const busy = isPending && pending === skill.key;

        return (
          <button
            key={skill.key}
            type="button"
            disabled={!linked || isPending}
            onClick={() => toggle(skill.key, !active)}
            title={
              linked
                ? undefined
                : "Vincula esta categoría a un rol de Discord en Ajustes"
            }
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-opacity",
              linked ? "cursor-pointer" : "cursor-not-allowed opacity-40",
              busy && "opacity-60",
            )}
            style={
              active
                ? {
                    backgroundColor: `${color}24`,
                    color,
                    borderColor: `${color}66`,
                  }
                : {
                    backgroundColor: "var(--muted)",
                    color: "var(--muted-foreground)",
                    borderColor: "transparent",
                  }
            }
          >
            <Icon className="size-3" />
            {SKILL_LABELS[skill.key]}
          </button>
        );
      })}
    </div>
  );
}
