"use client";

import React from "react";
import { MediaKind } from "@/lib/channel100/types";

interface Channel100HeaderProps {
  currentCat: MediaKind;
  onSelectCat: (cat: MediaKind) => void;
  tvSeenCount: number;
  filmSeenCount: number;
  trackerCount?: number;
  crtMode: boolean;
  onToggleCrt: () => void;
  sfxEnabled: boolean;
  onToggleSfx: () => void;
  onOpenLogModal?: () => void;
}

export const Channel100Header: React.FC<Channel100HeaderProps> = ({
  currentCat,
  onSelectCat,
  tvSeenCount,
  filmSeenCount,
  trackerCount = 0,
  crtMode,
  onToggleCrt,
  sfxEnabled,
  onToggleSfx,
  onOpenLogModal,
}) => {
  return (
    <>
      {/* 7-stripe SMPTE Broadcast Color Bars */}
      <div className="ch100-bars bars" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>

      <header className="ch100-wrap wrap ch100-top top">
        <a className="ch100-logo logo" href="#top" id="top">
          <b>CH·100</b>
          <span>21st-century TV &amp; film tracker</span>
        </a>

        {/* Triple Catalog Switch: TV vs Film vs Tracker */}
        <div className="ch100-switch switch" role="tablist" aria-label="Choose a list">
          <button
            type="button"
            role="tab"
            id="tabTv"
            data-cat="tv"
            aria-selected={currentCat === "tv"}
            onClick={() => onSelectCat("tv")}
          >
            TV <small id="tabTvN" suppressHydrationWarning>{tvSeenCount}/100</small>
          </button>
          <button
            type="button"
            role="tab"
            id="tabFilm"
            data-cat="film"
            aria-selected={currentCat === "film"}
            onClick={() => onSelectCat("film")}
          >
            Film <small id="tabFilmN" suppressHydrationWarning>{filmSeenCount}/100</small>
          </button>
          <button
            type="button"
            role="tab"
            id="tabTracker"
            data-cat="tracker"
            className="ch100-tab-tracker"
            aria-selected={currentCat === "tracker"}
            onClick={() => onSelectCat("tracker")}
            title="What I'm watching now (any language, custom titles)"
          >
            ⚡ Tracker <small id="tabTrackerN" suppressHydrationWarning>{trackerCount}</small>
          </button>
        </div>

        <nav className="ch100-nav nav" aria-label="TV guide navigation">
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

          <a href="#browse">Browse</a>
          <a href="#stats">Stats</a>

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
