CREATE TYPE "public"."app_role" AS ENUM('admin', 'moderator', 'participant');--> statement-breakpoint
CREATE TYPE "public"."checkpoint_status" AS ENUM('pending', 'submitted', 'late', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('draft', 'live', 'finished', 'archived');--> statement-breakpoint
CREATE TYPE "public"."participant_status" AS ENUM('active', 'unassigned', 'inactive', 'dropped');--> statement-breakpoint
CREATE TYPE "public"."reminder_kind" AS ENUM('before_shift', 'shift_start');--> statement-breakpoint
CREATE TYPE "public"."reminder_status" AS ENUM('pending', 'sent', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."shift_status" AS ENUM('scheduled', 'in_progress', 'completed', 'delayed', 'missed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."sync_status" AS ENUM('running', 'success', 'failed');--> statement-breakpoint
CREATE TYPE "public"."sync_trigger" AS ENUM('manual', 'cron', 'login');--> statement-breakpoint
CREATE TYPE "public"."team_status" AS ENUM('active', 'paused', 'finished');--> statement-breakpoint
CREATE TYPE "public"."timeline_event_type" AS ENUM('shift_scheduled', 'shift_started', 'shift_completed', 'shift_delayed', 'shift_rescheduled', 'shift_cancelled', 'checkpoint_submitted', 'checkpoint_late', 'checkpoint_reviewed', 'participant_synced', 'participant_assigned', 'participant_unassigned', 'team_created', 'team_updated', 'reminder_sent', 'sync_completed', 'note_added');--> statement-breakpoint
CREATE TABLE "checkpoints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"shift_id" uuid,
	"participant_id" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"drive_url" text,
	"video_url" text,
	"submitted_at" timestamp with time zone,
	"duration_minutes" integer,
	"status" "checkpoint_status" DEFAULT 'pending' NOT NULL,
	"observations" text,
	"internal_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"admin_role_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"moderator_role_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"participant_role_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reminder_offsets" jsonb DEFAULT '[60,15]'::jsonb NOT NULL,
	"reminders_enabled" boolean DEFAULT true NOT NULL,
	"auto_sync_enabled" boolean DEFAULT true NOT NULL,
	"ticket_url_template" text,
	"drive_root_url" text,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" "event_status" DEFAULT 'draft' NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"timezone" text DEFAULT 'Europe/Madrid' NOT NULL,
	"discord_guild_id" text NOT NULL,
	"default_shift_minutes" integer DEFAULT 60 NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"team_id" uuid,
	"status" "participant_status" DEFAULT 'unassigned' NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"availability" text,
	"timezone" text,
	"internal_notes" text,
	"discord_ticket_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"shift_id" uuid NOT NULL,
	"kind" "reminder_kind" NOT NULL,
	"offset_minutes" integer DEFAULT 0 NOT NULL,
	"scheduled_for" timestamp with time zone NOT NULL,
	"sent_at" timestamp with time zone,
	"status" "reminder_status" DEFAULT 'pending' NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shifts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"participant_id" uuid,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"actual_start_at" timestamp with time zone,
	"actual_end_at" timestamp with time zone,
	"status" "shift_status" DEFAULT 'scheduled' NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"trigger" "sync_trigger" DEFAULT 'manual' NOT NULL,
	"status" "sync_status" DEFAULT 'running' NOT NULL,
	"members_fetched" integer DEFAULT 0 NOT NULL,
	"users_created" integer DEFAULT 0 NOT NULL,
	"users_updated" integer DEFAULT 0 NOT NULL,
	"participants_created" integer DEFAULT 0 NOT NULL,
	"participants_deactivated" integer DEFAULT 0 NOT NULL,
	"error" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"color" text DEFAULT '#6366f1' NOT NULL,
	"status" "team_status" DEFAULT 'active' NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"drive_folder_url" text,
	"discord_channel_id" text,
	"internal_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timeline_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"type" timeline_event_type NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"team_id" uuid,
	"participant_id" uuid,
	"shift_id" uuid,
	"checkpoint_id" uuid,
	"actor_user_id" uuid,
	"metadata" jsonb,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"discord_id" text NOT NULL,
	"username" text NOT NULL,
	"global_name" text,
	"nickname" text,
	"avatar_url" text,
	"banner_color" text,
	"email" text,
	"role" "app_role" DEFAULT 'participant' NOT NULL,
	"discord_role_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_guild_member" boolean DEFAULT true NOT NULL,
	"joined_guild_at" timestamp with time zone,
	"last_synced_at" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "checkpoints" ADD CONSTRAINT "checkpoints_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkpoints" ADD CONSTRAINT "checkpoints_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkpoints" ADD CONSTRAINT "checkpoints_shift_id_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkpoints" ADD CONSTRAINT "checkpoints_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_settings" ADD CONSTRAINT "event_settings_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_shift_id_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_runs" ADD CONSTRAINT "sync_runs_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_events" ADD CONSTRAINT "timeline_events_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_events" ADD CONSTRAINT "timeline_events_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_events" ADD CONSTRAINT "timeline_events_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_events" ADD CONSTRAINT "timeline_events_shift_id_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_events" ADD CONSTRAINT "timeline_events_checkpoint_id_checkpoints_id_fk" FOREIGN KEY ("checkpoint_id") REFERENCES "public"."checkpoints"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_events" ADD CONSTRAINT "timeline_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "checkpoints_team_idx" ON "checkpoints" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "checkpoints_event_submitted_idx" ON "checkpoints" USING btree ("event_id","submitted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "checkpoints_team_version_idx" ON "checkpoints" USING btree ("team_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "event_settings_event_idx" ON "event_settings" USING btree ("event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "events_slug_idx" ON "events" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "participants_event_user_idx" ON "participants" USING btree ("event_id","user_id");--> statement-breakpoint
CREATE INDEX "participants_team_idx" ON "participants" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "participants_event_idx" ON "participants" USING btree ("event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reminders_shift_kind_offset_idx" ON "reminders" USING btree ("shift_id","kind","offset_minutes");--> statement-breakpoint
CREATE INDEX "reminders_due_idx" ON "reminders" USING btree ("status","scheduled_for");--> statement-breakpoint
CREATE INDEX "shifts_event_starts_idx" ON "shifts" USING btree ("event_id","starts_at");--> statement-breakpoint
CREATE INDEX "shifts_team_idx" ON "shifts" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "shifts_participant_idx" ON "shifts" USING btree ("participant_id");--> statement-breakpoint
CREATE INDEX "shifts_status_idx" ON "shifts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sync_runs_event_started_idx" ON "sync_runs" USING btree ("event_id","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "teams_event_slug_idx" ON "teams" USING btree ("event_id","slug");--> statement-breakpoint
CREATE INDEX "teams_event_idx" ON "teams" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "timeline_event_occurred_idx" ON "timeline_events" USING btree ("event_id","occurred_at");--> statement-breakpoint
CREATE INDEX "timeline_type_idx" ON "timeline_events" USING btree ("type");--> statement-breakpoint
CREATE UNIQUE INDEX "users_discord_id_idx" ON "users" USING btree ("discord_id");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");