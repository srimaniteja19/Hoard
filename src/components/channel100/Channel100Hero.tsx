"use client";

import React, { useRef, useState } from "react";
import {
  Channel100StatsData,
  Channel100Store,
  ChannelMediaItem,
  CatalogConfig,
  MediaKind,
  StatusFilter,
} from "@/lib/channel100/types";
import { getMediaRecord } from "@/lib/channel100/storage";
import { fmtH } from "@/lib/channel100/data";

interface Channel100HeroProps {
  catalog: CatalogConfig;
  items: ChannelMediaItem[];
  store: Channel100Store;
  stats: Channel100StatsData;
  cat: MediaKind;
  activeStatus?: StatusFilter;
  vgfSyncedAt?: number | null;
  isSyncingVgf?: boolean;
  onSyncVgf?: () => void;
  onOpenModal: (id: string) => void;
  onSurpriseMe: () => void;
  onCopyList: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onSelectStatusFilter: (status: StatusFilter) => void;
  onOpenLogModal?: () => void;
  onOpenTriageModal?: () => void;
}

export const Channel100Hero: React.FC<Channel100HeroProps> = ({
  catalog,
  items,
  store,
  stats,
  cat,
  activeStatus = "all",
  vgfSyncedAt,
  isSyncingVgf = false,
  onSyncVgf,
  onOpenModal,
  onSurpriseMe,
  onCopyList,
  onExport,
  onImport,
  onSelectStatusFilter,
  onOpenTriageModal,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cellRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [focusedIdx, setFocusedIdx] = useState<number>(0);
  const [previewItem, setPreviewItem] = useState<ChannelMediaItem | null>(null);

  const totalItems = Math.max(1, items.length || 100);
  const seenPct = Math.min(100, Math.round((stats.seen / totalItems) * 100));
  const watchingPct = Math.min(
    100 - seenPct,
    Math.round((stats.watching / totalItems) * 100)
  );
  const wantPct = Math.min(
    100 - seenPct - watchingPct,
    Math.round((stats.want / totalItems) * 100)
  );

  function handleStatusClick(target: StatusFilter) {
    onSelectStatusFilter(activeStatus === target ? "all" : target);
  }

  function handleGridKeyDown(e: React.KeyboardEvent, idx: number) {
    const len = items.length;
    if (!len) return;
    let next = -1;
    if (e.key === "ArrowRight") next = (idx + 1) % len;
    else if (e.key === "ArrowLeft") next = (idx - 1 + len) % len;
    else if (e.key === "ArrowDown") next = Math.min(len - 1, idx + 10);
    else if (e.key === "ArrowUp") next = Math.max(0, idx - 10);
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = len - 1;

    if (next !== -1) {
      e.preventDefault();
      setFocusedIdx(next);
      setPreviewItem(items[next] || null);
      cellRefs.current[next]?.focus();
    }
  }

  const activePreview = previewItem || items[focusedIdx] || items[0] || null;
  const activePreviewRec = activePreview
    ? getMediaRecord(store, activePreview.id)
    : {};

  // Dedicated Minimal Tracker Hero for Personal Watch Diary
  if (cat === "tracker") {
    return (
      <section className="ch100-wrap ch100-tracker-hero">
        <div className="ch100-th-inner">
          <div className="ch100-th-top">
            <div className="ch100-th-info">
              <h2 className="ch100-th-title">
                What I&apos;m watching <span className="ch100-th-hl">right now</span>
              </h2>
              <p className="ch100-th-lede">
                Personal multi-language watch diary across series, films, anime, and documentaries. Track episode progress, rate what you finish, and export your canon anytime.
              </p>
            </div>
          </div>

          {/* Minimal Metrics Toolbar */}
          <div className="ch100-th-toolbar">
            <div className="ch100-th-stats" role="group" aria-label="Filter tracker by status">
              <button
                type="button"
                className={`ch100-th-pill seen ${activeStatus === "seen" ? "active" : ""}`}
                aria-pressed={activeStatus === "seen"}
                onClick={() => handleStatusClick("seen")}
                title="Filter by Seen"
              >
                <span className="ch100-th-pill-dot" />
                <strong suppressHydrationWarning>{stats.seen}</strong> Seen
              </button>
              <button
                type="button"
                className={`ch100-th-pill watching ${activeStatus === "watching" ? "active" : ""}`}
                aria-pressed={activeStatus === "watching"}
                onClick={() => handleStatusClick("watching")}
                title="Filter by Watching"
              >
                <span className="ch100-th-pill-dot" />
                <strong suppressHydrationWarning>{stats.watching}</strong> Watching
              </button>
              <button
                type="button"
                className={`ch100-th-pill want ${activeStatus === "want" ? "active" : ""}`}
                aria-pressed={activeStatus === "want"}
                onClick={() => handleStatusClick("want")}
                title="Filter by Want to see"
              >
                <span className="ch100-th-pill-dot" />
                <strong suppressHydrationWarning>{stats.want}</strong> Want to see
              </button>
            </div>

            <div className="ch100-th-time">
              <span><b suppressHydrationWarning>{fmtH(stats.hoursSeen)}</b> watched</span>
              <span>·</span>
              <span><b suppressHydrationWarning>{fmtH(stats.hoursWant)}</b> queued</span>
              <span>·</span>
              <span><b suppressHydrationWarning>{items.length}</b> {items.length === 1 ? "title" : "titles"}</span>
            </div>

            <div className="ch100-th-secondary-tools">
              <button
                type="button"
                className="ch100-th-btn"
                onClick={onSurpriseMe}
                title="Pick a random recommendation from your tracker"
              >
                🎲 Surprise me
              </button>
              <button
                type="button"
                className="ch100-th-btn"
                onClick={onCopyList}
                title="Copy your lists formatted for sharing"
              >
                📋 Share
              </button>
              <button
                type="button"
                className="ch100-th-btn"
                onClick={onExport}
                title="Download JSON backup"
              >
                💾 Export
              </button>
              <button
                type="button"
                className="ch100-th-btn"
                onClick={() => fileInputRef.current?.click()}
                title="Import JSON backup"
              >
                📂 Import
              </button>
            </div>
          </div>

          {/* Minimal 4px progress line */}
          {items.length > 0 && (stats.seen > 0 || stats.watching > 0 || stats.want > 0) && (
            <div className="ch100-th-progress">
              <i className="ps" style={{ width: `${seenPct}%` }} />
              <i className="pn" style={{ width: `${watchingPct}%` }} />
              <i className="pw" style={{ width: `${wantPct}%` }} />
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              onImport(file);
              e.target.value = "";
            }
          }}
        />
      </section>
    );
  }

  return (
    <section className="ch100-wrap ch100-hero">
      {/* Left Column: Stats, Copy & Controls */}
      <div>
        <h2
          className="ch100-h1 h1"
          id="h1"
          dangerouslySetInnerHTML={{ __html: catalog.h1 }}
        />
        <p className="ch100-lede lede" id="lede">
          <strong>{catalog.eyebrow}:</strong> {catalog.lede}
        </p>

        {/* 4 Interactive Metric Count Buttons */}
        <div className="ch100-counts counts" role="group" aria-label="Filter by watch status">
          <button
            type="button"
            className={`ch100-count count s ${activeStatus === "seen" ? "active-filter" : ""}`}
            aria-pressed={activeStatus === "seen"}
            onClick={() => handleStatusClick("seen")}
            title="Filter by Seen items (click again to show all)"
          >
            <strong id="cSeen" suppressHydrationWarning>{stats.seen}</strong>
            <span>Seen</span>
          </button>
          <button
            type="button"
            className={`ch100-count count n ${activeStatus === "watching" ? "active-filter" : ""}`}
            aria-pressed={activeStatus === "watching"}
            onClick={() => handleStatusClick("watching")}
            title="Filter by Watching items (click again to show all)"
          >
            <strong id="cWatching" suppressHydrationWarning>{stats.watching}</strong>
            <span>Watching</span>
          </button>
          <button
            type="button"
            className={`ch100-count count w ${activeStatus === "want" ? "active-filter" : ""}`}
            aria-pressed={activeStatus === "want"}
            onClick={() => handleStatusClick("want")}
            title="Filter by Want to see items (click again to show all)"
          >
            <strong id="cWant" suppressHydrationWarning>{stats.want}</strong>
            <span>Want to see</span>
          </button>
          <button
            type="button"
            className={`ch100-count count ${activeStatus === "none" ? "active-filter" : ""}`}
            aria-pressed={activeStatus === "none"}
            onClick={() => handleStatusClick("none")}
            title="Filter by Untouched items (click again to show all)"
          >
            <strong id="cLeft" suppressHydrationWarning>{stats.untouched}</strong>
            <span>Untouched</span>
          </button>
        </div>

        {/* Multi-segment Progress Bar with Hard Shadow & Smooth Animation */}
        <div
          className="ch100-progress progress"
          role="img"
          id="prog"
          aria-label={`${stats.seen} seen, ${stats.watching} watching, ${stats.want} want to see, out of ${totalItems}`}
        >
          <i className="ps" style={{ width: `${seenPct}%` }} />
          <i className="pn" style={{ width: `${watchingPct}%` }} />
          <i className="pw" style={{ width: `${wantPct}%` }} />
        </div>

        {/* Time Bar */}
        <div className="ch100-timebar timebar">
          <span>
            <b id="hSeen" suppressHydrationWarning>{fmtH(stats.hoursSeen)}</b> watched
          </span>
          <span>
            <b id="hWant" suppressHydrationWarning>{fmtH(stats.hoursWant)}</b> on your list
          </span>
          <span>
            <b id="hAll" suppressHydrationWarning>{fmtH(stats.hoursTotal)}</b> for all {items.length}
          </span>
        </div>

        {/* Action Buttons with Neo-Brutalist Push Effect */}
        <div className="ch100-hero-cta hero-cta">
          <button
            type="button"
            className="ch100-btn btn y"
            id="surprise"
            onClick={onSurpriseMe}
            title="Pick a random recommendation from your queue or the canon"
          >
            {catalog.icon} Surprise me
          </button>
          {cat === "vgf" && onSyncVgf && (
            <button
              type="button"
              className="ch100-btn btn c"
              onClick={onSyncVgf}
              disabled={isSyncingVgf}
              title="Pull latest film recommendations from verygoodfilms.co"
            >
              {isSyncingVgf ? "⏳ Syncing…" : "↻ Sync Now"}
            </button>
          )}
          {cat === "vgf" && (
            <a
              className="ch100-btn btn"
              href="https://verygoodfilms.co/"
              target="_blank"
              rel="noopener noreferrer"
              title="Open verygoodfilms.co in a new tab"
            >
              ↗ verygoodfilms.co
            </a>
          )}
          <button
            type="button"
            className="ch100-btn btn"
            id="copy"
            onClick={onCopyList}
            title="Copy your lists formatted for sharing"
          >
            📋 Copy my lists
          </button>
          <button
            type="button"
            className="ch100-btn btn"
            onClick={onExport}
            title="Download JSON backup"
          >
            💾 Export
          </button>
          <button
            type="button"
            className="ch100-btn btn"
            onClick={() => fileInputRef.current?.click()}
            title="Import JSON backup"
          >
            📂 Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                onImport(file);
                e.target.value = "";
              }
            }}
          />
        </div>

        {cat === "vgf" && vgfSyncedAt ? (
          <p
            style={{
              marginTop: "10px",
              fontFamily: "var(--ch-mono)",
              fontSize: "11.5px",
              color: "var(--ch-muted)",
            }}
            suppressHydrationWarning
          >
            Live feed synced from verygoodfilms.co · Last checked{" "}
            {new Date(vgfSyncedAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            (auto-refreshes hourly)
          </p>
        ) : null}

        {/* Watchlist Decision Matrix Prompt Banner */}
        {onOpenTriageModal && (
          <div className="ch100-triage-hero-banner">
            <div className="ch100-triage-hero-info">
              <span className="ch100-triage-hero-icon">🎯</span>
              <div className="ch100-triage-hero-text">
                <strong>Decision Paralysis? Run the Triage Matrix</strong>
                <span>Filter by time, energy &amp; context across world cinema &amp; your backlog</span>
              </div>
            </div>
            <button
              type="button"
              className="ch100-triage-cta-btn"
              onClick={onOpenTriageModal}
            >
              <span className="ch100-triage-cta-pulse" />
              <span>Diagnose What to Watch →</span>
            </button>
          </div>
        )}
      </div>

      {/* Right Column: 10x10 Test Card (TV/Film) with Roving TabIndex & Live Preview */}
      <div className="ch100-set set">
        <div className="ch100-set-head set-head">
          <span id="setlabel">{catalog.set}</span>
          <span id="pct" suppressHydrationWarning>{stats.percentSeen}% seen</span>
        </div>

        <div
          className="ch100-grid100 grid100"
          id="grid100"
          role="grid"
          aria-label={`${catalog.set} — use arrow keys to inspect channels`}
        >
          {items.map((item, idx) => {
            const rec = getMediaRecord(store, item.id);
            const statusClass = rec.s || "";
            const metaInfo =
              cat === "tv"
                ? `${item.years}`
                : `${item.year}, dir. ${item.director}`;
            return (
              <button
                key={item.id}
                ref={(el) => {
                  cellRefs.current[idx] = el;
                }}
                type="button"
                tabIndex={idx === focusedIdx ? 0 : -1}
                className={`ch100-cell cell ${statusClass} ${
                  activePreview?.id === item.id ? "is-previewed" : ""
                }`}
                onClick={() => {
                  setFocusedIdx(idx);
                  setPreviewItem(item);
                  onOpenModal(item.id);
                }}
                onMouseEnter={() => setPreviewItem(item)}
                onFocus={() => {
                  setFocusedIdx(idx);
                  setPreviewItem(item);
                }}
                onKeyDown={(e) => handleGridKeyDown(e, idx)}
                title={`${item.rank}. ${item.title} (${metaInfo}) — IMDb ${item.imdb}${
                  rec.s ? ` [${rec.s.toUpperCase()}]` : ""
                }`}
                aria-label={`${item.rank}. ${item.title} (${metaInfo})${
                  rec.s ? `, marked ${rec.s}` : ""
                }`}
              >
                {item.rank}
              </button>
            );
          })}
        </div>

        {/* Live Channel Readout Ticker (eliminates mystery-meat hover dependency) */}
        {activePreview && (
          <div className="ch100-grid-preview" aria-live="polite">
            <div className="ch100-grid-preview-main">
              <span className="ch100-grid-preview-rank">
                {catalog.rankPre} {String(activePreview.rank).padStart(2, "0")}
              </span>
              <strong className="ch100-grid-preview-title">
                {activePreview.title}
              </strong>
              <span className="ch100-grid-preview-meta">
                {cat === "tv"
                  ? `${activePreview.years} · ${activePreview.where}`
                  : `${activePreview.year} · ${activePreview.director}`}
              </span>
            </div>
            <button
              type="button"
              className="ch100-grid-preview-btn"
              onClick={() => onOpenModal(activePreview.id)}
            >
              {activePreviewRec.s ? activePreviewRec.s.toUpperCase() : "Inspect"} →
            </button>
          </div>
        )}

        <div className="ch100-legend legend">
          <span>
            <i style={{ background: "var(--ch-seen)" }} /> Seen
          </span>
          <span>
            <i style={{ background: "var(--ch-watching)" }} /> Watching
          </span>
          <span>
            <i style={{ background: "var(--ch-want)" }} /> Want
          </span>
          <span>
            <i style={{ background: "var(--ch-field)" }} /> Not yet
          </span>
        </div>
      </div>
    </section>
  );
};

