CREATE TYPE "public"."ticket_status" AS ENUM('delivered', 'partial', 'in_progress', 'not_started', 'needs_attention', 'no_access');--> statement-breakpoint
CREATE TABLE "ticket_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"channel_id" text NOT NULL,
	"channel_name" text NOT NULL,
	"group_label" text NOT NULL,
	"group_index" integer NOT NULL,
	"position" integer NOT NULL,
	"participant_id" uuid,
	"discord_user_id" text,
	"status" "ticket_status" NOT NULL,
	"has_game" boolean DEFAULT false NOT NULL,
	"has_media" boolean DEFAULT false NOT NULL,
	"game_url" text,
	"media_url" text,
	"summary" text,
	"last_activity_at" timestamp with time zone,
	"analyzed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ticket_reviews" ADD CONSTRAINT "ticket_reviews_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_reviews" ADD CONSTRAINT "ticket_reviews_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ticket_reviews_event_channel_idx" ON "ticket_reviews" USING btree ("event_id","channel_id");--> statement-breakpoint
CREATE INDEX "ticket_reviews_event_position_idx" ON "ticket_reviews" USING btree ("event_id","position");