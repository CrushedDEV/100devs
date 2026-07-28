import "server-only";

import { and, desc, eq, sql, type SQL } from "drizzle-orm";

import type { CheckpointStatus } from "@/lib/constants";
import { db } from "@/server/db";
import {
  checkpoints,
  participants,
  shifts,
  teams,
  users,
  type Checkpoint,
} from "@/server/db/schema";

export interface CheckpointView {
  id: string;
  version: number;
  teamId: string;
  teamName: string;
  teamColor: string;
  shiftId: string | null;
  shiftStartsAt: Date | null;
  participantId: string | null;
  participantName: string | null;
  participantAvatar: string | null;
  driveUrl: string | null;
  videoUrl: string | null;
  submittedAt: Date | null;
  durationMinutes: number | null;
  status: CheckpointStatus;
  observations: string | null;
  internalNotes: string | null;
  createdAt: Date;
}

const selection = {
  id: checkpoints.id,
  version: checkpoints.version,
  teamId: checkpoints.teamId,
  teamName: teams.name,
  teamColor: teams.color,
  shiftId: checkpoints.shiftId,
  shiftStartsAt: shifts.startsAt,
  participantId: checkpoints.participantId,
  participantUsername: users.username,
  participantGlobalName: users.globalName,
  participantNickname: users.nickname,
  participantAvatar: users.avatarUrl,
  driveUrl: checkpoints.driveUrl,
  videoUrl: checkpoints.videoUrl,
  submittedAt: checkpoints.submittedAt,
  durationMinutes: checkpoints.durationMinutes,
  status: checkpoints.status,
  observations: checkpoints.observations,
  internalNotes: checkpoints.internalNotes,
  createdAt: checkpoints.createdAt,
};

interface CheckpointRow {
  id: string;
  version: number;
  teamId: string;
  teamName: string;
  teamColor: string;
  shiftId: string | null;
  shiftStartsAt: Date | null;
  participantId: string | null;
  participantUsername: string | null;
  participantGlobalName: string | null;
  participantNickname: string | null;
  participantAvatar: string | null;
  driveUrl: string | null;
  videoUrl: string | null;
  submittedAt: Date | null;
  durationMinutes: number | null;
  status: CheckpointStatus;
  observations: string | null;
  internalNotes: string | null;
  createdAt: Date;
}

function toView(row: CheckpointRow): CheckpointView {
  return {
    id: row.id,
    version: row.version,
    teamId: row.teamId,
    teamName: row.teamName,
    teamColor: row.teamColor,
    shiftId: row.shiftId,
    shiftStartsAt: row.shiftStartsAt,
    participantId: row.participantId,
    participantName: row.participantId
      ? (row.participantNickname ??
        row.participantGlobalName ??
        row.participantUsername ??
        "Participante")
      : null,
    participantAvatar: row.participantAvatar,
    driveUrl: row.driveUrl,
    videoUrl: row.videoUrl,
    submittedAt: row.submittedAt,
    durationMinutes: row.durationMinutes,
    status: row.status,
    observations: row.observations,
    internalNotes: row.internalNotes,
    createdAt: row.createdAt,
  };
}

export interface CheckpointQuery {
  teamId?: string;
  status?: CheckpointStatus;
  limit?: number;
}

export async function listCheckpoints(
  eventId: string,
  query: CheckpointQuery = {},
): Promise<CheckpointView[]> {
  const conditions: SQL[] = [eq(checkpoints.eventId, eventId)];
  if (query.teamId) conditions.push(eq(checkpoints.teamId, query.teamId));
  if (query.status) conditions.push(eq(checkpoints.status, query.status));

  const rows = await db
    .select(selection)
    .from(checkpoints)
    .innerJoin(teams, eq(checkpoints.teamId, teams.id))
    .leftJoin(shifts, eq(checkpoints.shiftId, shifts.id))
    .leftJoin(participants, eq(checkpoints.participantId, participants.id))
    .leftJoin(users, eq(participants.userId, users.id))
    .where(and(...conditions))
    .orderBy(desc(checkpoints.submittedAt), desc(checkpoints.createdAt))
    .limit(query.limit ?? 300);

  return rows.map(toView);
}

export interface CreateCheckpointInput {
  eventId: string;
  teamId: string;
  shiftId?: string | null;
  participantId?: string | null;
  driveUrl?: string | null;
  videoUrl?: string | null;
  submittedAt?: Date | null;
  durationMinutes?: number | null;
  status?: CheckpointStatus;
  observations?: string | null;
  internalNotes?: string | null;
}

export async function createCheckpoint(
  input: CreateCheckpointInput,
): Promise<Checkpoint> {
  const version = await nextVersion(input.teamId);

  const [checkpoint] = await db
    .insert(checkpoints)
    .values({
      eventId: input.eventId,
      teamId: input.teamId,
      shiftId: input.shiftId ?? null,
      participantId: input.participantId ?? null,
      version,
      driveUrl: input.driveUrl ?? null,
      videoUrl: input.videoUrl ?? null,
      submittedAt: input.submittedAt ?? new Date(),
      durationMinutes: input.durationMinutes ?? null,
      status: input.status ?? "submitted",
      observations: input.observations ?? null,
      internalNotes: input.internalNotes ?? null,
    })
    .returning();

  return checkpoint;
}

export async function updateCheckpoint(
  eventId: string,
  checkpointId: string,
  values: Partial<
    Pick<
      Checkpoint,
      | "driveUrl"
      | "videoUrl"
      | "submittedAt"
      | "durationMinutes"
      | "status"
      | "observations"
      | "internalNotes"
      | "participantId"
      | "shiftId"
    >
  >,
): Promise<Checkpoint> {
  const [checkpoint] = await db
    .update(checkpoints)
    .set({ ...values, updatedAt: new Date() })
    .where(
      and(eq(checkpoints.eventId, eventId), eq(checkpoints.id, checkpointId)),
    )
    .returning();

  return checkpoint;
}

export async function deleteCheckpoint(
  eventId: string,
  checkpointId: string,
): Promise<void> {
  await db
    .delete(checkpoints)
    .where(
      and(eq(checkpoints.eventId, eventId), eq(checkpoints.id, checkpointId)),
    );
}

async function nextVersion(teamId: string): Promise<number> {
  const [row] = await db
    .select({
      value: sql<number>`coalesce(max(${checkpoints.version}), 0)::int`,
    })
    .from(checkpoints)
    .where(eq(checkpoints.teamId, teamId));

  return (row?.value ?? 0) + 1;
}
