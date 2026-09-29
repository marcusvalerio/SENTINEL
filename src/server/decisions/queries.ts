import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { projectDecisions } from "@/server/db/schema";

/** Caller owns the project (via loadProject). Open decisions first, newest first. */
export function listDecisions(projectId: string) {
  return db
    .select()
    .from(projectDecisions)
    .where(eq(projectDecisions.projectId, projectId))
    .orderBy(sql`case when ${projectDecisions.status} = 'proposed' then 0 else 1 end`, desc(projectDecisions.createdAt));
}

export type DecisionRow = Awaited<ReturnType<typeof listDecisions>>[number];
