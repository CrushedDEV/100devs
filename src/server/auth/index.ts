import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import { eq } from "drizzle-orm";

import type { AppRole } from "@/lib/constants";
import { getEnv } from "@/lib/env";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { avatarUrl, tryFetchGuildMember } from "@/server/discord/client";
import { getActiveEvent } from "@/server/services/events";

import { isStaffRole, resolveAppRole } from "./roles";

/** Reason codes surfaced on the `/login` screen via `?error=`. */
export const AUTH_ERRORS = {
  notMember: "NotGuildMember",
  notStaff: "NotStaff",
} as const;

export const { handlers, auth, signIn, signOut } = NextAuth(() => {
  const env = getEnv();

  return {
    trustHost: true,
    secret: env.AUTH_SECRET,
    session: { strategy: "jwt", maxAge: 60 * 60 * 12 },
    pages: { signIn: "/login", error: "/login" },
    providers: [
      Discord({
        clientId: env.DISCORD_CLIENT_ID,
        clientSecret: env.DISCORD_CLIENT_SECRET,
        authorization:
          "https://discord.com/api/oauth2/authorize?scope=identify+email+guilds",
      }),
    ],
    callbacks: {
      /**
       * Gate: the account must belong to the event guild *and* carry one of the
       * configured admin/moderator roles. Membership is verified with the bot
       * token rather than the user token so role ids are always available.
       */
      async signIn({ profile }) {
        if (!profile?.id) return false;

        const { event, settings } = await getActiveEvent();
        const member = await tryFetchGuildMember(
          event.discordGuildId,
          String(profile.id),
        );

        if (!member) return `/login?error=${AUTH_ERRORS.notMember}`;

        const role = resolveAppRole(member.roles, settings);
        if (!isStaffRole(role)) return `/login?error=${AUTH_ERRORS.notStaff}`;

        await upsertUserFromLogin(String(profile.id), member.roles, role!, {
          username:
            (profile.username as string | undefined) ??
            (profile.name as string | undefined) ??
            "unknown",
          globalName: (profile.global_name as string | undefined) ?? null,
          nickname: member.nick ?? null,
          avatarUrl: avatarUrl(
            String(profile.id),
            (profile.avatar as string | null | undefined) ?? null,
          ),
          email: (profile.email as string | undefined) ?? null,
          joinedGuildAt: member.joined_at ? new Date(member.joined_at) : null,
        });

        return true;
      },

      async jwt({ token, profile, trigger }) {
        const discordId = (profile?.id as string | undefined) ?? token.discordId;
        if (!discordId) return token;

        // Refresh the cached role on sign-in and on every explicit update.
        if (profile || trigger === "update" || !token.role) {
          const record = await db.query.users.findFirst({
            where: eq(users.discordId, discordId),
          });

          if (record) {
            token.userId = record.id;
            token.discordId = record.discordId;
            token.role = record.role;
            token.username = record.globalName ?? record.username;
            token.picture = record.avatarUrl ?? token.picture;
          }
        }

        return token;
      },

      async session({ session, token }) {
        if (token.userId) session.user.id = token.userId;
        if (token.discordId) session.user.discordId = token.discordId;
        session.user.role = token.role ?? "participant";
        session.user.username = token.username ?? session.user.name ?? "";
        return session;
      },
    },
  };
});

async function upsertUserFromLogin(
  discordId: string,
  discordRoleIds: string[],
  role: AppRole,
  profile: {
    username: string;
    globalName: string | null;
    nickname: string | null;
    avatarUrl: string;
    email: string | null;
    joinedGuildAt: Date | null;
  },
): Promise<void> {
  const now = new Date();

  await db
    .insert(users)
    .values({
      discordId,
      username: profile.username,
      globalName: profile.globalName,
      nickname: profile.nickname,
      avatarUrl: profile.avatarUrl,
      email: profile.email,
      role,
      discordRoleIds,
      isGuildMember: true,
      joinedGuildAt: profile.joinedGuildAt,
      lastSyncedAt: now,
      lastLoginAt: now,
    })
    .onConflictDoUpdate({
      target: users.discordId,
      set: {
        username: profile.username,
        globalName: profile.globalName,
        nickname: profile.nickname,
        avatarUrl: profile.avatarUrl,
        email: profile.email,
        role,
        discordRoleIds,
        isGuildMember: true,
        lastSyncedAt: now,
        lastLoginAt: now,
        updatedAt: now,
      },
    });
}
