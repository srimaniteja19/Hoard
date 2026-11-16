"use client";

import React, { useRef } from "react";
import { MediaKind } from "@/lib/channel100/types";

interface Channel100HeaderProps {
  currentCat: MediaKind;
  onSelectCat: (cat: MediaKind) => void;
  tvSeenCount: number;
  filmSeenCount: number;
  vgfSeenCount?: number;
  vgfTotalCount?: number;
  trackerCount?: number;
  crtMode: boolean;
  onToggleCrt: () => void;
  sfxEnabled: boolean;
  onToggleSfx: () => void;
  onOpenLogModal?: () => void;
  onOpenTriageModal?: () => void;
}

const TAB_ORDER: MediaKind[] = ["tv", "film", "vgf", "tracker"];

export const Channel100Header: React.FC<Channel100HeaderProps> = ({
  currentCat,
  onSelectCat,
  tvSeenCount,
  filmSeenCount,
  vgfSeenCount = 0,
  vgfTotalCount = 36,
  trackerCount = 0,
  crtMode,
  onToggleCrt,
  sfxEnabled,
  onToggleSfx,
  onOpenLogModal,
  onOpenTriageModal,
}) => {
  const tabRefs = useRef<Record<MediaKind, HTMLButtonElement | null>>({
    tv: null,
    film: null,
    vgf: null,
    tracker: null,
  });

  function handleTabKeyDown(e: React.KeyboardEvent, cat: MediaKind) {
    const idx = TAB_ORDER.indexOf(cat);
    let nextIdx = -1;
    if (e.key === "ArrowRight") {
      nextIdx = (idx + 1) % TAB_ORDER.length;
    } else if (e.key === "ArrowLeft") {
      nextIdx = (idx - 1 + TAB_ORDER.length) % TAB_ORDER.length;
    } else if (e.key === "Home") {
      nextIdx = 0;
    } else if (e.key === "End") {
      nextIdx = TAB_ORDER.length - 1;
    }
    if (nextIdx !== -1) {
      e.preventDefault();
      const nextCat = TAB_ORDER[nextIdx];
      onSelectCat(nextCat);
      tabRefs.current[nextCat]?.focus();
    }
  }

  return (
    <>
      {/* 7-stripe SMPTE Broadcast Color Bars */}
      <div className="ch100-bars" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>

      <header className="ch100-wrap ch100-top">
        <a className="ch100-logo" href="#top" id="top">
          <b>CH·100</b>
          <span>21st-century TV &amp; film tracker</span>
        </a>

        {/* Triple Catalog Switch: TV vs Film vs Tracker */}
        <div className="ch100-switch" role="tablist" aria-label="Choose a list">
          <button
            ref={(el) => {
              tabRefs.current.tv = el;
            }}
            type="button"
            role="tab"
            id="tabTv"
            data-cat="tv"
            aria-selected={currentCat === "tv"}
            aria-controls="ch100-main-panel"
            tabIndex={currentCat === "tv" ? 0 : -1}
            onClick={() => onSelectCat("tv")}
            onKeyDown={(e) => handleTabKeyDown(e, "tv")}
          >
            TV <small id="tabTvN" suppressHydrationWarning>{tvSeenCount}/100</small>
          </button>
          <button
            ref={(el) => {
              tabRefs.current.film = el;
            }}
            type="button"
            role="tab"
            id="tabFilm"
            data-cat="film"
            aria-selected={currentCat === "film"}
            aria-controls="ch100-main-panel"
            tabIndex={currentCat === "film" ? 0 : -1}
            onClick={() => onSelectCat("film")}
            onKeyDown={(e) => handleTabKeyDown(e, "film")}
          >
            Film <small id="tabFilmN" suppressHydrationWarning>{filmSeenCount}/100</small>
          </button>
          <button
            ref={(el) => {
              tabRefs.current.vgf = el;
            }}
            type="button"
            role="tab"
            id="tabVgf"
            data-cat="vgf"
            aria-selected={currentCat === "vgf"}
            aria-controls="ch100-main-panel"
            tabIndex={currentCat === "vgf" ? 0 : -1}
            onClick={() => onSelectCat("vgf")}
            onKeyDown={(e) => handleTabKeyDown(e, "vgf")}
            title="Live-synced curated cinema from verygoodfilms.co"
          >
            🎞️ Very Good Films{" "}
            <small id="tabVgfN" suppressHydrationWarning>
              {vgfSeenCount}/{vgfTotalCount}
            </small>
          </button>
          <button
            ref={(el) => {
              tabRefs.current.tracker = el;
            }}
            type="button"
            role="tab"
            id="tabTracker"
            data-cat="tracker"
            className="ch100-tab-tracker"
            aria-selected={currentCat === "tracker"}
            aria-controls="ch100-main-panel"
            tabIndex={currentCat === "tracker" ? 0 : -1}
            onClick={() => onSelectCat("tracker")}
            onKeyDown={(e) => handleTabKeyDown(e, "tracker")}
            title="What I'm watching now (any language, custom titles)"
          >
            ⚡ Tracker <small id="tabTrackerN" suppressHydrationWarning>{trackerCount}</small>
          </button>
        </div>

        <nav className="ch100-nav" aria-label="TV guide controls">
          {onOpenTriageModal && (
            <button
              type="button"
              className="ch100-triage-cta-btn"
              onClick={onOpenTriageModal}
              title="Watchlist Decision Matrix: Cure decision paralysis"
            >
              <span className="ch100-triage-cta-pulse" />
              <span>🎯 Decision Matrix</span>
            </button>
          )}

          {onOpenLogModal && (
            <button
              type="button"
              className="ch100-btn-quick-log"
              onClick={onOpenLogModal}
              title="Log what you are watching now in any language"
            >
              + Log Title
            </button>
          )}

          {/* CRT Scanline effect toggle */}
          <button
            type="button"
            onClick={onToggleCrt}
            title="Toggle vintage CRT television scanlines"
            aria-pressed={crtMode}
          >
            📺 CRT {crtMode ? "ON" : "OFF"}
          </button>

          {/* SFX Toggle */}
          <button
            type="button"
            onClick={onToggleSfx}
            title="Toggle mechanical clicks and sound effects"
            aria-pressed={sfxEnabled}
          >
            {sfxEnabled ? "🔊 SFX ON" : "🔇 SFX OFF"}
          </button>
        </nav>
      </header>
    </>
  );
};
