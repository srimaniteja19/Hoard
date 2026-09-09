"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import { TilType } from "@/db/schema";
import {
  Search,
  X,
  Sparkles,
  Tag as TagIcon,
  Filter,
  RotateCcw,
  SlidersHorizontal,
  Flame,
  Check,
} from "lucide-react";

export interface TilSearchFilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedType: TilType | null;
  onSelectType: (type: TilType | null) => void;
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
  selectedDay: string | null;
  onClearDay: () => void;
  selectedHash: string | null;
  onClearHash: () => void;
  onClearAll: () => void;
  typeCounts?: Record<string, number>;
  topTags?: Array<{ name: string; count: number }>;
  totalCount?: number;
}

interface CategoryMeta {
  type: TilType | "ALL";
  label: string;
  symbol: string;
  color: string;
  bgLight: string;
  borderColor: string;
  description: string;
}

const CATEGORIES: CategoryMeta[] = [
  {
    type: "ALL",
    label: "ALL",
    symbol: "✦",
    color: "var(--ink)",
    bgLight: "var(--cream, #FFFDF7)",
    borderColor: "var(--ink)",
    description: "Every verified insight",
  },
  {
    type: "FACT",
    label: "FACT",
    symbol: "💡",
    color: "#00B8D9",
    bgLight: "rgba(0, 240, 255, 0.12)",
    borderColor: "var(--ink)",
    description: "Empirical discoveries",
  },
  {
    type: "GOTCHA",
    label: "GOTCHA",
    symbol: "⚠️",
    color: "#FF007A",
    bgLight: "rgba(255, 0, 122, 0.12)",
    borderColor: "var(--ink)",
    description: "Pitfalls & landmines",
  },
  {
    type: "SNIPPET",
    label: "SNIPPET",
    symbol: "⚡",
    color: "#5BB318",
    bgLight: "rgba(182, 255, 60, 0.2)",
    borderColor: "var(--ink)",
    description: "Executable recipes",
  },
  {
    type: "PATTERN",
    label: "PATTERN",
    symbol: "📐",
    color: "#7C4DFF",
    bgLight: "rgba(124, 77, 255, 0.15)",
    borderColor: "var(--ink)",
    description: "Structural models",
  },
  {
    type: "QUOTE",
    label: "QUOTE",
    symbol: "💬",
    color: "#E6B800",
    bgLight: "rgba(255, 233, 74, 0.25)",
    borderColor: "var(--ink)",
    description: "Attributed wisdom",
  },
  {
    type: "OPINION",
    label: "OPINION",
    symbol: "💭",
    color: "#00B368",
    bgLight: "rgba(0, 229, 138, 0.18)",
    borderColor: "var(--ink)",
    description: "Personal evaluations",
  },
  {
    type: "LINK",
    label: "LINK",
    symbol: "🔗",
    color: "#D97706",
    bgLight: "rgba(255, 230, 0, 0.2)",
    borderColor: "var(--ink)",
    description: "External sources",
  },
  {
    type: "NEWS",
    label: "NEWS",
    symbol: "📰",
    color: "#FF6B00",
    bgLight: "rgba(255, 107, 0, 0.15)",
    borderColor: "var(--ink)",
    description: "Announcements & releases",
  },
];

export const TilSearchFilterBar: React.FC<TilSearchFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedType,
  onSelectType,
  selectedTag,
  onSelectTag,
  selectedDay,
  onClearDay,
  selectedHash,
  onClearHash,
  onClearAll,
  typeCounts = {},
  topTags = [],
  totalCount,
}) => {
  const [localInput, setLocalInput] = useState(searchQuery);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, startTransition] = useTransition();

  // Sync external search query to local input
  useEffect(() => {
    setLocalInput(searchQuery);
  }, [searchQuery]);

  // Debounce search update
  useEffect(() => {
    const handler = setTimeout(() => {
      if (localInput !== searchQuery) {
        startTransition(() => {
          onSearchChange(localInput);
        });
      }
    }, 280);
    return () => clearTimeout(handler);
  }, [localInput, searchQuery, onSearchChange]);

  // Global hotkey: '/' or 'Cmd+K' focuses search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        activeEl?.getAttribute("contenteditable") === "true";

      if ((e.key === "/" && !isInput) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      } else if (e.key === "Escape" && activeEl === inputRef.current) {
        inputRef.current?.blur();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const hasAnyFilter = Boolean(
    searchQuery.trim() || selectedType || selectedTag || selectedDay || selectedHash
  );

  const displayTotal = totalCount ?? typeCounts["ALL"] ?? 0;

  return (
    <div className="til-search-filter-console" role="search" aria-label="TIL Search & Categories">
      {/* Neo-brutalist Terminal Top Strip */}
      <div className="til-console-top-strip">
        <div className="til-console-window-dots">
          <span className="window-dot dot-red" />
          <span className="window-dot dot-yellow" />
          <span className="window-dot dot-green" />
          <span className="til-console-tag">KNOWLEDGE_INDEX // V2.0</span>
        </div>
        <div className="til-console-meta">
          <span className="til-status-live-pulse" />
          <span className="til-console-count">
            <b>{displayTotal}</b> {displayTotal === 1 ? "INSIGHT" : "INSIGHTS"} INDEXED
          </span>
        </div>
      </div>

      {/* Main Search Input Box */}
      <div className="til-search-input-wrapper">
        <div className="til-search-icon-box">
          <Search size={18} strokeWidth={2.5} />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={localInput}
          onChange={(e) => setLocalInput(e.target.value)}
          placeholder="Search insights, snippets, tags, #hash or urls... (Press / or ⌘K)"
          className="til-search-text-input"
          aria-label="Search insights by query or tag"
        />
        {localInput && (
          <button
            type="button"
            className="til-search-clear-action"
            onClick={() => {
              setLocalInput("");
              onSearchChange("");
              inputRef.current?.focus();
            }}
            title="Clear search"
            aria-label="Clear search query"
          >
            <X size={15} strokeWidth={3} />
          </button>
        )}
        <div className="til-search-kbd-hint">
          <kbd className="til-kbd">⌘K</kbd>
          <span className="til-kbd-or">or</span>
          <kbd className="til-kbd">/</kbd>
        </div>
      </div>

      {/* Category Matrix Filter Bar */}
      <div className="til-category-section">
        <div className="til-category-section-label">
          <span className="til-section-icon">
            <SlidersHorizontal size={13} strokeWidth={2.5} />
          </span>
          <span className="til-section-title">FIND BY CATEGORY</span>
          {selectedType && (
            <span className="til-category-active-notice">
              [ACTIVE: <b>{selectedType}</b>]
            </span>
          )}
        </div>

        <div className="til-category-matrix" role="radiogroup" aria-label="Filter by TIL archetype">
          {CATEGORIES.map((cat) => {
            const isAll = cat.type === "ALL";
            const isActive = isAll ? selectedType === null : selectedType === cat.type;
            const count = isAll ? displayTotal : (typeCounts[cat.type] ?? 0);

            return (
              <button
                key={cat.type}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => {
                  if (isAll) {
                    onSelectType(null);
                  } else {
                    onSelectType(isActive ? null : (cat.type as TilType));
                  }
                }}
                className={`til-category-btn ${isActive ? "active" : ""}`}
                style={
                  {
                    "--cat-color": cat.color,
                    "--cat-bg": cat.bgLight,
                  } as React.CSSProperties
                }
                title={`${cat.label}: ${cat.description} (${count})`}
              >
                <span className="til-cat-symbol">{cat.symbol}</span>
                <span className="til-cat-name">{cat.label}</span>
                <span className="til-cat-count-badge">{count}</span>
                {isActive && <Check size={12} strokeWidth={3} className="til-cat-check" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Top Topic Tags Row (if tags exist) */}
      {topTags.length > 0 && (
        <div className="til-tags-discovery-row">
          <div className="til-tags-discovery-label">
            <TagIcon size={12} strokeWidth={2.5} />
            <span>POPULAR TOPICS:</span>
          </div>
          <div className="til-tags-pills-list">
            {topTags.map((t) => {
              const isTagActive = selectedTag?.toLowerCase() === t.name.toLowerCase();
              return (
                <button
                  key={t.name}
                  type="button"
                  onClick={() => onSelectTag(isTagActive ? null : t.name)}
                  className={`til-tag-discovery-pill ${isTagActive ? "active" : ""}`}
                  title={`Filter by #${t.name} (${t.count} entries)`}
                >
                  <span className="tag-hash">#</span>
                  <span className="tag-name">{t.name}</span>
                  <span className="tag-count">{t.count}</span>
                  {isTagActive && <X size={11} strokeWidth={3} className="tag-clear-icon" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Filter Badges Bar */}
      {hasAnyFilter && (
        <div className="til-active-filters-hud">
          <div className="til-hud-title">
            <Filter size={12} strokeWidth={3} />
            <span>FILTER APPLIED:</span>
          </div>

          <div className="til-hud-chips">
            {searchQuery.trim() && (
              <span className="til-hud-chip query">
                <span className="chip-key">SEARCH:</span>
                <span className="chip-val">&ldquo;{searchQuery.trim()}&rdquo;</span>
                <button
                  type="button"
                  onClick={() => {
                    setLocalInput("");
                    onSearchChange("");
                  }}
                  className="chip-remove"
                  aria-label="Remove search filter"
                >
                  <X size={12} strokeWidth={3} />
                </button>
              </span>
            )}

            {selectedType && (
              <span className="til-hud-chip type">
                <span className="chip-key">CATEGORY:</span>
                <span className="chip-val">{selectedType}</span>
                <button
                  type="button"
                  onClick={() => onSelectType(null)}
                  className="chip-remove"
                  aria-label="Remove category filter"
                >
                  <X size={12} strokeWidth={3} />
                </button>
              </span>
            )}

            {selectedTag && (
              <span className="til-hud-chip tag">
                <span className="chip-key">TAG:</span>
                <span className="chip-val">#{selectedTag}</span>
                <button
                  type="button"
                  onClick={() => onSelectTag(null)}
                  className="chip-remove"
                  aria-label="Remove tag filter"
                >
                  <X size={12} strokeWidth={3} />
                </button>
              </span>
            )}

            {selectedDay && (
              <span className="til-hud-chip day">
                <span className="chip-key">DAY:</span>
                <span className="chip-val">{selectedDay}</span>
                <button
                  type="button"
                  onClick={onClearDay}
                  className="chip-remove"
                  aria-label="Remove day filter"
                >
                  <X size={12} strokeWidth={3} />
                </button>
              </span>
            )}

            {selectedHash && (
              <span className="til-hud-chip hash">
                <span className="chip-key">HASH:</span>
                <span className="chip-val">#{selectedHash}</span>
                <button
                  type="button"
                  onClick={onClearHash}
                  className="chip-remove"
                  aria-label="Remove hash filter"
                >
                  <X size={12} strokeWidth={3} />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={onClearAll}
              className="til-hud-reset-all"
              title="Reset all filters"
            >
              <RotateCcw size={12} strokeWidth={3} />
              <span>RESET ALL</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
