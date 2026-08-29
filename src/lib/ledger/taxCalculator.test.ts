import { describe, it, expect } from "vitest";
import { calculateIncomeTax } from "./taxCalculator";

describe("taxCalculator", () => {
  it("returns 0 tax if isPreTax is false (Take-home)", () => {
    const res = calculateIncomeTax({
      amount: 10000,
      cadence: "MONTHLY",
      isPreTax: false,
    });
    expect(res.totalTaxAnnual).toBe(0);
    expect(res.totalTaxMonthly).toBe(0);
    expect(res.effectiveTaxRatePct).toBe(0);
    expect(res.netMonthlyIncome).toBe(10000);
    expect(res.jurisdictionLabel).toContain("Post-Tax");
  });

  it("calculates US Federal + Texas (0% state tax)", () => {
    const res = calculateIncomeTax({
      amount: 100000,
      cadence: "ANNUAL",
      isPreTax: true,
      country: "US",
      region: "TX",
    });
    expect(res.grossAnnual).toBe(100000);
    expect(res.grossMonthly).toBeCloseTo(8333.33, 1);
    expect(res.stateTaxAnnual).toBe(0); // Texas has 0% state income tax
    expect(res.federalTaxAnnual).toBeGreaterThan(0);
    expect(res.ficaTaxAnnual).toBeGreaterThan(0);
    expect(res.effectiveTaxRatePct).toBeGreaterThan(15);
    expect(res.effectiveTaxRatePct).toBeLessThan(28);
    expect(res.netMonthlyIncome).toBeLessThan(res.grossMonthly);
  });

  it("calculates US Federal + California with higher progressive state tax than Texas", () => {
    const tx = calculateIncomeTax({
      amount: 150000,
      cadence: "ANNUAL",
      isPreTax: true,
      country: "US",
      region: "TX",
    });

    const ca = calculateIncomeTax({
      amount: 150000,
      cadence: "ANNUAL",
      isPreTax: true,
      country: "US",
      region: "CA",
    });

    expect(ca.stateTaxAnnual).toBeGreaterThan(0);
    expect(ca.totalTaxAnnual).toBeGreaterThan(tx.totalTaxAnnual);
    expect(ca.effectiveTaxRatePct).toBeGreaterThan(tx.effectiveTaxRatePct);
    expect(ca.netMonthlyIncome).toBeLessThan(tx.netMonthlyIncome);
  });

  it("calculates custom effective tax rate overrides", () => {
    const res = calculateIncomeTax({
      amount: 120000,
      cadence: "ANNUAL",
      isPreTax: true,
      customTaxRate: 25,
    });
    expect(res.effectiveTaxRatePct).toBe(25);
    expect(res.totalTaxAnnual).toBe(30000);
    expect(res.totalTaxMonthly).toBe(2500);
    expect(res.netMonthlyIncome).toBe(7500);
  });

  it("calculates UK tax correctly with personal allowance", () => {
    const res = calculateIncomeTax({
      amount: 60000,
      cadence: "ANNUAL",
      isPreTax: true,
      country: "UK",
    });
    expect(res.federalTaxAnnual).toBeGreaterThan(0);
    expect(res.ficaTaxAnnual).toBeGreaterThan(0); // National Insurance
    expect(res.effectiveTaxRatePct).toBeGreaterThan(20);
  });
});
