import {
  FinancialSubscriptionRow,
  SubscriptionCadence,
  SubscriptionCategory,
  SubscriptionMetrics,
  UpcomingRenewal,
  CategorySubscriptionStat,
  SUBSCRIPTION_CATEGORIES,
} from "./types";

export function normalizeCadenceToMonthly(amount: number, cadence: SubscriptionCadence): number {
  if (!amount || isNaN(amount) || amount <= 0) return 0;
  switch (cadence) {
    case "WEEKLY":
      return (amount * 52) / 12;
    case "MONTHLY":
      return amount;
    case "QUARTERLY":
      return amount / 3;
    case "YEARLY":
      return amount / 12;
    default:
      return amount;
  }
}

export function normalizeCadenceToYearly(amount: number, cadence: SubscriptionCadence): number {
  if (!amount || isNaN(amount) || amount <= 0) return 0;
  switch (cadence) {
    case "WEEKLY":
      return amount * 52;
    case "MONTHLY":
      return amount * 12;
    case "QUARTERLY":
      return amount * 4;
    case "YEARLY":
      return amount;
    default:
      return amount * 12;
  }
}

export function calculateDaysUntilRenewal(billingDay?: number | null, nextRenewalDate?: string | null): {
  daysUntil: number;
  formattedDate: string;
} {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  if (nextRenewalDate) {
    const target = new Date(nextRenewalDate);
    if (!isNaN(target.getTime())) {
      target.setHours(0, 0, 0, 0);
      const diffMs = target.getTime() - now.getTime();
      const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (days >= 0) {
        return {
          daysUntil: days,
          formattedDate: target.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        };
      }
    }
  }

  // Fallback to billing day in current or next month
  const currentDay = now.getDate();
  const targetDay = billingDay && billingDay >= 1 && billingDay <= 31 ? billingDay : 1;

  const renewalDate = new Date(now.getFullYear(), now.getMonth(), targetDay);
  if (targetDay < currentDay) {
    renewalDate.setMonth(renewalDate.getMonth() + 1);
  }

  const diffMs = renewalDate.getTime() - now.getTime();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return {
    daysUntil: Math.max(0, days),
    formattedDate: renewalDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  };
}

export function calculateSubscriptionMetrics(subscriptions: FinancialSubscriptionRow[]): SubscriptionMetrics {
  let monthlyTotal = 0;
  let yearlyTotal = 0;
  let activeCount = 0;
  let pausedCount = 0;
  let trialCount = 0;

  // Initialize category breakdown dictionary
  const categoryBreakdown = SUBSCRIPTION_CATEGORIES.reduce((acc, cat) => {
    acc[cat] = {
      category: cat,
      monthlyTotal: 0,
      yearlyTotal: 0,
      count: 0,
    };
    return acc;
  }, {} as Record<SubscriptionCategory, CategorySubscriptionStat>);

  const upcomingRenewals: UpcomingRenewal[] = [];

  for (const sub of subscriptions) {
    if (sub.status === "CANCELLED") continue;

    if (sub.status === "PAUSED") {
      pausedCount++;
      continue;
    }

    if (sub.status === "TRIAL") {
      trialCount++;
    } else {
      activeCount++;
    }

    const monthlyAmount = normalizeCadenceToMonthly(sub.amount, sub.cadence as SubscriptionCadence);
    const yearlyAmount = normalizeCadenceToYearly(sub.amount, sub.cadence as SubscriptionCadence);

    monthlyTotal += monthlyAmount;
    yearlyTotal += yearlyAmount;

    const cat = (sub.category as SubscriptionCategory) || "OTHER";
    if (categoryBreakdown[cat]) {
      categoryBreakdown[cat].monthlyTotal += monthlyAmount;
      categoryBreakdown[cat].yearlyTotal += yearlyAmount;
      categoryBreakdown[cat].count += 1;
    }

    const { daysUntil, formattedDate } = calculateDaysUntilRenewal(
      sub.billingDay,
      sub.status === "TRIAL" && sub.trialEndsDate ? sub.trialEndsDate : sub.nextRenewalDate
    );

    upcomingRenewals.push({
      id: sub.id,
      name: sub.name,
      amount: Math.round(sub.amount * 100) / 100,
      cadence: sub.cadence as SubscriptionCadence,
      category: cat,
      daysUntil,
      formattedDate,
      isTrial: sub.status === "TRIAL",
      status: sub.status as any,
    });
  }

  // Sort renewals with closest renewal first
  upcomingRenewals.sort((a, b) => a.daysUntil - b.daysUntil);

  return {
    monthlyTotal: Math.round(monthlyTotal * 100) / 100,
    yearlyTotal: Math.round(yearlyTotal * 100) / 100,
    activeCount,
    pausedCount,
    trialCount,
    categoryBreakdown,
    upcomingRenewals,
  };
}
