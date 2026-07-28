import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";

import type { ParticipantStatus } from "@/lib/constants";
import { db } from "@/server/db";
import { participants, teams, users } from "@/server/db/schema";

export interface ParticipantView {
  id: string;
  userId: string;
  discordId: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  status: ParticipantStatus;
  orderIndex: number;
  availability: string | null;
  timezone: string | null;
  internalNotes: string | null;
  discordTicketUrl: string | null;
  team: { id: string; name: string; color: string } | null;
}

const selection = {
  id: participants.id,
  userId: participants.userId,
  discordId: users.discordId,
  username: users.username,
  globalName: users.globalName,
  nickname: users.nickname,
  avatarUrl: users.avatarUrl,
  status: participants.status,
  orderIndex: participants.orderIndex,
  availability: participants.availability,
  timezone: participants.timezone,
  internalNotes: participants.internalNotes,
  discordTicketUrl: participants.discordTicketUrl,
  teamId: teams.id,
  teamName: teams.name,
  teamColor: teams.color,
};

interface ParticipantRow {
  id: string;
  userId: string;
  discordId: string;
  username: string;
  globalName: string | null;
  nickname: string | null;
  avatarUrl: string | null;
  status: ParticipantStatus;
  orderIndex: number;
  availability: string | null;
  timezone: string | null;
  internalNotes: string | null;
  discordTicketUrl: string | null;
  teamId: string | null;
  teamName: string | null;
  teamColor: string | null;
}

function toView(row: ParticipantRow): ParticipantView {
  return {
    id: row.id,
    userId: row.userId,
    discordId: row.discordId,
    name: row.nickname ?? row.globalName ?? row.username,
    username: row.username,
    avatarUrl: row.avatarUrl,
    status: row.status,
    orderIndex: row.orderIndex,
    availability: row.availability,
    timezone: row.timezone,
    internalNotes: row.internalNotes,
    discordTicketUrl: row.discordTicketUrl,
    team:
      row.teamId && row.teamName && row.teamColor
        ? { id: row.teamId, name: row.teamName, color: row.teamColor }
        : null,
  };
}

export async function listParticipants(
  eventId: string,
): Promise<ParticipantView[]> {
  const rows = await db
    .select(selection)
    .from(participants)
    .innerJoin(users, eq(participants.userId, users.id))
    .leftJoin(teams, eq(participants.teamId, teams.id))
    .where(eq(participants.eventId, eventId))
    .orderBy(asc(teams.orderIndex), asc(participants.orderIndex), asc(users.username));

  return rows.map(toView);
}

export async function getParticipant(
  eventId: string,
  participantId: string,
): Promise<ParticipantView | null> {
  const [row] = await db
    .select(selection)
    .from(participants)
    .innerJoin(users, eq(participants.userId, users.id))
    .leftJoin(teams, eq(participants.teamId, teams.id))
    .where(
      and(eq(participants.eventId, eventId), eq(participants.id, participantId)),
    )
    .limit(1);

  return row ? toView(row) : null;
}

export async function listParticipantsByTeam(
  eventId: string,
  teamIds: string[],
): Promise<Map<string, ParticipantView[]>> {
  const grouped = new Map<string, ParticipantView[]>();
  if (!teamIds.length) return grouped;

  const rows = await db
    .select(selection)
    .from(participants)
    .innerJoin(users, eq(participants.userId, users.id))
    .leftJoin(teams, eq(participants.teamId, teams.id))
    .where(
      and(
        eq(participants.eventId, eventId),
        inArray(participants.teamId, teamIds),
      ),
    )
    .orderBy(asc(participants.orderIndex));

  for (const row of rows) {
    const view = toView(row);
    if (!view.team) continue;
    const bucket = grouped.get(view.team.id) ?? [];
    bucket.push(view);
    grouped.set(view.team.id, bucket);
  }

  return grouped;
}

/** Next position at the end of a team's rotation. */
export async function nextOrderIndex(teamId: string | null): Promise<number> {
  if (!teamId) return 0;

  const rows = await db
    .select({ orderIndex: participants.orderIndex })
    .from(participants)
    .where(eq(participants.teamId, teamId));

  return rows.reduce((max, row) => Math.max(max, row.orderIndex), -1) + 1;
}
