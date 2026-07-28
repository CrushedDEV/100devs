import "server-only";

import { desc, eq } from "drizzle-orm";

import { envIdList, getEnv } from "@/lib/env";
import { db } from "@/server/db";
import { eventSettings, events, type Event, type EventSettings } from "@/server/db/schema";

export interface EventContext {
  event: Event;
  settings: EventSettings;
}

/**
 * Resolves the event the panel is currently operating on.
 *
 * Multi-event support is already modelled in the schema; today we simply pick
 * the row flagged as default (falling back to the most recent one) and create
 * it from environment variables the very first time the app boots.
 */
export async function getActiveEvent(): Promise<EventContext> {
  const existing = await db.query.events.findFirst({
    where: eq(events.isDefault, true),
    with: { settings: true },
  });

  if (existing?.settings) {
    return { event: existing, settings: existing.settings };
  }

  const latest = await db.query.events.findFirst({
    orderBy: [desc(events.createdAt)],
    with: { settings: true },
  });

  if (latest?.settings) {
    return { event: latest, settings: latest.settings };
  }

  if (latest && !latest.settings) {
    const settings = await createDefaultSettings(latest.id);
    return { event: latest, settings };
  }

  return bootstrapEvent();
}

/** Creates the first event from env vars so a fresh deploy is usable at once. */
async function bootstrapEvent(): Promise<EventContext> {
  const env = getEnv();

  const [event] = await db
    .insert(events)
    .values({
      slug: "edicion-1",
      name: "100 Devs · Edición 1",
      description:
        "100 desarrolladores construyen videojuegos por turnos, sin comunicarse entre ellos.",
      status: "draft",
      discordGuildId: env.DISCORD_GUILD_ID,
      isDefault: true,
    })
    .returning();

  const settings = await createDefaultSettings(event.id);
  return { event, settings };
}

async function createDefaultSettings(eventId: string): Promise<EventSettings> {
  const env = getEnv();

  const [settings] = await db
    .insert(eventSettings)
    .values({
      eventId,
      adminRoleIds: envIdList(env.DISCORD_ADMIN_ROLE_IDS),
      moderatorRoleIds: envIdList(env.DISCORD_MODERATOR_ROLE_IDS),
      participantRoleIds: envIdList(env.DISCORD_PARTICIPANT_ROLE_IDS),
    })
    .returning();

  return settings;
}

export async function listEvents(): Promise<Event[]> {
  return db.query.events.findMany({ orderBy: [desc(events.createdAt)] });
}

export async function updateEventSettings(
  eventId: string,
  values: Partial<
    Pick<
      EventSettings,
      | "adminRoleIds"
      | "moderatorRoleIds"
      | "participantRoleIds"
      | "reminderOffsets"
      | "remindersEnabled"
      | "autoSyncEnabled"
      | "skillRoleIds"
      | "ticketUrlTemplate"
      | "driveRootUrl"
      | "lastSyncedAt"
    >
  >,
): Promise<EventSettings> {
  const [updated] = await db
    .update(eventSettings)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(eventSettings.eventId, eventId))
    .returning();

  return updated;
}

export async function updateEvent(
  eventId: string,
  values: Partial<
    Pick<
      Event,
      | "name"
      | "description"
      | "status"
      | "startsAt"
      | "endsAt"
      | "timezone"
      | "defaultShiftMinutes"
      | "discordGuildId"
    >
  >,
): Promise<Event> {
  const [updated] = await db
    .update(events)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(events.id, eventId))
    .returning();

  return updated;
}
