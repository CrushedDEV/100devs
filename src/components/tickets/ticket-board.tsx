"use client";

import { useMemo, useState } from "react";
import {
  Clapperboard,
  ExternalLink,
  Gamepad2,
  Search,
  Ticket,
} from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { EngineName } from "@/components/shared/engine-name";
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
  TICKET_STATUSES,
  TICKET_STATUS_META,
} from "@/lib/constants";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { TicketReviewView } from "@/server/services/tickets";

const ALL = "all";

interface TicketBoardProps {
  reviews: TicketReviewView[];
  guildId: string;
}

/** Tickets grouped by team, in the same order as the channels in Discord. */
export function TicketBoard({ reviews, guildId }: TicketBoardProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(ALL);

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();

    const visible = reviews.filter((review) => {
      if (statusFilter !== ALL && review.status !== statusFilter) return false;
      if (!needle) return true;
      return `${review.participant?.name ?? ""} ${review.channelName} ${review.summary ?? ""}`
        .toLowerCase()
        .includes(needle);
    });

    // Reviews arrive sorted by position, so groups keep Discord's order.
    const byGroup = new Map<number, { label: string; items: TicketReviewView[] }>();
    for (const review of visible) {
      const group = byGroup.get(review.groupIndex) ?? {
        label: review.groupLabel,
        items: [],
      };
      group.items.push(review);
      byGroup.set(review.groupIndex, group);
    }

    return [...byGroup.entries()].map(([index, group]) => ({ index, ...group }));
  }, [reviews, query, statusFilter]);

  // Totals per group are computed over *all* reviews, not the filtered view,
  // so "3/5 entregados" stays meaningful while a filter is applied.
  const groupTotals = useMemo(() => {
    const totals = new Map<number, { delivered: number; total: number }>();
    for (const review of reviews) {
      const entry = totals.get(review.groupIndex) ?? { delivered: 0, total: 0 };
      entry.total += 1;
      if (review.status === "delivered") entry.delivered += 1;
      totals.set(review.groupIndex, entry);
    }
    return totals;
  }, [reviews]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por participante, canal o resumen…"
            className="pl-8"
            aria-label="Buscar tickets"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los estados</SelectItem>
            {TICKET_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {TICKET_STATUS_META[status].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {groups.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title="Ningún ticket coincide"
          description="Ajusta la búsqueda o el filtro de estado."
        />
      ) : (
        <div className="space-y-5">
          {groups.map((group) => {
            const totals = groupTotals.get(group.index);

            return (
              <section key={group.index} className="space-y-2">
                <header className="flex items-baseline gap-2">
                  <h2 className="font-heading text-sm font-semibold">
                    {group.label}
                  </h2>
                  {totals && (
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {totals.delivered}/{totals.total} entregados
                    </span>
                  )}
                </header>

                <ol className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
                  {group.items.map((review) => (
                    <TicketRow
                      key={review.id}
                      review={review}
                      guildId={guildId}
                    />
                  ))}
                </ol>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TicketRow({
  review,
  guildId,
}: {
  review: TicketReviewView;
  guildId: string;
}) {
  const meta = TICKET_STATUS_META[review.status];
  const name = review.participant?.name ?? review.channelName;

  return (
    <li className="flex flex-col gap-2 border-b border-border/70 bg-card px-3 py-2.5 last:border-b-0 sm:flex-row sm:items-center sm:gap-3">
      <div className="flex min-w-0 items-center gap-2.5 sm:w-64 sm:shrink-0">
        <span className="w-6 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
          {review.position}
        </span>
        <UserAvatar
          name={name}
          avatarUrl={review.participant?.avatarUrl}
        />
        <div className="min-w-0">
          <EngineName
            engines={review.participant?.engines ?? []}
            className="block truncate text-sm font-medium"
          >
            {name}
          </EngineName>
          <p className="truncate text-xs text-muted-foreground">
            #{review.channelName}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:w-60">
        <StatusBadge label={meta.label} tone={meta.tone} />
        <Deliverable
          done={review.hasGame}
          url={review.gameUrl}
          icon={Gamepad2}
          label="Juego"
        />
        <Deliverable
          done={review.hasMedia}
          url={review.mediaUrl}
          icon={Clapperboard}
          label="Audio/vídeo"
        />
      </div>

      <p className="min-w-0 flex-1 text-sm text-muted-foreground sm:line-clamp-2">
        {review.summary ?? "—"}
      </p>

      <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
        <span className="tabular-nums">
          {review.lastActivityAt ? formatRelative(review.lastActivityAt) : "sin actividad"}
        </span>
        <a
          href={`https://discord.com/channels/${guildId}/${review.channelId}`}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 transition-colors hover:bg-muted hover:text-foreground"
        >
          Abrir
          <ExternalLink className="size-3" />
        </a>
      </div>
    </li>
  );
}

function Deliverable({
  done,
  url,
  icon: Icon,
  label,
}: {
  done: boolean;
  url: string | null;
  icon: typeof Gamepad2;
  label: string;
}) {
  const className = cn(
    "inline-flex h-6 items-center gap-1 rounded-full border px-2 text-xs",
    done
      ? "border-success/40 bg-success/12 text-success"
      : "border-border text-muted-foreground/60 line-through decoration-muted-foreground/40",
  );

  const content = (
    <>
      <Icon className="size-3" />
      {label}
    </>
  );

  if (done && url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer noopener"
        className={cn(className, "hover:bg-success/20")}
        title={url}
      >
        {content}
      </a>
    );
  }

  return (
    <span className={className} title={done ? label : `Falta: ${label}`}>
      {content}
    </span>
  );
}
