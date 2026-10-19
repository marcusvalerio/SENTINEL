"use server";

import { and, asc, eq, gte, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { calendarCommitments, projects } from "@/server/db/schema";

export type CalendarCommitment = {
  id: string;
  title: string;
  date: string;
  time: string;
  projectId: string | null;
  projectName: string | null;
  notes: string;
};

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validTime(value: string) {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export async function listCalendarCommitments(from?: string, to?: string): Promise<CalendarCommitment[]> {
  const user = await requireUser();
  const conditions = [eq(calendarCommitments.ownerId, user.id)];
  if (from && validDate(from)) conditions.push(gte(calendarCommitments.eventDate, from));
  if (to && validDate(to)) conditions.push(lte(calendarCommitments.eventDate, to));
  const rows = await db
    .select({
      id: calendarCommitments.id,
      title: calendarCommitments.title,
      date: calendarCommitments.eventDate,
      time: calendarCommitments.eventTime,
      projectId: calendarCommitments.projectId,
      projectName: projects.name,
      notes: calendarCommitments.notes,
    })
    .from(calendarCommitments)
    .leftJoin(projects, eq(calendarCommitments.projectId, projects.id))
    .where(and(...conditions))
    .orderBy(asc(calendarCommitments.eventDate), asc(calendarCommitments.eventTime));
  return rows.map((row) => ({ ...row, projectId: row.projectId ?? null, projectName: row.projectName ?? null, notes: row.notes ?? "" }));
}

export async function createCalendarCommitment(input: {
  title: string;
  date: string;
  time: string;
  projectId?: string | null;
  notes?: string;
}) {
  const user = await requireUser();
  const title = input.title.trim();
  if (!title || title.length > 180 || !validDate(input.date) || !validTime(input.time)) {
    throw new Error("Confira o título, a data e o horário do compromisso.");
  }
  const projectId: string | null = input.projectId || null;
  if (projectId) {
    const [ownedProject] = await db.select({ id: projects.id }).from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.ownerId, user.id))).limit(1);
    if (!ownedProject) throw new Error("O projeto selecionado não está disponível.");
  }
  await db.insert(calendarCommitments).values({
    ownerId: user.id,
    projectId,
    title,
    eventDate: input.date,
    eventTime: input.time,
    notes: input.notes?.trim().slice(0, 1200) || null,
  });
  revalidatePath("/calendar");
  return listCalendarCommitments();
}

export async function deleteCalendarCommitment(id: string) {
  const user = await requireUser();
  await db.delete(calendarCommitments).where(and(eq(calendarCommitments.id, id), eq(calendarCommitments.ownerId, user.id)));
  revalidatePath("/calendar");
  return listCalendarCommitments();
}
