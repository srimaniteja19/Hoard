"use client";

import React from "react";
import {
  FinancialIncomeRow,
  CashFlowSummary,
  IncomeCadence,
} from "@/lib/ledger/types";
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
}

export const CashFlowPlanner: React.FC<CashFlowPlannerProps> = ({
  incomes,
  cashFlow,
  onAddIncome,
  onEditIncome,
  onUpdateIncome,
  onDeleteIncome,
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
      const res = await fetch(`/api/financial/incomes/${id}`, { method: "DELETE" });
      if (res.ok) onDeleteIncome(id);
    } catch {
      // ignore
    }
  };

  const isSurplusPositive = cashFlow.monthlyNetSurplus >= 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* ── VISUAL CASH FLOW WATERFALL ── */}
      <CashFlowVelocityWaterfall
        cashFlow={cashFlow}
        incomes={incomes}
      />

      {/* ── CASH FLOW DASHBOARD GRID ── */}
      <div className="cashflow-dashboard">
        {/* Left: Inflow vs Outflow Balance Sheet */}
        <div className="cashflow-box">
          <h3>
            <span>🌊 MONTHLY CASH VELOCITY</span>
            <span
              style={{
                fontSize: "10.5px",
                fontFamily: "var(--mono, monospace)",
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

          <div className="cashflow-row">
            <span style={{ fontWeight: 800 }}>Gross Monthly Inflow</span>
            <span style={{ fontFamily: "var(--display, sans-serif)", fontSize: "17px", fontWeight: 900, color: "#16A34A" }}>
              +${cashFlow.monthlyGrossIncome.toFixed(2)}
            </span>
          </div>

          {cashFlow.monthlyTaxWithholding > 0 && (
            <div className="cashflow-row">
              <span>↳ Estimated Taxes & Withholdings (Fed/State/FICA)</span>
              <span style={{ color: "#DC2626", fontWeight: 800 }}>-${cashFlow.monthlyTaxWithholding.toFixed(2)}</span>
            </div>
          )}

          <div className="cashflow-row">
            <span style={{ fontWeight: 800 }}>Net Take-Home Cash Flow</span>
            <span style={{ fontFamily: "var(--display, sans-serif)", fontSize: "17px", fontWeight: 900, color: "#16A34A" }}>
              +${cashFlow.monthlyNetTakeHome.toFixed(2)}
            </span>
          </div>

          <div className="cashflow-row">
            <span>↳ Subscriptions & Recurring Burn</span>
            <span style={{ color: "#DC2626", fontWeight: 700 }}>-${cashFlow.monthlySubscriptions.toFixed(2)}</span>
          </div>

          <div className="cashflow-row">
            <span>↳ Debt Minimum Payments</span>
            <span style={{ color: "#DC2626", fontWeight: 700 }}>-${cashFlow.monthlyDebtMinimums.toFixed(2)}</span>
          </div>

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
              {isSurplusPositive ? "+" : ""}${cashFlow.monthlyNetSurplus.toFixed(2)}
            </span>
          </div>

          <div style={{ marginTop: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--mono, monospace)", fontSize: "10.5px", fontWeight: 800, marginBottom: "5px" }}>
              <span>SAVINGS RATE</span>
              <span>{cashFlow.savingsRatePct}% OF TAKE-HOME</span>
            </div>
            <div className="debt-progress-bar">
              <div
                className="debt-progress-fill"
                style={{
                  width: `${Math.min(100, Math.max(0, cashFlow.savingsRatePct))}%`,
                  background: cashFlow.savingsRatePct > 20 ? "#16A34A" : "#F59E0B",
                }}
              />
            </div>
          </div>
        </div>

        {/* Right: Emergency Liquid Runway */}
        <div className="cashflow-box">
          <h3>
            <span>🛡️ LIQUID RUNWAY & BUFFER</span>
            <span
              style={{
                fontSize: "10.5px",
                fontFamily: "var(--mono, monospace)",
                fontWeight: 800,
                padding: "2px 8px",
                background: "#DCFCE7",
                color: "#166534",
                border: "1px solid #166534",
                borderRadius: "2px",
              }}
            >
              {cashFlow.runwayMonths >= 6 ? "FORTRESS" : cashFlow.runwayMonths >= 3 ? "HEALTHY" : "LEAN"}
            </span>
          </h3>

          <div style={{ textAlign: "center", padding: "14px 0" }}>
            <div style={{ fontFamily: "var(--display, sans-serif)", fontSize: "46px", fontWeight: 900, color: "var(--ink, #0A0A0A)", lineHeight: 1 }}>
              {cashFlow.runwayMonths.toFixed(1)}
              <span style={{ fontSize: "16px", fontFamily: "var(--mono, monospace)", fontWeight: 800, color: "#666666", marginLeft: "6px" }}>
                MONTHS
              </span>
            </div>
            <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px", fontWeight: 700, color: "#555555", marginTop: "6px" }}>
              Liquid Cash: <b>${cashFlow.liquidCashTotal.toLocaleString()}</b> ÷ Monthly Outflows (<b>${cashFlow.totalFixedOutflow.toFixed(2)}</b>)
            </div>
          </div>

          <div
            style={{
              background: "rgba(0, 0, 0, 0.03)",
              border: "1px solid rgba(0, 0, 0, 0.12)",
              borderRadius: "2px",
              padding: "10px 12px",
              fontFamily: "var(--mono, monospace)",
              fontSize: "11px",
              lineHeight: 1.4,
            }}
          >
            💡 <b>Emergency Buffer Target:</b> Maintain 3 to 6 months of fixed burn ($
            {(cashFlow.totalFixedOutflow * 3).toFixed(0)} – ${(cashFlow.totalFixedOutflow * 6).toFixed(0)}) in liquid high-yield accounts.
          </div>
        </div>
      </div>

      {/* ── INFLOW STREAMS REGISTER ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h3 style={{ fontFamily: "var(--display, sans-serif)", fontSize: "20px", fontWeight: 900, margin: 0 }}>
          RECURRING INFLOW STREAMS ({incomes.length})
        </h3>
        <button type="button" className="btn-ledger btn-ledger-primary" onClick={onAddIncome}>
          + ADD INFLOW STREAM
        </button>
      </div>

      {incomes.length === 0 ? (
        <div
          style={{
            background: "var(--card, #FFFFFF)",
            border: "1.5px dashed var(--ink, #0A0A0A)",
            padding: "40px 20px",
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
                        +${inc.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                        <span>+${taxDetails.netMonthlyIncome.toFixed(2)}/mo</span>
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
