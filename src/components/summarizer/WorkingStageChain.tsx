"use client";

import React, { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";

export type WorkingStage =
  | "READ_WHOLE"
  | "FIND_ARGUMENT"
  | "RANK_MATTERS"
  | "CHOOSE_FIGURES"
  | "FLAG_CLAIMS"
  | "WRITE_DIGEST"
  | "DONE";

interface WorkingStageChainProps {
  currentStage: WorkingStage;
  logs: string[];
}

const STAGES: { id: WorkingStage; label: string; number: number }[] = [
  { id: "READ_WHOLE", label: "READ IT WHOLE", number: 1 },
  { id: "FIND_ARGUMENT", label: "FIND THE ARGUMENT", number: 2 },
  { id: "RANK_MATTERS", label: "RANK WHAT MATTERS", number: 3 },
  { id: "CHOOSE_FIGURES", label: "CHOOSE FIGURES", number: 4 },
  { id: "FLAG_CLAIMS", label: "FLAG THE CLAIMS", number: 5 },
  { id: "WRITE_DIGEST", label: "WRITE IT", number: 6 },
];

export const WorkingStageChain: React.FC<WorkingStageChainProps> = ({ currentStage, logs }) => {
  const currentIndex = STAGES.findIndex((s) => s.id === currentStage);

  return (
    <div
      style={{
        background: "#080808",
        border: "2px solid #222222",
        borderRadius: "4px",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        boxShadow: "4px 4px 0 #000000",
      }}
    >
      {/* ── 6-STAGE CHAIN STRIP ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gap: "8px",
        }}
      >
        {STAGES.map((s, idx) => {
          const isDone = currentStage === "DONE" || idx < currentIndex;
          const isActive = idx === currentIndex && currentStage !== "DONE";
          const isPending = idx > currentIndex && currentStage !== "DONE";

          return (
            <div
              key={s.id}
              style={{
                background: isActive ? "#181818" : isDone ? "#141414" : "#0E0E0E",
                border: `1.5px solid ${isActive ? "#FFE600" : isDone ? "#166534" : "#222222"}`,
                boxShadow: isActive ? "0 0 12px rgba(255, 230, 0, 0.2)" : "none",
                borderRadius: "3px",
                padding: "10px 8px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                gap: "4px",
                transition: "all 0.3s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                {isDone ? (
                  <span
                    style={{
                      width: "14px",
                      height: "14px",
                      borderRadius: "50%",
                      background: "#16A34A",
                      color: "#0A0A0A",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "9px",
                    }}
                  >
                    ✓
                  </span>
                ) : isActive ? (
                  <Loader2 size={12} className="animate-spin" color="#FFE600" />
                ) : (
                  <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "9px", color: "#555555" }}>
                    0{s.number}
                  </span>
                )}
              </div>

              <span
                style={{
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "9px",
                  fontWeight: 900,
                  color: isActive ? "#FFE600" : isDone ? "#4ADE80" : "#555555",
                  letterSpacing: "0.04em",
                }}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── REAL-TIME MONOSPACE LOG CONSOLE ── */}
      <div
        style={{
          background: "#030303",
          border: "1px solid #1A1A1A",
          borderRadius: "3px",
          padding: "12px 14px",
          fontFamily: "var(--mono, monospace)",
          fontSize: "11px",
          color: "#4ADE80",
          maxHeight: "140px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          boxShadow: "inset 0 2px 6px rgba(0,0,0,0.8)",
        }}
      >
        <div style={{ color: "#737373", fontSize: "10px", borderBottom: "1px solid #141414", paddingBottom: "4px", marginBottom: "2px" }}>
          ● LIVE COMPRESSION TELEMETRY LOG
        </div>
        {logs.map((log, i) => (
          <div key={i} style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
            <span style={{ color: "#FFE600", fontSize: "9px" }}>↳</span>
            <span style={{ color: i === logs.length - 1 ? "#FFFFFF" : "#86EFAC" }}>{log}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
