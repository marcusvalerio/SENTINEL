"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { SUBSCRIPTION_STATUSES, subscriptionInputSchema, type SubscriptionInput, type SubscriptionStatus } from "@/domain/subscriptions";
import { requireUser } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { projects, subscriptionProjects, subscriptions } from "@/server/db/schema";
import { GENERIC_ERROR, type ActionResult } from "@/server/projects/internal";
import { isUuid } from "@/server/projects/queries";

function fieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  return Object.fromEntries(issues.map((i) => [i.path.map(String).join("."), i.message]));
}

function revalidate() {
  revalidatePath("/subscriptions");
  revalidatePath("/", "layout");
}

/** Creates (id = null) or updates a subscription and its project links. */
export async function saveSubscription(id: string | null, input: SubscriptionInput): Promise<ActionResult<{ subscriptionId: string }>> {
  const user = await requireUser();
  if (id !== null && !isUuid(id)) return { ok: false, error: "Assinatura não encontrada." };
  const parsed = subscriptionInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revise os campos destacados.", fieldErrors: fieldErrors(parsed.error.issues) };
  const { projectIds, amount, ...data } = parsed.data;

  // Links may only point to the user's own projects.
  const owned = projectIds.length
    ? await db.select({ id: projects.id }).from(projects).where(and(eq(projects.ownerId, user.id), inArray(projects.id, projectIds)))
    : [];
  if (owned.length !== new Set(projectIds).size) return { ok: false, error: "Projeto não encontrado." };

  const values = { ...data, amountCents: data.billing === "on_demand" && amount === null ? null : amount };
  const savedId = await db.transaction(async (tx) => {
    let target = id;
    if (target) {
      const [row] = await tx
        .update(subscriptions)
        .set(values)
        .where(and(eq(subscriptions.id, target), eq(subscriptions.ownerId, user.id)))
        .returning({ id: subscriptions.id });
      if (!row) return null;
    } else {
      const [row] = await tx.insert(subscriptions).values({ ownerId: user.id, ...values }).returning({ id: subscriptions.id });
      target = row!.id;
    }
    await tx.delete(subscriptionProjects).where(eq(subscriptionProjects.subscriptionId, target));
    if (owned.length) await tx.insert(subscriptionProjects).values(owned.map((p) => ({ subscriptionId: target!, projectId: p.id })));
    return target;
  });
  if (!savedId) return { ok: false, error: "Assinatura não encontrada." };
  revalidate();
  return { ok: true, subscriptionId: savedId };
}

export async function setSubscriptionStatus(id: string, status: SubscriptionStatus): Promise<ActionResult> {
  const user = await requireUser();
  if (!isUuid(id) || !SUBSCRIPTION_STATUSES.includes(status)) return { ok: false, error: GENERIC_ERROR };
  const rows = await db
    .update(subscriptions)
    .set({ status })
    .where(and(eq(subscriptions.id, id), eq(subscriptions.ownerId, user.id)))
    .returning({ id: subscriptions.id });
  if (!rows.length) return { ok: false, error: "Assinatura não encontrada." };
  revalidate();
  return { ok: true };
}

export async function deleteSubscription(id: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!isUuid(id)) return { ok: false, error: "Assinatura não encontrada." };
  const rows = await db
    .delete(subscriptions)
    .where(and(eq(subscriptions.id, id), eq(subscriptions.ownerId, user.id)))
    .returning({ id: subscriptions.id });
  if (!rows.length) return { ok: false, error: "Assinatura não encontrada." };
  revalidate();
  return { ok: true };
}
