ALTER TABLE "participants" ADD COLUMN "engines" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
UPDATE "participants" SET "engines" = jsonb_build_array("engine"::text) WHERE "engine" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "participants" DROP COLUMN "engine";--> statement-breakpoint
DROP TYPE "public"."engine";
