CREATE TYPE "public"."github_activity_kind" AS ENUM('commit', 'pull_request', 'issue', 'release');--> statement-breakpoint
CREATE TYPE "public"."milestone_status" AS ENUM('planned', 'active', 'completed', 'paused', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."sync_status" AS ENUM('never', 'syncing', 'success', 'error');--> statement-breakpoint
CREATE TYPE "public"."timeline_origin" AS ENUM('project', 'rubrica', 'development', 'milestone');--> statement-breakpoint
CREATE TYPE "public"."tool_category" AS ENUM('development', 'design', 'ai', 'infrastructure', 'analytics', 'communication', 'productivity', 'other');--> statement-breakpoint
ALTER TYPE "public"."progress_source" ADD VALUE 'milestones';--> statement-breakpoint
ALTER TYPE "public"."timeline_event_type" ADD VALUE 'goal_change';--> statement-breakpoint
ALTER TYPE "public"."timeline_event_type" ADD VALUE 'milestone_created';--> statement-breakpoint
ALTER TYPE "public"."timeline_event_type" ADD VALUE 'milestone_started';--> statement-breakpoint
ALTER TYPE "public"."timeline_event_type" ADD VALUE 'milestone_completed';--> statement-breakpoint
ALTER TYPE "public"."timeline_event_type" ADD VALUE 'milestone_paused';--> statement-breakpoint
ALTER TYPE "public"."timeline_event_type" ADD VALUE 'milestone_cancelled';--> statement-breakpoint
ALTER TYPE "public"."timeline_event_type" ADD VALUE 'insight';--> statement-breakpoint
ALTER TYPE "public"."timeline_event_type" ADD VALUE 'problem';--> statement-breakpoint
CREATE TABLE "github_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"kind" "github_activity_kind" NOT NULL,
	"external_id" text NOT NULL,
	"number" integer,
	"title" text NOT NULL,
	"body" text,
	"state" text,
	"author_login" text,
	"author_avatar_url" text,
	"url" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"closed_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" "milestone_status" DEFAULT 'planned' NOT NULL,
	"priority" "feature_priority" DEFAULT 'important' NOT NULL,
	"started_on" date,
	"due_on" date,
	"completed_at" timestamp with time zone,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_note_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"note_id" uuid NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"type" "note_type" NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"edited_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_features" ADD COLUMN "milestone_id" uuid;--> statement-breakpoint
ALTER TABLE "project_github_connections" ADD COLUMN "sync_status" "sync_status" DEFAULT 'never' NOT NULL;--> statement-breakpoint
ALTER TABLE "project_github_connections" ADD COLUMN "sync_started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "project_github_connections" ADD COLUMN "sync_error" text;--> statement-breakpoint
ALTER TABLE "project_github_connections" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "project_github_connections" ADD COLUMN "last_pushed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "project_github_connections" ADD COLUMN "branches" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "project_github_connections" ADD COLUMN "contributors" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "project_notes" ADD COLUMN "tags" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "project_timeline_events" ADD COLUMN "origin" timeline_origin DEFAULT 'project' NOT NULL;--> statement-breakpoint
ALTER TABLE "project_tools" ADD COLUMN "category" "tool_category";--> statement-breakpoint
ALTER TABLE "github_activity" ADD CONSTRAINT "github_activity_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_milestones" ADD CONSTRAINT "project_milestones_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_note_revisions" ADD CONSTRAINT "project_note_revisions_note_id_project_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."project_notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_note_revisions" ADD CONSTRAINT "project_note_revisions_edited_by_id_users_id_fk" FOREIGN KEY ("edited_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "github_activity_project_kind_external_unique" ON "github_activity" USING btree ("project_id","kind","external_id");--> statement-breakpoint
CREATE INDEX "github_activity_project_occurred_idx" ON "github_activity" USING btree ("project_id","occurred_at");--> statement-breakpoint
CREATE INDEX "github_activity_project_kind_idx" ON "github_activity" USING btree ("project_id","kind","occurred_at");--> statement-breakpoint
CREATE INDEX "project_milestones_project_idx" ON "project_milestones" USING btree ("project_id","position");--> statement-breakpoint
CREATE INDEX "project_note_revisions_note_idx" ON "project_note_revisions" USING btree ("note_id","created_at");--> statement-breakpoint
ALTER TABLE "project_features" ADD CONSTRAINT "project_features_milestone_id_project_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."project_milestones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_features_milestone_idx" ON "project_features" USING btree ("milestone_id");--> statement-breakpoint
CREATE INDEX "project_notes_tags_idx" ON "project_notes" USING gin ("tags");--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS unaccent;--> statement-breakpoint
UPDATE "project_timeline_events" SET "origin" = CASE
  WHEN "type"::text LIKE 'github_%' OR "type"::text IN ('deploy', 'release') THEN 'development'::timeline_origin
  WHEN "type"::text = 'decision' AND "source" = 'system' THEN 'rubrica'::timeline_origin
  WHEN "type"::text = 'milestone' THEN 'milestone'::timeline_origin
  ELSE 'project'::timeline_origin
END;
