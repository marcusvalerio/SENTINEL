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
};

export function financeSummary(f: FinanceInput) {
  const income = f.revenueCents ?? f.contractedValueCents;
  const cost = f.actualCostCents ?? f.investmentRealizedCents;
  const margin = income !== null && cost !== null ? income - cost : null;
  const marginPct = margin !== null && income ? Math.round((margin / income) * 100) : null;
  const roiPct = margin !== null && cost ? Math.round((margin / cost) * 100) : null;
  const budgetUse = f.estimatedCostCents && cost !== null ? Math.round((cost / f.estimatedCostCents) * 100) : null;
  return { income, cost, margin, marginPct, roiPct, budgetUse, incomeSource: f.revenueCents !== null ? ("revenue" as const) : f.contractedValueCents !== null ? ("contract" as const) : null };
}
