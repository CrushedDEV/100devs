"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

import { SHIFT_STATUS_META } from "@/lib/constants";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ShiftView } from "@/server/services/shifts";

interface ShiftBlockProps {
  shift: ShiftView;
  /** Absolute placement inside a week-view day column. */
  style?: React.CSSProperties;
  compact?: boolean;
  onOpen?: (shift: ShiftView) => void;
}

export function DraggableShiftBlock({
  shift,
  style,
  compact,
  onOpen,
}: ShiftBlockProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: shift.id, data: { shift } });

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        transform: CSS.Translate.toString(transform),
      }}
      className={cn("touch-none", isDragging && "z-30 opacity-60")}
      {...attributes}
      {...listeners}
      onDoubleClick={() => onOpen?.(shift)}
    >
      <ShiftBlock shift={shift} compact={compact} />
    </div>
  );
}

export function ShiftBlock({
  shift,
  compact = false,
  overlay = false,
}: {
  shift: ShiftView;
  compact?: boolean;
  overlay?: boolean;
}) {
  const meta = SHIFT_STATUS_META[shift.status];
  const muted = shift.status === "cancelled";

  return (
    <article
      className={cn(
        "h-full cursor-grab overflow-hidden rounded-md border-l-2 px-1.5 py-1 text-left transition-shadow select-none active:cursor-grabbing",
        overlay ? "shadow-xl" : "hover:shadow-md",
        muted && "opacity-50",
      )}
      style={{
        borderLeftColor: shift.teamColor,
        backgroundColor: `${shift.teamColor}1f`,
      }}
      title={`${shift.teamName} · ${shift.participantName ?? "Sin asignar"} · ${meta.label}`}
    >
      <p className="truncate text-[11px] leading-tight font-medium">
        {shift.participantName ?? "Sin asignar"}
      </p>
      {!compact && (
        <>
          <p className="truncate text-[10px] leading-tight text-muted-foreground">
            {shift.teamName}
          </p>
          <p className="truncate text-[10px] leading-tight tabular-nums text-muted-foreground">
            {formatTime(shift.startsAt)} – {formatTime(shift.endsAt)}
          </p>
        </>
      )}
    </article>
  );
}
