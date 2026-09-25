import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { computeProgress } from "@/domain/progress";
import { originOfEventType, type TimelineEventType, type TimelineOrigin, type TimelineSource } from "@/domain/timeline";
import { db, type Transaction } from "@/server/db/client";
import { projectFeatures, projectMilestones, projectTimelineEvents, projects } from "@/server/db/schema";
import { isUuid } from "./queries";

type Executor = typeof db | Transaction;

export type ActionResult<T = object> =
  | ({ ok: true } & T)
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export const GENERIC_ERROR = "Algo não saiu como esperado. Suas informações continuam aqui — tente novamente.";

/** Returns the project id when it exists and belongs to the user, otherwise null. */
export async function ownedProjectId(ownerId: string, projectId: string, tx: Executor = db) {
  if (!isUuid(projectId)) return null;
  const [row] = await tx
    .select({ id: projects.id, progressSource: projects.progressSource })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.ownerId, ownerId)))
    .limit(1);
  return row ?? null;
}

export async function touchProject(projectId: string, tx: Executor = db) {
  await tx.update(projects).set({ lastActivityAt: new Date() }).where(eq(projects.id, projectId));
}

export async function logEvent(
  tx: Executor,
  event: {
    projectId: string;
    type: TimelineEventType;
    title: string;
    description?: string | null;
    source?: TimelineSource;
    origin?: TimelineOrigin;
    occurredAt?: Date;
    metadata?: Record<string, unknown>;
    createdById?: string | null;
  },
) {
  await tx.insert(projectTimelineEvents).values({ source: "system", origin: event.origin ?? originOfEventType(event.type), ...event });
}

/**
 * Recalculates the stored progress from its configured source. Called after
 * anything that can move it (features, milestones, source change).
 */
export async function recomputeProgress(projectId: string, tx: Executor = db) {
  const [project] = await tx.select({ source: projects.progressSource, progress: projects.progress }).from(projects).where(eq(projects.id, projectId));
  if (!project || project.source === "manual") return;
  const [features, milestones] = await Promise.all([
    tx
      .select({ status: projectFeatures.status, priority: projectFeatures.priority, milestoneId: projectFeatures.milestoneId })
      .from(projectFeatures)
      .where(eq(projectFeatures.projectId, projectId)),
    tx
      .select({ id: projectMilestones.id, status: projectMilestones.status, priority: projectMilestones.priority })
      .from(projectMilestones)
      .where(eq(projectMilestones.projectId, projectId)),
  ]);
  const progress = computeProgress(project.source, { manual: project.progress, features, milestones });
  await tx.update(projects).set({ progress, lastActivityAt: sql`now()` }).where(eq(projects.id, projectId));
}
