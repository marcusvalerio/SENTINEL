export const SEARCH_GROUPS = ["projects", "decisions", "notes", "features", "milestones", "timeline", "activity", "tools"] as const;
export type SearchGroup = (typeof SEARCH_GROUPS)[number];

export const SEARCH_GROUP_LABELS: Record<SearchGroup, string> = {
  projects: "Projetos",
  decisions: "Decisões",
  notes: "Rubrica",
  features: "Funcionalidades",
  milestones: "Milestones",
  timeline: "Timeline",
  activity: "Atividade GitHub",
  tools: "Ferramentas",
};

export type SearchHit = {
  id: string;
  group: SearchGroup;
  title: string;
  snippet: string | null;
  projectId: string;
  projectName: string;
  href: string;
  kind?: string;
  at?: string | null;
};

export type SearchResponse = { query: string; total: number; groups: { group: SearchGroup; count: number; hits: SearchHit[] }[] };

/** Escapes LIKE wildcards so a query like "50%" matches literally. */
export function likePattern(query: string) {
  return `%${query.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

export function normalizeQuery(raw: string) {
  return raw.trim().replace(/\s+/g, " ").slice(0, 80);
}

/** A short window of text around the first match, for result previews. */
export function snippetAround(text: string | null | undefined, query: string, radius = 60) {
  if (!text) return null;
  const plain = text.replace(/\s+/g, " ").trim();
  const fold = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const index = fold(plain).indexOf(fold(query));
  if (index < 0) return plain.length > radius * 2 ? `${plain.slice(0, radius * 2)}…` : plain;
  const start = Math.max(0, index - radius);
  const end = Math.min(plain.length, index + query.length + radius);
  return `${start > 0 ? "…" : ""}${plain.slice(start, end)}${end < plain.length ? "…" : ""}`;
}
