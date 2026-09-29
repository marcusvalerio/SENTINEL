import { describe, expect, it } from "vitest";
import { analyzeRepository, humanizeRepoName, readmeFeatures, readmeLead, routeModules, type RepoSnapshot } from "./repo-analysis";

const snapshot = (over: Partial<RepoSnapshot> = {}): RepoSnapshot => ({
  repository: { owner: "marcus", name: "lunar-wms", description: null, defaultBranch: "main", createdAt: "2026-01-10T00:00:00Z", pushedAt: new Date().toISOString(), topics: [], homepage: null, isPrivate: false },
  readme: null,
  packageJson: null,
  paths: [],
  languages: {},
  commits: [],
  branches: ["main"],
  ...over,
});

describe("README parsing", () => {
  it("skips badges and headings to find the lead paragraph", () => {
    const readme = "# Lunar\n\n[![CI](x)](y)\n\nLunar é um WMS para separação rápida de pedidos em armazéns médios, com leitura de código de barras.\n\n## Features\n\n- **Separação por ondas** — agrupa pedidos\n- Leitura de [QR](x)\n\n## Setup\n\n- npm i";
    expect(readmeLead(readme)).toMatch(/^Lunar é um WMS/);
    expect(readmeFeatures(readme)).toEqual(["Separação por ondas", "Leitura de QR"]);
  });
});

describe("routes", () => {
  it("infers modules from app routes, ignoring groups, dynamic segments and api", () => {
    const mods = routeModules(["src/app/(app)/projects/[id]/page.tsx", "src/app/(app)/inbox/page.tsx", "src/app/api/search/route.ts", "app/login/page.tsx", "src/app/page.tsx"]);
    expect(mods.map((m) => m.name)).toEqual(["projects", "inbox", "login"]);
  });
});

describe("analyzeRepository", () => {
  const pkg = JSON.stringify({ dependencies: { next: "16.0.0", react: "19", "drizzle-orm": "0.45", postgres: "3", stripe: "1" }, devDependencies: { typescript: "6", vitest: "5" } });

  it("labels dependencies and files as detected, and conclusions as inferred", () => {
    const a = analyzeRepository(snapshot({ packageJson: pkg, paths: ["vercel.json", "drizzle/0000_init.sql", "drizzle/0001_x.sql", "src/app/(app)/projects/page.tsx"], languages: { TypeScript: 9000, CSS: 1000 } }));
    const by = Object.fromEntries(a.stack.map((s) => [s.name, s.provenance]));
    expect(by["Next.js"]).toBe("detected");
    expect(by["Drizzle ORM"]).toBe("detected");
    expect(by["Vercel"]).toBe("detected");
    expect(by["TypeScript"]).toBe("detected");
    expect(by["PostgreSQL"]).toBe("inferred");
    expect(by["Next.js App Router"]).toBe("inferred");
    expect(a.migrations).toEqual({ tool: "Drizzle", count: 2 });
    expect(a.integrations.map((i) => i.label)).toContain("Stripe");
    expect(a.tools.map((t) => t.name)).toEqual(["GitHub", "Vercel"]);
    expect(a.modules[0]).toMatchObject({ label: "projects", provenance: "inferred" });
  });

  it("never invents a goal or type without evidence", () => {
    const a = analyzeRepository(snapshot());
    expect(a.suggestion.primaryGoal).toBeNull();
    expect(a.suggestion.type).toBeNull();
    expect(a.suggestion.summary).toBeNull();
    expect(a.suggestion.name).toMatchObject({ value: "Lunar Wms", provenance: "detected" });
  });

  it("uses the repository description as detected summary and README lead as inferred goal", () => {
    const a = analyzeRepository(snapshot({ repository: { ...snapshot().repository, description: "WMS SaaS para armazéns" }, readme: "Um sistema de gestão de armazém que reduz o tempo de separação de pedidos pela metade." }));
    expect(a.suggestion.summary).toMatchObject({ provenance: "detected", value: "WMS SaaS para armazéns" });
    expect(a.suggestion.primaryGoal?.provenance).toBe("inferred");
    expect(a.suggestion.type).toMatchObject({ value: "saas", provenance: "inferred" });
  });

  it("reports an unreadable package.json instead of guessing", () => {
    expect(analyzeRepository(snapshot({ packageJson: "{nope" })).notes[0]).toMatch(/não pôde ser lido/);
  });

  it("humanizes repository names", () => {
    expect(humanizeRepoName("jarvis-wms")).toBe("Jarvis Wms");
    expect(humanizeRepoName("SENTINEL")).toBe("SENTINEL");
  });
});
