"use client";

import React, { useState, useMemo } from "react";
import { FinancialSubscriptionRow, SubscriptionCategory, CATEGORY_THEMES } from "@/lib/ledger/types";
import { normalizeCadenceToMonthly } from "@/lib/ledger/subscriptionMetrics";
import { formatCurrency, getCurrencySymbol } from "@/lib/ledger/formatters";

interface SubscriptionBreakdownChartProps {
  subscriptions: FinancialSubscriptionRow[];
  onSelectCategory?: (cat: string) => void;
  currency?: string;
}

export const SubscriptionBreakdownChart: React.FC<SubscriptionBreakdownChartProps> = ({
  subscriptions,
  onSelectCategory,
  currency = "INR",
}) => {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  const activeSubs = useMemo(
    () => subscriptions.filter((s) => s.status === "ACTIVE" || s.status === "TRIAL"),
    [subscriptions]
  );

  const totalMonthlyBurn = useMemo(
    () => activeSubs.reduce((sum, s) => sum + normalizeCadenceToMonthly(s.amount, s.cadence as any), 0),
    [activeSubs]
  );

  const categoryStats = useMemo(() => {
    const map: Record<string, { totalMonthly: number; count: number }> = {};
    for (const sub of activeSubs) {
      const cat = sub.category || "OTHER";
      if (!map[cat]) map[cat] = { totalMonthly: 0, count: 0 };
      map[cat].totalMonthly += normalizeCadenceToMonthly(sub.amount, sub.cadence as any);
      map[cat].count += 1;
    }

    return Object.entries(map)
      .map(([category, data]) => {
        const theme = CATEGORY_THEMES[category as SubscriptionCategory] || CATEGORY_THEMES.OTHER;
        const pct = totalMonthlyBurn > 0 ? (data.totalMonthly / totalMonthlyBurn) * 100 : 0;
        return {
          category,
          totalMonthly: data.totalMonthly,
          yearly: data.totalMonthly * 12,
          count: data.count,
          pct,
          theme,
        };
      })
      .sort((a, b) => b.totalMonthly - a.totalMonthly);
  }, [activeSubs, totalMonthlyBurn]);

  if (activeSubs.length === 0 || totalMonthlyBurn === 0) return null;

  // Donut geometry
  const size = 200;
  const center = size / 2;
  const radius = 80;
  const innerRadius = 55;

  let currentAngle = -Math.PI / 2; // start at top

  const slices = categoryStats.map((item) => {
    const sliceAngle = (item.pct / 100) * (2 * Math.PI);
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    currentAngle = endAngle;

    const x1 = center + radius * Math.cos(startAngle);
    const y1 = center + radius * Math.sin(startAngle);
    const x2 = center + radius * Math.cos(endAngle);
    const y2 = center + radius * Math.sin(endAngle);

    const x3 = center + innerRadius * Math.cos(endAngle);
    const y3 = center + innerRadius * Math.sin(endAngle);
    const x4 = center + innerRadius * Math.cos(startAngle);
    const y4 = center + innerRadius * Math.sin(startAngle);

    const largeArc = sliceAngle > Math.PI ? 1 : 0;

    const pathData = [
      `M ${x1.toFixed(2)} ${y1.toFixed(2)}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`,
      `L ${x3.toFixed(2)} ${y3.toFixed(2)}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4.toFixed(2)} ${y4.toFixed(2)}`,
      "Z",
    ].join(" ");

    return {
      ...item,
      pathData,
    };
  });

  const activeItem = hoveredCategory ? categoryStats.find((c) => c.category === hoveredCategory) : null;

  return (
    <div className="flight-deck-panel">
      {/* ── Terminal Flight Rail ── */}
      <div className="flight-deck-rail">
        <div className="flight-deck-rail-left">
          <span className="deck-dot dot-red" />
          <span className="deck-dot dot-yellow" />
          <span className="deck-dot dot-green" />
          <span className="flight-deck-rail-title">// RECURRING_BURN_COMPOSITION</span>
        </div>
        <div className="flight-deck-rail-right">
          <span className="deck-count-pill" style={{ fontSize: "9.5px", padding: "1px 6px" }}>
            {categoryStats.length} CATEGORIES
          </span>
        </div>
      </div>

      <div className="flight-deck-content">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div>
            <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "10px", fontWeight: 900, textTransform: "uppercase", color: "#666666", letterSpacing: "0.06em", marginBottom: "2px" }}>
              CATEGORY VELOCITY DISTRIBUTION
            </div>
            <div style={{ fontFamily: "var(--display, sans-serif)", fontSize: "20px", fontWeight: 900, letterSpacing: "-0.02em" }}>
              Recurring Burn Distribution
            </div>
          </div>

          <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px", fontWeight: 800, color: "#7C4DFF" }}>
            TOTAL {formatCurrency(totalMonthlyBurn, 0, currency)}/MO
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "24px", alignItems: "center" }}>
          {/* SVG Donut */}
          <div style={{ position: "relative", width: `${size}px`, height: `${size}px`, margin: "0 auto" }}>
            <svg viewBox={`0 0 ${size} ${size}`} style={{ width: "100%", height: "100%", overflow: "visible" }}>
              {slices.map((slice) => {
                const isHovered = hoveredCategory === slice.category;
                return (
                  <path
                    key={slice.category}
                    d={slice.pathData}
                    fill={slice.theme.headerBg || "#0A0A0A"}
                    stroke="#0A0A0A"
                    strokeWidth="2.5"
                    style={{
                      cursor: "pointer",
                      transition: "transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.15s ease",
                      transformOrigin: `${center}px ${center}px`,
                      transform: isHovered ? "scale(1.06)" : "scale(1)",
                      opacity: hoveredCategory && !isHovered ? 0.4 : 1,
                    }}
                    onMouseEnter={() => setHoveredCategory(slice.category)}
                    onMouseLeave={() => setHoveredCategory(null)}
                    onClick={() => onSelectCategory && onSelectCategory(slice.category)}
                  />
                );
              })}
            </svg>

            {/* Inverted Tactile Center Donut Readout */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
              }}
            >
              <div
                style={{
                  width: "90px",
                  height: "90px",
                  borderRadius: "50%",
                  background: "#0A0A0A",
                  color: "#FFFFFF",
                  border: "2.5px solid #000000",
                  boxShadow: "2px 2px 0 rgba(0, 0, 0, 0.35)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "4px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "8.5px", fontWeight: 900, color: "#FFE600", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {activeItem ? activeItem.theme.label.slice(0, 10) : "BURN"}
                </div>
                <div style={{ fontFamily: "var(--display, sans-serif)", fontSize: "17px", fontWeight: 900, color: "#FFFFFF", lineHeight: 1.1 }}>
                  {formatCurrency(activeItem ? activeItem.totalMonthly : totalMonthlyBurn, 0, currency)}
                </div>
                <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "9px", fontWeight: 900, color: "#00FF66" }}>
                  {activeItem ? `${activeItem.pct.toFixed(0)}%` : "/ MO"}
                </div>
              </div>
            </div>
          </div>

          {/* Category Breakdown Progress Bars & Legend */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {categoryStats.map((item) => {
              const isHovered = hoveredCategory === item.category;
              return (
                <div
                  key={item.category}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                    padding: "6px 8px",
                    borderRadius: "2px",
                    border: isHovered ? "1.5px solid var(--ink, #0A0A0A)" : "1.5px solid transparent",
                    background: isHovered ? "#FFFDF7" : "transparent",
                    boxShadow: isHovered ? "2px 2px 0 var(--ink, #0A0A0A)" : "none",
                    cursor: "pointer",
                    transition: "all 0.12s ease",
                  }}
                  onMouseEnter={() => setHoveredCategory(item.category)}
                  onMouseLeave={() => setHoveredCategory(null)}
                  onClick={() => onSelectCategory && onSelectCategory(item.category)}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: "var(--mono, monospace)", fontSize: "11px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <div
                        style={{
                          width: "12px",
                          height: "12px",
                          background: item.theme.headerBg,
                          border: "1.5px solid #000000",
                          boxShadow: "1px 1px 0 #000000",
                          borderRadius: "2px",
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontWeight: 900 }}>{item.theme.label}</span>
                      <span style={{ color: "#777777", fontSize: "9.5px", fontWeight: 800 }}>({item.count})</span>
                    </div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "baseline" }}>
                      <span style={{ fontWeight: 900 }}>
                        {formatCurrency(item.totalMonthly, 2, currency)}/mo
                      </span>
                      <span
                        style={{
                          fontSize: "9px",
                          fontWeight: 900,
                          padding: "1px 5px",
                          background: "#0A0A0A",
                          color: "#FFE600",
                          borderRadius: "2px",
                        }}
                      >
                        {item.pct.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Tactile Mini Level Meter */}
                  <div
                    style={{
                      width: "100%",
                      height: "7px",
                      background: "#F4F4F5",
                      border: "1.5px solid var(--ink, #0A0A0A)",
                      boxShadow: "1px 1px 0 var(--ink, #0A0A0A)",
                      borderRadius: "2px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${item.pct}%`,
                        height: "100%",
                        background: item.theme.headerBg,
                        transition: "width 0.2s ease",
                      }}
                    />
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
