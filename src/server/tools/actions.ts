"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { projectTools } from "@/server/db/schema";
import { ownedProjectId, touchProject, type ActionResult } from "@/server/projects/internal";
import { isUuid } from "@/server/projects/queries";

const toolSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da ferramenta.").max(80, "Use no máximo 80 caracteres."),
  purpose: z.string().trim().max(300, "Use no máximo 300 caracteres.").transform((v) => v || null),
  plan: z.string().trim().max(80).transform((v) => v || null),
  notes: z.string().trim().max(2000).transform((v) => v || null),
});

export type ToolInput = z.input<typeof toolSchema>;

export async function addTool(projectId: string, input: ToolInput): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = toolSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const owned = await ownedProjectId(user.id, projectId);
  if (!owned) return { ok: false, error: "Projeto não encontrado." };

  const inserted = await db.insert(projectTools).values({ projectId: owned.id, ...parsed.data }).onConflictDoNothing().returning({ id: projectTools.id });
  if (inserted.length === 0) return { ok: false, error: `${parsed.data.name} já está registrada neste projeto.` };
  await touchProject(owned.id);
  revalidatePath(`/projects/${owned.id}`, "layout");
  return { ok: true };
}

export async function updateTool(projectId: string, toolId: string, input: ToolInput): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = toolSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const owned = await ownedProjectId(user.id, projectId);
  if (!owned || !isUuid(toolId)) return { ok: false, error: "Ferramenta não encontrada." };
  try {
    await db.update(projectTools).set(parsed.data).where(and(eq(projectTools.id, toolId), eq(projectTools.projectId, owned.id)));
  } catch {
    return { ok: false, error: `${parsed.data.name} já está registrada neste projeto.` };
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
