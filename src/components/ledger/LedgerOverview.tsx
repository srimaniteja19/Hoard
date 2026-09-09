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
  Landmark,
  Repeat,
  ShieldCheck,
} from "lucide-react";
import { SubscriptionBreakdownChart } from "./charts/SubscriptionBreakdownChart";
import { CashFlowVelocityWaterfall } from "./charts/CashFlowVelocityWaterfall";
import { DebtAmortizationChart } from "./charts/DebtAmortizationChart";
import { MarketTickerTape } from "./MarketTickerTape";

interface LedgerOverviewProps {
  overview: FinancialOverviewPayload;
  onNavigateTab: (tab: "OVERVIEW" | "DAILY" | "SUBSCRIPTIONS" | "INVESTMENTS" | "DEBTS" | "CASHFLOW" | "NETWORTH") => void;
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

      {/* ── TOP KPI METRIC CARDS (NEUBRUTALIST COMMAND MATRIX) ── */}
      <div className="ledger-kpi-grid">
        {/* 1. Net Worth */}
        <div
          className="ledger-kpi-card"
          style={
            {
              "--kpi-accent": "#00F0FF",
              "--kpi-icon-bg": "#E0F2FE",
              "--kpi-icon-fg": "#0369A1",
              cursor: "pointer",
            } as React.CSSProperties
          }
          onClick={() => {
            playSound.click();
            onNavigateTab("NETWORTH");
          }}
          title="Click to inspect Net Worth & Asset register"
        >
          <div className="kpi-top-bar">
            <div className="kpi-tag-group">
              <span className="kpi-icon-box">
                <Landmark size={13} strokeWidth={2.5} aria-hidden="true" />
              </span>
              <span className="kpi-sector-name">NET WORTH</span>
            </div>
            <span
              className={`kpi-status-chip ${
                netWorth.netWorth >= 0 ? "chip-positive" : "chip-negative"
              }`}
            >
              {netWorth.netWorth >= 0 ? "SOLVENT" : "DEFICIT"}
            </span>
          </div>

          <div className="kpi-main-readout">
            <div
              className="ledger-kpi-value"
              style={{
                color: netWorth.netWorth >= 0 ? "var(--ink, #0A0A0A)" : "#DC2626",
              }}
            >
              {formatCurrency(netWorth.netWorth, 2, currency)}
            </div>
          </div>

          <div className="kpi-bottom-strip">
            <span className="kpi-sub-text">
              {formatCurrency(netWorth.totalAssets, 0, currency)} Assets − {formatCurrency(netWorth.totalLiabilities, 0, currency)} Debt
            </span>
            <span className="kpi-nav-cue">VAULT →</span>
          </div>
        </div>

        {/* 2. Safe to Spend Today */}
        {metrics.dailyMetrics && (
          <div
            className="ledger-kpi-card"
            style={
              {
                "--kpi-accent": metrics.dailyMetrics.isOverBudgetToday
                  ? "#FF007A"
                  : "#B8F04A",
                "--kpi-icon-bg": metrics.dailyMetrics.isOverBudgetToday
                  ? "#FFE5F0"
                  : "#F4FBD0",
                "--kpi-icon-fg": metrics.dailyMetrics.isOverBudgetToday
                  ? "#BE123C"
                  : "#365314",
                cursor: "pointer",
              } as React.CSSProperties
            }
            onClick={() => {
              playSound.click();
              onNavigateTab("DAILY");
            }}
            title="Click to open Daily Expenses speed logger"
          >
            <div className="kpi-top-bar">
              <div className="kpi-tag-group">
                <span className="kpi-icon-box">
                  <Receipt size={13} strokeWidth={2.5} aria-hidden="true" />
                </span>
                <span className="kpi-sector-name">SAFE TO SPEND</span>
              </div>
              <span
                className={`kpi-status-chip ${
                  metrics.dailyMetrics.isOverBudgetToday
                    ? "chip-negative"
                    : "chip-accent"
                }`}
              >
                {metrics.dailyMetrics.isOverBudgetToday ? "DEFICIT" : "HEADROOM"}
              </span>
            </div>

            <div className="kpi-main-readout">
              <div
                className="ledger-kpi-value"
                style={{
                  color: metrics.dailyMetrics.isOverBudgetToday ? "#DC2626" : "#15803D",
                }}
              >
                ${Math.abs(metrics.dailyMetrics.safeToSpendToday).toFixed(0)}
              </div>
            </div>

            <div className="kpi-bottom-strip">
              <span className="kpi-sub-text">
                {metrics.dailyMetrics.isOverBudgetToday
                  ? `Exceeded by $${Math.abs(metrics.dailyMetrics.safeToSpendToday).toFixed(0)} today`
                  : `Base: $${metrics.dailyMetrics.baseDailyAllowance.toFixed(0)}/day • ${metrics.dailyMetrics.daysRemaining}d left`}
              </span>
              <span className="kpi-nav-cue">DUES →</span>
            </div>
          </div>
        )}

        {/* 3. Monthly Recurring Burn */}
        <div
          className="ledger-kpi-card"
          style={
            {
              "--kpi-accent": "#7C4DFF",
              "--kpi-icon-bg": "#F1EAFF",
              "--kpi-icon-fg": "#6B21A8",
              cursor: "pointer",
            } as React.CSSProperties
          }
          onClick={() => {
            playSound.click();
            onNavigateTab("SUBSCRIPTIONS");
          }}
          title="Click to audit recurring subscriptions"
        >
          <div className="kpi-top-bar">
            <div className="kpi-tag-group">
              <span className="kpi-icon-box">
                <Repeat size={13} strokeWidth={2.5} aria-hidden="true" />
              </span>
              <span className="kpi-sector-name">RECURRING BURN</span>
            </div>
            <span className="kpi-status-chip chip-neutral">
              {subscriptionMetrics.activeCount} SERVICES
            </span>
          </div>

          <div className="kpi-main-readout">
            <div className="ledger-kpi-value">
              {formatCurrency(subscriptionMetrics.monthlyTotal, 2, currency)}
            </div>
          </div>

          <div className="kpi-bottom-strip">
            <span className="kpi-sub-text">
              {formatCurrency(subscriptionMetrics.yearlyTotal, 0, currency)}/yr committed
            </span>
            <span className="kpi-nav-cue">SUBS →</span>
          </div>
        </div>

        {/* 4. Recurring Investments / SIPs */}
        <div
          className="ledger-kpi-card"
          style={
            {
              "--kpi-accent": "#00E58A",
              "--kpi-icon-bg": "#E5FFF4",
              "--kpi-icon-fg": "#047857",
              cursor: "pointer",
            } as React.CSSProperties
          }
          onClick={() => {
            playSound.click();
            onNavigateTab("INVESTMENTS");
          }}
          title="Click to manage Recurring SIP & DCA allocations"
        >
          <div className="kpi-top-bar">
            <div className="kpi-tag-group">
              <span className="kpi-icon-box">
                <Coins size={13} strokeWidth={2.5} aria-hidden="true" />
              </span>
              <span className="kpi-sector-name">INVESTMENTS</span>
            </div>
            <span className="kpi-status-chip chip-positive">
              {investmentMetrics?.weightedReturnRatePct || 14.6}% CAGR
            </span>
          </div>

          <div className="kpi-main-readout">
            <div className="ledger-kpi-value" style={{ color: "#15803D" }}>
              {formatCurrency(investmentMetrics?.monthlyTotal || 0, 2, investmentCurrency)}
            </div>
          </div>

          <div className="kpi-bottom-strip">
            <span className="kpi-sub-text">
              {investmentMetrics?.monthlyTotalUsd && investmentCurrency !== "USD"
                ? `~${formatCurrency(investmentMetrics.monthlyTotalUsd, 0, "USD")}/mo • `
                : ""}
              {investments.length} SIPs/DCAs
            </span>
            <span className="kpi-nav-cue">INVEST →</span>
          </div>
        </div>

        {/* 5. Total Debt Liabilities */}
        <div
          className="ledger-kpi-card"
          style={
            {
              "--kpi-accent": "#FF007A",
              "--kpi-icon-bg": "#FFE5F0",
              "--kpi-icon-fg": "#BE123C",
              cursor: "pointer",
            } as React.CSSProperties
          }
          onClick={() => {
            playSound.click();
            onNavigateTab("DEBTS");
          }}
          title="Click to launch Debt Payoff Simulator"
        >
          <div className="kpi-top-bar">
            <div className="kpi-tag-group">
              <span className="kpi-icon-box">
                <CreditCard size={13} strokeWidth={2.5} aria-hidden="true" />
              </span>
              <span className="kpi-sector-name">TOTAL DEBT</span>
            </div>
            <span
              className={`kpi-status-chip ${
                debts.filter((d) => !d.isPaidOff).length > 0
                  ? "chip-negative"
                  : "chip-positive"
              }`}
            >
              {debts.filter((d) => !d.isPaidOff).length > 0
                ? `${avalanchePayoff.monthsToPayoff} MOS`
                : "DEBT FREE"}
            </span>
          </div>

          <div className="kpi-main-readout">
            <div
              className="ledger-kpi-value"
              style={{
                color: debts.filter((d) => !d.isPaidOff).length > 0 ? "#DC2626" : "#15803D",
              }}
            >
              {formatCurrency(netWorth.totalLiabilities, 0, currency)}
            </div>
          </div>

          <div className="kpi-bottom-strip">
            <span className="kpi-sub-text">
              {debts.filter((d) => !d.isPaidOff).length > 0
                ? `Debt-Free: ${avalanchePayoff.debtFreeDate}`
                : "100% Debt-Free"}
            </span>
            <span className="kpi-nav-cue">DEBTS →</span>
          </div>
        </div>

        {/* 6. Liquid Runway Reserve */}
        <div
          className="ledger-kpi-card"
          style={
            {
              "--kpi-accent": "#00F0FF",
              "--kpi-icon-bg": "#E5FDFF",
              "--kpi-icon-fg": "#0369A1",
              cursor: "pointer",
            } as React.CSSProperties
          }
          onClick={() => {
            playSound.click();
            onNavigateTab("CASHFLOW");
          }}
          title="Click to inspect Cash Flow & Emergency Runway"
        >
          <div className="kpi-top-bar">
            <div className="kpi-tag-group">
              <span className="kpi-icon-box">
                <ShieldCheck size={13} strokeWidth={2.5} aria-hidden="true" />
              </span>
              <span className="kpi-sector-name">RUNWAY RESERVE</span>
            </div>
            <span
              className={`kpi-status-chip ${
                cashFlow.runwayMonths >= 6
                  ? "chip-positive"
                  : cashFlow.runwayMonths >= 3
                  ? "chip-accent"
                  : "chip-negative"
              }`}
            >
              {cashFlow.runwayMonths >= 6
                ? "STRONG"
                : cashFlow.runwayMonths >= 3
                ? "STABLE"
                : "LOW BUFFER"}
            </span>
          </div>

          <div className="kpi-main-readout">
            <div className="ledger-kpi-value">
              {cashFlow.runwayMonths.toFixed(1)} MOS
            </div>
          </div>

          <div className="kpi-bottom-strip">
            <span className="kpi-sub-text">
              {formatCurrency(cashFlow.liquidCashTotal, 0, currency)} cash ÷ {formatCurrency(cashFlow.totalFixedOutflow, 0, currency)}/mo burn
            </span>
            <span className="kpi-nav-cue">CASH →</span>
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
        {/* Card 1: FIRE Freedom Clock */}
        <div
          className="wealth-tool-card"
          onClick={() => {
            playSound.click();
            onOpenFireWarRoom();
          }}
        >
          <div className="wealth-tool-header">
            <span className="wealth-tool-tag" style={{ color: "#FF6B00" }}>
              <Flame size={13} color="#FF6B00" />
              FREEDOM CLOCK
            </span>
            <span
              className="wealth-tool-chip"
              style={{ background: "#FFEDD5", color: "#C2410C", borderColor: "#EA580C" }}
            >
              WAR ROOM
            </span>
          </div>
          <div>
            <h4 className="wealth-tool-title">FIRE Retirement Simulator</h4>
            <div className="wealth-tool-desc">
              Model what-if SIP boosts &amp; calculate exact years of life reclaimed from corporate servitude.
            </div>
          </div>
          <div className="wealth-tool-link" style={{ color: "#EA580C" }}>
            LAUNCH SIMULATOR <ArrowRight size={11} />
          </div>
        </div>

        {/* Card 2: Surplus Sweeper */}
        <div
          className="wealth-tool-card"
          onClick={() => {
            playSound.click();
            onOpenSurplusSweeper();
          }}
        >
          <div className="wealth-tool-header">
            <span className="wealth-tool-tag" style={{ color: "#0284C7" }}>
              <Zap size={13} color="#0284C7" />
              CAPITAL ALLOCATION
            </span>
            <span
              className="wealth-tool-chip"
              style={{ background: "#E0F2FE", color: "#0369A1", borderColor: "#0284C7" }}
            >
              +{formatCurrency(cashFlow.monthlyNetSurplus, 0, currency)}/MO
            </span>
          </div>
          <div>
            <h4 className="wealth-tool-title">Monthly Surplus Sweeper</h4>
            <div className="wealth-tool-desc">
              Auto-distribute free cash surplus across Equities, Gold, HYSA, &amp; Debt payoff vectors.
            </div>
          </div>
          <div className="wealth-tool-link" style={{ color: "#0284C7" }}>
            DEPLOY ALLOCATIONS <ArrowRight size={11} />
          </div>
        </div>

        {/* Card 3: Thermal Receipt Export */}
        <div
          className="wealth-tool-card"
          onClick={() => {
            playSound.click();
            onOpenReceipt();
          }}
        >
          <div className="wealth-tool-header">
            <span className="wealth-tool-tag" style={{ color: "#15803D" }}>
              <Receipt size={13} color="#15803D" />
              ARCHIVAL VOUCHER
            </span>
            <span
              className="wealth-tool-chip"
              style={{ background: "#DCFCE7", color: "#166534", borderColor: "#16A34A" }}
            >
              PNG / PRINT
            </span>
          </div>
          <div>
            <h4 className="wealth-tool-title">Dover St Thermal Receipt</h4>
            <div className="wealth-tool-desc">
              Export editorial high-fashion monospace balance sheet voucher with live FX seal &amp; cryptographic hash.
            </div>
          </div>
          <div className="wealth-tool-link" style={{ color: "#15803D" }}>
            GENERATE RECEIPT <ArrowRight size={11} />
          </div>
        </div>

        {/* Card 4: Live Market Oracle */}
        <div
          className="wealth-tool-card"
          onClick={() => {
            playSound.click();
            onOpenMarketOracle();
          }}
        >
          <div className="wealth-tool-header">
            <span className="wealth-tool-tag" style={{ color: "#7C3AED" }}>
              <Coins size={13} color="#7C3AED" />
              SPOT ORACLE
            </span>
            <span
              className="wealth-tool-chip"
              style={{ background: "#F3E8FF", color: "#6B21A8", borderColor: "#7C3AED" }}
            >
              METALS · CRYPTO · INDICES
            </span>
          </div>
          <div>
            <h4 className="wealth-tool-title">Live Market Oracle</h4>
            <div className="wealth-tool-desc">
              Live spot rates for 24K Gold, Silver, Top 5 Cryptos, &amp; major market index funds in USD &amp; INR.
            </div>
          </div>
          <div className="wealth-tool-link" style={{ color: "#7C3AED" }}>
            OPEN TERMINAL <ArrowRight size={11} />
          </div>
        </div>
      </div>

      {/* ── AI AUDIT PROMPT BANNER (CYBER QUANT OBSIDIAN DECK) ── */}
      <div
        style={{
          background: "#0A0A0A",
          color: "#FFFFFF",
          border: "3px solid var(--ink, #000000)",
          boxShadow: "5px 5px 0 var(--ink, #000000)",
          padding: "22px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
          borderRadius: "3px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ maxWidth: "780px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
            <Sparkles size={18} color="#FFE600" aria-hidden="true" />
            <span style={{ fontFamily: "var(--display)", fontSize: "20px", fontWeight: 900, letterSpacing: "-0.02em" }}>
              AI FINANCIAL SCRIBE &amp; INSTITUTIONAL AUDITOR
            </span>
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: "9.5px",
                fontWeight: 900,
                background: "#FFE600",
                color: "#0A0A0A",
                padding: "2px 7px",
                border: "1px solid #000",
                borderRadius: "2px",
                boxShadow: "1px 1px 0 #FFE600",
              }}
            >
              GEMINI 3.5 QUANT
            </span>
          </div>
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: "11.5px",
              color: "#E4E4E7",
              lineHeight: 1.45,
            }}
          >
            {overview.latestAudit ? (
              <span>
                Latest Health Score: <b style={{ color: "#FFE600" }}>{(overview.latestAudit.analysis as any)?.healthScore || 80}/100</b> •{" "}
                {(overview.latestAudit.analysis as any)?.subscriptionCullList?.length || 0} subscription leaks flagged •{" "}
                10-yr compounding trajectory active.
              </span>
            ) : (
              "Deploy Gemini to audit recurring subscription leaks, simulate debt APR knockout velocity, and model your 10-year compounding trajectory."
            )}
          </div>
        </div>

        <button
          type="button"
          className="btn-ledger"
          onClick={onOpenAudit}
          style={{
            background: "#FFE600",
            color: "#0A0A0A",
            border: "2px solid #000000",
            boxShadow: "3px 3px 0 #00F0FF",
            fontWeight: 900,
            fontSize: "11px",
            padding: "9px 16px",
          }}
        >
          <Sparkles size={13} aria-hidden="true" />
          {overview.latestAudit ? "VIEW FULL AI AUDIT" : "RUN LEDGER AUDIT"}
        </button>
      </div>
    </div>
  );
};
