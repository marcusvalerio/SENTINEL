import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { preProjects, projects } from "@/server/db/schema";
import { isUuid } from "@/server/projects/queries";

export function listPreProjects(ownerId: string) {
  return db
    .select({
      id: preProjects.id,
      title: preProjects.title,
      status: preProjects.status,
      requesterName: preProjects.requesterName,
      requesterOrg: preProjects.requesterOrg,
      idea: preProjects.idea,
      budget: preProjects.budget,
      deadline: preProjects.deadline,
      updatedAt: preProjects.updatedAt,
      statusChangedAt: preProjects.statusChangedAt,
      convertedProjectId: preProjects.convertedProjectId,
    })
    .from(preProjects)
    .where(eq(preProjects.ownerId, ownerId))
    .orderBy(desc(preProjects.updatedAt));
}

export async function getPreProject(ownerId: string, id: string) {
  if (!isUuid(id)) return null;
  const [row] = await db
    .select({ pre: preProjects, projectName: projects.name })
    .from(preProjects)
    .leftJoin(projects, eq(projects.id, preProjects.convertedProjectId))
    .where(and(eq(preProjects.id, id), eq(preProjects.ownerId, ownerId)));
  return row ? { ...row.pre, convertedProjectName: row.projectName } : null;
}
