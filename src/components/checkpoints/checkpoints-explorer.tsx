"use client";

import { useMemo, useState } from "react";

import { CheckpointTimeline } from "@/components/checkpoints/checkpoint-timeline";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CHECKPOINT_STATUS_META } from "@/lib/constants";
import type { CheckpointView } from "@/server/services/checkpoints";

interface CheckpointsExplorerProps {
  checkpoints: CheckpointView[];
  teams: { id: string; name: string }[];
}

const ALL = "all";

export function CheckpointsExplorer({
  checkpoints,
  teams,
}: CheckpointsExplorerProps) {
  const [teamFilter, setTeamFilter] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState(ALL);

  const filtered = useMemo(
    () =>
      checkpoints.filter((checkpoint) => {
        if (teamFilter !== ALL && checkpoint.teamId !== teamFilter) return false;
        if (statusFilter !== ALL && checkpoint.status !== statusFilter) {
          return false;
        }
        return true;
      }),
    [checkpoints, teamFilter, statusFilter],
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

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger size="sm" className="w-44">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los estados</SelectItem>
            {Object.entries(CHECKPOINT_STATUS_META).map(([value, meta]) => (
              <SelectItem key={value} value={value}>
                {meta.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <p className="ml-auto self-center text-xs text-muted-foreground">
          {filtered.length} de {checkpoints.length} entregas
        </p>
      </div>

      <CheckpointTimeline checkpoints={filtered} />
    </div>
  );
}
