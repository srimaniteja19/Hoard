/**
 * Monthly Surplus Sweeper & Capital Deployment Engine
 * Distributes free monthly cash surplus into optimal asset classes and accounts.
 */

import { FinancialDebtRow, FinancialInvestmentRow } from "./types";
import { convertToUsd } from "./fx";

export type SweeperPreset =
  | "AGGRESSIVE_COMPOUNDER"
  | "DEBT_KNOCKOUT"
  | "ALL_WEATHER"
  | "CUSTOM";

export interface SweeperAllocationItem {
  id: string;
  category: "EQUITY_SIP" | "PRECIOUS_METALS" | "HYSA_CASH" | "DEBT_PAYOFF" | "CRYPTO_ALT";
  title: string;
  percentage: number;
  amountUsd: number;
  amountInr: number;
  targetAccountName: string;
  targetPlatform?: string;
  rationale: string;
  icon: string;
  accentColor: string;
}

export interface SweeperStrategy {
  preset: SweeperPreset;
  title: string;
  tagline: string;
  badge: string;
  description: string;
  allocations: SweeperAllocationItem[];
  totalSurplusUsd: number;
  totalSurplusInr: number;
  tenYearWealthMultiplier: number;
  projectedTenYearCompoundedUsd: number;
}

export const SWEEPER_PRESET_CONFIGS: Record<
  Exclude<SweeperPreset, "CUSTOM">,
  {
    title: string;
    tagline: string;
    badge: string;
    description: string;
    splits: { category: SweeperAllocationItem["category"]; percentage: number }[];
  }
> = {
  AGGRESSIVE_COMPOUNDER: {
    title: "Aggressive Compounder",
    tagline: "Maximize Long-Term Capital Acceleration",
    badge: "MAX GROWTH",
    description: "Channels 80% into wealth-generating growth assets (Equities & Gold) while maintaining a healthy 20% liquid cash buffer.",
    splits: [
      { category: "EQUITY_SIP", percentage: 60 },
      { category: "PRECIOUS_METALS", percentage: 20 },
      { category: "HYSA_CASH", percentage: 20 },
    ],
  },
  DEBT_KNOCKOUT: {
    title: "Predatory Debt Crusher",
    tagline: "Vaporize High-APR Drag Instantly",
    badge: "ZERO INTEREST",
    description: "Allocates 50% directly into accelerating your highest APR liability payoff, eliminating compounding interest bleed.",
    splits: [
      { category: "DEBT_PAYOFF", percentage: 50 },
      { category: "EQUITY_SIP", percentage: 30 },
      { category: "HYSA_CASH", percentage: 20 },
    ],
  },
  ALL_WEATHER: {
    title: "All-Weather Sovereign",
    tagline: "Macro Resilience & Inflation Defense",
    badge: "BALANCED",
    description: "Distributes capital across global equities, vaulted bullion, high-yield reserves, and decentralized sovereign hedges.",
    splits: [
      { category: "EQUITY_SIP", percentage: 40 },
      { category: "PRECIOUS_METALS", percentage: 30 },
      { category: "HYSA_CASH", percentage: 20 },
      { category: "CRYPTO_ALT", percentage: 10 },
    ],
  },
};

const CATEGORY_METADATA: Record<
  SweeperAllocationItem["category"],
  { defaultTitle: string; rationale: string; icon: string; accentColor: string }
> = {
  EQUITY_SIP: {
    defaultTitle: "Broad Market Index & Mutual Fund SIPs",
    rationale: "DCA into diversified equities compounding at 10-14% CAGR.",
    icon: "📈",
    accentColor: "#FFE600",
  },
  PRECIOUS_METALS: {
    defaultTitle: "Physical Gold & Silver Bullion Vault",
    rationale: "Uncorrelated monetary hedge against currency debasement.",
    icon: "🪙",
    accentColor: "#F59E0B",
  },
  HYSA_CASH: {
    defaultTitle: "High-Yield Cash Emergency Buffer",
    rationale: "Liquid risk-free cash earning 4-5% APY for immediate solvency.",
    icon: "💳",
    accentColor: "#00F0FF",
  },
  DEBT_PAYOFF: {
    defaultTitle: "High-APR Liability Acceleration",
    rationale: "Instant risk-free return by vaporizing double-digit APR interest.",
    icon: "🎯",
    accentColor: "#E11D48",
  },
  CRYPTO_ALT: {
    defaultTitle: "Sovereign Digital Store of Value",
    rationale: "Asymmetric alternative reserve hedge.",
    icon: "⚡",
    accentColor: "#C084FC",
  },
};

/**
 * Calculates itemized allocation distribution for a given monthly surplus and strategy preset.
 */
export function calculateSurplusAllocation(
  monthlySurplusUsd: number,
  preset: SweeperPreset,
  inrRate: number = 86.85,
  debts: FinancialDebtRow[] = [],
  investments: FinancialInvestmentRow[] = [],
  customSplits?: { category: SweeperAllocationItem["category"]; percentage: number }[]
): SweeperStrategy {
  const surplusUsd = Math.max(0, monthlySurplusUsd || 0);
  const surplusInr = surplusUsd * inrRate;

  // Find target accounts
  const highestAprDebt = debts.filter((d) => !d.isPaidOff).sort((a, b) => b.interestRate - a.interestRate)[0];
  const goldInvestment = investments.find((i) => i.assetType === "GOLD_PRECIOUS_METALS");
  const equityInvestment = investments.find((i) => i.assetType === "MUTUAL_FUND" || i.assetType === "STOCKS_ETF");
  const cryptoInvestment = investments.find((i) => i.assetType === "CRYPTO");

  const config = preset === "CUSTOM"
    ? {
        title: "Custom Allocation Matrix",
        tagline: "Bespoke Portfolio Deployment",
        badge: "CUSTOM",
        description: "Your personalized capital deployment percentages.",
        splits: customSplits || SWEEPER_PRESET_CONFIGS.AGGRESSIVE_COMPOUNDER.splits,
      }
    : SWEEPER_PRESET_CONFIGS[preset];

  const allocations: SweeperAllocationItem[] = config.splits.map((split, idx) => {
    const meta = CATEGORY_METADATA[split.category];
    const amountUsd = Math.round(((surplusUsd * split.percentage) / 100) * 100) / 100;
    const amountInr = Math.round(amountUsd * inrRate);

    let targetAccountName = meta.defaultTitle;
    let targetPlatform: string | undefined;

    if (split.category === "DEBT_PAYOFF" && highestAprDebt) {
      targetAccountName = `${highestAprDebt.name} (${highestAprDebt.interestRate}% APR)`;
      targetPlatform = highestAprDebt.lender || "Direct Debt Account";
    } else if (split.category === "PRECIOUS_METALS" && goldInvestment) {
      targetAccountName = goldInvestment.name;
      targetPlatform = goldInvestment.platform || "Jar / Vault";
    } else if (split.category === "EQUITY_SIP" && equityInvestment) {
      targetAccountName = equityInvestment.name;
      targetPlatform = equityInvestment.platform || "Groww / Brokerage";
    } else if (split.category === "CRYPTO_ALT" && cryptoInvestment) {
      targetAccountName = cryptoInvestment.name;
      targetPlatform = cryptoInvestment.platform || "Self-Custody";
    }

    return {
      id: `alloc-${split.category}-${idx}`,
      category: split.category,
      title: meta.defaultTitle,
      percentage: split.percentage,
      amountUsd,
      amountInr,
      targetAccountName,
      targetPlatform,
      rationale: meta.rationale,
      icon: meta.icon,
      accentColor: meta.accentColor,
    };
  });

  // Calculate 10-year compounded trajectory assuming average 9.5% weighted CAGR
  const annualContribution = surplusUsd * 12;
  const cagr = 0.095;
  let futureValue = 0;
  for (let y = 1; y <= 10; y++) {
    futureValue = (futureValue + annualContribution) * (1 + cagr);
  }
  const totalPrincipalContributed = annualContribution * 10;
  const tenYearWealthMultiplier = totalPrincipalContributed > 0
    ? Math.round((futureValue / totalPrincipalContributed) * 10) / 10
    : 1.0;

  return {
    preset,
    title: config.title,
    tagline: config.tagline,
    badge: config.badge,
    description: config.description,
    allocations,
    totalSurplusUsd: surplusUsd,
    totalSurplusInr: Math.round(surplusInr),
    tenYearWealthMultiplier,
    projectedTenYearCompoundedUsd: Math.round(futureValue),
  };
}
