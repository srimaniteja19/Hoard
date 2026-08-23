"use client";

import React, { useRef, useEffect, useMemo, useState } from "react";
import { ScrapRow, ScrapKind, scrapKindValues } from "@/db/schema";
import { ScratchFilters, StatusFilter, extractAllTags } from "@/lib/scratch/filters";
import { playSound, sound } from "@/lib/sound";

interface ScratchFilterBarProps {
  scraps: ScrapRow[];
  totalCount: number;
  filteredCount: number;
  filters: ScratchFilters;
  onFilterChange: (patch: Partial<ScratchFilters>) => void;
  onResetFilters: () => void;
}

export const ScratchFilterBar: React.FC<ScratchFilterBarProps> = ({
  scraps,
  totalCount,
  filteredCount,
  filters,
  onFilterChange,
  onResetFilters,
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [sfxEnabled, setSfxEnabled] = useState(true);

  useEffect(() => {
    setSfxEnabled(sound.isEnabled());
  }, []);

  const handleToggleSfx = () => {
    const next = sound.toggle();
    setSfxEnabled(next);
  };

  // Global '/' keyboard shortcut to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Compute category counts
  const kindCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: scraps.length };
    for (const k of scrapKindValues) {
      counts[k] = 0;
    }
    for (const s of scraps) {
      if (s.kind) {
        counts[s.kind] = (counts[s.kind] || 0) + 1;
      }
    }
    return counts;
  }, [scraps]);

  // Compute all tags
  const tags = useMemo(() => {
    return extractAllTags(scraps);
  }, [scraps]);

  const hasActiveFilters =
    !!filters.query ||
    (filters.kind && filters.kind !== "ALL") ||
    !!filters.tag ||
    !!filters.date ||
    (filters.status && filters.status !== "all");

  const categories: Array<{ id: ScrapKind | "ALL"; label: string; color: string }> = [
    { id: "ALL", label: "ALL", color: "ink" },
    { id: "FRAGMENT", label: "FRAGMENTS", color: "cyan" },
    { id: "QUESTION", label: "QUESTIONS", color: "violet" },
    { id: "QUOTE", label: "QUOTES", color: "yellow" },
    { id: "ACTION", label: "ACTIONS", color: "lime" },
    { id: "RANT", label: "RANTS", color: "pink" },
    { id: "IDEA", label: "IDEAS", color: "cyan" },
  ];

  const statusOptions: Array<{ id: StatusFilter; label: string }> = [
    { id: "all", label: "ALL STATUS" },
    { id: "has_notes", label: "HAS NOTES" },
    { id: "images", label: "📷 IMAGES" },
    { id: "raw", label: "RAW" },
    { id: "promoted", label: "PROMOTED" },
  ];

  return (
    <div className="scratch-filters-root">
      {/* ── ROW 1: SEARCH & QUICK COUNTER ── */}
      <div className="scratch-search-row">
        <div className="scratch-search-wrap">
          <span className="scratch-search-icon">🔍</span>
          <input
            ref={searchInputRef}
            type="text"
            className="scratch-search-input"
            value={filters.query}
            onChange={(e) => onFilterChange({ query: e.target.value })}
            placeholder="Search scraps, notes, #tags, code... (press / to focus)"
          />
          {filters.query && (
            <button
              type="button"
              className="scratch-search-clear"
              onClick={() => {
                playSound.click();
                onFilterChange({ query: "" });
              }}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        <div className="scratch-search-status">
          <button
            type="button"
            className={`scratch-sfx-toggle ${sfxEnabled ? "on" : "off"}`}
            onClick={handleToggleSfx}
            title={sfxEnabled ? "Mute interactive click sound effects" : "Enable interactive sound effects"}
          >
            {sfxEnabled ? "🔊 SOUND ON" : "🔇 SOUND OFF"}
          </button>

          <span className="match-badge">
            <b>{filteredCount}</b> / {totalCount} SCRAPS
          </span>
          {hasActiveFilters && (
            <button
              type="button"
              className="scratch-reset-filters-btn"
              onClick={() => {
                playSound.click();
                onResetFilters();
              }}
            >
              RESET ALL ✕
            </button>
          )}
        </div>
      </div>

      {/* ── ROW 2: CATEGORY / KIND TABS ── */}
      <div className="scratch-cat-tabs">
        {categories.map((cat) => {
          const isActive = (filters.kind || "ALL") === cat.id;
          const count = kindCounts[cat.id] || 0;

          return (
            <button
              key={cat.id}
              type="button"
              className={`scratch-cat-tab ${isActive ? "active" : ""} cat-${cat.color}`}
              onClick={() => {
                playSound.click();
                onFilterChange({ kind: cat.id });
              }}
            >
              <span className="cat-label">{cat.label}</span>
              <span className="cat-count">{count}</span>
            </button>
          );
        })}
      </div>

      {/* ── ROW 3: STATUS PILLS & TOP TAGS ── */}
      <div className="scratch-subfilters-row">
        {/* Status Pills */}
        <div className="scratch-status-pills">
          {statusOptions.map((st) => {
            const isActive = (filters.status || "all") === st.id;
            return (
              <button
                key={st.id}
                type="button"
                className={`scratch-status-pill ${isActive ? "active" : ""}`}
                onClick={() => {
                  playSound.pop();
                  onFilterChange({ status: st.id });
                }}
              >
                {st.label}
              </button>
            );
          })}
        </div>

        {/* Tags Row */}
        {tags.length > 0 && (
          <div className="scratch-tags-scroll">
            <span className="tags-label">TAGS:</span>
            {tags.slice(0, 10).map((t) => {
              const isActive = filters.tag === t.tag;
              return (
                <button
                  key={t.tag}
                  type="button"
                  className={`scratch-tag-pill ${isActive ? "active" : ""}`}
                  onClick={() => {
                    playSound.pop();
                    onFilterChange({ tag: isActive ? null : t.tag });
                  }}
                >
                  <span>{t.tag}</span>
                  <span className="tag-n">{t.count}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
