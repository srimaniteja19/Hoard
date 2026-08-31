"use client";

import React from "react";
import { playSound } from "@/lib/sound";

interface AiBarProps {
  accentColor?: string;
  accentFg?: string;
  onTidy: () => void;
  onQuiz: () => void;
  onExplain: () => void;
  onCollisions: () => void;
  onGaps: () => void;
  isTidying?: boolean;
}

export const AiBar: React.FC<AiBarProps> = ({
  accentColor = "#7B5CF0",
  accentFg = "#FFFFFF",
  onTidy,
  onQuiz,
  onExplain,
  onCollisions,
  onGaps,
  isTidying = false,
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
          padding: "0 13px",
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
          padding: "11px 6px",
          cursor: isTidying ? "wait" : "pointer",
          minWidth: "114px",
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
          background: "#FFFFFF",
          color: "#0A0A0A",
          border: "none",
          borderRight: "2px solid #0A0A0A",
          padding: "11px 6px",
          cursor: "pointer",
          minWidth: "90px",
          whiteSpace: "nowrap",
          transition: "background 0.12s ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#FCE94F")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "#FFFFFF")}
      >
        QUIZ ME
      </button>

      <button
        type="button"
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
          background: "#FFFFFF",
          color: "#0A0A0A",
          border: "none",
          borderRight: "2px solid #0A0A0A",
          padding: "11px 6px",
          cursor: "pointer",
          minWidth: "114px",
          whiteSpace: "nowrap",
          transition: "background 0.12s ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#FCE94F")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "#FFFFFF")}
      >
        EXPLAIN AGAIN
      </button>

      <button
        type="button"
        onClick={() => {
          playSound.click();
          onCollisions();
        }}
        style={{
          flex: 1,
          fontFamily: "var(--mono, monospace)",
          fontSize: "9.5px",
          fontWeight: 700,
          letterSpacing: "0.11em",
          background: "#FFFFFF",
          color: "#0A0A0A",
          border: "none",
          borderRight: "2px solid #0A0A0A",
          padding: "11px 6px",
          cursor: "pointer",
          minWidth: "114px",
          whiteSpace: "nowrap",
          transition: "background 0.12s ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#FCE94F")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "#FFFFFF")}
      >
        FIND COLLISIONS
      </button>

      <button
        type="button"
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
          background: "#FFFFFF",
          color: "#0A0A0A",
          border: "none",
          padding: "11px 6px",
          cursor: "pointer",
          minWidth: "124px",
          whiteSpace: "nowrap",
          transition: "background 0.12s ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#FCE94F")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "#FFFFFF")}
      >
        WHAT DID I MISS?
      </button>
    </div>
  );
};
