"use client";

import React from "react";
import { CashFlowSummary, FinancialIncomeRow } from "@/lib/ledger/types";
import { formatCurrency, formatSignedCurrency, getCurrencySymbol } from "@/lib/ledger/formatters";

interface CashFlowVelocityWaterfallProps {
  cashFlow: CashFlowSummary;
  incomes: FinancialIncomeRow[];
  currency?: string;
  investmentCurrency?: string;
}

export const CashFlowVelocityWaterfall: React.FC<CashFlowVelocityWaterfallProps> = ({
  cashFlow,
  incomes,
  currency = "USD",
  investmentCurrency = "INR",
}) => {
  const {
    monthlyGrossIncome,
    monthlyTaxWithholding,
    monthlyNetTakeHome,
    monthlySubscriptions,
    monthlyDebtMinimums,
    monthlyRecurringInvestments,
    totalFixedOutflow,
    monthlyNetSurplus,
    savingsRatePct,
    runwayMonths,
  } = cashFlow;

  const isPositive = monthlyNetSurplus >= 0;
  const maxBar = Math.max(monthlyGrossIncome, totalFixedOutflow, 1000);

  return (
    <div
      style={{
        background: "var(--card, #FFFFFF)",
        border: "1.5px solid var(--ink, #0A0A0A)",
        boxShadow: "3px 3px 0 var(--ink, #0A0A0A)",
        padding: "20px 24px",
        borderRadius: "3px",
        display: "flex",
        flexDirection: "column",
        gap: "18px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "10.5px", fontWeight: 800, textTransform: "uppercase", color: "#666666", marginBottom: "2px" }}>
            CASH FLOW WATERFALL &amp; VELOCITY
          </div>
          <div style={{ fontFamily: "var(--display, sans-serif)", fontSize: "20px", fontWeight: 900 }}>
            Monthly Inflow vs. Tax &amp; Fixed Outflow Drainage
          </div>
        </div>

        <span
          style={{
            fontFamily: "var(--mono, monospace)",
            fontSize: "11px",
            fontWeight: 800,
            padding: "3px 8px",
            background: isPositive ? "#DCFCE7" : "#FEE2E2",
            color: isPositive ? "#166534" : "#991B1B",
            border: "1px solid currentColor",
            borderRadius: "2px",
          }}
        >
          {isPositive ? `+${savingsRatePct}% SAVINGS RATE` : "DEFICIT BURN"}
        </span>
      </div>

      {/* ── Visual Waterfall Horizontal Bars ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {/* Total Inflow Bar */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--mono, monospace)", fontSize: "11px", marginBottom: "4px" }}>
            <span style={{ fontWeight: 800 }}>💵 Gross Monthly Inflow (Income)</span>
            <span style={{ fontWeight: 900, color: "#16A34A" }}>
              {formatSignedCurrency(monthlyGrossIncome, 2, currency)}
            </span>
          </div>
          <div style={{ width: "100%", height: "16px", background: "rgba(0, 0, 0, 0.05)", borderRadius: "2px", overflow: "hidden", border: "1px solid #000000" }}>
            <div
              style={{
                width: `${Math.min(100, (monthlyGrossIncome / maxBar) * 100)}%`,
                height: "100%",
                background: "#00FF66",
              }}
            />
          </div>
        </div>

        {/* Taxes Withholding Bar (if applicable) */}
        {monthlyTaxWithholding > 0 && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--mono, monospace)", fontSize: "11px", marginBottom: "4px" }}>
              <span style={{ fontWeight: 800 }}>🏛️ Estimated Taxes &amp; Withholdings (Fed/State/FICA)</span>
              <span style={{ fontWeight: 800, color: "#DC2626" }}>
                {formatCurrency(-monthlyTaxWithholding, 2, currency)}
              </span>
            </div>
            <div style={{ width: "100%", height: "12px", background: "rgba(0, 0, 0, 0.05)", borderRadius: "2px", overflow: "hidden", border: "1px solid #000000" }}>
              <div
                style={{
                  width: `${Math.min(100, (monthlyTaxWithholding / maxBar) * 100)}%`,
                  height: "100%",
                  background: "#F87171",
                }}
              />
            </div>
          </div>
        )}

        {/* Subscriptions Outflow Bar */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--mono, monospace)", fontSize: "11px", marginBottom: "4px" }}>
            <span style={{ fontWeight: 800 }}>↳ Subscriptions &amp; Recurring Commitments</span>
            <span style={{ fontWeight: 800, color: "#DC2626" }}>
              {formatCurrency(-monthlySubscriptions, 2, currency)}
            </span>
          </div>
          <div style={{ width: "100%", height: "12px", background: "rgba(0, 0, 0, 0.05)", borderRadius: "2px", overflow: "hidden", border: "1px solid #000000" }}>
            <div
              style={{
                width: `${Math.min(100, (monthlySubscriptions / maxBar) * 100)}%`,
                height: "100%",
                background: "#FF2E93",
              }}
            />
          </div>
        </div>

        {/* Debt Minimums Outflow Bar */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--mono, monospace)", fontSize: "11px", marginBottom: "4px" }}>
            <span style={{ fontWeight: 800 }}>↳ Debt Minimum Obligations</span>
            <span style={{ fontWeight: 800, color: "#DC2626" }}>
              {formatCurrency(-monthlyDebtMinimums, 2, currency)}
            </span>
          </div>
          <div style={{ width: "100%", height: "12px", background: "rgba(0, 0, 0, 0.05)", borderRadius: "2px", overflow: "hidden", border: "1px solid #000000" }}>
            <div
              style={{
                width: `${Math.min(100, (monthlyDebtMinimums / maxBar) * 100)}%`,
                height: "100%",
                background: "#FB923C",
              }}
            />
          </div>
        </div>

        {/* Recurring Wealth Investments (SIPs) Outflow Bar */}
        {monthlyRecurringInvestments > 0 && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--mono, monospace)", fontSize: "11px", marginBottom: "4px" }}>
              <span style={{ fontWeight: 800 }}>↳ Recurring Wealth Investments (SIPs/DCA)</span>
              <span style={{ fontWeight: 800, color: "#0284C7" }}>
                {formatCurrency(-monthlyRecurringInvestments, 2, investmentCurrency)}
              </span>
            </div>
            <div style={{ width: "100%", height: "12px", background: "rgba(0, 0, 0, 0.05)", borderRadius: "2px", overflow: "hidden", border: "1px solid #000000" }}>
              <div
                style={{
                  width: `${Math.min(100, (monthlyRecurringInvestments / maxBar) * 100)}%`,
                  height: "100%",
                  background: "#38BDF8",
                }}
              />
            </div>
          </div>
        )}

        {/* Net Monthly Free Surplus Bar */}
        <div style={{ borderTop: "1.5px solid var(--ink, #0A0A0A)", paddingTop: "8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--mono, monospace)", fontSize: "11.5px", marginBottom: "4px" }}>
            <span style={{ fontWeight: 900 }}>🌊 Free Monthly Cash Surplus</span>
            <span style={{ fontWeight: 900, color: isPositive ? "#16A34A" : "#DC2626" }}>
              {formatSignedCurrency(monthlyNetSurplus, 2, currency)}
            </span>
          </div>
          <div style={{ width: "100%", height: "16px", background: "rgba(0, 0, 0, 0.05)", borderRadius: "2px", overflow: "hidden", border: "1px solid #000000" }}>
            <div
              style={{
                width: `${Math.min(100, (Math.abs(monthlyNetSurplus) / maxBar) * 100)}%`,
                height: "100%",
                background: isPositive ? "#00F0FF" : "#EF4444",
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Runway & Buffer KPI strip ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "12px",
          paddingTop: "6px",
        }}
      >
        <div
          style={{
            background: "rgba(0, 0, 0, 0.025)",
            border: "1px solid rgba(0, 0, 0, 0.1)",
            padding: "10px 14px",
            borderRadius: "2px",
          }}
        >
          <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "10px", fontWeight: 800, color: "#666666", textTransform: "uppercase" }}>
            LIQUID EMERGENCY RUNWAY
          </div>
          <div style={{ fontFamily: "var(--display, sans-serif)", fontSize: "22px", fontWeight: 900, color: "var(--ink, #0A0A0A)" }}>
            {runwayMonths.toFixed(1)} <span style={{ fontSize: "12px", fontFamily: "var(--mono, monospace)", color: "#777777" }}>MONTHS</span>
          </div>
        </div>

        <div
          style={{
            background: "rgba(0, 0, 0, 0.025)",
            border: "1px solid rgba(0, 0, 0, 0.1)",
            padding: "10px 14px",
            borderRadius: "2px",
          }}
        >
          <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "10px", fontWeight: 800, color: "#666666", textTransform: "uppercase" }}>
            ANNUALIZED SAVINGS CAPACITY
          </div>
          <div style={{ fontFamily: "var(--display, sans-serif)", fontSize: "22px", fontWeight: 900, color: isPositive ? "#16A34A" : "#DC2626" }}>
            {formatCurrency(monthlyNetSurplus * 12, 0, currency)} <span style={{ fontSize: "12px", fontFamily: "var(--mono, monospace)", color: "#777777" }}>/ YR</span>
          </div>
        </div>
      </div>
    </div>
  );
};
