import { describe, it, expect } from "vitest";
import {
  normalizeCadenceToMonthly,
  normalizeCadenceToYearly,
  calculateDaysUntilRenewal,
  calculateSubscriptionMetrics,
} from "./subscriptionMetrics";
import { FinancialSubscriptionRow } from "./types";

describe("subscriptionMetrics", () => {
  it("should correctly normalize cadences", () => {
    expect(normalizeCadenceToMonthly(120, "YEARLY")).toBe(10);
    expect(normalizeCadenceToMonthly(30, "QUARTERLY")).toBe(10);
    expect(normalizeCadenceToMonthly(10, "MONTHLY")).toBe(10);
    expect(normalizeCadenceToMonthly(10, "WEEKLY")).toBeCloseTo(43.33, 1);

    expect(normalizeCadenceToYearly(10, "MONTHLY")).toBe(120);
    expect(normalizeCadenceToYearly(100, "YEARLY")).toBe(100);
  });

  it("should calculate days until renewal", () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    const dateStr = futureDate.toISOString();

    const { daysUntil } = calculateDaysUntilRenewal(null, dateStr);
    expect(daysUntil).toBe(5);
  });

  it("treats a plain YYYY-MM-DD renewal date as a local calendar date (no UTC-offset drift)", () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const target = new Date(now);
    target.setDate(target.getDate() + 5);
    const dateOnly = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-${String(target.getDate()).padStart(2, "0")}`;

    const { daysUntil } = calculateDaysUntilRenewal(null, dateOnly);
    expect(daysUntil).toBe(5);
  });

  it("should calculate aggregate metrics and categorize subscriptions", () => {
    const subs: FinancialSubscriptionRow[] = [
      {
        id: "sub-1",
        userId: "user-1",
        name: "GitHub Copilot",
        amount: 10,
        currency: "USD",
        cadence: "MONTHLY",
        category: "SAAS",
        billingDay: 15,
        nextRenewalDate: null,
        status: "ACTIVE",
        trialEndsDate: null,
        url: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "sub-2",
        userId: "user-1",
        name: "Netflix",
        amount: 120,
        currency: "USD",
        cadence: "YEARLY",
        category: "MEDIA",
        billingDay: 1,
        nextRenewalDate: null,
        status: "ACTIVE",
        trialEndsDate: null,
        url: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "sub-3",
        userId: "user-1",
        name: "Old Gym",
        amount: 50,
        currency: "USD",
        cadence: "MONTHLY",
        category: "HEALTH",
        billingDay: 1,
        nextRenewalDate: null,
        status: "PAUSED",
        trialEndsDate: null,
        url: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const metrics = calculateSubscriptionMetrics(subs);
    expect(metrics.monthlyTotal).toBe(20); // 10 (github) + 10 (netflix)
    expect(metrics.yearlyTotal).toBe(240); // 120 + 120
    expect(metrics.activeCount).toBe(2);
    expect(metrics.pausedCount).toBe(1);
    expect(metrics.categoryBreakdown.SAAS.monthlyTotal).toBe(10);
    expect(metrics.categoryBreakdown.MEDIA.monthlyTotal).toBe(10);
    expect(metrics.upcomingRenewals.length).toBe(2);
  });
});
