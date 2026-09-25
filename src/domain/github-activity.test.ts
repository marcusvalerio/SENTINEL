import { describe, expect, it } from "vitest";
import { mapBranches, mapCommit, mapContributors, mapIssue, mapPullRequest, mapRelease } from "./github-activity";

describe("GitHub payload mapping", () => {
  it("maps a commit, splitting title and body", () => {
    const r = mapCommit({
      sha: "abcdef1234567890",
      html_url: "https://github.com/o/r/commit/abcdef1",
      author: { login: "marcus", avatar_url: "https://a/1" },
      commit: { message: "feat: add sync\n\nDetails here", author: { name: "Marcus", date: "2026-09-20T10:00:00Z" } },
    });
    expect(r).toMatchObject({ kind: "commit", externalId: "abcdef1234567890", title: "feat: add sync", body: "Details here", authorLogin: "marcus", metadata: { sha: "abcdef1" } });
  });

  it("rejects malformed commits instead of inventing data", () => {
    expect(mapCommit({ sha: "x" })).toBeNull();
    expect(mapCommit({ commit: { message: "m", author: { date: "2026-01-01T00:00:00Z" } } })).toBeNull();
  });

  it("derives pull request state", () => {
    const base = { id: 1, number: 7, title: "PR", created_at: "2026-09-01T00:00:00Z", html_url: "u", user: { login: "a" } };
    expect(mapPullRequest({ ...base, state: "open" })?.state).toBe("open");
    expect(mapPullRequest({ ...base, state: "open", draft: true })?.state).toBe("draft");
    expect(mapPullRequest({ ...base, state: "closed" })?.state).toBe("closed");
    const merged = mapPullRequest({ ...base, state: "closed", merged_at: "2026-09-02T00:00:00Z" });
    expect(merged?.state).toBe("merged");
    expect(merged?.closedAt?.toISOString()).toBe("2026-09-02T00:00:00.000Z");
  });

  it("skips pull requests returned by the issues endpoint", () => {
    expect(mapIssue({ id: 1, created_at: "2026-09-01T00:00:00Z", pull_request: {} })).toBeNull();
    const issue = mapIssue({ id: 2, number: 3, title: "Bug", created_at: "2026-09-01T00:00:00Z", state: "open", labels: [{ name: "bug" }], html_url: "u" });
    expect(issue).toMatchObject({ kind: "issue", state: "open", metadata: { labels: ["bug"] } });
  });

  it("ignores draft releases and marks prereleases", () => {
    expect(mapRelease({ id: 1, draft: true, published_at: "2026-09-01T00:00:00Z" })).toBeNull();
    expect(mapRelease({ id: 2, tag_name: "v1.0.0", prerelease: true, published_at: "2026-09-01T00:00:00Z", html_url: "u" })).toMatchObject({ title: "v1.0.0", state: "prerelease" });
  });

  it("maps branches and drops bot contributors", () => {
    expect(mapBranches([{ name: "main", commit: { sha: "1234567890" }, protected: true }])).toEqual([{ name: "main", sha: "1234567", protected: true }]);
    expect(mapContributors([{ login: "a", contributions: 3 }, { login: "bot", type: "Bot", contributions: 9 }])).toHaveLength(1);
  });
});
