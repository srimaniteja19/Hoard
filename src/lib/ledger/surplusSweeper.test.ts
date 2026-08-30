import { describe, it, expect } from "vitest";
import { calculateSurplusAllocation, SWEEPER_PRESET_CONFIGS } from "./surplusSweeper";

describe("surplusSweeper", () => {
  it("calculates Aggressive Compounder allocation accurately", () => {
    const surplus = 2937.27;
    const strategy = calculateSurplusAllocation(surplus, "AGGRESSIVE_COMPOUNDER", 86.85);

    expect(strategy.allocations.length).toBe(3);
    const equityAlloc = strategy.allocations.find((a) => a.category === "EQUITY_SIP");
    const goldAlloc = strategy.allocations.find((a) => a.category === "PRECIOUS_METALS");
    const cashAlloc = strategy.allocations.find((a) => a.category === "HYSA_CASH");

    expect(equityAlloc?.percentage).toBe(60);
    expect(goldAlloc?.percentage).toBe(20);
    expect(cashAlloc?.percentage).toBe(20);

    const totalUsdAllocated = strategy.allocations.reduce((sum, a) => sum + a.amountUsd, 0);
    expect(Math.abs(totalUsdAllocated - surplus)).toBeLessThan(1.0);
    expect(strategy.projectedTenYearCompoundedUsd).toBeGreaterThan(400_000);
  });

  it("assigns highest APR debt when Debt Knockout preset is selected", () => {
    const debts = [
      { id: "1", userId: "u1", name: "Low APR Loan", balance: 5000, interestRate: 5.5, minPayment: 100, isPaidOff: false } as any,
      { id: "2", userId: "u1", name: "Amex Credit Card", balance: 8000, interestRate: 24.99, minPayment: 250, lender: "Amex", isPaidOff: false } as any,
    ];

    const strategy = calculateSurplusAllocation(1500, "DEBT_KNOCKOUT", 86.85, debts);
    const debtAlloc = strategy.allocations.find((a) => a.category === "DEBT_PAYOFF");

    expect(debtAlloc?.percentage).toBe(50);
    expect(debtAlloc?.targetAccountName).toContain("Amex Credit Card (24.99% APR)");
    expect(debtAlloc?.targetPlatform).toBe("Amex");
  });
});
