import "server-only";

import { addMinutes, subMinutes } from "date-fns";
import { and, eq, gte, inArray, lte } from "drizzle-orm";

import type { ReminderKind } from "@/lib/constants";
import { db } from "@/server/db";
import {
  participants,
  reminders,
  shifts,
  teams,
  users,
  type Event,
  type EventSettings,
} from "@/server/db/schema";
import { sendShiftReminder, sendShiftStartNotice } from "@/server/discord/notify";

import { logTimelineEvent } from "./timeline";

export interface ReminderDispatchResult {
  scheduled: number;
  sent: number;
  failed: number;
}

/**
 * Materialises the reminder rows for every upcoming shift.
 *
 * Rows are the unit of idempotency: a unique index on
 * (shift, kind, offset) guarantees a participant is never pinged twice for the
 * same milestone, even if the cron job overlaps with a manual run.
 */
export async function scheduleReminders(
  event: Event,
  settings: EventSettings,
  horizonMinutes = 24 * 60,
): Promise<number> {
  if (!settings.remindersEnabled) return 0;

  const now = new Date();
  const horizon = addMinutes(now, horizonMinutes);

  const upcoming = await db
    .select({
      id: shifts.id,
      startsAt: shifts.startsAt,
      participantId: shifts.participantId,
    })
    .from(shifts)
    .where(
      and(
        eq(shifts.eventId, event.id),
        gte(shifts.startsAt, now),
        lte(shifts.startsAt, horizon),
        inArray(shifts.status, ["scheduled", "delayed"]),
      ),
    );

  const rows = upcoming
    .filter((shift) => shift.participantId)
    .flatMap((shift) => {
      const offsets = settings.reminderOffsets.filter((offset) => offset > 0);

      const before = offsets.map((offset) => ({
        eventId: event.id,
        shiftId: shift.id,
        kind: "before_shift" as ReminderKind,
        offsetMinutes: offset,
        scheduledFor: subMinutes(shift.startsAt, offset),
      }));

      return [
        ...before,
        {
          eventId: event.id,
          shiftId: shift.id,
          kind: "shift_start" as ReminderKind,
          offsetMinutes: 0,
          scheduledFor: shift.startsAt,
        },
      ];
    })
    .filter((row) => row.scheduledFor >= subMinutes(now, 5));

  if (!rows.length) return 0;

  const inserted = await db
    .insert(reminders)
    .values(rows)
    .onConflictDoNothing()
    .returning({ id: reminders.id });

  return inserted.length;
}

/** Sends every pending reminder whose time has come. */
export async function dispatchDueReminders(
  event: Event,
  settings: EventSettings,
): Promise<ReminderDispatchResult> {
  const scheduled = await scheduleReminders(event, settings);

  if (!settings.remindersEnabled) {
    return { scheduled, sent: 0, failed: 0 };
  }

  const now = new Date();

  const due = await db
    .select({
      reminderId: reminders.id,
      kind: reminders.kind,
      offsetMinutes: reminders.offsetMinutes,
      shiftId: shifts.id,
      startsAt: shifts.startsAt,
      endsAt: shifts.endsAt,
      teamName: teams.name,
      teamId: teams.id,
      driveFolderUrl: teams.driveFolderUrl,
      participantId: participants.id,
      discordId: users.discordId,
      username: users.username,
      globalName: users.globalName,
      nickname: users.nickname,
    })
    .from(reminders)
    .innerJoin(shifts, eq(reminders.shiftId, shifts.id))
    .innerJoin(teams, eq(shifts.teamId, teams.id))
    .innerJoin(participants, eq(shifts.participantId, participants.id))
    .innerJoin(users, eq(participants.userId, users.id))
    .where(
      and(
        eq(reminders.eventId, event.id),
        eq(reminders.status, "pending"),
        lte(reminders.scheduledFor, now),
        // Never send a reminder for a shift that already started long ago.
        gte(reminders.scheduledFor, subMinutes(now, 30)),
      ),
    )
    .limit(100);

  let sent = 0;
  let failed = 0;

  for (const row of due) {
    const displayName = row.nickname ?? row.globalName ?? row.username;

    try {
      const payload = {
        discordId: row.discordId,
        displayName,
        teamName: row.teamName,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        timezone: event.timezone,
        driveFolderUrl: row.driveFolderUrl,
      };

      if (row.kind === "shift_start") {
        await sendShiftStartNotice(payload);
      } else {
        await sendShiftReminder({
          ...payload,
          minutesBefore: row.offsetMinutes,
        });
      }

      await db
        .update(reminders)
        .set({ status: "sent", sentAt: new Date(), updatedAt: new Date() })
        .where(eq(reminders.id, row.reminderId));

      await logTimelineEvent({
        eventId: event.id,
        type: "reminder_sent",
        title: `Recordatorio enviado a ${displayName}`,
        description:
          row.kind === "shift_start"
            ? "Aviso de inicio de turno"
            : `Aviso ${row.offsetMinutes} min antes del turno`,
        teamId: row.teamId,
        participantId: row.participantId,
        shiftId: row.shiftId,
      });

      sent++;
    } catch (error) {
      failed++;
      await db
        .update(reminders)
        .set({
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
          updatedAt: new Date(),
        })
        .where(eq(reminders.id, row.reminderId));
    }
  }

  return { scheduled, sent, failed };
}

/** Drops pending reminders for a shift — used when it is moved or cancelled. */
export async function cancelRemindersForShift(shiftId: string): Promise<void> {
  await db
    .delete(reminders)
    .where(and(eq(reminders.shiftId, shiftId), eq(reminders.status, "pending")));
}

export async function listRecentReminders(eventId: string, limit = 20) {
  return db.query.reminders.findMany({
    where: eq(reminders.eventId, eventId),
    orderBy: (table, { desc }) => [desc(table.scheduledFor)],
    limit,
  });
}
