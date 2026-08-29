"use client";

import React from "react";
import {
  FinancialOverviewPayload,
} from "@/lib/ledger/types";
import { formatCurrency, formatSignedCurrency } from "@/lib/ledger/formatters";
import { playSound } from "@/lib/sound";
import {
  Sparkles,
  ArrowRight,
  TrendingUp,
  CreditCard,
  BellRing,
  Coins,
} from "lucide-react";
import { SubscriptionBreakdownChart } from "./charts/SubscriptionBreakdownChart";
import { CashFlowVelocityWaterfall } from "./charts/CashFlowVelocityWaterfall";
import { DebtAmortizationChart } from "./charts/DebtAmortizationChart";

interface LedgerOverviewProps {
  overview: FinancialOverviewPayload;
  onNavigateTab: (tab: "SUBSCRIPTIONS" | "INVESTMENTS" | "DEBTS" | "CASHFLOW" | "NETWORTH") => void;
  onAddSubscription: () => void;
  onAddDebt: () => void;
  onAddAsset: () => void;
  onOpenAudit: () => void;
}

export const LedgerOverview: React.FC<LedgerOverviewProps> = ({
  overview,
  onNavigateTab,
  onAddSubscription,
  onAddDebt,
  onAddAsset,
  onOpenAudit,
}) => {
  const { metrics, subscriptions, debts, investments = [] } = overview;
  const { subscriptionMetrics, investmentMetrics, cashFlow, netWorth, avalanchePayoff } = metrics;

  const urgentRenewals = subscriptionMetrics.upcomingRenewals.filter((r) => r.daysUntil <= 7);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* ── TOP KPI METRIC CARDS ── */}
      <div className="ledger-kpi-grid">
        {/* Net Worth */}
        <div
          className="ledger-kpi-card"
          style={{ "--kpi-accent": "var(--neo-cyan, #00F0FF)", cursor: "pointer" } as React.CSSProperties}
          onClick={() => {
            playSound.click();
            onNavigateTab("NETWORTH");
          }}
        >
          <div className="ledger-kpi-label">TOTAL NET WORTH</div>
          <div
            className="ledger-kpi-value"
            style={{ color: netWorth.netWorth >= 0 ? "var(--ink, #0A0A0A)" : "#DC2626" }}
          >
            {formatCurrency(netWorth.netWorth, 2)}
          </div>
          <div className="ledger-kpi-sub">
            {formatCurrency(netWorth.totalAssets, 0)} Assets − {formatCurrency(netWorth.totalLiabilities, 0)} Debt
          </div>
        </div>

        {/* Monthly Fixed Burn */}
        <div
          className="ledger-kpi-card"
          style={{ "--kpi-accent": "var(--neo-yellow, #FFE600)", cursor: "pointer" } as React.CSSProperties}
          onClick={() => {
            playSound.click();
            onNavigateTab("SUBSCRIPTIONS");
          }}
        >
          <div className="ledger-kpi-label">MONTHLY RECURRING BURN</div>
          <div className="ledger-kpi-value">{formatCurrency(subscriptionMetrics.monthlyTotal, 2)}</div>
          <div className="ledger-kpi-sub">
            {subscriptionMetrics.activeCount} active subscriptions ({formatCurrency(subscriptionMetrics.yearlyTotal, 0)}/yr)
          </div>
        </div>

        {/* Recurring Investments / SIPs */}
        <div
          className="ledger-kpi-card"
          style={{ "--kpi-accent": "#F59E0B", cursor: "pointer" } as React.CSSProperties}
          onClick={() => {
            playSound.click();
            onNavigateTab("INVESTMENTS");
          }}
        >
          <div className="ledger-kpi-label">MONTHLY RECURRING INVESTMENTS</div>
          <div className="ledger-kpi-value" style={{ color: "#166534" }}>
            {formatCurrency(investmentMetrics?.monthlyTotal || 0, 2)}
          </div>
          <div className="ledger-kpi-sub">
            {investments.length} SIPs/DCAs • {investmentMetrics?.weightedReturnRatePct || 8}% Avg CAGR
          </div>
        </div>

        {/* Total Debt & Horizon */}
        <div
          className="ledger-kpi-card"
          style={{ "--kpi-accent": "var(--neo-red, #EF4444)", cursor: "pointer" } as React.CSSProperties}
          onClick={() => {
            playSound.click();
            onNavigateTab("DEBTS");
          }}
        >
          <div className="ledger-kpi-label">TOTAL DEBT LIABILITIES</div>
          <div className="ledger-kpi-value">{formatCurrency(netWorth.totalLiabilities, 0)}</div>
          <div className="ledger-kpi-sub">
            {debts.filter((d) => !d.isPaidOff).length > 0
              ? `Debt-Free: ${avalanchePayoff.debtFreeDate} (${avalanchePayoff.monthsToPayoff} mos)`
              : "100% Debt-Free"}
          </div>
        </div>

        {/* Liquid Runway */}
        <div
          className="ledger-kpi-card"
          style={{ "--kpi-accent": "var(--neo-green, #10B981)", cursor: "pointer" } as React.CSSProperties}
          onClick={() => {
            playSound.click();
            onNavigateTab("CASHFLOW");
          }}
        >
          <div className="ledger-kpi-label">LIQUID EMERGENCY RUNWAY</div>
          <div className="ledger-kpi-value">{cashFlow.runwayMonths.toFixed(1)} MOS</div>
          <div className="ledger-kpi-sub">
            {formatCurrency(cashFlow.liquidCashTotal, 0)} cash ÷ {formatCurrency(cashFlow.totalFixedOutflow, 0)}/mo burn
          </div>
        </div>
      </div>

      {/* ── URGENT RENEWAL BANNER (IF ANY) ── */}
      {urgentRenewals.length > 0 && (
        <div
          style={{
            background: "#FFFBEB",
            border: "2.5px solid var(--ink, #000000)",
            boxShadow: "4px 4px 0 var(--ink, #000000)",
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
            borderRadius: "3px",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontFamily: "var(--mono)", fontSize: "11px", fontWeight: 900, color: "#92400E", marginBottom: "3px", textTransform: "uppercase" }}>
              <BellRing size={13} aria-hidden="true" />
              UPCOMING BILLING & RENEWAL ALERTS ({urgentRenewals.length})
            </div>
            <div style={{ fontFamily: "var(--sans, system-ui)", fontSize: "13.5px", fontWeight: 700, color: "#000000" }}>
              {urgentRenewals
                .map(
                  (r) =>
                    `• ${r.name} (${formatCurrency(r.amount, 2)}) renews in ${r.daysUntil} ${r.daysUntil === 1 ? "day" : "days"}`
                )
                .join("   ")}
            </div>
          </div>

          <button
            type="button"
            className="btn-ledger"
            onClick={() => {
              playSound.click();
              onNavigateTab("SUBSCRIPTIONS");
            }}
          >
            MANAGE SUBSCRIPTIONS <ArrowRight size={12} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* ── CHARTS & ANALYTICS VISUALIZATIONS ── */}
      <div style={{ display: "grid", gridTemplateColumns: overview.subscriptions.length > 0 && overview.incomes.length > 0 ? "1fr 1fr" : "1fr", gap: "20px" }}>
        {overview.subscriptions.length > 0 && (
          <SubscriptionBreakdownChart
            subscriptions={overview.subscriptions}
            onSelectCategory={() => onNavigateTab("SUBSCRIPTIONS")}
          />
        )}
        {overview.incomes.length > 0 && (
          <CashFlowVelocityWaterfall
            cashFlow={overview.metrics.cashFlow}
            incomes={overview.incomes}
          />
        )}
      </div>

      {/* ── TWO-COLUMN OVERVIEW PANELS ── */}
      <div className="cashflow-dashboard">
        {/* Left: Debt Payoff Horizon */}
        <div className="cashflow-box">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
              <CreditCard size={18} aria-hidden="true" />
              DEBT FREEDOM ACCELERATOR
            </h3>
            <button
              type="button"
              className="btn-ledger"
              style={{ fontSize: "10px", padding: "5px 10px" }}
              onClick={() => {
                playSound.click();
                onNavigateTab("DEBTS");
              }}
            >
              SIMULATE <ArrowRight size={10} aria-hidden="true" />
            </button>
          </div>

          {debts.length === 0 ? (
            <div style={{ padding: "20px 0", textAlign: "center", fontFamily: "var(--mono)", fontSize: "12px", color: "#555555" }}>
              🎉 Zero active debt liabilities recorded!
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: "11.5px", fontWeight: 800, color: "#555555" }}>
                  Avalanche Route (Highest APR First)
                </span>
                <span style={{ fontFamily: "var(--display)", fontSize: "22px", fontWeight: 900, color: "var(--ink, #000000)" }}>
                  {avalanchePayoff.debtFreeDate}
                </span>
              </div>

              <div
                style={{
                  background: "#DCFCE7",
                  border: "2px solid var(--ink, #000000)",
                  boxShadow: "2px 2px 0 var(--ink, #000000)",
                  padding: "10px 12px",
                  fontFamily: "var(--mono)",
                  fontSize: "11px",
                  lineHeight: 1.4,
                  marginBottom: "12px",
                  color: "#14532D",
                  borderRadius: "2px",
                }}
              >
                Applying extra cash saves <b>{formatCurrency(avalanchePayoff.interestSavedVsMinimums, 0)}</b> in predatory interest and cuts <b>{avalanchePayoff.monthsSavedVsMinimums} months</b> of payments.
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {debts.slice(0, 3).map((d) => (
                  <div key={d.id} className="cashflow-row">
                    <span>
                      <b>{d.name}</b> ({d.interestRate}% APR)
                    </span>
                    <span style={{ fontWeight: 900 }}>{formatCurrency(d.balance, 0)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Cash Flow Velocity */}
        <div className="cashflow-box">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
              <TrendingUp size={18} aria-hidden="true" />
              CASH FLOW VELOCITY
            </h3>
            <button
              type="button"
              className="btn-ledger"
              style={{ fontSize: "10px", padding: "5px 10px" }}
              onClick={() => {
                playSound.click();
                onNavigateTab("CASHFLOW");
              }}
            >
              DETAILS <ArrowRight size={10} aria-hidden="true" />
            </button>
          </div>

          <div className="cashflow-row">
            <span>Gross Monthly Inflow</span>
            <span style={{ fontWeight: 900, color: "#16A34A" }}>
              {formatSignedCurrency(cashFlow.monthlyGrossIncome, 2)}
            </span>
          </div>
          <div className="cashflow-row">
            <span>Fixed Monthly Subscriptions</span>
            <span style={{ color: "#DC2626", fontWeight: 800 }}>
              {formatCurrency(-cashFlow.monthlySubscriptions, 2)}
            </span>
          </div>
          <div className="cashflow-row">
            <span>Debt Minimum Payments</span>
            <span style={{ color: "#DC2626", fontWeight: 800 }}>
              {formatCurrency(-cashFlow.monthlyDebtMinimums, 2)}
            </span>
          </div>
          {cashFlow.monthlyRecurringInvestments > 0 && (
            <div className="cashflow-row">
              <span>Recurring Wealth Investments (SIPs)</span>
              <span style={{ color: "#0284C7", fontWeight: 800 }}>
                {formatCurrency(-cashFlow.monthlyRecurringInvestments, 2)}
              </span>
            </div>
          )}
          <div className="cashflow-row" style={{ borderTop: "2px solid var(--ink, #000000)", paddingTop: "10px" }}>
            <span style={{ fontWeight: 900 }}>Free Monthly Surplus</span>
            <span
              style={{
                fontFamily: "var(--display)",
                fontSize: "20px",
                fontWeight: 900,
                color: cashFlow.monthlyNetSurplus >= 0 ? "#16A34A" : "#DC2626",
              }}
            >
              {formatSignedCurrency(cashFlow.monthlyNetSurplus, 2)}
            </span>
          </div>
        </div>
      </div>

      {/* ── AI AUDIT PROMPT BANNER ── */}
      <div
        style={{
          background: "var(--card, #FFFFFF)",
          border: "2.5px solid var(--ink, #000000)",
          boxShadow: "5px 5px 0 var(--ink, #000000)",
          padding: "22px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
          borderRadius: "4px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <Sparkles size={18} aria-hidden="true" />
            <span style={{ fontFamily: "var(--display)", fontSize: "20px", fontWeight: 900 }}>
              AI FINANCIAL SCRIBE & AUDITOR
            </span>
            <span className="ledger-tagline-badge">GEMINI 3.5</span>
          </div>
          <div style={{ fontFamily: "var(--mono)", fontSize: "12px", color: "#444444" }}>
            Let Gemini analyze your subscriptions, debt APRs, and cash flow to generate a prioritized cull list and debt elimination plan.
          </div>
        </div>

        <button type="button" className="btn-ledger btn-ledger-ai" onClick={onOpenAudit}>
          <Sparkles size={13} aria-hidden="true" />
          RUN LEDGER AUDIT
        </button>
      </div>
    </div>
  );
};
