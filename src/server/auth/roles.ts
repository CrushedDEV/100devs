import type { AppRole } from "@/lib/constants";
import type { EventSettings } from "@/server/db/schema";

/**
 * Maps a member's Discord role ids to the application role.
 *
 * Precedence is admin > moderator > participant so a staff member who also
 * carries the participant role still reaches the panel.
 */
export function resolveAppRole(
  discordRoleIds: readonly string[],
  settings: Pick<
    EventSettings,
    "adminRoleIds" | "moderatorRoleIds" | "participantRoleIds"
  >,
): AppRole | null {
  const owned = new Set(discordRoleIds);

  if (settings.adminRoleIds.some((id) => owned.has(id))) return "admin";
  if (settings.moderatorRoleIds.some((id) => owned.has(id))) return "moderator";
  if (settings.participantRoleIds.some((id) => owned.has(id))) return "participant";

  return null;
}

export function isStaffRole(role: AppRole | null | undefined): boolean {
  return role === "admin" || role === "moderator";
}
