"use client";

import React, { useState, useMemo } from "react";
import {
  FinancialInvestmentRow,
  InvestmentMetrics,
  InvestmentAssetType,
  INVESTMENT_ASSET_TYPES,
  INVESTMENT_THEMES,
} from "@/lib/ledger/types";
import {
  calculateDetailedCompoundProjection,
  calculateCompoundWealth,
} from "@/lib/ledger/investmentMetrics";
import {
  formatCurrency,
  formatCompactCurrency,
} from "@/lib/ledger/formatters";
import { playSound } from "@/lib/sound";
import {
  TrendingUp,
  Coins,
  PieChart,
  Sparkles,
  ShieldAlert,
  Flame,
  Filter,
  Layers,
  Calendar,
  Zap,
} from "lucide-react";

interface InvestmentRealtimeAnalysisProps {
  investments: FinancialInvestmentRow[];
  metrics: InvestmentMetrics;
  currency?: string;
  onSelectCategory?: (category: string) => void;
}

const MILESTONES = [1, 3, 5, 10, 15, 20, 25, 30];

export const InvestmentRealtimeAnalysis: React.FC<InvestmentRealtimeAnalysisProps> = ({
  investments,
  metrics,
  currency = "INR",
  onSelectCategory,
}) => {
  // Realtime Analysis Controls
  const [horizonYears, setHorizonYears] = useState<number>(10);
  const [simulatedCagr, setSimulatedCagr] = useState<number>(
    metrics.weightedReturnRatePct > 0 ? metrics.weightedReturnRatePct : 12.0
  );
  const [isInflationAdjusted, setIsInflationAdjusted] = useState<boolean>(false);
  const [categoryViewMode, setCategoryViewMode] = useState<"VALUATION" | "MONTHLY">("VALUATION");

  const inflationRate = isInflationAdjusted ? 6.0 : 0;

  // Active projection calculation for the selected horizon
  const activeProjection = useMemo(() => {
    return calculateDetailedCompoundProjection(
      metrics.monthlyTotal,
      simulatedCagr,
      horizonYears,
      metrics.totalValuation,
      inflationRate
    );
  }, [metrics.monthlyTotal, metrics.totalValuation, simulatedCagr, horizonYears, inflationRate]);

  // Milestone trajectory projections for the chart and table
  const milestoneProjections = useMemo(() => {
    return MILESTONES.map((years) => {
      return calculateDetailedCompoundProjection(
        metrics.monthlyTotal,
        simulatedCagr,
        years,
        metrics.totalValuation,
        inflationRate
      );
    });
  }, [metrics.monthlyTotal, metrics.totalValuation, simulatedCagr, inflationRate]);

  const maxMilestoneWealth = useMemo(() => {
    return Math.max(
      ...milestoneProjections.map((p) => p.projectedWealth),
      1000
    );
  }, [milestoneProjections]);

  // Categories that have either valuation or monthly contributions or investments
  const activeCategories = useMemo(() => {
    return INVESTMENT_ASSET_TYPES.filter((type) => {
      const cat = metrics.categoryBreakdown[type];
      return cat && (cat.count > 0 || cat.totalValuation > 0 || cat.monthlyTotal > 0);
    });
  }, [metrics.categoryBreakdown]);

  const handleScenarioChange = (rate: number) => {
    playSound.click();
    setSimulatedCagr(Math.round(rate * 10) / 10);
  };

  const handleHorizonChange = (years: number) => {
    playSound.click();
    setHorizonYears(years);
  };

  return (
    <div
      id="investment-realtime-analysis"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "28px",
        marginTop: "12px",
      }}
    >
      {/* ── SECTION TITLE BAR ── */}
      <div
        style={{
          background: "var(--card, #FFFFFF)",
          border: "2.5px solid var(--ink, #0A0A0A)",
          boxShadow: "4.5px 4.5px 0 var(--ink, #0A0A0A)",
          borderRadius: "4px",
          padding: "20px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "11px",
              fontWeight: 900,
              letterSpacing: "0.08em",
              color: "#666666",
              textTransform: "uppercase",
              display: "flex",
              alignItems: "center",
              gap: "7px",
              marginBottom: "4px",
            }}
          >
            <TrendingUp size={14} color="#16A34A" aria-hidden="true" />
            REALTIME PORTFOLIO &amp; CATEGORY INTELLIGENCE
          </div>
          <h2
            style={{
              fontFamily: "var(--display, sans-serif)",
              fontSize: "24px",
              fontWeight: 900,
              color: "var(--ink, #0A0A0A)",
              margin: 0,
              lineHeight: 1.15,
            }}
          >
            Systematic Outflows, Category Balances &amp; Compounded Horizon
          </h2>
          <p
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "12px",
              color: "#555555",
              margin: "6px 0 0 0",
            }}
          >
            Real-time portfolio valuation across asset classes, accurate monthly SIP capital velocity,
            and compounded growth modeling based on actuarial annuity formulas.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <span
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "11px",
              fontWeight: 900,
              background: "#DCFCE7",
              color: "#166534",
              border: "1.5px solid #16A34A",
              boxShadow: "2px 2px 0 #16A34A",
              padding: "5px 10px",
              borderRadius: "2px",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Zap size={12} aria-hidden="true" />
            LIVE ANALYSIS ENGINE
          </span>
        </div>
      </div>

      {/* ── 1. HOW MUCH AM I PAYING MONTHLY & PORTFOLIO VALUATION (EXECUTIVE KPI CARDS) ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "16px",
        }}
      >
        {/* Card 1: Monthly Systematic Outflow */}
        <div
          style={{
            background: "#FFFFFF",
            border: "2.5px solid var(--ink, #0A0A0A)",
            boxShadow: "4px 4px 0 var(--ink, #0A0A0A)",
            borderRadius: "4px",
            padding: "18px 20px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: "10px",
          }}
        >
          <div
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "11px",
              fontWeight: 900,
              color: "#475569",
              textTransform: "uppercase",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>TOTAL MONTHLY SIP OUTFLOW</span>
            <Coins size={14} color="#0284C7" aria-hidden="true" />
          </div>

          <div>
            <div
              style={{
                fontFamily: "var(--display, sans-serif)",
                fontSize: "30px",
                fontWeight: 900,
                color: "var(--ink, #0A0A0A)",
                lineHeight: 1,
              }}
            >
              {formatCurrency(metrics.monthlyTotal, 2, currency)}
              <span
                style={{
                  fontSize: "13px",
                  fontFamily: "var(--mono, monospace)",
                  fontWeight: 800,
                  color: "#666666",
                  marginLeft: "4px",
                }}
              >
                / MO
              </span>
            </div>
            <div
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "12px",
                fontWeight: 700,
                color: "#166534",
                marginTop: "4px",
              }}
            >
              ≈ {formatCurrency(metrics.yearlyTotal, 0, currency)} / year committed
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontFamily: "var(--mono, monospace)",
              fontSize: "11px",
              color: "#444444",
              borderTop: "1.5px dashed rgba(0,0,0,0.15)",
              paddingTop: "8px",
            }}
          >
            <span>{metrics.activeCount} Active Systematic Plans</span>
            <span style={{ fontWeight: 800, color: "#0284C7" }}>
              {metrics.totalCount > 0 ? Math.round((metrics.activeCount / metrics.totalCount) * 100) : 100}% Active
            </span>
          </div>
        </div>

        {/* Card 2: Total Accumulated Portfolio Valuation */}
        <div
          style={{
            background: "#FFFFFF",
            border: "2.5px solid var(--ink, #0A0A0A)",
            boxShadow: "4px 4px 0 var(--ink, #0A0A0A)",
            borderRadius: "4px",
            padding: "18px 20px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: "10px",
          }}
        >
          <div
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "11px",
              fontWeight: 900,
              color: "#475569",
              textTransform: "uppercase",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>TOTAL ACCUMULATED VALUATION</span>
            <Layers size={14} color="#16A34A" aria-hidden="true" />
          </div>

          <div>
            <div
              style={{
                fontFamily: "var(--display, sans-serif)",
                fontSize: "30px",
                fontWeight: 900,
                color: "#166534",
                lineHeight: 1,
              }}
            >
              {formatCurrency(metrics.totalValuation, 2, currency)}
            </div>
            <div
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "12px",
                fontWeight: 700,
                color: "#555555",
                marginTop: "4px",
              }}
            >
              Held across all {metrics.totalCount} recorded holdings
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontFamily: "var(--mono, monospace)",
              fontSize: "11px",
              color: "#444444",
              borderTop: "1.5px dashed rgba(0,0,0,0.15)",
              paddingTop: "8px",
            }}
          >
            <span>Active: {metrics.activeCount}</span>
            <span>Paused: {metrics.pausedCount}</span>
          </div>
        </div>

        {/* Card 3: Portfolio Weighted Average CAGR */}
        <div
          style={{
            background: "#FFFFFF",
            border: "2.5px solid var(--ink, #0A0A0A)",
            boxShadow: "4px 4px 0 var(--ink, #0A0A0A)",
            borderRadius: "4px",
            padding: "18px 20px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: "10px",
          }}
        >
          <div
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "11px",
              fontWeight: 900,
              color: "#475569",
              textTransform: "uppercase",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>EXPECTED WEIGHTED CAGR</span>
            <Flame size={14} color="#CA8A04" aria-hidden="true" />
          </div>

          <div>
            <div
              style={{
                fontFamily: "var(--display, sans-serif)",
                fontSize: "30px",
                fontWeight: 900,
                color: "#854D0E",
                lineHeight: 1,
              }}
            >
              {metrics.weightedReturnRatePct}%
              <span
                style={{
                  fontSize: "13px",
                  fontFamily: "var(--mono, monospace)",
                  fontWeight: 800,
                  color: "#666666",
                  marginLeft: "4px",
                }}
              >
                ANNUAL
              </span>
            </div>
            <div
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "12px",
                fontWeight: 700,
                color: "#555555",
                marginTop: "4px",
              }}
            >
              Volume-weighted across active allocations
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontFamily: "var(--mono, monospace)",
              fontSize: "11px",
              color: "#166534",
              borderTop: "1.5px dashed rgba(0,0,0,0.15)",
              paddingTop: "8px",
              fontWeight: 700,
            }}
          >
            <span>Accrual: Monthly compounding</span>
            <span>✓ Net Worth Synced</span>
          </div>
        </div>

        {/* Card 4: Paused Commitments / Dormant Capital */}
        <div
          style={{
            background: metrics.pausedCount > 0 ? "#FFFBEB" : "#FFFFFF",
            border: "2.5px solid var(--ink, #0A0A0A)",
            boxShadow: "4px 4px 0 var(--ink, #0A0A0A)",
            borderRadius: "4px",
            padding: "18px 20px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: "10px",
          }}
        >
          <div
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "11px",
              fontWeight: 900,
              color: "#475569",
              textTransform: "uppercase",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>PAUSED COMMITMENTS</span>
            <ShieldAlert size={14} color="#D97706" aria-hidden="true" />
          </div>

          <div>
            <div
              style={{
                fontFamily: "var(--display, sans-serif)",
                fontSize: "30px",
                fontWeight: 900,
                color: metrics.pausedCount > 0 ? "#B45309" : "var(--ink, #0A0A0A)",
                lineHeight: 1,
              }}
            >
              {metrics.pausedCount > 0 ? `${metrics.pausedCount} PLANS` : "0 PAUSED"}
            </div>
            <div
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "12px",
                fontWeight: 700,
                color: "#666666",
                marginTop: "4px",
              }}
            >
              {metrics.pausedCount > 0
                ? `${formatCurrency(metrics.pausedMonthlyTotal, 2, currency)}/mo potential if resumed`
                : "All systematic allocations are actively running"}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontFamily: "var(--mono, monospace)",
              fontSize: "11px",
              color: "#444444",
              borderTop: "1.5px dashed rgba(0,0,0,0.15)",
              paddingTop: "8px",
            }}
          >
            <span>Accumulated capital in paused:</span>
            <span style={{ fontWeight: 800 }}>Compounding</span>
          </div>
        </div>
      </div>

      {/* ── 2. TOTAL VALUES OF INVESTMENTS BY CATEGORY ── */}
      <div
        style={{
          background: "var(--card, #FFFFFF)",
          border: "2.5px solid var(--ink, #0A0A0A)",
          boxShadow: "4.5px 4.5px 0 var(--ink, #0A0A0A)",
          borderRadius: "4px",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        {/* Category Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "14px",
            borderBottom: "2px solid var(--ink, #0A0A0A)",
            paddingBottom: "16px",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "10.5px",
                fontWeight: 900,
                color: "#666666",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginBottom: "4px",
              }}
            >
              <PieChart size={13} color="#0284C7" aria-hidden="true" />
              PORTFOLIO ASSET CLASS ALLOCATION &amp; VALUE BREAKDOWN
            </div>
            <h3
              style={{
                fontFamily: "var(--display, sans-serif)",
                fontSize: "22px",
                fontWeight: 900,
                color: "var(--ink, #0A0A0A)",
                margin: 0,
              }}
            >
              Total Investment Values by Category
            </h3>
          </div>

          {/* Switcher: By Accumulated Valuation vs By Monthly Outflow */}
          <div className="debt-strategy-toggle">
            <button
              type="button"
              className={`debt-strategy-btn ${categoryViewMode === "VALUATION" ? "active" : ""}`}
              onClick={() => {
                playSound.click();
                setCategoryViewMode("VALUATION");
              }}
            >
              BY ACCUMULATED VALUE
            </button>
            <button
              type="button"
              className={`debt-strategy-btn ${categoryViewMode === "MONTHLY" ? "active" : ""}`}
              onClick={() => {
                playSound.click();
                setCategoryViewMode("MONTHLY");
              }}
            >
              BY MONTHLY OUTFLOW
            </button>
          </div>
        </div>

        {/* Visual Segmented Progress Bar */}
        {activeCategories.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div
              style={{
                display: "flex",
                width: "100%",
                height: "22px",
                border: "2px solid var(--ink, #0A0A0A)",
                borderRadius: "3px",
                overflow: "hidden",
                boxShadow: "2.5px 2.5px 0 var(--ink, #0A0A0A)",
              }}
            >
              {activeCategories.map((type) => {
                const cat = metrics.categoryBreakdown[type];
                const theme = INVESTMENT_THEMES[type] || INVESTMENT_THEMES.OTHER;
                const pct =
                  categoryViewMode === "VALUATION"
                    ? cat.valuationSharePct
                    : cat.monthlySharePct;

                if (pct <= 0) return null;

                return (
                  <div
                    key={type}
                    style={{
                      width: `${pct}%`,
                      background: theme.headerBg,
                      borderRight: "1.5px solid var(--ink, #0A0A0A)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "var(--mono, monospace)",
                      fontSize: "10px",
                      fontWeight: 900,
                      color: "#000000",
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                      padding: "0 4px",
                      transition: "width 0.3s ease",
                    }}
                    title={`${theme.shortLabel}: ${pct}% (${
                      categoryViewMode === "VALUATION"
                        ? formatCurrency(cat.totalValuation, 2, currency)
                        : formatCurrency(cat.monthlyTotal, 2, currency) + "/mo"
                    })`}
                  >
                    {pct >= 8 ? `${theme.shortLabel} ${pct}%` : pct >= 4 ? `${pct}%` : ""}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "14px",
                fontFamily: "var(--mono, monospace)",
                fontSize: "11px",
                fontWeight: 700,
              }}
            >
              {activeCategories.map((type) => {
                const cat = metrics.categoryBreakdown[type];
                const theme = INVESTMENT_THEMES[type] || INVESTMENT_THEMES.OTHER;
                const share =
                  categoryViewMode === "VALUATION" ? cat.valuationSharePct : cat.monthlySharePct;

                return (
                  <div key={type} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span
                      style={{
                        width: "12px",
                        height: "12px",
                        background: theme.headerBg,
                        border: "1.5px solid #000000",
                        borderRadius: "2px",
                        display: "inline-block",
                      }}
                    />
                    <span>{theme.shortLabel}:</span>
                    <b style={{ color: "var(--ink, #0A0A0A)" }}>{share}%</b>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Detailed Category Cards Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "16px",
          }}
        >
          {activeCategories.map((type) => {
            const cat = metrics.categoryBreakdown[type];
            const theme = INVESTMENT_THEMES[type] || INVESTMENT_THEMES.OTHER;

            // Compute category-specific 5-year and 10-year projected value
            const proj5Y = calculateCompoundWealth(
              cat.monthlyTotal,
              cat.weightedReturnRatePct,
              5,
              cat.totalValuation
            ).projectedWealth;

            const proj10Y = calculateCompoundWealth(
              cat.monthlyTotal,
              cat.weightedReturnRatePct,
              10,
              cat.totalValuation
            ).projectedWealth;

            return (
              <div
                key={type}
                style={{
                  background: "#FFFFFF",
                  border: "2px solid var(--ink, #0A0A0A)",
                  boxShadow: "4px 4px 0 var(--ink, #0A0A0A)",
                  borderRadius: "3px",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                {/* Card Header with Theme */}
                <div
                  style={{
                    background: theme.headerBg,
                    padding: "10px 14px",
                    borderBottom: "2px solid var(--ink, #0A0A0A)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--mono, monospace)",
                      fontSize: "11px",
                      fontWeight: 900,
                      letterSpacing: "0.06em",
                      background: "var(--ink, #0A0A0A)",
                      color: "#FFFFFF",
                      padding: "3px 8px",
                      borderRadius: "2px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span>{theme.icon}</span>
                    <span>{theme.shortLabel}</span>
                  </span>

                  <span
                    style={{
                      fontFamily: "var(--mono, monospace)",
                      fontSize: "10.5px",
                      fontWeight: 900,
                      background: "#FFFFFF",
                      color: "#166534",
                      border: "1.5px solid #000000",
                      padding: "2px 7px",
                      borderRadius: "2px",
                    }}
                  >
                    {cat.weightedReturnRatePct}% CAGR
                  </span>
                </div>

                {/* Card Body */}
                <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                  {/* Total Value in Category */}
                  <div>
                    <div
                      style={{
                        fontFamily: "var(--mono, monospace)",
                        fontSize: "10px",
                        fontWeight: 800,
                        color: "#666666",
                        textTransform: "uppercase",
                      }}
                    >
                      ACCUMULATED VALUE ({cat.valuationSharePct}% OF PORTFOLIO)
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--display, sans-serif)",
                        fontSize: "24px",
                        fontWeight: 900,
                        color: "var(--ink, #0A0A0A)",
                      }}
                    >
                      {formatCurrency(cat.totalValuation, 2, currency)}
                    </div>
                  </div>

                  {/* Monthly Outflow in Category */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      background: "#F8FAFC",
                      border: "1.5px solid rgba(0,0,0,0.1)",
                      padding: "8px 10px",
                      borderRadius: "2px",
                      fontFamily: "var(--mono, monospace)",
                      fontSize: "11px",
                    }}
                  >
                    <span style={{ color: "#475569", fontWeight: 700 }}>Monthly Outflow:</span>
                    <span style={{ fontWeight: 900, color: "var(--ink, #0A0A0A)" }}>
                      {formatCurrency(cat.monthlyTotal, 2, currency)}/mo
                    </span>
                  </div>

                  {/* Asset Count & Status */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontFamily: "var(--mono, monospace)",
                      fontSize: "11px",
                      color: "#555555",
                    }}
                  >
                    <span>Holdings:</span>
                    <span style={{ fontWeight: 800 }}>
                      {cat.count} assets ({cat.activeCount} active{cat.pausedCount > 0 ? `, ${cat.pausedCount} paused` : ""})
                    </span>
                  </div>

                  {/* Category Compound Projections */}
                  <div
                    style={{
                      background: "#F0FDF4",
                      border: "1px solid #BBF7D0",
                      padding: "8px 10px",
                      borderRadius: "2px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontFamily: "var(--mono, monospace)",
                      fontSize: "10.5px",
                    }}
                  >
                    <div>
                      <span style={{ color: "#166534", fontWeight: 700 }}>5Y Proj: </span>
                      <b>{formatCompactCurrency(proj5Y, currency)}</b>
                    </div>
                    <div>
                      <span style={{ color: "#166534", fontWeight: 700 }}>10Y Proj: </span>
                      <b>{formatCompactCurrency(proj10Y, currency)}</b>
                    </div>
                  </div>
                </div>

                {/* Card Footer: Quick filter */}
                {onSelectCategory && (
                  <div
                    style={{
                      borderTop: "1.5px solid var(--ink, #0A0A0A)",
                      padding: "8px 14px",
                      background: "#FAFAFA",
                      display: "flex",
                      justifyContent: "flex-end",
                    }}
                  >
                    <button
                      type="button"
                      style={{
                        fontFamily: "var(--mono, monospace)",
                        fontSize: "10.5px",
                        fontWeight: 900,
                        background: "transparent",
                        border: "1px solid var(--ink, #0A0A0A)",
                        padding: "4px 8px",
                        borderRadius: "2px",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                      onClick={() => {
                        playSound.click();
                        onSelectCategory(type);
                        const el = document.querySelector(".sub-toolbar");
                        if (el) el.scrollIntoView({ behavior: "smooth" });
                      }}
                      title={`Filter cards grid to ${theme.shortLabel}`}
                    >
                      <Filter size={10} aria-hidden="true" />
                      FILTER GRID
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 3. ACCURATE COMPOUND EXPECTED RETURNS & REALTIME HORIZON SIMULATION ── */}
      <div
        style={{
          background: "var(--card, #FFFFFF)",
          border: "2.5px solid var(--ink, #0A0A0A)",
          boxShadow: "4.5px 4.5px 0 var(--ink, #0A0A0A)",
          borderRadius: "4px",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        {/* Simulation Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px",
            borderBottom: "2px solid var(--ink, #0A0A0A)",
            paddingBottom: "18px",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "10.5px",
                fontWeight: 900,
                color: "#666666",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginBottom: "4px",
              }}
            >
              <Sparkles size={13} color="#D97706" aria-hidden="true" />
              ACTUARIAL COMPOUNDING SIMULATOR
            </div>
            <h3
              style={{
                fontFamily: "var(--display, sans-serif)",
                fontSize: "22px",
                fontWeight: 900,
                color: "var(--ink, #0A0A0A)",
                margin: 0,
              }}
            >
              Realtime Expected Returns Engine
            </h3>
            <p
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "11.5px",
                color: "#666666",
                margin: "4px 0 0 0",
              }}
            >
              Compounding starting principal of{" "}
              <b>{formatCurrency(metrics.totalValuation, 2, currency)}</b> plus ongoing{" "}
              <b>{formatCurrency(metrics.monthlyTotal, 2, currency)}/mo</b> monthly contributions.
            </p>
          </div>

          {/* Interactive Simulation Controls: Rate & Inflation */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            {/* Inflation toggle */}
            <button
              type="button"
              onClick={() => {
                playSound.click();
                setIsInflationAdjusted(!isInflationAdjusted);
              }}
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "11px",
                fontWeight: 800,
                padding: "6px 12px",
                border: "1.5px solid var(--ink, #0A0A0A)",
                boxShadow: "2px 2px 0 var(--ink, #0A0A0A)",
                borderRadius: "3px",
                background: isInflationAdjusted ? "#FFE600" : "#FFFFFF",
                color: "var(--ink, #0A0A0A)",
                cursor: "pointer",
              }}
              title="Adjust returns for 6% annual inflation to view purchasing power in today's money"
            >
              {isInflationAdjusted ? "✓ INFLATION (6% REAL)" : "NOMINAL RETURNS"}
            </button>

            {/* CAGR Slider Box */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                background: "rgba(0, 0, 0, 0.04)",
                padding: "6px 12px",
                border: "1.5px solid var(--ink, #0A0A0A)",
                borderRadius: "3px",
                boxShadow: "2px 2px 0 var(--ink, #0A0A0A)",
              }}
            >
              <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px", fontWeight: 800 }}>
                CAGR: <b style={{ color: "#0284C7" }}>{simulatedCagr}%</b>
              </span>
              <input
                type="range"
                min="2"
                max="30"
                step="0.5"
                value={simulatedCagr}
                onChange={(e) => setSimulatedCagr(parseFloat(e.target.value))}
                style={{
                  width: "90px",
                  cursor: "pointer",
                  accentColor: "var(--ink, #0A0A0A)",
                }}
                aria-label="Expected annual return rate"
              />
            </div>
          </div>
        </div>

        {/* Stress-Testing Quick Preset Buttons */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
            fontFamily: "var(--mono, monospace)",
            fontSize: "11px",
          }}
        >
          <span style={{ fontWeight: 800, color: "#666666" }}>CAGR Scenarios:</span>
          <button
            type="button"
            className="sub-filter-btn"
            style={{
              padding: "4px 8px",
              background: simulatedCagr === metrics.weightedReturnRatePct ? "var(--ink, #0A0A0A)" : "#FFFFFF",
              color: simulatedCagr === metrics.weightedReturnRatePct ? "#FFE600" : "var(--ink, #0A0A0A)",
            }}
            onClick={() => handleScenarioChange(metrics.weightedReturnRatePct)}
          >
            Portfolio CAGR ({metrics.weightedReturnRatePct}%)
          </button>
          <button
            type="button"
            className="sub-filter-btn"
            style={{
              padding: "4px 8px",
              background: simulatedCagr === 11.0 ? "var(--ink, #0A0A0A)" : "#FFFFFF",
              color: simulatedCagr === 11.0 ? "#FFE600" : "var(--ink, #0A0A0A)",
            }}
            onClick={() => handleScenarioChange(11.0)}
          >
            Conservative (11%)
          </button>
          <button
            type="button"
            className="sub-filter-btn"
            style={{
              padding: "4px 8px",
              background: simulatedCagr === 14.0 ? "var(--ink, #0A0A0A)" : "#FFFFFF",
              color: simulatedCagr === 14.0 ? "#FFE600" : "var(--ink, #0A0A0A)",
            }}
            onClick={() => handleScenarioChange(14.0)}
          >
            Base Case (14%)
          </button>
          <button
            type="button"
            className="sub-filter-btn"
            style={{
              padding: "4px 8px",
              background: simulatedCagr === 18.0 ? "var(--ink, #0A0A0A)" : "#FFFFFF",
              color: simulatedCagr === 18.0 ? "#FFE600" : "var(--ink, #0A0A0A)",
            }}
            onClick={() => handleScenarioChange(18.0)}
          >
            Bull Run (18%)
          </button>
        </div>

        {/* Horizon Quick Pills & Slider */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            background: "#F8FAFC",
            border: "1.5px solid var(--ink, #0A0A0A)",
            padding: "14px 16px",
            borderRadius: "3px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <div style={{ fontFamily: "var(--mono)", fontSize: "11px", fontWeight: 800 }}>
              SELECT TIME HORIZON: <b style={{ color: "#16A34A", fontSize: "13px" }}>{horizonYears} YEARS</b>
            </div>

            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
              {MILESTONES.map((years) => (
                <button
                  key={years}
                  type="button"
                  onClick={() => handleHorizonChange(years)}
                  style={{
                    fontFamily: "var(--mono, monospace)",
                    fontSize: "11px",
                    fontWeight: 900,
                    padding: "4px 9px",
                    borderRadius: "2px",
                    border: "1.5px solid var(--ink, #0A0A0A)",
                    background: horizonYears === years ? "var(--ink, #0A0A0A)" : "#FFFFFF",
                    color: horizonYears === years ? "#FFE600" : "var(--ink, #0A0A0A)",
                    boxShadow: horizonYears === years ? "2px 2px 0 var(--ink, #0A0A0A)" : "none",
                    cursor: "pointer",
                  }}
                >
                  {years}Y
                </button>
              ))}
            </div>
          </div>

          <input
            type="range"
            min="1"
            max="30"
            step="1"
            value={horizonYears}
            onChange={(e) => setHorizonYears(parseInt(e.target.value, 10))}
            style={{
              width: "100%",
              cursor: "pointer",
              accentColor: "var(--ink, #0A0A0A)",
            }}
            aria-label="Time horizon in years"
          />
        </div>

        {/* Realtime Output Result Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "14px",
          }}
        >
          {/* Projected Wealth */}
          <div
            style={{
              background: "#F0FDF4",
              border: "2px solid #16A34A",
              boxShadow: "3px 3px 0 #16A34A",
              padding: "16px",
              borderRadius: "3px",
            }}
          >
            <div
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "10px",
                fontWeight: 900,
                color: "#15803D",
                textTransform: "uppercase",
              }}
            >
              {horizonYears}-YEAR PROJECTED WEALTH
            </div>
            <div
              style={{
                fontFamily: "var(--display, sans-serif)",
                fontSize: "28px",
                fontWeight: 900,
                color: "#166534",
                lineHeight: 1.1,
                marginTop: "4px",
              }}
            >
              {formatCurrency(activeProjection.projectedWealth, 0, currency)}
            </div>
            <div
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "11px",
                fontWeight: 700,
                color: "#166534",
                marginTop: "4px",
              }}
            >
              {formatCompactCurrency(activeProjection.projectedWealth, currency)}
            </div>
          </div>

          {/* Total Capital Invested */}
          <div
            style={{
              background: "#FFFFFF",
              border: "2px solid var(--ink, #0A0A0A)",
              boxShadow: "3px 3px 0 var(--ink, #0A0A0A)",
              padding: "16px",
              borderRadius: "3px",
            }}
          >
            <div
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "10px",
                fontWeight: 900,
                color: "#475569",
                textTransform: "uppercase",
              }}
            >
              TOTAL CAPITAL INVESTED
            </div>
            <div
              style={{
                fontFamily: "var(--display, sans-serif)",
                fontSize: "26px",
                fontWeight: 900,
                color: "var(--ink, #0A0A0A)",
                lineHeight: 1.1,
                marginTop: "4px",
              }}
            >
              {formatCurrency(activeProjection.totalInvested, 0, currency)}
            </div>
            <div
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "10.5px",
                color: "#666666",
                marginTop: "4px",
              }}
            >
              {formatCurrency(activeProjection.initialPrincipal, 0, currency)} principal +{" "}
              {formatCurrency(activeProjection.futureContributions, 0, currency)} inflows
            </div>
          </div>

          {/* Pure Compound Gains */}
          <div
            style={{
              background: "#FEFCE8",
              border: "2px solid #CA8A04",
              boxShadow: "3px 3px 0 #CA8A04",
              padding: "16px",
              borderRadius: "3px",
            }}
          >
            <div
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "10px",
                fontWeight: 900,
                color: "#854D0E",
                textTransform: "uppercase",
              }}
            >
              EXPECTED COMPOUND GAINS
            </div>
            <div
              style={{
                fontFamily: "var(--display, sans-serif)",
                fontSize: "26px",
                fontWeight: 900,
                color: "#A16207",
                lineHeight: 1.1,
                marginTop: "4px",
              }}
            >
              +{formatCurrency(activeProjection.interestEarned, 0, currency)}
            </div>
            <div
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "11px",
                fontWeight: 800,
                color: "#854D0E",
                marginTop: "4px",
              }}
            >
              +{activeProjection.totalInvested > 0
                ? ((activeProjection.interestEarned / activeProjection.totalInvested) * 100).toFixed(0)
                : 0}
              % pure returns generated
            </div>
          </div>

          {/* Wealth Multiplier */}
          <div
            style={{
              background: "#EFF6FF",
              border: "2px solid #2563EB",
              boxShadow: "3px 3px 0 #2563EB",
              padding: "16px",
              borderRadius: "3px",
            }}
          >
            <div
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "10px",
                fontWeight: 900,
                color: "#1E40AF",
                textTransform: "uppercase",
              }}
            >
              WEALTH MULTIPLIER
            </div>
            <div
              style={{
                fontFamily: "var(--display, sans-serif)",
                fontSize: "28px",
                fontWeight: 900,
                color: "#1D4ED8",
                lineHeight: 1.1,
                marginTop: "4px",
              }}
            >
              {activeProjection.wealthMultiplier}x
            </div>
            <div
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "11px",
                fontWeight: 700,
                color: "#1E40AF",
                marginTop: "4px",
              }}
            >
              Every {currency}1 invested becomes {currency}{activeProjection.wealthMultiplier.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Visual Milestone Growth Trajectory Chart */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontFamily: "var(--mono, monospace)",
              fontSize: "11px",
              fontWeight: 800,
              color: "#555555",
            }}
          >
            <span>MILESTONE GROWTH TRAJECTORY</span>
            <span style={{ fontSize: "10px" }}>Click any bar to jump to that year</span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${milestoneProjections.length}, 1fr)`,
              alignItems: "flex-end",
              height: "190px",
              gap: "8px",
              paddingTop: "24px",
              borderBottom: "2px solid var(--ink, #0A0A0A)",
            }}
          >
            {milestoneProjections.map((item) => {
              const heightPct = Math.min(100, Math.max(10, (item.projectedWealth / maxMilestoneWealth) * 100));
              const investedHeightPct = Math.min(100, Math.max(4, (item.totalInvested / maxMilestoneWealth) * 100));
              const isSelected = horizonYears === item.years;

              return (
                <div
                  key={item.years}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    height: "100%",
                    justifyContent: "flex-end",
                    cursor: "pointer",
                    position: "relative",
                  }}
                  onClick={() => handleHorizonChange(item.years)}
                  title={`${item.years}Y: Projected ${formatCurrency(item.projectedWealth, 0, currency)} (Invested: ${formatCurrency(item.totalInvested, 0, currency)})`}
                >
                  {/* Projected Value label above bar on select */}
                  {isSelected && (
                    <div
                      style={{
                        position: "absolute",
                        top: `calc(${100 - heightPct}% - 24px)`,
                        fontFamily: "var(--mono)",
                        fontSize: "10.5px",
                        fontWeight: 900,
                        background: "var(--ink, #0A0A0A)",
                        color: "#FFE600",
                        padding: "2px 6px",
                        borderRadius: "2px",
                        whiteSpace: "nowrap",
                        zIndex: 2,
                        boxShadow: "2px 2px 0 rgba(0,0,0,0.3)",
                      }}
                    >
                      {formatCompactCurrency(item.projectedWealth, currency)}
                    </div>
                  )}

                  {/* Stacked Compound Bar */}
                  <div
                    style={{
                      width: "100%",
                      maxWidth: "48px",
                      height: `${heightPct}%`,
                      background: isSelected ? "#16A34A" : "#34D399",
                      border: "1.5px solid var(--ink, #0A0A0A)",
                      borderBottom: "none",
                      borderRadius: "3px 3px 0 0",
                      position: "relative",
                      transition: "all 0.15s ease",
                      boxShadow: isSelected ? "3px 0 0 var(--ink, #0A0A0A)" : "none",
                    }}
                  >
                    {/* Capital portion inside bar */}
                    <div
                      style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: `${(investedHeightPct / heightPct) * 100}%`,
                        background: isSelected ? "#0A0A0A" : "#334155",
                        borderTop: "1px solid rgba(255, 255, 255, 0.4)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* X-Axis Milestone Labels */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${milestoneProjections.length}, 1fr)`,
              textAlign: "center",
              fontFamily: "var(--mono)",
              fontSize: "10.5px",
              fontWeight: 800,
            }}
          >
            {milestoneProjections.map((item) => (
              <div
                key={item.years}
                style={{
                  color: horizonYears === item.years ? "var(--ink, #0A0A0A)" : "#666666",
                  fontWeight: horizonYears === item.years ? 900 : 700,
                }}
              >
                {item.years}Y
              </div>
            ))}
          </div>

          {/* Legend */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
              fontSize: "11px",
              fontFamily: "var(--mono)",
              color: "#555555",
              background: "rgba(0, 0, 0, 0.02)",
              padding: "8px 12px",
              border: "1px solid rgba(0, 0, 0, 0.1)",
              borderRadius: "2px",
            }}
          >
            <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "10px", height: "10px", background: "#0A0A0A", display: "inline-block", border: "1px solid #000" }} />
                <span>Capital Invested (Principal + Inflow)</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "10px", height: "10px", background: "#16A34A", display: "inline-block", border: "1px solid #000" }} />
                <span>Compound Returns</span>
              </div>
            </div>

            <div>
              Investing <b>{formatCurrency(metrics.monthlyTotal, 0, currency)}/mo</b> with{" "}
              <b>{formatCurrency(metrics.totalValuation, 0, currency)}</b> starting capital at {simulatedCagr}% CAGR yields{" "}
              <b style={{ color: "#166534" }}>{formatCurrency(activeProjection.projectedWealth, 0, currency)}</b> in {horizonYears} years.
            </div>
          </div>
        </div>

        {/* Milestone Projections Matrix (Full Data Table) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "11px",
              fontWeight: 800,
              color: "#555555",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Calendar size={13} aria-hidden="true" />
            ACTUARIAL MILESTONE PROJECTIONS TABLE
          </div>

          <div
            style={{
              overflowX: "auto",
              border: "2px solid var(--ink, #0A0A0A)",
              borderRadius: "3px",
              boxShadow: "2px 2px 0 var(--ink, #0A0A0A)",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontFamily: "var(--mono, monospace)",
                fontSize: "11.5px",
                textAlign: "right",
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "var(--ink, #0A0A0A)",
                    color: "#FFFFFF",
                    fontWeight: 900,
                    textTransform: "uppercase",
                    fontSize: "10.5px",
                  }}
                >
                  <th style={{ padding: "8px 12px", textAlign: "left" }}>Horizon</th>
                  <th style={{ padding: "8px 12px" }}>Future Contributions</th>
                  <th style={{ padding: "8px 12px" }}>Total Invested</th>
                  <th style={{ padding: "8px 12px" }}>Expected Gains</th>
                  <th style={{ padding: "8px 12px" }}>Projected Wealth</th>
                  <th style={{ padding: "8px 12px" }}>Multiple</th>
                </tr>
              </thead>
              <tbody>
                {milestoneProjections.map((p, idx) => {
                  const isCurrent = horizonYears === p.years;
                  return (
                    <tr
                      key={p.years}
                      onClick={() => handleHorizonChange(p.years)}
                      style={{
                        background: isCurrent ? "#FEF08A" : idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC",
                        cursor: "pointer",
                        fontWeight: isCurrent ? 900 : 700,
                        borderBottom: "1px solid rgba(0,0,0,0.1)",
                        color: "var(--ink, #0A0A0A)",
                      }}
                    >
                      <td style={{ padding: "8px 12px", textAlign: "left" }}>
                        {isCurrent ? "▶ " : ""}
                        {p.years} {p.years === 1 ? "Year" : "Years"}
                      </td>
                      <td style={{ padding: "8px 12px" }}>
                        {formatCurrency(p.futureContributions, 0, currency)}
                      </td>
                      <td style={{ padding: "8px 12px" }}>
                        {formatCurrency(p.totalInvested, 0, currency)}
                      </td>
                      <td style={{ padding: "8px 12px", color: "#15803D" }}>
                        +{formatCurrency(p.interestEarned, 0, currency)}
                      </td>
                      <td style={{ padding: "8px 12px", fontWeight: 900, color: "#166534" }}>
                        {formatCurrency(p.projectedWealth, 0, currency)}
                      </td>
                      <td style={{ padding: "8px 12px" }}>
                        <span
                          style={{
                            background: isCurrent ? "#000000" : "rgba(0,0,0,0.06)",
                            color: isCurrent ? "#FFE600" : "var(--ink, #0A0A0A)",
                            padding: "2px 6px",
                            borderRadius: "2px",
                          }}
                        >
                          {p.wealthMultiplier}x
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
