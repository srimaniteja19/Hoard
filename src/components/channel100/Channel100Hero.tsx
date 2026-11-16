"use client";

import React, { useRef } from "react";
import {
  Channel100StatsData,
  ChannelMediaItem,
  CatalogConfig,
  MediaKind,
  StatusFilter,
} from "@/lib/channel100/types";
import { fmtH } from "@/lib/channel100/data";

interface Channel100HeroProps {
  catalog: CatalogConfig;
  items: ChannelMediaItem[];
  stats: Channel100StatsData;
  cat: MediaKind;
  activeStatus?: StatusFilter;
  syncedAt?: number | null;
  onSurpriseMe: () => void;
  onCopyList: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onSelectStatusFilter: (status: StatusFilter) => void;
}

export const Channel100Hero: React.FC<Channel100HeroProps> = ({
  catalog,
  items,
  stats,
  cat,
  activeStatus = "all",
  syncedAt,
  onSurpriseMe,
  onCopyList,
  onExport,
  onImport,
  onSelectStatusFilter,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const totalItems = Math.max(1, items.length || 1);
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

  return (
    <section className="ch100-wrap ch100-summary-bar">
      <div className="ch100-summary-top">
        <div className="ch100-summary-titles">
          <h2 className="ch100-summary-h2">{catalog.h1}</h2>
          <p className="ch100-summary-lede">
            {catalog.lede}
            {syncedAt && cat !== "tracker" && (
              <span className="ch100-sync-stamp" suppressHydrationWarning>
                {" "}
                · Updated{" "}
                {new Date(syncedAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
            {cat === "vgf" && (
              <>
                {" "}
                ·{" "}
                <a
                  href="https://verygoodfilms.co/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ch100-inline-link"
                >
                  verygoodfilms.co ↗
                </a>
              </>
            )}
          </p>
        </div>

        <div className="ch100-summary-utils">
          <button
            type="button"
            className="ch100-util-btn"
            onClick={onSurpriseMe}
            title="Pick a random recommendation from your queue or the list"
          >
            Random pick
          </button>
          <button
            type="button"
            className="ch100-util-btn"
            onClick={onCopyList}
            title="Copy your lists formatted for sharing"
          >
            Copy list
          </button>
          <button
            type="button"
            className="ch100-util-btn"
            onClick={onExport}
            title="Download JSON backup"
          >
            Export
          </button>
          <button
            type="button"
            className="ch100-util-btn"
            onClick={() => fileInputRef.current?.click()}
            title="Import JSON backup"
          >
            Import
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
      </div>

      {/* Compact Metrics & Filter Strip */}
      <div className="ch100-metrics-row">
        <div
          className="ch100-stat-pills"
          role="group"
          aria-label="Filter by watch status"
        >
          <button
            type="button"
            className={`ch100-stat-pill seen ${
              activeStatus === "seen" ? "active" : ""
            }`}
            aria-pressed={activeStatus === "seen"}
            onClick={() => handleStatusClick("seen")}
          >
            <span className="dot seen" />
            <strong suppressHydrationWarning>{stats.seen}</strong>
            <span>Seen</span>
          </button>

          <button
            type="button"
            className={`ch100-stat-pill watching ${
              activeStatus === "watching" ? "active" : ""
            }`}
            aria-pressed={activeStatus === "watching"}
            onClick={() => handleStatusClick("watching")}
          >
            <span className="dot watching" />
            <strong suppressHydrationWarning>{stats.watching}</strong>
            <span>Watching</span>
          </button>

          <button
            type="button"
            className={`ch100-stat-pill want ${
              activeStatus === "want" ? "active" : ""
            }`}
            aria-pressed={activeStatus === "want"}
            onClick={() => handleStatusClick("want")}
          >
            <span className="dot want" />
            <strong suppressHydrationWarning>{stats.want}</strong>
            <span>Want</span>
          </button>

          {cat !== "tracker" && (
            <button
              type="button"
              className={`ch100-stat-pill ${
                activeStatus === "none" ? "active" : ""
              }`}
              aria-pressed={activeStatus === "none"}
              onClick={() => handleStatusClick("none")}
            >
              <strong suppressHydrationWarning>{stats.untouched}</strong>
              <span>Unseen</span>
            </button>
          )}
        </div>

        <div className="ch100-time-summary">
          <span>
            <b suppressHydrationWarning>{fmtH(stats.hoursSeen)}</b> watched
          </span>
          <span className="sep">·</span>
          <span>
            <b suppressHydrationWarning>{fmtH(stats.hoursWant)}</b> queued
          </span>
          <span className="sep">·</span>
          <span>
            <b suppressHydrationWarning>{stats.percentSeen}%</b> of {items.length}{" "}
            {catalog.noun}
          </span>
        </div>
      </div>

      {/* Hairline Progress Bar */}
      {items.length > 0 && (
        <div
          className="ch100-slim-progress"
          role="img"
          aria-label={`${stats.seen} seen, ${stats.watching} watching, ${stats.want} want, out of ${items.length}`}
        >
          <i className="ps" style={{ width: `${seenPct}%` }} />
          <i className="pn" style={{ width: `${watchingPct}%` }} />
          <i className="pw" style={{ width: `${wantPct}%` }} />
        </div>
      )}
    </section>
  );
};
