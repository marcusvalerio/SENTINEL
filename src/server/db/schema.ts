import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import {
  ASSET_AVAILABILITY,
  ENGAGEMENTS,
  FEATURE_PRIORITIES,
  FEATURE_STATUSES,
  PROGRESS_SOURCES,
  PROJECT_STATUSES,
  PROJECT_TYPES,
} from "@/domain/project";
import { NOTE_TYPES } from "@/domain/notes";
import { TIMELINE_EVENT_TYPES, TIMELINE_ORIGINS, TIMELINE_SOURCES } from "@/domain/timeline";
import { MILESTONE_STATUSES } from "@/domain/milestones";
import { TOOL_CATEGORIES } from "@/domain/tools";
import { GITHUB_ACTIVITY_KINDS, SYNC_STATUSES, type BranchSnapshot, type ContributorSnapshot } from "@/domain/github-activity";
import { EFFORTS, HORIZONS, ITEM_ORIGINS } from "@/domain/roadmap";
import { DECISION_STATUSES } from "@/domain/decisions";
import { IDEA_STATUSES } from "@/domain/ideas";
import { PRE_PROJECT_STATUSES } from "@/domain/pre-projects";
import { BILLING_PERIODS, SUBSCRIPTION_STATUSES } from "@/domain/subscriptions";
import type { StackItem } from "@/domain/stack";

/* -------------------------------------------------------------------------- */
/* Enums                                                                       */
/* -------------------------------------------------------------------------- */

export const userRole = pgEnum("user_role", ["admin", "member"]);
export const projectType = pgEnum("project_type", PROJECT_TYPES);
export const projectStatus = pgEnum("project_status", PROJECT_STATUSES);
export const progressSource = pgEnum("progress_source", PROGRESS_SOURCES);
export const assetAvailability = pgEnum("asset_availability", ASSET_AVAILABILITY);
export const engagement = pgEnum("engagement", ENGAGEMENTS);
export const featurePriority = pgEnum("feature_priority", FEATURE_PRIORITIES);
export const featureStatus = pgEnum("feature_status", FEATURE_STATUSES);
export const noteType = pgEnum("note_type", NOTE_TYPES);
export const timelineEventType = pgEnum("timeline_event_type", TIMELINE_EVENT_TYPES);
export const timelineSource = pgEnum("timeline_source", TIMELINE_SOURCES);
export const timelineOrigin = pgEnum("timeline_origin", TIMELINE_ORIGINS);
export const milestoneStatus = pgEnum("milestone_status", MILESTONE_STATUSES);
export const toolCategory = pgEnum("tool_category", TOOL_CATEGORIES);
export const githubActivityKind = pgEnum("github_activity_kind", GITHUB_ACTIVITY_KINDS);
export const syncStatus = pgEnum("sync_status", SYNC_STATUSES);
export const roadmapHorizon = pgEnum("roadmap_horizon", HORIZONS);
export const effortSize = pgEnum("effort_size", EFFORTS);
export const itemOrigin = pgEnum("item_origin", ITEM_ORIGINS);
export const decisionStatus = pgEnum("decision_status", DECISION_STATUSES);
export const ideaStatus = pgEnum("idea_status", IDEA_STATUSES);
export const preProjectStatus = pgEnum("pre_project_status", PRE_PROJECT_STATUSES);
export const billingPeriod = pgEnum("billing_period", BILLING_PERIODS);
export const subscriptionStatus = pgEnum("subscription_status", SUBSCRIPTION_STATUSES);
export const projectSource = pgEnum("project_source", ["manual", "github_import", "pre_project"]);

const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/** Monetary values are stored as integer cents to avoid floating point drift. */
const cents = () => bigint({ mode: "number" });

/* -------------------------------------------------------------------------- */
/* Identity & access                                                           */
/* -------------------------------------------------------------------------- */

export const users = pgTable(
  "users",
  {
    id: uuid().primaryKey().defaultRandom(),
    email: text().notNull(),
    name: text().notNull(),
    passwordHash: text().notNull(),
    role: userRole().notNull().default("member"),
    lastLoginAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex("users_email_unique").on(sql`lower(${t.email})`)],
);

/**
 * Server-side sessions. The cookie carries a random token; only its SHA-256
 * digest is stored, so a database leak never yields usable session tokens.
 */
export const sessions = pgTable(
  "sessions",
  {
    id: text().primaryKey(), // sha256(token), hex
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    userAgent: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId), index("sessions_expires_idx").on(t.expiresAt)],
);

/* -------------------------------------------------------------------------- */
/* Projects                                                                    */
/* -------------------------------------------------------------------------- */

export const projects = pgTable(
  "projects",
  {
    id: uuid().primaryKey().defaultRandom(),
    ownerId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),

    // 01 — Identity
    name: text().notNull(),
    codename: text(),
    summary: text(),
    type: projectType().notNull(),
    category: text(),
    status: projectStatus().notNull().default("idea"),
    startedOn: date({ mode: "string" }),
    leadName: text(),

    // 02 — Context
    problem: text(),
    primaryGoal: text().notNull(),
    secondaryGoals: text(),
    audience: text(),
    endUsers: text(),
    expectedOutcome: text(),
    successCriteria: text(),

    // 03 — Scope (features live in project_features)
    mandatoryFeatures: text(),
    technicalConstraints: text(),
    integrations: text(),

    // 04 — Design (references live in project_references)
    hasVisualIdentity: assetAvailability(),
    hasLogo: assetAvailability(),
    hasBrandManual: assetAvailability(),
    visualReferencesNotes: text(),
    desiredFeeling: text(),
    stylesToAvoid: text(),

    // 05 — Business (money lives in project_finances)
    engagement: engagement(),
    clientName: text(),
    desiredDeadline: text(),
    launchTargetOn: date({ mode: "string" }),

    // 06 — Observations
    observations: text(),

    // Identity (Project DNA)
    currentFocus: text(),
    source: projectSource().notNull().default("manual"),
    stack: jsonb().$type<StackItem[]>().notNull().default(sql`'[]'::jsonb`),
    importAnalysis: jsonb().$type<Record<string, unknown>>(),

    // Progress. GitHub activity is tracked separately and never drives this.
    progress: integer().notNull().default(0),
    progressSource: progressSource().notNull().default("features"),

    statusChangedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    lastActivityAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    ...timestamps,
  },
  (t) => [
    index("projects_owner_status_idx").on(t.ownerId, t.status),
    index("projects_owner_activity_idx").on(t.ownerId, t.lastActivityAt),
    check("projects_progress_range", sql`${t.progress} between 0 and 100`),
  ],
);

/** Financial context. One row per project; a ledger of entries can come later. */
export const projectFinances = pgTable("project_finances", {
  projectId: uuid()
    .primaryKey()
    .references(() => projects.id, { onDelete: "cascade" }),
  currency: text().notNull().default("BRL"),
  hasBudget: boolean(),
  budgetCents: cents(),
  investmentPlannedCents: cents(),
  investmentRealizedCents: cents(),
  expectedRevenueCents: cents(),
  recurringRevenueCents: cents(),
  contractedValueCents: cents(),
  estimatedCostCents: cents(),
  actualCostCents: cents(),
  revenueCents: cents(),
  /** Months of AI-base subscriptions counted as project cost; null = not applied. */
  aiBaseMonths: integer(),
  monetizationModel: text(),
  ...timestamps,
});

export const projectFeatures = pgTable(
  "project_features",
  {
    id: uuid().primaryKey().defaultRandom(),
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text().notNull(),
    description: text(),
    priority: featurePriority().notNull().default("important"),
    status: featureStatus().notNull().default("planned"),
    milestoneId: uuid().references((): AnyPgColumn => projectMilestones.id, { onDelete: "set null" }),
    horizon: roadmapHorizon().notNull().default("next"),
    effort: effortSize(),
    origin: itemOrigin().notNull().default("scope"),
    dependsOn: uuid().array().notNull().default(sql`'{}'::uuid[]`),
    position: integer().notNull().default(0),
    completedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("project_features_project_idx").on(t.projectId, t.position), index("project_features_milestone_idx").on(t.milestoneId)],
);

export const projectReferences = pgTable(
  "project_references",
  {
    id: uuid().primaryKey().defaultRandom(),
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text().notNull(),
    url: text(),
    description: text(),
    position: integer().notNull().default(0),
    ...timestamps,
  },
  (t) => [index("project_references_project_idx").on(t.projectId, t.position)],
);

/** Rubrica entries — the project's chronological notebook. */
export const projectNotes = pgTable(
  "project_notes",
  {
    id: uuid().primaryKey().defaultRandom(),
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    authorId: uuid().references(() => users.id, { onDelete: "set null" }),
    title: text().notNull(),
    content: text().notNull().default(""),
    type: noteType().notNull().default("note"),
    tags: text().array().notNull().default(sql`'{}'::text[]`),
    ...timestamps,
  },
  (t) => [
    index("project_notes_project_created_idx").on(t.projectId, t.createdAt),
    index("project_notes_tags_idx").using("gin", t.tags),
  ],
);

/** Previous versions of a Rubrica entry — written on every edit, never shown as noise. */
export const projectNoteRevisions = pgTable(
  "project_note_revisions",
  {
    id: uuid().primaryKey().defaultRandom(),
    noteId: uuid()
      .notNull()
      .references(() => projectNotes.id, { onDelete: "cascade" }),
    title: text().notNull(),
    content: text().notNull(),
    type: noteType().notNull(),
    tags: text().array().notNull().default(sql`'{}'::text[]`),
    editedById: uuid().references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("project_note_revisions_note_idx").on(t.noteId, t.createdAt)],
);

export const projectTools = pgTable(
  "project_tools",
  {
    id: uuid().primaryKey().defaultRandom(),
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text().notNull(),
    category: toolCategory(),
    purpose: text(),
    plan: text(),
    costCents: cents(),
    frequency: text(),
    startedOn: date({ mode: "string" }),
    endedOn: date({ mode: "string" }),
    notes: text(),
    ...timestamps,
  },
  (t) => [
    index("project_tools_project_idx").on(t.projectId),
    uniqueIndex("project_tools_project_name_unique").on(t.projectId, sql`lower(${t.name})`),
  ],
);

/** People and organisations that took part in a project. */
export const projectMembers = pgTable(
  "project_members",
  {
    id: uuid().primaryKey().defaultRandom(),
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: uuid().references(() => users.id, { onDelete: "set null" }),
    name: text().notNull(),
    organization: text(),
    role: text(),
    responsibility: text(),
    contribution: text(),
    isLead: boolean().notNull().default(false),
    startedOn: date({ mode: "string" }),
    endedOn: date({ mode: "string" }),
    ...timestamps,
  },
  (t) => [index("project_members_project_idx").on(t.projectId)],
);

export const projectTimelineEvents = pgTable(
  "project_timeline_events",
  {
    id: uuid().primaryKey().defaultRandom(),
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    type: timelineEventType().notNull(),
    origin: timelineOrigin().notNull().default("project"),
    source: timelineSource().notNull().default("manual"),
    title: text().notNull(),
    description: text(),
    occurredAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    metadata: jsonb().$type<Record<string, unknown>>(),
    createdById: uuid().references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("project_timeline_project_occurred_idx").on(t.projectId, t.occurredAt)],
);

/**
 * One repository per project. The unique project_id guarantees activity from
 * different repositories is never mixed inside a single project.
 */
export const projectGithubConnections = pgTable(
  "project_github_connections",
  {
    id: uuid().primaryKey().defaultRandom(),
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    githubRepositoryId: bigint({ mode: "number" }),
    githubOwner: text().notNull(),
    githubRepositoryName: text().notNull(),
    githubRepositoryUrl: text().notNull(),
    githubDefaultBranch: text(),
    isPrivate: boolean(),
    verified: boolean().notNull().default(false),
    githubConnectedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    githubLastSyncedAt: timestamp({ withTimezone: true }),
    syncStatus: syncStatus().notNull().default("never"),
    syncStartedAt: timestamp({ withTimezone: true }),
    syncError: text(),
    description: text(),
    lastPushedAt: timestamp({ withTimezone: true }),
    branches: jsonb().$type<BranchSnapshot[]>().notNull().default(sql`'[]'::jsonb`),
    contributors: jsonb().$type<ContributorSnapshot[]>().notNull().default(sql`'[]'::jsonb`),
    ...timestamps,
  },
  (t) => [uniqueIndex("project_github_connections_project_unique").on(t.projectId)],
);

/**
 * Synced development activity. (project, kind, external_id) is unique so each
 * sync is an idempotent upsert, scoped to exactly one project.
 */
export const githubActivity = pgTable(
  "github_activity",
  {
    id: uuid().primaryKey().defaultRandom(),
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    kind: githubActivityKind().notNull(),
    externalId: text().notNull(),
    number: integer(),
    title: text().notNull(),
    body: text(),
    state: text(),
    authorLogin: text(),
    authorAvatarUrl: text(),
    url: text().notNull(),
    occurredAt: timestamp({ withTimezone: true }).notNull(),
    closedAt: timestamp({ withTimezone: true }),
    metadata: jsonb().$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    syncedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("github_activity_project_kind_external_unique").on(t.projectId, t.kind, t.externalId),
    index("github_activity_project_occurred_idx").on(t.projectId, t.occurredAt),
    index("github_activity_project_kind_idx").on(t.projectId, t.kind, t.occurredAt),
  ],
);

export const projectMilestones = pgTable(
  "project_milestones",
  {
    id: uuid().primaryKey().defaultRandom(),
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text().notNull(),
    description: text(),
    status: milestoneStatus().notNull().default("planned"),
    priority: featurePriority().notNull().default("important"),
    startedOn: date({ mode: "string" }),
    dueOn: date({ mode: "string" }),
    completedAt: timestamp({ withTimezone: true }),
    position: integer().notNull().default(0),
    ...timestamps,
  },
  (t) => [index("project_milestones_project_idx").on(t.projectId, t.position)],
);

/**
 * Autosaved, not-yet-created projects. The wizard writes its whole state here
 * so a discovery session is never lost, and can be resumed from the dashboard.
 */
export const projectDrafts = pgTable(
  "project_drafts",
  {
    id: uuid().primaryKey().defaultRandom(),
    ownerId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text(),
    currentStep: integer().notNull().default(0),
    data: jsonb().$type<Record<string, unknown>>().notNull(),
    ...timestamps,
  },
  (t) => [index("project_drafts_owner_updated_idx").on(t.ownerId, t.updatedAt)],
);

/* -------------------------------------------------------------------------- */
/* Phase 3 — discovery, decisions, subscriptions, foundations                   */
/* -------------------------------------------------------------------------- */

/** Structured decisions (ADR-like). Rubrica notes of type "decision" can be promoted to one. */
export const projectDecisions = pgTable(
  "project_decisions",
  {
    id: uuid().primaryKey().defaultRandom(),
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text().notNull(),
    context: text(),
    problem: text(),
    alternatives: text(),
    decision: text(),
    impact: text(),
    status: decisionStatus().notNull().default("proposed"),
    decidedOn: date({ mode: "string" }),
    noteId: uuid().references(() => projectNotes.id, { onDelete: "set null" }),
    createdById: uuid().references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [index("project_decisions_project_idx").on(t.projectId, t.createdAt)],
);

/** Global idea inbox: one line of text, converted into something real later. */
export const ideas = pgTable(
  "ideas",
  {
    id: uuid().primaryKey().defaultRandom(),
    ownerId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    text: text().notNull(),
    projectId: uuid().references(() => projects.id, { onDelete: "set null" }),
    status: ideaStatus().notNull().default("inbox"),
    convertedKind: text(),
    convertedId: uuid(),
    ...timestamps,
  },
  (t) => [index("ideas_owner_status_idx").on(t.ownerId, t.status, t.createdAt)],
);

/** Demand before commitment: a request that may or may not become a project. */
export const preProjects = pgTable(
  "pre_projects",
  {
    id: uuid().primaryKey().defaultRandom(),
    ownerId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text().notNull(),
    status: preProjectStatus().notNull().default("new"),
    requesterName: text(),
    requesterOrg: text(),
    requesterContact: text(),
    idea: text(),
    problem: text(),
    goal: text(),
    audience: text(),
    users: text(),
    currentProcess: text(),
    features: text(),
    initialScope: text(),
    futureFeatures: text(),
    integrations: text(),
    references: text(),
    platform: text(),
    deadline: text(),
    budget: text(),
    constraints: text(),
    observations: text(),
    statusChangedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    convertedProjectId: uuid().references(() => projects.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [index("pre_projects_owner_status_idx").on(t.ownerId, t.status, t.updatedAt)],
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid().primaryKey().defaultRandom(),
    ownerId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    service: text().notNull(),
    plan: text(),
    billing: billingPeriod().notNull().default("monthly"),
    amountCents: cents(),
    currency: text().notNull().default("BRL"),
    renewsOn: date({ mode: "string" }),
    category: toolCategory(),
    usage: text(),
    status: subscriptionStatus().notNull().default("active"),
    /** Counts toward the AI base cost of projects (Claude, ChatGPT). */
    isAiBase: boolean().notNull().default(false),
    ...timestamps,
  },
  (t) => [index("subscriptions_owner_idx").on(t.ownerId, t.status)],
);

export const subscriptionProjects = pgTable(
  "subscription_projects",
  {
    subscriptionId: uuid()
      .notNull()
      .references(() => subscriptions.id, { onDelete: "cascade" }),
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("subscription_projects_unique").on(t.subscriptionId, t.projectId), index("subscription_projects_project_idx").on(t.projectId)],
);

/**
 * Foundation for product metrics (MRR, churn, activation…). Opt-in per
 * project: a metric only exists once someone records a value for it.
 */
export const projectMetricValues = pgTable(
  "project_metric_values",
  {
    id: uuid().primaryKey().defaultRandom(),
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    metric: text().notNull(),
    periodStart: date({ mode: "string" }).notNull(),
    value: numeric({ precision: 18, scale: 4 }).notNull(),
    note: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("project_metric_values_unique").on(t.projectId, t.metric, t.periodStart)],
);

/** Foundation for product experiments (hypothesis → result → learning → decision). */
export const projectExperiments = pgTable(
  "project_experiments",
  {
    id: uuid().primaryKey().defaultRandom(),
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    hypothesis: text().notNull(),
    variantA: text(),
    variantB: text(),
    metric: text(),
    result: text(),
    learning: text(),
    decisionId: uuid().references(() => projectDecisions.id, { onDelete: "set null" }),
    status: text().notNull().default("planned"),
    startedOn: date({ mode: "string" }),
    endedOn: date({ mode: "string" }),
    ...timestamps,
  },
  (t) => [index("project_experiments_project_idx").on(t.projectId)],
);

export type User = typeof users.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type ProjectFinance = typeof projectFinances.$inferSelect;
export type ProjectFeature = typeof projectFeatures.$inferSelect;
export type ProjectReference = typeof projectReferences.$inferSelect;
export type ProjectNote = typeof projectNotes.$inferSelect;
export type ProjectTool = typeof projectTools.$inferSelect;
export type ProjectMember = typeof projectMembers.$inferSelect;
export type ProjectTimelineEvent = typeof projectTimelineEvents.$inferSelect;
export type ProjectGithubConnection = typeof projectGithubConnections.$inferSelect;
export type ProjectDraft = typeof projectDrafts.$inferSelect;
export type ProjectMilestone = typeof projectMilestones.$inferSelect;
export type GithubActivity = typeof githubActivity.$inferSelect;
export type ProjectNoteRevision = typeof projectNoteRevisions.$inferSelect;
export type ProjectDecision = typeof projectDecisions.$inferSelect;
export type Idea = typeof ideas.$inferSelect;
export type PreProject = typeof preProjects.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
