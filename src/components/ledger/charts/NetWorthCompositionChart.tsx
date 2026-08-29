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
    <div
      style={{
        background: "var(--card, #FFFFFF)",
        border: "1.5px solid var(--ink, #0A0A0A)",
        boxShadow: "3px 3px 0 var(--ink, #0A0A0A)",
        padding: "20px 24px",
        borderRadius: "3px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "10.5px", fontWeight: 800, textTransform: "uppercase", color: "#666666", marginBottom: "2px" }}>
            PORTFOLIO DIVERSIFICATION
          </div>
          <div style={{ fontFamily: "var(--display, sans-serif)", fontSize: "20px", fontWeight: 900 }}>
            Asset Allocation &amp; Solvency
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <span
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "10.5px",
              fontWeight: 800,
              padding: "2px 8px",
              background: debtToAssetRatio > 50 ? "#FEE2E2" : "#DCFCE7",
              color: debtToAssetRatio > 50 ? "#991B1B" : "#166534",
              border: "1px solid currentColor",
              borderRadius: "2px",
            }}
          >
            {debtToAssetRatio.toFixed(1)}% DEBT-TO-ASSET
          </span>
          <span
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "10.5px",
              fontWeight: 800,
              padding: "2px 8px",
              background: "#E0F2FE",
              color: "#0369A1",
              border: "1px solid #0284C7",
              borderRadius: "2px",
            }}
          >
            {liquidRatio.toFixed(0)}% LIQUID
          </span>
        </div>
      </div>

      {/* ── Segmented Stacked Bar Visual ── */}
      <div>
        <div
          style={{
            display: "flex",
            height: "22px",
            border: "1.5px solid var(--ink, #0A0A0A)",
            borderRadius: "2px",
            overflow: "hidden",
            marginBottom: "12px",
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
                  borderRight: "1px solid #000000",
                  cursor: "pointer",
                  transition: "opacity 0.15s ease",
                  opacity: hoveredSegment && !isHovered ? 0.4 : 1,
                }}
                onMouseEnter={() => setHoveredSegment(cat.label)}
                onMouseLeave={() => setHoveredSegment(null)}
                title={`${cat.label}: ${formatCurrency(cat.value, 0, currency)} (${pct.toFixed(1)}%)`}
              />
            );
          })}
        </div>

        {/* Legend grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px" }}>
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
                  padding: "6px 10px",
                  border: "1px solid rgba(0, 0, 0, 0.1)",
                  borderRadius: "2px",
                  background: isHovered ? "rgba(0, 0, 0, 0.04)" : "transparent",
                  cursor: "pointer",
                }}
                onMouseEnter={() => setHoveredSegment(cat.label)}
                onMouseLeave={() => setHoveredSegment(null)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontFamily: "var(--mono, monospace)", fontSize: "11px" }}>
                  <div style={{ width: "10px", height: "10px", background: cat.color, border: "1px solid #000000" }} />
                  <span style={{ fontWeight: 800 }}>{cat.label.split(" ")[0]}</span>
                </div>
                <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px" }}>
                  <b>{formatCurrency(cat.value, 0, currency)}</b> <span style={{ color: "#777777", fontSize: "10px" }}>({pct.toFixed(0)}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
