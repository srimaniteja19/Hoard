"use client";

import React from "react";
import {
  FinancialIncomeRow,
  CashFlowSummary,
  IncomeCadence,
} from "@/lib/ledger/types";
import { formatCurrency, formatSignedCurrency, getCurrencySymbol } from "@/lib/ledger/formatters";
import { calculateIncomeTax } from "@/lib/ledger/taxCalculator";
import { playSound } from "@/lib/sound";
import { CashFlowVelocityWaterfall } from "./charts/CashFlowVelocityWaterfall";

interface CashFlowPlannerProps {
  incomes: FinancialIncomeRow[];
  cashFlow: CashFlowSummary;
  onAddIncome: () => void;
  onEditIncome: (inc: FinancialIncomeRow) => void;
  onUpdateIncome: (inc: FinancialIncomeRow) => void;
  onDeleteIncome: (id: string) => void;
  currency?: string;
}

export const CashFlowPlanner: React.FC<CashFlowPlannerProps> = ({
  incomes,
  cashFlow,
  onAddIncome,
  onEditIncome,
  onUpdateIncome,
  onDeleteIncome,
  currency = "INR",
}) => {
  const handleToggleActive = async (inc: FinancialIncomeRow) => {
    playSound.click();
    try {
      const res = await fetch(`/api/financial/incomes/${inc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !inc.isActive }),
      });
      if (res.ok) {
        const updated = await res.json();
        onUpdateIncome(updated);
        playSound.fileIt();
      }
    } catch {
      // ignore
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this income source?")) return;
    playSound.bury();
    try {
      const res = await fetch(`/api/financial/incomes/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onDeleteIncome(id);
      }
    } catch {
      // ignore
    }
  };

  const isSurplusPositive = cashFlow.monthlyNetSurplus >= 0;
  const sym = getCurrencySymbol(currency);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* ── CHARTS: WATERFALL VISUALIZATION ── */}
      {incomes.length > 0 && (
        <CashFlowVelocityWaterfall
          cashFlow={cashFlow}
          incomes={incomes}
          currency={currency}
        />
      )}

      {/* ── CASH FLOW WATERFALL SUMMARY CARD ── */}
      <div
        style={{
          background: "var(--card, #FFFFFF)",
          border: "2px solid var(--ink, #0A0A0A)",
          boxShadow: "4px 4px 0 var(--ink, #0A0A0A)",
          padding: "24px 26px",
          borderRadius: "3px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
          <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            <span>🌊</span>
            MONTHLY CASH VELOCITY
            <span
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "10.5px",
                fontWeight: 800,
                padding: "2px 8px",
                background: isSurplusPositive ? "#DCFCE7" : "#FEE2E2",
                color: isSurplusPositive ? "#166534" : "#991B1B",
                border: "1px solid currentColor",
                borderRadius: "2px",
              }}
            >
              {isSurplusPositive ? "SURPLUS" : "DEFICIT"}
            </span>
          </h3>

          <button
            type="button"
            className="btn-ledger btn-ledger-primary"
            onClick={onAddIncome}
          >
            + ADD INCOME STREAM
          </button>
        </div>

        <div className="cashflow-row">
          <span style={{ fontWeight: 800 }}>Gross Monthly Inflow</span>
          <span style={{ fontFamily: "var(--display, sans-serif)", fontSize: "17px", fontWeight: 900, color: "#16A34A" }}>
            {formatSignedCurrency(cashFlow.monthlyGrossIncome, 2, currency)}
          </span>
        </div>

        {cashFlow.monthlyTaxWithholding > 0 && (
          <div className="cashflow-row">
            <span>↳ Estimated Taxes &amp; Withholdings (Fed/State/FICA)</span>
            <span style={{ color: "#DC2626", fontWeight: 800 }}>
              {formatCurrency(-cashFlow.monthlyTaxWithholding, 2, currency)}
            </span>
          </div>
        )}

        <div className="cashflow-row">
          <span style={{ fontWeight: 800 }}>Net Take-Home Cash Flow</span>
          <span style={{ fontFamily: "var(--display, sans-serif)", fontSize: "17px", fontWeight: 900, color: "#16A34A" }}>
            {formatSignedCurrency(cashFlow.monthlyNetTakeHome, 2, currency)}
          </span>
        </div>

        <div className="cashflow-row">
          <span>↳ Subscriptions &amp; Recurring Burn</span>
          <span style={{ color: "#DC2626", fontWeight: 700 }}>
            {formatCurrency(-cashFlow.monthlySubscriptions, 2, currency)}
          </span>
        </div>

        <div className="cashflow-row">
          <span>↳ Debt Minimum Payments</span>
          <span style={{ color: "#DC2626", fontWeight: 700 }}>
            {formatCurrency(-cashFlow.monthlyDebtMinimums, 2, currency)}
          </span>
        </div>

        {cashFlow.monthlyRecurringInvestments > 0 && (
          <div className="cashflow-row">
            <span>↳ Recurring Wealth Investments (Gold / Stocks / SIPs)</span>
            <span style={{ color: "#0284C7", fontWeight: 800 }}>
              {formatCurrency(-cashFlow.monthlyRecurringInvestments, 2, currency)}
            </span>
          </div>
        )}

        <div className="cashflow-row" style={{ borderTop: "1.5px solid var(--ink, #0A0A0A)", marginTop: "8px", paddingTop: "10px" }}>
          <span style={{ fontWeight: 900, fontSize: "12.5px" }}>FREE CASH SURPLUS</span>
          <span
            style={{
              fontFamily: "var(--display, sans-serif)",
              fontSize: "22px",
              fontWeight: 900,
              color: isSurplusPositive ? "#16A34A" : "#DC2626",
            }}
          >
            {formatSignedCurrency(cashFlow.monthlyNetSurplus, 2, currency)}
          </span>
        </div>

        <div style={{ marginTop: "14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--mono, monospace)", fontSize: "10.5px", fontWeight: 800, marginBottom: "5px" }}>
            <span>WEALTH ACCUMULATION VELOCITY</span>
            <span>{cashFlow.wealthVelocityPct || cashFlow.savingsRatePct}% (INVESTMENT + SURPLUS)</span>
          </div>
          <div className="debt-progress-bar">
            <div
              className="debt-progress-fill"
              style={{
                width: `${Math.min(100, Math.max(0, cashFlow.wealthVelocityPct || cashFlow.savingsRatePct))}%`,
                background: (cashFlow.wealthVelocityPct || cashFlow.savingsRatePct) > 20 ? "#16A34A" : "#F59E0B",
              }}
            />
          </div>
        </div>
      </div>

      {/* ── INCOME SOURCES GRID ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "10px" }}>
        <h3 style={{ fontFamily: "var(--display, sans-serif)", fontSize: "20px", fontWeight: 900, margin: 0 }}>
          INCOME STREAMS ({incomes.length})
        </h3>
        <button type="button" className="btn-ledger btn-ledger-primary" onClick={onAddIncome}>
          + ADD INCOME STREAM
        </button>
      </div>

      {incomes.length === 0 ? (
        <div
          style={{
            background: "var(--card, #FFFFFF)",
            border: "2px dashed var(--ink, #0A0A0A)",
            boxShadow: "3px 3px 0 var(--ink, #0A0A0A)",
            padding: "40px 24px",
            textAlign: "center",
            borderRadius: "3px",
          }}
        >
          <div style={{ fontFamily: "var(--display, sans-serif)", fontSize: "18px", fontWeight: 900, marginBottom: "6px" }}>
            NO INCOMES RECORDED
          </div>
          <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "12px", color: "#666666", marginBottom: "16px" }}>
            Add your salary, freelance earnings, or side hustle revenues to monitor net monthly velocity.
          </div>
          <button type="button" className="btn-ledger btn-ledger-primary" onClick={onAddIncome}>
            + ADD YOUR FIRST INCOME STREAM
          </button>
        </div>
      ) : (
        <div className="sub-grid">
          {incomes.map((inc) => {
            const incCurrency = (inc as any).currency || currency;
            const taxDetails = calculateIncomeTax({
              amount: inc.amount,
              cadence: inc.cadence as IncomeCadence,
              isPreTax: inc.isPreTax,
              country: inc.country,
              region: inc.region,
              customTaxRate: inc.customTaxRate,
            });

            return (
              <div
                key={inc.id}
                className="sub-card-editorial"
                style={{ opacity: inc.isActive ? 1 : 0.6 }}
              >
                {/* Header */}
                <div className="sub-card-header">
                  <span
                    className="sub-card-category"
                    style={{
                      background: "var(--ink, #0A0A0A)",
                      color: "#FFFFFF",
                    }}
                  >
                    <span>💵</span>
                    <span>{inc.category}</span>
                  </span>

                  <div style={{ display: "flex", gap: "4px" }}>
                    <span
                      className="sub-card-status"
                      style={{
                        background: inc.isPreTax ? "#FEF08A" : "#E0F2FE",
                        color: inc.isPreTax ? "#854D0E" : "#0369A1",
                        borderColor: inc.isPreTax ? "#CA8A04" : "#0284C7",
                      }}
                    >
                      {inc.isPreTax ? "PRE-TAX" : "POST-TAX"}
                    </span>

                    <span
                      className="sub-card-status"
                      style={{
                        background: inc.isActive ? "#DCFCE7" : "#F3F4F6",
                        color: inc.isActive ? "#166534" : "#4B5563",
                        borderColor: inc.isActive ? "#16A34A" : "#9CA3AF",
                      }}
                    >
                      {inc.isActive ? "ACTIVE" : "PAUSED"}
                    </span>
                  </div>
                </div>

                {/* Body */}
                <div className="sub-card-body">
                  <div className="sub-card-title-row">
                    <h3 className="sub-card-title">{inc.name}</h3>
                    <div>
                      <span className="sub-card-price" style={{ color: "#16A34A" }}>
                        +{formatCurrency(inc.amount, 2, incCurrency)}
                      </span>
                      <span className="sub-card-price-unit">/ {inc.cadence.toLowerCase()}</span>
                    </div>
                  </div>

                  {/* Tax Withholding Details if Pre-Tax */}
                  {inc.isPreTax && (
                    <div
                      style={{
                        background: "rgba(0, 0, 0, 0.03)",
                        border: "1px solid rgba(0, 0, 0, 0.1)",
                        borderRadius: "2px",
                        padding: "8px 10px",
                        fontFamily: "var(--mono, monospace)",
                        fontSize: "10.5px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "3px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", color: "#555555" }}>
                        <span>📍 {taxDetails.jurisdictionLabel}</span>
                        <span style={{ color: "#DC2626", fontWeight: 800 }}>-{taxDetails.effectiveTaxRatePct}% Tax</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, color: "#16A34A" }}>
                        <span>Take-Home Net:</span>
                        <span>+{formatCurrency(taxDetails.netMonthlyIncome, 2, incCurrency)}/mo</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions Footer */}
                <div className="sub-card-footer">
                  <button
                    type="button"
                    className="btn-card-action"
                    onClick={() => {
                      playSound.click();
                      onEditIncome(inc);
                    }}
                  >
                    ✎ EDIT
                  </button>
                  <button
                    type="button"
                    className="btn-card-action"
                    onClick={() => handleToggleActive(inc)}
                  >
                    {inc.isActive ? "PAUSE INFLOW" : "ACTIVATE"}
                  </button>
                  <button
                    type="button"
                    className="btn-card-action btn-card-delete"
                    onClick={() => handleDelete(inc.id)}
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
