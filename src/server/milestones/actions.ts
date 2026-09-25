"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { MILESTONE_STATUSES, MILESTONE_STATUS_LABELS, milestoneInputSchema, type MilestoneInput, type MilestoneStatus } from "@/domain/milestones";
import type { TimelineEventType } from "@/domain/timeline";
import { requireUser } from "@/server/auth/session";
import { db, type Transaction } from "@/server/db/client";
import { projectFeatures, projectMilestones } from "@/server/db/schema";
import { GENERIC_ERROR, logEvent, ownedProjectId, recomputeProgress, touchProject, type ActionResult } from "@/server/projects/internal";
import { isUuid } from "@/server/projects/queries";

const STATUS_EVENT: Record<MilestoneStatus, TimelineEventType | null> = {
  planned: null,
  active: "milestone_started",
  completed: "milestone_completed",
  paused: "milestone_paused",
  cancelled: "milestone_cancelled",
};

function fieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  return Object.fromEntries(issues.map((i) => [i.path.map(String).join("."), i.message]));
}

/** Links exactly the given features (of the same project) to the milestone. */
async function linkFeatures(tx: Transaction, projectId: string, milestoneId: string, featureIds: string[]) {
  await tx
    .update(projectFeatures)
    .set({ milestoneId: null })
    .where(and(eq(projectFeatures.projectId, projectId), eq(projectFeatures.milestoneId, milestoneId)));
  if (featureIds.length) {
    await tx
      .update(projectFeatures)
      .set({ milestoneId })
      .where(and(eq(projectFeatures.projectId, projectId), inArray(projectFeatures.id, featureIds)));
  }
}

export async function createMilestone(projectId: string, input: MilestoneInput): Promise<ActionResult<{ milestoneId: string }>> {
  const user = await requireUser();
  const parsed = milestoneInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revise o milestone.", fieldErrors: fieldErrors(parsed.error.issues) };
  const owned = await ownedProjectId(user.id, projectId);
  if (!owned) return { ok: false, error: "Projeto não encontrado." };
  const { featureIds, ...data } = parsed.data;

  try {
    const milestoneId = await db.transaction(async (tx) => {
      const [row] = await tx.select({ count: sql<number>`count(*)::int` }).from(projectMilestones).where(eq(projectMilestones.projectId, owned.id));
      const [created] = await tx
        .insert(projectMilestones)
        .values({ projectId: owned.id, ...data, position: row?.count ?? 0, completedAt: data.status === "completed" ? new Date() : null })
        .returning({ id: projectMilestones.id });
      await linkFeatures(tx, owned.id, created!.id, featureIds);
      await logEvent(tx, { projectId: owned.id, type: "milestone_created", title: data.name, metadata: { milestoneId: created!.id }, createdById: user.id });
      await recomputeProgress(owned.id, tx);
      await touchProject(owned.id, tx);
      return created!.id;
    });
    revalidatePath(`/projects/${owned.id}`, "layout");
    revalidatePath("/");
    return { ok: true, milestoneId };
  } catch (error) {
    console.error("[milestones] create failed", error instanceof Error ? error.message : error);
    return { ok: false, error: GENERIC_ERROR };
  }
}

export async function updateMilestone(projectId: string, milestoneId: string, input: MilestoneInput): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = milestoneInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revise o milestone.", fieldErrors: fieldErrors(parsed.error.issues) };
  const owned = await ownedProjectId(user.id, projectId);
  if (!owned || !isUuid(milestoneId)) return { ok: false, error: "Milestone não encontrado." };
  const { featureIds, ...data } = parsed.data;

  const found = await db.transaction(async (tx) => {
    const [before] = await tx
      .select({ status: projectMilestones.status, completedAt: projectMilestones.completedAt })
      .from(projectMilestones)
      .where(and(eq(projectMilestones.id, milestoneId), eq(projectMilestones.projectId, owned.id)));
    if (!before) return false;
    await tx
      .update(projectMilestones)
      .set({ ...data, completedAt: data.status === "completed" ? (before.completedAt ?? new Date()) : null })
      .where(eq(projectMilestones.id, milestoneId));
    await linkFeatures(tx, owned.id, milestoneId, featureIds);
    const eventType = before.status !== data.status ? STATUS_EVENT[data.status] : null;
    if (eventType) await logEvent(tx, { projectId: owned.id, type: eventType, title: data.name, metadata: { milestoneId, from: before.status, to: data.status }, createdById: user.id });
    await recomputeProgress(owned.id, tx);
    await touchProject(owned.id, tx);
    return true;
  });
  if (!found) return { ok: false, error: "Milestone não encontrado." };
  revalidatePath(`/projects/${owned.id}`, "layout");
  revalidatePath("/");
  return { ok: true };
}

export async function setMilestoneStatus(projectId: string, milestoneId: string, status: MilestoneStatus): Promise<ActionResult> {
  const user = await requireUser();
  if (!MILESTONE_STATUSES.includes(status)) return { ok: false, error: "Status inválido." };
  const owned = await ownedProjectId(user.id, projectId);
  if (!owned || !isUuid(milestoneId)) return { ok: false, error: "Milestone não encontrado." };

  const found = await db.transaction(async (tx) => {
    const [before] = await tx
      .select({ status: projectMilestones.status, name: projectMilestones.name })
      .from(projectMilestones)
      .where(and(eq(projectMilestones.id, milestoneId), eq(projectMilestones.projectId, owned.id)));
    if (!before) return false;
    if (before.status === status) return true;
    await tx
      .update(projectMilestones)
      .set({ status, completedAt: status === "completed" ? new Date() : null, ...(status === "active" ? { startedOn: sql`coalesce(${projectMilestones.startedOn}, current_date)` } : {}) })
      .where(eq(projectMilestones.id, milestoneId));
    const eventType = STATUS_EVENT[status];
    if (eventType) {
      await logEvent(tx, { projectId: owned.id, type: eventType, title: before.name, description: `${MILESTONE_STATUS_LABELS[before.status]} → ${MILESTONE_STATUS_LABELS[status]}`, metadata: { milestoneId }, createdById: user.id });
    }
    await recomputeProgress(owned.id, tx);
    await touchProject(owned.id, tx);
    return true;
  });
  if (!found) return { ok: false, error: "Milestone não encontrado." };
  revalidatePath(`/projects/${owned.id}`, "layout");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteMilestone(projectId: string, milestoneId: string): Promise<ActionResult> {
  const user = await requireUser();
  const owned = await ownedProjectId(user.id, projectId);
  if (!owned || !isUuid(milestoneId)) return { ok: false, error: "Milestone não encontrado." };
  await db.transaction(async (tx) => {
    // Features stay; they simply stop belonging to the milestone (FK set null).
    await tx.delete(projectMilestones).where(and(eq(projectMilestones.id, milestoneId), eq(projectMilestones.projectId, owned.id)));
    await recomputeProgress(owned.id, tx);
  });
  revalidatePath(`/projects/${owned.id}`, "layout");
  revalidatePath("/");
  return { ok: true };
}
