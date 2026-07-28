import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import {
  APP_ROLES,
  CHECKPOINT_STATUSES,
  EVENT_STATUSES,
  PARTICIPANT_STATUSES,
  REMINDER_KINDS,
  REMINDER_STATUSES,
  SHIFT_STATUSES,
  SYNC_STATUSES,
  SYNC_TRIGGERS,
  TEAM_STATUSES,
  TIMELINE_EVENT_TYPES,
  type SkillRoleMap,
} from "@/lib/constants";

/* -------------------------------------------------------------------------- */
/*                                   Enums                                    */
/* -------------------------------------------------------------------------- */

export const appRoleEnum = pgEnum("app_role", APP_ROLES);
export const eventStatusEnum = pgEnum("event_status", EVENT_STATUSES);
export const teamStatusEnum = pgEnum("team_status", TEAM_STATUSES);
export const participantStatusEnum = pgEnum(
  "participant_status",
  PARTICIPANT_STATUSES,
);
export const shiftStatusEnum = pgEnum("shift_status", SHIFT_STATUSES);
export const checkpointStatusEnum = pgEnum(
  "checkpoint_status",
  CHECKPOINT_STATUSES,
);
export const timelineEventTypeEnum = pgEnum(
  "timeline_event_type",
  TIMELINE_EVENT_TYPES,
);
export const reminderKindEnum = pgEnum("reminder_kind", REMINDER_KINDS);
export const reminderStatusEnum = pgEnum("reminder_status", REMINDER_STATUSES);
export const syncTriggerEnum = pgEnum("sync_trigger", SYNC_TRIGGERS);
export const syncStatusEnum = pgEnum("sync_status", SYNC_STATUSES);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
};

/* -------------------------------------------------------------------------- */
/*                                   Events                                   */
/* -------------------------------------------------------------------------- */

/**
 * An edition of the event. Everything else is scoped by `eventId` so future
 * editions (or several simultaneous events) need no schema change.
 */
export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    status: eventStatusEnum("status").notNull().default("draft"),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    timezone: text("timezone").notNull().default("Europe/Madrid"),
    discordGuildId: text("discord_guild_id").notNull(),
    /** Default length of a development shift, in minutes. */
    defaultShiftMinutes: integer("default_shift_minutes").notNull().default(60),
    isDefault: boolean("is_default").notNull().default(false),
    ...timestamps,
  },
  (table) => [uniqueIndex("events_slug_idx").on(table.slug)],
);

/**
 * Per-event configuration that the organiser can edit from the settings page.
 * Kept in its own table so `events` stays small and cache-friendly.
 */
export const eventSettings = pgTable(
  "event_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    adminRoleIds: jsonb("admin_role_ids").$type<string[]>().notNull().default([]),
    moderatorRoleIds: jsonb("moderator_role_ids")
      .$type<string[]>()
      .notNull()
      .default([]),
    participantRoleIds: jsonb("participant_role_ids")
      .$type<string[]>()
      .notNull()
      .default([]),
    /** Minutes before shift start at which reminders are dispatched. */
    reminderOffsets: jsonb("reminder_offsets")
      .$type<number[]>()
      .notNull()
      .default([60, 15]),
    remindersEnabled: boolean("reminders_enabled").notNull().default(true),
    autoSyncEnabled: boolean("auto_sync_enabled").notNull().default(true),
    /**
     * Skill key → Discord role id. A participant's skills are derived by
     * intersecting this map with the roles they hold, so nothing has to be
     * kept in sync manually.
     */
    skillRoleIds: jsonb("skill_role_ids")
      .$type<SkillRoleMap>()
      .notNull()
      .default({}),
    /** Template used to build a participant's private ticket link. */
    ticketUrlTemplate: text("ticket_url_template"),
    driveRootUrl: text("drive_root_url"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [uniqueIndex("event_settings_event_idx").on(table.eventId)],
);

/* -------------------------------------------------------------------------- */
/*                                   Users                                    */
/* -------------------------------------------------------------------------- */

/**
 * A Discord identity mirrored into the app. Global (not event scoped) so the
 * same person keeps their identity across editions.
 */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    discordId: text("discord_id").notNull(),
    username: text("username").notNull(),
    globalName: text("global_name"),
    nickname: text("nickname"),
    avatarUrl: text("avatar_url"),
    bannerColor: text("banner_color"),
    email: text("email"),
    role: appRoleEnum("role").notNull().default("participant"),
    discordRoleIds: jsonb("discord_role_ids").$type<string[]>().notNull().default([]),
    isGuildMember: boolean("is_guild_member").notNull().default(true),
    joinedGuildAt: timestamp("joined_guild_at", { withTimezone: true }),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("users_discord_id_idx").on(table.discordId),
    index("users_role_idx").on(table.role),
  ],
);

/* -------------------------------------------------------------------------- */
/*                                   Teams                                    */
/* -------------------------------------------------------------------------- */

export const teams = pgTable(
  "teams",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    color: text("color").notNull().default("#6366f1"),
    status: teamStatusEnum("status").notNull().default("active"),
    orderIndex: integer("order_index").notNull().default(0),
    driveFolderUrl: text("drive_folder_url"),
    discordChannelId: text("discord_channel_id"),
    internalNotes: text("internal_notes"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("teams_event_slug_idx").on(table.eventId, table.slug),
    index("teams_event_idx").on(table.eventId),
  ],
);

/* -------------------------------------------------------------------------- */
/*                                Participants                                */
/* -------------------------------------------------------------------------- */

/**
 * A user's enrolment in a specific event. `orderIndex` is the position in the
 * team rotation — it drives "who develops next".
 */
export const participants = pgTable(
  "participants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    teamId: uuid("team_id").references(() => teams.id, { onDelete: "set null" }),
    status: participantStatusEnum("status").notNull().default("unassigned"),
    orderIndex: integer("order_index").notNull().default(0),
    availability: text("availability"),
    timezone: text("timezone"),
    internalNotes: text("internal_notes"),
    discordTicketUrl: text("discord_ticket_url"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("participants_event_user_idx").on(table.eventId, table.userId),
    index("participants_team_idx").on(table.teamId),
    index("participants_event_idx").on(table.eventId),
  ],
);

/* -------------------------------------------------------------------------- */
/*                                   Shifts                                   */
/* -------------------------------------------------------------------------- */

export const shifts = pgTable(
  "shifts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    participantId: uuid("participant_id").references(() => participants.id, {
      onDelete: "set null",
    }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    actualStartAt: timestamp("actual_start_at", { withTimezone: true }),
    actualEndAt: timestamp("actual_end_at", { withTimezone: true }),
    status: shiftStatusEnum("status").notNull().default("scheduled"),
    orderIndex: integer("order_index").notNull().default(0),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [
    index("shifts_event_starts_idx").on(table.eventId, table.startsAt),
    index("shifts_team_idx").on(table.teamId),
    index("shifts_participant_idx").on(table.participantId),
    index("shifts_status_idx").on(table.status),
  ],
);

/* -------------------------------------------------------------------------- */
/*                                Checkpoints                                 */
/* -------------------------------------------------------------------------- */

/**
 * Organisational record of a delivery. The app never stores Unity projects —
 * only the Drive/video URLs plus scheduling metadata.
 */
export const checkpoints = pgTable(
  "checkpoints",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    shiftId: uuid("shift_id").references(() => shifts.id, {
      onDelete: "set null",
    }),
    participantId: uuid("participant_id").references(() => participants.id, {
      onDelete: "set null",
    }),
    /** Incremental version number within the team, e.g. v1, v2, v3. */
    version: integer("version").notNull().default(1),
    driveUrl: text("drive_url"),
    videoUrl: text("video_url"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    durationMinutes: integer("duration_minutes"),
    status: checkpointStatusEnum("status").notNull().default("pending"),
    observations: text("observations"),
    internalNotes: text("internal_notes"),
    ...timestamps,
  },
  (table) => [
    index("checkpoints_team_idx").on(table.teamId),
    index("checkpoints_event_submitted_idx").on(table.eventId, table.submittedAt),
    uniqueIndex("checkpoints_team_version_idx").on(table.teamId, table.version),
  ],
);

/* -------------------------------------------------------------------------- */
/*                              Timeline events                               */
/* -------------------------------------------------------------------------- */

export const timelineEvents = pgTable(
  "timeline_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    type: timelineEventTypeEnum("type").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    teamId: uuid("team_id").references(() => teams.id, { onDelete: "set null" }),
    participantId: uuid("participant_id").references(() => participants.id, {
      onDelete: "set null",
    }),
    shiftId: uuid("shift_id").references(() => shifts.id, {
      onDelete: "set null",
    }),
    checkpointId: uuid("checkpoint_id").references(() => checkpoints.id, {
      onDelete: "set null",
    }),
    /** Staff member who triggered the change, when it was not automatic. */
    actorUserId: uuid("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("timeline_event_occurred_idx").on(table.eventId, table.occurredAt),
    index("timeline_type_idx").on(table.type),
  ],
);

/* -------------------------------------------------------------------------- */
/*                                 Reminders                                  */
/* -------------------------------------------------------------------------- */

export const reminders = pgTable(
  "reminders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    shiftId: uuid("shift_id")
      .notNull()
      .references(() => shifts.id, { onDelete: "cascade" }),
    kind: reminderKindEnum("kind").notNull(),
    /** Minutes before `shift.startsAt`; 0 for the "your shift starts now" DM. */
    offsetMinutes: integer("offset_minutes").notNull().default(0),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    status: reminderStatusEnum("status").notNull().default("pending"),
    error: text("error"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("reminders_shift_kind_offset_idx").on(
      table.shiftId,
      table.kind,
      table.offsetMinutes,
    ),
    index("reminders_due_idx").on(table.status, table.scheduledFor),
  ],
);

/* -------------------------------------------------------------------------- */
/*                                 Sync runs                                  */
/* -------------------------------------------------------------------------- */

export const syncRuns = pgTable(
  "sync_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    trigger: syncTriggerEnum("trigger").notNull().default("manual"),
    status: syncStatusEnum("status").notNull().default("running"),
    membersFetched: integer("members_fetched").notNull().default(0),
    usersCreated: integer("users_created").notNull().default(0),
    usersUpdated: integer("users_updated").notNull().default(0),
    participantsCreated: integer("participants_created").notNull().default(0),
    participantsDeactivated: integer("participants_deactivated")
      .notNull()
      .default(0),
    error: text("error"),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (table) => [index("sync_runs_event_started_idx").on(table.eventId, table.startedAt)],
);

/* -------------------------------------------------------------------------- */
/*                                 Relations                                  */
/* -------------------------------------------------------------------------- */

export const eventsRelations = relations(events, ({ many, one }) => ({
  settings: one(eventSettings, {
    fields: [events.id],
    references: [eventSettings.eventId],
  }),
  teams: many(teams),
  participants: many(participants),
  shifts: many(shifts),
  checkpoints: many(checkpoints),
  timeline: many(timelineEvents),
}));

export const eventSettingsRelations = relations(eventSettings, ({ one }) => ({
  event: one(events, {
    fields: [eventSettings.eventId],
    references: [events.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  participations: many(participants),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  event: one(events, { fields: [teams.eventId], references: [events.id] }),
  participants: many(participants),
  shifts: many(shifts),
  checkpoints: many(checkpoints),
}));

export const participantsRelations = relations(participants, ({ one, many }) => ({
  event: one(events, { fields: [participants.eventId], references: [events.id] }),
  user: one(users, { fields: [participants.userId], references: [users.id] }),
  team: one(teams, { fields: [participants.teamId], references: [teams.id] }),
  shifts: many(shifts),
  checkpoints: many(checkpoints),
}));

export const shiftsRelations = relations(shifts, ({ one, many }) => ({
  event: one(events, { fields: [shifts.eventId], references: [events.id] }),
  team: one(teams, { fields: [shifts.teamId], references: [teams.id] }),
  participant: one(participants, {
    fields: [shifts.participantId],
    references: [participants.id],
  }),
  checkpoints: many(checkpoints),
  reminders: many(reminders),
}));

export const checkpointsRelations = relations(checkpoints, ({ one }) => ({
  event: one(events, { fields: [checkpoints.eventId], references: [events.id] }),
  team: one(teams, { fields: [checkpoints.teamId], references: [teams.id] }),
  shift: one(shifts, { fields: [checkpoints.shiftId], references: [shifts.id] }),
  participant: one(participants, {
    fields: [checkpoints.participantId],
    references: [participants.id],
  }),
}));

export const timelineEventsRelations = relations(timelineEvents, ({ one }) => ({
  event: one(events, {
    fields: [timelineEvents.eventId],
    references: [events.id],
  }),
  team: one(teams, { fields: [timelineEvents.teamId], references: [teams.id] }),
  participant: one(participants, {
    fields: [timelineEvents.participantId],
    references: [participants.id],
  }),
  shift: one(shifts, {
    fields: [timelineEvents.shiftId],
    references: [shifts.id],
  }),
  checkpoint: one(checkpoints, {
    fields: [timelineEvents.checkpointId],
    references: [checkpoints.id],
  }),
  actor: one(users, {
    fields: [timelineEvents.actorUserId],
    references: [users.id],
  }),
}));

export const remindersRelations = relations(reminders, ({ one }) => ({
  event: one(events, { fields: [reminders.eventId], references: [events.id] }),
  shift: one(shifts, { fields: [reminders.shiftId], references: [shifts.id] }),
}));

export const syncRunsRelations = relations(syncRuns, ({ one }) => ({
  event: one(events, { fields: [syncRuns.eventId], references: [events.id] }),
}));

/* -------------------------------------------------------------------------- */
/*                              Inferred models                               */
/* -------------------------------------------------------------------------- */

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type EventSettings = typeof eventSettings.$inferSelect;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type Participant = typeof participants.$inferSelect;
export type NewParticipant = typeof participants.$inferInsert;
export type Shift = typeof shifts.$inferSelect;
export type NewShift = typeof shifts.$inferInsert;
export type Checkpoint = typeof checkpoints.$inferSelect;
export type NewCheckpoint = typeof checkpoints.$inferInsert;
export type TimelineEvent = typeof timelineEvents.$inferSelect;
export type Reminder = typeof reminders.$inferSelect;
export type SyncRun = typeof syncRuns.$inferSelect;
