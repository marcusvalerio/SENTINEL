import type { ProjectType, ProjectStatus } from "./project";
import type { Provenance, StackCategory, StackItem } from "./stack";

/**
 * Repository analysis for "Import from GitHub".
 *
 * Pure function over what the GitHub API returned. Every conclusion carries
 * provenance: "detected" when read directly (a dependency, a file, repository
 * metadata) and "inferred" when it is a reasonable conclusion from evidence.
 * Nothing is presented as fact that was not read.
 */

export type RepoSnapshot = {
  repository: { owner: string; name: string; description: string | null; defaultBranch: string; createdAt: string | null; pushedAt: string | null; topics: string[]; homepage: string | null; isPrivate: boolean };
  readme: string | null;
  packageJson: string | null;
  paths: string[];
  languages: Record<string, number>;
  commits: { message: string; date: string; author: string | null }[];
  branches: string[];
};

export type Finding = { label: string; provenance: Provenance; evidence: string };
export type Suggested<T> = { value: T; provenance: Provenance; evidence: string } | null;

export type RepoAnalysis = {
  repository: RepoSnapshot["repository"];
  suggestion: {
    name: Suggested<string>;
    summary: Suggested<string>;
    primaryGoal: Suggested<string>;
    type: Suggested<ProjectType>;
    status: Suggested<ProjectStatus>;
    startedOn: Suggested<string>;
  };
  stack: StackItem[];
  modules: Finding[];
  features: Finding[];
  documentation: Finding[];
  migrations: { tool: string; count: number } | null;
  integrations: Finding[];
  tools: { name: string; purpose: string; category: "development" | "infrastructure"; evidence: string }[];
  activity: { commits: number; lastCommitAt: string | null; branches: number };
  notes: string[];
};

type Rule = { match: string | RegExp; name: string; category: StackCategory };

const DEPENDENCY_RULES: Rule[] = [
  { match: "next", name: "Next.js", category: "framework" },
  { match: "react", name: "React", category: "framework" },
  { match: "vue", name: "Vue", category: "framework" },
  { match: "nuxt", name: "Nuxt", category: "framework" },
  { match: "svelte", name: "Svelte", category: "framework" },
  { match: "@sveltejs/kit", name: "SvelteKit", category: "framework" },
  { match: "astro", name: "Astro", category: "framework" },
  { match: /^@remix-run\//, name: "Remix", category: "framework" },
  { match: "express", name: "Express", category: "framework" },
  { match: "fastify", name: "Fastify", category: "framework" },
  { match: "@nestjs/core", name: "NestJS", category: "framework" },
  { match: "hono", name: "Hono", category: "framework" },
  { match: "react-native", name: "React Native", category: "framework" },
  { match: "expo", name: "Expo", category: "framework" },
  { match: "electron", name: "Electron", category: "framework" },
  { match: "vite", name: "Vite", category: "tooling" },
  { match: "tailwindcss", name: "Tailwind CSS", category: "ui" },
  { match: "@mui/material", name: "Material UI", category: "ui" },
  { match: /^@chakra-ui\//, name: "Chakra UI", category: "ui" },
  { match: /^@radix-ui\//, name: "Radix UI", category: "ui" },
  { match: "styled-components", name: "styled-components", category: "ui" },
  { match: "motion", name: "Motion", category: "ui" },
  { match: "framer-motion", name: "Framer Motion", category: "ui" },
  { match: "lucide-react", name: "Lucide", category: "ui" },
  { match: "drizzle-orm", name: "Drizzle ORM", category: "orm" },
  { match: "prisma", name: "Prisma", category: "orm" },
  { match: "@prisma/client", name: "Prisma", category: "orm" },
  { match: "typeorm", name: "TypeORM", category: "orm" },
  { match: "sequelize", name: "Sequelize", category: "orm" },
  { match: "knex", name: "Knex", category: "orm" },
  { match: "kysely", name: "Kysely", category: "orm" },
  { match: "mongoose", name: "Mongoose", category: "orm" },
  { match: "pg", name: "node-postgres", category: "database" },
  { match: "postgres", name: "postgres.js", category: "database" },
  { match: "@neondatabase/serverless", name: "Neon (driver)", category: "database" },
  { match: "mysql2", name: "MySQL (driver)", category: "database" },
  { match: "mongodb", name: "MongoDB (driver)", category: "database" },
  { match: "better-sqlite3", name: "SQLite (driver)", category: "database" },
  { match: "@supabase/supabase-js", name: "Supabase", category: "database" },
  { match: /^(redis|ioredis|@upstash\/redis)$/, name: "Redis", category: "database" },
  { match: "next-auth", name: "Auth.js / NextAuth", category: "auth" },
  { match: /^@clerk\//, name: "Clerk", category: "auth" },
  { match: "better-auth", name: "Better Auth", category: "auth" },
  { match: "lucia", name: "Lucia", category: "auth" },
  { match: "stripe", name: "Stripe", category: "payments" },
  { match: "mercadopago", name: "Mercado Pago", category: "payments" },
  { match: "vitest", name: "Vitest", category: "testing" },
  { match: "jest", name: "Jest", category: "testing" },
  { match: "@playwright/test", name: "Playwright", category: "testing" },
  { match: "cypress", name: "Cypress", category: "testing" },
  { match: "typescript", name: "TypeScript", category: "language" },
  { match: "zod", name: "Zod", category: "tooling" },
  { match: "eslint", name: "ESLint", category: "tooling" },
  { match: "openai", name: "OpenAI SDK", category: "ai" },
  { match: "@anthropic-ai/sdk", name: "Anthropic SDK", category: "ai" },
  { match: "ai", name: "Vercel AI SDK", category: "ai" },
  { match: /^@vercel\//, name: "Vercel", category: "infrastructure" },
];

const FILE_RULES: { test: (p: string) => boolean; name: string; category: StackCategory; evidence: string }[] = [
  { test: (p) => p === "vercel.json", name: "Vercel", category: "infrastructure", evidence: "vercel.json" },
  { test: (p) => p === "netlify.toml", name: "Netlify", category: "infrastructure", evidence: "netlify.toml" },
  { test: (p) => p === "fly.toml", name: "Fly.io", category: "infrastructure", evidence: "fly.toml" },
  { test: (p) => p === "render.yaml", name: "Render", category: "infrastructure", evidence: "render.yaml" },
  { test: (p) => /(^|\/)Dockerfile$/.test(p), name: "Docker", category: "infrastructure", evidence: "Dockerfile" },
  { test: (p) => /^\.github\/workflows\/.+\.ya?ml$/.test(p), name: "GitHub Actions", category: "infrastructure", evidence: ".github/workflows" },
  { test: (p) => p === "supabase/config.toml", name: "Supabase", category: "infrastructure", evidence: "supabase/config.toml" },
  { test: (p) => /^prisma\/schema\.prisma$/.test(p), name: "Prisma", category: "orm", evidence: "prisma/schema.prisma" },
  { test: (p) => /^drizzle\.config\.(ts|js|mjs)$/.test(p), name: "Drizzle ORM", category: "orm", evidence: "drizzle.config" },
  { test: (p) => p === "components.json", name: "shadcn/ui", category: "ui", evidence: "components.json" },
  { test: (p) => p === "requirements.txt" || p === "pyproject.toml", name: "Python", category: "language", evidence: "requirements.txt / pyproject.toml" },
  { test: (p) => p === "go.mod", name: "Go", category: "language", evidence: "go.mod" },
  { test: (p) => p === "Cargo.toml", name: "Rust", category: "language", evidence: "Cargo.toml" },
];

function matchRule(dep: string, rule: Rule) {
  return typeof rule.match === "string" ? dep === rule.match : rule.match.test(dep);
}

export function humanizeRepoName(name: string) {
  const words = name.replace(/[-_.]+/g, " ").trim().split(/\s+/);
  return words.map((w) => (w.length <= 3 && w === w.toUpperCase() ? w : w.charAt(0).toUpperCase() + w.slice(1))).join(" ");
}

/** First real paragraph of a README: skips headings, badges, images and HTML. */
export function readmeLead(readme: string | null) {
  if (!readme) return null;
  const blocks = readme
    .replace(/<!--[\s\S]*?-->/g, "")
    .split(/\n\s*\n/)
    .map((b) => b.trim());
  for (const b of blocks) {
    if (!b || /^#/.test(b) || /^(\[!\[|!\[|<|\||```|---|===)/.test(b) || b.length < 40) continue;
    const text = b.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[*_`>]/g, "").replace(/\s+/g, " ").trim();
    if (text.length >= 40) return text.slice(0, 600);
  }
  return null;
}

/** Bullets under a "Features" / "Funcionalidades" heading of the README. */
export function readmeFeatures(readme: string | null) {
  if (!readme) return [];
  const lines = readme.split("\n");
  const out: string[] = [];
  let inside = false;
  for (const line of lines) {
    const heading = /^#{1,4}\s+(.+)$/.exec(line);
    if (heading) {
      inside = /features|funcionalidades|recursos|what it does|o que faz/i.test(heading[1]!);
      continue;
    }
    if (!inside) continue;
    const bullet = /^\s*[-*+]\s+(.+)$/.exec(line);
    if (bullet) {
      const text = bullet[1]!.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/`/g, "").replace(/\s+[—–:-]\s+.*$/, "").trim();
      if (text && text.length <= 140) out.push(text);
    }
    if (out.length >= 30) break;
  }
  return out;
}

/** Top-level app routes → candidate modules (Next.js app/ or pages/ routers). */
export function routeModules(paths: string[]) {
  const found = new Map<string, string>();
  for (const p of paths) {
    const m = /^(?:src\/)?(app|pages)\/(.+)\/(?:page|index)\.(?:tsx|jsx|ts|js|mdx)$/.exec(p);
    if (!m) continue;
    const segments = m[2]!.split("/").filter((s) => !/^\(.*\)$/.test(s) && !/^\[.*\]$/.test(s) && !s.startsWith("_") && !s.startsWith("@"));
    const first = segments[0];
    if (!first || first === "api") continue;
    if (!found.has(first)) found.set(first, p);
  }
  for (const p of paths) {
    const m = /^(?:src\/)?(?:modules|features|domains)\/([^/]+)\//.exec(p);
    if (m && !found.has(m[1]!)) found.set(m[1]!, p);
  }
  return [...found.entries()].slice(0, 24).map(([name, evidence]) => ({ name, evidence }));
}

export function analyzeRepository(snap: RepoSnapshot): RepoAnalysis {
  const stack = new Map<string, StackItem>();
  const add = (item: StackItem) => {
    const key = item.name.toLowerCase();
    const existing = stack.get(key);
    if (!existing || (existing.provenance === "inferred" && item.provenance === "detected")) stack.set(key, item);
  };
  const notes: string[] = [];

  // Languages reported by GitHub (detected).
  const totalBytes = Object.values(snap.languages).reduce((a, b) => a + b, 0) || 1;
  for (const [lang, bytes] of Object.entries(snap.languages).sort((a, b) => b[1] - a[1]).slice(0, 4)) {
    if (bytes / totalBytes < 0.03) continue;
    add({ name: lang, category: "language", provenance: "detected", evidence: `GitHub: ${Math.round((bytes / totalBytes) * 100)}% do código` });
  }

  // package.json dependencies (detected).
  let pkg: { dependencies?: Record<string, string>; devDependencies?: Record<string, string>; description?: string; scripts?: Record<string, string> } | null = null;
  if (snap.packageJson) {
    try {
      pkg = JSON.parse(snap.packageJson);
    } catch {
      notes.push("package.json encontrado, mas não pôde ser lido.");
    }
  }
  const deps = { ...(pkg?.dependencies ?? {}), ...(pkg?.devDependencies ?? {}) };
  for (const dep of Object.keys(deps)) {
    for (const rule of DEPENDENCY_RULES) {
      if (matchRule(dep, rule)) add({ name: rule.name, category: rule.category, provenance: "detected", evidence: `package.json: ${dep}@${deps[dep]}` });
    }
  }

  // Files (detected).
  for (const p of snap.paths) {
    for (const rule of FILE_RULES) if (rule.test(p)) add({ name: rule.name, category: rule.category, provenance: "detected", evidence: rule.evidence });
  }

  // Inferences from detected evidence.
  const names = new Set([...stack.values()].map((s) => s.name));
  const postgresDriver = ["node-postgres", "postgres.js", "Neon (driver)"].find((n) => names.has(n));
  if (postgresDriver) add({ name: "PostgreSQL", category: "database", provenance: "inferred", evidence: `driver ${postgresDriver}` });
  if (names.has("Neon (driver)")) add({ name: "Neon", category: "infrastructure", provenance: "inferred", evidence: "@neondatabase/serverless" });
  if (names.has("Next.js")) {
    const appRouter = snap.paths.some((p) => /^(src\/)?app\/.*page\.(tsx|jsx|ts|js)$/.test(p));
    if (appRouter) add({ name: "Next.js App Router", category: "framework", provenance: "inferred", evidence: "arquivos app/**/page" });
  }

  // Migrations (detected).
  const migrationSets: { tool: string; test: RegExp }[] = [
    { tool: "Drizzle", test: /^drizzle\/\d+.*\.sql$/ },
    { tool: "Prisma", test: /^prisma\/migrations\/[^/]+\/migration\.sql$/ },
    { tool: "Supabase", test: /^supabase\/migrations\/.+\.sql$/ },
    { tool: "SQL", test: /^(db\/)?migrations\/.+\.(sql|ts|js)$/ },
  ];
  let migrations: RepoAnalysis["migrations"] = null;
  for (const set of migrationSets) {
    const count = snap.paths.filter((p) => set.test.test(p)).length;
    if (count > 0) {
      migrations = { tool: set.tool, count };
      break;
    }
  }

  // Documentation (detected).
  const documentation: Finding[] = snap.paths
    .filter((p) => (/^docs\/.+\.(md|mdx)$/i.test(p) || /^[^/]+\.(md|mdx)$/i.test(p)) && !/^readme\.md$/i.test(p))
    .slice(0, 20)
    .map((p) => ({ label: p, provenance: "detected" as const, evidence: "arquivo no repositório" }));
  if (snap.readme) documentation.unshift({ label: "README", provenance: "detected", evidence: `${snap.readme.length.toLocaleString("pt-BR")} caracteres` });

  // Modules and features.
  const modules: Finding[] = routeModules(snap.paths).map((m) => ({ label: m.name, provenance: "inferred", evidence: `rota ${m.evidence}` }));
  const features: Finding[] = readmeFeatures(snap.readme).map((f) => ({ label: f, provenance: "detected", evidence: "README, seção de funcionalidades" }));

  // Integrations from detected auth/payments/ai libraries.
  const integrations: Finding[] = [...stack.values()]
    .filter((s) => ["auth", "payments", "ai"].includes(s.category) || s.name === "Supabase")
    .map((s) => ({ label: s.name, provenance: s.provenance, evidence: s.evidence ?? "" }));

  // Tools the project evidently uses.
  const tools: RepoAnalysis["tools"] = [{ name: "GitHub", purpose: "Versionamento", category: "development", evidence: "repositório importado" }];
  for (const host of ["Vercel", "Netlify", "Neon", "Supabase", "Fly.io", "Render"]) {
    const s = stack.get(host.toLowerCase());
    if (s) tools.push({ name: host, purpose: host === "Neon" || host === "Supabase" ? "Banco de dados" : "Hospedagem e deploy", category: "infrastructure", evidence: `${s.provenance === "detected" ? "detectado" : "inferido"}: ${s.evidence}` });
  }

  // Suggestions for the registration form.
  const description = snap.repository.description?.trim() || pkg?.description?.trim() || null;
  const lead = readmeLead(snap.readme);
  const lastCommitAt = snap.commits[0]?.date ?? snap.repository.pushedAt;
  const recent = lastCommitAt ? Date.now() - Date.parse(lastCommitAt) < 45 * 86_400_000 : false;

  let type: Suggested<ProjectType> = null;
  const hay = `${description ?? ""} ${lead ?? ""} ${snap.repository.topics.join(" ")}`.toLowerCase();
  if (names.has("React Native") || names.has("Expo")) type = { value: "mobile_app", provenance: "inferred", evidence: "React Native / Expo" };
  else if (/\bsaas\b/.test(hay)) type = { value: "saas", provenance: "inferred", evidence: "menção a SaaS na descrição/README" };
  else if (names.has("Astro") && !integrations.length && !postgresDriver) type = { value: "website", provenance: "inferred", evidence: "Astro sem banco de dados" };
  else if (names.has("Next.js") || names.has("React") || names.has("Vue") || names.has("SvelteKit") || names.has("Nuxt")) type = { value: "web_app", provenance: "inferred", evidence: "framework web detectado" };

  return {
    repository: snap.repository,
    suggestion: {
      name: { value: humanizeRepoName(snap.repository.name), provenance: "detected", evidence: `nome do repositório (${snap.repository.name})` },
      summary: description ? { value: description.slice(0, 280), provenance: "detected", evidence: snap.repository.description ? "descrição do repositório" : "package.json" } : lead ? { value: lead.slice(0, 280), provenance: "inferred", evidence: "primeiro parágrafo do README" } : null,
      primaryGoal: lead ? { value: lead, provenance: "inferred", evidence: "primeiro parágrafo do README — revise" } : null,
      type,
      status: lastCommitAt ? { value: recent ? "in_development" : "paused", provenance: "inferred", evidence: `último commit em ${lastCommitAt.slice(0, 10).split("-").reverse().join("/")}` } : null,
      startedOn: snap.repository.createdAt ? { value: snap.repository.createdAt.slice(0, 10), provenance: "detected", evidence: "data de criação do repositório" } : null,
    },
    stack: [...stack.values()].sort((a, b) => (a.provenance === b.provenance ? 0 : a.provenance === "detected" ? -1 : 1)),
    modules,
    features,
    documentation,
    migrations,
    integrations,
    tools,
    activity: { commits: snap.commits.length, lastCommitAt: lastCommitAt ?? null, branches: snap.branches.length },
    notes,
  };
}
