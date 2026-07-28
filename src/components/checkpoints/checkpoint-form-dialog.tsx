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
import { CHECKPOINT_STATUSES, CHECKPOINT_STATUS_META } from "@/lib/constants";
import {
  createCheckpointAction,
  updateCheckpointAction,
} from "@/server/actions/checkpoints";
import type { CheckpointView } from "@/server/services/checkpoints";

interface Option {
  id: string;
  label: string;
}

interface CheckpointFormDialogProps {
  teamId?: string;
  teams?: Option[];
  participants: Option[];
  shifts: Option[];
  checkpoint?: CheckpointView;
  trigger?: React.ReactNode;
}

const NONE = "none";

/** Registers or edits a delivery. Only links and metadata — never files. */
export function CheckpointFormDialog({
  teamId,
  teams,
  participants,
  shifts,
  checkpoint,
  trigger,
}: CheckpointFormDialogProps) {
  const [open, setOpen] = useState(false);

  const { run, isPending, errors } = useServerAction(
    checkpoint ? updateCheckpointAction : createCheckpointAction,
    { onSuccess: () => setOpen(false) },
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus className="size-3.5" />
            Registrar checkpoint
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {checkpoint
              ? `Editar checkpoint v${checkpoint.version}`
              : "Registrar checkpoint"}
          </DialogTitle>
          <DialogDescription>
            Se guardan únicamente los enlaces y los datos organizativos de la
            entrega. Los proyectos permanecen en Google Drive.
          </DialogDescription>
        </DialogHeader>

        <form action={run} className="space-y-4">
          {checkpoint && <input type="hidden" name="id" value={checkpoint.id} />}
          {teamId && <input type="hidden" name="teamId" value={teamId} />}

          {!teamId && teams && (
            <div className="space-y-1.5">
              <Label htmlFor="teamId">Equipo</Label>
              <Select
                name="teamId"
                defaultValue={checkpoint?.teamId}
                required
              >
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
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="participantId">Autor</Label>
              <Select
                name="participantId"
                defaultValue={checkpoint?.participantId ?? NONE}
              >
                <SelectTrigger id="participantId" className="w-full">
                  <SelectValue placeholder="Sin asignar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Sin asignar</SelectItem>
                  {participants.map((participant) => (
                    <SelectItem key={participant.id} value={participant.id}>
                      {participant.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="shiftId">Turno</Label>
              <Select
                name="shiftId"
                defaultValue={checkpoint?.shiftId ?? NONE}
              >
                <SelectTrigger id="shiftId" className="w-full">
                  <SelectValue placeholder="Sin turno" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Sin turno</SelectItem>
                  {shifts.map((shift) => (
                    <SelectItem key={shift.id} value={shift.id}>
                      {shift.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="driveUrl">Enlace a Google Drive</Label>
            <Input
              id="driveUrl"
              name="driveUrl"
              type="url"
              defaultValue={checkpoint?.driveUrl ?? ""}
              placeholder="https://drive.google.com/…"
            />
            {errors?.driveUrl && (
              <p className="text-xs text-destructive">
                {errors.driveUrl[0]}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="videoUrl">Enlace a la grabación</Label>
            <Input
              id="videoUrl"
              name="videoUrl"
              type="url"
              defaultValue={checkpoint?.videoUrl ?? ""}
              placeholder="https://youtube.com/…"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="submittedAt">Fecha y hora de entrega</Label>
              <Input
                id="submittedAt"
                name="submittedAt"
                type="datetime-local"
                defaultValue={toLocalInput(checkpoint?.submittedAt)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="durationMinutes">Duración (min)</Label>
              <Input
                id="durationMinutes"
                name="durationMinutes"
                type="number"
                min={0}
                defaultValue={checkpoint?.durationMinutes ?? ""}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="status">Estado</Label>
            <Select
              name="status"
              defaultValue={checkpoint?.status ?? "submitted"}
            >
              <SelectTrigger id="status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHECKPOINT_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {CHECKPOINT_STATUS_META[status].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="observations">Observaciones</Label>
            <Textarea
              id="observations"
              name="observations"
              rows={3}
              defaultValue={checkpoint?.observations ?? ""}
              placeholder="Qué se ha añadido en esta versión, incidencias…"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="internalNotes">Notas internas</Label>
            <Textarea
              id="internalNotes"
              name="internalNotes"
              rows={2}
              defaultValue={checkpoint?.internalNotes ?? ""}
            />
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
              {isPending ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** `datetime-local` needs a local-time string without timezone suffix. */
function toLocalInput(date: Date | null | undefined): string {
  if (!date) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
