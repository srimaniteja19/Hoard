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
}

export const Channel100Controls: React.FC<Channel100ControlsProps> = ({
  items,
  store,
  catalog,
  filters,
  onUpdateFilters,
  resultCount,
  cat = "tv",
}) => {
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

  const genres = useMemo(() => {
    return Array.from(new Set(items.map((s) => s.genre).filter(Boolean))).sort();
  }, [items]);

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
    ["none", "Unseen", counts.none],
  ];

  const hasActiveFilters =
    filters.status !== "all" ||
    filters.genre !== "all" ||
    filters.where !== "all" ||
    filters.len !== "all" ||
    (filters.lang && filters.lang !== "all") ||
    (filters.customKind && filters.customKind !== "all") ||
    filters.q.trim() !== "";

  function handleClearAllFilters() {
    onUpdateFilters({
      status: "all",
      genre: "all",
      where: "all",
      len: "all",
      lang: "all",
      customKind: "all",
      q: "",
    });
  }

  return (
    <section
      className="ch100-controls controls"
      id="browse"
      aria-label="Filter and sort"
    >
      <div className="ch100-wrap wrap ch100-ctl-bar">
        {/* Search Input */}
        <label className="ch100-search search">
          <span aria-hidden="true">⌕</span>
          <input
            id="q"
            type="search"
            placeholder={`${catalog.search} (/)`}
            aria-label="Search"
            value={filters.q}
            onChange={(e) => onUpdateFilters({ q: e.target.value })}
          />
        </label>

        {/* Status Chips */}
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
              <span className="n" suppressHydrationWarning>
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* Filter Selects */}
        <div className="ch100-selects-group">
          {(cat === "tracker" || languages.length > 1) && (
            <select
              className="ch100-sel sel"
              id="lang"
              aria-label="Filter by language"
              value={filters.lang || "all"}
              onChange={(e) => onUpdateFilters({ lang: e.target.value })}
            >
              <option value="all">Language</option>
              {languages.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          )}

          {cat === "tracker" && (
            <select
              className="ch100-sel sel"
              id="customKind"
              aria-label="Filter by medium"
              value={filters.customKind || "all"}
              onChange={(e) =>
                onUpdateFilters({ customKind: e.target.value })
              }
            >
              <option value="all">Medium</option>
              <option value="tv">TV Series</option>
              <option value="film">Feature Film</option>
              <option value="anime">Anime</option>
              <option value="mini">Mini-Series</option>
              <option value="doc">Documentary</option>
            </select>
          )}

          <select
            className="ch100-sel sel"
            id="genre"
            aria-label="Filter by genre"
            value={filters.genre}
            onChange={(e) => onUpdateFilters({ genre: e.target.value })}
          >
            <option value="all">Genre</option>
            {genres.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>

          {streamers.length > 1 && (
            <select
              className="ch100-sel sel"
              id="where"
              aria-label="Filter by platform"
              value={filters.where}
              onChange={(e) => onUpdateFilters({ where: e.target.value })}
            >
              <option value="all">Platform</option>
              {streamers.map((w) => (
                <option key={w} value={w}>
                  {w} ({items.filter((i) => i.where === w).length})
                </option>
              ))}
            </select>
          )}

          <select
            className="ch100-sel sel"
            id="len"
            aria-label="Filter by runtime"
            value={filters.len}
            onChange={(e) => onUpdateFilters({ len: e.target.value })}
          >
            <option value="all">Length</option>
            {catalog.bands.map(([val, label]) => (
              <option key={val} value={val}>
                {label}
              </option>
            ))}
          </select>

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
                <option value="recent">Sort: Recent</option>
                <option value="progress">Sort: Progress</option>
                <option value="mine">Sort: My rating</option>
                <option value="az">Sort: A–Z</option>
                <option value="short">Sort: Shortest</option>
                <option value="long">Sort: Longest</option>
              </>
            ) : (
              <>
                <option value="rank">Sort: Rank</option>
                <option value="imdb">Sort: Rating</option>
                <option value="short">Sort: Shortest</option>
                <option value="long">Sort: Longest</option>
                <option value="new">Sort: Newest</option>
                <option value="old">Sort: Oldest</option>
                <option value="az">Sort: A–Z</option>
                <option value="mine">Sort: My rating</option>
              </>
            )}
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              className="ch100-clear-btn"
              onClick={handleClearAllFilters}
              title="Reset search and all active filters"
            >
              Reset
            </button>
          )}
        </div>

        {/* View Toggle & Result Counter */}
        <div className="ch100-ctl-right">
          <span
            className="ch100-result-note result-note"
            id="resnote"
            suppressHydrationWarning
          >
            {resultCount} of {items.length}
          </span>

          <div className="ch100-viewtog viewtog" role="group" aria-label="Layout">
            <button
              type="button"
              id="vGrid"
              aria-pressed={filters.layout === "grid"}
              onClick={() => onUpdateFilters({ layout: "grid" })}
              title="Grid view"
            >
              Cards
            </button>
            <button
              type="button"
              id="vList"
              aria-pressed={filters.layout === "list"}
              onClick={() => onUpdateFilters({ layout: "list" })}
              title="Compact index rows"
            >
              Index
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
