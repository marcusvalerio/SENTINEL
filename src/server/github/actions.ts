"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { githubActivity, projectGithubConnections } from "@/server/db/schema";
import { logEvent, ownedProjectId, type ActionResult } from "@/server/projects/internal";
import { GithubError, createGithubClient, type RepositoryMetadata } from "./client";
import { connectRepositoryForProject } from "./connect";
import { syncProjectRepository } from "./sync";

export type RepositoryOption = Pick<RepositoryMetadata, "id" | "owner" | "name" | "isPrivate" | "description" | "pushedAt">;

/**
 * Lists repositories to choose from. With a server token: everything that
 * token can see. Without one: the public repositories of `owner`.
 */
export async function listRepositories(owner: string): Promise<ActionResult<{ repositories: RepositoryOption[]; scope: "token" | "public" }>> {
  await requireUser();
  const client = createGithubClient();
  const cleaned = owner.trim().replace(/^@/, "");
  if (!client.hasToken && !/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(cleaned)) {
    return { ok: false, error: "Informe um usuário ou organização do GitHub." };
  }
  try {
    const list = await client.listRepositories(client.hasToken && !cleaned ? null : cleaned);
    const filtered = cleaned && client.hasToken ? list.filter((r) => r.owner.toLowerCase() === cleaned.toLowerCase()) : list;
    return {
      ok: true,
      scope: client.hasToken ? "token" : "public",
      repositories: filtered.map(({ id, owner, name, isPrivate, description, pushedAt }) => ({ id, owner, name, isPrivate, description, pushedAt })),
    };
  } catch (error) {
    return { ok: false, error: error instanceof GithubError ? error.message : "Não foi possível listar os repositórios agora." };
  }
}

/** Connects ONE repository to a project and syncs it right away. */
export async function connectRepository(projectId: string, reference: string): Promise<ActionResult<{ verified: boolean; synced: boolean; syncError?: string }>> {
  const user = await requireUser();
  const owned = await ownedProjectId(user.id, projectId);
  if (!owned) return { ok: false, error: "Projeto não encontrado." };
  const result = await connectRepositoryForProject(user.id, owned.id, reference);
  revalidatePath(`/projects/${owned.id}`, "layout");
  revalidatePath("/", "layout");
  return result;
}

export async function syncRepository(projectId: string): Promise<ActionResult<{ counts: Record<string, number>; syncedAt: string }>> {
  const user = await requireUser();
  const owned = await ownedProjectId(user.id, projectId);
  if (!owned) return { ok: false, error: "Projeto não encontrado." };
  const result = await syncProjectRepository(owned.id);
  revalidatePath(`/projects/${owned.id}`, "layout");
  revalidatePath("/", "layout");
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, counts: result.counts, syncedAt: result.syncedAt.toISOString() };
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
    await tx.delete(githubActivity).where(eq(githubActivity.projectId, owned.id));
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
  revalidatePath("/", "layout");
  return { ok: true };
}
