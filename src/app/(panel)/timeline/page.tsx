import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { EventTimeline } from "@/components/timeline/event-timeline";
import { getActiveEvent } from "@/server/services/events";
import { listTeams } from "@/server/services/teams";
import { listTimeline } from "@/server/services/timeline";

export const metadata: Metadata = { title: "Timeline" };
export const dynamic = "force-dynamic";

export default async function TimelinePage() {
  const { event } = await getActiveEvent();
  const [entries, teams] = await Promise.all([
    listTimeline(event.id, { limit: 300 }),
    listTeams(event.id),
  ]);

  return (
    <>
      <PageHeader
        title="Timeline"
        description="Histórico cronológico de todo lo que ocurre en el evento: turnos, entregas, retrasos, cambios de horario y sincronizaciones."
      />

      <EventTimeline
        entries={entries}
        teams={teams.map((team) => ({ id: team.id, name: team.name }))}
      />
    </>
  );
}
