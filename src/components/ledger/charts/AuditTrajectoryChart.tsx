"use client";

import React, { useState } from "react";
import { AuditTrajectoryPoint } from "@/lib/ledger/types";
import { formatCurrency, formatCompactCurrency, getCurrencySymbol } from "@/lib/ledger/formatters";
import { TrendingUp, Sparkles, Compass } from "lucide-react";

interface AuditTrajectoryChartProps {
  projections: AuditTrajectoryPoint[];
  currency?: string;
}

export const AuditTrajectoryChart: React.FC<AuditTrajectoryChartProps> = ({
  projections,
  currency = "USD",
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number>(projections.length - 1);

  if (!projections || projections.length === 0) {
    return null;
  }

  const maxVal = Math.max(
    ...projections.map((p) => Math.max(p.optimizedNetWorth, p.statusQuoNetWorth, 1000)),
    1000
  );

  const activePoint = projections[hoveredIndex] || projections[projections.length - 1];
  const deltaPct =
    activePoint.statusQuoNetWorth > 0
      ? Math.round(
          ((activePoint.optimizedNetWorth - activePoint.statusQuoNetWorth) /
            activePoint.statusQuoNetWorth) *
            100
        )
      : 100;

  return (
    <div
      style={{
        background: "var(--card, #FFFFFF)",
        border: "2px solid var(--ink, #0A0A0A)",
        boxShadow: "4px 4px 0 var(--ink, #0A0A0A)",
        padding: "20px 22px",
        borderRadius: "4px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "10.5px",
              fontWeight: 900,
              color: "#166534",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              marginBottom: "3px",
            }}
          >
            <Sparkles size={12} aria-hidden="true" />
            10-YEAR COMPOUND WEALTH ACCELERATION
          </div>
          <div
            style={{
              fontFamily: "var(--display, sans-serif)",
              fontSize: "20px",
              fontWeight: 900,
              color: "var(--ink, #0A0A0A)",
            }}
          >
            Status Quo vs. AI-Optimized Trajectory
          </div>
        </div>

        {/* Legend */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            fontFamily: "var(--mono, monospace)",
            fontSize: "11px",
            fontWeight: 800,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                width: "12px",
                height: "12px",
                background: "#94A3B8",
                border: "1.5px solid #000000",
                borderRadius: "2px",
                display: "inline-block",
              }}
            />
            <span style={{ color: "#64748B" }}>Status Quo</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                width: "12px",
                height: "12px",
                background: "#16A34A",
                border: "1.5px solid #000000",
                borderRadius: "2px",
                display: "inline-block",
              }}
            />
            <span style={{ color: "#166534" }}>AI Optimized (+Culls &amp; SIPs)</span>
          </div>
        </div>
      </div>

      {/* Interactive Milestone Cards Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "10px",
        }}
      >
        <div
          style={{
            background: "#F8FAFC",
            border: "1.5px solid #CBD5E1",
            padding: "10px 14px",
            borderRadius: "3px",
          }}
        >
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: "9.5px",
              fontWeight: 900,
              color: "#64748B",
              textTransform: "uppercase",
            }}
          >
            SELECTED HORIZON
          </div>
          <div
            style={{
              fontFamily: "var(--display)",
              fontSize: "19px",
              fontWeight: 900,
              color: "#0A0A0A",
            }}
          >
            Year {activePoint.year} Horizon
          </div>
        </div>

        <div
          style={{
            background: "#F8FAFC",
            border: "1.5px solid #94A3B8",
            padding: "10px 14px",
            borderRadius: "3px",
          }}
        >
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: "9.5px",
              fontWeight: 900,
              color: "#64748B",
              textTransform: "uppercase",
            }}
          >
            STATUS QUO NET WORTH
          </div>
          <div
            style={{
              fontFamily: "var(--display)",
              fontSize: "19px",
              fontWeight: 900,
              color: "#475569",
            }}
          >
            {formatCurrency(activePoint.statusQuoNetWorth, 0, currency)}
          </div>
        </div>

        <div
          style={{
            background: "#DCFCE7",
            border: "2px solid #16A34A",
            padding: "10px 14px",
            borderRadius: "3px",
            boxShadow: "2px 2px 0 #16A34A",
          }}
        >
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: "9.5px",
              fontWeight: 900,
              color: "#166534",
              textTransform: "uppercase",
            }}
          >
            AI-OPTIMIZED NET WORTH
          </div>
          <div
            style={{
              fontFamily: "var(--display)",
              fontSize: "20px",
              fontWeight: 900,
              color: "#15803D",
            }}
          >
            {formatCurrency(activePoint.optimizedNetWorth, 0, currency)}
          </div>
        </div>

        <div
          style={{
            background: "#0A0A0A",
            color: "#FFE600",
            border: "2px solid #0A0A0A",
            padding: "10px 14px",
            borderRadius: "3px",
            boxShadow: "2px 2px 0 #0A0A0A",
          }}
        >
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: "9.5px",
              fontWeight: 900,
              color: "#A3A3A3",
              textTransform: "uppercase",
            }}
          >
            NET WEALTH GAIN (+{deltaPct}%)
          </div>
          <div
            style={{
              fontFamily: "var(--display)",
              fontSize: "20px",
              fontWeight: 900,
              color: "#FFE600",
            }}
          >
            +{formatCurrency(activePoint.deltaGain, 0, currency)}
          </div>
        </div>
      </div>

      {/* Visual Comparative Bars Chart */}
      <div
        style={{
          background: "#F8FAFC",
          border: "2px solid var(--ink, #0A0A0A)",
          borderRadius: "3px",
          padding: "24px 16px 12px 16px",
          position: "relative",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${projections.length}, 1fr)`,
            gap: "20px",
            height: "190px",
            alignItems: "flex-end",
            position: "relative",
          }}
        >
          {projections.map((p, idx) => {
            const sqHeightPct = Math.max(8, Math.min(95, (p.statusQuoNetWorth / maxVal) * 100));
            const optHeightPct = Math.max(12, Math.min(100, (p.optimizedNetWorth / maxVal) * 100));
            const isHovered = hoveredIndex === idx;

            return (
              <div
                key={p.year}
                onClick={() => setHoveredIndex(idx)}
                onMouseEnter={() => setHoveredIndex(idx)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  height: "100%",
                  justifyContent: "flex-end",
                  cursor: "pointer",
                  position: "relative",
                }}
              >
                {/* Top Gain Callout Badge on Hover */}
                {isHovered && (
                  <div
                    style={{
                      position: "absolute",
                      top: "-18px",
                      background: "#0A0A0A",
                      color: "#FFE600",
                      fontFamily: "var(--mono)",
                      fontSize: "9.5px",
                      fontWeight: 900,
                      padding: "2px 6px",
                      borderRadius: "2px",
                      whiteSpace: "nowrap",
                      zIndex: 10,
                      boxShadow: "2px 2px 0 rgba(0,0,0,0.3)",
                    }}
                  >
                    +{formatCompactCurrency(p.deltaGain, currency)}
                  </div>
                )}

                {/* Paired Bars Container */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-end",
                    gap: "6px",
                    width: "100%",
                    justifyContent: "center",
                    height: "100%",
                  }}
                >
                  {/* Status Quo Bar */}
                  <div
                    style={{
                      width: "38%",
                      maxWidth: "34px",
                      height: `${sqHeightPct}%`,
                      background: isHovered ? "#64748B" : "#94A3B8",
                      border: "1.5px solid #000000",
                      borderRadius: "2px 2px 0 0",
                      transition: "all 0.15s ease",
                      position: "relative",
                    }}
                    title={`Year ${p.year} Status Quo: ${formatCurrency(p.statusQuoNetWorth, 0, currency)}`}
                  />

                  {/* AI Optimized Bar */}
                  <div
                    style={{
                      width: "38%",
                      maxWidth: "34px",
                      height: `${optHeightPct}%`,
                      background: isHovered ? "#22C55E" : "#16A34A",
                      border: "2px solid #000000",
                      borderRadius: "2px 2px 0 0",
                      boxShadow: isHovered ? "2px 0 0 #000000" : "none",
                      transition: "all 0.15s ease",
                      position: "relative",
                    }}
                    title={`Year ${p.year} AI Optimized: ${formatCurrency(p.optimizedNetWorth, 0, currency)}`}
                  />
                </div>

                {/* Year Label */}
                <div
                  style={{
                    marginTop: "8px",
                    fontFamily: "var(--mono)",
                    fontSize: "11px",
                    fontWeight: isHovered ? 900 : 700,
                    color: isHovered ? "#0A0A0A" : "#666666",
                    background: isHovered ? "#FFE600" : "transparent",
                    padding: "1px 6px",
                    borderRadius: "2px",
                    border: isHovered ? "1px solid #0A0A0A" : "1px solid transparent",
                  }}
                >
                  YR {p.year}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dynamic Summary Statement */}
      <div
        style={{
          fontFamily: "var(--mono)",
          fontSize: "11.5px",
          color: "#166534",
          background: "#DCFCE7",
          border: "1.5px solid #16A34A",
          borderRadius: "3px",
          padding: "10px 14px",
          lineHeight: 1.45,
        }}
      >
        ⚡ <b>Compounding Catalyst:</b> Eliminating high-interest drag and reinvesting freed
        subscription cash into disciplined wealth SIPs unlocks{" "}
        <b>+{formatCurrency(projections[projections.length - 1]?.deltaGain || 0, 0, currency)}</b> in
        accelerated net worth by Year {projections[projections.length - 1]?.year || 10}.
      </div>
    </div>
  );
};
