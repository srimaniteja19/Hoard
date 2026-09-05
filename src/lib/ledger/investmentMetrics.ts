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

export interface DetailedProjectionResult {
  years: number;
  months: number;
  initialPrincipal: number;
  futureContributions: number;
  totalInvested: number;
  projectedWealth: number;
  interestEarned: number;
  wealthMultiplier: number;
  effectiveAnnualRatePct: number;
  isInflationAdjusted: boolean;
}

/**
 * Calculates compound future wealth with support for arbitrary years, return rates,
 * and optional inflation adjustment (Fisher equation: (1 + r_real) = (1 + r_nom) / (1 + i)).
 */
export function calculateDetailedCompoundProjection(
  monthlyContribution: number,
  annualReturnRatePct: number,
  years: number,
  startingPrincipal = 0,
  annualInflationRatePct = 0
): DetailedProjectionResult {
  let effectiveRate = annualReturnRatePct;
  const isInflationAdjusted = annualInflationRatePct > 0;
  if (isInflationAdjusted) {
    const rNom = annualReturnRatePct / 100;
    const infl = annualInflationRatePct / 100;
    const rReal = (1 + rNom) / (1 + infl) - 1;
    effectiveRate = rReal * 100;
  }

  const { totalInvested, projectedWealth, interestEarned } = calculateCompoundWealth(
    monthlyContribution,
    effectiveRate,
    years,
    startingPrincipal
  );

  const months = Math.max(0, Math.round(years * 12));
  const futureContributions = Math.round(monthlyContribution * months);
  const wealthMultiplier = totalInvested > 0 ? Math.round((projectedWealth / totalInvested) * 100) / 100 : 1;

  return {
    years,
    months,
    initialPrincipal: Math.round(startingPrincipal),
    futureContributions,
    totalInvested,
    projectedWealth,
    interestEarned,
    wealthMultiplier,
    effectiveAnnualRatePct: Math.round(effectiveRate * 10) / 10,
    isInflationAdjusted,
  };
}

import { convertToUsd, convertFromUsd, getFxSnapshotSync } from "./fx";

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
  let pausedMonthlyTotal = 0;
  let pausedYearlyTotal = 0;
  let activeCount = 0;
  let pausedCount = 0;
  let totalWeightedReturnSum = 0;
  let totalValuationWeightedReturnSum = 0;
  let initialPrincipalSum = 0;
  let totalValuationUsd = 0;

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
      pausedMonthlyTotal: 0,
      count: 0,
      activeCount: 0,
      pausedCount: 0,
      totalValuation: 0,
      totalValuationUsd: 0,
      weightedReturnRatePct: 0,
      valuationSharePct: 0,
      monthlySharePct: 0,
    };
    return acc;
  }, {} as Record<InvestmentAssetType, CategoryInvestmentStat>);

  const categoryReturnTrackers = INVESTMENT_ASSET_TYPES.reduce((acc, type) => {
    acc[type] = {
      monthlySum: 0,
      monthlyReturnSum: 0,
      valSum: 0,
      valReturnSum: 0,
      simpleRates: [] as number[],
    };
    return acc;
  }, {} as Record<InvestmentAssetType, { monthlySum: number; monthlyReturnSum: number; valSum: number; valReturnSum: number; simpleRates: number[] }>);

  for (const inv of investments) {
    if (inv.status === "COMPLETED") continue;

    const invCurrency = inv.currency || "INR";
    const returnRate = inv.expectedReturnRate ?? 8.0;
    const assetType = (inv.assetType as InvestmentAssetType) || "OTHER";
    const tracker = categoryReturnTrackers[assetType] || categoryReturnTrackers.OTHER;
    tracker.simpleRates.push(returnRate);

    const isSameCurrency = invCurrency === dominantCurrency;

    // Track accumulated valuation for ALL active or paused holdings
    if (inv.currentValuation && inv.currentValuation > 0) {
      const valuationUsd = convertToUsd(inv.currentValuation, invCurrency, effectiveInrRate);
      const valDominant = isSameCurrency
        ? inv.currentValuation
        : convertFromUsd(valuationUsd, dominantCurrency, effectiveInrRate);
      initialPrincipalSum += valDominant;
      totalValuationUsd += valuationUsd;
      totalValuationWeightedReturnSum += valDominant * returnRate;

      if (categoryBreakdown[assetType]) {
        categoryBreakdown[assetType].totalValuation += valDominant;
        categoryBreakdown[assetType].totalValuationUsd = (categoryBreakdown[assetType].totalValuationUsd || 0) + valuationUsd;
      }
      tracker.valSum += valDominant;
      tracker.valReturnSum += valDominant * returnRate;
    }

    if (inv.status === "PAUSED") {
      pausedCount++;
      if (categoryBreakdown[assetType]) {
        categoryBreakdown[assetType].count += 1;
        categoryBreakdown[assetType].pausedCount += 1;
      }

      const pMonthly = normalizeInvestmentCadenceToMonthly(inv.amount, inv.cadence as InvestmentCadence);
      const pMonthlyUsd = convertToUsd(pMonthly, invCurrency, effectiveInrRate);
      const pMonthlyDominant = isSameCurrency
        ? pMonthly
        : convertFromUsd(pMonthlyUsd, dominantCurrency, effectiveInrRate);
      pausedMonthlyTotal += pMonthlyDominant;
      pausedYearlyTotal += pMonthlyDominant * 12;

      if (categoryBreakdown[assetType]) {
        categoryBreakdown[assetType].pausedMonthlyTotal = (categoryBreakdown[assetType].pausedMonthlyTotal || 0) + pMonthlyDominant;
      }
      continue;
    }

    // Active investment
    activeCount++;
    if (categoryBreakdown[assetType]) {
      categoryBreakdown[assetType].count += 1;
      categoryBreakdown[assetType].activeCount += 1;
    }

    const monthlyAmount = normalizeInvestmentCadenceToMonthly(
      inv.amount,
      inv.cadence as InvestmentCadence
    );
    const yearlyAmount = normalizeInvestmentCadenceToYearly(
      inv.amount,
      inv.cadence as InvestmentCadence
    );

    const monthlyUsd = convertToUsd(monthlyAmount, invCurrency, effectiveInrRate);
    const yearlyUsd = convertToUsd(yearlyAmount, invCurrency, effectiveInrRate);
    monthlyTotalUsd += monthlyUsd;
    yearlyTotalUsd += yearlyUsd;

    const monthlyInDominant = isSameCurrency
      ? monthlyAmount
      : convertFromUsd(monthlyUsd, dominantCurrency, effectiveInrRate);
    const yearlyInDominant = isSameCurrency
      ? yearlyAmount
      : convertFromUsd(yearlyUsd, dominantCurrency, effectiveInrRate);
    monthlyTotal += monthlyInDominant;
    yearlyTotal += yearlyInDominant;

    totalWeightedReturnSum += monthlyInDominant * returnRate;
    tracker.monthlySum += monthlyInDominant;
    tracker.monthlyReturnSum += monthlyInDominant * returnRate;

    if (categoryBreakdown[assetType]) {
      categoryBreakdown[assetType].monthlyTotal += monthlyInDominant;
      categoryBreakdown[assetType].yearlyTotal += yearlyInDominant;
    }
  }

  // Calculate category-specific weighted return rates and share percentages
  for (const type of INVESTMENT_ASSET_TYPES) {
    const cat = categoryBreakdown[type];
    const tracker = categoryReturnTrackers[type];

    if (tracker.monthlySum > 0) {
      cat.weightedReturnRatePct = Math.round((tracker.monthlyReturnSum / tracker.monthlySum) * 10) / 10;
    } else if (tracker.valSum > 0) {
      cat.weightedReturnRatePct = Math.round((tracker.valReturnSum / tracker.valSum) * 10) / 10;
    } else if (tracker.simpleRates.length > 0) {
      const avg = tracker.simpleRates.reduce((a, b) => a + b, 0) / tracker.simpleRates.length;
      cat.weightedReturnRatePct = Math.round(avg * 10) / 10;
    } else {
      cat.weightedReturnRatePct = 8.0;
    }

    cat.totalValuation = Math.round(cat.totalValuation * 100) / 100;
    if (cat.totalValuationUsd) {
      cat.totalValuationUsd = Math.round(cat.totalValuationUsd * 100) / 100;
    }
    cat.monthlyTotal = Math.round(cat.monthlyTotal * 100) / 100;
    cat.yearlyTotal = Math.round(cat.yearlyTotal * 100) / 100;

    cat.valuationSharePct =
      initialPrincipalSum > 0
        ? Math.round((cat.totalValuation / initialPrincipalSum) * 1000) / 10
        : 0;

    cat.monthlySharePct =
      monthlyTotal > 0
        ? Math.round((cat.monthlyTotal / monthlyTotal) * 1000) / 10
        : 0;
  }

  const weightedReturnRatePct =
    monthlyTotal > 0
      ? Math.round((totalWeightedReturnSum / monthlyTotal) * 10) / 10
      : initialPrincipalSum > 0
      ? Math.round((totalValuationWeightedReturnSum / initialPrincipalSum) * 10) / 10
      : 8.0;

  // Generate milestone compound projection points using actual initialPrincipalSum
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
    totalValuation: Math.round(initialPrincipalSum * 100) / 100,
    totalValuationUsd: Math.round(totalValuationUsd * 100) / 100,
    pausedMonthlyTotal: Math.round(pausedMonthlyTotal * 100) / 100,
    pausedYearlyTotal: Math.round(pausedYearlyTotal * 100) / 100,
    currency: dominantCurrency,
    activeCount,
    pausedCount,
    totalCount: activeCount + pausedCount,
    weightedReturnRatePct,
    categoryBreakdown,
    compoundProjections,
    fxRateInrPerUsd: effectiveInrRate,
    fxRateDate: fx.date,
  };
}
