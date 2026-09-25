"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { NOTE_TYPES, type NoteType } from "@/domain/notes";
import { extractHashtags, mergeTags } from "@/domain/tags";
import type { TimelineEventType } from "@/domain/timeline";
import { requireUser } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { projectNoteRevisions, projectNotes } from "@/server/db/schema";
import { GENERIC_ERROR, logEvent, ownedProjectId, touchProject, type ActionResult } from "@/server/projects/internal";
import { isUuid } from "@/server/projects/queries";

const noteSchema = z.object({
  title: z.string().trim().min(1, "Dê um título à anotação.").max(200, "Use no máximo 200 caracteres."),
  content: z.string().trim().max(40000, "Anotação longa demais — divida em mais de um registro."),
  type: z.enum(NOTE_TYPES, { error: "Escolha o tipo do registro." }),
  tags: z.array(z.string().max(40)).max(20, "Use no máximo 20 tags.").default([]),
});

export type NoteInput = z.input<typeof noteSchema>;

/** Rubrica types that are part of the project's history, not just its notebook. */
const HISTORY_TYPES: Partial<Record<NoteType, TimelineEventType>> = { decision: "decision", problem: "problem", insight: "insight" };

function fieldErrors(error: z.ZodError) {
  return Object.fromEntries(error.issues.map((i) => [i.path.join("."), i.message]));
}

function prepare(input: NoteInput) {
  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) return parsed;
  // Tags come from the tag field and from #hashtags written in the text.
  return { ...parsed, data: { ...parsed.data, tags: mergeTags(parsed.data.tags, extractHashtags(`${parsed.data.title}\n${parsed.data.content}`)) } };
}

export async function createNote(projectId: string, input: NoteInput): Promise<ActionResult<{ noteId: string }>> {
  const user = await requireUser();
  const parsed = prepare(input);
  if (!parsed.success) return { ok: false, error: "Revise a anotação.", fieldErrors: fieldErrors(parsed.error) };
  const owned = await ownedProjectId(user.id, projectId);
  if (!owned) return { ok: false, error: "Projeto não encontrado." };

  try {
    const noteId = await db.transaction(async (tx) => {
      const [note] = await tx.insert(projectNotes).values({ projectId: owned.id, authorId: user.id, ...parsed.data }).returning({ id: projectNotes.id });
      const eventType = HISTORY_TYPES[parsed.data.type];
      if (eventType) {
        await logEvent(tx, { projectId: owned.id, type: eventType, origin: "rubrica", title: parsed.data.title, metadata: { noteId: note!.id }, createdById: user.id });
      }
      await touchProject(owned.id, tx);
      return note!.id;
    });
    revalidatePath(`/projects/${owned.id}`, "layout");
    revalidatePath("/");
    return { ok: true, noteId };
  } catch (error) {
    console.error("[notes] create failed", error instanceof Error ? error.message : error);
    return { ok: false, error: GENERIC_ERROR };
  }
}

/** Edits keep the previous version in project_note_revisions. */
export async function updateNote(projectId: string, noteId: string, input: NoteInput): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = prepare(input);
  if (!parsed.success) return { ok: false, error: "Revise a anotação.", fieldErrors: fieldErrors(parsed.error) };
  const owned = await ownedProjectId(user.id, projectId);
  if (!owned || !isUuid(noteId)) return { ok: false, error: "Anotação não encontrada." };

  const updated = await db.transaction(async (tx) => {
    const [before] = await tx.select().from(projectNotes).where(and(eq(projectNotes.id, noteId), eq(projectNotes.projectId, owned.id)));
    if (!before) return false;
    const changed =
      before.title !== parsed.data.title || before.content !== parsed.data.content || before.type !== parsed.data.type || before.tags.join("|") !== parsed.data.tags.join("|");
    if (!changed) return true;
    await tx.insert(projectNoteRevisions).values({ noteId, title: before.title, content: before.content, type: before.type, tags: before.tags, editedById: user.id });
    await tx.update(projectNotes).set(parsed.data).where(eq(projectNotes.id, noteId));
    await touchProject(owned.id, tx);
    return true;
  });
  if (!updated) return { ok: false, error: "Anotação não encontrada." };
  revalidatePath(`/projects/${owned.id}`, "layout");
  return { ok: true };
}

export async function deleteNote(projectId: string, noteId: string): Promise<ActionResult> {
  const user = await requireUser();
  const owned = await ownedProjectId(user.id, projectId);
  if (!owned || !isUuid(noteId)) return { ok: false, error: "Anotação não encontrada." };
  await db.delete(projectNotes).where(and(eq(projectNotes.id, noteId), eq(projectNotes.projectId, owned.id)));
  revalidatePath(`/projects/${owned.id}`, "layout");
  return { ok: true };
}

export async function getNoteRevisions(projectId: string, noteId: string): Promise<ActionResult<{ revisions: { id: string; title: string; content: string; type: NoteType; tags: string[]; createdAt: string }[] }>> {
  const user = await requireUser();
  const owned = await ownedProjectId(user.id, projectId);
  if (!owned || !isUuid(noteId)) return { ok: false, error: "Anotação não encontrada." };
  const [note] = await db.select({ id: projectNotes.id }).from(projectNotes).where(and(eq(projectNotes.id, noteId), eq(projectNotes.projectId, owned.id)));
  if (!note) return { ok: false, error: "Anotação não encontrada." };
  const rows = await db.select().from(projectNoteRevisions).where(eq(projectNoteRevisions.noteId, noteId)).orderBy(projectNoteRevisions.createdAt);
  return { ok: true, revisions: rows.map((r) => ({ id: r.id, title: r.title, content: r.content, type: r.type, tags: r.tags, createdAt: r.createdAt.toISOString() })).reverse() };
}
