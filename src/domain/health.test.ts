import { describe, expect, it } from "vitest";
import { attentionItems, healthSignals, type HealthInput } from "./health";

const now = new Date("2026-09-29T15:00:00Z");
const base: HealthInput = {
  project: { id: "p", name: "Lunar", status: "in_development", statusChangedAt: new Date("2026-09-01T00:00:00Z"), lastActivityAt: new Date("2026-09-28T00:00:00Z") },
  github: { syncStatus: "success", lastSyncedAt: new Date("2026-09-29T10:00:00Z"), syncError: null },
  activity: { commits30d: 12, lastCommitAt: new Date("2026-09-27T00:00:00Z") },
  milestones: [],
  openDecisions: [],
  finance: { estimatedCostCents: null, costCents: null },
  now,
};

describe("health signals", () => {
  it("explains every signal", () => {
    const signals = healthSignals(base);
    expect(signals.map((s) => [s.key, s.state])).toEqual([
      ["development", "good"],
      ["roadmap", "none"],
      ["github", "good"],
      ["finance", "none"],
    ]);
    expect(signals.every((s) => s.reason.length > 0)).toBe(true);
  });

  it("never invents development state without a repository", () => {
    expect(healthSignals({ ...base, github: null })[0]).toMatchObject({ state: "none", value: "Sem repositório" });
  });

  it("flags overdue roadmap and over-budget finance", () => {
    const signals = healthSignals({
      ...base,
      milestones: [{ id: "m", name: "MVP", status: "active", dueOn: "2026-09-20" }],
      finance: { estimatedCostCents: 1000, costCents: 1500 },
    });
    expect(signals.find((s) => s.key === "roadmap")?.state).toBe("risk");
    expect(signals.find((s) => s.key === "finance")?.state).toBe("risk");
  });
});

describe("attention items", () => {
  it("lists what needs attention, most severe first, with reasons", () => {
    const items = attentionItems({
      ...base,
      github: { syncStatus: "error", lastSyncedAt: null, syncError: "Limite atingido" },
      milestones: [
        { id: "a", name: "Piloto", status: "planned", dueOn: "2026-10-02" },
        { id: "b", name: "MVP", status: "active", dueOn: "2026-09-20" },
        { id: "c", name: "Antigo", status: "completed", dueOn: "2026-08-01" },
      ],
      openDecisions: [
        { id: "d", title: "Escolher gateway", createdAt: new Date("2026-09-10T00:00:00Z") },
        { id: "e", title: "Recente", createdAt: new Date("2026-09-28T00:00:00Z") },
      ],
    });
    expect(items.map((i) => i.severity)).toEqual(["high", "high", "medium", "medium"]);
    expect(items.map((i) => i.title)).toContain("Decisão em aberto: Escolher gateway");
    expect(items.some((i) => i.title.includes("Antigo") || i.title.includes("Recente"))).toBe(false);
    expect(items.every((i) => i.reason && i.href.startsWith("/projects/p"))).toBe(true);
  });

  it("is quiet for a healthy project", () => {
    expect(attentionItems(base)).toEqual([]);
  });

  it("asks about long pauses instead of flagging idleness", () => {
    const items = attentionItems({ ...base, project: { ...base.project, status: "paused", statusChangedAt: new Date("2026-06-01T00:00:00Z"), lastActivityAt: new Date("2026-06-01T00:00:00Z") } });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ severity: "low", title: "Pausado há muito tempo" });
  });
});
