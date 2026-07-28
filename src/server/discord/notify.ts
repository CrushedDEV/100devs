import "server-only";

import { formatInTimeZone } from "@/lib/format";
import { sendDirectMessage } from "./client";

interface ShiftReminderPayload {
  discordId: string;
  displayName: string;
  teamName: string;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  minutesBefore: number;
  driveFolderUrl?: string | null;
}

/** "Your shift starts in X minutes" DM. */
export async function sendShiftReminder(
  payload: ShiftReminderPayload,
): Promise<void> {
  const start = formatInTimeZone(payload.startsAt, payload.timezone, "HH:mm");
  const end = formatInTimeZone(payload.endsAt, payload.timezone, "HH:mm");

  const lines = [
    `👋 **${payload.displayName}**, tu turno empieza en **${payload.minutesBefore} minutos**.`,
    "",
    `**Equipo:** ${payload.teamName}`,
    `**Horario:** ${start} → ${end} (${payload.timezone})`,
  ];

  if (payload.driveFolderUrl) {
    lines.push(`**Proyecto:** ${payload.driveFolderUrl}`);
  }

  lines.push(
    "",
    "Recuerda descargar la última versión antes de empezar y subir la tuya al terminar.",
  );

  await sendDirectMessage(payload.discordId, lines.join("\n"));
}

/** "Your shift starts now" DM. */
export async function sendShiftStartNotice(
  payload: Omit<ShiftReminderPayload, "minutesBefore">,
): Promise<void> {
  const end = formatInTimeZone(payload.endsAt, payload.timezone, "HH:mm");

  const lines = [
    `🚀 **${payload.displayName}**, ¡tu turno acaba de empezar!`,
    "",
    `**Equipo:** ${payload.teamName}`,
    `**Entrega antes de las:** ${end} (${payload.timezone})`,
  ];

  if (payload.driveFolderUrl) {
    lines.push(`**Carpeta del proyecto:** ${payload.driveFolderUrl}`);
  }

  lines.push("", "Cuando termines, sube tu build y avisa en tu ticket privado.");

  await sendDirectMessage(payload.discordId, lines.join("\n"));
}
