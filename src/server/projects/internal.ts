import "server-only";
import { and, eq, sql } from "drizzle-orm";
import type { TimelineEventType, TimelineSource } from "@/domain/timeline";
import { db, type Transaction } from "@/server/db/client";
import { projectFeatures, projectTimelineEvents, projects } from "@/server/db/schema";
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
    occurredAt?: Date;
    metadata?: Record<string, unknown>;
    createdById?: string | null;
  },
) {
  await tx.insert(projectTimelineEvents).values({ source: "system", ...event });
}

/**
 * Feature-based progress: share of features marked done. Weighted by priority
 * so finishing essentials moves the needle more than nice-to-haves.
 */
export function computeFeatureProgress(features: { status: string; priority: string }[]) {
  if (features.length === 0) return 0;
  const weight = (p: string) => (p === "essential" ? 3 : p === "important" ? 2 : 1);
  const total = features.reduce((sum, f) => sum + weight(f.priority), 0);
  const done = features.reduce((sum, f) => sum + (f.status === "done" ? weight(f.priority) : f.status === "in_progress" ? weight(f.priority) * 0.35 : 0), 0);
  return Math.round((done / total) * 100);
}

export async function recomputeProgress(projectId: string, tx: Executor = db) {
  const [project] = await tx.select({ source: projects.progressSource }).from(projects).where(eq(projects.id, projectId));
  if (!project || project.source !== "features") return;
  const features = await tx
    .select({ status: projectFeatures.status, priority: projectFeatures.priority })
    .from(projectFeatures)
    .where(eq(projectFeatures.projectId, projectId));
  await tx
    .update(projects)
    .set({ progress: computeFeatureProgress(features), lastActivityAt: sql`now()` })
    .where(eq(projects.id, projectId));
}
