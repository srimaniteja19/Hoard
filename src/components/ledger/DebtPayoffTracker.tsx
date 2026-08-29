"use client";

import React, { useState, useMemo } from "react";
import {
  FinancialDebtRow,
  DebtPayoffStrategy,
  DebtType,
} from "@/lib/ledger/types";
import { calculateDebtPayoff } from "@/lib/ledger/debtPayoff";
import { playSound } from "@/lib/sound";
import { DebtAmortizationChart } from "./charts/DebtAmortizationChart";

const DEBT_THEMES: Record<DebtType, { icon: string; label: string }> = {
  CREDIT_CARD: { icon: "💳", label: "CREDIT CARD" },
  STUDENT_LOAN: { icon: "🎓", label: "STUDENT LOAN" },
  AUTO_LOAN: { icon: "🚗", label: "AUTO LOAN" },
  MORTGAGE: { icon: "🏠", label: "MORTGAGE" },
  PERSONAL: { icon: "🤝", label: "PERSONAL LOAN" },
  MEDICAL: { icon: "🏥", label: "MEDICAL" },
  OTHER: { icon: "📄", label: "OTHER DEBT" },
};

interface DebtPayoffTrackerProps {
  debts: FinancialDebtRow[];
  onAddDebt: () => void;
  onUpdateDebt: (debt: FinancialDebtRow) => void;
  onDeleteDebt: (id: string) => void;
}

export const DebtPayoffTracker: React.FC<DebtPayoffTrackerProps> = ({
  debts,
  onAddDebt,
  onUpdateDebt,
  onDeleteDebt,
}) => {
  const [strategy, setStrategy] = useState<DebtPayoffStrategy>("AVALANCHE");
  const [extraPayment, setExtraPayment] = useState<number>(100);

  const simulation = useMemo(() => {
    return calculateDebtPayoff(debts, strategy, extraPayment);
  }, [debts, strategy, extraPayment]);

  const totalDebtBalance = useMemo(() => {
    return debts.filter((d) => !d.isPaidOff).reduce((sum, d) => sum + d.balance, 0);
  }, [debts]);

  const totalMinMonthly = useMemo(() => {
    return debts.filter((d) => !d.isPaidOff).reduce((sum, d) => sum + d.minPayment, 0);
  }, [debts]);

  const handleMarkPaid = async (debt: FinancialDebtRow) => {
    playSound.click();
    try {
      const res = await fetch(`/api/financial/debts/${debt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPaidOff: !debt.isPaidOff, balance: !debt.isPaidOff ? 0 : debt.originalPrincipal || 100 }),
      });
      if (res.ok) {
        const updated = await res.json();
        onUpdateDebt(updated);
        playSound.fileIt();
      }
    } catch {
      // ignore
    }
  };

  const handleDelete = async (debtId: string) => {
    if (!confirm("Are you sure you want to remove this debt account?")) return;
    playSound.bury();
    try {
      const res = await fetch(`/api/financial/debts/${debtId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onDeleteDebt(debtId);
      }
    } catch {
      // ignore
    }
  };

  if (debts.length === 0) {
    return (
      <div
        style={{
          background: "var(--card, #FFFFFF)",
          border: "1.5px dashed var(--ink, #0A0A0A)",
          boxShadow: "3px 3px 0 var(--ink, #0A0A0A)",
          padding: "48px 24px",
          textAlign: "center",
          borderRadius: "3px",
        }}
      >
        <div style={{ fontSize: "36px", marginBottom: "10px" }}>🎉</div>
        <div style={{ fontFamily: "var(--display, sans-serif)", fontSize: "22px", fontWeight: 900, marginBottom: "8px" }}>
          ZERO RECORDED DEBTS (100% DEBT FREE)
        </div>
        <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "12px", color: "#666666", marginBottom: "18px" }}>
          Track credit cards, student loans, auto financing, or mortgages to optimize APR payoff.
        </div>
        <button type="button" className="btn-ledger btn-ledger-primary" onClick={onAddDebt}>
          + ADD DEBT OR LOAN ACCOUNT
        </button>
      </div>
    );
  }

  return (
    <div className="debt-dashboard">
      {/* ── INTERACTIVE PAYOFF SIMULATOR BOX ── */}
      <div className="debt-simulator-box">
        <div className="debt-strategy-controls">
          <div>
            <div
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "10.5px",
                fontWeight: 800,
                letterSpacing: "0.08em",
                color: "#666666",
                textTransform: "uppercase",
                marginBottom: "6px",
              }}
            >
              ACTIVE PAYOFF STRATEGY
            </div>
            <div className="debt-strategy-toggle">
              <button
                type="button"
                className={`debt-strategy-btn ${strategy === "AVALANCHE" ? "active" : ""}`}
                onClick={() => {
                  playSound.click();
                  setStrategy("AVALANCHE");
                }}
                title="Pay highest interest rate (APR) first to mathematically minimize total interest paid."
              >
                ⚡ AVALANCHE (HIGHEST APR)
              </button>
              <button
                type="button"
                className={`debt-strategy-btn ${strategy === "SNOWBALL" ? "active" : ""}`}
                onClick={() => {
                  playSound.click();
                  setStrategy("SNOWBALL");
                }}
                title="Pay lowest balance first for rapid psychological momentum and fewer open accounts."
              >
                ❄️ SNOWBALL (LOWEST BALANCE)
              </button>
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "10px", fontWeight: 800, color: "#666666" }}>
              PROJECTED DEBT-FREE DATE
            </div>
            <div style={{ fontFamily: "var(--display, sans-serif)", fontSize: "28px", fontWeight: 900, color: "var(--ink, #0A0A0A)" }}>
              {simulation.debtFreeDate}
            </div>
            <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px", fontWeight: 800, color: "#166534", background: "#DCFCE7", padding: "2px 6px", display: "inline-block", border: "1px solid #166534", borderRadius: "2px" }}>
              {simulation.monthsToPayoff} months remaining
            </div>
          </div>
        </div>

        {/* Extra Payment Slider */}
        <div className="debt-slider-container">
          <div className="debt-slider-header">
            <label>
              ACCELERATE PAYOFF: EXTRA MONTHLY ALLOCATION
            </label>
            <span className="debt-slider-val">+${extraPayment} / MO</span>
          </div>
          <input
            type="range"
            min="0"
            max="1500"
            step="25"
            value={extraPayment}
            onChange={(e) => {
              setExtraPayment(parseInt(e.target.value, 10));
            }}
            className="debt-range-input"
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontFamily: "var(--mono, monospace)",
              fontSize: "10px",
              fontWeight: 700,
              color: "#666666",
            }}
          >
            <span>+$0/mo (Minimums only)</span>
            <span>+$500/mo</span>
            <span>+$1,000/mo</span>
            <span>+$1,500/mo</span>
          </div>
        </div>

        {/* Impact Banner */}
        <div className="debt-impact-banner">
          <div>
            <div className="debt-impact-text">
              ✨ Savings Velocity: Save ${simulation.interestSavedVsMinimums.toLocaleString()} in predatory interest
            </div>
            <div className="debt-impact-meta">
              Accelerates debt-free date by {simulation.monthsSavedVsMinimums} months compared to standard minimum payments.
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "11.5px", fontWeight: 800 }}>
              Total Interest Burden: <b>${simulation.totalInterestPaid.toLocaleString()}</b>
            </span>
          </div>
        </div>
      </div>

      {/* ── VISUAL AMORTIZATION TRAJECTORY CHART ── */}
      {debts.length > 0 && (
        <DebtAmortizationChart
          debts={debts}
          activeStrategy={strategy}
          extraPayment={extraPayment}
        />
      )}

      {/* ── STRATEGY PAYOFF SEQUENCE (MILESTONES) ── */}
      {simulation.payoffMilestones.length > 0 && (
        <div
          style={{
            background: "var(--card, #FFFFFF)",
            border: "1.5px solid var(--ink, #0A0A0A)",
            boxShadow: "3px 3px 0 var(--ink, #0A0A0A)",
            padding: "18px 20px",
            borderRadius: "3px",
          }}
        >
          <div
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "10.5px",
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>🎯 {strategy} PAYOFF SEQUENCE</span>
            <span style={{ color: "#666666", fontWeight: 700 }}>
              Total Remaining: ${totalDebtBalance.toLocaleString()} (Min: ${totalMinMonthly}/mo)
            </span>
          </div>

          <div style={{ display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "6px" }}>
            {simulation.payoffMilestones.map((m, idx) => (
              <div
                key={m.debtId}
                style={{
                  minWidth: "190px",
                  background: "rgba(0, 0, 0, 0.02)",
                  border: "1.5px solid var(--ink, #0A0A0A)",
                  borderRadius: "2px",
                  padding: "10px 12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "9.5px", fontWeight: 800, color: "#666666" }}>
                  STEP #{idx + 1}
                </div>
                <div style={{ fontFamily: "var(--display, sans-serif)", fontSize: "15px", fontWeight: 900 }}>
                  {m.name}
                </div>
                <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px", fontWeight: 800, color: "#166534", background: "#DCFCE7", padding: "2px 6px", border: "1px solid #166534", borderRadius: "2px", marginTop: "2px" }}>
                  Cleared: {m.payoffDate}
                </div>
                <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "10px", color: "#666666" }}>
                  Interest: ${m.totalInterestPaid.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── DEBT ACCOUNTS GRID ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "4px" }}>
        <h3 style={{ fontFamily: "var(--display, sans-serif)", fontSize: "20px", fontWeight: 900, margin: 0 }}>
          ACTIVE LIABILITIES ({debts.length})
        </h3>
        <button type="button" className="btn-ledger btn-ledger-primary" onClick={onAddDebt}>
          + ADD DEBT ACCOUNT
        </button>
      </div>

      <div className="sub-grid">
        {debts.map((d) => {
          const type = (d.debtType as DebtType) || "OTHER";
          const theme = DEBT_THEMES[type] || DEBT_THEMES.OTHER;
          const original = d.originalPrincipal || d.balance;
          const paidPct = original > 0 ? Math.min(100, Math.round(((original - d.balance) / original) * 100)) : 0;
          const isHighApr = d.interestRate >= 18;

          return (
            <div
              key={d.id}
              className="sub-card-editorial"
              style={{ opacity: d.isPaidOff ? 0.6 : 1 }}
            >
              {/* Header */}
              <div className="sub-card-header">
                <span
                  className="sub-card-category"
                  style={{
                    background: "var(--ink, #0A0A0A)",
                    color: "#FFFFFF",
                  }}
                >
                  <span>{theme.icon}</span>
                  <span>{theme.label}</span>
                </span>

                <span
                  className="sub-card-status"
                  style={{
                    background: isHighApr ? "#FFF1F2" : "#F0F9FF",
                    color: isHighApr ? "#BE123C" : "#0284C7",
                    borderColor: isHighApr ? "#E11D48" : "#0284C7",
                  }}
                >
                  {d.interestRate}% APR
                </span>
              </div>

              {/* Body */}
              <div className="sub-card-body">
                <div className="sub-card-title-row">
                  <h3 className="sub-card-title">{d.name}</h3>
                  <div style={{ textAlign: "right" }}>
                    <span className="sub-card-price">${d.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "10px", color: "#666666" }}>
                      Min: ${d.minPayment}/mo
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="debt-progress-bar">
                    <div className="debt-progress-fill" style={{ width: `${paidPct}%` }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--mono, monospace)", fontSize: "9.5px", fontWeight: 700, marginTop: "4px", color: "#666666" }}>
                    <span>{paidPct}% Cleared</span>
                    <span>Original: ${original.toLocaleString()}</span>
                  </div>
                </div>

                {d.lender && (
                  <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "10.5px", color: "#555555" }}>
                    Institution: <b>{d.lender}</b> (Due: Day {d.dueDay || 1})
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="sub-card-footer">
                <button
                  type="button"
                  className="btn-card-action"
                  onClick={() => handleMarkPaid(d)}
                >
                  {d.isPaidOff ? "MARK ACTIVE" : "✓ PAID OFF"}
                </button>
                <button
                  type="button"
                  className="btn-card-action btn-card-delete"
                  onClick={() => handleDelete(d.id)}
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
