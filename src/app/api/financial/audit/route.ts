import { generateObject } from "ai";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { languageModel, gatewayProviderOptions, gatewayErrorMessage } from "@/lib/ai/models";
import {
  getUserSubscriptions,
  getUserDebts,
  getUserAssets,
  getUserIncomes,
  getUserInvestments,
  createFinancialAudit,
} from "@/lib/dal/ledger";
import { calculateSubscriptionMetrics } from "@/lib/ledger/subscriptionMetrics";
import { calculateInvestmentMetrics } from "@/lib/ledger/investmentMetrics";
import { calculateCashFlow } from "@/lib/ledger/cashFlow";
import { calculateDebtPayoff } from "@/lib/ledger/debtPayoff";
import { getCurrencySymbol } from "@/lib/ledger/formatters";
import { getLiveFxSnapshot } from "@/lib/ledger/fx";

const AUDIT_MODEL = "google/gemini-3.5-flash";

const PillarSchema = z.object({
  name: z.string().default("Pillar"),
  score: z.number().min(0).max(100).default(75),
  grade: z.string().default("B"),
  verdict: z.string().default("Stable position."),
  status: z.string().default("STABLE"),
});

const AuditSchema = z.object({
  healthScore: z.number().min(0).max(100).default(75),
  summaryVerdict: z.string().describe("Sharp, 2-3 sentence executive verdict summarizing financial velocity, risk exposure, burn drag, and 10-year compounding momentum"),
  currency: z.string().default("USD").describe("The base ISO currency code (e.g. USD, INR)"),
  pillars: z.object({
    runway: PillarSchema,
    debt: PillarSchema,
    burn: PillarSchema,
    wealth: PillarSchema,
  }),
  projections: z.array(
    z.object({
      year: z.number(),
      statusQuoNetWorth: z.number().default(0),
      optimizedNetWorth: z.number().default(0),
      deltaGain: z.number().default(0),
    })
  ).default([]),
  subscriptionCullList: z.array(
    z.object({
      name: z.string(),
      category: z.string().nullish().default("OTHER"),
      currentCost: z.number().nullish().default(0),
      cadence: z.string().nullish().default("MONTHLY"),
      annualSavings: z.number().default(0),
      actionType: z.string().default("CANCEL"),
      reason: z.string().default("Recurring leakage identified"),
      negotiationScript: z.string().nullish().default(""),
      severity: z.string().default("MEDIUM"),
    })
  ).default([]),
  debtAccelerationStrategy: z.object({
    recommendedStrategy: z.string().default("AVALANCHE"),
    strategyRationale: z.string().default("Prioritizing highest interest liabilities."),
    targetPriorityDebt: z.string().default("Highest APR account"),
    extraPaymentRecommendation: z.number().default(150),
    projectedInterestSavings: z.number().default(0),
    payoffMonthsSaved: z.number().nullish().default(0),
    estimatedDebtFreeDate: z.string().nullish().default(""),
  }),
  investmentStrategy: z.object({
    currentMonthlySIP: z.number().default(0),
    suggestedMonthlySIP: z.number().default(0),
    suggestedAllocations: z.array(
      z.object({
        assetType: z.string().default("Equities"),
        percentage: z.number().default(50),
        rationale: z.string().default("Long-term capital growth"),
      })
    ).default([]),
    assetDiversificationTip: z.string().default("Diversify across broad index funds and precious metals."),
    tenYearCompoundingImpact: z.number().default(0),
  }).default({
    currentMonthlySIP: 0,
    suggestedMonthlySIP: 0,
    suggestedAllocations: [],
    assetDiversificationTip: "Maintain broad market exposure",
    tenYearCompoundingImpact: 0,
  }),
  assetAllocation: z.object({
    current: z.object({
      liquidCashPct: z.number().default(10),
      equitiesAndMutualFundsPct: z.number().default(30),
      preciousMetalsPct: z.number().default(10),
      cryptoPct: z.number().default(5),
      realEstatePct: z.number().default(0),
      retirementPct: z.number().default(30),
      otherPct: z.number().default(15),
    }),
    recommended: z.object({
      liquidCashPct: z.number().default(15),
      equitiesAndMutualFundsPct: z.number().default(45),
      preciousMetalsPct: z.number().default(10),
      cryptoPct: z.number().default(5),
      realEstatePct: z.number().default(0),
      retirementPct: z.number().default(20),
      otherPct: z.number().default(5),
    }),
    rebalanceAdvice: z.string().default("Rebalance into productive compounding assets."),
  }),
  cashFlowOptimization: z.array(
    z.object({
      title: z.string(),
      impact: z.string(),
      action: z.string(),
    })
  ).default([]),
  tacticalPlan: z.array(
    z.object({
      phase: z.string().default("IMMEDIATE_7_DAYS"),
      title: z.string(),
      impact: z.string(),
      action: z.string(),
      priority: z.string().default("RECOMMENDED"),
    })
  ).default([]),
  runwayAnalysis: z.object({
    currentRunwayMonths: z.number().default(3),
    safetyEvaluation: z.string().default("HEALTHY"),
    targetEmergencyFund: z.number().default(10000),
  }),
});

const AUDIT_SYSTEM = `You are a Senior Quantitative Wealth Architect, Institutional Portfolio Strategist, and Frugal Chief Financial Officer.
Your tone is archival, direct, incisive, mathematically exact, and deeply empowering.
You analyze the user's real ledger data including cross-border multi-currency holdings (USD income/debts with INR recurring SIPs/investments converted in real-time).

Key Principles:
1. PREDATORY INTEREST: Debts with >15% APR are critical fiscal emergencies. Prioritize aggressive elimination.
2. RECURRING BURN CULLING: Subscriptions represent continuous wealth drag. Identify real cancellation and negotiation opportunities.
3. WEALTH VELOCITY: Systematic DCA / SIP investments compounding at 8-12% CAGR create massive 10-year wealth gains.
4. REAL-TIME FX CONVERSION: Accurately account for currency conversions (INR to USD) using the provided live exchange rate and date.
5. Provide realistic 10-year compounding trajectory milestones (Year 1, 3, 5, 10).`;

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId(req);

    const [subscriptions, debts, assets, incomes, investmentsResult, fxSnapshot] = await Promise.all([
      getUserSubscriptions(userId),
      getUserDebts(userId),
      getUserAssets(userId),
      getUserIncomes(userId),
      getUserInvestments(userId).catch(() => []),
      getLiveFxSnapshot(),
    ]);

    const investments = investmentsResult;
    const inrRate = fxSnapshot.inrPerUsd;

    const subMetrics = calculateSubscriptionMetrics(subscriptions);
    const invMetrics = calculateInvestmentMetrics(investments, inrRate);
    const { cashFlow, netWorth } = calculateCashFlow(
      incomes,
      subscriptions,
      debts,
      assets,
      investments,
      inrRate
    );
    const avalanche = calculateDebtPayoff(debts, "AVALANCHE", 100);
    const snowball = calculateDebtPayoff(debts, "SNOWBALL", 100);

    const prompt = `
# COMPREHENSIVE MULTI-CURRENCY FINANCIAL LEDGER & AUDIT INGESTION:
Base Ledger Currency: USD ($)
Real-Time Exchange Rate (${fxSnapshot.formattedDate}): 1 USD = ${inrRate.toFixed(2)} INR (1 INR = ${(1 / inrRate).toFixed(4)} USD)

## 1. Real-Time Cash Flow Velocity (USD Normalized):
- Gross Monthly Inflow: $${cashFlow.monthlyGrossIncome.toFixed(2)} USD
- Estimated Monthly Taxes/Withholding: -$${cashFlow.monthlyTaxWithholding.toFixed(2)} USD
- Net Monthly Take-Home: +$${cashFlow.monthlyNetTakeHome.toFixed(2)} USD
- Fixed Monthly Subscriptions Burn: -$${cashFlow.monthlySubscriptions.toFixed(2)} USD (${subMetrics.activeCount} active subscriptions)
- Fixed Monthly Debt Minimum Payments: -$${cashFlow.monthlyDebtMinimums.toFixed(2)} USD
- Recurring Wealth Investments (SIPs): -₹${invMetrics.monthlyTotal.toFixed(2)} INR / mo ($${cashFlow.monthlyRecurringInvestmentsUsd?.toFixed(2) || invMetrics.monthlyTotalUsd?.toFixed(2)} USD/mo at ₹${inrRate.toFixed(2)}/$)
- Total Fixed Outflows: -$${cashFlow.totalFixedOutflow.toFixed(2)} USD
- Free Monthly Cash Surplus: +$${cashFlow.monthlyNetSurplus.toFixed(2)} USD
- True Savings Rate: ${cashFlow.savingsRatePct}%
- Wealth Accumulation Velocity: ${cashFlow.wealthVelocityPct}%
- Liquid Emergency Cash Reserve: $${cashFlow.liquidCashTotal.toFixed(2)} USD
- Emergency Runway: ${cashFlow.runwayMonths.toFixed(1)} months

## 2. Balance Sheet & Net Worth (USD Base):
- Total Assets: $${netWorth.totalAssets.toFixed(2)} USD
  - Liquid Cash & HYSA: $${netWorth.totalLiquidCash.toFixed(2)} USD
  - Public Investments & Equities: $${netWorth.totalInvestments.toFixed(2)} USD
  - Tax-Advantaged Retirement: $${netWorth.totalRetirement.toFixed(2)} USD
  - Real Estate Equity: $${netWorth.totalRealEstate.toFixed(2)} USD
  - Crypto Holdings: $${netWorth.totalCrypto.toFixed(2)} USD
  - Other Tangible Assets: $${netWorth.totalOtherAssets.toFixed(2)} USD
- Total Debt Liabilities: $${netWorth.totalLiabilities.toFixed(2)} USD
- Total Net Worth: $${netWorth.netWorth.toFixed(2)} USD
- Debt-to-Asset Ratio: ${netWorth.debtToAssetRatioPct}%

## 3. Recurring Wealth Investments (${investments.length} Active Allocations in INR / USD):
${investments
  .map(
    (inv) =>
      `- "${inv.name}" [${inv.assetType}]: ${getCurrencySymbol(inv.currency)}${inv.amount}/${inv.cadence.toLowerCase()} on ${
        inv.platform || "Platform"
      } (Expected CAGR: ${inv.expectedReturnRate ?? 10}%, Status: ${inv.status}, Valuation: ${getCurrencySymbol(inv.currency)}${
        inv.currentValuation || 0
      })`
  )
  .join("\n") || "No recurring investments recorded."}
- Total Recurring Monthly Deployed: ₹${invMetrics.monthlyTotal.toFixed(2)} INR / mo ($${invMetrics.monthlyTotalUsd?.toFixed(2)} USD/mo)
- Weighted Average Portfolio Return (CAGR): ${invMetrics.weightedReturnRatePct}%

## 4. Itemized Subscriptions & Fixed Burn (${subscriptions.length} Services, Total: $${subMetrics.monthlyTotal.toFixed(2)}/mo):
${subscriptions
  .map(
    (s) =>
      `- "${s.name}" [${s.category}]: $${s.amount} (${s.cadence}), Status: ${s.status}${
        s.trialEndsDate ? `, Trial Ends: ${s.trialEndsDate}` : ""
      }${s.notes ? `, Notes: "${s.notes}"` : ""}`
  )
  .join("\n") || "No subscriptions recorded."}

## 5. Liabilities & Debt Accounts (${debts.length} Accounts, Total Debt: $${netWorth.totalLiabilities.toFixed(2)}):
${debts
  .map(
    (d) =>
      `- "${d.name}" [${d.debtType}]: Balance: $${d.balance}, APR: ${d.interestRate}%, Min Payment: $${d.minPayment}/mo${
        d.targetPayment ? `, Target: $${d.targetPayment}/mo` : ""
      }${d.isPaidOff ? " [PAID OFF]" : ""}`
  )
  .join("\n") || "Debt-free! Zero liabilities recorded."}

## Debt Freedom Models:
- Avalanche Route (Highest APR First): ${avalanche.monthsToPayoff} months (${avalanche.debtFreeDate}), Lifetime Interest: $${avalanche.totalInterestPaid.toFixed(2)}
- Snowball Route (Lowest Balance First): ${snowball.monthsToPayoff} months (${snowball.debtFreeDate}), Lifetime Interest: $${snowball.totalInterestPaid.toFixed(2)}

# INSTRUCTIONS:
1. Conduct a deep quantitative audit and generate a comprehensive institutional analysis.
2. Formulate 4 Pillar Scores (0-100) for Runway, Debt, Burn, and Wealth.
3. Compute exact 10-year comparative wealth trajectories (Status Quo vs Optimized at Years 1, 3, 5, and 10).
4. Provide prioritized subscription cull recommendations with copy-paste negotiation scripts.
5. Provide actionable debt knockout and systematic SIP investment scaling recommendations.
6. Deliver a 3-phase execution checklist (Immediate 7 Days, 30 Days, 90 Days).
`;

    const result = await generateObject({
      model: languageModel(AUDIT_MODEL),
      system: AUDIT_SYSTEM,
      prompt,
      schema: AuditSchema,
      providerOptions: {
        ...gatewayProviderOptions(AUDIT_MODEL, ["feature:financial-ledger-audit"]),
      },
    });

    const savedAudit = await createFinancialAudit({
      userId,
      analysis: result.object as any,
    });

    return NextResponse.json({ audit: savedAudit });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const message = gatewayErrorMessage(error);
    console.error("[audit/route] Error generating financial audit:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
