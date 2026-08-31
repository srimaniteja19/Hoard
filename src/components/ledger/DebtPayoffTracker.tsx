"use client";

import React, { useState, useMemo } from "react";
import {
  FinancialDebtRow,
  DebtPayoffStrategy,
  DebtType,
} from "@/lib/ledger/types";
import { formatCurrency, formatSignedCurrency, getCurrencySymbol } from "@/lib/ledger/formatters";
import { calculateDebtPayoff } from "@/lib/ledger/debtPayoff";
import { getDebtCycleRecord, recordCyclePayment } from "@/lib/ledger/debtCycleTracker";
import { playSound } from "@/lib/sound";
import { DebtAmortizationChart } from "./charts/DebtAmortizationChart";
import { CreditCard, DollarSign, CheckCircle, Plus, Minus, TrendingUp as TrendingUpIcon } from "lucide-react";

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
  currency?: string;
}

/** Small inline payment panel shown when a card's payment row is expanded */
const PaymentPanel: React.FC<{
  debt: FinancialDebtRow;
  onUpdated: (updated: FinancialDebtRow) => void;
  onClose: () => void;
  currency?: string;
}> = ({ debt, onUpdated, onClose, currency = "USD" }) => {
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  // Monthly interest on the current balance (APR / 12)
  const monthlyRate = (debt.interestRate || 0) / 100 / 12;
  const monthlyInterest = Math.round(debt.balance * monthlyRate * 100) / 100;

  // Load current monthly cycle payment history
  const [cycleRecord, setCycleRecord] = useState(() =>
    getDebtCycleRecord(debt.id, monthlyInterest)
  );

  const interestPaidThisMonth = cycleRecord.interestPaidThisCycle;
  const remainingInterestDue = Math.max(0, monthlyInterest - interestPaidThisMonth);
  const isInterestFullyCovered = remainingInterestDue <= 0.009;

  const applyPayment = async (paymentAmount: number, label: string) => {
    if (paymentAmount <= 0 || saving) return;
    setSaving(true);
    try {
      // Calculate split and record payment in this month's cycle
      const { record: updatedCycle, calculation } = recordCyclePayment(
        debt.id,
        paymentAmount,
        monthlyInterest,
        label
      );
      setCycleRecord(updatedCycle);

      const newBalance = Math.round(Math.max(0, debt.balance - calculation.principalReduction) * 100) / 100;

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

      let interestNote = "";
      if (calculation.interestPortion > 0) {
        const clearedStatus = calculation.isInterestFullyCleared
          ? " [Monthly interest 100% cleared! ✓]"
          : ` [Remaining interest: ${formatCurrency(calculation.remainingInterestAfterPayment, 2, currency)}]`;
        interestNote = ` (Interest: ${formatCurrency(calculation.interestPortion, 2, currency)}${clearedStatus} · Principal: ${formatCurrency(calculation.principalReduction, 2, currency)})`;
      } else {
        interestNote = ` (Interest: $0.00 [Already cleared this cycle ✓] · Principal: ${formatCurrency(calculation.principalReduction, 2, currency)})`;
      }

      setFlash(
        `${label} of ${formatCurrency(paymentAmount, 2, currency)} applied!${interestNote} New balance: ${formatCurrency(newBalance, 2, currency)}`
      );
      setTimeout(() => {
        onUpdated(updated);
        onClose();
      }, 2400);
    } catch {
      setFlash("Payment failed — please try again.");
    } finally {
      setSaving(false);
    }
  };

  const sym = getCurrencySymbol(currency);

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

      {/* ── This Month's Interest Breakdown ── */}
      {monthlyInterest > 0 && (
        <div
          style={{
            background: isInterestFullyCovered ? "#F0FDF4" : "#FFF9C4",
            border: `1px solid ${isInterestFullyCovered ? "#16A34A" : "#D97706"}`,
            borderRadius: "3px",
            padding: "8px 10px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            fontFamily: "var(--mono, monospace)",
            fontSize: "10.5px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
            <span style={{ color: isInterestFullyCovered ? "#15803D" : "#92400E", fontWeight: 900 }}>
              {isInterestFullyCovered ? "✓ THIS MONTH'S INTEREST FULLY CLEARED:" : "⚠ THIS MONTH'S ACCRUED INTEREST:"}
            </span>
            <span style={{ color: isInterestFullyCovered ? "#15803D" : "#DC2626", fontWeight: 900 }}>
              {formatCurrency(monthlyInterest, 2, currency)}
            </span>
          </div>

          {interestPaidThisMonth > 0 && !isInterestFullyCovered && (
            <div style={{ color: "#4B5563" }}>
              Already credited this month: <b style={{ color: "#15803D" }}>{formatCurrency(interestPaidThisMonth, 2, currency)}</b> · Remaining to clear: <b style={{ color: "#DC2626" }}>{formatCurrency(remainingInterestDue, 2, currency)}</b>
            </div>
          )}

          <div style={{ color: "#555555" }}>
            {isInterestFullyCovered ? (
              <span style={{ color: "#166534", fontWeight: 800 }}>
                Next payment goes <b>100% straight to principal reduction</b> ($0 interest deducted).
              </span>
            ) : (
              <span>
                Any payment above <b>{formatCurrency(remainingInterestDue, 2, currency)}</b> goes 100% to principal reduction.
              </span>
            )}
          </div>
        </div>
      )}

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
          PAY MINIMUM ({formatCurrency(debt.minPayment, 0, currency)})
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
            PAY TARGET ({formatCurrency(debt.targetPayment, 0, currency)})
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
          🏆 PAY IN FULL ({formatCurrency(debt.balance, 0, currency)})
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
          {sym}
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
            fontSize: "14px",
            fontWeight: 900,
            padding: "5px 8px",
            border: "1.5px solid #16A34A",
            borderRadius: "2px",
            outline: "none",
            background: "#FFFFFF",
          }}
        />
        <button
          type="button"
          onClick={() => {
            const parsed = parseFloat(amount);
            if (!isNaN(parsed) && parsed > 0) {
              applyPayment(parsed, `Extra payment of ${formatCurrency(parsed, 2, currency)}`);
            }
          }}
          disabled={saving || !amount || parseFloat(amount) <= 0}
          style={{
            fontFamily: "var(--mono, monospace)",
            fontSize: "11px",
            fontWeight: 900,
            padding: "6px 14px",
            background: "#16A34A",
            color: "#FFFFFF",
            border: "2px solid #16A34A",
            boxShadow: "2px 2px 0 #16A34A",
            borderRadius: "2px",
            cursor: saving || !amount || parseFloat(amount) <= 0 ? "not-allowed" : "pointer",
            opacity: saving || !amount || parseFloat(amount) <= 0 ? 0.5 : 1,
          }}
        >
          {saving ? "APPLYING..." : "APPLY"}
        </button>
      </div>

      {/* Balance preview when custom amount entered */}
      {amount && parseFloat(amount) > 0 && (
        <div
          style={{
            fontFamily: "var(--mono, monospace)",
            fontSize: "10.5px",
            color: "#166534",
            fontWeight: 700,
          }}
        >
          New balance after payment:{" "}
          <b>{formatCurrency(Math.max(0, debt.balance - parseFloat(amount)), 2, currency)}</b>
          {parseFloat(amount) >= debt.balance && " — 🏆 FULLY PAID OFF!"}
        </div>
      )}
    </div>
  );
};

export const DebtPayoffTracker: React.FC<DebtPayoffTrackerProps> = ({
  debts,
  onAddDebt,
  onEditDebt,
  onUpdateDebt,
  onDeleteDebt,
  currency = "USD",
}) => {
  const [strategy, setStrategy] = useState<DebtPayoffStrategy>("AVALANCHE");
  const [extraPayment, setExtraPayment] = useState<number>(150);
  const [lumpSum, setLumpSum] = useState<number>(0);
  const [activePaymentCardId, setActivePaymentCardId] = useState<string | null>(null);

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

  const sym = getCurrencySymbol(currency);

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
        {/* Simulator Top Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px", fontWeight: 900, textTransform: "uppercase", color: "#666666", letterSpacing: "0.08em", marginBottom: "2px" }}>
              QUANTITATIVE ENGINE
            </div>
            <h2 style={{ fontFamily: "var(--display, sans-serif)", fontSize: "26px", fontWeight: 900, margin: 0 }}>
              DEBT KNOCKOUT &amp; AMORTIZATION SIMULATOR
            </h2>
          </div>

          {/* Strategy Selector Tabs */}
          <div className="debt-strategy-toggle">
            <button
              type="button"
              className={`debt-strategy-btn ${strategy === "AVALANCHE" ? "active" : ""}`}
              onClick={() => {
                playSound.click();
                setStrategy("AVALANCHE");
              }}
            >
              🏔️ AVALANCHE (HIGHEST APR)
            </button>
            <button
              type="button"
              className={`debt-strategy-btn ${strategy === "SNOWBALL" ? "active" : ""}`}
              onClick={() => {
                playSound.click();
                setStrategy("SNOWBALL");
              }}
            >
              ⛄ SNOWBALL (LOWEST BALANCE)
            </button>
          </div>
        </div>

        {/* Strategy Explainer Banner */}
        <div
          style={{
            background: strategy === "AVALANCHE" ? "#F0FDF4" : "#FEF3C7",
            border: `1.5px solid ${strategy === "AVALANCHE" ? "#16A34A" : "#D97706"}`,
            padding: "10px 14px",
            borderRadius: "2px",
            fontFamily: "var(--mono, monospace)",
            fontSize: "11px",
            color: strategy === "AVALANCHE" ? "#166534" : "#92400E",
          }}
        >
          {strategy === "AVALANCHE" ? (
            <span>
              💡 <b>Debt Avalanche (Mathematically Optimal):</b> Directs all surplus funds toward the highest APR debt first ({debts.filter(d => !d.isPaidOff).sort((a, b) => b.interestRate - a.interestRate)[0]?.name || "account"}), minimizing total interest paid.
            </span>
          ) : (
            <span>
              💡 <b>Debt Snowball (Psychological Momentum):</b> Knocks out the smallest balance account first ({debts.filter(d => !d.isPaidOff).sort((a, b) => a.balance - b.balance)[0]?.name || "account"}) to rapidly free up monthly cash flow minimums.
            </span>
          )}
        </div>

        {/* ── INTERACTIVE WHAT-IF SLIDERS ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
          {/* 1. Monthly Extra Surplus Payment: Direct Input & Scalable Slider */}
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
                ⚡ MONTHLY EXTRA SURPLUS PAYMENT
              </label>

              {/* Direct Editable Number Input Box */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "14px", fontWeight: 900, color: "#166534" }}>+ {sym}</span>
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
                  {amount === 0 ? `MINIMUMS (${sym}0)` : `+${sym}${amount.toLocaleString()}`}
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
                <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "14px", fontWeight: 900 }}>{sym}</span>
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
                  {amount === 0 ? `NO WINDFALL (${sym}0)` : `+${sym}${amount.toLocaleString()}`}
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
              {formatSignedCurrency(simulation.interestSavedVsMinimums, 2, currency)}
            </div>
            <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px", fontWeight: 700, color: "#854D0E", marginTop: "6px" }}>
              Paid Interest: <b>{formatCurrency(simulation.totalInterestPaid, 2, currency)}</b> (vs {formatCurrency(simulation.baselineTotalInterestPaid, 2, currency)} baseline)
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
              {formatCurrency(simulation.totalPrincipalPaid + simulation.totalInterestPaid, 2, currency)}
            </div>
            <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px", fontWeight: 700, color: "#64748B", marginTop: "6px" }}>
              Principal: {formatCurrency(simulation.totalPrincipalPaid, 0, currency)} + Interest: {formatCurrency(simulation.totalInterestPaid, 0, currency)}
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
          currency={currency}
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
            <span>🎯 {strategy} PAYOFF SEQUENCE &amp; ELIMINATION ORDER</span>
            <span style={{ color: "#666666", fontWeight: 700 }}>
              Total Remaining: {formatCurrency(totalDebtBalance, 0, currency)} (Base Min: {formatCurrency(totalMinMonthly, 0, currency)}/mo)
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
                  Interest Accrued: <b>{formatCurrency(m.totalInterestPaid, 2, currency)}</b>
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

      {/* ── AGGREGATE DEBT PROGRESS TRACKER ── */}
      {debts.filter((d) => !d.isPaidOff).length > 0 && (() => {
        const activeDebts = debts.filter((d) => !d.isPaidOff);
        const totalOriginal = activeDebts.reduce((s, d) => s + (d.originalPrincipal || d.balance), 0);
        const totalRemaining = activeDebts.reduce((s, d) => s + d.balance, 0);
        const totalPaid = totalOriginal - totalRemaining;
        const paidPct = totalOriginal > 0 ? Math.min(100, Math.round((totalPaid / totalOriginal) * 100)) : 0;
        const sym = getCurrencySymbol(currency);

        return (
          <div
            style={{
              marginTop: "14px",
              padding: "14px 18px",
              background: "#0A0A0A",
              border: "2px solid #1E1E1E",
              display: "flex",
              flexWrap: "wrap",
              gap: "18px",
              alignItems: "center",
            }}
          >
            {/* Stats row */}
            <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", flex: 1, minWidth: "0" }}>
              {[
                { label: "TOTAL ORIGINAL", value: `${sym}${totalOriginal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, color: "#888888" },
                { label: "PAID SO FAR", value: `${sym}${totalPaid.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, color: "#4ADE80" },
                { label: "REMAINING", value: `${sym}${totalRemaining.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, color: "#FFE600" },
                { label: "ACCOUNTS", value: `${activeDebts.length} Active`, color: "#888888" },
              ].map((stat) => (
                <div key={stat.label}>
                  <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "9px", fontWeight: 900, color: "#555555", letterSpacing: "0.06em" }}>
                    {stat.label}
                  </div>
                  <div style={{ fontFamily: "var(--display, sans-serif)", fontSize: "16px", fontWeight: 900, color: stat.color, marginTop: "1px" }}>
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Progress */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
              <div style={{ width: "160px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "9px", fontWeight: 900, color: "#555555" }}>OVERALL PAYOFF</span>
                  <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px", fontWeight: 900, color: paidPct >= 50 ? "#4ADE80" : "#FFE600" }}>
                    {paidPct}%
                  </span>
                </div>
                <div style={{ height: "6px", background: "#1E1E1E", borderRadius: "2px", overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${paidPct}%`,
                      background: paidPct >= 75 ? "#4ADE80" : paidPct >= 40 ? "#FFE600" : "#FF2E93",
                      transition: "width 0.4s ease",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="sub-grid">
        {debts.map((d, index) => {
          const type = (d.debtType as DebtType) || "OTHER";
          const theme = DEBT_THEMES[type] || DEBT_THEMES.OTHER;
          const original = d.originalPrincipal || d.balance;
          const paidPct = original > 0 ? Math.min(100, Math.round(((original - d.balance) / original) * 100)) : 0;
          const isHighApr = d.interestRate >= 18;
          const isPaymentOpen = activePaymentCardId === d.id;
          const debtCurrency = (d as any).currency || currency;

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
                    <span className="sub-card-price">{formatCurrency(d.balance, 2, debtCurrency)}</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="debt-progress-bar">
                    <div className="debt-progress-fill" style={{ width: `${paidPct}%` }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--mono, monospace)", fontSize: "10px", fontWeight: 800, marginTop: "4px", color: "#555555" }}>
                    <span>{paidPct}% Paid</span>
                    <span>Min: {formatCurrency(d.minPayment, 0, debtCurrency)}/mo</span>
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
                    currency={debtCurrency}
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
                      borderColor: "#166534",
                      fontWeight: 900,
                    }}
                  >
                    💳 {isPaymentOpen ? "CLOSE PANEL" : "MAKE PAYMENT"}
                  </button>
                )}

                <button
                  type="button"
                  className="btn-card-action"
                  onClick={() => handleMarkPaid(d)}
                >
                  {d.isPaidOff ? "REOPEN" : "✓ PAID OFF"}
                </button>
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
