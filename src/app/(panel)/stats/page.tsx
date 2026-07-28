import type { Metadata } from "next";
import {
  CircleCheck,
  Hourglass,
  ListChecks,
  Timer,
  TriangleAlert,
  Users,
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import {
  CheckpointsChart,
  ShiftStatusChart,
  TeamProgressChart,
} from "@/components/stats/stats-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDuration } from "@/lib/format";
import { getActiveEvent } from "@/server/services/events";
import { getEventStats } from "@/server/services/stats";

export const metadata: Metadata = { title: "Estadísticas" };
export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const { event } = await getActiveEvent();
  const stats = await getEventStats(event.id);

  return (
    <>
      <PageHeader
        title="Estadísticas"
        description="Métricas de progreso, ritmo de entregas y puntos de fricción de la organización."
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Completado"
          value={`${stats.completionRate}%`}
          hint={`${stats.completedShifts} de ${stats.totalShifts} turnos`}
          icon={CircleCheck}
          tone="success"
          progress={stats.completionRate}
        />
        <StatCard
          label="Duración media de turno"
          value={formatDuration(stats.averageShiftMinutes)}
          hint="Sobre los turnos con inicio y fin registrados"
          icon={Timer}
          tone="brand"
        />
        <StatCard
          label="Retraso medio"
          value={formatDuration(stats.averageDelayMinutes)}
          hint={`${stats.delayedShifts} turnos marcados con retraso`}
          icon={Hourglass}
          tone={stats.delayedShifts > 0 ? "warning" : "neutral"}
        />
        <StatCard
          label="Checkpoints"
          value={stats.totalCheckpoints}
          hint={`${stats.lateCheckpoints} entregas tardías`}
          icon={ListChecks}
          tone="info"
        />
        <StatCard
          label="Turnos no entregados"
          value={stats.missedShifts}
          hint="Requieren reasignación"
          icon={TriangleAlert}
          tone={stats.missedShifts > 0 ? "danger" : "neutral"}
        />
        <StatCard
          label="Participantes asignados"
          value={`${stats.participantsAssigned}/${stats.participantsTotal}`}
          hint="Con equipo confirmado"
          icon={Users}
          progress={
            stats.participantsTotal
              ? Math.round(
                  (stats.participantsAssigned / stats.participantsTotal) * 100,
                )
              : 0
          }
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Entregas por día</CardTitle>
          </CardHeader>
          <CardContent>
            <CheckpointsChart data={stats.checkpointsPerDay} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribución de turnos</CardTitle>
          </CardHeader>
          <CardContent>
            <ShiftStatusChart data={stats.statusBreakdown} />
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Progreso por equipo</CardTitle>
          </CardHeader>
          <CardContent>
            <TeamProgressChart data={stats.teamProgress} />
          </CardContent>
        </Card>
      </section>

      {stats.topDelayedTeams.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Equipos con más retrasos</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {stats.topDelayedTeams.map((team) => (
                <li key={team.name} className="flex items-center gap-2.5 text-sm">
                  <span
                    aria-hidden
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: team.color }}
                  />
                  <span className="flex-1">{team.name}</span>
                  <span className="font-medium tabular-nums text-warning">
                    {team.delayed}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </>
  );
}
