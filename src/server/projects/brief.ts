import "server-only";
import { and, asc, desc, eq, gte, ne, sql } from "drizzle-orm";
import { BRIEF_DAYS, type ProjectContext, type WeekCounts } from "@/domain/project-brief";
import { PROJECT_STATUS_LABELS, PROJECT_TYPE_LABELS } from "@/domain/project";
import { db } from "@/server/db/client";
import {
  githubActivity,
  projectDecisions,
  projectFeatures,
  projectMilestones,
  projectNotes,
  projectTimelineEvents,
  projectTools,
} from "@/server/db/schema";
import type { ProjectDetail } from "./queries";

/** Counts for the last BRIEF_DAYS days — one round trip. Caller owns the project. */
export async function weekCounts(projectId: string): Promise<WeekCounts> {
  const since = new Date(Date.now() - BRIEF_DAYS * 86_400_000);
  const n = sql`count(*)::int`;
  const [row] = await db
    .select({
      commits: sql<number>`(${db.select({ n }).from(githubActivity).where(and(eq(githubActivity.projectId, projectId), eq(githubActivity.kind, "commit"), gte(githubActivity.occurredAt, since)))})`,
      notes: sql<number>`(${db.select({ n }).from(projectNotes).where(and(eq(projectNotes.projectId, projectId), gte(projectNotes.createdAt, since)))})`,
      featuresDone: sql<number>`(${db.select({ n }).from(projectFeatures).where(and(eq(projectFeatures.projectId, projectId), eq(projectFeatures.status, "done"), gte(projectFeatures.completedAt, since)))})`,
      milestonesDone: sql<number>`(${db.select({ n }).from(projectMilestones).where(and(eq(projectMilestones.projectId, projectId), eq(projectMilestones.status, "completed"), gte(projectMilestones.completedAt, since)))})`,
      decisions: sql<number>`(${db.select({ n }).from(projectDecisions).where(and(eq(projectDecisions.projectId, projectId), gte(projectDecisions.createdAt, since)))})`,
      events: sql<number>`(${db.select({ n }).from(projectTimelineEvents).where(and(eq(projectTimelineEvents.projectId, projectId), ne(projectTimelineEvents.source, "github"), gte(projectTimelineEvents.occurredAt, since)))})`,
    })
    .from(sql`(select 1) as one`);
  return row ?? { commits: 0, notes: 0, featuresDone: 0, milestonesDone: 0, decisions: 0, events: 0 };
}

/** Everything the AI-ready context needs, from stored data only. */
export async function buildProjectContext(project: ProjectDetail, attention: string[]): Promise<ProjectContext> {
  const [tools, milestones, features, decisions] = await Promise.all([
    db.select({ name: projectTools.name }).from(projectTools).where(eq(projectTools.projectId, project.id)).orderBy(asc(projectTools.name)),
    db
      .select({ name: projectMilestones.name, dueOn: projectMilestones.dueOn, status: projectMilestones.status })
      .from(projectMilestones)
      .where(eq(projectMilestones.projectId, project.id))
      .orderBy(asc(projectMilestones.position)),
    db
      .select({ name: projectFeatures.name })
      .from(projectFeatures)
      .where(and(eq(projectFeatures.projectId, project.id), ne(projectFeatures.status, "done")))
      .orderBy(asc(projectFeatures.position))
      .limit(8),
    db
      .select({ title: projectDecisions.title, decision: projectDecisions.decision })
      .from(projectDecisions)
      .where(and(eq(projectDecisions.projectId, project.id), gte(projectDecisions.createdAt, new Date(Date.now() - 90 * 86_400_000))))
      .orderBy(desc(projectDecisions.createdAt))
      .limit(5),
  ]);
  return {
    name: project.name,
    type: PROJECT_TYPE_LABELS[project.type],
    status: PROJECT_STATUS_LABELS[project.status],
    summary: project.summary,
    goal: project.primaryGoal,
    problem: project.problem,
    audience: project.audience,
    currentFocus: project.currentFocus,
    progress: project.progress,
    repository: project.github ? `github.com/${project.github.githubOwner}/${project.github.githubRepositoryName}` : null,
    stack: project.stack ?? [],
    tools: tools.map((t) => t.name),
    openMilestones: milestones.filter((m) => m.status !== "completed" && m.status !== "cancelled").map(({ name, dueOn }) => ({ name, dueOn })),
    nextFeatures: features.map((f) => f.name),
    recentDecisions: decisions,
    attention,
  };
}
