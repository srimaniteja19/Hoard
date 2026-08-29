"use client";

import React, { useState } from "react";
import {
  FinancialAuditRow,
  FinancialAuditAnalysis,
} from "@/lib/ledger/types";
import { playSound } from "@/lib/sound";

interface LedgerAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  latestAudit: FinancialAuditRow | null;
  onAuditGenerated: (audit: FinancialAuditRow) => void;
}

export const LedgerAuditModal: React.FC<LedgerAuditModalProps> = ({
  isOpen,
  onClose,
  latestAudit,
  onAuditGenerated,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const analysis = latestAudit?.analysis as unknown as FinancialAuditAnalysis | undefined;

  const handleRunAudit = async () => {
    try {
      setLoading(true);
      setError(null);
      playSound.click();

      const res = await fetch("/api/financial/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate financial audit");
      }

      const data = await res.json();
      onAuditGenerated(data.audit);
      playSound.fileIt();
    } catch (err: any) {
      setError(err.message || "Failed to synthesize audit");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ledger-modal-overlay" onClick={onClose}>
      <div className="ledger-modal-box" style={{ maxWidth: "680px" }} onClick={(e) => e.stopPropagation()}>
        <div className="ledger-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <h2>✨ AI FINANCIAL AUDIT & SCRIBE</h2>
            <span className="ledger-title-badge">GEMINI 3.5</span>
          </div>
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

        {!analysis ? (
          <div style={{ textAlign: "center", padding: "30px 10px" }}>
            <div style={{ fontSize: "36px", marginBottom: "10px" }}>🔮</div>
            <h3 style={{ fontFamily: "var(--display)", fontSize: "18px", fontWeight: 900, margin: "0 0 8px 0" }}>
              SYNTHESIZE COMPLETE FINANCIAL AUDIT
            </h3>
            <p style={{ fontFamily: "var(--mono)", fontSize: "11.5px", color: "var(--ink-muted, #666)", margin: "0 auto 20px auto", maxWidth: "480px" }}>
              Let Gemini analyze your recurring subscriptions, loan APRs, cash flow, and emergency runway to recommend high-leverage cuts and accelerated debt payoff routes.
            </p>
            <button
              type="button"
              disabled={loading}
              className="btn-ledger btn-ledger-ai"
              onClick={handleRunAudit}
              style={{ fontSize: "12px", padding: "10px 20px" }}
            >
              {loading ? "✨ AUDITING YOUR LEDGER..." : "✨ RUN AI AUDIT NOW"}
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Health Score & Verdict */}
            <div className="audit-health-meter">
              <div className="audit-score-circle">
                {analysis.healthScore}
              </div>
              <div>
                <div style={{ fontFamily: "var(--mono)", fontSize: "10px", fontWeight: 800, color: "var(--ink-muted, #777)", textTransform: "uppercase" }}>
                  FINANCIAL VELOCITY HEALTH SCORE
                </div>
                <div style={{ fontFamily: "var(--sans)", fontSize: "13.5px", fontWeight: 700, color: "var(--ink)", marginTop: "3px", lineHeight: 1.35 }}>
                  {analysis.summaryVerdict}
                </div>
              </div>
            </div>

            {/* Subscription Cull List */}
            {analysis.subscriptionCullList && analysis.subscriptionCullList.length > 0 && (
              <div>
                <div style={{ fontFamily: "var(--mono)", fontSize: "11px", fontWeight: 900, marginBottom: "8px", textTransform: "uppercase", color: "#BE123C" }}>
                  ✂️ RECOMMENDED SUBSCRIPTION CULL LIST
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {analysis.subscriptionCullList.map((cull, i) => (
                    <div key={i} className="audit-cull-item">
                      <div>
                        <b style={{ fontFamily: "var(--display)", fontSize: "14px" }}>{cull.name}</b>
                        <div style={{ fontFamily: "var(--mono)", fontSize: "10.5px", color: "#9F1239", marginTop: "2px" }}>
                          {cull.reason}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", fontFamily: "var(--mono)", fontWeight: 900, color: "#16A34A" }}>
                        +${cull.annualSavings}/yr
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Debt Acceleration Recommendation */}
            {analysis.debtAccelerationStrategy && (
              <div
                style={{
                  background: "#F0FDF4",
                  border: "1.5px solid #16A34A",
                  padding: "14px",
                }}
              >
                <div style={{ fontFamily: "var(--mono)", fontSize: "10.5px", fontWeight: 900, color: "#166534", marginBottom: "4px" }}>
                  🎯 RECOMMENDED PAYOFF STRATEGY: {analysis.debtAccelerationStrategy.recommendedStrategy}
                </div>
                <div style={{ fontFamily: "var(--sans)", fontSize: "13px", color: "var(--ink)", marginBottom: "6px" }}>
                  {analysis.debtAccelerationStrategy.strategyRationale}
                </div>
                <div style={{ fontFamily: "var(--mono)", fontSize: "11px", color: "#15803D", fontWeight: 700 }}>
                  Priority Target: <b>{analysis.debtAccelerationStrategy.targetPriorityDebt}</b> (+${analysis.debtAccelerationStrategy.extraPaymentRecommendation}/mo extra saves ${analysis.debtAccelerationStrategy.projectedInterestSavings.toLocaleString()} in interest)
                </div>
              </div>
            )}

            {/* Tactical Actions */}
            {analysis.cashFlowOptimization && analysis.cashFlowOptimization.length > 0 && (
              <div>
                <div style={{ fontFamily: "var(--mono)", fontSize: "11px", fontWeight: 900, marginBottom: "8px", textTransform: "uppercase" }}>
                  ⚡ HIGH-LEVERAGE TACTICAL MOVES
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {analysis.cashFlowOptimization.map((act, i) => (
                    <div
                      key={i}
                      style={{
                        background: "var(--paper-light, #FFFFFF)",
                        border: "1px solid var(--ink)",
                        padding: "10px 14px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                        <b style={{ fontFamily: "var(--display)", fontSize: "13.5px" }}>{act.title}</b>
                        <span style={{ fontFamily: "var(--mono)", fontSize: "10px", fontWeight: 800, color: "#16A34A" }}>
                          {act.impact}
                        </span>
                      </div>
                      <div style={{ fontFamily: "var(--mono)", fontSize: "11px", color: "var(--ink-muted, #666)" }}>
                        {act.action}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="ledger-modal-footer" style={{ justifyContent: "space-between" }}>
              <button
                type="button"
                disabled={loading}
                className="btn-ledger btn-ledger-ai"
                onClick={handleRunAudit}
                style={{ fontSize: "10.5px" }}
              >
                {loading ? "✨ RE-AUDITING..." : "✨ RE-RUN AUDIT"}
              </button>
              <button type="button" className="btn-ledger btn-ledger-primary" onClick={onClose}>
                CLOSE AUDIT
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
