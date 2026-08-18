"use client";

import React, { useState } from "react";
import { TilItem } from "@/components/til/TilFeedItem";
import { MarkdownLite } from "@/components/til/MarkdownLite";
import { generatePressMarkdown } from "@/lib/til/pressMarkdown";
import { Printer, Copy, Check, ChevronLeft, ChevronRight } from "lucide-react";

interface TilPressViewProps {
  month: string; // "YYYY-MM"
  entries: TilItem[];
  entryCount: number;
  topicCount: number;
  issueNumber: number;
  includeSuperseded: boolean;
  onMonthChange: (month: string) => void;
  onToggleSuperseded: (include: boolean) => void;
  validHashes?: Set<string>;
}

export const TilPressView: React.FC<TilPressViewProps> = ({
  month,
  entries,
  entryCount,
  topicCount,
  issueNumber,
  includeSuperseded,
  onMonthChange,
  onToggleSuperseded,
  validHashes,
}) => {
  const [copied, setCopied] = useState(false);

  // Month navigation helpers
  const handlePrevMonth = () => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    const prevStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    onMonthChange(prevStr);
  };

  const handleNextMonth = () => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m, 1);
    const nextStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    onMonthChange(nextStr);
  };

  const formatMonthLabel = (monthStr: string) => {
    try {
      const [y, m] = monthStr.split("-").map(Number);
      const d = new Date(y, m - 1, 1);
      return d.toLocaleDateString("en-US", { month: "long", year: "numeric" }).toUpperCase();
    } catch {
      return monthStr;
    }
  };

  const handleCopyMarkdown = () => {
    const md = generatePressMarkdown(entries, formatMonthLabel(month));
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      {/* Control Bar (Hidden on Print) */}
      <div
        className="no-print"
        style={{
          background: "var(--paper)",
          border: "var(--bd)",
          boxShadow: "var(--sh)",
          padding: "14px 18px",
          marginBottom: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        {/* Left: Month Navigator Picker */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            onClick={handlePrevMonth}
            style={{
              background: "var(--paper)",
              border: "1.5px solid var(--ink)",
              padding: "8px 10px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              minHeight: "36px",
              minWidth: "36px",
            }}
            title="Previous Month"
          >
            <ChevronLeft size={14} />
          </button>

          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: "13px",
              fontWeight: 900,
              background: "var(--yel, #FFE600)",
              color: "#000",
              padding: "4px 10px",
              border: "1.5px solid var(--ink)",
              boxShadow: "2px 2px 0 var(--ink)",
              minWidth: "140px",
              textAlign: "center",
            }}
          >
            {formatMonthLabel(month)}
          </span>

          <button
            type="button"
            onClick={handleNextMonth}
            style={{
              background: "var(--paper)",
              border: "1.5px solid var(--ink)",
              padding: "8px 10px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              minHeight: "36px",
              minWidth: "36px",
            }}
            title="Next Month"
          >
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Center: Toggle Superseded Entries */}
        <label
          style={{
            fontFamily: "var(--mono)",
            fontSize: "11px",
            fontWeight: 800,
            color: "var(--ink)",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={includeSuperseded}
            onChange={(e) => onToggleSuperseded(e.target.checked)}
            style={{ cursor: "pointer", accentColor: "var(--accent, #00F0FF)" }}
          />
          include superseded entries
        </label>

        {/* Right: Actions (COPY MARKDOWN & PRINT) */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={handleCopyMarkdown}
            style={{
              fontFamily: "var(--mono)",
              fontSize: "11px",
              fontWeight: 900,
              background: copied ? "#B6FF3C" : "#00F0FF",
              color: "#000",
              border: "1.5px solid var(--ink)",
              padding: "6px 14px",
              cursor: "pointer",
              boxShadow: "2px 2px 0 var(--ink)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? "COPIED MARKDOWN!" : "COPY MARKDOWN"}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            style={{
              fontFamily: "var(--mono)",
              fontSize: "11px",
              fontWeight: 900,
              background: "var(--paper)",
              color: "var(--ink)",
              border: "1.5px solid var(--ink)",
              padding: "6px 14px",
              cursor: "pointer",
              boxShadow: "2px 2px 0 var(--ink)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Printer size={13} /> PRINT ZINE <span className="kbd-hint">(⌘P)</span>
          </button>
        </div>
      </div>

      {/* Printable Zine Paper Container */}
      <div
        className="til-press-zine"
        style={{
          background: "#FFFDF8",
          color: "#000",
          border: "2px solid var(--ink)",
          padding: "32px",
          boxShadow: "var(--sh)",
        }}
      >
        {/* Zine Masthead Header */}
        <div
          style={{
            borderBottom: "3px double var(--ink)",
            paddingBottom: "16px",
            marginBottom: "24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <div style={{ fontFamily: "var(--mono)", fontSize: "10px", fontWeight: 900, letterSpacing: "2px", opacity: 0.7 }}>
              HOARD PUBLISHING SURFACE • MONTHLY ROUNDUP
            </div>
            <h1 style={{ fontFamily: "var(--mono)", fontSize: "28px", fontWeight: 900, margin: "4px 0 0 0", lineHeight: 1 }}>
              HOARD TIL ZINE
            </h1>
          </div>

          <div style={{ textAlign: "right", fontFamily: "var(--mono)" }}>
            <div style={{ fontSize: "14px", fontWeight: 900 }}>
              ISSUE #{issueNumber} • {formatMonthLabel(month)}
            </div>
            <div style={{ fontSize: "11px", fontWeight: 800, opacity: 0.8, marginTop: "2px" }}>
              {entryCount} ENTRIES • {topicCount} TOPICS
            </div>
          </div>
        </div>

        {/* Zine Two-Column Body Layout */}
        {entries.length === 0 ? (
          <div style={{ padding: "48px 16px", textAlign: "center", fontFamily: "var(--mono)", fontSize: "12px", opacity: 0.6 }}>
            NO TIL ENTRIES RECORDED FOR {formatMonthLabel(month)}.
          </div>
        ) : (
          <div className="til-press-columns">
            {entries.map((item, index) => {
              const num = index + 1;
              const dateStr = item.loggedFor || item.createdAt.split("T")[0];

              return (
                <div
                  key={item.id}
                  style={{
                    breakInside: "avoid-column",
                    marginBottom: "24px",
                    paddingBottom: "16px",
                    borderBottom: "1px dashed rgba(0,0,0,0.2)",
                  }}
                >
                  {/* Hanging Numeral Header */}
                  <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginBottom: "6px" }}>
                    <span
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: "16px",
                        fontWeight: 900,
                        color: "var(--ink)",
                      }}
                    >
                      {num}.
                    </span>

                    <span
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: "9px",
                        fontWeight: 900,
                        background: item.type === "FACT" ? "#00F0FF" : item.type === "SNIPPET" ? "#FFE600" : "#B6FF3C",
                        color: "#000",
                        padding: "1px 5px",
                        border: "1px solid var(--ink)",
                      }}
                    >
                      {item.type}
                    </span>

                    <span style={{ fontFamily: "var(--mono)", fontSize: "10.5px", fontWeight: 800, opacity: 0.7 }}>
                      {dateStr}
                    </span>

                    <span style={{ fontFamily: "var(--mono)", fontSize: "10.5px", fontWeight: 800, opacity: 0.6 }}>
                      #{item.shortHash}
                    </span>

                    {item.supersededById && (
                      <span
                        style={{
                          fontFamily: "var(--mono)",
                          fontSize: "8.5px",
                          fontWeight: 900,
                          background: "#FF007A",
                          color: "#FFF",
                          padding: "1px 4px",
                          border: "1px solid var(--ink)",
                        }}
                      >
                        SUPERSEDED
                      </span>
                    )}
                  </div>

                  {/* Body Text */}
                  {item.body && (
                    <div
                      style={{
                        fontSize: "13px",
                        lineHeight: "1.5",
                        color: "#000",
                        marginBottom: "6px",
                        textDecoration: item.supersededById ? "line-through" : "none",
                      }}
                    >
                      <MarkdownLite content={item.body} validHashes={validHashes} />
                    </div>
                  )}

                  {/* Code Snippet Box */}
                  {item.code && (
                    <div
                      style={{
                        background: "#1E1E1E",
                        color: "#FFF",
                        fontFamily: "var(--mono)",
                        padding: "8px 10px",
                        fontSize: "11.5px",
                        border: "1px solid var(--ink)",
                        overflowX: "auto",
                        marginBottom: "6px",
                      }}
                    >
                      <pre style={{ margin: 0 }}>{item.code}</pre>
                    </div>
                  )}

                  {/* Tags */}
                  {item.tags && item.tags.length > 0 && (
                    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "4px" }}>
                      {item.tags.map((t) => (
                        <span key={t} style={{ fontFamily: "var(--mono)", fontSize: "10px", fontStyle: "italic", opacity: 0.8 }}>
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
