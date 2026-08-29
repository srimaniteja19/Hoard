"use client";

import React, { useState, useMemo } from "react";
import {
  FinancialInvestmentRow,
  InvestmentAssetType,
  INVESTMENT_ASSET_TYPES,
  INVESTMENT_THEMES,
} from "@/lib/ledger/types";
import {
  normalizeInvestmentCadenceToMonthly,
  normalizeInvestmentCadenceToYearly,
  calculateInvestmentMetrics,
} from "@/lib/ledger/investmentMetrics";
import { formatCurrency, formatSignedCurrency, getCurrencySymbol } from "@/lib/ledger/formatters";
import { playSound } from "@/lib/sound";
import {
  TrendingUp,
  Plus,
  Coins,
  Sparkles,
  Calendar,
  Building,
  Target,
  Zap,
  CheckCircle2,
} from "lucide-react";
import { InvestmentCompoundingChart } from "./charts/InvestmentCompoundingChart";
import { parseAccrualNotes } from "@/lib/ledger/investmentAccrual";

interface RecurringInvestmentsTrackerProps {
  investments: FinancialInvestmentRow[];
  onAddInvestment: () => void;
  onEditInvestment: (inv: FinancialInvestmentRow) => void;
  onUpdateInvestment: (inv: FinancialInvestmentRow) => void;
  onDeleteInvestment: (id: string) => void;
  currency?: string;
}

export const RecurringInvestmentsTracker: React.FC<RecurringInvestmentsTrackerProps> = ({
  investments,
  onAddInvestment,
  onEditInvestment,
  onUpdateInvestment,
  onDeleteInvestment,
  currency = "INR",
}) => {
  const [selectedAssetType, setSelectedAssetType] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [viewCadence, setViewCadence] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [executingId, setExecutingId] = useState<string | null>(null);

  const handleExecuteSIP = async (inv: FinancialInvestmentRow) => {
    try {
      setExecutingId(inv.id);
      playSound.click();
      const res = await fetch(`/api/financial/investments/${inv.id}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: inv.amount }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to execute SIP");
      }
      const data = await res.json();
      playSound.fileIt();
      onUpdateInvestment(data.investment);
    } catch (err) {
      console.error("Error executing SIP:", err);
    } finally {
      setExecutingId(null);
    }
  };

  const metrics = useMemo(() => {
    return calculateInvestmentMetrics(investments);
  }, [investments]);

  // Determine the dominant currency for the banner total display
  const dominantCurrency = useMemo(() => {
    if (investments.length === 0) return currency;
    const counts: Record<string, number> = {};
    investments.forEach((inv) => { counts[inv.currency] = (counts[inv.currency] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || currency;
  }, [investments, currency]);

  const filteredInvestments = useMemo(() => {
    return investments.filter((inv) => {
      if (selectedAssetType !== "ALL" && inv.assetType !== selectedAssetType) return false;
      if (statusFilter === "ACTIVE" && inv.status !== "ACTIVE") return false;
      if (statusFilter === "PAUSED" && inv.status !== "PAUSED") return false;
      return true;
    });
  }, [investments, selectedAssetType, statusFilter]);

  const handleTogglePause = async (inv: FinancialInvestmentRow) => {
    playSound.click();
    const newStatus = inv.status === "PAUSED" ? "ACTIVE" : "PAUSED";
    try {
      const res = await fetch(`/api/financial/investments/${inv.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        onUpdateInvestment(updated);
        playSound.fileIt();
      }
    } catch {
      // ignore
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this recurring investment commitment?")) return;
    playSound.bury();
    try {
      const res = await fetch(`/api/financial/investments/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onDeleteInvestment(id);
      }
    } catch {
      // ignore
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* ── TOP HERO BANNER: CAPITAL DEPLOYMENT & VELOCITY ── */}
      <div
        style={{
          background: "var(--card, #FFFFFF)",
          border: "2px solid var(--ink, #0A0A0A)",
          boxShadow: "4px 4px 0 var(--ink, #0A0A0A)",
          padding: "24px 26px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "18px",
          borderRadius: "4px",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "10.5px",
              fontWeight: 900,
              letterSpacing: "0.08em",
              color: "#666666",
              textTransform: "uppercase",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              marginBottom: "4px",
            }}
          >
            <Coins size={13} aria-hidden="true" />
            RECURRING WEALTH ACCUMULATION ({investments.length} ALLOCATIONS)
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "12px", flexWrap: "wrap" }}>
            <span
              style={{
                fontFamily: "var(--display, sans-serif)",
                fontSize: "36px",
                fontWeight: 900,
                color: "var(--ink, #0A0A0A)",
                lineHeight: 1,
              }}
            >
              {viewCadence === "MONTHLY"
                ? formatCurrency(metrics.monthlyTotal, 2, dominantCurrency)
                : formatCurrency(metrics.yearlyTotal, 0, dominantCurrency)}
              <span
                style={{
                  fontSize: "13.5px",
                  fontFamily: "var(--mono, monospace)",
                  fontWeight: 800,
                  color: "#666666",
                  marginLeft: "4px",
                }}
              >
                {viewCadence === "MONTHLY" ? "/ MO" : "/ YEAR"}
              </span>
            </span>

            <span
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "12.5px",
                fontWeight: 800,
                color: "#166534",
                background: "#DCFCE7",
                padding: "3px 8px",
                border: "1px solid #16A34A",
                borderRadius: "2px",
              }}
            >
              Avg CAGR: {metrics.weightedReturnRatePct}%
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          {/* Monthly / Yearly view switcher */}
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
            onClick={onAddInvestment}
          >
            <Plus size={13} aria-hidden="true" />
            ADD RECURRING INVESTMENT
          </button>
        </div>
      </div>

      {/* ── INTERACTIVE COMPOUND WEALTH HORIZON SIMULATION ── */}
      {metrics.monthlyTotal > 0 && (
        <InvestmentCompoundingChart
          monthlyInvestment={metrics.monthlyTotal}
          initialReturnRate={metrics.weightedReturnRatePct}
          currency={dominantCurrency}
        />
      )}

      {/* ── TOOLBAR & CATEGORY FILTERS ── */}
      <div className="sub-toolbar">
        <div className="sub-filter-group">
          <button
            type="button"
            className={`sub-filter-btn ${selectedAssetType === "ALL" ? "active" : ""}`}
            onClick={() => setSelectedAssetType("ALL")}
          >
            ALL ASSETS ({investments.length})
          </button>
          {INVESTMENT_ASSET_TYPES.map((type) => {
            const count = investments.filter((i) => i.assetType === type).length;
            if (count === 0) return null;
            const theme = INVESTMENT_THEMES[type];
            return (
              <button
                key={type}
                type="button"
                className={`sub-filter-btn ${selectedAssetType === type ? "active" : ""}`}
                onClick={() => setSelectedAssetType(type)}
              >
                <span>{theme.icon}</span> {theme.shortLabel} ({count})
              </button>
            );
          })}
        </div>

        <div className="sub-filter-group">
          <button
            type="button"
            className={`sub-filter-btn ${statusFilter === "ALL" ? "active" : ""}`}
            onClick={() => setStatusFilter("ALL")}
          >
            ALL STATUS
          </button>
          <button
            type="button"
            className={`sub-filter-btn ${statusFilter === "ACTIVE" ? "active" : ""}`}
            onClick={() => setStatusFilter("ACTIVE")}
          >
            ACTIVE ({investments.filter((i) => i.status === "ACTIVE").length})
          </button>
          <button
            type="button"
            className={`sub-filter-btn ${statusFilter === "PAUSED" ? "active" : ""}`}
            onClick={() => setStatusFilter("PAUSED")}
          >
            PAUSED ({investments.filter((i) => i.status === "PAUSED").length})
          </button>
        </div>
      </div>

      {/* ── RECURRING INVESTMENTS CARDS GRID ── */}
      {filteredInvestments.length === 0 ? (
        <div
          style={{
            background: "var(--card, #FFFFFF)",
            border: "2px dashed var(--ink, #0A0A0A)",
            boxShadow: "4px 4px 0 var(--ink, #0A0A0A)",
            padding: "48px 24px",
            textAlign: "center",
            borderRadius: "4px",
          }}
        >
          <div style={{ fontSize: "36px", marginBottom: "10px" }}>🪙</div>
          <div
            style={{
              fontFamily: "var(--display, sans-serif)",
              fontSize: "22px",
              fontWeight: 900,
              marginBottom: "8px",
            }}
          >
            {investments.length === 0
              ? "ZERO RECURRING INVESTMENTS RECORDED"
              : "NO INVESTMENTS MATCH THE CURRENT FILTER"}
          </div>
          <p
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "12px",
              color: "#666666",
              maxWidth: "520px",
              margin: "0 auto 20px auto",
              lineHeight: 1.5,
            }}
          >
            Automate monthly investments into Physical Gold (SGB/Digital Gold), Nifty 50 SIPs,
            S&amp;P 500 ETFs, or Mutual Funds to build systematic wealth through cost averaging.
          </p>
          <button
            type="button"
            className="btn-ledger btn-ledger-primary"
            onClick={onAddInvestment}
          >
            <Plus size={13} aria-hidden="true" />
            ADD FIRST RECURRING INVESTMENT
          </button>
        </div>
      ) : (
        <div className="sub-grid">
          {filteredInvestments.map((inv, index) => {
            const assetType = (inv.assetType as InvestmentAssetType) || "OTHER";
            const theme = INVESTMENT_THEMES[assetType] || INVESTMENT_THEMES.OTHER;
            const monthlyAmount = normalizeInvestmentCadenceToMonthly(inv.amount, inv.cadence as any);

            return (
              <div
                key={inv.id}
                className="sub-card-editorial"
                style={
                  {
                    "--cat-header-bg": theme.headerBg,
                    "--sub-index": index,
                    opacity: inv.status === "PAUSED" ? 0.65 : 1,
                  } as React.CSSProperties
                }
              >
                {/* Header */}
                <div className="sub-card-header">
                  <span className="sub-card-category">
                    <span className="sub-card-category-icon">{theme.icon}</span>
                    <span>{theme.shortLabel}</span>
                  </span>

                  <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                    {inv.expectedReturnRate && (
                      <span
                        className="sub-card-status"
                        style={{
                          background: "#DCFCE7",
                          color: "#166534",
                          borderColor: "#000000",
                        }}
                      >
                        {inv.expectedReturnRate}% CAGR
                      </span>
                    )}
                    <span
                      className="sub-card-status"
                      style={{
                        background: inv.status === "ACTIVE" ? "#FFFFFF" : "#F3F4F6",
                        color: inv.status === "ACTIVE" ? "#000000" : "#6B7280",
                        borderColor: "#000000",
                      }}
                    >
                      {inv.status}
                    </span>
                  </div>
                </div>

                {/* Body */}
                <div className="sub-card-body">
                  <div className="sub-card-title-row">
                    <h3 className="sub-card-title">{inv.name}</h3>
                    <div className="sub-card-price-box">
                      <span className="sub-card-price">{formatCurrency(inv.amount, 2, inv.currency)}</span>
                      <span className="sub-card-price-unit">/ {inv.cadence.toLowerCase()}</span>
                    </div>
                  </div>

                  {/* Meta Details: Platform & Execution Day */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontFamily: "var(--mono, monospace)",
                      fontSize: "11px",
                      color: "#444444",
                      background: "rgba(0, 0, 0, 0.03)",
                      padding: "6px 10px",
                      borderRadius: "2px",
                      border: "1px solid rgba(0, 0, 0, 0.08)",
                    }}
                  >
                    <span>
                      🏛️ <b>{inv.platform || "Direct / Self-Custody"}</b>
                    </span>
                    <span>🗓️ Day {inv.investmentDay || 1} of month</span>
                  </div>

                  {/* Accumulated Valuation & Net Worth Sync Status */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontFamily: "var(--mono)",
                      fontSize: "11px",
                      fontWeight: 800,
                      color: "#15803D",
                      background: "#F0FDF4",
                      border: "1px solid #BBF7D0",
                      padding: "6px 8px",
                      borderRadius: "2px",
                    }}
                  >
                    <span>Accumulated Valuation:</span>
                    <span style={{ fontSize: "12px" }}>
                      {formatCurrency(inv.currentValuation || 0, 2, inv.currency)}
                    </span>
                  </div>

                  {/* Accrual / Execution Status Badge */}
                  {(() => {
                    const { userNote, lastAccruedMonth } = parseAccrualNotes(inv.notes);
                    const now = new Date();
                    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
                    const isAccrued = lastAccruedMonth === currentMonth;

                    return (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontFamily: "var(--mono, monospace)",
                          fontSize: "10px",
                          fontWeight: 700,
                          color: isAccrued ? "#166534" : "#0369A1",
                        }}
                      >
                        <span>
                          {isAccrued ? "✓ Accrued for this month" : `🗓️ Auto-accrues on Day ${inv.investmentDay || 1}`}
                        </span>
                        <span style={{ opacity: 0.85 }}>🔗 Net Worth Synced</span>
                      </div>
                    );
                  })()}

                  {/* Notes */}
                  {(() => {
                    const { userNote } = parseAccrualNotes(inv.notes);
                    return userNote ? <div className="sub-card-notes">“{userNote}”</div> : null;
                  })()}
                </div>

                {/* Actions Footer */}
                <div className="sub-card-footer" style={{ gap: "4px" }}>
                  <button
                    type="button"
                    disabled={executingId === inv.id || inv.status === "PAUSED"}
                    className="btn-card-action"
                    style={{
                      background: "#0284C7",
                      color: "#FFFFFF",
                      borderColor: "#000000",
                      fontWeight: 900,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "3px",
                      padding: "5px 8px",
                    }}
                    onClick={() => handleExecuteSIP(inv)}
                    title="Log 1 monthly installment to accumulated valuation and sync Net Worth"
                  >
                    <Zap size={11} aria-hidden="true" />
                    {executingId === inv.id ? "LOGGING..." : `+ RECORD SIP`}
                  </button>
                  <button
                    type="button"
                    className="btn-card-action"
                    onClick={() => {
                      playSound.click();
                      onEditInvestment(inv);
                    }}
                  >
                    ✎ EDIT
                  </button>
                  <button
                    type="button"
                    className="btn-card-action"
                    onClick={() => handleTogglePause(inv)}
                  >
                    {inv.status === "PAUSED" ? "▶ RESUME" : "⏸ PAUSE"}
                  </button>
                  <button
                    type="button"
                    className="btn-card-action btn-card-delete"
                    onClick={() => handleDelete(inv.id)}
                    aria-label="Delete investment"
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
