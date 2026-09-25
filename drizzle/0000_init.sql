CREATE TYPE "public"."asset_availability" AS ENUM('yes', 'in_progress', 'no');--> statement-breakpoint
CREATE TYPE "public"."engagement" AS ENUM('personal', 'client', 'employer', 'partnership');--> statement-breakpoint
CREATE TYPE "public"."feature_priority" AS ENUM('essential', 'important', 'desirable');--> statement-breakpoint
CREATE TYPE "public"."feature_status" AS ENUM('planned', 'in_progress', 'done');--> statement-breakpoint
CREATE TYPE "public"."note_type" AS ENUM('note', 'idea', 'insight', 'observation', 'decision', 'question', 'problem', 'meeting', 'reference', 'discarded_idea');--> statement-breakpoint
CREATE TYPE "public"."progress_source" AS ENUM('manual', 'features');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('idea', 'planning', 'in_development', 'validation', 'production', 'paused', 'completed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."project_type" AS ENUM('saas', 'system', 'web_app', 'mobile_app', 'website', 'branding', 'study', 'academic', 'professional', 'experiment', 'idea', 'other');--> statement-breakpoint
CREATE TYPE "public"."timeline_event_type" AS ENUM('created', 'first_idea', 'decision', 'scope_change', 'milestone', 'deploy', 'release', 'status_change', 'paused', 'resumed', 'completed', 'archived', 'github_connected', 'github_disconnected', 'note');--> statement-breakpoint
CREATE TYPE "public"."timeline_source" AS ENUM('manual', 'system', 'github');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'member');--> statement-breakpoint
CREATE TABLE "project_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"title" text,
	"current_step" integer DEFAULT 0 NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_features" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"priority" "feature_priority" DEFAULT 'important' NOT NULL,
	"status" "feature_status" DEFAULT 'planned' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_finances" (
	"project_id" uuid PRIMARY KEY NOT NULL,
	"currency" text DEFAULT 'BRL' NOT NULL,
	"has_budget" boolean,
	"budget_cents" bigint,
	"investment_planned_cents" bigint,
	"investment_realized_cents" bigint,
	"expected_revenue_cents" bigint,
	"recurring_revenue_cents" bigint,
	"contracted_value_cents" bigint,
	"monetization_model" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_github_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"github_repository_id" bigint,
	"github_owner" text NOT NULL,
	"github_repository_name" text NOT NULL,
	"github_repository_url" text NOT NULL,
	"github_default_branch" text,
	"is_private" boolean,
	"verified" boolean DEFAULT false NOT NULL,
	"github_connected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"github_last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid,
	"name" text NOT NULL,
	"organization" text,
	"role" text,
	"responsibility" text,
	"contribution" text,
	"is_lead" boolean DEFAULT false NOT NULL,
	"started_on" date,
	"ended_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"author_id" uuid,
	"title" text NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"type" "note_type" DEFAULT 'note' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_references" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"url" text,
	"description" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_timeline_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"type" timeline_event_type NOT NULL,
	"source" timeline_source DEFAULT 'manual' NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb,
	"created_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_tools" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"purpose" text,
	"plan" text,
	"cost_cents" bigint,
	"frequency" text,
	"started_on" date,
	"ended_on" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"codename" text,
	"summary" text,
	"type" "project_type" NOT NULL,
	"category" text,
	"status" "project_status" DEFAULT 'idea' NOT NULL,
	"started_on" date,
	"lead_name" text,
	"problem" text,
	"primary_goal" text NOT NULL,
	"secondary_goals" text,
	"audience" text,
	"end_users" text,
	"expected_outcome" text,
	"success_criteria" text,
	"mandatory_features" text,
	"technical_constraints" text,
	"integrations" text,
	"has_visual_identity" "asset_availability",
	"has_logo" "asset_availability",
	"has_brand_manual" "asset_availability",
	"visual_references_notes" text,
	"desired_feeling" text,
	"styles_to_avoid" text,
	"engagement" "engagement",
	"client_name" text,
	"desired_deadline" text,
	"launch_target_on" date,
	"observations" text,
	"progress" integer DEFAULT 0 NOT NULL,
	"progress_source" "progress_source" DEFAULT 'features' NOT NULL,
	"status_changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_progress_range" CHECK ("projects"."progress" between 0 and 100)
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'member' NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_drafts" ADD CONSTRAINT "project_drafts_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_features" ADD CONSTRAINT "project_features_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_finances" ADD CONSTRAINT "project_finances_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_github_connections" ADD CONSTRAINT "project_github_connections_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_notes" ADD CONSTRAINT "project_notes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_notes" ADD CONSTRAINT "project_notes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_references" ADD CONSTRAINT "project_references_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_timeline_events" ADD CONSTRAINT "project_timeline_events_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_timeline_events" ADD CONSTRAINT "project_timeline_events_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_tools" ADD CONSTRAINT "project_tools_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_drafts_owner_updated_idx" ON "project_drafts" USING btree ("owner_id","updated_at");--> statement-breakpoint
CREATE INDEX "project_features_project_idx" ON "project_features" USING btree ("project_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "project_github_connections_project_unique" ON "project_github_connections" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_members_project_idx" ON "project_members" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_notes_project_created_idx" ON "project_notes" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "project_references_project_idx" ON "project_references" USING btree ("project_id","position");--> statement-breakpoint
CREATE INDEX "project_timeline_project_occurred_idx" ON "project_timeline_events" USING btree ("project_id","occurred_at");--> statement-breakpoint
CREATE INDEX "project_tools_project_idx" ON "project_tools" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_tools_project_name_unique" ON "project_tools" USING btree ("project_id",lower("name"));--> statement-breakpoint
CREATE INDEX "projects_owner_status_idx" ON "projects" USING btree ("owner_id","status");--> statement-breakpoint
CREATE INDEX "projects_owner_activity_idx" ON "projects" USING btree ("owner_id","last_activity_at");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree (lower("email"));