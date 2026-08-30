import { describe, it, expect } from "vitest";
import { calculateFireMetrics, simulateFireDelta } from "./fireCalculator";

describe("fireCalculator", () => {
  it("calculates 4% standard FIRE number correctly", () => {
    const metrics = calculateFireMetrics({
      currentNetWorth: 50_000,
      annualExpenses: 40_000,
      monthlyContribution: 2_000,
      expectedCagrPct: 10,
      safeWithdrawalRatePct: 4,
      currentAge: 30,
    });

    expect(metrics.targetFireNumber).toBe(1_000_000); // 40,000 / 0.04
    expect(metrics.currentProgressPct).toBe(5.0); // 50k / 1M = 5%
    expect(metrics.yearsToFire).toBeGreaterThan(5);
    expect(metrics.yearsToFire).toBeLessThan(25);
    expect(metrics.projectedFireAge).toBeGreaterThan(30);
    expect(metrics.annualPassiveIncomeAtFire).toBe(40_000);
    expect(metrics.monthlyPassiveIncomeAtFire).toBe(3333);
  });

  it("handles when current net worth already meets FIRE target", () => {
    const metrics = calculateFireMetrics({
      currentNetWorth: 1_200_000,
      annualExpenses: 30_000,
      monthlyContribution: 1_000,
      expectedCagrPct: 8,
      safeWithdrawalRatePct: 4,
      currentAge: 40,
    });

    expect(metrics.targetFireNumber).toBe(750_000); // 30k / 0.04
    expect(metrics.currentProgressPct).toBe(100);
    expect(metrics.monthsToFire).toBe(0);
    expect(metrics.projectedFireAge).toBe(40);
  });

  it("simulates delta and computes years of life reclaimed", () => {
    const delta = simulateFireDelta(
      {
        currentNetWorth: 20_000,
        annualExpenses: 48_000,
        monthlyContribution: 1_000,
        expectedCagrPct: 8,
        safeWithdrawalRatePct: 4,
        currentAge: 28,
      },
      {
        currentNetWorth: 20_000,
        annualExpenses: 42_000, // culled $500/mo expenses
        monthlyContribution: 2_500, // boosted monthly SIP
        expectedCagrPct: 10,
        safeWithdrawalRatePct: 4,
        currentAge: 28,
      }
    );

    expect(delta.yearsReclaimed).toBeGreaterThan(5);
    expect(delta.optimizedFireAge).toBeLessThan(delta.baselineFireAge);
  });
});
