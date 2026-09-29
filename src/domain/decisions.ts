import { z } from "zod";

export const DECISION_STATUSES = ["proposed", "decided", "superseded", "reverted"] as const;
export type DecisionStatus = (typeof DECISION_STATUSES)[number];

export const DECISION_STATUS_LABELS: Record<DecisionStatus, string> = {
  proposed: "Em aberto",
  decided: "Decidida",
  superseded: "Substituída",
  reverted: "Revertida",
};

const text = (max: number) => z.string().trim().max(max, `Use no máximo ${max} caracteres.`).transform((v) => v || null);

export const decisionInputSchema = z.object({
  title: z.string().trim().min(1, "Dê um título à decisão.").max(200, "Use no máximo 200 caracteres."),
  context: text(8000),
  problem: text(8000),
  alternatives: text(8000),
  decision: text(8000),
  impact: text(8000),
  status: z.enum(DECISION_STATUSES),
  decidedOn: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Informe uma data válida.")
    .transform((v) => (v === "" ? null : v)),
});

export type DecisionInput = z.input<typeof decisionInputSchema>;
export const EMPTY_DECISION: DecisionInput = { title: "", context: "", problem: "", alternatives: "", decision: "", impact: "", status: "proposed", decidedOn: "" };

/** An open decision that has waited this long deserves attention. */
export const STALE_DECISION_DAYS = 7;
