import Link from "next/link";
import {
  ArrowRight,
  Clock,
  FolderOpen,
  TriangleAlert,
  Video,
} from "lucide-react";

import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Progress } from "@/components/ui/progress";
import { SHIFT_STATUS_META, TEAM_STATUS_META } from "@/lib/constants";
import { formatRelative, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { TeamBoardEntry } from "@/server/services/dashboard";

/**
 * One card per team: who is developing now, who is next, and how far the team
 * has advanced. This is the densest surface in the app, so information is
 * layered — headline, live row, next row, footer links.
 */
export function TeamStatusCard({ entry }: { entry: TeamBoardEntry }) {
  const { team, current, next, lastCheckpoint } = entry;
  const teamStatus = TEAM_STATUS_META[team.status];

  return (
    <article
      className={cn(
        "group relative flex flex-col gap-4 overflow-hidden rounded-xl bg-card p-4 ring-1 transition-all hover:-translate-y-0.5 hover:shadow-lg",
        entry.isDelayed
          ? "ring-warning/40"
          : current
            ? "ring-brand/35"
            : "ring-foreground/10",
      )}
    >
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-0.5"
        style={{ backgroundColor: team.color }}
      />

      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <Link
            href={`/teams/${team.id}`}
            className="block truncate font-heading text-sm font-semibold hover:underline"
          >
            {team.name}
          </Link>
          <p className="text-xs text-muted-foreground">
            {team.participantCount} participantes · {entry.completedShifts}/
            {entry.totalShifts} turnos
          </p>
        </div>

        {entry.isDelayed ? (
          <StatusBadge label="Retraso" tone="warning" />
        ) : entry.isFinished ? (
          <StatusBadge label="Finalizado" tone="success" />
        ) : (
          <StatusBadge label={teamStatus.label} tone={teamStatus.tone} />
        )}
      </header>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Progreso</span>
          <span className="font-medium tabular-nums text-foreground">
            {entry.progress}%
          </span>
        </div>
        <Progress value={entry.progress} className="h-1.5" />
      </div>

      <div className="space-y-2">
        <SlotRow
          label="Ahora"
          shiftLabel={
            current
              ? `${formatTime(current.startsAt)} – ${formatTime(current.endsAt)}`
              : null
          }
          name={current?.participantName ?? null}
          avatarUrl={current?.participantAvatar ?? null}
          tone={current ? SHIFT_STATUS_META[current.status].tone : "neutral"}
          highlighted
          emptyLabel="Sin turno activo"
        />

        <SlotRow
          label="Siguiente"
          shiftLabel={next ? formatRelative(next.startsAt) : null}
          name={next?.participantName ?? null}
          avatarUrl={next?.participantAvatar ?? null}
          tone="neutral"
          emptyLabel="Nada programado"
        />
      </div>

      <footer className="mt-auto flex items-center gap-3 border-t border-border/70 pt-3 text-xs text-muted-foreground">
        {lastCheckpoint ? (
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-3.5" />
            v{lastCheckpoint.version} ·{" "}
            {formatRelative(lastCheckpoint.submittedAt ?? lastCheckpoint.createdAt)}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <TriangleAlert className="size-3.5" />
            Sin checkpoints
          </span>
        )}

        <span className="ml-auto flex items-center gap-1.5">
          {lastCheckpoint?.driveUrl && (
            <IconLink href={lastCheckpoint.driveUrl} label="Abrir proyecto en Drive">
              <FolderOpen className="size-3.5" />
            </IconLink>
          )}
          {lastCheckpoint?.videoUrl && (
            <IconLink href={lastCheckpoint.videoUrl} label="Ver grabación">
              <Video className="size-3.5" />
            </IconLink>
          )}
          <Link
            href={`/teams/${team.id}`}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 transition-colors hover:bg-muted hover:text-foreground"
          >
            Detalle
            <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </span>
      </footer>
    </article>
  );
}

function SlotRow({
  label,
  name,
  avatarUrl,
  shiftLabel,
  highlighted = false,
  emptyLabel,
}: {
  label: string;
  name: string | null;
  avatarUrl: string | null;
  shiftLabel: string | null;
  tone: string;
  highlighted?: boolean;
  emptyLabel: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-2.5 py-2",
        highlighted ? "bg-muted/70" : "bg-muted/35",
      )}
    >
      <span className="w-16 shrink-0 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </span>

      {name ? (
        <>
          <UserAvatar name={name} avatarUrl={avatarUrl} className="size-6" />
          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            {name}
          </span>
          {shiftLabel && (
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
              {shiftLabel}
            </span>
          )}
        </>
      ) : (
        <span className="text-sm text-muted-foreground">{emptyLabel}</span>
      )}
    </div>
  );
}

function IconLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      title={label}
      aria-label={label}
      className="rounded-md p-1 transition-colors hover:bg-muted hover:text-foreground"
    >
      {children}
    </a>
  );
}
