import "server-only";

import { and, eq, inArray, notInArray } from "drizzle-orm";

import {
  suggestSkillRoles,
  type AppRole,
  type SkillRoleMap,
  type SyncTrigger,
} from "@/lib/constants";
import { db } from "@/server/db";
import {
  participants,
  syncRuns,
  users,
  type SyncRun,
} from "@/server/db/schema";
import { resolveAppRole } from "@/server/auth/roles";
import { getActiveEvent, updateEventSettings } from "@/server/services/events";
import { logTimelineEvent } from "@/server/services/timeline";

import {
  avatarUrl,
  fetchGuildMembers,
  fetchGuildRoles,
  type DiscordGuildMember,
} from "./client";

export interface SyncResult {
  runId: string;
  membersFetched: number;
  usersCreated: number;
  usersUpdated: number;
  participantsCreated: number;
  participantsDeactivated: number;
  /** Categories auto-linked to a Discord role on this run. */
  skillsLinked: number;
  durationMs: number;
}

/**
 * Mirrors the Discord guild into the database.
 *
 * - Members holding a configured admin/moderator/participant role are upserted
 *   into `users` with the matching app role.
 * - Members holding a participant role are enrolled into the active event.
 * - Enrolments whose Discord role disappeared are marked `inactive` rather than
 *   deleted, so their shifts and checkpoints stay auditable.
 */
export async function syncDiscordMembers(
  trigger: SyncTrigger = "manual",
  actorUserId?: string | null,
): Promise<SyncResult> {
  const startedAt = Date.now();
  const { event, settings } = await getActiveEvent();

  const [run] = await db
    .insert(syncRuns)
    .values({ eventId: event.id, trigger, status: "running" })
    .returning();

  try {
    const skillsLinked = await autoLinkSkillRoles(event.id, event.discordGuildId, settings.skillRoleIds);
    const members = await fetchGuildMembers(event.discordGuildId);
    const relevant = members.filter(
      (member) => member.user && resolveAppRole(member.roles, settings) !== null,
    );

    const counters = { usersCreated: 0, usersUpdated: 0, participantsCreated: 0 };
    const activeParticipantUserIds: string[] = [];

    for (const member of relevant) {
      const role = resolveAppRole(member.roles, settings)!;
      const { userId, created } = await upsertUser(member, role);

      if (created) counters.usersCreated++;
      else counters.usersUpdated++;

      const holdsParticipantRole = settings.participantRoleIds.some((id) =>
        member.roles.includes(id),
      );

      if (holdsParticipantRole) {
        activeParticipantUserIds.push(userId);
        const enrolled = await ensureEnrolment(event.id, userId);
        if (enrolled) counters.participantsCreated++;
      }
    }

    const participantsDeactivated = await deactivateMissing(
      event.id,
      activeParticipantUserIds,
    );

    const finishedAt = new Date();
    const [finished] = await db
      .update(syncRuns)
      .set({
        status: "success",
        membersFetched: members.length,
        usersCreated: counters.usersCreated,
        usersUpdated: counters.usersUpdated,
        participantsCreated: counters.participantsCreated,
        participantsDeactivated,
        finishedAt,
      })
      .where(eq(syncRuns.id, run.id))
      .returning();

    await updateEventSettings(event.id, { lastSyncedAt: finishedAt });

    await logTimelineEvent({
      eventId: event.id,
      type: "sync_completed",
      title: `Sincronización con Discord (${trigger === "cron" ? "automática" : "manual"})`,
      description: `${counters.usersCreated} nuevos · ${counters.usersUpdated} actualizados · ${counters.participantsCreated} inscritos`,
      actorUserId: actorUserId ?? null,
      metadata: { trigger, membersFetched: members.length },
    });

    return toResult(finished, startedAt, skillsLinked);
  } catch (error) {
    await db
      .update(syncRuns)
      .set({
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
        finishedAt: new Date(),
      })
      .where(eq(syncRuns.id, run.id));

    throw error;
  }
}

function toResult(
  run: SyncRun,
  startedAt: number,
  skillsLinked: number,
): SyncResult {
  return {
    runId: run.id,
    membersFetched: run.membersFetched,
    usersCreated: run.usersCreated,
    usersUpdated: run.usersUpdated,
    participantsCreated: run.participantsCreated,
    participantsDeactivated: run.participantsDeactivated,
    skillsLinked,
    durationMs: Date.now() - startedAt,
  };
}

/**
 * Links each skill category to the identically named Discord role the first
 * time an event is synced.
 *
 * Only runs while the mapping is completely empty, so it never overwrites (or
 * resurrects) a choice the organiser made by hand.
 */
async function autoLinkSkillRoles(
  eventId: string,
  guildId: string,
  current: SkillRoleMap,
): Promise<number> {
  if (Object.keys(current).length > 0) return 0;

  const roles = await fetchGuildRoles(guildId);
  const suggestion = suggestSkillRoles(
    roles.map((role) => ({ id: role.id, name: role.name })),
  );

  const linked = Object.keys(suggestion).length;
  if (linked === 0) return 0;

  await updateEventSettings(eventId, { skillRoleIds: suggestion });
  return linked;
}

async function upsertUser(
  member: DiscordGuildMember,
  role: AppRole,
): Promise<{ userId: string; created: boolean }> {
  const discordUser = member.user!;
  const now = new Date();

  const existing = await db.query.users.findFirst({
    where: eq(users.discordId, discordUser.id),
    columns: { id: true },
  });

  const values = {
    discordId: discordUser.id,
    username: discordUser.username,
    globalName: discordUser.global_name ?? null,
    nickname: member.nick ?? null,
    avatarUrl: avatarUrl(discordUser.id, member.avatar ?? discordUser.avatar),
    role,
    discordRoleIds: member.roles,
    isGuildMember: true,
    joinedGuildAt: member.joined_at ? new Date(member.joined_at) : null,
    lastSyncedAt: now,
  };

  const [row] = await db
    .insert(users)
    .values(values)
    .onConflictDoUpdate({
      target: users.discordId,
      set: { ...values, updatedAt: now },
    })
    .returning({ id: users.id });

  return { userId: row.id, created: !existing };
}

/** Enrols a user in the event if not present. Returns true when created. */
async function ensureEnrolment(
  eventId: string,
  userId: string,
): Promise<boolean> {
  const existing = await db.query.participants.findFirst({
    where: and(
      eq(participants.eventId, eventId),
      eq(participants.userId, userId),
    ),
    columns: { id: true, status: true, teamId: true },
  });

  if (existing) {
    // A returning member regains their previous status automatically.
    if (existing.status === "inactive") {
      await db
        .update(participants)
        .set({
          status: existing.teamId ? "active" : "unassigned",
          updatedAt: new Date(),
        })
        .where(eq(participants.id, existing.id));
    }
    return false;
  }

  await db.insert(participants).values({
    eventId,
    userId,
    status: "unassigned",
    orderIndex: 0,
  });

  return true;
}

/** Flags enrolments whose Discord participant role was removed. */
async function deactivateMissing(
  eventId: string,
  activeUserIds: string[],
): Promise<number> {
  const condition = activeUserIds.length
    ? and(
        eq(participants.eventId, eventId),
        notInArray(participants.userId, activeUserIds),
        notInArray(participants.status, ["inactive", "dropped"]),
      )
    : and(
        eq(participants.eventId, eventId),
        notInArray(participants.status, ["inactive", "dropped"]),
      );

  const updated = await db
    .update(participants)
    .set({ status: "inactive", updatedAt: new Date() })
    .where(condition)
    .returning({ id: participants.id });

  return updated.length;
}

/** Most recent sync runs, newest first — rendered on the settings page. */
export async function listSyncRuns(eventId: string, limit = 10) {
  return db.query.syncRuns.findMany({
    where: eq(syncRuns.eventId, eventId),
    orderBy: (table, { desc }) => [desc(table.startedAt)],
    limit,
  });
}

/** Utility used by the settings page to show role ids that are actually in use. */
export async function countUsersByRole(roles: AppRole[]) {
  if (!roles.length) return [];
  return db
    .select({ role: users.role, id: users.id })
    .from(users)
    .where(inArray(users.role, roles));
}
