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
    <div className="flight-deck-panel">
      {/* ── Terminal Flight Rail ── */}
      <div className="flight-deck-rail">
        <div className="flight-deck-rail-left">
          <span className="deck-dot dot-red" />
          <span className="deck-dot dot-yellow" />
          <span className="deck-dot dot-green" />
          <span className="flight-deck-rail-title">// CASHFLOW_VELOCITY_ENGINE</span>
        </div>
        <div className="flight-deck-rail-right">
          <span
            className="kpi-status-chip"
            style={{
              background: isPositive ? "#DCFCE7" : "#FEE2E2",
              color: isPositive ? "#166534" : "#991B1B",
              borderColor: isPositive ? "#16A34A" : "#DC2626",
              fontSize: "9px",
              padding: "1px 6px",
            }}
          >
            {isPositive ? `+${savingsRatePct}% SAVINGS RATE` : "DEFICIT BURN"}
          </span>
        </div>
      </div>

      <div className="flight-deck-content">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "8px" }}>
          <div>
            <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "10px", fontWeight: 900, textTransform: "uppercase", color: "#666666", letterSpacing: "0.06em", marginBottom: "2px" }}>
              MONTHLY VELOCITY MATRIX
            </div>
            <div style={{ fontFamily: "var(--display, sans-serif)", fontSize: "20px", fontWeight: 900, letterSpacing: "-0.02em" }}>
              Inflow vs. Fixed Drainage Waterfall
            </div>
          </div>

          <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px", fontWeight: 800, color: isPositive ? "#15803D" : "#DC2626" }}>
            NET {formatSignedCurrency(monthlyNetSurplus, 0, currency)}/MO
          </div>
        </div>

        {/* ── Chunky Tactile Waterfall Level Meters ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* 1. Gross Inflow Bar */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: "var(--mono, monospace)", fontSize: "11px", marginBottom: "5px" }}>
              <span style={{ fontWeight: 900, display: "flex", alignItems: "center", gap: "6px" }}>
                <span>💵</span> Gross Monthly Inflow (Income)
              </span>
              <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                <span style={{ fontWeight: 900, color: "#16A34A" }}>
                  {formatSignedCurrency(monthlyGrossIncome, 2, currency)}
                </span>
                <span style={{ fontSize: "9.5px", fontWeight: 900, background: "#DCFCE7", color: "#166534", padding: "1px 4px", borderRadius: "2px", border: "1px solid #16A34A" }}>
                  100% INFLOW
                </span>
              </div>
            </div>
            <div className="meter-level-track" style={{ height: "20px" }}>
              <div
                className="meter-level-fill"
                style={{
                  width: `${Math.min(100, (monthlyGrossIncome / maxBar) * 100)}%`,
                  background: "#00E58A",
                }}
              />
            </div>
          </div>

          {/* 2. Taxes Withholding Bar (if applicable) */}
          {monthlyTaxWithholding > 0 && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: "var(--mono, monospace)", fontSize: "11px", marginBottom: "5px" }}>
                <span style={{ fontWeight: 800, display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>🏛️</span> Estimated Taxes &amp; Withholdings (Fed/State/FICA)
                </span>
                <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                  <span style={{ fontWeight: 800, color: "#DC2626" }}>
                    {formatCurrency(-monthlyTaxWithholding, 2, currency)}
                  </span>
                  <span style={{ fontSize: "9px", fontWeight: 800, color: "#666666" }}>
                    {((monthlyTaxWithholding / monthlyGrossIncome) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="meter-level-track" style={{ height: "16px" }}>
                <div
                  className="meter-level-fill"
                  style={{
                    width: `${Math.min(100, (monthlyTaxWithholding / maxBar) * 100)}%`,
                    background: "#F87171",
                  }}
                />
              </div>
            </div>
          )}

          {/* 3. Subscriptions Outflow Bar */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: "var(--mono, monospace)", fontSize: "11px", marginBottom: "5px" }}>
              <span style={{ fontWeight: 800, display: "flex", alignItems: "center", gap: "6px" }}>
                <span>↳</span> Subscriptions &amp; Recurring Commitments
              </span>
              <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                <span style={{ fontWeight: 800, color: "#DC2626" }}>
                  {formatCurrency(-monthlySubscriptions, 2, currency)}
                </span>
                <span style={{ fontSize: "9px", fontWeight: 800, color: "#666666" }}>
                  {monthlyGrossIncome > 0 ? ((monthlySubscriptions / monthlyGrossIncome) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
            <div className="meter-level-track" style={{ height: "16px" }}>
              <div
                className="meter-level-fill"
                style={{
                  width: `${Math.min(100, (monthlySubscriptions / maxBar) * 100)}%`,
                  background: "#FF007A",
                }}
              />
            </div>
          </div>

          {/* 4. Debt Minimum Obligations Bar */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: "var(--mono, monospace)", fontSize: "11px", marginBottom: "5px" }}>
              <span style={{ fontWeight: 800, display: "flex", alignItems: "center", gap: "6px" }}>
                <span>↳</span> Debt Minimum Obligations
              </span>
              <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                <span style={{ fontWeight: 800, color: "#DC2626" }}>
                  {formatCurrency(-monthlyDebtMinimums, 2, currency)}
                </span>
                <span style={{ fontSize: "9px", fontWeight: 800, color: "#666666" }}>
                  {monthlyGrossIncome > 0 ? ((monthlyDebtMinimums / monthlyGrossIncome) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
            <div className="meter-level-track" style={{ height: "16px" }}>
              <div
                className="meter-level-fill"
                style={{
                  width: `${Math.min(100, (monthlyDebtMinimums / maxBar) * 100)}%`,
                  background: "#FB923C",
                }}
              />
            </div>
          </div>

          {/* 5. Recurring Wealth Investments (SIPs) Bar */}
          {monthlyRecurringInvestments > 0 && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: "var(--mono, monospace)", fontSize: "11px", marginBottom: "5px" }}>
                <span style={{ fontWeight: 800, display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>↳</span> Recurring Wealth Investments (SIPs/DCA)
                </span>
                <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                  <span style={{ fontWeight: 800, color: "#0284C7" }}>
                    {formatCurrency(-monthlyRecurringInvestments, 2, investmentCurrency)}
                    {cashFlow.monthlyRecurringInvestmentsUsd && (
                      <span style={{ opacity: 0.8, marginLeft: "4px", fontSize: "10px" }}>
                        ({formatCurrency(-cashFlow.monthlyRecurringInvestmentsUsd, 2, "USD")})
                      </span>
                    )}
                  </span>
                  <span style={{ fontSize: "9px", fontWeight: 800, color: "#0284C7" }}>
                    WEALTH VECTOR
                  </span>
                </div>
              </div>
              <div className="meter-level-track" style={{ height: "16px" }}>
                <div
                  className="meter-level-fill"
                  style={{
                    width: `${Math.min(100, ((cashFlow.monthlyRecurringInvestmentsUsd || monthlyRecurringInvestments) / maxBar) * 100)}%`,
                    background: "#00F0FF",
                  }}
                />
              </div>
            </div>
          )}

          {/* 6. Net Monthly Free Surplus Bar */}
          <div style={{ borderTop: "2px solid var(--ink, #0A0A0A)", paddingTop: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: "var(--mono, monospace)", fontSize: "12px", marginBottom: "6px" }}>
              <span style={{ fontWeight: 900, display: "flex", alignItems: "center", gap: "6px" }}>
                <span>🌊</span> Free Monthly Cash Surplus
              </span>
              <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                <span
                  style={{
                    fontFamily: "var(--display, sans-serif)",
                    fontSize: "20px",
                    fontWeight: 900,
                    color: isPositive ? "#16A34A" : "#DC2626",
                  }}
                >
                  {formatSignedCurrency(monthlyNetSurplus, 2, currency)}
                </span>
                <span
                  style={{
                    fontSize: "9.5px",
                    fontWeight: 900,
                    padding: "2px 6px",
                    background: isPositive ? "#0A0A0A" : "#FEE2E2",
                    color: isPositive ? "#FFE600" : "#991B1B",
                    borderRadius: "2px",
                    border: "1px solid #000",
                  }}
                >
                  {isPositive ? `+${savingsRatePct}% SURPLUS` : "BURN DEFICIT"}
                </span>
              </div>
            </div>
            <div className="meter-level-track" style={{ height: "22px" }}>
              <div
                className="meter-level-fill"
                style={{
                  width: `${Math.min(100, (Math.abs(monthlyNetSurplus) / maxBar) * 100)}%`,
                  background: isPositive ? "#00F0FF" : "#EF4444",
                }}
              />
            </div>
          </div>
        </div>

        {/* ── Runway & Buffer Tactile KPI strip ── */}
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
              background: "#F8FAFC",
              border: "2px solid var(--ink, #0A0A0A)",
              boxShadow: "2.5px 2.5px 0 var(--ink, #0A0A0A)",
              padding: "12px 14px",
              borderRadius: "2px",
            }}
          >
            <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "9.5px", fontWeight: 900, color: "#666666", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              LIQUID EMERGENCY RUNWAY
            </div>
            <div style={{ fontFamily: "var(--display, sans-serif)", fontSize: "24px", fontWeight: 900, color: "var(--ink, #0A0A0A)", lineHeight: 1.1, marginTop: "2px" }}>
              {runwayMonths.toFixed(1)} <span style={{ fontSize: "11px", fontFamily: "var(--mono, monospace)", color: "#777777", fontWeight: 800 }}>MONTHS</span>
            </div>
          </div>

          <div
            style={{
              background: isPositive ? "#F0FDF4" : "#FEF2F2",
              border: `2px solid ${isPositive ? "#16A34A" : "#DC2626"}`,
              boxShadow: `2.5px 2.5px 0 ${isPositive ? "#16A34A" : "#DC2626"}`,
              padding: "12px 14px",
              borderRadius: "2px",
            }}
          >
            <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "9.5px", fontWeight: 900, color: isPositive ? "#166534" : "#991B1B", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              ANNUALIZED SAVINGS CAPACITY
            </div>
            <div style={{ fontFamily: "var(--display, sans-serif)", fontSize: "24px", fontWeight: 900, color: isPositive ? "#16A34A" : "#DC2626", lineHeight: 1.1, marginTop: "2px" }}>
              {formatCurrency(monthlyNetSurplus * 12, 0, currency)} <span style={{ fontSize: "11px", fontFamily: "var(--mono, monospace)", color: isPositive ? "#166534" : "#991B1B", fontWeight: 800 }}>/ YR</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
