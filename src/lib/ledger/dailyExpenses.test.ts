import { describe, it, expect } from "vitest";
import {
  calculateDailyMetrics,
  simulatePurchaseImpact,
  formatLocalDate,
  getDaysInMonth,
  detectExpenseCategory,
} from "./dailyExpenses";
import {
  FinancialIncomeRow,
  FinancialSubscriptionRow,
  FinancialDebtRow,
  FinancialDailyExpenseRow,
} from "./types";

describe("dailyExpenses", () => {
  const dummyIncome: FinancialIncomeRow[] = [
    {
      id: "inc-1",
      userId: "u1",
      name: "Salary",
      amount: 4000,
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

  const dummySubs: FinancialSubscriptionRow[] = [
    {
      id: "sub-1",
      userId: "u1",
      name: "Internet & Cloud",
      amount: 400,
      currency: "USD",
      cadence: "MONTHLY",
      category: "INFRA",
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

  const dummyDebts: FinancialDebtRow[] = [
    {
      id: "debt-1",
      userId: "u1",
      name: "Student Loan",
      debtType: "STUDENT_LOAN",
      balance: 8000,
      originalPrincipal: 10000,
      interestRate: 4.5,
      minPayment: 300,
      targetPayment: null,
      dueDay: 1,
      lender: "Nelnet",
      isPaidOff: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  it("calculates basic daily metrics with fixed income and committed bills", () => {
    // 4000 income - 400 subs - 300 debts = 3300 discretionary pool
    // In a 30-day month (e.g. 2026-09), on day 10:
    // daysRemaining = 30 - 10 + 1 = 21 days
    // Assume spentEarlierInMonth = 600, spentToday = 20
    // remainingDiscretionary = 3300 - 600 = 2700
    // baseDailyAllowance = 2700 / 21 = 128.57
    // safeToSpendToday = 128.57 - 20 = 108.57
    const dailyExpenses: FinancialDailyExpenseRow[] = [
      {
        id: "exp-1",
        userId: "u1",
        amount: 600,
        currency: "USD",
        note: "Groceries earlier",
        category: "groceries",
        date: "2026-09-05",
        time: "12:00",
        createdAt: new Date("2026-09-05T12:00:00Z"),
        updatedAt: new Date("2026-09-05T12:00:00Z"),
      },
      {
        id: "exp-2",
        userId: "u1",
        amount: 20,
        currency: "USD",
        note: "Coffee & bagel",
        category: "coffee",
        date: "2026-09-10",
        time: "09:30",
        createdAt: new Date("2026-09-10T09:30:00Z"),
        updatedAt: new Date("2026-09-10T09:30:00Z"),
      },
    ];

    const metrics = calculateDailyMetrics({
      incomes: dummyIncome,
      subscriptions: dummySubs,
      debts: dummyDebts,
      dailyExpenses,
      asOfDate: "2026-09-10",
    });

    expect(metrics.availablePool).toBe(4000);
    expect(metrics.committedTotal).toBe(700);
    expect(metrics.discretionaryPool).toBe(3300);
    expect(metrics.spentEarlierInMonth).toBe(600);
    expect(metrics.spentToday).toBe(20);
    expect(metrics.totalSpentThisMonth).toBe(620);
    expect(metrics.daysInMonth).toBe(30);
    expect(metrics.currentDay).toBe(10);
    expect(metrics.daysRemaining).toBe(21);
    expect(metrics.baseDailyAllowance).toBeCloseTo(128.57, 2);
    expect(metrics.safeToSpendToday).toBeCloseTo(108.57, 2);
    expect(metrics.isOverBudgetToday).toBe(false);
    expect(metrics.todayExpenses).toHaveLength(1);
    expect(metrics.monthDailyBreakdown).toHaveLength(30);

    const day10Stat = metrics.monthDailyBreakdown.find((d) => d.dayOfMonth === 10);
    expect(day10Stat?.isToday).toBe(true);
    expect(day10Stat?.spent).toBe(20);
  });

  it("detects over-budget when spentToday exceeds baseDailyAllowance", () => {
    const dailyExpenses: FinancialDailyExpenseRow[] = [
      {
        id: "exp-over",
        userId: "u1",
        amount: 200,
        currency: "USD",
        note: "Fancy dinner",
        category: "dining",
        date: "2026-09-10",
        time: "20:00",
        createdAt: new Date("2026-09-10T20:00:00Z"),
        updatedAt: new Date("2026-09-10T20:00:00Z"),
      },
    ];

    const metrics = calculateDailyMetrics({
      incomes: dummyIncome,
      subscriptions: dummySubs,
      debts: dummyDebts,
      dailyExpenses,
      asOfDate: "2026-09-10",
    });

    // baseDailyAllowance = 3300 / 21 = 157.14
    // spentToday = 200 -> safeToSpendToday = 157.14 - 200 = -42.86
    expect(metrics.isOverBudgetToday).toBe(true);
    expect(metrics.safeToSpendToday).toBeLessThan(0);
  });

  it("calculates tomorrow consequence projections correctly", () => {
    const metrics = calculateDailyMetrics({
      incomes: dummyIncome,
      subscriptions: dummySubs,
      debts: dummyDebts,
      dailyExpenses: [],
      asOfDate: "2026-09-10",
    });

    // discretionaryPool = 3300, daysRemaining = 21
    // baseDailyAllowance = 3300 / 21 = 157.14
    // If 0 spent today: pool remaining for tomorrow = 3300 / 20 = 165
    expect(metrics.tomorrowIfZeroSpend).toBeCloseTo(165, 0);
    // If full spend today: pool remaining = (3300 - 157.14) / 20 = 157.14
    expect(metrics.tomorrowIfFullSpend).toBeCloseTo(157.14, 0);
  });

  it("simulates purchase impact with Depo 'Can I Afford It?' rules", () => {
    const metrics = calculateDailyMetrics({
      incomes: dummyIncome,
      subscriptions: dummySubs,
      debts: dummyDebts,
      dailyExpenses: [],
      asOfDate: "2026-09-10",
    });

    // metrics.baseDailyAllowance is ~157.14
    // Test small safe purchase: $50
    const safeSim = simulatePurchaseImpact(50, metrics);
    expect(safeSim.canAffordToday).toBe(true);
    expect(safeSim.severity).toBe("SAFE");
    expect(safeSim.newTodayRemaining).toBeCloseTo(107.14, 1);

    // Test large purchase that exceeds today's allowance: $250
    const tightSim = simulatePurchaseImpact(250, metrics);
    expect(tightSim.canAffordToday).toBe(false);
    expect(tightSim.severity).toBe("TIGHT");
    expect(tightSim.newTodayRemaining).toBeLessThan(0);
    expect(tightSim.repricedDailyAllowance).toBeLessThan(metrics.baseDailyAllowance);

    // Test absurdly huge purchase that exhausts total pool: $5000
    const overSim = simulatePurchaseImpact(5000, metrics);
    expect(overSim.canAffordToday).toBe(false);
    expect(overSim.severity).toBe("OVERBUDGET");
    expect(overSim.repricedDailyAllowance).toBe(0);
  });

  it("formats dates and retrieves correct days in month", () => {
    expect(getDaysInMonth(2026, 8)).toBe(30); // September
    expect(getDaysInMonth(2026, 1)).toBe(28); // Feb 2026 (non leap)
    expect(getDaysInMonth(2024, 1)).toBe(29); // Feb 2024 (leap)

    const testDate = new Date(2026, 8, 15);
    expect(formatLocalDate(testDate)).toBe("2026-09-15");
  });

  it("detects expense categories, emojis, and colors accurately", () => {
    // 1. Amazon should detect shopping with package icon
    const amazon = detectExpenseCategory("Amazon");
    expect(amazon.key).toBe("shopping");
    expect(amazon.icon).toBe("📦");
    expect(amazon.name).toBe("SHOPPING");

    // 2. Wee Indian Groceries should detect groceries with cart icon
    const grocery = detectExpenseCategory("Wee Indian Groceries");
    expect(grocery.key).toBe("groceries");
    expect(grocery.icon).toBe("🛒");
    expect(grocery.name).toBe("GROCERIES");

    // 3. Coffee & Tea
    const coffee = detectExpenseCategory("Blue Bottle Latte");
    expect(coffee.key).toBe("cafe");
    expect(coffee.icon).toBe("☕");

    // 4. Dining
    const dining = detectExpenseCategory("Chipotle Burrito");
    expect(dining.key).toBe("dining");
    expect(dining.icon).toBe("🍔");

    // 5. Transit
    const transit = detectExpenseCategory("Uber to airport");
    expect(transit.key).toBe("transit");
    expect(transit.icon).toBe("🚕");

    // 6. Entertainment
    const movie = detectExpenseCategory("Movie tickets");
    expect(movie.key).toBe("entertainment");
    expect(movie.icon).toBe("🍿");

    // 7. Explicit category override
    const explicit = detectExpenseCategory("Random thing", "cafe");
    expect(explicit.key).toBe("cafe");
    expect(explicit.icon).toBe("☕");

    // 8. Default fallback
    const fallback = detectExpenseCategory("Something unknown");
    expect(fallback.key).toBe("misc");
    expect(fallback.icon).toBe("💸");
  });
});

