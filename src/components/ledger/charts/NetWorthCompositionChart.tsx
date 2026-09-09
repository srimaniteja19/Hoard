"use client";

import React, { useState } from "react";
import { NetWorthSummary, FinancialAssetRow } from "@/lib/ledger/types";
import { formatCurrency } from "@/lib/ledger/formatters";

interface NetWorthCompositionChartProps {
  netWorth: NetWorthSummary;
  assets: FinancialAssetRow[];
  currency?: string;
}

export const NetWorthCompositionChart: React.FC<NetWorthCompositionChartProps> = ({
  netWorth,
  assets,
  currency = "INR",
}) => {
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);

  const {
    totalAssets,
    totalLiabilities,
    netWorth: netValue,
    totalLiquidCash,
    totalInvestments,
    totalRetirement,
    totalRealEstate,
    totalCrypto,
  } = netWorth;

  if (totalAssets === 0 && totalLiabilities === 0) return null;

  const categories = [
    { label: "Liquid Cash & HYSA", value: totalLiquidCash, color: "#00F0FF", icon: "💳" },
    { label: "Brokerage & Equities", value: totalInvestments, color: "#FFE600", icon: "📊" },
    { label: "401(k) & Retirement", value: totalRetirement, color: "#C084FC", icon: "🏛️" },
    { label: "Real Estate & Property", value: totalRealEstate, color: "#34D399", icon: "🏡" },
    { label: "Crypto Assets", value: totalCrypto, color: "#FF2E93", icon: "🪙" },
  ].filter((c) => c.value > 0);

  const debtToAssetRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;
  const liquidRatio = totalAssets > 0 ? (totalLiquidCash / totalAssets) * 100 : 0;

  return (
    <div className="flight-deck-panel">
      {/* ── Terminal Flight Rail ── */}
      <div className="flight-deck-rail">
        <div className="flight-deck-rail-left">
          <span className="deck-dot dot-red" />
          <span className="deck-dot dot-yellow" />
          <span className="deck-dot dot-green" />
          <span className="flight-deck-rail-title">// ASSET_ALLOCATION_MATRIX</span>
        </div>
        <div className="flight-deck-rail-right">
          <span
            className="kpi-status-chip"
            style={{
              background: debtToAssetRatio > 50 ? "#FEE2E2" : "#DCFCE7",
              color: debtToAssetRatio > 50 ? "#991B1B" : "#166534",
              borderColor: debtToAssetRatio > 50 ? "#DC2626" : "#16A34A",
              fontSize: "9px",
              padding: "1px 6px",
            }}
          >
            {debtToAssetRatio.toFixed(1)}% DEBT-TO-ASSET
          </span>
          <span
            className="kpi-status-chip"
            style={{
              background: "#E0F2FE",
              color: "#0369A1",
              borderColor: "#0284C7",
              fontSize: "9px",
              padding: "1px 6px",
            }}
          >
            {liquidRatio.toFixed(0)}% LIQUID
          </span>
        </div>
      </div>

      <div className="flight-deck-content">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "10px", fontWeight: 900, textTransform: "uppercase", color: "#666666", letterSpacing: "0.06em", marginBottom: "2px" }}>
              PORTFOLIO DIVERSIFICATION &amp; SOLVENCY
            </div>
            <div style={{ fontFamily: "var(--display, sans-serif)", fontSize: "20px", fontWeight: 900, letterSpacing: "-0.02em" }}>
              Asset Allocation &amp; Balance Sheet Composition
            </div>
          </div>

          <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px", fontWeight: 800, color: "#166534" }}>
            NET ASSETS {formatCurrency(totalAssets, 0, currency)}
          </div>
        </div>

        {/* ── Segmented Stacked Bar Visual ── */}
        <div>
          <div
            className="meter-level-track"
            style={{
              display: "flex",
              height: "24px",
              marginBottom: "14px",
            }}
          >
            {categories.map((cat) => {
              const pct = totalAssets > 0 ? (cat.value / totalAssets) * 100 : 0;
              const isHovered = hoveredSegment === cat.label;
              return (
                <div
                  key={cat.label}
                  style={{
                    width: `${pct}%`,
                    background: cat.color,
                    borderRight: "1.5px solid #000000",
                    cursor: "pointer",
                    transition: "opacity 0.15s ease",
                    opacity: hoveredSegment && !isHovered ? 0.35 : 1,
                    height: "100%",
                  }}
                  onMouseEnter={() => setHoveredSegment(cat.label)}
                  onMouseLeave={() => setHoveredSegment(null)}
                  title={`${cat.label}: ${formatCurrency(cat.value, 0, currency)} (${pct.toFixed(1)}%)`}
                />
              );
            })}
          </div>

          {/* Legend grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "10px" }}>
            {categories.map((cat) => {
              const pct = totalAssets > 0 ? (cat.value / totalAssets) * 100 : 0;
              const isHovered = hoveredSegment === cat.label;
              return (
                <div
                  key={cat.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    border: isHovered ? "2px solid var(--ink, #0A0A0A)" : "1.5px solid var(--ink, #0A0A0A)",
                    boxShadow: isHovered ? "3.5px 3.5px 0 var(--ink, #0A0A0A)" : "2px 2px 0 var(--ink, #0A0A0A)",
                    borderRadius: "2px",
                    background: isHovered ? "#FFFDF7" : "#FFFFFF",
                    cursor: "pointer",
                    transition: "all 0.1s ease",
                  }}
                  onMouseEnter={() => setHoveredSegment(cat.label)}
                  onMouseLeave={() => setHoveredSegment(null)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "7px", fontFamily: "var(--mono, monospace)", fontSize: "11px" }}>
                    <div
                      style={{
                        width: "12px",
                        height: "12px",
                        background: cat.color,
                        border: "1.5px solid #000000",
                        borderRadius: "2px",
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontWeight: 800 }}>{cat.label.split(" ")[0]}</span>
                  </div>
                  <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px" }}>
                    <b>{formatCurrency(cat.value, 0, currency)}</b>{" "}
                    <span style={{ color: "#777777", fontSize: "10px", fontWeight: 800 }}>({pct.toFixed(0)}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
