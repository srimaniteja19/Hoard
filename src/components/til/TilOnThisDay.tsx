"use client";

import React, { useState } from "react";
import { TilItem } from "@/components/til/TilFeedItem";
import { MarkdownLite } from "@/components/til/MarkdownLite";
import { Clock, CheckCircle2, RotateCcw } from "lucide-react";

interface TilOnThisDayProps {
  data: {
    entry: TilItem;
    daysAgo: number;
  } | null;
}

export const TilOnThisDay: React.FC<TilOnThisDayProps> = ({ data }) => {
  const [answered, setAnswered] = useState<string | null>(null);

  if (!data || !data.entry) return null;

  const { entry, daysAgo } = data;

  return (
    <div
      style={{
        background: "var(--paper)",
        border: "var(--bd)",
        boxShadow: "var(--sh-sm)",
        padding: "14px 16px",
        marginBottom: "20px",
        borderLeft: "6px solid #FFE600",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
        <span
          style={{
            fontFamily: "var(--mono)",
            fontSize: "11px",
            fontWeight: 900,
            background: "#FFE600",
            color: "#000",
            border: "1px solid var(--ink)",
            padding: "2px 6px",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <Clock size={12} /> ON THIS DAY ({daysAgo} DAYS AGO)
        </span>
        <span style={{ fontFamily: "var(--mono)", fontSize: "10px", opacity: 0.7 }}>
          #{entry.shortHash}
        </span>
      </div>

      <div style={{ fontSize: "14px", lineHeight: "1.5", color: "var(--ink)", marginBottom: "10px" }}>
        <MarkdownLite content={entry.body || ""} />
      </div>

      {/* "Still True?" Reflection Prompt */}
      <div
        style={{
          borderTop: "1px dashed var(--ink)",
          paddingTop: "8px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <span style={{ fontFamily: "var(--mono)", fontSize: "11px", fontWeight: 800, color: "var(--ink)" }}>
          STILL TRUE?
        </span>

        {answered ? (
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: "11px",
              fontWeight: 800,
              color: answered === "yes" ? "#B6FF3C" : "#FF007A",
              background: "#000",
              padding: "2px 8px",
            }}
          >
            {answered === "yes" ? "✓ CONFIRMED STILL TRUE" : "REFLECTION RECORDED"}
          </div>
        ) : (
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              onClick={() => setAnswered("yes")}
              style={{
                fontFamily: "var(--mono)",
                fontSize: "10px",
                fontWeight: 900,
                background: "#B6FF3C",
                color: "#000",
                border: "1px solid var(--ink)",
                padding: "3px 8px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <CheckCircle2 size={12} /> Still True
            </button>
            <button
              onClick={() => setAnswered("evolved")}
              style={{
                fontFamily: "var(--mono)",
                fontSize: "10px",
                fontWeight: 900,
                background: "#FF9100",
                color: "#000",
                border: "1px solid var(--ink)",
                padding: "3px 8px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <RotateCcw size={12} /> Evolved / Updated
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
