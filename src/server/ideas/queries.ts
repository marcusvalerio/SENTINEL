import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { ideas, projects } from "@/server/db/schema";

export async function countInbox(ownerId: string) {
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(ideas).where(and(eq(ideas.ownerId, ownerId), eq(ideas.status, "inbox")));
  return row?.n ?? 0;
}

export function listIdeas(ownerId: string) {
  return db
    .select({
      id: ideas.id,
      text: ideas.text,
      status: ideas.status,
      createdAt: ideas.createdAt,
      updatedAt: ideas.updatedAt,
      convertedKind: ideas.convertedKind,
      convertedId: ideas.convertedId,
      project: { id: projects.id, name: projects.name },
    })
    .from(ideas)
    .leftJoin(projects, eq(projects.id, ideas.projectId))
    .where(eq(ideas.ownerId, ownerId))
    .orderBy(desc(ideas.createdAt))
    .limit(300);
}
