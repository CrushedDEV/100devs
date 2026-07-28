import "server-only";

import { and, desc, eq, ilike, or, sql } from "drizzle-orm";

import { db } from "@/server/db";
import { checkpoints, participants, teams, users } from "@/server/db/schema";

export type SearchResultKind = "participant" | "team" | "checkpoint";

export interface SearchResult {
  id: string;
  kind: SearchResultKind;
  title: string;
  subtitle: string | null;
  href: string;
  color: string | null;
  avatarUrl: string | null;
}

/**
 * Global search across the three entities the organiser looks up most.
 * Uses `ILIKE` — at ~100 participants this is instant and avoids the
 * operational cost of a full-text index.
 */
export async function globalSearch(
  eventId: string,
  rawQuery: string,
  limitPerKind = 5,
): Promise<SearchResult[]> {
  const query = rawQuery.trim();
  if (query.length < 2) return [];

  const pattern = `%${query}%`;

  const [participantRows, teamRows, checkpointRows] = await Promise.all([
    db
      .select({
        id: participants.id,
        username: users.username,
        globalName: users.globalName,
        nickname: users.nickname,
        avatarUrl: users.avatarUrl,
        teamName: teams.name,
        teamColor: teams.color,
      })
      .from(participants)
      .innerJoin(users, eq(participants.userId, users.id))
      .leftJoin(teams, eq(participants.teamId, teams.id))
      .where(
        and(
          eq(participants.eventId, eventId),
          or(
            ilike(users.username, pattern),
            ilike(users.globalName, pattern),
            ilike(users.nickname, pattern),
            ilike(users.discordId, pattern),
          ),
        ),
      )
      .limit(limitPerKind),

    db
      .select({
        id: teams.id,
        name: teams.name,
        color: teams.color,
        description: teams.description,
      })
      .from(teams)
      .where(
        and(
          eq(teams.eventId, eventId),
          or(ilike(teams.name, pattern), ilike(teams.description, pattern)),
        ),
      )
      .limit(limitPerKind),

    db
      .select({
        id: checkpoints.id,
        version: checkpoints.version,
        teamId: checkpoints.teamId,
        teamName: teams.name,
        teamColor: teams.color,
        observations: checkpoints.observations,
      })
      .from(checkpoints)
      .innerJoin(teams, eq(checkpoints.teamId, teams.id))
      .where(
        and(
          eq(checkpoints.eventId, eventId),
          or(
            ilike(checkpoints.observations, pattern),
            ilike(checkpoints.driveUrl, pattern),
            ilike(teams.name, pattern),
            sql`cast(${checkpoints.version} as text) = ${query}`,
          ),
        ),
      )
      .orderBy(desc(checkpoints.createdAt))
      .limit(limitPerKind),
  ]);

  return [
    ...participantRows.map(
      (row): SearchResult => ({
        id: row.id,
        kind: "participant",
        title: row.nickname ?? row.globalName ?? row.username,
        subtitle: row.teamName ?? "Sin equipo",
        href: `/participants?participant=${row.id}`,
        color: row.teamColor,
        avatarUrl: row.avatarUrl,
      }),
    ),
    ...teamRows.map(
      (row): SearchResult => ({
        id: row.id,
        kind: "team",
        title: row.name,
        subtitle: row.description,
        href: `/teams/${row.id}`,
        color: row.color,
        avatarUrl: null,
      }),
    ),
    ...checkpointRows.map(
      (row): SearchResult => ({
        id: row.id,
        kind: "checkpoint",
        title: `${row.teamName} · v${row.version}`,
        subtitle: row.observations,
        href: `/teams/${row.teamId}?checkpoint=${row.id}`,
        color: row.teamColor,
        avatarUrl: null,
      }),
    ),
  ];
}
