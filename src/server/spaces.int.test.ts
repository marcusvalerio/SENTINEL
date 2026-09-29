import { inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * SENTINEL 3.0 spaces against a real PostgreSQL: every loader stays inside
 * its owner, and derived numbers come only from stored rows.
 */
const hasDb = Boolean(process.env.DATABASE_URL);
const d = hasDb ? describe : describe.skip;

const { db } = await import("@/server/db/client");
const schema = await import("@/server/db/schema");
const { loadHealthInputs, projectHealth } = await import("@/server/intelligence/health");
const { loadCreationHistory } = await import("@/server/intelligence/creation-history");
const { listSubscriptions, subscriptionsForProject } = await import("@/server/subscriptions/queries");
const { weekCounts } = await import("@/server/projects/brief");
const { listDecisions } = await import("@/server/decisions/queries");

const suffix = Math.random().toString(36).slice(2, 8);
let alice: string, bob: string, aliceProject: string, bobProject: string;

d("spaces (integration)", () => {
  beforeAll(async () => {
    const users = await db
      .insert(schema.users)
      .values([
        { email: `alice3-${suffix}@test.local`, name: "Alice", passwordHash: "x" },
        { email: `bob3-${suffix}@test.local`, name: "Bob", passwordHash: "x" },
      ])
      .returning({ id: schema.users.id });
    [alice, bob] = [users[0]!.id, users[1]!.id];
    const projects = await db
      .insert(schema.projects)
      .values([
        { ownerId: alice, name: `Alice ${suffix}`, type: "saas", primaryGoal: "A", status: "in_development" },
        { ownerId: bob, name: `Bob ${suffix}`, type: "website", primaryGoal: "B", status: "completed", source: "github_import" },
      ])
      .returning({ id: schema.projects.id });
    [aliceProject, bobProject] = [projects[0]!.id, projects[1]!.id];

    const overdue = "2020-01-01";
    await db.insert(schema.projectMilestones).values([
      { projectId: aliceProject, name: "Atrasado", status: "active", dueOn: overdue },
      { projectId: bobProject, name: "Do Bob", status: "active", dueOn: overdue },
    ]);
    await db.insert(schema.projectDecisions).values([
      { projectId: aliceProject, title: "Aberta", status: "proposed", createdAt: new Date(Date.now() - 10 * 86_400_000) },
      { projectId: aliceProject, title: "Decidida", status: "decided" },
      { projectId: bobProject, title: "Do Bob", status: "proposed" },
    ]);
    await db.insert(schema.projectFeatures).values([
      { projectId: aliceProject, name: "Feita", status: "done", completedAt: new Date() },
      { projectId: aliceProject, name: "Antiga", status: "done", completedAt: new Date(Date.now() - 30 * 86_400_000) },
    ]);
    await db.insert(schema.projectNotes).values({ projectId: aliceProject, title: "Nota", content: "", type: "note" });

    const subs = await db
      .insert(schema.subscriptions)
      .values([
        { ownerId: alice, service: "Claude", billing: "monthly", amountCents: 11000, isAiBase: true },
        { ownerId: bob, service: "Segredo", billing: "monthly", amountCents: 999 },
      ])
      .returning({ id: schema.subscriptions.id });
    // A link from Bob's subscription to Alice's project must never surface for Alice.
    await db.insert(schema.subscriptionProjects).values([
      { subscriptionId: subs[0]!.id, projectId: aliceProject },
      { subscriptionId: subs[1]!.id, projectId: aliceProject },
    ]);
  });

  afterAll(async () => {
    if (!alice) return;
    await db.delete(schema.subscriptions).where(inArray(schema.subscriptions.ownerId, [alice, bob]));
    await db.delete(schema.projects).where(inArray(schema.projects.ownerId, [alice, bob]));
    await db.delete(schema.users).where(inArray(schema.users.id, [alice, bob]));
  });

  it("health only loads the owner's projects", async () => {
    const inputs = await loadHealthInputs(alice);
    expect(inputs.map((i) => i.project.id)).toEqual([aliceProject]);
    expect(await projectHealth(alice, bobProject)).toBeNull();
  });

  it("health explains overdue milestones and stale open decisions", async () => {
    const health = await projectHealth(alice, aliceProject);
    expect(health!.signals.find((s) => s.key === "roadmap")?.state).toBe("risk");
    const titles = health!.attention.map((a) => a.title).join(" | ");
    expect(titles).toContain("Atrasado");
    expect(titles).toContain("Aberta");
    expect(titles).not.toContain("Do Bob");
    for (const a of health!.attention) expect(a.reason.length).toBeGreaterThan(0);
  });

  it("week counts use only the last 7 days", async () => {
    const week = await weekCounts(aliceProject);
    expect(week).toMatchObject({ featuresDone: 1, notes: 1, decisions: 1, commits: 0 });
  });

  it("lists decisions open first", async () => {
    const list = await listDecisions(aliceProject);
    expect(list.map((d) => d.status)).toEqual(["proposed", "decided"]);
  });

  it("subscriptions never leak across owners, even through project links", async () => {
    const mine = await listSubscriptions(alice);
    expect(mine.map((s) => s.service)).toEqual(["Claude"]);
    const theirs = await listSubscriptions(bob);
    expect(theirs.map((s) => s.service)).toEqual(["Segredo"]);
    // Bob's subscription links to Alice's project, but Bob can't see that project's name.
    expect(theirs[0]!.projects).toEqual([]);
    const forProject = await subscriptionsForProject(alice, aliceProject);
    expect(forProject.linked.map((s) => s.service)).toEqual(["Claude"]);
    expect(forProject.aiBase.map((s) => s.service)).toEqual(["Claude"]);
  });

  it("creation history counts only the owner's work", async () => {
    const h = await loadCreationHistory(alice);
    expect(h.totals).toMatchObject({ projects: 1, completed: 0, featuresDone: 2, notes: 1, decisions: 2 });
    expect(h.medianDaysToComplete).toBeNull();
    const b = await loadCreationHistory(bob);
    expect(b.totals).toMatchObject({ projects: 1, completed: 1, decisions: 1 });
    expect(b.bySource.github_import).toBe(1);
  });
});
