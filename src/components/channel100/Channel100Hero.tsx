"use client";

import React, { useRef, useState, useEffect } from "react";
import {
  Dices,
  MoreHorizontal,
  Copy,
  Download,
  Upload,
  Check,
  Play,
  Plus,
  CircleDashed,
} from "lucide-react";
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
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    function handleOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    window.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      window.removeEventListener("keydown", handleEsc);
    };
  }, [menuOpen]);

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
          <div className="ch100-summary-title-row">
            <h2 className="ch100-summary-h2">{catalog.h1}</h2>
            {syncedAt && cat !== "tracker" && (
              <span
                className="ch100-live-pill"
                title="Live synced with chart updates"
                suppressHydrationWarning
              >
                <span className="ch100-live-dot" aria-hidden="true" />
                Live ·{" "}
                {new Date(syncedAt).toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
          <p className="ch100-summary-lede">
            {catalog.lede}
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
            className="ch100-util-btn ch100-util-accent"
            onClick={onSurpriseMe}
            title="Pick a random recommendation from your queue or the list"
          >
            <Dices size={14} strokeWidth={2.2} aria-hidden="true" />
            Surprise me
          </button>

          <div className="ch100-menu-wrap" ref={menuRef}>
            <button
              type="button"
              className="ch100-util-btn"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((prev) => !prev)}
              title="Backup, export, import, and copy lists"
            >
              <MoreHorizontal size={14} strokeWidth={2.2} aria-hidden="true" />
              Backup / Share
            </button>

            {menuOpen && (
              <div className="ch100-popover-menu" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  className="ch100-menu-item"
                  onClick={() => {
                    setMenuOpen(false);
                    onCopyList();
                  }}
                >
                  <Copy size={13} strokeWidth={2.1} aria-hidden="true" />
                  Copy lists to clipboard
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="ch100-menu-item"
                  onClick={() => {
                    setMenuOpen(false);
                    onExport();
                  }}
                >
                  <Download size={13} strokeWidth={2.1} aria-hidden="true" />
                  Export JSON backup
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="ch100-menu-item"
                  onClick={() => {
                    setMenuOpen(false);
                    fileInputRef.current?.click();
                  }}
                >
                  <Upload size={13} strokeWidth={2.1} aria-hidden="true" />
                  Import JSON backup
                </button>
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
        </div>
      </div>

      {/* Editorial Telemetry Strip: Status Filters + Progress */}
      <div className="ch100-metrics-row">
        <div
          className="ch100-counts"
          role="group"
          aria-label="Filter by watch status"
        >
          <button
            type="button"
            className={`ch100-count s ${
              activeStatus === "seen" ? "active-filter" : ""
            }`}
            aria-pressed={activeStatus === "seen"}
            onClick={() => handleStatusClick("seen")}
            title="Filter by Seen (click again to show all)"
          >
            <Check className="ch100-count-icon" size={13} strokeWidth={2.6} aria-hidden="true" />
            <span>Seen</span>
            <strong suppressHydrationWarning>{stats.seen}</strong>
          </button>

          <button
            type="button"
            className={`ch100-count n ${
              activeStatus === "watching" ? "active-filter" : ""
            }`}
            aria-pressed={activeStatus === "watching"}
            onClick={() => handleStatusClick("watching")}
            title="Filter by Watching (click again to show all)"
          >
            <Play className="ch100-count-icon" size={11} strokeWidth={2.6} aria-hidden="true" />
            <span>Watching</span>
            <strong suppressHydrationWarning>{stats.watching}</strong>
          </button>

          <button
            type="button"
            className={`ch100-count w ${
              activeStatus === "want" ? "active-filter" : ""
            }`}
            aria-pressed={activeStatus === "want"}
            onClick={() => handleStatusClick("want")}
            title="Filter by Want to see (click again to show all)"
          >
            <Plus className="ch100-count-icon" size={13} strokeWidth={2.6} aria-hidden="true" />
            <span>Want</span>
            <strong suppressHydrationWarning>{stats.want}</strong>
          </button>

          <button
            type="button"
            className={`ch100-count u ${
              activeStatus === "none" ? "active-filter" : ""
            }`}
            aria-pressed={activeStatus === "none"}
            onClick={() => handleStatusClick("none")}
            title="Filter by Unseen (click again to show all)"
          >
            <CircleDashed className="ch100-count-icon" size={12} strokeWidth={2.2} aria-hidden="true" />
            <span>Unseen</span>
            <strong suppressHydrationWarning>{stats.untouched}</strong>
          </button>
        </div>

        {/* Inline Progress & Time Readout */}
        <div className="ch100-progress-card">
          <div className="ch100-time-summary">
            <span>
              <b suppressHydrationWarning>{fmtH(stats.hoursSeen)}</b> watched
            </span>
            <span className="sep">·</span>
            <span>
              <b suppressHydrationWarning>{fmtH(stats.hoursWant)}</b> on list
            </span>
            <span className="sep">·</span>
            <span>
              <b suppressHydrationWarning>{stats.percentSeen}%</b> of{" "}
              {items.length} {catalog.noun}
            </span>
          </div>

          <div
            className="ch100-slim-progress"
            role="img"
            aria-label={`${stats.seen} seen, ${stats.watching} watching, ${stats.want} want, out of ${items.length}`}
          >
            {seenPct > 0 && <i className="ps" style={{ width: `${seenPct}%` }} />}
            {watchingPct > 0 && <i className="pn" style={{ width: `${watchingPct}%` }} />}
            {wantPct > 0 && <i className="pw" style={{ width: `${wantPct}%` }} />}
          </div>
        </div>
      </div>
    </section>
  );
};
