import { describe, expect, it } from "vitest";
import { financeSummary, projectFinanceSchema } from "./finance";
import { aiBaseCost, monthlyCents } from "./subscriptions";

const empty = { estimatedCostCents: null, actualCostCents: null, revenueCents: null, contractedValueCents: null, investmentRealizedCents: null };

describe("financeSummary", () => {
  it("shows nothing without inputs", () => {
    const s = financeSummary(empty);
    expect(s).toMatchObject({ income: null, cost: null, margin: null, marginPct: null, roiPct: null, budgetUse: null });
  });

  it("computes margin and ROI from revenue and cost", () => {
    const s = financeSummary({ ...empty, revenueCents: 1_000_00, actualCostCents: 400_00, estimatedCostCents: 500_00 });
    expect(s.margin).toBe(600_00);
    expect(s.marginPct).toBe(60);
    expect(s.roiPct).toBe(150);
    expect(s.budgetUse).toBe(80);
    expect(s.incomeSource).toBe("revenue");
  });

  it("falls back to contract value and adds the AI base to cost", () => {
    const s = financeSummary({ ...empty, contractedValueCents: 2_000_00, actualCostCents: 500_00, aiBaseCents: 500_00 });
    expect(s.cost).toBe(1_000_00);
    expect(s.incomeSource).toBe("contract");
  });
});

describe("AI base cost", () => {
  const claude = { service: "Claude", billing: "monthly" as const, amountCents: 110_00, isAiBase: true, status: "active" as const };
  const gpt = { service: "ChatGPT", billing: "monthly" as const, amountCents: null, isAiBase: true, status: "active" as const };
  const v0 = { service: "v0", billing: "on_demand" as const, amountCents: null, isAiBase: false, status: "active" as const };

  it("never invents a price and reports what is missing", () => {
    const r = aiBaseCost([claude, gpt, v0], 2);
    expect(r.totalCents).toBe(220_00);
    expect(r.services).toEqual(["Claude"]);
    expect(r.missingPrice).toEqual(["ChatGPT"]);
  });

  it("yearly becomes monthly; on-demand is never recurring", () => {
    expect(monthlyCents({ billing: "yearly", amountCents: 1200_00 })).toBe(100_00);
    expect(monthlyCents({ billing: "on_demand", amountCents: 50_00 })).toBeNull();
    expect(monthlyCents({ billing: "monthly", amountCents: 50_00, status: "cancelled" })).toBeNull();
  });
});

describe("projectFinanceSchema", () => {
  it("parses pt-BR money and empties", () => {
    const r = projectFinanceSchema.parse({ estimatedCost: "1.200,50", actualCost: "", revenue: "R$ 3.000", contractedValue: "", aiBaseMonths: 2 });
    expect(r).toEqual({ estimatedCost: 1200_50, actualCost: null, revenue: 3000_00, contractedValue: null, aiBaseMonths: 2 });
  });
  it("rejects invalid money", () => {
    expect(projectFinanceSchema.safeParse({ estimatedCost: "abc,1,2.3.4x", actualCost: "", revenue: "", contractedValue: "", aiBaseMonths: null }).success).toBe(false);
  });
});
