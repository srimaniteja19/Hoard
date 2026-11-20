"use client";

import React, { useRef } from "react";
import {
  Tv,
  Film,
  Sparkles,
  CalendarDays,
  BookmarkCheck,
  Crown,
  RefreshCw,
  SlidersHorizontal,
  Plus,
} from "lucide-react";
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
  releasesCount?: number;
  trackerCount?: number;
  favoritesCount?: number;
  isSyncing?: boolean;
  onSyncLive?: () => void;
  onOpenLogModal?: () => void;
  onOpenTriageModal?: () => void;
}

const TAB_ORDER: MediaKind[] = [
  "tv",
  "film",
  "vgf",
  "releases",
  "tracker",
  "favorites",
];

export const Channel100Header: React.FC<Channel100HeaderProps> = ({
  currentCat,
  onSelectCat,
  tvSeenCount,
  tvTotalCount = 250,
  filmSeenCount,
  filmTotalCount = 500,
  vgfSeenCount = 0,
  vgfTotalCount = 36,
  releasesCount = 0,
  trackerCount = 0,
  favoritesCount = 0,
  isSyncing = false,
  onSyncLive,
  onOpenLogModal,
  onOpenTriageModal,
}) => {
  const tabRefs = useRef<Record<MediaKind, HTMLButtonElement | null>>({
    tv: null,
    film: null,
    vgf: null,
    releases: null,
    tracker: null,
    favorites: null,
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
      {/* 7-Stripe Broadcast Color Ribbon */}
      <div className="ch100-bars" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>

      <header className="ch100-wrap ch100-top" id="top">
        <div className="ch100-brand-group">
          <a className="ch100-logo" href="#top" aria-label="Channel 100 Home">
            <b>CH·100</b>
          </a>

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
              title="IMDb Top 250 TV Series"
              aria-selected={currentCat === "tv"}
              aria-controls="ch100-main-panel"
              tabIndex={currentCat === "tv" ? 0 : -1}
              onClick={() => onSelectCat("tv")}
              onKeyDown={(e) => handleTabKeyDown(e, "tv")}
            >
              <span>
                <Tv size={13} strokeWidth={2.2} aria-hidden="true" />
                TV 250
              </span>
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
              title="Letterboxd Top 500 Narrative Features"
              aria-selected={currentCat === "film"}
              aria-controls="ch100-main-panel"
              tabIndex={currentCat === "film" ? 0 : -1}
              onClick={() => onSelectCat("film")}
              onKeyDown={(e) => handleTabKeyDown(e, "film")}
            >
              <span>
                <Film size={13} strokeWidth={2.2} aria-hidden="true" />
                Films 500
              </span>
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
              title="Very Good Films (verygoodfilms.co)"
              aria-selected={currentCat === "vgf"}
              aria-controls="ch100-main-panel"
              tabIndex={currentCat === "vgf" ? 0 : -1}
              onClick={() => onSelectCat("vgf")}
              onKeyDown={(e) => handleTabKeyDown(e, "vgf")}
            >
              <span>
                <Sparkles size={13} strokeWidth={2.2} aria-hidden="true" />
                VGF
              </span>
              <small id="tabVgfN" suppressHydrationWarning>
                {vgfSeenCount}/{vgfTotalCount}
              </small>
            </button>

            <button
              ref={(el) => {
                tabRefs.current.releases = el;
              }}
              type="button"
              role="tab"
              id="tabReleases"
              data-cat="releases"
              title="Streaming & Theatrical Release Calendar"
              aria-selected={currentCat === "releases"}
              aria-controls="ch100-main-panel"
              tabIndex={currentCat === "releases" ? 0 : -1}
              onClick={() => onSelectCat("releases")}
              onKeyDown={(e) => handleTabKeyDown(e, "releases")}
            >
              <span>
                <CalendarDays size={13} strokeWidth={2.2} aria-hidden="true" />
                Releases
              </span>
              <small id="tabReleasesN" suppressHydrationWarning>
                {releasesCount}
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
              title="Personal Watch Log"
              aria-selected={currentCat === "tracker"}
              aria-controls="ch100-main-panel"
              tabIndex={currentCat === "tracker" ? 0 : -1}
              onClick={() => onSelectCat("tracker")}
              onKeyDown={(e) => handleTabKeyDown(e, "tracker")}
            >
              <span>
                <BookmarkCheck size={13} strokeWidth={2.2} aria-hidden="true" />
                Log
              </span>
              <small id="tabTrackerN" suppressHydrationWarning>
                {trackerCount}
              </small>
            </button>

            <button
              ref={(el) => {
                tabRefs.current.favorites = el;
              }}
              type="button"
              role="tab"
              id="tabFavorites"
              data-cat="favorites"
              title="All-Time Favorite Movies & Shows"
              aria-selected={currentCat === "favorites"}
              aria-controls="ch100-main-panel"
              tabIndex={currentCat === "favorites" ? 0 : -1}
              onClick={() => onSelectCat("favorites")}
              onKeyDown={(e) => handleTabKeyDown(e, "favorites")}
            >
              <span>
                <Crown size={13} strokeWidth={2.2} aria-hidden="true" />
                All-Time
              </span>
              <small id="tabFavoritesN" suppressHydrationWarning>
                {favoritesCount}
              </small>
            </button>
          </div>
        </div>

        {/* Action Bar */}
        <nav className="ch100-nav" aria-label="Catalog actions">
          {onSyncLive && currentCat !== "tracker" && currentCat !== "favorites" && (
            <button
              type="button"
              className="ch100-nav-btn ch100-btn-sync"
              onClick={onSyncLive}
              disabled={isSyncing}
              title="Sync latest rankings and entries from live sources"
            >
              <RefreshCw
                size={13}
                strokeWidth={2.2}
                className={isSyncing ? "ch100-spin" : undefined}
                aria-hidden="true"
              />
              <span>{isSyncing ? "Syncing…" : "Sync"}</span>
            </button>
          )}

          {onOpenTriageModal && (
            <button
              type="button"
              className="ch100-nav-btn ch100-btn-matrix"
              onClick={onOpenTriageModal}
              title="Decision Matrix: Find what to watch tonight"
            >
              <SlidersHorizontal size={13} strokeWidth={2.2} aria-hidden="true" />
              <span>Decision Matrix</span>
            </button>
          )}

          {onOpenLogModal && (
            <button
              type="button"
              className="ch100-btn-primary"
              onClick={onOpenLogModal}
              title="Log a series, film, anime, or documentary"
            >
              <Plus size={14} strokeWidth={2.5} aria-hidden="true" />
              <span>Log Title</span>
            </button>
          )}
        </nav>
      </header>
    </>
  );
};
