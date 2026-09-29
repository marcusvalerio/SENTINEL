/**
 * Roadmap horizons — when something is expected to happen, not how important
 * it is (that's priority) nor how big it is (that's effort).
 */
export const HORIZONS = ["now", "next", "later", "future"] as const;
export type Horizon = (typeof HORIZONS)[number];

export const HORIZON_LABELS: Record<Horizon, string> = { now: "Now", next: "Next", later: "Later", future: "Future" };
export const HORIZON_HINTS: Record<Horizon, string> = {
  now: "Em construção agora",
  next: "O que vem logo depois",
  later: "Planejado, sem urgência",
  future: "Possibilidades e ideias",
};

export const EFFORTS = ["xs", "s", "m", "l", "xl"] as const;
export type Effort = (typeof EFFORTS)[number];
export const EFFORT_LABELS: Record<Effort, string> = { xs: "XS", s: "S", m: "M", l: "L", xl: "XL" };
export const EFFORT_HINTS: Record<Effort, string> = { xs: "Horas", s: "1–2 dias", m: "Uma semana", l: "Algumas semanas", xl: "Um mês ou mais" };

/** Where a roadmap item came from — provenance, never guessed. */
export const ITEM_ORIGINS = ["scope", "inbox", "github_import", "pre_project", "manual"] as const;
export type ItemOrigin = (typeof ITEM_ORIGINS)[number];
export const ITEM_ORIGIN_LABELS: Record<ItemOrigin, string> = {
  scope: "Escopo",
  inbox: "Inbox",
  github_import: "Importação GitHub",
  pre_project: "Pré-projeto",
  manual: "Manual",
};

/** Items that depend on unfinished work cannot really be "now". */
export function blockedBy<T extends { id: string; status: string }>(item: { dependsOn: string[] }, all: T[]) {
  return all.filter((other) => item.dependsOn.includes(other.id) && other.status !== "done");
}
