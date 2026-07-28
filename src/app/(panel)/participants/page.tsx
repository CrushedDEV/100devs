import type { Metadata } from "next";
import Link from "next/link";

import { SyncButton } from "@/components/layout/sync-button";
import { ParticipantsTable } from "@/components/participants/participants-table";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { getActiveEvent } from "@/server/services/events";
import { listParticipants } from "@/server/services/participants";
import { listTeams } from "@/server/services/teams";

export const metadata: Metadata = { title: "Participantes" };
export const dynamic = "force-dynamic";

export default async function ParticipantsPage({
  searchParams,
}: {
  searchParams: Promise<{ participant?: string }>;
}) {
  const { event } = await getActiveEvent();
  const [participants, teams, params] = await Promise.all([
    listParticipants(event.id),
    listTeams(event.id),
    searchParams,
  ]);

  const assigned = participants.filter((p) => p.team).length;

  return (
    <>
      <PageHeader
        title="Participantes"
        description={`${participants.length} sincronizados desde Discord · ${assigned} asignados a un equipo`}
      >
        <SyncButton variant="full" />
        <Button asChild size="sm" variant="outline">
          <Link href="/teams">Organizar equipos</Link>
        </Button>
      </PageHeader>

      <ParticipantsTable
        participants={participants}
        teams={teams.map((team) => ({ id: team.id, name: team.name }))}
        initialParticipantId={params.participant}
      />
    </>
  );
}
