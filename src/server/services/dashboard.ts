import "server-only";

import { addMinutes } from "date-fns";

import { UPCOMING_WINDOW_MINUTES } from "@/lib/constants";
import type { EventContext } from "./events";
import { listCheckpoints, type CheckpointView } from "./checkpoints";
import { listShifts, isOverdue, type ShiftView } from "./shifts";
import { listTeams, type TeamView } from "./teams";

export interface TeamBoardEntry {
  team: TeamView;
  current: ShiftView | null;
  next: ShiftView | null;
  lastCheckpoint: CheckpointView | null;
  completedShifts: number;
  totalShifts: number;
  progress: number;
  isDelayed: boolean;
  isFinished: boolean;
}

export interface DashboardSnapshot {
  now: Date;
  board: TeamBoardEntry[];
  totals: {
    teams: number;
    participants: number;
    shifts: number;
    completedShifts: number;
    checkpoints: number;
    delayedTeams: number;
    liveTeams: number;
    finishedTeams: number;
    progress: number;
  };
  upcoming: ShiftView[];
  recentCheckpoints: CheckpointView[];
}

/**
 * Single aggregated read for the dashboard so the page performs a bounded
 * number of queries regardless of how many teams exist.
 */
export async function getDashboardSnapshot(
  context: EventContext,
): Promise<DashboardSnapshot> {
  const { event } = context;
  const now = new Date();

  const [teams, shifts, checkpoints] = await Promise.all([
    listTeams(event.id),
    listShifts(event.id, { limit: 2000 }),
    listCheckpoints(event.id, { limit: 500 }),
  ]);

  const shiftsByTeam = groupBy(shifts, (shift) => shift.teamId);
  const checkpointsByTeam = groupBy(checkpoints, (cp) => cp.teamId);

  const board: TeamBoardEntry[] = teams.map((team) => {
    const teamShifts = (shiftsByTeam.get(team.id) ?? []).sort(
      (a, b) => a.startsAt.getTime() - b.startsAt.getTime(),
    );

    const current =
      teamShifts.find((shift) => shift.status === "in_progress") ??
      teamShifts.find(
        (shift) =>
          shift.status !== "completed" &&
          shift.status !== "cancelled" &&
          shift.startsAt <= now &&
          shift.endsAt >= now,
      ) ??
      null;

    const next =
      teamShifts.find(
        (shift) =>
          shift.id !== current?.id &&
          shift.startsAt > now &&
          shift.status !== "cancelled",
      ) ?? null;

    const completedShifts = teamShifts.filter(
      (shift) => shift.status === "completed",
    ).length;
    const relevantShifts = teamShifts.filter(
      (shift) => shift.status !== "cancelled",
    ).length;

    const teamCheckpoints = checkpointsByTeam.get(team.id) ?? [];
    const lastCheckpoint = teamCheckpoints[0] ?? null;

    const isDelayed = teamShifts.some(
      (shift) => shift.status === "delayed" || isOverdue(shift, now),
    );

    return {
      team,
      current,
      next,
      lastCheckpoint,
      completedShifts,
      totalShifts: relevantShifts,
      progress: relevantShifts
        ? Math.round((completedShifts / relevantShifts) * 100)
        : 0,
      isDelayed,
      isFinished:
        team.status === "finished" ||
        (relevantShifts > 0 && completedShifts === relevantShifts),
    };
  });

  const horizon = addMinutes(now, UPCOMING_WINDOW_MINUTES);
  const upcoming = shifts
    .filter(
      (shift) =>
        shift.startsAt > now &&
        shift.startsAt <= horizon &&
        shift.status !== "cancelled",
    )
    .slice(0, 8);

  const completedShifts = shifts.filter(
    (shift) => shift.status === "completed",
  ).length;
  const relevantShifts = shifts.filter(
    (shift) => shift.status !== "cancelled",
  ).length;

  const participantCount = teams.reduce(
    (sum, team) => sum + team.participantCount,
    0,
  );

  return {
    now,
    board,
    totals: {
      teams: teams.length,
      participants: participantCount,
      shifts: relevantShifts,
      completedShifts,
      checkpoints: checkpoints.length,
      delayedTeams: board.filter((entry) => entry.isDelayed).length,
      liveTeams: board.filter((entry) => entry.current).length,
      finishedTeams: board.filter((entry) => entry.isFinished).length,
      progress: relevantShifts
        ? Math.round((completedShifts / relevantShifts) * 100)
        : 0,
    },
    upcoming,
    recentCheckpoints: checkpoints.slice(0, 6),
  };
}

function groupBy<T, K>(items: T[], key: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const bucket = map.get(key(item)) ?? [];
    bucket.push(item);
    map.set(key(item), bucket);
  }
  return map;
}
