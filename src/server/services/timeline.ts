import "server-only";

import { and, desc, eq, gte, inArray, lte, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import type { TimelineEventType } from "@/lib/constants";
import { db } from "@/server/db";
import {
  participants,
  shifts,
  teams,
  timelineEvents,
  users,
} from "@/server/db/schema";

export interface LogTimelineInput {
  eventId: string;
  type: TimelineEventType;
  title: string;
  description?: string | null;
  teamId?: string | null;
  participantId?: string | null;
  shiftId?: string | null;
  checkpointId?: string | null;
  actorUserId?: string | null;
  metadata?: Record<string, unknown> | null;
  occurredAt?: Date;
}

/**
 * Append-only activity log. Every mutation in the domain services funnels
 * through here so the timeline view needs no reconstruction logic.
 */
export async function logTimelineEvent(input: LogTimelineInput): Promise<void> {
  await db.insert(timelineEvents).values({
    eventId: input.eventId,
    type: input.type,
    title: input.title,
    description: input.description ?? null,
    teamId: input.teamId ?? null,
    participantId: input.participantId ?? null,
    shiftId: input.shiftId ?? null,
    checkpointId: input.checkpointId ?? null,
    actorUserId: input.actorUserId ?? null,
    metadata: input.metadata ?? null,
    occurredAt: input.occurredAt ?? new Date(),
  });
}

export interface TimelineFilters {
  types?: TimelineEventType[];
  teamId?: string;
  from?: Date;
  to?: Date;
  limit?: number;
}

export interface TimelineIdentity {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface TimelineEntry {
  id: string;
  type: TimelineEventType;
  title: string;
  description: string | null;
  occurredAt: Date;
  metadata: Record<string, unknown> | null;
  team: { id: string; name: string; color: string } | null;
  participant: TimelineIdentity | null;
  actor: TimelineIdentity | null;
  shiftStartsAt: Date | null;
}

// Two independent joins onto `users`: the participant's identity and the staff
// member who performed the action.
const participantUser = alias(users, "participant_user");
const actorUser = alias(users, "actor_user");

export async function listTimeline(
  eventId: string,
  filters: TimelineFilters = {},
): Promise<TimelineEntry[]> {
  const conditions: SQL[] = [eq(timelineEvents.eventId, eventId)];

  if (filters.types?.length) {
    conditions.push(inArray(timelineEvents.type, filters.types));
  }
  if (filters.teamId) conditions.push(eq(timelineEvents.teamId, filters.teamId));
  if (filters.from) conditions.push(gte(timelineEvents.occurredAt, filters.from));
  if (filters.to) conditions.push(lte(timelineEvents.occurredAt, filters.to));

  const rows = await db
    .select({
      id: timelineEvents.id,
      type: timelineEvents.type,
      title: timelineEvents.title,
      description: timelineEvents.description,
      occurredAt: timelineEvents.occurredAt,
      metadata: timelineEvents.metadata,
      teamId: teams.id,
      teamName: teams.name,
      teamColor: teams.color,
      participantId: participants.id,
      participantUsername: participantUser.username,
      participantGlobalName: participantUser.globalName,
      participantNickname: participantUser.nickname,
      participantAvatar: participantUser.avatarUrl,
      actorId: actorUser.id,
      actorUsername: actorUser.username,
      actorGlobalName: actorUser.globalName,
      actorNickname: actorUser.nickname,
      actorAvatar: actorUser.avatarUrl,
      shiftStartsAt: shifts.startsAt,
    })
    .from(timelineEvents)
    .leftJoin(teams, eq(timelineEvents.teamId, teams.id))
    .leftJoin(participants, eq(timelineEvents.participantId, participants.id))
    .leftJoin(participantUser, eq(participants.userId, participantUser.id))
    .leftJoin(actorUser, eq(timelineEvents.actorUserId, actorUser.id))
    .leftJoin(shifts, eq(timelineEvents.shiftId, shifts.id))
    .where(and(...conditions))
    .orderBy(desc(timelineEvents.occurredAt))
    .limit(filters.limit ?? 200);

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    description: row.description,
    occurredAt: row.occurredAt,
    metadata: row.metadata,
    team:
      row.teamId && row.teamName && row.teamColor
        ? { id: row.teamId, name: row.teamName, color: row.teamColor }
        : null,
    participant: row.participantId
      ? {
          id: row.participantId,
          name:
            row.participantNickname ??
            row.participantGlobalName ??
            row.participantUsername ??
            "Participante",
          avatarUrl: row.participantAvatar ?? null,
        }
      : null,
    actor: row.actorId
      ? {
          id: row.actorId,
          name:
            row.actorNickname ?? row.actorGlobalName ?? row.actorUsername ?? "Staff",
          avatarUrl: row.actorAvatar ?? null,
        }
      : null,
    shiftStartsAt: row.shiftStartsAt ?? null,
  }));
}
