"use server";

import { and, eq, notInArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  collectErrors,
  draftTitle,
  hydrateProjectForm,
  projectInputSchema,
  type ProjectFormValues,
  type ProjectInput,
} from "@/domain/project-form";
import {
  FEATURE_PRIORITIES,
  FEATURE_STATUSES,
  PROGRESS_SOURCES,
  PROJECT_STATUSES,
  PROJECT_STATUS_LABELS,
  type ProjectStatus,
} from "@/domain/project";
import type { TimelineEventType } from "@/domain/timeline";
import { requireUser } from "@/server/auth/session";
import { db, type Transaction } from "@/server/db/client";
import {
  projectDrafts,
  projectFeatures,
  projectFinances,
  projectMembers,
  projectReferences,
  projects,
} from "@/server/db/schema";
import {
  GENERIC_ERROR,
  logEvent,
  ownedProjectId,
  recomputeProgress,
  touchProject,
  type ActionResult,
} from "./internal";
import { isUuid } from "./queries";

/* -------------------------------------------------------------------------- */
/* Drafts (autosave)                                                            */
/* -------------------------------------------------------------------------- */

const MAX_DRAFT_BYTES = 512 * 1024;

export async function saveDraft(input: {
  draftId: string | null;
  values: ProjectFormValues;
  step: number;
}): Promise<ActionResult<{ draftId: string; savedAt: string }>> {
  const user = await requireUser();
  const values = hydrateProjectForm(input.values);
  if (JSON.stringify(values).length > MAX_DRAFT_BYTES) {
    return { ok: false, error: "O rascunho ficou grande demais para ser salvo automaticamente." };
  }
  const step = Math.max(0, Math.min(6, Math.trunc(Number(input.step) || 0)));
  const title = draftTitle(values);

  try {
    if (input.draftId && isUuid(input.draftId)) {
      const [updated] = await db
        .update(projectDrafts)
        .set({ data: values, currentStep: step, title })
        .where(and(eq(projectDrafts.id, input.draftId), eq(projectDrafts.ownerId, user.id)))
        .returning({ id: projectDrafts.id, updatedAt: projectDrafts.updatedAt });
      if (updated) return { ok: true, draftId: updated.id, savedAt: updated.updatedAt.toISOString() };
      // The draft was discarded or already became a project — never resurrect it.
      return { ok: false, error: "Este rascunho não existe mais." };
    }
    const [created] = await db
      .insert(projectDrafts)
      .values({ ownerId: user.id, data: values, currentStep: step, title })
      .returning({ id: projectDrafts.id, updatedAt: projectDrafts.updatedAt });
    return { ok: true, draftId: created!.id, savedAt: created!.updatedAt.toISOString() };
  } catch (error) {
    console.error("[drafts] save failed", error instanceof Error ? error.message : error);
    return { ok: false, error: "Não foi possível salvar o rascunho agora." };
  }
}

export async function deleteDraft(draftId: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!isUuid(draftId)) return { ok: false, error: "Rascunho não encontrado." };
  await db.delete(projectDrafts).where(and(eq(projectDrafts.id, draftId), eq(projectDrafts.ownerId, user.id)));
  revalidatePath("/");
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/* Create / update                                                              */
/* -------------------------------------------------------------------------- */

function projectColumns(data: ProjectInput) {
  return {
    name: data.name,
    codename: data.codename,
    summary: data.summary,
    type: data.type,
    category: data.category,
    status: data.status,
    startedOn: data.startedOn,
    leadName: data.leadName,
    problem: data.problem,
    primaryGoal: data.primaryGoal,
    secondaryGoals: data.secondaryGoals,
    audience: data.audience,
    endUsers: data.endUsers,
    expectedOutcome: data.expectedOutcome,
    successCriteria: data.successCriteria,
    mandatoryFeatures: data.mandatoryFeatures,
    technicalConstraints: data.technicalConstraints,
    integrations: data.integrations,
    hasVisualIdentity: data.hasVisualIdentity,
    hasLogo: data.hasLogo,
    hasBrandManual: data.hasBrandManual,
    visualReferencesNotes: data.visualReferencesNotes,
    desiredFeeling: data.desiredFeeling,
    stylesToAvoid: data.stylesToAvoid,
    engagement: data.engagement,
    clientName: data.clientName,
    desiredDeadline: data.desiredDeadline,
    launchTargetOn: data.launchTargetOn,
    observations: data.observations,
  };
}

function financeColumns(data: ProjectInput) {
  return {
    hasBudget: data.hasBudget,
    budgetCents: data.budget,
    investmentPlannedCents: data.investmentPlanned,
    investmentRealizedCents: data.investmentRealized,
    expectedRevenueCents: data.expectedRevenue,
    monetizationModel: data.monetizationModel,
  };
}

function validate(values: ProjectFormValues) {
  const parsed = projectInputSchema.safeParse(hydrateProjectForm(values));
  if (!parsed.success) {
    return {
      ok: false as const,
      error: "Alguns campos precisam de atenção antes de continuar.",
      fieldErrors: collectErrors(hydrateProjectForm(values)),
    };
  }
  return { ok: true as const, data: parsed.data };
}

async function upsertLead(tx: Transaction, projectId: string, leadName: string | null) {
  await tx.delete(projectMembers).where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.isLead, true)));
  if (leadName) {
    await tx.insert(projectMembers).values({ projectId, name: leadName, role: "Responsável", isLead: true });
  }
}

export async function createProject(input: {
  values: ProjectFormValues;
  draftId: string | null;
}): Promise<ActionResult<{ projectId: string }>> {
  const user = await requireUser();
  const result = validate(input.values);
  if (!result.ok) return result;
  const data = result.data;

  try {
    const projectId = await db.transaction(async (tx) => {
      const [project] = await tx
        .insert(projects)
        .values({ ownerId: user.id, ...projectColumns(data), progressSource: "features", progress: 0 })
        .returning({ id: projects.id });
      const id = project!.id;

      await tx.insert(projectFinances).values({ projectId: id, ...financeColumns(data) });

      if (data.features.length) {
        await tx.insert(projectFeatures).values(
          data.features.map((f, position) => ({
            projectId: id,
            name: f.name,
            description: f.description,
            priority: f.priority,
            position,
          })),
        );
      }
      if (data.references.length) {
        await tx.insert(projectReferences).values(
          data.references.map((r, position) => ({ projectId: id, name: r.name, url: r.url, description: r.description, position })),
        );
      }
      await upsertLead(tx, id, data.leadName);

      await logEvent(tx, {
        projectId: id,
        type: "created",
        title: "Projeto registrado no SENTINEL",
        description: `Registrado com status “${PROJECT_STATUS_LABELS[data.status]}”.`,
        metadata: { status: data.status, features: data.features.length },
        createdById: user.id,
      });

      if (input.draftId && isUuid(input.draftId)) {
        await tx.delete(projectDrafts).where(and(eq(projectDrafts.id, input.draftId), eq(projectDrafts.ownerId, user.id)));
      }
      return id;
    });

    revalidatePath("/");
    return { ok: true, projectId };
  } catch (error) {
    console.error("[projects] create failed", error instanceof Error ? error.message : error);
    return { ok: false, error: GENERIC_ERROR };
  }
}

export async function updateProject(input: {
  projectId: string;
  values: ProjectFormValues;
}): Promise<ActionResult<{ projectId: string }>> {
  const user = await requireUser();
  const owned = await ownedProjectId(user.id, input.projectId);
  if (!owned) return { ok: false, error: "Projeto não encontrado." };
  const result = validate(input.values);
  if (!result.ok) return result;
  const data = result.data;
  const projectId = owned.id;

  try {
    await db.transaction(async (tx) => {
      const [before] = await tx.select({ status: projects.status, primaryGoal: projects.primaryGoal }).from(projects).where(eq(projects.id, projectId));
      const existingFeatures = await tx.select({ id: projectFeatures.id }).from(projectFeatures).where(eq(projectFeatures.projectId, projectId));
      const existingIds = new Set(existingFeatures.map((f) => f.id));

      const statusChanged = before && before.status !== data.status;
      await tx
        .update(projects)
        .set({ ...projectColumns(data), lastActivityAt: new Date(), ...(statusChanged ? { statusChangedAt: new Date() } : {}) })
        .where(eq(projects.id, projectId));

      await tx
        .insert(projectFinances)
        .values({ projectId, ...financeColumns(data) })
        .onConflictDoUpdate({ target: projectFinances.projectId, set: financeColumns(data) });

      // Features: keep ids stable (future tasks/requirements will point at them).
      const keptIds = data.features.map((f) => f.id).filter((id): id is string => Boolean(id && existingIds.has(id)));
      const removed = existingFeatures.filter((f) => !keptIds.includes(f.id)).length;
      await tx
        .delete(projectFeatures)
        .where(and(eq(projectFeatures.projectId, projectId), keptIds.length ? notInArray(projectFeatures.id, keptIds) : undefined));
      let added = 0;
      for (const [position, f] of data.features.entries()) {
        if (f.id && existingIds.has(f.id)) {
          await tx
            .update(projectFeatures)
            .set({ name: f.name, description: f.description, priority: f.priority, position })
            .where(and(eq(projectFeatures.id, f.id), eq(projectFeatures.projectId, projectId)));
        } else {
          added += 1;
          await tx.insert(projectFeatures).values({ projectId, name: f.name, description: f.description, priority: f.priority, position });
        }
      }

      await tx.delete(projectReferences).where(eq(projectReferences.projectId, projectId));
      if (data.references.length) {
        await tx.insert(projectReferences).values(
          data.references.map((r, position) => ({ projectId, name: r.name, url: r.url, description: r.description, position })),
        );
      }
      await upsertLead(tx, projectId, data.leadName);

      if (statusChanged) await logStatusChange(tx, projectId, before.status, data.status, user.id);
      if (before && before.primaryGoal.trim() !== data.primaryGoal.trim()) {
        await logEvent(tx, {
          projectId,
          type: "goal_change",
          title: "Objetivo principal alterado",
          description: data.primaryGoal,
          metadata: { previous: before.primaryGoal },
          createdById: user.id,
        });
      }
      if (added || removed) {
        const parts = [added && `${added} adicionada${added > 1 ? "s" : ""}`, removed && `${removed} removida${removed > 1 ? "s" : ""}`].filter(Boolean);
        await logEvent(tx, {
          projectId,
          type: "scope_change",
          title: "Escopo atualizado",
          description: `Funcionalidades: ${parts.join(", ")}.`,
          metadata: { added, removed },
          createdById: user.id,
        });
      }
      await recomputeProgress(projectId, tx);
    });

    revalidatePath("/");
    revalidatePath(`/projects/${projectId}`, "layout");
    return { ok: true, projectId };
  } catch (error) {
    console.error("[projects] update failed", error instanceof Error ? error.message : error);
    return { ok: false, error: GENERIC_ERROR };
  }
}

/* -------------------------------------------------------------------------- */
/* Status & progress                                                            */
/* -------------------------------------------------------------------------- */

const STATUS_EVENT: Partial<Record<ProjectStatus, TimelineEventType>> = {
  paused: "paused",
  completed: "completed",
  archived: "archived",
};

async function logStatusChange(tx: Transaction, projectId: string, from: ProjectStatus, to: ProjectStatus, userId: string) {
  const resumed = from === "paused" || from === "archived";
  const type: TimelineEventType = STATUS_EVENT[to] ?? (resumed ? "resumed" : "status_change");
  await logEvent(tx, {
    projectId,
    type,
    title: `${PROJECT_STATUS_LABELS[from]} → ${PROJECT_STATUS_LABELS[to]}`,
    metadata: { from, to },
    createdById: userId,
  });
}

export async function setProjectStatus(projectId: string, status: ProjectStatus): Promise<ActionResult> {
  const user = await requireUser();
  if (!PROJECT_STATUSES.includes(status)) return { ok: false, error: "Status inválido." };
  const owned = await ownedProjectId(user.id, projectId);
  if (!owned) return { ok: false, error: "Projeto não encontrado." };

  await db.transaction(async (tx) => {
    const [before] = await tx.select({ status: projects.status }).from(projects).where(eq(projects.id, owned.id));
    if (!before || before.status === status) return;
    await tx.update(projects).set({ status, statusChangedAt: new Date(), lastActivityAt: new Date() }).where(eq(projects.id, owned.id));
    await logStatusChange(tx, owned.id, before.status, status, user.id);
  });
  revalidatePath("/");
  revalidatePath(`/projects/${owned.id}`, "layout");
  return { ok: true };
}

const progressSchema = z.object({
  source: z.enum(PROGRESS_SOURCES),
  value: z.number().int().min(0).max(100).optional(),
});

export async function setProjectProgress(projectId: string, input: z.input<typeof progressSchema>): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = progressSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Informe um progresso entre 0 e 100." };
  const owned = await ownedProjectId(user.id, projectId);
  if (!owned) return { ok: false, error: "Projeto não encontrado." };

  await db.transaction(async (tx) => {
    await tx
      .update(projects)
      .set({
        progressSource: parsed.data.source,
        ...(parsed.data.source === "manual" && parsed.data.value !== undefined ? { progress: parsed.data.value } : {}),
        lastActivityAt: new Date(),
      })
      .where(eq(projects.id, owned.id));
    await recomputeProgress(owned.id, tx);
  });
  revalidatePath(`/projects/${owned.id}`, "layout");
  revalidatePath("/");
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/* Features                                                                     */
/* -------------------------------------------------------------------------- */

export async function setFeatureStatus(projectId: string, featureId: string, status: (typeof FEATURE_STATUSES)[number]): Promise<ActionResult> {
  const user = await requireUser();
  if (!FEATURE_STATUSES.includes(status) || !isUuid(featureId)) return { ok: false, error: "Status inválido." };
  const owned = await ownedProjectId(user.id, projectId);
  if (!owned) return { ok: false, error: "Projeto não encontrado." };

  await db.transaction(async (tx) => {
    await tx
      .update(projectFeatures)
      .set({ status, completedAt: status === "done" ? new Date() : null })
      .where(and(eq(projectFeatures.id, featureId), eq(projectFeatures.projectId, owned.id)));
    await recomputeProgress(owned.id, tx);
    await touchProject(owned.id, tx);
  });
  revalidatePath(`/projects/${owned.id}`, "layout");
  revalidatePath("/");
  return { ok: true };
}

const quickFeatureSchema = z.object({
  name: z.string().trim().min(1, "Dê um nome à funcionalidade.").max(140, "Use no máximo 140 caracteres."),
  description: z.string().trim().max(8000).optional(),
  priority: z.enum(FEATURE_PRIORITIES),
});

export async function addFeature(projectId: string, input: z.input<typeof quickFeatureSchema>): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = quickFeatureSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const owned = await ownedProjectId(user.id, projectId);
  if (!owned) return { ok: false, error: "Projeto não encontrado." };

  await db.transaction(async (tx) => {
    const existing = await tx.select({ id: projectFeatures.id }).from(projectFeatures).where(eq(projectFeatures.projectId, owned.id));
    await tx.insert(projectFeatures).values({
      projectId: owned.id,
      name: parsed.data.name,
      description: parsed.data.description || null,
      priority: parsed.data.priority,
      position: existing.length,
    });
    await logEvent(tx, { projectId: owned.id, type: "scope_change", title: `Funcionalidade adicionada: ${parsed.data.name}`, createdById: user.id });
    await recomputeProgress(owned.id, tx);
    await touchProject(owned.id, tx);
  });
  revalidatePath(`/projects/${owned.id}`, "layout");
  return { ok: true };
}

export async function deleteFeature(projectId: string, featureId: string): Promise<ActionResult> {
  const user = await requireUser();
  const owned = await ownedProjectId(user.id, projectId);
  if (!owned || !isUuid(featureId)) return { ok: false, error: "Funcionalidade não encontrada." };

  await db.transaction(async (tx) => {
    const [removed] = await tx
      .delete(projectFeatures)
      .where(and(eq(projectFeatures.id, featureId), eq(projectFeatures.projectId, owned.id)))
      .returning({ name: projectFeatures.name });
    if (removed) {
      await logEvent(tx, { projectId: owned.id, type: "scope_change", title: `Funcionalidade removida: ${removed.name}`, createdById: user.id });
    }
    await recomputeProgress(owned.id, tx);
    await touchProject(owned.id, tx);
  });
  revalidatePath(`/projects/${owned.id}`, "layout");
  return { ok: true };
}

/** Removes a project and everything that belongs to it. */
export async function deleteProject(projectId: string, confirmation: string): Promise<ActionResult> {
  const user = await requireUser();
  const owned = await ownedProjectId(user.id, projectId);
  if (!owned) return { ok: false, error: "Projeto não encontrado." };
  const [project] = await db.select({ name: projects.name }).from(projects).where(eq(projects.id, owned.id));
  if (!project || confirmation.trim() !== project.name) {
    return { ok: false, error: "Digite o nome do projeto exatamente como aparece para confirmar." };
  }
  await db.delete(projects).where(and(eq(projects.id, owned.id), eq(projects.ownerId, user.id)));
  revalidatePath("/");
  return { ok: true };
}

// Re-exported for type-only use in client components.
export type { ActionResult };
