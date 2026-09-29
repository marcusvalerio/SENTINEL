import { describe, expect, it } from "vitest";
import { isQuietWeek, projectContextMarkdown, weeklyBrief } from "./project-brief";

const zero = { commits: 0, notes: 0, featuresDone: 0, milestonesDone: 0, decisions: 0, events: 0 };

describe("weeklyBrief", () => {
  it("says nothing when nothing happened", () => {
    expect(weeklyBrief(zero)).toEqual([]);
    expect(isQuietWeek(zero)).toBe(true);
  });

  it("uses singular and plural correctly", () => {
    expect(weeklyBrief({ ...zero, featuresDone: 1, commits: 12 })).toEqual(["1 funcionalidade concluída.", "12 commits sincronizados do GitHub."]);
    expect(weeklyBrief({ ...zero, decisions: 2 })).toEqual(["2 decisões registradas."]);
  });

  it("an event alone is not a quiet week", () => {
    expect(isQuietWeek({ ...zero, events: 1 })).toBe(false);
  });
});

describe("projectContextMarkdown", () => {
  const base = {
    name: "Sentinel",
    type: "SaaS",
    status: "Em desenvolvimento",
    summary: null,
    goal: "Organizar projetos.",
    problem: null,
    audience: null,
    currentFocus: null,
    progress: 40,
    repository: null,
    stack: [],
    tools: [],
    openMilestones: [],
    nextFeatures: [],
    recentDecisions: [],
    attention: [],
  };

  it("omits empty sections", () => {
    const md = projectContextMarkdown(base);
    expect(md).toContain("# Sentinel");
    expect(md).toContain("## Objetivo");
    expect(md).not.toContain("## Stack");
    expect(md).not.toContain("## Problema");
  });

  it("keeps provenance on the stack", () => {
    const md = projectContextMarkdown({
      ...base,
      stack: [
        { name: "Next.js", category: "framework", provenance: "detected" },
        { name: "Vercel", category: "infrastructure", provenance: "inferred" },
      ],
    });
    expect(md).toContain("- Next.js (detectado)");
    expect(md).toContain("- Vercel (inferido)");
  });
});
