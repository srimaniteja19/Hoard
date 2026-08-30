/**
 * FIRE (Financial Independence, Retire Early) Calculation Engine
 * Models compound interest growth, target nest egg numbers, safe withdrawal rates,
 * and accelerated retirement horizon deltas.
 */

export interface FireParameters {
  currentNetWorth: number;
  annualExpenses: number;
  monthlyContribution: number;
  expectedCagrPct: number; // e.g. 10 for 10%
  safeWithdrawalRatePct: number; // e.g. 4 for 4%
  currentAge?: number;
}

export interface FireMilestone {
  label: string;
  targetAmount: number;
  achieved: boolean;
  monthsToReach: number | null;
  ageAtMilestone: number | null;
  yearAtMilestone: number | null;
}

export interface FireMetrics {
  targetFireNumber: number;
  currentProgressPct: number;
  monthsToFire: number;
  yearsToFire: number;
  projectedFireAge: number;
  projectedFireYear: number;
  annualPassiveIncomeAtFire: number;
  monthlyPassiveIncomeAtFire: number;
  milestones: FireMilestone[];
  monthlyTrajectory: {
    year: number;
    month: number;
    projectedNetWorth: number;
    totalContributed: number;
    compoundInterestEarned: number;
  }[];
}

export interface FireDeltaComparison {
  baselineMonths: number;
  baselineYears: number;
  baselineFireAge: number;
  optimizedMonths: number;
  optimizedYears: number;
  optimizedFireAge: number;
  yearsReclaimed: number;
  monthsReclaimed: number;
  additionalWealthAtRetirement: number;
}

/**
 * Calculates complete FIRE metrics and future wealth progression.
 */
export function calculateFireMetrics(params: FireParameters): FireMetrics {
  const currentAge = params.currentAge ?? 28;
  const currentNetWorth = Math.max(0, params.currentNetWorth || 0);
  const annualExpenses = Math.max(1000, params.annualExpenses || 12000);
  const monthlyContribution = Math.max(0, params.monthlyContribution || 0);
  const expectedCagr = Math.max(0.01, (params.expectedCagrPct ?? 10) / 100);
  const swr = Math.max(0.02, (params.safeWithdrawalRatePct ?? 4) / 100);

  // Target FIRE nest egg = Annual Expenses / SWR
  const targetFireNumber = Math.round(annualExpenses / swr);

  const currentProgressPct = targetFireNumber > 0
    ? Math.min(100, Math.max(0, Math.round((currentNetWorth / targetFireNumber) * 1000) / 10))
    : 0;

  const currentYear = new Date().getFullYear();
  const monthlyRate = Math.pow(1 + expectedCagr, 1 / 12) - 1;

  let balance = currentNetWorth;
  let totalContributed = currentNetWorth;
  let monthsCount = 0;
  const maxMonths = 12 * 60; // Cap simulation at 60 years

  const milestoneTargets = [
    { label: "$100k Club", target: 100_000 },
    { label: "Quarter Million ($250k)", target: 250_000 },
    { label: "Halfway Mark ($500k)", target: 500_000 },
    { label: "Millionaire ($1M)", target: 1_000_000 },
    { label: "FIRE Freedom Number", target: targetFireNumber },
  ];

  const milestoneMonths: Record<number, number | null> = {};
  milestoneTargets.forEach((m) => {
    milestoneMonths[m.target] = balance >= m.target ? 0 : null;
  });

  const trajectory: FireMetrics["monthlyTrajectory"] = [
    {
      year: 0,
      month: 0,
      projectedNetWorth: Math.round(balance),
      totalContributed: Math.round(totalContributed),
      compoundInterestEarned: 0,
    },
  ];

  while (balance < targetFireNumber && monthsCount < maxMonths) {
    monthsCount++;
    // Compound 1 month + monthly contribution
    balance = balance * (1 + monthlyRate) + monthlyContribution;
    totalContributed += monthlyContribution;

    // Check milestones
    milestoneTargets.forEach((m) => {
      if (milestoneMonths[m.target] === null && balance >= m.target) {
        milestoneMonths[m.target] = monthsCount;
      }
    });

    // Record yearly checkpoints
    if (monthsCount % 12 === 0 || balance >= targetFireNumber) {
      trajectory.push({
        year: Math.floor(monthsCount / 12),
        month: monthsCount,
        projectedNetWorth: Math.round(balance),
        totalContributed: Math.round(totalContributed),
        compoundInterestEarned: Math.max(0, Math.round(balance - totalContributed)),
      });
    }
  }

  const yearsToFire = Math.round((monthsCount / 12) * 10) / 10;
  const projectedFireAge = Math.round((currentAge + monthsCount / 12) * 10) / 10;
  const projectedFireYear = Math.round(currentYear + monthsCount / 12);
  const annualPassiveIncomeAtFire = Math.round(targetFireNumber * swr);
  const monthlyPassiveIncomeAtFire = Math.round(annualPassiveIncomeAtFire / 12);

  const milestones: FireMilestone[] = milestoneTargets.map((m) => {
    const mMonths = milestoneMonths[m.target];
    const isReached = mMonths !== null;
    return {
      label: m.label,
      targetAmount: m.target,
      achieved: isReached && mMonths === 0,
      monthsToReach: mMonths,
      ageAtMilestone: isReached ? Math.round((currentAge + mMonths / 12) * 10) / 10 : null,
      yearAtMilestone: isReached ? Math.round(currentYear + mMonths / 12) : null,
    };
  });

  return {
    targetFireNumber,
    currentProgressPct,
    monthsToFire: monthsCount,
    yearsToFire,
    projectedFireAge,
    projectedFireYear,
    annualPassiveIncomeAtFire,
    monthlyPassiveIncomeAtFire,
    milestones,
    monthlyTrajectory: trajectory,
  };
}

/**
 * Compares baseline trajectory against an optimized what-if scenario to compute years reclaimed.
 */
export function simulateFireDelta(
  baselineParams: FireParameters,
  optimizedParams: FireParameters
): FireDeltaComparison {
  const base = calculateFireMetrics(baselineParams);
  const opt = calculateFireMetrics(optimizedParams);

  const monthsReclaimed = Math.max(0, base.monthsToFire - opt.monthsToFire);
  const yearsReclaimed = Math.round((monthsReclaimed / 12) * 10) / 10;

  // Additional wealth at the baseline retirement age
  const baseHorizonMonths = base.monthsToFire;
  let optFutureWealthAtBaseHorizon = optimizedParams.currentNetWorth;
  const monthlyRate = Math.pow(1 + Math.max(0.01, (optimizedParams.expectedCagrPct ?? 10) / 100), 1 / 12) - 1;

  for (let m = 0; m < baseHorizonMonths; m++) {
    optFutureWealthAtBaseHorizon = optFutureWealthAtBaseHorizon * (1 + monthlyRate) + optimizedParams.monthlyContribution;
  }

  const additionalWealthAtRetirement = Math.max(
    0,
    Math.round(optFutureWealthAtBaseHorizon - base.targetFireNumber)
  );

  return {
    baselineMonths: base.monthsToFire,
    baselineYears: base.yearsToFire,
    baselineFireAge: base.projectedFireAge,
    optimizedMonths: opt.monthsToFire,
    optimizedYears: opt.yearsToFire,
    optimizedFireAge: opt.projectedFireAge,
    yearsReclaimed,
    monthsReclaimed,
    additionalWealthAtRetirement,
  };
}
