"use client";

import React, { useState, useMemo } from "react";
import {
  FinancialDebtRow,
  DebtPayoffStrategy,
  DebtType,
} from "@/lib/ledger/types";
import { formatCurrency, formatSignedCurrency } from "@/lib/ledger/formatters";
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

const EXTRA_PAYMENT_PRESETS = [0, 100, 250, 500, 1000, 2500, 5000];
const LUMP_SUM_PRESETS = [0, 1000, 2500, 5000, 10000, 25000, 50000];

interface DebtPayoffTrackerProps {
  debts: FinancialDebtRow[];
  onAddDebt: () => void;
  onEditDebt: (debt: FinancialDebtRow) => void;
  onUpdateDebt: (debt: FinancialDebtRow) => void;
  onDeleteDebt: (id: string) => void;
}

export const DebtPayoffTracker: React.FC<DebtPayoffTrackerProps> = ({
  debts,
  onAddDebt,
  onEditDebt,
  onUpdateDebt,
  onDeleteDebt,
}) => {
  const [strategy, setStrategy] = useState<DebtPayoffStrategy>("AVALANCHE");
  const [extraPayment, setExtraPayment] = useState<number>(150);
  const [lumpSum, setLumpSum] = useState<number>(0);

  // Dynamic slider upper bounds that scale automatically if the user types any large number
  const extraPaymentSliderMax = Math.max(5000, Math.ceil(((extraPayment || 0) * 1.5) / 500) * 500);
  const lumpSumSliderMax = Math.max(25000, Math.ceil(((lumpSum || 0) * 1.5) / 1000) * 1000);

  const simulation = useMemo(() => {
    return calculateDebtPayoff(debts, strategy, extraPayment || 0, lumpSum || 0);
  }, [debts, strategy, extraPayment, lumpSum]);

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
        body: JSON.stringify({
          isPaidOff: !debt.isPaidOff,
          balance: !debt.isPaidOff ? 0 : debt.originalPrincipal || 100,
        }),
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
          border: "2.5px dashed var(--ink, #0A0A0A)",
          boxShadow: "4px 4px 0 var(--ink, #0A0A0A)",
          padding: "48px 24px",
          textAlign: "center",
          borderRadius: "4px",
        }}
      >
        <div style={{ fontSize: "40px", marginBottom: "10px" }}>🎉</div>
        <div style={{ fontFamily: "var(--display, sans-serif)", fontSize: "24px", fontWeight: 900, marginBottom: "8px" }}>
          ZERO RECORDED DEBTS (100% DEBT FREE)
        </div>
        <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "12px", color: "#666666", marginBottom: "18px" }}>
          Track credit cards, student loans, auto financing, or mortgages to optimize APR payoff with the What-If Simulator.
        </div>
        <button type="button" className="btn-ledger btn-ledger-primary" onClick={onAddDebt}>
          + ADD DEBT OR LOAN ACCOUNT
        </button>
      </div>
    );
  }

  return (
    <div className="debt-dashboard">
      {/* ── INTERACTIVE "WHAT-IF" PAYOFF SIMULATOR ── */}
      <div
        style={{
          background: "#FFFFFF",
          border: "2.5px solid var(--ink, #0A0A0A)",
          boxShadow: "5px 5px 0 var(--ink, #0A0A0A)",
          padding: "24px",
          borderRadius: "4px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        {/* Header & Strategy Switcher */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px",
            paddingBottom: "16px",
            borderBottom: "2px solid var(--ink, #0A0A0A)",
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
                marginBottom: "4px",
              }}
            >
              🧮 DEBT FREEDOM ACCELERATOR & WHAT-IF SIMULATOR
            </div>
            <div style={{ fontFamily: "var(--display, sans-serif)", fontSize: "22px", fontWeight: 900 }}>
              Simulate Any Surplus & Lump-Sum Payoff Amount
            </div>
          </div>

          {/* Strategy Toggle */}
          <div className="debt-strategy-toggle">
            <button
              type="button"
              className={`debt-strategy-btn ${strategy === "AVALANCHE" ? "active" : ""}`}
              onClick={() => {
                playSound.click();
                setStrategy("AVALANCHE");
              }}
              title="Avalanche: Pay highest APR first to minimize total interest paid."
            >
              ⚡ AVALANCHE (MAX INTEREST SAVED)
            </button>
            <button
              type="button"
              className={`debt-strategy-btn ${strategy === "SNOWBALL" ? "active" : ""}`}
              onClick={() => {
                playSound.click();
                setStrategy("SNOWBALL");
              }}
              title="Snowball: Pay lowest balance first for rapid psychological momentum."
            >
              ❄️ SNOWBALL (FASTEST WINS)
            </button>
          </div>
        </div>

        {/* ── SIMULATOR CONTROLS (DIRECT EDITABLE INPUTS & DYNAMIC SLIDERS) ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "20px",
          }}
        >
          {/* 1. Monthly Extra Payment: Direct Input & Scalable Slider */}
          <div
            style={{
              background: "#F8FAFC",
              border: "2px solid var(--ink, #0A0A0A)",
              boxShadow: "3px 3px 0 var(--ink, #0A0A0A)",
              padding: "16px",
              borderRadius: "3px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
              <label style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px", fontWeight: 900, textTransform: "uppercase" }}>
                💵 MONTHLY EXTRA SURPLUS
              </label>

              {/* Direct Editable Number Input Box */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "14px", fontWeight: 900 }}>+ $</span>
                <input
                  type="number"
                  min="0"
                  step="25"
                  value={extraPayment === 0 ? "" : extraPayment}
                  placeholder="0"
                  onChange={(e) => {
                    const parsed = e.target.value === "" ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0);
                    setExtraPayment(parsed);
                  }}
                  style={{
                    width: "110px",
                    fontFamily: "var(--mono, monospace)",
                    fontSize: "15px",
                    fontWeight: 900,
                    color: "#166534",
                    background: "#DCFCE7",
                    padding: "4px 8px",
                    border: "2px solid #166534",
                    boxShadow: "2px 2px 0 #166534",
                    borderRadius: "2px",
                    outline: "none",
                    textAlign: "right",
                  }}
                />
                <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px", fontWeight: 800, color: "#666666" }}>
                  / MO
                </span>
              </div>
            </div>

            <input
              type="range"
              min="0"
              max={extraPaymentSliderMax}
              step="25"
              value={extraPayment}
              onChange={(e) => setExtraPayment(parseInt(e.target.value, 10) || 0)}
              className="debt-range-input"
            />

            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "2px" }}>
              {EXTRA_PAYMENT_PRESETS.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => {
                    playSound.click();
                    setExtraPayment(amount);
                  }}
                  style={{
                    fontFamily: "var(--mono, monospace)",
                    fontSize: "10px",
                    fontWeight: 800,
                    padding: "3px 8px",
                    background: extraPayment === amount ? "#0A0A0A" : "#FFFFFF",
                    color: extraPayment === amount ? "#FFE600" : "#0A0A0A",
                    border: "1.5px solid #0A0A0A",
                    boxShadow: extraPayment === amount ? "1px 1px 0 #0A0A0A" : "1.5px 1.5px 0 #0A0A0A",
                    cursor: "pointer",
                    borderRadius: "2px",
                  }}
                >
                  {amount === 0 ? "MINIMUMS ($0)" : `+$${amount.toLocaleString()}`}
                </button>
              ))}
            </div>
          </div>

          {/* 2. One-Time Lump Sum Windfall: Direct Input & Scalable Slider */}
          <div
            style={{
              background: "#F8FAFC",
              border: "2px solid var(--ink, #0A0A0A)",
              boxShadow: "3px 3px 0 var(--ink, #0A0A0A)",
              padding: "16px",
              borderRadius: "3px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
              <label style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px", fontWeight: 900, textTransform: "uppercase" }}>
                🎁 ONE-TIME LUMP SUM WINDFALL
              </label>

              {/* Direct Editable Number Input Box */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "14px", fontWeight: 900 }}>$</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={lumpSum === 0 ? "" : lumpSum}
                  placeholder="0"
                  onChange={(e) => {
                    const parsed = e.target.value === "" ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0);
                    setLumpSum(parsed);
                  }}
                  style={{
                    width: "120px",
                    fontFamily: "var(--mono, monospace)",
                    fontSize: "15px",
                    fontWeight: 900,
                    color: "#0369A1",
                    background: "#E0F2FE",
                    padding: "4px 8px",
                    border: "2px solid #0284C7",
                    boxShadow: "2px 2px 0 #0284C7",
                    borderRadius: "2px",
                    outline: "none",
                    textAlign: "right",
                  }}
                />
                <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px", fontWeight: 800, color: "#666666" }}>
                  TODAY
                </span>
              </div>
            </div>

            <input
              type="range"
              min="0"
              max={lumpSumSliderMax}
              step="250"
              value={lumpSum}
              onChange={(e) => setLumpSum(parseInt(e.target.value, 10) || 0)}
              className="debt-range-input"
            />

            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "2px" }}>
              {LUMP_SUM_PRESETS.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => {
                    playSound.click();
                    setLumpSum(amount);
                  }}
                  style={{
                    fontFamily: "var(--mono, monospace)",
                    fontSize: "10px",
                    fontWeight: 800,
                    padding: "3px 8px",
                    background: lumpSum === amount ? "#0A0A0A" : "#FFFFFF",
                    color: lumpSum === amount ? "#00F0FF" : "#0A0A0A",
                    border: "1.5px solid #0A0A0A",
                    boxShadow: lumpSum === amount ? "1px 1px 0 #0A0A0A" : "1.5px 1.5px 0 #0A0A0A",
                    cursor: "pointer",
                    borderRadius: "2px",
                  }}
                >
                  {amount === 0 ? "NO WINDFALL ($0)" : `+$${amount.toLocaleString()}`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── SIDE-BY-SIDE IMPACT SCORECARD ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "14px",
          }}
        >
          {/* Card 1: Debt Free Horizon */}
          <div
            style={{
              background: "#F0FDF4",
              border: "2px solid #16A34A",
              boxShadow: "3.5px 3.5px 0 #16A34A",
              padding: "16px",
              borderRadius: "3px",
            }}
          >
            <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "10px", fontWeight: 900, color: "#166534", textTransform: "uppercase", marginBottom: "4px" }}>
              🚀 ACCELERATED DEBT-FREE DATE
            </div>
            <div style={{ fontFamily: "var(--display, sans-serif)", fontSize: "28px", fontWeight: 900, color: "#0A0A0A", lineHeight: 1.1 }}>
              {simulation.debtFreeDate}
            </div>
            <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px", fontWeight: 800, color: "#15803D", marginTop: "6px" }}>
              {simulation.monthsSavedVsMinimums > 0 ? (
                <span>⚡ <b>{simulation.monthsSavedVsMinimums} Months Earlier</b> than minimums</span>
              ) : (
                <span>Standard baseline timeline</span>
              )}
            </div>
          </div>

          {/* Card 2: Interest Saved */}
          <div
            style={{
              background: "#FEFCE8",
              border: "2px solid #CA8A04",
              boxShadow: "3.5px 3.5px 0 #CA8A04",
              padding: "16px",
              borderRadius: "3px",
            }}
          >
            <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "10px", fontWeight: 900, color: "#854D0E", textTransform: "uppercase", marginBottom: "4px" }}>
              💰 TOTAL INTEREST SAVED
            </div>
            <div style={{ fontFamily: "var(--display, sans-serif)", fontSize: "28px", fontWeight: 900, color: "#16A34A", lineHeight: 1.1 }}>
              {formatSignedCurrency(simulation.interestSavedVsMinimums, 2)}
            </div>
            <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px", fontWeight: 700, color: "#854D0E", marginTop: "6px" }}>
              Paid Interest: <b>{formatCurrency(simulation.totalInterestPaid, 2)}</b> (vs {formatCurrency(simulation.baselineTotalInterestPaid, 2)} baseline)
            </div>
          </div>

          {/* Card 3: Total Out of Pocket */}
          <div
            style={{
              background: "#F8FAFC",
              border: "2px solid var(--ink, #0A0A0A)",
              boxShadow: "3.5px 3.5px 0 var(--ink, #0A0A0A)",
              padding: "16px",
              borderRadius: "3px",
            }}
          >
            <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "10px", fontWeight: 900, color: "#475569", textTransform: "uppercase", marginBottom: "4px" }}>
              🛡️ TOTAL LIFETIME REPAYMENT
            </div>
            <div style={{ fontFamily: "var(--display, sans-serif)", fontSize: "28px", fontWeight: 900, color: "#0A0A0A", lineHeight: 1.1 }}>
              {formatCurrency(simulation.totalPrincipalPaid + simulation.totalInterestPaid, 2)}
            </div>
            <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px", fontWeight: 700, color: "#64748B", marginTop: "6px" }}>
              Principal: {formatCurrency(simulation.totalPrincipalPaid, 0)} + Interest: {formatCurrency(simulation.totalInterestPaid, 0)}
            </div>
          </div>
        </div>
      </div>

      {/* ── VISUAL AMORTIZATION TRAJECTORY CHART ── */}
      {debts.length > 0 && (
        <DebtAmortizationChart
          debts={debts}
          activeStrategy={strategy}
          extraPayment={extraPayment}
          oneTimeLumpSum={lumpSum}
        />
      )}

      {/* ── STRATEGY PAYOFF SEQUENCE (MILESTONES) ── */}
      {simulation.payoffMilestones.length > 0 && (
        <div
          style={{
            background: "var(--card, #FFFFFF)",
            border: "2px solid var(--ink, #0A0A0A)",
            boxShadow: "3.5px 3.5px 0 var(--ink, #0A0A0A)",
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
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <span>🎯 {strategy} PAYOFF SEQUENCE & ELIMINATION ORDER</span>
            <span style={{ color: "#666666", fontWeight: 700 }}>
              Total Remaining: {formatCurrency(totalDebtBalance, 0)} (Base Min: {formatCurrency(totalMinMonthly, 0)}/mo)
            </span>
          </div>

          <div style={{ display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "6px" }}>
            {simulation.payoffMilestones.map((m, idx) => (
              <div
                key={m.debtId}
                style={{
                  minWidth: "200px",
                  background: "#F8FAFC",
                  border: "2px solid var(--ink, #0A0A0A)",
                  boxShadow: "2px 2px 0 var(--ink, #0A0A0A)",
                  borderRadius: "2px",
                  padding: "12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "10px", fontWeight: 900, background: "#0A0A0A", color: "#FFE600", padding: "1px 6px", borderRadius: "2px" }}>
                    KNOCKOUT #{idx + 1}
                  </span>
                  <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "10px", color: "#666666" }}>
                    Month {m.payoffMonth}
                  </span>
                </div>
                <div style={{ fontFamily: "var(--display, sans-serif)", fontSize: "17px", fontWeight: 900, marginTop: "4px" }}>
                  {m.name}
                </div>
                <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px", fontWeight: 800, color: "#166534", background: "#DCFCE7", padding: "2px 6px", border: "1px solid #166534", borderRadius: "2px", marginTop: "2px" }}>
                  🏆 Paid Off: {m.payoffDate}
                </div>
                <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "10.5px", color: "#555555" }}>
                  Interest Accrued: <b>{formatCurrency(m.totalInterestPaid, 2)}</b>
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
        {debts.map((d, index) => {
          const type = (d.debtType as DebtType) || "OTHER";
          const theme = DEBT_THEMES[type] || DEBT_THEMES.OTHER;
          const original = d.originalPrincipal || d.balance;
          const paidPct = original > 0 ? Math.min(100, Math.round(((original - d.balance) / original) * 100)) : 0;
          const isHighApr = d.interestRate >= 18;

          return (
            <div
              key={d.id}
              className="sub-card-editorial"
              style={
                {
                  "--cat-header-bg": isHighApr ? "#FF2E93" : "#00F0FF",
                  "--sub-index": index,
                  opacity: d.isPaidOff ? 0.6 : 1,
                } as React.CSSProperties
              }
            >
              {/* Header */}
              <div className="sub-card-header">
                <span className="sub-card-category">
                  <span className="sub-card-category-icon">{theme.icon}</span>
                  <span>{theme.label}</span>
                </span>

                <span
                  className="sub-card-status"
                  style={{
                    background: "#FFFFFF",
                    color: isHighApr ? "#BE123C" : "#0284C7",
                    borderColor: "#000000",
                  }}
                >
                  {d.interestRate}% APR
                </span>
              </div>

              {/* Body */}
              <div className="sub-card-body">
                <div className="sub-card-title-row">
                  <h3 className="sub-card-title">{d.name}</h3>
                  <div className="sub-card-price-box">
                    <span className="sub-card-price">{formatCurrency(d.balance, 2)}</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="debt-progress-bar">
                    <div className="debt-progress-fill" style={{ width: `${paidPct}%` }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--mono, monospace)", fontSize: "10px", fontWeight: 800, marginTop: "4px", color: "#555555" }}>
                    <span>{paidPct}% Paid</span>
                    <span>Min: {formatCurrency(d.minPayment, 0)}/mo</span>
                  </div>
                </div>

                {d.lender && (
                  <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px", color: "#444444" }}>
                    Institution: <b>{d.lender}</b> (Due: Day {d.dueDay || 1})
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="sub-card-footer">
                <button
                  type="button"
                  className="btn-card-action"
                  onClick={() => {
                    playSound.click();
                    onEditDebt(d);
                  }}
                >
                  ✎ EDIT
                </button>
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
