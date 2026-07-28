import "server-only";

import { and, asc, count, eq, sql } from "drizzle-orm";

import type { TeamStatus } from "@/lib/constants";
import { slugify } from "@/lib/format";
import { db } from "@/server/db";
import {
  checkpoints,
  participants,
  shifts,
  teams,
  type Team,
} from "@/server/db/schema";

export interface TeamView extends Team {
  participantCount: number;
  shiftCount: number;
  completedShiftCount: number;
  checkpointCount: number;
  lastCheckpointAt: Date | null;
}

export async function listTeams(eventId: string): Promise<TeamView[]> {
  const rows = await db
    .select({
      team: teams,
      participantCount: sql<number>`count(distinct ${participants.id})::int`,
      shiftCount: sql<number>`count(distinct ${shifts.id})::int`,
      completedShiftCount: sql<number>`(count(distinct ${shifts.id}) filter (where ${shifts.status} = 'completed'))::int`,
      checkpointCount: sql<number>`count(distinct ${checkpoints.id})::int`,
      lastCheckpointAt: sql<Date | null>`max(${checkpoints.submittedAt})`,
    })
    .from(teams)
    .leftJoin(participants, eq(participants.teamId, teams.id))
    .leftJoin(shifts, eq(shifts.teamId, teams.id))
    .leftJoin(checkpoints, eq(checkpoints.teamId, teams.id))
    .where(eq(teams.eventId, eventId))
    .groupBy(teams.id)
    .orderBy(asc(teams.orderIndex), asc(teams.name));

  return rows.map((row) => ({
    ...row.team,
    participantCount: row.participantCount ?? 0,
    shiftCount: row.shiftCount ?? 0,
    completedShiftCount: row.completedShiftCount ?? 0,
    checkpointCount: row.checkpointCount ?? 0,
    lastCheckpointAt: row.lastCheckpointAt ? new Date(row.lastCheckpointAt) : null,
  }));
}

export async function getTeam(
  eventId: string,
  teamId: string,
): Promise<Team | null> {
  const team = await db.query.teams.findFirst({
    where: and(eq(teams.eventId, eventId), eq(teams.id, teamId)),
  });
  return team ?? null;
}

export interface CreateTeamInput {
  eventId: string;
  name: string;
  description?: string | null;
  color?: string;
  status?: TeamStatus;
  driveFolderUrl?: string | null;
  discordChannelId?: string | null;
  internalNotes?: string | null;
}

export async function createTeam(input: CreateTeamInput): Promise<Team> {
  const orderIndex = await nextTeamOrderIndex(input.eventId);
  const slug = await uniqueSlug(input.eventId, slugify(input.name) || "equipo");

  const [team] = await db
    .insert(teams)
    .values({
      eventId: input.eventId,
      name: input.name,
      slug,
      description: input.description ?? null,
      color: input.color ?? "#6366f1",
      status: input.status ?? "active",
      driveFolderUrl: input.driveFolderUrl ?? null,
      discordChannelId: input.discordChannelId ?? null,
      internalNotes: input.internalNotes ?? null,
      orderIndex,
    })
    .returning();

  return team;
}

export async function updateTeam(
  eventId: string,
  teamId: string,
  values: Partial<
    Pick<
      Team,
      | "name"
      | "description"
      | "color"
      | "status"
      | "driveFolderUrl"
      | "discordChannelId"
      | "internalNotes"
    >
  >,
): Promise<Team> {
  const [team] = await db
    .update(teams)
    .set({ ...values, updatedAt: new Date() })
    .where(and(eq(teams.eventId, eventId), eq(teams.id, teamId)))
    .returning();

  return team;
}

export async function deleteTeam(eventId: string, teamId: string): Promise<void> {
  await db
    .delete(teams)
    .where(and(eq(teams.eventId, eventId), eq(teams.id, teamId)));
}

export async function reorderTeams(
  eventId: string,
  orderedIds: string[],
): Promise<void> {
  await db.transaction(async (tx) => {
    for (const [index, id] of orderedIds.entries()) {
      await tx
        .update(teams)
        .set({ orderIndex: index, updatedAt: new Date() })
        .where(and(eq(teams.eventId, eventId), eq(teams.id, id)));
    }
  });
}

async function nextTeamOrderIndex(eventId: string): Promise<number> {
  const [row] = await db
    .select({ value: sql<number>`coalesce(max(${teams.orderIndex}), -1)::int` })
    .from(teams)
    .where(eq(teams.eventId, eventId));

  return (row?.value ?? -1) + 1;
}

async function uniqueSlug(eventId: string, base: string): Promise<string> {
  const [row] = await db
    .select({ total: count() })
    .from(teams)
    .where(and(eq(teams.eventId, eventId), eq(teams.slug, base)));

  if (!row?.total) return base;

  // Collisions are rare; a short time-based suffix keeps slugs readable.
  return `${base}-${Date.now().toString(36).slice(-4)}`;
}
