/**
 * Recurring Investment Auto-Accrual & Net Worth Asset Auto-Sync Engine
 *
 * Handles:
 * 1. Automatic Monthly Accrual on Investment Day (Auto-adds installment + 1mo compound yield)
 * 2. One-Click Manual SIP Execution ("Record SIP" button)
 * 3. Bidirectional Auto-Sync to Net Worth Assets table
 */

import {
  FinancialInvestmentRow,
  FinancialAssetRow,
  AssetCategory,
  InvestmentAssetType,
  InvestmentCadence,
} from "./types";
import {
  getInvestmentById,
  updateInvestment,
  updateInvestmentIfNotesMatch,
  getUserAssets,
  createAsset,
  updateAsset,
} from "@/lib/dal/ledger";

export interface AccrualMetadata {
  lastAccruedMonth?: string; // "YYYY-MM"
  lastExecutedAt?: string; // ISO String
  userNote?: string;
}

export function parseAccrualNotes(notesStr?: string | null): {
  userNote: string;
  lastAccruedMonth: string | null;
  lastExecutedAt: string | null;
} {
  if (!notesStr) {
    return { userNote: "", lastAccruedMonth: null, lastExecutedAt: null };
  }

  const metaMatch = notesStr.match(/\[accrual:({.*?})\]/);
  if (metaMatch && metaMatch[1]) {
    try {
      const parsed: AccrualMetadata = JSON.parse(metaMatch[1]);
      const cleanUserNote = notesStr.replace(/\[accrual:{.*?}\]/, "").trim();
      return {
        userNote: cleanUserNote,
        lastAccruedMonth: parsed.lastAccruedMonth || null,
        lastExecutedAt: parsed.lastExecutedAt || null,
      };
    } catch {
      // ignore
    }
  }

  return { userNote: notesStr.trim(), lastAccruedMonth: null, lastExecutedAt: null };
}

export function encodeAccrualNotes(
  userNote: string,
  lastAccruedMonth?: string | null,
  lastExecutedAt?: string | null
): string {
  const cleanNote = userNote ? userNote.replace(/\[accrual:{.*?}\]/, "").trim() : "";
  const meta: AccrualMetadata = {
    lastAccruedMonth: lastAccruedMonth || undefined,
    lastExecutedAt: lastExecutedAt || undefined,
  };
  return `${cleanNote} [accrual:${JSON.stringify(meta)}]`.trim();
}

/**
 * Maps investment asset types to Net Worth asset categories
 */
export function mapAssetTypeToNetWorthCategory(assetType: string): AssetCategory {
  switch (assetType as InvestmentAssetType) {
    case "CRYPTO":
      return "CRYPTO";
    case "RETIREMENT":
      return "RETIREMENT";
    case "REAL_ESTATE_REIT":
      return "REAL_ESTATE";
    case "GOLD_PRECIOUS_METALS":
    case "STOCKS_ETF":
    case "MUTUAL_FUND":
    case "BONDS_TREASURY":
    default:
      return "INVESTMENT";
  }
}

/**
 * Ensures an investment is linked to a Net Worth asset and updates its valuation
 */
export async function syncInvestmentWithNetWorthAsset(
  userId: string,
  investment: FinancialInvestmentRow
): Promise<string | null> {
  const targetCategory = mapAssetTypeToNetWorthCategory(investment.assetType);
  const currentVal = investment.currentValuation !== null && investment.currentValuation !== undefined
    ? investment.currentValuation
    : 0;

  const userAssets = await getUserAssets(userId);

  // 1. If investment already has targetAssetId, update that asset
  const invCurrency = investment.currency || "INR";
  if (investment.targetAssetId) {
    const existing = userAssets.find((a) => a.id === investment.targetAssetId);
    if (existing) {
      const existingNotes = existing.notes || "";
      const updatedNotes = existingNotes.includes("[currency:")
        ? existingNotes
        : `${existingNotes} [currency:${invCurrency}]`.trim();

      await updateAsset(userId, existing.id, {
        value: currentVal,
        institution: investment.platform || existing.institution,
        expectedYield: investment.expectedReturnRate ?? existing.expectedYield,
        notes: updatedNotes,
      });
      return existing.id;
    }
  }

  // 2. Try to find a matching existing asset by name
  const assetName = investment.platform
    ? `${investment.platform} - ${investment.name}`
    : investment.name;

  const matched = userAssets.find(
    (a) => a.name.toLowerCase() === assetName.toLowerCase() || a.name.toLowerCase() === investment.name.toLowerCase()
  );

  if (matched) {
    const existingNotes = matched.notes || "";
    const updatedNotes = existingNotes.includes("[currency:")
      ? existingNotes
      : `${existingNotes} [currency:${invCurrency}]`.trim();

    await updateAsset(userId, matched.id, {
      value: currentVal,
      institution: investment.platform || matched.institution,
      expectedYield: investment.expectedReturnRate ?? matched.expectedYield,
      notes: updatedNotes,
    });
    if (investment.targetAssetId !== matched.id) {
      await updateInvestment(userId, investment.id, { targetAssetId: matched.id });
    }
    return matched.id;
  }

  // 3. Auto-create new Net Worth Asset if not linked yet
  const created = await createAsset({
    userId,
    name: assetName,
    category: targetCategory,
    value: currentVal,
    institution: investment.platform,
    expectedYield: investment.expectedReturnRate,
    notes: `Auto-linked from Recurring SIP: ${investment.name} [currency:${invCurrency}]`,
  });

  await updateInvestment(userId, investment.id, { targetAssetId: created.id });
  return created.id;
}

/**
 * Executes a manual SIP installment in 1-click
 */
export async function executeManualSIP(
  userId: string,
  investmentId: string,
  customAmount?: number
): Promise<{ investment: FinancialInvestmentRow; addedAmount: number; newTotal: number }> {
  const investment = await getInvestmentById(userId, investmentId);
  if (!investment) {
    throw new Error("Investment not found");
  }

  const addedAmount = customAmount !== undefined && !isNaN(customAmount) && customAmount > 0
    ? customAmount
    : investment.amount;

  const prevValuation = investment.currentValuation || 0;
  const newTotal = Math.round((prevValuation + addedAmount) * 100) / 100;

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const { userNote } = parseAccrualNotes(investment.notes);
  const updatedNotes = encodeAccrualNotes(userNote, currentMonth, now.toISOString());

  const updated = await updateInvestment(userId, investmentId, {
    currentValuation: newTotal,
    notes: updatedNotes,
  });

  if (!updated) {
    throw new Error("Failed to update investment valuation");
  }

  // Sync with Net Worth Asset
  await syncInvestmentWithNetWorthAsset(userId, updated);

  return { investment: updated, addedAmount, newTotal };
}

// Sub-month cadences accrue on a fixed day-count cycle — day-of-month
// ("investmentDay") isn't a meaningful concept for these.
const SUB_MONTH_CADENCE_DAYS: Partial<Record<InvestmentCadence, number>> = {
  DAILY: 1,
  WEEKLY: 7,
  BIWEEKLY: 14,
};

// Calendar-anchored cadences accrue once every N calendar months, gated by
// the investment's chosen day-of-month.
const CALENDAR_CADENCE_MONTHS: Partial<Record<InvestmentCadence, number>> = {
  MONTHLY: 1,
  QUARTERLY: 3,
  ANNUAL: 12,
};

// Sanity cap on how many missed periods a single pass will catch up in one
// go (guards against a corrupted/ancient timestamp causing a huge loop).
const MAX_CATCHUP_PERIODS = 2000;

export interface AccrualPlan {
  /** How many contribution+growth periods are due to be caught up. */
  periods: number;
  /** Fraction of a year each period represents, for compounding the expected annual return. */
  periodFractionOfYear: number;
  newValuation: number;
  /** "YYYY-MM" of the accrual run, stored back onto the investment's notes. */
  newAccrualMonth: string;
}

function accrueOverPeriods(
  startingValuation: number,
  contributionPerPeriod: number,
  annualReturnRatePct: number,
  periodFractionOfYear: number,
  periods: number
): number {
  let valuation = startingValuation;
  for (let i = 0; i < periods; i++) {
    const growth = valuation > 0 ? valuation * (annualReturnRatePct / 100) * periodFractionOfYear : 0;
    valuation = valuation + growth + contributionPerPeriod;
  }
  return Math.round(valuation * 100) / 100;
}

/**
 * Pure calculation of how many contribution+growth periods are due for an
 * investment, honoring its actual cadence (DAILY/WEEKLY/BIWEEKLY accrue on a
 * fixed day-count cycle; MONTHLY/QUARTERLY/ANNUAL accrue on calendar-month
 * boundaries gated by `investmentDay`). Returns null when nothing is due.
 */
export function computeDueAccrualPlan(
  inv: Pick<FinancialInvestmentRow, "amount" | "cadence" | "investmentDay" | "currentValuation" | "expectedReturnRate" | "notes">,
  now: Date = new Date()
): AccrualPlan | null {
  if (!inv.amount || inv.amount <= 0) return null;

  const cadence = (inv.cadence as InvestmentCadence) || "MONTHLY";
  const { lastAccruedMonth, lastExecutedAt } = parseAccrualNotes(inv.notes);
  const targetDay = inv.investmentDay && inv.investmentDay >= 1 && inv.investmentDay <= 31 ? inv.investmentDay : 1;

  const currentYear = now.getFullYear();
  const currentMonthIdx = now.getMonth();
  const currentDay = now.getDate();
  const currentYearMonth = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, "0")}`;

  let periods = 0;
  let periodFractionOfYear = 1 / 12;

  const subMonthDays = SUB_MONTH_CADENCE_DAYS[cadence];
  if (subMonthDays) {
    periodFractionOfYear = subMonthDays / 365;
    if (lastExecutedAt) {
      const daysSince = Math.floor((now.getTime() - new Date(lastExecutedAt).getTime()) / (1000 * 60 * 60 * 24));
      periods = Math.max(0, Math.min(MAX_CATCHUP_PERIODS, Math.floor(daysSince / subMonthDays)));
    }
    // else: brand new schedule — starts counting from now, first accrual
    // lands after one full period rather than firing immediately.
  } else {
    const interval = CALENDAR_CADENCE_MONTHS[cadence] ?? 1;
    periodFractionOfYear = interval / 12;
    const dayGateOpen = currentDay >= targetDay;

    if (!lastAccruedMonth) {
      periods = dayGateOpen ? 1 : 0;
    } else {
      const [lastYearStr, lastMonthStr] = lastAccruedMonth.split("-");
      const lastYear = Number(lastYearStr);
      const lastMonthIdx = Number(lastMonthStr) - 1;
      const monthsElapsed = currentYear * 12 + currentMonthIdx - (lastYear * 12 + lastMonthIdx);
      // Don't count the current, still-incomplete interval until its day-of-month gate opens.
      const effectiveMonthsElapsed = monthsElapsed - (dayGateOpen ? 0 : 1);
      periods = Math.max(0, Math.min(MAX_CATCHUP_PERIODS, Math.floor(effectiveMonthsElapsed / interval)));
    }
  }

  if (periods <= 0) return null;

  const annualReturnRatePct = inv.expectedReturnRate ?? 10.0;
  const newValuation = accrueOverPeriods(
    inv.currentValuation || 0,
    inv.amount,
    annualReturnRatePct,
    periodFractionOfYear,
    periods
  );

  return { periods, periodFractionOfYear, newValuation, newAccrualMonth: currentYearMonth };
}

/**
 * Evaluates and executes automatic accrual for every active recurring
 * investment, according to each investment's own cadence.
 */
export async function processAutomaticInvestmentAccruals(
  userId: string,
  investments: FinancialInvestmentRow[]
): Promise<FinancialInvestmentRow[]> {
  const now = new Date();
  const updatedList: FinancialInvestmentRow[] = [];

  for (const inv of investments) {
    if (inv.status !== "ACTIVE") {
      updatedList.push(inv);
      continue;
    }

    const plan = computeDueAccrualPlan(inv, now);
    if (!plan) {
      updatedList.push(inv);
      continue;
    }

    const { userNote } = parseAccrualNotes(inv.notes);
    const newNotes = encodeAccrualNotes(userNote, plan.newAccrualMonth, now.toISOString());

    try {
      // Guarded by the row's current `notes` value: if a concurrent
      // request already accrued this investment since we read it, this
      // update is a no-op instead of layering a second accrual on top of
      // the same stale reading.
      const updated = await updateInvestmentIfNotesMatch(userId, inv.id, inv.notes ?? null, {
        currentValuation: plan.newValuation,
        notes: newNotes,
      });

      if (updated) {
        await syncInvestmentWithNetWorthAsset(userId, updated);
        updatedList.push(updated);
        continue;
      }
    } catch (err) {
      console.error(`[investmentAccrual] Failed auto-accrual for ${inv.name}:`, err);
    }

    updatedList.push(inv);
  }

  return updatedList;
}
