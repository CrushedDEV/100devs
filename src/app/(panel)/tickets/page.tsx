import type { Metadata } from "next";
import {
  CircleAlert,
  CircleCheck,
  CircleDashed,
  Download,
  Hourglass,
  Ticket,
} from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { TicketBoard } from "@/components/tickets/ticket-board";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { getActiveEvent } from "@/server/services/events";
import { listTicketReviews } from "@/server/services/tickets";

export const metadata: Metadata = { title: "Tickets" };
export const dynamic = "force-dynamic";

export default async function TicketsPage() {
  const { event } = await getActiveEvent();
  const reviews = await listTicketReviews(event.id);

  const count = (status: string) =>
    reviews.filter((review) => review.status === status).length;

  const delivered = count("delivered");
  const lastAnalyzed = reviews.reduce<Date | null>(
    (latest, review) =>
      !latest || review.analyzedAt > latest ? review.analyzedAt : latest,
    null,
  );

  return (
    <>
      <PageHeader
        title="Tickets"
        description={
          lastAnalyzed
            ? `Estado de cada ticket según el último análisis · ${formatDateTime(lastAnalyzed)}`
            : "Estado de las entregas de cada participante, leído de su ticket privado."
        }
      >
        <Button asChild size="sm">
          {/* A plain link: the route streams a file download. */}
          <a href="/api/tickets/export" download>
            <Download className="size-3.5" />
            Exportar tickets
          </a>
        </Button>
      </PageHeader>

      {reviews.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title="Todavía no hay ningún análisis"
          description="Pulsa «Exportar tickets» para descargar las conversaciones. Pásale el archivo a Claude en el chat, que analiza cada ticket y guarda aquí el resultado."
        />
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Entregados"
              value={`${delivered}/${reviews.length}`}
              hint="Juego y audio/vídeo enviados"
              icon={CircleCheck}
              tone="success"
              progress={Math.round((delivered / reviews.length) * 100)}
            />
            <StatCard
              label="Parciales o en curso"
              value={count("partial") + count("in_progress")}
              hint={`${count("partial")} parciales · ${count("in_progress")} en curso`}
              icon={Hourglass}
              tone="info"
            />
            <StatCard
              label="Sin empezar"
              value={count("not_started")}
              hint="Sin actividad del participante"
              icon={CircleDashed}
            />
            <StatCard
              label="Requieren atención"
              value={count("needs_attention") + count("no_access")}
              hint={`${count("no_access")} sin acceso del bot`}
              icon={CircleAlert}
              tone={count("needs_attention") > 0 ? "danger" : "neutral"}
            />
          </section>

          <TicketBoard reviews={reviews} guildId={event.discordGuildId} />
        </>
      )}
    </>
  );
}
