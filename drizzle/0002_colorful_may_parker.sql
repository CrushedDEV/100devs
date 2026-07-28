CREATE TYPE "public"."engine" AS ENUM('unity', 'unreal', 'godot');--> statement-breakpoint
ALTER TABLE "participants" ADD COLUMN "engine" "engine";