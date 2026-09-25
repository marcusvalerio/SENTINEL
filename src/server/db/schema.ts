import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
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
  ASSET_AVAILABILITY,
  ENGAGEMENTS,
  FEATURE_PRIORITIES,
  FEATURE_STATUSES,
  PROGRESS_SOURCES,
  PROJECT_STATUSES,
  PROJECT_TYPES,
} from "@/domain/project";
import { NOTE_TYPES } from "@/domain/notes";
import { TIMELINE_EVENT_TYPES, TIMELINE_SOURCES } from "@/domain/timeline";

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
    position: integer().notNull().default(0),
    completedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("project_features_project_idx").on(t.projectId, t.position)],
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
    ...timestamps,
  },
  (t) => [index("project_notes_project_created_idx").on(t.projectId, t.createdAt)],
);

export const projectTools = pgTable(
  "project_tools",
  {
    id: uuid().primaryKey().defaultRandom(),
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text().notNull(),
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
    ...timestamps,
  },
  (t) => [uniqueIndex("project_github_connections_project_unique").on(t.projectId)],
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
