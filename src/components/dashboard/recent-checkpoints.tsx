import Link from "next/link";
import { ListChecks } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { CHECKPOINT_STATUS_META } from "@/lib/constants";
import { formatRelative } from "@/lib/format";
import type { CheckpointView } from "@/server/services/checkpoints";

export function RecentCheckpoints({
  checkpoints,
}: {
  checkpoints: CheckpointView[];
}) {
  if (!checkpoints.length) {
    return (
      <EmptyState
        icon={ListChecks}
        title="Todavía no hay entregas"
        description="Los checkpoints aparecerán aquí en cuanto se registre el primero."
        className="py-10"
      />
    );
  }

  return (
    <ol className="divide-y divide-border/70">
      {checkpoints.map((checkpoint) => {
        const meta = CHECKPOINT_STATUS_META[checkpoint.status];

        return (
          <li key={checkpoint.id}>
            <Link
              href={`/teams/${checkpoint.teamId}?checkpoint=${checkpoint.id}`}
              className="flex items-center gap-3 px-1 py-2.5 transition-colors hover:bg-muted/50"
            >
              <span
                className="flex size-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold tabular-nums"
                style={{
                  backgroundColor: `${checkpoint.teamColor}1f`,
                  color: checkpoint.teamColor,
                }}
              >
                v{checkpoint.version}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {checkpoint.teamName}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {checkpoint.participantName ?? "Sin autor"} ·{" "}
                  {formatRelative(checkpoint.submittedAt ?? checkpoint.createdAt)}
                </span>
              </span>

              <StatusBadge label={meta.label} tone={meta.tone} />
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
