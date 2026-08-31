import {
  FinancialDebtRow,
  PayoffSimulationResult,
  DebtPayoffStrategy,
  PayoffMonthSnapshot,
  DebtMonthlyPaymentPlan,
  DebtPayoffMilestone,
} from "./types";

interface ActiveDebtState {
  id: string;
  name: string;
  balance: number;
  interestRate: number;
  minPayment: number;
  totalInterestPaid: number;
  isPaid: boolean;
  payoffMonth: number | null;
}

function formatPayoffDate(monthsFromNow: number): string {
  const date = new Date();
  date.setMonth(date.getMonth() + monthsFromNow);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function calculateDebtPayoff(
  debts: FinancialDebtRow[],
  strategy: DebtPayoffStrategy = "AVALANCHE",
  extraMonthlyPayment: number = 0,
  oneTimeLumpSum: number = 0
): PayoffSimulationResult {
  const activeDebts = debts.filter((d) => !d.isPaidOff && d.balance > 0);

  if (activeDebts.length === 0) {
    return {
      strategy,
      extraMonthlyPayment,
      oneTimeLumpSum,
      monthsToPayoff: 0,
      debtFreeDate: "Debt-Free Today!",
      totalInterestPaid: 0,
      totalPrincipalPaid: 0,
      baselineMonthsToPayoff: 0,
      baselineTotalInterestPaid: 0,
      baselineDebtFreeDate: "Debt-Free Today!",
      interestSavedVsMinimums: 0,
      monthsSavedVsMinimums: 0,
      monthlySchedule: [],
      payoffMilestones: [],
    };
  }

  // Calculate baseline simulation with $0 extra payment, $0 lump sum, and no rollover
  const baseline = runSimulation(activeDebts, strategy, 0, 0, false);
  // Calculate accelerated simulated payoff
  const simulated = runSimulation(activeDebts, strategy, extraMonthlyPayment, oneTimeLumpSum, true);

  const interestSaved = Math.max(
    0,
    Math.round((baseline.totalInterestPaid - simulated.totalInterestPaid) * 100) / 100
  );
  const monthsSaved = Math.max(0, baseline.monthsToPayoff - simulated.monthsToPayoff);

  return {
    strategy,
    extraMonthlyPayment,
    oneTimeLumpSum,
    monthsToPayoff: simulated.monthsToPayoff,
    debtFreeDate: formatPayoffDate(simulated.monthsToPayoff),
    totalInterestPaid: simulated.totalInterestPaid,
    totalPrincipalPaid: simulated.totalPrincipalPaid,
    baselineMonthsToPayoff: baseline.monthsToPayoff,
    baselineTotalInterestPaid: baseline.totalInterestPaid,
    baselineDebtFreeDate: formatPayoffDate(baseline.monthsToPayoff),
    interestSavedVsMinimums: interestSaved,
    monthsSavedVsMinimums: monthsSaved,
    monthlySchedule: simulated.monthlySchedule,
    payoffMilestones: simulated.payoffMilestones,
  };
}

function runSimulation(
  debts: FinancialDebtRow[],
  strategy: DebtPayoffStrategy,
  extraMonthlyPayment: number,
  oneTimeLumpSum: number,
  rolloverFreedPayments: boolean
): {
  monthsToPayoff: number;
  totalInterestPaid: number;
  totalPrincipalPaid: number;
  monthlySchedule: PayoffMonthSnapshot[];
  payoffMilestones: DebtPayoffMilestone[];
} {
  const state: ActiveDebtState[] = debts.map((d) => ({
    id: d.id,
    name: d.name,
    balance: Math.round(d.balance * 100) / 100,
    interestRate: d.interestRate,
    minPayment: Math.max(10, Math.round(d.minPayment * 100) / 100),
    totalInterestPaid: 0,
    isPaid: false,
    payoffMonth: null,
  }));

  const initialPrincipalTotal = state.reduce((sum, d) => sum + d.balance, 0);
  const monthlySchedule: PayoffMonthSnapshot[] = [];
  const payoffMilestones: DebtPayoffMilestone[] = [];
  const MAX_MONTHS = 360; // 30-year safety cap

  let currentMonth = 0;
  let remainingLumpSum = oneTimeLumpSum;

  while (state.some((d) => !d.isPaid) && currentMonth < MAX_MONTHS) {
    currentMonth++;
    let totalInterestThisMonth = 0;
    let totalPrincipalThisMonth = 0;
    const paymentPlans: DebtMonthlyPaymentPlan[] = [];

    // Track initial month balances and interest charged per debt
    const monthlyInterests: Record<string, { startBalance: number; interest: number }> = {};

    // Step 1: Charge monthly accrued interest
    for (const debt of state) {
      if (debt.isPaid) continue;
      const startBalance = debt.balance;
      const monthlyRate = debt.interestRate / 100 / 12;
      const interest = Math.round(startBalance * monthlyRate * 100) / 100;
      debt.balance = Math.round((debt.balance + interest) * 100) / 100;
      debt.totalInterestPaid += interest;
      totalInterestThisMonth += interest;
      monthlyInterests[debt.id] = { startBalance, interest };
    }

    // Step 2: Pay minimum monthly obligations across all accounts
    let surplusPool = extraMonthlyPayment;

    // Apply one-time windfall lump sum at Month 1
    if (currentMonth === 1 && remainingLumpSum > 0) {
      surplusPool += remainingLumpSum;
      remainingLumpSum = 0;
    }

    for (const debt of state) {
      if (debt.isPaid) {
        if (rolloverFreedPayments) {
          // Rollover freed minimum payments into the accelerator pool
          surplusPool += debt.minPayment;
        }
        continue;
      }

      const debtMeta = monthlyInterests[debt.id] || { startBalance: debt.balance, interest: 0 };
      const payment = Math.min(debt.balance, debt.minPayment);
      debt.balance = Math.round((debt.balance - payment) * 100) / 100;
      
      const interestCovered = Math.min(debtMeta.interest, payment);
      const principalPaid = Math.max(0, payment - interestCovered);
      totalPrincipalThisMonth += principalPaid;

      if (debt.balance <= 0.01) {
        debt.balance = 0;
        debt.isPaid = true;
        debt.payoffMonth = currentMonth;
        payoffMilestones.push({
          debtId: debt.id,
          name: debt.name,
          payoffMonth: currentMonth,
          payoffDate: formatPayoffDate(currentMonth),
          totalInterestPaid: Math.round(debt.totalInterestPaid * 100) / 100,
        });
      }

      paymentPlans.push({
        debtId: debt.id,
        name: debt.name,
        startBalance: debtMeta.startBalance,
        interestCharged: debtMeta.interest,
        payment,
        principalPaid,
        endBalance: debt.balance,
      });
    }

    // Step 3: Apply surplus pool to target priority debt (Avalanche vs Snowball)
    if (surplusPool > 0) {
      const unpaidDebts = state.filter((d) => !d.isPaid);

      if (strategy === "AVALANCHE") {
        // Highest APR first; if tied, lowest balance
        unpaidDebts.sort((a, b) => b.interestRate - a.interestRate || a.balance - b.balance);
      } else {
        // SNOWBALL: Lowest balance first; if tied, highest APR
        unpaidDebts.sort((a, b) => a.balance - b.balance || b.interestRate - a.interestRate);
      }

      for (const targetDebt of unpaidDebts) {
        if (surplusPool <= 0) break;
        if (targetDebt.isPaid) continue;

        const extraPay = Math.min(targetDebt.balance, surplusPool);
        targetDebt.balance = Math.round((targetDebt.balance - extraPay) * 100) / 100;
        surplusPool -= extraPay;
        totalPrincipalThisMonth += extraPay;

        const plan = paymentPlans.find((p) => p.debtId === targetDebt.id);
        if (plan) {
          plan.payment += extraPay;
          plan.principalPaid += extraPay;
          plan.endBalance = targetDebt.balance;
        }

        if (targetDebt.balance <= 0.01) {
          targetDebt.balance = 0;
          targetDebt.isPaid = true;
          targetDebt.payoffMonth = currentMonth;
          payoffMilestones.push({
            debtId: targetDebt.id,
            name: targetDebt.name,
            payoffMonth: currentMonth,
            payoffDate: formatPayoffDate(currentMonth),
            totalInterestPaid: Math.round(targetDebt.totalInterestPaid * 100) / 100,
          });
        }
      }
    }

    const remainingTotalBalance = Math.round(state.reduce((sum, d) => sum + d.balance, 0) * 100) / 100;

    monthlySchedule.push({
      monthIndex: currentMonth,
      dateStr: formatPayoffDate(currentMonth),
      totalRemainingBalance: remainingTotalBalance,
      totalInterestPaidThisMonth: Math.round(totalInterestThisMonth * 100) / 100,
      totalPrincipalPaidThisMonth: Math.round(totalPrincipalThisMonth * 100) / 100,
      debtsRemainingCount: state.filter((d) => !d.isPaid).length,
      debtPayments: paymentPlans,
    });
  }

  const grandTotalInterest = Math.round(state.reduce((sum, d) => sum + d.totalInterestPaid, 0) * 100) / 100;

  return {
    monthsToPayoff: currentMonth,
    totalInterestPaid: grandTotalInterest,
    totalPrincipalPaid: initialPrincipalTotal,
    monthlySchedule,
    payoffMilestones,
  };
}
