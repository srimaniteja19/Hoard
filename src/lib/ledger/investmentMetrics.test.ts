import { describe, it, expect } from "vitest";
import {
  normalizeInvestmentCadenceToMonthly,
  normalizeInvestmentCadenceToYearly,
  calculateCompoundWealth,
  calculateInvestmentMetrics,
} from "./investmentMetrics";
import { FinancialInvestmentRow } from "./types";

describe("Investment Metrics & Compounding Calculator", () => {
  describe("Cadence Normalizers", () => {
    it("normalizes monthly cadences", () => {
      expect(normalizeInvestmentCadenceToMonthly(500, "MONTHLY")).toBe(500);
      expect(normalizeInvestmentCadenceToYearly(500, "MONTHLY")).toBe(6000);
    });

    it("normalizes biweekly and weekly cadences", () => {
      expect(normalizeInvestmentCadenceToMonthly(200, "BIWEEKLY")).toBeCloseTo((200 * 26) / 12);
      expect(normalizeInvestmentCadenceToMonthly(100, "WEEKLY")).toBeCloseTo((100 * 52) / 12);
    });

    it("normalizes daily and annual cadences", () => {
      expect(normalizeInvestmentCadenceToMonthly(10, "DAILY")).toBeCloseTo((10 * 365) / 12);
      expect(normalizeInvestmentCadenceToMonthly(12000, "ANNUAL")).toBe(1000);
    });
  });

  describe("Compound Wealth Calculations", () => {
    it("calculates zero return without compounding error", () => {
      const res = calculateCompoundWealth(500, 0, 5, 1000);
      expect(res.totalInvested).toBe(1000 + 500 * 60);
      expect(res.projectedWealth).toBe(res.totalInvested);
      expect(res.interestEarned).toBe(0);
    });

    it("calculates compound returns accurately for 10% annual S&P growth over 10 years", () => {
      const res = calculateCompoundWealth(500, 10, 10, 0);
      // 500/mo at 10% for 10 yrs = ~102,422
      expect(res.totalInvested).toBe(60000);
      expect(res.projectedWealth).toBeGreaterThan(100000);
      expect(res.interestEarned).toBe(res.projectedWealth - res.totalInvested);
    });
  });

  describe("Investment Metrics Aggregator", () => {
    it("aggregates portfolio across Gold, Stocks, and Mutual Funds", () => {
      const mockInvestments: FinancialInvestmentRow[] = [
        {
          id: "inv-1",
          userId: "user-1",
          name: "Sovereign Gold Bond SIP",
          assetType: "GOLD_PRECIOUS_METALS",
          amount: 200,
          currency: "USD",
          cadence: "MONTHLY",
          investmentDay: 1,
          platform: "Gold Vault",
          expectedReturnRate: 8.0,
          currentValuation: 2500,
          status: "ACTIVE",
          targetAssetId: null,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "inv-2",
          userId: "user-1",
          name: "Vanguard S&P 500 (VOO)",
          assetType: "STOCKS_ETF",
          amount: 500,
          currency: "USD",
          cadence: "MONTHLY",
          investmentDay: 5,
          platform: "Vanguard",
          expectedReturnRate: 10.0,
          currentValuation: 12000,
          status: "ACTIVE",
          targetAssetId: null,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "inv-3",
          userId: "user-1",
          name: "Paused Tech Fund",
          assetType: "MUTUAL_FUND",
          amount: 300,
          currency: "USD",
          cadence: "MONTHLY",
          investmentDay: 10,
          platform: "Fidelity",
          expectedReturnRate: 12.0,
          currentValuation: 0,
          status: "PAUSED",
          targetAssetId: null,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const metrics = calculateInvestmentMetrics(mockInvestments);
      expect(metrics.activeCount).toBe(2);
      expect(metrics.pausedCount).toBe(1);
      expect(metrics.monthlyTotal).toBe(700);
      expect(metrics.yearlyTotal).toBe(8400);
      expect(metrics.categoryBreakdown.GOLD_PRECIOUS_METALS.monthlyTotal).toBe(200);
      expect(metrics.categoryBreakdown.STOCKS_ETF.monthlyTotal).toBe(500);
      expect(metrics.categoryBreakdown.MUTUAL_FUND.monthlyTotal).toBe(0); // paused
      expect(metrics.compoundProjections.length).toBeGreaterThan(0);
    });
  });
});
