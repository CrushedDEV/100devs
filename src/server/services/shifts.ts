import "server-only";

import { addMinutes } from "date-fns";
import { and, asc, eq, gte, lte, sql, type SQL } from "drizzle-orm";

import { DELAY_GRACE_MINUTES, type ShiftStatus } from "@/lib/constants";
import { db } from "@/server/db";
import { participants, shifts, teams, users, type Shift } from "@/server/db/schema";

export interface ShiftView {
  id: string;
  teamId: string;
  teamName: string;
  teamColor: string;
  participantId: string | null;
  participantName: string | null;
  participantAvatar: string | null;
  participantDiscordId: string | null;
  startsAt: Date;
  endsAt: Date;
  actualStartAt: Date | null;
  actualEndAt: Date | null;
  status: ShiftStatus;
  orderIndex: number;
  notes: string | null;
}

const selection = {
  id: shifts.id,
  teamId: shifts.teamId,
  teamName: teams.name,
  teamColor: teams.color,
  participantId: participants.id,
  participantUsername: users.username,
  participantGlobalName: users.globalName,
  participantNickname: users.nickname,
  participantAvatar: users.avatarUrl,
  participantDiscordId: users.discordId,
  startsAt: shifts.startsAt,
  endsAt: shifts.endsAt,
  actualStartAt: shifts.actualStartAt,
  actualEndAt: shifts.actualEndAt,
  status: shifts.status,
  orderIndex: shifts.orderIndex,
  notes: shifts.notes,
};

interface ShiftRow {
  id: string;
  teamId: string;
  teamName: string;
  teamColor: string;
  participantId: string | null;
  participantUsername: string | null;
  participantGlobalName: string | null;
  participantNickname: string | null;
  participantAvatar: string | null;
  participantDiscordId: string | null;
  startsAt: Date;
  endsAt: Date;
  actualStartAt: Date | null;
  actualEndAt: Date | null;
  status: ShiftStatus;
  orderIndex: number;
  notes: string | null;
}

function toView(row: ShiftRow): ShiftView {
  return {
    id: row.id,
    teamId: row.teamId,
    teamName: row.teamName,
    teamColor: row.teamColor,
    participantId: row.participantId,
    participantName: row.participantId
      ? (row.participantNickname ??
        row.participantGlobalName ??
        row.participantUsername ??
        "Participante")
      : null,
    participantAvatar: row.participantAvatar,
    participantDiscordId: row.participantDiscordId,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    actualStartAt: row.actualStartAt,
    actualEndAt: row.actualEndAt,
    status: row.status,
    orderIndex: row.orderIndex,
    notes: row.notes,
  };
}

export interface ShiftQuery {
  from?: Date;
  to?: Date;
  teamId?: string;
  participantId?: string;
  status?: ShiftStatus;
  limit?: number;
}

export async function listShifts(
  eventId: string,
  query: ShiftQuery = {},
): Promise<ShiftView[]> {
  const conditions: SQL[] = [eq(shifts.eventId, eventId)];

  if (query.from) conditions.push(gte(shifts.startsAt, query.from));
  if (query.to) conditions.push(lte(shifts.startsAt, query.to));
  if (query.teamId) conditions.push(eq(shifts.teamId, query.teamId));
  if (query.participantId) {
    conditions.push(eq(shifts.participantId, query.participantId));
  }
  if (query.status) conditions.push(eq(shifts.status, query.status));

  const rows = await db
    .select(selection)
    .from(shifts)
    .innerJoin(teams, eq(shifts.teamId, teams.id))
    .leftJoin(participants, eq(shifts.participantId, participants.id))
    .leftJoin(users, eq(participants.userId, users.id))
    .where(and(...conditions))
    .orderBy(asc(shifts.startsAt), asc(teams.orderIndex))
    .limit(query.limit ?? 500);

  return rows.map(toView);
}

export async function getShift(
  eventId: string,
  shiftId: string,
): Promise<ShiftView | null> {
  const [row] = await db
    .select(selection)
    .from(shifts)
    .innerJoin(teams, eq(shifts.teamId, teams.id))
    .leftJoin(participants, eq(shifts.participantId, participants.id))
    .leftJoin(users, eq(participants.userId, users.id))
    .where(and(eq(shifts.eventId, eventId), eq(shifts.id, shiftId)))
    .limit(1);

  return row ? toView(row) : null;
}

export interface CreateShiftInput {
  eventId: string;
  teamId: string;
  participantId?: string | null;
  startsAt: Date;
  endsAt: Date;
  status?: ShiftStatus;
  notes?: string | null;
}

export async function createShift(input: CreateShiftInput): Promise<Shift> {
  const orderIndex = await nextShiftOrderIndex(input.teamId);

  const [shift] = await db
    .insert(shifts)
    .values({
      eventId: input.eventId,
      teamId: input.teamId,
      participantId: input.participantId ?? null,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      status: input.status ?? "scheduled",
      notes: input.notes ?? null,
      orderIndex,
    })
    .returning();

  return shift;
}

export async function updateShift(
  eventId: string,
  shiftId: string,
  values: Partial<
    Pick<
      Shift,
      | "teamId"
      | "participantId"
      | "startsAt"
      | "endsAt"
      | "status"
      | "notes"
      | "actualStartAt"
      | "actualEndAt"
    >
  >,
): Promise<Shift> {
  const [shift] = await db
    .update(shifts)
    .set({ ...values, updatedAt: new Date() })
    .where(and(eq(shifts.eventId, eventId), eq(shifts.id, shiftId)))
    .returning();

  return shift;
}

export async function deleteShift(
  eventId: string,
  shiftId: string,
): Promise<void> {
  await db
    .delete(shifts)
    .where(and(eq(shifts.eventId, eventId), eq(shifts.id, shiftId)));
}

/**
 * Creates a full rotation for a team: one shift per participant, in rotation
 * order, chained back-to-back from `startsAt`.
 */
export async function generateRotation(input: {
  eventId: string;
  teamId: string;
  startsAt: Date;
  shiftMinutes: number;
  gapMinutes: number;
  rounds: number;
}): Promise<Shift[]> {
  const members = await db
    .select({ id: participants.id })
    .from(participants)
    .where(eq(participants.teamId, input.teamId))
    .orderBy(asc(participants.orderIndex));

  if (!members.length) return [];

  let cursor = input.startsAt;
  let orderIndex = await nextShiftOrderIndex(input.teamId);
  const values = [];

  for (let round = 0; round < input.rounds; round++) {
    for (const member of members) {
      const endsAt = addMinutes(cursor, input.shiftMinutes);
      values.push({
        eventId: input.eventId,
        teamId: input.teamId,
        participantId: member.id,
        startsAt: cursor,
        endsAt,
        status: "scheduled" as const,
        orderIndex: orderIndex++,
      });
      cursor = addMinutes(endsAt, input.gapMinutes);
    }
  }

  return db.insert(shifts).values(values).returning();
}

async function nextShiftOrderIndex(teamId: string): Promise<number> {
  const [row] = await db
    .select({ value: sql<number>`coalesce(max(${shifts.orderIndex}), -1)::int` })
    .from(shifts)
    .where(eq(shifts.teamId, teamId));

  return (row?.value ?? -1) + 1;
}

/* -------------------------------------------------------------------------- */
/*                              Derived helpers                               */
/* -------------------------------------------------------------------------- */

/** True when a scheduled/in-progress shift has run past its end + grace. */
export function isOverdue(shift: ShiftView, now = new Date()): boolean {
  if (shift.status === "completed" || shift.status === "cancelled") return false;
  return now.getTime() > addMinutes(shift.endsAt, DELAY_GRACE_MINUTES).getTime();
}

export function isLive(shift: ShiftView, now = new Date()): boolean {
  if (shift.status === "in_progress") return true;
  return (
    shift.status === "scheduled" &&
    now >= shift.startsAt &&
    now <= shift.endsAt
  );
}

/**
 * Reconciles stored statuses with wall-clock time. Called by the cron job so
 * "delayed" badges appear without anyone touching the panel.
 */
export async function refreshShiftStatuses(eventId: string): Promise<number> {
  const now = new Date();
  const threshold = addMinutes(now, -DELAY_GRACE_MINUTES);

  const updated = await db
    .update(shifts)
    .set({ status: "delayed", updatedAt: now })
    .where(
      and(
        eq(shifts.eventId, eventId),
        lte(shifts.endsAt, threshold),
        sql`${shifts.status} in ('scheduled', 'in_progress')`,
      ),
    )
    .returning({ id: shifts.id });

  const started = await db
    .update(shifts)
    .set({ status: "in_progress", actualStartAt: sql`coalesce(${shifts.actualStartAt}, now())`, updatedAt: now })
    .where(
      and(
        eq(shifts.eventId, eventId),
        lte(shifts.startsAt, now),
        gte(shifts.endsAt, now),
        eq(shifts.status, "scheduled"),
      ),
    )
    .returning({ id: shifts.id });

  return updated.length + started.length;
}
