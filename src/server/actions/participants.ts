"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import type { SkillKey } from "@/lib/constants";
import {
  moveParticipantSchema,
  participantUpdateSchema,
  reorderParticipantsSchema,
  toggleParticipantSkillSchema,
} from "@/lib/validators";
import { db } from "@/server/db";
import { participants, users } from "@/server/db/schema";
import {
  DiscordApiError,
  addGuildMemberRole,
  removeGuildMemberRole,
} from "@/server/discord/client";
import { getParticipant } from "@/server/services/participants";
import { logTimelineEvent } from "@/server/services/timeline";

import { fail, ok, runAction, type ActionState } from "./shared";

function revalidateParticipantViews() {
  revalidatePath("/participants");
  revalidatePath("/teams");
  revalidatePath("/dashboard");
}

export async function updateParticipantAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const raw = Object.fromEntries(formData);
  // An empty select value means "remove from team".
  if (raw.teamId === "" || raw.teamId === "none") raw.teamId = null as never;

  return runAction(participantUpdateSchema, raw, async ({ id, ...values }, context) => {
    const [updated] = await db
      .update(participants)
      .set({ ...values, updatedAt: new Date() })
      .where(
        and(
          eq(participants.eventId, context.event.id),
          eq(participants.id, id),
        ),
      )
      .returning();

    if (!updated) return fail("No se encontró el participante.");

    revalidateParticipantViews();
    return ok(undefined, "Participante actualizado.");
  });
}

/**
 * Applied after a drag & drop on the team board: reassigns the participant and
 * rewrites the ordering of the destination team in a single transaction.
 */
export async function moveParticipantAction(input: {
  participantId: string;
  teamId: string | null;
  orderedIds: string[];
}): Promise<ActionState> {
  return runAction(moveParticipantSchema, input, async (values, context) => {
    const before = await getParticipant(context.event.id, values.participantId);
    if (!before) return fail("No se encontró el participante.");

    await db.transaction(async (tx) => {
      await tx
        .update(participants)
        .set({
          teamId: values.teamId,
          status: values.teamId ? "active" : "unassigned",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(participants.eventId, context.event.id),
            eq(participants.id, values.participantId),
          ),
        );

      for (const [index, id] of values.orderedIds.entries()) {
        await tx
          .update(participants)
          .set({ orderIndex: index, updatedAt: new Date() })
          .where(
            and(
              eq(participants.eventId, context.event.id),
              eq(participants.id, id),
            ),
          );
      }
    });

    const after = await getParticipant(context.event.id, values.participantId);

    if (before.team?.id !== after?.team?.id) {
      await logTimelineEvent({
        eventId: context.event.id,
        type: values.teamId ? "participant_assigned" : "participant_unassigned",
        title: values.teamId
          ? `${before.name} → ${after?.team?.name ?? "equipo"}`
          : `${before.name} salió de ${before.team?.name ?? "su equipo"}`,
        teamId: values.teamId,
        participantId: values.participantId,
        actorUserId: context.actorUserId,
      });
    }

    revalidateParticipantViews();
    return ok(undefined, "Cambios guardados.");
  });
}

/** Reorders participants inside a single team (rotation order). */
export async function reorderTeamParticipantsAction(input: {
  orderedIds: string[];
}): Promise<ActionState> {
  return runAction(
    reorderParticipantsSchema,
    input,
    async (values, context) => {
      await db.transaction(async (tx) => {
        for (const [index, id] of values.orderedIds.entries()) {
          await tx
            .update(participants)
            .set({ orderIndex: index, updatedAt: new Date() })
            .where(
              and(
                eq(participants.eventId, context.event.id),
                eq(participants.id, id),
              ),
            );
        }
      });

      revalidateParticipantViews();
      return ok(undefined, "Orden de rotación actualizado.");
    },
  );
}

/**
 * Grants or revokes a category from the panel, mirroring the change onto the
 * participant's real Discord role — this is the one write path where the app
 * pushes a change *to* Discord instead of only reading from it.
 */
export async function toggleParticipantSkillAction(input: {
  participantId: string;
  skill: SkillKey;
  enabled: boolean;
}): Promise<ActionState> {
  return runAction(
    toggleParticipantSkillSchema,
    input,
    async ({ participantId, skill, enabled }, context) => {
      const roleId = context.settings.skillRoleIds[skill];
      if (!roleId) {
        return fail(
          "Esta categoría no tiene un rol de Discord vinculado. Configúralo en Ajustes.",
        );
      }

      const [row] = await db
        .select({
          userId: users.id,
          discordId: users.discordId,
          discordRoleIds: users.discordRoleIds,
          name: users.globalName,
          username: users.username,
        })
        .from(participants)
        .innerJoin(users, eq(participants.userId, users.id))
        .where(
          and(
            eq(participants.eventId, context.event.id),
            eq(participants.id, participantId),
          ),
        )
        .limit(1);

      if (!row) return fail("No se encontró el participante.");

      const alreadyHasRole = row.discordRoleIds.includes(roleId);
      if (alreadyHasRole === enabled) {
        return ok(undefined, "Sin cambios.");
      }

      try {
        if (enabled) {
          await addGuildMemberRole(context.event.discordGuildId, row.discordId, roleId);
        } else {
          await removeGuildMemberRole(context.event.discordGuildId, row.discordId, roleId);
        }
      } catch (error) {
        if (error instanceof DiscordApiError && error.status === 403) {
          return fail(
            "Discord ha rechazado el cambio: el rol del bot debe estar por encima del rol de la categoría en la lista de roles del servidor.",
          );
        }
        throw error;
      }

      const nextRoleIds = enabled
        ? [...row.discordRoleIds, roleId]
        : row.discordRoleIds.filter((id) => id !== roleId);

      await db
        .update(users)
        .set({ discordRoleIds: nextRoleIds, updatedAt: new Date() })
        .where(eq(users.id, row.userId));

      revalidateParticipantViews();
      return ok(
        undefined,
        enabled ? "Categoría asignada." : "Categoría retirada.",
      );
    },
  );
}
