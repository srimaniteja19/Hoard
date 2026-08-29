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
import { CreditCard, DollarSign, CheckCircle, Plus, Minus } from "lucide-react";

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

/** Small inline payment panel shown when a card's payment row is expanded */
const PaymentPanel: React.FC<{
  debt: FinancialDebtRow;
  onUpdated: (updated: FinancialDebtRow) => void;
  onClose: () => void;
}> = ({ debt, onUpdated, onClose }) => {
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const applyPayment = async (paymentAmount: number, label: string) => {
    if (paymentAmount <= 0 || saving) return;
    setSaving(true);
    try {
      const newBalance = Math.max(0, debt.balance - paymentAmount);
      const res = await fetch(`/api/financial/debts/${debt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          balance: newBalance,
          isPaidOff: newBalance <= 0,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const updated = await res.json();
      playSound.fileIt();
      setFlash(
        `${label} of ${formatCurrency(paymentAmount, 2)} applied! New balance: ${formatCurrency(newBalance, 2)}`
      );
      setTimeout(() => {
        onUpdated(updated);
        onClose();
      }, 1800);
    } catch {
      setFlash("Payment failed — please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (flash) {
    return (
      <div
        style={{
          background: flash.includes("failed") ? "#FEE2E2" : "#DCFCE7",
          border: `1.5px solid ${flash.includes("failed") ? "#DC2626" : "#16A34A"}`,
          color: flash.includes("failed") ? "#991B1B" : "#15803D",
          padding: "10px 14px",
          borderRadius: "3px",
          fontFamily: "var(--mono, monospace)",
          fontSize: "11px",
          fontWeight: 800,
          textAlign: "center",
        }}
      >
        {flash.includes("failed") ? "⚠ " : "✓ "}
        {flash}
      </div>
    );
  }

  return (
    <div
      style={{
        background: "#F0FDF4",
        border: "2px solid #16A34A",
        boxShadow: "2px 2px 0 #16A34A",
        borderRadius: "3px",
        padding: "14px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            fontFamily: "var(--mono, monospace)",
            fontSize: "10px",
            fontWeight: 900,
            textTransform: "uppercase",
            color: "#166534",
            display: "flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
          <DollarSign size={11} aria-hidden="true" />
          RECORD A PAYMENT
        </div>
        <button
          type="button"
          className="btn-card-action"
          onClick={onClose}
          style={{ fontSize: "11px", padding: "2px 7px" }}
        >
          ✕
        </button>
      </div>

      {/* Quick-pay rows */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {/* Pay Minimum button */}
        <button
          type="button"
          onClick={() => applyPayment(debt.minPayment, "Minimum payment")}
          disabled={saving || debt.isPaidOff}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            fontFamily: "var(--mono, monospace)",
            fontSize: "10.5px",
            fontWeight: 900,
            padding: "5px 12px",
            background: "#0A0A0A",
            color: "#FFE600",
            border: "2px solid #0A0A0A",
            boxShadow: "2px 2px 0 #0A0A0A",
            borderRadius: "2px",
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.6 : 1,
          }}
        >
          <CheckCircle size={11} aria-hidden="true" />
          PAY MINIMUM ({formatCurrency(debt.minPayment, 0)})
        </button>

        {/* Pay extra = minimum + common extras */}
        {debt.targetPayment && debt.targetPayment > debt.minPayment && (
          <button
            type="button"
            onClick={() => applyPayment(debt.targetPayment!, "Target payment")}
            disabled={saving || debt.isPaidOff}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              fontFamily: "var(--mono, monospace)",
              fontSize: "10.5px",
              fontWeight: 900,
              padding: "5px 12px",
              background: "#166534",
              color: "#FFFFFF",
              border: "2px solid #166534",
              boxShadow: "2px 2px 0 #166534",
              borderRadius: "2px",
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.6 : 1,
            }}
          >
            <TrendingUpIcon size={11} />
            PAY TARGET ({formatCurrency(debt.targetPayment, 0)})
          </button>
        )}

        {/* Pay full balance */}
        <button
          type="button"
          onClick={() => applyPayment(debt.balance, "Full payoff")}
          disabled={saving || debt.isPaidOff}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            fontFamily: "var(--mono, monospace)",
            fontSize: "10.5px",
            fontWeight: 900,
            padding: "5px 12px",
            background: "#7C3AED",
            color: "#FFFFFF",
            border: "2px solid #7C3AED",
            boxShadow: "2px 2px 0 #7C3AED",
            borderRadius: "2px",
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.6 : 1,
          }}
        >
          🏆 PAY IN FULL ({formatCurrency(debt.balance, 0)})
        </button>
      </div>

      {/* Separator */}
      <div
        style={{
          fontFamily: "var(--mono, monospace)",
          fontSize: "9.5px",
          fontWeight: 800,
          color: "#888888",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        — OR ENTER CUSTOM AMOUNT —
      </div>

      {/* Custom amount input + confirm */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span
          style={{
            fontFamily: "var(--mono, monospace)",
            fontSize: "14px",
            fontWeight: 900,
            color: "#166534",
          }}
        >
          $
        </span>
        <input
          type="number"
          min="0.01"
          step="0.01"
          placeholder={`e.g. ${(debt.minPayment * 1.5).toFixed(0)}`}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={{
            flex: 1,
            fontFamily: "var(--mono, monospace)",
            fontSize: "15px",
            fontWeight: 900,
            color: "#166534",
            background: "#FFFFFF",
            padding: "6px 10px",
            border: "2px solid #16A34A",
            boxShadow: "2px 2px 0 #16A34A",
            borderRadius: "2px",
            outline: "none",
          }}
        />
        <button
          type="button"
          disabled={saving || !amount || parseFloat(amount) <= 0}
          onClick={() => {
            const amt = parseFloat(amount);
            if (!isNaN(amt) && amt > 0) {
              applyPayment(amt, "Extra payment");
            }
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            fontFamily: "var(--mono, monospace)",
            fontSize: "10.5px",
            fontWeight: 900,
            padding: "6px 14px",
            background: "#16A34A",
            color: "#FFFFFF",
            border: "2px solid #16A34A",
            boxShadow: "2px 2px 0 #16A34A",
            borderRadius: "2px",
            cursor: !amount || parseFloat(amount) <= 0 ? "not-allowed" : "pointer",
            opacity: !amount || parseFloat(amount) <= 0 ? 0.5 : 1,
          }}
        >
          <Minus size={11} aria-hidden="true" />
          APPLY
        </button>
      </div>

      {/* Remaining balance preview */}
      {amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0 && (
        <div
          style={{
            fontFamily: "var(--mono, monospace)",
            fontSize: "10.5px",
            fontWeight: 800,
            color: "#166534",
            background: "#DCFCE7",
            border: "1px solid #16A34A",
            borderRadius: "2px",
            padding: "5px 10px",
          }}
        >
          New balance after payment:{" "}
          <b>{formatCurrency(Math.max(0, debt.balance - parseFloat(amount)), 2)}</b>
          {parseFloat(amount) >= debt.balance && (
            <span style={{ marginLeft: "8px", color: "#7C3AED" }}>🏆 FULLY PAID OFF!</span>
          )}
        </div>
      )}
    </div>
  );
};

// Lightweight icon shim since lucide's TrendingUp is already imported elsewhere
const TrendingUpIcon = ({ size }: { size: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
    <polyline points="16 7 22 7 22 13" />
  </svg>
);

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
  // Track which card has its payment panel open
  const [activePaymentCardId, setActivePaymentCardId] = useState<string | null>(null);

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
          const isPaymentOpen = activePaymentCardId === d.id;

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

                {/* ── INLINE PAYMENT PANEL ── */}
                {isPaymentOpen && !d.isPaidOff && (
                  <PaymentPanel
                    debt={d}
                    onUpdated={(updated) => {
                      onUpdateDebt(updated);
                    }}
                    onClose={() => setActivePaymentCardId(null)}
                  />
                )}
              </div>

              {/* Actions Footer */}
              <div className="sub-card-footer">
                {/* Make Payment CTA — primary action */}
                {!d.isPaidOff && (
                  <button
                    type="button"
                    className="btn-card-action"
                    onClick={() => {
                      playSound.click();
                      setActivePaymentCardId(isPaymentOpen ? null : d.id);
                    }}
                    style={{
                      background: isPaymentOpen ? "#0A0A0A" : "#DCFCE7",
                      color: isPaymentOpen ? "#FFE600" : "#166534",
                      borderColor: isPaymentOpen ? "#0A0A0A" : "#16A34A",
                      fontWeight: 900,
                    }}
                  >
                    {isPaymentOpen ? "✕ CLOSE" : (
                      <>
                        <Plus
                          size={10}
                          style={{ display: "inline", verticalAlign: "middle", marginRight: "3px" }}
                          aria-hidden="true"
                        />
                        MAKE PAYMENT
                      </>
                    )}
                  </button>
                )}

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
