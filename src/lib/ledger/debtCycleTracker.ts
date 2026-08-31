/**
 * Debt Payment Cycle & Interest Memory Tracker
 * Remembers payments made within the current monthly billing cycle
 * so multiple payments in the same month correctly credit prior interest paid.
 */

export interface DebtCyclePaymentRecord {
  debtId: string;
  cycleKey: string; // e.g. "2026-08"
  monthlyInterestDue: number;
  totalPaidThisCycle: number;
  interestPaidThisCycle: number;
  principalPaidThisCycle: number;
  payments: {
    amount: number;
    interestPortion: number;
    principalPortion: number;
    timestamp: string;
    label: string;
  }[];
}

/**
 * Returns current billing cycle key formatted as YYYY-MM
 */
export function getCurrentCycleKey(dueDay: number = 1, now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

const CYCLE_STORAGE_KEY_PREFIX = "hoard_debt_cycle_";

/**
 * Loads current monthly cycle record for a debt
 */
export function getDebtCycleRecord(
  debtId: string,
  monthlyInterestDue: number,
  cycleKey: string = getCurrentCycleKey()
): DebtCyclePaymentRecord {
  const storageKey = `${CYCLE_STORAGE_KEY_PREFIX}${debtId}_${cycleKey}`;
  if (typeof window === "undefined") {
    return {
      debtId,
      cycleKey,
      monthlyInterestDue,
      totalPaidThisCycle: 0,
      interestPaidThisCycle: 0,
      principalPaidThisCycle: 0,
      payments: [],
    };
  }

  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return {
        debtId,
        cycleKey,
        monthlyInterestDue,
        totalPaidThisCycle: 0,
        interestPaidThisCycle: 0,
        principalPaidThisCycle: 0,
        payments: [],
      };
    }
    const parsed = JSON.parse(raw);
    return {
      ...parsed,
      monthlyInterestDue, // keep updated with latest interest rate/balance
    };
  } catch (err) {
    console.error("Failed to load debt cycle record:", err);
    return {
      debtId,
      cycleKey,
      monthlyInterestDue,
      totalPaidThisCycle: 0,
      interestPaidThisCycle: 0,
      principalPaidThisCycle: 0,
      payments: [],
    };
  }
}

export interface PaymentCalculationResult {
  paymentAmount: number;
  monthlyInterestDue: number;
  previouslyPaidInterest: number;
  remainingInterestBeforePayment: number;
  interestPortion: number;
  principalReduction: number;
  remainingInterestAfterPayment: number;
  isInterestFullyCleared: boolean;
}

/**
 * Calculates the exact interest vs principal split taking into account
 * any previous payments already made during this billing cycle.
 */
export function calculatePaymentSplit(
  paymentAmount: number,
  monthlyInterestDue: number,
  previouslyPaidInterest: number = 0
): PaymentCalculationResult {
  const cleanPayment = Math.max(0, paymentAmount);
  const remainingInterestDue = Math.max(0, monthlyInterestDue - previouslyPaidInterest);

  // Interest portion cannot exceed what's left unpaid for this month
  const interestPortion = Math.round(Math.min(remainingInterestDue, cleanPayment) * 100) / 100;
  // Whatever is left over after paying remaining interest goes 100% to principal
  const principalReduction = Math.round(Math.max(0, cleanPayment - interestPortion) * 100) / 100;
  const remainingInterestAfterPayment = Math.round(Math.max(0, remainingInterestDue - interestPortion) * 100) / 100;
  const isInterestFullyCleared = remainingInterestAfterPayment <= 0.009;

  return {
    paymentAmount: cleanPayment,
    monthlyInterestDue,
    previouslyPaidInterest,
    remainingInterestBeforePayment: remainingInterestDue,
    interestPortion,
    principalReduction,
    remainingInterestAfterPayment,
    isInterestFullyCleared,
  };
}

/**
 * Records a payment in the current cycle
 */
export function recordCyclePayment(
  debtId: string,
  paymentAmount: number,
  monthlyInterestDue: number,
  label: string = "Payment",
  cycleKey: string = getCurrentCycleKey()
): { record: DebtCyclePaymentRecord; calculation: PaymentCalculationResult } {
  const currentRecord = getDebtCycleRecord(debtId, monthlyInterestDue, cycleKey);
  const calculation = calculatePaymentSplit(paymentAmount, monthlyInterestDue, currentRecord.interestPaidThisCycle);

  const updatedRecord: DebtCyclePaymentRecord = {
    debtId,
    cycleKey,
    monthlyInterestDue,
    totalPaidThisCycle: Math.round((currentRecord.totalPaidThisCycle + calculation.paymentAmount) * 100) / 100,
    interestPaidThisCycle: Math.round((currentRecord.interestPaidThisCycle + calculation.interestPortion) * 100) / 100,
    principalPaidThisCycle: Math.round((currentRecord.principalPaidThisCycle + calculation.principalReduction) * 100) / 100,
    payments: [
      ...currentRecord.payments,
      {
        amount: calculation.paymentAmount,
        interestPortion: calculation.interestPortion,
        principalPortion: calculation.principalReduction,
        timestamp: new Date().toISOString(),
        label,
      },
    ],
  };

  if (typeof window !== "undefined") {
    try {
      const storageKey = `${CYCLE_STORAGE_KEY_PREFIX}${debtId}_${cycleKey}`;
      localStorage.setItem(storageKey, JSON.stringify(updatedRecord));
    } catch (err) {
      console.error("Failed to save debt cycle payment:", err);
    }
  }

  return { record: updatedRecord, calculation };
}
