import { describe, it, expect } from "vitest";
import {
  calculatePaymentSplit,
  getCurrentCycleKey,
  getPreviousCycleKey,
  getDebtCycleRecord,
} from "./debtCycleTracker";

describe("Debt Payment Cycle Tracker & Interest Memory", () => {
  it("generates formatted cycle key YYYY-MM", () => {
    const key = getCurrentCycleKey(1, new Date("2026-08-31T12:00:00Z"));
    expect(key).toBe("2026-08");
  });

  it("anchors the cycle to the debt's due day, not the calendar month", () => {
    // Due on the 20th; a date before the 20th is still in last month's cycle.
    expect(getCurrentCycleKey(20, new Date("2026-02-05T12:00:00Z"))).toBe("2026-01");
    // On/after the 20th, the new cycle has started.
    expect(getCurrentCycleKey(20, new Date("2026-02-25T12:00:00Z"))).toBe("2026-02");
  });

  it("computes the previous cycle key relative to the due day", () => {
    expect(getPreviousCycleKey(20, new Date("2026-02-25T12:00:00Z"))).toBe("2026-01");
    expect(getPreviousCycleKey(20, new Date("2026-02-05T12:00:00Z"))).toBe("2025-12");
  });

  it("handles user scenario: First payment $80 with $323.21 interest due", () => {
    const monthlyInterest = 323.21;
    const previouslyPaidInterest = 0;

    const step1 = calculatePaymentSplit(80, monthlyInterest, previouslyPaidInterest);

    expect(step1.paymentAmount).toBe(80);
    expect(step1.interestPortion).toBe(80);
    expect(step1.principalReduction).toBe(0);
    expect(step1.remainingInterestAfterPayment).toBe(243.21);
    expect(step1.isInterestFullyCleared).toBe(false);
  });

  it("handles user scenario: Second payment $700 in same cycle after paying $80", () => {
    const monthlyInterest = 323.21;
    const previouslyPaidInterest = 80; // from step 1

    const step2 = calculatePaymentSplit(700, monthlyInterest, previouslyPaidInterest);

    expect(step2.paymentAmount).toBe(700);
    expect(step2.interestPortion).toBe(243.21); // Only pays remainder of interest!
    expect(step2.principalReduction).toBe(456.79); // Remainder goes 100% to principal!
    expect(step2.remainingInterestAfterPayment).toBe(0);
    expect(step2.isInterestFullyCleared).toBe(true);
  });

  it("handles third payment $200 in same cycle after interest is 100% cleared", () => {
    const monthlyInterest = 323.21;
    const previouslyPaidInterest = 323.21; // 100% paid

    const step3 = calculatePaymentSplit(200, monthlyInterest, previouslyPaidInterest);

    expect(step3.paymentAmount).toBe(200);
    expect(step3.interestPortion).toBe(0); // Zero interest deducted!
    expect(step3.principalReduction).toBe(200); // 100% reduces principal!
    expect(step3.remainingInterestAfterPayment).toBe(0);
    expect(step3.isInterestFullyCleared).toBe(true);
  });

  it("returns a safe empty record with no carried-over interest outside the browser (SSR)", () => {
    const record = getDebtCycleRecord("debt-1", 50, 1);
    expect(record.interestPaidThisCycle).toBe(0);
    expect(record.carriedOverInterest).toBe(0);
    expect(record.carriedOverInterestApplied).toBe(false);
  });
});
