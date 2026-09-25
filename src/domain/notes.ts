/**
 * Rubrica — the project's notebook / journal.
 *
 * "Rubrica" is NOT an evaluation rubric. It is the chronological memory of a
 * project: notes, ideas, decisions, doubts and meetings, in the order they
 * happened. Entries are the raw material that may later become decisions,
 * requirements, tasks or documentation.
 */

export const NOTE_TYPES = [
  "note",
  "idea",
  "insight",
  "observation",
  "decision",
  "question",
  "problem",
  "meeting",
  "reference",
  "discarded_idea",
] as const;
export type NoteType = (typeof NOTE_TYPES)[number];

export const NOTE_TYPE_LABELS: Record<NoteType, string> = {
  note: "Nota",
  idea: "Ideia",
  insight: "Insight",
  observation: "Observação",
  decision: "Decisão",
  question: "Dúvida",
  problem: "Problema",
  meeting: "Reunião",
  reference: "Referência",
  discarded_idea: "Ideia descartada",
};
