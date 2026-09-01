"use client";

import React from "react";
import { playSound } from "@/lib/sound";

interface AiBarProps {
  accentColor?: string;
  accentFg?: string;
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
  onTidy,
  onQuiz,
  onExplain,
  onGaps,
  isTidying = false,
  isQuizzing = false,
  isExplaining = false,
  isAnalyzingGaps = false,
}) => {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        border: "3px solid #0A0A0A",
        boxShadow: `5px 5px 0 ${accentColor}`,
        margin: "20px 0 30px",
        overflow: "hidden",
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
          borderRight: "2px solid #0A0A0A",
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
          background: isTidying ? "#FCE94F" : "#FFFFFF",
          color: "#0A0A0A",
          border: "none",
          borderRight: "2px solid #0A0A0A",
          padding: "11px 8px",
          cursor: isTidying ? "wait" : "pointer",
          minWidth: "120px",
          whiteSpace: "nowrap",
          transition: "background 0.12s ease",
        }}
        onMouseEnter={(e) => {
          if (!isTidying) e.currentTarget.style.background = "#FCE94F";
        }}
        onMouseLeave={(e) => {
          if (!isTidying) e.currentTarget.style.background = "#FFFFFF";
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
          background: isQuizzing ? "#FCE94F" : "#FFFFFF",
          color: "#0A0A0A",
          border: "none",
          borderRight: "2px solid #0A0A0A",
          padding: "11px 8px",
          cursor: isQuizzing ? "wait" : "pointer",
          minWidth: "100px",
          whiteSpace: "nowrap",
          transition: "background 0.12s ease",
        }}
        onMouseEnter={(e) => {
          if (!isQuizzing) e.currentTarget.style.background = "#FCE94F";
        }}
        onMouseLeave={(e) => {
          if (!isQuizzing) e.currentTarget.style.background = "#FFFFFF";
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
          background: isExplaining ? "#FCE94F" : "#FFFFFF",
          color: "#0A0A0A",
          border: "none",
          borderRight: "2px solid #0A0A0A",
          padding: "11px 8px",
          cursor: isExplaining ? "wait" : "pointer",
          minWidth: "120px",
          whiteSpace: "nowrap",
          transition: "background 0.12s ease",
        }}
        onMouseEnter={(e) => {
          if (!isExplaining) e.currentTarget.style.background = "#FCE94F";
        }}
        onMouseLeave={(e) => {
          if (!isExplaining) e.currentTarget.style.background = "#FFFFFF";
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
          background: isAnalyzingGaps ? "#FCE94F" : "#FFFFFF",
          color: "#0A0A0A",
          border: "none",
          padding: "11px 8px",
          cursor: isAnalyzingGaps ? "wait" : "pointer",
          minWidth: "130px",
          whiteSpace: "nowrap",
          transition: "background 0.12s ease",
        }}
        onMouseEnter={(e) => {
          if (!isAnalyzingGaps) e.currentTarget.style.background = "#FCE94F";
        }}
        onMouseLeave={(e) => {
          if (!isAnalyzingGaps) e.currentTarget.style.background = "#FFFFFF";
        }}
      >
        {isAnalyzingGaps ? "CHECKING…" : "WHAT DID I MISS?"}
      </button>
    </div>
  );
};
