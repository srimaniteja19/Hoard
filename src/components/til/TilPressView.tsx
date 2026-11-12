"use client";

import React, { useState, useMemo } from "react";
import { TilItem } from "./TilFeedItem";
import { MarkdownLite } from "./MarkdownLite";
import {
  Printer,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Newspaper,
  Columns2,
  List,
} from "lucide-react";

interface TilPressViewProps {
  month: string; // YYYY-MM
  entries: TilItem[];
  entryCount: number;
  topicCount: number;
  issueNumber: number;
  includeSuperseded: boolean;
  onMonthChange: (newMonth: string) => void;
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
  const [copiedMd, setCopiedMd] = useState(false);
  const [layoutMode, setLayoutMode] = useState<"chronicle" | "columns">("chronicle");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const shiftMonth = (delta: number) => {
    const [y, m] = month.split("-").map(Number);
    if (!y || !m) return;
    const date = new Date(y, m - 1 + delta, 1);
    const nextY = date.getFullYear();
    const nextM = String(date.getMonth() + 1).padStart(2, "0");
    setSelectedDay(null);
    onMonthChange(`${nextY}-${nextM}`);
  };

  const formatMonthLabel = (mStr: string) => {
    const [y, m] = mStr.split("-").map(Number);
    if (!y || !m) return mStr;
    const d = new Date(y, m - 1, 1);
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" }).toUpperCase();
  };

  const formatDayHeader = (dateStr: string) => {
    const parts = dateStr.split("-").map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return dateStr;
    const [y, m, d] = parts;
    const dateObj = new Date(y, m - 1, d);
    return dateObj
      .toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
      .toUpperCase();
  };

  // Group entries by Day & Date (YYYY-MM-DD)
  const daySections = useMemo(() => {
    const map = new Map<string, TilItem[]>();
    for (const item of entries) {
      const key = item.loggedFor || "Undated";
      const list = map.get(key) || [];
      list.push(item);
      map.set(key, list);
    }
    return Array.from(map.entries())
      .map(([dateKey, items]) => ({
        dateKey,
        label: formatDayHeader(dateKey),
        items,
      }))
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  }, [entries]);

  const visibleDaySections = useMemo(() => {
    if (!selectedDay) return daySections;
    return daySections.filter((s) => s.dateKey === selectedDay);
  }, [daySections, selectedDay]);

  const generateMarkdownDigest = () => {
    const lines: string[] = [];
    lines.push(`# HOARD TIL GAZETTE — ISSUE #${String(issueNumber).padStart(3, "0")}`);
    lines.push(`**${formatMonthLabel(month)}** · ${entryCount} Insights across ${topicCount} Topics`);
    lines.push("");
    lines.push("---");
    lines.push("");

    daySections.forEach((sec) => {
      lines.push(`## ${sec.label} (${sec.dateKey})`);
      lines.push("");
      sec.items.forEach((e, idx) => {
        const num = String(idx + 1).padStart(2, "0");
        const tagsStr = e.tags && e.tags.length > 0 ? e.tags.map((t) => `#${t}`).join(" ") : "";
        lines.push(`### ${num}. [${e.type}] #${e.shortHash}`);
        if (e.body) lines.push(e.body);
        if (e.code) {
          lines.push(`\`\`\`${e.codeLang || ""}`);
          lines.push(e.code);
          lines.push("```");
        }
        if (tagsStr) lines.push(`*Topics: ${tagsStr}*`);
        lines.push("");
      });
    });

    return lines.join("\n");
  };

  const handleCopyMarkdown = async () => {
    try {
      const md = generateMarkdownDigest();
      await navigator.clipboard.writeText(md);
      setCopiedMd(true);
      setTimeout(() => setCopiedMd(false), 2000);
    } catch (e) {
      console.error("Failed to copy markdown", e);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="til-press-container">
      {/* ─── Control Toolbar (Hidden on Print) ─────────────────────────── */}
      <div className="til-press-toolbar no-print">
        <div className="til-press-month-picker">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="til-press-arrow-btn"
            title="Previous Month"
          >
            <ChevronLeft size={15} strokeWidth={2.5} />
          </button>

          <div className="til-press-month-badge">
            <Calendar size={13} />
            <span>{formatMonthLabel(month)}</span>
          </div>

          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="til-press-arrow-btn"
            title="Next Month"
          >
            <ChevronRight size={15} strokeWidth={2.5} />
          </button>
        </div>

        <div className="til-press-actions">
          <div className="til-view-density-toggle" role="group" aria-label="Press layout mode">
            <button
              type="button"
              className={`til-density-btn ${layoutMode === "chronicle" ? "on" : ""}`}
              onClick={() => setLayoutMode("chronicle")}
            >
              <List size={12} />
              <span>BY DAY & DATE</span>
            </button>
            <button
              type="button"
              className={`til-density-btn ${layoutMode === "columns" ? "on" : ""}`}
              onClick={() => setLayoutMode("columns")}
            >
              <Columns2 size={12} />
              <span>2-COL GAZETTE</span>
            </button>
          </div>

          <label className="til-press-superseded-toggle">
            <input
              type="checkbox"
              checked={includeSuperseded}
              onChange={(e) => onToggleSuperseded(e.target.checked)}
              className="til-press-checkbox"
            />
            <span>INCLUDE SUPERSEDED</span>
          </label>

          <button
            type="button"
            onClick={handleCopyMarkdown}
            className={`til-press-btn ${copiedMd ? "copied" : "copy"}`}
          >
            {copiedMd ? <Check size={13} /> : <Copy size={13} />}
            <span>{copiedMd ? "COPIED MD" : "COPY MARKDOWN"}</span>
          </button>

          <button type="button" onClick={handlePrint} className="til-press-btn print">
            <Printer size={13} />
            <span>PRINT ISSUE</span>
          </button>
        </div>
      </div>

      {/* ─── Printable Broadsheet Zine Sheet ───────────────────────────── */}
      <article className="til-press-zine">
        {/* Broadsheet Masthead (Heading FIRST per craft-floor) */}
        <header className="til-press-masthead">
          <div className="til-press-title-row">
            <h2 className="til-press-title">HOARD TIL GAZETTE</h2>
            <span className="til-press-serial">
              ISSUE NO. {String(issueNumber).padStart(3, "0")}
            </span>
          </div>

          <div className="til-press-masthead-meta">
            <span className="til-press-stamp">
              <Newspaper size={12} /> MONTHLY KNOWLEDGE DIGEST ·{" "}
              <b>{formatMonthLabel(month)} EDITION</b>
            </span>
            <span className="meta-right">
              <span>
                <b>{entryCount}</b> {entryCount === 1 ? "INSIGHT" : "INSIGHTS"}
              </span>
              <span className="meta-sep">•</span>
              <span>
                <b>{daySections.length}</b> {daySections.length === 1 ? "DAY" : "DAYS"}
              </span>
              <span className="meta-sep">•</span>
              <span>
                <b>{topicCount}</b> {topicCount === 1 ? "TOPIC" : "TOPICS"}
              </span>
            </span>
          </div>

          {/* Day Filter Strip within the Month */}
          {daySections.length > 1 && (
            <div className="til-press-date-bar no-print">
              <span className="til-codex-date-pills__lbl">JUMP TO DATE:</span>
              <button
                type="button"
                className={`til-codex-date-pill ${selectedDay === null ? "on" : ""}`}
                onClick={() => setSelectedDay(null)}
              >
                ALL DAYS ({entries.length})
              </button>
              {daySections.map((sec) => (
                <button
                  key={sec.dateKey}
                  type="button"
                  className={`til-codex-date-pill ${selectedDay === sec.dateKey ? "on" : ""}`}
                  onClick={() =>
                    setSelectedDay(selectedDay === sec.dateKey ? null : sec.dateKey)
                  }
                >
                  {sec.dateKey.slice(5)} ({sec.items.length})
                </button>
              ))}
            </div>
          )}
        </header>

        {/* Zine Content */}
        {entries.length === 0 ? (
          <div className="til-press-empty-state">
            <p>NO INSIGHTS RECORDED IN {formatMonthLabel(month)}.</p>
            <span className="empty-sub">
              Use the month arrows above to browse earlier issues in your archive.
            </span>
          </div>
        ) : layoutMode === "chronicle" ? (
          <div className="til-press-day-sections">
            {visibleDaySections.map((sec) => (
              <section key={sec.dateKey} className="til-press-day-group">
                <div className="til-press-day-banner">
                  <span className="til-press-day-banner__date">{sec.label}</span>
                  <span className="til-press-day-banner__meta">
                    {sec.dateKey} · {sec.items.length}{" "}
                    {sec.items.length === 1 ? "DISPATCH" : "DISPATCHES"}
                  </span>
                </div>

                <div className="til-press-day-items">
                  {sec.items.map((item, idx) => {
                    const num = String(idx + 1).padStart(2, "0");
                    const isSuperseded = Boolean(item.supersededById);

                    return (
                      <div
                        key={item.id}
                        className={`til-press-item ${isSuperseded ? "superseded" : ""}`}
                      >
                        <div className="til-press-item-header">
                          <span className="press-num">{num}.</span>
                          <span className={`til-index-row__type type--${item.type.toLowerCase()}`}>
                            {item.type}
                          </span>
                          <span className="press-hash">#{item.shortHash}</span>
                          {isSuperseded && (
                            <span className="press-superseded-tag">SUPERSEDED</span>
                          )}
                        </div>

                        {item.body && (
                          <div className="press-body-text">
                            <MarkdownLite content={item.body} validHashes={validHashes} />
                          </div>
                        )}

                        {item.code && (
                          <div className="press-code-box">
                            <pre>
                              <code>{item.code}</code>
                            </pre>
                          </div>
                        )}

                        {item.tags && item.tags.length > 0 && (
                          <div className="press-tags-row">
                            {item.tags.map((t) => (
                              <span key={t} className="press-tag">
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="til-press-columns">
            {entries.map((item, idx) => {
              const num = String(idx + 1).padStart(2, "0");
              const isSuperseded = Boolean(item.supersededById);

              return (
                <div
                  key={item.id}
                  className={`til-press-item ${isSuperseded ? "superseded" : ""}`}
                >
                  <div className="til-press-item-header">
                    <span className="press-num">{num}.</span>
                    <span className={`til-index-row__type type--${item.type.toLowerCase()}`}>
                      {item.type}
                    </span>
                    <span className="press-date">{item.loggedFor}</span>
                    <span className="press-hash">#{item.shortHash}</span>
                    {isSuperseded && (
                      <span className="press-superseded-tag">SUPERSEDED</span>
                    )}
                  </div>

                  {item.body && (
                    <div className="press-body-text">
                      <MarkdownLite content={item.body} validHashes={validHashes} />
                    </div>
                  )}

                  {item.code && (
                    <div className="press-code-box">
                      <pre>
                        <code>{item.code}</code>
                      </pre>
                    </div>
                  )}

                  {item.tags && item.tags.length > 0 && (
                    <div className="press-tags-row">
                      {item.tags.map((t) => (
                        <span key={t} className="press-tag">
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

        {/* Zine Footer */}
        <footer className="til-press-zine-footer">
          <span>PRINTED BY HOARD KNOWLEDGE PRESS</span>
          <span className="meta-sep">•</span>
          <span>ISSUE #{String(issueNumber).padStart(3, "0")}</span>
          <span className="meta-sep">•</span>
          <span>END OF DISPATCH</span>
        </footer>
      </article>
    </div>
  );
};
