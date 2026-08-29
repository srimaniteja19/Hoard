"use client";

import React, { useState, useMemo } from "react";
import {
  FinancialSubscriptionRow,
  SubscriptionCategory,
  SUBSCRIPTION_CATEGORIES,
  CATEGORY_THEMES,
} from "@/lib/ledger/types";
import {
  normalizeCadenceToMonthly,
  normalizeCadenceToYearly,
  calculateDaysUntilRenewal,
} from "@/lib/ledger/subscriptionMetrics";
import { playSound } from "@/lib/sound";

import { SubscriptionBreakdownChart } from "./charts/SubscriptionBreakdownChart";

interface SubscriptionTrackerProps {
  subscriptions: FinancialSubscriptionRow[];
  onAddSubscription: () => void;
  onUpdateSubscription: (sub: FinancialSubscriptionRow) => void;
  onDeleteSubscription: (id: string) => void;
}

export const SubscriptionTracker: React.FC<SubscriptionTrackerProps> = ({
  subscriptions,
  onAddSubscription,
  onUpdateSubscription,
  onDeleteSubscription,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [viewCadence, setViewCadence] = useState<"MONTHLY" | "YEARLY">("MONTHLY");

  const filteredSubs = useMemo(() => {
    return subscriptions.filter((sub) => {
      if (selectedCategory !== "ALL" && sub.category !== selectedCategory) return false;
      if (statusFilter === "ACTIVE" && sub.status !== "ACTIVE" && sub.status !== "TRIAL") return false;
      if (statusFilter === "TRIAL" && sub.status !== "TRIAL") return false;
      if (statusFilter === "PAUSED" && sub.status !== "PAUSED") return false;
      return true;
    });
  }, [subscriptions, selectedCategory, statusFilter]);

  const activeMonthlyBurn = useMemo(() => {
    return subscriptions
      .filter((s) => s.status === "ACTIVE" || s.status === "TRIAL")
      .reduce((sum, s) => sum + normalizeCadenceToMonthly(s.amount, s.cadence as any), 0);
  }, [subscriptions]);

  const activeYearlyBurn = useMemo(() => {
    return subscriptions
      .filter((s) => s.status === "ACTIVE" || s.status === "TRIAL")
      .reduce((sum, s) => sum + normalizeCadenceToYearly(s.amount, s.cadence as any), 0);
  }, [subscriptions]);

  const handleTogglePause = async (sub: FinancialSubscriptionRow) => {
    playSound.click();
    const newStatus = sub.status === "PAUSED" ? "ACTIVE" : "PAUSED";
    try {
      const res = await fetch(`/api/financial/subscriptions/${sub.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        onUpdateSubscription(updated);
        playSound.fileIt();
      }
    } catch {
      // ignore
    }
  };

  const handleDelete = async (subId: string) => {
    if (!confirm("Are you sure you want to remove this recurring commitment?")) return;
    playSound.bury();
    try {
      const res = await fetch(`/api/financial/subscriptions/${subId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onDeleteSubscription(subId);
      }
    } catch {
      // ignore
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* ── TOP BURN HERO BANNER ── */}
      <div
        style={{
          background: "var(--card, #FFFFFF)",
          border: "1.5px solid var(--ink, #0A0A0A)",
          boxShadow: "3.5px 3.5px 0 var(--ink, #0A0A0A)",
          padding: "22px 26px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
          borderRadius: "3px",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "10.5px",
              fontWeight: 800,
              letterSpacing: "0.08em",
              color: "#666666",
              textTransform: "uppercase",
              marginBottom: "4px",
            }}
          >
            TOTAL RECURRING COMMITMENTS ({subscriptions.length} SERVICES)
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
            <span style={{ fontFamily: "var(--display, sans-serif)", fontSize: "36px", fontWeight: 900, color: "var(--ink, #0A0A0A)" }}>
              ${activeMonthlyBurn.toFixed(2)}
              <span style={{ fontSize: "13.5px", fontFamily: "var(--mono, monospace)", fontWeight: 800, color: "#666666", marginLeft: "4px" }}>
                / MO
              </span>
            </span>
            <span
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "13px",
                fontWeight: 800,
                color: "#16A34A",
                background: "#DCFCE7",
                padding: "3px 8px",
                border: "1px solid #16A34A",
                borderRadius: "2px",
              }}
            >
              ${activeYearlyBurn.toFixed(2)} / YEAR
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          {/* Monthly / Yearly view toggle */}
          <div className="debt-strategy-toggle">
            <button
              type="button"
              className={`debt-strategy-btn ${viewCadence === "MONTHLY" ? "active" : ""}`}
              onClick={() => {
                playSound.click();
                setViewCadence("MONTHLY");
              }}
            >
              MONTHLY
            </button>
            <button
              type="button"
              className={`debt-strategy-btn ${viewCadence === "YEARLY" ? "active" : ""}`}
              onClick={() => {
                playSound.click();
                setViewCadence("YEARLY");
              }}
            >
              ANNUAL
            </button>
          </div>

          <button
            type="button"
            className="btn-ledger btn-ledger-primary"
            onClick={onAddSubscription}
          >
            + ADD SUBSCRIPTION
          </button>
        </div>
      </div>

      {/* ── VISUAL CATEGORY DONUT CHART ── */}
      {subscriptions.length > 0 && (
        <SubscriptionBreakdownChart
          subscriptions={subscriptions}
          onSelectCategory={(cat) => setSelectedCategory(cat === selectedCategory ? "ALL" : cat)}
        />
      )}

      {/* ── TOOLBAR & FILTERS ── */}
      <div className="sub-toolbar">
        <div className="sub-filter-group">
          <button
            type="button"
            className={`sub-filter-btn ${statusFilter === "ALL" ? "active" : ""}`}
            onClick={() => setStatusFilter("ALL")}
          >
            ALL ({subscriptions.length})
          </button>
          <button
            type="button"
            className={`sub-filter-btn ${statusFilter === "ACTIVE" ? "active" : ""}`}
            onClick={() => setStatusFilter("ACTIVE")}
          >
            ACTIVE ({subscriptions.filter((s) => s.status === "ACTIVE").length})
          </button>
          <button
            type="button"
            className={`sub-filter-btn ${statusFilter === "TRIAL" ? "active" : ""}`}
            onClick={() => setStatusFilter("TRIAL")}
          >
            TRIALS ({subscriptions.filter((s) => s.status === "TRIAL").length})
          </button>
          <button
            type="button"
            className={`sub-filter-btn ${statusFilter === "PAUSED" ? "active" : ""}`}
            onClick={() => setStatusFilter("PAUSED")}
          >
            PAUSED ({subscriptions.filter((s) => s.status === "PAUSED").length})
          </button>
        </div>

        <div className="sub-filter-group">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "11px",
              fontWeight: 800,
              padding: "5px 10px",
              background: "var(--card, #FFFFFF)",
              border: "1.5px solid var(--ink, #0A0A0A)",
              borderRadius: "2px",
            }}
          >
            <option value="ALL">ALL CATEGORIES</option>
            {SUBSCRIPTION_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── EDITORIAL SUBSCRIPTIONS GRID ── */}
      {filteredSubs.length === 0 ? (
        <div
          style={{
            background: "var(--card, #FFFFFF)",
            border: "1.5px dashed var(--ink, #0A0A0A)",
            padding: "48px 24px",
            textAlign: "center",
            borderRadius: "3px",
          }}
        >
          <div style={{ fontFamily: "var(--display, sans-serif)", fontSize: "20px", fontWeight: 900, marginBottom: "8px" }}>
            NO RECURRING COMMITMENTS FOUND
          </div>
          <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "12px", color: "#666666", marginBottom: "18px" }}>
            Add your streaming services, software licenses, gym memberships, and cloud bills to monitor burn.
          </div>
          <button type="button" className="btn-ledger btn-ledger-primary" onClick={onAddSubscription}>
            + ADD YOUR FIRST SUBSCRIPTION
          </button>
        </div>
      ) : (
        <div className="sub-grid">
          {filteredSubs.map((sub, index) => {
            const cat = (sub.category as SubscriptionCategory) || "OTHER";
            const theme = CATEGORY_THEMES[cat] || CATEGORY_THEMES.OTHER;

            const monthlyNormalized = normalizeCadenceToMonthly(sub.amount, sub.cadence as any);
            const yearlyNormalized = normalizeCadenceToYearly(sub.amount, sub.cadence as any);
            const displayPrice = viewCadence === "MONTHLY" ? monthlyNormalized : yearlyNormalized;
            const displayUnit = viewCadence === "MONTHLY" ? "/ mo" : "/ yr";

            const { daysUntil, formattedDate } = calculateDaysUntilRenewal(
              sub.billingDay,
              sub.status === "TRIAL" && sub.trialEndsDate ? sub.trialEndsDate : sub.nextRenewalDate
            );

            const isUrgent = daysUntil <= 3 && sub.status !== "PAUSED";
            const isPaused = sub.status === "PAUSED";

            const cardStyle = {
              "--cat-accent": theme.accent,
              "--cat-bg": isPaused ? "#F9FAFB" : theme.cardBg,
              "--cat-shadow": isPaused ? "rgba(0,0,0,0.15)" : theme.shadowColor,
              "--cat-price": isPaused ? "#6B7280" : theme.priceColor,
              "--cat-tag-bg": isPaused ? "#6B7280" : theme.tagBg,
              "--cat-tag-color": theme.tagColor,
              "--cat-header-bg": isPaused ? "#F3F4F6" : theme.headerBg,
              "--cat-header-text": isPaused ? "#6B7280" : theme.headerText,
              "--sub-index": index,
              opacity: isPaused ? 0.7 : 1,
            } as React.CSSProperties;

            return (
              <div
                key={sub.id}
                className="sub-card-editorial"
                style={cardStyle}
              >
                {/* ── Top Header Bar ── */}
                <div className="sub-card-header">
                  <span className="sub-card-category">
                    <span className="sub-card-category-icon">{theme.icon}</span>
                    <span>{theme.label}</span>
                  </span>

                  {sub.status === "TRIAL" && (
                    <span
                      className="sub-card-status"
                      style={{ background: "#FEF08A", color: "#854D0E", borderColor: "#CA8A04" }}
                    >
                      ⏳ TRIAL
                    </span>
                  )}
                  {isPaused && (
                    <span
                      className="sub-card-status"
                      style={{ background: "#E5E7EB", color: "#4B5563", borderColor: "#9CA3AF" }}
                    >
                      PAUSED
                    </span>
                  )}
                  {sub.status === "ACTIVE" && (
                    <span
                      className="sub-card-status"
                      style={{ background: "#DCFCE7", color: "#166534", borderColor: "#16A34A" }}
                    >
                      ACTIVE
                    </span>
                  )}
                </div>

                {/* ── Body ── */}
                <div className="sub-card-body">
                  <div className="sub-card-title-row">
                    <h3 className="sub-card-title">{sub.name}</h3>
                    <div className="sub-card-price-box">
                      <span className="sub-card-price">${displayPrice.toFixed(2)}</span>
                      <span className="sub-card-price-unit">{displayUnit}</span>
                    </div>
                  </div>

                  {/* Renewal countdown */}
                  {sub.status !== "PAUSED" && (
                    <div className={`sub-card-renewal ${isUrgent ? "urgent" : ""}`}>
                      <span>📅</span>
                      <span>
                        {sub.status === "TRIAL" ? "Trial ends in " : "Renews in "}
                        <b>{daysUntil} {daysUntil === 1 ? "day" : "days"}</b>
                        <span style={{ opacity: 0.7, marginLeft: "4px" }}>({formattedDate})</span>
                      </span>
                    </div>
                  )}

                  {/* Notes */}
                  {sub.notes && (
                    <div className="sub-card-notes">
                      “{sub.notes}”
                    </div>
                  )}
                </div>

                {/* ── Action Footer ── */}
                <div className="sub-card-footer">
                  {sub.url && (
                    <a
                      href={sub.url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-card-action"
                      style={{ textDecoration: "none" }}
                    >
                      PORTAL ↗
                    </a>
                  )}
                  <button
                    type="button"
                    className="btn-card-action"
                    onClick={() => handleTogglePause(sub)}
                  >
                    {isPaused ? "RESUME" : "PAUSE"}
                  </button>
                  <button
                    type="button"
                    className="btn-card-action btn-card-delete"
                    onClick={() => handleDelete(sub.id)}
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
