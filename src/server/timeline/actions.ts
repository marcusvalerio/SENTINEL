"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MANUAL_TIMELINE_EVENT_TYPES } from "@/domain/timeline";
import { requireUser } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { projectTimelineEvents } from "@/server/db/schema";
import { logEvent, ownedProjectId, touchProject, type ActionResult } from "@/server/projects/internal";
import { isUuid } from "@/server/projects/queries";

const eventSchema = z.object({
  type: z.enum(MANUAL_TIMELINE_EVENT_TYPES, { error: "Escolha o tipo do evento." }),
  title: z.string().trim().min(1, "Descreva o evento em poucas palavras.").max(200, "Use no máximo 200 caracteres."),
  description: z.string().trim().max(8000).transform((v) => v || null),
  occurredOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data do evento.")
    .refine((v) => !Number.isNaN(Date.parse(v)), "Informe uma data válida."),
});

export type TimelineEventInput = z.input<typeof eventSchema>;

export async function addTimelineEvent(projectId: string, input: TimelineEventInput): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Revise o evento.", fieldErrors: Object.fromEntries(parsed.error.issues.map((i) => [i.path.join("."), i.message])) };
  }
  const owned = await ownedProjectId(user.id, projectId);
  if (!owned) return { ok: false, error: "Projeto não encontrado." };

  const { occurredOn, ...event } = parsed.data;
  await logEvent(db, {
    projectId: owned.id,
    ...event,
    source: "manual",
    // Calendar date anchored at noon (São Paulo) so it never slips a day.
    occurredAt: new Date(`${occurredOn}T12:00:00-03:00`),
    createdById: user.id,
  });
  await touchProject(owned.id);
  revalidatePath(`/projects/${owned.id}`, "layout");
  return { ok: true };
}

export async function deleteTimelineEvent(projectId: string, eventId: string): Promise<ActionResult> {
  const user = await requireUser();
  const owned = await ownedProjectId(user.id, projectId);
  if (!owned || !isUuid(eventId)) return { ok: false, error: "Evento não encontrado." };
  // System events are history written by SENTINEL itself and cannot be removed.
  await db
    .delete(projectTimelineEvents)
    .where(and(eq(projectTimelineEvents.id, eventId), eq(projectTimelineEvents.projectId, owned.id), eq(projectTimelineEvents.source, "manual")));
  revalidatePath(`/projects/${owned.id}`, "layout");
  return { ok: true };
}
