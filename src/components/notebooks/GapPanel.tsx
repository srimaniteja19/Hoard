"use client";

import React from "react";
import { playSound } from "@/lib/sound";

interface GapItem {
  timestamp: string;
  topic: string;
  weight?: "core" | "aside";
}

interface GapPanelProps {
  gaps: GapItem[];
  onAddStub: (timestamp: string, topic: string) => void;
}

export const GapPanel: React.FC<GapPanelProps> = ({ gaps, onAddStub }) => {
  if (!gaps || gaps.length === 0) return null;

  return (
    <div
      style={{
        border: "3px solid #0A0A0A",
        background: "#0A0A0A",
        color: "#F0EDE4",
        boxShadow: "7px 7px 0 #FF9E2C",
        marginTop: "40px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "12px",
          flexWrap: "wrap",
          fontFamily: "var(--mono, monospace)",
          fontSize: "9.5px",
          fontWeight: 700,
          letterSpacing: "0.18em",
          padding: "10px 15px",
          borderBottom: "2px solid rgba(240,237,228,0.28)",
          color: "#FF9E2C",
        }}
      >
        <span>⚠ COVERED IN THE LECTURE, NOT IN YOUR NOTES</span>
        <span>{gaps.length} · FROM THE TRANSCRIPT</span>
      </div>

      {gaps.map((g, idx) => (
        <div
          key={idx}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "11px 15px",
            borderBottom: idx < gaps.length - 1 ? "2px solid rgba(240,237,228,0.13)" : "none",
          }}
        >
          <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "10px", fontWeight: 700, opacity: 0.45, flex: "none" }}>
            {g.timestamp}
          </span>
          <span style={{ flex: 1, minWidth: 0, fontSize: "15.5px", lineHeight: "1.4" }}>
            {g.topic}
          </span>
          <button
            type="button"
            onClick={() => {
              playSound.pop();
              onAddStub(g.timestamp, g.topic);
            }}
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "9px",
              fontWeight: 700,
              letterSpacing: "0.11em",
              background: "transparent",
              border: "2px solid #F0EDE4",
              color: "#F0EDE4",
              padding: "5px 9px",
              cursor: "pointer",
              flex: "none",
              transition: "background 0.12s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#B8F04A";
              e.currentTarget.style.borderColor = "#B8F04A";
              e.currentTarget.style.color = "#0A0A0A";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "#F0EDE4";
              e.currentTarget.style.color = "#F0EDE4";
            }}
          >
            ADD A STUB
          </button>
        </div>
      ))}

      <div
        style={{
          padding: "10px 15px",
          borderTop: "2px solid rgba(240,237,228,0.28)",
          fontFamily: "var(--mono, monospace)",
          fontSize: "9.5px",
          lineHeight: "1.8",
          opacity: 0.55,
        }}
      >
        MATCHED AGAINST THE LESSON TRANSCRIPT YOU ATTACHED. THESE ARE THINGS SAID THAT YOUR PAGE NEVER MENTIONS — NOT NECESSARILY THINGS WORTH WRITING DOWN.
      </div>
    </div>
  );
};
