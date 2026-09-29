"use server";

import { and, eq, inArray, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { FEATURE_PRIORITIES } from "@/domain/project";
import { EFFORTS, HORIZONS, HORIZON_LABELS } from "@/domain/roadmap";
import { requireUser } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { projectFeatures, projectMilestones } from "@/server/db/schema";
import { GENERIC_ERROR, logEvent, ownedProjectId, recomputeProgress, touchProject, type ActionResult } from "@/server/projects/internal";
import { isUuid } from "@/server/projects/queries";

const uuid = z.string().refine(isUuid);

const planSchema = z
  .object({
    horizon: z.enum(HORIZONS),
    effort: z.enum(EFFORTS).nullable(),
    priority: z.enum(FEATURE_PRIORITIES),
    milestoneId: uuid.nullable(),
    dependsOn: z.array(uuid).max(20),
  })
  .partial();

/**
 * Updates how an item is planned: horizon, effort, priority, milestone and
 * dependencies. Every referenced id must belong to the same project.
 */
export async function planFeature(projectId: string, featureId: string, input: z.input<typeof planSchema>): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = planSchema.safeParse(input);
  if (!parsed.success || !isUuid(featureId)) return { ok: false, error: GENERIC_ERROR };
  const owned = await ownedProjectId(user.id, projectId);
  if (!owned) return { ok: false, error: "Projeto não encontrado." };
  const plan = parsed.data;

  const error = await db.transaction(async (tx) => {
    const [feature] = await tx
      .select({ name: projectFeatures.name, horizon: projectFeatures.horizon })
      .from(projectFeatures)
      .where(and(eq(projectFeatures.id, featureId), eq(projectFeatures.projectId, owned.id)));
    if (!feature) return "Item não encontrado.";

    if (plan.milestoneId) {
      const [m] = await tx
        .select({ id: projectMilestones.id })
        .from(projectMilestones)
        .where(and(eq(projectMilestones.id, plan.milestoneId), eq(projectMilestones.projectId, owned.id)));
      if (!m) return "Milestone não encontrado.";
    }
    if (plan.dependsOn) {
      plan.dependsOn = [...new Set(plan.dependsOn)].filter((id) => id !== featureId);
      if (plan.dependsOn.length) {
        const found = await tx
          .select({ id: projectFeatures.id })
          .from(projectFeatures)
          .where(and(eq(projectFeatures.projectId, owned.id), inArray(projectFeatures.id, plan.dependsOn), ne(projectFeatures.id, featureId)));
        if (found.length !== plan.dependsOn.length) return "Dependência inválida.";
      }
    }

    await tx.update(projectFeatures).set({ ...plan, updatedAt: new Date() }).where(eq(projectFeatures.id, featureId));
    if (plan.horizon && plan.horizon !== feature.horizon) {
      await logEvent(tx, {
        projectId: owned.id,
        type: "scope_change",
        title: `${feature.name}: ${HORIZON_LABELS[feature.horizon]} → ${HORIZON_LABELS[plan.horizon]}`,
        metadata: { featureId, from: feature.horizon, to: plan.horizon },
        createdById: user.id,
      });
    }
    if (plan.milestoneId !== undefined) await recomputeProgress(owned.id, tx);
    await touchProject(owned.id, tx);
    return null;
  });
  if (error) return { ok: false, error };
  revalidatePath(`/projects/${owned.id}`, "layout");
  return { ok: true };
}

const itemSchema = z.object({
  name: z.string().trim().min(1, "Dê um nome ao item.").max(140, "Use no máximo 140 caracteres."),
  horizon: z.enum(HORIZONS),
  priority: z.enum(FEATURE_PRIORITIES),
  effort: z.enum(EFFORTS).nullable(),
});

/** Adds a roadmap item straight into a horizon. It is a feature like any other. */
export async function addRoadmapItem(projectId: string, input: z.input<typeof itemSchema>): Promise<ActionResult<{ featureId: string }>> {
  const user = await requireUser();
  const parsed = itemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? GENERIC_ERROR };
  const owned = await ownedProjectId(user.id, projectId);
  if (!owned) return { ok: false, error: "Projeto não encontrado." };

  const id = await db.transaction(async (tx) => {
    const existing = await tx.select({ id: projectFeatures.id }).from(projectFeatures).where(eq(projectFeatures.projectId, owned.id));
    const [row] = await tx
      .insert(projectFeatures)
      .values({ projectId: owned.id, ...parsed.data, origin: "manual", position: existing.length })
      .returning({ id: projectFeatures.id });
    await logEvent(tx, { projectId: owned.id, type: "scope_change", title: `Adicionado ao roadmap (${HORIZON_LABELS[parsed.data.horizon]}): ${parsed.data.name}`, createdById: user.id });
    await recomputeProgress(owned.id, tx);
    await touchProject(owned.id, tx);
    return row!.id;
  });
  revalidatePath(`/projects/${owned.id}`, "layout");
  return { ok: true, featureId: id };
}
