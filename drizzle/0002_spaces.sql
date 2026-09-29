CREATE TYPE "public"."billing_period" AS ENUM('monthly', 'yearly', 'on_demand', 'one_time');--> statement-breakpoint
CREATE TYPE "public"."decision_status" AS ENUM('proposed', 'decided', 'superseded', 'reverted');--> statement-breakpoint
CREATE TYPE "public"."effort_size" AS ENUM('xs', 's', 'm', 'l', 'xl');--> statement-breakpoint
CREATE TYPE "public"."idea_status" AS ENUM('inbox', 'converted', 'archived');--> statement-breakpoint
CREATE TYPE "public"."item_origin" AS ENUM('scope', 'inbox', 'github_import', 'pre_project', 'manual');--> statement-breakpoint
CREATE TYPE "public"."pre_project_status" AS ENUM('new', 'discovery', 'waiting_info', 'estimating', 'proposal_sent', 'approved', 'declined', 'archived');--> statement-breakpoint
CREATE TYPE "public"."project_source" AS ENUM('manual', 'github_import', 'pre_project');--> statement-breakpoint
CREATE TYPE "public"."roadmap_horizon" AS ENUM('now', 'next', 'later', 'future');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'paused', 'cancelled');--> statement-breakpoint
ALTER TYPE "public"."timeline_origin" ADD VALUE 'decision';--> statement-breakpoint
CREATE TABLE "ideas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"text" text NOT NULL,
	"project_id" uuid,
	"status" "idea_status" DEFAULT 'inbox' NOT NULL,
	"converted_kind" text,
	"converted_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pre_projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"title" text NOT NULL,
	"status" "pre_project_status" DEFAULT 'new' NOT NULL,
	"requester_name" text,
	"requester_org" text,
	"requester_contact" text,
	"idea" text,
	"problem" text,
	"goal" text,
	"audience" text,
	"users" text,
	"current_process" text,
	"features" text,
	"initial_scope" text,
	"future_features" text,
	"integrations" text,
	"references" text,
	"platform" text,
	"deadline" text,
	"budget" text,
	"constraints" text,
	"observations" text,
	"status_changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"converted_project_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"title" text NOT NULL,
	"context" text,
	"problem" text,
	"alternatives" text,
	"decision" text,
	"impact" text,
	"status" "decision_status" DEFAULT 'proposed' NOT NULL,
	"decided_on" date,
	"note_id" uuid,
	"created_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_experiments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"hypothesis" text NOT NULL,
	"variant_a" text,
	"variant_b" text,
	"metric" text,
	"result" text,
	"learning" text,
	"decision_id" uuid,
	"status" text DEFAULT 'planned' NOT NULL,
	"started_on" date,
	"ended_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_metric_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"metric" text NOT NULL,
	"period_start" date NOT NULL,
	"value" numeric(18, 4) NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_projects" (
	"subscription_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"service" text NOT NULL,
	"plan" text,
	"billing" "billing_period" DEFAULT 'monthly' NOT NULL,
	"amount_cents" bigint,
	"currency" text DEFAULT 'BRL' NOT NULL,
	"renews_on" date,
	"category" "tool_category",
	"usage" text,
	"status" "subscription_status" DEFAULT 'active' NOT NULL,
	"is_ai_base" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_features" ADD COLUMN "horizon" "roadmap_horizon" DEFAULT 'next' NOT NULL;--> statement-breakpoint
ALTER TABLE "project_features" ADD COLUMN "effort" "effort_size";--> statement-breakpoint
ALTER TABLE "project_features" ADD COLUMN "origin" "item_origin" DEFAULT 'scope' NOT NULL;--> statement-breakpoint
ALTER TABLE "project_features" ADD COLUMN "depends_on" uuid[] DEFAULT '{}'::uuid[] NOT NULL;--> statement-breakpoint
ALTER TABLE "project_finances" ADD COLUMN "estimated_cost_cents" bigint;--> statement-breakpoint
ALTER TABLE "project_finances" ADD COLUMN "actual_cost_cents" bigint;--> statement-breakpoint
ALTER TABLE "project_finances" ADD COLUMN "revenue_cents" bigint;--> statement-breakpoint
ALTER TABLE "project_finances" ADD COLUMN "ai_base_months" integer;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "current_focus" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "source" "project_source" DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "stack" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "import_analysis" jsonb;--> statement-breakpoint
ALTER TABLE "ideas" ADD CONSTRAINT "ideas_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ideas" ADD CONSTRAINT "ideas_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pre_projects" ADD CONSTRAINT "pre_projects_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pre_projects" ADD CONSTRAINT "pre_projects_converted_project_id_projects_id_fk" FOREIGN KEY ("converted_project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_decisions" ADD CONSTRAINT "project_decisions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_decisions" ADD CONSTRAINT "project_decisions_note_id_project_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."project_notes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_decisions" ADD CONSTRAINT "project_decisions_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_experiments" ADD CONSTRAINT "project_experiments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_experiments" ADD CONSTRAINT "project_experiments_decision_id_project_decisions_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."project_decisions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_metric_values" ADD CONSTRAINT "project_metric_values_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_projects" ADD CONSTRAINT "subscription_projects_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_projects" ADD CONSTRAINT "subscription_projects_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ideas_owner_status_idx" ON "ideas" USING btree ("owner_id","status","created_at");--> statement-breakpoint
CREATE INDEX "pre_projects_owner_status_idx" ON "pre_projects" USING btree ("owner_id","status","updated_at");--> statement-breakpoint
CREATE INDEX "project_decisions_project_idx" ON "project_decisions" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "project_experiments_project_idx" ON "project_experiments" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_metric_values_unique" ON "project_metric_values" USING btree ("project_id","metric","period_start");--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_projects_unique" ON "subscription_projects" USING btree ("subscription_id","project_id");--> statement-breakpoint
CREATE INDEX "subscription_projects_project_idx" ON "subscription_projects" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "subscriptions_owner_idx" ON "subscriptions" USING btree ("owner_id","status");--> statement-breakpoint
UPDATE "project_features" SET "horizon" = CASE WHEN "status" IN ('in_progress', 'done') THEN 'now'::roadmap_horizon ELSE 'next'::roadmap_horizon END;
