"use client";

import React, { useState, useEffect } from "react";
import {
  FinancialInvestmentRow,
  InvestmentAssetType,
  InvestmentCadence,
  INVESTMENT_ASSET_TYPES,
  INVESTMENT_CADENCES,
  INVESTMENT_THEMES,
} from "@/lib/ledger/types";
import { playSound } from "@/lib/sound";
import { getCurrencySymbol } from "@/lib/ledger/formatters";
import { Sparkles, Coins, TrendingUp } from "lucide-react";

const CURRENCY_OPTIONS = [
  { code: "INR", label: "₹ Indian Rupee (INR)" },
  { code: "USD", label: "$ US Dollar (USD)" },
  { code: "EUR", label: "€ Euro (EUR)" },
  { code: "GBP", label: "£ British Pound (GBP)" },
  { code: "JPY", label: "¥ Japanese Yen (JPY)" },
  { code: "CAD", label: "CA$ Canadian Dollar (CAD)" },
  { code: "AUD", label: "A$ Australian Dollar (AUD)" },
  { code: "SGD", label: "S$ Singapore Dollar (SGD)" },
];

interface AddInvestmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (investment: FinancialInvestmentRow) => void;
  onUpdated: (investment: FinancialInvestmentRow) => void;
  investmentToEdit: FinancialInvestmentRow | null;
}

const PRESETS = [
  // ── Indian Market Presets ────────────────────────────
  {
    name: "Digital Gold SIP (CRED / PhonePe)",
    assetType: "GOLD_PRECIOUS_METALS" as InvestmentAssetType,
    amount: 1000,
    currency: "INR",
    cadence: "MONTHLY" as InvestmentCadence,
    expectedReturnRate: 12.0,
    platform: "CRED",
  },
  {
    name: "Nifty 50 Index Fund SIP",
    assetType: "STOCKS_ETF" as InvestmentAssetType,
    amount: 5000,
    currency: "INR",
    cadence: "MONTHLY" as InvestmentCadence,
    expectedReturnRate: 13.0,
    platform: "Groww / Zerodha",
  },
  {
    name: "PPFAS / Mirae ELSS Mutual Fund SIP",
    assetType: "MUTUAL_FUND" as InvestmentAssetType,
    amount: 3000,
    currency: "INR",
    cadence: "MONTHLY" as InvestmentCadence,
    expectedReturnRate: 14.0,
    platform: "Coin / MFCentral",
  },
  {
    name: "EPF / PPF Retirement SIP",
    assetType: "RETIREMENT" as InvestmentAssetType,
    amount: 2000,
    currency: "INR",
    cadence: "MONTHLY" as InvestmentCadence,
    expectedReturnRate: 8.1,
    platform: "EPFO / India Post",
  },
  // ── US Market Presets ────────────────────────────────
  {
    name: "Vanguard S&P 500 Index (VOO)",
    assetType: "STOCKS_ETF" as InvestmentAssetType,
    amount: 500,
    currency: "USD",
    cadence: "MONTHLY" as InvestmentCadence,
    expectedReturnRate: 10.0,
    platform: "Vanguard",
  },
  {
    name: "Roth IRA Index Allocation",
    assetType: "RETIREMENT" as InvestmentAssetType,
    amount: 400,
    currency: "USD",
    cadence: "MONTHLY" as InvestmentCadence,
    expectedReturnRate: 8.5,
    platform: "Schwab",
  },
  {
    name: "Bitcoin / Ethereum Weekly DCA",
    assetType: "CRYPTO" as InvestmentAssetType,
    amount: 100,
    currency: "USD",
    cadence: "WEEKLY" as InvestmentCadence,
    expectedReturnRate: 15.0,
    platform: "Coinbase",
  },
  {
    name: "Real Estate REIT Dividend Fund",
    assetType: "REAL_ESTATE_REIT" as InvestmentAssetType,
    amount: 250,
    currency: "USD",
    cadence: "MONTHLY" as InvestmentCadence,
    expectedReturnRate: 7.5,
    platform: "Robinhood",
  },
];

export const AddInvestmentModal: React.FC<AddInvestmentModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  onUpdated,
  investmentToEdit,
}) => {
  const [name, setName] = useState("");
  const [assetType, setAssetType] = useState<InvestmentAssetType>("STOCKS_ETF");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [cadence, setCadence] = useState<InvestmentCadence>("MONTHLY");
  const [investmentDay, setInvestmentDay] = useState(1);
  const [platform, setPlatform] = useState("");
  const [expectedReturnRate, setExpectedReturnRate] = useState("10.0");
  const [currentValuation, setCurrentValuation] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (investmentToEdit) {
      setName(investmentToEdit.name);
      setAssetType((investmentToEdit.assetType as InvestmentAssetType) || "STOCKS_ETF");
      setAmount(investmentToEdit.amount.toString());
      setCurrency(investmentToEdit.currency || "INR");
      setCadence((investmentToEdit.cadence as InvestmentCadence) || "MONTHLY");
      setInvestmentDay(investmentToEdit.investmentDay || 1);
      setPlatform(investmentToEdit.platform || "");
      setExpectedReturnRate(
        investmentToEdit.expectedReturnRate !== null && investmentToEdit.expectedReturnRate !== undefined
          ? investmentToEdit.expectedReturnRate.toString()
          : "8.0"
      );
      setCurrentValuation(
        investmentToEdit.currentValuation !== null && investmentToEdit.currentValuation !== undefined
          ? investmentToEdit.currentValuation.toString()
          : ""
      );
      setStatus(investmentToEdit.status || "ACTIVE");
      setNotes(investmentToEdit.notes || "");
    } else {
      setName("");
      setAssetType("STOCKS_ETF");
      setAmount("");
      setCurrency("INR");
      setCadence("MONTHLY");
      setInvestmentDay(1);
      setPlatform("");
      setExpectedReturnRate("10.0");
      setCurrentValuation("");
      setStatus("ACTIVE");
      setNotes("");
    }
    setError(null);
  }, [investmentToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter a name for this recurring investment.");
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid recurring contribution amount.");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload = {
        name: name.trim(),
        assetType,
        amount: parsedAmount,
        currency,
        cadence,
        investmentDay: parseInt(investmentDay.toString(), 10) || 1,
        platform: platform.trim() || null,
        expectedReturnRate: expectedReturnRate !== "" ? parseFloat(expectedReturnRate) : null,
        currentValuation: currentValuation !== "" ? parseFloat(currentValuation) : null,
        status,
        notes: notes.trim() || null,
      };

      const url = investmentToEdit
        ? `/api/financial/investments/${investmentToEdit.id}`
        : "/api/financial/investments";
      const method = investmentToEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save investment");
      }

      const saved = await res.json();
      playSound.fileIt();
      if (investmentToEdit) {
        onUpdated(saved);
      } else {
        onCreated(saved);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleApplyPreset = (p: typeof PRESETS[0]) => {
    playSound.click();
    setName(p.name);
    setAssetType(p.assetType);
    setAmount(p.amount.toString());
    setCurrency(p.currency || "INR");
    setCadence(p.cadence);
    setExpectedReturnRate(p.expectedReturnRate.toString());
    setPlatform(p.platform);
  };

  const currSym = getCurrencySymbol(currency);

  return (
    <div className="ledger-modal-overlay" onClick={onClose}>
      <div className="ledger-modal-box" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="ledger-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <TrendingUp size={20} aria-hidden="true" />
            <h2>
              {investmentToEdit ? "EDIT RECURRING INVESTMENT" : "ADD RECURRING INVESTMENT (SIP / DCA)"}
            </h2>
          </div>
          <button
            type="button"
            className="btn-card-action"
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* 1-Click Quick Presets */}
        {!investmentToEdit && (
          <div style={{ marginBottom: "16px" }}>
            <div
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "10px",
                fontWeight: 900,
                color: "#666666",
                textTransform: "uppercase",
                marginBottom: "6px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <Sparkles size={11} aria-hidden="true" />
              QUICK ASSET PRESETS:
            </div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {PRESETS.map((p) => {
                const theme = INVESTMENT_THEMES[p.assetType];
                return (
                  <button
                    key={p.name}
                    type="button"
                    className="sub-filter-btn"
                    style={{ fontSize: "9.5px", padding: "4px 8px" }}
                    onClick={() => handleApplyPreset(p)}
                  >
                    <span>{theme.icon}</span> {theme.shortLabel} ({getCurrencySymbol(p.currency)}{p.amount.toLocaleString()})
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div
            style={{
              background: "#FEE2E2",
              border: "1.5px solid #DC2626",
              color: "#991B1B",
              padding: "10px 14px",
              borderRadius: "3px",
              fontFamily: "var(--mono, monospace)",
              fontSize: "11px",
              marginBottom: "14px",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="ledger-form">
          {/* Investment Name */}
          <div className="ledger-field">
            <label htmlFor="inv-name">INVESTMENT / ASSET NAME *</label>
            <input
              id="inv-name"
              type="text"
              required
              placeholder="e.g. Sovereign Gold SIP, S&P 500 VOO, Nifty 50, Bitcoin DCA"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Asset Type & Frequency */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div className="ledger-field">
              <label htmlFor="inv-asset-type">ASSET CATEGORY</label>
              <select
                id="inv-asset-type"
                value={assetType}
                onChange={(e) => setAssetType(e.target.value as InvestmentAssetType)}
              >
                {INVESTMENT_ASSET_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {INVESTMENT_THEMES[type]?.icon} {INVESTMENT_THEMES[type]?.label || type}
                  </option>
                ))}
              </select>
            </div>

            <div className="ledger-field">
              <label htmlFor="inv-cadence">CONTRIBUTION CADENCE</label>
              <select
                id="inv-cadence"
                value={cadence}
                onChange={(e) => setCadence(e.target.value as InvestmentCadence)}
              >
                {INVESTMENT_CADENCES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Currency & Amount */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div className="ledger-field">
              <label htmlFor="inv-currency">CURRENCY</label>
              <select
                id="inv-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                {CURRENCY_OPTIONS.map((c) => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
            </div>

            <div className="ledger-field">
              <label htmlFor="inv-amount">RECURRING AMOUNT ({currSym}) *</label>
              <input
                id="inv-amount"
                type="number"
                step="any"
                min="0.01"
                required
                placeholder={currency === "INR" ? "e.g. 5000" : "e.g. 500.00"}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>

          {/* Investment Day */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div className="ledger-field">
              <label htmlFor="inv-day">INVESTMENT DAY (DAY OF MONTH)</label>
              <input
                id="inv-day"
                type="number"
                min="1"
                max="31"
                value={investmentDay}
                onChange={(e) => setInvestmentDay(parseInt(e.target.value, 10) || 1)}
              />
            </div>
            <div /> {/* spacer */}
          </div>

          {/* Platform & Expected Return Rate CAGR */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div className="ledger-field">
              <label htmlFor="inv-platform">PLATFORM / BROKER</label>
              <input
                id="inv-platform"
                type="text"
                placeholder="e.g. Vanguard, Robinhood, Groww, BullionVault"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
              />
            </div>

            <div className="ledger-field">
              <label htmlFor="inv-cagr">EXPECTED CAGR (%)</label>
              <input
                id="inv-cagr"
                type="number"
                step="0.1"
                min="0"
                max="100"
                placeholder="e.g. 10.0 (S&P avg)"
                value={expectedReturnRate}
                onChange={(e) => setExpectedReturnRate(e.target.value)}
              />
            </div>
          </div>

          {/* Accumulated Valuation (Optional) & Status */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div className="ledger-field">
              <label htmlFor="inv-valuation">CURRENT ACCUMULATED VALUE ({currSym})</label>
              <input
                id="inv-valuation"
                type="number"
                step="any"
                min="0"
                placeholder={currency === "INR" ? "e.g. 50000 (Current holding)" : "e.g. 12500 (Current holding)"}
                value={currentValuation}
                onChange={(e) => setCurrentValuation(e.target.value)}
              />
            </div>

            <div className="ledger-field">
              <label htmlFor="inv-status">STATUS</label>
              <select
                id="inv-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="ACTIVE">ACTIVE (DEPLOYING)</option>
                <option value="PAUSED">PAUSED</option>
                <option value="COMPLETED">COMPLETED / MATURED</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div className="ledger-field">
            <label htmlFor="inv-notes">NOTES & STRATEGY GOALS (OPTIONAL)</label>
            <textarea
              id="inv-notes"
              rows={2}
              placeholder="e.g. Long-term wealth accumulation for retirement, auto-debit on 1st of month"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Modal Footer */}
          <div className="ledger-modal-footer">
            <button
              type="button"
              className="btn-ledger"
              onClick={onClose}
              disabled={saving}
            >
              CANCEL
            </button>
            <button
              type="submit"
              className="btn-ledger btn-ledger-primary"
              disabled={saving}
            >
              {saving ? "SAVING..." : investmentToEdit ? "SAVE CHANGES" : "+ ADD RECURRING INVESTMENT"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
