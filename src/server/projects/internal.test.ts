import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/server/db/client", () => ({ db: {} }));

const { computeFeatureProgress } = await import("./internal");

describe("computeFeatureProgress", () => {
  it("is zero without features", () => {
    expect(computeFeatureProgress([])).toBe(0);
  });

  it("is 100 when everything is done", () => {
    expect(computeFeatureProgress([{ status: "done", priority: "desirable" }, { status: "done", priority: "essential" }])).toBe(100);
  });

  it("weights essential features more than desirable ones", () => {
    const essentialDone = computeFeatureProgress([{ status: "done", priority: "essential" }, { status: "planned", priority: "desirable" }]);
    const desirableDone = computeFeatureProgress([{ status: "planned", priority: "essential" }, { status: "done", priority: "desirable" }]);
    expect(essentialDone).toBe(75);
    expect(desirableDone).toBe(25);
  });

  it("gives partial credit to features in progress", () => {
    expect(computeFeatureProgress([{ status: "in_progress", priority: "important" }])).toBe(35);
  });
});
