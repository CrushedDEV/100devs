"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addDays,
  addMinutes,
  addMonths,
  format,
  setHours,
  setMinutes,
} from "date-fns";
import { es } from "date-fns/locale";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { rescheduleShiftAction } from "@/server/actions/shifts";
import type { ShiftView } from "@/server/services/shifts";

import {
  daysBetween,
  monthRange,
  parseSlotId,
  shiftDurationMinutes,
  weekRange,
  type CalendarMode,
} from "./calendar-utils";
import { MonthView } from "./month-view";
import { ShiftBlock } from "./shift-block";
import { WeekView } from "./week-view";

interface CalendarViewProps {
  shifts: ShiftView[];
  teams: { id: string; name: string; color: string }[];
}

const ALL_TEAMS = "all";

export function CalendarView({ shifts, teams }: CalendarViewProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [mode, setMode] = useState<CalendarMode>("week");
  const [anchor, setAnchor] = useState(() => new Date());
  const [teamFilter, setTeamFilter] = useState(ALL_TEAMS);
  const [dragging, setDragging] = useState<ShiftView | null>(null);
  const [optimistic, setOptimistic] = useState<Record<string, ShiftView>>({});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const range = mode === "week" ? weekRange(anchor) : monthRange(anchor);
  const days = useMemo(
    () => daysBetween(range.start, range.end),
    [range.start, range.end],
  );

  const visibleShifts = useMemo(() => {
    return shifts
      .map((shift) => optimistic[shift.id] ?? shift)
      .filter((shift) => {
        if (teamFilter !== ALL_TEAMS && shift.teamId !== teamFilter) return false;
        return shift.startsAt >= range.start && shift.startsAt <= range.end;
      });
  }, [shifts, optimistic, teamFilter, range.start, range.end]);

  const onDragStart = (event: DragStartEvent) => {
    setDragging((event.active.data.current?.shift as ShiftView) ?? null);
  };

  const onDragEnd = (event: DragEndEvent) => {
    const shift = dragging;
    setDragging(null);

    if (!event.over || !shift) return;

    const slot = parseSlotId(String(event.over.id));
    if (!slot) return;

    const duration = shiftDurationMinutes(shift.startsAt, shift.endsAt);

    // hour === -1 comes from the month grid: keep the original time of day.
    const startsAt =
      slot.hour === -1
        ? setMinutes(
            setHours(slot.day, shift.startsAt.getHours()),
            shift.startsAt.getMinutes(),
          )
        : setMinutes(
            setHours(slot.day, slot.hour),
            shift.startsAt.getMinutes(),
          );

    if (startsAt.getTime() === shift.startsAt.getTime()) return;

    const endsAt = addMinutes(startsAt, duration);
    setOptimistic((current) => ({
      ...current,
      [shift.id]: { ...shift, startsAt, endsAt },
    }));

    startTransition(async () => {
      const result = await rescheduleShiftAction({
        id: shift.id,
        startsAt,
        endsAt,
      });

      if (result.ok) {
        toast.success("Turno reprogramado", {
          description: `${shift.participantName ?? "Turno"} → ${format(startsAt, "d MMM HH:mm", { locale: es })}`,
        });
      } else {
        toast.error(result.message ?? "No se pudo reprogramar");
        setOptimistic((current) => {
          const next = { ...current };
          delete next[shift.id];
          return next;
        });
      }
      router.refresh();
    });
  };

  const step = (direction: 1 | -1) => {
    setAnchor((current) =>
      mode === "week"
        ? addDays(current, direction * 7)
        : addMonths(current, direction),
    );
  };

  const title =
    mode === "week"
      ? `${format(range.start, "d MMM", { locale: es })} – ${format(range.end, "d MMM yyyy", { locale: es })}`
      : format(anchor, "MMMM yyyy", { locale: es });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => step(-1)}
            aria-label="Periodo anterior"
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => step(1)}
            aria-label="Periodo siguiente"
          >
            <ChevronRight />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setAnchor(new Date())}>
            Hoy
          </Button>
        </div>

        <p className="font-heading text-sm font-medium capitalize">{title}</p>

        <div className="ml-auto flex items-center gap-2">
          <Select value={teamFilter} onValueChange={setTeamFilter}>
            <SelectTrigger size="sm" className="w-44">
              <SelectValue placeholder="Equipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_TEAMS}>Todos los equipos</SelectItem>
              {teams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex rounded-lg bg-muted p-0.5">
            {(["week", "month"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                aria-pressed={mode === value}
                className={
                  mode === value
                    ? "rounded-md bg-background px-2.5 py-1 text-xs font-medium shadow-sm"
                    : "rounded-md px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                }
              >
                {value === "week" ? "Semana" : "Mes"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        {mode === "week" ? (
          <WeekView days={days} shifts={visibleShifts} />
        ) : (
          <MonthView days={days} anchor={anchor} shifts={visibleShifts} />
        )}

        <DragOverlay dropAnimation={null}>
          {dragging && (
            <div className="w-40">
              <ShiftBlock shift={dragging} overlay />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <p className="text-xs text-muted-foreground">
        Arrastra un turno para reprogramarlo. En la vista mensual se conserva la
        hora original; en la semanal se ajusta a la franja de destino.
      </p>
    </div>
  );
}
