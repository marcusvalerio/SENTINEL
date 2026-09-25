/**
 * Timeline — dated events in the life of a project.
 *
 * Events are either recorded by a person ("manual") or emitted by the system
 * when something meaningful happens ("system"). "github" is reserved for the
 * future repository sync so automated activity never gets mixed with history
 * that was deliberately written down.
 */

export const TIMELINE_EVENT_TYPES = [
  "created",
  "first_idea",
  "decision",
  "scope_change",
  "milestone",
  "deploy",
  "release",
  "status_change",
  "paused",
  "resumed",
  "completed",
  "archived",
  "github_connected",
  "github_disconnected",
  "note",
  "goal_change",
  "milestone_created",
  "milestone_started",
  "milestone_completed",
  "milestone_paused",
  "milestone_cancelled",
  "insight",
  "problem",
] as const;
export type TimelineEventType = (typeof TIMELINE_EVENT_TYPES)[number];

export const TIMELINE_EVENT_LABELS: Record<TimelineEventType, string> = {
  created: "Projeto criado",
  first_idea: "Primeira ideia",
  decision: "Decisão",
  scope_change: "Alteração de escopo",
  milestone: "Milestone",
  deploy: "Deploy",
  release: "Release",
  status_change: "Mudança de status",
  paused: "Pausa",
  resumed: "Retomada",
  completed: "Conclusão",
  archived: "Arquivamento",
  github_connected: "GitHub conectado",
  github_disconnected: "GitHub desconectado",
  note: "Registro",
  goal_change: "Objetivo alterado",
  milestone_created: "Milestone criado",
  milestone_started: "Milestone iniciado",
  milestone_completed: "Milestone concluído",
  milestone_paused: "Milestone pausado",
  milestone_cancelled: "Milestone cancelado",
  insight: "Insight",
  problem: "Problema",
};

/**
 * Where an event comes from. The timeline shows the origin explicitly so the
 * story of a project reads as: what we decided, what we built, what shipped.
 */
export const TIMELINE_ORIGINS = ["project", "rubrica", "development", "milestone"] as const;
export type TimelineOrigin = (typeof TIMELINE_ORIGINS)[number];

export const TIMELINE_ORIGIN_LABELS: Record<TimelineOrigin, string> = {
  project: "Projeto",
  rubrica: "Rubrica",
  development: "Desenvolvimento",
  milestone: "Milestones",
};

export function originOfEventType(type: TimelineEventType): TimelineOrigin {
  if (type.startsWith("milestone_") || type === "milestone") return "milestone";
  if (type.startsWith("github_") || type === "deploy" || type === "release") return "development";
  if (type === "insight" || type === "problem") return "rubrica";
  return "project";
}

/** Types a person may record by hand. System-only types stay out of the picker. */
export const MANUAL_TIMELINE_EVENT_TYPES = [
  "first_idea",
  "decision",
  "scope_change",
  "milestone",
  "deploy",
  "release",
  "note",
] as const satisfies readonly TimelineEventType[];

export const TIMELINE_SOURCES = ["manual", "system", "github"] as const;
export type TimelineSource = (typeof TIMELINE_SOURCES)[number];
