"use client";

import React, { useState } from "react";
import {
  FinancialDebtRow,
  DebtType,
  DEBT_TYPES,
} from "@/lib/ledger/types";
import { playSound } from "@/lib/sound";

interface AddDebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (debt: FinancialDebtRow) => void;
}

export const AddDebtModal: React.FC<AddDebtModalProps> = ({ isOpen, onClose, onCreated }) => {
  const [name, setName] = useState("");
  const [debtType, setDebtType] = useState<DebtType>("CREDIT_CARD");
  const [balance, setBalance] = useState("");
  const [originalPrincipal, setOriginalPrincipal] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [minPayment, setMinPayment] = useState("");
  const [targetPayment, setTargetPayment] = useState("");
  const [dueDay, setDueDay] = useState("1");
  const [lender, setLender] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setName("");
      setDebtType("CREDIT_CARD");
      setBalance("");
      setOriginalPrincipal("");
      setInterestRate("");
      setMinPayment("");
      setTargetPayment("");
      setDueDay("1");
      setLender("");
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !balance || !interestRate || !minPayment) {
      setError("Please fill in Name, Balance, APR Interest Rate, and Minimum Payment");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      playSound.click();

      const bal = parseFloat(balance);
      const res = await fetch("/api/financial/debts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          debtType,
          balance: bal,
          originalPrincipal: originalPrincipal ? parseFloat(originalPrincipal) : bal,
          interestRate: parseFloat(interestRate),
          minPayment: parseFloat(minPayment),
          targetPayment: targetPayment ? parseFloat(targetPayment) : null,
          dueDay: parseInt(dueDay, 10) || 1,
          lender: lender.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add debt");
      }

      const created: FinancialDebtRow = await res.json();
      playSound.fileIt();
      onCreated(created);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to add debt");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ledger-modal-overlay" onClick={onClose}>
      <div className="ledger-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="ledger-modal-header">
          <h2>+ REGISTER DEBT / LIABILITY</h2>
          <button type="button" className="btn-ledger" onClick={onClose} style={{ padding: "4px 8px" }}>
            ✕
          </button>
        </div>

        {error && (
          <div
            style={{
              background: "#FEE2E2",
              color: "#DC2626",
              padding: "8px 12px",
              fontFamily: "var(--mono)",
              fontSize: "11px",
              fontWeight: 700,
              marginBottom: "14px",
              border: "1px solid #DC2626",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="ledger-form">
          <div className="ledger-field">
            <label>Debt / Account Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Chase Sapphire Reserve, Nelnet Student Loan"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div className="ledger-field">
              <label>Debt Type</label>
              <select value={debtType} onChange={(e) => setDebtType(e.target.value as DebtType)}>
                {DEBT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="ledger-field">
              <label>Lender / Institution</label>
              <input
                type="text"
                placeholder="e.g. Chase, Discover, SoFi"
                value={lender}
                onChange={(e) => setLender(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div className="ledger-field">
              <label>Current Remaining Balance ($) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="4500.00"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
              />
            </div>
            <div className="ledger-field">
              <label>Original Principal ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="6000.00"
                value={originalPrincipal}
                onChange={(e) => setOriginalPrincipal(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div className="ledger-field">
              <label>APR Interest Rate (%) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                required
                placeholder="21.99"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
              />
            </div>
            <div className="ledger-field">
              <label>Minimum Monthly Payment ($) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="120.00"
                value={minPayment}
                onChange={(e) => setMinPayment(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div className="ledger-field">
              <label>Target / Current Actual Payment ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="250.00"
                value={targetPayment}
                onChange={(e) => setTargetPayment(e.target.value)}
              />
            </div>
            <div className="ledger-field">
              <label>Payment Due Day of Month</label>
              <input
                type="number"
                min="1"
                max="31"
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
              />
            </div>
          </div>

          <div className="ledger-modal-footer">
            <button type="button" className="btn-ledger" onClick={onClose}>
              CANCEL
            </button>
            <button type="submit" disabled={loading} className="btn-ledger btn-ledger-primary">
              {loading ? "SAVING..." : "REGISTER DEBT ACCOUNT"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
