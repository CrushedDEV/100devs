"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useServerAction } from "@/hooks/use-server-action";
import { createShiftAction } from "@/server/actions/shifts";

interface Option {
  id: string;
  label: string;
  teamId?: string;
}

interface ShiftFormDialogProps {
  teams: Option[];
  participants: Option[];
  defaultShiftMinutes: number;
}

const NONE = "none";

export function ShiftFormDialog({
  teams,
  participants,
  defaultShiftMinutes,
}: ShiftFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [teamId, setTeamId] = useState<string | undefined>(teams[0]?.id);
  const [startsAt, setStartsAt] = useState(() => nextRoundHour());

  const { run, isPending, errors } = useServerAction(createShiftAction, {
    onSuccess: () => setOpen(false),
  });

  const teamMembers = participants.filter(
    (participant) => !teamId || participant.teamId === teamId,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={!teams.length}>
          <Plus className="size-3.5" />
          Nuevo turno
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo turno</DialogTitle>
          <DialogDescription>
            Asigna un participante a una franja horaria. Después podrás moverlo
            arrastrándolo en el calendario.
          </DialogDescription>
        </DialogHeader>

        <form action={run} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="teamId">Equipo</Label>
            <Select name="teamId" value={teamId} onValueChange={setTeamId}>
              <SelectTrigger id="teamId" className="w-full">
                <SelectValue placeholder="Selecciona un equipo" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="participantId">Participante</Label>
            <Select name="participantId" defaultValue={NONE}>
              <SelectTrigger id="participantId" className="w-full">
                <SelectValue placeholder="Sin asignar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Sin asignar</SelectItem>
                {teamMembers.map((participant) => (
                  <SelectItem key={participant.id} value={participant.id}>
                    {participant.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="startsAt">Inicio</Label>
              <Input
                id="startsAt"
                name="startsAt"
                type="datetime-local"
                required
                value={startsAt}
                onChange={(event) => setStartsAt(event.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="endsAt">Fin</Label>
              <Input
                id="endsAt"
                name="endsAt"
                type="datetime-local"
                required
                defaultValue={addMinutesToInput(startsAt, defaultShiftMinutes)}
                key={startsAt}
              />
            </div>
          </div>
          {errors?.endsAt && (
            <p className="text-xs text-destructive">{errors.endsAt[0]}</p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" name="notes" rows={2} />
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
              {isPending ? "Creando…" : "Crear turno"}
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
  return toInputValue(date);
}

function addMinutesToInput(value: string, minutes: number): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  date.setMinutes(date.getMinutes() + minutes);
  return toInputValue(date);
}

function toInputValue(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
