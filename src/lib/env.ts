import { z } from "zod";

/**
 * Central, validated access to environment variables.
 *
 * Validation is lazy so that `next build` (which imports modules without a real
 * runtime environment) never crashes: the schema is only enforced the first
 * time a value is actually read.
 */
const serverSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
  AUTH_URL: z.string().url().optional(),

  DISCORD_CLIENT_ID: z.string().min(1, "DISCORD_CLIENT_ID is required"),
  DISCORD_CLIENT_SECRET: z.string().min(1, "DISCORD_CLIENT_SECRET is required"),
  /** Bot token with `Server Members Intent` enabled; used for guild sync + DMs. */
  DISCORD_BOT_TOKEN: z.string().min(1, "DISCORD_BOT_TOKEN is required"),
  DISCORD_GUILD_ID: z.string().min(1, "DISCORD_GUILD_ID is required"),

  /** Comma separated role ids. Used as bootstrap defaults for a fresh event. */
  DISCORD_ADMIN_ROLE_IDS: z.string().optional().default(""),
  DISCORD_MODERATOR_ROLE_IDS: z.string().optional().default(""),
  DISCORD_PARTICIPANT_ROLE_IDS: z.string().optional().default(""),

  /** Shared secret required by the `/api/cron/*` endpoints. */
  CRON_SECRET: z.string().optional().default(""),

  NODE_ENV: z
    .enum(["development", "test", "production"])
    .optional()
    .default("development"),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | null = null;

export function getEnv(): ServerEnv {
  if (cached) return cached;

  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    // Logged in full (visible in the Vercel runtime logs) because the message
    // that reaches the browser is reduced to an opaque digest in production.
    const issues = describeIssues(parsed.error.issues);
    console.error(`[env] Configuración inválida:\n${issues}`);
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  cached = parsed.data;
  return cached;
}

/**
 * Non-throwing variant used by pages that must stay renderable even when the
 * deployment is misconfigured, so the user gets a setup screen rather than a
 * blank page.
 */
export function getEnvIssues(): string[] {
  const parsed = serverSchema.safeParse(process.env);
  if (parsed.success) return [];

  return parsed.error.issues.map((issue) => issue.path.join(".") || "env");
}

function describeIssues(
  issues: { path: PropertyKey[]; message: string }[],
): string {
  return issues
    .map((issue) => `  • ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
}

/** Reads a comma separated env var into a clean array of ids. */
export function envIdList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}
