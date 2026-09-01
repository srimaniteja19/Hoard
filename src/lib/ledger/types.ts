import {
  FinancialSubscriptionRow,
  FinancialDebtRow,
  FinancialAssetRow,
  FinancialIncomeRow,
  FinancialAuditRow,
  FinancialInvestmentRow,
  NewFinancialInvestmentRow,
  SubscriptionCadence,
  SubscriptionCategory,
  SubscriptionStatus,
  DebtType,
  AssetCategory,
  IncomeCadence,
  InvestmentAssetType,
  InvestmentCadence,
} from "@/db/schema";

export type {
  FinancialSubscriptionRow,
  FinancialDebtRow,
  FinancialAssetRow,
  FinancialIncomeRow,
  FinancialAuditRow,
  FinancialInvestmentRow,
  NewFinancialInvestmentRow,
  SubscriptionCadence,
  SubscriptionCategory,
  SubscriptionStatus,
  DebtType,
  AssetCategory,
  IncomeCadence,
  InvestmentAssetType,
  InvestmentCadence,
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

export const INVESTMENT_ASSET_TYPES = [
  "STOCKS_ETF",
  "MUTUAL_FUND",
  "GOLD_PRECIOUS_METALS",
  "CRYPTO",
  "RETIREMENT",
  "REAL_ESTATE_REIT",
  "BONDS_TREASURY",
  "OTHER",
] as const;

export const INVESTMENT_CADENCES = ["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY", "QUARTERLY", "ANNUAL"] as const;
export const INVESTMENT_STATUSES = ["ACTIVE", "PAUSED", "COMPLETED"] as const;

export interface InvestmentThemeConfig {
  icon: string;
  label: string;
  shortLabel: string;
  headerBg: string;
  accent: string;
}

export const INVESTMENT_THEMES: Record<InvestmentAssetType, InvestmentThemeConfig> = {
  GOLD_PRECIOUS_METALS: {
    icon: "🪙",
    label: "GOLD & PRECIOUS METALS",
    shortLabel: "GOLD",
    headerBg: "#F59E0B",
    accent: "#D97706",
  },
  STOCKS_ETF: {
    icon: "📈",
    label: "STOCKS & ETFS (S&P 500)",
    shortLabel: "STOCKS",
    headerBg: "#00F0FF",
    accent: "#0284C7",
  },
  MUTUAL_FUND: {
    icon: "📊",
    label: "MUTUAL FUNDS / SIPS",
    shortLabel: "MUTUAL FUNDS",
    headerBg: "#FFE600",
    accent: "#CA8A04",
  },
  CRYPTO: {
    icon: "⚡",
    label: "CRYPTO & BITCOIN DCA",
    shortLabel: "CRYPTO",
    headerBg: "#FF2E93",
    accent: "#BE123C",
  },
  RETIREMENT: {
    icon: "🏛️",
    label: "RETIREMENT / 401(K) / IRA",
    shortLabel: "RETIREMENT",
    headerBg: "#C084FC",
    accent: "#9333EA",
  },
  REAL_ESTATE_REIT: {
    icon: "🏡",
    label: "REAL ESTATE & REITS",
    shortLabel: "REAL ESTATE",
    headerBg: "#34D399",
    accent: "#059669",
  },
  BONDS_TREASURY: {
    icon: "📜",
    label: "BONDS & GOVT TREASURIES",
    shortLabel: "BONDS",
    headerBg: "#B6FF3C",
    accent: "#65A30D",
  },
  OTHER: {
    icon: "📦",
    label: "OTHER INVESTMENTS",
    shortLabel: "OTHER",
    headerBg: "#E4E4E7",
    accent: "#71717A",
  },
};

export interface CategoryThemeConfig {
  headerBg: string;
  headerText: string;
  accent: string;
  cardBg: string;
  icon: string;
  label: string;
  tagBg: string;
  tagColor: string;
  shadowColor: string;
  priceColor: string;
  badgeBg: string;
  badgeText: string;
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
    shadowColor: "#000000",
    priceColor: "#000000",
    badgeBg: "#00F0FF",
    badgeText: "#000000",
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
    shadowColor: "#000000",
    priceColor: "#000000",
    badgeBg: "#FF2E93",
    badgeText: "#FFFFFF",
  },
  INFRA: {
    headerBg: "#FFE600",
    headerText: "#000000",
    accent: "#FFE600",
    cardBg: "#FFFFFF",
    icon: "☁️",
    label: "CLOUD & INFRA",
    tagBg: "#000000",
    tagColor: "#FFE600",
    shadowColor: "#000000",
    priceColor: "#000000",
    badgeBg: "#FFE600",
    badgeText: "#000000",
  },
  HEALTH: {
    headerBg: "#B6FF3C",
    headerText: "#000000",
    accent: "#B6FF3C",
    cardBg: "#FFFFFF",
    icon: "🌿",
    label: "HEALTH & WELLNESS",
    tagBg: "#000000",
    tagColor: "#B6FF3C",
    shadowColor: "#000000",
    priceColor: "#000000",
    badgeBg: "#B6FF3C",
    badgeText: "#000000",
  },
  UTILITIES: {
    headerBg: "#FF7700",
    headerText: "#FFFFFF",
    accent: "#FF7700",
    cardBg: "#FFFFFF",
    icon: "💡",
    label: "UTILITIES",
    tagBg: "#000000",
    tagColor: "#FFA347",
    shadowColor: "#000000",
    priceColor: "#000000",
    badgeBg: "#FF7700",
    badgeText: "#FFFFFF",
  },
  MEMBERSHIP: {
    headerBg: "#C084FC",
    headerText: "#000000",
    accent: "#C084FC",
    cardBg: "#FFFFFF",
    icon: "⭐",
    label: "MEMBERSHIP",
    tagBg: "#000000",
    tagColor: "#C084FC",
    shadowColor: "#000000",
    priceColor: "#000000",
    badgeBg: "#C084FC",
    badgeText: "#000000",
  },
  OTHER: {
    headerBg: "#00FF9D",
    headerText: "#000000",
    accent: "#00FF9D",
    cardBg: "#FFFFFF",
    icon: "📦",
    label: "OTHER",
    tagBg: "#000000",
    tagColor: "#00FF9D",
    shadowColor: "#000000",
    priceColor: "#000000",
    badgeBg: "#00FF9D",
    badgeText: "#000000",
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
  oneTimeLumpSum?: number;
  monthsToPayoff: number;
  debtFreeDate: string;
  totalInterestPaid: number;
  totalPrincipalPaid: number;
  baselineMonthsToPayoff: number;
  baselineTotalInterestPaid: number;
  baselineDebtFreeDate: string;
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

export interface CompoundProjectionPoint {
  years: number;
  totalInvested: number;
  projectedWealth: number;
  interestEarned: number;
}

export interface CategoryInvestmentStat {
  assetType: InvestmentAssetType;
  monthlyTotal: number;
  yearlyTotal: number;
  count: number;
}

export interface InvestmentMetrics {
  monthlyTotal: number;
  yearlyTotal: number;
  monthlyTotalUsd?: number;
  yearlyTotalUsd?: number;
  currency?: string;
  activeCount: number;
  pausedCount: number;
  weightedReturnRatePct: number;
  categoryBreakdown: Record<InvestmentAssetType, CategoryInvestmentStat>;
  compoundProjections: CompoundProjectionPoint[];
  fxRateInrPerUsd?: number;
  fxRateDate?: string;
}

export interface CashFlowSummary {
  monthlyGrossIncome: number;
  monthlyTaxWithholding: number;
  monthlyNetTakeHome: number;
  monthlySubscriptions: number;
  monthlyDebtMinimums: number;
  monthlyRecurringInvestments: number;
  monthlyRecurringInvestmentsUsd?: number;
  investmentCurrency?: string;
  fxRateInrPerUsd?: number;
  fxRateDate?: string;
  totalFixedOutflow: number;
  monthlyNetSurplus: number;
  savingsRatePct: number;
  wealthVelocityPct: number;
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

export interface AuditHealthPillar {
  name: string;
  score: number; // 0 - 100
  grade: "A+" | "A" | "B" | "C" | "D" | "F";
  verdict: string;
  status: "EXCELLENT" | "STABLE" | "WARNING" | "CRITICAL";
}

export interface AuditTrajectoryPoint {
  year: number; // 1, 3, 5, 10
  statusQuoNetWorth: number;
  optimizedNetWorth: number;
  deltaGain: number;
}

export interface AuditSubscriptionCull {
  name: string;
  category?: string;
  currentCost?: number;
  cadence?: string;
  annualSavings: number;
  actionType?: "CANCEL" | "DOWNGRADE" | "RENEGOTIATE" | "SWITCH_ANNUAL";
  reason: string;
  negotiationScript?: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
}

export interface AuditTacticalAction {
  phase: "IMMEDIATE_7_DAYS" | "NEXT_30_DAYS" | "LONG_TERM_90_DAYS";
  title: string;
  impact: string;
  action: string;
  priority: "URGENT" | "RECOMMENDED" | "OPPORTUNITY";
}

export interface AuditAssetAllocation {
  current: {
    liquidCashPct: number;
    equitiesAndMutualFundsPct: number;
    preciousMetalsPct: number;
    cryptoPct: number;
    realEstatePct: number;
    retirementPct: number;
    otherPct: number;
  };
  recommended: {
    liquidCashPct: number;
    equitiesAndMutualFundsPct: number;
    preciousMetalsPct: number;
    cryptoPct: number;
    realEstatePct: number;
    retirementPct: number;
    otherPct: number;
  };
  rebalanceAdvice: string;
}

export interface AuditInvestmentStrategy {
  currentMonthlySIP: number;
  suggestedMonthlySIP: number;
  suggestedAllocations: Array<{
    assetType: string;
    percentage: number;
    rationale: string;
  }>;
  assetDiversificationTip: string;
  tenYearCompoundingImpact: number;
}

export interface FinancialAuditAnalysis {
  healthScore: number; // 0 - 100
  summaryVerdict: string;
  currency?: string; // Dominant currency (INR, USD, etc.)
  pillars?: {
    runway: AuditHealthPillar;
    debt: AuditHealthPillar;
    burn: AuditHealthPillar;
    wealth: AuditHealthPillar;
  };
  projections?: AuditTrajectoryPoint[];
  subscriptionCullList: AuditSubscriptionCull[];
  debtAccelerationStrategy: {
    recommendedStrategy: "AVALANCHE" | "SNOWBALL";
    strategyRationale: string;
    targetPriorityDebt: string;
    extraPaymentRecommendation: number;
    projectedInterestSavings: number;
    payoffMonthsSaved?: number;
    estimatedDebtFreeDate?: string;
  };
  investmentStrategy?: AuditInvestmentStrategy;
  assetAllocation?: AuditAssetAllocation;
  cashFlowOptimization: Array<{
    title: string;
    impact: string;
    action: string;
  }>;
  tacticalPlan?: AuditTacticalAction[];
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
  investments: FinancialInvestmentRow[];
  fxSnapshot?: {
    date: string;
    formattedDate: string;
    inrPerUsd: number;
    usdPerInr: number;
    isLive: boolean;
  };
  metrics: {
    subscriptionMetrics: SubscriptionMetrics;
    investmentMetrics: InvestmentMetrics;
    cashFlow: CashFlowSummary;
    netWorth: NetWorthSummary;
    avalanchePayoff: PayoffSimulationResult;
    snowballPayoff: PayoffSimulationResult;
  };
  latestAudit: FinancialAuditRow | null;
}
