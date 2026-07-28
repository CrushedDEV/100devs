import "server-only";

import { differenceInMinutes, format, startOfDay } from "date-fns";

import { db } from "@/server/db";
import { participants } from "@/server/db/schema";
import { eq } from "drizzle-orm";

import { listCheckpoints } from "./checkpoints";
import { listShifts } from "./shifts";
import { listTeams } from "./teams";

export interface EventStats {
  completionRate: number;
  totalShifts: number;
  completedShifts: number;
  delayedShifts: number;
  missedShifts: number;
  totalCheckpoints: number;
  lateCheckpoints: number;
  averageShiftMinutes: number | null;
  averageDelayMinutes: number | null;
  participantsTotal: number;
  participantsAssigned: number;
  teamProgress: {
    teamId: string;
    name: string;
    color: string;
    completed: number;
    total: number;
    progress: number;
  }[];
  checkpointsPerDay: { date: string; label: string; count: number }[];
  statusBreakdown: { status: string; label: string; count: number }[];
  topDelayedTeams: { name: string; color: string; delayed: number }[];
}

const SHIFT_STATUS_LABELS: Record<string, string> = {
  scheduled: "Programados",
  in_progress: "En curso",
  completed: "Completados",
  delayed: "Con retraso",
  missed: "No entregados",
  cancelled: "Cancelados",
};

export async function getEventStats(eventId: string): Promise<EventStats> {
  const [teams, shifts, checkpoints, enrolments] = await Promise.all([
    listTeams(eventId),
    listShifts(eventId, { limit: 5000 }),
    listCheckpoints(eventId, { limit: 2000 }),
    db
      .select({ id: participants.id, teamId: participants.teamId })
      .from(participants)
      .where(eq(participants.eventId, eventId)),
  ]);

  const relevant = shifts.filter((shift) => shift.status !== "cancelled");
  const completed = relevant.filter((shift) => shift.status === "completed");
  const delayed = relevant.filter((shift) => shift.status === "delayed");
  const missed = relevant.filter((shift) => shift.status === "missed");

  const realDurations = completed
    .filter((shift) => shift.actualStartAt && shift.actualEndAt)
    .map((shift) =>
      differenceInMinutes(shift.actualEndAt!, shift.actualStartAt!),
    )
    .filter((minutes) => minutes > 0);

  const plannedDurations = relevant.map((shift) =>
    differenceInMinutes(shift.endsAt, shift.startsAt),
  );

  const delays = completed
    .filter((shift) => shift.actualEndAt)
    .map((shift) => differenceInMinutes(shift.actualEndAt!, shift.endsAt))
    .filter((minutes) => minutes > 0);

  const perDay = new Map<string, number>();
  for (const checkpoint of checkpoints) {
    const date = checkpoint.submittedAt ?? checkpoint.createdAt;
    const key = format(startOfDay(date), "yyyy-MM-dd");
    perDay.set(key, (perDay.get(key) ?? 0) + 1);
  }

  const statusCounts = new Map<string, number>();
  for (const shift of shifts) {
    statusCounts.set(shift.status, (statusCounts.get(shift.status) ?? 0) + 1);
  }

  const delayedByTeam = new Map<string, number>();
  for (const shift of delayed) {
    delayedByTeam.set(shift.teamId, (delayedByTeam.get(shift.teamId) ?? 0) + 1);
  }

  return {
    completionRate: relevant.length
      ? Math.round((completed.length / relevant.length) * 100)
      : 0,
    totalShifts: relevant.length,
    completedShifts: completed.length,
    delayedShifts: delayed.length,
    missedShifts: missed.length,
    totalCheckpoints: checkpoints.length,
    lateCheckpoints: checkpoints.filter((cp) => cp.status === "late").length,
    averageShiftMinutes: average(
      realDurations.length ? realDurations : plannedDurations,
    ),
    averageDelayMinutes: average(delays),
    participantsTotal: enrolments.length,
    participantsAssigned: enrolments.filter((row) => row.teamId).length,
    teamProgress: teams.map((team) => {
      const total = team.shiftCount;
      const done = team.completedShiftCount;
      return {
        teamId: team.id,
        name: team.name,
        color: team.color,
        completed: done,
        total,
        progress: total ? Math.round((done / total) * 100) : 0,
      };
    }),
    checkpointsPerDay: [...perDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({
        date,
        label: format(new Date(date), "d MMM"),
        count,
      })),
    statusBreakdown: [...statusCounts.entries()].map(([status, count]) => ({
      status,
      label: SHIFT_STATUS_LABELS[status] ?? status,
      count,
    })),
    topDelayedTeams: teams
      .map((team) => ({
        name: team.name,
        color: team.color,
        delayed: delayedByTeam.get(team.id) ?? 0,
      }))
      .filter((row) => row.delayed > 0)
      .sort((a, b) => b.delayed - a.delayed)
      .slice(0, 5),
  };
}

function average(values: number[]): number | null {
  if (!values.length) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}
