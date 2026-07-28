import { ExternalLink, FolderOpen, ListChecks, Video } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { CHECKPOINT_STATUS_META } from "@/lib/constants";
import { formatDateTime, formatDuration } from "@/lib/format";

import type { CheckpointView } from "@/server/services/checkpoints";

/**
 * Version history of a team's deliveries, newest first. Each entry is a link
 * hub — the app stores URLs, never the Unity projects themselves.
 */
export function CheckpointTimeline({
  checkpoints,
  renderActions,
}: {
  checkpoints: CheckpointView[];
  renderActions?: (checkpoint: CheckpointView) => React.ReactNode;
}) {
  if (!checkpoints.length) {
    return (
      <EmptyState
        icon={ListChecks}
        title="Sin checkpoints todavía"
        description="Registra la primera entrega con el enlace al proyecto en Drive."
      />
    );
  }

  return (
    <ol className="relative space-y-3 before:absolute before:top-2 before:bottom-2 before:left-[15px] before:w-px before:bg-border">
      {checkpoints.map((checkpoint) => {
        const meta = CHECKPOINT_STATUS_META[checkpoint.status];

        return (
          <li key={checkpoint.id} className="relative flex gap-3">
            <span
              className="z-10 mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums ring-4 ring-background"
              style={{
                backgroundColor: `${checkpoint.teamColor}22`,
                color: checkpoint.teamColor,
              }}
            >
              v{checkpoint.version}
            </span>

            <div className="min-w-0 flex-1 rounded-xl bg-card p-3.5 ring-1 ring-foreground/10">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge label={meta.label} tone={meta.tone} />
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(
                        checkpoint.submittedAt ?? checkpoint.createdAt,
                      )}
                    </span>
                    {checkpoint.durationMinutes !== null && (
                      <span className="text-xs text-muted-foreground">
                        · {formatDuration(checkpoint.durationMinutes)}
                      </span>
                    )}
                  </div>

                  {checkpoint.participantName && (
                    <div className="flex items-center gap-1.5">
                      <UserAvatar
                        name={checkpoint.participantName}
                        avatarUrl={checkpoint.participantAvatar}
                        className="size-5"
                      />
                      <span className="text-sm">
                        {checkpoint.participantName}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  {checkpoint.driveUrl && (
                    <LinkPill href={checkpoint.driveUrl} icon={FolderOpen}>
                      Drive
                    </LinkPill>
                  )}
                  {checkpoint.videoUrl && (
                    <LinkPill href={checkpoint.videoUrl} icon={Video}>
                      Vídeo
                    </LinkPill>
                  )}
                  {renderActions?.(checkpoint)}
                </div>
              </div>

              {checkpoint.observations && (
                <p className="mt-2.5 text-sm text-muted-foreground">
                  {checkpoint.observations}
                </p>
              )}

              {checkpoint.internalNotes && (
                <p className="mt-2 rounded-lg bg-muted/60 px-2.5 py-1.5 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Nota interna:</span>{" "}
                  {checkpoint.internalNotes}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function LinkPill({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: typeof ExternalLink;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex h-6 items-center gap-1.5 rounded-full bg-muted px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
    >
      <Icon className="size-3" />
      {children}
    </a>
  );
}
