"use client";

import React, { useState } from "react";
import { formatCurrency, formatCompactCurrency } from "@/lib/ledger/formatters";
import { calculateCompoundWealth } from "@/lib/ledger/investmentMetrics";
import { Sparkles, TrendingUp, Compass } from "lucide-react";

interface InvestmentCompoundingChartProps {
  monthlyInvestment: number;
  initialReturnRate: number;
  initialPrincipal?: number;
  currency?: string;
}

const MILESTONES = [1, 3, 5, 10, 15, 20, 25, 30];

export const InvestmentCompoundingChart: React.FC<InvestmentCompoundingChartProps> = ({
  monthlyInvestment,
  initialReturnRate,
  initialPrincipal = 0,
  currency = "INR",
}) => {
  const [returnRate, setReturnRate] = useState<number>(
    initialReturnRate > 0 ? initialReturnRate : 10.0
  );
  const [hoveredYear, setHoveredYear] = useState<number | null>(10);

  const projectionData = MILESTONES.map((years) => {
    const { totalInvested, projectedWealth, interestEarned } = calculateCompoundWealth(
      monthlyInvestment,
      returnRate,
      years,
      initialPrincipal
    );
    return {
      years,
      totalInvested,
      projectedWealth,
      interestEarned,
    };
  });

  const maxWealth = Math.max(
    ...projectionData.map((d) => d.projectedWealth),
    1000
  );

  const activePoint =
    projectionData.find((d) => d.years === hoveredYear) || projectionData[3] || projectionData[0];

  return (
    <div
      style={{
        background: "var(--card, #FFFFFF)",
        border: "2px solid var(--ink, #0A0A0A)",
        boxShadow: "4px 4px 0 var(--ink, #0A0A0A)",
        padding: "22px 24px",
        borderRadius: "4px",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
      }}
    >
      {/* Header with Title and CAGR Slider */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          borderBottom: "1.5px dashed rgba(0, 0, 0, 0.15)",
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
            <TrendingUp size={13} aria-hidden="true" />
            COMPOUND WEALTH ACCELERATOR & HORIZON
          </div>
          <h3
            style={{
              fontFamily: "var(--display, sans-serif)",
              fontSize: "20px",
              fontWeight: 900,
              margin: 0,
              color: "var(--ink, #0A0A0A)",
            }}
          >
            Periodic Capital Accumulation Simulation
          </h3>
        </div>

        {/* Expected Return Rate Adjuster */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "rgba(0, 0, 0, 0.04)", padding: "6px 12px", border: "1.5px solid var(--ink, #0A0A0A)", borderRadius: "3px" }}>
          <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px", fontWeight: 800 }}>
            Simulated Return: <b style={{ color: "#0284C7" }}>{returnRate}% CAGR</b>
          </span>
          <input
            type="range"
            min="4"
            max="25"
            step="0.5"
            value={returnRate}
            onChange={(e) => setReturnRate(parseFloat(e.target.value))}
            style={{
              width: "90px",
              cursor: "pointer",
              accentColor: "var(--ink, #0A0A0A)",
            }}
            aria-label="Expected annual return rate"
          />
        </div>
      </div>

      {/* Active Milestone Highlight Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "12px",
        }}
      >
        <div
          style={{
            background: "#F0FDF4",
            border: "1.5px solid #16A34A",
            boxShadow: "2.5px 2.5px 0 #16A34A",
            padding: "12px 16px",
            borderRadius: "3px",
          }}
        >
          <div style={{ fontFamily: "var(--mono)", fontSize: "10px", fontWeight: 900, color: "#15803D", textTransform: "uppercase" }}>
            {activePoint.years}-YEAR PROJECTED WEALTH
          </div>
          <div style={{ fontFamily: "var(--display)", fontSize: "26px", fontWeight: 900, color: "#166534" }}>
            {formatCurrency(activePoint.projectedWealth, 0, currency)}
          </div>
        </div>

        <div
          style={{
            background: "#F8FAFC",
            border: "1.5px solid var(--ink, #0A0A0A)",
            boxShadow: "2.5px 2.5px 0 var(--ink, #0A0A0A)",
            padding: "12px 16px",
            borderRadius: "3px",
          }}
        >
          <div style={{ fontFamily: "var(--mono)", fontSize: "10px", fontWeight: 800, color: "#475569", textTransform: "uppercase" }}>
            TOTAL CAPITAL INVESTED
          </div>
          <div style={{ fontFamily: "var(--display)", fontSize: "24px", fontWeight: 900, color: "var(--ink, #0A0A0A)" }}>
            {formatCurrency(activePoint.totalInvested, 0, currency)}
          </div>
        </div>

        <div
          style={{
            background: "#FEFCE8",
            border: "1.5px solid #CA8A04",
            boxShadow: "2.5px 2.5px 0 #CA8A04",
            padding: "12px 16px",
            borderRadius: "3px",
          }}
        >
          <div style={{ fontFamily: "var(--mono)", fontSize: "10px", fontWeight: 900, color: "#854D0E", textTransform: "uppercase" }}>
            COMPOUND GAINS / MULTIPLIER
          </div>
          <div style={{ fontFamily: "var(--display)", fontSize: "24px", fontWeight: 900, color: "#A16207" }}>
            +{formatCurrency(activePoint.interestEarned, 0, currency)}{" "}
            <span style={{ fontSize: "12px", fontFamily: "var(--mono)", fontWeight: 800, color: "#854D0E" }}>
              ({(activePoint.projectedWealth / Math.max(1, activePoint.totalInvested)).toFixed(1)}x)
            </span>
          </div>
        </div>
      </div>

      {/* Visual Milestone Growth Trajectory Chart */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${projectionData.length}, 1fr)`,
            alignItems: "flex-end",
            height: "170px",
            gap: "8px",
            paddingTop: "20px",
            borderBottom: "2px solid var(--ink, #0A0A0A)",
          }}
        >
          {projectionData.map((item) => {
            const heightPct = Math.min(100, Math.max(8, (item.projectedWealth / maxWealth) * 100));
            const investedHeightPct = Math.min(100, Math.max(4, (item.totalInvested / maxWealth) * 100));
            const isSelected = hoveredYear === item.years;

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
                onMouseEnter={() => setHoveredYear(item.years)}
                onClick={() => setHoveredYear(item.years)}
              >
                {/* Projected Value label above bar on select */}
                {isSelected && (
                  <div
                    style={{
                      position: "absolute",
                      top: `calc(${100 - heightPct}% - 22px)`,
                      fontFamily: "var(--mono)",
                      fontSize: "10px",
                      fontWeight: 900,
                      background: "var(--ink, #0A0A0A)",
                      color: "#FFE600",
                      padding: "2px 6px",
                      borderRadius: "2px",
                      whiteSpace: "nowrap",
                      zIndex: 2,
                    }}
                  >
                    {formatCompactCurrency(item.projectedWealth, currency)}
                  </div>
                )}

                {/* Stacked Compound Bar */}
                <div
                  style={{
                    width: "100%",
                    maxWidth: "46px",
                    height: `${heightPct}%`,
                    background: isSelected ? "#16A34A" : "#34D399",
                    border: "1.5px solid var(--ink, #0A0A0A)",
                    borderBottom: "none",
                    borderRadius: "3px 3px 0 0",
                    position: "relative",
                    transition: "all 0.15s ease",
                    boxShadow: isSelected ? "2px 0 0 var(--ink, #0A0A0A)" : "none",
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
                    title={`Capital: ${formatCurrency(item.totalInvested, 0, currency)}`}
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
            gridTemplateColumns: `repeat(${projectionData.length}, 1fr)`,
            textAlign: "center",
            fontFamily: "var(--mono)",
            fontSize: "10px",
            fontWeight: 800,
            color: "#666666",
          }}
        >
          {projectionData.map((item) => (
            <div
              key={item.years}
              style={{
                color: hoveredYear === item.years ? "var(--ink, #0A0A0A)" : "#666666",
                fontWeight: hoveredYear === item.years ? 900 : 700,
              }}
            >
              {item.years}Y
            </div>
          ))}
        </div>
      </div>

      {/* Legend & Insight Footer */}
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
            <span>Capital Contributed</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "10px", height: "10px", background: "#16A34A", display: "inline-block", border: "1px solid #000" }} />
            <span>Compounded Returns</span>
          </div>
        </div>

        <div>
          Investing <b>{formatCurrency(monthlyInvestment, 0)}/mo</b> at {returnRate}% CAGR turns into{" "}
          <b style={{ color: "#166534" }}>{formatCurrency(projectionData[3]?.projectedWealth || 0, 0, currency)}</b> in 10 years.
        </div>
      </div>
    </div>
  );
};
