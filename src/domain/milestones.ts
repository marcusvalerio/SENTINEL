import { z } from "zod";
import { FEATURE_PRIORITIES, type FeaturePriority } from "./project";

export const MILESTONE_STATUSES = ["planned", "active", "completed", "paused", "cancelled"] as const;
export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

export const MILESTONE_STATUS_LABELS: Record<MilestoneStatus, string> = {
  planned: "Planejado",
  active: "Em andamento",
  completed: "Concluído",
  paused: "Pausado",
  cancelled: "Cancelado",
};

const isoDate = z
  .string()
  .trim()
  .refine((v) => v === "" || (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))), "Informe uma data válida.")
  .transform((v) => (v === "" ? null : v));

export const milestoneInputSchema = z
  .object({
    name: z.string().trim().min(1, "Dê um nome ao milestone.").max(140, "Use no máximo 140 caracteres."),
    description: z.string().trim().max(8000, "Descrição longa demais.").transform((v) => v || null),
    status: z.enum(MILESTONE_STATUSES, { error: "Escolha um status." }),
    priority: z.enum(FEATURE_PRIORITIES, { error: "Escolha uma prioridade." }),
    startedOn: isoDate,
    dueOn: isoDate,
    featureIds: z.array(z.uuid()).max(200).default([]),
  })
  .refine((m) => !m.startedOn || !m.dueOn || m.dueOn >= m.startedOn, { path: ["dueOn"], message: "A data prevista deve ser depois do início." });

export type MilestoneInput = z.input<typeof milestoneInputSchema>;

export type MilestoneDueState = "none" | "on_track" | "soon" | "overdue" | "done";

/** How a milestone stands against its due date (calendar dates, YYYY-MM-DD). */
export function milestoneDueState(m: { status: MilestoneStatus; dueOn: string | null }, today: string): MilestoneDueState {
  if (m.status === "completed" || m.status === "cancelled") return "done";
  if (!m.dueOn) return "none";
  if (m.dueOn < today) return "overdue";
  const days = (Date.parse(m.dueOn) - Date.parse(today)) / 86_400_000;
  return days <= 7 ? "soon" : "on_track";
}

export const PRIORITY_WEIGHT: Record<FeaturePriority, number> = { essential: 3, important: 2, desirable: 1 };
