import {
  FinancialIncomeRow,
  FinancialSubscriptionRow,
  FinancialDebtRow,
  FinancialAssetRow,
  FinancialInvestmentRow,
  FinancialDailyExpenseRow,
  DailyExpenseMetrics,
  DailyExpenseDayStat,
  DailyExpenseBenchmarks,
  PurchaseSimulationResult,
  ExpenseAnalyticsPayload,
  CategorySpendBreakdown,
  DayOfWeekSpend,
  PeriodSpendMetrics,
} from "./types";
import { calculateCashFlow } from "./cashFlow";

export function formatLocalDate(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatLocalTime(d: Date = new Date()): string {
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function getDaysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export interface CalculateDailyMetricsParams {
  incomes: FinancialIncomeRow[];
  subscriptions: FinancialSubscriptionRow[];
  debts: FinancialDebtRow[];
  investments?: FinancialInvestmentRow[];
  assets?: FinancialAssetRow[];
  dailyExpenses: FinancialDailyExpenseRow[];
  asOfDate?: Date | string;
  customFxInrRate?: number;
  customMonthlyBudget?: number;
}

export function calculateDailyMetrics(params: CalculateDailyMetricsParams): DailyExpenseMetrics {
  const {
    incomes = [],
    subscriptions = [],
    debts = [],
    investments = [],
    assets = [],
    dailyExpenses = [],
    asOfDate,
    customFxInrRate,
    customMonthlyBudget,
  } = params;

  let targetDate: Date;
  if (asOfDate instanceof Date) {
    targetDate = asOfDate;
  } else if (typeof asOfDate === "string" && asOfDate.trim()) {
    const [y, m, d] = asOfDate.split("-").map(Number);
    targetDate = new Date(y, (m || 1) - 1, d || 1);
  } else {
    targetDate = new Date();
  }

  const year = targetDate.getFullYear();
  const month = targetDate.getMonth(); // 0-indexed
  const currentDay = targetDate.getDate();
  const daysInMonth = getDaysInMonth(year, month);
  const daysRemaining = Math.max(1, daysInMonth - currentDay + 1);

  const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const todayStr = `${monthPrefix}-${String(currentDay).padStart(2, "0")}`;

  // Calculate Cash Flow to find available income & committed fixed expenses
  const cashFlowRes = calculateCashFlow(
    incomes,
    subscriptions,
    debts,
    assets,
    investments,
    customFxInrRate
  );

  const netTakeHome = cashFlowRes.cashFlow.monthlyNetTakeHome;
  const grossIncome = cashFlowRes.cashFlow.monthlyGrossIncome;
  const committedTotal =
    cashFlowRes.cashFlow.totalFixedOutflow +
    (cashFlowRes.cashFlow.monthlyRecurringInvestmentsUsd || 0);

  let availablePool = 0;
  if (customMonthlyBudget && customMonthlyBudget > 0) {
    availablePool = customMonthlyBudget;
  } else if (netTakeHome > 0) {
    availablePool = netTakeHome;
  } else if (grossIncome > 0) {
    availablePool = grossIncome;
  } else {
    const liquid = cashFlowRes.cashFlow.liquidCashTotal;
    availablePool = liquid > 0 ? Math.min(liquid, 3500) : 3000;
  }

  const discretionaryPool = Math.max(0, Math.round((availablePool - committedTotal) * 100) / 100);

  // Filter expenses for this calendar month
  const monthExpenses = dailyExpenses.filter(
    (e) => e.date && e.date.startsWith(monthPrefix)
  );

  const earlierExpenses = monthExpenses.filter((e) => e.date < todayStr);
  const todayExpenses = monthExpenses.filter((e) => e.date === todayStr);

  const spentEarlierInMonth = Math.round(
    earlierExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0) * 100
  ) / 100;

  const spentToday = Math.round(
    todayExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0) * 100
  ) / 100;

  const totalSpentThisMonth = Math.round((spentEarlierInMonth + spentToday) * 100) / 100;

  // Base daily allowance for remaining days (inclusive of today)
  const remainingDiscretionary = Math.max(0, discretionaryPool - spentEarlierInMonth);
  const baseDailyAllowance = Math.round((remainingDiscretionary / daysRemaining) * 100) / 100;

  // Safe to spend today is allowance minus what was already spent today
  const safeToSpendToday = Math.round((baseDailyAllowance - spentToday) * 100) / 100;
  const isOverBudgetToday = safeToSpendToday < 0;

  // Consequence projections for tomorrow
  const remainingDaysTomorrow = Math.max(1, daysRemaining - 1);
  const poolIfZero = Math.max(0, discretionaryPool - spentEarlierInMonth - spentToday);
  const tomorrowIfZeroSpend = Math.round((poolIfZero / remainingDaysTomorrow) * 100) / 100;

  const poolIfFull = Math.max(0, discretionaryPool - spentEarlierInMonth - baseDailyAllowance);
  const tomorrowIfFullSpend = Math.round((poolIfFull / remainingDaysTomorrow) * 100) / 100;

  // Month-at-a-glance daily breakdown
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthDailyBreakdown: DailyExpenseDayStat[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dayStr = `${monthPrefix}-${String(day).padStart(2, "0")}`;
    const dayExpenses = monthExpenses.filter((e) => e.date === dayStr);
    const daySpent = Math.round(dayExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0) * 100) / 100;
    const dObj = new Date(year, month, day);
    const dayOfWeek = dayNames[dObj.getDay()];

    const isDayToday = day === currentDay;
    const isPast = day < currentDay;
    const isFuture = day > currentDay;
    const isOver = isDayToday ? isOverBudgetToday : isPast ? daySpent > baseDailyAllowance : false;

    monthDailyBreakdown.push({
      date: dayStr,
      dayOfMonth: day,
      dayOfWeek,
      spent: daySpent,
      count: dayExpenses.length,
      allowanceThreshold: baseDailyAllowance,
      isToday: isDayToday,
      isPast,
      isFuture,
      isOverBudget: isOver,
    });
  }

  // Self-comparison benchmarks
  let last7Total = 0;
  let last7Count = 0;
  for (let d = Math.max(1, currentDay - 7); d < currentDay; d++) {
    const stat = monthDailyBreakdown[d - 1];
    if (stat) {
      last7Total += stat.spent;
      last7Count++;
    }
  }

  let prior7Total = 0;
  let prior7Count = 0;
  for (let d = Math.max(1, currentDay - 14); d < Math.max(1, currentDay - 7); d++) {
    const stat = monthDailyBreakdown[d - 1];
    if (stat) {
      prior7Total += stat.spent;
      prior7Count++;
    }
  }

  const benchmarks: DailyExpenseBenchmarks = {
    last7DaysTotal: Math.round(last7Total * 100) / 100,
    last7DaysDailyAvg: last7Count > 0 ? Math.round((last7Total / last7Count) * 100) / 100 : 0,
    prior7DaysTotal: Math.round(prior7Total * 100) / 100,
    prior7DaysDailyAvg: prior7Count > 0 ? Math.round((prior7Total / prior7Count) * 100) / 100 : 0,
    monthToDateTotal: totalSpentThisMonth,
    monthToDateDailyAvg: currentDay > 0 ? Math.round((totalSpentThisMonth / currentDay) * 100) / 100 : 0,
    todayAllowance: baseDailyAllowance,
  };

  return {
    availablePool,
    committedTotal: Math.round(committedTotal * 100) / 100,
    discretionaryPool,
    spentEarlierInMonth,
    spentToday,
    totalSpentThisMonth,
    daysInMonth,
    currentDay,
    daysRemaining,
    safeToSpendToday,
    baseDailyAllowance,
    tomorrowIfZeroSpend,
    tomorrowIfFullSpend,
    isOverBudgetToday,
    currency: "USD",
    todayExpenses,
    monthDailyBreakdown,
    benchmarks,
  };
}

export function simulatePurchaseImpact(
  amount: number,
  metrics: DailyExpenseMetrics
): PurchaseSimulationResult {
  const purchaseAmount = Math.max(0, Number(amount) || 0);
  const effectiveSpentToday = Math.round((metrics.spentToday + purchaseAmount) * 100) / 100;
  const newTodayRemaining = Math.round((metrics.baseDailyAllowance - effectiveSpentToday) * 100) / 100;
  const remainingDaysAfterToday = Math.max(1, metrics.daysRemaining - 1);

  const remainingPoolAfterToday = Math.max(
    0,
    metrics.discretionaryPool - metrics.spentEarlierInMonth - effectiveSpentToday
  );
  const repricedDailyAllowance =
    Math.round((remainingPoolAfterToday / remainingDaysAfterToday) * 100) / 100;

  const dailyAllowanceDelta =
    Math.round((repricedDailyAllowance - metrics.baseDailyAllowance) * 100) / 100;

  const canAffordToday = newTodayRemaining >= 0;

  let severity: "SAFE" | "TIGHT" | "OVERBUDGET" = "SAFE";
  let verdict = "";

  if (canAffordToday) {
    severity = "SAFE";
    verdict = `Safe to spend! You'll still have $${newTodayRemaining.toFixed(
      0
    )} left today and $${repricedDailyAllowance.toFixed(0)}/day tomorrow.`;
  } else if (repricedDailyAllowance > 0) {
    severity = "TIGHT";
    verdict = `Cuts tomorrow's allowance by $${Math.abs(dailyAllowanceDelta).toFixed(
      0
    )}/day (down to $${repricedDailyAllowance.toFixed(0)}/day for the next ${remainingDaysAfterToday} days).`;
  } else {
    severity = "OVERBUDGET";
    verdict = `Exceeds your remaining discretionary budget for this entire month.`;
  }

  return {
    amount: purchaseAmount,
    effectiveSpentToday,
    newTodayRemaining,
    newTomorrowAllowance: repricedDailyAllowance,
    repricedDailyAllowance,
    dailyAllowanceDelta,
    canAffordToday,
    severity,
    verdict,
  };
}

export interface ExpenseCategoryConfig {
  key: string;
  name: string;
  icon: string;
  color: string;
  bg: string;
  border: string;
  bar: string;
  keywords: string[];
}

export const EXPENSE_CATEGORIES: ExpenseCategoryConfig[] = [
  {
    key: "groceries",
    name: "GROCERIES",
    icon: "🛒",
    color: "#0A0A0A",
    bg: "#B8F04A",
    border: "#0A0A0A",
    bar: "#84CC16",
    keywords: [
      "grocer", "grocery", "groceries", "wee", "weee", "indian", "patel", "trader",
      "whole foods", "safeway", "market", "costco", "supermarket", "produce",
      "veggie", "vegetable", "fruit", "milk", "bread", "eggs", "sprouts",
      "heb", "aldi", "kroger", "bazaar", "mart", "provisions", "food market"
    ],
  },
  {
    key: "cafe",
    name: "COFFEE & TEA",
    icon: "☕",
    color: "#0A0A0A",
    bg: "#FCE94F",
    border: "#0A0A0A",
    bar: "#EAB308",
    keywords: [
      "coffee", "cafe", "starbucks", "espresso", "latte", "cappuccino",
      "tea", "boba", "matcha", "bakery", "croissant", "pastry", "dunkin",
      "peet", "blue bottle", "roaster", "chai", "bagel"
    ],
  },
  {
    key: "dining",
    name: "DINING OUT",
    icon: "🍔",
    color: "#0A0A0A",
    bg: "#FF9E2C",
    border: "#0A0A0A",
    bar: "#F97316",
    keywords: [
      "food", "lunch", "dinner", "breakfast", "brunch", "pizza", "burger",
      "chipotle", "restaurant", "doordash", "uber eats", "grubhub", "sushi",
      "taco", "tacos", "noodles", "thai", "sweetgreen", "mcdonald", "shake shack",
      "subway", "curry", "diner", "eat", "takeout", "shawarma", "biryani",
      "sandwich", "ramen", "bbq", "ice cream"
    ],
  },
  {
    key: "shopping",
    name: "SHOPPING",
    icon: "📦",
    color: "#0A0A0A",
    bg: "#7FE9F7",
    border: "#0A0A0A",
    bar: "#06B6D4",
    keywords: [
      "amazon", "shopping", "target", "walmart", "clothes", "clothing", "shoes",
      "order", "store", "zara", "nike", "apple", "best buy", "ikea", "mall",
      "electronics", "gadget", "book", "books", "haul", "ebay", "aliexpress",
      "uniqlo", "h&m"
    ],
  },
  {
    key: "transit",
    name: "TRANSIT & FUEL",
    icon: "🚕",
    color: "#0A0A0A",
    bg: "#FDE047",
    border: "#0A0A0A",
    bar: "#EAB308",
    keywords: [
      "uber", "lyft", "gas", "fuel", "metro", "transit", "train", "bus",
      "flight", "airline", "parking", "toll", "shell", "chevron", "subway",
      "transit ticket", "train ticket", "flight ticket", "plane ticket", "cab", "taxi", "amtrak", "scooter"
    ],
  },
  {
    key: "entertainment",
    name: "FUN & MEDIA",
    icon: "🍿",
    color: "#0A0A0A",
    bg: "#D8B4FE",
    border: "#0A0A0A",
    bar: "#A855F7",
    keywords: [
      "movie", "cinema", "netflix", "spotify", "game", "gaming", "steam",
      "nintendo", "playstation", "xbox", "hulu", "disney", "concert", "show",
      "event", "theatre", "theater", "youtube", "audible", "arcade", "movie ticket", "cinema ticket", "tickets"
    ],
  },
  {
    key: "health",
    name: "HEALTH & CARE",
    icon: "💊",
    color: "#0F766E",
    bg: "#5EEAD4",
    border: "#0A0A0A",
    bar: "#14B8A6",
    keywords: [
      "health", "pharmacy", "cvs", "walgreens", "doctor", "gym", "meds",
      "medicine", "haircut", "salon", "dentist", "fitness", "workout",
      "clinic", "spa", "skin", "supplement", "protein", "hospital"
    ],
  },
  {
    key: "utilities",
    name: "BILLS & UTILITIES",
    icon: "⚡",
    color: "#0E7490",
    bg: "#BAE6FD",
    border: "#0A0A0A",
    bar: "#38BDF8",
    keywords: [
      "utility", "utilities", "bill", "electric", "electricity", "wifi",
      "internet", "water", "rent", "pg&e", "phone", "verizon", "t-mobile",
      "at&t", "cloud", "server", "aws"
    ],
  },
  {
    key: "drinks",
    name: "DRINKS & BAR",
    icon: "🍻",
    color: "#BE185D",
    bg: "#F472B6",
    border: "#0A0A0A",
    bar: "#EC4899",
    keywords: [
      "bar", "beer", "wine", "pub", "cocktail", "brewery", "liquor",
      "alcohol", "drinks", "happy hour", "shots", "club"
    ],
  },
  {
    key: "home",
    name: "HOME & LIVING",
    icon: "🏡",
    color: "#047857",
    bg: "#A7F3D0",
    border: "#0A0A0A",
    bar: "#10B981",
    keywords: [
      "home", "house", "furniture", "cleaning", "detergent", "supplies",
      "hardware", "homedepot", "lowes", "tools"
    ],
  },
];

export const DEFAULT_CATEGORY: ExpenseCategoryConfig = {
  key: "misc",
  name: "EXPENSE",
  icon: "💸",
  color: "#334155",
  bg: "#E2E8F0",
  border: "#0A0A0A",
  bar: "#0A0A0A",
  keywords: [],
};

export function detectExpenseCategory(note: string, category?: string | null): ExpenseCategoryConfig {
  const noteLower = (note || "").toLowerCase().trim();
  const catLower = (category || "").toLowerCase().trim();

  // 1. Direct key match from explicit category
  if (catLower && catLower !== "misc") {
    const directMatch = EXPENSE_CATEGORIES.find((c) => c.key === catLower);
    if (directMatch) return directMatch;
  }

  // 2. Score keyword matches to find the best/most specific category
  let bestCategory: ExpenseCategoryConfig = DEFAULT_CATEGORY;
  let highestScore = 0;

  for (const cat of EXPENSE_CATEGORIES) {
    let catScore = 0;
    for (const kw of cat.keywords) {
      if (noteLower.includes(kw) || catLower.includes(kw)) {
        // Longer keyword matches indicate higher specificity
        const isWordMatch =
          new RegExp(`\\b${kw}\\b`, "i").test(noteLower) ||
          new RegExp(`\\b${kw}\\b`, "i").test(catLower);
        const score = kw.length * (isWordMatch ? 3 : 1);
        if (score > catScore) {
          catScore = score;
        }
      }
    }

    if (catScore > highestScore) {
      highestScore = catScore;
      bestCategory = cat;
    }
  }

  return highestScore > 0 ? bestCategory : DEFAULT_CATEGORY;
}

export function getCategoryBreakdown(
  expenses: FinancialDailyExpenseRow[] = []
): CategorySpendBreakdown[] {
  const validExpenses = expenses.filter(
    (e) => !isNaN(Number(e.amount)) && Number(e.amount) > 0
  );
  const total = validExpenses.reduce((s, e) => s + Number(e.amount), 0);

  const catMap = new Map<string, { total: number; count: number }>();
  for (const exp of validExpenses) {
    const detected = detectExpenseCategory(exp.note, exp.category);
    const catKey = detected.key;
    const curr = catMap.get(catKey) || { total: 0, count: 0 };
    curr.total += Number(exp.amount) || 0;
    curr.count += 1;
    catMap.set(catKey, curr);
  }

  return Array.from(catMap.entries())
    .map(([key, data]) => {
      const cfg = EXPENSE_CATEGORIES.find((c) => c.key === key) || DEFAULT_CATEGORY;
      const totalSpent = Math.round(data.total * 100) / 100;
      const percentage = total > 0 ? Math.round((totalSpent / total) * 100) : 0;
      const average = data.count > 0 ? Math.round((totalSpent / data.count) * 100) / 100 : 0;
      return {
        category: key,
        name: cfg.name,
        icon: cfg.icon,
        color: cfg.color,
        bg: cfg.bg,
        totalSpent,
        percentage,
        count: data.count,
        average,
      };
    })
    .sort((a, b) => b.totalSpent - a.totalSpent);
}

export function calculateExpenseAnalytics(
  expenses: FinancialDailyExpenseRow[] = [],
  asOfDate?: string | Date
): ExpenseAnalyticsPayload {
  let targetDate: Date;
  if (asOfDate instanceof Date) {
    targetDate = asOfDate;
  } else if (typeof asOfDate === "string" && asOfDate.trim()) {
    const [y, m, d] = asOfDate.split("-").map(Number);
    targetDate = new Date(y, (m || 1) - 1, d || 1);
  } else {
    targetDate = new Date();
  }

  const currentYear = targetDate.getFullYear();
  const currentMonth = targetDate.getMonth(); // 0-indexed
  const currentDay = targetDate.getDate();
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);

  const todayStr = formatLocalDate(targetDate);
  const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;
  const yearPrefix = `${currentYear}-`;

  // Calendar week (Monday through Sunday)
  const dayOfWeekIndex = targetDate.getDay(); // 0 (Sun) to 6 (Sat)
  const daysFromMonday = (dayOfWeekIndex + 6) % 7;
  const mondayDate = new Date(targetDate);
  mondayDate.setDate(targetDate.getDate() - daysFromMonday);
  const sundayDate = new Date(mondayDate);
  sundayDate.setDate(mondayDate.getDate() + 6);

  const mondayStr = formatLocalDate(mondayDate);
  const sundayStr = formatLocalDate(sundayDate);

  // Prior week (Monday through Sunday)
  const priorMondayDate = new Date(mondayDate);
  priorMondayDate.setDate(mondayDate.getDate() - 7);
  const priorSundayDate = new Date(mondayDate);
  priorSundayDate.setDate(mondayDate.getDate() - 1);
  const priorMondayStr = formatLocalDate(priorMondayDate);
  const priorSundayStr = formatLocalDate(priorSundayDate);

  // Prior month
  const priorMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  const priorMonthNum = currentMonth === 0 ? 12 : currentMonth;
  const priorMonthPrefix = `${priorMonthYear}-${String(priorMonthNum).padStart(2, "0")}`;

  // Filter groups
  const validExpenses = (expenses || []).filter(
    (e) => !isNaN(Number(e.amount)) && Number(e.amount) > 0
  );

  // Today
  const todayItems = validExpenses.filter((e) => e.date === todayStr);
  const todayTotal = Math.round(todayItems.reduce((s, e) => s + Number(e.amount), 0) * 100) / 100;
  const todayLargest = todayItems.length > 0 ? Math.max(...todayItems.map((e) => Number(e.amount))) : 0;

  // This Week
  const weekItems = validExpenses.filter((e) => e.date >= mondayStr && e.date <= sundayStr);
  const weekTotal = Math.round(weekItems.reduce((s, e) => s + Number(e.amount), 0) * 100) / 100;
  const weekLargest = weekItems.length > 0 ? Math.max(...weekItems.map((e) => Number(e.amount))) : 0;
  const priorWeekItems = validExpenses.filter((e) => e.date >= priorMondayStr && e.date <= priorSundayStr);
  const priorWeekTotal = Math.round(priorWeekItems.reduce((s, e) => s + Number(e.amount), 0) * 100) / 100;
  const weekElapsedDays = Math.max(1, daysFromMonday + 1);
  const weekDailyAvg = Math.round((weekTotal / weekElapsedDays) * 100) / 100;
  const weekPctChange = priorWeekTotal > 0
    ? Math.round(((weekTotal - priorWeekTotal) / priorWeekTotal) * 100)
    : undefined;

  // This Month
  const monthItems = validExpenses.filter((e) => e.date.startsWith(monthPrefix));
  const monthTotal = Math.round(monthItems.reduce((s, e) => s + Number(e.amount), 0) * 100) / 100;
  const monthLargest = monthItems.length > 0 ? Math.max(...monthItems.map((e) => Number(e.amount))) : 0;
  const monthDailyAvg = currentDay > 0 ? Math.round((monthTotal / currentDay) * 100) / 100 : 0;
  const projectedMonthEnd = Math.round(monthDailyAvg * daysInMonth * 100) / 100;

  const priorMonthItems = validExpenses.filter((e) => e.date.startsWith(priorMonthPrefix));
  const priorMonthTotal = Math.round(priorMonthItems.reduce((s, e) => s + Number(e.amount), 0) * 100) / 100;
  const monthPctChange = priorMonthTotal > 0
    ? Math.round(((monthTotal - priorMonthTotal) / priorMonthTotal) * 100)
    : undefined;

  // This Year
  const yearItems = validExpenses.filter((e) => e.date.startsWith(yearPrefix));
  const yearTotal = Math.round(yearItems.reduce((s, e) => s + Number(e.amount), 0) * 100) / 100;
  const yearLargest = yearItems.length > 0 ? Math.max(...yearItems.map((e) => Number(e.amount))) : 0;
  const activeMonths = currentMonth + 1;
  const monthlyAverage = Math.round((yearTotal / activeMonths) * 100) / 100;
  const projectedYearEnd = Math.round(monthlyAverage * 12 * 100) / 100;
  const uniqueYearDays = new Set(yearItems.map((e) => e.date)).size;
  const yearDailyAvg = uniqueYearDays > 0 ? Math.round((yearTotal / uniqueYearDays) * 100) / 100 : 0;

  // All Time
  const allTotal = Math.round(validExpenses.reduce((s, e) => s + Number(e.amount), 0) * 100) / 100;
  const allLargest = validExpenses.length > 0 ? Math.max(...validExpenses.map((e) => Number(e.amount))) : 0;
  const uniqueAllDays = new Set(validExpenses.map((e) => e.date)).size;
  const allDailyAvg = uniqueAllDays > 0 ? Math.round((allTotal / uniqueAllDays) * 100) / 100 : 0;
  const dates = validExpenses.map((e) => e.date).filter(Boolean).sort();
  const earliestDate = dates[0];
  const latestDate = dates[dates.length - 1];

  // Category Breakdown for All Time
  const categories = getCategoryBreakdown(validExpenses);

  // Day of Week Spend
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dowTotals = [0, 0, 0, 0, 0, 0, 0];
  const dowCounts = [0, 0, 0, 0, 0, 0, 0];

  for (const exp of validExpenses) {
    if (!exp.date) continue;
    const [y, m, d] = exp.date.split("-").map(Number);
    if (!y || !m || !d) continue;
    const dObj = new Date(y, m - 1, d);
    const dayIdx = dObj.getDay();
    dowTotals[dayIdx] += Number(exp.amount) || 0;
    dowCounts[dayIdx] += 1;
  }

  const maxDowSpend = Math.max(...dowTotals);
  const dayOfWeek: DayOfWeekSpend[] = dayNames.map((name, idx) => {
    const totalSpent = Math.round(dowTotals[idx] * 100) / 100;
    const count = dowCounts[idx];
    const averageSpent = count > 0 ? Math.round((totalSpent / count) * 100) / 100 : 0;
    const percentage = allTotal > 0 ? Math.round((totalSpent / allTotal) * 100) : 0;
    const isPeak = totalSpent > 0 && totalSpent === maxDowSpend;
    return {
      dayIndex: idx,
      dayName: name,
      totalSpent,
      averageSpent,
      count,
      percentage,
      isPeak,
    };
  });

  // Top Expenses
  const topExpenses = [...validExpenses]
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .slice(0, 10);

  return {
    today: {
      total: todayTotal,
      count: todayItems.length,
      dailyAverage: todayTotal,
      largestExpense: todayLargest,
    },
    thisWeek: {
      total: weekTotal,
      count: weekItems.length,
      dailyAverage: weekDailyAvg,
      largestExpense: weekLargest,
      priorPeriodTotal: priorWeekTotal,
      percentageChange: weekPctChange,
    },
    thisMonth: {
      total: monthTotal,
      count: monthItems.length,
      dailyAverage: monthDailyAvg,
      largestExpense: monthLargest,
      priorPeriodTotal: priorMonthTotal,
      percentageChange: monthPctChange,
      projectedMonthEnd,
    },
    thisYear: {
      total: yearTotal,
      count: yearItems.length,
      dailyAverage: yearDailyAvg,
      largestExpense: yearLargest,
      monthlyAverage,
      projectedYearEnd,
      activeDays: uniqueYearDays,
    },
    allTime: {
      total: allTotal,
      count: validExpenses.length,
      dailyAverage: allDailyAvg,
      largestExpense: allLargest,
      activeDays: uniqueAllDays,
      earliestDate,
      latestDate,
    },
    categories,
    dayOfWeek,
    topExpenses,
  };
}

