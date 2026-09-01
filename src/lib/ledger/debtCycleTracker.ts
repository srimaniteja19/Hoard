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
  /** Unpaid interest rolled forward from the previous cycle (negative amortization). */
  carriedOverInterest: number;
  /** Whether carriedOverInterest has already been capitalized onto the debt's balance. */
  carriedOverInterestApplied: boolean;
  /** Marks a cycle whose unpaid interest has already been rolled into a later cycle. */
  closedOut?: boolean;
}

/** Clamp a due-day-of-month to a value every month is guaranteed to have. */
function clampDueDay(dueDay: number): number {
  if (!dueDay || dueDay < 1) return 1;
  return Math.min(dueDay, 28);
}

/** The calendar date a billing cycle containing `now` actually started on. */
function cycleStartDate(dueDay: number, now: Date): Date {
  const day = clampDueDay(dueDay);
  const year = now.getFullYear();
  const month = now.getMonth();
  if (now.getDate() >= day) {
    return new Date(year, month, day);
  }
  return new Date(year, month - 1, day);
}

function formatCycleKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Returns the billing cycle key (YYYY-MM of the cycle's start month) that
 * contains `now`, anchored to the debt's actual due day rather than the
 * calendar month.
 */
export function getCurrentCycleKey(dueDay: number = 1, now: Date = new Date()): string {
  return formatCycleKey(cycleStartDate(dueDay, now));
}

/**
 * Returns the billing cycle key immediately preceding the cycle containing `now`.
 */
export function getPreviousCycleKey(dueDay: number = 1, now: Date = new Date()): string {
  const start = cycleStartDate(dueDay, now);
  const prevStart = new Date(start.getFullYear(), start.getMonth() - 1, start.getDate());
  return formatCycleKey(prevStart);
}

const CYCLE_STORAGE_KEY_PREFIX = "hoard_debt_cycle_";

function storageKeyFor(debtId: string, cycleKey: string): string {
  return `${CYCLE_STORAGE_KEY_PREFIX}${debtId}_${cycleKey}`;
}

function readRawRecord(debtId: string, cycleKey: string): DebtCyclePaymentRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKeyFor(debtId, cycleKey));
    return raw ? (JSON.parse(raw) as DebtCyclePaymentRecord) : null;
  } catch (err) {
    console.error("Failed to load debt cycle record:", err);
    return null;
  }
}

function writeRawRecord(debtId: string, cycleKey: string, record: DebtCyclePaymentRecord): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKeyFor(debtId, cycleKey), JSON.stringify(record));
  } catch (err) {
    console.error("Failed to save debt cycle payment:", err);
  }
}

/**
 * If the cycle immediately before `cycleKey` closed with unpaid interest,
 * marks it closed-out and returns that unpaid amount so it can be
 * capitalized (added) onto the debt's balance for the new cycle. Returns 0
 * if there was nothing left unpaid, or it was already accounted for.
 */
function settlePreviousCycleInterest(debtId: string, cycleKey: string, dueDay: number): number {
  const now = new Date();
  const prevCycleKey = getPreviousCycleKey(dueDay, now);
  if (prevCycleKey === cycleKey) return 0;

  const prev = readRawRecord(debtId, prevCycleKey);
  if (!prev || prev.closedOut) return 0;

  const unpaid = Math.round(Math.max(0, prev.monthlyInterestDue - prev.interestPaidThisCycle) * 100) / 100;

  // Always mark the previous cycle closed so it's only ever settled once,
  // even if there was nothing left unpaid.
  writeRawRecord(debtId, prevCycleKey, { ...prev, closedOut: true });

  return unpaid > 0.009 ? unpaid : 0;
}

function emptyRecord(
  debtId: string,
  cycleKey: string,
  monthlyInterestDue: number,
  carriedOverInterest = 0
): DebtCyclePaymentRecord {
  return {
    debtId,
    cycleKey,
    monthlyInterestDue,
    totalPaidThisCycle: 0,
    interestPaidThisCycle: 0,
    principalPaidThisCycle: 0,
    payments: [],
    carriedOverInterest,
    carriedOverInterestApplied: false,
  };
}

/**
 * Loads the current billing-cycle record for a debt. On the first read of a
 * brand new cycle, checks whether the prior cycle ended with interest still
 * unpaid and, if so, surfaces it via `carriedOverInterest` so the caller can
 * capitalize it onto the debt's balance.
 */
export function getDebtCycleRecord(
  debtId: string,
  monthlyInterestDue: number,
  dueDay: number = 1,
  now: Date = new Date()
): DebtCyclePaymentRecord {
  const cycleKey = getCurrentCycleKey(dueDay, now);

  if (typeof window === "undefined") {
    return emptyRecord(debtId, cycleKey, monthlyInterestDue);
  }

  const existing = readRawRecord(debtId, cycleKey);
  if (existing) {
    return {
      ...emptyRecord(debtId, cycleKey, monthlyInterestDue),
      ...existing,
      monthlyInterestDue, // keep updated with latest interest rate/balance
    };
  }

  const carriedOverInterest = settlePreviousCycleInterest(debtId, cycleKey, dueDay);
  return emptyRecord(debtId, cycleKey, monthlyInterestDue, carriedOverInterest);
}

/**
 * Marks a cycle record's carried-over interest as applied (already
 * capitalized onto the debt balance), so it is never re-applied on a
 * subsequent read.
 */
export function markCarriedOverInterestApplied(record: DebtCyclePaymentRecord): DebtCyclePaymentRecord {
  const updated: DebtCyclePaymentRecord = { ...record, carriedOverInterestApplied: true };
  writeRawRecord(record.debtId, record.cycleKey, updated);
  return updated;
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
  dueDay: number = 1,
  now: Date = new Date()
): { record: DebtCyclePaymentRecord; calculation: PaymentCalculationResult } {
  const cycleKey = getCurrentCycleKey(dueDay, now);
  const currentRecord = getDebtCycleRecord(debtId, monthlyInterestDue, dueDay, now);
  const calculation = calculatePaymentSplit(paymentAmount, monthlyInterestDue, currentRecord.interestPaidThisCycle);

  const updatedRecord: DebtCyclePaymentRecord = {
    ...currentRecord,
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

  writeRawRecord(debtId, cycleKey, updatedRecord);

  return { record: updatedRecord, calculation };
}
