"use client";

import { format, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Check, CircleHelp, X, type LucideIcon } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SHIFT_CONFIRMATIONS,
  SHIFT_CONFIRMATION_META,
  SHIFT_STATUS_META,
  type ShiftConfirmation,
} from "@/lib/constants";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ShiftView } from "@/server/services/shifts";

export type ConfirmationChangeHandler = (
  shift: ShiftView,
  confirmation: ShiftConfirmation,
) => void;

interface ShiftBlockProps {
  shift: ShiftView;
  /** Absolute placement inside a week-view day column. */
  style?: React.CSSProperties;
  compact?: boolean;
  /** The bar is cut by the edge of the visible range on that side. */
  continuesBefore?: boolean;
  continuesAfter?: boolean;
  onOpen?: (shift: ShiftView) => void;
  onConfirmationChange?: ConfirmationChangeHandler;
}

export function DraggableShiftBlock({
  shift,
  style,
  compact,
  continuesBefore,
  continuesAfter,
  onOpen,
  onConfirmationChange,
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
        onConfirmationChange={onConfirmationChange}
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
  onConfirmationChange,
}: {
  shift: ShiftView;
  compact?: boolean;
  overlay?: boolean;
  continuesBefore?: boolean;
  continuesAfter?: boolean;
  onConfirmationChange?: ConfirmationChangeHandler;
}) {
  const meta = SHIFT_STATUS_META[shift.status];
  const confirmation = SHIFT_CONFIRMATION_META[shift.confirmation];
  const muted = shift.status === "cancelled" || shift.confirmation === "declined";

  return (
    <article
      className={cn(
        "relative h-full cursor-grab overflow-hidden rounded-md border-l-2 text-left transition-shadow select-none active:cursor-grabbing",
        compact ? "px-1.5 py-1" : "px-2 py-1.5",
        overlay ? "shadow-xl" : "hover:shadow-md",
        muted && "opacity-50",
        // Unconfirmed dates read as a draft.
        shift.confirmation === "pending" &&
          "outline-1 -outline-offset-1 outline-warning/40 outline-dashed",
        continuesBefore && "rounded-l-none border-l-0",
        continuesAfter && "rounded-r-none",
      )}
      style={{
        borderLeftColor: shift.teamColor,
        backgroundColor: `${shift.teamColor}1f`,
      }}
      title={`${shift.teamName} · ${shift.participantName ?? "Sin asignar"} · ${meta.label} · ${confirmation.label}`}
    >
      <div className="flex items-start gap-1">
        <p
          className={cn(
            "min-w-0 flex-1 truncate font-medium",
            compact ? "text-[11px] leading-tight" : "text-xs leading-4",
            shift.confirmation === "declined" && "line-through",
          )}
        >
          {continuesBefore && "← "}
          {shift.participantName ?? "Sin asignar"}
          {continuesAfter && " →"}
        </p>
        <ConfirmationControl
          shift={shift}
          compact={compact}
          onChange={overlay ? undefined : onConfirmationChange}
        />
      </div>
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

const CONFIRMATION_ICONS: Record<ShiftConfirmation, LucideIcon> = {
  pending: CircleHelp,
  confirmed: Check,
  declined: X,
};

const CONFIRMATION_STYLES: Record<ShiftConfirmation, string> = {
  pending: "bg-warning/15 text-warning ring-warning/30",
  confirmed: "bg-success/15 text-success ring-success/30",
  declined: "bg-destructive/12 text-destructive ring-destructive/25",
};

/**
 * Chip with the confirmation state; when editable it opens a menu to change
 * it. Pointer events stop here so pressing the chip never starts a drag.
 */
function ConfirmationControl({
  shift,
  compact,
  onChange,
}: {
  shift: ShiftView;
  compact: boolean;
  onChange?: ConfirmationChangeHandler;
}) {
  const Icon = CONFIRMATION_ICONS[shift.confirmation];
  const label = SHIFT_CONFIRMATION_META[shift.confirmation].label;

  const chip = (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 rounded-full ring-1 ring-inset",
        compact ? "size-3.5 justify-center" : "h-4 px-1.5 text-[10px] font-medium",
        CONFIRMATION_STYLES[shift.confirmation],
        onChange && "cursor-pointer transition-opacity hover:opacity-80",
      )}
    >
      <Icon className={compact ? "size-2.5" : "size-3"} strokeWidth={2.5} />
      {!compact && label}
    </span>
  );

  if (!onChange) return chip;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Confirmación: ${label}. Cambiar`}
        className="shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onPointerDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        {chip}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel className="text-xs">
          ¿Le vienen bien las fechas?
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={shift.confirmation}
          onValueChange={(value) =>
            onChange(shift, value as ShiftConfirmation)
          }
        >
          {SHIFT_CONFIRMATIONS.map((value) => {
            const ItemIcon = CONFIRMATION_ICONS[value];
            return (
              <DropdownMenuRadioItem key={value} value={value}>
                <ItemIcon className="size-3.5" />
                {SHIFT_CONFIRMATION_META[value].label}
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
