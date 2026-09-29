"use server";

import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { PRE_PROJECT_STATUSES, preProjectInputSchema, type PreProjectInput, type PreProjectStatus } from "@/domain/pre-projects";
import { requireUser } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { preProjects } from "@/server/db/schema";
import type { ActionResult } from "@/server/projects/internal";
import { preProjectToForm } from "@/domain/pre-project-mapping";
import { createDraftWithOrigin } from "@/server/projects/drafts";
import { isUuid } from "@/server/projects/queries";
import { getPreProject } from "./queries";

function fieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  return Object.fromEntries(issues.map((i) => [i.path.map(String).join("."), i.message]));
}

export async function savePreProject(id: string | null, input: PreProjectInput): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = preProjectInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revise o pré-projeto.", fieldErrors: fieldErrors(parsed.error.issues) };

  if (id) {
    if (!isUuid(id)) return { ok: false, error: "Pré-projeto não encontrado." };
    const [row] = await db
      .update(preProjects)
      .set(parsed.data)
      .where(and(eq(preProjects.id, id), eq(preProjects.ownerId, user.id)))
      .returning({ id: preProjects.id });
    if (!row) return { ok: false, error: "Pré-projeto não encontrado." };
    revalidatePath("/pre-projects", "layout");
    return { ok: true, id: row.id };
  }
  const [row] = await db.insert(preProjects).values({ ownerId: user.id, ...parsed.data }).returning({ id: preProjects.id });
  revalidatePath("/", "layout");
  return { ok: true, id: row!.id };
}

export async function setPreProjectStatus(id: string, status: PreProjectStatus): Promise<ActionResult> {
  const user = await requireUser();
  if (!isUuid(id) || !PRE_PROJECT_STATUSES.includes(status)) return { ok: false, error: "Status inválido." };
  const [row] = await db
    .update(preProjects)
    .set({ status, statusChangedAt: new Date() })
    .where(and(eq(preProjects.id, id), eq(preProjects.ownerId, user.id)))
    .returning({ id: preProjects.id });
  if (!row) return { ok: false, error: "Pré-projeto não encontrado." };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deletePreProject(id: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!isUuid(id)) return { ok: false, error: "Pré-projeto não encontrado." };
  await db.delete(preProjects).where(and(eq(preProjects.id, id), eq(preProjects.ownerId, user.id)));
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Approved → project. Creates a registration draft prefilled with the
 * discovery answers; the person reviews it in the normal wizard.
 */
export async function convertPreProject(id: string): Promise<ActionResult<{ href: string }>> {
  const user = await requireUser();
  const pre = await getPreProject(user.id, id);
  if (!pre) return { ok: false, error: "Pré-projeto não encontrado." };
  if (pre.status !== "approved") return { ok: false, error: "Só pré-projetos aprovados viram projeto." };
  if (pre.convertedProjectId) return { ok: true, href: `/projects/${pre.convertedProjectId}` };
  const values = preProjectToForm(pre, user.name, () => randomUUID());
  const draftId = await createDraftWithOrigin(user.id, values, { kind: "pre_project", preProjectId: pre.id });
  return { ok: true, href: `/projects/new?draft=${draftId}` };
}
