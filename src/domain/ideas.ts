import { z } from "zod";

export const IDEA_STATUSES = ["inbox", "converted", "archived"] as const;
export type IdeaStatus = (typeof IDEA_STATUSES)[number];

export const IDEA_TARGETS = ["feature", "milestone", "project", "pre_project"] as const;
export type IdeaTarget = (typeof IDEA_TARGETS)[number];

export const IDEA_TARGET_LABELS: Record<IdeaTarget, string> = {
  feature: "Funcionalidade",
  milestone: "Milestone",
  project: "Projeto",
  pre_project: "Pré-projeto",
};

/** Capture must be instant: one line of text is enough. */
export const ideaCaptureSchema = z.object({
  text: z.string().trim().min(1, "Escreva a ideia.").max(500, "Ideias curtas: use no máximo 500 caracteres."),
  projectId: z.uuid().nullable().optional(),
});
