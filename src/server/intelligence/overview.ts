import "server-only";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { attentionItems } from "@/domain/health";
import { TIMELINE_EVENT_LABELS } from "@/domain/timeline";
import { db } from "@/server/db/client";
import { githubActivity, preProjects, projectMilestones, projectTimelineEvents, projects } from "@/server/db/schema";
import { loadHealthInputs } from "./health";

/**
 * The Command Center read model: everything the owner should see first,
 * ordered by what needs them. Built only from stored data.
 */
export async function loadCommandCenter(ownerId: string) {
  const since14 = new Date(Date.now() - 14 * 86_400_000);
  const since30 = new Date(Date.now() - 30 * 86_400_000);

  const [health, recentProjects, events, commits, milestones, pipeline] = await Promise.all([
    loadHealthInputs(ownerId),
    db
      .select({ id: projects.id, name: projects.name, codename: projects.codename, status: projects.status, progress: projects.progress, summary: projects.summary, lastActivityAt: projects.lastActivityAt, type: projects.type, currentFocus: projects.currentFocus })
      .from(projects)
      .where(eq(projects.ownerId, ownerId))
      .orderBy(desc(projects.lastActivityAt)),
    db
      .select({ id: projectTimelineEvents.id, projectId: projectTimelineEvents.projectId, type: projectTimelineEvents.type, origin: projectTimelineEvents.origin, title: projectTimelineEvents.title, occurredAt: projectTimelineEvents.occurredAt, projectName: projects.name })
      .from(projectTimelineEvents)
      .innerJoin(projects, eq(projects.id, projectTimelineEvents.projectId))
      .where(and(eq(projects.ownerId, ownerId), gte(projectTimelineEvents.occurredAt, since14)))
      .orderBy(desc(projectTimelineEvents.occurredAt))
      .limit(30),
    db
      .select({
        projectId: githubActivity.projectId,
        day: sql<string>`to_char(${githubActivity.occurredAt} at time zone 'America/Sao_Paulo', 'YYYY-MM-DD')`,
        count: sql<number>`count(*)::int`,
      })
      .from(githubActivity)
      .innerJoin(projects, eq(projects.id, githubActivity.projectId))
      .where(and(eq(projects.ownerId, ownerId), eq(githubActivity.kind, "commit"), gte(githubActivity.occurredAt, since30)))
      .groupBy(githubActivity.projectId, sql`2`),
    db
      .select({ id: projectMilestones.id, name: projectMilestones.name, status: projectMilestones.status, dueOn: projectMilestones.dueOn, projectId: projects.id, projectName: projects.name })
      .from(projectMilestones)
      .innerJoin(projects, eq(projects.id, projectMilestones.projectId))
      .where(and(eq(projects.ownerId, ownerId), inArray(projectMilestones.status, ["planned", "active", "paused"])))
      .orderBy(sql`${projectMilestones.dueOn} asc nulls last`)
      .limit(8),
    db
      .select({ status: preProjects.status, n: sql<number>`count(*)::int` })
      .from(preProjects)
      .where(and(eq(preProjects.ownerId, ownerId), inArray(preProjects.status, ["new", "discovery", "waiting_info", "estimating", "proposal_sent"])))
      .groupBy(preProjects.status),
  ]);

  const attention = health.flatMap(attentionItems).sort((a, b) => ({ high: 0, medium: 1, low: 2 })[a.severity] - ({ high: 0, medium: 1, low: 2 })[b.severity]);

  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });
  const cadence = Array.from({ length: 30 }, (_, i) => {
    const day = fmt.format(new Date(Date.now() - (29 - i) * 86_400_000));
    return { day, count: commits.filter((c) => c.day === day).reduce((s, c) => s + c.count, 0) };
  });
  const commitsByProject = new Map<string, number>();
  for (const c of commits) commitsByProject.set(c.projectId, (commitsByProject.get(c.projectId) ?? 0) + c.count);

  return {
    projects: recentProjects.map((p) => ({ ...p, commits30d: commitsByProject.get(p.id) ?? 0 })),
    attention,
    events: events.map((e) => ({ ...e, label: TIMELINE_EVENT_LABELS[e.type] })),
    cadence,
    commits30d: cadence.reduce((s, d) => s + d.count, 0),
    milestones,
    pipeline: pipeline.reduce((s, p) => s + p.n, 0),
  };
}

export type CommandCenter = Awaited<ReturnType<typeof loadCommandCenter>>;
