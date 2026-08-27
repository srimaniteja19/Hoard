"use client";

import React, { useState } from "react";
import { TilItem } from "@/components/til/TilFeedItem";
import { MarkdownLite } from "@/components/til/MarkdownLite";
import { generatePressMarkdown } from "@/lib/til/pressMarkdown";
import { Printer, Copy, Check, ChevronLeft, ChevronRight, Newspaper, Calendar, Sparkles, Filter } from "lucide-react";

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
    <div className="til-press-container">
      {/* Control Bar (Hidden on Print) */}
      <div className="til-press-toolbar no-print">
        {/* Left: Month Navigator Picker */}
        <div className="til-press-month-picker">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="til-press-arrow-btn"
            title="Previous Month"
            aria-label="Previous month"
          >
            <ChevronLeft size={15} />
          </button>

          <div className="til-press-month-badge">
            <Calendar size={13} className="til-press-cal-icon" />
            <span>{formatMonthLabel(month)}</span>
          </div>

          <button
            type="button"
            onClick={handleNextMonth}
            className="til-press-arrow-btn"
            title="Next Month"
            aria-label="Next month"
          >
            <ChevronRight size={15} />
          </button>
        </div>

        {/* Center: Toggle Superseded Entries */}
        <label className="til-press-superseded-toggle">
          <input
            type="checkbox"
            checked={includeSuperseded}
            onChange={(e) => onToggleSuperseded(e.target.checked)}
            className="til-press-checkbox"
          />
          <span>INCLUDE SUPERSEDED ENTRIES</span>
        </label>

        {/* Right: Actions (COPY MARKDOWN & PRINT) */}
        <div className="til-press-actions">
          <button
            type="button"
            onClick={handleCopyMarkdown}
            className={`til-press-btn ${copied ? "copied" : "copy"}`}
          >
            {copied ? <Check size={13} strokeWidth={2.5} /> : <Copy size={13} />}
            <span>{copied ? "COPIED MARKDOWN!" : "COPY MARKDOWN"}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="til-press-btn print"
          >
            <Printer size={13} />
            <span>PRINT ZINE</span>
            <span className="kbd-hint">⌘P</span>
          </button>
        </div>
      </div>

      {/* Printable Zine Paper Container */}
      <div className="til-press-zine">
        {/* Zine Masthead Header */}
        <header className="til-press-masthead">
          <div className="til-press-masthead-top">
            <div className="til-press-stamp">
              <Newspaper size={14} />
              <span>HOARD PUBLISHING DESK · MONTHLY ROUNDUP</span>
            </div>
            <div className="til-press-serial">
              ISSUE #{issueNumber} · VOL. {month.split("-")[0]}
            </div>
          </div>

          <h1 className="til-press-title">HOARD TIL GAZETTE</h1>

          <div className="til-press-masthead-meta">
            <div className="meta-left">
              <span>EDITION: <b>{formatMonthLabel(month)}</b></span>
            </div>
            <div className="meta-right">
              <span><b>{entryCount}</b> ENTRIES FILED</span>
              <span className="meta-sep">•</span>
              <span><b>{topicCount}</b> TOPICS COVERED</span>
            </div>
          </div>
        </header>

        {/* Zine Two-Column Body Layout */}
        {entries.length === 0 ? (
          <div className="til-press-empty-state">
            <p>NO TIL ENTRIES RECORDED FOR {formatMonthLabel(month)}.</p>
            <span className="empty-sub">Switch months or log new entries in the Stream view.</span>
          </div>
        ) : (
          <div className="til-press-columns">
            {entries.map((item, index) => {
              const num = index + 1;
              const dateStr = item.loggedFor || item.createdAt.split("T")[0];

              return (
                <article
                  key={item.id}
                  className={`til-press-item ${item.supersededById ? "superseded" : ""}`}
                >
                  {/* Hanging Numeral Header */}
                  <div className="til-press-item-header">
                    <span className="press-num">{num}.</span>

                    <span className={`press-type-pill type-${item.type.toLowerCase()}`}>
                      {item.type}
                    </span>

                    <span className="press-date">{dateStr}</span>
                    <span className="press-hash">#{item.shortHash}</span>

                    {item.supersededById && (
                      <span className="press-superseded-tag">SUPERSEDED</span>
                    )}
                  </div>

                  {/* Body Text */}
                  {item.body && (
                    <div className="press-body-text">
                      <MarkdownLite content={item.body} validHashes={validHashes} />
                    </div>
                  )}

                  {/* Code Snippet Box */}
                  {item.code && (
                    <div className="press-code-box">
                      <pre>{item.code}</pre>
                    </div>
                  )}

                  {/* Tags */}
                  {item.tags && item.tags.length > 0 && (
                    <div className="press-tags-row">
                      {item.tags.map((t) => (
                        <span key={t} className="press-tag">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        <footer className="til-press-zine-footer">
          <span>END OF {formatMonthLabel(month)} COMPILATION · PUBLISHED BY HOARD TIL ENGINE</span>
        </footer>
      </div>
    </div>
  );
};

