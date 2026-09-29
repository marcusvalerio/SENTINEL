import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/server/db/client";
import { projects, subscriptionProjects, subscriptions } from "@/server/db/schema";

export async function listSubscriptions(ownerId: string) {
  const rows = await db.select().from(subscriptions).where(eq(subscriptions.ownerId, ownerId)).orderBy(asc(subscriptions.status), asc(subscriptions.service));
  const links = rows.length
    ? await db
        .select({ subscriptionId: subscriptionProjects.subscriptionId, projectId: projects.id, name: projects.name })
        .from(subscriptionProjects)
        .innerJoin(projects, and(eq(projects.id, subscriptionProjects.projectId), eq(projects.ownerId, ownerId)))
        .where(inArray(subscriptionProjects.subscriptionId, rows.map((r) => r.id)))
    : [];
  return rows.map((r) => ({ ...r, projects: links.filter((l) => l.subscriptionId === r.id).map(({ projectId, name }) => ({ id: projectId, name })) }));
}

export type SubscriptionRow = Awaited<ReturnType<typeof listSubscriptions>>[number];

/** Subscriptions linked to one project, plus every AI-base subscription (they apply to all projects). */
export async function subscriptionsForProject(ownerId: string, projectId: string) {
  const all = await listSubscriptions(ownerId);
  return {
    linked: all.filter((s) => s.projects.some((p) => p.id === projectId)),
    aiBase: all.filter((s) => s.isAiBase),
  };
}
