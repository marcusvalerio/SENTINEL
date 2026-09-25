"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { parseRepositoryRef, repositoryUrl } from "@/domain/github";
import { requireUser } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { projectGithubConnections } from "@/server/db/schema";
import { logEvent, ownedProjectId, touchProject, type ActionResult } from "@/server/projects/internal";
import { lookupRepository } from "./client";

/**
 * Connects ONE repository to a project (replacing any previous one). The
 * repository is verified against the GitHub API when possible; when GitHub is
 * unreachable the reference is still stored, flagged as unverified.
 */
export async function connectRepository(projectId: string, reference: string): Promise<ActionResult<{ verified: boolean }>> {
  const user = await requireUser();
  const owned = await ownedProjectId(user.id, projectId);
  if (!owned) return { ok: false, error: "Projeto não encontrado." };

  const ref = parseRepositoryRef(reference);
  if (!ref) {
    return { ok: false, error: "Use o formato dono/repositório ou cole a URL do GitHub.", fieldErrors: { repository: "Formato não reconhecido." } };
  }

  const lookup = await lookupRepository(ref);
  if (lookup.status === "not_found") {
    return {
      ok: false,
      error: process.env.GITHUB_TOKEN
        ? "Repositório não encontrado. Confira o nome e se o token tem acesso a ele."
        : "Repositório não encontrado. Se ele for privado, configure GITHUB_TOKEN no servidor.",
      fieldErrors: { repository: "Repositório não encontrado." },
    };
  }

  const repo = lookup.status === "found" ? lookup.repository : null;
  const values = {
    projectId: owned.id,
    githubRepositoryId: repo?.id ?? null,
    githubOwner: repo?.owner ?? ref.owner,
    githubRepositoryName: repo?.name ?? ref.name,
    githubRepositoryUrl: repo?.url ?? repositoryUrl(ref),
    githubDefaultBranch: repo?.defaultBranch ?? null,
    isPrivate: repo?.isPrivate ?? null,
    verified: Boolean(repo),
    githubConnectedAt: new Date(),
    githubLastSyncedAt: null,
  };

  await db.transaction(async (tx) => {
    await tx.insert(projectGithubConnections).values(values).onConflictDoUpdate({ target: projectGithubConnections.projectId, set: values });
    await logEvent(tx, {
      projectId: owned.id,
      type: "github_connected",
      title: `Repositório conectado: ${values.githubOwner}/${values.githubRepositoryName}`,
      metadata: { owner: values.githubOwner, name: values.githubRepositoryName, verified: values.verified },
      createdById: user.id,
    });
    await touchProject(owned.id, tx);
  });

  revalidatePath(`/projects/${owned.id}`, "layout");
  revalidatePath("/");
  return { ok: true, verified: values.verified };
}

export async function disconnectRepository(projectId: string): Promise<ActionResult> {
  const user = await requireUser();
  const owned = await ownedProjectId(user.id, projectId);
  if (!owned) return { ok: false, error: "Projeto não encontrado." };

  await db.transaction(async (tx) => {
    const [removed] = await tx
      .delete(projectGithubConnections)
      .where(eq(projectGithubConnections.projectId, owned.id))
      .returning({ owner: projectGithubConnections.githubOwner, name: projectGithubConnections.githubRepositoryName });
    if (removed) {
      await logEvent(tx, {
        projectId: owned.id,
        type: "github_disconnected",
        title: `Repositório desconectado: ${removed.owner}/${removed.name}`,
        createdById: user.id,
      });
    }
  });
  revalidatePath(`/projects/${owned.id}`, "layout");
  revalidatePath("/");
  return { ok: true };
}
