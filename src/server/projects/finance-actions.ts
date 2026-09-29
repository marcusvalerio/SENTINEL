"use server";

import { revalidatePath } from "next/cache";
import { projectFinanceSchema, type ProjectFinanceInput } from "@/domain/finance";
import { requireUser } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { projectFinances } from "@/server/db/schema";
import { ownedProjectId, touchProject, type ActionResult } from "./internal";

/** Saves the hand-entered economics of a project (upsert; empty = not informed). */
export async function saveProjectFinance(projectId: string, input: ProjectFinanceInput): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = projectFinanceSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Revise os valores destacados.", fieldErrors: Object.fromEntries(parsed.error.issues.map((i) => [i.path.join("."), i.message])) };
  }
  const owned = await ownedProjectId(user.id, projectId);
  if (!owned) return { ok: false, error: "Projeto não encontrado." };
  const values = {
    estimatedCostCents: parsed.data.estimatedCost,
    actualCostCents: parsed.data.actualCost,
    revenueCents: parsed.data.revenue,
    contractedValueCents: parsed.data.contractedValue,
    aiBaseMonths: parsed.data.aiBaseMonths,
  };
  await db.insert(projectFinances).values({ projectId: owned.id, ...values }).onConflictDoUpdate({ target: projectFinances.projectId, set: values });
  await touchProject(owned.id);
  revalidatePath(`/projects/${owned.id}`, "layout");
  revalidatePath("/", "layout");
  return { ok: true };
}
