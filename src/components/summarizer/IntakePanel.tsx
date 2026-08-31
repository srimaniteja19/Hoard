"use client";

import React from "react";
import { IntakeAnalysis } from "@/lib/summarizer/types";
import { SAMPLES, SampleSource } from "@/lib/summarizer/samples";
import { playSound } from "@/lib/sound";
import { Sparkles, FileText, Clock, Scissors, Zap, BookOpen, Layers, ArrowRight } from "lucide-react";

interface IntakePanelProps {
  text: string;
  onChangeText: (text: string) => void;
  intake: IntakeAnalysis;
  onAnalyzePlan: () => void;
  loading: boolean;
}

export const IntakePanel: React.FC<IntakePanelProps> = ({
  text,
  onChangeText,
  intake,
  onAnalyzePlan,
  loading,
}) => {
  const loadSample = (sample: SampleSource) => {
    playSound.click();
    onChangeText(sample.text);
  };

  const survivingPct = Math.max(8, 100 - intake.reductionPercentage);
  const droppedPct = intake.reductionPercentage;

  return (
    <div
      style={{
        background: "#0A0A0A",
        border: "2px solid #222222",
        borderRadius: "4px",
        boxShadow: "4px 4px 0 #000000",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        padding: "20px",
      }}
    >
      {/* Top Telemetry Strip */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
          borderBottom: "1.5px solid #1E1E1E",
          paddingBottom: "14px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <span
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "10px",
              fontWeight: 900,
              padding: "3px 8px",
              borderRadius: "2px",
              background: intake.sourceFormat === "TRANSCRIPT" ? "#EC4899" : intake.sourceFormat === "PAPER" ? "#8B5CF6" : "#00F0FF",
              color: "#0A0A0A",
              letterSpacing: "0.06em",
            }}
          >
            {intake.sourceFormat}
          </span>

          <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px", color: "#A3A3A3" }}>
            <b style={{ color: "#FFFFFF" }}>{intake.wordCount.toLocaleString()}</b> words · <b style={{ color: "#FFE600" }}>{intake.readMinutesSource} min</b> source read
          </span>

          {intake.dateSpanYears && (
            <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "10px", color: "#FBBF24", background: "#1C1917", padding: "2px 6px", borderRadius: "2px", border: "1px solid #78350F" }}>
              ⏳ {intake.dateSpanYears}-yr span ({intake.datesFound.length} dates)
            </span>
          )}

          {intake.namedEntities.length > 0 && (
            <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "10px", color: "#A78BFA", background: "#1E1B4B", padding: "2px 6px", borderRadius: "2px", border: "1px solid #4338CA" }}>
              👤 {intake.namedEntities.length} actors
            </span>
          )}
        </div>

        {/* Target Digest Spec */}
        <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px", color: "#4ADE80", display: "flex", alignItems: "center", gap: "6px" }}>
          <Sparkles size={12} />
          <span>TARGET: <b>~{intake.targetWordCount} words</b> (3–5 min digest)</span>
        </div>
      </div>

      {/* Main Textarea */}
      <div style={{ position: "relative" }}>
        <textarea
          value={text}
          onChange={(e) => onChangeText(e.target.value)}
          placeholder="Paste any long source — article, academic paper, technical essay, or interview transcript with timestamps..."
          rows={10}
          style={{
            width: "100%",
            background: "#121212",
            color: "#FFFFFF",
            border: "1.5px solid #2C2C2C",
            borderRadius: "4px",
            padding: "14px",
            fontFamily: "var(--mono, monospace)",
            fontSize: "13px",
            lineHeight: "1.6",
            resize: "vertical",
            outline: "none",
            boxShadow: "inset 0 2px 4px rgba(0,0,0,0.5)",
          }}
        />

        {text && (
          <button
            type="button"
            onClick={() => {
              playSound.click();
              onChangeText("");
            }}
            style={{
              position: "absolute",
              top: "10px",
              right: "10px",
              background: "#1E1E1E",
              color: "#A3A3A3",
              border: "1px solid #333333",
              borderRadius: "2px",
              padding: "2px 6px",
              fontFamily: "var(--mono, monospace)",
              fontSize: "10px",
              cursor: "pointer",
            }}
          >
            CLEAR
          </button>
        )}
      </div>

      {/* ── THE SCALE REDUCTION BAR ── */}
      {intake.wordCount > 0 && (
        <div
          style={{
            background: "#111111",
            border: "1px solid #222222",
            borderRadius: "3px",
            padding: "12px 14px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "10px", fontWeight: 900, color: "#888888" }}>
              COMPRESSION RATIO ({droppedPct}% DROPPED · {survivingPct}% KEPT)
            </span>
            <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "10px", color: "#4ADE80" }}>
              <b>{intake.targetWordCount}</b> / {intake.wordCount} words
            </span>
          </div>

          {/* Visual Bar */}
          <div style={{ height: "12px", background: "#1F1F1F", borderRadius: "2px", overflow: "hidden", display: "flex" }}>
            {/* Surviving (Lime) */}
            <div
              style={{
                width: `${survivingPct}%`,
                background: "#4ADE80",
                transition: "width 0.3s ease",
              }}
              title={`${survivingPct}% Load-bearing prose kept`}
            />
            {/* Dropped (Hatched) */}
            <div
              style={{
                width: `${droppedPct}%`,
                background: "repeating-linear-gradient(45deg, #262626, #262626 6px, #171717 6px, #171717 12px)",
                transition: "width 0.3s ease",
              }}
              title={`${droppedPct}% Dropped paragraphs`}
            />
          </div>

          <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "10px", color: "#737373", fontStyle: "italic" }}>
            ↳ Compression isn't every paragraph made shorter; it is dropping whole paragraphs and keeping the load-bearing ones intact.
          </div>
        </div>
      )}

      {/* ── SAMPLES BAR & ACTION ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        {/* Sample Pills */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "10px", fontWeight: 900, color: "#FFE600" }}>
            TRY A SAMPLE:
          </span>
          {SAMPLES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => loadSample(s)}
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "10px",
                fontWeight: 800,
                padding: "4px 8px",
                background: "#181818",
                color: "#E5E5E5",
                border: "1px solid #333333",
                borderRadius: "2px",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              title={s.preview}
            >
              {s.title.slice(0, 24)}…
            </button>
          ))}
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={() => {
            playSound.click();
            onAnalyzePlan();
          }}
          disabled={loading || intake.wordCount < 10}
          className="btn-ledger btn-ledger-primary"
          style={{
            padding: "10px 18px",
            fontSize: "12px",
            fontWeight: 900,
            background: "#FFE600",
            color: "#0A0A0A",
            border: "2px solid #000000",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            opacity: loading || intake.wordCount < 10 ? 0.5 : 1,
            cursor: loading || intake.wordCount < 10 ? "not-allowed" : "pointer",
          }}
        >
          <span>{loading ? "ANALYZING..." : "ANALYZE & PLAN DIGEST"}</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};
