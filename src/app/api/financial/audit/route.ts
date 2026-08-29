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
  createFinancialAudit,
} from "@/lib/dal/ledger";
import { calculateSubscriptionMetrics } from "@/lib/ledger/subscriptionMetrics";
import { calculateCashFlow } from "@/lib/ledger/cashFlow";
import { calculateDebtPayoff } from "@/lib/ledger/debtPayoff";

const AUDIT_MODEL = "google/gemini-3.5-flash";

const AuditSchema = z.object({
  healthScore: z.number().min(0).max(100).describe("Overall financial health score from 0 to 100"),
  summaryVerdict: z.string().describe("Sharp, 2-3 sentence executive summary of current financial velocity, risk exposure, and momentum"),
  subscriptionCullList: z.array(
    z.object({
      name: z.string(),
      annualSavings: z.number().describe("Estimated annual dollar savings if eliminated"),
      reason: z.string().describe("Specific rationale for culling or negotiating this recurring charge"),
      severity: z.enum(["HIGH", "MEDIUM", "LOW"]),
    })
  ).describe("Prioritized list of subscriptions to cancel, pause, or renegotiate"),
  debtAccelerationStrategy: z.object({
    recommendedStrategy: z.enum(["AVALANCHE", "SNOWBALL"]),
    strategyRationale: z.string().describe("Mathematical or psychological justification for the chosen strategy"),
    targetPriorityDebt: z.string().describe("The exact name of the specific debt account that should receive all surplus acceleration payments first"),
    extraPaymentRecommendation: z.number().describe("Recommended additional monthly payment toward the priority debt in dollars"),
    projectedInterestSavings: z.number().describe("Projected total interest savings if the recommendation is followed"),
  }),
  cashFlowOptimization: z.array(
    z.object({
      title: z.string(),
      impact: z.string().describe("Quantified impact (e.g. '+$150/mo', 'Adds 2.4 months runway')"),
      action: z.string().describe("Concrete, actionable step to execute"),
    })
  ).describe("Top 2-4 tactical moves to optimize cash flow and savings rate"),
  runwayAnalysis: z.object({
    currentRunwayMonths: z.number(),
    safetyEvaluation: z.enum(["CRITICAL", "LEAN", "HEALTHY", "FORTRESS"]),
    targetEmergencyFund: z.number().describe("Recommended emergency fund target in dollars based on fixed monthly burn"),
  }),
});

const AUDIT_SYSTEM = `You are a world-class fee-only personal financial strategist, frugal engineer, and mathematical wealth advisor.
Your tone is archival, direct, incisive, non-judgmental, and mathematically precise.
Analyze the user's complete financial balance sheet, recurring subscriptions, high-interest liabilities, cash flow, and liquid runway.
Deliver an uncompromising, high-impact tactical audit to maximize their financial freedom, eliminate predatory interest, and optimize recurring burn.`;

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId(req);

    const [subscriptions, debts, assets, incomes] = await Promise.all([
      getUserSubscriptions(userId),
      getUserDebts(userId),
      getUserAssets(userId),
      getUserIncomes(userId),
    ]);

    const subMetrics = calculateSubscriptionMetrics(subscriptions);
    const { cashFlow, netWorth } = calculateCashFlow(incomes, subscriptions, debts, assets);
    const avalanche = calculateDebtPayoff(debts, "AVALANCHE", 100);
    const snowball = calculateDebtPayoff(debts, "SNOWBALL", 100);

    const prompt = `
# Financial Profile for Audit:

## 1. Cash Flow & Burn:
- Gross Monthly Income: $${cashFlow.monthlyGrossIncome.toFixed(2)}
- Fixed Monthly Subscriptions: $${cashFlow.monthlySubscriptions.toFixed(2)}
- Fixed Monthly Debt Minimum Payments: $${cashFlow.monthlyDebtMinimums.toFixed(2)}
- Total Fixed Outflow: $${cashFlow.totalFixedOutflow.toFixed(2)}
- Net Monthly Surplus: $${cashFlow.monthlyNetSurplus.toFixed(2)}
- Savings Rate: ${cashFlow.savingsRatePct}%
- Liquid Emergency Cash: $${cashFlow.liquidCashTotal.toFixed(2)}
- Liquid Runway: ${cashFlow.runwayMonths.toFixed(1)} months

## 2. Net Worth Balance Sheet:
- Total Assets: $${netWorth.totalAssets.toFixed(2)} (Liquid: $${netWorth.totalLiquidCash.toFixed(2)}, Invested: $${netWorth.totalInvestments.toFixed(2)}, Retirement: $${netWorth.totalRetirement.toFixed(2)})
- Total Debt/Liabilities: $${netWorth.totalLiabilities.toFixed(2)}
- Net Worth: $${netWorth.netWorth.toFixed(2)}
- Debt-to-Asset Ratio: ${netWorth.debtToAssetRatioPct}%

## 3. Subscriptions (${subscriptions.length} items, Total Burn: $${subMetrics.monthlyTotal.toFixed(2)}/mo or $${subMetrics.yearlyTotal.toFixed(2)}/yr):
${subscriptions
  .map(
    (s) =>
      `- "${s.name}": $${s.amount} (${s.cadence}), Category: ${s.category}, Status: ${s.status}${
        s.trialEndsDate ? ` (Trial ends: ${s.trialEndsDate})` : ""
      }`
  )
  .join("\n") || "No subscriptions recorded."}

## 4. Debts & Loans (${debts.length} accounts, Total Balance: $${netWorth.totalLiabilities.toFixed(2)}):
${debts
  .map(
    (d) =>
      `- "${d.name}" (${d.debtType}): Balance: $${d.balance}, APR: ${d.interestRate}%, Min Payment: $${d.minPayment}/mo${
        d.isPaidOff ? " [PAID OFF]" : ""
      }`
  )
  .join("\n") || "No debts recorded (Debt-free!)."}

## Payoff Projections:
- Avalanche (Highest APR first): ${avalanche.monthsToPayoff} months, Total Interest: $${avalanche.totalInterestPaid.toFixed(2)}
- Snowball (Lowest Balance first): ${snowball.monthsToPayoff} months, Total Interest: $${snowball.totalInterestPaid.toFixed(2)}

Perform a comprehensive, incisive audit. Provide concrete recommendations.
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
    console.error("Error generating financial audit:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
