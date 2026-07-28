import type { Metadata } from "next";

import { CheckpointFormDialog } from "@/components/checkpoints/checkpoint-form-dialog";
import { CheckpointsExplorer } from "@/components/checkpoints/checkpoints-explorer";
import { PageHeader } from "@/components/shared/page-header";
import { formatRange } from "@/lib/format";
import { listCheckpoints } from "@/server/services/checkpoints";
import { getActiveEvent } from "@/server/services/events";
import { listParticipants } from "@/server/services/participants";
import { listShifts } from "@/server/services/shifts";
import { listTeams } from "@/server/services/teams";

export const metadata: Metadata = { title: "Checkpoints" };
export const dynamic = "force-dynamic";

export default async function CheckpointsPage() {
  const { event } = await getActiveEvent();
  const [checkpoints, teams, participants, shifts] = await Promise.all([
    listCheckpoints(event.id, { limit: 500 }),
    listTeams(event.id),
    listParticipants(event.id),
    listShifts(event.id, { limit: 1000 }),
  ]);

  return (
    <>
      <PageHeader
        title="Checkpoints"
        description="Historial completo de entregas. Solo se almacenan enlaces a Google Drive y a las grabaciones — nunca los proyectos de Unity."
      >
        <CheckpointFormDialog
          teams={teams.map((team) => ({ id: team.id, label: team.name }))}
          participants={participants.map((participant) => ({
            id: participant.id,
            label: participant.team
              ? `${participant.name} · ${participant.team.name}`
              : participant.name,
          }))}
          shifts={shifts.map((shift) => ({
            id: shift.id,
            label: `${shift.teamName} · ${formatRange(shift.startsAt, shift.endsAt)}`,
          }))}
        />
      </PageHeader>

      <CheckpointsExplorer
        checkpoints={checkpoints}
        teams={teams.map((team) => ({ id: team.id, name: team.name }))}
      />
    </>
  );
}
