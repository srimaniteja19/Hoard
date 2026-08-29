"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  FinancialIncomeRow,
  IncomeCadence,
  INCOME_CADENCES,
} from "@/lib/ledger/types";
import {
  calculateIncomeTax,
  SUPPORTED_COUNTRIES,
  US_STATES,
  CANADIAN_PROVINCES,
} from "@/lib/ledger/taxCalculator";
import { playSound } from "@/lib/sound";

interface AddIncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (income: FinancialIncomeRow) => void;
  onUpdated?: (income: FinancialIncomeRow) => void;
  incomeToEdit?: FinancialIncomeRow | null;
}

export const AddIncomeModal: React.FC<AddIncomeModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  onUpdated,
  incomeToEdit,
}) => {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [cadence, setCadence] = useState<IncomeCadence>("MONTHLY");
  const [category, setCategory] = useState("SALARY");
  const [isPreTax, setIsPreTax] = useState(false);
  const [country, setCountry] = useState("US");
  const [region, setRegion] = useState("CA");
  const [customTaxRate, setCustomTaxRate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!incomeToEdit;

  useEffect(() => {
    if (isOpen) {
      if (incomeToEdit) {
        setName(incomeToEdit.name || "");
        setAmount(incomeToEdit.amount ? incomeToEdit.amount.toString() : "");
        setCadence((incomeToEdit.cadence as IncomeCadence) || "MONTHLY");
        setCategory(incomeToEdit.category || "SALARY");
        setIsPreTax(!!incomeToEdit.isPreTax);
        setCountry(incomeToEdit.country || "US");
        setRegion(incomeToEdit.region || "CA");
        setCustomTaxRate(incomeToEdit.customTaxRate ? incomeToEdit.customTaxRate.toString() : "");
      } else {
        setName("");
        setAmount("");
        setCadence("MONTHLY");
        setCategory("SALARY");
        setIsPreTax(false);
        setCountry("US");
        setRegion("CA");
        setCustomTaxRate("");
      }
      setError(null);
    }
  }, [isOpen, incomeToEdit]);

  const taxPreview = useMemo(() => {
    const numAmount = parseFloat(amount) || 0;
    if (numAmount <= 0) return null;

    return calculateIncomeTax({
      amount: numAmount,
      cadence,
      isPreTax,
      country,
      region,
      customTaxRate: customTaxRate ? parseFloat(customTaxRate) : null,
    });
  }, [amount, cadence, isPreTax, country, region, customTaxRate]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !amount) {
      setError("Please provide an Income Stream Name and Amount");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      playSound.click();

      const url = isEditing
        ? `/api/financial/incomes/${incomeToEdit.id}`
        : "/api/financial/incomes";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          amount: parseFloat(amount) || 0,
          cadence,
          category,
          isActive: true,
          isPreTax,
          country: isPreTax ? country : "US",
          region: isPreTax ? region : null,
          customTaxRate: isPreTax && customTaxRate ? parseFloat(customTaxRate) : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save income stream");
      }

      const saved: FinancialIncomeRow = await res.json();
      playSound.fileIt();

      if (isEditing && onUpdated) {
        onUpdated(saved);
      } else {
        onCreated(saved);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save income stream");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ledger-modal-overlay" onClick={onClose}>
      <div className="ledger-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="ledger-modal-header">
          <h2>{isEditing ? "✎ EDIT INFLOW STREAM" : "+ ADD INFLOW STREAM"}</h2>
          <button type="button" className="btn-ledger" onClick={onClose} style={{ padding: "3px 8px", fontSize: "10px" }}>
            ✕
          </button>
        </div>

        {error && (
          <div
            style={{
              background: "#FEE2E2",
              color: "#DC2626",
              padding: "8px 12px",
              fontFamily: "var(--mono, monospace)",
              fontSize: "11px",
              fontWeight: 700,
              marginBottom: "14px",
              border: "1px solid #DC2626",
              borderRadius: "2px",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="ledger-form">
          <div className="ledger-field">
            <label>Income Stream Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Primary Salary, Consulting, Dividends"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: "10px" }}>
            <div className="ledger-field">
              <label>Amount ($ USD) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="6500.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="ledger-field">
              <label>Pay Cadence</label>
              <select value={cadence} onChange={(e) => setCadence(e.target.value as IncomeCadence)}>
                {INCOME_CADENCES.map((c) => (
                  <option key={c} value={c}>
                    {c.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="ledger-field">
            <label>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="SALARY">SALARY / W-2</option>
              <option value="FREELANCE">FREELANCE / 1099</option>
              <option value="BUSINESS">BUSINESS / SIDE VENTURE</option>
              <option value="INVESTMENTS">DIVIDENDS / INTEREST</option>
              <option value="RENTAL">REAL ESTATE / RENTAL</option>
              <option value="OTHER">OTHER</option>
            </select>
          </div>

          {/* ── TAX WITHHOLDING & JURISDICTION PROFILE ── */}
          <div
            style={{
              background: "rgba(0, 0, 0, 0.025)",
              border: "1px solid rgba(0, 0, 0, 0.15)",
              borderRadius: "3px",
              padding: "12px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              boxSizing: "border-box",
              width: "100%",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
              <label style={{ fontFamily: "var(--mono, monospace)", fontSize: "10px", fontWeight: 800, textTransform: "uppercase", color: "#555555" }}>
                TAX WITHHOLDING TREATMENT
              </label>

              <div className="debt-strategy-toggle" style={{ margin: 0 }}>
                <button
                  type="button"
                  className={`debt-strategy-btn ${!isPreTax ? "active" : ""}`}
                  onClick={() => setIsPreTax(false)}
                  style={{ fontSize: "10px", padding: "4px 8px" }}
                >
                  POST-TAX (NET)
                </button>
                <button
                  type="button"
                  className={`debt-strategy-btn ${isPreTax ? "active" : ""}`}
                  onClick={() => setIsPreTax(true)}
                  style={{ fontSize: "10px", padding: "4px 8px" }}
                >
                  PRE-TAX (GROSS)
                </button>
              </div>
            </div>

            {isPreTax && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: "10px", width: "100%" }}>
                  <div className="ledger-field">
                    <label>Country</label>
                    <select value={country} onChange={(e) => setCountry(e.target.value)}>
                      {SUPPORTED_COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {country === "US" && (
                    <div className="ledger-field">
                      <label>State Jurisdiction</label>
                      <select value={region} onChange={(e) => setRegion(e.target.value)}>
                        {US_STATES.map((s) => (
                          <option key={s.code} value={s.code}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {country === "CA" && (
                    <div className="ledger-field">
                      <label>Province</label>
                      <select value={region} onChange={(e) => setRegion(e.target.value)}>
                        {CANADIAN_PROVINCES.map((p) => (
                          <option key={p.code} value={p.code}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="ledger-field">
                  <label>Custom Effective Tax Rate (% Optional Override)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    placeholder="Leave blank for automated brackets"
                    value={customTaxRate}
                    onChange={(e) => setCustomTaxRate(e.target.value)}
                  />
                </div>

                {/* Live Tax Preview Box */}
                {taxPreview && (
                  <div
                    style={{
                      background: "#F0FDF4",
                      border: "1px solid #16A34A",
                      borderRadius: "2px",
                      padding: "8px 10px",
                      fontFamily: "var(--mono, monospace)",
                      fontSize: "11px",
                      lineHeight: 1.35,
                      boxSizing: "border-box",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, color: "#166534", marginBottom: "4px" }}>
                      <span>Effective Rate: <b>{taxPreview.effectiveTaxRatePct}%</b></span>
                      <span>Taxes: <b>-${taxPreview.totalTaxMonthly.toFixed(2)}/mo</b></span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#000000", fontWeight: 900, borderTop: "1px dashed rgba(22, 163, 74, 0.4)", paddingTop: "4px" }}>
                      <span>Estimated Net Take-Home:</span>
                      <span>+${taxPreview.netMonthlyIncome.toFixed(2)} / MO</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="ledger-modal-footer">
            <button type="button" className="btn-ledger" onClick={onClose}>
              CANCEL
            </button>
            <button type="submit" disabled={loading} className="btn-ledger btn-ledger-primary">
              {loading ? "SAVING..." : isEditing ? "UPDATE INFLOW" : "REGISTER INFLOW"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
