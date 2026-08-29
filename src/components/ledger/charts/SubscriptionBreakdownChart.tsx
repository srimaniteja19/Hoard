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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "10.5px", fontWeight: 800, textTransform: "uppercase", color: "#666666", marginBottom: "2px" }}>
            RECURRING BURN COMPOSITION
          </div>
          <div style={{ fontFamily: "var(--display, sans-serif)", fontSize: "20px", fontWeight: 900 }}>
            Category Distribution
          </div>
        </div>

        <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px", fontWeight: 700 }}>
          {categoryStats.length} Categories
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: "24px", alignItems: "center" }}>
        {/* SVG Donut */}
        <div style={{ position: "relative", width: `${size}px`, height: `${size}px`, margin: "0 auto" }}>
          <svg viewBox={`0 0 ${size} ${size}`} style={{ width: "100%", height: "100%" }}>
            {slices.map((slice) => {
              const isHovered = hoveredCategory === slice.category;
              return (
                <path
                  key={slice.category}
                  d={slice.pathData}
                  fill={slice.theme.headerBg || "#0A0A0A"}
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  style={{
                    cursor: "pointer",
                    transition: "transform 0.15s ease, opacity 0.15s ease",
                    transformOrigin: `${center}px ${center}px`,
                    transform: isHovered ? "scale(1.04)" : "scale(1)",
                    opacity: hoveredCategory && !isHovered ? 0.45 : 1,
                  }}
                  onMouseEnter={() => setHoveredCategory(slice.category)}
                  onMouseLeave={() => setHoveredCategory(null)}
                  onClick={() => onSelectCategory && onSelectCategory(slice.category)}
                />
              );
            })}
          </svg>

          {/* Center Donut Readout */}
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
            <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "9px", fontWeight: 800, color: "#666666", textTransform: "uppercase" }}>
              {activeItem ? activeItem.theme.label : "MONTHLY BURN"}
            </div>
            <div style={{ fontFamily: "var(--display, sans-serif)", fontSize: "20px", fontWeight: 900 }}>
              {formatCurrency(activeItem ? activeItem.totalMonthly : totalMonthlyBurn, 0, currency)}
            </div>
            <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "9.5px", fontWeight: 800, color: "#16A34A" }}>
              {activeItem ? `${activeItem.pct.toFixed(0)}%` : "/ MO"}
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
                  gap: "3px",
                  padding: "4px 6px",
                  borderRadius: "2px",
                  background: isHovered ? "rgba(0, 0, 0, 0.04)" : "transparent",
                  cursor: "pointer",
                  transition: "background 0.1s ease",
                }}
                onMouseEnter={() => setHoveredCategory(item.category)}
                onMouseLeave={() => setHoveredCategory(null)}
                onClick={() => onSelectCategory && onSelectCategory(item.category)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: "var(--mono, monospace)", fontSize: "11px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ width: "10px", height: "10px", background: item.theme.headerBg, border: "1px solid #000000" }} />
                    <span style={{ fontWeight: 800 }}>{item.theme.label}</span>
                    <span style={{ color: "#777777", fontSize: "9.5px" }}>({item.count})</span>
                  </div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "baseline" }}>
                    <span style={{ fontWeight: 900 }}>
                      {formatCurrency(item.totalMonthly, 2, currency)}/mo
                    </span>
                    <span style={{ color: "#777777", fontSize: "10px" }}>{item.pct.toFixed(1)}%</span>
                  </div>
                </div>

                <div style={{ width: "100%", height: "4px", background: "rgba(0, 0, 0, 0.06)", borderRadius: "2px", overflow: "hidden" }}>
                  <div style={{ width: `${item.pct}%`, height: "100%", background: item.theme.headerBg }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
