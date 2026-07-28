"use server";

import { revalidatePath } from "next/cache";

import {
  reorderTeamsSchema,
  teamInputSchema,
  teamUpdateSchema,
} from "@/lib/validators";
import { z } from "zod";
import {
  createTeam,
  deleteTeam,
  reorderTeams,
  updateTeam,
} from "@/server/services/teams";
import { logTimelineEvent } from "@/server/services/timeline";

import { ok, runAction, type ActionState } from "./shared";

function revalidateTeamViews(teamId?: string) {
  revalidatePath("/teams");
  revalidatePath("/dashboard");
  revalidatePath("/participants");
  if (teamId) revalidatePath(`/teams/${teamId}`);
}

export async function createTeamAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  return runAction(
    teamInputSchema,
    Object.fromEntries(formData),
    async (values, context) => {
      const team = await createTeam({ eventId: context.event.id, ...values });

      await logTimelineEvent({
        eventId: context.event.id,
        type: "team_created",
        title: `Equipo creado: ${team.name}`,
        teamId: team.id,
        actorUserId: context.actorUserId,
      });

      revalidateTeamViews(team.id);
      return ok(undefined, "Equipo creado.");
    },
  );
}

export async function updateTeamAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  return runAction(
    teamUpdateSchema,
    Object.fromEntries(formData),
    async ({ id, ...values }, context) => {
      const team = await updateTeam(context.event.id, id, values);

      await logTimelineEvent({
        eventId: context.event.id,
        type: "team_updated",
        title: `Equipo actualizado: ${team.name}`,
        teamId: team.id,
        actorUserId: context.actorUserId,
      });

      revalidateTeamViews(id);
      return ok(undefined, "Equipo actualizado.");
    },
  );
}

export async function deleteTeamAction(teamId: string): Promise<ActionState> {
  return runAction(
    z.object({ teamId: z.string().uuid() }),
    { teamId },
    async (values, context) => {
      await deleteTeam(context.event.id, values.teamId);
      revalidateTeamViews();
      return ok(undefined, "Equipo eliminado.");
    },
  );
}

export async function reorderTeamsAction(
  orderedIds: string[],
): Promise<ActionState> {
  return runAction(
    reorderTeamsSchema,
    { orderedIds },
    async (values, context) => {
      await reorderTeams(context.event.id, values.orderedIds);
      revalidateTeamViews();
      return ok(undefined, "Orden actualizado.");
    },
  );
}
