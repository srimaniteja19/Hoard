"use client";

import React, { useState, useEffect } from "react";
import { OmniGazetteIssue, exportOmniGazetteMarkdown } from "@/lib/gazette/omniGazette";

export type GazetteTheme = "broadsheet" | "wire" | "riso" | "quarterly" | "night";

interface HomeSundayGazetteModalProps {
  isOpen: boolean;
  onClose: () => void;
  issue: OmniGazetteIssue;
}

const SETIN: Record<GazetteTheme, string> = {
  broadsheet: "SET IN BODONI MODA & NEWSREADER",
  wire: "SET ENTIRELY IN SPACE MONO",
  riso: "SET IN BRICOLAGE GROTESQUE & SPACE GROTESK",
  quarterly: "SET IN INTER & IBM PLEX MONO",
  night: "SET IN BODONI MODA & NEWSREADER · NIGHT EDITION",
};

export const HomeSundayGazetteModal: React.FC<HomeSundayGazetteModalProps> = ({
  isOpen,
  onClose,
  issue,
}) => {
  const [theme, setTheme] = useState<GazetteTheme>("broadsheet");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("hoard_gazette_theme") as GazetteTheme | null;
    if (saved && (saved in SETIN)) {
      setTheme(saved);
    }
  }, []);

  const handleSelectTheme = (t: GazetteTheme) => {
    setTheme(t);
    localStorage.setItem("hoard_gazette_theme", t);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopyMarkdown = () => {
    const md = exportOmniGazetteMarkdown(issue);
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="gazette-popup-overlay"
      data-theme={theme}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="gazette-popup-wrap" onClick={(e) => e.stopPropagation()}>
        {/* Press Theme Switcher Bar */}
        <div className="gazette-picker no-print" id="gazette-theme-picker">
          <span>PRESS</span>
          <button
            type="button"
            data-t="broadsheet"
            aria-pressed={theme === "broadsheet"}
            onClick={() => handleSelectTheme("broadsheet")}
          >
            BROADSHEET
          </button>
          <button
            type="button"
            data-t="wire"
            aria-pressed={theme === "wire"}
            onClick={() => handleSelectTheme("wire")}
          >
            WIRE
          </button>
          <button
            type="button"
            data-t="riso"
            aria-pressed={theme === "riso"}
            onClick={() => handleSelectTheme("riso")}
          >
            RISO
          </button>
          <button
            type="button"
            data-t="quarterly"
            aria-pressed={theme === "quarterly"}
            onClick={() => handleSelectTheme("quarterly")}
          >
            QUARTERLY
          </button>
          <button
            type="button"
            data-t="night"
            aria-pressed={theme === "night"}
            onClick={() => handleSelectTheme("night")}
          >
            NIGHT
          </button>
        </div>

        {/* Action Controls Bar */}
        <div className="gazette-acts no-print">
          <button type="button" onClick={handleCopyMarkdown}>
            {copied ? "COPIED DIGEST!" : "COPY DIGEST"}
          </button>
          <button className="print" type="button" onClick={handlePrint}>
            PRINT ⌘P
          </button>
          <button type="button" onClick={onClose} aria-label="Close" title="Close (Esc)">
            ✕
          </button>
        </div>

        {/* Newspaper Sheet */}
        <div className="gazette-sheet">
          {/* Top Date Header */}
          <div className="gazette-top-row">
            <span>SUNDAY EDITION · AUTOMATED</span>
            <span>{issue.publishedDate}</span>
            <span>NO. {issue.issueNumber}</span>
          </div>

          {/* Masthead */}
          <div className="gazette-mast">
            <h1>The Hoard Gazette</h1>
            <div className="gazette-kick">
              BOOKMARKS · TODOS · ATLAS · TIL — ONE WEEK, HONESTLY REPORTED
            </div>
          </div>

          {/* Folio Bar */}
          <div className="gazette-folio-bar">
            <span>VOL. {issue.volumeNumber} · ISSUE {issue.issueNumber}</span>
            <span className="mid">WEEK OF {issue.dateRange}</span>
            <span>{issue.totalEditions} EDITIONS · 0 MISSED</span>
          </div>

          {/* The Week's Verdict */}
          <div className="gazette-verdict">
            <div>
              <div className="gazette-kicker">
                <b>THE WEEK&apos;S VERDICT</b>
              </div>
              <h2>{issue.verdict.headline}</h2>
              <p>{issue.verdict.body}</p>
            </div>

            <div className="gazette-vs">
              <h4>VS YOUR 8-WEEK AVERAGE</h4>
              {issue.vsAverage.map((v) => (
                <div key={v.label}>
                  <span>{v.label}</span>
                  <span className={v.dir}>
                    {v.val} {v.diff}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Flow Section */}
          <div className="gazette-flow">
            <div className="gazette-flow__h">
              <span>WHERE THE {issue.ledger.totalHoards} WENT</span>
              <span>DRAWN TO SCALE</span>
            </div>
            <div className="gazette-flow__b">
              <div className="gazette-bar">
                <div
                  className="b-read"
                  style={{ flex: Math.max(1, issue.flow.opened) }}
                  title={`${issue.flow.opened} opened`}
                >
                  <b>{issue.flow.opened}</b>
                  <span>OPENED</span>
                </div>
                <div
                  className="b-filed"
                  style={{ flex: Math.max(1, issue.flow.filed) }}
                  title={`${issue.flow.filed} filed`}
                >
                  <b>{issue.flow.filed}</b>
                  <span>FILED, UNREAD</span>
                </div>
                <div
                  className="b-stuck"
                  style={{ flex: Math.max(1, issue.flow.untouched) }}
                  title={`${issue.flow.untouched} untouched`}
                >
                  <b>{issue.flow.untouched}</b>
                  <span>UNSORTED, UNTOUCHED</span>
                </div>
              </div>
              <div className="gazette-flow__note">{issue.flow.note}</div>
            </div>
          </div>

          {/* 2-Column Body: Acquisitions & Minted TIL */}
          <div className="gazette-body-grid">
            {/* Left: Acquisitions */}
            <div>
              <div className="gazette-sec__h">
                <b>Acquisitions</b>
                <i>{issue.ledger.totalHoards} THIS WEEK</i>
              </div>
              {issue.acquisitions.map((acq, i) => (
                <div key={i} className="acq__r">
                  <span className="tg">#{acq.tag}</span>
                  <span className="tt">
                    <a
                      href={acq.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="acq-link"
                    >
                      {acq.title}
                    </a>
                    <em>{acq.source}</em>
                  </span>
                  <span className={`st ${acq.statusType}`}>{acq.status}</span>
                </div>
              ))}
            </div>

            {/* Right: Minted TIL */}
            <div>
              <div className="gazette-sec__h">
                <b>Minted</b>
                <i>{issue.mintedTils.length} CLAIMS</i>
              </div>
              {issue.mintedTils.map((til) => {
                const kindClass =
                  til.type === "GOTCHA"
                    ? "k-gotcha"
                    : til.type === "SNIPPET"
                    ? "k-snip"
                    : til.type === "PATTERN"
                    ? "k-pat"
                    : til.type === "OPINION"
                    ? "k-op"
                    : "k-fact";

                return (
                  <div key={til.id} className="til__r">
                    <div className="til__m">
                      <span className={`k ${kindClass}`}>{til.type}</span>
                      <span className="d">{til.dateStr}</span>
                    </div>
                    <p>{til.body}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Black Inverted Block: What Didn't Happen */}
          <div className="gazette-gap">
            <h3>What didn&apos;t happen</h3>
            <div className="sub">THE PART NO OTHER WEEKLY REVIEW SHOWS YOU</div>
            <div className="gazette-gap__g">
              {issue.gaps.map((g, i) => (
                <div key={i}>
                  <b>{g.stat}</b>
                  <p>{g.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Topic Weather */}
          <div className="gazette-weather">
            <div className="gazette-weather__h">
              <span>TOPIC WEATHER</span>
              <span>vs PREVIOUS 4 WEEKS</span>
            </div>
            <div className="gazette-weather__b">
              {issue.weather.map((w, i) => (
                <div key={i} className="w">
                  <div className="t">{w.tag}</div>
                  <div className="n">{w.count}</div>
                  <div className={`dl ${w.trendType}`}>{w.trend}</div>
                  <div className="spark">
                    {w.sparks.map((h, spIdx) => (
                      <i key={spIdx} style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tomorrow's Front Page */}
          <div className="gazette-next">
            <div className="gazette-next__h">
              TOMORROW&apos;S FRONT PAGE · THREE THINGS THAT WOULD CHANGE IT
            </div>
            <div className="gazette-next__b">
              {issue.nextActions.map((nxt, i) => (
                <div key={i}>
                  <h5>{nxt.kicker}</h5>
                  <p>{nxt.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Colophon */}
          <div className="gazette-colophon">
            <span>THE HOARD GAZETTE · NO. {issue.issueNumber}</span>
            <span id="setin">{SETIN[theme]}</span>
            <span>SYNTHESISED SUNDAY 06:00 · NO CLUTTER</span>
          </div>
        </div>
      </div>
    </div>
  );
};
