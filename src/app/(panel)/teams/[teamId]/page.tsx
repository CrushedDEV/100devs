import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FolderOpen, MessageSquare } from "lucide-react";

import { CheckpointFormDialog } from "@/components/checkpoints/checkpoint-form-dialog";
import { CheckpointTimeline } from "@/components/checkpoints/checkpoint-timeline";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { RotationDialog } from "@/components/shifts/rotation-dialog";
import { ShiftsTable } from "@/components/shifts/shifts-table";
import { DeleteTeamButton } from "@/components/teams/delete-team-button";
import { TeamFormDialog } from "@/components/teams/team-form-dialog";
import { TeamRoster } from "@/components/teams/team-roster";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TEAM_STATUS_META } from "@/lib/constants";
import { formatRange, formatRelative } from "@/lib/format";
import { listCheckpoints } from "@/server/services/checkpoints";
import { getActiveEvent } from "@/server/services/events";
import { listParticipants } from "@/server/services/participants";
import { listShifts } from "@/server/services/shifts";
import { getTeam } from "@/server/services/teams";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ teamId: string }>;
}): Promise<Metadata> {
  const { teamId } = await params;
  const { event } = await getActiveEvent();
  const team = await getTeam(event.id, teamId);

  return { title: team?.name ?? "Equipo" };
}

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const { event } = await getActiveEvent();
  const team = await getTeam(event.id, teamId);

  if (!team) notFound();

  const [allParticipants, shifts, checkpoints] = await Promise.all([
    listParticipants(event.id),
    listShifts(event.id, { teamId }),
    listCheckpoints(event.id, { teamId }),
  ]);

  const members = allParticipants
    .filter((participant) => participant.team?.id === teamId)
    .sort((a, b) => a.orderIndex - b.orderIndex);

  const completed = shifts.filter((shift) => shift.status === "completed").length;
  const relevant = shifts.filter((shift) => shift.status !== "cancelled").length;
  const progress = relevant ? Math.round((completed / relevant) * 100) : 0;
  const status = TEAM_STATUS_META[team.status];

  const nextShift = shifts.find(
    (shift) => shift.startsAt > new Date() && shift.status !== "cancelled",
  );

  return (
    <>
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
          <Link href="/teams">
            <ArrowLeft className="size-3.5" />
            Equipos
          </Link>
        </Button>

        <PageHeader
          title={team.name}
          description={team.description ?? "Sin descripción"}
        >
          <StatusBadge label={status.label} tone={status.tone} />
          {team.driveFolderUrl && (
            <Button asChild size="sm" variant="outline">
              <a
                href={team.driveFolderUrl}
                target="_blank"
                rel="noreferrer noopener"
              >
                <FolderOpen className="size-3.5" />
                Drive
              </a>
            </Button>
          )}
          <RotationDialog
            teamId={team.id}
            defaultShiftMinutes={event.defaultShiftMinutes}
            participantCount={members.length}
          />
          <TeamFormDialog
            team={team}
            trigger={
              <Button size="sm" variant="outline">
                Editar
              </Button>
            }
          />
          <CheckpointFormDialog
            teamId={team.id}
            participants={members.map((member) => ({
              id: member.id,
              label: member.name,
            }))}
            shifts={shifts.map((shift) => ({
              id: shift.id,
              label: `${formatRange(shift.startsAt, shift.endsAt)}${
                shift.participantName ? ` · ${shift.participantName}` : ""
              }`,
            }))}
          />
        </PageHeader>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Progreso"
          value={`${progress}%`}
          hint={`${completed}/${relevant} turnos completados`}
          tone="brand"
          progress={progress}
        />
        <StatCard
          label="Participantes"
          value={members.length}
          hint="Orden de rotación editable"
        />
        <StatCard
          label="Checkpoints"
          value={checkpoints.length}
          hint={
            checkpoints[0]
              ? `Último ${formatRelative(checkpoints[0].submittedAt ?? checkpoints[0].createdAt)}`
              : "Sin entregas"
          }
          tone="success"
        />
        <StatCard
          label="Próximo turno"
          value={nextShift?.participantName ?? "—"}
          hint={nextShift ? formatRelative(nextShift.startsAt) : "Nada programado"}
          tone="info"
        />
      </section>

      <Tabs defaultValue="roster" className="space-y-4">
        <TabsList>
          <TabsTrigger value="roster">Integrantes</TabsTrigger>
          <TabsTrigger value="shifts">Turnos</TabsTrigger>
          <TabsTrigger value="checkpoints">Checkpoints</TabsTrigger>
        </TabsList>

        <TabsContent value="roster" className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <Card>
            <CardHeader>
              <CardTitle>Orden de rotación</CardTitle>
            </CardHeader>
            <CardContent>
              <TeamRoster members={members} />
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="size-4 text-muted-foreground" />
                  Notas internas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                  {team.internalNotes ?? "Sin notas."}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Zona peligrosa</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Eliminar el equipo borra también sus turnos y su historial de
                  checkpoints. Los participantes vuelven a quedar sin asignar.
                </p>
                <DeleteTeamButton teamId={team.id} teamName={team.name} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="shifts">
          <ShiftsTable shifts={shifts} />
        </TabsContent>

        <TabsContent value="checkpoints">
          <CheckpointTimeline checkpoints={checkpoints} />
        </TabsContent>
      </Tabs>
    </>
  );
}
