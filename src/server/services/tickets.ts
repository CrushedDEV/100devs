import "server-only";

import { asc, eq } from "drizzle-orm";

import {
  normaliseRoleName,
  type EngineKey,
  type TicketStatus,
} from "@/lib/constants";
import { db } from "@/server/db";
import {
  participants,
  ticketReviews,
  users,
} from "@/server/db/schema";
import {
  CHANNEL_TYPE,
  DiscordApiError,
  fetchChannelMessages,
  fetchCurrentUser,
  fetchGuildChannels,
  type DiscordChannel,
  type DiscordMessage,
} from "@/server/discord/client";

import { getActiveEvent } from "./events";

/* -------------------------------------------------------------------------- */
/*                              Server structure                              */
/* -------------------------------------------------------------------------- */

/**
 * Ticket categories are recognised by name ("〚tickets privados〛",
 * "〚tickets privados 2〛"…). Categories are read in server order, so the turn
 * order carries over from one category to the next.
 */
const TICKET_CATEGORY_PREFIX = "tickets privados";

/**
 * Separator channels split teams: "divisor-participante-N", sometimes
 * decorated with emoji, or a name made only of emoji (e.g. "⚠️⚠️⚠️").
 */
function isSeparator(name: string): boolean {
  const normalised = normaliseRoleName(name);
  return normalised.includes("divisor") || normalised.length === 0;
}

function separatorLabel(name: string, groupIndex: number): string {
  const match = normaliseRoleName(name).match(/divisor participante (\d+)/);
  return match ? `Equipo ${match[1]}` : `Grupo ${groupIndex}`;
}

/** Letters and digits only, so "💻-the_lara270❗" compares as "thelara270". */
function compact(value: string): string {
  return normaliseRoleName(value).replace(/\s+/g, "");
}

function byDiscordOrder(a: DiscordChannel, b: DiscordChannel): number {
  if (a.position !== b.position) return a.position - b.position;
  // Ties are broken by creation order, as the Discord client does.
  return BigInt(a.id) < BigInt(b.id) ? -1 : 1;
}

interface LayoutEntry {
  channel: DiscordChannel;
  categoryName: string;
  groupLabel: string;
  groupIndex: number;
  separatorName: string | null;
}

/**
 * Ticket channels in server order, each tagged with the team it falls under.
 * Pure: exported so the grouping can be checked against a real channel list.
 */
export function buildLayout(channels: DiscordChannel[]): LayoutEntry[] {
  const categories = channels
    .filter(
      (channel) =>
        channel.type === CHANNEL_TYPE.category &&
        normaliseRoleName(channel.name).startsWith(TICKET_CATEGORY_PREFIX),
    )
    .sort(byDiscordOrder);

  const entries: LayoutEntry[] = [];
  let group = { label: "Sin grupo", index: 0, separatorName: null as string | null };

  for (const category of categories) {
    const children = channels
      .filter(
        (channel) =>
          channel.parent_id === category.id &&
          channel.type === CHANNEL_TYPE.text,
      )
      .sort(byDiscordOrder);

    for (const channel of children) {
      if (isSeparator(channel.name)) {
        const index = group.index + 1;
        group = {
          label: separatorLabel(channel.name, index),
          index,
          separatorName: channel.name,
        };
        continue;
      }

      entries.push({
        channel,
        categoryName: category.name,
        groupLabel: group.label,
        groupIndex: group.index,
        separatorName: group.separatorName,
      });
    }
  }

  return entries;
}

/* -------------------------------------------------------------------------- */
/*                                   Export                                   */
/* -------------------------------------------------------------------------- */

export interface KnownUser {
  discordId: string;
  username: string;
  displayName: string;
  role: "admin" | "moderator" | "participant";
  participantId: string | null;
}

export interface TicketExportMessage {
  id: string;
  at: string;
  author: string;
  authorId: string;
  /** Who wrote it, relative to this ticket. */
  from: "participant" | "staff" | "bot" | "other";
  content: string;
  attachments: { filename: string; contentType: string | null; size: number; url: string }[];
  embeds: { type: string | null; url: string | null; title: string | null }[];
}

export interface TicketExportEntry {
  channelId: string;
  channelName: string;
  categoryName: string;
  groupLabel: string;
  groupIndex: number;
  separatorName: string | null;
  position: number;
  /** "ticket" when an owner could be identified; "other" for panels etc. */
  kind: "ticket" | "other";
  owner: {
    discordId: string;
    username: string;
    displayName: string;
    participantId: string | null;
    matchedBy: "permissions" | "channel-name";
  } | null;
  access: "ok" | "forbidden" | "error";
  error?: string;
  lastActivityAt: string | null;
  messages: TicketExportMessage[];
}

export interface TicketExport {
  generatedAt: string;
  guildId: string;
  eventId: string;
  warnings: string[];
  totals: { tickets: number; withoutAccess: number; withoutOwner: number };
  tickets: TicketExportEntry[];
}

async function loadKnownUsers(eventId: string): Promise<KnownUser[]> {
  const rows = await db
    .select({
      discordId: users.discordId,
      username: users.username,
      globalName: users.globalName,
      nickname: users.nickname,
      role: users.role,
      participantId: participants.id,
      participantEventId: participants.eventId,
    })
    .from(users)
    .leftJoin(participants, eq(participants.userId, users.id));

  const byDiscordId = new Map<string, KnownUser>();

  for (const row of rows) {
    const existing = byDiscordId.get(row.discordId);
    const participantId =
      row.participantEventId === eventId ? row.participantId : null;

    if (existing) {
      existing.participantId ??= participantId;
      continue;
    }

    byDiscordId.set(row.discordId, {
      discordId: row.discordId,
      username: row.username,
      displayName: row.nickname ?? row.globalName ?? row.username,
      role: row.role,
      participantId,
    });
  }

  return [...byDiscordId.values()];
}

/**
 * Identifies who a ticket belongs to. Guild Manager grants the opener an
 * individual permission overwrite, which is exact; the channel name
 * ("💻-c0rr3a❗") is only a fallback for tickets where that overwrite is gone.
 */
export function resolveOwner(
  channel: DiscordChannel,
  known: KnownUser[],
  botId: string,
): TicketExportEntry["owner"] {
  const byId = new Map(known.map((user) => [user.discordId, user]));

  const memberIds = (channel.permission_overwrites ?? [])
    .filter((overwrite) => Number(overwrite.type) === 1 && overwrite.id !== botId)
    .map((overwrite) => overwrite.id);

  const candidates = memberIds
    .map((id) => byId.get(id))
    .filter((user): user is KnownUser => Boolean(user));

  const channelKey = compact(channel.name).replace(/^participante/, "");
  const namedInChannel = (user: KnownUser) =>
    compact(user.username).length >= 3 &&
    channelKey.endsWith(compact(user.username));

  // Staff are often added to other people's tickets individually, and some
  // staff are enrolled as participants too. So among the overwrites, prefer
  // whoever the channel is named after, then plain participants, and only
  // then an enrolled staff member.
  const fromPermissions =
    candidates.find(namedInChannel) ??
    candidates.find((user) => user.role === "participant") ??
    candidates.find((user) => user.participantId);

  if (fromPermissions) {
    return { ...pick(fromPermissions), matchedBy: "permissions" };
  }

  if (channelKey.length >= 3) {
    const exact = known.find((user) => compact(user.username) === channelKey);
    const suffix = known.find(
      (user) =>
        compact(user.username).length >= 4 &&
        channelKey.endsWith(compact(user.username)),
    );
    const match = exact ?? suffix;
    if (match) return { ...pick(match), matchedBy: "channel-name" };
  }

  // Someone with an individual overwrite who was never synced (e.g. they no
  // longer hold the participant role): keep their id so the ticket is not
  // mistaken for a panel channel.
  const unsynced = memberIds.find((id) => !byId.has(id));
  if (unsynced) {
    return {
      discordId: unsynced,
      username: "",
      displayName: "",
      participantId: null,
      matchedBy: "permissions",
    };
  }

  return null;
}

function pick(user: KnownUser) {
  return {
    discordId: user.discordId,
    username: user.username,
    displayName: user.displayName,
    participantId: user.participantId,
  };
}

function toExportMessage(
  message: DiscordMessage,
  ownerId: string | null,
  staffIds: Set<string>,
): TicketExportMessage {
  const from: TicketExportMessage["from"] = message.author.bot
    ? "bot"
    : message.author.id === ownerId
      ? "participant"
      : staffIds.has(message.author.id)
        ? "staff"
        : "other";

  return {
    id: message.id,
    at: message.timestamp,
    author: message.author.global_name ?? message.author.username,
    authorId: message.author.id,
    from,
    content: message.content,
    attachments: message.attachments.map((attachment) => ({
      filename: attachment.filename,
      contentType: attachment.content_type ?? null,
      size: attachment.size,
      url: attachment.url,
    })),
    embeds: message.embeds.map((embed) => ({
      type: embed.type ?? null,
      url: embed.url ?? null,
      title: embed.title ?? null,
    })),
  };
}

/** Runs `worker` over `items` with a bounded number of requests in flight. */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index]);
    }
  });

  await Promise.all(runners);
  return results;
}

/**
 * Reads every ticket in server order with its full conversation. The result is
 * downloaded from the panel and reviewed outside the app; nothing is stored.
 */
export async function buildTicketExport(): Promise<TicketExport> {
  const { event } = await getActiveEvent();

  const [channels, bot, known] = await Promise.all([
    fetchGuildChannels(event.discordGuildId),
    fetchCurrentUser(),
    loadKnownUsers(event.id),
  ]);

  const staffIds = new Set(
    known.filter((user) => user.role !== "participant").map((user) => user.discordId),
  );

  const layout = buildLayout(channels);

  const tickets = await mapWithConcurrency(layout, 4, async (entry) => {
    const owner = resolveOwner(entry.channel, known, bot.id);
    const base = {
      channelId: entry.channel.id,
      channelName: entry.channel.name,
      categoryName: entry.categoryName,
      groupLabel: entry.groupLabel,
      groupIndex: entry.groupIndex,
      separatorName: entry.separatorName,
      position: 0,
      kind: owner ? ("ticket" as const) : ("other" as const),
      owner,
    };

    try {
      const messages = await fetchChannelMessages(entry.channel.id);
      return {
        ...base,
        access: "ok" as const,
        lastActivityAt: messages.at(-1)?.timestamp ?? null,
        messages: messages.map((message) =>
          toExportMessage(message, owner?.discordId ?? null, staffIds),
        ),
      };
    } catch (error) {
      const forbidden = error instanceof DiscordApiError && error.status === 403;
      return {
        ...base,
        access: forbidden ? ("forbidden" as const) : ("error" as const),
        error: error instanceof Error ? error.message : String(error),
        lastActivityAt: null,
        messages: [],
      };
    }
  });

  tickets.forEach((ticket, index) => {
    ticket.position = index + 1;
  });

  const warnings: string[] = [];
  const humanMessages = tickets
    .flatMap((ticket) => ticket.messages)
    .filter((message) => message.from !== "bot");
  const emptyHuman = humanMessages.filter(
    (message) =>
      !message.content && !message.attachments.length && !message.embeds.length,
  );

  if (humanMessages.length > 0 && emptyHuman.length / humanMessages.length > 0.5) {
    warnings.push(
      "La mayoría de mensajes llegan sin texto: activa MESSAGE CONTENT INTENT en el Developer Portal (Bot → Privileged Gateway Intents).",
    );
  }

  const withoutAccess = tickets.filter((ticket) => ticket.access !== "ok").length;
  if (withoutAccess > 0) {
    warnings.push(
      `El bot no ha podido leer ${withoutAccess} canales: necesita Ver canal y Leer historial en los tickets.`,
    );
  }

  return {
    generatedAt: new Date().toISOString(),
    guildId: event.discordGuildId,
    eventId: event.id,
    warnings,
    totals: {
      tickets: tickets.filter((ticket) => ticket.kind === "ticket").length,
      withoutAccess,
      withoutOwner: tickets.filter((ticket) => ticket.kind === "other").length,
    },
    tickets,
  };
}

/* -------------------------------------------------------------------------- */
/*                                   Reviews                                  */
/* -------------------------------------------------------------------------- */

export interface TicketReviewView {
  id: string;
  channelId: string;
  channelName: string;
  groupLabel: string;
  groupIndex: number;
  position: number;
  status: TicketStatus;
  hasGame: boolean;
  hasMedia: boolean;
  gameUrl: string | null;
  mediaUrl: string | null;
  summary: string | null;
  lastActivityAt: Date | null;
  analyzedAt: Date;
  participant: {
    id: string;
    name: string;
    avatarUrl: string | null;
    engines: EngineKey[];
  } | null;
}

export async function listTicketReviews(
  eventId: string,
): Promise<TicketReviewView[]> {
  const rows = await db
    .select({
      review: ticketReviews,
      participantId: participants.id,
      engines: participants.engines,
      username: users.username,
      globalName: users.globalName,
      nickname: users.nickname,
      avatarUrl: users.avatarUrl,
    })
    .from(ticketReviews)
    .leftJoin(participants, eq(ticketReviews.participantId, participants.id))
    .leftJoin(users, eq(participants.userId, users.id))
    .where(eq(ticketReviews.eventId, eventId))
    .orderBy(asc(ticketReviews.position));

  return rows.map(({ review, ...row }) => ({
    id: review.id,
    channelId: review.channelId,
    channelName: review.channelName,
    groupLabel: review.groupLabel,
    groupIndex: review.groupIndex,
    position: review.position,
    status: review.status,
    hasGame: review.hasGame,
    hasMedia: review.hasMedia,
    gameUrl: review.gameUrl,
    mediaUrl: review.mediaUrl,
    summary: review.summary,
    lastActivityAt: review.lastActivityAt,
    analyzedAt: review.analyzedAt,
    participant:
      row.participantId && row.username
        ? {
            id: row.participantId,
            name: row.nickname ?? row.globalName ?? row.username,
            avatarUrl: row.avatarUrl,
            engines: row.engines ?? [],
          }
        : null,
  }));
}
