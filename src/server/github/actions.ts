"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { parseRepositoryRef, repositoryUrl } from "@/domain/github";
import { requireUser } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { githubActivity, projectGithubConnections } from "@/server/db/schema";
import { logEvent, ownedProjectId, touchProject, type ActionResult } from "@/server/projects/internal";
import { GithubError, createGithubClient, type RepositoryMetadata } from "./client";
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

/**
 * Connects ONE repository to a project. If a different repository was
 * connected before, its synced activity is removed first — activity from two
 * repositories never coexists in one project.
 */
export async function connectRepository(projectId: string, reference: string): Promise<ActionResult<{ verified: boolean; synced: boolean; syncError?: string }>> {
  const user = await requireUser();
  const owned = await ownedProjectId(user.id, projectId);
  if (!owned) return { ok: false, error: "Projeto não encontrado." };

  const ref = parseRepositoryRef(reference);
  if (!ref) {
    return { ok: false, error: "Use o formato dono/repositório ou cole a URL do GitHub.", fieldErrors: { repository: "Formato não reconhecido." } };
  }

  const client = createGithubClient();
  let repo: RepositoryMetadata | null = null;
  try {
    repo = await client.getRepository(ref);
  } catch (error) {
    if (error instanceof GithubError && error.code === "not_found") {
      return {
        ok: false,
        error: client.hasToken
          ? "Repositório não encontrado. Confira o nome e se o token tem acesso a ele."
          : "Repositório não encontrado. Se ele for privado, configure GITHUB_TOKEN no servidor.",
        fieldErrors: { repository: "Repositório não encontrado." },
      };
    }
    // GitHub unreachable: keep the reference, flagged unverified. The first sync confirms it.
  }

  const [previous] = await db.select().from(projectGithubConnections).where(eq(projectGithubConnections.projectId, owned.id)).limit(1);
  const values = {
    projectId: owned.id,
    githubRepositoryId: repo?.id ?? null,
    githubOwner: repo?.owner ?? ref.owner,
    githubRepositoryName: repo?.name ?? ref.name,
    githubRepositoryUrl: repo?.url ?? repositoryUrl(ref),
    githubDefaultBranch: repo?.defaultBranch ?? null,
    isPrivate: repo?.isPrivate ?? null,
    description: repo?.description ?? null,
    lastPushedAt: repo?.pushedAt ? new Date(repo.pushedAt) : null,
    verified: Boolean(repo),
    githubConnectedAt: new Date(),
    githubLastSyncedAt: null,
    syncStatus: "never" as const,
    syncError: null,
    branches: [],
    contributors: [],
  };
  const sameRepository =
    previous &&
    (previous.githubRepositoryId && repo ? previous.githubRepositoryId === repo.id : previous.githubOwner.toLowerCase() === values.githubOwner.toLowerCase() && previous.githubRepositoryName.toLowerCase() === values.githubRepositoryName.toLowerCase());

  await db.transaction(async (tx) => {
    if (previous && !sameRepository) await tx.delete(githubActivity).where(eq(githubActivity.projectId, owned.id));
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

  // First sync right away so the project immediately shows real activity.
  const sync = repo ? await syncProjectRepository(owned.id, client) : null;

  revalidatePath(`/projects/${owned.id}`, "layout");
  revalidatePath("/");
  return { ok: true, verified: values.verified, synced: Boolean(sync?.ok), syncError: sync && !sync.ok ? sync.error : undefined };
}

export async function syncRepository(projectId: string): Promise<ActionResult<{ counts: Record<string, number>; syncedAt: string }>> {
  const user = await requireUser();
  const owned = await ownedProjectId(user.id, projectId);
  if (!owned) return { ok: false, error: "Projeto não encontrado." };
  const result = await syncProjectRepository(owned.id);
  revalidatePath(`/projects/${owned.id}`, "layout");
  revalidatePath("/");
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
  revalidatePath("/");
  return { ok: true };
}
