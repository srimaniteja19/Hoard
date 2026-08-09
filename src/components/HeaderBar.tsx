"use client";

import React from "react";
import { SortMode, ViewMode } from "@/types";
import { ThemePicker } from "@/components/ThemePicker";

interface HeaderBarProps {
  query: string;
  setQuery: (q: string) => void;
  view: ViewMode;
  setView: (v: ViewMode) => void;
  sort: SortMode;
  setSort: (s: SortMode) => void;
  onOpenCaptureWithUrl: (url: string) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  onToggleMobileSidebar?: () => void;
  onOpenCapture?: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  query,
  setQuery,
  view,
  setView,
  sort,
  setSort,
  onOpenCaptureWithUrl,
  searchInputRef,
  onToggleMobileSidebar,
  onOpenCapture,
}) => {
  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (/^https?:\/\//i.test(v.trim())) {
      onOpenCaptureWithUrl(v.trim());
      setQuery("");
      return;
    }
    setQuery(v);
  };

  return (
    <div className="bar">
      {/* Mobile Top Header Strip */}
      <div className="mobile-header-strip">
        <button
          className="mobile-menu-btn"
          onClick={onToggleMobileSidebar}
          aria-label="Open navigation menu"
        >
          <span>☰</span> MENU
        </button>

        <div className="mobile-brand">
          <b>HOARD</b>
        </div>

        {onOpenCapture && (
          <button
            className="mobile-add-btn"
            onClick={onOpenCapture}
            aria-label="Save link"
          >
            + LINK
          </button>
        )}
      </div>

      <div className="searchbox">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#000"
          strokeWidth="3"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-4-4" />
        </svg>
        <input
          ref={searchInputRef}
          value={query}
          onChange={handleInput}
          placeholder="Search — try  is:video  under:20m  #ai  lang:ts"
          autoComplete="off"
        />
      </div>

      <div className="bar-controls-row">
        <div className="grp view-grp">
          <button
            className={view === "masonry" ? "on" : ""}
            onClick={() => setView("masonry")}
          >
            MASONRY
          </button>
          <button
            className={view === "grid" ? "on" : ""}
            onClick={() => setView("grid")}
          >
            GRID
          </button>
          <button
            className={view === "list" ? "on" : ""}
            onClick={() => setView("list")}
          >
            LIST
          </button>
          <button
            className={view === "heads" ? "on" : ""}
            onClick={() => setView("heads")}
          >
            HEADLINES
          </button>
        </div>

        <div className="grp sort-grp">
          <button
            className={sort === "recent" ? "on" : ""}
            onClick={() => setSort("recent")}
          >
            RECENT
          </button>
          <button
            className={sort === "short" ? "on" : ""}
            onClick={() => setSort("short")}
          >
            SHORTEST
          </button>
          <button
            className={sort === "az" ? "on" : ""}
            onClick={() => setSort("az")}
          >
            A–Z
          </button>
        </div>

        <ThemePicker />
      </div>
    </div>
  );
};
