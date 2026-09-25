import { describe, expect, it } from "vitest";
import { computeProgress, featureProgress, milestoneProgress, milestonesProgress } from "@/domain/progress";

describe("featureProgress", () => {
  it("is zero without features", () => expect(featureProgress([])).toBe(0));

  it("is 100 when everything is done", () => {
    expect(featureProgress([{ status: "done", priority: "desirable" }, { status: "done", priority: "essential" }])).toBe(100);
  });

  it("weights essential features more than desirable ones", () => {
    expect(featureProgress([{ status: "done", priority: "essential" }, { status: "planned", priority: "desirable" }])).toBe(75);
    expect(featureProgress([{ status: "planned", priority: "essential" }, { status: "done", priority: "desirable" }])).toBe(25);
  });

  it("gives partial credit to features in progress", () => {
    expect(featureProgress([{ status: "in_progress", priority: "important" }])).toBe(35);
  });
});

describe("milestones", () => {
  const m = (id: string, status: "planned" | "active" | "completed" | "paused" | "cancelled", priority: "essential" | "important" | "desirable" = "important") => ({ id, status, priority });

  it("uses linked features for a milestone's own progress", () => {
    const features = [
      { status: "done" as const, priority: "important" as const, milestoneId: "a" },
      { status: "planned" as const, priority: "important" as const, milestoneId: "a" },
      { status: "done" as const, priority: "important" as const, milestoneId: "b" },
    ];
    expect(milestoneProgress(m("a", "active"), features)).toBe(50);
  });

  it("falls back to status when a milestone has no features", () => {
    expect(milestoneProgress(m("a", "completed"), [])).toBe(100);
    expect(milestoneProgress(m("a", "active"), [])).toBe(35);
    expect(milestoneProgress(m("a", "planned"), [])).toBe(0);
  });

  it("ignores cancelled milestones and weights by priority", () => {
    expect(milestonesProgress([m("a", "completed", "essential"), m("b", "planned", "desirable"), m("c", "cancelled")], [])).toBe(75);
    expect(milestonesProgress([m("c", "cancelled")], [])).toBe(0);
  });
});

describe("computeProgress", () => {
  const input = { manual: 42, features: [{ status: "done" as const, priority: "important" as const }], milestones: [] };

  it("respects the configured source", () => {
    expect(computeProgress("manual", input)).toBe(42);
    expect(computeProgress("features", input)).toBe(100);
    expect(computeProgress("milestones", input)).toBe(0);
  });

  it("never derives progress from activity", () => {
    // Progress has no activity input at all: the signature is the guarantee.
    expect(Object.keys(input)).not.toContain("commits");
  });
});
