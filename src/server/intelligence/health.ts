import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { attentionItems, healthSignals, type HealthInput } from "@/domain/health";
import { db } from "@/server/db/client";
import { githubActivity, projectDecisions, projectFinances, projectGithubConnections, projectMilestones, projects } from "@/server/db/schema";

/**
 * Loads health inputs for many projects with a fixed number of queries
 * (one per source, grouped by project) — never N+1.
 */
export async function loadHealthInputs(ownerId: string, projectIds?: string[]): Promise<HealthInput[]> {
  const scope = projectIds ? and(eq(projects.ownerId, ownerId), inArray(projects.id, projectIds)) : eq(projects.ownerId, ownerId);
  const rows = await db
    .select({
      id: projects.id,
      name: projects.name,
      status: projects.status,
      statusChangedAt: projects.statusChangedAt,
      lastActivityAt: projects.lastActivityAt,
      syncStatus: projectGithubConnections.syncStatus,
      lastSyncedAt: projectGithubConnections.githubLastSyncedAt,
      syncError: projectGithubConnections.syncError,
      hasGithub: projectGithubConnections.id,
      estimated: projectFinances.estimatedCostCents,
      actual: projectFinances.actualCostCents,
      realized: projectFinances.investmentRealizedCents,
    })
    .from(projects)
    .leftJoin(projectGithubConnections, eq(projectGithubConnections.projectId, projects.id))
    .leftJoin(projectFinances, eq(projectFinances.projectId, projects.id))
    .where(scope);
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();

  const [activity, milestones, decisions] = await Promise.all([
    db
      .select({
        projectId: githubActivity.projectId,
        commits30d: sql<number>`count(*) filter (where ${githubActivity.kind} = 'commit' and ${githubActivity.occurredAt} >= ${since})::int`,
        lastCommitAt: sql<string | null>`max(${githubActivity.occurredAt}) filter (where ${githubActivity.kind} = 'commit')`,
      })
      .from(githubActivity)
      .where(inArray(githubActivity.projectId, ids))
      .groupBy(githubActivity.projectId),
    db
      .select({ id: projectMilestones.id, projectId: projectMilestones.projectId, name: projectMilestones.name, status: projectMilestones.status, dueOn: projectMilestones.dueOn })
      .from(projectMilestones)
      .where(inArray(projectMilestones.projectId, ids)),
    db
      .select({ id: projectDecisions.id, projectId: projectDecisions.projectId, title: projectDecisions.title, createdAt: projectDecisions.createdAt })
      .from(projectDecisions)
      .where(and(inArray(projectDecisions.projectId, ids), eq(projectDecisions.status, "proposed"))),
  ]);

  const now = new Date();
  return rows.map((r) => {
    const a = activity.find((x) => x.projectId === r.id);
    return {
      project: { id: r.id, name: r.name, status: r.status, statusChangedAt: r.statusChangedAt, lastActivityAt: r.lastActivityAt },
      github: r.hasGithub ? { syncStatus: r.syncStatus!, lastSyncedAt: r.lastSyncedAt, syncError: r.syncError } : null,
      activity: { commits30d: a?.commits30d ?? 0, lastCommitAt: a?.lastCommitAt ? new Date(a.lastCommitAt) : null },
      milestones: milestones.filter((m) => m.projectId === r.id),
      openDecisions: decisions.filter((d) => d.projectId === r.id),
      finance: { estimatedCostCents: r.estimated, costCents: r.actual ?? r.realized },
      now,
    };
  });
}

export async function projectHealth(ownerId: string, projectId: string) {
  const [input] = await loadHealthInputs(ownerId, [projectId]);
  if (!input) return null;
  return { signals: healthSignals(input), attention: attentionItems(input) };
}
