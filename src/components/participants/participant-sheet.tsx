"use client";

import { ExternalLink } from "lucide-react";

import { SkillChips } from "@/components/shared/skill-badges";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useServerAction } from "@/hooks/use-server-action";
import { PARTICIPANT_STATUSES, PARTICIPANT_STATUS_META } from "@/lib/constants";
import { updateParticipantAction } from "@/server/actions/participants";
import type { ParticipantView } from "@/server/services/participants";

interface ParticipantSheetProps {
  participant: ParticipantView | null;
  teams: { id: string; name: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NO_TEAM = "none";

export function ParticipantSheet({
  participant,
  teams,
  open,
  onOpenChange,
}: ParticipantSheetProps) {
  const { run, isPending } = useServerAction(updateParticipantAction, {
    onSuccess: () => onOpenChange(false),
  });

  if (!participant) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-lg">
        <SheetHeader className="border-b">
          <div className="flex items-center gap-3">
            <UserAvatar
              name={participant.name}
              avatarUrl={participant.avatarUrl}
              className="size-10"
              ringColor={participant.team?.color}
            />
            <div className="min-w-0">
              <SheetTitle className="truncate">{participant.name}</SheetTitle>
              <SheetDescription className="truncate">
                @{participant.username} · {participant.discordId}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <form action={run} className="flex flex-1 flex-col">
          <input type="hidden" name="id" value={participant.id} />

          <div className="space-y-5 p-4">
            <div className="space-y-1.5">
              <Label>Categorías</Label>
              <SkillChips skills={participant.skills} />
              <p className="text-xs text-muted-foreground">
                Se derivan de sus roles de Discord. Se configuran en Ajustes.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Equipo" htmlFor="teamId">
                <Select
                  name="teamId"
                  defaultValue={participant.team?.id ?? NO_TEAM}
                >
                  <SelectTrigger id="teamId" className="w-full">
                    <SelectValue placeholder="Sin equipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_TEAM}>Sin equipo</SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Estado" htmlFor="status">
                <Select name="status" defaultValue={participant.status}>
                  <SelectTrigger id="status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PARTICIPANT_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {PARTICIPANT_STATUS_META[status].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field
              label="Disponibilidad"
              htmlFor="availability"
              hint="Franjas horarias, restricciones, idioma…"
            >
              <Textarea
                id="availability"
                name="availability"
                rows={3}
                defaultValue={participant.availability ?? ""}
                placeholder="Ej. Tardes de 16:00 a 22:00 (CET). No disponible los domingos."
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Zona horaria" htmlFor="timezone">
                <Input
                  id="timezone"
                  name="timezone"
                  defaultValue={participant.timezone ?? ""}
                  placeholder="Europe/Madrid"
                />
              </Field>

              <Field label="Ticket privado" htmlFor="discordTicketUrl">
                <Input
                  id="discordTicketUrl"
                  name="discordTicketUrl"
                  type="url"
                  defaultValue={participant.discordTicketUrl ?? ""}
                  placeholder="https://discord.com/channels/…"
                />
              </Field>
            </div>

            <Field
              label="Notas internas"
              htmlFor="internalNotes"
              hint="Solo visible para la organización."
            >
              <Textarea
                id="internalNotes"
                name="internalNotes"
                rows={4}
                defaultValue={participant.internalNotes ?? ""}
              />
            </Field>

            {participant.discordTicketUrl && (
              <a
                href={participant.discordTicketUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 text-sm text-brand hover:underline"
              >
                Abrir ticket en Discord
                <ExternalLink className="size-3.5" />
              </a>
            )}
          </div>

          <SheetFooter className="mt-auto border-t">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Guardando…" : "Guardar cambios"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
