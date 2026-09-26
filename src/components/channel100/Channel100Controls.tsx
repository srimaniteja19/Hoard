"use client";

import React, { useMemo } from "react";
import {
  Channel100Store,
  ChannelMediaItem,
  CatalogConfig,
  StatusFilter,
  ViewFilterState,
  ViewSort,
  MediaKind,
} from "@/lib/channel100/types";
import { getMediaRecord } from "@/lib/channel100/storage";

interface Channel100ControlsProps {
  items: ChannelMediaItem[];
  store: Channel100Store;
  catalog: CatalogConfig;
  filters: ViewFilterState;
  onUpdateFilters: (patch: Partial<ViewFilterState>) => void;
  resultCount: number;
  cat?: MediaKind;
  onOpenLogModal?: () => void;
}

export const Channel100Controls: React.FC<Channel100ControlsProps> = ({
  items,
  store,
  catalog,
  filters,
  onUpdateFilters,
  resultCount,
  cat = "tv",
  onOpenLogModal,
}) => {
  // Counts by status for the current catalog
  const counts = useMemo(() => {
    let seen = 0;
    let watching = 0;
    let want = 0;
    items.forEach((item) => {
      const rec = getMediaRecord(store, item.id);
      if (rec.s === "seen") seen++;
      else if (rec.s === "watching") watching++;
      else if (rec.s === "want") want++;
    });
    const none = Math.max(0, items.length - seen - watching - want);
    return { seen, watching, want, none };
  }, [items, store]);

  // Unique genres for current catalog
  const genres = useMemo(() => {
    return Array.from(new Set(items.map((s) => s.genre).filter(Boolean))).sort();
  }, [items]);

  // Unique streamers sorted by count for current catalog
  const streamers = useMemo(() => {
    const countsMap: Record<string, number> = {};
    items.forEach((s) => {
      if (s.where) {
        countsMap[s.where] = (countsMap[s.where] || 0) + 1;
      }
    });
    return Object.keys(countsMap).sort(
      (a, b) => countsMap[b] - countsMap[a] || a.localeCompare(b)
    );
  }, [items]);

  // Unique languages for tracker mode or film
  const languages = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.lang) set.add(i.lang);
    });
    return Array.from(set).sort();
  }, [items]);

  const statusChips: [StatusFilter, string, number][] = [
    ["all", "All", items.length],
    ["seen", "Seen", counts.seen],
    ["watching", "Watching", counts.watching],
    ["want", "Want", counts.want],
    ["none", "Not yet", counts.none],
  ];

  return (
    <section className="ch100-controls controls" id="browse" aria-label="Filter the list">
      <div className="ch100-wrap wrap">
        {/* Row 1: Search & Status Chips */}
        <div className="ch100-ctl-row ctl-row">
          <label className="ch100-search search">
            <span aria-hidden="true">⌕</span>
            <input
              id="q"
              type="search"
              placeholder={catalog.search}
              aria-label="Search"
              value={filters.q}
              onChange={(e) => onUpdateFilters({ q: e.target.value })}
            />
          </label>

          <div
            className="ch100-chips chips"
            id="statusChips"
            role="group"
            aria-label="Filter by status"
          >
            {statusChips.map(([key, label, count]) => (
              <button
                key={key}
                type="button"
                className="ch100-chip chip"
                aria-pressed={filters.status === key}
                onClick={() => onUpdateFilters({ status: key })}
              >
                {label}
                <span className="n">{count}</span>
              </button>
            ))}
          </div>

          {onOpenLogModal && (
            <button
              type="button"
              className="ch100-btn-ctl-log"
              onClick={onOpenLogModal}
              title="Add a show, movie, or anime to your personal tracker"
            >
              + Log Title
            </button>
          )}
        </div>

        {/* Row 2: Selects, Layout Toggle, and Results Note */}
        <div className="ch100-ctl-row ctl-row">
          {/* Language filter for tracker or international film */}
          {(cat === "tracker" || languages.length > 1) && (
            <select
              className="ch100-sel sel"
              id="lang"
              aria-label="Filter by language"
              value={filters.lang || "all"}
              onChange={(e) => onUpdateFilters({ lang: e.target.value })}
            >
              <option value="all">All languages</option>
              {languages.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          )}

          {/* Medium filter for tracker mode */}
          {cat === "tracker" && (
            <select
              className="ch100-sel sel"
              id="customKind"
              aria-label="Filter by medium"
              value={filters.customKind || "all"}
              onChange={(e) =>
                onUpdateFilters({ customKind: e.target.value as any })
              }
            >
              <option value="all">All media types</option>
              <option value="series">📺 TV Series</option>
              <option value="film">🎬 Feature Film</option>
              <option value="anime">⚔️ Anime</option>
              <option value="mini-series">🎞️ Mini-Series</option>
              <option value="documentary">📽️ Documentary</option>
            </select>
          )}

          {/* Genre select */}
          <select
            className="ch100-sel sel"
            id="genre"
            aria-label="Filter by genre"
            value={filters.genre}
            onChange={(e) => onUpdateFilters({ genre: e.target.value })}
          >
            <option value="all">All genres</option>
            {genres.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>

          {/* Streamer select */}
          <select
            className="ch100-sel sel"
            id="where"
            aria-label="Filter by where to watch"
            value={filters.where}
            onChange={(e) => onUpdateFilters({ where: e.target.value })}
          >
            <option value="all">All streamers</option>
            {streamers.map((w) => (
              <option key={w} value={w}>
                {w} ({items.filter((i) => i.where === w).length})
              </option>
            ))}
          </select>

          {/* Length / Runtime select */}
          <select
            className="ch100-sel sel"
            id="len"
            aria-label="Filter by time to watch"
            value={filters.len}
            onChange={(e) => onUpdateFilters({ len: e.target.value })}
          >
            <option value="all">Any length</option>
            {catalog.bands.map(([val, label]) => (
              <option key={val} value={val}>
                {label}
              </option>
            ))}
          </select>

          {/* Sort select */}
          <select
            className="ch100-sel sel"
            id="sort"
            aria-label="Sort"
            value={filters.sort}
            onChange={(e) =>
              onUpdateFilters({ sort: e.target.value as ViewSort })
            }
          >
            {cat === "tracker" ? (
              <>
                <option value="recent">Sort: Recently updated</option>
                <option value="progress">Sort: Episode progress</option>
                <option value="mine">Sort: My rating</option>
                <option value="az">Sort: Title A–Z</option>
                <option value="short">Sort: Quickest to finish</option>
                <option value="long">Sort: Longest to finish</option>
              </>
            ) : (
              <>
                <option value="rank">Sort: NYT rank</option>
                <option value="imdb">Sort: IMDb rating</option>
                <option value="short">Sort: Quickest to finish</option>
                <option value="long">Sort: Longest to finish</option>
                <option value="new">Sort: Newest</option>
                <option value="old">Sort: Oldest</option>
                <option value="az">Sort: Title A–Z</option>
                <option value="mine">Sort: My rating</option>
              </>
            )}
          </select>

          {/* Grid / List layout toggle */}
          <div className="ch100-viewtog viewtog" role="group" aria-label="Layout">
            <button
              type="button"
              id="vGrid"
              aria-pressed={filters.layout === "grid"}
              onClick={() => onUpdateFilters({ layout: "grid" })}
              title="Grid cards view"
            >
              Grid
            </button>
            <button
              type="button"
              id="vList"
              aria-pressed={filters.layout === "list"}
              onClick={() => onUpdateFilters({ layout: "list" })}
              title="Compact list view"
            >
              List
            </button>
          </div>

          {/* Result Counter */}
          <span className="ch100-result-note result-note" id="resnote" suppressHydrationWarning>
            {resultCount} {cat === "tracker" ? `${catalog.noun}` : `of 100 ${catalog.noun}`}
          </span>
        </div>
      </div>
    </section>
  );
};
