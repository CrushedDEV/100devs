"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ExternalLink, GripVertical } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/empty-state";
import { EngineName } from "@/components/shared/engine-name";
import { SkillBadges } from "@/components/shared/skill-badges";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { PARTICIPANT_STATUS_META } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { reorderTeamParticipantsAction } from "@/server/actions/participants";
import type { ParticipantView } from "@/server/services/participants";
import { Users } from "lucide-react";

/** Rotation order editor: the list order *is* the turn order. */
export function TeamRoster({ members }: { members: ParticipantView[] }) {
  const router = useRouter();
  const [items, setItems] = useState(members);
  const [syncedWith, setSyncedWith] = useState(members);
  const [, startTransition] = useTransition();

  // Adjusting state during render (rather than in an effect) is the documented
  // way to reset local state when the server sends a fresh list.
  if (syncedWith !== members) {
    setSyncedWith(members);
    setItems(members);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    const ordered = arrayMove(items, oldIndex, newIndex);
    setItems(ordered);

    startTransition(async () => {
      const result = await reorderTeamParticipantsAction({
        orderedIds: ordered.map((item) => item.id),
      });

      if (!result.ok) {
        toast.error(result.message ?? "No se pudo guardar el orden");
        setItems(members);
      }
      router.refresh();
    });
  };

  if (!items.length) {
    return (
      <EmptyState
        icon={Users}
        title="Equipo sin participantes"
        description="Arrastra participantes hasta este equipo desde la vista de equipos."
        className="py-10"
      />
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={onDragEnd}
    >
      <SortableContext
        items={items.map((item) => item.id)}
        strategy={verticalListSortingStrategy}
      >
        <ol className="space-y-1.5">
          {items.map((member, index) => (
            <SortableMember key={member.id} member={member} position={index + 1} />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}

function SortableMember({
  member,
  position,
}: {
  member: ParticipantView;
  position: number;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: member.id });

  const meta = PARTICIPANT_STATUS_META[member.status];

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-2.5 rounded-lg bg-card px-2.5 py-2 ring-1 ring-foreground/10",
        isDragging && "z-10 opacity-70 shadow-lg",
      )}
    >
      <button
        type="button"
        className="cursor-grab touch-none text-muted-foreground/60 active:cursor-grabbing"
        aria-label={`Reordenar ${member.name}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-3.5" />
      </button>

      <span className="w-5 shrink-0 text-xs tabular-nums text-muted-foreground">
        {position}
      </span>

      <UserAvatar name={member.name} avatarUrl={member.avatarUrl} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <EngineName
            engines={member.engines}
            className="truncate text-sm font-medium"
          >
            {member.name}
          </EngineName>
          <SkillBadges skills={member.skills} max={3} />
        </div>
        {member.availability && (
          <p className="truncate text-xs text-muted-foreground">
            {member.availability}
          </p>
        )}
      </div>

      <StatusBadge label={meta.label} tone={meta.tone} />

      {member.discordTicketUrl && (
        <a
          href={member.discordTicketUrl}
          target="_blank"
          rel="noreferrer noopener"
          title="Abrir ticket privado"
          aria-label={`Abrir ticket de ${member.name}`}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ExternalLink className="size-3.5" />
        </a>
      )}
    </li>
  );
}
