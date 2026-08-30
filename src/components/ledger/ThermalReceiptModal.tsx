"use client";

import React, { useRef, useState } from "react";
import { FinancialOverviewPayload } from "@/lib/ledger/types";
import { formatCurrency, formatSignedCurrency, getCurrencySymbol } from "@/lib/ledger/formatters";
import { playSound } from "@/lib/sound";
import { Copy, Check, Printer, Download, Sparkles } from "lucide-react";

interface ThermalReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  overview: FinancialOverviewPayload;
  currency?: string;
  investmentCurrency?: string;
}

export const ThermalReceiptModal: React.FC<ThermalReceiptModalProps> = ({
  isOpen,
  onClose,
  overview,
  currency = "USD",
  investmentCurrency = "INR",
}) => {
  const [copied, setCopied] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const { metrics, subscriptions, debts, investments = [], latestAudit } = overview;
  const { cashFlow, netWorth, subscriptionMetrics, investmentMetrics } = metrics;
  const inrRate = overview.fxSnapshot?.inrPerUsd || 86.85;
  const dateStr = overview.fxSnapshot?.formattedDate || new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const timeStr = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  const auditScore = (latestAudit?.analysis as any)?.healthScore || 82;

  // Generate clean plaintext ASCII receipt for clipboard
  const generateAsciiReceipt = () => {
    return `
============================================================
              HOARD ARCHIVAL FISCAL REGISTER
                 TERMINAL // STORE NO. 0019
============================================================
DATE: ${dateStr} · ${timeStr}
BASE LEDGER: USD ($) · FX RATE: 1 USD = ${inrRate.toFixed(2)} INR
------------------------------------------------------------
CASH FLOW & VELOCITY BREAKDOWN:
  (+) Gross Monthly Inflow ............... $${cashFlow.monthlyGrossIncome.toFixed(2)}
  (-) Estimated Tax Withholding .......... -$${cashFlow.monthlyTaxWithholding.toFixed(2)}
  ----------------------------------------------------------
  (=) Net Monthly Take-Home .............. +$${cashFlow.monthlyNetTakeHome.toFixed(2)}
  (-) Subscriptions Burn ................. -$${cashFlow.monthlySubscriptions.toFixed(2)} (${subscriptionMetrics.activeCount} active)
  (-) Debt Minimum Liabilities ........... -$${cashFlow.monthlyDebtMinimums.toFixed(2)} (${debts.length} accounts)
  (-) Wealth SIPs (₹${investmentMetrics.monthlyTotal.toFixed(2)} INR) .... -$${(cashFlow.monthlyRecurringInvestmentsUsd || investmentMetrics.monthlyTotalUsd || 0).toFixed(2)}
------------------------------------------------------------
TOTAL MONTHLY OUTFLOWS ................... -$${cashFlow.totalFixedOutflow.toFixed(2)}
FREE MONTHLY SURPLUS ..................... +$${cashFlow.monthlyNetSurplus.toFixed(2)}
SAVINGS RATE: ${cashFlow.savingsRatePct}% · WEALTH VELOCITY: ${cashFlow.wealthVelocityPct}%
------------------------------------------------------------
BALANCE SHEET & SOLVENCY:
  (+) Total Assets ....................... $${netWorth.totalAssets.toFixed(2)}
  (-) Total Debt Liabilities ............. -$${netWorth.totalLiabilities.toFixed(2)}
  ----------------------------------------------------------
  (=) NET WORTH .......................... $${netWorth.netWorth.toFixed(2)} USD
  EMERGENCY RUNWAY ....................... ${cashFlow.runwayMonths.toFixed(1)} MONTHS
  AI QUANT HEALTH SCORE .................. ${auditScore} / 100
------------------------------------------------------------
||| | ||| || |||| | ||| || |||| || | ||| ||| | ||
CHECKSUM: #HDR-ARCHIVE-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000 + 10000)}
============================================================
               KEEP FOR YOUR WEALTH RECORDS
`.trim();
  };

  const handleCopy = () => {
    playSound.click();
    navigator.clipboard.writeText(generateAsciiReceipt());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    playSound.click();
    window.print();
  };

  const handleDownloadImage = async () => {
    playSound.click();
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const lines = generateAsciiReceipt().split("\n");
      const lineHeight = 18;
      const padding = 30;
      canvas.width = 560;
      canvas.height = lines.length * lineHeight + padding * 2;

      // Draw thermal background
      ctx.fillStyle = "#FDFBF7";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw border
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 3;
      ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

      // Text styling
      ctx.fillStyle = "#0A0A0A";
      ctx.font = '12px "Courier New", Courier, monospace';

      lines.forEach((line, index) => {
        ctx.fillText(line, padding, padding + (index + 1) * lineHeight);
      });

      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `hoard-fiscal-receipt-${dateStr.replace(/[^a-zA-Z0-9]/g, "-")}.png`;
      a.click();
      playSound.fileIt();
    } catch (err) {
      console.error("Failed to generate receipt image:", err);
    }
  };

  return (
    <div className="ledger-modal-overlay" onClick={onClose}>
      <div
        className="ledger-modal-box"
        style={{
          maxWidth: "540px",
          width: "95vw",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          padding: "0",
          overflow: "hidden",
          background: "#F8F6F0",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── HEADER ACTIONS ── */}
        <div
          style={{
            padding: "12px 18px",
            background: "#0A0A0A",
            color: "#FFFFFF",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontFamily: "var(--mono)", fontSize: "11px", fontWeight: 900, color: "#FFE600", letterSpacing: "0.06em" }}>
            🧾 DOVER STREET FISCAL RECEIPT
          </span>

          <div style={{ display: "flex", gap: "6px" }}>
            <button
              type="button"
              className="btn-card-action"
              onClick={handleCopy}
              style={{
                background: copied ? "#16A34A" : "#222222",
                color: "#FFFFFF",
                borderColor: "#444444",
                fontSize: "10px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              {copied ? <Check size={11} /> : <Copy size={11} />}
              {copied ? "COPIED" : "COPY TEXT"}
            </button>
            <button
              type="button"
              className="btn-card-action"
              onClick={handleDownloadImage}
              style={{
                background: "#222222",
                color: "#FFFFFF",
                borderColor: "#444444",
                fontSize: "10px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <Download size={11} />
              PNG
            </button>
            <button
              type="button"
              className="btn-card-action"
              onClick={handlePrint}
              style={{
                background: "#222222",
                color: "#FFFFFF",
                borderColor: "#444444",
                fontSize: "10px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <Printer size={11} />
              PRINT
            </button>
            <button
              type="button"
              className="btn-card-action"
              onClick={onClose}
              style={{
                background: "#222222",
                color: "#FFFFFF",
                borderColor: "#444444",
                padding: "2px 6px",
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* ── SCROLLABLE THERMAL RECEIPT CONTAINER ── */}
        <div
          style={{
            overflowY: "auto",
            flex: 1,
            padding: "24px 20px",
            background: "#F5F3EB",
            display: "flex",
            justifyContent: "center",
          }}
        >
          {/* Physical Thermal Paper Card */}
          <div
            ref={receiptRef}
            style={{
              background: "#FDFBF7",
              border: "2px solid #0A0A0A",
              boxShadow: "4px 4px 0 rgba(0,0,0,0.15)",
              padding: "24px 20px",
              width: "100%",
              maxWidth: "460px",
              fontFamily: 'var(--mono, "Courier New", Courier, monospace)',
              fontSize: "11px",
              color: "#0A0A0A",
              lineHeight: 1.4,
            }}
          >
            {/* Top Zig-Zag Perforations */}
            <div style={{ textAlign: "center", fontSize: "10px", letterSpacing: "2px", opacity: 0.5, marginBottom: "8px" }}>
              - - - - - - - - - - - - - - - - - - - - - - - -
            </div>

            {/* Store Branding Header */}
            <div style={{ textAlign: "center", marginBottom: "14px" }}>
              <div style={{ fontSize: "16px", fontWeight: 900, letterSpacing: "0.1em" }}>
                HOARD ARCHIVAL FISCAL REGISTER
              </div>
              <div style={{ fontSize: "10px", fontWeight: 700, color: "#666666" }}>
                STORE NO. 0019 · TERMINAL AUDIT #8841
              </div>
              <div style={{ fontSize: "9.5px", color: "#666666", marginTop: "2px" }}>
                DATE: {dateStr} · {timeStr}
              </div>
              <div style={{ fontSize: "9.5px", color: "#666666" }}>
                EXCHANGE: 1 USD = ₹{inrRate.toFixed(2)} INR (LIVE TIMESTAMP)
              </div>
            </div>

            <div style={{ borderBottom: "1px dashed #000000", margin: "10px 0" }} />

            {/* Inflows & Take-Home */}
            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>(+) GROSS MONTHLY INFLOW</span>
                <b>{formatCurrency(cashFlow.monthlyGrossIncome, 2, "USD")}</b>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", color: "#666666" }}>
                <span>(-) ESTIMATED TAX WITHHOLDING</span>
                <span>-{formatCurrency(cashFlow.monthlyTaxWithholding, 2, "USD")}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 900, borderTop: "1px dotted #888888", paddingTop: "3px", marginTop: "2px" }}>
                <span>(=) NET MONTHLY TAKE-HOME</span>
                <span>+{formatCurrency(cashFlow.monthlyNetTakeHome, 2, "USD")}</span>
              </div>
            </div>

            <div style={{ borderBottom: "1px dashed #000000", margin: "10px 0" }} />

            {/* Fixed Outflows & SIPs */}
            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>(-) FIXED SUBSCRIPTIONS BURN</span>
                <span>-{formatCurrency(cashFlow.monthlySubscriptions, 2, "USD")}</span>
              </div>
              <div style={{ fontSize: "9.5px", color: "#777777", paddingLeft: "10px" }}>
                ({subscriptionMetrics.activeCount} active subscriptions)
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>(-) DEBT MINIMUM PAYMENTS</span>
                <span>-{formatCurrency(cashFlow.monthlyDebtMinimums, 2, "USD")}</span>
              </div>
              <div style={{ fontSize: "9.5px", color: "#777777", paddingLeft: "10px" }}>
                ({debts.length} active liabilities)
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>(-) WEALTH SIPs (₹{investmentMetrics.monthlyTotal.toFixed(0)} INR)</span>
                <span>-{formatCurrency(cashFlow.monthlyRecurringInvestmentsUsd || investmentMetrics.monthlyTotalUsd || 0, 2, "USD")}</span>
              </div>
              <div style={{ fontSize: "9.5px", color: "#777777", paddingLeft: "10px" }}>
                ({investments.length} recurring allocations)
              </div>
            </div>

            <div style={{ borderBottom: "1px dashed #000000", margin: "10px 0" }} />

            {/* Total Surplus & Velocity */}
            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>TOTAL FIXED OUTFLOWS</span>
                <span>-{formatCurrency(cashFlow.totalFixedOutflow, 2, "USD")}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 900, fontSize: "13px", background: "#0A0A0A", color: "#FFE600", padding: "4px 6px", margin: "4px 0" }}>
                <span>FREE MONTHLY SURPLUS</span>
                <span>+{formatCurrency(cashFlow.monthlyNetSurplus, 2, "USD")}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#444444" }}>
                <span>SAVINGS RATE: <b>{cashFlow.savingsRatePct}%</b></span>
                <span>WEALTH VELOCITY: <b>{cashFlow.wealthVelocityPct}%</b></span>
              </div>
            </div>

            <div style={{ borderBottom: "1px dashed #000000", margin: "10px 0" }} />

            {/* Balance Sheet Summary */}
            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>TOTAL ASSET PORTFOLIO</span>
                <b>{formatCurrency(netWorth.totalAssets, 2, "USD")}</b>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>TOTAL DEBT LIABILITIES</span>
                <b>-{formatCurrency(netWorth.totalLiabilities, 2, "USD")}</b>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 900, fontSize: "12px", borderTop: "1px dotted #000", paddingTop: "3px" }}>
                <span>TOTAL CALCULATED NET WORTH</span>
                <span style={{ color: "#15803D" }}>{formatCurrency(netWorth.netWorth, 2, "USD")}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#555", marginTop: "2px" }}>
                <span>EMERGENCY RUNWAY</span>
                <b>{cashFlow.runwayMonths.toFixed(1)} MONTHS</b>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#555" }}>
                <span>AI QUANT AUDITOR SCORE</span>
                <b>{auditScore} / 100 [GRADE A]</b>
              </div>
            </div>

            <div style={{ borderBottom: "1px dashed #000000", margin: "12px 0" }} />

            {/* Retro Barcode and Verification */}
            <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
              <div
                style={{
                  fontFamily: 'monospace',
                  fontSize: "18px",
                  letterSpacing: "4px",
                  lineHeight: 1,
                  fontWeight: 900,
                  transform: "scaleY(1.3)",
                  margin: "4px 0",
                }}
              >
                ||| | ||| || |||| | ||| || |||| || | ||| |||
              </div>
              <div style={{ fontSize: "8.5px", color: "#777777", letterSpacing: "0.08em" }}>
                CHECKSUM: #HDR-ARCHIVE-{new Date().getFullYear()}-0019
              </div>
              <div style={{ fontSize: "9px", fontWeight: 800, marginTop: "4px" }}>
                THANK YOU FOR BUILDING SOVEREIGN WEALTH
              </div>
            </div>

            {/* Bottom Zig-Zag Perforations */}
            <div style={{ textAlign: "center", fontSize: "10px", letterSpacing: "2px", opacity: 0.5, marginTop: "8px" }}>
              - - - - - - - - - - - - - - - - - - - - - - - -
            </div>
          </div>
        </div>

        {/* ── MODAL FOOTER ── */}
        <div
          style={{
            padding: "12px 18px",
            background: "#FFFFFF",
            borderTop: "1.5px solid #0A0A0A",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontFamily: "var(--mono)", fontSize: "10.5px", color: "#666" }}>
            Generated from active ledger balance sheet &amp; live FX rate
          </div>
          <button
            type="button"
            className="btn-ledger btn-ledger-primary"
            onClick={onClose}
            style={{ fontSize: "11px" }}
          >
            CLOSE RECEIPT
          </button>
        </div>
      </div>
    </div>
  );
};
