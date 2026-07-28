import { NextResponse, type NextRequest } from "next/server";
import { sql } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Deployment diagnostics.
 *
 * Production Server Component errors are reduced to an opaque digest, so this
 * endpoint checks each dependency in isolation and reports which one is
 * broken. It never returns secret *values* — only whether they are present.
 *
 * Protected by `CRON_SECRET`: the shape of the configuration is itself useful
 * information to an attacker.
 */
export async function GET(request: NextRequest) {
  const denied = authorize(request);
  if (denied) return denied;

  const checks = {
    env: checkEnv(),
    database: await checkDatabase(),
    schema: await checkSchema(),
    discord: await checkDiscord(),
    roles: await checkRoles(),
  };

  const ok = Object.values(checks).every((check) => check.ok);

  return NextResponse.json({ ok, checks }, { status: ok ? 200 : 503 });
}

/**
 * Reads `CRON_SECRET` straight from `process.env` instead of going through
 * `getEnv()`: the validated accessor throws when *any* variable is missing,
 * which is precisely the situation this endpoint exists to diagnose.
 */
function authorize(request: NextRequest): NextResponse | null {
  const expected = process.env.CRON_SECRET;

  if (!expected) {
    return NextResponse.json(
      {
        ok: false,
        checks: {
          env: {
            ok: false,
            detail:
              "CRON_SECRET no está definida, así que este endpoint no puede autenticarse. Añádela en Vercel y vuelve a desplegar.",
          },
        },
      },
      { status: 503 },
    );
  }

  const fromHeader = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  const fromQuery = request.nextUrl.searchParams.get("secret");

  if (fromHeader === expected || fromQuery === expected) return null;

  return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
}

interface Check {
  ok: boolean;
  detail?: string;
  [key: string]: unknown;
}

/** Presence-only report; values are never echoed back. */
function checkEnv(): Check {
  const required = [
    "DATABASE_URL",
    "AUTH_SECRET",
    "DISCORD_CLIENT_ID",
    "DISCORD_CLIENT_SECRET",
    "DISCORD_BOT_TOKEN",
    "DISCORD_GUILD_ID",
  ] as const;

  const missing = required.filter((key) => !process.env[key]);

  return {
    ok: missing.length === 0,
    missing,
    detail: missing.length
      ? `Faltan variables de entorno en Vercel: ${missing.join(", ")}`
      : undefined,
  };
}

async function checkDatabase(): Promise<Check> {
  if (!process.env.DATABASE_URL) {
    return { ok: false, detail: "DATABASE_URL no está definida." };
  }

  try {
    const { db } = await import("@/server/db");
    await db.execute(sql`select 1`);
    return { ok: true };
  } catch (error) {
    return { ok: false, detail: describeError(error) };
  }
}

/** Verifies that migrations have actually been applied to this database. */
async function checkSchema(): Promise<Check> {
  if (!process.env.DATABASE_URL) {
    return { ok: false, detail: "DATABASE_URL no está definida." };
  }

  const expected = [
    "events",
    "event_settings",
    "users",
    "participants",
    "teams",
    "shifts",
    "checkpoints",
    "timeline_events",
    "reminders",
    "sync_runs",
  ];

  try {
    const { db } = await import("@/server/db");
    const rows = await db.execute<{ table_name: string }>(
      sql`select table_name from information_schema.tables where table_schema = 'public'`,
    );

    const present = new Set(
      [...rows].map((row) => (row as { table_name: string }).table_name),
    );
    const missing = expected.filter((table) => !present.has(table));

    return {
      ok: missing.length === 0,
      missing,
      detail: missing.length
        ? "Faltan tablas: ejecuta `npm run db:push` apuntando a la base de datos de producción."
        : undefined,
    };
  } catch (error) {
    return { ok: false, detail: describeError(error) };
  }
}

/** Confirms the bot token is valid and the bot can see the configured guild. */
async function checkDiscord(): Promise<Check> {
  const token = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;

  if (!token || !guildId) {
    return {
      ok: false,
      detail: "DISCORD_BOT_TOKEN o DISCORD_GUILD_ID no están definidas.",
    };
  }

  try {
    const response = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}`,
      { headers: { Authorization: `Bot ${token}` }, cache: "no-store" },
    );

    if (response.status === 401) {
      return { ok: false, detail: "DISCORD_BOT_TOKEN no es válido." };
    }
    if (response.status === 403 || response.status === 404) {
      return {
        ok: false,
        detail:
          "El bot no tiene acceso al servidor. Revisa DISCORD_GUILD_ID y que el bot esté invitado.",
      };
    }
    if (!response.ok) {
      return { ok: false, detail: `Discord respondió ${response.status}.` };
    }

    const guild = (await response.json()) as { name?: string };
    return { ok: true, guild: guild.name };
  } catch (error) {
    return { ok: false, detail: describeError(error) };
  }
}

/**
 * Lists every role in the event's Discord server next to the role ids
 * configured for admin/moderator/participant, so a mismatch (typo, stale id
 * from a previous server, wrong role picked) is visible at a glance without
 * needing anyone's personal Discord user id.
 */
async function checkRoles(): Promise<Check> {
  try {
    const { getActiveEvent } = await import("@/server/services/events");
    const { fetchGuildRoles } = await import("@/server/discord/client");

    const { event, settings } = await getActiveEvent();
    const guildRoles = await fetchGuildRoles(event.discordGuildId);

    const byId = new Map(guildRoles.map((role) => [role.id, role.name]));

    const describe = (ids: string[]) =>
      ids.map((id) => ({
        id,
        name: byId.get(id) ?? null,
        existsInGuild: byId.has(id),
      }));

    const admin = describe(settings.adminRoleIds);
    const moderator = describe(settings.moderatorRoleIds);
    const participant = describe(settings.participantRoleIds);

    const anyMissing = [...admin, ...moderator, ...participant].some(
      (role) => !role.existsInGuild,
    );

    return {
      ok: !anyMissing,
      detail: anyMissing
        ? "Uno o más IDs de rol configurados no existen en el servidor de Discord actual (existsInGuild: false). Corrígelos en /settings con el ID correcto de la lista `guildRoles`."
        : undefined,
      eventDiscordGuildId: event.discordGuildId,
      configured: { admin, moderator, participant },
      guildRoles: guildRoles
        .sort((a, b) => b.position - a.position)
        .map((role) => ({ id: role.id, name: role.name })),
    };
  } catch (error) {
    return { ok: false, detail: describeError(error) };
  }
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
