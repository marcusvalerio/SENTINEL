"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { emptyProjectForm } from "@/domain/project-form";
import { ideaCaptureSchema, type IdeaTarget } from "@/domain/ideas";
import { requireUser } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { ideas, preProjects, projectDrafts, projectFeatures, projectMilestones } from "@/server/db/schema";
import { logEvent, ownedProjectId, recomputeProgress, touchProject, type ActionResult } from "@/server/projects/internal";
import { isUuid } from "@/server/projects/queries";

/** Capture is a single insert — nothing else is required to save a thought. */
export async function captureIdea(input: { text: string; projectId?: string | null }): Promise<ActionResult<{ ideaId: string }>> {
  const user = await requireUser();
  const parsed = ideaCaptureSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Escreva a ideia." };
  let projectId: string | null = null;
  if (parsed.data.projectId) {
    const owned = await ownedProjectId(user.id, parsed.data.projectId);
    if (!owned) return { ok: false, error: "Projeto não encontrado." };
    projectId = owned.id;
  }
  const [idea] = await db.insert(ideas).values({ ownerId: user.id, text: parsed.data.text, projectId }).returning({ id: ideas.id });
  revalidatePath("/inbox");
  revalidatePath("/", "layout");
  return { ok: true, ideaId: idea!.id };
}

async function ownedIdea(ownerId: string, ideaId: string) {
  if (!isUuid(ideaId)) return null;
  const [idea] = await db.select().from(ideas).where(and(eq(ideas.id, ideaId), eq(ideas.ownerId, ownerId)));
  return idea ?? null;
}

export async function setIdeaStatus(ideaId: string, status: "inbox" | "archived"): Promise<ActionResult> {
  const user = await requireUser();
  const idea = await ownedIdea(user.id, ideaId);
  if (!idea) return { ok: false, error: "Ideia não encontrada." };
  await db.update(ideas).set({ status }).where(eq(ideas.id, idea.id));
  revalidatePath("/inbox");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteIdea(ideaId: string): Promise<ActionResult> {
  const user = await requireUser();
  const idea = await ownedIdea(user.id, ideaId);
  if (!idea) return { ok: false, error: "Ideia não encontrada." };
  await db.delete(ideas).where(eq(ideas.id, idea.id));
  revalidatePath("/inbox");
  return { ok: true };
}

/**
 * Turns an idea into something real. Features and milestones need a project;
 * "project" opens a prefilled registration draft; "pre_project" starts a
 * discovery record. The idea keeps a pointer to what it became.
 */
export async function convertIdea(ideaId: string, target: IdeaTarget, projectId?: string | null): Promise<ActionResult<{ href: string }>> {
  const user = await requireUser();
  const idea = await ownedIdea(user.id, ideaId);
  if (!idea) return { ok: false, error: "Ideia não encontrada." };
  const title = idea.text.split("\n")[0]!.slice(0, 140);

  if (target === "feature" || target === "milestone") {
    const owned = await ownedProjectId(user.id, projectId ?? idea.projectId ?? "");
    if (!owned) return { ok: false, error: "Escolha o projeto de destino." };
    const createdId = await db.transaction(async (tx) => {
      let id: string;
      if (target === "feature") {
        const [{ count }] = (await tx.select({ count: sql<number>`count(*)::int` }).from(projectFeatures).where(eq(projectFeatures.projectId, owned.id))) as [{ count: number }];
        const [f] = await tx
          .insert(projectFeatures)
          .values({ projectId: owned.id, name: title, description: idea.text.length > title.length ? idea.text : null, origin: "inbox", horizon: "later", position: count })
          .returning({ id: projectFeatures.id });
        id = f!.id;
        await logEvent(tx, { projectId: owned.id, type: "scope_change", title: `Funcionalidade adicionada da Inbox: ${title}`, createdById: user.id });
      } else {
        const [{ count }] = (await tx.select({ count: sql<number>`count(*)::int` }).from(projectMilestones).where(eq(projectMilestones.projectId, owned.id))) as [{ count: number }];
        const [m] = await tx.insert(projectMilestones).values({ projectId: owned.id, name: title, description: idea.text.length > title.length ? idea.text : null, position: count }).returning({ id: projectMilestones.id });
        id = m!.id;
        await logEvent(tx, { projectId: owned.id, type: "milestone_created", title, metadata: { milestoneId: id, fromIdea: idea.id }, createdById: user.id });
      }
      await tx.update(ideas).set({ status: "converted", convertedKind: target, convertedId: id, projectId: owned.id }).where(eq(ideas.id, idea.id));
      await recomputeProgress(owned.id, tx);
      await touchProject(owned.id, tx);
      return id;
    });
    revalidatePath(`/projects/${owned.id}`, "layout");
    revalidatePath("/inbox");
    return { ok: true, href: target === "feature" ? `/projects/${owned.id}/roadmap` : `/projects/${owned.id}/roadmap#milestone-${createdId}` };
  }

  if (target === "project") {
    const values = emptyProjectForm({ name: title, observations: idea.text, leadName: user.name });
    const [draft] = await db.insert(projectDrafts).values({ ownerId: user.id, data: values, currentStep: 0, title }).returning({ id: projectDrafts.id });
    await db.update(ideas).set({ status: "converted", convertedKind: "project_draft", convertedId: draft!.id }).where(eq(ideas.id, idea.id));
    revalidatePath("/inbox");
    return { ok: true, href: `/projects/new?draft=${draft!.id}` };
  }

  const [pre] = await db.insert(preProjects).values({ ownerId: user.id, title, idea: idea.text }).returning({ id: preProjects.id });
  await db.update(ideas).set({ status: "converted", convertedKind: "pre_project", convertedId: pre!.id }).where(eq(ideas.id, idea.id));
  revalidatePath("/inbox");
  revalidatePath("/pre-projects");
  return { ok: true, href: `/pre-projects/${pre!.id}` };
}
