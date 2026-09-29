import "server-only";
import { and, count, eq, inArray, isNotNull } from "drizzle-orm";
import { historyInsights } from "@/domain/creation-history";
import { db } from "@/server/db/client";
import { ideas, preProjects, projectDecisions, projectFeatures, projectNotes, projects } from "@/server/db/schema";

/** Everything the /history page needs, scoped to the owner. */
export async function loadCreationHistory(ownerId: string) {
  const list = await db
    .select({ id: projects.id, name: projects.name, type: projects.type, status: projects.status, source: projects.source, createdAt: projects.createdAt, statusChangedAt: projects.statusChangedAt })
    .from(projects)
    .where(eq(projects.ownerId, ownerId));
  const ids = list.map((p) => p.id);

  const [featuresDone, notes, decisions, pre, idea] = await Promise.all([
    ids.length
      ? db
          .select({ completedAt: projectFeatures.completedAt })
          .from(projectFeatures)
          .where(and(inArray(projectFeatures.projectId, ids), eq(projectFeatures.status, "done"), isNotNull(projectFeatures.completedAt)))
      : [],
    ids.length ? db.select({ createdAt: projectNotes.createdAt }).from(projectNotes).where(inArray(projectNotes.projectId, ids)) : [],
    ids.length ? db.select({ n: count() }).from(projectDecisions).where(inArray(projectDecisions.projectId, ids)) : [{ n: 0 }],
    db
      .select({ total: count(), converted: count(preProjects.convertedProjectId) })
      .from(preProjects)
      .where(eq(preProjects.ownerId, ownerId)),
    db.select({ status: ideas.status, n: count() }).from(ideas).where(eq(ideas.ownerId, ownerId)).groupBy(ideas.status),
  ]);

  return historyInsights({
    projects: list,
    featuresDone: featuresDone.map((f) => ({ completedAt: f.completedAt! })),
    notes,
    decisions: decisions[0]?.n ?? 0,
    preProjects: { total: pre[0]?.total ?? 0, converted: pre[0]?.converted ?? 0 },
    ideas: { total: idea.reduce((s, r) => s + r.n, 0), converted: idea.find((r) => r.status === "converted")?.n ?? 0 },
    now: new Date(),
  });
}
