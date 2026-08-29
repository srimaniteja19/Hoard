"use client";

import React, { useState, useEffect } from "react";
import {
  FinancialSubscriptionRow,
  SubscriptionCadence,
  SubscriptionCategory,
  SubscriptionStatus,
  SUBSCRIPTION_CADENCES,
  SUBSCRIPTION_CATEGORIES,
} from "@/lib/ledger/types";
import { playSound } from "@/lib/sound";

const PRESETS = [
  { name: "Cursor Pro", amount: 20, cadence: "MONTHLY" as const, category: "SAAS" as const, icon: "⚡" },
  { name: "Claude Pro", amount: 20, cadence: "MONTHLY" as const, category: "SAAS" as const, icon: "⚡" },
  { name: "ChatGPT Plus", amount: 20, cadence: "MONTHLY" as const, category: "SAAS" as const, icon: "⚡" },
  { name: "GitHub Copilot", amount: 10, cadence: "MONTHLY" as const, category: "SAAS" as const, icon: "⚡" },
  { name: "Spotify Premium", amount: 11.99, cadence: "MONTHLY" as const, category: "MEDIA" as const, icon: "🎬" },
  { name: "Netflix Standard", amount: 15.49, cadence: "MONTHLY" as const, category: "MEDIA" as const, icon: "🎬" },
  { name: "YouTube Premium", amount: 13.99, cadence: "MONTHLY" as const, category: "MEDIA" as const, icon: "🎬" },
  { name: "iCloud 2TB", amount: 9.99, cadence: "MONTHLY" as const, category: "INFRA" as const, icon: "☁️" },
  { name: "AWS Cloud", amount: 45, cadence: "MONTHLY" as const, category: "INFRA" as const, icon: "☁️" },
  { name: "Equinox / Gym", amount: 180, cadence: "MONTHLY" as const, category: "HEALTH" as const, icon: "🌿" },
  { name: "Whoop / Fitness", amount: 30, cadence: "MONTHLY" as const, category: "HEALTH" as const, icon: "🌿" },
  { name: "Substack / Gazette", amount: 10, cadence: "MONTHLY" as const, category: "MEMBERSHIP" as const, icon: "🏛️" },
];

interface AddSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (sub: FinancialSubscriptionRow) => void;
  onUpdated?: (sub: FinancialSubscriptionRow) => void;
  subscriptionToEdit?: FinancialSubscriptionRow | null;
}

export const AddSubscriptionModal: React.FC<AddSubscriptionModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  onUpdated,
  subscriptionToEdit,
}) => {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [cadence, setCadence] = useState<SubscriptionCadence>("MONTHLY");
  const [category, setCategory] = useState<SubscriptionCategory>("SAAS");
  const [billingDay, setBillingDay] = useState("1");
  const [nextRenewalDate, setNextRenewalDate] = useState("");
  const [status, setStatus] = useState<SubscriptionStatus>("ACTIVE");
  const [trialEndsDate, setTrialEndsDate] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!subscriptionToEdit;

  useEffect(() => {
    if (isOpen) {
      if (subscriptionToEdit) {
        setName(subscriptionToEdit.name || "");
        setAmount(subscriptionToEdit.amount ? subscriptionToEdit.amount.toString() : "");
        setCadence((subscriptionToEdit.cadence as SubscriptionCadence) || "MONTHLY");
        setCategory((subscriptionToEdit.category as SubscriptionCategory) || "SAAS");
        setBillingDay(subscriptionToEdit.billingDay ? subscriptionToEdit.billingDay.toString() : "1");
        setNextRenewalDate(subscriptionToEdit.nextRenewalDate || "");
        setStatus((subscriptionToEdit.status as SubscriptionStatus) || "ACTIVE");
        setTrialEndsDate(subscriptionToEdit.trialEndsDate || "");
        setUrl(subscriptionToEdit.url || "");
        setNotes(subscriptionToEdit.notes || "");
      } else {
        setName("");
        setAmount("");
        setCadence("MONTHLY");
        setCategory("SAAS");
        setBillingDay("1");
        setNextRenewalDate("");
        setStatus("ACTIVE");
        setTrialEndsDate("");
        setUrl("");
        setNotes("");
      }
      setError(null);
    }
  }, [isOpen, subscriptionToEdit]);

  if (!isOpen) return null;

  const handleApplyPreset = (p: (typeof PRESETS)[0]) => {
    playSound.click();
    setName(p.name);
    setAmount(String(p.amount));
    setCadence(p.cadence);
    setCategory(p.category);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !amount) {
      setError("Please provide a name and amount");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      playSound.click();

      const endpoint = isEditing
        ? `/api/financial/subscriptions/${subscriptionToEdit.id}`
        : "/api/financial/subscriptions";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          amount: parseFloat(amount),
          cadence,
          category,
          billingDay: parseInt(billingDay, 10) || 1,
          nextRenewalDate: nextRenewalDate || null,
          status,
          trialEndsDate: status === "TRIAL" ? trialEndsDate || null : null,
          url: url.trim() || null,
          notes: notes.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save subscription");
      }

      const saved: FinancialSubscriptionRow = await res.json();
      playSound.fileIt();

      if (isEditing && onUpdated) {
        onUpdated(saved);
      } else {
        onCreated(saved);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save subscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ledger-modal-overlay" onClick={onClose}>
      <div className="ledger-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="ledger-modal-header">
          <h2>{isEditing ? "✎ EDIT RECURRING COMMITMENT" : "+ ADD RECURRING COMMITMENT"}</h2>
          <button type="button" className="btn-ledger" onClick={onClose} style={{ padding: "4px 8px" }}>
            ✕
          </button>
        </div>

        {/* Quick Presets (Only in Add mode) */}
        {!isEditing && (
          <div style={{ marginBottom: "16px" }}>
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: "10px",
                fontWeight: 800,
                color: "var(--ink-muted, #777)",
                marginBottom: "6px",
                textTransform: "uppercase",
              }}
            >
              QUICK POPULAR PRESETS:
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  className="sub-filter-btn"
                  onClick={() => handleApplyPreset(p)}
                  style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                >
                  <span>{p.icon}</span>
                  <span>{p.name} (${p.amount})</span>
                </button>
              ))}
            </div>
          </div>
        )}

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
            <label>Service / Subscription Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. OpenAI Plus, Superhuman, Vercel Pro"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: "10px" }}>
            <div className="ledger-field">
              <label>Amount ($) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="20.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="ledger-field">
              <label>Billing Cadence</label>
              <select value={cadence} onChange={(e) => setCadence(e.target.value as SubscriptionCadence)}>
                {SUBSCRIPTION_CADENCES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: "10px" }}>
            <div className="ledger-field">
              <label>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value as SubscriptionCategory)}>
                {SUBSCRIPTION_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="ledger-field">
              <label>Billing Day of Month</label>
              <input
                type="number"
                min="1"
                max="31"
                placeholder="1"
                value={billingDay}
                onChange={(e) => setBillingDay(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: "10px" }}>
            <div className="ledger-field">
              <label>Current Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as SubscriptionStatus)}>
                <option value="ACTIVE">ACTIVE</option>
                <option value="TRIAL">TRIAL</option>
                <option value="PAUSED">PAUSED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>
            {status === "TRIAL" ? (
              <div className="ledger-field">
                <label>Trial Expiration Date</label>
                <input
                  type="date"
                  value={trialEndsDate}
                  onChange={(e) => setTrialEndsDate(e.target.value)}
                />
              </div>
            ) : (
              <div className="ledger-field">
                <label>Next Renewal Date (Optional)</label>
                <input
                  type="date"
                  value={nextRenewalDate}
                  onChange={(e) => setNextRenewalDate(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="ledger-field">
            <label>Manage Portal URL (Optional)</label>
            <input
              type="url"
              placeholder="https://app.cursor.com/settings"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>

          <div className="ledger-field">
            <label>Notes / Cancellation Trigger</label>
            <textarea
              rows={2}
              placeholder="e.g. Cancel before 14-day trial ends if Claude 3.7 proves superior."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="ledger-modal-footer">
            <button type="button" className="btn-ledger" onClick={onClose}>
              CANCEL
            </button>
            <button type="submit" disabled={loading} className="btn-ledger btn-ledger-primary">
              {loading ? "SAVING..." : isEditing ? "UPDATE SUBSCRIPTION" : "CREATE SUBSCRIPTION"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
