import { describe, expect, it } from "vitest";
import { buildHistory } from "./history";

const d = (iso: string) => new Date(iso);

describe("buildHistory", () => {
  it("merges events and activity newest first, keeping origins", () => {
    const items = buildHistory(
      [{ id: "e1", type: "created", origin: "project", source: "system", title: "Criado", description: null, occurredAt: d("2026-09-01T12:00:00Z") }],
      [{ id: "r1", kind: "release", number: null, title: "v1.0.0", state: "published", url: "u", occurredAt: d("2026-09-10T12:00:00Z"), closedAt: null, authorLogin: null }],
    );
    expect(items.map((i) => [i.id, i.origin])).toEqual([["r1", "development"], ["e1", "project"]]);
  });

  it("groups commits of the same day into one entry", () => {
    const commit = (id: string, at: string) => ({ id, kind: "commit" as const, number: null, title: `c${id}`, state: null, url: "u", occurredAt: d(at), closedAt: null, authorLogin: "m" });
    const items = buildHistory([], [commit("1", "2026-09-10T13:00:00Z"), commit("2", "2026-09-10T15:00:00Z"), commit("3", "2026-09-11T15:00:00Z")]);
    expect(items).toHaveLength(2);
    expect(items[1]).toMatchObject({ icon: "commit", count: 2, title: "2 commits" });
  });

  it("adds a separate merge entry for merged pull requests", () => {
    const items = buildHistory([], [{ id: "p", kind: "pull_request", number: 4, title: "Sync", state: "merged", url: "u", occurredAt: d("2026-09-01T00:00:00Z"), closedAt: d("2026-09-02T00:00:00Z"), authorLogin: "a" }]);
    expect(items.map((i) => i.icon)).toEqual(["pull_request_merged", "pull_request"]);
  });

  it("only allows removing manual events", () => {
    const items = buildHistory(
      [
        { id: "a", type: "milestone", origin: "project", source: "manual", title: "m", description: null, occurredAt: d("2026-09-01T00:00:00Z") },
        { id: "b", type: "status_change", origin: "project", source: "system", title: "s", description: null, occurredAt: d("2026-09-01T00:00:00Z") },
      ],
      [],
    );
    expect(items.find((i) => i.id === "a")?.removable).toBe(true);
    expect(items.find((i) => i.id === "b")?.removable).toBe(false);
  });
});
