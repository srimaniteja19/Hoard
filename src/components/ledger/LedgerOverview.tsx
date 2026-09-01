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
  Flame,
  Zap,
  Receipt,
} from "lucide-react";
import { SubscriptionBreakdownChart } from "./charts/SubscriptionBreakdownChart";
import { CashFlowVelocityWaterfall } from "./charts/CashFlowVelocityWaterfall";
import { DebtAmortizationChart } from "./charts/DebtAmortizationChart";
import { MarketTickerTape } from "./MarketTickerTape";

interface LedgerOverviewProps {
  overview: FinancialOverviewPayload;
  onNavigateTab: (tab: "SUBSCRIPTIONS" | "INVESTMENTS" | "DEBTS" | "CASHFLOW" | "NETWORTH") => void;
  onAddSubscription: () => void;
  onAddDebt: () => void;
  onAddAsset: () => void;
  onOpenAudit: () => void;
  onOpenFireWarRoom: () => void;
  onOpenSurplusSweeper: () => void;
  onOpenReceipt: () => void;
  onOpenMarketOracle: () => void;
  currency?: string;
  investmentCurrency?: string;
}

export const LedgerOverview: React.FC<LedgerOverviewProps> = ({
  overview,
  onNavigateTab,
  onAddSubscription,
  onAddDebt,
  onAddAsset,
  onOpenAudit,
  onOpenFireWarRoom,
  onOpenSurplusSweeper,
  onOpenReceipt,
  onOpenMarketOracle,
  currency = "USD",
  investmentCurrency = "INR",
}) => {
  const { metrics, subscriptions, debts, investments = [] } = overview;
  const { subscriptionMetrics, investmentMetrics, cashFlow, netWorth, avalanchePayoff } = metrics;

  const urgentRenewals = subscriptionMetrics.upcomingRenewals.filter((r) => r.daysUntil <= 7);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* ── REAL-TIME MARKET TICKER TAPE ── */}
      <MarketTickerTape onOpenOracle={onOpenMarketOracle} />

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
            {formatCurrency(netWorth.netWorth, 2, currency)}
          </div>
          <div className="ledger-kpi-sub">
            {formatCurrency(netWorth.totalAssets, 0, currency)} Assets − {formatCurrency(netWorth.totalLiabilities, 0, currency)} Debt
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
          <div className="ledger-kpi-value">{formatCurrency(subscriptionMetrics.monthlyTotal, 2, currency)}</div>
          <div className="ledger-kpi-sub">
            {subscriptionMetrics.activeCount} active subscriptions ({formatCurrency(subscriptionMetrics.yearlyTotal, 0, currency)}/yr)
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
            {formatCurrency(investmentMetrics?.monthlyTotal || 0, 2, investmentCurrency)}
          </div>
          <div className="ledger-kpi-sub">
            {investmentMetrics?.monthlyTotalUsd && investmentCurrency !== "USD"
              ? `~${formatCurrency(investmentMetrics.monthlyTotalUsd, 0, "USD")}/mo • `
              : ""}
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
          <div className="ledger-kpi-value">{formatCurrency(netWorth.totalLiabilities, 0, currency)}</div>
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
            {formatCurrency(cashFlow.liquidCashTotal, 0, currency)} cash ÷ {formatCurrency(cashFlow.totalFixedOutflow, 0, currency)}/mo burn
          </div>
        </div>
      </div>

      {/* ── URGENT RENEWAL BANNER (IF ANY) ── */}
      {urgentRenewals.length > 0 && (
        <div
          style={{
            background: "#FFF1F2",
            border: "2px solid #E11D48",
            boxShadow: "3px 3px 0 #E11D48",
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
            borderRadius: "3px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <BellRing size={20} color="#E11D48" aria-hidden="true" />
            <div>
              <div style={{ fontFamily: "var(--mono)", fontSize: "10.5px", fontWeight: 900, color: "#9F1239" }}>
                UPCOMING RENEWALS WITHIN 7 DAYS ({urgentRenewals.length})
              </div>
              <div style={{ fontFamily: "var(--sans)", fontSize: "13px", fontWeight: 700, color: "#881337" }}>
                {urgentRenewals.map((r) => `${r.name} (${formatCurrency(r.amount, 2, currency)} in ${r.daysUntil}d)`).join(" • ")}
              </div>
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

      {/* ── CHARTS & ANALYTICS VISUALIZATIONS ──
          A hard "1fr 1fr" here (as opposed to every other grid on this page)
          squeezed both charts to ~half a phone's width with no floor —
          auto-fit/minmax lets it collapse to one column when there's no
          room for two legible charts side by side. */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            overview.subscriptions.length > 0 && overview.incomes.length > 0
              ? "repeat(auto-fit, minmax(320px, 1fr))"
              : "1fr",
          gap: "20px",
        }}
      >
        {overview.subscriptions.length > 0 && (
          <SubscriptionBreakdownChart
            subscriptions={overview.subscriptions}
            onSelectCategory={() => onNavigateTab("SUBSCRIPTIONS")}
            currency={currency}
          />
        )}
        {overview.incomes.length > 0 && (
          <CashFlowVelocityWaterfall
            cashFlow={overview.metrics.cashFlow}
            incomes={overview.incomes}
            currency={currency}
          />
        )}
      </div>

      {/* ── TWO-COLUMN OVERVIEW PANELS ── */}
      <div className="cashflow-dashboard">
        {/* Left: Debt Payoff Horizon */}
        <div className="cashflow-box">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", rowGap: "8px", marginBottom: "14px" }}>
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
                Applying extra cash saves <b>{formatCurrency(avalanchePayoff.interestSavedVsMinimums, 0, currency)}</b> in predatory interest and cuts <b>{avalanchePayoff.monthsSavedVsMinimums} months</b> of payments.
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {debts.slice(0, 3).map((d) => (
                  <div key={d.id} className="cashflow-row">
                    <span>
                      <b>{d.name}</b> ({d.interestRate}% APR)
                    </span>
                    <span style={{ fontWeight: 900 }}>{formatCurrency(d.balance, 0, currency)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Cash Flow Velocity */}
        <div className="cashflow-box">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", rowGap: "8px", marginBottom: "14px" }}>
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
              {formatSignedCurrency(cashFlow.monthlyGrossIncome, 2, currency)}
            </span>
          </div>
          <div className="cashflow-row">
            <span>Fixed Monthly Subscriptions</span>
            <span style={{ color: "#DC2626", fontWeight: 800 }}>
              {formatCurrency(-cashFlow.monthlySubscriptions, 2, currency)}
            </span>
          </div>
          <div className="cashflow-row">
            <span>Debt Minimum Payments</span>
            <span style={{ color: "#DC2626", fontWeight: 800 }}>
              {formatCurrency(-cashFlow.monthlyDebtMinimums, 2, currency)}
            </span>
          </div>
          {cashFlow.monthlyRecurringInvestments > 0 && (
            <div className="cashflow-row">
              <span>Recurring Wealth Investments (SIPs)</span>
              <span style={{ color: "#0284C7", fontWeight: 800 }}>
                {formatCurrency(-cashFlow.monthlyRecurringInvestments, 2, investmentCurrency)}
                {cashFlow.monthlyRecurringInvestmentsUsd && (
                  <span style={{ fontFamily: "var(--mono)", fontSize: "10.5px", color: "#555555", marginLeft: "5px" }}>
                    ({formatCurrency(-cashFlow.monthlyRecurringInvestmentsUsd, 2, "USD")})
                  </span>
                )}
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
              {formatSignedCurrency(cashFlow.monthlyNetSurplus, 2, currency)}
            </span>
          </div>
        </div>
      </div>

      {/* ── INSTITUTIONAL WEALTH TOOLS & SIMULATORS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "12px" }}>
        {/* Card 1: FIRE Freedom Clock */}
        <div
          onClick={() => {
            playSound.click();
            onOpenFireWarRoom();
          }}
          style={{
            background: "var(--card, #FFFFFF)",
            border: "2px solid var(--ink, #0A0A0A)",
            boxShadow: "3.5px 3.5px 0 var(--ink, #0A0A0A)",
            padding: "16px 18px",
            borderRadius: "3px",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: "10px",
            transition: "transform 0.1s ease",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: "10px", fontWeight: 900, color: "#FF6B00", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "4px" }}>
              <Flame size={12} color="#FF6B00" />
              FREEDOM CLOCK
            </span>
            <span style={{ fontFamily: "var(--mono)", fontSize: "9px", fontWeight: 900, background: "#FFEDD5", color: "#C2410C", padding: "1px 5px", borderRadius: "2px" }}>
              WAR ROOM
            </span>
          </div>
          <div>
            <div style={{ fontFamily: "var(--display)", fontSize: "18px", fontWeight: 900 }}>
              FIRE Retirement Simulator
            </div>
            <div style={{ fontFamily: "var(--mono)", fontSize: "11px", color: "#555555", marginTop: "2px" }}>
              Model what-if SIP boosts &amp; calculate exact years of life reclaimed.
            </div>
          </div>
          <div style={{ fontFamily: "var(--mono)", fontSize: "10.5px", fontWeight: 800, color: "#FF6B00", display: "flex", alignItems: "center", gap: "4px" }}>
            LAUNCH SIMULATOR <ArrowRight size={11} />
          </div>
        </div>

        {/* Card 2: Surplus Sweeper */}
        <div
          onClick={() => {
            playSound.click();
            onOpenSurplusSweeper();
          }}
          style={{
            background: "var(--card, #FFFFFF)",
            border: "2px solid var(--ink, #0A0A0A)",
            boxShadow: "3.5px 3.5px 0 var(--ink, #0A0A0A)",
            padding: "16px 18px",
            borderRadius: "3px",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: "10px",
            transition: "transform 0.1s ease",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: "10px", fontWeight: 900, color: "#0284C7", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "4px" }}>
              <Zap size={12} color="#0284C7" />
              CAPITAL DEPLOYMENT
            </span>
            <span style={{ fontFamily: "var(--mono)", fontSize: "9px", fontWeight: 900, background: "#E0F2FE", color: "#0369A1", padding: "1px 5px", borderRadius: "2px" }}>
              +{formatCurrency(cashFlow.monthlyNetSurplus, 0, currency)}/MO
            </span>
          </div>
          <div>
            <div style={{ fontFamily: "var(--display)", fontSize: "18px", fontWeight: 900 }}>
              Monthly Surplus Sweeper
            </div>
            <div style={{ fontFamily: "var(--mono)", fontSize: "11px", color: "#555555", marginTop: "2px" }}>
              Auto-distribute free cash into Equities, Gold, HYSA, &amp; Debt payoff.
            </div>
          </div>
          <div style={{ fontFamily: "var(--mono)", fontSize: "10.5px", fontWeight: 800, color: "#0284C7", display: "flex", alignItems: "center", gap: "4px" }}>
            DEPLOY ALLOCATIONS <ArrowRight size={11} />
          </div>
        </div>

        {/* Card 3: Thermal Receipt Export */}
        <div
          onClick={() => {
            playSound.click();
            onOpenReceipt();
          }}
          style={{
            background: "var(--card, #FFFFFF)",
            border: "2px solid var(--ink, #0A0A0A)",
            boxShadow: "3.5px 3.5px 0 var(--ink, #0A0A0A)",
            padding: "16px 18px",
            borderRadius: "3px",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: "10px",
            transition: "transform 0.1s ease",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: "10px", fontWeight: 900, color: "#15803D", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "4px" }}>
              <Receipt size={12} color="#15803D" />
              ARCHIVAL VOUCHER
            </span>
            <span style={{ fontFamily: "var(--mono)", fontSize: "9px", fontWeight: 900, background: "#DCFCE7", color: "#166534", padding: "1px 5px", borderRadius: "2px" }}>
              PNG / PRINT
            </span>
          </div>
          <div>
            <div style={{ fontFamily: "var(--display)", fontSize: "18px", fontWeight: 900 }}>
              Dover St Thermal Receipt
            </div>
            <div style={{ fontFamily: "var(--mono)", fontSize: "11px", color: "#555555", marginTop: "2px" }}>
              Export high-fashion monospace balance sheet receipt with live FX stamp.
            </div>
          </div>
          <div style={{ fontFamily: "var(--mono)", fontSize: "10.5px", fontWeight: 800, color: "#15803D", display: "flex", alignItems: "center", gap: "4px" }}>
            GENERATE RECEIPT <ArrowRight size={11} />
          </div>
        </div>

        {/* Card 4: Live Market Oracle */}
        <div
          onClick={() => {
            playSound.click();
            onOpenMarketOracle();
          }}
          style={{
            background: "var(--card, #FFFFFF)",
            border: "2px solid var(--ink, #0A0A0A)",
            boxShadow: "3.5px 3.5px 0 var(--ink, #0A0A0A)",
            padding: "16px 18px",
            borderRadius: "3px",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: "10px",
            transition: "transform 0.1s ease",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: "10px", fontWeight: 900, color: "#7C3AED", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "4px" }}>
              <Coins size={12} color="#7C3AED" />
              SPOT ORACLE
            </span>
            <span style={{ fontFamily: "var(--mono)", fontSize: "9px", fontWeight: 900, background: "#F3E8FF", color: "#6B21A8", padding: "1px 5px", borderRadius: "2px" }}>
              CRYPTO · METALS · STOCKS
            </span>
          </div>
          <div>
            <div style={{ fontFamily: "var(--display)", fontSize: "18px", fontWeight: 900 }}>
              Live Market Oracle
            </div>
            <div style={{ fontFamily: "var(--mono)", fontSize: "11px", color: "#555555", marginTop: "2px" }}>
              24K Gold, Silver, Top 5 Cryptos, &amp; mutual funds in USD &amp; INR.
            </div>
          </div>
          <div style={{ fontFamily: "var(--mono)", fontSize: "10.5px", fontWeight: 800, color: "#7C3AED", display: "flex", alignItems: "center", gap: "4px" }}>
            OPEN TERMINAL <ArrowRight size={11} />
          </div>
        </div>
      </div>

      {/* ── AI AUDIT PROMPT BANNER ── */}
      <div
        style={{
          background: overview.latestAudit ? "#0A0A0A" : "var(--card, #FFFFFF)",
          color: overview.latestAudit ? "#FFFFFF" : "var(--ink, #000000)",
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
            <Sparkles size={18} color="#FFE600" aria-hidden="true" />
            <span style={{ fontFamily: "var(--display)", fontSize: "20px", fontWeight: 900 }}>
              AI FINANCIAL SCRIBE &amp; INSTITUTIONAL AUDITOR
            </span>
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: "10px",
                fontWeight: 900,
                background: "#FFE600",
                color: "#0A0A0A",
                padding: "2px 6px",
                borderRadius: "2px",
              }}
            >
              GEMINI 3.5 QUANT
            </span>
          </div>
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: "12px",
              color: overview.latestAudit ? "#D1D5DB" : "#444444",
            }}
          >
            {overview.latestAudit ? (
              <span>
                Latest Health Score: <b style={{ color: "#FFE600" }}>{(overview.latestAudit.analysis as any)?.healthScore || 80}/100</b> •{" "}
                {(overview.latestAudit.analysis as any)?.subscriptionCullList?.length || 0} subscription leaks flagged •{" "}
                10-yr wealth trajectory modeled
              </span>
            ) : (
              "Let Gemini analyze your subscriptions, recurring SIPs, debt APRs, and cash flow to generate a prioritized cull list and 10-year compounding trajectory."
            )}
          </div>
        </div>

        <button
          type="button"
          className="btn-ledger btn-ledger-ai"
          onClick={onOpenAudit}
          style={{
            background: "#FFE600",
            color: "#0A0A0A",
            border: "2px solid #000000",
            boxShadow: "3px 3px 0 #FFFFFF",
          }}
        >
          <Sparkles size={13} aria-hidden="true" />
          {overview.latestAudit ? "VIEW FULL AI AUDIT" : "RUN LEDGER AUDIT"}
        </button>
      </div>
    </div>
  );
};
