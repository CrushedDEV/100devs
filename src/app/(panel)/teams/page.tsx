import type { Metadata } from "next";
import { UsersRound } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { TeamBoard } from "@/components/teams/team-board";
import { TeamFormDialog } from "@/components/teams/team-form-dialog";
import { getActiveEvent } from "@/server/services/events";
import { listParticipants } from "@/server/services/participants";
import { listTeams } from "@/server/services/teams";

export const metadata: Metadata = { title: "Equipos" };
export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  const { event } = await getActiveEvent();
  const [teams, participants] = await Promise.all([
    listTeams(event.id),
    listParticipants(event.id),
  ]);

  const unassigned = participants.filter((p) => !p.team).length;

  return (
    <>
      <PageHeader
        title="Equipos"
        description={`${teams.length} equipos · ${unassigned} participantes sin asignar. Arrastra para reorganizar; el orden define la rotación de turnos.`}
      >
        <TeamFormDialog />
      </PageHeader>

      {teams.length || participants.length ? (
        <TeamBoard teams={teams} participants={participants} />
      ) : (
        <EmptyState
          icon={UsersRound}
          title="Sin equipos ni participantes"
          description="Sincroniza con Discord para importar participantes y crea el primer equipo."
          action={<TeamFormDialog />}
        />
      )}
    </>
  );
}
