"use client";

import { format, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
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
  /** The bar is cut by the edge of the visible range on that side. */
  continuesBefore?: boolean;
  continuesAfter?: boolean;
  onOpen?: (shift: ShiftView) => void;
}

export function DraggableShiftBlock({
  shift,
  style,
  compact,
  continuesBefore,
  continuesAfter,
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
      <ShiftBlock
        shift={shift}
        compact={compact}
        continuesBefore={continuesBefore}
        continuesAfter={continuesAfter}
      />
    </div>
  );
}

/** "mar 10 · 00:00 → mié 11 · 23:59" for multi-day turns, plain times otherwise. */
function formatShiftRange(start: Date, end: Date): string {
  if (isSameDay(start, end)) return `${formatTime(start)} – ${formatTime(end)}`;
  const pattern = "EEE d · HH:mm";
  return `${format(start, pattern, { locale: es })} → ${format(end, pattern, { locale: es })}`;
}

export function ShiftBlock({
  shift,
  compact = false,
  overlay = false,
  continuesBefore = false,
  continuesAfter = false,
}: {
  shift: ShiftView;
  compact?: boolean;
  overlay?: boolean;
  continuesBefore?: boolean;
  continuesAfter?: boolean;
}) {
  const meta = SHIFT_STATUS_META[shift.status];
  const muted = shift.status === "cancelled";

  return (
    <article
      className={cn(
        "h-full cursor-grab overflow-hidden rounded-md border-l-2 text-left transition-shadow select-none active:cursor-grabbing",
        compact ? "px-1.5 py-1" : "px-2 py-1.5",
        overlay ? "shadow-xl" : "hover:shadow-md",
        muted && "opacity-50",
        continuesBefore && "rounded-l-none border-l-0 border-dashed",
        continuesAfter && "rounded-r-none",
      )}
      style={{
        borderLeftColor: shift.teamColor,
        backgroundColor: `${shift.teamColor}1f`,
      }}
      title={`${shift.teamName} · ${shift.participantName ?? "Sin asignar"} · ${meta.label}`}
    >
      <p
        className={cn(
          "truncate font-medium",
          compact ? "text-[11px] leading-tight" : "text-xs leading-4",
        )}
      >
        {continuesBefore && "← "}
        {shift.participantName ?? "Sin asignar"}
        {continuesAfter && " →"}
      </p>
      {!compact && (
        <>
          <p className="truncate text-[11px] leading-4 text-muted-foreground">
            {shift.teamName}
          </p>
          <p className="truncate text-[11px] leading-4 tabular-nums text-muted-foreground">
            {formatShiftRange(shift.startsAt, shift.endsAt)}
          </p>
        </>
      )}
    </article>
  );
}
