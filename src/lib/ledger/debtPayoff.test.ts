import { describe, it, expect } from "vitest";
import { calculateDebtPayoff, calculateDebtObligationsSummary } from "./debtPayoff";
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

  it("flags a non-converging payoff instead of claiming the full balance was paid off", () => {
    // Minimum payment ($10, the simulator's floor) doesn't come close to
    // covering the ~$208/mo interest this balance accrues at 25% APR.
    const neverPayableDebt: FinancialDebtRow[] = [
      {
        ...mockDebts[0],
        id: "runaway-debt",
        balance: 10000,
        interestRate: 25.0,
        minPayment: 10,
      },
    ];

    const result = calculateDebtPayoff(neverPayableDebt, "AVALANCHE", 0);

    expect(result.isDivergent).toBe(true);
    expect(result.monthsToPayoff).toBe(360);
    expect(result.debtFreeDate).not.toMatch(/^[A-Z][a-z]{2} \d{4}$/); // not a fake "Mon YYYY" date
    // Balance only ever grew (interest vastly outpaces the minimum), so no
    // real progress was made on principal — never negative.
    expect(result.totalPrincipalPaid).toBe(0);
  });
});

describe("calculateDebtObligationsSummary", () => {
  it("should handle empty debt list gracefully", () => {
    const summary = calculateDebtObligationsSummary([]);
    expect(summary.activeCount).toBe(0);
    expect(summary.totalBalance).toBe(0);
    expect(summary.totalMinMonthly).toBe(0);
    expect(summary.totalMonthlyInterest).toBe(0);
    expect(summary.dailyInterestBurn).toBe(0);
    expect(summary.annualInterestDrain).toBe(0);
    expect(summary.weightedApr).toBe(0);
    expect(summary.topInterestBleeder).toBeNull();
    expect(summary.accounts).toEqual([]);
  });

  it("should accurately compute monthly interest, total minimums, and weighted APR", () => {
    const summary = calculateDebtObligationsSummary(mockDebts);

    expect(summary.activeCount).toBe(2);
    expect(summary.totalBalance).toBe(13000);
    expect(summary.totalMinMonthly).toBe(250); // 150 + 100
    expect(summary.totalMonthlyInterest).toBe(130); // 100 + 30
    expect(summary.dailyInterestBurn).toBe(4.33); // 130 / 30
    expect(summary.annualInterestDrain).toBe(1560); // 130 * 12
    expect(summary.annualMinCommitment).toBe(3000); // 250 * 12
    expect(summary.weightedApr).toBe(12); // (5000*24 + 8000*4.5) / 13000 = 12.0%
    expect(summary.netPrincipalFromMinimums).toBe(120); // 250 - 130
    expect(summary.principalRatio).toBe(48); // 120 / 250 = 48%
    expect(summary.interestRatio).toBe(52); // 130 / 250 = 52%
    expect(summary.isNegativeAmortization).toBe(false);

    // Verify top bleeder is the high APR card
    expect(summary.topInterestBleeder).toBeDefined();
    expect(summary.topInterestBleeder?.id).toBe("debt-1");
    expect(summary.topInterestBleeder?.monthlyInterest).toBe(100);
    expect(summary.topInterestBleeder?.shareOfTotalInterest).toBe(77); // 100/130 ~ 77%

    // Verify account details
    expect(summary.accounts.length).toBe(2);
    const card = summary.accounts.find((a) => a.id === "debt-1");
    expect(card?.monthlyInterest).toBe(100);
    expect(card?.principalPortion).toBe(50);
    expect(card?.interestRatio).toBe(67);
  });

  it("should detect negative amortization when interest exceeds minimum payments", () => {
    const underwaterDebts: FinancialDebtRow[] = [
      {
        ...mockDebts[0],
        balance: 10000,
        interestRate: 24, // $200/mo interest
        minPayment: 50, // $50/mo minimum
      },
    ];

    const summary = calculateDebtObligationsSummary(underwaterDebts);
    expect(summary.isNegativeAmortization).toBe(true);
    expect(summary.totalMonthlyInterest).toBe(200);
    expect(summary.totalMinMonthly).toBe(50);
    expect(summary.netPrincipalFromMinimums).toBe(0);
    expect(summary.interestRatio).toBe(100);
    expect(summary.principalRatio).toBe(0);
  });

  it("should ignore paid off debts", () => {
    const debtsWithPaid: FinancialDebtRow[] = [
      ...mockDebts,
      {
        ...mockDebts[0],
        id: "paid-debt",
        name: "Old Paid Card",
        balance: 0,
        minPayment: 100,
        isPaidOff: true,
      },
    ];

    const summary = calculateDebtObligationsSummary(debtsWithPaid);
    expect(summary.activeCount).toBe(2);
    expect(summary.totalBalance).toBe(13000);
    expect(summary.accounts.some((a) => a.id === "paid-debt")).toBe(false);
  });
});

