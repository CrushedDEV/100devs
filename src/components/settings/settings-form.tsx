"use client";

import { Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useServerAction } from "@/hooks/use-server-action";
import {
  EVENT_STATUSES,
  EVENT_STATUS_META,
  SKILLS,
  suggestSkillRoles,
} from "@/lib/constants";
import { updateSettingsAction } from "@/server/actions/settings";
import type { Event, EventSettings } from "@/server/db/schema";

interface SettingsFormProps {
  event: Event;
  settings: EventSettings;
  guildRoles: { id: string; name: string }[];
  canEdit: boolean;
}

const NO_ROLE = "none";

export function SettingsForm({
  event,
  settings,
  guildRoles,
  canEdit,
}: SettingsFormProps) {
  const { run, isPending, errors } = useServerAction(updateSettingsAction);

  // Roles whose name matches a category are pre-selected, so an organiser who
  // named them consistently only has to press save.
  const suggested = suggestSkillRoles(guildRoles);

  return (
    <form action={run} className="space-y-6">
      <fieldset disabled={!canEdit || isPending} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Evento</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre" htmlFor="name" error={errors?.name}>
              <Input id="name" name="name" defaultValue={event.name} required />
            </Field>

            <Field label="Estado" htmlFor="status">
              <Select name="status" defaultValue={event.status}>
                <SelectTrigger id="status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {EVENT_STATUS_META[status].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Descripción" htmlFor="description" className="sm:col-span-2">
              <Textarea
                id="description"
                name="description"
                rows={2}
                defaultValue={event.description ?? ""}
              />
            </Field>

            <Field label="Inicio" htmlFor="startsAt">
              <Input
                id="startsAt"
                name="startsAt"
                type="datetime-local"
                defaultValue={toLocalInput(event.startsAt)}
              />
            </Field>

            <Field label="Fin" htmlFor="endsAt">
              <Input
                id="endsAt"
                name="endsAt"
                type="datetime-local"
                defaultValue={toLocalInput(event.endsAt)}
              />
            </Field>

            <Field
              label="Zona horaria"
              htmlFor="timezone"
              hint="Usada en los recordatorios de Discord."
            >
              <Input
                id="timezone"
                name="timezone"
                defaultValue={event.timezone}
                placeholder="Europe/Madrid"
              />
            </Field>

            <Field
              label="Duración de turno por defecto (min)"
              htmlFor="defaultShiftMinutes"
            >
              <Input
                id="defaultShiftMinutes"
                name="defaultShiftMinutes"
                type="number"
                min={5}
                defaultValue={event.defaultShiftMinutes}
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Servidor de Discord</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field
              label="ID del servidor (guild)"
              htmlFor="discordGuildId"
              error={errors?.discordGuildId}
              hint="Con el modo desarrollador activado en Discord: clic derecho sobre el icono del servidor → Copiar ID del servidor."
            >
              <Input
                id="discordGuildId"
                name="discordGuildId"
                defaultValue={event.discordGuildId}
                placeholder="123456789012345678"
                required
              />
            </Field>

            <p className="rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
              Cambiar este ID hace que la sincronización y el control de acceso
              pasen a comprobarse contra el nuevo servidor. Los IDs de rol de
              abajo deben pertenecer a ese mismo servidor, o nadie podrá
              sincronizarse ni entrar al panel.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Roles de Discord</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Introduce los IDs de rol separados por comas. La sincronización
              importa automáticamente a los miembros que los tengan asignados.
            </p>

            <Field
              label="Administradores"
              htmlFor="adminRoleIds"
              error={errors?.adminRoleIds}
            >
              <Input
                id="adminRoleIds"
                name="adminRoleIds"
                defaultValue={settings.adminRoleIds.join(", ")}
                placeholder="123456789012345678, …"
              />
            </Field>

            <Field
              label="Moderadores"
              htmlFor="moderatorRoleIds"
              error={errors?.moderatorRoleIds}
            >
              <Input
                id="moderatorRoleIds"
                name="moderatorRoleIds"
                defaultValue={settings.moderatorRoleIds.join(", ")}
              />
            </Field>

            <Field
              label="Participantes"
              htmlFor="participantRoleIds"
              error={errors?.participantRoleIds}
            >
              <Input
                id="participantRoleIds"
                name="participantRoleIds"
                defaultValue={settings.participantRoleIds.join(", ")}
              />
            </Field>

            <Toggle
              name="autoSyncEnabled"
              label="Sincronización automática"
              hint="Ejecuta la importación de miembros cada 15 minutos."
              defaultChecked={settings.autoSyncEnabled}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Categorías de participante</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Vincula cada categoría con un rol de Discord. Los participantes
              que tengan ese rol mostrarán su distintivo automáticamente y
              podrán filtrarse por él. Una misma persona puede tener varias.
            </p>

            {guildRoles.length === 0 ? (
              <p className="rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
                No se han podido cargar los roles del servidor. Revisa el ID del
                servidor y que el bot siga invitado; después recarga esta página.
              </p>
            ) : (
              <div className="grid gap-2.5">
                {SKILLS.map((skill) => {
                  const current =
                    settings.skillRoleIds[skill.key] ??
                    suggested[skill.key] ??
                    NO_ROLE;

                  const isSuggestion =
                    !settings.skillRoleIds[skill.key] && Boolean(suggested[skill.key]);

                  return (
                    <div
                      key={skill.key}
                      className="grid items-center gap-2 sm:grid-cols-[1fr_1.4fr]"
                    >
                      <Label
                        htmlFor={`skill.${skill.key}`}
                        className="flex items-center gap-2"
                      >
                        {skill.label}
                        {isSuggestion && (
                          <span className="rounded-full bg-warning/15 px-1.5 py-0.5 text-[10px] font-medium text-warning">
                            sin guardar
                          </span>
                        )}
                      </Label>

                      <Select
                        name={`skill.${skill.key}`}
                        defaultValue={current}
                      >
                        <SelectTrigger
                          id={`skill.${skill.key}`}
                          size="sm"
                          className="w-full"
                        >
                          <SelectValue placeholder="Sin vincular" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NO_ROLE}>Sin vincular</SelectItem>
                          {guildRoles.map((role) => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recordatorios y enlaces</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Toggle
              name="remindersEnabled"
              label="Recordatorios por mensaje directo"
              hint="Avisa a cada participante antes de su turno y cuando comienza."
              defaultChecked={settings.remindersEnabled}
            />

            <Field
              label="Minutos de antelación"
              htmlFor="reminderOffsets"
              hint="Separados por comas. Ej: 60, 15"
            >
              <Input
                id="reminderOffsets"
                name="reminderOffsets"
                defaultValue={settings.reminderOffsets.join(", ")}
              />
            </Field>

            <Field
              label="Plantilla de ticket privado"
              htmlFor="ticketUrlTemplate"
              hint="Opcional. Puedes usar {discordId} como marcador."
            >
              <Input
                id="ticketUrlTemplate"
                name="ticketUrlTemplate"
                defaultValue={settings.ticketUrlTemplate ?? ""}
                placeholder="https://discord.com/channels/GUILD/{discordId}"
              />
            </Field>

            <Field
              label="Carpeta raíz de Google Drive"
              htmlFor="driveRootUrl"
              error={errors?.driveRootUrl}
            >
              <Input
                id="driveRootUrl"
                name="driveRootUrl"
                type="url"
                defaultValue={settings.driveRootUrl ?? ""}
                placeholder="https://drive.google.com/drive/folders/…"
              />
            </Field>
          </CardContent>
        </Card>

        {canEdit && (
          <div className="flex justify-end">
            <Button type="submit" disabled={isPending}>
              <Save className="size-3.5" />
              {isPending ? "Guardando…" : "Guardar configuración"}
            </Button>
          </div>
        )}
      </fieldset>

      {!canEdit && (
        <p className="text-sm text-muted-foreground">
          Solo los administradores pueden modificar la configuración del evento.
        </p>
      )}
    </form>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  error,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string[];
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error?.[0] && <p className="text-xs text-destructive">{error[0]}</p>}
    </div>
  );
}

function Toggle({
  name,
  label,
  hint,
  defaultChecked,
}: {
  name: string;
  label: string;
  hint: string;
  defaultChecked: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg bg-muted/40 px-3 py-2.5">
      <div className="space-y-0.5">
        <Label htmlFor={name}>{label}</Label>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <Switch id={name} name={name} defaultChecked={defaultChecked} />
    </div>
  );
}

function toLocalInput(date: Date | null): string {
  if (!date) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
