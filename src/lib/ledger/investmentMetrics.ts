import {
  FinancialInvestmentRow,
  InvestmentAssetType,
  InvestmentCadence,
  InvestmentMetrics,
  CategoryInvestmentStat,
  CompoundProjectionPoint,
  INVESTMENT_ASSET_TYPES,
} from "./types";

export function normalizeInvestmentCadenceToMonthly(
  amount: number,
  cadence: InvestmentCadence
): number {
  if (!amount || isNaN(amount) || amount <= 0) return 0;
  switch (cadence) {
    case "DAILY":
      return (amount * 365) / 12;
    case "WEEKLY":
      return (amount * 52) / 12;
    case "BIWEEKLY":
      return (amount * 26) / 12;
    case "MONTHLY":
      return amount;
    case "QUARTERLY":
      return amount / 3;
    case "ANNUAL":
      return amount / 12;
    default:
      return amount;
  }
}

export function normalizeInvestmentCadenceToYearly(
  amount: number,
  cadence: InvestmentCadence
): number {
  if (!amount || isNaN(amount) || amount <= 0) return 0;
  switch (cadence) {
    case "DAILY":
      return amount * 365;
    case "WEEKLY":
      return amount * 52;
    case "BIWEEKLY":
      return amount * 26;
    case "MONTHLY":
      return amount * 12;
    case "QUARTERLY":
      return amount * 4;
    case "ANNUAL":
      return amount;
    default:
      return amount * 12;
  }
}

/**
 * Calculates compound future wealth using standard continuous monthly annuity formulas
 */
export function calculateCompoundWealth(
  monthlyContribution: number,
  annualReturnRatePct: number,
  years: number,
  startingPrincipal = 0
): { totalInvested: number; projectedWealth: number; interestEarned: number } {
  const months = Math.max(0, Math.round(years * 12));
  const ratePerMonth = (annualReturnRatePct || 0) / 100 / 12;

  const totalInvested = startingPrincipal + monthlyContribution * months;

  if (ratePerMonth <= 0) {
    return {
      totalInvested: Math.round(totalInvested),
      projectedWealth: Math.round(totalInvested),
      interestEarned: 0,
    };
  }

  // FV of initial principal: P * (1 + r)^n
  const fvPrincipal = startingPrincipal * Math.pow(1 + ratePerMonth, months);

  // FV of monthly contributions annuity: PMT * [((1 + r)^n - 1) / r]
  const fvAnnuity = monthlyContribution * ((Math.pow(1 + ratePerMonth, months) - 1) / ratePerMonth);

  const projectedWealth = Math.round(fvPrincipal + fvAnnuity);
  const interestEarned = Math.max(0, Math.round(projectedWealth - totalInvested));

  return {
    totalInvested: Math.round(totalInvested),
    projectedWealth,
    interestEarned,
  };
}

import { convertToUsd, getFxSnapshotSync } from "./fx";

export function calculateInvestmentMetrics(
  investments: FinancialInvestmentRow[],
  customFxInrRate?: number
): InvestmentMetrics {
  const fx = getFxSnapshotSync();
  const effectiveInrRate = customFxInrRate && customFxInrRate > 0 ? customFxInrRate : fx.inrPerUsd;

  let monthlyTotal = 0;
  let yearlyTotal = 0;
  let monthlyTotalUsd = 0;
  let yearlyTotalUsd = 0;
  let activeCount = 0;
  let pausedCount = 0;
  let totalWeightedReturnSum = 0;
  let initialPrincipalSum = 0;

  // Dominant currency
  const currencyCounts: Record<string, number> = {};
  investments.forEach((i) => {
    const c = i.currency || "INR";
    currencyCounts[c] = (currencyCounts[c] || 0) + 1;
  });
  const dominantCurrency = Object.entries(currencyCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "INR";

  const categoryBreakdown = INVESTMENT_ASSET_TYPES.reduce((acc, type) => {
    acc[type] = {
      assetType: type,
      monthlyTotal: 0,
      yearlyTotal: 0,
      count: 0,
    };
    return acc;
  }, {} as Record<InvestmentAssetType, CategoryInvestmentStat>);

  for (const inv of investments) {
    if (inv.status === "COMPLETED") continue;

    if (inv.status === "PAUSED") {
      pausedCount++;
      continue;
    }

    activeCount++;
    const monthlyAmount = normalizeInvestmentCadenceToMonthly(
      inv.amount,
      inv.cadence as InvestmentCadence
    );
    const yearlyAmount = normalizeInvestmentCadenceToYearly(
      inv.amount,
      inv.cadence as InvestmentCadence
    );

    monthlyTotal += monthlyAmount;
    yearlyTotal += yearlyAmount;

    const invCurrency = inv.currency || "INR";
    const monthlyUsd = convertToUsd(monthlyAmount, invCurrency, effectiveInrRate);
    const yearlyUsd = convertToUsd(yearlyAmount, invCurrency, effectiveInrRate);
    monthlyTotalUsd += monthlyUsd;
    yearlyTotalUsd += yearlyUsd;

    if (inv.currentValuation && inv.currentValuation > 0) {
      initialPrincipalSum += inv.currentValuation;
    }

    const returnRate = inv.expectedReturnRate ?? 8.0; // default 8% realistic nominal return
    totalWeightedReturnSum += monthlyAmount * returnRate;

    const assetType = (inv.assetType as InvestmentAssetType) || "OTHER";
    if (categoryBreakdown[assetType]) {
      categoryBreakdown[assetType].monthlyTotal += monthlyAmount;
      categoryBreakdown[assetType].yearlyTotal += yearlyAmount;
      categoryBreakdown[assetType].count += 1;
    }
  }

  const weightedReturnRatePct =
    monthlyTotal > 0
      ? Math.round((totalWeightedReturnSum / monthlyTotal) * 10) / 10
      : 8.0;

  // Generate milestone compound projection points
  const projectionMilestones = [1, 3, 5, 10, 15, 20, 25, 30];
  const compoundProjections: CompoundProjectionPoint[] = projectionMilestones.map((years) => {
    const { totalInvested, projectedWealth, interestEarned } = calculateCompoundWealth(
      monthlyTotal,
      weightedReturnRatePct,
      years,
      initialPrincipalSum
    );
    return {
      years,
      totalInvested,
      projectedWealth,
      interestEarned,
    };
  });

  return {
    monthlyTotal: Math.round(monthlyTotal * 100) / 100,
    yearlyTotal: Math.round(yearlyTotal * 100) / 100,
    monthlyTotalUsd: Math.round(monthlyTotalUsd * 100) / 100,
    yearlyTotalUsd: Math.round(yearlyTotalUsd * 100) / 100,
    currency: dominantCurrency,
    activeCount,
    pausedCount,
    weightedReturnRatePct,
    categoryBreakdown,
    compoundProjections,
    fxRateInrPerUsd: effectiveInrRate,
    fxRateDate: fx.date,
  };
}
