import { describe, it, expect } from "vitest";
import {
  normalizeInvestmentCadenceToMonthly,
  normalizeInvestmentCadenceToYearly,
  calculateCompoundWealth,
  calculateInvestmentMetrics,
  calculateDetailedCompoundProjection,
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

    it("converts every investment into the dominant currency before summing (no raw cross-currency addition)", () => {
      const mixedInvestments: FinancialInvestmentRow[] = [
        {
          id: "inv-inr-1",
          userId: "user-1",
          name: "INR SIP A",
          assetType: "MUTUAL_FUND",
          amount: 5000,
          currency: "INR",
          cadence: "MONTHLY",
          investmentDay: 1,
          platform: "Groww",
          expectedReturnRate: 12.0,
          currentValuation: 0,
          status: "ACTIVE",
          targetAssetId: null,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "inv-inr-2",
          userId: "user-1",
          name: "INR SIP B",
          assetType: "MUTUAL_FUND",
          amount: 5000,
          currency: "INR",
          cadence: "MONTHLY",
          investmentDay: 1,
          platform: "Groww",
          expectedReturnRate: 12.0,
          currentValuation: 0,
          status: "ACTIVE",
          targetAssetId: null,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "inv-usd-1",
          userId: "user-1",
          name: "USD Brokerage",
          assetType: "STOCKS_ETF",
          amount: 500,
          currency: "USD",
          cadence: "MONTHLY",
          investmentDay: 5,
          platform: "Vanguard",
          expectedReturnRate: 10.0,
          currentValuation: 0,
          status: "ACTIVE",
          targetAssetId: null,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // 2 INR investments vs 1 USD investment => dominant currency is INR.
      const metrics = calculateInvestmentMetrics(mixedInvestments, 86.85);
      expect(metrics.currency).toBe("INR");
      // Naively summing raw amounts would give 5000 + 5000 + 500 = 10500.
      // The USD leg must be converted to INR (~43,425) before summing.
      expect(metrics.monthlyTotal).not.toBe(10500);
      expect(metrics.monthlyTotal).toBeCloseTo(5000 + 5000 + 500 * 86.85, 0);
    });

    it("includes accumulated valuation for paused investments in portfolio and category totals", () => {
      const portfolioWithPaused: FinancialInvestmentRow[] = [
        {
          id: "inv-active-1",
          userId: "user-1",
          name: "Axis Gold Direct",
          assetType: "GOLD_PRECIOUS_METALS",
          amount: 4000,
          currency: "INR",
          cadence: "MONTHLY",
          investmentDay: 20,
          platform: "Groww",
          expectedReturnRate: 20.0,
          currentValuation: 60000,
          status: "ACTIVE",
          targetAssetId: null,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "inv-paused-1",
          userId: "user-1",
          name: "ICICI Prudential Tech",
          assetType: "MUTUAL_FUND",
          amount: 1200,
          currency: "INR",
          cadence: "ANNUAL",
          investmentDay: 1,
          platform: "Groww",
          expectedReturnRate: 14.0,
          currentValuation: 40000,
          status: "PAUSED",
          targetAssetId: null,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const metrics = calculateInvestmentMetrics(portfolioWithPaused);
      expect(metrics.totalValuation).toBe(100000); // 60k + 40k
      expect(metrics.activeCount).toBe(1);
      expect(metrics.pausedCount).toBe(1);
      expect(metrics.totalCount).toBe(2);
      expect(metrics.monthlyTotal).toBe(4000); // Only active
      expect(metrics.pausedMonthlyTotal).toBe(100); // 1200 / 12

      // Category stats
      const goldCat = metrics.categoryBreakdown.GOLD_PRECIOUS_METALS;
      expect(goldCat.totalValuation).toBe(60000);
      expect(goldCat.valuationSharePct).toBe(60.0);
      expect(goldCat.monthlyTotal).toBe(4000);
      expect(goldCat.monthlySharePct).toBe(100.0);

      const mfCat = metrics.categoryBreakdown.MUTUAL_FUND;
      expect(mfCat.totalValuation).toBe(40000);
      expect(mfCat.valuationSharePct).toBe(40.0);
      expect(mfCat.monthlyTotal).toBe(0); // Paused
      expect(mfCat.pausedMonthlyTotal).toBe(100);
      expect(mfCat.pausedCount).toBe(1);
      expect(mfCat.weightedReturnRatePct).toBe(14.0);
    });
  });

  describe("Detailed Compound Wealth Projections", () => {
    it("calculates multi-year wealth horizon with non-zero initial principal", () => {
      const res = calculateDetailedCompoundProjection(10000, 12, 10, 100000);
      expect(res.initialPrincipal).toBe(100000);
      expect(res.futureContributions).toBe(1200000);
      expect(res.totalInvested).toBe(1300000);
      expect(res.projectedWealth).toBeGreaterThan(2500000);
      expect(res.wealthMultiplier).toBeGreaterThan(1.8);
      expect(res.isInflationAdjusted).toBe(false);
    });

    it("adjusts returns for inflation using real purchasing power formula", () => {
      const nominal = calculateDetailedCompoundProjection(10000, 12, 10, 100000, 0);
      const real = calculateDetailedCompoundProjection(10000, 12, 10, 100000, 6); // 6% inflation
      expect(real.isInflationAdjusted).toBe(true);
      expect(real.effectiveAnnualRatePct).toBeCloseTo(((1 + 0.12) / (1 + 0.06) - 1) * 100, 1);
      expect(real.projectedWealth).toBeLessThan(nominal.projectedWealth);
    });
  });
});
