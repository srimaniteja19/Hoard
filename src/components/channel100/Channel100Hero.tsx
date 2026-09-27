"use client";

import React, { useRef } from "react";
import {
  Channel100StatsData,
  Channel100Store,
  ChannelMediaItem,
  CatalogConfig,
  MediaKind,
  StatusFilter,
} from "@/lib/channel100/types";
import { getMediaRecord } from "@/lib/channel100/storage";
import { fmtH, fmtM } from "@/lib/channel100/data";

interface Channel100HeroProps {
  catalog: CatalogConfig;
  items: ChannelMediaItem[];
  store: Channel100Store;
  stats: Channel100StatsData;
  cat: MediaKind;
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
  onOpenModal,
  onSurpriseMe,
  onCopyList,
  onExport,
  onImport,
  onSelectStatusFilter,
  onOpenLogModal,
  onOpenTriageModal,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const totalItems = items.length || 100;
  const seenPct = stats.percentSeen;
  const watchingPct = Math.round((stats.watching / totalItems) * 100);
  const wantPct = Math.round((stats.want / totalItems) * 100);

  // Dedicated Minimal Tracker Hero for Personal Watch Diary
  if (cat === "tracker") {
    return (
      <section className="ch100-wrap ch100-tracker-hero">
        <div className="ch100-th-inner">
          <div className="ch100-th-top">
            <div className="ch100-th-info">
              <div className="ch100-th-badge">
                <span>✦ PERSONAL WATCH DIARY</span>
                <span className="ch100-th-badge-sub">ANY LANGUAGE · ANY MEDIUM</span>
              </div>
              <h1 className="ch100-th-title">
                What I'm watching <span className="ch100-th-hl">right now</span>
              </h1>
              <p className="ch100-th-lede">
                Your personal multi-language watch canon. Track what you're binging in any language, update progress, and rate.
              </p>
            </div>

            <div className="ch100-th-actions-primary">
              {onOpenTriageModal && (
                <button
                  type="button"
                  className="ch100-triage-cta-btn"
                  onClick={onOpenTriageModal}
                  title="Cure decision paralysis: Let the Decision Matrix pick what to watch tonight"
                >
                  <span className="ch100-triage-cta-pulse" />
                  <span>🎯 Decision Matrix</span>
                </button>
              )}

              {onOpenLogModal && (
                <button
                  type="button"
                  className="ch100-th-log-btn"
                  onClick={onOpenLogModal}
                  title="Log what you are watching now in any language"
                >
                  ⚡ + Log Title
                </button>
              )}
            </div>
          </div>

          {/* Minimal Metrics Toolbar */}
          <div className="ch100-th-toolbar">
            <div className="ch100-th-stats">
              <button
                type="button"
                className="ch100-th-pill seen"
                onClick={() => onSelectStatusFilter("seen")}
                title="Filter by Seen"
              >
                <span className="ch100-th-pill-dot" />
                <strong suppressHydrationWarning>{stats.seen}</strong> Seen
              </button>
              <button
                type="button"
                className="ch100-th-pill watching"
                onClick={() => onSelectStatusFilter("watching")}
                title="Filter by Watching"
              >
                <span className="ch100-th-pill-dot" />
                <strong suppressHydrationWarning>{stats.watching}</strong> Watching
              </button>
              <button
                type="button"
                className="ch100-th-pill want"
                onClick={() => onSelectStatusFilter("want")}
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
              <i className="ps" style={{ width: `${Math.round((stats.seen / items.length) * 100)}%` }} />
              <i className="pn" style={{ width: `${Math.round((stats.watching / items.length) * 100)}%` }} />
              <i className="pw" style={{ width: `${Math.round((stats.want / items.length) * 100)}%` }} />
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
        <span className="ch100-eyebrow eyebrow" id="eyebrow">
          {catalog.eyebrow}
        </span>
        <h1
          className="ch100-h1 h1"
          id="h1"
          dangerouslySetInnerHTML={{ __html: catalog.h1 }}
        />
        <p className="ch100-lede lede" id="lede">
          {catalog.lede}
        </p>

        {/* 4 Metric Count Cards */}
        <div className="ch100-counts counts">
          <div
            className="ch100-count count s"
            onClick={() => onSelectStatusFilter("seen")}
            title="Filter by Seen items"
          >
            <strong id="cSeen" suppressHydrationWarning>{stats.seen}</strong>
            <span>Seen</span>
          </div>
          <div
            className="ch100-count count n"
            onClick={() => onSelectStatusFilter("watching")}
            title="Filter by Watching items"
          >
            <strong id="cWatching" suppressHydrationWarning>{stats.watching}</strong>
            <span>Watching</span>
          </div>
          <div
            className="ch100-count count w"
            onClick={() => onSelectStatusFilter("want")}
            title="Filter by Want to see items"
          >
            <strong id="cWant" suppressHydrationWarning>{stats.want}</strong>
            <span>Want to see</span>
          </div>
          <div
            className="ch100-count count"
            onClick={() => onSelectStatusFilter("none")}
            title="Filter by Untouched items"
          >
            <strong id="cLeft" suppressHydrationWarning>{stats.untouched}</strong>
            <span>Untouched</span>
          </div>
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
            <b id="hAll" suppressHydrationWarning>{fmtH(stats.hoursTotal)}</b> for all 100
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

      {/* Right Column: 10x10 Test Card (TV/Film) */}
        <div className="ch100-set set">
          <div className="ch100-set-head set-head">
            <span id="setlabel">{catalog.set}</span>
            <span id="pct" suppressHydrationWarning>{stats.percentSeen}% seen</span>
          </div>

          <div className="ch100-grid100 grid100" id="grid100">
            {items.map((item) => {
              const rec = getMediaRecord(store, item.id);
              const statusClass = rec.s || "";
              const metaInfo =
                cat === "tv"
                  ? `${item.years}`
                  : `${item.year}, dir. ${item.director}`;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`ch100-cell cell ${statusClass}`}
                  onClick={() => onOpenModal(item.id)}
                  title={`${item.rank}. ${item.title} (${metaInfo}) — IMDb ${item.imdb}${
                    rec.s ? ` [${rec.s.toUpperCase()}]` : ""
                  }`}
                  aria-label={`${item.rank}. ${item.title}${rec.s ? `, ${rec.s}` : ""}`}
                >
                  {item.rank}
                </button>
              );
            })}
          </div>

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
              <i style={{ background: "#2B2A31" }} /> Not yet
            </span>
          </div>
        </div>
    </section>
  );
};

