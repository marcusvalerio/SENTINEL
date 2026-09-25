import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Integration tests against a real PostgreSQL (DATABASE_URL). They create two
 * isolated users and clean everything up afterwards.
 */
const hasDb = Boolean(process.env.DATABASE_URL);
const d = hasDb ? describe : describe.skip;

const { db } = await import("@/server/db/client");
const schema = await import("@/server/db/schema");
const { getProject } = await import("@/server/projects/queries");
const { globalSearch } = await import("@/server/search/search");
const { syncProjectRepository } = await import("@/server/github/sync");
const { GithubError } = await import("@/server/github/client");

const suffix = Math.random().toString(36).slice(2, 8);
let alice: string, bob: string, aliceProject: string, bobProject: string;

function fakeClient(overrides: Partial<{ repoId: number; fail: InstanceType<typeof GithubError> | null; commits: number }> = {}) {
  const { repoId = 42, fail = null, commits = 3 } = overrides;
  return {
    hasToken: false,
    async getRepository() {
      if (fail) throw fail;
      return { id: repoId, owner: "marcus", name: "lunar-wms", url: "https://github.com/marcus/lunar-wms", defaultBranch: "main", isPrivate: false, description: "WMS", pushedAt: "2026-09-20T00:00:00Z" };
    },
    async listRepositories() {
      return [];
    },
    async fetchActivity() {
      return {
        commits: Array.from({ length: commits }, (_, i) => ({ sha: `sha${i}xxxxxxx`, html_url: `u${i}`, author: { login: "marcus" }, commit: { message: `commit QRcode ${i}`, author: { date: `2026-09-2${i}T10:00:00Z` } } })),
        pulls: [{ id: 900, number: 1, title: "Leitor QR", state: "closed", merged_at: "2026-09-21T00:00:00Z", created_at: "2026-09-20T00:00:00Z", html_url: "p1", user: { login: "marcus" } }],
        issues: [{ id: 901, number: 2, title: "Bug", state: "open", created_at: "2026-09-20T00:00:00Z", html_url: "i1", labels: [] }],
        releases: [{ id: 902, tag_name: "v0.1.0", published_at: "2026-09-22T00:00:00Z", html_url: "r1" }],
        branches: [{ name: "main", commit: { sha: "abc1234567" }, protected: true }],
        contributors: [{ login: "marcus", contributions: 3, avatar_url: null, html_url: "x" }],
      };
    },
  };
}

d("intelligence (integration)", () => {
  beforeAll(async () => {
    const users = await db
      .insert(schema.users)
      .values([
        { email: `alice-${suffix}@test.local`, name: "Alice", passwordHash: "x" },
        { email: `bob-${suffix}@test.local`, name: "Bob", passwordHash: "x" },
      ])
      .returning({ id: schema.users.id });
    [alice, bob] = [users[0]!.id, users[1]!.id];
    const projects = await db
      .insert(schema.projects)
      .values([
        { ownerId: alice, name: `Leitor QR Code ${suffix}`, type: "saas", primaryGoal: "Ler QR code no armazém" },
        { ownerId: bob, name: `Projeto do Bob QR ${suffix}`, type: "saas", primaryGoal: "Segredo do Bob sobre QR code" },
      ])
      .returning({ id: schema.projects.id });
    [aliceProject, bobProject] = [projects[0]!.id, projects[1]!.id];
    await db.insert(schema.projectNotes).values([
      { projectId: aliceProject, title: "Decisão sobre câmera", content: "Usar a câmera para QR code", type: "decision", tags: ["produto"] },
      { projectId: bobProject, title: "Nota secreta QR", content: "QR code do Bob", type: "note" },
    ]);
    await db.insert(schema.projectGithubConnections).values({
      projectId: aliceProject,
      githubOwner: "marcus",
      githubRepositoryName: "lunar-wms",
      githubRepositoryUrl: "https://github.com/marcus/lunar-wms",
    });
  });

  afterAll(async () => {
    if (!alice) return;
    await db.delete(schema.projects).where(inArray(schema.projects.ownerId, [alice, bob]));
    await db.delete(schema.users).where(inArray(schema.users.id, [alice, bob]));
  });

  it("never returns another user's project", async () => {
    expect(await getProject(alice, aliceProject)).not.toBeNull();
    expect(await getProject(alice, bobProject)).toBeNull();
    expect(await getProject(bob, aliceProject)).toBeNull();
  });

  it("global search finds only the owner's memory, accent-insensitively", async () => {
    const result = await globalSearch(alice, "camera");
    const groups = Object.fromEntries(result.groups.map((g) => [g.group, g]));
    expect(groups.decisions?.hits[0]?.title).toBe("Decisão sobre câmera");
    const qr = await globalSearch(alice, "qr code");
    const ids = qr.groups.flatMap((g) => g.hits.map((h) => h.projectId));
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.every((id) => id === aliceProject)).toBe(true);
  });

  it("treats LIKE wildcards literally", async () => {
    const result = await globalSearch(alice, "%%");
    expect(result.total).toBe(0);
  });

  it("syncs activity idempotently and scoped to the project", async () => {
    const first = await syncProjectRepository(aliceProject, fakeClient() as never);
    expect(first.ok && first.counts).toEqual({ commit: 3, pull_request: 1, issue: 1, release: 1 });
    const second = await syncProjectRepository(aliceProject, fakeClient() as never);
    expect(second.ok).toBe(true);
    const rows = await db.select().from(schema.githubActivity).where(eq(schema.githubActivity.projectId, aliceProject));
    expect(rows).toHaveLength(6);
    const [connection] = await db.select().from(schema.projectGithubConnections).where(eq(schema.projectGithubConnections.projectId, aliceProject));
    expect(connection).toMatchObject({ syncStatus: "success", githubRepositoryId: 42, verified: true });
    expect(connection!.branches).toEqual([{ name: "main", sha: "abc1234", protected: true }]);
    const bobRows = await db.select().from(schema.githubActivity).where(eq(schema.githubActivity.projectId, bobProject));
    expect(bobRows).toHaveLength(0);
  });

  it("finds synced activity in global search", async () => {
    const result = await globalSearch(alice, "QRcode");
    expect(result.groups.find((g) => g.group === "activity")?.count).toBe(3);
  });

  it("refuses to mix histories when the name points to another repository", async () => {
    const result = await syncProjectRepository(aliceProject, fakeClient({ repoId: 999 }) as never);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.code).toBe("repository_changed");
    const rows = await db.select().from(schema.githubActivity).where(eq(schema.githubActivity.projectId, aliceProject));
    expect(rows).toHaveLength(6);
  });

  it("records a human error when GitHub fails", async () => {
    const result = await syncProjectRepository(aliceProject, fakeClient({ fail: new GithubError("rate_limited", "Limite atingido") }) as never);
    expect(!result.ok && result.code).toBe("rate_limited");
    const [connection] = await db.select().from(schema.projectGithubConnections).where(eq(schema.projectGithubConnections.projectId, aliceProject));
    expect(connection).toMatchObject({ syncStatus: "error", syncError: "Limite atingido" });
  });

  it("reports when there is nothing connected", async () => {
    const result = await syncProjectRepository(bobProject, fakeClient() as never);
    expect(!result.ok && result.code).toBe("not_connected");
  });
});
