import { describe, expect, it } from "vitest";
import { historyInsights, monthlyBuckets, type HistoryProject } from "./creation-history";

const now = new Date("2026-09-29T15:00:00Z");
const p = (over: Partial<HistoryProject>): HistoryProject => ({
  id: crypto.randomUUID(),
  name: "P",
  type: "saas",
  status: "in_development",
  source: "manual",
  createdAt: new Date("2026-09-10T15:00:00Z"),
  statusChangedAt: new Date("2026-09-10T15:00:00Z"),
  ...over,
});
const empty = { projects: [], featuresDone: [], notes: [], decisions: 0, preProjects: { total: 0, converted: 0 }, ideas: { total: 0, converted: 0 }, now };

describe("historyInsights", () => {
  it("returns nulls instead of estimates when there is no data", () => {
    const h = historyInsights(empty);
    expect(h.totals.projects).toBe(0);
    expect(h.since).toBeNull();
    expect(h.medianDaysToComplete).toBeNull();
    expect(h.preProjectConversion).toBeNull();
    expect(h.ideaConversion).toBeNull();
  });

  it("computes median time to complete from creation to status change", () => {
    const h = historyInsights({
      ...empty,
      projects: [
        p({ status: "completed", createdAt: new Date("2026-01-01T12:00:00Z"), statusChangedAt: new Date("2026-01-11T12:00:00Z") }),
        p({ status: "completed", createdAt: new Date("2026-02-01T12:00:00Z"), statusChangedAt: new Date("2026-03-03T12:00:00Z") }),
        p({ status: "completed", createdAt: new Date("2026-04-01T12:00:00Z"), statusChangedAt: new Date("2026-04-21T12:00:00Z") }),
        p({}),
      ],
    });
    expect(h.totals.completed).toBe(3);
    expect(h.medianDaysToComplete).toBe(20);
  });

  it("groups by year (newest first), type and source", () => {
    const h = historyInsights({
      ...empty,
      projects: [p({ createdAt: new Date("2025-05-01T12:00:00Z"), type: "website" }), p({ source: "github_import" }), p({ source: "pre_project" })],
      preProjects: { total: 4, converted: 1 },
      ideas: { total: 3, converted: 2 },
    });
    expect(h.byYear.map(([y, list]) => [y, list.length])).toEqual([
      [2026, 2],
      [2025, 1],
    ]);
    expect(h.topTypes[0]).toEqual(["saas", 2]);
    expect(h.bySource).toEqual({ manual: 1, github_import: 1, pre_project: 1 });
    expect(h.preProjectConversion).toBe(25);
    expect(h.ideaConversion).toBe(67);
  });
});

describe("monthlyBuckets", () => {
  it("covers the last 12 months ending in the current month", () => {
    const b = monthlyBuckets({ projects: [p({})], featuresDone: [{ completedAt: new Date("2025-11-03T12:00:00Z") }], notes: [], now });
    expect(b).toHaveLength(12);
    expect(b.at(-1)!.key).toBe("2026-09");
    expect(b.at(-1)!.projects).toBe(1);
    expect(b[0]!.key).toBe("2025-10");
    expect(b.find((x) => x.key === "2025-11")!.features).toBe(1);
  });
});
