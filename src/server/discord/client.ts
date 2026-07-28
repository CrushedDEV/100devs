import "server-only";

import { getEnv } from "@/lib/env";

const DISCORD_API = "https://discord.com/api/v10";
const CDN = "https://cdn.discordapp.com";

export class DiscordApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = "DiscordApiError";
  }
}

export interface DiscordUser {
  id: string;
  username: string;
  global_name?: string | null;
  discriminator?: string;
  avatar?: string | null;
  accent_color?: number | null;
  email?: string | null;
}

export interface DiscordGuildMember {
  user?: DiscordUser;
  nick?: string | null;
  avatar?: string | null;
  roles: string[];
  joined_at: string;
  pending?: boolean;
}

export interface DiscordRole {
  id: string;
  name: string;
  color: number;
  position: number;
  managed: boolean;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  /** Bearer token of the signed-in user; defaults to the bot token. */
  bearerToken?: string;
  /** Next.js fetch cache hint. Defaults to no caching. */
  revalidate?: number | false;
}

/**
 * Thin REST wrapper with automatic 429 handling. Discord rate limits are
 * generous for our volume (a single guild of ~100 members), so a bounded
 * retry loop is enough — no external queue needed.
 */
async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, bearerToken, revalidate = false } = options;
  const authorization = bearerToken
    ? `Bearer ${bearerToken}`
    : `Bot ${getEnv().DISCORD_BOT_TOKEN}`;

  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(`${DISCORD_API}${path}`, {
      method,
      headers: {
        Authorization: authorization,
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      next: revalidate === false ? { revalidate: 0 } : { revalidate },
    });

    if (response.status === 429) {
      const retryAfter = Number(response.headers.get("retry-after") ?? "1");
      await new Promise((resolve) =>
        setTimeout(resolve, Math.min(retryAfter * 1000, 5_000)),
      );
      continue;
    }

    if (response.status === 204) return undefined as T;

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new DiscordApiError(
        `Discord API ${method} ${path} failed with ${response.status}`,
        response.status,
        payload,
      );
    }

    return payload as T;
  }

  throw new DiscordApiError(`Discord API ${method} ${path} rate limited`, 429);
}

/* -------------------------------------------------------------------------- */
/*                                  Endpoints                                 */
/* -------------------------------------------------------------------------- */

/** Fetches every guild member, paginating through the 1000-per-page limit. */
export async function fetchGuildMembers(
  guildId: string,
): Promise<DiscordGuildMember[]> {
  const members: DiscordGuildMember[] = [];
  let after: string | undefined;

  // Hard cap of 20 pages (20k members) protects against runaway loops.
  for (let page = 0; page < 20; page++) {
    const query = new URLSearchParams({ limit: "1000" });
    if (after) query.set("after", after);

    const batch = await request<DiscordGuildMember[]>(
      `/guilds/${guildId}/members?${query.toString()}`,
    );

    members.push(...batch);
    if (batch.length < 1000) break;
    after = batch.at(-1)?.user?.id;
    if (!after) break;
  }

  return members;
}

export function fetchGuildMember(
  guildId: string,
  userId: string,
): Promise<DiscordGuildMember> {
  return request<DiscordGuildMember>(`/guilds/${guildId}/members/${userId}`);
}

/** Returns `null` instead of throwing when the user is not in the guild. */
export async function tryFetchGuildMember(
  guildId: string,
  userId: string,
): Promise<DiscordGuildMember | null> {
  try {
    return await fetchGuildMember(guildId, userId);
  } catch (error) {
    if (error instanceof DiscordApiError && error.status === 404) return null;
    throw error;
  }
}

export function fetchGuildRoles(guildId: string): Promise<DiscordRole[]> {
  return request<DiscordRole[]>(`/guilds/${guildId}/roles`);
}

/**
 * Grants a role to a member. Requires the bot's own role to sit *above* the
 * target role in the server's role list — Discord returns 403 otherwise.
 */
export function addGuildMemberRole(
  guildId: string,
  userId: string,
  roleId: string,
): Promise<void> {
  return request(`/guilds/${guildId}/members/${userId}/roles/${roleId}`, {
    method: "PUT",
  });
}

export function removeGuildMemberRole(
  guildId: string,
  userId: string,
  roleId: string,
): Promise<void> {
  return request(`/guilds/${guildId}/members/${userId}/roles/${roleId}`, {
    method: "DELETE",
  });
}

/** Opens (or reuses) a DM channel with a user and posts a message. */
export async function sendDirectMessage(
  userId: string,
  content: string,
): Promise<void> {
  const channel = await request<{ id: string }>("/users/@me/channels", {
    method: "POST",
    body: { recipient_id: userId },
  });

  await request(`/channels/${channel.id}/messages`, {
    method: "POST",
    body: { content },
  });
}

export function sendChannelMessage(
  channelId: string,
  content: string,
): Promise<unknown> {
  return request(`/channels/${channelId}/messages`, {
    method: "POST",
    body: { content },
  });
}

/* -------------------------------------------------------------------------- */
/*                                   Helpers                                  */
/* -------------------------------------------------------------------------- */

export function avatarUrl(
  userId: string,
  avatarHash: string | null | undefined,
  size = 128,
): string {
  if (!avatarHash) {
    // Discord's default avatar bucket for the "new username" system.
    const index = Number((BigInt(userId) >> 22n) % 6n);
    return `${CDN}/embed/avatars/${index}.png`;
  }
  const extension = avatarHash.startsWith("a_") ? "gif" : "png";
  return `${CDN}/avatars/${userId}/${avatarHash}.${extension}?size=${size}`;
}

export function displayName(member: DiscordGuildMember): string {
  return (
    member.nick ??
    member.user?.global_name ??
    member.user?.username ??
    "Desconocido"
  );
}
