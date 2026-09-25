import "server-only";
import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { cache } from "react";
import { COLLECTION_STATUSES, type ProjectCollection, type ProjectStatus } from "@/domain/project";
import { db } from "@/server/db/client";
import {
  projectDrafts,
  projectFeatures,
  projectFinances,
  projectGithubConnections,
  projectMembers,
  projectNotes,
  projectReferences,
  projectTimelineEvents,
  projectTools,
  projects,
} from "@/server/db/schema";

/**
 * Every query is scoped by owner. Ownership is part of the WHERE clause, so a
 * project id alone never grants access — the foundation for multiple users.
 */

export async function listProjects(ownerId: string, collection: ProjectCollection) {
  const statusFilter =
    collection === "all" ? undefined : inArray(projects.status, COLLECTION_STATUSES[collection]);

  return db
    .select({
      id: projects.id,
      name: projects.name,
      codename: projects.codename,
      summary: projects.summary,
      type: projects.type,
      category: projects.category,
      status: projects.status,
      progress: projects.progress,
      startedOn: projects.startedOn,
      createdAt: projects.createdAt,
      lastActivityAt: projects.lastActivityAt,
      github: {
        owner: projectGithubConnections.githubOwner,
        name: projectGithubConnections.githubRepositoryName,
      },
      featureCount: sql<number>`(select count(*)::int from ${projectFeatures} where ${projectFeatures.projectId} = ${projects.id})`,
      noteCount: sql<number>`(select count(*)::int from ${projectNotes} where ${projectNotes.projectId} = ${projects.id})`,
    })
    .from(projects)
    .leftJoin(projectGithubConnections, eq(projectGithubConnections.projectId, projects.id))
    .where(and(eq(projects.ownerId, ownerId), statusFilter))
    .orderBy(desc(projects.lastActivityAt));
}

export type ProjectListItem = Awaited<ReturnType<typeof listProjects>>[number];

export async function countProjectsByStatus(ownerId: string) {
  const rows = await db
    .select({ status: projects.status, total: count() })
    .from(projects)
    .where(eq(projects.ownerId, ownerId))
    .groupBy(projects.status);
  const counts: Record<ProjectCollection, number> = { all: 0, active: 0, paused: 0, completed: 0, archived: 0 };
  for (const row of rows) {
    counts.all += row.total;
    for (const [collection, statuses] of Object.entries(COLLECTION_STATUSES)) {
      if ((statuses as ProjectStatus[]).includes(row.status)) counts[collection as ProjectCollection] += row.total;
    }
  }
  return counts;
}

/** Lightweight index for the command menu. */
export async function listProjectIndex(ownerId: string) {
  return db
    .select({ id: projects.id, name: projects.name, codename: projects.codename, status: projects.status })
    .from(projects)
    .where(eq(projects.ownerId, ownerId))
    .orderBy(desc(projects.lastActivityAt))
    .limit(200);
}

export async function listDrafts(ownerId: string) {
  return db
    .select({ id: projectDrafts.id, title: projectDrafts.title, currentStep: projectDrafts.currentStep, updatedAt: projectDrafts.updatedAt })
    .from(projectDrafts)
    .where(eq(projectDrafts.ownerId, ownerId))
    .orderBy(desc(projectDrafts.updatedAt))
    .limit(10);
}

export async function getDraft(ownerId: string, draftId: string) {
  if (!isUuid(draftId)) return null;
  const [draft] = await db
    .select()
    .from(projectDrafts)
    .where(and(eq(projectDrafts.id, draftId), eq(projectDrafts.ownerId, ownerId)))
    .limit(1);
  return draft ?? null;
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/** Project header data — cached per request so layout and page share it. */
export const getProject = cache(async (ownerId: string, projectId: string) => {
  if (!isUuid(projectId)) return null;
  const [row] = await db
    .select({ project: projects, github: projectGithubConnections, finance: projectFinances })
    .from(projects)
    .leftJoin(projectGithubConnections, eq(projectGithubConnections.projectId, projects.id))
    .leftJoin(projectFinances, eq(projectFinances.projectId, projects.id))
    .where(and(eq(projects.id, projectId), eq(projects.ownerId, ownerId)))
    .limit(1);
  if (!row) return null;
  return { ...row.project, github: row.github, finance: row.finance };
});

export type ProjectDetail = NonNullable<Awaited<ReturnType<typeof getProject>>>;

export const getProjectCounts = cache(async (projectId: string) => {
  const [row] = await db
    .select({
      notes: sql<number>`(select count(*)::int from ${projectNotes} where ${projectNotes.projectId} = ${projectId})`,
      features: sql<number>`(select count(*)::int from ${projectFeatures} where ${projectFeatures.projectId} = ${projectId})`,
      featuresDone: sql<number>`(select count(*)::int from ${projectFeatures} where ${projectFeatures.projectId} = ${projectId} and ${projectFeatures.status} = 'done')`,
      tools: sql<number>`(select count(*)::int from ${projectTools} where ${projectTools.projectId} = ${projectId})`,
      events: sql<number>`(select count(*)::int from ${projectTimelineEvents} where ${projectTimelineEvents.projectId} = ${projectId})`,
      references: sql<number>`(select count(*)::int from ${projectReferences} where ${projectReferences.projectId} = ${projectId})`,
    })
    .from(sql`(select 1) as one`);
  return row!;
});

export function getFeatures(projectId: string) {
  return db.select().from(projectFeatures).where(eq(projectFeatures.projectId, projectId)).orderBy(asc(projectFeatures.position), asc(projectFeatures.createdAt));
}

export function getReferences(projectId: string) {
  return db.select().from(projectReferences).where(eq(projectReferences.projectId, projectId)).orderBy(asc(projectReferences.position));
}

export function getNotes(projectId: string, limit = 500) {
  return db.select().from(projectNotes).where(eq(projectNotes.projectId, projectId)).orderBy(desc(projectNotes.createdAt)).limit(limit);
}

export function getTools(projectId: string) {
  return db.select().from(projectTools).where(eq(projectTools.projectId, projectId)).orderBy(asc(projectTools.createdAt));
}

export function getMembers(projectId: string) {
  return db.select().from(projectMembers).where(eq(projectMembers.projectId, projectId)).orderBy(desc(projectMembers.isLead), asc(projectMembers.createdAt));
}

export function getTimeline(projectId: string, limit = 500) {
  return db
    .select()
    .from(projectTimelineEvents)
    .where(eq(projectTimelineEvents.projectId, projectId))
    .orderBy(desc(projectTimelineEvents.occurredAt), desc(projectTimelineEvents.createdAt))
    .limit(limit);
}
