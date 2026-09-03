"use client";

import React, { useState } from "react";
import { GAPS, RULES } from "@/lib/todos/counterData";
import { playSound } from "@/lib/sound";
import { Droplet, Check, Sparkles } from "lucide-react";

export const CounterGapsRules: React.FC = () => {
  const [glasses, setGlasses] = useState<number>(4);

  const toggleGlass = (index: number) => {
    playSound.pop();
    setGlasses((prev) => (prev === index + 1 ? index : index + 1));
  };

  const waterTotalLiters = (glasses * 0.35).toFixed(1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* ── FILL THE GAPS BOX ── */}
      <div
        style={{
          background: "#FFFFFF",
          border: "3px solid #111111",
          boxShadow: "6px 6px 0 #111111",
          padding: "20px 24px",
        }}
      >
        <div
          style={{
            fontFamily: "var(--mono, monospace)",
            fontWeight: 800,
            fontSize: "12px",
            letterSpacing: "0.06em",
            background: "#3D8361",
            color: "#F4F0EA",
            display: "inline-block",
            padding: "4px 12px",
            border: "2.5px solid #111111",
            marginBottom: "16px",
          }}
        >
          FILL THE GAPS
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "18px",
            marginBottom: "20px",
          }}
        >
          {GAPS.map((g) => (
            <div
              key={g.title}
              style={{
                borderLeft: "4px solid #111111",
                paddingLeft: "12px",
              }}
            >
              <div style={{ fontWeight: 800, fontSize: "15px", marginBottom: "4px" }}>
                {g.title}
              </div>
              <div
                style={{
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "12px",
                  lineHeight: "1.6",
                  color: "#333",
                }}
              >
                {g.detail}
              </div>
            </div>
          ))}
        </div>

        {/* ── INTERACTIVE WATER INTAKE TRACKER ── */}
        <div
          style={{
            borderTop: "2.5px dashed #111111",
            paddingTop: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontFamily: "var(--mono, monospace)",
              fontSize: "11px",
              fontWeight: 800,
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <Droplet size={14} color="#00B4D8" />
              <span>DAILY WATER TRACKER: {glasses}/8 GLASSES (~{waterTotalLiters}L / 2.8L TARGET)</span>
            </span>
            <span style={{ color: glasses >= 8 ? "#3D8361" : "#666" }}>
              {glasses >= 8 ? "GOAL REACHED! 🎉" : `${8 - glasses} glasses remaining`}
            </span>
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {[...Array(8)].map((_, i) => {
              const isFilled = i < glasses;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleGlass(i)}
                  title={`Glass ${i + 1} (~350ml)`}
                  style={{
                    flex: "1 1 32px",
                    maxWidth: "50px",
                    height: "42px",
                    border: "2px solid #111111",
                    background: isFilled ? "#00B4D8" : "#FFFFFF",
                    color: isFilled ? "#FFFFFF" : "#111111",
                    cursor: "pointer",
                    display: "grid",
                    placeItems: "center",
                    boxShadow: isFilled ? "2px 2px 0 #111111" : "none",
                    transform: isFilled ? "translate(-1px, -1px)" : "none",
                    transition: "all 0.1s ease",
                  }}
                >
                  <Droplet size={16} fill={isFilled ? "#FFFFFF" : "none"} />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── CORE RULES LIST ── */}
      <div>
        <div
          style={{
            fontFamily: "var(--mono, monospace)",
            fontWeight: 800,
            fontSize: "13px",
            letterSpacing: "0.08em",
            marginBottom: "14px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <Sparkles size={14} color="#FF6B35" />
          <span>THE 5 GOLDEN KITCHEN RULES</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {RULES.map((r, i) => (
            <div
              key={r.title}
              style={{
                border: "3px solid #111111",
                background: "#FFFFFF",
                boxShadow: "5px 5px 0 #111111",
                padding: "16px 18px",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--mono, monospace)",
                  fontWeight: 800,
                  fontSize: "11px",
                  background: "#FFE600",
                  display: "inline-block",
                  padding: "3px 9px",
                  border: "2px solid #111111",
                  marginBottom: "8px",
                }}
              >
                RULE {i + 1}
              </div>
              <h4 style={{ margin: "0 0 6px", fontSize: "16px", fontWeight: 800 }}>
                {r.title}
              </h4>
              <p style={{ margin: 0, fontSize: "14px", lineHeight: "1.55", color: "#333" }}>
                {r.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
