"use client";

import React, { useState, useMemo } from "react";
import { FinancialDebtRow, DebtPayoffStrategy } from "@/lib/ledger/types";
import { calculateDebtPayoff } from "@/lib/ledger/debtPayoff";

interface DebtAmortizationChartProps {
  debts: FinancialDebtRow[];
  activeStrategy: DebtPayoffStrategy;
  extraPayment: number;
}

export const DebtAmortizationChart: React.FC<DebtAmortizationChartProps> = ({
  debts,
  activeStrategy,
  extraPayment,
}) => {
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);

  const activeSim = useMemo(
    () => calculateDebtPayoff(debts, activeStrategy, extraPayment),
    [debts, activeStrategy, extraPayment]
  );
  const minSim = useMemo(
    () => calculateDebtPayoff(debts, activeStrategy, 0),
    [debts, activeStrategy]
  );

  const activeSchedule = activeSim.monthlySchedule;
  const minSchedule = minSim.monthlySchedule;

  const maxMonths = Math.max(
    activeSchedule.length > 0 ? activeSchedule[activeSchedule.length - 1].monthIndex : 1,
    minSchedule.length > 0 ? minSchedule[minSchedule.length - 1].monthIndex : 1,
    12
  );

  const initialTotalBalance = useMemo(
    () => debts.filter((d) => !d.isPaidOff).reduce((sum, d) => sum + d.balance, 0),
    [debts]
  );

  // Group month-by-month remaining total balance
  const activeTimeline = useMemo(() => {
    const map = new Map<number, { balance: number; interest: number; payments: number; targetDebt: string }>();
    map.set(0, { balance: initialTotalBalance, interest: 0, payments: 0, targetDebt: "" });

    for (const snap of activeSchedule) {
      const topTarget = snap.debtPayments.find((p) => p.payment > p.interestCharged)?.name || "";
      map.set(snap.monthIndex, {
        balance: snap.totalRemainingBalance,
        interest: snap.totalInterestPaidThisMonth,
        payments: snap.totalPrincipalPaidThisMonth + snap.totalInterestPaidThisMonth,
        targetDebt: topTarget,
      });
    }
    return map;
  }, [activeSchedule, initialTotalBalance]);

  const minTimeline = useMemo(() => {
    const map = new Map<number, number>();
    map.set(0, initialTotalBalance);
    for (const snap of minSchedule) {
      map.set(snap.monthIndex, snap.totalRemainingBalance);
    }
    return map;
  }, [minSchedule, initialTotalBalance]);

  if (initialTotalBalance === 0) return null;

  // SVG Chart Geometry
  const width = 640;
  const height = 240;
  const padding = { top: 20, right: 30, bottom: 35, left: 55 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxBalance = initialTotalBalance * 1.05;

  const getX = (month: number) => padding.left + (month / maxMonths) * chartW;
  const getY = (balance: number) => padding.top + chartH - (balance / maxBalance) * chartH;

  const activePoints: [number, number][] = [];
  const minPoints: [number, number][] = [];

  for (let m = 0; m <= maxMonths; m++) {
    const actBal = activeTimeline.has(m)
      ? activeTimeline.get(m)!.balance
      : m > activeSim.monthsToPayoff
      ? 0
      : initialTotalBalance;
    const minBal = minTimeline.has(m)
      ? minTimeline.get(m)!
      : m > minSim.monthsToPayoff
      ? 0
      : initialTotalBalance;

    activePoints.push([getX(m), getY(actBal)]);
    minPoints.push([getX(m), getY(minBal)]);
  }

  const activePathD = activePoints.reduce(
    (acc, [x, y], idx) => `${acc} ${idx === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`,
    ""
  );

  const minPathD = minPoints.reduce(
    (acc, [x, y], idx) => `${acc} ${idx === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`,
    ""
  );

  const activeAreaD = `${activePathD} L ${getX(maxMonths).toFixed(1)} ${getY(0).toFixed(1)} L ${getX(0).toFixed(1)} ${getY(0).toFixed(1)} Z`;

  const currentMonthIdx = hoveredMonth !== null ? hoveredMonth : Math.min(6, activeSim.monthsToPayoff);
  const currentActiveData = activeTimeline.get(currentMonthIdx) || {
    balance: currentMonthIdx > activeSim.monthsToPayoff ? 0 : initialTotalBalance,
    interest: 0,
    payments: 0,
    targetDebt: "",
  };

  return (
    <div
      style={{
        background: "var(--card, #FFFFFF)",
        border: "1.5px solid var(--ink, #0A0A0A)",
        boxShadow: "3px 3px 0 var(--ink, #0A0A0A)",
        padding: "20px 22px",
        borderRadius: "3px",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
      }}
    >
      {/* ── Chart Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
            <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "10.5px", fontWeight: 800, textTransform: "uppercase", color: "#666666" }}>
              AMORTIZATION & ACCELERATION CURVE
            </span>
            <span
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "9.5px",
                fontWeight: 900,
                padding: "2px 6px",
                background: "#DCFCE7",
                color: "#166534",
                border: "1px solid #166534",
                borderRadius: "2px",
              }}
            >
              ⚡ {activeStrategy} (+${extraPayment}/mo)
            </span>
          </div>
          <div style={{ fontFamily: "var(--display, sans-serif)", fontSize: "20px", fontWeight: 900 }}>
            Debt Elimination Trajectory
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: "14px", fontFamily: "var(--mono, monospace)", fontSize: "10.5px", fontWeight: 700 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "12px", height: "3px", background: "#16A34A" }} />
            <span>Accelerated ({activeSim.monthsToPayoff} mos)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "12px", height: "3px", background: "#DC2626", borderTop: "1px dashed #DC2626" }} />
            <span>Minimums Only ({minSim.monthsToPayoff} mos)</span>
          </div>
        </div>
      </div>

      {/* ── SVG Visualization Canvas ── */}
      <div style={{ width: "100%", overflowX: "auto", position: "relative" }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: "100%", height: "auto", minWidth: "500px", display: "block" }}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const mouseX = ((e.clientX - rect.left) / rect.width) * width;
            const relX = mouseX - padding.left;
            if (relX >= 0 && relX <= chartW) {
              const m = Math.round((relX / chartW) * maxMonths);
              setHoveredMonth(Math.min(maxMonths, Math.max(0, m)));
            }
          }}
          onMouseLeave={() => setHoveredMonth(null)}
        >
          <defs>
            <linearGradient id="activeDebtGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#16A34A" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#16A34A" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
            const y = padding.top + chartH * (1 - pct);
            const val = maxBalance * pct;
            return (
              <g key={pct}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="rgba(0,0,0,0.08)"
                  strokeDasharray="3 3"
                />
                <text
                  x={padding.left - 8}
                  y={y + 3}
                  textAnchor="end"
                  fontFamily="var(--mono, monospace)"
                  fontSize="9.5"
                  fill="#777777"
                >
                  ${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val.toFixed(0)}
                </text>
              </g>
            );
          })}

          {/* X Axis Month Labels */}
          {[0, Math.round(maxMonths / 3), Math.round((maxMonths * 2) / 3), maxMonths].map((m) => (
            <text
              key={m}
              x={getX(m)}
              y={height - 10}
              textAnchor="middle"
              fontFamily="var(--mono, monospace)"
              fontSize="9.5"
              fill="#777777"
            >
              Mo {m}
            </text>
          ))}

          {/* Area Fill for Accelerated Payoff */}
          <path d={activeAreaD} fill="url(#activeDebtGradient)" />

          {/* Minimums Trajectory (Red Dashed Line) */}
          <path
            d={minPathD}
            fill="none"
            stroke="#DC2626"
            strokeWidth="2"
            strokeDasharray="4 4"
          />

          {/* Accelerated Trajectory (Green Solid Line) */}
          <path
            d={activePathD}
            fill="none"
            stroke="#16A34A"
            strokeWidth="2.5"
          />

          {/* Milestones Points on Curve */}
          {activeSim.payoffMilestones.map((m) => {
            const mX = getX(m.payoffMonth);
            const mY = getY(0);
            return (
              <g key={m.debtId}>
                <circle cx={mX} cy={mY} r="4.5" fill="#16A34A" stroke="#FFFFFF" strokeWidth="1.5" />
                <line x1={mX} y1={padding.top} x2={mX} y2={mY} stroke="#16A34A" strokeWidth="1" strokeDasharray="2 2" opacity="0.6" />
              </g>
            );
          })}

          {/* Interactive Hover Vertical Scrubber */}
          {hoveredMonth !== null && (
            <g>
              <line
                x1={getX(hoveredMonth)}
                y1={padding.top}
                x2={getX(hoveredMonth)}
                y2={padding.top + chartH}
                stroke="var(--ink, #0A0A0A)"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
              <circle
                cx={getX(hoveredMonth)}
                cy={getY(currentActiveData.balance)}
                r="5"
                fill="#16A34A"
                stroke="var(--ink, #0A0A0A)"
                strokeWidth="2"
              />
            </g>
          )}
        </svg>
      </div>

      {/* ── Interactive Readout Bar ── */}
      <div
        style={{
          background: "rgba(0, 0, 0, 0.025)",
          border: "1px solid rgba(0, 0, 0, 0.1)",
          padding: "10px 14px",
          borderRadius: "2px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "10px",
          fontFamily: "var(--mono, monospace)",
          fontSize: "11px",
        }}
      >
        <div>
          <span>INSPECTING: <b>MONTH {currentMonthIdx}</b></span>
          {currentActiveData.targetDebt && (
            <span style={{ color: "#166534", marginLeft: "10px" }}>
              Targeting: <b>{currentActiveData.targetDebt}</b>
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: "16px" }}>
          <span>Remaining Balance: <b>${currentActiveData.balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</b></span>
          <span style={{ color: "#16A34A" }}>
            Total Interest Saved vs Min: <b>${activeSim.interestSavedVsMinimums.toLocaleString()}</b>
          </span>
        </div>
      </div>
    </div>
  );
};
