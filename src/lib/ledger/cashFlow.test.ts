import { describe, it, expect } from "vitest";
import { normalizeIncomeToMonthly, calculateCashFlow } from "./cashFlow";
import {
  FinancialIncomeRow,
  FinancialSubscriptionRow,
  FinancialDebtRow,
  FinancialAssetRow,
} from "./types";

describe("cashFlow", () => {
  it("should normalize income streams to monthly equivalent", () => {
    expect(normalizeIncomeToMonthly(5000, "MONTHLY")).toBe(5000);
    expect(normalizeIncomeToMonthly(120000, "ANNUAL")).toBe(10000);
    expect(normalizeIncomeToMonthly(2000, "BIWEEKLY")).toBeCloseTo(4333.33, 1);
  });

  it("should calculate net surplus, liquid runway, and net worth for post-tax income", () => {
    const incomes: FinancialIncomeRow[] = [
      {
        id: "inc-1",
        userId: "u1",
        name: "Salary",
        amount: 6000,
        cadence: "MONTHLY",
        category: "SALARY",
        isActive: true,
        isPreTax: false,
        country: "US",
        region: "TX",
        customTaxRate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const subs: FinancialSubscriptionRow[] = [
      {
        id: "sub-1",
        userId: "u1",
        name: "Tools",
        amount: 200,
        currency: "USD",
        cadence: "MONTHLY",
        category: "SAAS",
        billingDay: 1,
        nextRenewalDate: null,
        status: "ACTIVE",
        trialEndsDate: null,
        url: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const debts: FinancialDebtRow[] = [
      {
        id: "debt-1",
        userId: "u1",
        name: "Car Loan",
        debtType: "AUTO_LOAN",
        balance: 10000,
        originalPrincipal: 15000,
        interestRate: 6.0,
        minPayment: 300,
        targetPayment: 300,
        dueDay: 1,
        lender: "Bank",
        isPaidOff: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const assets: FinancialAssetRow[] = [
      {
        id: "ast-1",
        userId: "u1",
        name: "Emergency HYSA",
        category: "HYSA",
        value: 5000,
        institution: "Marcus",
        expectedYield: 4.5,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "ast-2",
        userId: "u1",
        name: "Index Fund",
        category: "INVESTMENT",
        value: 20000,
        institution: "Vanguard",
        expectedYield: 8.0,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const { cashFlow, netWorth } = calculateCashFlow(incomes, subs, debts, assets);

    expect(cashFlow.monthlyGrossIncome).toBe(6000);
    expect(cashFlow.monthlyTaxWithholding).toBe(0);
    expect(cashFlow.monthlyNetTakeHome).toBe(6000);
    expect(cashFlow.totalFixedOutflow).toBe(500);
    expect(cashFlow.monthlyNetSurplus).toBe(5500);
    expect(cashFlow.runwayMonths).toBe(10);

    expect(netWorth.totalAssets).toBe(25000);
    expect(netWorth.totalLiabilities).toBe(10000);
    expect(netWorth.netWorth).toBe(15000);
  });

  it("should calculate automated tax deductions for pre-tax salary in California", () => {
    const incomes: FinancialIncomeRow[] = [
      {
        id: "inc-pretax",
        userId: "u1",
        name: "Gross Salary",
        amount: 120000,
        cadence: "ANNUAL",
        category: "SALARY",
        isActive: true,
        isPreTax: true,
        country: "US",
        region: "CA",
        customTaxRate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const { cashFlow } = calculateCashFlow(incomes, [], [], []);

    expect(cashFlow.monthlyGrossIncome).toBe(10000);
    expect(cashFlow.monthlyTaxWithholding).toBeGreaterThan(1500);
    expect(cashFlow.monthlyNetTakeHome).toBeLessThan(10000);
    expect(cashFlow.monthlyNetSurplus).toBe(cashFlow.monthlyNetTakeHome);
  });
});
