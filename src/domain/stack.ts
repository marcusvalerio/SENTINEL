/**
 * Technology stack entries with provenance. SENTINEL never presents an
 * inference as a fact: every entry says how it is known.
 *   detected — read directly from the repository (a dependency, a file)
 *   inferred — a reasonable conclusion from detected evidence
 *   user     — informed by the person
 */
export const PROVENANCE = ["detected", "inferred", "user"] as const;
export type Provenance = (typeof PROVENANCE)[number];
export const PROVENANCE_LABELS: Record<Provenance, string> = { detected: "Detectado", inferred: "Inferido", user: "Informado" };

export const STACK_CATEGORIES = ["language", "framework", "ui", "database", "orm", "infrastructure", "auth", "payments", "testing", "tooling", "ai", "other"] as const;
export type StackCategory = (typeof STACK_CATEGORIES)[number];
export const STACK_CATEGORY_LABELS: Record<StackCategory, string> = {
  language: "Linguagem",
  framework: "Framework",
  ui: "Interface",
  database: "Banco de dados",
  orm: "ORM",
  infrastructure: "Infraestrutura",
  auth: "Autenticação",
  payments: "Pagamentos",
  testing: "Testes",
  tooling: "Ferramentas",
  ai: "IA",
  other: "Outro",
};

export type StackItem = { name: string; category: StackCategory; provenance: Provenance; evidence?: string };
