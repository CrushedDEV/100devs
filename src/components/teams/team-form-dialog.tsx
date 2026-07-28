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
import { TEAM_COLORS, TEAM_STATUSES, TEAM_STATUS_META } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { createTeamAction, updateTeamAction } from "@/server/actions/teams";
import type { Team } from "@/server/db/schema";

interface TeamFormDialogProps {
  team?: Team;
  trigger?: React.ReactNode;
}

/** Shared create/edit dialog — the mode is inferred from `team`. */
export function TeamFormDialog({ team, trigger }: TeamFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [color, setColor] = useState(team?.color ?? TEAM_COLORS[0]);

  const { run, isPending, errors } = useServerAction(
    team ? updateTeamAction : createTeamAction,
    { onSuccess: () => setOpen(false) },
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus className="size-3.5" />
            Nuevo equipo
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{team ? "Editar equipo" : "Nuevo equipo"}</DialogTitle>
          <DialogDescription>
            El color identifica al equipo en el dashboard, el calendario y la
            timeline.
          </DialogDescription>
        </DialogHeader>

        <form action={run} className="space-y-4">
          {team && <input type="hidden" name="id" value={team.id} />}
          <input type="hidden" name="color" value={color} />

          <div className="space-y-1.5">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              name="name"
              required
              minLength={2}
              defaultValue={team?.name}
              placeholder="Equipo Alfa"
            />
            {errors?.name && (
              <p className="text-xs text-destructive">{errors.name[0]}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              name="description"
              rows={2}
              defaultValue={team?.description ?? ""}
              placeholder="Género del juego, temática, notas de organización…"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-1.5">
              {TEAM_COLORS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setColor(value)}
                  aria-label={`Color ${value}`}
                  aria-pressed={color === value}
                  className={cn(
                    "size-7 rounded-lg ring-offset-2 ring-offset-background transition-all",
                    color === value
                      ? "ring-2 ring-foreground"
                      : "hover:scale-110",
                  )}
                  style={{ backgroundColor: value }}
                />
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="status">Estado</Label>
              <Select name="status" defaultValue={team?.status ?? "active"}>
                <SelectTrigger id="status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEAM_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {TEAM_STATUS_META[status].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="discordChannelId">Canal de Discord</Label>
              <Input
                id="discordChannelId"
                name="discordChannelId"
                defaultValue={team?.discordChannelId ?? ""}
                placeholder="ID del canal"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="driveFolderUrl">Carpeta de Google Drive</Label>
            <Input
              id="driveFolderUrl"
              name="driveFolderUrl"
              type="url"
              defaultValue={team?.driveFolderUrl ?? ""}
              placeholder="https://drive.google.com/drive/folders/…"
            />
            {errors?.driveFolderUrl && (
              <p className="text-xs text-destructive">
                {errors.driveFolderUrl[0]}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="internalNotes">Notas internas</Label>
            <Textarea
              id="internalNotes"
              name="internalNotes"
              rows={3}
              defaultValue={team?.internalNotes ?? ""}
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
              {isPending ? "Guardando…" : team ? "Guardar" : "Crear equipo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
