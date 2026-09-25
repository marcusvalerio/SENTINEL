import { describe, expect, it } from "vitest";
import { milestoneDueState, milestoneInputSchema } from "./milestones";
import { likePattern, normalizeQuery, snippetAround } from "./search";
import { originOfEventType } from "./timeline";
import { suggestCategory, toolInputSchema, EMPTY_TOOL } from "./tools";

describe("milestones", () => {
  it("validates dates order", () => {
    const r = milestoneInputSchema.safeParse({ name: "MVP", description: "", status: "planned", priority: "essential", startedOn: "2026-10-10", dueOn: "2026-10-01", featureIds: [] });
    expect(r.success).toBe(false);
  });

  it("computes due state", () => {
    expect(milestoneDueState({ status: "active", dueOn: "2026-09-20" }, "2026-09-25")).toBe("overdue");
    expect(milestoneDueState({ status: "active", dueOn: "2026-09-28" }, "2026-09-25")).toBe("soon");
    expect(milestoneDueState({ status: "active", dueOn: "2026-12-01" }, "2026-09-25")).toBe("on_track");
    expect(milestoneDueState({ status: "completed", dueOn: "2026-09-01" }, "2026-09-25")).toBe("done");
    expect(milestoneDueState({ status: "planned", dueOn: null }, "2026-09-25")).toBe("none");
  });
});

describe("tools", () => {
  it("requires only a name and parses cost", () => {
    const r = toolInputSchema.safeParse({ ...EMPTY_TOOL, name: "Figma", cost: "99,90" });
    expect(r.success && r.data.cost).toBe(9990);
    expect(r.success && r.data.category).toBeNull();
    expect(toolInputSchema.safeParse({ ...EMPTY_TOOL }).success).toBe(false);
  });

  it("suggests categories for known tools", () => {
    expect(suggestCategory("claude")).toBe("ai");
    expect(suggestCategory("Neon")).toBe("infrastructure");
    expect(suggestCategory("Unknown")).toBeNull();
  });
});

describe("search helpers", () => {
  it("escapes LIKE wildcards", () => {
    expect(likePattern("50%_off")).toBe("%50\\%\\_off%");
  });

  it("normalizes queries", () => {
    expect(normalizeQuery("  qr   code ")).toBe("qr code");
  });

  it("builds snippets around accent-insensitive matches", () => {
    expect(snippetAround("Decidimos usar a câmera do celular para ler o código", "camera", 10)).toBe("…os usar a câmera do celula…");
  });
});

describe("timeline origins", () => {
  it("classifies event types", () => {
    expect(originOfEventType("milestone_completed")).toBe("milestone");
    expect(originOfEventType("github_connected")).toBe("development");
    expect(originOfEventType("insight")).toBe("rubrica");
    expect(originOfEventType("status_change")).toBe("project");
  });
});

describe("snippet alignment with decomposed accents", () => {
  it("keeps indices aligned when text contains many accents", () => {
    expect(snippetAround("ação ação ação alvo final", "alvo", 5)).toBe("…ação alvo fina…");
  });
});
