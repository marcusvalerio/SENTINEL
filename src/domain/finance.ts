import { z } from "zod";
import { parseMoneyToCents } from "@/lib/format";

/**
 * Simple project economics. Every number is optional: a figure is only shown
 * when the inputs behind it exist. No formulas on missing data.
 */
export type FinanceInput = {
  estimatedCostCents: number | null;
  actualCostCents: number | null;
  revenueCents: number | null;
  contractedValueCents: number | null;
  investmentRealizedCents: number | null;
  /** AI-base subscriptions counted for this project (already multiplied by months). */
  aiBaseCents?: number | null;
};

export function financeSummary(f: FinanceInput) {
  const income = f.revenueCents ?? f.contractedValueCents;
  const direct = f.actualCostCents ?? f.investmentRealizedCents;
  const ai = f.aiBaseCents ?? null;
  const cost = direct === null && ai === null ? null : (direct ?? 0) + (ai ?? 0);
  const margin = income !== null && cost !== null ? income - cost : null;
  const marginPct = margin !== null && income ? Math.round((margin / income) * 100) : null;
  const roiPct = margin !== null && cost ? Math.round((margin / cost) * 100) : null;
  const budgetUse = f.estimatedCostCents && cost !== null ? Math.round((cost / f.estimatedCostCents) * 100) : null;
  return { income, cost, margin, marginPct, roiPct, budgetUse, incomeSource: f.revenueCents !== null ? ("revenue" as const) : f.contractedValueCents !== null ? ("contract" as const) : null };
}

const money = z.string().transform((value, ctx) => {
  const cents = parseMoneyToCents(value);
  if (cents !== null && Number.isNaN(cents)) {
    ctx.addIssue({ code: "custom", message: "Informe um valor válido, por exemplo 1.200,00." });
    return z.NEVER;
  }
  return cents;
});

/** The project economics a person edits by hand. Empty = not informed. */
export const projectFinanceSchema = z.object({
  estimatedCost: money,
  actualCost: money,
  revenue: money,
  contractedValue: money,
  aiBaseMonths: z.number().int().min(1).max(60).nullable(),
});
export type ProjectFinanceInput = z.input<typeof projectFinanceSchema>;
