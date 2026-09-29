import { z } from "zod";
import { parseMoneyToCents } from "@/lib/format";
import { TOOL_CATEGORIES } from "./tools";

/**
 * Subscriptions and on-demand tools. "on_demand" is for credit-based tools
 * (v0, Lovable…) — they are never treated as a recurring monthly cost.
 */
export const BILLING_PERIODS = ["monthly", "yearly", "on_demand", "one_time"] as const;
export type BillingPeriod = (typeof BILLING_PERIODS)[number];

export const BILLING_LABELS: Record<BillingPeriod, string> = {
  monthly: "Mensal",
  yearly: "Anual",
  on_demand: "Sob demanda / créditos",
  one_time: "Pagamento único",
};

export const SUBSCRIPTION_STATUSES = ["active", "paused", "cancelled"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];
export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = { active: "Ativa", paused: "Pausada", cancelled: "Cancelada" };

/** Monthly equivalent; null for costs that are not recurring. */
export function monthlyCents(s: { billing: BillingPeriod; amountCents: number | null; status?: SubscriptionStatus }) {
  if (s.amountCents === null || s.status === "cancelled") return null;
  if (s.billing === "monthly") return s.amountCents;
  if (s.billing === "yearly") return Math.round(s.amountCents / 12);
  return null;
}

/**
 * The AI base cost of a project: N months of every subscription flagged as
 * AI base (Claude + ChatGPT for Marcus). Only amounts the user configured —
 * a subscription without a price contributes nothing, and is reported.
 */
export function aiBaseCost(subscriptions: { billing: BillingPeriod; amountCents: number | null; isAiBase: boolean; status: SubscriptionStatus; service: string }[], months: number) {
  const base = subscriptions.filter((s) => s.isAiBase && s.status !== "cancelled");
  const priced = base.filter((s) => monthlyCents(s) !== null);
  const total = priced.reduce((sum, s) => sum + monthlyCents(s)! * months, 0);
  return { totalCents: total, services: priced.map((s) => s.service), missingPrice: base.filter((s) => monthlyCents(s) === null && s.billing !== "on_demand").map((s) => s.service) };
}

export const DEFAULT_AI_BASE_MONTHS = 2;

const money = z.string().transform((value, ctx) => {
  const cents = parseMoneyToCents(value);
  if (cents !== null && Number.isNaN(cents)) {
    ctx.addIssue({ code: "custom", message: "Informe um valor válido, por exemplo 110,00." });
    return z.NEVER;
  }
  return cents;
});

export const subscriptionInputSchema = z.object({
  service: z.string().trim().min(1, "Informe o serviço.").max(80, "Use no máximo 80 caracteres."),
  plan: z.string().trim().max(80).transform((v) => v || null),
  billing: z.enum(BILLING_PERIODS),
  amount: money,
  currency: z.enum(["BRL", "USD", "EUR"]).default("BRL"),
  renewsOn: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Informe uma data válida.")
    .transform((v) => (v === "" ? null : v)),
  category: z.union([z.enum(TOOL_CATEGORIES), z.literal("")]).transform((v) => (v === "" ? null : v)),
  usage: z.string().trim().max(300).transform((v) => v || null),
  status: z.enum(SUBSCRIPTION_STATUSES).default("active"),
  isAiBase: z.boolean().default(false),
  projectIds: z.array(z.uuid()).max(200).default([]),
});

export type SubscriptionInput = z.input<typeof subscriptionInputSchema>;
export const EMPTY_SUBSCRIPTION: SubscriptionInput = { service: "", plan: "", billing: "monthly", amount: "", currency: "BRL", renewsOn: "", category: "", usage: "", status: "active", isAiBase: false, projectIds: [] };
