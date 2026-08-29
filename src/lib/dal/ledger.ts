import { db } from "@/db";
import {
  financialSubscriptions,
  financialDebts,
  financialAssets,
  financialIncomes,
  financialAudits,
  financialInvestments,
  FinancialSubscriptionRow,
  NewFinancialSubscriptionRow,
  FinancialDebtRow,
  NewFinancialDebtRow,
  FinancialAssetRow,
  NewFinancialAssetRow,
  FinancialIncomeRow,
  NewFinancialIncomeRow,
  FinancialAuditRow,
  NewFinancialAuditRow,
  FinancialInvestmentRow,
  NewFinancialInvestmentRow,
} from "@/db/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { calculateSubscriptionMetrics } from "@/lib/ledger/subscriptionMetrics";
import { calculateInvestmentMetrics } from "@/lib/ledger/investmentMetrics";
import { calculateCashFlow } from "@/lib/ledger/cashFlow";
import { calculateDebtPayoff } from "@/lib/ledger/debtPayoff";
import { FinancialOverviewPayload } from "@/lib/ledger/types";

// ─── SUBSCRIPTIONS ────────────────────────────────────────────────────────────

export async function getUserSubscriptions(userId: string): Promise<FinancialSubscriptionRow[]> {
  return db
    .select()
    .from(financialSubscriptions)
    .where(eq(financialSubscriptions.userId, userId))
    .orderBy(desc(financialSubscriptions.updatedAt));
}

export async function getSubscriptionById(
  userId: string,
  id: string
): Promise<FinancialSubscriptionRow | null> {
  const [row] = await db
    .select()
    .from(financialSubscriptions)
    .where(and(eq(financialSubscriptions.id, id), eq(financialSubscriptions.userId, userId)))
    .limit(1);
  return row || null;
}

export async function createSubscription(
  data: NewFinancialSubscriptionRow
): Promise<FinancialSubscriptionRow> {
  const [created] = await db.insert(financialSubscriptions).values(data).returning();
  return created;
}

export async function updateSubscription(
  userId: string,
  id: string,
  data: Partial<NewFinancialSubscriptionRow>
): Promise<FinancialSubscriptionRow | null> {
  const [updated] = await db
    .update(financialSubscriptions)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(financialSubscriptions.id, id), eq(financialSubscriptions.userId, userId)))
    .returning();
  return updated || null;
}

export async function deleteSubscription(userId: string, id: string): Promise<boolean> {
  const res = await db
    .delete(financialSubscriptions)
    .where(and(eq(financialSubscriptions.id, id), eq(financialSubscriptions.userId, userId)))
    .returning({ id: financialSubscriptions.id });
  return res.length > 0;
}

// ─── DEBTS ───────────────────────────────────────────────────────────────────

export async function getUserDebts(userId: string): Promise<FinancialDebtRow[]> {
  return db
    .select()
    .from(financialDebts)
    .where(eq(financialDebts.userId, userId))
    .orderBy(asc(financialDebts.isPaidOff), desc(financialDebts.interestRate));
}

export async function getDebtById(userId: string, id: string): Promise<FinancialDebtRow | null> {
  const [row] = await db
    .select()
    .from(financialDebts)
    .where(and(eq(financialDebts.id, id), eq(financialDebts.userId, userId)))
    .limit(1);
  return row || null;
}

export async function createDebt(data: NewFinancialDebtRow): Promise<FinancialDebtRow> {
  const [created] = await db.insert(financialDebts).values(data).returning();
  return created;
}

export async function updateDebt(
  userId: string,
  id: string,
  data: Partial<NewFinancialDebtRow>
): Promise<FinancialDebtRow | null> {
  const [updated] = await db
    .update(financialDebts)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(financialDebts.id, id), eq(financialDebts.userId, userId)))
    .returning();
  return updated || null;
}

export async function deleteDebt(userId: string, id: string): Promise<boolean> {
  const res = await db
    .delete(financialDebts)
    .where(and(eq(financialDebts.id, id), eq(financialDebts.userId, userId)))
    .returning({ id: financialDebts.id });
  return res.length > 0;
}

// ─── ASSETS ──────────────────────────────────────────────────────────────────

export async function getUserAssets(userId: string): Promise<FinancialAssetRow[]> {
  return db
    .select()
    .from(financialAssets)
    .where(eq(financialAssets.userId, userId))
    .orderBy(desc(financialAssets.value));
}

export async function getAssetById(userId: string, id: string): Promise<FinancialAssetRow | null> {
  const [row] = await db
    .select()
    .from(financialAssets)
    .where(and(eq(financialAssets.id, id), eq(financialAssets.userId, userId)))
    .limit(1);
  return row || null;
}

export async function createAsset(data: NewFinancialAssetRow): Promise<FinancialAssetRow> {
  const [created] = await db.insert(financialAssets).values(data).returning();
  return created;
}

export async function updateAsset(
  userId: string,
  id: string,
  data: Partial<NewFinancialAssetRow>
): Promise<FinancialAssetRow | null> {
  const [updated] = await db
    .update(financialAssets)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(financialAssets.id, id), eq(financialAssets.userId, userId)))
    .returning();
  return updated || null;
}

export async function deleteAsset(userId: string, id: string): Promise<boolean> {
  const res = await db
    .delete(financialAssets)
    .where(and(eq(financialAssets.id, id), eq(financialAssets.userId, userId)))
    .returning({ id: financialAssets.id });
  return res.length > 0;
}

// ─── INCOMES ─────────────────────────────────────────────────────────────────

export async function getUserIncomes(userId: string): Promise<FinancialIncomeRow[]> {
  return db
    .select()
    .from(financialIncomes)
    .where(eq(financialIncomes.userId, userId))
    .orderBy(desc(financialIncomes.amount));
}

export async function getIncomeById(userId: string, id: string): Promise<FinancialIncomeRow | null> {
  const [row] = await db
    .select()
    .from(financialIncomes)
    .where(and(eq(financialIncomes.id, id), eq(financialIncomes.userId, userId)))
    .limit(1);
  return row || null;
}

export async function createIncome(data: NewFinancialIncomeRow): Promise<FinancialIncomeRow> {
  const [created] = await db.insert(financialIncomes).values(data).returning();
  return created;
}

export async function updateIncome(
  userId: string,
  id: string,
  data: Partial<NewFinancialIncomeRow>
): Promise<FinancialIncomeRow | null> {
  const [updated] = await db
    .update(financialIncomes)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(financialIncomes.id, id), eq(financialIncomes.userId, userId)))
    .returning();
  return updated || null;
}

export async function deleteIncome(userId: string, id: string): Promise<boolean> {
  const res = await db
    .delete(financialIncomes)
    .where(and(eq(financialIncomes.id, id), eq(financialIncomes.userId, userId)))
    .returning({ id: financialIncomes.id });
  return res.length > 0;
}

// ─── RECURRING INVESTMENTS ───────────────────────────────────────────────────

export async function getUserInvestments(userId: string): Promise<FinancialInvestmentRow[]> {
  return db
    .select()
    .from(financialInvestments)
    .where(eq(financialInvestments.userId, userId))
    .orderBy(desc(financialInvestments.amount));
}

export async function getInvestmentById(
  userId: string,
  id: string
): Promise<FinancialInvestmentRow | null> {
  const [row] = await db
    .select()
    .from(financialInvestments)
    .where(and(eq(financialInvestments.id, id), eq(financialInvestments.userId, userId)))
    .limit(1);
  return row || null;
}

export async function createInvestment(
  data: NewFinancialInvestmentRow
): Promise<FinancialInvestmentRow> {
  const [created] = await db.insert(financialInvestments).values(data).returning();
  return created;
}

export async function updateInvestment(
  userId: string,
  id: string,
  data: Partial<NewFinancialInvestmentRow>
): Promise<FinancialInvestmentRow | null> {
  const [updated] = await db
    .update(financialInvestments)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(financialInvestments.id, id), eq(financialInvestments.userId, userId)))
    .returning();
  return updated || null;
}

export async function deleteInvestment(userId: string, id: string): Promise<boolean> {
  const res = await db
    .delete(financialInvestments)
    .where(and(eq(financialInvestments.id, id), eq(financialInvestments.userId, userId)))
    .returning({ id: financialInvestments.id });
  return res.length > 0;
}

// ─── AUDITS ──────────────────────────────────────────────────────────────────

export async function getLatestFinancialAudit(userId: string): Promise<FinancialAuditRow | null> {
  const [row] = await db
    .select()
    .from(financialAudits)
    .where(eq(financialAudits.userId, userId))
    .orderBy(desc(financialAudits.createdAt))
    .limit(1);
  return row || null;
}

export async function createFinancialAudit(data: NewFinancialAuditRow): Promise<FinancialAuditRow> {
  const [created] = await db.insert(financialAudits).values(data).returning();
  return created;
}

// ─── UNIFIED OVERVIEW AGGREGATOR ─────────────────────────────────────────────

export async function getFinancialOverview(
  userId: string,
  extraMonthlyPayment: number = 0
): Promise<FinancialOverviewPayload> {
  const [subscriptions, debts, assets, incomes, investments, latestAudit] = await Promise.all([
    getUserSubscriptions(userId),
    getUserDebts(userId),
    getUserAssets(userId),
    getUserIncomes(userId),
    getUserInvestments(userId),
    getLatestFinancialAudit(userId),
  ]);

  const subscriptionMetrics = calculateSubscriptionMetrics(subscriptions);
  const investmentMetrics = calculateInvestmentMetrics(investments);
  const { cashFlow, netWorth } = calculateCashFlow(
    incomes,
    subscriptions,
    debts,
    assets,
    investments
  );

  const avalanchePayoff = calculateDebtPayoff(debts, "AVALANCHE", extraMonthlyPayment);
  const snowballPayoff = calculateDebtPayoff(debts, "SNOWBALL", extraMonthlyPayment);

  return {
    subscriptions,
    debts,
    assets,
    incomes,
    investments,
    metrics: {
      subscriptionMetrics,
      investmentMetrics,
      cashFlow,
      netWorth,
      avalanchePayoff,
      snowballPayoff,
    },
    latestAudit,
  };
}
