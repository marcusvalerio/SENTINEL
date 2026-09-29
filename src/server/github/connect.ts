import "server-only";
import { eq } from "drizzle-orm";
import { parseRepositoryRef, repositoryUrl } from "@/domain/github";
import { db } from "@/server/db/client";
import { githubActivity, projectGithubConnections } from "@/server/db/schema";
import { logEvent, touchProject, type ActionResult } from "@/server/projects/internal";
import { GithubError, createGithubClient, type RepositoryMetadata } from "./client";
import { syncProjectRepository } from "./sync";

/**
 * Connects ONE repository (the caller has already authorized the project) to a project. If a different repository was
 * connected before, its synced activity is removed first — activity from two
 * repositories never coexists in one project.
 */
export async function connectRepositoryForProject(userId: string, projectId: string, reference: string): Promise<ActionResult<{ verified: boolean; synced: boolean; syncError?: string }>> {
  const owned = { id: projectId };
  const user = { id: userId };

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

  return { ok: true, verified: values.verified, synced: Boolean(sync?.ok), syncError: sync && !sync.ok ? sync.error : undefined };
}

