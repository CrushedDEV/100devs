"use server";

import { revalidatePath } from "next/cache";

import { settingsSchema } from "@/lib/validators";
import {
  getActiveEvent,
  updateEvent,
  updateEventSettings,
} from "@/server/services/events";

import { ok, runAction, type ActionState } from "./shared";

export async function updateSettingsAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const raw = Object.fromEntries(formData) as Record<string, unknown>;

  // Unchecked checkboxes are absent from FormData.
  raw.remindersEnabled = formData.get("remindersEnabled") === "on";
  raw.autoSyncEnabled = formData.get("autoSyncEnabled") === "on";
  if (raw.startsAt === "") raw.startsAt = null;
  if (raw.endsAt === "") raw.endsAt = null;

  // Skill mappings arrive as `skill.<key>`; "none" means "not linked".
  const skillRoleIds: Record<string, string> = {};
  for (const [field, value] of formData.entries()) {
    if (!field.startsWith("skill.") || typeof value !== "string") continue;
    if (!value || value === "none") continue;
    skillRoleIds[field.slice("skill.".length)] = value;
    delete raw[field];
  }
  raw.skillRoleIds = skillRoleIds;

  // Admin-only inputs are rendered disabled for moderators, so the browser
  // omits them. Fill them from the stored values to satisfy validation; the
  // handler ignores them for non-admins regardless of what arrives here.
  const { settings: current, event: currentEvent } = await getActiveEvent();
  raw.discordGuildId ??= currentEvent.discordGuildId;
  raw.adminRoleIds ??= current.adminRoleIds.join(",");
  raw.moderatorRoleIds ??= current.moderatorRoleIds.join(",");

  return runAction(settingsSchema, raw, async (values, context) => {
    // Moderators may configure the event, but not who gets into the panel:
    // the guild and the staff role ids stay under administrator control.
    // Enforced here rather than in the UI, since disabled inputs are trivial
    // to bypass.
    const isAdmin = context.session.user.role === "admin";

    await updateEvent(context.event.id, {
      name: values.name,
      description: values.description,
      status: values.status,
      timezone: values.timezone,
      defaultShiftMinutes: values.defaultShiftMinutes,
      startsAt: values.startsAt ?? null,
      endsAt: values.endsAt ?? null,
      ...(isAdmin ? { discordGuildId: values.discordGuildId } : {}),
    });

    await updateEventSettings(context.event.id, {
      ...(isAdmin
        ? {
            adminRoleIds: values.adminRoleIds,
            moderatorRoleIds: values.moderatorRoleIds,
          }
        : {}),
      participantRoleIds: values.participantRoleIds,
      reminderOffsets: values.reminderOffsets,
      remindersEnabled: values.remindersEnabled,
      autoSyncEnabled: values.autoSyncEnabled,
      skillRoleIds: values.skillRoleIds,
      ticketUrlTemplate: values.ticketUrlTemplate,
      driveRootUrl: values.driveRootUrl,
    });

    revalidatePath("/settings");
    revalidatePath("/dashboard");
    revalidatePath("/participants");
    return ok(undefined, "Configuración guardada.");
  });
}
