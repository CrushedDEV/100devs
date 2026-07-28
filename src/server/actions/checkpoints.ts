"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { checkpointInputSchema, checkpointUpdateSchema } from "@/lib/validators";
import {
  createCheckpoint,
  deleteCheckpoint,
  updateCheckpoint,
} from "@/server/services/checkpoints";
import { updateShift } from "@/server/services/shifts";
import { logTimelineEvent } from "@/server/services/timeline";

import { ok, runAction, type ActionState } from "./shared";

function revalidateCheckpointViews(teamId?: string) {
  revalidatePath("/checkpoints");
  revalidatePath("/dashboard");
  revalidatePath("/timeline");
  revalidatePath("/stats");
  if (teamId) revalidatePath(`/teams/${teamId}`);
}

function normalise(formData: FormData): Record<string, unknown> {
  const raw = Object.fromEntries(formData) as Record<string, unknown>;
  for (const key of ["shiftId", "participantId"]) {
    if (raw[key] === "" || raw[key] === "none") raw[key] = null;
  }
  if (raw.durationMinutes === "") raw.durationMinutes = null;
  if (raw.submittedAt === "") raw.submittedAt = null;
  return raw;
}

export async function createCheckpointAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  return runAction(
    checkpointInputSchema,
    normalise(formData),
    async (values, context) => {
      const checkpoint = await createCheckpoint({
        eventId: context.event.id,
        ...values,
      });

      // Delivering a checkpoint closes its shift.
      if (checkpoint.shiftId) {
        await updateShift(context.event.id, checkpoint.shiftId, {
          status: "completed",
          actualEndAt: checkpoint.submittedAt ?? new Date(),
        });
      }

      await logTimelineEvent({
        eventId: context.event.id,
        type: values.status === "late" ? "checkpoint_late" : "checkpoint_submitted",
        title: `Checkpoint v${checkpoint.version} entregado`,
        description: values.observations,
        teamId: checkpoint.teamId,
        participantId: checkpoint.participantId,
        shiftId: checkpoint.shiftId,
        checkpointId: checkpoint.id,
        actorUserId: context.actorUserId,
        metadata: { driveUrl: checkpoint.driveUrl, videoUrl: checkpoint.videoUrl },
      });

      revalidateCheckpointViews(checkpoint.teamId);
      return ok(undefined, `Checkpoint v${checkpoint.version} registrado.`);
    },
  );
}

export async function updateCheckpointAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  return runAction(
    checkpointUpdateSchema,
    normalise(formData),
    async ({ id, ...values }, context) => {
      const checkpoint = await updateCheckpoint(context.event.id, id, values);

      await logTimelineEvent({
        eventId: context.event.id,
        type: "checkpoint_reviewed",
        title: `Checkpoint v${checkpoint.version} actualizado`,
        description: values.status ? `Estado: ${values.status}` : null,
        teamId: checkpoint.teamId,
        checkpointId: checkpoint.id,
        actorUserId: context.actorUserId,
      });

      revalidateCheckpointViews(checkpoint.teamId);
      return ok(undefined, "Checkpoint actualizado.");
    },
  );
}

export async function deleteCheckpointAction(
  checkpointId: string,
): Promise<ActionState> {
  return runAction(
    z.object({ checkpointId: z.string().uuid() }),
    { checkpointId },
    async (values, context) => {
      await deleteCheckpoint(context.event.id, values.checkpointId);
      revalidateCheckpointViews();
      return ok(undefined, "Checkpoint eliminado.");
    },
  );
}
