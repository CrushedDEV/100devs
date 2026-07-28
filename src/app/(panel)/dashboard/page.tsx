import type { Metadata } from "next";
import Link from "next/link";
import {
  CircleCheck,
  LayoutDashboard,
  ListChecks,
  TriangleAlert,
  Users,
  Zap,
} from "lucide-react";

import { RecentCheckpoints } from "@/components/dashboard/recent-checkpoints";
import { TeamStatusCard } from "@/components/dashboard/team-status-card";
import { UpcomingShifts } from "@/components/dashboard/upcoming-shifts";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { SyncButton } from "@/components/layout/sync-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { getDashboardSnapshot } from "@/server/services/dashboard";
import { getActiveEvent } from "@/server/services/events";

export const metadata: Metadata = { title: "Dashboard" };

// The board reflects live shift state, so it must never be cached.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const context = await getActiveEvent();
  const snapshot = await getDashboardSnapshot(context);
  const { totals, board } = snapshot;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Estado en tiempo real · ${formatDateTime(snapshot.now)}`}
      >
        <SyncButton variant="full" />
        <Button asChild size="sm">
          <Link href="/calendar">Ver calendario</Link>
        </Button>
      </PageHeader>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Progreso global"
          value={`${totals.progress}%`}
          hint={`${totals.completedShifts} de ${totals.shifts} turnos completados`}
          icon={Zap}
          tone="brand"
          progress={totals.progress}
        />
        <StatCard
          label="Desarrollando ahora"
          value={totals.liveTeams}
          hint={`${totals.teams} equipos en total`}
          icon={LayoutDashboard}
          tone="info"
        />
        <StatCard
          label="Equipos finalizados"
          value={totals.finishedTeams}
          hint="Han completado toda su rotación"
          icon={CircleCheck}
          tone="success"
        />
        <StatCard
          label="Con retraso"
          value={totals.delayedTeams}
          hint="Requieren seguimiento"
          icon={TriangleAlert}
          tone={totals.delayedTeams > 0 ? "warning" : "neutral"}
        />
        <StatCard
          label="Participantes"
          value={totals.participants}
          hint={`${totals.checkpoints} checkpoints registrados`}
          icon={Users}
          tone="neutral"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-sm font-semibold">
              Estado por equipo
            </h2>
            <Link
              href="/teams"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Gestionar equipos →
            </Link>
          </div>

          {board.length ? (
            <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
              {board.map((entry) => (
                <TeamStatusCard key={entry.team.id} entry={entry} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Users}
              title="Todavía no hay equipos"
              description="Crea el primer equipo y asigna participantes para empezar a organizar los turnos."
              action={
                <Button asChild size="sm">
                  <Link href="/teams">Crear equipo</Link>
                </Button>
              }
            />
          )}
        </div>

        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Próximos turnos</CardTitle>
            </CardHeader>
            <CardContent>
              <UpcomingShifts shifts={snapshot.upcoming} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListChecks className="size-4 text-muted-foreground" />
                Últimas entregas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RecentCheckpoints checkpoints={snapshot.recentCheckpoints} />
            </CardContent>
          </Card>
        </aside>
      </section>
    </>
  );
}
