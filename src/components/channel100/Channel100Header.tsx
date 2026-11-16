"use client";

import React, { useRef } from "react";
import { MediaKind } from "@/lib/channel100/types";

interface Channel100HeaderProps {
  currentCat: MediaKind;
  onSelectCat: (cat: MediaKind) => void;
  tvSeenCount: number;
  tvTotalCount?: number;
  filmSeenCount: number;
  filmTotalCount?: number;
  vgfSeenCount?: number;
  vgfTotalCount?: number;
  trackerCount?: number;
  isSyncing?: boolean;
  onSyncLive?: () => void;
  onOpenLogModal?: () => void;
  onOpenTriageModal?: () => void;
}

const TAB_ORDER: MediaKind[] = ["tv", "film", "vgf", "tracker"];

export const Channel100Header: React.FC<Channel100HeaderProps> = ({
  currentCat,
  onSelectCat,
  tvSeenCount,
  tvTotalCount = 250,
  filmSeenCount,
  filmTotalCount = 500,
  vgfSeenCount = 0,
  vgfTotalCount = 36,
  trackerCount = 0,
  isSyncing = false,
  onSyncLive,
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
    <header className="ch100-wrap ch100-top" id="top">
      {/* Segmented Catalog Switcher */}
      <div className="ch100-switch" role="tablist" aria-label="Choose a canon">
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
          <span>IMDb Top 250 TV</span>
          <small id="tabTvN" suppressHydrationWarning>
            {tvSeenCount}/{tvTotalCount}
          </small>
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
          <span>Letterboxd 500</span>
          <small id="tabFilmN" suppressHydrationWarning>
            {filmSeenCount}/{filmTotalCount}
          </small>
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
        >
          <span>Very Good Films</span>
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
          aria-selected={currentCat === "tracker"}
          aria-controls="ch100-main-panel"
          tabIndex={currentCat === "tracker" ? 0 : -1}
          onClick={() => onSelectCat("tracker")}
          onKeyDown={(e) => handleTabKeyDown(e, "tracker")}
        >
          <span>Personal Log</span>
          <small id="tabTrackerN" suppressHydrationWarning>
            {trackerCount}
          </small>
        </button>
      </div>

      {/* Minimal Utility Bar */}
      <nav className="ch100-nav" aria-label="Catalog actions">
        {onSyncLive && currentCat !== "tracker" && (
          <button
            type="button"
            className="ch100-nav-btn"
            onClick={onSyncLive}
            disabled={isSyncing}
            title="Sync latest rankings and entries from live sources"
          >
            {isSyncing ? "Syncing…" : "↻ Sync Live"}
          </button>
        )}

        {onOpenTriageModal && (
          <button
            type="button"
            className="ch100-nav-btn"
            onClick={onOpenTriageModal}
            title="Decision Matrix: Find what to watch tonight"
          >
            Decision Matrix
          </button>
        )}

        {onOpenLogModal && (
          <button
            type="button"
            className="ch100-btn-primary"
            onClick={onOpenLogModal}
            title="Log a series, film, anime, or documentary"
          >
            + Log Title
          </button>
        )}
      </nav>
    </header>
  );
};
