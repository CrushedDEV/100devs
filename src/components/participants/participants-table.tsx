"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Search, Users } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EngineLegend, EngineName } from "@/components/shared/engine-name";
import { SkillBadges } from "@/components/shared/skill-badges";
import {
  ENGINES,
  PARTICIPANT_STATUS_META,
  SKILLS,
  type EngineKey,
  type SkillKey,
  type SkillRoleMap,
} from "@/lib/constants";
import type { ParticipantView } from "@/server/services/participants";

import { ParticipantSheet } from "./participant-sheet";

interface ParticipantsTableProps {
  participants: ParticipantView[];
  teams: { id: string; name: string }[];
  skillRoleIds: SkillRoleMap;
  /** Pre-selected participant id, e.g. arriving from the global search. */
  initialParticipantId?: string;
}

const ALL = "all";

export function ParticipantsTable({
  participants,
  teams,
  skillRoleIds,
  initialParticipantId,
}: ParticipantsTableProps) {
  const [query, setQuery] = useState("");
  const [teamFilter, setTeamFilter] = useState<string>(ALL);
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [skillFilter, setSkillFilter] = useState<string>(ALL);
  const [engineFilter, setEngineFilter] = useState<string>(ALL);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialParticipantId ?? null,
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return participants.filter((participant) => {
      if (
        needle &&
        !`${participant.name} ${participant.username} ${participant.discordId}`
          .toLowerCase()
          .includes(needle)
      ) {
        return false;
      }
      if (teamFilter === "unassigned" && participant.team) return false;
      if (
        teamFilter !== ALL &&
        teamFilter !== "unassigned" &&
        participant.team?.id !== teamFilter
      ) {
        return false;
      }
      if (statusFilter !== ALL && participant.status !== statusFilter) {
        return false;
      }
      if (
        skillFilter !== ALL &&
        !participant.skills.includes(skillFilter as SkillKey)
      ) {
        return false;
      }
      if (
        engineFilter !== ALL &&
        !participant.engines.includes(engineFilter as EngineKey)
      ) {
        return false;
      }
      return true;
    });
  }, [
    participants,
    query,
    teamFilter,
    statusFilter,
    skillFilter,
    engineFilter,
  ]);

  const selected = participants.find((p) => p.id === selectedId) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nombre, usuario o ID de Discord…"
            className="pl-8"
            aria-label="Buscar participantes"
          />
        </div>

        <Select value={teamFilter} onValueChange={setTeamFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Equipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los equipos</SelectItem>
            <SelectItem value="unassigned">Sin equipo</SelectItem>
            {teams.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                {team.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los estados</SelectItem>
            {Object.entries(PARTICIPANT_STATUS_META).map(([value, meta]) => (
              <SelectItem key={value} value={value}>
                {meta.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={skillFilter} onValueChange={setSkillFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas las categorías</SelectItem>
            {SKILLS.map((skill) => (
              <SelectItem key={skill.key} value={skill.key}>
                {skill.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={engineFilter} onValueChange={setEngineFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Motor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los motores</SelectItem>
            {ENGINES.map((engine) => (
              <SelectItem key={engine.key} value={engine.key}>
                {engine.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <EngineLegend />

      {filtered.length ? (
        <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>Participante</TableHead>
                <TableHead className="hidden md:table-cell">Equipo</TableHead>
                <TableHead className="hidden lg:table-cell">Orden</TableHead>
                <TableHead className="hidden xl:table-cell">
                  Disponibilidad
                </TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>

            <TableBody>
              {filtered.map((participant) => {
                const meta = PARTICIPANT_STATUS_META[participant.status];

                return (
                  <TableRow
                    key={participant.id}
                    onClick={() => setSelectedId(participant.id)}
                    className="cursor-pointer"
                  >
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <UserAvatar
                          name={participant.name}
                          avatarUrl={participant.avatarUrl}
                          ringColor={participant.team?.color}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <EngineName
                              engines={participant.engines}
                              className="truncate text-sm font-medium"
                            >
                              {participant.name}
                            </EngineName>
                            <SkillBadges skills={participant.skills} max={4} />
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            @{participant.username}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="hidden md:table-cell">
                      {participant.team ? (
                        <span className="inline-flex items-center gap-1.5 text-sm">
                          <span
                            aria-hidden
                            className="size-2 rounded-full"
                            style={{ backgroundColor: participant.team.color }}
                          />
                          {participant.team.name}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    <TableCell className="hidden text-sm tabular-nums text-muted-foreground lg:table-cell">
                      {participant.team ? `#${participant.orderIndex + 1}` : "—"}
                    </TableCell>

                    <TableCell className="hidden max-w-56 xl:table-cell">
                      <span className="line-clamp-1 text-sm text-muted-foreground">
                        {participant.availability ?? "—"}
                      </span>
                    </TableCell>

                    <TableCell>
                      <StatusBadge label={meta.label} tone={meta.tone} />
                    </TableCell>

                    <TableCell>
                      {participant.discordTicketUrl && (
                        <a
                          href={participant.discordTicketUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          onClick={(event) => event.stopPropagation()}
                          title="Abrir ticket privado"
                          aria-label="Abrir ticket privado"
                          className="inline-flex rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <ExternalLink className="size-3.5" />
                        </a>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState
          icon={Users}
          title="Ningún participante coincide"
          description="Ajusta los filtros o sincroniza con Discord para importar miembros."
        />
      )}

      <ParticipantSheet
        participant={selected}
        teams={teams}
        skillRoleIds={skillRoleIds}
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelectedId(null)}
      />
    </div>
  );
}
