"use client";

import React, { useState, useMemo } from "react";
import {
  calculateSurplusAllocation,
  SweeperPreset,
  SWEEPER_PRESET_CONFIGS,
} from "@/lib/ledger/surplusSweeper";
import {
  FinancialDebtRow,
  FinancialInvestmentRow,
  FinancialAssetRow,
} from "@/lib/ledger/types";
import { formatCurrency, getCurrencySymbol } from "@/lib/ledger/formatters";
import { playSound } from "@/lib/sound";
import {
  Sparkles,
  Zap,
  TrendingUp,
  Target,
  ShieldCheck,
  CheckCircle2,
  Coins,
  ArrowRight,
  PieChart,
  RotateCcw,
} from "lucide-react";

interface SurplusSweeperModalProps {
  isOpen: boolean;
  onClose: () => void;
  monthlySurplusUsd: number;
  debts: FinancialDebtRow[];
  investments: FinancialInvestmentRow[];
  inrRate?: number;
  currency?: string;
  onAllocationExecuted?: (message: string) => void;
}

export const SurplusSweeperModal: React.FC<SurplusSweeperModalProps> = ({
  isOpen,
  onClose,
  monthlySurplusUsd,
  debts,
  investments,
  inrRate = 86.85,
  currency = "USD",
  onAllocationExecuted,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<SweeperPreset>("AGGRESSIVE_COMPOUNDER");
  const [executing, setExecuting] = useState(false);
  const [executedMessage, setExecutedMessage] = useState<string | null>(null);

  const strategy = useMemo(() => {
    return calculateSurplusAllocation(monthlySurplusUsd, selectedPreset, inrRate, debts, investments);
  }, [monthlySurplusUsd, selectedPreset, inrRate, debts, investments]);

  if (!isOpen) return null;

  const handleExecuteSweep = async () => {
    setExecuting(true);
    playSound.click();

    try {
      // Simulate/trigger capital deployment sound & status
      await new Promise((resolve) => setTimeout(resolve, 600));
      playSound.fileIt();
      const msg = `🎉 Swept ${formatCurrency(strategy.totalSurplusUsd, 2, "USD")} (₹${strategy.totalSurplusInr.toLocaleString()} INR) across ${strategy.allocations.length} asset targets via ${strategy.title}!`;
      setExecutedMessage(msg);
      if (onAllocationExecuted) {
        onAllocationExecuted(msg);
      }
    } catch (err) {
      console.error("Failed to execute surplus sweep:", err);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="ledger-modal-overlay" onClick={onClose}>
      <div
        className="ledger-modal-box"
        style={{
          maxWidth: "880px",
          width: "95vw",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          padding: "0",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── HEADER ── */}
        <div
          className="ledger-modal-header"
          style={{
            padding: "16px 22px",
            background: "#0A0A0A",
            color: "#FFFFFF",
            borderBottom: "2px solid #000000",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <Sparkles size={20} color="#00F0FF" aria-hidden="true" />
            <h2 style={{ color: "#FFFFFF", margin: 0, fontSize: "17px", letterSpacing: "0.04em" }}>
              MONTHLY SURPLUS SWEEPER &amp; ASSET ALLOCATOR
            </h2>
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: "10px",
                fontWeight: 900,
                background: "#00F0FF",
                color: "#0A0A0A",
                padding: "2px 6px",
                borderRadius: "2px",
              }}
            >
              AUTONOMOUS ALLOCATOR
            </span>
          </div>

          <button
            type="button"
            className="btn-card-action"
            onClick={onClose}
            style={{
              background: "#222222",
              color: "#FFFFFF",
              borderColor: "#444444",
              padding: "4px 8px",
            }}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* ── SCROLLABLE BODY ── */}
        <div style={{ overflowY: "auto", flex: 1, padding: "20px 22px", display: "flex", flexDirection: "column", gap: "18px" }}>
          
          {/* ── TOP HERO SURPLUS CALLOUT BANNER ── */}
          <div
            style={{
              background: "#F0FDF4",
              border: "2.5px solid #16A34A",
              boxShadow: "4px 4px 0 #16A34A",
              padding: "18px 22px",
              borderRadius: "4px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "14px",
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: "10.5px",
                  fontWeight: 900,
                  color: "#166534",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                UNALLOCATED FREE MONTHLY SURPLUS
              </div>
              <div
                style={{
                  fontFamily: "var(--display)",
                  fontSize: "32px",
                  fontWeight: 900,
                  color: "#15803D",
                  lineHeight: 1.1,
                }}
              >
                +{formatCurrency(strategy.totalSurplusUsd, 2, "USD")} / month
              </div>
              <div style={{ fontFamily: "var(--mono)", fontSize: "11px", color: "#14532D", marginTop: "4px" }}>
                Equivalent to <b>+₹{strategy.totalSurplusInr.toLocaleString()} INR / month</b> (at ₹{inrRate.toFixed(2)}/$)
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: "10px", fontWeight: 900, color: "#166534" }}>
                10-YEAR COMPOUND POTENTIAL
              </div>
              <div style={{ fontFamily: "var(--display)", fontSize: "24px", fontWeight: 900, color: "#0A0A0A" }}>
                +{formatCurrency(strategy.projectedTenYearCompoundedUsd, 0, "USD")}
              </div>
              <div style={{ fontFamily: "var(--mono)", fontSize: "10px", color: "#666" }}>
                {strategy.tenYearWealthMultiplier}x capital multiplier
              </div>
            </div>
          </div>

          {/* Success Flash message if executed */}
          {executedMessage && (
            <div
              style={{
                background: "#DCFCE7",
                border: "2px solid #16A34A",
                color: "#14532D",
                padding: "12px 16px",
                borderRadius: "3px",
                fontFamily: "var(--mono)",
                fontSize: "11.5px",
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <CheckCircle2 size={16} color="#16A34A" />
              <span>{executedMessage}</span>
            </div>
          )}

          {/* ── PRESET STRATEGY SELECTOR ── */}
          <div>
            <div style={{ fontFamily: "var(--mono)", fontSize: "11px", fontWeight: 900, textTransform: "uppercase", marginBottom: "10px" }}>
              SELECT CAPITAL DEPLOYMENT MODEL:
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px" }}>
              {(Object.keys(SWEEPER_PRESET_CONFIGS) as (keyof typeof SWEEPER_PRESET_CONFIGS)[]).map((key) => {
                const conf = SWEEPER_PRESET_CONFIGS[key];
                const isSelected = selectedPreset === key;

                return (
                  <div
                    key={key}
                    onClick={() => {
                      setSelectedPreset(key);
                      playSound.click();
                    }}
                    style={{
                      background: isSelected ? "#FFFFFF" : "#F8FAFC",
                      border: `2px solid ${isSelected ? "#0A0A0A" : "#CBD5E1"}`,
                      boxShadow: isSelected ? "3px 3px 0 #0A0A0A" : "none",
                      padding: "14px",
                      borderRadius: "3px",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      position: "relative",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <b style={{ fontFamily: "var(--display)", fontSize: "14.5px" }}>{conf.title}</b>
                      <span
                        style={{
                          fontFamily: "var(--mono)",
                          fontSize: "8.5px",
                          fontWeight: 900,
                          background: isSelected ? "#FFE600" : "#E2E8F0",
                          color: "#0A0A0A",
                          padding: "1px 5px",
                          borderRadius: "2px",
                        }}
                      >
                        {conf.badge}
                      </span>
                    </div>
                    <div style={{ fontFamily: "var(--mono)", fontSize: "10.5px", color: "#555", lineHeight: 1.35 }}>
                      {conf.description}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── ALLOCATION BREAKDOWN BAR ── */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--mono)", fontSize: "10.5px", fontWeight: 900, marginBottom: "6px" }}>
              <span>CAPITAL DISTRIBUTION MATRIX:</span>
              <span>100% DEPLOYED</span>
            </div>

            <div
              style={{
                display: "flex",
                height: "18px",
                border: "2px solid #0A0A0A",
                borderRadius: "2px",
                overflow: "hidden",
              }}
            >
              {strategy.allocations.map((a) => (
                <div
                  key={a.id}
                  style={{
                    width: `${a.percentage}%`,
                    background: a.accentColor,
                  }}
                  title={`${a.title}: ${a.percentage}% (${formatCurrency(a.amountUsd, 2, "USD")})`}
                />
              ))}
            </div>
          </div>

          {/* ── ITEMIZED ALLOCATION TARGET CARDS ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: "11px", fontWeight: 900, textTransform: "uppercase" }}>
              ITEMIZED DEPLOYMENT TARGETS ({strategy.allocations.length} ACCOUNTS):
            </div>

            {strategy.allocations.map((item) => (
              <div
                key={item.id}
                style={{
                  background: "#FFFFFF",
                  border: "1.5px solid #0A0A0A",
                  boxShadow: "2.5px 2.5px 0 #0A0A0A",
                  padding: "14px 16px",
                  borderRadius: "3px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "22px" }}>{item.icon}</span>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <b style={{ fontFamily: "var(--display)", fontSize: "15px" }}>
                        {item.targetAccountName}
                      </b>
                      <span
                        style={{
                          fontFamily: "var(--mono)",
                          fontSize: "9.5px",
                          fontWeight: 900,
                          background: item.accentColor,
                          color: "#0A0A0A",
                          padding: "1px 6px",
                          borderRadius: "2px",
                          border: "1px solid #0A0A0A",
                        }}
                      >
                        {item.percentage}% ALLOCATION
                      </span>
                    </div>

                    <div style={{ fontFamily: "var(--mono)", fontSize: "10.5px", color: "#555", marginTop: "2px" }}>
                      {item.targetPlatform ? `Via ${item.targetPlatform} • ` : ""}
                      {item.rationale}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "var(--display)", fontSize: "18px", fontWeight: 900, color: "#15803D" }}>
                    +{formatCurrency(item.amountUsd, 2, "USD")}
                  </div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: "10.5px", color: "#666" }}>
                    +₹{item.amountInr.toLocaleString()} INR / mo
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* ── MODAL FOOTER ── */}
        <div
          className="ledger-modal-footer"
          style={{
            padding: "14px 22px",
            borderTop: "1.5px solid #0A0A0A",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#FAFAFA",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div style={{ fontFamily: "var(--mono)", fontSize: "11px", color: "#444" }}>
            Model: <b>{strategy.title}</b> • Deploying <b>+{formatCurrency(strategy.totalSurplusUsd, 2, "USD")}</b>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              disabled={executing}
              className="btn-ledger btn-ledger-ai"
              onClick={handleExecuteSweep}
              style={{ fontSize: "11px", background: "#00F0FF", color: "#0A0A0A" }}
            >
              <Zap size={12} aria-hidden="true" />
              {executing ? "DEPLOYING..." : "⚡ SWEEP &amp; DEPLOY SURPLUS"}
            </button>
            <button
              type="button"
              className="btn-ledger"
              onClick={onClose}
              style={{ fontSize: "11px" }}
            >
              CLOSE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
