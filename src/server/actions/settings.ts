"use server";

import { revalidatePath } from "next/cache";

import { settingsSchema } from "@/lib/validators";
import { requireAdmin } from "@/server/auth/guard";
import { updateEvent, updateEventSettings } from "@/server/services/events";

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

  return runAction(settingsSchema, raw, async (values, context) => {
    await requireAdmin();

    await updateEvent(context.event.id, {
      name: values.name,
      description: values.description,
      status: values.status,
      timezone: values.timezone,
      defaultShiftMinutes: values.defaultShiftMinutes,
      startsAt: values.startsAt ?? null,
      endsAt: values.endsAt ?? null,
      discordGuildId: values.discordGuildId,
    });

    await updateEventSettings(context.event.id, {
      adminRoleIds: values.adminRoleIds,
      moderatorRoleIds: values.moderatorRoleIds,
      participantRoleIds: values.participantRoleIds,
      reminderOffsets: values.reminderOffsets,
      remindersEnabled: values.remindersEnabled,
      autoSyncEnabled: values.autoSyncEnabled,
      ticketUrlTemplate: values.ticketUrlTemplate,
      driveRootUrl: values.driveRootUrl,
    });

    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return ok(undefined, "Configuración guardada.");
  });
}
