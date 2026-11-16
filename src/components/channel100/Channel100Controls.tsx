"use client";

import React, { useMemo } from "react";
import { RotateCcw, LayoutGrid, List } from "lucide-react";
import {
  Channel100Store,
  ChannelMediaItem,
  CatalogConfig,
  ViewFilterState,
  ViewSort,
  MediaKind,
  ReleasePeriod,
} from "@/lib/channel100/types";

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
  catalog,
  filters,
  onUpdateFilters,
  resultCount,
  cat = "tv",
}) => {
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
    if (filters.cat === "releases") {
      [
        "Telugu",
        "Malayalam",
        "Kannada",
        "Tamil",
        "Hindi",
        "English",
        "Spanish",
        "German",
        "Korean",
        "Japanese",
      ].forEach((l) => set.add(l));
    }
    items.forEach((i) => {
      if (i.lang) set.add(i.lang);
    });
    return Array.from(set).sort();
  }, [items, filters.cat]);

  const hasActiveFilters =
    filters.status !== "all" ||
    filters.genre !== "all" ||
    filters.where !== "all" ||
    filters.len !== "all" ||
    (filters.lang && filters.lang !== "all") ||
    (filters.cat === "tracker" && filters.customKind && filters.customKind !== "all") ||
    (filters.cat === "releases" && filters.releasePeriod && filters.releasePeriod !== "all") ||
    filters.q.trim() !== "";

  function handleClearAllFilters() {
    onUpdateFilters({
      status: "all",
      genre: "all",
      where: "all",
      len: "all",
      lang: "all",
      customKind: "all",
      releasePeriod: "all",
      q: "",
    });
  }

  const periodOptions: { id: ReleasePeriod; label: string }[] = [
    { id: "day", label: "Today (Day)" },
    { id: "week", label: "This Week" },
    { id: "month", label: "This Month" },
    { id: "year", label: "This Year" },
    { id: "all", label: "All" },
  ];

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
            placeholder={`${catalog.search} (Press /)`}
            aria-label="Search"
            value={filters.q}
            onChange={(e) => onUpdateFilters({ q: e.target.value })}
          />
        </label>

        {/* Release Timeframe Pills (Day / Week / Month / Year) */}
        {cat === "releases" && (
          <div
            className="ch100-period-pills"
            role="group"
            aria-label="Filter releases by timeframe"
          >
            {periodOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className="ch100-period-pill"
                aria-pressed={(filters.releasePeriod || "all") === opt.id}
                onClick={() => onUpdateFilters({ releasePeriod: opt.id })}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* Filter Selects */}
        <div className="ch100-selects-group">
          {(cat === "tracker" || cat === "releases" || languages.length > 1) && (
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

          {(cat === "tracker" || cat === "releases") && (
            <select
              className="ch100-sel sel"
              id="customKind"
              aria-label="Filter by medium"
              value={filters.customKind || "all"}
              onChange={(e) =>
                onUpdateFilters({ customKind: e.target.value })
              }
            >
              <option value="all">All media types</option>
              <option value="tv">📺 TV Series</option>
              <option value="film">🎬 Feature Film</option>
              {cat === "tracker" && (
                <>
                  <option value="anime">⚔️ Anime</option>
                  <option value="mini">🎞️ Mini-Series</option>
                  <option value="doc">📽️ Documentary</option>
                </>
              )}
            </select>
          )}

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

          {streamers.length > 1 && (
            <select
              className="ch100-sel sel"
              id="where"
              aria-label="Filter by platform"
              value={filters.where}
              onChange={(e) => onUpdateFilters({ where: e.target.value })}
            >
              <option value="all">All platforms</option>
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
            <option value="all">Any length</option>
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
                <option value="recent">Sort: Recently updated</option>
                <option value="progress">Sort: Episode progress</option>
                <option value="mine">Sort: My rating</option>
                <option value="az">Sort: Title A–Z</option>
                <option value="short">Sort: Shortest</option>
                <option value="long">Sort: Longest</option>
              </>
            ) : (
              <>
                <option value="rank">Sort: Canon rank</option>
                <option value="imdb">Sort: Rating</option>
                <option value="short">Sort: Shortest</option>
                <option value="long">Sort: Longest</option>
                <option value="new">Sort: Newest</option>
                <option value="old">Sort: Oldest</option>
                <option value="az">Sort: Title A–Z</option>
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
              <RotateCcw size={12} strokeWidth={2.3} aria-hidden="true" />
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
            <strong>{resultCount}</strong> of {items.length}
          </span>

          <div className="ch100-viewtog viewtog" role="group" aria-label="Layout">
            <button
              type="button"
              id="vGrid"
              aria-pressed={filters.layout === "grid"}
              onClick={() => onUpdateFilters({ layout: "grid" })}
              title="Poster cards view"
            >
              <LayoutGrid size={13} strokeWidth={2.2} aria-hidden="true" />
              Cards
            </button>
            <button
              type="button"
              id="vList"
              aria-pressed={filters.layout === "list"}
              onClick={() => onUpdateFilters({ layout: "list" })}
              title="Compact index rows"
            >
              <List size={13} strokeWidth={2.2} aria-hidden="true" />
              Index
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
