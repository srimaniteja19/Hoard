import {
  FinancialSubscriptionRow,
  FinancialDebtRow,
  FinancialAssetRow,
  FinancialIncomeRow,
  FinancialAuditRow,
  SubscriptionCadence,
  SubscriptionCategory,
  SubscriptionStatus,
  DebtType,
  AssetCategory,
  IncomeCadence,
} from "@/db/schema";

export type {
  FinancialSubscriptionRow,
  FinancialDebtRow,
  FinancialAssetRow,
  FinancialIncomeRow,
  FinancialAuditRow,
  SubscriptionCadence,
  SubscriptionCategory,
  SubscriptionStatus,
  DebtType,
  AssetCategory,
  IncomeCadence,
};

export const SUBSCRIPTION_CADENCES = ["WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"] as const;
export const SUBSCRIPTION_CATEGORIES = [
  "SAAS",
  "MEDIA",
  "INFRA",
  "HEALTH",
  "UTILITIES",
  "MEMBERSHIP",
  "OTHER",
] as const;
export const SUBSCRIPTION_STATUSES = ["ACTIVE", "PAUSED", "TRIAL", "CANCELLED"] as const;
export const DEBT_TYPES = [
  "CREDIT_CARD",
  "STUDENT_LOAN",
  "AUTO_LOAN",
  "MORTGAGE",
  "PERSONAL",
  "MEDICAL",
  "OTHER",
] as const;
export const ASSET_CATEGORIES = [
  "CASH_CHECKING",
  "HYSA",
  "INVESTMENT",
  "RETIREMENT",
  "REAL_ESTATE",
  "CRYPTO",
  "OTHER",
] as const;
export const INCOME_CADENCES = ["MONTHLY", "BIWEEKLY", "SEMI_MONTHLY", "WEEKLY", "ANNUAL"] as const;

export interface CategoryThemeConfig {
  headerBg: string;
  headerText: string;
  accent: string;
  cardBg: string;
  icon: string;
  label: string;
  tagBg: string;
  tagColor: string;
}

export const CATEGORY_THEMES: Record<SubscriptionCategory, CategoryThemeConfig> = {
  SAAS: {
    headerBg: "#00F0FF",
    headerText: "#000000",
    accent: "#00F0FF",
    cardBg: "#FFFFFF",
    icon: "⚡",
    label: "SAAS & AI",
    tagBg: "#000000",
    tagColor: "#00F0FF",
  },
  MEDIA: {
    headerBg: "#FF2E93",
    headerText: "#FFFFFF",
    accent: "#FF2E93",
    cardBg: "#FFFFFF",
    icon: "🎬",
    label: "STREAMING & MEDIA",
    tagBg: "#000000",
    tagColor: "#FF80BF",
  },
  INFRA: {
    headerBg: "#FFE600",
    headerText: "#000000",
    accent: "#FFE600",
    cardBg: "#FFFFFF",
    icon: "☁️",
    label: "INFRASTRUCTURE",
    tagBg: "#000000",
    tagColor: "#FFE600",
  },
  HEALTH: {
    headerBg: "#00FF66",
    headerText: "#000000",
    accent: "#00FF66",
    cardBg: "#FFFFFF",
    icon: "🌿",
    label: "HEALTH & VITALITY",
    tagBg: "#000000",
    tagColor: "#00FF66",
  },
  UTILITIES: {
    headerBg: "#38BDF8",
    headerText: "#000000",
    accent: "#38BDF8",
    cardBg: "#FFFFFF",
    icon: "💡",
    label: "UTILITIES",
    tagBg: "#000000",
    tagColor: "#38BDF8",
  },
  MEMBERSHIP: {
    headerBg: "#C084FC",
    headerText: "#000000",
    accent: "#C084FC",
    cardBg: "#FFFFFF",
    icon: "🏛️",
    label: "MEMBERSHIP",
    tagBg: "#000000",
    tagColor: "#C084FC",
  },
  OTHER: {
    headerBg: "#E2E8F0",
    headerText: "#000000",
    accent: "#94A3B8",
    cardBg: "#FFFFFF",
    icon: "📦",
    label: "OTHER",
    tagBg: "#000000",
    tagColor: "#FFFFFF",
  },
};

export type DebtPayoffStrategy = "AVALANCHE" | "SNOWBALL";

export interface DebtMonthlyPaymentPlan {
  debtId: string;
  name: string;
  startBalance: number;
  interestCharged: number;
  payment: number;
  principalPaid: number;
  endBalance: number;
}

export interface PayoffMonthSnapshot {
  monthIndex: number;
  dateStr: string;
  totalRemainingBalance: number;
  totalInterestPaidThisMonth: number;
  totalPrincipalPaidThisMonth: number;
  debtsRemainingCount: number;
  debtPayments: DebtMonthlyPaymentPlan[];
}

export interface DebtPayoffMilestone {
  debtId: string;
  name: string;
  payoffMonth: number;
  payoffDate: string;
  totalInterestPaid: number;
}

export interface PayoffSimulationResult {
  strategy: DebtPayoffStrategy;
  extraMonthlyPayment: number;
  monthsToPayoff: number;
  debtFreeDate: string;
  totalInterestPaid: number;
  totalPrincipalPaid: number;
  interestSavedVsMinimums: number;
  monthsSavedVsMinimums: number;
  monthlySchedule: PayoffMonthSnapshot[];
  payoffMilestones: DebtPayoffMilestone[];
}

export interface UpcomingRenewal {
  id: string;
  name: string;
  amount: number;
  cadence: SubscriptionCadence;
  category: SubscriptionCategory;
  daysUntil: number;
  formattedDate: string;
  isTrial: boolean;
  status: SubscriptionStatus;
}

export interface CategorySubscriptionStat {
  category: SubscriptionCategory;
  monthlyTotal: number;
  yearlyTotal: number;
  count: number;
}

export interface SubscriptionMetrics {
  monthlyTotal: number;
  yearlyTotal: number;
  activeCount: number;
  pausedCount: number;
  trialCount: number;
  categoryBreakdown: Record<SubscriptionCategory, CategorySubscriptionStat>;
  upcomingRenewals: UpcomingRenewal[];
}

export interface CashFlowSummary {
  monthlyGrossIncome: number;
  monthlyTaxWithholding: number;
  monthlyNetTakeHome: number;
  monthlySubscriptions: number;
  monthlyDebtMinimums: number;
  totalFixedOutflow: number;
  monthlyNetSurplus: number;
  savingsRatePct: number;
  liquidCashTotal: number;
  runwayMonths: number;
}

export interface NetWorthSummary {
  totalAssets: number;
  totalLiquidCash: number;
  totalInvestments: number;
  totalRetirement: number;
  totalRealEstate: number;
  totalCrypto: number;
  totalOtherAssets: number;
  totalLiabilities: number;
  netWorth: number;
  debtToAssetRatioPct: number;
}

export interface FinancialAuditAnalysis {
  healthScore: number; // 0 - 100
  summaryVerdict: string;
  subscriptionCullList: Array<{
    name: string;
    annualSavings: number;
    reason: string;
    severity: "HIGH" | "MEDIUM" | "LOW";
  }>;
  debtAccelerationStrategy: {
    recommendedStrategy: "AVALANCHE" | "SNOWBALL";
    strategyRationale: string;
    targetPriorityDebt: string;
    extraPaymentRecommendation: number;
    projectedInterestSavings: number;
  };
  cashFlowOptimization: Array<{
    title: string;
    impact: string;
    action: string;
  }>;
  runwayAnalysis: {
    currentRunwayMonths: number;
    safetyEvaluation: "CRITICAL" | "LEAN" | "HEALTHY" | "FORTRESS";
    targetEmergencyFund: number;
  };
}

export interface FinancialOverviewPayload {
  subscriptions: FinancialSubscriptionRow[];
  debts: FinancialDebtRow[];
  assets: FinancialAssetRow[];
  incomes: FinancialIncomeRow[];
  metrics: {
    subscriptionMetrics: SubscriptionMetrics;
    cashFlow: CashFlowSummary;
    netWorth: NetWorthSummary;
    avalanchePayoff: PayoffSimulationResult;
    snowballPayoff: PayoffSimulationResult;
  };
  latestAudit: FinancialAuditRow | null;
}
