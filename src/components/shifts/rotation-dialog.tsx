"use client";

import { useState } from "react";
import { Wand2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useServerAction } from "@/hooks/use-server-action";
import { generateRotationAction } from "@/server/actions/shifts";

interface RotationDialogProps {
  teamId: string;
  defaultShiftMinutes: number;
  participantCount: number;
}

/**
 * Generates one shift per participant, chained back-to-back, following the
 * rotation order defined on the team board.
 */
export function RotationDialog({
  teamId,
  defaultShiftMinutes,
  participantCount,
}: RotationDialogProps) {
  const [open, setOpen] = useState(false);
  const { run, isPending } = useServerAction(generateRotationAction, {
    onSuccess: () => setOpen(false),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={participantCount === 0}>
          <Wand2 className="size-3.5" />
          Generar rotación
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generar rotación de turnos</DialogTitle>
          <DialogDescription>
            Se creará un turno por participante ({participantCount} en este
            equipo) siguiendo el orden establecido en el tablero.
          </DialogDescription>
        </DialogHeader>

        <form action={run} className="space-y-4">
          <input type="hidden" name="teamId" value={teamId} />

          <div className="space-y-1.5">
            <Label htmlFor="startsAt">Inicio del primer turno</Label>
            <Input
              id="startsAt"
              name="startsAt"
              type="datetime-local"
              required
              defaultValue={nextRoundHour()}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="shiftMinutes">Duración (min)</Label>
              <Input
                id="shiftMinutes"
                name="shiftMinutes"
                type="number"
                min={5}
                required
                defaultValue={defaultShiftMinutes}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gapMinutes">Descanso (min)</Label>
              <Input
                id="gapMinutes"
                name="gapMinutes"
                type="number"
                min={0}
                defaultValue={0}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rounds">Rondas</Label>
              <Input
                id="rounds"
                name="rounds"
                type="number"
                min={1}
                max={20}
                defaultValue={1}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Generando…" : "Generar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function nextRoundHour(): string {
  const date = new Date();
  date.setMinutes(0, 0, 0);
  date.setHours(date.getHours() + 1);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
