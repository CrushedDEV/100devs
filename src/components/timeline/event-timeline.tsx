"use client";

import { useMemo, useState } from "react";
import { format, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { Activity } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TIMELINE_EVENT_META } from "@/lib/constants";
import { formatTime } from "@/lib/format";
import type { TimelineEntry } from "@/server/services/timeline";

interface EventTimelineProps {
  entries: TimelineEntry[];
  teams: { id: string; name: string }[];
}

const ALL = "all";

/** Chronological activity feed, grouped by day. */
export function EventTimeline({ entries, teams }: EventTimelineProps) {
  const [teamFilter, setTeamFilter] = useState(ALL);
  const [typeFilter, setTypeFilter] = useState(ALL);

  const filtered = useMemo(
    () =>
      entries.filter((entry) => {
        if (teamFilter !== ALL && entry.team?.id !== teamFilter) return false;
        if (typeFilter !== ALL && entry.type !== typeFilter) return false;
        return true;
      }),
    [entries, teamFilter, typeFilter],
  );

  const groups = useMemo(() => groupByDay(filtered), [filtered]);

  const availableTypes = useMemo(
    () => [...new Set(entries.map((entry) => entry.type))],
    [entries],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Select value={teamFilter} onValueChange={setTeamFilter}>
          <SelectTrigger size="sm" className="w-48">
            <SelectValue placeholder="Equipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los equipos</SelectItem>
            {teams.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                {team.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger size="sm" className="w-56">
            <SelectValue placeholder="Tipo de evento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los eventos</SelectItem>
            {availableTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {TIMELINE_EVENT_META[type].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {groups.length ? (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.key} className="space-y-2">
              <h3 className="sticky top-14 z-10 -mx-1 bg-background/90 px-1 py-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase backdrop-blur">
                {format(group.date, "EEEE d 'de' MMMM", { locale: es })}
              </h3>

              <ol className="relative space-y-2 pl-4 before:absolute before:top-2 before:bottom-2 before:left-[5px] before:w-px before:bg-border">
                {group.entries.map((entry) => {
                  const meta = TIMELINE_EVENT_META[entry.type];

                  return (
                    <li key={entry.id} className="relative">
                      <span
                        aria-hidden
                        className="absolute top-3.5 -left-4 size-[11px] rounded-full ring-4 ring-background"
                        style={{
                          backgroundColor: entry.team?.color ?? "var(--border)",
                        }}
                      />

                      <div className="flex flex-wrap items-start gap-x-3 gap-y-1.5 rounded-lg bg-card px-3 py-2.5 ring-1 ring-foreground/10">
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {formatTime(entry.occurredAt)}
                        </span>

                        <div className="min-w-0 flex-1 space-y-0.5">
                          <p className="text-sm font-medium">{entry.title}</p>
                          {entry.description && (
                            <p className="text-xs text-muted-foreground">
                              {entry.description}
                            </p>
                          )}
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          {entry.participant && (
                            <UserAvatar
                              name={entry.participant.name}
                              avatarUrl={entry.participant.avatarUrl}
                              className="size-5"
                            />
                          )}
                          {entry.team && (
                            <span className="hidden text-xs text-muted-foreground sm:inline">
                              {entry.team.name}
                            </span>
                          )}
                          <StatusBadge label={meta.label} tone={meta.tone} />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Activity}
          title="Sin actividad registrada"
          description="Los eventos aparecerán aquí conforme se programen turnos y se entreguen checkpoints."
        />
      )}
    </div>
  );
}

function groupByDay(entries: TimelineEntry[]) {
  const groups: { key: string; date: Date; entries: TimelineEntry[] }[] = [];

  for (const entry of entries) {
    const last = groups.at(-1);

    if (last && isSameDay(last.date, entry.occurredAt)) {
      last.entries.push(entry);
    } else {
      groups.push({
        key: entry.occurredAt.toISOString(),
        date: entry.occurredAt,
        entries: [entry],
      });
    }
  }

  return groups;
}
