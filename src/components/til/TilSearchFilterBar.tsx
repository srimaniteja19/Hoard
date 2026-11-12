"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import { TilType } from "@/db/schema";
import {
  Search,
  X,
  Tag as TagIcon,
  Filter,
  RotateCcw,
  Layers,
  Zap,
  AlertTriangle,
  Code2,
  Boxes,
  Quote,
  Compass,
  Link2,
  Newspaper,
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
  code: string;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  color: string;
  description: string;
}

const CATEGORIES: CategoryMeta[] = [
  {
    type: "ALL",
    code: "00",
    label: "ALL",
    icon: Layers,
    color: "var(--ink)",
    description: "Every verified insight",
  },
  {
    type: "FACT",
    code: "01",
    label: "FACT",
    icon: Zap,
    color: "var(--cyan, #00F0FF)",
    description: "Empirical discoveries",
  },
  {
    type: "GOTCHA",
    code: "02",
    label: "GOTCHA",
    icon: AlertTriangle,
    color: "var(--pink, #FF007A)",
    description: "Pitfalls & corrected assumptions",
  },
  {
    type: "SNIPPET",
    code: "03",
    label: "SNIPPET",
    icon: Code2,
    color: "var(--lime, #B6FF3C)",
    description: "Executable code specimens",
  },
  {
    type: "PATTERN",
    code: "04",
    label: "PATTERN",
    icon: Boxes,
    color: "var(--violet, #7C4DFF)",
    description: "Recurring structural laws",
  },
  {
    type: "QUOTE",
    code: "05",
    label: "QUOTE",
    icon: Quote,
    color: "var(--yellow, #FFE94A)",
    description: "Attributed primary-source wisdom",
  },
  {
    type: "OPINION",
    code: "06",
    label: "OPINION",
    icon: Compass,
    color: "var(--mint, #00E58A)",
    description: "Signed theses & evaluations",
  },
  {
    type: "LINK",
    code: "07",
    label: "LINK",
    icon: Link2,
    color: "var(--yel, #FFE600)",
    description: "External primary sources",
  },
  {
    type: "NEWS",
    code: "08",
    label: "NEWS",
    icon: Newspaper,
    color: "var(--orange, #FF6B00)",
    description: "Intelligence wire & releases",
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
  const [showTagsDrawer, setShowTagsDrawer] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setLocalInput(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (localInput !== searchQuery) {
        startTransition(() => {
          onSearchChange(localInput);
        });
      }
    }, 260);
    return () => clearTimeout(handler);
  }, [localInput, searchQuery, onSearchChange]);

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
    <div className="til-search-filter-console" role="search" aria-label="TIL Search and Archetype Index">
      {/* Row 1: Precision Search Bar */}
      <div className="til-search-input-wrapper">
        <div className="til-search-icon-box" aria-hidden="true">
          <Search size={16} strokeWidth={2.6} />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={localInput}
          onChange={(e) => setLocalInput(e.target.value)}
          placeholder="Filter ledger by claim, code, #tag, #hash, or source domain..."
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
            <X size={14} strokeWidth={2.8} />
          </button>
        )}
        <div className="til-search-telemetry">
          {topTags.length > 0 && (
            <button
              type="button"
              className={`til-topics-toggle-btn ${showTagsDrawer || selectedTag ? "active" : ""}`}
              onClick={() => setShowTagsDrawer((v) => !v)}
              title="Toggle topic tag index"
            >
              <TagIcon size={11} strokeWidth={2.5} />
              <span>TOPICS ({topTags.length})</span>
            </button>
          )}
          <span className="til-console-count">
            <b>{displayTotal}</b> SAVED
          </span>
          <div className="til-search-kbd-hint" aria-hidden="true">
            <kbd className="til-kbd">/</kbd>
            <kbd className="til-kbd">⌘K</kbd>
          </div>
        </div>
      </div>

      {/* Row 2: 9-Cell Archetype Matrix Rail */}
      <div className="til-category-matrix" role="radiogroup" aria-label="Filter by TIL archetype">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
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
                } as React.CSSProperties
              }
              title={`${cat.label}: ${cat.description} (${count})`}
            >
              <span className="til-cat-bar" aria-hidden="true" />
              <span className="til-cat-icon">
                <Icon size={12} strokeWidth={2.5} />
              </span>
              <span className="til-cat-name">{cat.label}</span>
              <span className="til-cat-count-badge">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Row 3: Topic Tag Index Strip (Expandable) */}
      {topTags.length > 0 && (showTagsDrawer || Boolean(selectedTag)) && (
        <div className="til-tags-discovery-row">
          <div className="til-tags-discovery-label">
            <TagIcon size={11} strokeWidth={2.5} />
            <span>INDEX TAGS</span>
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
                  {isTagActive && <X size={10} strokeWidth={3} className="tag-clear-icon" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Row 4: Active Filter Ledger Strip */}
      {hasAnyFilter && (
        <div className="til-active-filters-hud">
          <div className="til-hud-title">
            <Filter size={11} strokeWidth={2.8} />
            <span>ACTIVE ISOLATION</span>
          </div>

          <div className="til-hud-chips">
            {searchQuery.trim() && (
              <span className="til-hud-chip query">
                <span className="chip-key">QUERY</span>
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
                  <X size={11} strokeWidth={3} />
                </button>
              </span>
            )}

            {selectedType && (
              <span className="til-hud-chip type">
                <span className="chip-key">ARCHETYPE</span>
                <span className="chip-val">{selectedType}</span>
                <button
                  type="button"
                  onClick={() => onSelectType(null)}
                  className="chip-remove"
                  aria-label="Remove category filter"
                >
                  <X size={11} strokeWidth={3} />
                </button>
              </span>
            )}

            {selectedTag && (
              <span className="til-hud-chip tag">
                <span className="chip-key">TAG</span>
                <span className="chip-val">#{selectedTag}</span>
                <button
                  type="button"
                  onClick={() => onSelectTag(null)}
                  className="chip-remove"
                  aria-label="Remove tag filter"
                >
                  <X size={11} strokeWidth={3} />
                </button>
              </span>
            )}

            {selectedDay && (
              <span className="til-hud-chip day">
                <span className="chip-key">DATE</span>
                <span className="chip-val">{selectedDay}</span>
                <button
                  type="button"
                  onClick={onClearDay}
                  className="chip-remove"
                  aria-label="Remove day filter"
                >
                  <X size={11} strokeWidth={3} />
                </button>
              </span>
            )}

            {selectedHash && (
              <span className="til-hud-chip hash">
                <span className="chip-key">SPECIMEN</span>
                <span className="chip-val">#{selectedHash}</span>
                <button
                  type="button"
                  onClick={onClearHash}
                  className="chip-remove"
                  aria-label="Remove hash filter"
                >
                  <X size={11} strokeWidth={3} />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={onClearAll}
              className="til-hud-reset-all"
              title="Reset all filters"
            >
              <RotateCcw size={11} strokeWidth={2.8} />
              <span>CLEAR ALL</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

