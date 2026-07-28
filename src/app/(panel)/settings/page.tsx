import type { Metadata } from "next";

import { SyncButton } from "@/components/layout/sync-button";
import { SettingsForm } from "@/components/settings/settings-form";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime, formatRelative } from "@/lib/format";
import { requireStaff } from "@/server/auth/guard";
import { fetchGuildRoles } from "@/server/discord/client";
import { listSyncRuns } from "@/server/discord/sync";
import { getActiveEvent } from "@/server/services/events";

export const metadata: Metadata = { title: "Ajustes" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await requireStaff();
  const { event, settings } = await getActiveEvent();
  const runs = await listSyncRuns(event.id, 8);

  // A misconfigured guild/token must not take the whole settings page down —
  // the organiser needs this screen precisely to fix that.
  const guildRoles = await fetchGuildRoles(event.discordGuildId)
    .then((roles) =>
      roles
        .filter((role) => role.name !== "@everyone")
        .sort((a, b) => b.position - a.position)
        .map((role) => ({ id: role.id, name: role.name })),
    )
    .catch(() => []);

  return (
    <>
      <PageHeader
        title="Ajustes del evento"
        description="Configuración de roles, sincronización y recordatorios. Preparada para reutilizarse en futuras ediciones."
      >
        <SyncButton variant="full" />
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <SettingsForm
          event={event}
          settings={settings}
          guildRoles={guildRoles}
          canEdit={session.user.role === "admin"}
        />

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sincronización</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1 text-sm">
                <p className="text-muted-foreground">Última ejecución</p>
                <p className="font-medium">
                  {settings.lastSyncedAt
                    ? formatDateTime(settings.lastSyncedAt)
                    : "Nunca"}
                </p>
              </div>

              <div className="space-y-1 text-sm">
                <p className="text-muted-foreground">Servidor de Discord</p>
                <p className="font-mono text-xs">{event.discordGuildId}</p>
              </div>

              {runs.length > 0 && (
                <ol className="space-y-2 border-t border-border/70 pt-3">
                  {runs.map((run) => (
                    <li key={run.id} className="flex items-center gap-2 text-xs">
                      <StatusBadge
                        label={
                          run.status === "success"
                            ? "OK"
                            : run.status === "failed"
                              ? "Error"
                              : "En curso"
                        }
                        tone={
                          run.status === "success"
                            ? "success"
                            : run.status === "failed"
                              ? "danger"
                              : "info"
                        }
                      />
                      <span className="flex-1 truncate text-muted-foreground">
                        {run.trigger === "cron" ? "Automática" : "Manual"} ·{" "}
                        {run.membersFetched} miembros
                      </span>
                      <span className="shrink-0 text-muted-foreground">
                        {formatRelative(run.startedAt)}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Automatizaciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                  /api/cron/sync
                </code>{" "}
                — importa miembros y actualiza estados de turno cada 15 min.
              </p>
              <p>
                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                  /api/cron/reminders
                </code>{" "}
                — envía los recordatorios pendientes cada 5 min.
              </p>
              <p className="text-xs">
                Ambos endpoints están protegidos con{" "}
                <code className="rounded bg-muted px-1 py-0.5">CRON_SECRET</code>.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </>
  );
}
