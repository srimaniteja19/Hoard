import {
  FinancialIncomeRow,
  FinancialSubscriptionRow,
  FinancialDebtRow,
  FinancialAssetRow,
  FinancialInvestmentRow,
  IncomeCadence,
  CashFlowSummary,
  NetWorthSummary,
} from "./types";
import { calculateSubscriptionMetrics } from "./subscriptionMetrics";
import { calculateInvestmentMetrics } from "./investmentMetrics";
import { calculateIncomeTax } from "./taxCalculator";
import { convertToUsd, getFxSnapshotSync } from "./fx";
import { getAssetCurrency } from "./formatters";

export function normalizeIncomeToMonthly(amount: number, cadence: IncomeCadence): number {
  if (!amount || isNaN(amount) || amount <= 0) return 0;
  switch (cadence) {
    case "WEEKLY":
      return (amount * 52) / 12;
    case "BIWEEKLY":
      return (amount * 26) / 12;
    case "SEMI_MONTHLY":
      return amount * 2;
    case "MONTHLY":
      return amount;
    case "ANNUAL":
      return amount / 12;
    default:
      return amount;
  }
}

export function calculateCashFlow(
  incomes: FinancialIncomeRow[],
  subscriptions: FinancialSubscriptionRow[],
  debts: FinancialDebtRow[],
  assets: FinancialAssetRow[],
  investments: FinancialInvestmentRow[] = [],
  customFxInrRate?: number
): {
  cashFlow: CashFlowSummary;
  netWorth: NetWorthSummary;
} {
  const fx = getFxSnapshotSync();
  const effectiveInrRate = customFxInrRate && customFxInrRate > 0 ? customFxInrRate : fx.inrPerUsd;

  // 1. Incomes & Automated Tax Jurisdiction Withholding
  let monthlyGrossIncome = 0;
  let monthlyTaxWithholding = 0;
  let monthlyNetTakeHome = 0;

  const activeIncomes = incomes.filter((i) => i.isActive);

  for (const inc of activeIncomes) {
    const taxRes = calculateIncomeTax({
      amount: inc.amount,
      cadence: inc.cadence as IncomeCadence,
      isPreTax: inc.isPreTax,
      country: inc.country,
      region: inc.region,
      customTaxRate: inc.customTaxRate,
    });

    const incCurrency = (inc as any).currency || "USD";
    const grossUsd = convertToUsd(taxRes.grossMonthly, incCurrency, effectiveInrRate);
    const taxUsd = convertToUsd(taxRes.totalTaxMonthly, incCurrency, effectiveInrRate);
    const netUsd = convertToUsd(taxRes.netMonthlyIncome, incCurrency, effectiveInrRate);

    monthlyGrossIncome += grossUsd;
    monthlyTaxWithholding += taxUsd;
    monthlyNetTakeHome += netUsd;
  }

  // 2. Fixed Outflows & Wealth Building Inflow/Outflows
  const subscriptionMetrics = calculateSubscriptionMetrics(subscriptions);
  const monthlySubscriptions = subscriptionMetrics.monthlyTotal;

  const investmentMetrics = calculateInvestmentMetrics(investments, effectiveInrRate);
  const monthlyRecurringInvestmentsNative = investmentMetrics.monthlyTotal;
  const monthlyRecurringInvestmentsUsd =
    investmentMetrics.monthlyTotalUsd ||
    convertToUsd(monthlyRecurringInvestmentsNative, investmentMetrics.currency || "INR", effectiveInrRate);

  const monthlyDebtMinimums = debts
    .filter((d) => !d.isPaidOff && d.balance > 0)
    .reduce((sum, d) => sum + convertToUsd(d.minPayment, (d as any).currency, effectiveInrRate), 0);

  const totalFixedOutflow = monthlySubscriptions + monthlyDebtMinimums;
  const effectiveInflow = monthlyNetTakeHome > 0 ? monthlyNetTakeHome : monthlyGrossIncome;
  const monthlyNetSurplus = effectiveInflow - totalFixedOutflow - monthlyRecurringInvestmentsUsd;

  // Wealth Velocity = (Monthly Investments (USD) + Net Cash Surplus (USD)) / Effective Inflow
  const wealthVelocityPct =
    effectiveInflow > 0
      ? Math.round(((monthlyRecurringInvestmentsUsd + Math.max(0, monthlyNetSurplus)) / effectiveInflow) * 1000) / 10
      : 0;

  const savingsRatePct =
    effectiveInflow > 0 ? Math.round((monthlyNetSurplus / effectiveInflow) * 1000) / 10 : 0;

  // 3. Assets breakdown (all converted to USD base)
  let totalLiquidCash = 0;
  let totalInvestments = 0;
  let totalRetirement = 0;
  let totalRealEstate = 0;
  let totalCrypto = 0;
  let totalOtherAssets = 0;

  for (const asset of assets) {
    const rawVal = asset.value || 0;
    const assetCurrency = getAssetCurrency(asset, "USD");
    const val = convertToUsd(rawVal, assetCurrency, effectiveInrRate);
    switch (asset.category) {
      case "CASH_CHECKING":
      case "HYSA":
        totalLiquidCash += val;
        break;
      case "INVESTMENT":
        totalInvestments += val;
        break;
      case "RETIREMENT":
        totalRetirement += val;
        break;
      case "REAL_ESTATE":
        totalRealEstate += val;
        break;
      case "CRYPTO":
        totalCrypto += val;
        break;
      default:
        totalOtherAssets += val;
        break;
    }
  }

  const totalAssets =
    totalLiquidCash +
    totalInvestments +
    totalRetirement +
    totalRealEstate +
    totalCrypto +
    totalOtherAssets;

  // 4. Liabilities (all converted to USD base)
  const totalLiabilities = debts
    .filter((d) => !d.isPaidOff && d.balance > 0)
    .reduce((sum, d) => sum + convertToUsd(d.balance, (d as any).currency, effectiveInrRate), 0);

  const netWorth = totalAssets - totalLiabilities;
  const debtToAssetRatioPct =
    totalAssets > 0 ? Math.round((totalLiabilities / totalAssets) * 1000) / 10 : 0;

  // 5. Emergency Runway
  let runwayMonths = 0;
  if (totalFixedOutflow > 0) {
    runwayMonths = Math.round((totalLiquidCash / totalFixedOutflow) * 10) / 10;
  } else if (totalLiquidCash > 0) {
    runwayMonths = 99.9;
  }

  return {
    cashFlow: {
      monthlyGrossIncome: Math.round(monthlyGrossIncome * 100) / 100,
      monthlyTaxWithholding: Math.round(monthlyTaxWithholding * 100) / 100,
      monthlyNetTakeHome: Math.round(monthlyNetTakeHome * 100) / 100,
      monthlySubscriptions: Math.round(monthlySubscriptions * 100) / 100,
      monthlyDebtMinimums: Math.round(monthlyDebtMinimums * 100) / 100,
      monthlyRecurringInvestments: monthlyRecurringInvestmentsNative,
      monthlyRecurringInvestmentsUsd: Math.round(monthlyRecurringInvestmentsUsd * 100) / 100,
      investmentCurrency: investmentMetrics.currency || "INR",
      fxRateInrPerUsd: effectiveInrRate,
      fxRateDate: fx.date,
      totalFixedOutflow: Math.round(totalFixedOutflow * 100) / 100,
      monthlyNetSurplus: Math.round(monthlyNetSurplus * 100) / 100,
      savingsRatePct,
      wealthVelocityPct,
      liquidCashTotal: Math.round(totalLiquidCash * 100) / 100,
      runwayMonths,
    },
    netWorth: {
      totalAssets: Math.round(totalAssets * 100) / 100,
      totalLiquidCash: Math.round(totalLiquidCash * 100) / 100,
      totalInvestments: Math.round(totalInvestments * 100) / 100,
      totalRetirement: Math.round(totalRetirement * 100) / 100,
      totalRealEstate: Math.round(totalRealEstate * 100) / 100,
      totalCrypto: Math.round(totalCrypto * 100) / 100,
      totalOtherAssets: Math.round(totalOtherAssets * 100) / 100,
      totalLiabilities: Math.round(totalLiabilities * 100) / 100,
      netWorth: Math.round(netWorth * 100) / 100,
      debtToAssetRatioPct,
    },
  };
}
