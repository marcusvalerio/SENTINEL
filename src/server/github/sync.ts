import "server-only";
import { and, eq, sql } from "drizzle-orm";
import {
  mapBranches,
  mapCommit,
  mapContributors,
  mapIssue,
  mapPullRequest,
  mapRelease,
  type ActivityRecord,
} from "@/domain/github-activity";
import { db } from "@/server/db/client";
import { githubActivity, projectGithubConnections } from "@/server/db/schema";
import { GITHUB_ERROR_MESSAGES, GithubError, createGithubClient } from "./client";

/** A sync that started this long ago without finishing is considered dead. */
const STALE_SYNC_MS = 2 * 60 * 1000;

export type SyncOutcome =
  | { ok: true; counts: Record<ActivityRecord["kind"], number>; syncedAt: Date }
  | { ok: false; error: string; code: "not_connected" | "in_progress" | "repository_changed" | GithubError["code"] };

/**
 * Pulls the connected repository's activity into github_activity.
 *
 * Idempotent (upsert by project + kind + external id), scoped to a single
 * project, and safe to call repeatedly — the same entry point will serve a
 * scheduled sync later. Authorization is the caller's job (see actions.ts).
 */
export async function syncProjectRepository(projectId: string, client = createGithubClient()): Promise<SyncOutcome> {
  const [connection] = await db.select().from(projectGithubConnections).where(eq(projectGithubConnections.projectId, projectId)).limit(1);
  if (!connection) return { ok: false, code: "not_connected", error: "Este projeto não possui repositório conectado." };

  // Claim the sync atomically so two clicks never run two syncs.
  const claimed = await db
    .update(projectGithubConnections)
    .set({ syncStatus: "syncing", syncStartedAt: new Date(), syncError: null })
    .where(
      and(
        eq(projectGithubConnections.id, connection.id),
        sql`(${projectGithubConnections.syncStatus} <> 'syncing' or ${projectGithubConnections.syncStartedAt} < now() - (${STALE_SYNC_MS / 1000} || ' seconds')::interval)`,
      ),
    )
    .returning({ id: projectGithubConnections.id });
  if (claimed.length === 0) return { ok: false, code: "in_progress", error: "Uma sincronização já está em andamento." };

  const ref = { owner: connection.githubOwner, name: connection.githubRepositoryName };
  try {
    const repository = await client.getRepository(ref);
    if (connection.githubRepositoryId && repository.id !== connection.githubRepositoryId) {
      // The name now points at a different repository: never mix histories.
      const error = "O nome conectado agora aponta para outro repositório. Reconecte o repositório correto.";
      await markFailed(connection.id, error);
      return { ok: false, code: "repository_changed", error };
    }

    const raw = await client.fetchActivity(ref);
    const records = [
      ...raw.commits.map(mapCommit),
      ...raw.pulls.map(mapPullRequest),
      ...raw.issues.map(mapIssue),
      ...raw.releases.map(mapRelease),
    ].filter((r): r is ActivityRecord => r !== null);

    const syncedAt = new Date();
    await db.transaction(async (tx) => {
      for (let i = 0; i < records.length; i += 100) {
        const batch = records.slice(i, i + 100).map((r) => ({ projectId, ...r, syncedAt }));
        await tx
          .insert(githubActivity)
          .values(batch)
          .onConflictDoUpdate({
            target: [githubActivity.projectId, githubActivity.kind, githubActivity.externalId],
            set: {
              number: sql`excluded.number`,
              title: sql`excluded.title`,
              body: sql`excluded.body`,
              state: sql`excluded.state`,
              authorLogin: sql`excluded.author_login`,
              authorAvatarUrl: sql`excluded.author_avatar_url`,
              url: sql`excluded.url`,
              closedAt: sql`excluded.closed_at`,
              metadata: sql`excluded.metadata`,
              syncedAt: sql`excluded.synced_at`,
            },
          });
      }
      await tx
        .update(projectGithubConnections)
        .set({
          syncStatus: "success",
          syncError: null,
          githubLastSyncedAt: syncedAt,
          githubRepositoryId: repository.id,
          githubOwner: repository.owner,
          githubRepositoryName: repository.name,
          githubRepositoryUrl: repository.url,
          githubDefaultBranch: repository.defaultBranch,
          isPrivate: repository.isPrivate,
          description: repository.description,
          lastPushedAt: repository.pushedAt ? new Date(repository.pushedAt) : null,
          verified: true,
          branches: mapBranches(raw.branches),
          contributors: mapContributors(raw.contributors),
        })
        .where(eq(projectGithubConnections.id, connection.id));
    });

    const counts = { commit: 0, pull_request: 0, issue: 0, release: 0 };
    for (const r of records) counts[r.kind] += 1;
    return { ok: true, counts, syncedAt };
  } catch (error) {
    const code = error instanceof GithubError ? error.code : "unavailable";
    const message = error instanceof GithubError ? error.message : GITHUB_ERROR_MESSAGES.unavailable;
    if (!(error instanceof GithubError)) console.error("[github] sync failed", error instanceof Error ? error.message : "unknown");
    await markFailed(connection.id, message);
    return { ok: false, code, error: message };
  }
}

async function markFailed(connectionId: string, message: string) {
  await db.update(projectGithubConnections).set({ syncStatus: "error", syncError: message }).where(eq(projectGithubConnections.id, connectionId));
}
