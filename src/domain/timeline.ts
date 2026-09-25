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
};

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
