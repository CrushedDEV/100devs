import type { Metadata } from "next";
import Link from "next/link";

import { CircleCheck, Users, UsersRound } from "lucide-react";

import { SyncButton } from "@/components/layout/sync-button";
import { ParticipantsTable } from "@/components/participants/participants-table";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
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
  const { event, settings } = await getActiveEvent();
  const [participants, teams, params] = await Promise.all([
    listParticipants(event.id),
    listTeams(event.id),
    searchParams,
  ]);

  const assigned = participants.filter((p) => p.team).length;
  const active = participants.filter((p) => p.status === "active").length;

  return (
    <>
      <PageHeader
        title="Participantes"
        description="Sincronizados automáticamente desde Discord."
      >
        <SyncButton variant="full" />
        <Button asChild size="sm" variant="outline">
          <Link href="/teams">Organizar equipos</Link>
        </Button>
      </PageHeader>

      <section className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Participantes totales"
          value={participants.length}
          hint="Importados desde Discord"
          icon={Users}
          tone="brand"
        />
        <StatCard
          label="Con equipo"
          value={`${assigned}/${participants.length}`}
          hint={`${participants.length - assigned} sin asignar`}
          icon={UsersRound}
          tone="info"
          progress={
            participants.length
              ? Math.round((assigned / participants.length) * 100)
              : 0
          }
        />
        <StatCard
          label="Activos"
          value={active}
          hint="Con rol de participante vigente"
          icon={CircleCheck}
          tone="success"
        />
      </section>

      <ParticipantsTable
        participants={participants}
        teams={teams.map((team) => ({ id: team.id, name: team.name }))}
        skillRoleIds={settings.skillRoleIds}
        initialParticipantId={params.participant}
      />
    </>
  );
}
