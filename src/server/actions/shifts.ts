"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { formatRange } from "@/lib/format";
import {
  generateShiftsSchema,
  rescheduleShiftSchema,
  shiftInputSchema,
  shiftUpdateSchema,
} from "@/lib/validators";
import {
  createShift,
  deleteShift,
  generateRotation,
  getShift,
  updateShift,
} from "@/server/services/shifts";
import { cancelRemindersForShift } from "@/server/services/reminders";
import { logTimelineEvent } from "@/server/services/timeline";

import { fail, ok, runAction, type ActionState } from "./shared";

function revalidateShiftViews(teamId?: string) {
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  revalidatePath("/timeline");
  if (teamId) revalidatePath(`/teams/${teamId}`);
}

export async function createShiftAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const raw = Object.fromEntries(formData);
  if (raw.participantId === "" || raw.participantId === "none") {
    raw.participantId = null as never;
  }

  return runAction(shiftInputSchema, raw, async (values, context) => {
    const shift = await createShift({ eventId: context.event.id, ...values });

    await logTimelineEvent({
      eventId: context.event.id,
      type: "shift_scheduled",
      title: "Turno programado",
      description: formatRange(shift.startsAt, shift.endsAt),
      teamId: shift.teamId,
      participantId: shift.participantId,
      shiftId: shift.id,
      actorUserId: context.actorUserId,
    });

    revalidateShiftViews(shift.teamId);
    return ok(undefined, "Turno creado.");
  });
}

export async function updateShiftAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const raw = Object.fromEntries(formData);
  if (raw.participantId === "" || raw.participantId === "none") {
    raw.participantId = null as never;
  }

  return runAction(shiftUpdateSchema, raw, async ({ id, ...values }, context) => {
    const before = await getShift(context.event.id, id);
    if (!before) return fail("No se encontró el turno.");

    const shift = await updateShift(context.event.id, id, values);

    // Moving a shift invalidates any reminder that was already queued for it.
    if (values.startsAt || values.participantId !== undefined) {
      await cancelRemindersForShift(id);
    }

    if (values.status && values.status !== before.status) {
      await logTimelineEvent({
        eventId: context.event.id,
        type:
          values.status === "completed"
            ? "shift_completed"
            : values.status === "in_progress"
              ? "shift_started"
              : values.status === "delayed"
                ? "shift_delayed"
                : values.status === "cancelled"
                  ? "shift_cancelled"
                  : "shift_scheduled",
        title: `Turno de ${before.teamName}`,
        description: `Estado: ${before.status} → ${values.status}`,
        teamId: shift.teamId,
        participantId: shift.participantId,
        shiftId: shift.id,
        actorUserId: context.actorUserId,
      });
    }

    revalidateShiftViews(shift.teamId);
    return ok(undefined, "Turno actualizado.");
  });
}

/** Drag & drop handler for the calendar. */
export async function rescheduleShiftAction(input: {
  id: string;
  startsAt: string | Date;
  endsAt: string | Date;
  teamId?: string;
  participantId?: string | null;
}): Promise<ActionState> {
  return runAction(rescheduleShiftSchema, input, async (values, context) => {
    const before = await getShift(context.event.id, values.id);
    if (!before) return fail("No se encontró el turno.");

    const shift = await updateShift(context.event.id, values.id, {
      startsAt: values.startsAt,
      endsAt: values.endsAt,
      ...(values.teamId ? { teamId: values.teamId } : {}),
      ...(values.participantId !== undefined
        ? { participantId: values.participantId }
        : {}),
    });

    await cancelRemindersForShift(values.id);

    await logTimelineEvent({
      eventId: context.event.id,
      type: "shift_rescheduled",
      title: `Turno reprogramado · ${before.teamName}`,
      description: `${formatRange(before.startsAt, before.endsAt)} → ${formatRange(shift.startsAt, shift.endsAt)}`,
      teamId: shift.teamId,
      participantId: shift.participantId,
      shiftId: shift.id,
      actorUserId: context.actorUserId,
    });

    revalidateShiftViews(shift.teamId);
    return ok(undefined, "Turno reprogramado.");
  });
}

export async function deleteShiftAction(shiftId: string): Promise<ActionState> {
  return runAction(
    z.object({ shiftId: z.string().uuid() }),
    { shiftId },
    async (values, context) => {
      const before = await getShift(context.event.id, values.shiftId);
      await deleteShift(context.event.id, values.shiftId);
      revalidateShiftViews(before?.teamId);
      return ok(undefined, "Turno eliminado.");
    },
  );
}

/** Creates a full rotation of shifts for a team in one go. */
export async function generateRotationAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  return runAction(
    generateShiftsSchema,
    Object.fromEntries(formData),
    async (values, context) => {
      const created = await generateRotation({
        eventId: context.event.id,
        ...values,
      });

      if (!created.length) {
        return fail("El equipo no tiene participantes asignados.");
      }

      await logTimelineEvent({
        eventId: context.event.id,
        type: "shift_scheduled",
        title: `${created.length} turnos generados`,
        description: `Rotación automática · ${values.rounds} ronda(s) de ${values.shiftMinutes} min`,
        teamId: values.teamId,
        actorUserId: context.actorUserId,
      });

      revalidateShiftViews(values.teamId);
      return ok(undefined, `${created.length} turnos creados.`);
    },
  );
}
