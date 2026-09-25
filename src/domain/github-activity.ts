/**
 * Development activity synchronised from GitHub.
 *
 * One table holds every kind of activity (commit, pull request, issue,
 * release) keyed by (project, kind, external id) so a sync is an idempotent
 * upsert and data from one repository can never bleed into another project.
 */
export const GITHUB_ACTIVITY_KINDS = ["commit", "pull_request", "issue", "release"] as const;
export type GithubActivityKind = (typeof GITHUB_ACTIVITY_KINDS)[number];

export const GITHUB_ACTIVITY_LABELS: Record<GithubActivityKind, { one: string; many: string }> = {
  commit: { one: "Commit", many: "Commits" },
  pull_request: { one: "Pull request", many: "Pull requests" },
  issue: { one: "Issue", many: "Issues" },
  release: { one: "Release", many: "Releases" },
};

export const SYNC_STATUSES = ["never", "syncing", "success", "error"] as const;
export type SyncStatus = (typeof SYNC_STATUSES)[number];

export type ActivityState = "open" | "closed" | "merged" | "draft" | "published" | "prerelease" | null;

export type ActivityRecord = {
  kind: GithubActivityKind;
  externalId: string;
  number: number | null;
  title: string;
  body: string | null;
  state: ActivityState;
  authorLogin: string | null;
  authorAvatarUrl: string | null;
  url: string;
  occurredAt: Date;
  closedAt: Date | null;
  metadata: Record<string, unknown>;
};

type Json = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v : null);
const date = (v: unknown) => (typeof v === "string" && !Number.isNaN(Date.parse(v)) ? new Date(v) : null);
const login = (v: unknown) => (v && typeof v === "object" ? str((v as Json).login) : null);
const avatar = (v: unknown) => (v && typeof v === "object" ? str((v as Json).avatar_url) : null);
const clip = (v: string | null, max: number) => (v && v.length > max ? `${v.slice(0, max - 1)}…` : v);

export function mapCommit(c: Json): ActivityRecord | null {
  const sha = str(c.sha);
  const commit = (c.commit ?? {}) as Json;
  const message = str(commit.message) ?? "";
  const when = date((commit.author as Json | undefined)?.date) ?? date((commit.committer as Json | undefined)?.date);
  if (!sha || !when) return null;
  const [title, ...rest] = message.split("\n");
  return {
    kind: "commit",
    externalId: sha,
    number: null,
    title: clip(title?.trim() || sha.slice(0, 7), 300)!,
    body: clip(rest.join("\n").trim() || null, 4000),
    state: null,
    authorLogin: login(c.author) ?? str((commit.author as Json | undefined)?.name),
    authorAvatarUrl: avatar(c.author),
    url: str(c.html_url) ?? "",
    occurredAt: when,
    closedAt: null,
    metadata: { sha: sha.slice(0, 7) },
  };
}

export function mapPullRequest(p: Json): ActivityRecord | null {
  const id = p.id;
  const created = date(p.created_at);
  if (typeof id !== "number" || !created) return null;
  const merged = date(p.merged_at);
  const state: ActivityState = merged ? "merged" : p.draft ? "draft" : p.state === "closed" ? "closed" : "open";
  return {
    kind: "pull_request",
    externalId: String(id),
    number: typeof p.number === "number" ? p.number : null,
    title: clip(str(p.title) ?? "Sem título", 300)!,
    body: clip(str(p.body), 4000),
    state,
    authorLogin: login(p.user),
    authorAvatarUrl: avatar(p.user),
    url: str(p.html_url) ?? "",
    occurredAt: created,
    closedAt: merged ?? date(p.closed_at),
    metadata: { head: str((p.head as Json | undefined)?.ref), base: str((p.base as Json | undefined)?.ref), updatedAt: str(p.updated_at) },
  };
}

export function mapIssue(i: Json): ActivityRecord | null {
  // The issues endpoint also returns pull requests — those are synced separately.
  if (i.pull_request) return null;
  const id = i.id;
  const created = date(i.created_at);
  if (typeof id !== "number" || !created) return null;
  const labels = Array.isArray(i.labels) ? i.labels.map((l) => (l && typeof l === "object" ? str((l as Json).name) : str(l))).filter(Boolean) : [];
  return {
    kind: "issue",
    externalId: String(id),
    number: typeof i.number === "number" ? i.number : null,
    title: clip(str(i.title) ?? "Sem título", 300)!,
    body: clip(str(i.body), 4000),
    state: i.state === "closed" ? "closed" : "open",
    authorLogin: login(i.user),
    authorAvatarUrl: avatar(i.user),
    url: str(i.html_url) ?? "",
    occurredAt: created,
    closedAt: date(i.closed_at),
    metadata: { labels, comments: typeof i.comments === "number" ? i.comments : 0 },
  };
}

export function mapRelease(r: Json): ActivityRecord | null {
  const id = r.id;
  if (typeof id !== "number" || r.draft) return null;
  const when = date(r.published_at) ?? date(r.created_at);
  if (!when) return null;
  return {
    kind: "release",
    externalId: String(id),
    number: null,
    title: clip(str(r.name) || str(r.tag_name) || "Release", 300)!,
    body: clip(str(r.body), 4000),
    state: r.prerelease ? "prerelease" : "published",
    authorLogin: login(r.author),
    authorAvatarUrl: avatar(r.author),
    url: str(r.html_url) ?? "",
    occurredAt: when,
    closedAt: null,
    metadata: { tag: str(r.tag_name) },
  };
}

export type BranchSnapshot = { name: string; sha: string; protected: boolean };
export type ContributorSnapshot = { login: string; avatarUrl: string | null; contributions: number; url: string | null };

export function mapBranches(list: unknown): BranchSnapshot[] {
  if (!Array.isArray(list)) return [];
  return list
    .map((b: Json) => ({ name: str(b.name) ?? "", sha: str((b.commit as Json | undefined)?.sha)?.slice(0, 7) ?? "", protected: Boolean(b.protected) }))
    .filter((b) => b.name);
}

export function mapContributors(list: unknown): ContributorSnapshot[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter((c: Json) => c.type !== "Bot")
    .map((c: Json) => ({ login: str(c.login) ?? "", avatarUrl: str(c.avatar_url), contributions: typeof c.contributions === "number" ? c.contributions : 0, url: str(c.html_url) }))
    .filter((c) => c.login);
}
