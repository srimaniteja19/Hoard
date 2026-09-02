"use client";

import React from "react";
import { playSound } from "@/lib/sound";

interface AiBarProps {
  accentColor?: string;
  accentFg?: string;
  theme?: "cream" | "ink";
  onTidy: () => void;
  onQuiz: () => void;
  onExplain: () => void;
  onGaps: () => void;
  isTidying?: boolean;
  isQuizzing?: boolean;
  isExplaining?: boolean;
  isAnalyzingGaps?: boolean;
}

export const AiBar: React.FC<AiBarProps> = ({
  accentColor = "#7B5CF0",
  accentFg = "#FFFFFF",
  theme = "cream",
  onTidy,
  onQuiz,
  onExplain,
  onGaps,
  isTidying = false,
  isQuizzing = false,
  isExplaining = false,
  isAnalyzingGaps = false,
}) => {
  const isInk = theme === "ink";

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        border: isInk ? "2px solid rgba(255,255,255,0.2)" : "3px solid #0A0A0A",
        boxShadow: isInk ? "4px 4px 0 rgba(0,0,0,0.6)" : `5px 5px 0 ${accentColor}`,
        margin: "20px 0 30px",
        overflow: "hidden",
        background: isInk ? "#181B24" : "#FFFFFF",
        transition: "background 0.2s ease, border-color 0.2s ease",
      }}
    >
      <div
        style={{
          flex: "none",
          background: accentColor,
          color: accentFg,
          display: "flex",
          alignItems: "center",
          padding: "0 14px",
          fontFamily: "var(--mono, monospace)",
          fontSize: "9.5px",
          fontWeight: 700,
          letterSpacing: "0.15em",
          borderRight: isInk ? "1.5px solid rgba(255,255,255,0.15)" : "2px solid #0A0A0A",
        }}
      >
        ✦ AI
      </div>

      <button
        type="button"
        disabled={isTidying}
        onClick={() => {
          playSound.click();
          onTidy();
        }}
        style={{
          flex: 1,
          fontFamily: "var(--mono, monospace)",
          fontSize: "9.5px",
          fontWeight: 700,
          letterSpacing: "0.11em",
          background: isTidying ? "#FCE94F" : isInk ? "#1A1D26" : "#FFFFFF",
          color: isTidying ? "#0A0A0A" : isInk ? "#F0EDE4" : "#0A0A0A",
          border: "none",
          borderRight: isInk ? "1.5px solid rgba(255,255,255,0.12)" : "2px solid #0A0A0A",
          padding: "11px 8px",
          cursor: isTidying ? "wait" : "pointer",
          minWidth: "120px",
          whiteSpace: "nowrap",
          transition: "background 0.12s ease, color 0.12s ease",
        }}
        onMouseEnter={(e) => {
          if (!isTidying) {
            e.currentTarget.style.background = isInk ? "#2A303F" : "#FCE94F";
            e.currentTarget.style.color = isInk ? "#FFFFFF" : "#0A0A0A";
          }
        }}
        onMouseLeave={(e) => {
          if (!isTidying) {
            e.currentTarget.style.background = isInk ? "#1A1D26" : "#FFFFFF";
            e.currentTarget.style.color = isInk ? "#F0EDE4" : "#0A0A0A";
          }
        }}
      >
        {isTidying ? "TIDYING NOTES…" : "TIDY MY NOTES"}
      </button>

      <button
        type="button"
        disabled={isQuizzing}
        onClick={() => {
          playSound.click();
          onQuiz();
        }}
        style={{
          flex: 1,
          fontFamily: "var(--mono, monospace)",
          fontSize: "9.5px",
          fontWeight: 700,
          letterSpacing: "0.11em",
          background: isQuizzing ? "#FCE94F" : isInk ? "#1A1D26" : "#FFFFFF",
          color: isQuizzing ? "#0A0A0A" : isInk ? "#F0EDE4" : "#0A0A0A",
          border: "none",
          borderRight: isInk ? "1.5px solid rgba(255,255,255,0.12)" : "2px solid #0A0A0A",
          padding: "11px 8px",
          cursor: isQuizzing ? "wait" : "pointer",
          minWidth: "100px",
          whiteSpace: "nowrap",
          transition: "background 0.12s ease, color 0.12s ease",
        }}
        onMouseEnter={(e) => {
          if (!isQuizzing) {
            e.currentTarget.style.background = isInk ? "#2A303F" : "#FCE94F";
            e.currentTarget.style.color = isInk ? "#FFFFFF" : "#0A0A0A";
          }
        }}
        onMouseLeave={(e) => {
          if (!isQuizzing) {
            e.currentTarget.style.background = isInk ? "#1A1D26" : "#FFFFFF";
            e.currentTarget.style.color = isInk ? "#F0EDE4" : "#0A0A0A";
          }
        }}
      >
        {isQuizzing ? "GENERATING QUIZ…" : "QUIZ ME"}
      </button>

      <button
        type="button"
        disabled={isExplaining}
        onClick={() => {
          playSound.click();
          onExplain();
        }}
        style={{
          flex: 1,
          fontFamily: "var(--mono, monospace)",
          fontSize: "9.5px",
          fontWeight: 700,
          letterSpacing: "0.11em",
          background: isExplaining ? "#FCE94F" : isInk ? "#1A1D26" : "#FFFFFF",
          color: isExplaining ? "#0A0A0A" : isInk ? "#F0EDE4" : "#0A0A0A",
          border: "none",
          borderRight: isInk ? "1.5px solid rgba(255,255,255,0.12)" : "2px solid #0A0A0A",
          padding: "11px 8px",
          cursor: isExplaining ? "wait" : "pointer",
          minWidth: "120px",
          whiteSpace: "nowrap",
          transition: "background 0.12s ease, color 0.12s ease",
        }}
        onMouseEnter={(e) => {
          if (!isExplaining) {
            e.currentTarget.style.background = isInk ? "#2A303F" : "#FCE94F";
            e.currentTarget.style.color = isInk ? "#FFFFFF" : "#0A0A0A";
          }
        }}
        onMouseLeave={(e) => {
          if (!isExplaining) {
            e.currentTarget.style.background = isInk ? "#1A1D26" : "#FFFFFF";
            e.currentTarget.style.color = isInk ? "#F0EDE4" : "#0A0A0A";
          }
        }}
      >
        {isExplaining ? "EXPLAINING…" : "EXPLAIN AGAIN"}
      </button>

      <button
        type="button"
        disabled={isAnalyzingGaps}
        onClick={() => {
          playSound.click();
          onGaps();
        }}
        style={{
          flex: 1,
          fontFamily: "var(--mono, monospace)",
          fontSize: "9.5px",
          fontWeight: 700,
          letterSpacing: "0.11em",
          background: isAnalyzingGaps ? "#FCE94F" : isInk ? "#1A1D26" : "#FFFFFF",
          color: isAnalyzingGaps ? "#0A0A0A" : isInk ? "#F0EDE4" : "#0A0A0A",
          border: "none",
          padding: "11px 8px",
          cursor: isAnalyzingGaps ? "wait" : "pointer",
          minWidth: "130px",
          whiteSpace: "nowrap",
          transition: "background 0.12s ease, color 0.12s ease",
        }}
        onMouseEnter={(e) => {
          if (!isAnalyzingGaps) {
            e.currentTarget.style.background = isInk ? "#2A303F" : "#FCE94F";
            e.currentTarget.style.color = isInk ? "#FFFFFF" : "#0A0A0A";
          }
        }}
        onMouseLeave={(e) => {
          if (!isAnalyzingGaps) {
            e.currentTarget.style.background = isInk ? "#1A1D26" : "#FFFFFF";
            e.currentTarget.style.color = isInk ? "#F0EDE4" : "#0A0A0A";
          }
        }}
      >
        {isAnalyzingGaps ? "CHECKING…" : "WHAT DID I MISS?"}
      </button>
    </div>
  );
};
