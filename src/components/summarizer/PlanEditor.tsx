"use client";

import React from "react";
import { DigestPlan, IntakeAnalysis } from "@/lib/summarizer/types";
import { playSound } from "@/lib/sound";
import {
  Sparkles,
  GitCommit,
  Split,
  Layers,
  RefreshCw,
  Scale,
  Users,
  BookOpen,
  ShieldAlert,
  Scissors,
  ArrowRight,
  RotateCcw,
  Check,
} from "lucide-react";

interface PlanEditorProps {
  plan: DigestPlan;
  intake: IntakeAnalysis;
  onChangePlan: (updated: DigestPlan) => void;
  onConfirmWrite: () => void;
  onBackToIntake: () => void;
  loading: boolean;
}

export const PlanEditor: React.FC<PlanEditorProps> = ({
  plan,
  intake,
  onChangePlan,
  onConfirmWrite,
  onBackToIntake,
  loading,
}) => {
  const toggleKey = (key: keyof DigestPlan) => {
    playSound.click();
    onChangePlan({
      ...plan,
      [key]: !plan[key],
    });
  };

  return (
    <div
      style={{
        background: "#0A0A0A",
        border: "2px solid #FFE600",
        boxShadow: "6px 6px 0 #000000, 0 0 30px rgba(255, 230, 0, 0.1)",
        borderRadius: "4px",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
      }}
    >
      {/* ── HEADER & ARGUMENT SURFACE INTRO ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", borderBottom: "1.5px solid #222222", paddingBottom: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "10px", fontWeight: 900, background: "#FFE600", color: "#0A0A0A", padding: "2px 6px", borderRadius: "2px" }}>
              STEP 2 OF 3 · PRE-GENERATION PLAN
            </span>
            <h2 style={{ fontFamily: "var(--display, sans-serif)", fontSize: "18px", fontWeight: 900, color: "#FFFFFF", margin: 0 }}>
              THE ARGUMENT SURFACE
            </h2>
          </div>
          <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px", color: "#A3A3A3", marginTop: "4px" }}>
            Review and adjust the structural blueprint before writing body prose. Turning off unwanted components costs zero tokens.
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            playSound.click();
            onBackToIntake();
          }}
          className="btn-card-action"
          style={{ background: "#181818", color: "#A3A3A3", fontSize: "11px", padding: "6px 12px" }}
        >
          ← EDIT SOURCE TEXT
        </button>
      </div>

      {/* ── AUTONOMOUS STRATEGY DIRECTIVE BANNER ── */}
      {plan.strategy && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            background: "#141414",
            border: `1px solid ${plan.strategy.badgeColor || "#FFE600"}`,
            padding: "10px 14px",
            borderRadius: "3px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "10px", fontWeight: 900, color: plan.strategy.badgeColor || "#FFE600", letterSpacing: "0.04em" }}>
              🤖 AUTONOMOUS DIRECTIVE: {plan.strategy.label}
            </span>
            <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "10px", background: "#1E1E1E", color: "#FFFFFF", padding: "1px 6px", borderRadius: "2px" }}>
              Persona: {plan.strategy.expertPersona}
            </span>
          </div>
          <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px", color: "#A3A3A3", marginTop: "2px" }}>
            <b>Load-Bearing Priority:</b> {plan.strategy.loadBearingFocus}
          </div>
        </div>
      )}

      {/* ── THESIS HYPOTHESIS ── */}
      <div
        style={{
          background: "linear-gradient(135deg, #1C1917 0%, #292524 100%)",
          border: "1.5px solid #D97706",
          borderRadius: "4px",
          padding: "16px 18px",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
        }}
      >
        <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "10px", fontWeight: 900, color: "#FBBF24", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          🎯 THE INSIGHT (PROPOSED THESIS · UNDER 20 WORDS)
        </div>
        <div style={{ fontFamily: "var(--display, sans-serif)", fontSize: "19px", fontWeight: 900, color: "#FFE600", lineHeight: "1.4" }}>
          &ldquo;{plan.thesisHypothesis}&rdquo;
        </div>
      </div>

      {/* ── SECTIONS OUTLINE ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px", fontWeight: 900, color: "#FFFFFF" }}>
            📋 PROPOSED SECTIONS ({plan.proposedHeadings?.length || 0})
          </span>
          <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "10px", color: "#888888" }}>
            Following the argument's logic, not running order
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "8px" }}>
          {(plan.proposedHeadings || []).map((heading, i) => (
            <div
              key={i}
              style={{
                background: "#141414",
                border: "1px solid #282828",
                padding: "10px 12px",
                borderRadius: "3px",
                fontFamily: "var(--mono, monospace)",
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span style={{ color: "#FFE600", fontWeight: 900, fontSize: "11px" }}>0{i + 1}</span>
              <span style={{ color: "#E5E5E5", fontWeight: 700 }}>{heading}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── STRUCTURAL COMPONENTS GRID (WITH TOGGLES & REASONING) ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px" }}>
        
        {/* 1. Figures Proposal */}
        <div
          style={{
            background: "#121212",
            border: `1.5px solid ${plan.includeFigures && plan.candidateFigures.length > 0 ? "#00F0FF" : "#262626"}`,
            padding: "14px",
            borderRadius: "4px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: "10px",
          }}
        >
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px", fontWeight: 900, color: "#00F0FF", display: "flex", alignItems: "center", gap: "6px" }}>
                <Layers size={13} />
                DRAWABLE FIGURES ({plan.candidateFigures.length})
              </span>
              {plan.candidateFigures.length > 0 && (
                <button
                  type="button"
                  onClick={() => toggleKey("includeFigures")}
                  style={{
                    background: plan.includeFigures ? "#00F0FF" : "#222222",
                    color: plan.includeFigures ? "#0A0A0A" : "#888888",
                    border: "none",
                    borderRadius: "2px",
                    padding: "2px 6px",
                    fontFamily: "var(--mono, monospace)",
                    fontSize: "9.5px",
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  {plan.includeFigures ? "ENABLED" : "OFF"}
                </button>
              )}
            </div>

            {plan.candidateFigures.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px" }}>
                {plan.candidateFigures.map((f, i) => (
                  <div key={i} style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px", color: "#CCCCCC", background: "#181818", padding: "6px 8px", borderRadius: "2px" }}>
                    <b style={{ color: "#FFE600", textTransform: "uppercase" }}>{f.kind}</b> · {f.evidence}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px", color: "#888888", fontStyle: "italic", marginTop: "8px" }}>
                FIGURES · 0 · No literal drawable structure — shipping without figures.
              </div>
            )}
          </div>
        </div>

        {/* 2. Cast Proposal */}
        <div
          style={{
            background: "#121212",
            border: `1.5px solid ${plan.includeCast && plan.candidateCast.length >= 4 ? "#A855F7" : "#262626"}`,
            padding: "14px",
            borderRadius: "4px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: "10px",
          }}
        >
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px", fontWeight: 900, color: "#A855F7", display: "flex", alignItems: "center", gap: "6px" }}>
                <Users size={13} />
                CAST DOSSIER ({plan.candidateCast.length})
              </span>
              {plan.candidateCast.length >= 4 && (
                <button
                  type="button"
                  onClick={() => toggleKey("includeCast")}
                  style={{
                    background: plan.includeCast ? "#A855F7" : "#222222",
                    color: plan.includeCast ? "#FFFFFF" : "#888888",
                    border: "none",
                    borderRadius: "2px",
                    padding: "2px 6px",
                    fontFamily: "var(--mono, monospace)",
                    fontSize: "9.5px",
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  {plan.includeCast ? "ENABLED" : "OFF"}
                </button>
              )}
            </div>

            {plan.candidateCast.length >= 4 ? (
              <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px", color: "#D8B4FE", marginTop: "8px" }}>
                {plan.candidateCast.slice(0, 5).join(", ")}{plan.candidateCast.length > 5 ? ` +${plan.candidateCast.length - 5} more` : ""}
              </div>
            ) : (
              <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px", color: "#888888", fontStyle: "italic", marginTop: "8px" }}>
                CAST · {plan.candidateCast.length} · Fewer than four distinct actors — not worth a cast dossier.
              </div>
            )}
          </div>
        </div>

        {/* 3. Jargon & Terms */}
        <div
          style={{
            background: "#121212",
            border: `1.5px solid ${plan.includeTerms && plan.candidateTerms.length > 0 ? "#4ADE80" : "#262626"}`,
            padding: "14px",
            borderRadius: "4px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: "10px",
          }}
        >
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px", fontWeight: 900, color: "#4ADE80", display: "flex", alignItems: "center", gap: "6px" }}>
                <BookOpen size={13} />
                TERMS TO DEFINE ({plan.candidateTerms.length})
              </span>
              {plan.candidateTerms.length > 0 && (
                <button
                  type="button"
                  onClick={() => toggleKey("includeTerms")}
                  style={{
                    background: plan.includeTerms ? "#4ADE80" : "#222222",
                    color: plan.includeTerms ? "#0A0A0A" : "#888888",
                    border: "none",
                    borderRadius: "2px",
                    padding: "2px 6px",
                    fontFamily: "var(--mono, monospace)",
                    fontSize: "9.5px",
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  {plan.includeTerms ? "ENABLED" : "OFF"}
                </button>
              )}
            </div>

            {plan.candidateTerms.length > 0 ? (
              <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px", color: "#86EFAC", marginTop: "8px" }}>
                {plan.candidateTerms.join(" · ")}
              </div>
            ) : (
              <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px", color: "#888888", fontStyle: "italic", marginTop: "8px" }}>
                TERMS · 0 · No esoteric jargon needing external definition.
              </div>
            )}
          </div>
        </div>

        {/* 4. Claims Audit Flagging */}
        <div
          style={{
            background: "#121212",
            border: `1.5px solid ${plan.includeClaimsAudit ? "#F87171" : "#262626"}`,
            padding: "14px",
            borderRadius: "4px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: "10px",
          }}
        >
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px", fontWeight: 900, color: "#F87171", display: "flex", alignItems: "center", gap: "6px" }}>
                <ShieldAlert size={13} />
                CLAIMS &amp; STATS TO AUDIT ({plan.claimsToFlagCount})
              </span>
              <button
                type="button"
                onClick={() => toggleKey("includeClaimsAudit")}
                style={{
                  background: plan.includeClaimsAudit ? "#F87171" : "#222222",
                  color: plan.includeClaimsAudit ? "#0A0A0A" : "#888888",
                  border: "none",
                  borderRadius: "2px",
                  padding: "2px 6px",
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "9.5px",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                {plan.includeClaimsAudit ? "AUDITING" : "OFF"}
              </button>
            </div>

            <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "10.5px", color: "#A3A3A3", marginTop: "8px" }}>
              Every statistic, number, or assertion will be tagged as <b style={{ color: "#FCA5A5" }}>unverified</b> unless primary citations are present.
            </div>
          </div>
        </div>

        {/* 5. Skipped Content Disclosure */}
        {plan.skippedPredictions.length > 0 && (
          <div
            style={{
              gridColumn: "1 / -1",
              background: "#121212",
              border: "1px solid #282828",
              padding: "12px 16px",
              borderRadius: "4px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Scissors size={14} color="#FBBF24" />
              <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px", color: "#D1D5DB" }}>
                <b style={{ color: "#FBBF24" }}>PREDICTED TANGENTS TO DROP:</b> {plan.skippedPredictions.join(" · ")}
              </span>
            </div>
            <button
              type="button"
              onClick={() => toggleKey("includeSkippedFooter")}
              style={{
                background: plan.includeSkippedFooter ? "#FBBF24" : "#222222",
                color: plan.includeSkippedFooter ? "#0A0A0A" : "#888888",
                border: "none",
                borderRadius: "2px",
                padding: "2px 6px",
                fontFamily: "var(--mono, monospace)",
                fontSize: "9.5px",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              {plan.includeSkippedFooter ? "DISCLOSE IN FOOTER" : "SILENT"}
            </button>
          </div>
        )}

      </div>

      {/* ── ACTION TRIGGER ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", borderTop: "1.5px solid #222222", paddingTop: "18px" }}>
        <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px", color: "#888888" }}>
          Target: <b style={{ color: "#FFE600" }}>700–900 words of load-bearing prose</b> (3–5 min digest)
        </div>

        <button
          type="button"
          onClick={() => {
            playSound.click();
            onConfirmWrite();
          }}
          disabled={loading}
          className="btn-ledger btn-ledger-primary"
          style={{
            padding: "12px 24px",
            fontSize: "13px",
            fontWeight: 900,
            background: "#FFE600",
            color: "#0A0A0A",
            border: "2px solid #000000",
            boxShadow: "4px 4px 0 #000000",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          <span>{loading ? "SYNTHESIZING DIGEST..." : "WRITE DIGEST NOW ⚡"}</span>
          <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
};
