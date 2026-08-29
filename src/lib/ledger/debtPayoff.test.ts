import { describe, it, expect } from "vitest";
import { calculateDebtPayoff } from "./debtPayoff";
import { FinancialDebtRow } from "./types";

const mockDebts: FinancialDebtRow[] = [
  {
    id: "debt-1",
    userId: "user-1",
    name: "High APR Credit Card",
    debtType: "CREDIT_CARD",
    balance: 5000,
    originalPrincipal: 5000,
    interestRate: 24.0, // 24% APR
    minPayment: 150,
    targetPayment: 200,
    dueDay: 15,
    lender: "Chase",
    isPaidOff: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "debt-2",
    userId: "user-1",
    name: "Low APR Student Loan",
    debtType: "STUDENT_LOAN",
    balance: 8000,
    originalPrincipal: 10000,
    interestRate: 4.5, // 4.5% APR
    minPayment: 100,
    targetPayment: 100,
    dueDay: 1,
    lender: "Nelnet",
    isPaidOff: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

describe("calculateDebtPayoff", () => {
  it("should handle empty debt list gracefully", () => {
    const result = calculateDebtPayoff([], "AVALANCHE", 0);
    expect(result.monthsToPayoff).toBe(0);
    expect(result.totalInterestPaid).toBe(0);
    expect(result.debtFreeDate).toBe("Debt-Free Today!");
  });

  it("should calculate Avalanche payoff order prioritizing highest APR", () => {
    const result = calculateDebtPayoff(mockDebts, "AVALANCHE", 200);
    expect(result.monthsToPayoff).toBeGreaterThan(0);
    expect(result.payoffMilestones.length).toBe(2);
    const debt1Milestone = result.payoffMilestones.find((m) => m.debtId === "debt-1");
    const debt2Milestone = result.payoffMilestones.find((m) => m.debtId === "debt-2");
    expect(debt1Milestone).toBeDefined();
    expect(debt2Milestone).toBeDefined();
    expect(debt1Milestone!.payoffMonth).toBeLessThan(debt2Milestone!.payoffMonth);
  });

  it("should calculate Snowball payoff order prioritizing lowest balance", () => {
    const snowballDebts: FinancialDebtRow[] = [
      {
        ...mockDebts[0],
        id: "d1",
        balance: 10000,
        interestRate: 20,
        minPayment: 250,
      },
      {
        ...mockDebts[1],
        id: "d2",
        balance: 1000,
        interestRate: 5,
        minPayment: 50,
      },
    ];

    const result = calculateDebtPayoff(snowballDebts, "SNOWBALL", 100);
    expect(result.payoffMilestones[0].debtId).toBe("d2");
  });

  it("should demonstrate savings when extra payment is applied", () => {
    const baseline = calculateDebtPayoff(mockDebts, "AVALANCHE", 0);
    const accelerated = calculateDebtPayoff(mockDebts, "AVALANCHE", 300);

    expect(accelerated.monthsToPayoff).toBeLessThan(baseline.monthsToPayoff);
    expect(accelerated.totalInterestPaid).toBeLessThan(baseline.totalInterestPaid);
    expect(accelerated.interestSavedVsMinimums).toBeGreaterThan(0);
    expect(accelerated.monthsSavedVsMinimums).toBeGreaterThan(0);
  });

  it("should simulate one-time lump sum windfall payments", () => {
    const withoutLump = calculateDebtPayoff(mockDebts, "AVALANCHE", 100, 0);
    const withLump = calculateDebtPayoff(mockDebts, "AVALANCHE", 100, 2000);

    expect(withLump.monthsToPayoff).toBeLessThan(withoutLump.monthsToPayoff);
    expect(withLump.totalInterestPaid).toBeLessThan(withoutLump.totalInterestPaid);
    expect(withLump.interestSavedVsMinimums).toBeGreaterThan(withoutLump.interestSavedVsMinimums);
  });
});
