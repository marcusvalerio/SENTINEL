"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { NOTE_TYPES } from "@/domain/notes";
import { requireUser } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { projectNotes } from "@/server/db/schema";
import { GENERIC_ERROR, logEvent, ownedProjectId, touchProject, type ActionResult } from "@/server/projects/internal";
import { isUuid } from "@/server/projects/queries";

const noteSchema = z.object({
  title: z.string().trim().min(1, "Dê um título à anotação.").max(200, "Use no máximo 200 caracteres."),
  content: z.string().trim().max(40000, "Anotação longa demais — divida em mais de um registro."),
  type: z.enum(NOTE_TYPES, { error: "Escolha o tipo do registro." }),
});

export type NoteInput = z.input<typeof noteSchema>;

function fieldErrors(error: z.ZodError) {
  return Object.fromEntries(error.issues.map((i) => [i.path.join("."), i.message]));
}

export async function createNote(projectId: string, input: NoteInput): Promise<ActionResult<{ noteId: string }>> {
  const user = await requireUser();
  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revise a anotação.", fieldErrors: fieldErrors(parsed.error) };
  const owned = await ownedProjectId(user.id, projectId);
  if (!owned) return { ok: false, error: "Projeto não encontrado." };

  try {
    const noteId = await db.transaction(async (tx) => {
      const [note] = await tx
        .insert(projectNotes)
        .values({ projectId: owned.id, authorId: user.id, ...parsed.data })
        .returning({ id: projectNotes.id });
      // Decisions are history: they also enter the timeline, linked to the note.
      if (parsed.data.type === "decision") {
        await logEvent(tx, {
          projectId: owned.id,
          type: "decision",
          title: parsed.data.title,
          metadata: { noteId: note!.id },
          createdById: user.id,
        });
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

export async function updateNote(projectId: string, noteId: string, input: NoteInput): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revise a anotação.", fieldErrors: fieldErrors(parsed.error) };
  const owned = await ownedProjectId(user.id, projectId);
  if (!owned || !isUuid(noteId)) return { ok: false, error: "Anotação não encontrada." };

  const [updated] = await db
    .update(projectNotes)
    .set(parsed.data)
    .where(and(eq(projectNotes.id, noteId), eq(projectNotes.projectId, owned.id)))
    .returning({ id: projectNotes.id });
  if (!updated) return { ok: false, error: "Anotação não encontrada." };
  await touchProject(owned.id);
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
