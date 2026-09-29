"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { DECISION_STATUSES, DECISION_STATUS_LABELS, decisionInputSchema, type DecisionInput, type DecisionStatus } from "@/domain/decisions";
import { requireUser } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { projectDecisions, projectNotes } from "@/server/db/schema";
import { GENERIC_ERROR, logEvent, ownedProjectId, touchProject, type ActionResult } from "@/server/projects/internal";
import { isUuid } from "@/server/projects/queries";

function fieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  return Object.fromEntries(issues.map((i) => [i.path.map(String).join("."), i.message]));
}

function revalidate(projectId: string) {
  revalidatePath(`/projects/${projectId}`, "layout");
  revalidatePath("/", "layout");
}

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

export async function createDecision(projectId: string, input: DecisionInput): Promise<ActionResult<{ decisionId: string }>> {
  const user = await requireUser();
  const parsed = decisionInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revise os campos destacados.", fieldErrors: fieldErrors(parsed.error.issues) };
  const owned = await ownedProjectId(user.id, projectId);
  if (!owned) return { ok: false, error: "Projeto não encontrado." };
  const data = { ...parsed.data, decidedOn: parsed.data.status === "decided" ? (parsed.data.decidedOn ?? today()) : parsed.data.decidedOn };

  const id = await db.transaction(async (tx) => {
    const [row] = await tx.insert(projectDecisions).values({ projectId: owned.id, createdById: user.id, ...data }).returning({ id: projectDecisions.id });
    await logEvent(tx, {
      projectId: owned.id,
      type: "decision",
      origin: "decision",
      title: data.status === "decided" ? `Decisão: ${data.title}` : `Decisão em aberto: ${data.title}`,
      description: data.decision,
      metadata: { decisionId: row!.id, status: data.status },
      createdById: user.id,
    });
    await touchProject(owned.id, tx);
    return row!.id;
  });
  revalidate(owned.id);
  return { ok: true, decisionId: id };
}

export async function updateDecision(projectId: string, decisionId: string, input: DecisionInput): Promise<ActionResult> {
  const user = await requireUser();
  if (!isUuid(decisionId)) return { ok: false, error: "Decisão não encontrada." };
  const parsed = decisionInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revise os campos destacados.", fieldErrors: fieldErrors(parsed.error.issues) };
  const owned = await ownedProjectId(user.id, projectId);
  if (!owned) return { ok: false, error: "Projeto não encontrado." };

  const found = await db.transaction(async (tx) => {
    const [before] = await tx
      .select({ status: projectDecisions.status, decidedOn: projectDecisions.decidedOn })
      .from(projectDecisions)
      .where(and(eq(projectDecisions.id, decisionId), eq(projectDecisions.projectId, owned.id)));
    if (!before) return false;
    const data = { ...parsed.data };
    if (data.status === "decided" && !data.decidedOn) data.decidedOn = before.decidedOn ?? today();
    await tx.update(projectDecisions).set({ ...data, updatedAt: new Date() }).where(eq(projectDecisions.id, decisionId));
    if (before.status !== data.status) {
      await logEvent(tx, {
        projectId: owned.id,
        type: "decision",
        origin: "decision",
        title: `${DECISION_STATUS_LABELS[data.status]}: ${data.title}`,
        description: data.status === "decided" ? data.decision : null,
        metadata: { decisionId, from: before.status, to: data.status },
        createdById: user.id,
      });
    }
    await touchProject(owned.id, tx);
    return true;
  });
  if (!found) return { ok: false, error: "Decisão não encontrada." };
  revalidate(owned.id);
  return { ok: true };
}

export async function setDecisionStatus(projectId: string, decisionId: string, status: DecisionStatus): Promise<ActionResult> {
  const user = await requireUser();
  if (!isUuid(decisionId) || !DECISION_STATUSES.includes(status)) return { ok: false, error: GENERIC_ERROR };
  const owned = await ownedProjectId(user.id, projectId);
  if (!owned) return { ok: false, error: "Projeto não encontrado." };

  const found = await db.transaction(async (tx) => {
    const [before] = await tx
      .select({ status: projectDecisions.status, title: projectDecisions.title, decision: projectDecisions.decision, decidedOn: projectDecisions.decidedOn })
      .from(projectDecisions)
      .where(and(eq(projectDecisions.id, decisionId), eq(projectDecisions.projectId, owned.id)));
    if (!before) return false;
    if (before.status === status) return true;
    await tx
      .update(projectDecisions)
      .set({ status, decidedOn: status === "decided" ? (before.decidedOn ?? today()) : before.decidedOn, updatedAt: new Date() })
      .where(eq(projectDecisions.id, decisionId));
    await logEvent(tx, {
      projectId: owned.id,
      type: "decision",
      origin: "decision",
      title: `${DECISION_STATUS_LABELS[status]}: ${before.title}`,
      description: status === "decided" ? before.decision : null,
      metadata: { decisionId, from: before.status, to: status },
      createdById: user.id,
    });
    await touchProject(owned.id, tx);
    return true;
  });
  if (!found) return { ok: false, error: "Decisão não encontrada." };
  revalidate(owned.id);
  return { ok: true };
}

export async function deleteDecision(projectId: string, decisionId: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!isUuid(decisionId)) return { ok: false, error: "Decisão não encontrada." };
  const owned = await ownedProjectId(user.id, projectId);
  if (!owned) return { ok: false, error: "Projeto não encontrado." };
  const removed = await db
    .delete(projectDecisions)
    .where(and(eq(projectDecisions.id, decisionId), eq(projectDecisions.projectId, owned.id)))
    .returning({ id: projectDecisions.id });
  if (removed.length === 0) return { ok: false, error: "Decisão não encontrada." };
  revalidate(owned.id);
  return { ok: true };
}

/**
 * Turns a Rubrica note of type "decision" into a structured decision.
 * The note stays where it is; the decision links back to it.
 */
export async function promoteNoteToDecision(projectId: string, noteId: string): Promise<ActionResult<{ decisionId: string }>> {
  const user = await requireUser();
  if (!isUuid(noteId)) return { ok: false, error: "Registro não encontrado." };
  const owned = await ownedProjectId(user.id, projectId);
  if (!owned) return { ok: false, error: "Projeto não encontrado." };
  const [note] = await db
    .select({ id: projectNotes.id, title: projectNotes.title, content: projectNotes.content })
    .from(projectNotes)
    .where(and(eq(projectNotes.id, noteId), eq(projectNotes.projectId, owned.id)));
  if (!note) return { ok: false, error: "Registro não encontrado." };
  const [existing] = await db.select({ id: projectDecisions.id }).from(projectDecisions).where(and(eq(projectDecisions.noteId, note.id), eq(projectDecisions.projectId, owned.id)));
  if (existing) return { ok: true, decisionId: existing.id };

  const id = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(projectDecisions)
      .values({ projectId: owned.id, noteId: note.id, title: note.title.slice(0, 200), context: note.content || null, status: "proposed", createdById: user.id })
      .returning({ id: projectDecisions.id });
    await logEvent(tx, {
      projectId: owned.id,
      type: "decision",
      origin: "decision",
      title: `Decisão em aberto: ${note.title}`,
      metadata: { decisionId: row!.id, noteId: note.id },
      createdById: user.id,
    });
    return row!.id;
  });
  revalidate(owned.id);
  return { ok: true, decisionId: id };
}
