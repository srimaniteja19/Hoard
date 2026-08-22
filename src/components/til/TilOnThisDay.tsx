"use client";

import React, { useState } from "react";
import { TilItem } from "@/components/til/TilFeedItem";
import { MarkdownLite } from "@/components/til/MarkdownLite";
import { Clock, CheckCircle2, RotateCcw, Sparkles } from "lucide-react";

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
        background: "color-mix(in srgb, var(--yel) 6%, var(--paper))",
        border: "var(--bd)",
        boxShadow: "var(--sh-sm)",
        padding: "14px 16px",
        marginBottom: "20px",
        borderLeft: "6px solid var(--yel)",
        position: "relative",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "10px",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <span
          style={{
            fontFamily: "var(--mono)",
            fontSize: "11px",
            fontWeight: 900,
            background: "var(--yel)",
            color: "#000",
            border: "1px solid var(--ink)",
            padding: "2px 7px",
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            boxShadow: "1px 1px 0 var(--ink)",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          <Clock size={12} /> ON THIS DAY ({daysAgo} DAYS AGO)
        </span>
        <a
          href={`#til-${entry.shortHash}`}
          style={{
            fontFamily: "var(--mono)",
            fontSize: "11px",
            fontWeight: 800,
            color: "var(--ink)",
            textDecoration: "none",
            opacity: 0.8,
          }}
        >
          #{entry.shortHash}
        </a>
      </div>

      <div
        style={{
          fontSize: "14px",
          lineHeight: "1.55",
          color: "var(--ink)",
          marginBottom: "12px",
        }}
      >
        <MarkdownLite content={entry.body || ""} />
      </div>

      {/* "Still True?" Reflection Prompt */}
      <div
        style={{
          borderTop: "1.5px dashed var(--ink)",
          paddingTop: "10px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <span
          style={{
            fontFamily: "var(--mono)",
            fontSize: "11px",
            fontWeight: 900,
            color: "var(--ink)",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <Sparkles size={12} color="var(--pink)" /> STILL TRUE?
        </span>

        {answered ? (
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: "11px",
              fontWeight: 900,
              color: answered === "yes" ? "var(--lime)" : "var(--orange)",
              background: "var(--ink)",
              padding: "3px 10px",
              boxShadow: "1px 1px 0 var(--ink)",
            }}
          >
            {answered === "yes" ? "✓ CONFIRMED STILL TRUE" : "REFLECTION RECORDED"}
          </div>
        ) : (
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              type="button"
              onClick={() => setAnswered("yes")}
              style={{
                fontFamily: "var(--mono)",
                fontSize: "10px",
                fontWeight: 900,
                background: "var(--lime)",
                color: "#000",
                border: "1px solid var(--ink)",
                padding: "3px 10px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                boxShadow: "1.5px 1.5px 0 var(--ink)",
              }}
            >
              <CheckCircle2 size={12} /> Still True
            </button>
            <button
              type="button"
              onClick={() => setAnswered("evolved")}
              style={{
                fontFamily: "var(--mono)",
                fontSize: "10px",
                fontWeight: 900,
                background: "var(--orange)",
                color: "#000",
                border: "1px solid var(--ink)",
                padding: "3px 10px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                boxShadow: "1.5px 1.5px 0 var(--ink)",
              }}
            >
              <RotateCcw size={12} /> Evolved / Changed
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
