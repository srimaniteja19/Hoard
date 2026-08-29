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
} from "./types";
import {
  getInvestmentById,
  updateInvestment,
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

/**
 * Evaluates and executes automatic monthly accrual if investmentDay has arrived
 */
export async function processAutomaticMonthlyAccruals(
  userId: string,
  investments: FinancialInvestmentRow[]
): Promise<FinancialInvestmentRow[]> {
  const now = new Date();
  const currentDay = now.getDate();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const updatedList: FinancialInvestmentRow[] = [];

  for (const inv of investments) {
    if (inv.status !== "ACTIVE" || !inv.amount || inv.amount <= 0) {
      updatedList.push(inv);
      continue;
    }

    const { userNote, lastAccruedMonth } = parseAccrualNotes(inv.notes);
    const targetDay = inv.investmentDay && inv.investmentDay >= 1 && inv.investmentDay <= 31
      ? inv.investmentDay
      : 1;

    // Check if target day has arrived for the current month and hasn't accrued yet
    const shouldAccrue = currentDay >= targetDay && lastAccruedMonth !== currentYearMonth;

    if (shouldAccrue) {
      const prevValuation = inv.currentValuation || 0;
      const expectedCAGR = inv.expectedReturnRate ?? 10.0;
      // 1-month compound growth on existing principal
      const monthlyYieldGrowth = prevValuation > 0 ? (prevValuation * (expectedCAGR / 100)) / 12 : 0;
      const newValuation = Math.round((prevValuation + monthlyYieldGrowth + inv.amount) * 100) / 100;

      const newNotes = encodeAccrualNotes(userNote, currentYearMonth, now.toISOString());

      try {
        const updated = await updateInvestment(userId, inv.id, {
          currentValuation: newValuation,
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
    }

    updatedList.push(inv);
  }

  return updatedList;
}
