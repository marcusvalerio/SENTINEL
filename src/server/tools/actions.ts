"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { suggestCategory, toolInputSchema, type ToolInput } from "@/domain/tools";
import { requireUser } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { projectTools } from "@/server/db/schema";
import { ownedProjectId, touchProject, type ActionResult } from "@/server/projects/internal";
import { isUuid } from "@/server/projects/queries";

function parse(input: ToolInput) {
  const parsed = toolInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Dados inválidos.", fieldErrors: Object.fromEntries(parsed.error.issues.map((i) => [i.path.join("."), i.message])) };
  }
  const { cost, ...rest } = parsed.data;
  return { ok: true as const, data: { ...rest, category: rest.category ?? suggestCategory(rest.name), costCents: cost } };
}

export async function addTool(projectId: string, input: ToolInput): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = parse(input);
  if (!parsed.ok) return parsed;
  const owned = await ownedProjectId(user.id, projectId);
  if (!owned) return { ok: false, error: "Projeto não encontrado." };

  const inserted = await db.insert(projectTools).values({ projectId: owned.id, ...parsed.data }).onConflictDoNothing().returning({ id: projectTools.id });
  if (inserted.length === 0) return { ok: false, error: `${parsed.data.name} já está registrada neste projeto.`, fieldErrors: { name: "Já registrada." } };
  await touchProject(owned.id);
  revalidatePath(`/projects/${owned.id}`, "layout");
  return { ok: true };
}

export async function updateTool(projectId: string, toolId: string, input: ToolInput): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = parse(input);
  if (!parsed.ok) return parsed;
  const owned = await ownedProjectId(user.id, projectId);
  if (!owned || !isUuid(toolId)) return { ok: false, error: "Ferramenta não encontrada." };
  try {
    await db.update(projectTools).set(parsed.data).where(and(eq(projectTools.id, toolId), eq(projectTools.projectId, owned.id)));
  } catch {
    return { ok: false, error: `${parsed.data.name} já está registrada neste projeto.`, fieldErrors: { name: "Já registrada." } };
  }
  revalidatePath(`/projects/${owned.id}`, "layout");
  return { ok: true };
}

export async function removeTool(projectId: string, toolId: string): Promise<ActionResult> {
  const user = await requireUser();
  const owned = await ownedProjectId(user.id, projectId);
  if (!owned || !isUuid(toolId)) return { ok: false, error: "Ferramenta não encontrada." };
  await db.delete(projectTools).where(and(eq(projectTools.id, toolId), eq(projectTools.projectId, owned.id)));
  revalidatePath(`/projects/${owned.id}`, "layout");
  return { ok: true };
}
