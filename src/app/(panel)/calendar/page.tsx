import type { Metadata } from "next";
import { addDays, subDays } from "date-fns";

import { CalendarView } from "@/components/calendar/calendar-view";
import { PageHeader } from "@/components/shared/page-header";
import { ShiftFormDialog } from "@/components/shifts/shift-form-dialog";
import { getActiveEvent } from "@/server/services/events";
import { listParticipants } from "@/server/services/participants";
import { listShifts } from "@/server/services/shifts";
import { listTeams } from "@/server/services/teams";

export const metadata: Metadata = { title: "Calendario" };
export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const { event } = await getActiveEvent();
  const now = new Date();

  // A generous window keeps week/month navigation instant without refetching.
  const [shifts, teams, participants] = await Promise.all([
    listShifts(event.id, {
      from: subDays(now, 60),
      to: addDays(now, 120),
      limit: 3000,
    }),
    listTeams(event.id),
    listParticipants(event.id),
  ]);

  return (
    <>
      <PageHeader
        title="Calendario"
        description="Organiza los turnos arrastrándolos. Vista semanal por franjas horarias y vista mensual para la planificación global."
      >
        <ShiftFormDialog
          teams={teams.map((team) => ({ id: team.id, label: team.name }))}
          participants={participants
            .filter((participant) => participant.team)
            .map((participant) => ({
              id: participant.id,
              label: participant.name,
              teamId: participant.team!.id,
            }))}
          defaultShiftMinutes={event.defaultShiftMinutes}
        />
      </PageHeader>

      <CalendarView
        shifts={shifts}
        teams={teams.map((team) => ({
          id: team.id,
          name: team.name,
          color: team.color,
        }))}
      />
    </>
  );
}
