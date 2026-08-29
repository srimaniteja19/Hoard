"use client";

import React, { useState } from "react";
import {
  FinancialAssetRow,
  AssetCategory,
  ASSET_CATEGORIES,
} from "@/lib/ledger/types";
import { playSound } from "@/lib/sound";

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (asset: FinancialAssetRow) => void;
}

export const AddAssetModal: React.FC<AddAssetModalProps> = ({ isOpen, onClose, onCreated }) => {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<AssetCategory>("CASH_CHECKING");
  const [value, setValue] = useState("");
  const [institution, setInstitution] = useState("");
  const [expectedYield, setExpectedYield] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setName("");
      setCategory("CASH_CHECKING");
      setValue("");
      setInstitution("");
      setExpectedYield("");
      setNotes("");
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !value) {
      setError("Please provide an Account Name and Value");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      playSound.click();

      const res = await fetch("/api/financial/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          category,
          value: parseFloat(value) || 0,
          institution: institution.trim() || null,
          expectedYield: expectedYield ? parseFloat(expectedYield) : null,
          notes: notes.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add asset");
      }

      const created: FinancialAssetRow = await res.json();
      playSound.fileIt();
      onCreated(created);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to add asset");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ledger-modal-overlay" onClick={onClose}>
      <div className="ledger-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="ledger-modal-header">
          <h2>+ ADD ASSET / HOLDING</h2>
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
            <label>Asset / Account Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Marcus HYSA, Vanguard VOO Brokerage, Fidelity 401(k)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div className="ledger-field">
              <label>Asset Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value as AssetCategory)}>
                {ASSET_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="ledger-field">
              <label>Current Total Value ($) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="15000.00"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div className="ledger-field">
              <label>Institution / Broker</label>
              <input
                type="text"
                placeholder="e.g. Fidelity, Vanguard, Schwab, Chase"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
              />
            </div>
            <div className="ledger-field">
              <label>Expected APY / Yield (%)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="4.50"
                value={expectedYield}
                onChange={(e) => setExpectedYield(e.target.value)}
              />
            </div>
          </div>

          <div className="ledger-field">
            <label>Notes / Asset Details</label>
            <textarea
              rows={2}
              placeholder="e.g. 6-month liquid emergency buffer"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="ledger-modal-footer">
            <button type="button" className="btn-ledger" onClick={onClose}>
              CANCEL
            </button>
            <button type="submit" disabled={loading} className="btn-ledger btn-ledger-primary">
              {loading ? "SAVING..." : "REGISTER ASSET"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
