"use client";

import React from "react";
import { SortMode, ViewMode } from "@/types";

interface HeaderBarProps {
  query: string;
  setQuery: (q: string) => void;
  view: ViewMode;
  setView: (v: ViewMode) => void;
  sort: SortMode;
  setSort: (s: SortMode) => void;
  onOpenCaptureWithUrl: (url: string) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
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

      <div className="grp">
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

      <div className="grp">
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
    </div>
  );
};
