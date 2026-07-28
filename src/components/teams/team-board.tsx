"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  PointerSensor,
  KeyboardSensor,
  pointerWithin,
  rectIntersection,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Inbox, Settings2 } from "lucide-react";
import { toast } from "sonner";

import { EngineName } from "@/components/shared/engine-name";
import { SkillBadges } from "@/components/shared/skill-badges";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { moveParticipantAction } from "@/server/actions/participants";
import type { ParticipantView } from "@/server/services/participants";
import type { TeamView } from "@/server/services/teams";

const UNASSIGNED = "unassigned";

interface TeamBoardProps {
  teams: TeamView[];
  participants: ParticipantView[];
}

type Columns = Record<string, ParticipantView[]>;

/**
 * Kanban-style team organiser.
 *
 * Local state is updated optimistically on drop and only reconciled with the
 * server afterwards — dragging 100 cards has to feel instant.
 */
export function TeamBoard({ teams, participants }: TeamBoardProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [columns, setColumns] = useState<Columns>(() =>
    buildColumns(teams, participants),
  );
  const [syncedWith, setSyncedWith] = useState(participants);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Re-derive the board when the server sends fresh data (after `router.refresh`).
  if (syncedWith !== participants) {
    setSyncedWith(participants);
    setColumns(buildColumns(teams, participants));
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const activeParticipant = useMemo(
    () =>
      activeId
        ? Object.values(columns)
            .flat()
            .find((participant) => participant.id === activeId) ?? null
        : null,
    [activeId, columns],
  );

  /**
   * Corner-distance heuristics misbehave with many equally sized columns: the
   * nearest *corner* is often not the column under the cursor, which made every
   * other column impossible to drop into. Resolving by pointer position first
   * is exact, with a rectangle-overlap fallback for keyboard dragging.
   */
  const collisionDetection = useCallback<CollisionDetection>((args) => {
    const underPointer = pointerWithin(args);
    return underPointer.length > 0 ? underPointer : rectIntersection(args);
  }, []);

  const findColumn = (id: string): string | undefined => {
    if (id in columns) return id;
    return Object.keys(columns).find((key) =>
      columns[key].some((participant) => participant.id === id),
    );
  };

  const onDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  /** Moves the card between columns while dragging, for live feedback. */
  const onDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const from = findColumn(String(active.id));
    const to = findColumn(String(over.id));
    if (!from || !to || from === to) return;

    setColumns((current) => {
      const moving = current[from].find((p) => p.id === String(active.id));
      if (!moving) return current;

      const overIndex = current[to].findIndex((p) => p.id === String(over.id));
      const insertAt = overIndex === -1 ? current[to].length : overIndex;

      return {
        ...current,
        [from]: current[from].filter((p) => p.id !== moving.id),
        [to]: [
          ...current[to].slice(0, insertAt),
          moving,
          ...current[to].slice(insertAt),
        ],
      };
    });
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const column = findColumn(String(over.id)) ?? findColumn(String(active.id));
    if (!column) return;

    const items = columns[column];
    const oldIndex = items.findIndex((p) => p.id === String(active.id));
    const newIndex = items.findIndex((p) => p.id === String(over.id));

    const ordered =
      oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex
        ? arrayMove(items, oldIndex, newIndex)
        : items;

    setColumns((current) => ({ ...current, [column]: ordered }));

    startTransition(async () => {
      const result = await moveParticipantAction({
        participantId: String(active.id),
        teamId: column === UNASSIGNED ? null : column,
        orderedIds: ordered.map((participant) => participant.id),
      });

      if (!result.ok) {
        toast.error(result.message ?? "No se pudo guardar el cambio");
        setColumns(buildColumns(teams, participants));
      }
      router.refresh();
    });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      // Columns change size as cards move between them mid-drag; without
      // continuous measuring the drop rectangles go stale and land wrong.
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] items-start gap-2.5">
        <Column
          id={UNASSIGNED}
          title="Sin equipo"
          color="var(--muted-foreground)"
          participants={columns[UNASSIGNED] ?? []}
        />

        {teams.map((team) => (
          <Column
            key={team.id}
            id={team.id}
            title={team.name}
            color={team.color}
            href={`/teams/${team.id}`}
            participants={columns[team.id] ?? []}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeParticipant && (
          <ParticipantCard participant={activeParticipant} overlay />
        )}
      </DragOverlay>
    </DndContext>
  );
}

function buildColumns(
  teams: TeamView[],
  participants: ParticipantView[],
): Columns {
  const columns: Columns = { [UNASSIGNED]: [] };
  for (const team of teams) columns[team.id] = [];

  const sorted = [...participants].sort(
    (a, b) => a.orderIndex - b.orderIndex,
  );

  for (const participant of sorted) {
    const key = participant.team?.id ?? UNASSIGNED;
    (columns[key] ??= []).push(participant);
  }

  return columns;
}

function Column({
  id,
  title,
  color,
  href,
  participants,
}: {
  id: string;
  title: string;
  color: string;
  href?: string;
  participants: ParticipantView[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "flex flex-col rounded-xl bg-muted/35 ring-1 transition-colors",
        isOver ? "bg-muted/70 ring-brand/40" : "ring-foreground/8",
      )}
    >
      <header className="flex items-center gap-1.5 px-2.5 py-2">
        <span
          aria-hidden
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
        {href ? (
          <Link
            href={href}
            className="min-w-0 flex-1 truncate text-sm font-medium hover:underline"
          >
            {title}
          </Link>
        ) : (
          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            {title}
          </span>
        )}
        <Badge variant="secondary" className="tabular-nums">
          {participants.length}
        </Badge>
        {href && (
          <Button asChild variant="ghost" size="icon-xs">
            <Link href={href} aria-label={`Abrir ${title}`}>
              <Settings2 />
            </Link>
          </Button>
        )}
      </header>

      <SortableContext
        items={participants.map((participant) => participant.id)}
        strategy={verticalListSortingStrategy}
      >
        {/* Capped height keeps every column visible at once; long lists scroll
            inside instead of stretching the whole board. */}
        <div className="no-scrollbar flex max-h-[26rem] min-h-20 flex-col gap-1 overflow-y-auto px-1.5 pb-1.5">
          {participants.length ? (
            participants.map((participant, index) => (
              <SortableParticipant
                key={participant.id}
                participant={participant}
                position={index + 1}
              />
            ))
          ) : (
            <div className="flex min-h-20 flex-1 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border/80 px-2 py-4 text-center">
              <Inbox className="size-3.5 text-muted-foreground" />
              <p className="text-[11px] leading-tight text-muted-foreground">
                Arrastra aquí
              </p>
            </div>
          )}
        </div>
      </SortableContext>
    </section>
  );
}

function SortableParticipant({
  participant,
  position,
}: {
  participant: ParticipantView;
  position: number;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: participant.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && "opacity-40")}
      {...attributes}
      {...listeners}
    >
      <ParticipantCard participant={participant} position={position} />
    </div>
  );
}

function ParticipantCard({
  participant,
  position,
  overlay = false,
}: {
  participant: ParticipantView;
  position?: number;
  overlay?: boolean;
}) {
  return (
    <article
      className={cn(
        "flex touch-none items-center gap-1.5 rounded-lg bg-card px-1.5 py-1 ring-1 ring-foreground/10 select-none",
        overlay ? "shadow-xl ring-brand/40" : "hover:ring-foreground/20",
      )}
    >
      <GripVertical className="size-3 shrink-0 cursor-grab text-muted-foreground/60" />
      <UserAvatar
        name={participant.name}
        avatarUrl={participant.avatarUrl}
        className="size-5"
      />
      <EngineName engine={participant.engine} className="min-w-0 flex-1 text-[13px]">
        {participant.name}
      </EngineName>
      <SkillBadges skills={participant.skills} max={2} />
      {position !== undefined && (
        <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
          {position}
        </span>
      )}
    </article>
  );
}
