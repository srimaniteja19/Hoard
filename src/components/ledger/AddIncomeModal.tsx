"use client";

import React, { useState, useMemo } from "react";
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
}

export const AddIncomeModal: React.FC<AddIncomeModalProps> = ({ isOpen, onClose, onCreated }) => {
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

  React.useEffect(() => {
    if (isOpen) {
      setName("");
      setAmount("");
      setCadence("MONTHLY");
      setCategory("SALARY");
      setIsPreTax(false);
      setCountry("US");
      setRegion("CA");
      setCustomTaxRate("");
      setError(null);
    }
  }, [isOpen]);

  // Live tax preview calculation
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

      const res = await fetch("/api/financial/incomes", {
        method: "POST",
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
        throw new Error(data.error || "Failed to add income stream");
      }

      const created: FinancialIncomeRow = await res.json();
      playSound.fileIt();
      onCreated(created);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to add income stream");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ledger-modal-overlay" onClick={onClose}>
      <div className="ledger-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="ledger-modal-header">
          <h2>+ ADD INFLOW / INCOME STREAM</h2>
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
            <label>Income Stream Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Primary Salary, Consulting, Dividends, Side Project"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
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
              background: "rgba(0, 0, 0, 0.03)",
              border: "1px solid var(--ink, #0A0A0A)",
              borderRadius: "3px",
              padding: "14px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label style={{ fontFamily: "var(--mono)", fontSize: "10.5px", fontWeight: 900, textTransform: "uppercase" }}>
                🏛️ TAX & WITHHOLDING TREATMENT
              </label>

              <div className="debt-strategy-toggle" style={{ margin: 0 }}>
                <button
                  type="button"
                  className={`debt-strategy-btn ${!isPreTax ? "active" : ""}`}
                  onClick={() => setIsPreTax(false)}
                >
                  POST-TAX (NET)
                </button>
                <button
                  type="button"
                  className={`debt-strategy-btn ${isPreTax ? "active" : ""}`}
                  onClick={() => setIsPreTax(true)}
                >
                  PRE-TAX (GROSS)
                </button>
              </div>
            </div>

            {isPreTax && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "4px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div className="ledger-field">
                    <label>Country Jurisdiction</label>
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
                    placeholder="e.g. 28.5 (Leave blank for automated brackets)"
                    value={customTaxRate}
                    onChange={(e) => setCustomTaxRate(e.target.value)}
                  />
                </div>

                {/* Live Tax Preview Box */}
                {taxPreview && (
                  <div
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid #16A34A",
                      borderRadius: "2px",
                      padding: "10px 12px",
                      fontFamily: "var(--mono)",
                      fontSize: "11px",
                      lineHeight: 1.4,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, color: "#166534", marginBottom: "4px" }}>
                      <span>Estimated Effective Tax Rate: {taxPreview.effectiveTaxRatePct}%</span>
                      <span>Taxes: -${taxPreview.totalTaxMonthly.toFixed(2)}/mo</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#000000", fontWeight: 900, borderTop: "1px dashed rgba(0,0,0,0.15)", paddingTop: "4px" }}>
                      <span>Net Take-Home Pay:</span>
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
              {loading ? "SAVING..." : "REGISTER INFLOW"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
