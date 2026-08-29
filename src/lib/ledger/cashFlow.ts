import {
  FinancialIncomeRow,
  FinancialSubscriptionRow,
  FinancialDebtRow,
  FinancialAssetRow,
  IncomeCadence,
  CashFlowSummary,
  NetWorthSummary,
} from "./types";
import { calculateSubscriptionMetrics } from "./subscriptionMetrics";
import { calculateIncomeTax } from "./taxCalculator";

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
  assets: FinancialAssetRow[]
): {
  cashFlow: CashFlowSummary;
  netWorth: NetWorthSummary;
} {
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

    monthlyGrossIncome += taxRes.grossMonthly;
    monthlyTaxWithholding += taxRes.totalTaxMonthly;
    monthlyNetTakeHome += taxRes.netMonthlyIncome;
  }

  // 2. Fixed Outflows
  const subscriptionMetrics = calculateSubscriptionMetrics(subscriptions);
  const monthlySubscriptions = subscriptionMetrics.monthlyTotal;

  const monthlyDebtMinimums = debts
    .filter((d) => !d.isPaidOff && d.balance > 0)
    .reduce((sum, d) => sum + d.minPayment, 0);

  const totalFixedOutflow = monthlySubscriptions + monthlyDebtMinimums;
  const effectiveInflow = monthlyNetTakeHome > 0 ? monthlyNetTakeHome : monthlyGrossIncome;
  const monthlyNetSurplus = effectiveInflow - totalFixedOutflow;
  const savingsRatePct =
    effectiveInflow > 0 ? Math.round((monthlyNetSurplus / effectiveInflow) * 1000) / 10 : 0;

  // 3. Assets breakdown
  let totalLiquidCash = 0;
  let totalInvestments = 0;
  let totalRetirement = 0;
  let totalRealEstate = 0;
  let totalCrypto = 0;
  let totalOtherAssets = 0;

  for (const asset of assets) {
    const val = asset.value || 0;
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

  // 4. Liabilities
  const totalLiabilities = debts
    .filter((d) => !d.isPaidOff && d.balance > 0)
    .reduce((sum, d) => sum + d.balance, 0);

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
      totalFixedOutflow: Math.round(totalFixedOutflow * 100) / 100,
      monthlyNetSurplus: Math.round(monthlyNetSurplus * 100) / 100,
      savingsRatePct,
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
